/**
 * ACTOR EMPIRE — AWARD NIGHT CINEMATIC FLOW (React + TypeScript)
 *
 * Drop-in replacement visuals for views/RedCarpetEvent.tsx phases:
 *   DRESS → ARRIVAL → ENTRANCE (red carpet) → MONEY (viewfinder + photo fan)
 *   → NEWS (front page buzz) → PRESS (Q&A) → CEREMONY (fillers + player
 *   category with tension) → SUMMARY.
 *
 * Self-contained: no Tailwind, no icon lib, no CDN. All styling lives in the
 * STYLE constant (same pattern as the game's existing <style>{STYLE}</style>).
 * Every dynamic value comes in through AwardNightConfig — wire it to
 * Player / PendingEvent / awardLogic in the game.
 */

import React, {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react';

/* ============================================================
   TYPES & CONFIG
   ============================================================ */

export type AwardPhase =
  | 'DRESS' | 'ARRIVAL' | 'ENTRANCE' | 'MONEY'
  | 'NEWS' | 'PRESS' | 'CEREMONY' | 'SUMMARY';
export type AwardNightMode = 'AWARDS' | 'RED_CARPET';

/** Maps from the game's vehicleType: CAR -> CAR/SUPERCAR/SUV, MOTORCYCLE -> BIKE, AIRCRAFT -> HELI, BOAT -> YACHT */
export type VehicleType = 'LIMO' | 'CAR' | 'SUPERCAR' | 'SUV' | 'BIKE' | 'HELI' | 'YACHT';

export interface WardrobeItem { n: string; s: number; sub?: string; vt?: VehicleType; }

export interface PressEffect { fame?: number; reputation?: number; followers?: number; buzz?: number; }
export interface PressOption { t: string; s: 'SAFE' | 'HUMBLE' | 'BOLD' | 'RISKY'; fx: string; consequences?: PressEffect; }
export interface PressQuestion {
  outlet: string; name: string; mug: string; q: string; opts: PressOption[];
}

export interface AwardNomineeSpotlight { name: string; project?: string; isPlayer?: boolean; }
export type AwardNomineeDisplay = string | AwardNomineeSpotlight;
export interface FillerCategory { cat: string; noms: AwardNomineeDisplay[]; winner: AwardNomineeDisplay; }
export interface PlayerAwardCategory { cat: string; movie: string; rivals: AwardNomineeDisplay[]; won: boolean; }
export interface AwardPressResult { statsDelta: PressEffect; buzzDelta: number; styles: PressOption['s'][]; }

export interface AwardNightConfig {
  mode?: AwardNightMode;
  playerName: string;
  /** player.avatar — falls back to a built-in pixel placeholder */
  avatarUrl?: string;
  showName: string;
  showEdition: string;
  venue: string;
  city: string;
  headlineGood: string;
  headlineBad: string;
  playerMovie: string;
  playerCategory: string;
  playerWins: boolean;
  playerRivals: AwardNomineeDisplay[];
  playerCategories?: PlayerAwardCategory[];
  ceremonyFillers: FillerCategory[];
  ceremonyClosing: FillerCategory;
  pressQuestions: PressQuestion[];
  summaryKicker?: string;
  summaryTitle?: string;
  summaryLine?: string;
  summaryCardTitle?: string;
  newspaperLead?: string;
  newspaperAngle?: string;
  newspaperClosing?: string;
  completeLabel?: string;
  /** wardrobe per slot — wire to player.assets / CLOTHING_CATALOG */
  wardrobe: Record<string, WardrobeItem[]>;
}

export interface AwardNightResult {
  won: boolean;
  styleScore: number;
  outfitName: string;
  rideName: string;
  pressResult?: AwardPressResult;
}

export const DEFAULT_CONFIG: AwardNightConfig = {
  mode: 'AWARDS',
  playerName: 'Aiden Cross',
  showName: 'The Golden Statues',
  showEdition: '96th Annual Ceremony · Tonight',
  venue: 'Dolby Grand Theatre',
  city: 'Los Angeles',
  headlineGood: 'A STAR IS CROWNED',
  headlineBad: 'STYLE MISSES THE MARK',
  playerMovie: 'The Cheat Code',
  playerCategory: 'Best Actor',
  playerWins: true,
  playerRivals: ['Adam Driver', 'Atlas Hart', 'Rema Ray'],
  ceremonyFillers: [
    { cat: 'Best Original Screenplay', noms: ['Midnight Echoes', 'Paper Cities', 'Silence', 'The Last Stand'], winner: 'Paper Cities' },
    { cat: 'Best Director', noms: ['Ava Laurent', 'Marcus Vale', 'Elena Cross', 'Jordan Peele'], winner: 'Elena Cross' }
  ],
  ceremonyClosing: { cat: 'Best Motion Picture', noms: ['The Cheat Code', 'Glass Kingdom', 'Neon Harbor', 'Past Lives'], winner: 'Glass Kingdom' },
  pressQuestions: [
    {
      outlet: 'The Daily Star', name: 'Sarah Jenkins · Entertainment Desk', mug: '📰',
      q: "Everyone's calling tonight your breakout moment. Do you feel the pressure?",
      opts: [
        { t: "Pressure is a privilege. I've worked ten years for this room.", s: 'BOLD', fx: '+Fame +Followers' },
        { t: "Honestly? I'm just grateful the film found its audience.", s: 'HUMBLE', fx: '+Reputation' },
        { t: "The only pressure tonight is my tailor's. This suit is not forgiving.", s: 'RISKY', fx: '++Followers or backfire' }
      ]
    },
    {
      outlet: 'Hollywood Now', name: 'Marcus Vane · Red Carpet Live', mug: '🎥',
      q: 'Rumors say you turned down a franchise role to make this film. True?',
      opts: [
        { t: 'I go where the story is. No regrets.', s: 'BOLD', fx: '+Reputation +Fame' },
        { t: "I can't discuss other projects — tonight belongs to this one.", s: 'SAFE', fx: '+Reputation' },
        { t: 'Franchises have sequels. Legends have moments like this.', s: 'RISKY', fx: '++Fame or backfire' }
      ]
    },
    {
      outlet: 'CineWire', name: 'Priya Nair · Awards Analyst', mug: '🎙️',
      q: "If your name is called tonight, what's the first thing you'll say?",
      opts: [
        { t: "I'd thank the crew who were there at 4 AM when nobody cared.", s: 'HUMBLE', fx: '++Reputation' },
        { t: "You'll have to wait and see — I do my best work live.", s: 'SAFE', fx: '+Fame' },
        { t: "'Told you so.' Kidding. Mostly.", s: 'RISKY', fx: '++Followers or backfire' }
      ]
    }
  ],
  wardrobe: {
    OUTFIT: [{ n: 'Midnight Velvet Tux', s: 18 }, { n: 'Ivory Silk Suit', s: 15 }, { n: 'Crimson Gala Set', s: 12 }],
    TOP: [{ n: 'Black Silk Shirt', s: 6 }, { n: 'Gold-Thread Blazer', s: 9 }],
    BOTTOM: [{ n: 'Tailored Slacks', s: 5 }, { n: 'Pleated Trousers', s: 4 }],
    SHOES: [{ n: 'Patent Oxfords', s: 6 }, { n: 'Velvet Loafers', s: 5 }],
    WATCH: [{ n: 'Heritage Chronograph', s: 8 }, { n: 'Slim Gold Dress Watch', s: 6 }],
    EYEWEAR: [{ n: 'Round Gold Frames', s: 4 }],
    BAG: [{ n: 'Leather Clutch', s: 3 }],
    JEWELRY: [{ n: 'Diamond Lapel Pin', s: 10 }, { n: 'Signet Ring', s: 5 }],
    RIDE: [
      { n: 'Taxi / Limo Service', s: 0, sub: 'Default option', vt: 'LIMO' },
      { n: 'Phantom V12 Limousine', s: 0, sub: 'Limousine · +3 Rep', vt: 'LIMO' },
      { n: 'Meridian S-Class', s: 0, sub: 'Luxury Sedan · +1 Rep', vt: 'CAR' },
      { n: 'Aurora GT Coupé', s: 0, sub: 'Supercar · +2 Rep', vt: 'SUPERCAR' },
      { n: 'Ridge Rover XL', s: 0, sub: 'Luxury SUV · +1 Rep', vt: 'SUV' },
      { n: 'Steel Falcon Superbike', s: 0, sub: 'Motorcycle · +2 Rep', vt: 'BIKE' },
      { n: 'Sky Serpent Helicopter', s: 0, sub: 'Aircraft · +4 Rep', vt: 'HELI' },
      { n: 'Ocean Pearl Yacht', s: 0, sub: 'Yacht · +3 Rep', vt: 'YACHT' }
    ]
  }
};

const nomineeName = (nominee?: AwardNomineeDisplay): string => (
  typeof nominee === 'string' ? nominee : nominee?.name || 'Another Nominee'
);

const nomineeProject = (nominee?: AwardNomineeDisplay): string | undefined => (
  typeof nominee === 'string' ? undefined : nominee?.project
);

const nomineeKey = (nominee: AwardNomineeDisplay, index: number): string => (
  `${nomineeName(nominee)}-${nomineeProject(nominee) || 'solo'}-${index}`
);

const nomineeIsPlayer = (nominee: AwardNomineeDisplay, playerName: string): boolean => (
  typeof nominee === 'string' ? nominee === playerName : Boolean(nominee.isPlayer || nominee.name === playerName)
);

const sameNominee = (left: AwardNomineeDisplay, right: AwardNomineeDisplay, playerName: string): boolean => {
  if (nomineeIsPlayer(left, playerName) && nomineeIsPlayer(right, playerName)) return true;
  return nomineeName(left) === nomineeName(right) && (nomineeProject(left) || '') === (nomineeProject(right) || '');
};

type Equipped = Record<string, WardrobeItem | undefined>;

interface SlotDef { id: string; lb: string; ph: string; wide?: boolean; icon: keyof typeof ICONS; }
interface SectionDef { sec: string; }
const SLOTS: (SlotDef | SectionDef)[] = [
  { sec: 'Base Layer' },
  { id: 'OUTFIT', lb: 'Full Outfit', ph: 'Suit / Dress / Set', wide: true, icon: 'star' },
  { id: 'TOP', lb: 'Top', ph: 'Shirt / Jacket', icon: 'shirt' },
  { id: 'BOTTOM', lb: 'Bottom', ph: 'Pants / Skirt', icon: 'layers' },
  { sec: 'Details' },
  { id: 'SHOES', lb: 'Shoes', ph: 'Footwear', icon: 'shoe' },
  { id: 'WATCH', lb: 'Watch', ph: 'Timepiece', icon: 'watch' },
  { id: 'EYEWEAR', lb: 'Eyewear', ph: 'Glasses', icon: 'glasses' },
  { id: 'BAG', lb: 'Bag', ph: 'Carry', icon: 'bag' },
  { id: 'JEWELRY', lb: 'Jewelry', ph: 'Bling', wide: true, icon: 'gem' },
  { sec: 'Arrival' },
  { id: 'RIDE', lb: 'Ride', ph: 'Taxi / Limo Service', wide: true, icon: 'car' }
];

/* ============================================================
   ICONS (inline SVG, no icon lib)
   ============================================================ */
const ICONS = {
  star: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21.5 12 17 5.5 21.5 7.5 14 2 9.3 9 9 12 2" /></svg>,
  shirt: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M8 3 12 5 16 3 21 7 18 10 18 21 6 21 6 10 3 7Z" /></svg>,
  layers: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M7 3h10l1 18h-5l-1-9-1 9H6Z" /></svg>,
  shoe: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 16c0-2 1-8 2-11 2 3 5 5 9 6 3 1 7 2 7 4v2H3Z" /></svg>,
  watch: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5.5" /><path d="M9 6.5 9.6 2h4.8L15 6.5M9 17.5 9.6 22h4.8l.6-4.5M12 9.5V12l2 1.5" /></svg>,
  glasses: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6.5" cy="14" r="3.5" /><circle cx="17.5" cy="14" r="3.5" /><path d="M10 14h4M3 14 5 7h2M21 14 19 7h-2" /></svg>,
  bag: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="4" y="8" width="16" height="13" rx="2" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></svg>,
  gem: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M7 3h10l4 6-9 12L3 9Z" /><path d="M3 9h18M9.5 9 12 21 14.5 9" /></svg>,
  car: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 16 5.5 9.5C5.8 8.6 6.6 8 7.5 8h9c.9 0 1.7.6 2 1.5L20 16" /><rect x="2.5" y="15.5" width="19" height="4" rx="1.5" /><circle cx="7.5" cy="19.5" r="1.6" /><circle cx="16.5" cy="19.5" r="1.6" /></svg>
};

const TROPHY = (
  <svg viewBox="0 0 24 24" fill="none" stroke="#1a1102" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z" />
    <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
  </svg>
);

/* ============================================================
   PIXEL AVATAR PLACEHOLDER (used only when avatarUrl is absent)
   ============================================================ */
const PAL: Record<string, string | null> = { '.': null, H: '#e0b954', h: '#b58c33', S: '#eac79c', s: '#d3a678', E: '#f7f3e9', P: '#2f2f26', B: '#7c5f26', M: '#a3684a', J: '#20202a', j: '#2d2d3a', T: '#6b3fa0' };
const FACE = [
  '........................', '......HHHHHHHHHH........', '....HHHHHHHHHHHHHH......', '...HHHhHHHHHHHHhHHH.....',
  '..HHhHHHHHHHHHHHHhHH....', '..HHhSSSSSSSSSSSShHH....', '.HHhSSSSSSSSSSSSSShHH...', '.HHhSSBBSSSSSSBBSShHH...',
  '.HHhSSSSSSSSSSSSSShHH...', '.HHhSEPESSSSSSEPEShHH...', '.HHhSSSSSSSSSSSSSShHH...', '.HHhSSSSSsSSsSSSSShHH...',
  '.HHhSSSSSsSSsSSSSShHH...', '.HHhSSSSSSSSSSSSSShHH...', '.HHhSSShMMMMMMhSSShHH...', '.HHhSSSShhhhhhhSSShHH...',
  '.HHhSSSSShhhhhSSSShHH...', '.HHh.SSSSShhhSSSSS.hHH..', '.HHh..SSSSSSSSSSS..hHH..', '.HHh...JJjSSSSjJJ..hHH..',
  '.HH..JJJJjSTTSjJJJJ.HH..', '.H..JJJJJJTTTTJJJJJJ.H..', '...JJJJJJJTTTTJJJJJJJ...', '..JJJJJJJJJTTJJJJJJJJ..'
];

const Avatar: React.FC<{ url?: string }> = ({ url }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (url || !ref.current) return;
    const ctx = ref.current.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(0, 0, 24, 24);
    ctx.fillStyle = '#31313b'; ctx.fillRect(0, 13, 24, 11);
    FACE.forEach((row, y) => {
      if (y >= 24) return;
      [...row].forEach((ch, x) => { const c = PAL[ch]; if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); } });
    });
  }, [url]);
  if (url) return <img className="avimg" src={url} alt="" />;
  return <canvas ref={ref} width={24} height={24} />;
};

/* ============================================================
   TIMER HOOK — every timeout auto-cleans on unmount
   ============================================================ */
function useTimers() {
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)); }, []);
  return useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  }, []);
}

/* ============================================================
   HELPERS
   ============================================================ */
const styleTotal = (eq: Equipped) =>
  Object.entries(eq).reduce((sum, [k, v]) => sum + (v && k !== 'RIDE' ? v.s : 0), 0) * 2;
const isVestMode = (eq: Equipped) => !eq.OUTFIT && !(eq.TOP && eq.BOTTOM);
const outfitName = (eq: Equipped) =>
  isVestMode(eq) ? 'Old Vest & Shorts' : eq.OUTFIT ? eq.OUTFIT.n : `${eq.TOP!.n} & ${eq.BOTTOM!.n}`;
const rideName = (eq: Equipped) =>
  eq.RIDE && eq.RIDE.n !== 'Taxi / Limo Service' ? eq.RIDE.n : 'Luxury Limo Service';

const edgeL = (t: number) => 43.5 - 31.5 * t;
const edgeR = (t: number) => 56.5 + 31.5 * t;

/* ============================================================
   0. DRESSING ROOM
   ============================================================ */
const DressingRoom: React.FC<{
  cfg: AwardNightConfig; equipped: Equipped;
  setEquipped: React.Dispatch<React.SetStateAction<Equipped>>;
  onConfirm: () => void; onSkip: () => void;
}> = ({ cfg, equipped, setEquipped, onConfirm, onSkip }) => {
  const [drawer, setDrawer] = useState<SlotDef | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  const prevStyle = useRef(styleTotal(equipped));
  const wait = useTimers();

  const total = styleTotal(equipped);
  useEffect(() => {
    const diff = total - prevStyle.current;
    prevStyle.current = total;
    if (diff !== 0) { setDelta(diff); wait(() => setDelta(null), 1200); }
  }, [total, wait]);

  const equip = (slot: SlotDef, item: WardrobeItem) => {
    setEquipped(prev => {
      const next = { ...prev, [slot.id]: item };
      if (slot.id === 'OUTFIT') { delete next.TOP; delete next.BOTTOM; }
      if (slot.id === 'TOP' || slot.id === 'BOTTOM') delete next.OUTFIT;
      return next;
    });
    setDrawer(null);
  };
  const unequip = (slot: SlotDef) => {
    setEquipped(prev => { const next = { ...prev }; delete next[slot.id]; return next; });
    setDrawer(null);
  };

  const vest = isVestMode(equipped);
  let grid: SlotDef[] = [];
  const sections: { sec: string; slots: SlotDef[] }[] = [];
  SLOTS.forEach(s => {
    if ('sec' in s) { grid = []; sections.push({ sec: s.sec, slots: grid }); }
    else grid.push(s);
  });

  return (
    <div className="an-scene scn-dress">
      <div className="dr-scroll">
        <div className="dr-head">
          <div className="dr-kicker">The Dressing Room</div>
          <div className="dr-title">{cfg.showName}</div>
          <button className="dr-skip" title="Skip event" onClick={onSkip}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 13 12 5 20 5 4" /><polygon points="13 4 21 12 13 20 13 4" /></svg>
          </button>
        </div>
        <div className="mirror">
          <div className="glow" />
          <div className="avring"><Avatar url={cfg.avatarUrl} /></div>
          {Array.from({ length: 14 }).map((_, i) => {
            const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
            return <div key={i} className="vbulb" style={{
              left: `${50 + 47 * Math.cos(a)}%`, top: `${50 + 47 * Math.sin(a)}%`,
              transform: 'translate(-50%,-50%)', animationDelay: `${i * 0.18}s`
            }} />;
          })}
        </div>
        <div className="style-pill">
          <span className="star">★</span><b>Style: {total}</b>
          <span className={`delta${delta !== null ? ' show' : ''}`}
            style={{ color: (delta ?? 0) >= 0 ? '#57e389' : '#ff5c6a' }}>
            {delta !== null ? `${delta > 0 ? '+' : ''}${delta}` : ''}
          </span>
        </div>
        {sections.map(sec => (
          <React.Fragment key={sec.sec}>
            <div className="dr-sec"><i /><span>{sec.sec}</span><i /></div>
            <div className="slotgrid">
              {sec.slots.map(s => {
                const it = equipped[s.id];
                const disabled = (s.id === 'TOP' || s.id === 'BOTTOM') && !!equipped.OUTFIT;
                return (
                  <button key={s.id}
                    className={`slotcard${s.wide ? ' wide' : ''}${it ? ' eq' : ''}`}
                    style={disabled ? { opacity: .25, pointerEvents: 'none' } : undefined}
                    onClick={() => setDrawer(s)}>
                    <span className="ic">{ICONS[s.icon]}</span>
                    <span className="lb">{s.lb}</span>
                    <span className="it">{it ? it.n : s.ph}</span>
                  </button>
                );
              })}
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className="dr-foot">
        <div className="cta" style={{ position: 'static' }}>
          <button className={vest ? 'panicbtn' : 'goldbtn'} onClick={onConfirm}>
            {vest ? 'Go in Vest & Shorts (Panic Mode) →' : 'Confirm Look →'}
          </button>
        </div>
      </div>
      {drawer && (
        <div className="drawer-veil on" onClick={e => { if (e.target === e.currentTarget) setDrawer(null); }}>
          <div className="drawer">
            <div className="grip" />
            <div className="dh">
              <div className="t">Select {drawer.lb}</div>
              <button className="x" onClick={() => setDrawer(null)}>✕</button>
            </div>
            <div className="list">
              {drawer.id !== 'RIDE' && (
                <button className="ditem none" onClick={() => unequip(drawer)}>✕&nbsp; Unequip / None</button>
              )}
              {(cfg.wardrobe[drawer.id] || []).map(item => {
                const sel = equipped[drawer.id]?.n === item.n;
                return (
                  <button key={item.n} className={`ditem${sel ? ' sel' : ''}`} onClick={() => equip(drawer, item)}>
                    <div>
                      <div className="nm">{item.n}</div>
                      <div className="mt">{item.sub || <>Designer · <b>+{item.s * 2} Style</b></>}</div>
                    </div>
                    <span className="chk">✓</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   1. ARRIVAL
   ============================================================ */
/**
 * No vehicle art is shown. The ride is sold with light, shadow and flavor text
 * so every current and future catalog item can fit without matching assets.
 */
const ARRIVE_FLAVOR: Record<VehicleType, { approach: string; crowd: string; eta: string }> = {
  LIMO: { approach: 'The engine hums to a stop. Doors like vault locks.', crowd: '“Whose limo is THAT?”', eta: 'Red carpet · 400 metres' },
  CAR: { approach: 'Quiet. Understated. Unmistakably expensive.', crowd: '“Wait — is that them?”', eta: 'Red carpet · 400 metres' },
  SUPERCAR: { approach: 'Something low and furious growls up the boulevard.', crowd: '“You HEARD that thing?!”', eta: 'Red carpet · 400 metres' },
  SUV: { approach: 'It takes up two lanes. Nobody complains.', crowd: '“Security’s moving — it’s them.”', eta: 'Red carpet · 400 metres' },
  BIKE: { approach: 'One engine. No entourage. The crowd goes quiet.', crowd: '“No way they rode HERE.”', eta: 'Red carpet · 400 metres' },
  HELI: { approach: 'The crowd hears the rotors before they see anything.', crowd: '“THEY CAME BY HELICOPTER?!”', eta: 'Rooftop helipad · Final approach' },
  YACHT: { approach: 'Fashionably late — the marina is not close.', crowd: '“They docked a YACHT for this?!”', eta: 'Festival marina · Now docking' }
};

const stars = (n: number) => Array.from({ length: n }).map((_, i) => (
  <i key={i} style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 3}s` }} />
));

const ArrivalScene: React.FC<{
  cfg: AwardNightConfig; vehicle: string; vtype: VehicleType; onDone: () => void;
}> = ({ cfg, vehicle, vtype, onDone }) => {
  const wait = useTimers();
  const starEls = useMemo(() => stars(30), []);
  const flashRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const [beat, setBeat] = useState<'title' | 'lights' | 'door'>('title');
  const flavor = ARRIVE_FLAVOR[vtype];
  const fromAbove = vtype === 'HELI';

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    wait(() => setBeat('lights'), 2300);
    wait(() => setBeat('door'), 4700);
    wait(finish, 7800);
  }, [wait, finish]);

  useEffect(() => {
    if (beat !== 'door') return;
    const iv = window.setInterval(() => {
      const layer = flashRef.current;
      if (!layer) return;
      const f = document.createElement('div');
      f.className = 'papflash';
      const sz = 40 + Math.random() * 70;
      f.style.width = `${sz}px`;
      f.style.height = `${sz}px`;
      f.style.left = `${8 + Math.random() * 84}%`;
      f.style.top = `${52 + Math.random() * 38}%`;
      layer.appendChild(f);
      window.setTimeout(() => f.remove(), 600);
    }, 180);
    return () => window.clearInterval(iv);
  }, [beat]);

  return (
    <div className="an-scene scn-arrival letterbox" onClick={finish}>
      <div className="arr-stars">{starEls}</div>
      <div className="arr-beams"><i /><i /></div>
      <div className="skyline">
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 120V72h14V50h10v22h8V60h16v12h10V38h6l3-10 3 10h6v34h12V52h18v20h8V30h14v42h10V58h16v14h8V44h20v28h12V22h5l3-9 3 9h5v50h14V56h16v16h10V40h14v32h8V62h18v10h10V34h12v38h14V54h16v18h8V46h14v26h10V58h16v62Z" fill="#0b0b12" />
          <g fill="rgba(240,190,80,.5)">
            <rect x="30" y="66" width="2" height="2" /><rect x="60" y="46" width="2" height="2" /><rect x="98" y="60" width="2" height="2" />
            <rect x="130" y="40" width="2" height="2" /><rect x="170" y="52" width="2" height="2" /><rect x="205" y="34" width="2" height="2" />
            <rect x="248" y="64" width="2" height="2" /><rect x="284" y="48" width="2" height="2" /><rect x="322" y="60" width="2" height="2" />
            <rect x="356" y="52" width="2" height="2" /><rect x="380" y="66" width="2" height="2" />
          </g>
        </svg>
      </div>
      <div className="arr-road" />
      <div className={`arr-txt${beat !== 'title' ? ' dim' : ''}`}>
        <div className="arr-kicker">The Arrival</div>
        <div className="arr-vehicle">{vehicle}</div>
        <div className="arr-rule" />
        <div className="arr-dest">En route to <b>{cfg.showName}</b></div>
      </div>
      {beat !== 'title' && (
        <div className={`approach${fromAbove ? ' above' : ''}${beat === 'door' ? ' settled' : ''}`}>
          <i className="glow a" /><i className="glow b" />
          <div className="wash" />
        </div>
      )}
      {beat === 'lights' && <div className="arr-flavor">{flavor.approach}</div>}
      {beat === 'door' && (
        <>
          <div className="doorlight" />
          <div className="doorspill" />
          <div className="figure">
            <svg viewBox="0 0 80 150" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="18" r="13" fill="#050508" />
              <path d="M35 29 h10 v6 h-10 Z" fill="#050508" />
              <path d="M40 33 Q57 35 63 49 Q67 61 65 84 L63 114 Q62 125 55 129 L53 148 44 148 44 131 36 131 36 148 27 148 25 129 Q18 125 17 114 L15 84 Q13 61 17 49 Q23 35 40 33 Z" fill="#050508" />
              <path d="M50 7 Q57 13 55 24 L51 21 Q53 13 47 8 Z" fill="rgba(240,180,41,.7)" />
              <path d="M58 42 Q66 54 65 80 L61 78 Q62 55 55 45 Z" fill="rgba(240,180,41,.55)" />
            </svg>
          </div>
          <div className="crowdcap">{flavor.crowd}</div>
        </>
      )}
      <div ref={flashRef} style={{ position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'none' }} />
      <div className="arr-eta"><span className="dot" /> {flavor.eta}</div>
      <div className="arr-vignette" />
    </div>
  );
};

/* ============================================================
   2. ENTRANCE — THE RED CARPET
   ============================================================ */
const EntranceScene: React.FC<{
  cfg: AwardNightConfig; outfit: string; ride: string; onDone: () => void;
}> = ({ cfg, outfit, ride, onDone }) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const [viewers, setViewers] = useState(2.4);
  const [white, setWhite] = useState(false);
  const wait = useTimers();
  const starEls = useMemo(() => stars(40), []);

  // build crowd, ropes & stanchions (imperative — positions are computed)
  useEffect(() => {
    const props = propsRef.current;
    if (!props) return;
    props.innerHTML = '';
    (['l', 'r'] as const).forEach(side => {
      for (let r = 0; r < 7; r++) {
        const t = r / 6;
        const y = 6 + t * 92;
        const scale = .4 + t * 1.5;
        const n = 3 + r * 2;
        for (let i = 0; i < n; i++) {
          const h = document.createElement('div'); h.className = 'crowdhead';
          const gap = 5 + Math.random() * (10 + t * 24);
          const x = side === 'l' ? edgeL(t) - gap : edgeR(t) + gap;
          if (x < -4 || x > 104) continue;
          h.style.left = `${x}%`; h.style.top = `${y}%`;
          h.style.transform = `translateX(${side === 'l' ? -100 : 0}%) scale(${scale})`;
          h.style.opacity = (.55 + t * .4).toFixed(2);
          h.innerHTML = `<svg width="30" height="34" viewBox="0 0 30 34">
            <circle cx="15" cy="9" r="7" fill="#15151d"/>
            <path d="M2 34 Q15 16 28 34 Z" fill="#15151d"/></svg>`;
          if (Math.random() < .5) {
            const f = document.createElement('div'); f.className = 'phoneflash';
            f.style.left = `${10 + Math.random() * 10}px`; f.style.top = '2px';
            f.style.animationDelay = `${Math.random() * 4}s`; h.appendChild(f);
          }
          props.appendChild(h);
        }
      }
    });
    const railPts = (side: 'l' | 'r') => {
      const pts: { x: number; y: number; s: number; ropeY: number }[] = [];
      for (let i = 0; i <= 5; i++) {
        const t = i / 5;
        const out = (1 + t * 2.5) * (side === 'l' ? -1 : 1);
        const x = (side === 'l' ? edgeL(t) : edgeR(t)) + out;
        const s = .4 + t * 1.05;
        pts.push({ x, y: t * 100, s, ropeY: t * 100 - s * 9 });
      }
      return pts;
    };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:6;overflow:visible;pointer-events:none';
    (['l', 'r'] as const).forEach(side => {
      const pts = railPts(side);
      let d = `M ${pts[0].x} ${pts[0].ropeY}`;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        d += ` Q ${(a.x + b.x) / 2} ${(a.ropeY + b.ropeY) / 2 + 1 + i * .5} ${b.x} ${b.ropeY}`;
      }
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('vector-effect', 'non-scaling-stroke');
      p.style.stroke = '#a01a2c'; p.style.strokeWidth = '3.5px';
      p.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,.6))';
      svg.appendChild(p);
    });
    props.appendChild(svg);
    (['l', 'r'] as const).forEach(side => {
      railPts(side).forEach(p => {
        const st = document.createElement('div'); st.className = 'stanchion';
        st.style.left = `${p.x}%`; st.style.top = `${p.y}%`;
        st.style.transform = `translate(-50%,-100%) scale(${p.s})`;
        st.innerHTML = '<div class="top"></div><div class="pole"></div>';
        props.appendChild(st);
      });
    });
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setWhite(true);
    wait(onDone, 650);
  }, [wait, onDone]);

  // paparazzi flashes + viewer creep + the walk
  useEffect(() => {
    const iv = window.setInterval(() => {
      setViewers(v => v + Math.random() * 0.05);
      const layer = flashRef.current;
      if (layer && Math.random() < .75) {
        const f = document.createElement('div'); f.className = 'papflash';
        const side = Math.random() < .5;
        f.style.left = `${side ? 8 + Math.random() * 22 : 70 + Math.random() * 22}%`;
        f.style.top = `${45 + Math.random() * 45}%`;
        const sz = 40 + Math.random() * 70;
        f.style.width = `${sz}px`; f.style.height = `${sz}px`;
        layer.appendChild(f); window.setTimeout(() => f.remove(), 600);
      }
    }, 260);
    let walk = 0; let raf = 0;
    const step = () => {
      if (walk < 100) {
        walk += 0.22;
        const t = walk / 100;
        const el = playerRef.current;
        if (el) {
          el.style.transform = `translateX(-50%) scale(${.30 + t * .95})`;
          el.style.bottom = `${30 - t * 26}%`;
        }
        raf = requestAnimationFrame(step);
      } else finish();
    };
    raf = requestAnimationFrame(step);
    return () => { window.clearInterval(iv); cancelAnimationFrame(raf); };
  }, [finish]);

  return (
    <div className="an-scene scn-entrance" onClick={finish}>
      <div className="ent-stars">{starEls}</div>
      <div className="ent-beams"><i /><i /><i /><i /></div>
      <div className="theatre">
        <div className="marquee">
          <div className="bulb-row">{Array.from({ length: 16 }).map((_, i) => <i key={i} />)}</div>
          <div className="marquee-body">
            <div className="marquee-title">{cfg.showName}</div>
            <div className="marquee-sub">{cfg.showEdition}</div>
          </div>
          <div className="bulb-row">{Array.from({ length: 16 }).map((_, i) => <i key={i} />)}</div>
        </div>
        <div className="theatre-doors">
          <div className="col l" /><div className="col r" />
          <div className="door-glow" /><div className="door-split" />
        </div>
      </div>
      <div className="step-repeat">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 64" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="an-sr" width="52" height="32" patternUnits="userSpaceOnUse">
              <text x="6" y="14" fontSize="7" fontWeight="900" letterSpacing="1" fill="rgba(240,180,41,.45)" fontFamily="Georgia">★GS★</text>
              <text x="30" y="28" fontSize="6" fill="rgba(200,200,210,.28)" fontFamily="Georgia">96TH</text>
            </pattern>
          </defs>
          <rect width="420" height="64" fill="url(#an-sr)" />
        </svg>
      </div>
      <div className="ent-ground">
        <div className="floorside l" /><div className="floorside r" />
        <div className="carpet" />
        <div className="carpet-sheen" />
        <div className="carpet-edge" />
        <div ref={propsRef} />
      </div>
      <div className="ent-player" ref={playerRef}>
        <div className="shadow" />
        <div className="ent-bob"><div className="avring"><Avatar url={cfg.avatarUrl} /></div></div>
      </div>
      <div ref={flashRef} style={{ position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none' }} />
      <div className="tv">
        <div className="tv-live"><span className="r" /><span>LIVE</span></div>
        <div className="tv-watch"><b>{viewers.toFixed(1)}M</b> watching</div>
        <div className="lower3">
          <div className="tag">Arrivals</div>
          <div className="txt">
            <div className="n">{cfg.playerName}</div>
            <div className="o">Wearing {outfit} · Arrived by {ride}</div>
          </div>
        </div>
        <div className="ticker">
          <div className="lbl">{cfg.showName.replace(/^The /i, '').toUpperCase()}</div>
          <div className="roll">Crowds line the boulevard as nominees arrive &nbsp;•&nbsp; <b>{cfg.playerCategory}</b> race called "too close to call" &nbsp;•&nbsp; Security escorts an over-excited fan from barrier three &nbsp;•&nbsp; Tonight's ceremony broadcast in 132 countries &nbsp;•&nbsp;</div>
        </div>
      </div>
      <div className="tapcue">Tap to strike a pose</div>
      <div className={`whiteout${white ? ' go' : ''}`} />
    </div>
  );
};

/* ============================================================
   3. MONEY SHOT — VIEWFINDER → PHOTO FAN
   ============================================================ */
const MoneyShotScene: React.FC<{
  cfg: AwardNightConfig; styleScore: number; vest: boolean; onNext: () => void;
}> = ({ cfg, styleScore, vest, onNext }) => {
  const [stage, setStage] = useState<'vf' | 'fan'>('vf');
  const [white, setWhite] = useState(false);
  const [showBtn, setShowBtn] = useState(false);
  const vfFlashRef = useRef<HTMLDivElement>(null);
  const wait = useTimers();

  useEffect(() => {
    const iv = window.setInterval(() => {
      const layer = vfFlashRef.current;
      if (!layer) return;
      const f = document.createElement('div'); f.className = 'vf-flash';
      const sz = 40 + Math.random() * 80;
      f.style.width = `${sz}px`; f.style.height = `${sz}px`;
      f.style.left = `${Math.random() * 80}%`; f.style.top = `${20 + Math.random() * 55}%`;
      layer.appendChild(f); window.setTimeout(() => f.remove(), 520);
    }, 320);
    wait(() => { window.clearInterval(iv); setWhite(true); }, 2100);
    wait(() => setStage('fan'), 2520);
    wait(() => setShowBtn(true), 3900);
    return () => window.clearInterval(iv);
  }, [wait]);

  const photo = (extraBeam?: boolean) => (
    <div className="ph">
      <div className="beamz" />{extraBeam && <div className="beamz b" />}
      <div className="av"><div className="avring"><Avatar url={cfg.avatarUrl} /></div></div>
      <div className="grain" />
    </div>
  );

  return (
    <div className="an-scene scn-money">
      {stage === 'vf' && (
        <div className="vf">
          <div className="vf-bg"><div className="beamz" /><div className="beamz b" /></div>
          <div className="vf-av"><div className="avring"><Avatar url={cfg.avatarUrl} /></div></div>
          <div ref={vfFlashRef} style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }} />
          <div className="vf-ui">
            <span className="corner c1" /><span className="corner c2" /><span className="corner c3" /><span className="corner c4" />
            <div className="focus" />
            <div className="rec"><i />REC</div>
            <div className="cam">CAM 04 · PRESS WALL</div>
            <div className="af">AF LOCK — SUBJECT ACQUIRED</div>
          </div>
        </div>
      )}
      <div className={`whiteout${white ? ' go' : ''}`} />
      {stage === 'fan' && (
        <div className="shot-wrap on">
          <div className="fan">
            <div className="snap side a">{photo()}</div>
            <div className="snap side b">{photo()}</div>
            <div className="snap main">
              <div className="shot-stamp">STYLE +{styleScore || 48}</div>
              <div className="ph">
                <div className="beamz" /><div className="beamz b" />
                <div className="av"><div className="avring"><Avatar url={cfg.avatarUrl} /></div></div>
                <div className="grain" />
                <div className="wm">© Daily Star Photo</div>
              </div>
              <div className="cap">{vest ? '“Well… they definitely noticed.”' : '“Every lens turned at once.”'}</div>
            </div>
          </div>
          <div className="shot-sub">
            <div className="k">The Money Shot</div>
            <div className="t">Tomorrow, everyone sees this photo.</div>
          </div>
        </div>
      )}
      {showBtn && (
        <div className="cta"><button onClick={onNext}>See Tomorrow's Front Page →</button></div>
      )}
    </div>
  );
};

/* ============================================================
   4. NEWSPAPER BUZZ
   ============================================================ */
const NewspaperScene: React.FC<{
  cfg: AwardNightConfig; outfit: string; vest: boolean; onNext: () => void;
}> = ({ cfg, outfit, vest, onNext }) => {
  const buzz = vest ? 28 : 72;
  const [val, setVal] = useState(0);
  useEffect(() => {
    let v = 0;
    const iv = window.setInterval(() => {
      v += 2;
      if (v >= buzz) { v = buzz; window.clearInterval(iv); }
      setVal(v);
    }, 40);
    return () => window.clearInterval(iv);
  }, [buzz]);
  const chips: [string, string, boolean][] = vest
    ? [['Fame', '+1', false], ['Followers', '+8K', false], ['Reputation', '-2', true]]
    : [['Fame', '+6', false], ['Followers', '+120K', false], ['Reputation', '+3', false]];
  const lead = cfg.newspaperLead || `${cfg.playerName} arrived for ${cfg.showName} with every camera tracking the ${cfg.playerCategory} race around ${cfg.playerMovie}.`;
  const angle = cfg.newspaperAngle || `${cfg.playerName} drew a wall of flashbulbs that veterans compared to premiere nights of old. "It's rare to see such presence," said one photographer.`;
  const closing = cfg.newspaperClosing || 'Insiders say tonight could mark the turning point from promising name to household one.';
  return (
    <div className="an-scene scn-news">
      <div className="news-wrap">
        <div className="paper">
          <div className="mast-meta"><span>Vol. CCIV No. 24</span><span>{cfg.city}, California</span><span>$2.00</span></div>
          <div className="mast">The Daily Star</div>
          <div className="mast-tag">The Voice of Hollywood</div>
          <div className="headline">{vest ? cfg.headlineBad : cfg.headlineGood}</div>
          <div className="news-photo">
            <div className="ph">
              <div className="bg-carpet" />
              <div className="news-av"><Avatar url={cfg.avatarUrl} /></div>
              <div className="halftone" />
            </div>
            <div className="cred">Photo: AP</div>
          </div>
          <div className="news-cap"><b>{cfg.playerName} at {cfg.showName}</b><i>By Sarah Jenkins</i></div>
          <div className="news-body">
            <p><span className="drop">L</span>OS ANGELES — {lead}</p>
            <p>Stepping out in {outfit.toLowerCase()}, {angle}</p>
            <p>{closing}</p>
          </div>
          <div className="buzzbar">
            <div className="row"><span>Overnight Buzz</span><span className="val">+{val}</span></div>
            <div className="buzz-track"><div className="buzz-fill" style={{ ['--buzz' as string]: `${buzz}%` }} /></div>
          </div>
        </div>
      </div>
      <div className="news-chips">
        {chips.map(([l, v, neg], i) => (
          <div key={l} className={`chip pop${neg ? ' neg' : ''}`} style={{ animationDelay: `${2.3 + i * 0.22}s` }}>
            {l} <b>{v}</b>
          </div>
        ))}
      </div>
      <div className="cta"><button className="goldbtn" onClick={onNext}>Face the Press →</button></div>
    </div>
  );
};

/* ============================================================
   5. PRESS CONFERENCE
   ============================================================ */
const PressScene: React.FC<{
  cfg: AwardNightConfig;
  onDone: (result: AwardPressResult) => void;
  completeLabel?: string;
}> = ({ cfg, onDone, completeLabel = 'Take Your Seat — Ceremony Begins →' }) => {
  const QA = cfg.pressQuestions.length ? cfg.pressQuestions : DEFAULT_CONFIG.pressQuestions;
  const [qi, setQi] = useState(0);
  const [typed, setTyped] = useState(0);
  const [locked, setLocked] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<{ html: React.ReactNode; key: number } | null>(null);
  const [floats, setFloats] = useState<{ id: number; text: string; neg: boolean; x: number; y: number }[]>([]);
  const [ended, setEnded] = useState(false);
  const [statsDelta, setStatsDelta] = useState<PressEffect>({});
  const [buzzDelta, setBuzzDelta] = useState(0);
  const [styles, setStyles] = useState<PressOption['s'][]>([]);
  const sceneRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wait = useTimers();
  const reporterHeights = useMemo(() => Array.from({ length: 11 }).map(() => 60 + Math.random() * 40), []);

  const qa = QA[qi];
  const doneTyping = typed >= qa.q.length;

  // typewriter — elapsed-time based so background-tab throttling can't stall it
  useEffect(() => {
    setTyped(0); setLocked(null);
    if (panelRef.current) panelRef.current.scrollTop = 0;
    const start = Date.now();
    const len = QA[qi].q.length;
    const iv = window.setInterval(() => {
      const n = Math.min(len, Math.floor((Date.now() - start) / 26));
      setTyped(n);
      if (n >= len) window.clearInterval(iv);
    }, 40);
    return () => window.clearInterval(iv);
  }, [qi, QA]);

  // ambient flashes
  useEffect(() => {
    const iv = window.setInterval(() => {
      const layer = flashRef.current;
      if (layer && Math.random() < .6) {
        const f = document.createElement('div'); f.className = 'pc-flash';
        const sz = 50 + Math.random() * 80;
        f.style.width = `${sz}px`; f.style.height = `${sz}px`;
        f.style.left = `${Math.random() * 85}%`; f.style.top = `${35 + Math.random() * 25}%`;
        layer.appendChild(f); window.setTimeout(() => f.remove(), 520);
      }
    }, 700);
    return () => window.clearInterval(iv);
  }, []);

  const burst = () => {
    const layer = flashRef.current;
    if (!layer) return;
    for (let i = 0; i < 7; i++) {
      window.setTimeout(() => {
        const f = document.createElement('div'); f.className = 'pc-flash';
        const sz = 60 + Math.random() * 100;
        f.style.width = `${sz}px`; f.style.height = `${sz}px`;
        f.style.left = `${Math.random() * 85}%`; f.style.top = `${25 + Math.random() * 35}%`;
        layer.appendChild(f); window.setTimeout(() => f.remove(), 520);
      }, i * 70);
    }
  };

  const pick = (idx: number, opt: PressOption, ev: React.MouseEvent<HTMLButtonElement>) => {
    if (locked !== null) return;
    setLocked(idx);
    const good = opt.consequences ? true : opt.s !== 'RISKY' || Math.random() < 0.6;
    const effect = good ? (opt.consequences || {}) : { reputation: -3, buzz: -2 };
    setStatsDelta(prev => ({
      fame: (prev.fame || 0) + (effect.fame || 0),
      reputation: (prev.reputation || 0) + (effect.reputation || 0),
      followers: (prev.followers || 0) + (effect.followers || 0)
    }));
    setBuzzDelta(prev => prev + (effect.buzz || 0));
    setStyles(prev => [...prev, opt.s]);
    const scene = sceneRef.current?.getBoundingClientRect();
    const r = ev.currentTarget.getBoundingClientRect();
    const id = Date.now();
    if (scene) {
      setFloats(f => [...f, {
        id, text: good ? opt.fx.split(' or')[0] : '-3 Reputation', neg: !good,
        x: r.left - scene.left + r.width - 120, y: r.top - scene.top - 6
      }]);
      wait(() => setFloats(f => f.filter(x => x.id !== id)), 1300);
    }
    burst();
    setToastMsg({
      key: id,
      html: good
        ? <>The room <b>scribbles furiously</b> — that's a quote.</>
        : <>A few reporters <b>exchange looks</b>…</>
    });
    wait(() => setToastMsg(null), 1600);
    wait(() => {
      if (qi + 1 < QA.length) setQi(qi + 1);
      else setEnded(true);
    }, 1400);
  };

  return (
    <div className="an-scene scn-press" ref={sceneRef}>
      <div className="pc-wall">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
          <rect width="400" height="300" fill="#12121a" />
          <defs>
            <pattern id="an-pw" width="80" height="46" patternUnits="userSpaceOnUse">
              <text x="8" y="18" fontSize="10" fontWeight="900" fill="rgba(240,180,41,.30)" fontFamily="Georgia">★ GS</text>
              <text x="44" y="38" fontSize="8" fill="rgba(190,190,200,.20)" fontFamily="Georgia">PRESS</text>
            </pattern>
          </defs>
          <rect width="400" height="300" fill="url(#an-pw)" />
        </svg>
      </div>
      <div className="pc-spot" />
      <div className="pc-avatar"><div className="avring"><Avatar url={cfg.avatarUrl} /></div></div>
      <div className="pc-table">
        <div className="cloth" />
        <div className="pc-mics">
          <div className="mic"><span className="flag">DST</span><span className="head" /><span className="stem" /></div>
          <div className="mic"><span className="flag">HWN</span><span className="head" /><span className="stem" /></div>
          <div className="mic"><span className="flag">CINE</span><span className="head" /><span className="stem" /></div>
        </div>
        <div className="plate">{cfg.playerName.toUpperCase()}</div>
      </div>
      <div className="pc-reporters">{reporterHeights.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
      <div ref={flashRef} style={{ position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none' }} />
      <div className="tv" style={{ zIndex: 8 }}>
        <div className="tv-live"><span className="r" /><span>PRESS ROOM</span></div>
        <div className="tv-watch"><b>38</b> outlets</div>
      </div>
      {toastMsg && <div className="pc-toast show" key={toastMsg.key}>{toastMsg.html}</div>}
      {floats.map(f => (
        <div key={f.id} className={`floatstat${f.neg ? ' neg' : ''}`} style={{ left: f.x, top: f.y }}>{f.text}</div>
      ))}
      <div className="pc-panel" ref={panelRef}>
        <div className="pc-progress">{QA.map((_, i) => <i key={i} className={i < qi || ended ? 'done' : ''} />)}</div>
        <div className="reporter-chip" key={qi}>
          <div className="mugshot">{qa.mug}</div>
          <div className="who">
            <div className="outlet">{qa.outlet}</div>
            <div className="name">{qa.name}</div>
          </div>
        </div>
        <div className="pc-q">“{qa.q.slice(0, typed)}”{!doneTyping && <span className="caret" />}</div>
        <div className="pc-opts">
          {doneTyping && qa.opts.map((o, i) => (
            <button key={i}
              className={`pc-opt pop${locked !== null ? (locked === i ? ' selected' : ' dim') : ''}`}
              style={{ animationDelay: `${i * 0.14}s` }}
              onClick={e => pick(i, o, e)}>
              <div className="row1"><span className="txt">{o.t}</span><span className={`stylebadge st-${o.s}`}>{o.s}</span></div>
              <div className="fx">{o.fx}</div>
            </button>
          ))}
        </div>
      </div>
      {ended && (
        <div className="pc-end on">
          <div className="k">Press Conference Over</div>
          <h2>The Room Loved You</h2>
          <div className="stats">
            <div className="s"><span className="l">Reputation</span><span className="v">{(statsDelta.reputation || 0) >= 0 ? '+' : ''}{statsDelta.reputation || 0}</span></div>
            <div className="s"><span className="l">Fame</span><span className="v">{(statsDelta.fame || 0) >= 0 ? '+' : ''}{statsDelta.fame || 0}</span></div>
            <div className="s"><span className="l">Followers</span><span className="v">{(statsDelta.followers || 0) >= 0 ? '+' : ''}{statsDelta.followers || 0}</span></div>
          </div>
          <div className="cta" style={{ position: 'static', width: '100%' }}>
            <button className="goldbtn" onClick={() => onDone({ statsDelta, buzzDelta, styles })}>{completeLabel}</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   6. CEREMONY
   ============================================================ */
interface CeremonyStep { type: 'filler' | 'player'; cat: string; noms: AwardNomineeDisplay[]; winner: AwardNomineeDisplay; movie?: string; }

const CeremonyScene: React.FC<{ cfg: AwardNightConfig; onDone: () => void }> = ({ cfg, onDone }) => {
  const playerCategories = useMemo<PlayerAwardCategory[]>(() => (
    cfg.playerCategories?.length
      ? cfg.playerCategories
      : [{ cat: cfg.playerCategory, movie: cfg.playerMovie, rivals: cfg.playerRivals, won: cfg.playerWins }]
  ), [cfg]);
  const steps = useMemo<CeremonyStep[]>(() => [
    ...cfg.ceremonyFillers.map(f => ({ type: 'filler' as const, ...f })),
    ...playerCategories.map(category => {
      const playerNominee = { name: cfg.playerName, project: category.movie, isPlayer: true };
      return {
        type: 'player' as const,
        cat: category.cat,
        movie: category.movie,
        noms: [...category.rivals.slice(0, 2), playerNominee, category.rivals[2]].filter(Boolean),
        winner: category.won ? playerNominee : category.rivals[0] || 'Another Nominee'
      };
    }),
    { type: 'filler' as const, ...cfg.ceremonyClosing }
  ], [cfg, playerCategories]);

  const [mode, setMode] = useState<'intro' | 'step'>('intro');
  const [idx, setIdx] = useState(0);
  const [sub, setSub] = useState<'trans' | 'reveal'>('trans');
  const [revealed, setRevealed] = useState(0);
  const [tension, setTension] = useState(false);
  const [result, setResult] = useState(false);
  const [confetti, setConfetti] = useState<React.CSSProperties[]>([]);
  const wait = useTimers();

  const step = steps[idx];
  const isPlayer = step?.type === 'player';
  const playerWon = isPlayer && nomineeIsPlayer(step.winner, cfg.playerName);

  const advance = useCallback(() => {
    if (idx + 1 >= steps.length) { onDone(); return; }
    setIdx(idx + 1);
    setSub('trans'); setRevealed(0); setTension(false); setResult(false); setConfetti([]);
  }, [idx, steps.length, onDone]);

  // intro → first step
  useEffect(() => {
    if (mode === 'intro') wait(() => setMode('step'), 3400);
  }, [mode, wait]);

  // per-step sequencing
  useEffect(() => {
    if (mode !== 'step' || !step) return;
    if (step.type === 'filler') {
      // quick pacing: rows pop fast, winner flashes, auto-advance
      let n = 0;
      const iv = window.setInterval(() => {
        n += 1; setRevealed(n);
        if (n >= step.noms.length) window.clearInterval(iv);
      }, 90);
      wait(() => setResult(true), 1100);
      wait(advance, 2600);
      return () => window.clearInterval(iv);
    }
    // player category: transition → slow reveal → tension → result (wait for tap)
    wait(() => {
      setSub('reveal');
      let n = 0;
      const iv = window.setInterval(() => {
        n += 1; setRevealed(n);
        if (n >= step.noms.length) window.clearInterval(iv);
      }, 1000);
      const revealMs = step.noms.length * 1000;
      wait(() => setTension(true), revealMs + 700);
      wait(() => {
        setResult(true);
        if (nomineeIsPlayer(step.winner, cfg.playerName)) {
          const colors = ['#f0b429', '#ffe9a8', '#c68a12', '#ffffff', '#e8c163'];
          setConfetti(Array.from({ length: 70 }).map(() => ({
            left: `${Math.random() * 100}%`,
            background: colors[Math.floor(Math.random() * colors.length)],
            animationDuration: `${2.4 + Math.random() * 2.4}s`,
            animationDelay: `${Math.random() * .7}s`,
            width: `${6 + Math.random() * 6}px`,
            height: `${10 + Math.random() * 8}px`
          })));
        }
      }, revealMs + 3200);
    }, 2400);
  }, [mode, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const nomRow = (n: AwardNomineeDisplay, i: number) => {
    const name = nomineeName(n);
    const project = nomineeProject(n);
    const you = nomineeIsPlayer(n, cfg.playerName);
    const winner = result && sameNominee(n, step.winner, cfg.playerName);
    const loser = result && !sameNominee(n, step.winner, cfg.playerName);
    return (
      <div key={nomineeKey(n, i)} className={`nom${i < revealed || result ? ' in' : ''}${you ? ' you' : ''}${winner ? ' winner' : ''}${loser ? ' loser' : ''}`}>
        <div>
          <div className="nm">{name}</div>
          {(you || project) && <span className="sub">{you ? 'You' : 'Project'} · {project || step.movie || cfg.playerMovie}</span>}
        </div>
        <span className="cup">🏆</span>
      </div>
    );
  };

  return (
    <div className="an-scene scn-ceremony">
      <div className="cer-beams"><i /><i /></div>
      <div className={`cer-dim${tension && !result ? ' on' : ''}`} />
      <div className="cer-progress">
        {steps.map((s, i) => (
          <i key={i} className={`${i < idx ? 'done ' : ''}${s.type === 'player' ? 'you' : ''}`} />
        ))}
      </div>
      <button className="skippill cer-skip" onClick={onDone}>⏩&nbsp; Skip Ceremony</button>
      <div className="cer-stage">
        {mode === 'intro' && (
          <>
            <div className="cer-medal">{TROPHY}</div>
            <div className="cer-title">{cfg.showName}</div>
            <div className="cer-meta">{cfg.venue} · {cfg.city}<br /><br /><b>LIVE BROADCAST</b></div>
          </>
        )}
        {mode === 'step' && step && step.type === 'filler' && (
          <>
            <div className="cat-kicker">Award Category</div>
            <div className="cat-name">{step.cat}</div>
            <div className="cat-for">&nbsp;</div>
            <div className="nomlist">{step.noms.map(nomRow)}</div>
          </>
        )}
        {mode === 'step' && isPlayer && sub === 'trans' && (
          <>
            <div className="cat-kicker you">Coming Up Next</div>
            <div className="cat-name" style={{ fontSize: 40 }}>{step.cat}</div>
            <div className="cat-for">Featuring <b>{step.movie}</b></div>
          </>
        )}
        {mode === 'step' && isPlayer && sub === 'reveal' && (
          <>
            <div className="cat-kicker">Category</div>
            <div className="cat-name">{step.cat}</div>
            <div className="cat-for">The nominees are…</div>
            <div className="nomlist">{step.noms.map(nomRow)}</div>
          </>
        )}
      </div>
      <div className="cer-bottom">
        {isPlayer && sub === 'reveal' && tension && !result && (
          <div className="goesto">And the award goes to<span className="d">...</span></div>
        )}
        {isPlayer && result && playerWon && (
          <>
            <div className="youwon">YOU WON!</div>
            <div className="wonsub">The room is on its feet.</div>
            <button className="acceptbtn" onClick={advance}>Accept the Award →</button>
          </>
        )}
        {isPlayer && result && !playerWon && (
          <>
            <div className="goesto" style={{ color: '#ddd' }}>{nomineeName(step.winner)}</div>
            <div className="wonsub">Cameras cut to your reaction.</div>
            <button className="applaud" onClick={advance}>Applaud politely &amp; continue</button>
          </>
        )}
      </div>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 25 }}>
        {confetti.map((s, i) => <i key={i} className="confetti" style={s} />)}
      </div>
    </div>
  );
};

/* ============================================================
   7. SUMMARY
   ============================================================ */
const SummaryScene: React.FC<{ cfg: AwardNightConfig; onLeave: () => void }> = ({ cfg, onLeave }) => {
  const isRedCarpetOnly = cfg.mode === 'RED_CARPET';
  const playerCategories = cfg.playerCategories?.length
    ? cfg.playerCategories
    : [{ cat: cfg.playerCategory, movie: cfg.playerMovie, rivals: cfg.playerRivals, won: cfg.playerWins }];
  const wins = playerCategories.filter(category => category.won).length;
  const others: [string, AwardNomineeDisplay][] = [
    ...cfg.ceremonyFillers.map(f => [f.cat, f.winner] as [string, AwardNomineeDisplay]),
    [cfg.ceremonyClosing.cat, cfg.ceremonyClosing.winner]
  ];
  if (isRedCarpetOnly) {
    return (
      <div className="an-scene scn-summary">
        <div className="sum-wrap">
          <div className="sum-k">{cfg.summaryKicker || 'Red Carpet Complete'}</div>
          <div className="sum-t">{cfg.summaryTitle || 'Premiere Highlights'}</div>
          <div className="sum-medal zero">
            <div className="disc"><span>RC</span></div>
          </div>
          <div className="sum-awardline">
            {cfg.summaryLine || <>{cfg.playerName} worked the carpet for <b>{cfg.playerMovie}</b>.</>}
          </div>
          <div className="sum-card">
            <div className="h">{cfg.summaryCardTitle || 'Carpet Moments'}</div>
            {others.map(([c, w]) => (
              <div key={c} className="sum-row">
                <span className="c">{c}</span>
                <span className={`w${nomineeIsPlayer(w, cfg.playerName) ? ' you' : ''}`}>{nomineeName(w)}</span>
              </div>
            ))}
          </div>
          <div className="sum-stats">
            <div className="s"><div className="l">Fame</div><div className="v">+2</div></div>
            <div className="s"><div className="l">Buzz</div><div className="v">+Press</div></div>
            <div className="s"><div className="l">Followers</div><div className="v">+10K</div></div>
          </div>
        </div>
        <div className="cta"><button onClick={onLeave}>{cfg.completeLabel || 'Leave Red Carpet & Save'}</button></div>
      </div>
    );
  }
  return (
    <div className="an-scene scn-summary">
      <div className="sum-wrap">
        <div className="sum-k">{cfg.summaryKicker || 'Ceremony Closed'}</div>
        <div className="sum-t">{cfg.summaryTitle || "Night's Highlights"}</div>
        <div className={`sum-medal${wins ? '' : ' zero'}`}>
          {wins > 0 && <><div className="ray" /><div className="ray" style={{ animationDelay: '-3s' }} /></>}
          <div className="disc"><span>{wins}</span></div>
        </div>
        <div className="sum-awardline">
          {wins > 0
            ? playerCategories.filter(category => category.won).map(category => (
              <div key={`${category.cat}-${category.movie}`}><b>{category.cat}</b> — {cfg.playerName} · <i>{category.movie}</i></div>
            ))
            : <>Nominated for <b>{playerCategories[0]?.cat || cfg.playerCategory}</b> — no win tonight.</>}
        </div>
        <div className="sum-card">
          <div className="h">{cfg.summaryCardTitle || 'Other Major Winners'}</div>
          {others.map(([c, w]) => (
            <div key={c} className="sum-row">
              <span className="c">{c}</span>
              <span className={`w${nomineeIsPlayer(w, cfg.playerName) ? ' you' : ''}`}>{nomineeName(w)}</span>
            </div>
          ))}
        </div>
        <div className="sum-stats">
          <div className="s"><div className="l">Fame</div><div className="v">+{wins ? 'High' : 'Low'}</div></div>
          <div className="s"><div className="l">Reputation</div><div className="v">+{wins ? 'High' : 'Med'}</div></div>
          <div className="s"><div className="l">Followers</div><div className="v">+{wins ? '50K' : '10K'}</div></div>
        </div>
      </div>
      <div className="cta"><button onClick={onLeave}>{cfg.completeLabel || 'Leave Party & Save'}</button></div>
    </div>
  );
};

/* ============================================================
   ROOT COMPONENT
   ============================================================ */
export interface AwardNightFlowProps {
  config?: Partial<AwardNightConfig>;
  onComplete?: (result: AwardNightResult) => void;
  onPressComplete?: (result: AwardPressResult) => void;
  /** show the little phase-jump pill bar (design review only) */
  debugNav?: boolean;
}

const PHASES: AwardPhase[] = ['DRESS', 'ARRIVAL', 'ENTRANCE', 'MONEY', 'NEWS', 'PRESS', 'CEREMONY', 'SUMMARY'];
const PHASE_LABEL: Record<AwardPhase, string> = {
  DRESS: 'Dress', ARRIVAL: 'Limo', ENTRANCE: 'Carpet', MONEY: 'Shot',
  NEWS: 'Press', PRESS: 'Conf', CEREMONY: 'Show', SUMMARY: 'End'
};

export const AwardNightFlow: React.FC<AwardNightFlowProps> = ({ config, onComplete, onPressComplete, debugNav }) => {
  const cfg = useMemo<AwardNightConfig>(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  const [phase, setPhase] = useState<AwardPhase>('DRESS');
  const [equipped, setEquipped] = useState<Equipped>({});
  const [pressResult, setPressResult] = useState<AwardPressResult | undefined>();

  const finish = useCallback(() => {
    onComplete?.({
      won: cfg.playerCategories?.some(category => category.won) ?? cfg.playerWins,
      styleScore: styleTotal(equipped),
      outfitName: outfitName(equipped),
      rideName: rideName(equipped),
      pressResult
    });
    setPhase('DRESS'); // demo loops; the game unmounts on onComplete
  }, [onComplete, cfg.playerWins, cfg.playerCategories, equipped, pressResult]);

  return (
    <div className="an-stage">
      <style>{STYLE}</style>
      {debugNav && (
        <div className="an-devnav">
          {PHASES.map(p => (
            <button key={p} className={phase === p ? 'cur' : ''} onClick={() => setPhase(p)}>{PHASE_LABEL[p]}</button>
          ))}
        </div>
      )}
      {phase === 'DRESS' && (
        <DressingRoom cfg={cfg} equipped={equipped} setEquipped={setEquipped}
          onConfirm={() => setPhase('ARRIVAL')} onSkip={() => setPhase('SUMMARY')} />
      )}
      {phase === 'ARRIVAL' && (
        <ArrivalScene
          cfg={cfg}
          vehicle={rideName(equipped)}
          vtype={equipped.RIDE?.vt ?? 'LIMO'}
          onDone={() => setPhase('ENTRANCE')}
        />
      )}
      {phase === 'ENTRANCE' && (
        <EntranceScene cfg={cfg} outfit={outfitName(equipped)}
          ride={equipped.RIDE && equipped.RIDE.n !== 'Taxi / Limo Service' ? equipped.RIDE.n : 'Limo'}
          onDone={() => setPhase('MONEY')} />
      )}
      {phase === 'MONEY' && (
        <MoneyShotScene cfg={cfg} styleScore={styleTotal(equipped)} vest={isVestMode(equipped)}
          onNext={() => setPhase('NEWS')} />
      )}
      {phase === 'NEWS' && (
        <NewspaperScene cfg={cfg} outfit={outfitName(equipped)} vest={isVestMode(equipped)}
          onNext={() => setPhase('PRESS')} />
      )}
      {phase === 'PRESS' && (
        <PressScene
          cfg={cfg}
          onDone={(result) => {
            setPressResult(result);
            onPressComplete?.(result);
            setPhase(cfg.mode === 'RED_CARPET' ? 'SUMMARY' : 'CEREMONY');
          }}
        />
      )}
      {phase === 'CEREMONY' && <CeremonyScene cfg={cfg} onDone={() => setPhase('SUMMARY')} />}
      {phase === 'SUMMARY' && <SummaryScene cfg={cfg} onLeave={finish} />}
    </div>
  );
};

export const AwardPressConferenceScene: React.FC<{
  config?: Partial<AwardNightConfig>;
  onComplete: (result: AwardPressResult) => void;
  onClose?: () => void;
  completeLabel?: string;
}> = ({ config, onComplete, onClose, completeLabel = 'Wrap Conference & Save →' }) => {
  const cfg = useMemo<AwardNightConfig>(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  return (
    <div className="an-stage">
      <style>{STYLE}</style>
      {onClose && (
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 18, right: 18, zIndex: 80, width: 36, height: 36, borderRadius: 18, background: 'rgba(0,0,0,.55)', border: '1px solid rgba(255,255,255,.16)', fontWeight: 900 }}
          aria-label="Close press conference"
        >
          X
        </button>
      )}
      <PressScene cfg={cfg} onDone={onComplete} completeLabel={completeLabel} />
    </div>
  );
};

export default AwardNightFlow;

/* ============================================================
   STYLE — identical visual system to the approved HTML prototype
   ============================================================ */
const STYLE = `
.an-stage{position:fixed;inset:0;z-index:80;max-width:520px;margin:0 auto;background:#000;overflow:hidden;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#fff;
  --gold:#f0b429;--gold-deep:#c68a12;--paper:#f2efe6;--carpet:#8f0f1d;
  --serif:"Georgia","Times New Roman",serif}
.an-stage :where(*){margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.an-stage :where(button){font-family:inherit;border:none;background:none;color:inherit;cursor:pointer}
.an-scene{position:absolute;inset:0;overflow:hidden}
.an-stage .avring{border-radius:50%;padding:4px;background:conic-gradient(from 120deg,#8a5f10,var(--gold),#ffe9a8,var(--gold),#8a5f10);box-shadow:0 16px 40px rgba(0,0,0,.7)}
.an-stage .avring canvas,.an-stage .avring .avimg{width:100%;height:100%;border-radius:50%;display:block;background:#2a2a33;image-rendering:pixelated;object-fit:cover}

.an-devnav{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:999;display:flex;gap:3px;background:rgba(10,10,10,.72);border:1px solid rgba(255,255,255,.08);padding:4px 6px;border-radius:999px;backdrop-filter:blur(10px);opacity:.22;transition:opacity .3s}
.an-devnav:hover{opacity:1}
.an-devnav button{font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#888;padding:4px 6px;border-radius:999px;font-weight:700}
.an-devnav button.cur{background:var(--gold);color:#000}

@keyframes an-fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes an-fadein{from{opacity:0}to{opacity:1}}
@keyframes an-blink{50%{opacity:.2}}
@keyframes an-kickpulse{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes an-sweepL{0%,100%{transform:rotate(-22deg)}50%{transform:rotate(14deg)}}
@keyframes an-sweepR{0%,100%{transform:rotate(22deg)}50%{transform:rotate(-14deg)}}
@keyframes an-pap{0%{opacity:0;transform:scale(.3)}12%{opacity:1;transform:scale(1.15)}100%{opacity:0;transform:scale(1.5)}}
@keyframes an-chippop{to{opacity:1;transform:none}}
@keyframes an-twinkle{0%,100%{opacity:.15}50%{opacity:.8}}
.letterbox::before,.letterbox::after{content:"";position:absolute;left:0;right:0;height:6%;background:#000;z-index:60;pointer-events:none}
.letterbox::before{top:0}.letterbox::after{bottom:0}
.cta{position:absolute;left:20px;right:20px;bottom:22px;z-index:40}
.cta button{width:100%;padding:16px;border-radius:16px;background:linear-gradient(160deg,#fff,#dcdcdc);color:#000;font-size:13px;font-weight:900;letter-spacing:.06em;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 14px 34px rgba(0,0,0,.6);transition:transform .12s}
.cta button:active{transform:scale(.97)}
.cta button.goldbtn{background:linear-gradient(160deg,#ffd76a,var(--gold-deep));color:#1a1102;box-shadow:0 14px 40px rgba(240,180,41,.28)}
.cta button.panicbtn{background:rgba(60,8,16,.85);color:#ff8b96;border:1px solid rgba(255,80,100,.35);box-shadow:0 14px 34px rgba(120,10,25,.35)}
.skippill{display:inline-flex;align-items:center;gap:7px;font-size:9px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#8a8a92;border:1px solid rgba(255,255,255,.16);padding:9px 16px;border-radius:999px;transition:.2s}
.skippill:active{transform:scale(.96)}
.whiteout{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:50}
.whiteout.go{animation:an-whiteout 1s ease-out forwards}
@keyframes an-whiteout{0%{opacity:0}18%{opacity:1}55%{opacity:1}100%{opacity:0}}

/* ===== dressing room ===== */
.scn-dress{background:radial-gradient(ellipse at 50% -12%,#2b1a06 0%,#0b0a0e 52%,#050506 100%)}
.dr-scroll{position:absolute;inset:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:20px 18px 130px}
.dr-head{position:relative;text-align:center;padding:10px 0 4px}
.dr-kicker{font-size:9px;font-weight:800;letter-spacing:.5em;text-transform:uppercase;color:var(--gold)}
.dr-title{font-family:var(--serif);font-size:29px;margin-top:8px;letter-spacing:.01em}
.dr-skip{position:absolute;right:0;top:8px;color:#6a6a72;padding:8px}
.dr-skip svg{display:block}
.mirror{position:relative;width:168px;height:168px;margin:26px auto 0}
.mirror .glow{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:270px;height:270px;background:radial-gradient(circle,rgba(240,180,41,.16),transparent 65%);pointer-events:none}
.mirror .avring{position:absolute;inset:14px}
.mirror .vbulb{position:absolute;width:8px;height:8px;border-radius:50%;background:#ffe9a8;box-shadow:0 0 9px 2px rgba(255,215,120,.75);animation:an-vanity 2.6s ease-in-out infinite}
@keyframes an-vanity{0%,100%{opacity:.45}50%{opacity:1}}
.style-pill{position:relative;z-index:2;margin:14px auto 0;width:max-content;display:flex;align-items:center;gap:8px;background:rgba(16,14,10,.9);border:1px solid rgba(240,180,41,.4);padding:8px 18px;border-radius:999px;box-shadow:0 10px 26px rgba(0,0,0,.5)}
.style-pill .star{color:var(--gold);font-size:12px}
.style-pill b{font-size:13px;letter-spacing:.04em}
.style-pill .delta{font-size:10px;font-weight:900;opacity:0;transition:.3s}
.style-pill .delta.show{opacity:1}
.dr-sec{display:flex;align-items:center;gap:12px;margin:26px 0 12px}
.dr-sec i{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(240,180,41,.25),transparent)}
.dr-sec span{font-size:9px;font-weight:800;letter-spacing:.4em;text-transform:uppercase;color:#7a7568}
.slotgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.slotcard{position:relative;border:1px solid rgba(255,255,255,.07);background:rgba(18,17,22,.8);border-radius:16px;padding:14px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;transition:border-color .2s,background .2s,transform .1s;overflow:hidden}
.slotcard:active{transform:scale(.97)}
.slotcard.wide{grid-column:1/-1}
.slotcard .ic{width:40px;height:40px;border-radius:50%;background:#101014;border:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;color:#5c5c66;transition:.2s}
.slotcard .lb{font-size:9px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:#77727a}
.slotcard .it{font-size:11.5px;font-weight:700;color:#4c4952;font-style:italic;line-height:1.2;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.slotcard.eq{border-color:rgba(240,180,41,.55);background:linear-gradient(180deg,rgba(52,38,10,.55),rgba(24,20,12,.8))}
.slotcard.eq .ic{background:var(--gold);color:#1a1102;border-color:transparent;box-shadow:0 0 18px rgba(240,180,41,.35)}
.slotcard.eq .lb{color:var(--gold)}
.slotcard.eq .it{color:#fff;font-style:normal}
.slotcard.eq::after{content:"";position:absolute;top:10px;right:10px;width:7px;height:7px;border-radius:50%;background:var(--gold);box-shadow:0 0 8px var(--gold);animation:an-blink 1.6s infinite}
.dr-foot{position:absolute;left:0;right:0;bottom:0;padding:16px 20px 22px;background:linear-gradient(transparent,#050506 45%);z-index:20}
.drawer-veil{position:absolute;inset:0;z-index:50;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);display:none;animation:an-fadein .2s}
.drawer-veil.on{display:block}
.drawer{position:absolute;left:0;right:0;bottom:0;background:#141318;border-radius:26px 26px 0 0;border-top:1px solid rgba(240,180,41,.25);max-height:68%;display:flex;flex-direction:column;animation:an-drawerup .32s cubic-bezier(.2,1,.3,1)}
@keyframes an-drawerup{from{transform:translateY(60%)}to{transform:none}}
.drawer .grip{width:44px;height:5px;border-radius:3px;background:#2c2b33;margin:10px auto 4px}
.drawer .dh{display:flex;justify-content:space-between;align-items:center;padding:10px 20px 12px;border-bottom:1px solid rgba(255,255,255,.06)}
.drawer .dh .t{font-size:15px;font-weight:800}
.drawer .dh .x{width:30px;height:30px;border-radius:50%;background:#232229;color:#9a9aa2;display:flex;align-items:center;justify-content:center;font-size:13px}
.drawer .list{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 16px 30px;display:flex;flex-direction:column;gap:8px}
.ditem{display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(255,255,255,.07);background:#0e0d12;border-radius:14px;padding:14px;text-align:left;transition:.15s}
.ditem:active{transform:scale(.98)}
.ditem .nm{font-size:13.5px;font-weight:800}
.ditem .mt{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#6f6a76;margin-top:3px;font-weight:700}
.ditem .mt b{color:var(--gold)}
.ditem.sel{border-color:rgba(240,180,41,.6);background:rgba(48,34,8,.45)}
.ditem .chk{width:22px;height:22px;border-radius:50%;background:var(--gold);color:#1a1102;display:none;align-items:center;justify-content:center;font-size:11px;font-weight:900}
.ditem.sel .chk{display:flex}
.ditem.none{border-style:dashed;justify-content:center;color:#6f6a76;font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase}

/* ===== arrival ===== */
.scn-arrival{background:linear-gradient(#04040a 0%,#0b0b16 55%,#08080d 72%,#000 100%)}
.arr-beams{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.arr-beams i{position:absolute;bottom:16%;width:110px;height:130vh;background:linear-gradient(to top,rgba(230,235,255,.10),transparent 70%);filter:blur(16px);transform-origin:bottom center}
.arr-beams i:nth-child(1){left:4%;animation:an-sweepL 9s ease-in-out infinite}
.arr-beams i:nth-child(2){right:4%;animation:an-sweepR 8s ease-in-out infinite}
.arr-stars{position:absolute;inset:0 0 40% 0}
.arr-stars i{position:absolute;width:2px;height:2px;background:#fff;border-radius:50%;animation:an-twinkle 3s ease-in-out infinite}
.skyline{position:absolute;left:0;right:0;bottom:34%;height:120px;opacity:.9}
.skyline svg{width:100%;height:100%}
.arr-road{position:absolute;left:0;right:0;bottom:0;height:30%;background:linear-gradient(#0d0d13,#08080b 70%,#000)}
.arr-txt{position:absolute;left:0;right:0;top:12%;text-align:center;padding:0 30px;z-index:5;transition:opacity 1s,transform 1s}
.arr-txt.dim{opacity:.28;transform:translateY(-8px)}
.arr-kicker{font-size:10px;letter-spacing:.65em;text-transform:uppercase;color:var(--gold);opacity:0;animation:an-fadeUp 1s .3s forwards,an-kickpulse 3s 1.5s ease-in-out infinite}
.arr-vehicle{font-family:var(--serif);font-size:38px;line-height:1.08;margin:20px 0 16px;opacity:0;animation:an-fadeUp 1.2s .8s forwards}
.arr-rule{width:0;height:1px;margin:0 auto;background:linear-gradient(90deg,transparent,var(--gold),transparent);animation:an-rulegrow 1.4s 1.2s forwards}
@keyframes an-rulegrow{to{width:230px}}
.arr-dest{margin-top:16px;font-size:10.5px;letter-spacing:.32em;text-transform:uppercase;color:#8a8a8a;font-weight:700;opacity:0;animation:an-fadeUp 1s 1.6s forwards}
.arr-dest b{color:#e8e8e8}
.arr-eta{position:absolute;left:0;right:0;bottom:7.5%;display:flex;justify-content:center;align-items:center;gap:10px;font-size:9.5px;letter-spacing:.28em;text-transform:uppercase;color:#5c5c64;opacity:0;animation:an-fadeUp 1s 3.2s forwards;z-index:5}
.arr-eta .dot{width:6px;height:6px;border-radius:50%;background:var(--gold);animation:an-blink 1s infinite}
.arr-vignette{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 42%,rgba(0,0,0,.8) 100%);pointer-events:none}
/* --- beat 2: light approaches out of the dark --- */
.approach{position:absolute;inset:0;z-index:6;pointer-events:none}
.approach .glow{position:absolute;bottom:22%;width:70px;height:44px;border-radius:50%;background:radial-gradient(ellipse,#fff7dd 0%,rgba(255,235,170,.55) 40%,transparent 70%);filter:blur(6px);animation:an-lightswell 2.6s cubic-bezier(.3,.1,.4,1) both}
.approach .glow.a{left:calc(50% - 64px)}
.approach .glow.b{left:calc(50% + 4px);animation-delay:.06s}
@keyframes an-lightswell{0%{transform:scale(.08) translateY(-30px);opacity:0}30%{opacity:.7}100%{transform:scale(1) translateY(0);opacity:1}}
.approach .wash{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 76%,rgba(255,240,200,.22),transparent 55%);opacity:0;animation:an-washin 2.2s .6s forwards}
@keyframes an-washin{to{opacity:1}}
.approach.above .glow{bottom:auto;top:14%;width:120px;height:60px;animation-name:an-lightdrop}
.approach.above .glow.a{left:calc(50% - 60px)}
.approach.above .glow.b{display:none}
@keyframes an-lightdrop{0%{transform:scale(.1) translateY(-40vh);opacity:0}40%{opacity:.8}100%{transform:scale(1) translateY(0);opacity:1}}
.approach.above .wash{background:radial-gradient(ellipse at 50% 18%,rgba(255,240,200,.20),transparent 60%)}
.approach.settled .glow{animation:an-idlelight 2.4s ease-in-out infinite}
@keyframes an-idlelight{0%,100%{opacity:.85}50%{opacity:1}}
.arr-flavor{position:absolute;left:0;right:0;bottom:26%;text-align:center;padding:0 44px;z-index:8;font-family:var(--serif);font-style:italic;font-size:15.5px;line-height:1.45;color:#d8d2c2;text-shadow:0 2px 14px rgba(0,0,0,.9);animation:an-fadeUp .9s .5s both}
/* --- beat 3: the door of light --- */
.doorlight{position:absolute;left:50%;bottom:19%;width:10px;height:148px;transform:translateX(-50%) skewX(-5deg);z-index:7;
  background:linear-gradient(90deg,rgba(255,220,140,0),#ffe9a8 30%,#fff6e0 50%,#ffe9a8 70%,rgba(255,220,140,0));
  filter:blur(1px);box-shadow:0 0 60px 14px rgba(255,220,140,.3);
  animation:an-dooropen 1s cubic-bezier(.4,0,.2,1) forwards}
@keyframes an-dooropen{0%{width:6px;opacity:0}25%{opacity:1}100%{width:104px;opacity:1}}
.doorspill{position:absolute;left:50%;bottom:8.5%;width:0;height:11.5%;transform:translateX(-50%);z-index:6;
  background:linear-gradient(180deg,rgba(200,30,50,.55),rgba(120,10,25,.25));
  clip-path:polygon(18% 0,82% 0,100% 100%,0 100%);filter:blur(2px);
  animation:an-spill .9s .3s cubic-bezier(.3,.7,.3,1) forwards}
@keyframes an-spill{to{width:200px}}
.figure{position:absolute;left:50%;bottom:10.5%;width:72px;transform:translateX(-50%);z-index:8;
  filter:drop-shadow(0 12px 18px rgba(0,0,0,.8));
  animation:an-stepout 1.4s .5s cubic-bezier(.3,.9,.3,1) both}
.figure svg{width:100%;display:block}
@keyframes an-stepout{0%{opacity:0;transform:translateX(-50%) translateY(26px) scale(.82)}45%{opacity:1}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
.crowdcap{position:absolute;left:0;right:0;bottom:51%;text-align:center;z-index:9;font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);text-shadow:0 2px 16px rgba(0,0,0,.9);animation:an-crowdcap .6s 1.2s cubic-bezier(.2,1.5,.4,1) both}
@keyframes an-crowdcap{0%{opacity:0;transform:translateY(14px) scale(.8)}100%{opacity:1;transform:translateY(0) scale(1)}}

/* ===== entrance ===== */
.scn-entrance{background:linear-gradient(#04040a 0%,#0a0a18 34%,#141428 52%,#1a0b10 60%,#12060a 100%)}
.ent-stars{position:absolute;inset:0 0 45% 0;overflow:hidden}
.ent-stars i{position:absolute;width:2px;height:2px;background:#fff;border-radius:50%;animation:an-twinkle 3s ease-in-out infinite}
.ent-beams{position:absolute;inset:0;pointer-events:none;z-index:2}
.ent-beams i{position:absolute;bottom:38%;width:70px;height:120vh;background:linear-gradient(to top,rgba(220,225,255,.14),rgba(220,225,255,.02) 60%,transparent);filter:blur(10px);transform-origin:bottom center}
.ent-beams i:nth-child(1){left:8%;animation:an-sweepL 11s ease-in-out infinite}
.ent-beams i:nth-child(2){left:26%;animation:an-sweepR 9s .8s ease-in-out infinite}
.ent-beams i:nth-child(3){right:26%;animation:an-sweepL 10s 1.6s ease-in-out infinite}
.ent-beams i:nth-child(4){right:8%;animation:an-sweepR 12s .4s ease-in-out infinite}
.theatre{position:absolute;left:50%;top:16%;transform:translateX(-50%);width:340px;z-index:4;display:flex;flex-direction:column;align-items:center}
.marquee{position:relative;width:100%;background:#160d05;border:3px solid #3a2610;border-radius:14px 14px 6px 6px;box-shadow:0 0 60px rgba(240,180,41,.28),0 14px 40px rgba(0,0,0,.8);overflow:hidden}
.bulb-row{display:flex;justify-content:space-between;padding:6px 10px}
.bulb-row i{width:7px;height:7px;border-radius:50%;background:#ffe9a8;box-shadow:0 0 8px 2px rgba(255,220,120,.85)}
.bulb-row i:nth-child(odd){animation:an-chase 1s steps(1) infinite}
.bulb-row i:nth-child(even){animation:an-chase 1s .5s steps(1) infinite}
@keyframes an-chase{0%,49%{opacity:1}50%,100%{opacity:.18}}
.marquee-body{background:linear-gradient(#fdf6dd,#f3e2ae);margin:0 8px;border-radius:4px;padding:12px 10px 10px;text-align:center;box-shadow:inset 0 0 18px rgba(120,80,10,.35)}
.marquee-title{font-family:var(--serif);font-weight:900;font-size:21px;letter-spacing:.06em;text-transform:uppercase;color:#5c0e0e;line-height:1}
.marquee-sub{margin-top:7px;font-size:8px;font-weight:800;letter-spacing:.42em;text-transform:uppercase;color:#8c6a1d;border-top:1px solid rgba(140,106,29,.4);padding-top:6px}
.theatre-doors{width:78%;height:74px;background:linear-gradient(#1c1208,#0c0703);border:2px solid #3a2610;border-top:none;position:relative;display:flex;justify-content:center;align-items:flex-end;overflow:hidden}
.door-glow{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:64px;height:58px;background:linear-gradient(#ffd98a,#e8930f);border-radius:6px 6px 0 0;box-shadow:0 0 34px 8px rgba(240,160,30,.5);opacity:.92}
.door-split{position:absolute;left:50%;bottom:0;width:2px;height:58px;background:rgba(60,30,0,.55)}
.theatre-doors .col{position:absolute;top:0;bottom:0;width:10px;background:linear-gradient(90deg,#4a3010,#8a6020,#4a3010)}
.theatre-doors .col.l{left:6px}.theatre-doors .col.r{right:6px}
.step-repeat{position:absolute;left:50%;top:calc(16% + 168px);transform:translateX(-50%);width:420px;height:64px;z-index:3;background-color:#101018;border-top:2px solid #26262f;opacity:.9;-webkit-mask-image:linear-gradient(#000 60%,transparent);mask-image:linear-gradient(#000 60%,transparent)}
.step-repeat svg{width:100%;height:100%}
.ent-ground{position:absolute;left:0;right:0;bottom:0;top:calc(16% + 200px);z-index:5}
.carpet{position:absolute;inset:0;background:linear-gradient(to bottom,#4d0810 0%,var(--carpet) 55%,#b01326 100%);clip-path:polygon(43.5% 0,56.5% 0,88% 100%,12% 100%)}
.carpet::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(to bottom,rgba(0,0,0,.14) 0 3px,transparent 3px 9px);opacity:.5}
.carpet-sheen{position:absolute;inset:0;clip-path:polygon(43.5% 0,56.5% 0,88% 100%,12% 100%);background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.10) 46%,transparent 60%);background-size:280% 100%;animation:an-sheen 5.5s ease-in-out infinite}
@keyframes an-sheen{0%{background-position:120% 0}100%{background-position:-80% 0}}
.carpet-edge{position:absolute;inset:0;pointer-events:none}
.carpet-edge::before,.carpet-edge::after{content:"";position:absolute;top:0;bottom:0;width:100%;background:linear-gradient(to bottom,rgba(240,180,41,.85),rgba(240,180,41,.35));filter:drop-shadow(0 0 6px rgba(240,180,41,.7))}
.carpet-edge::before{clip-path:polygon(43.2% 0,43.9% 0,12.8% 100%,11.2% 100%)}
.carpet-edge::after{clip-path:polygon(56.1% 0,56.8% 0,88.8% 100%,87.2% 100%)}
.floorside{position:absolute;top:0;bottom:0;width:50%;background:linear-gradient(to bottom,#0c0910,#171019)}
.floorside.l{left:0;clip-path:polygon(0 0,43.5% 0,12% 100%,0 100%)}
.floorside.r{right:0;clip-path:polygon(56.5% 0,100% 0,100% 100%,88% 100%)}
.stanchion{position:absolute;bottom:0;display:flex;flex-direction:column;align-items:center;transform-origin:bottom center;z-index:6}
.stanchion .top{width:9px;height:9px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffe9a8,#c68a12);box-shadow:0 0 8px rgba(240,180,41,.8)}
.stanchion .pole{width:3px;height:30px;background:linear-gradient(90deg,#7a5a12,#e8c163,#7a5a12)}
.crowdhead{position:absolute;z-index:6;transform-origin:bottom center}
.crowdhead svg{display:block}
.phoneflash{position:absolute;width:5px;height:8px;background:#cfe3ff;border-radius:1px;box-shadow:0 0 10px 3px rgba(190,215,255,.9);opacity:0;animation:an-phoneflash 4s infinite}
@keyframes an-phoneflash{0%,92%,100%{opacity:0}94%,96%{opacity:1}}
.papflash{position:absolute;width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.95),rgba(255,255,255,0) 70%);opacity:0;pointer-events:none;mix-blend-mode:screen;animation:an-pap .5s ease-out forwards}
.ent-player{position:absolute;left:50%;bottom:30%;z-index:12;display:flex;flex-direction:column;align-items:center;transform:translateX(-50%) scale(.30)}
.ent-player .shadow{position:absolute;bottom:-8px;width:150px;height:26px;background:rgba(0,0,0,.65);border-radius:50%;filter:blur(9px)}
.ent-player .avring{width:190px;height:190px}
.ent-bob{animation:an-bob .55s ease-in-out infinite}
@keyframes an-bob{0%,100%{transform:translateY(0) rotate(-.6deg)}50%{transform:translateY(-7px) rotate(.6deg)}}
.tv{position:absolute;inset:0;z-index:20;pointer-events:none}
.tv-live{position:absolute;top:20px;left:16px;display:flex;align-items:center;gap:7px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.12);padding:6px 12px;border-radius:6px;backdrop-filter:blur(6px)}
.tv-live .r{width:8px;height:8px;border-radius:50%;background:#ff2d3e;animation:an-blink 1.1s infinite}
.tv-live span{font-size:10px;font-weight:900;letter-spacing:.22em}
.tv-watch{position:absolute;top:20px;right:16px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.12);padding:6px 12px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:.08em;color:#ddd;backdrop-filter:blur(6px)}
.tv-watch b{color:var(--gold)}
.lower3{position:absolute;left:14px;right:14px;bottom:64px;display:flex;align-items:stretch;filter:drop-shadow(0 8px 22px rgba(0,0,0,.6));animation:an-l3in .7s .4s both}
@keyframes an-l3in{from{opacity:0;transform:translateX(-26px)}to{opacity:1;transform:none}}
.lower3 .tag{background:linear-gradient(160deg,var(--gold),var(--gold-deep));color:#1a1102;font-size:9px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;display:flex;align-items:center;padding:0 12px;border-radius:4px 0 0 4px}
.lower3 .txt{flex:1;background:rgba(8,8,12,.82);border:1px solid rgba(240,180,41,.25);border-left:none;padding:8px 14px;border-radius:0 4px 4px 0;backdrop-filter:blur(8px)}
.lower3 .txt .n{font-family:var(--serif);font-size:17px;font-weight:700;letter-spacing:.02em}
.lower3 .txt .o{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#b9a05a;margin-top:2px}
.ticker{position:absolute;left:0;right:0;bottom:0;height:30px;background:rgba(5,5,8,.9);border-top:1px solid rgba(240,180,41,.35);display:flex;align-items:center;overflow:hidden}
.ticker .lbl{flex-shrink:0;height:100%;display:flex;align-items:center;background:var(--gold);color:#1a1102;font-size:9px;font-weight:900;letter-spacing:.14em;padding:0 10px;z-index:2}
.ticker .roll{white-space:nowrap;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#c9c9c9;animation:an-roll 22s linear infinite;padding-left:100%}
@keyframes an-roll{to{transform:translateX(-100%)}}
.ticker .roll b{color:var(--gold)}
.tapcue{position:absolute;left:50%;bottom:44px;transform:translateX(-50%);z-index:30;font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.55);animation:an-kickpulse 2s infinite;pointer-events:none}

/* ===== money shot ===== */
.scn-money{background:radial-gradient(circle at 50% 30%,#17171f,#000 75%)}
.vf{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
.vf-bg{position:absolute;inset:0;background:linear-gradient(#141422 0%,#232338 45%,#5c0c16 62%,#8f0f1d 100%)}
.vf-bg .beamz{position:absolute;top:-10%;left:18%;width:60px;height:80%;background:linear-gradient(to top,rgba(255,255,255,.12),transparent);transform:rotate(18deg);filter:blur(8px)}
.vf-bg .beamz.b{left:auto;right:18%;transform:rotate(-18deg)}
.vf-av{position:relative;width:200px;z-index:2;animation:an-fadein .4s}
.vf-av .avring{width:100%;height:200px}
.vf-ui{position:absolute;inset:0;z-index:5;pointer-events:none;font-family:ui-monospace,Menlo,monospace}
.vf-ui .corner{position:absolute;width:34px;height:34px;border:3px solid rgba(255,255,255,.85)}
.vf-ui .c1{top:8%;left:7%;border-right:none;border-bottom:none}
.vf-ui .c2{top:8%;right:7%;border-left:none;border-bottom:none}
.vf-ui .c3{bottom:8%;left:7%;border-right:none;border-top:none}
.vf-ui .c4{bottom:8%;right:7%;border-left:none;border-top:none}
.vf-ui .focus{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:150px;height:150px;border:2px solid rgba(240,180,41,.9);animation:an-focuslock 1.1s ease-out forwards}
@keyframes an-focuslock{0%{width:280px;height:280px;opacity:.3}70%{width:150px;height:150px;opacity:1}85%{width:160px;height:160px}100%{width:150px;height:150px}}
.vf-ui .rec{position:absolute;top:9%;left:16%;display:flex;gap:7px;align-items:center;font-size:11px;letter-spacing:.2em;color:#ff4d5c}
.vf-ui .rec i{width:9px;height:9px;border-radius:50%;background:#ff2d3e;animation:an-blink .9s infinite}
.vf-ui .cam{position:absolute;top:9.5%;right:16%;font-size:9px;letter-spacing:.18em;color:rgba(255,255,255,.75)}
.vf-ui .af{position:absolute;bottom:10%;left:50%;transform:translateX(-50%);font-size:9px;letter-spacing:.3em;color:var(--gold);animation:an-blink 1.2s infinite}
.vf-flash{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.9),transparent 70%);opacity:0;mix-blend-mode:screen;pointer-events:none;animation:an-pap .45s ease-out forwards}
.shot-wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:26px}
.fan{position:relative;width:min(300px,80vw)}
.snap{background:#fdfdfa;padding:10px 10px 0;border-radius:3px;box-shadow:0 26px 60px rgba(0,0,0,.85),0 0 0 1px rgba(0,0,0,.35)}
.snap .ph{position:relative;aspect-ratio:4/5;background:linear-gradient(#141422 0%,#232338 45%,#5c0c16 62%,#8f0f1d 100%);overflow:hidden}
.snap .ph .beamz{position:absolute;top:-10%;left:20%;width:40px;height:80%;background:linear-gradient(to top,rgba(255,255,255,.14),transparent);transform:rotate(18deg);filter:blur(6px)}
.snap .ph .beamz.b{left:auto;right:20%;transform:rotate(-18deg)}
.snap .ph .av{position:absolute;left:50%;bottom:8%;transform:translateX(-50%);width:62%}
.snap .ph .av .avring{width:100%;height:auto;aspect-ratio:1}
.snap .ph .grain{position:absolute;inset:0;background:repeating-conic-gradient(rgba(255,255,255,.03) 0 .3deg,transparent .3deg .6deg);mix-blend-mode:overlay}
.snap .ph .wm{position:absolute;top:8px;right:8px;font-size:7px;letter-spacing:.2em;color:rgba(255,255,255,.6);text-transform:uppercase}
.snap .cap{padding:11px 6px 14px;text-align:center;color:#1c1c1c;font-family:var(--serif);font-style:italic;font-size:12.5px}
.snap.main{position:relative;z-index:3;transform:rotate(-2.5deg);animation:an-shotin .7s .15s cubic-bezier(.2,1.4,.4,1) both}
.snap.side{position:absolute;top:6%;width:78%;z-index:1}
.snap.side .ph{filter:grayscale(1) contrast(1.15)}
.snap.side.a{left:-14%;transform:rotate(-11deg);animation:an-sidein .6s .4s cubic-bezier(.2,1.3,.4,1) both}
.snap.side.b{right:-14%;transform:rotate(9deg);animation:an-sidein2 .6s .55s cubic-bezier(.2,1.3,.4,1) both}
.snap.side.b .ph{filter:sepia(.5) contrast(1.05)}
@keyframes an-shotin{from{opacity:0;transform:rotate(-14deg) scale(.6) translateY(60px)}to{opacity:1;transform:rotate(-2.5deg) scale(1) translateY(0)}}
@keyframes an-sidein{from{opacity:0;transform:rotate(-24deg) translateY(50px) scale(.7)}to{opacity:1;transform:rotate(-11deg) translateY(0) scale(1)}}
@keyframes an-sidein2{from{opacity:0;transform:rotate(22deg) translateY(50px) scale(.7)}to{opacity:1;transform:rotate(9deg) translateY(0) scale(1)}}
.shot-stamp{position:absolute;top:-14px;right:-14px;z-index:5;background:var(--gold);color:#1a1102;font-size:10px;font-weight:900;letter-spacing:.1em;padding:8px 12px;border-radius:999px;transform:rotate(8deg);box-shadow:0 8px 20px rgba(0,0,0,.5);animation:an-stampin .5s .9s cubic-bezier(.2,1.6,.4,1) both}
@keyframes an-stampin{from{opacity:0;transform:rotate(30deg) scale(2.2)}to{opacity:1;transform:rotate(8deg) scale(1)}}
.shot-sub{margin-top:34px;text-align:center;animation:an-fadeUp .8s 1.1s both}
.shot-sub .k{font-size:9px;letter-spacing:.5em;text-transform:uppercase;color:var(--gold)}
.shot-sub .t{font-family:var(--serif);font-size:19px;margin-top:8px;color:#e8e8e8}

/* ===== newspaper ===== */
.scn-news{background:radial-gradient(circle at 50% 20%,#101014,#000 80%)}
.news-wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:20px}
.paper{width:min(360px,92vw);max-height:88vh;overflow:hidden;background:var(--paper);color:#111;border-radius:2px;box-shadow:0 40px 90px rgba(0,0,0,.9);padding:16px 16px 14px;position:relative;animation:an-spinin 1.1s cubic-bezier(.25,1,.35,1) both}
@keyframes an-spinin{0%{opacity:0;transform:rotate(540deg) scale(.05)}70%{opacity:1}100%{opacity:1;transform:rotate(-1.2deg) scale(1)}}
.paper::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(120,100,60,.04) 0 2px,transparent 2px 4px)}
.mast-meta{display:flex;justify-content:space-between;font-size:7px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;border-bottom:1.5px solid #111;padding-bottom:4px}
.mast{font-family:var(--serif);font-weight:900;font-size:44px;letter-spacing:-.02em;text-align:center;line-height:.95;text-transform:uppercase;padding:8px 0 6px}
.mast-tag{text-align:center;font-size:7.5px;font-weight:800;letter-spacing:.5em;text-transform:uppercase;font-style:italic;border-top:1px solid #111;border-bottom:3px double #111;padding:4px 0}
.headline{font-family:var(--serif);font-weight:900;font-style:italic;font-size:27px;line-height:1;text-transform:uppercase;text-align:center;padding:14px 4px 10px;letter-spacing:-.01em;animation:an-fadeUp .6s 1s both}
.news-photo{position:relative;border:1.5px solid #111;padding:3px;background:#fff;animation:an-fadeUp .6s 1.2s both}
.news-photo .ph{position:relative;aspect-ratio:16/10;background:#888;overflow:hidden}
.news-photo .news-av{position:absolute;left:50%;top:12%;transform:translateX(-50%);width:52%}
.news-photo .news-av canvas,.news-photo .news-av .avimg{width:100%;filter:grayscale(1) contrast(1.25) brightness(1.05);image-rendering:pixelated;display:block}
.news-photo .halftone{position:absolute;inset:0;background-image:radial-gradient(rgba(0,0,0,.55) 22%,transparent 24%);background-size:3.5px 3.5px;mix-blend-mode:overlay;pointer-events:none}
.news-photo .bg-carpet{position:absolute;inset:0;background:linear-gradient(#555 0%,#666 55%,#3a3a3a 100%)}
.news-photo .cred{position:absolute;right:0;bottom:0;background:#111;color:#eee;font-size:6px;letter-spacing:.14em;text-transform:uppercase;padding:2px 5px}
.news-cap{display:flex;justify-content:space-between;align-items:baseline;font-size:8px;padding:6px 2px;border-bottom:1px solid #111;animation:an-fadeUp .6s 1.3s both}
.news-cap b{text-transform:uppercase;letter-spacing:.06em}
.news-cap i{font-family:var(--serif);color:#444}
.news-body{columns:2;column-gap:12px;column-rule:1px solid rgba(0,0,0,.25);font-family:var(--serif);font-size:8.5px;line-height:1.5;text-align:justify;padding:8px 2px 4px;animation:an-fadeUp .6s 1.45s both}
.news-body .drop{float:left;font-size:24px;font-weight:900;line-height:.8;padding-right:3px}
.buzzbar{margin-top:8px;border-top:2px solid #111;padding-top:8px;animation:an-fadeUp .6s 1.6s both}
.buzzbar .row{display:flex;justify-content:space-between;align-items:center;font-size:8px;font-weight:900;letter-spacing:.22em;text-transform:uppercase}
.buzzbar .val{font-size:11px}
.buzz-track{margin-top:5px;height:9px;background:#ddd6c2;border:1px solid #111;overflow:hidden}
.buzz-fill{height:100%;width:0;background:repeating-linear-gradient(-45deg,#111 0 5px,#3a3a3a 5px 10px);animation:an-buzzfill 1.6s 1.9s cubic-bezier(.2,.9,.3,1) forwards}
@keyframes an-buzzfill{to{width:var(--buzz,72%)}}
.news-chips{position:absolute;left:0;right:0;bottom:78px;display:flex;justify-content:center;gap:8px;z-index:5}
.chip{background:rgba(12,12,16,.85);border:1px solid rgba(240,180,41,.35);border-radius:999px;padding:7px 13px;font-size:10px;font-weight:800;letter-spacing:.08em;color:#eee;backdrop-filter:blur(8px);opacity:0;transform:translateY(16px)}
.chip.pop{animation:an-chippop .5s cubic-bezier(.2,1.5,.4,1) forwards}
.chip b{color:#57e389}
.chip.neg b{color:#ff5c6a}

/* ===== press conference ===== */
.scn-press{background:#08080c}
.pc-wall{position:absolute;inset:0 0 44% 0;background:#101017;overflow:hidden}
.pc-wall svg{width:100%;height:100%;opacity:.75}
.pc-wall::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 80%,transparent 30%,rgba(0,0,0,.75) 100%)}
.pc-spot{position:absolute;top:-16%;left:50%;transform:translateX(-50%);width:340px;height:340px;background:radial-gradient(circle,rgba(255,244,214,.16),transparent 65%);pointer-events:none}
.pc-table{position:absolute;left:0;right:0;top:38%;height:20%;z-index:4}
.pc-table .cloth{position:absolute;inset:0;background:linear-gradient(#15151d,#0b0b10);border-top:3px solid #26262f;box-shadow:0 -12px 40px rgba(0,0,0,.6)}
.pc-table .plate{position:absolute;left:50%;top:16px;transform:translateX(-50%);background:linear-gradient(#f5ecd2,#dcc98f);color:#3a2a08;font-family:var(--serif);font-weight:700;font-size:12px;letter-spacing:.08em;padding:5px 18px;clip-path:polygon(6% 0,94% 0,100% 100%,0 100%);box-shadow:0 6px 14px rgba(0,0,0,.5)}
.pc-mics{position:absolute;left:50%;top:-34px;transform:translateX(-50%);display:flex;gap:14px;align-items:flex-end}
.mic{display:flex;flex-direction:column;align-items:center}
.mic .head{width:11px;height:15px;border-radius:6px;background:linear-gradient(#666,#222);border:1px solid #000}
.mic .stem{width:2.5px;height:22px;background:#333}
.mic .flag{margin-bottom:2px;font-size:5.5px;font-weight:900;letter-spacing:.06em;color:#fff;background:#8f0f1d;padding:2px 4px;border-radius:2px;text-transform:uppercase}
.mic:nth-child(2) .flag{background:#1b4b9c}
.mic:nth-child(3) .flag{background:#0f6e3d}
.pc-avatar{position:absolute;left:50%;top:12%;transform:translateX(-50%);z-index:3;width:118px}
.pc-avatar .avring{width:100%;height:auto;aspect-ratio:1}
.pc-flash{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.9),transparent 70%);opacity:0;mix-blend-mode:screen;pointer-events:none;animation:an-pap .45s ease-out forwards}
.pc-reporters{position:absolute;left:0;right:0;bottom:41%;height:9%;z-index:5;display:flex;justify-content:center;gap:4px;align-items:flex-end;-webkit-mask-image:linear-gradient(#000 40%,transparent);mask-image:linear-gradient(#000 40%,transparent)}
.pc-reporters i{width:34px;height:100%;background:radial-gradient(circle at 50% 18%, #1e1e26 26%, #14141a 27%);border-radius:12px 12px 0 0;opacity:.9}
.pc-panel{position:absolute;left:0;right:0;bottom:0;top:52%;z-index:10;padding:14px 18px 34px;background:linear-gradient(transparent,rgba(0,0,0,.6) 14%,#050508 34%);display:flex;flex-direction:column;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.pc-progress{display:flex;gap:5px;justify-content:center;margin-bottom:12px;flex-shrink:0}
.pc-progress i{width:26px;height:3px;border-radius:2px;background:#26262f;transition:background .4s}
.pc-progress i.done{background:var(--gold)}
.reporter-chip{display:flex;align-items:center;gap:10px;margin-bottom:10px;animation:an-fadeUp .5s both;flex-shrink:0}
.reporter-chip .mugshot{width:34px;height:34px;border-radius:50%;background:linear-gradient(140deg,#33333f,#191920);border:1px solid rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;font-size:15px}
.reporter-chip .who .outlet{font-size:9px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}
.reporter-chip .who .name{font-size:10px;color:#9a9aa4}
.pc-q{font-family:var(--serif);font-style:italic;font-size:19px;line-height:1.25;color:#f2f2f2;min-height:52px;margin-bottom:14px;flex-shrink:0}
.pc-q .caret{display:inline-block;width:8px;height:16px;background:var(--gold);margin-left:3px;vertical-align:-2px;animation:an-blink .8s infinite}
.pc-opts{display:flex;flex-direction:column;gap:9px;padding-bottom:10px;flex-shrink:0}
.pc-opt{position:relative;text-align:left;border:1px solid rgba(255,255,255,.09);background:rgba(20,20,28,.85);border-radius:14px;padding:13px 15px;backdrop-filter:blur(8px);opacity:0;transform:translateY(16px);transition:border-color .2s,background .2s,transform .1s;overflow:hidden;flex-shrink:0}
.pc-opt.pop{animation:an-chippop .45s cubic-bezier(.2,1.4,.4,1) forwards}
.pc-opt:active{transform:scale(.98)}
.pc-opt .row1{display:flex;justify-content:space-between;align-items:center;gap:10px}
.pc-opt .txt{font-size:13px;font-weight:700;color:#fff;line-height:1.3}
.pc-opt .stylebadge{flex-shrink:0;font-size:8px;font-weight:900;letter-spacing:.16em;padding:4px 8px;border-radius:5px;text-transform:uppercase}
.pc-opt .fx{margin-top:6px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#7a7a86;font-weight:700}
.st-SAFE{background:rgba(64,145,255,.16);color:#6fb0ff}
.st-HUMBLE{background:rgba(46,204,113,.16);color:#5ce398}
.st-BOLD{background:rgba(175,110,255,.18);color:#c79bff}
.st-RISKY{background:rgba(255,70,90,.16);color:#ff7382}
.pc-opt.selected{border-color:var(--gold);background:rgba(60,45,10,.6)}
.pc-opt.dim{opacity:.25!important;pointer-events:none}
.floatstat{position:absolute;font-size:12px;font-weight:900;letter-spacing:.08em;color:#57e389;z-index:60;pointer-events:none;animation:an-floatup 1.3s ease-out forwards;text-shadow:0 2px 10px rgba(0,0,0,.8)}
.floatstat.neg{color:#ff5c6a}
@keyframes an-floatup{from{opacity:0;transform:translateY(6px)}20%{opacity:1}to{opacity:0;transform:translateY(-44px)}}
.pc-toast{position:absolute;top:16%;left:50%;transform:translateX(-50%);z-index:70;background:rgba(10,10,14,.9);border:1px solid rgba(240,180,41,.4);border-radius:10px;padding:9px 16px;font-size:10.5px;letter-spacing:.06em;color:#eee;white-space:nowrap;backdrop-filter:blur(8px);animation:an-fadein .4s}
.pc-toast b{color:var(--gold)}
.pc-end{position:absolute;inset:0;z-index:80;background:rgba(3,3,5,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px;backdrop-filter:blur(6px);animation:an-fadein .6s both}
.pc-end .k{font-size:9px;letter-spacing:.5em;text-transform:uppercase;color:var(--gold);margin-bottom:14px}
.pc-end h2{font-family:var(--serif);font-size:30px;margin-bottom:22px}
.pc-end .stats{display:flex;gap:22px;margin-bottom:34px}
.pc-end .stats .s{display:flex;flex-direction:column;gap:4px}
.pc-end .stats .s .l{font-size:8px;letter-spacing:.24em;text-transform:uppercase;color:#77777f}
.pc-end .stats .s .v{font-size:19px;font-weight:900;color:#57e389}

/* ===== ceremony ===== */
.scn-ceremony{background:radial-gradient(ellipse at 50% -10%,#191408 0%,#08070a 55%,#030304 100%)}
.cer-beams{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.cer-beams i{position:absolute;bottom:-10%;width:80px;height:130vh;background:linear-gradient(to top,rgba(240,200,120,.07),transparent 70%);filter:blur(14px);transform-origin:bottom center}
.cer-beams i:nth-child(1){left:12%;animation:an-sweepL 12s ease-in-out infinite}
.cer-beams i:nth-child(2){right:12%;animation:an-sweepR 10s ease-in-out infinite}
.cer-stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;text-align:center;z-index:5}
.cer-skip{position:absolute;top:22px;right:18px;z-index:40}
.cer-progress{position:absolute;top:30px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:40}
.cer-progress i{width:20px;height:3px;border-radius:2px;background:#232028;transition:background .4s}
.cer-progress i.done{background:var(--gold)}
.cer-progress i.you{outline:1px solid rgba(240,180,41,.5);outline-offset:2px}
.cer-medal{width:96px;height:96px;border-radius:50%;background:conic-gradient(from 200deg,#8a5f10,var(--gold),#ffe9a8,var(--gold),#8a5f10);display:flex;align-items:center;justify-content:center;box-shadow:0 0 60px rgba(240,180,41,.35),0 20px 50px rgba(0,0,0,.7);animation:an-medalpulse 3s ease-in-out infinite}
@keyframes an-medalpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
.cer-medal svg{width:44px;height:44px}
.cer-title{font-family:var(--serif);font-size:37px;text-transform:uppercase;letter-spacing:.06em;font-weight:900;line-height:1.1;margin-top:26px}
.cer-meta{margin-top:14px;font-size:10px;letter-spacing:.32em;text-transform:uppercase;color:#8a8578;font-weight:700}
.cer-meta b{color:var(--gold)}
.cat-kicker{font-size:9px;font-weight:800;letter-spacing:.5em;text-transform:uppercase;color:#7c7668;margin-bottom:12px}
.cat-kicker.you{color:var(--gold);animation:an-kickpulse 1.6s infinite}
.cat-name{font-family:var(--serif);font-size:31px;line-height:1.1;margin-bottom:6px}
.cat-for{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#8a8578;font-weight:700;margin-bottom:24px}
.cat-for b{color:#ddd}
.nomlist{width:100%;max-width:360px;display:flex;flex-direction:column;gap:10px}
.nom{position:relative;display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(255,255,255,.08);background:rgba(20,19,25,.85);border-radius:14px;padding:15px 16px;opacity:0;transform:translateY(14px);transition:all .5s}
.nom.in{opacity:1;transform:none}
.nom .nm{font-size:14.5px;font-weight:800;text-align:left}
.nom .sub{display:block;font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:#7a7568;font-weight:800;margin-top:3px}
.nom.you{border-color:rgba(240,180,41,.5)}
.nom.you .sub{color:var(--gold)}
.nom.winner{border-color:var(--gold);background:linear-gradient(160deg,rgba(80,58,12,.85),rgba(40,30,10,.9));transform:scale(1.05);box-shadow:0 0 44px rgba(240,180,41,.28);opacity:1}
.nom.loser{opacity:.28;filter:blur(.6px)}
.nom .cup{color:var(--gold);font-size:16px;display:none}
.nom.winner .cup{display:block;animation:an-cupbounce .7s ease infinite alternate}
@keyframes an-cupbounce{to{transform:translateY(-4px)}}
.cer-bottom{position:absolute;left:0;right:0;bottom:8%;display:flex;flex-direction:column;align-items:center;gap:14px;z-index:30}
.goesto{font-size:11px;font-weight:900;letter-spacing:.32em;text-transform:uppercase;color:var(--gold)}
.goesto .d{display:inline-block;animation:an-dotty 1.2s steps(4) infinite;overflow:hidden;vertical-align:bottom;white-space:nowrap;width:0}
@keyframes an-dotty{to{width:1.6em}}
.youwon{font-size:30px;font-weight:900;letter-spacing:-.02em;color:var(--gold);text-shadow:0 0 30px rgba(240,180,41,.5);animation:an-wonin .6s cubic-bezier(.2,1.5,.4,1) both}
@keyframes an-wonin{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
.wonsub{font-size:11px;color:#b9b4a6;margin-top:4px}
.acceptbtn{margin-top:10px;background:linear-gradient(160deg,#ffd76a,var(--gold-deep));color:#1a1102;font-size:12px;font-weight:900;letter-spacing:.08em;padding:14px 34px;border-radius:999px;box-shadow:0 0 34px rgba(240,180,41,.4);animation:an-fadeUp .5s .3s both}
.acceptbtn:active{transform:scale(.96)}
.applaud{font-size:11px;color:#8a8a92;text-decoration:underline;text-underline-offset:3px;animation:an-fadeUp .5s .3s both}
.confetti{position:absolute;top:-4%;width:9px;height:14px;z-index:20;pointer-events:none;animation:an-confall linear forwards}
@keyframes an-confall{0%{transform:translateY(-4vh) rotate(0) rotateY(0)}100%{transform:translateY(110vh) rotate(680deg) rotateY(720deg)}}
.cer-dim{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,transparent 25%,rgba(0,0,0,.88) 90%);opacity:0;transition:opacity 1.2s;pointer-events:none;z-index:8}
.cer-dim.on{opacity:1}

/* ===== summary ===== */
.scn-summary{background:radial-gradient(ellipse at 50% -10%,#241a08 0%,#0a090c 50%,#040405 100%)}
.sum-wrap{position:absolute;inset:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:54px 22px 120px;display:flex;flex-direction:column;align-items:center;text-align:center}
.sum-k{font-size:9px;letter-spacing:.5em;text-transform:uppercase;color:#8a8578;font-weight:800;animation:an-fadeUp .6s both}
.sum-t{font-family:var(--serif);font-size:34px;margin:10px 0 26px;animation:an-fadeUp .6s .1s both}
.sum-medal{position:relative;width:110px;height:110px;margin-bottom:10px;animation:an-fadeUp .6s .2s both}
.sum-medal .disc{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 200deg,#8a5f10,var(--gold),#ffe9a8,var(--gold),#8a5f10);display:flex;align-items:center;justify-content:center;box-shadow:0 0 70px rgba(240,180,41,.35),0 22px 50px rgba(0,0,0,.7)}
.sum-medal .disc span{font-size:40px;font-weight:900;color:#1a1102}
.sum-medal.zero .disc{background:conic-gradient(from 200deg,#33323a,#4a4954,#5c5b66,#4a4954,#33323a);box-shadow:0 22px 50px rgba(0,0,0,.7)}
.sum-medal.zero .disc span{color:#c9c9d2}
.sum-medal .ray{position:absolute;left:50%;top:50%;width:2px;height:36px;background:linear-gradient(rgba(240,180,41,.8),transparent);transform-origin:top center;animation:an-rayspin 6s linear infinite;opacity:.6}
@keyframes an-rayspin{to{transform:rotate(360deg)}}
.sum-awardline{font-size:12px;color:#cfc9ba;margin-bottom:26px;animation:an-fadeUp .6s .3s both}
.sum-awardline b{color:var(--gold)}
.sum-card{width:100%;max-width:380px;border:1px solid rgba(240,180,41,.22);background:linear-gradient(180deg,rgba(30,26,16,.7),rgba(14,13,16,.85));border-radius:22px;padding:20px;margin-bottom:16px;animation:an-fadeUp .6s .4s both}
.sum-card .h{font-size:9px;letter-spacing:.34em;text-transform:uppercase;color:#8a8578;font-weight:800;margin-bottom:14px;text-align:left}
.sum-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:12.5px}
.sum-row:last-child{border-bottom:none}
.sum-row .c{color:#9a958a;text-align:left}
.sum-row .w{font-weight:800;color:#fff;text-align:right}
.sum-row .w.you{color:var(--gold)}
.sum-stats{display:flex;gap:26px;margin:14px 0 8px;animation:an-fadeUp .6s .5s both}
.sum-stats .s .l{font-size:8px;letter-spacing:.24em;text-transform:uppercase;color:#77727a;font-weight:800}
.sum-stats .s .v{font-size:19px;font-weight:900;color:#57e389;margin-top:4px}
`;
