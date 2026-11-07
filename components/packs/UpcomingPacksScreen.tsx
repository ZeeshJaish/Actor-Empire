import React, { useEffect, useRef } from 'react';
import { useMergedState } from './useMergedState';
import '../../styles/packs/upcoming-packs.css';

export type PackId = 'cinema' | 'sue' | 'nine' | 'folly' | 'blackout';

const PK_PACKS: { id: PackId; bright: boolean; halo: string; name: string; fantasy: string }[] = [
  { id: 'cinema', bright: false, halo: '#e8b64c', name: 'Cinema Chain', fantasy: 'Own the screens. Keep the box office.' },
  { id: 'sue', bright: true, halo: '#dfe6f5', name: 'Sue Everyone', fantasy: 'Sue anyone in town. Take their stuff.' },
  { id: 'nine', bright: false, halo: '#c2a566', name: 'The Gilded Nine', fantasy: 'Trade anything. Decide everything.' },
  { id: 'folly', bright: false, halo: '#e08a5b', name: 'The Folly', fantasy: 'Risk everything on one film.' },
  { id: 'blackout', bright: false, halo: '#7dff9a', name: 'The Blackout Job', fantasy: 'Your film crew robs rivals blind.' },
];

/* The Blackout's vault door: the approved page's rings, face and wheel. Its 160 box holds the door with the collar and hinges. */
const PkBlackoutDoor = () => (
  <span className="pk-list-bk-door">
    <svg className="pk-list-l" viewBox="0 0 288 288">
      <use href="#pk-list-bk-collar"></use>
    </svg>
    <span className="pk-list-bk-ring pk-list-bk-rim"></span>
    <span className="pk-list-bk-ring pk-list-bk-mid"></span>
    <span className="pk-list-bk-ring pk-list-bk-core"></span>
    <svg className="pk-list-l" viewBox="0 0 288 288">
      <use href="#pk-list-bk-face"></use>
    </svg>
    <span className="pk-list-bk-ring pk-list-bk-light"></span>
  </span>
);
const PK_HOLD = 3600;
const PK_SWAP = 220;
const PK_FADE = 860;

interface UpcomingPacksScreenProps {
  onBack: () => void;
  onOpenPack: (pack: PackId) => void;
}

export default function UpcomingPacksScreen({ onBack, onOpenPack }: UpcomingPacksScreenProps) {
  const [state, set, latest] = useMergedState({ cur: 0, prev: -1, turn: '', link: 0, halo: 0, spotOff: false, held: false });
  const run = useRef(false);
  const holding = useRef(false);
  const due = useRef(0);
  const left = useRef(0);
  const pending = useRef(-1);
  const tick = useRef<ReturnType<typeof setTimeout>>(undefined);
  const swap = useRef<ReturnType<typeof setTimeout>>(undefined);
  const clear = useRef<ReturnType<typeof setTimeout>>(undefined);

  const arm = (ms: number) => {
    due.current = Date.now() + ms;
    tick.current = setTimeout(next, ms);
  };

  const next = () => {
    const { cur } = latest.current;
    const to = (cur + 1) % PK_PACKS.length;
    const was = PK_PACKS[cur].bright;
    const will = PK_PACKS[to].bright;
    const turn = was === will ? 'pk-list-cross' : will ? 'pk-list-to-light' : 'pk-list-to-dark';
    set({ cur: to, prev: cur, turn, spotOff: true });
    armSwap(to);
    clearTimeout(clear.current);
    clear.current = setTimeout(() => set({ prev: -1 }), PK_FADE);
    const late = Date.now() - due.current;
    arm(late < PK_HOLD ? PK_HOLD - late : PK_HOLD);
  };

  /* the link and the halo follow a beat after the scene starts to change, once the old world has gone */
  const armSwap = (to: number) => {
    pending.current = to;
    clearTimeout(swap.current);
    swap.current = setTimeout(() => {
      pending.current = -1;
      set({ link: to, halo: to, spotOff: false });
    }, PK_SWAP);
  };

  const hold = () => {
    if (!run.current || holding.current) return;
    holding.current = true;
    left.current = Math.max(0, due.current - Date.now());
    clearTimeout(tick.current);
    clearTimeout(swap.current);
    set({ held: true });
  };

  const free = () => {
    if (!holding.current) return;
    holding.current = false;
    set({ held: false });
    if (pending.current >= 0) armSwap(pending.current);
    arm(left.current);
  };

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    run.current = true;
    arm(PK_HOLD);
    return () => {
      run.current = false;
      clearTimeout(tick.current);
      clearTimeout(swap.current);
      clearTimeout(clear.current);
    };
  }, []);

  const { cur, prev, turn, link, halo, spotOff, held } = state;
  const dest = PK_PACKS[link];
  const show = {} as Record<PackId, boolean>;
  const sc = {} as Record<PackId, string>;
  const lit = {} as Record<PackId, string>;
  PK_PACKS.forEach((p, i) => {
    show[p.id] = i === cur || i === prev;
    sc[p.id] = i === cur ? 'pk-list-is-cur ' + turn : i === prev ? 'pk-list-is-prev ' + turn : '';
    lit[p.id] = i === cur ? 'pk-list-is-lit' : '';
  });
  const v = {
    show,
    sc,
    lit,
    rootClass: held ? 'pk-list-held' : '',
    stageOpen: () => onOpenPack(PK_PACKS[latest.current.link].id),
    stageLabel: 'Open ' + dest.name + '. ' + dest.fantasy,
    spot: { c: cur % 2, r: Math.floor(cur / 2), h: PK_PACKS[halo].halo, cls: spotOff ? 'pk-list-spot-off' : '' },
    hold,
    free,
    progClass: dest.bright ? 'pk-list-prog-ink' : '',
    goClass: PK_PACKS[cur].bright ? 'pk-list-go-ink' : '',
    ticks: PK_PACKS.map((_, i) => ({ cls: i === cur ? 'pk-list-tick-on' : '' })),
  };
  return (
    <div className={`pk-list-root ${v.rootClass}`}>
      <svg className="pk-list-defs" aria-hidden="true" width="0" height="0">
        <defs>
          <linearGradient id="pk-list-x1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff2c8" stopOpacity=".42"></stop>
            <stop offset="1" stopColor="#fff2c8" stopOpacity="0"></stop>
          </linearGradient>
          <radialGradient id="pk-list-x2" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#000" stopOpacity=".62"></stop>
            <stop offset=".6" stopColor="#000" stopOpacity=".3"></stop>
            <stop offset="1" stopColor="#000" stopOpacity="0"></stop>
          </radialGradient>
          <radialGradient id="pk-list-v1" cx=".38" cy=".32" r=".8">
            <stop offset="0" stopColor="#d9b463"></stop>
            <stop offset=".5" stopColor="#a5791f"></stop>
            <stop offset="1" stopColor="#55390b"></stop>
          </radialGradient>
          {/* CINEMA: the page's own gold ticket, in its own numbers */}
          <linearGradient id="pk-list-c1" gradientUnits="userSpaceOnUse" x1="60" y1="-20" x2="236" y2="186">
            <stop offset="0" stopColor="#ffedb6"></stop>
            <stop offset=".16" stopColor="#ffdf8e"></stop>
            <stop offset=".52" stopColor="#e8b64c"></stop>
            <stop offset=".84" stopColor="#b98a2e"></stop>
            <stop offset="1" stopColor="#a87c24"></stop>
          </linearGradient>
          <radialGradient id="pk-list-c3" gradientUnits="userSpaceOnUse" cx="84" cy="30" r="170">
            <stop offset="0" stopColor="#fff" stopOpacity=".42"></stop>
            <stop offset=".5" stopColor="#fff" stopOpacity=".08"></stop>
            <stop offset="1" stopColor="#fff" stopOpacity="0"></stop>
          </radialGradient>
          <linearGradient id="pk-list-c4" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="164">
            <stop offset="0" stopColor="#fff6d6" stopOpacity=".95"></stop>
            <stop offset=".5" stopColor="#ffe6a6" stopOpacity=".35"></stop>
            <stop offset="1" stopColor="#6e4c12" stopOpacity=".6"></stop>
          </linearGradient>
          <pattern id="pk-list-c5" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(62)">
            <rect width="1" height="3" fill="#fff" fillOpacity=".06"></rect>
            <rect x="1.5" width="1" height="3" fill="#5a3a08" fillOpacity=".06"></rect>
          </pattern>
          <linearGradient id="pk-list-c7" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a060c"></stop>
            <stop offset="1" stopColor="#7a1420"></stop>
          </linearGradient>
          <linearGradient id="pk-list-c8" gradientUnits="userSpaceOnUse" x1="72" y1="48" x2="132" y2="112">
            <stop offset="0" stopColor="#3d3322"></stop>
            <stop offset=".34" stopColor="#17120b"></stop>
            <stop offset=".62" stopColor="#0f0b06"></stop>
            <stop offset="1" stopColor="#201a10"></stop>
          </linearGradient>
          <path id="pk-list-c2" d="M24 0H276A24 24 0 0 1 300 24V60A22 22 0 0 0 300 104V140A24 24 0 0 1 276 164H24A24 24 0 0 1 0 140V104A22 22 0 0 0 0 60V24A24 24 0 0 1 24 0Z"></path>
          <path id="pk-list-c6" d="M103 47.6L111.3 70.6L135.7 71.3L116.4 86.4L123.2 109.9L103 96.1L82.8 109.9L89.6 86.4L70.3 71.3L94.7 70.6Z"></path>
          <g id="pk-list-h-cinema">
            <g transform="translate(10 41) rotate(-9 70 38) scale(.4667)">
              <use href="#pk-list-c2" fill="#664512" transform="translate(0 3.4)"></use>
              <use href="#pk-list-c2" fill="url(#pk-list-c1)"></use>
              <use href="#pk-list-c2" fill="url(#pk-list-c5)"></use>
              <path d="M153 83.5L188 84.5M157.8 93.4L179 97.8M149.5 100.5L187.5 115.7M150.6 111.4L177.6 128.1M140.3 115.3L175.4 146.6M137.7 126L149.3 140.7M126.7 126L137.1 145.4M120.6 135.2L123.1 142.8M110.2 131.5L112.2 145.3M101.3 138L101.1 146M92.8 131L89.8 145.6M82.3 134L78.8 142.7M76.7 124.5L63.6 145.8M65.7 123.8L51.4 139.9M63.8 113L21.4 146.4M53.7 108.5L28.3 122.2M55.5 97.7L22.3 108.7M47.6 90.1L38.3 91.4M53 80.5L36 80M48.2 70.6L36.9 68.3M56.5 63.5L18.5 48.3M55.4 52.6L28.4 35.9M65.7 48.7L30.6 17.4M68.3 38L56.7 23.3M79.3 38L68.9 18.6M85.4 28.8L82.9 21.2M95.8 32.5L93.8 18.7M104.7 26L104.9 18M113.2 33L116.2 18.4M123.7 30L127.2 21.3M129.3 39.5L142.4 18.2M140.3 40.2L154.6 24.1M142.2 51L184.6 17.6M152.3 55.5L177.7 41.8M150.5 66.3L187.5 54.1M158.4 73.9L179.1 70.9" fill="none" stroke="#6a4610" strokeOpacity=".24" strokeWidth="1"></path>
              <use href="#pk-list-c2" fill="url(#pk-list-c3)"></use>
              <path d="M28 12H194V152H28A16 16 0 0 1 12 136V109.5A30 30 0 0 0 12 54.5V28A16 16 0 0 1 28 12ZM216 12H272A16 16 0 0 1 288 28V54.5A30 30 0 0 0 288 109.5V136A16 16 0 0 1 272 152H216Z" fill="none" stroke="#5a3a08" strokeOpacity=".6" strokeWidth="1.2"></path>
              <path d="M28 13.2H193M13.2 54V28A14.8 14.8 0 0 1 28 13.2M216 13.2H272A14.8 14.8 0 0 1 286.8 28V54M207.7 0V164" fill="none" stroke="#fff6dc" strokeOpacity=".36" strokeWidth=".9"></path>
              <path d="M205.6 8V160" stroke="#4a3006" strokeWidth="5" strokeLinecap="round" strokeDasharray="0 10.8" fill="none"></path>
              <use href="#pk-list-c6" fill="#fff4cc" transform="translate(1.2 1.5)"></use>
              <use href="#pk-list-c6" fill="#6a4610" transform="translate(-1 -1.2)"></use>
              <use href="#pk-list-c6" fill="url(#pk-list-c8)"></use>
              <text x="103" y="32" textAnchor="middle" fontFamily="Archivo" fontWeight="800" fontSize="13" letterSpacing="2.4" fill="#4a3006" fillOpacity=".9">OPENING NIGHT</text>
              <text x="103" y="142" textAnchor="middle" fontFamily="Archivo" fontWeight="800" fontSize="13" letterSpacing="2.4" fill="#3e2806" fillOpacity=".9">ROW A</text>
              <text transform="translate(252 82) rotate(90)" textAnchor="middle" dominantBaseline="central" fontFamily="Archivo" fontWeight="800" fontSize="18" letterSpacing="3.2" fill="#14100a">ADMIT ONE</text>
              <text transform="translate(229 82) rotate(90)" textAnchor="middle" dominantBaseline="central" fontFamily="Archivo" fontWeight="800" fontSize="11" letterSpacing="1.6" fill="#4a3006">SEAT 1</text>
              <use href="#pk-list-c2" fill="none" stroke="url(#pk-list-c4)" strokeWidth="1.5"></use>
            </g>
          </g>
          <g id="pk-list-c-val">
            <path d="M-320 -6H212V9C202 19 188 19 178 9C168 19 154 19 144 9C134 19 120 19 110 9C100 19 86 19 76 9C66 19 52 19 42 9C32 19 18 19 8 9C-2 19 -16 19 -26 9C-36 19 -50 19 -60 9C-70 19 -84 19 -94 9C-104 19 -118 19 -128 9C-138 19 -152 19 -162 9C-172 19 -186 19 -196 9C-206 19 -220 19 -230 9C-240 19 -254 19 -264 9C-274 19 -288 19 -298 9C-308 19 -322 19 -332 9Z" fill="url(#pk-list-c7)"></path>
            <path d="M212 12C202 22 188 22 178 12C168 22 154 22 144 12C134 22 120 22 110 12C100 22 86 22 76 12C66 22 52 22 42 12C32 22 18 22 8 12C-2 22 -16 22 -26 12C-36 22 -50 22 -60 12C-70 22 -84 22 -94 12C-104 22 -118 22 -128 12C-138 22 -152 22 -162 12C-172 22 -186 22 -196 12C-206 22 -220 22 -230 12C-240 22 -254 22 -264 12C-274 22 -288 22 -298 12C-308 22 -322 22 -332 12" fill="none" stroke="#a97a26" strokeWidth="5" strokeDasharray=".9 1.1"></path>
            <path d="M212 9C202 19 188 19 178 9C168 19 154 19 144 9C134 19 120 19 110 9C100 19 86 19 76 9C66 19 52 19 42 9C32 19 18 19 8 9C-2 19 -16 19 -26 9C-36 19 -50 19 -60 9C-70 19 -84 19 -94 9C-104 19 -118 19 -128 9C-138 19 -152 19 -162 9C-172 19 -186 19 -196 9C-206 19 -220 19 -230 9C-240 19 -254 19 -264 9C-274 19 -288 19 -298 9C-308 19 -322 19 -332 9" fill="none" stroke="#e8b64c" strokeWidth="1.6"></path>
          </g>
          <path id="pk-list-c-beams" d="M58 -10L12 150H70L66 -10ZM94 -10L90 150H148L102 -10Z" fill="url(#pk-list-x1)"></path>
          <ellipse id="pk-list-c-floor" cx="80" cy="121" rx="60" ry="7" fill="url(#pk-list-x2)"></ellipse>
          <linearGradient id="pk-list-c9" gradientUnits="userSpaceOnUse" x1="0" y1="150" x2="0" y2="192">
            <stop offset="0" stopColor="#22090b"></stop>
            <stop offset="1" stopColor="#070404"></stop>
          </linearGradient>
          <path id="pk-list-c-seats" d="M-75 250V156a6 6 0 0 1 6-6H-54a6 6 0 0 1 6 6V250ZM-42 250V156a6 6 0 0 1 6-6H-21a6 6 0 0 1 6 6V250ZM-9 250V156a6 6 0 0 1 6-6H12a6 6 0 0 1 6 6V250ZM24 250V156a6 6 0 0 1 6-6H45a6 6 0 0 1 6 6V250ZM57 250V156a6 6 0 0 1 6-6H78a6 6 0 0 1 6 6V250ZM90 250V156a6 6 0 0 1 6-6H111a6 6 0 0 1 6 6V250ZM123 250V156a6 6 0 0 1 6-6H144a6 6 0 0 1 6 6V250ZM156 250V156a6 6 0 0 1 6-6H177a6 6 0 0 1 6 6V250Z" fill="url(#pk-list-c9)"></path>
          <path id="pk-list-c-seatline" d="M-74.600 156a5.600 5.600 0 0 1 5.600-5.600H-54a5.600 5.600 0 0 1 5.600 5.600M-41.600 156a5.600 5.600 0 0 1 5.600-5.600H-21a5.600 5.600 0 0 1 5.600 5.600M-8.600 156a5.600 5.600 0 0 1 5.600-5.600H12a5.600 5.600 0 0 1 5.600 5.600M24.400 156a5.600 5.600 0 0 1 5.600-5.600H45a5.600 5.600 0 0 1 5.600 5.600M57.400 156a5.600 5.600 0 0 1 5.600-5.600H78a5.600 5.600 0 0 1 5.600 5.600M90.400 156a5.600 5.600 0 0 1 5.600-5.600H111a5.600 5.600 0 0 1 5.600 5.600M123.400 156a5.600 5.600 0 0 1 5.600-5.600H144a5.600 5.600 0 0 1 5.600 5.600M156.400 156a5.600 5.600 0 0 1 5.600-5.600H177a5.600 5.600 0 0 1 5.600 5.600" fill="none" stroke="#ffb98a" strokeWidth=".7" opacity=".42"></path>
          {/* SUE: the courthouse from below, the subpoena stack and the rubber stamp */}
          <linearGradient id="pk-list-s1" gradientUnits="userSpaceOnUse" x1="72" y1="0" x2="128" y2="0">
            <stop offset="0" stopColor="#4c2710"></stop>
            <stop offset=".1" stopColor="#8c5427"></stop>
            <stop offset=".24" stopColor="#dc9c5a"></stop>
            <stop offset=".31" stopColor="#f6c98f"></stop>
            <stop offset=".4" stopColor="#bb7539"></stop>
            <stop offset=".62" stopColor="#6f3b19"></stop>
            <stop offset=".86" stopColor="#301709"></stop>
            <stop offset="1" stopColor="#54414a"></stop>
          </linearGradient>
          <radialGradient id="pk-list-s2" gradientUnits="userSpaceOnUse" cx="89" cy="15" r="42">
            <stop offset="0" stopColor="#f8c98f"></stop>
            <stop offset=".22" stopColor="#c8843f"></stop>
            <stop offset=".55" stopColor="#7a431c"></stop>
            <stop offset=".86" stopColor="#35190a"></stop>
            <stop offset="1" stopColor="#24110a"></stop>
          </radialGradient>
          <linearGradient id="pk-list-s3" gradientUnits="userSpaceOnUse" x1="71" y1="0" x2="129" y2="0">
            <stop offset="0" stopColor="#6a4c16"></stop>
            <stop offset=".16" stopColor="#c79c3c"></stop>
            <stop offset=".28" stopColor="#fff2b8"></stop>
            <stop offset=".42" stopColor="#d6aa48"></stop>
            <stop offset=".72" stopColor="#8a6420"></stop>
            <stop offset="1" stopColor="#4a3410"></stop>
          </linearGradient>
          <linearGradient id="pk-list-s4" gradientUnits="userSpaceOnUse" x1="30" y1="86" x2="170" y2="114">
            <stop offset="0" stopColor="#d9a067"></stop>
            <stop offset=".45" stopColor="#9a5f2d"></stop>
            <stop offset="1" stopColor="#5a3115"></stop>
          </linearGradient>
          <linearGradient id="pk-list-s5" gradientUnits="userSpaceOnUse" x1="26" y1="0" x2="174" y2="0">
            <stop offset="0" stopColor="#7c4720"></stop>
            <stop offset=".18" stopColor="#a4632e"></stop>
            <stop offset=".55" stopColor="#6a3818"></stop>
            <stop offset="1" stopColor="#2c1508"></stop>
          </linearGradient>
          <linearGradient id="pk-list-s6" gradientUnits="userSpaceOnUse" x1="0" y1="129" x2="0" y2="140">
            <stop offset="0" stopColor="#2a0810"></stop>
            <stop offset=".45" stopColor="#6a0c1b"></stop>
            <stop offset=".82" stopColor="#c8102e"></stop>
            <stop offset="1" stopColor="#e6324c"></stop>
          </linearGradient>
          <linearGradient id="pk-list-s7" gradientUnits="userSpaceOnUse" x1="10" y1="10" x2="30" y2="30">
            <stop offset="0" stopColor="#d4dbe6"></stop>
            <stop offset=".5" stopColor="#9aa7bd"></stop>
            <stop offset="1" stopColor="#5d6b8b"></stop>
          </linearGradient>
          <linearGradient id="pk-list-s9" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff"></stop>
            <stop offset=".58" stopColor="#fefdf9"></stop>
            <stop offset="1" stopColor="#ecebe4"></stop>
          </linearGradient>
          <g id="pk-list-s-bg">
            <path fill="#afbbd0" d="M-268 112L-79 -14H-76.9L-263.3 112ZM-258.7 112L-74.7 -14H-72.6L-254 112ZM-198 112L-47 -14H-45.1L-193.8 112ZM-189.6 112L-43.2 -14H-41.2L-185.3 112ZM-130 112L-15.9 -14H-14.1L-126 112ZM-122 112L-12.3 -14H-10.5L-118 112ZM-62 112L15.1 -14H16.9L-58 112ZM-54 112L18.8 -14H20.6L-50 112ZM-4 112L41.6 -14H43.3L-.2 112ZM3.6 112L45.1 -14H46.8L7.3 112ZM130 112L102.8 -14H104.6L133.8 112ZM137.6 112L106.3 -14H108L141.3 112ZM186 112L128.4 -14H130.3L190 112ZM194 112L132.1 -14H133.9L198 112ZM-263.3 112L-76.9 -14H-74.7L-258.7 112ZM-230.7 112L-61.9 -14H-59.8L-226 112ZM-193.8 112L-45.1 -14H-43.2L-189.6 112ZM-164.2 112L-31.6 -14H-29.7L-160 112ZM-126 112L-14.1 -14H-12.3L-122 112ZM-98 112L-1.3 -14H.5L-94 112ZM-58 112L16.9 -14H18.8L-54 112ZM-30 112L29.7 -14H31.6L-26 112ZM-.2 112L43.3 -14H45.1L3.6 112ZM26.2 112L55.4 -14H57.2L30 112ZM133.8 112L104.6 -14H106.3L137.6 112ZM160.2 112L116.7 -14H118.4L164 112ZM190 112L130.3 -14H132.1L194 112ZM218 112L143.1 -14H144.9L222 112Z"></path>
            <path fill="#e9ecf1" d="M-254 112L-72.6 -14H-70.5L-249.3 112ZM-244.7 112L-68.3 -14H-66.2L-240 112ZM-235.3 112L-64.1 -14H-61.9L-230.7 112ZM-185.3 112L-41.2 -14H-39.3L-181.1 112ZM-176.9 112L-37.4 -14H-35.4L-172.7 112ZM-168.4 112L-33.5 -14H-31.6L-164.2 112ZM-118 112L-10.5 -14H-8.6L-114 112ZM-110 112L-6.8 -14H-5L-106 112ZM-102 112L-3.2 -14H-1.3L-98 112ZM-50 112L20.6 -14H22.4L-46 112ZM-42 112L24.3 -14H26.1L-38 112ZM-34 112L27.9 -14H29.7L-30 112ZM7.3 112L46.8 -14H48.5L11.1 112ZM14.9 112L50.3 -14H52L18.7 112ZM22.4 112L53.7 -14H55.4L26.2 112ZM141.3 112L108 -14H109.7L145.1 112ZM148.9 112L111.5 -14H113.2L152.7 112ZM156.4 112L114.9 -14H116.7L160.2 112ZM198 112L133.9 -14H135.7L202 112ZM206 112L137.6 -14H139.4L210 112ZM214 112L141.2 -14H143.1L218 112Z"></path>
            <path fill="#fdfcf9" d="M-249.3 112L-70.5 -14H-68.3L-244.7 112ZM-240 112L-66.2 -14H-64.1L-235.3 112ZM-181.1 112L-39.3 -14H-37.4L-176.9 112ZM-172.7 112L-35.4 -14H-33.5L-168.4 112ZM-114 112L-8.6 -14H-6.8L-110 112ZM-106 112L-5 -14H-3.2L-102 112ZM-46 112L22.4 -14H24.3L-42 112ZM-38 112L26.1 -14H27.9L-34 112ZM11.1 112L48.5 -14H50.3L14.9 112ZM18.7 112L52 -14H53.7L22.4 112ZM145.1 112L109.7 -14H111.5L148.9 112ZM152.7 112L113.2 -14H114.9L156.4 112ZM202 112L135.7 -14H137.6L206 112ZM210 112L139.4 -14H141.2L214 112Z"></path>
            <rect x="-340" y="103" width="640" height="130" fill="#f7f5f0"></rect>
            <path d="M-340 125H300M-340 140H300M-340 158H300M-340 180H300" fill="none" stroke="#d0d7e2" strokeWidth="1.5"></path>
            <path d="M146 125L300 216V125ZM96 140L232 233H128L68 140Z" fill="#8496b6" opacity=".26"></path>
          </g>
          <path id="pk-list-s-cloud" transform="translate(16 -12) scale(.4)" d="M-6 62C6 34 34 24 60 34C70 8 110 -6 140 8C160 -14 206 -12 224 12C254 2 290 18 294 48C316 56 322 88 300 104C314 128 292 156 262 150C248 176 206 182 182 164C160 186 116 186 96 166C70 178 34 166 30 140C2 136 -14 104 6 88C-8 82 -12 72 -6 62Z" fill="#2c3f70" opacity=".27"></path>
          <g id="pk-list-pigeon-b">
            <path d="M16.5 29v3.6M21.5 29.5v3.1M14.5 33h4M19.5 33h4" fill="none" stroke="#c8102e" strokeWidth="1.4" strokeLinecap="round"></path>
            <path d="M10 14C14 10 24 10 30 16C31.200 17.200 32 18.600 32.300 20L43 26.500L41 30L28 27.900C22 31 13 30 9 25C7 21 7 17 10 14Z" fill="url(#pk-list-s7)"></path>
            <path d="M14 15C20 12 28 15 34 24C27 26 18 25 14 19.5ZM21.6 14.800L26.800 24.700L28.600 24.600L23.600 15.400ZM26.200 17.200L30.800 24.200L32.200 23.800L28 17.900Z" fill="#b6c0d1" fillRule="evenodd"></path>
          </g>
          <g id="pk-list-pigeon-h">
            <path d="M9 16C7.8 11.5 8.6 9.5 7 9.2L1.800 7.200L6.200 4.800C7 2.400 9 1.500 11 1.700C14 2 15.500 4.400 15.200 7C16.600 9 17.300 11.500 17.300 14.400C14.400 17.600 11 17.800 9 16Z" fill="#56698f"></path>
            <circle cx="9.300" cy="5.600" r="1.250" fill="#e9772a"></circle>
          </g>
          <g id="pk-list-h-sue" transform="translate(0 8)">
            <path d="M36 74L126 72L150 132L22 140Z" fill="#3d4f7c" opacity=".3"></path>
            <path d="M30 80L128 78L140 130L18 134ZM30 77.500L129 75.500L141 127.500L19 131.500ZM31 75.500L129 73.500L141 125L20 129Z" fill="#f1f2f4" stroke="#8391b6" strokeWidth=".5"></path>
            <path d="M31 73L129 71L141 123L19 127Z" fill="url(#pk-list-s9)" stroke="#aeb6c9" strokeWidth=".4"></path>
            <g transform="rotate(-1.100 80 96)">
              <text x="80" y="93.500" textAnchor="middle" fontFamily="Special Elite" fontSize="15.500" letterSpacing="1.700" fill="#12234a">SUBPOENA</text>
              <path d="M31 97H129M31 98.400H129" fill="none" stroke="#12234a" strokeWidth=".55"></path>
              <text x="28.500" y="108.500" fontFamily="Special Elite" fontSize="9.200" fill="#12234a">TO: YOUR EX</text>
              <text x="27.500" y="116.500" fontFamily="Special Elite" fontSize="6.200" letterSpacing=".15" fill="#b50e29">RE: THE GOOD SOFA</text>
            </g>
          </g>
          <path id="pk-list-s-sign" d="M104 118C107 111 110 108 111 109C112 111 108 118 109.500 119C111 120 114 112 116 112.600C117 113 115 117 117 117C119 117 120 113.400 122 114C123 114.600 122 117 124 116.400C127 115.400 130 113.400 136 111" fill="none" stroke="#12234a" strokeLinecap="round"></path>
          <g id="pk-list-m-sue">
            <g transform="translate(30 9.500) scale(.5)">
              <path d="M41 90H159L174 110H26Z" fill="url(#pk-list-s4)"></path>
              <rect x="26" y="110" width="148" height="19" fill="url(#pk-list-s5)"></rect>
              <path d="M41 90.400H159M26 110.600H174" fill="none" stroke="#ffd9a8" strokeWidth="1" opacity=".75"></path>
              <rect x="64" y="112.600" width="72" height="14" rx="1" fill="#f7efda" stroke="#7a6743" strokeWidth=".6"></rect>
              <text x="100" y="124" textAnchor="middle" fontFamily="Anton" fontSize="12" letterSpacing="1.600" fill="#c8102e">SERVED</text>
              <rect x="29" y="129" width="142" height="11" rx="1.600" fill="url(#pk-list-s6)"></rect>
              <path d="M71.500 90H128.500V97C128.500 104.500 71.500 104.500 71.500 97Z" fill="url(#pk-list-s3)"></path>
              <path d="M100 2C114 2 126 10 126 23C126 33 118 39 112 43C109 45 108.500 47 109 50C110 53 116 53 116 56.500C116 60 110 60 109.500 63C109 66 110 69 113 73C117 78 123 80 126 85L127.500 91C127.500 97 72.500 97 72.500 91L74 85C77 80 83 78 87 73C90 69 91 66 90.500 63C90 60 84 60 84 56.500C84 53 90 53 91 50C91.500 47 91 45 88 43C82 39 74 33 74 23C74 10 86 2 100 2Z" fill="url(#pk-list-s1)"></path>
              <path d="M100 2C114 2 126 10 126 23C126 33 118 39 112 43H88C82 39 74 33 74 23C74 10 86 2 100 2Z" fill="url(#pk-list-s2)"></path>
              <path d="M84.500 8.500C78 14 76.600 25 82.400 33C81.400 24.500 83.200 15 91.500 6.800C89 6.800 86.500 7.400 84.500 8.500Z" fill="#fff" opacity=".72"></path>
              <path d="M91 50C95 52.600 105 52.600 109 50M90.500 63C94 65.600 106 65.600 109.500 63M74 85C84 89.600 116 89.600 126 85" fill="none" stroke="#1d0c05" strokeWidth="1.200" opacity=".8"></path>
            </g>
          </g>
          {/* NINE: the stone eye in three brass rings, the chairs around it */}
          <linearGradient id="pk-list-n1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7b7f80"></stop>
            <stop offset=".3" stopColor="#4f5354"></stop>
            <stop offset=".68" stopColor="#282b2d"></stop>
            <stop offset="1" stopColor="#161719"></stop>
          </linearGradient>
          <radialGradient id="pk-list-n3" cx=".5" cy=".46" r=".52">
            <stop offset="0" stopColor="#cfccc0"></stop>
            <stop offset=".42" stopColor="#b3b1a6"></stop>
            <stop offset=".74" stopColor="#6f6e68"></stop>
            <stop offset="1" stopColor="#262523"></stop>
          </radialGradient>
          <linearGradient id="pk-list-n4" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3f6ee" stopOpacity=".9"></stop>
            <stop offset=".3" stopColor="#f3f6ee" stopOpacity=".26"></stop>
            <stop offset=".56" stopColor="#000" stopOpacity=".12"></stop>
            <stop offset="1" stopColor="#000" stopOpacity=".62"></stop>
          </linearGradient>
          <linearGradient id="pk-list-n6" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a6a7a3"></stop>
            <stop offset="1" stopColor="#c2c3bd"></stop>
          </linearGradient>
          <radialGradient id="pk-list-n8" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#8d948a"></stop>
            <stop offset=".3" stopColor="#8d948a"></stop>
            <stop offset=".55" stopColor="#d0d2c6"></stop>
            <stop offset=".84" stopColor="#a6aa9e"></stop>
            <stop offset="1" stopColor="#5f6c65"></stop>
          </radialGradient>
          <linearGradient id="pk-list-n10" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5a646a"></stop>
            <stop offset="1" stopColor="#14171a"></stop>
          </linearGradient>
          <linearGradient id="pk-list-n11" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c2a566" stopOpacity="0"></stop>
            <stop offset=".22" stopColor="#c2a566"></stop>
            <stop offset=".78" stopColor="#c2a566"></stop>
            <stop offset="1" stopColor="#c2a566" stopOpacity="0"></stop>
          </linearGradient>
          <clipPath id="pk-list-n9">
            <path d="M60 120C84 92 102 84 120 84C138 84 156 92 180 120C156 134 138 142 120 142C102 142 84 134 60 120Z"></path>
          </clipPath>
          <g id="pk-list-n-bg">
            <path d="M-210 16C-150 60 -96 8 -44 40S8 96 30 152M152 -12C132 30 158 60 138 102S170 142 204 172M-70 128C-24 108 8 140 40 192" fill="none" stroke="#c9d5dc" strokeWidth=".6" opacity=".26"></path>
            <ellipse cx="80" cy="88" rx="94" ry="66" fill="none" stroke="url(#pk-list-n11)" strokeWidth=".9" opacity=".62"></ellipse>
          </g>
          <g id="pk-list-n-chair">
            <path d="M-27 -104L-14 -103L-13 -14L-24 -14Z" fill="url(#pk-list-n10)"></path>
            <path d="M-24 -23L26 -24L25.600 -16.500L-23.600 -15.500ZM-23.600 -15.500L-18.600 -15.600L-19 -2L-22.600 -2ZM20.600 -16.400L25.600 -16.500L24.800 -2L21 -2ZM-13 -29C-14 -44 -13 -53 -8 -58C-4 -61 3 -60 6 -55C9 -50 10 -42 9 -34L26 -36C30 -36 31 -33 30 -30L29 -6L34 -4L34 -1L22 -1L21 -24L4 -23L-13 -23ZM-8 -69a7 7 0 1 0 14 0a7 7 0 1 0 -14 0Z" fill="#050607"></path>
            <path d="M-1 -76A7 7 0 0 1 5.600 -71.400M-1 -60C3 -60 6 -56 7.400 -51M10 -34.600L26 -36.600C29 -36.600 30.600 -34 30.200 -31M-27 -104L-14 -103" fill="none" stroke="#dbe7ee" strokeWidth="1.400" opacity=".8"></path>
          </g>
          <path id="pk-list-n-far" fill="#0a0c0d" d="M-27 -104L-14 -103L-13 -23L26 -24L25.600 -16.500L24.800 -2L21 -2L20.600 -16.400L-18.600 -15.600L-19 -2L-22.600 -2L-23.600 -15.500L-24 -23ZM-13 -29C-14 -44 -13 -53 -8 -58C-4 -61 3 -60 6 -55C9 -50 10 -42 9 -34L26 -36C30 -36 31 -33 30 -30L29 -6L34 -4L34 -1L22 -1L21 -24L4 -23L-13 -23ZM-8 -69a7 7 0 1 0 14 0a7 7 0 1 0 -14 0Z"></path>
          <g id="pk-list-n-base" transform="translate(20 12) scale(.5)">
            <circle cx="120" cy="120" r="119.500" fill="url(#pk-list-n1)"></circle>
            <path d="M237.900 120l.5 1.900M105.200 6.200l2 .2M123.600 5.200l2.900 .5M165.800 17.300l1.800 1.200M84.400 14.900l2.800 -1M223.300 65.200l.7 1.300M222.700 66.100l1.200 2.600M220.200 58.100l1.400 1.700M178.900 23.400l1.500 .6M18.400 169l-1.400 -3.400M104.700 3.500l1.300 -.4M13.600 77.400l.2 -2.300M213.300 59.900l1.400 1.600M59.600 18.700l1.700 -1.900M26.500 183l-1.300 -1.700M63.100 219.700l-2.700 -.8M215 56.700l1.600 3.100M43.800 34.300l2.100 -1.300M225.600 77.900l1.700 2.500M23.100 61.200l.9 -1.900M152.600 7.100l1.300 .8M220.500 173.400l-.2 1.600M232.200 117.300l1 2.700M8.900 150.700l.2 -1.500M208 42l1.200 3.300M127.900 7.600l1.200 -.2M218.100 170.800l-.7 2.700M113.600 5.800l2.900 -.9M202.900 44.100l.8 2M204.200 197.500l-1.100 .5M43.100 30.600l1.200 -.4M164.800 229.400l-2.600 .6M108.500 231.700l-1.700 -.3M230.400 157.700l-1.500 2.600M9.200 121.300l.5 -1.400M199 204.900l-1.400 3.200M207.100 41.300l1.200 3.600M130.600 6.600l1.800 .5M203.900 43.300l1.300 1.200M207.200 45l1.200 1.700M109.300 7.300l3 -.5M155.800 227.200l-3.700 -.5M40.900 33.200l1.900 -3M51.700 31.700l2 -1.400M135.800 3l2.400 -.4M14.400 156.800l-.9 -2.800" fill="none" stroke="#000" strokeWidth="1" opacity=".55"></path>
            <circle cx="120" cy="120" r="114.600" fill="none" stroke="#b9a36b" strokeWidth="4" strokeLinecap="round" strokeDasharray="0 60.004"></circle>
            <circle cx="120" cy="120" r="109.500" fill="#050403"></circle>
          </g>
          <g id="pk-list-n-a" transform="translate(20 12) scale(.5) rotate(38 120 120)">
            <circle cx="120" cy="120" r="102" fill="none" stroke="#5f7f6e" strokeWidth="9" strokeDasharray="44 96 26 210 38 226.900" opacity=".62"></circle>
            <circle cx="120" cy="120" r="102" fill="none" stroke="#17120a" strokeWidth="5" strokeDasharray=".8 8.100" opacity=".85"></circle>
            <path d="M120 15V24M194.200 45.800L187.900 52.100M225 120L216 120M194.200 194.200L187.900 187.900M45.800 194.200L52.100 187.900M15 120L24 120M45.800 45.800L52.100 52.100" fill="none" stroke="#14170f" strokeWidth="3"></path>
            <path d="M120 215.600V228.400" fill="none" stroke="#040403" strokeWidth="9.200"></path>
          </g>
          <g id="pk-list-n-b" transform="translate(20 12) scale(.5) rotate(-66 120 120)">
            <circle cx="120" cy="120" r="88.500" fill="none" stroke="#120e07" strokeWidth="5" strokeDasharray="1.800 21.370" opacity=".9"></circle>
            <path d="M120 202.800V214.400" fill="none" stroke="#040403" strokeWidth="9.200"></path>
          </g>
          <g id="pk-list-n-c" transform="translate(20 12) scale(.5) rotate(124 120 120)">
            <path d="M117.400 41.200L117.400 48.800M119 41.200L123.400 48.800M123.400 41.200L119 48.800M170.700 59.600L165.800 65.500M197.400 105.100L189.900 106.500M197.800 107.500L190.300 108.800M189.400 157.300L182.900 153.500M188.200 159.400L181.700 155.600M187 161.500L180.500 157.700M149.400 193.100L146.800 186M147.900 193.700L143.200 187.300M143.800 195.200L143.200 187.300M95.100 194.800L95.600 186.900M91 193.300L95.600 186.900M53.500 162.300L58.900 156.600M51.300 158.500L58.900 156.600M50.400 157.100L57 153.300M41.600 110.800L49.500 110M42.400 106.500L49.500 110M42.600 104.900L50.100 106.200M43.100 102.500L50.600 103.800M64.900 63.400L71.500 67.800M68.300 60.500L71.500 67.800M69.500 59.500L74.400 65.300M71.400 57.900L76.300 63.800M73.200 56.400L78.100 62.200" fill="none" stroke="#17120a" strokeWidth="1.300"></path>
            <path d="M120 189V201.200" fill="none" stroke="#040403" strokeWidth="9.200"></path>
          </g>
          <g id="pk-list-n-ball" transform="translate(20 12) scale(.5)">
            <path d="M120 25a95 95 0 1 0 .01 0ZM120 38a82 82 0 1 0 .01 0ZM120 52a68 68 0 1 0 .01 0Z" fill="none" stroke="#050403" strokeWidth="2.200"></path>
            <path d="M120 1a119 119 0 1 0 .01 0ZM120 12.600a107.400 107.400 0 1 0 .01 0ZM120 26.600a93.400 93.400 0 1 0 .01 0ZM120 39.500a80.500 80.500 0 1 0 .01 0Z" fill="none" stroke="url(#pk-list-n4)" strokeWidth="1.100"></path>
            <circle cx="120" cy="120" r="66" fill="url(#pk-list-n3)"></circle>
            <path d="M60 120C84 92 102 84 120 84C138 84 156 92 180 120C156 134 138 142 120 142C102 142 84 134 60 120Z" fill="#08090a"></path>
          </g>
          <g id="pk-list-n-iris" transform="translate(20 12) scale(.5)">
            <g clipPath="url(#pk-list-n9)">
              <circle cx="120" cy="114" r="27" fill="url(#pk-list-n8)"></circle>
              <circle cx="120" cy="114" r="10.500" fill="#040404"></circle>
              <ellipse cx="111" cy="107" rx="3.400" ry="2.200" fill="#f6f9fa" opacity=".8" transform="rotate(-24 111 107)"></ellipse>
            </g>
          </g>
          <g id="pk-list-n-lid" transform="translate(20 12) scale(.5)">
            <path d="M60 120C84 92 102 84 120 84C138 84 156 92 180 120C156 105 138 99 120 99C102 99 84 105 60 120Z" fill="url(#pk-list-n6)"></path>
            <path d="M56 118.400C82 84 102 76 120 76C138 76 158 84 184 118.400M54 104C84 72 104 63 120 63C136 63 156 72 186 104M57 124.600C84 141 103 150 120 150C137 150 156 141 183 124.600M56 142C86 158 104 165 120 165C136 165 154 158 184 142M60 120C84 105 102 99 120 99C138 99 156 105 180 120" fill="none" stroke="#000" strokeWidth="1.300" opacity=".5"></path>
            <path d="M56 119.400C82 85 102 77 120 77C138 77 158 85 184 119.400M57 125.600C84 142 103 151 120 151C137 151 156 142 183 125.600M60 120C84 134 102 142 120 142C138 142 156 134 180 120" fill="none" stroke="#eceee6" strokeWidth=".8" opacity=".55"></path>
          </g>
          {/* FOLLY: the slate, the dome scaffold and the caged work lamp in the rain */}
          <linearGradient id="pk-list-o1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a322d"></stop>
            <stop offset=".5" stopColor="#1b211e"></stop>
            <stop offset="1" stopColor="#121614"></stop>
          </linearGradient>
          <radialGradient id="pk-list-o2" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#fff5d0" stopOpacity=".7"></stop>
            <stop offset=".4" stopColor="#fff5d0" stopOpacity=".24"></stop>
            <stop offset="1" stopColor="#fff5d0" stopOpacity="0"></stop>
          </radialGradient>
          <linearGradient id="pk-list-o3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b79868"></stop>
            <stop offset=".16" stopColor="#94754c"></stop>
            <stop offset=".62" stopColor="#6d5234"></stop>
            <stop offset="1" stopColor="#3f2e1d"></stop>
          </linearGradient>
          <linearGradient id="pk-list-o4" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fffbe8" stopOpacity=".42"></stop>
            <stop offset=".12" stopColor="#fffbe8" stopOpacity=".08"></stop>
            <stop offset=".45" stopColor="#000" stopOpacity="0"></stop>
            <stop offset="1" stopColor="#000" stopOpacity=".5"></stop>
          </linearGradient>
          <linearGradient id="pk-list-o5" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d6d9cf"></stop>
            <stop offset=".45" stopColor="#7f837c"></stop>
            <stop offset="1" stopColor="#3a3d39"></stop>
          </linearGradient>
          <radialGradient id="pk-list-o6" cx=".5" cy=".66" r=".62">
            <stop offset="0" stopColor="#3c0d09"></stop>
            <stop offset="1" stopColor="#060706"></stop>
          </radialGradient>
          <g id="pk-list-o-stick">
            <rect width="322" height="24" rx="2" fill="url(#pk-list-o3)"></rect>
            <path fill="#cdc7ad" d="M26 0H56L70 24H40ZM86 0H116L130 24H100ZM146 0H176L190 24H160ZM206 0H236L250 24H220ZM266 0H296L310 24H280Z"></path>
            <path fill="#1e211e" d="M56 0H86L100 24H70ZM116 0H146L160 24H130ZM176 0H206L220 24H190ZM236 0H266L280 24H250ZM296 0H322V24H310Z"></path>
            <path d="M24 12h6.900M235.400 4.100h4.800M288.600 20.400h13M248.700 7.500h12.600M257.300 15.300h3.200M43 17.300h4.600M108.300 7.200h13.300M38.400 5.500h10.500M46.800 1.700h11.200M149.600 20.500h6.500M111.600 11.600h13.900M290.900 22.200h5.600M30 9.300h12.100M302.700 16.100h10.400M240.200 8.100h7.200M136.800 1.500h11.900M77.700 7.600h9.200M46.800 12.400h5.500M268.500 4.900h5.700M40.400 7.300h4.700M79.800 13.800h11.900M42.200 17.200h7.200M142.800 12.300h6.300M102.300 9.100h3.700M268 20h13.500M162.800 14.800h11M137.100 7.800h3.900M171 21.700h13.900M255.700 22.300h12.700" fill="none" stroke="#6d5234" strokeWidth="1.300"></path>
            <path d="M4.500 1H19.500A2.500 2.500 0 0 1 22 3.500V20.500A2.500 2.500 0 0 1 19.500 23H4.500A2.500 2.500 0 0 1 2 20.500V3.500A2.500 2.500 0 0 1 4.500 1Z" fill="url(#pk-list-o5)"></path>
          </g>
          <path id="pk-list-o-chalk" transform="rotate(-.8 44 66)" d="M18.600 61.500L25.200 60.900M22.100 61.100L21.600 70.400M26 61.100L26.200 70.500M31 60.700L31.300 70.300M26.100 65.800L31.100 65.300M37.300 61L32.900 61.400L32.600 70.200L37.600 69.700M32.800 65.500L36.700 65.200M46.800 60.900L42.300 61.300L42.100 70.600M42.200 65.400L46 65M50.400 61.100C48.500 61.200 47.500 64.200 47.900 67C48.300 70 50.900 70.700 52.200 68.400C53.500 65.800 52.900 61.100 50.400 61.100ZM54.200 60.900L54.100 70.100L58.500 69.600M59.600 60.900L59.500 70.100L63.900 69.600M64.600 61L67.300 65.800L70.100 60.700M67.300 65.800L66.800 70.700M39.700 74.100C39 72.800 37 73.200 36.800 74.800C36.600 76.500 38.800 77.200 39.700 75.500C40 77.800 39.500 80.100 38.400 81.400M47 74.400L47.200 80.800M49.400 74.200L49.600 80.700M51.800 74.400L52 80.800M54.200 74.300L54.300 80.600M46 79.600L55.400 75.200M58 74.400L58.200 80.700M60.400 74.300L60.500 80.600M62.800 74.400L63 80.800"></path>
          <g id="pk-list-o-bg">
            <path d="M12 96C12 44 44 4 80 4S148 44 148 96M34 96C34 50 54 4 80 4S126 50 126 96M58 96C58 50 68 4 80 4S102 50 102 96M80 4V96M18 62H142M36 30H124" fill="none" stroke="#14221b" strokeWidth="1.200" opacity=".85"></path>
            <path d="M3 -20V250M9 -20V250M151 -20V250M157 -20V250M3 30L9 58L3 86L9 114L3 142M151 42L157 70L151 98L157 126L151 154" fill="none" stroke="#111c16" strokeWidth="1"></path>
            <path d="M-9 40H12M148 62H180M-9 96H10M146 128H180" fill="none" stroke="#8d6f49" strokeWidth="1.700"></path>
            <path d="M8 146H56M72 146H128M-110 146H-40M22 152H88M100 152H150M-90 152H-24M46 158H116" fill="none" stroke="#9db3a6" strokeWidth=".7" strokeLinecap="round" opacity=".3"></path>
          </g>
          <g id="pk-list-o-lamp">
            <circle cx="76" cy="9" r="32" fill="url(#pk-list-o2)"></circle>
            <circle cx="76" cy="10" r="4.400" fill="#fff8dc"></circle>
            <path d="M76 -30V2M70.500 3.500H81.500M69.600 4.200C68.600 9.500 70 15 76 18.500C82 15 83.400 9.500 82.400 4.200M73 3.500C72 9 73 14.500 76 18.500M79 3.500C80 9 79 14.500 76 18.500M69.500 9.800C72 11.300 80 11.300 82.500 9.800" fill="none" stroke="#0c120e" strokeWidth=".8"></path>
          </g>
          <g id="pk-list-h-folly">
            <ellipse cx="80" cy="140" rx="74" ry="6" fill="url(#pk-list-x2)"></ellipse>
            <rect x="13" y="52" width="134" height="84" rx="2" fill="#4a3722"></rect>
            <path d="M14.400 52H145.600V132A2 2 0 0 1 143.600 134H16.400A2 2 0 0 1 14.400 132Z" fill="url(#pk-list-o1)"></path>
            <path d="M17 85.500H143M17 98H143M17 110.500H143M17 123H143M80 85.500V133" fill="none" stroke="#efecdc" strokeWidth=".55" opacity=".24"></path>
            <path d="M22 90.500H66M22 93.800H54M88 90.500H132M88 93.800H116M22 103H60M22 106.300H68M88 103H128M88 106.300H110M22 115.500H66M22 118.800H48M88 115.500H134M88 118.800H118M22 128H58M88 128H126" fill="none" stroke="#e4e4d4" strokeWidth="1.700" strokeLinecap="round" opacity=".1"></path>
            <path d="M31 84C29.800 92 33 102 31.200 112M121 86C122 104 119 118 120.600 133M76 84C77 90 75 96 76 104" fill="none" stroke="#e4ead9" strokeWidth=".6" opacity=".14"></path>
            <path d="M31.200 112h.01M120.600 133h.01M76 104h.01" fill="none" stroke="#f0ece0" strokeWidth="1.200" strokeLinecap="round" opacity=".6"></path>
            <use href="#pk-list-o-chalk" fill="none" stroke="#f2eeda" strokeWidth="1.200" strokeLinecap="round" strokeLinejoin="round"></use>
            <use href="#pk-list-o-chalk" fill="none" stroke="#1b211e" strokeWidth=".55" strokeDasharray=".22 3.400 .14 5.300 .3 2.900 .12 6.100" opacity=".8"></use>
            <text x="19.400" y="79.800" fontFamily="Archivo" fontWeight="800" fontSize="4.300" letterSpacing=".7" fill="#bdc1b0">TAKE</text>
            <rect x="80.400" y="58.600" width="60.400" height="24.600" rx="1.700" fill="url(#pk-list-o6)" stroke="#000" strokeWidth=".7"></rect>
            <text x="83.800" y="65.300" fontFamily="Archivo" fontWeight="800" fontSize="3.700" letterSpacing=".9" fill="#cdc9b8">BUDGET</text>
            <text x="137.400" y="65.300" textAnchor="end" fontFamily="Archivo" fontWeight="800" fontSize="3.700" letterSpacing=".7" fill="#e5342b">OVER</text>
            <path fill="#e5342b" stroke="#e5342b" strokeOpacity=".4" strokeWidth=".35" d="M84 69.800L84.400 70.300L84.200 73.600L83.700 74.100L83.200 73.600L83.400 70.300ZM83.900 74.300L84.400 73.800L87.500 73.800L88 74.300L87.500 74.800L84.300 74.800ZM88.500 69.800L88.900 70.300L88.700 73.600L88.200 74.100L87.700 73.600L87.900 70.300ZM88.200 74.500L88.600 75L88.400 78.300L87.900 78.800L87.400 78.300L87.600 75ZM94.500 69.800L94.900 70.300L94.700 73.600L94.200 74.100L93.700 73.600L93.900 70.300ZM94.200 74.500L94.600 75L94.400 78.300L93.900 78.800L93.400 78.300L93.600 75ZM97.600 69.600L98.200 69.100L101.300 69.100L101.800 69.600L101.300 70.100L98.100 70.100ZM102 69.800L102.400 70.300L102.200 73.600L101.700 74.100L101.200 73.600L101.400 70.300ZM97.400 74.300L97.900 73.800L101 73.800L101.500 74.300L101 74.800L97.800 74.800ZM97.200 74.500L97.600 75L97.400 78.300L96.900 78.800L96.400 78.300L96.600 75ZM97.100 79L97.600 78.500L100.800 78.500L101.200 79L100.700 79.500L97.600 79.500ZM103.600 69.600L104.200 69.100L107.300 69.100L107.800 69.600L107.300 70.100L104.100 70.100ZM108 69.800L108.400 70.300L108.200 73.600L107.700 74.100L107.200 73.600L107.400 70.300ZM103.400 74.300L103.900 73.800L107 73.800L107.500 74.300L107 74.800L103.800 74.800ZM107.700 74.500L108.100 75L107.900 78.300L107.400 78.800L106.900 78.300L107.100 75ZM103.100 79L103.600 78.500L106.800 78.500L107.200 79L106.700 79.500L103.600 79.500ZM109.600 69.600L110.200 69.100L113.300 69.100L113.800 69.600L113.300 70.100L110.100 70.100ZM109.500 69.800L109.900 70.300L109.700 73.600L109.200 74.100L108.700 73.600L108.900 70.300ZM109.400 74.300L109.900 73.800L113 73.800L113.500 74.300L113 74.800L109.800 74.800ZM109.200 74.500L109.600 75L109.400 78.300L108.900 78.800L108.400 78.300L108.600 75ZM109.100 79L109.600 78.500L112.800 78.500L113.200 79L112.700 79.500L109.600 79.500ZM113.700 74.500L114.100 75L113.900 78.300L113.400 78.800L112.900 78.300L113.100 75ZM117.100 69.600L117.700 69.100L120.800 69.100L121.300 69.600L120.800 70.100L117.600 70.100ZM121.500 69.800L121.900 70.300L121.700 73.600L121.200 74.100L120.700 73.600L120.900 70.300ZM121.200 74.500L121.600 75L121.400 78.300L120.900 78.800L120.400 78.300L120.600 75ZM116.600 79L117.100 78.500L120.300 78.500L120.700 79L120.200 79.500L117.100 79.500ZM116.700 74.500L117.100 75L116.900 78.300L116.400 78.800L115.900 78.300L116.100 75ZM117 69.800L117.400 70.300L117.200 73.600L116.700 74.100L116.200 73.600L116.400 70.300ZM123.100 69.600L123.700 69.100L126.800 69.100L127.300 69.600L126.800 70.100L123.600 70.100ZM123 69.800L123.400 70.300L123.200 73.600L122.700 74.100L122.200 73.600L122.400 70.300ZM122.900 74.300L123.400 73.800L126.500 73.800L127 74.300L126.500 74.800L123.300 74.800ZM122.700 74.500L123.100 75L122.900 78.300L122.400 78.800L121.900 78.300L122.100 75ZM122.600 79L123.100 78.500L126.300 78.500L126.700 79L126.200 79.500L123.100 79.500ZM127.200 74.500L127.600 75L127.400 78.300L126.900 78.800L126.400 78.300L126.600 75ZM129.100 69.600L129.700 69.100L132.800 69.100L133.300 69.600L132.800 70.100L129.600 70.100ZM133.500 69.800L133.900 70.300L133.700 73.600L133.200 74.100L132.700 73.600L132.900 70.300ZM133.200 74.500L133.600 75L133.400 78.300L132.900 78.800L132.400 78.300L132.600 75ZM95 79.200l.9 0-.5 1.700-.8 0ZM114.500 79.200l.9 0-.5 1.700-.8 0Z"></path>
            <use href="#pk-list-o-stick" transform="translate(13 42) scale(.416)"></use>
            <rect x="13" y="42" width="134" height="10" rx=".8" fill="url(#pk-list-o4)"></rect>
          </g>
          <g id="pk-list-m-folly">
            <g transform="rotate(-11 18 41.500)">
              <use href="#pk-list-o-stick" transform="translate(13 41.500) scale(.416 -.416)"></use>
              <rect x="13" y="31.500" width="134" height="10" rx=".8" fill="url(#pk-list-o4)"></rect>
            </g>
          </g>
          <circle id="pk-list-o-pin" cx="18" cy="41.500" r="2.700" fill="url(#pk-list-o5)" stroke="#141614" strokeWidth=".6"></circle>
          {/* THE BLACKOUT JOB: the approved page's vault door and collar, drawn around the same 288 face */}
          <linearGradient id="pk-list-bk-colv" x1="0" y1="-16" x2="0" y2="304" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#b7ecca"></stop>
            <stop offset=".22" stopColor="#5c9c7c"></stop>
            <stop offset=".55" stopColor="#2a5b44"></stop>
            <stop offset="1" stopColor="#0d2a1e"></stop>
          </linearGradient>
          <linearGradient id="pk-list-bk-coltop" x1="0" y1="-16" x2="0" y2="164" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f0fff5" stopOpacity=".95"></stop>
            <stop offset="1" stopColor="#f0fff5" stopOpacity="0"></stop>
          </linearGradient>
          <linearGradient id="pk-list-bk-colb" x1="0" y1="-12" x2="0" y2="288" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#91baa0"></stop>
            <stop offset="1" stopColor="#1c241f"></stop>
          </linearGradient>
          <linearGradient id="pk-list-bk-barrel" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0d2a1e"></stop>
            <stop offset=".42" stopColor="#9edcb9"></stop>
            <stop offset=".62" stopColor="#3c7a5e"></stop>
            <stop offset="1" stopColor="#071a11"></stop>
          </linearGradient>
          <linearGradient id="pk-list-bk-plate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b3e9c8"></stop>
            <stop offset=".24" stopColor="#5a9b7a"></stop>
            <stop offset="1" stopColor="#143526"></stop>
          </linearGradient>
          <linearGradient id="pk-list-bk-boltv" x1="0" y1="15" x2="0" y2="273" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7cc29c"></stop>
            <stop offset=".5" stopColor="#2d5f49"></stop>
            <stop offset="1" stopColor="#0d261b"></stop>
          </linearGradient>
          <linearGradient id="pk-list-bk-wv" x1="0" y1="86" x2="0" y2="204" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#e6fff0"></stop>
            <stop offset=".24" stopColor="#8fd4ad"></stop>
            <stop offset=".6" stopColor="#3a7559"></stop>
            <stop offset="1" stopColor="#123024"></stop>
          </linearGradient>
          <radialGradient id="pk-list-bk-hub" cx=".4" cy=".26" r=".85">
            <stop offset="0" stopColor="#f4fff8"></stop>
            <stop offset=".38" stopColor="#8fd4ad"></stop>
            <stop offset="1" stopColor="#143526"></stop>
          </radialGradient>
          <radialGradient id="pk-list-bk-halo">
            <stop offset="0" stopColor="#7dff9a" stopOpacity=".3"></stop>
            <stop offset=".55" stopColor="#7dff9a" stopOpacity=".1"></stop>
            <stop offset="1" stopColor="#7dff9a" stopOpacity="0"></stop>
          </radialGradient>
          <g id="pk-list-bk-collar" fill="none">
            <circle cx="144" cy="144" r="152.400" stroke="url(#pk-list-bk-colv)" strokeWidth="15.200"></circle>
            <circle cx="144" cy="144" r="160" stroke="url(#pk-list-bk-coltop)" strokeWidth="1.800"></circle>
            <circle cx="144" cy="144" r="145.400" stroke="#010604" strokeWidth="3"></circle>
            <circle cx="144" cy="145.800" r="152.800" stroke="#020a06" strokeOpacity=".7" strokeWidth="6" strokeLinecap="round" strokeDasharray=".01 34.270"></circle>
            <circle cx="144" cy="144" r="152.800" stroke="url(#pk-list-bk-colb)" strokeWidth="5.400" strokeLinecap="round" strokeDasharray=".01 34.270"></circle>
            <rect x="-24.200" y="68.800" width="21.600" height="64" rx="3.600" fill="#020a06" opacity=".6"></rect>
            <rect x="-24.200" y="164.800" width="21.600" height="64" rx="3.600" fill="#020a06" opacity=".6"></rect>
            <rect x="-25.800" y="64" width="21.600" height="64" rx="3.600" fill="url(#pk-list-bk-barrel)"></rect>
            <rect x="-25.800" y="160" width="21.600" height="64" rx="3.600" fill="url(#pk-list-bk-barrel)"></rect>
            <path d="M-27 78H-3M-27 112H-3M-27 174H-3M-27 208H-3" stroke="#04120b" strokeOpacity=".85" strokeWidth="2"></path>
          </g>
          <g id="pk-list-bk-face">
            <circle cx="144" cy="144" r="102" fill="none" stroke="#050f0a" strokeOpacity=".8" strokeDasharray="1.200 7.800"></circle>
            <circle cx="144" cy="144" r="77.500" fill="none" stroke="#04140c" strokeOpacity=".7" strokeWidth="5" strokeDasharray="5 2 7 2 4 2 9 2 3 2 6 9"></circle>
            <path d="M95.930 65.560h.01M108.790 59h.01M122.520 54.540h.01M136.780 52.280h.01M151.220 52.280h.01M165.480 54.540h.01M179.210 59h.01M192.070 65.560h.01" fill="none" stroke="#04120b" strokeWidth="8" strokeLinecap="round"></path>
            <path d="M95.930 65.560h.01M108.790 59h.01M122.520 54.540h.01M136.780 52.280h.01M151.220 52.280h.01M165.480 54.540h.01M179.210 59h.01M192.070 65.560h.01" fill="none" stroke="#ff2b2b" strokeOpacity=".36" strokeWidth="12" strokeLinecap="round"></path>
            <path d="M95.930 65.560h.01M108.790 59h.01M122.520 54.540h.01M136.780 52.280h.01M151.220 52.280h.01M165.480 54.540h.01M179.210 59h.01M192.070 65.560h.01" fill="none" stroke="#ff2b2b" strokeWidth="6" strokeLinecap="round"></path>
            <path d="M95.930 65.560h.01M108.790 59h.01M122.520 54.540h.01M136.780 52.280h.01M151.220 52.280h.01M165.480 54.540h.01M179.210 59h.01M192.070 65.560h.01" fill="none" stroke="#ffd6d0" strokeWidth="2.400" strokeLinecap="round"></path>
            <g fill="none" strokeLinecap="round" strokeDasharray=".01 48.881" strokeDashoffset="24.445">
              <circle cx="144" cy="145.500" r="124.500" stroke="#020a06" strokeOpacity=".72" strokeWidth="16.400"></circle>
              <circle cx="144" cy="144" r="124.500" stroke="url(#pk-list-bk-boltv)" strokeWidth="14.800"></circle>
              <circle cx="142.800" cy="142.400" r="124.500" stroke="#9edcb9" strokeOpacity=".75" strokeWidth="8"></circle>
              <circle cx="141.800" cy="141.200" r="124.500" stroke="#f4fff8" strokeOpacity=".85" strokeWidth="3"></circle>
            </g>
            <rect x="-6" y="86.400" width="42" height="26" rx="3" fill="#020a06" opacity=".6"></rect>
            <rect x="-6" y="182.400" width="42" height="26" rx="3" fill="#020a06" opacity=".6"></rect>
            <rect x="-6" y="83" width="42" height="26" rx="3" fill="url(#pk-list-bk-plate)"></rect>
            <rect x="-6" y="179" width="42" height="26" rx="3" fill="url(#pk-list-bk-plate)"></rect>
            <path d="M-6 83.700H36M-6 179.700H36" stroke="#f0fff5" strokeOpacity=".8" strokeWidth="1.400"></path>
            <path d="M14 96h.01M28 96h.01M14 192h.01M28 192h.01" fill="none" stroke="#020a06" strokeWidth="7.200" strokeLinecap="round"></path>
            <path d="M14 96h.01M28 96h.01M14 192h.01M28 192h.01" fill="none" stroke="#9edcb9" strokeWidth="5.400" strokeLinecap="round"></path>
            <g opacity=".5" transform="translate(0 5)">
              <circle cx="144" cy="144" r="48" fill="none" stroke="#020a06" strokeWidth="12"></circle>
              <path d="M136.800 131L139.600 96H148.400L151.200 131ZM154.140 133.140L188.290 124.980L191.010 133.350L158.590 146.830ZM157.470 150.280L175.770 180.250L168.650 185.420L145.820 158.750ZM142.180 158.750L119.350 185.420L112.230 180.250L130.530 150.280ZM129.410 146.830L96.990 133.350L99.710 124.980L133.860 133.140Z" fill="#020a06"></path>
              <circle cx="144" cy="144" r="19" fill="#020a06"></circle>
            </g>
            <path d="M136.800 131L139.600 96H148.400L151.200 131ZM154.140 133.140L188.290 124.980L191.010 133.350L158.590 146.830ZM157.470 150.280L175.770 180.250L168.650 185.420L145.820 158.750ZM142.180 158.750L119.350 185.420L112.230 180.250L130.530 150.280ZM129.410 146.830L96.990 133.350L99.710 124.980L133.860 133.140Z" fill="url(#pk-list-bk-wv)" stroke="#04120b" strokeWidth=".9"></path>
            <circle cx="144" cy="144" r="48" fill="none" stroke="#04120b" strokeWidth="12.600"></circle>
            <circle cx="144" cy="144" r="48" fill="none" stroke="url(#pk-list-bk-wv)" strokeWidth="11"></circle>
            <circle cx="144" cy="96" r="6.200" fill="url(#pk-list-bk-hub)"></circle>
            <circle cx="189.650" cy="129.170" r="6.200" fill="url(#pk-list-bk-hub)"></circle>
            <circle cx="172.210" cy="182.830" r="6.200" fill="url(#pk-list-bk-hub)"></circle>
            <circle cx="115.790" cy="182.830" r="6.200" fill="url(#pk-list-bk-hub)"></circle>
            <circle cx="98.350" cy="129.170" r="6.200" fill="url(#pk-list-bk-hub)"></circle>
            <circle cx="144" cy="144" r="19" fill="#04120b"></circle>
            <circle cx="144" cy="144" r="17.600" fill="url(#pk-list-bk-hub)"></circle>
            <circle cx="144" cy="144" r="9" fill="#123024" stroke="#cfffe0" strokeOpacity=".5" strokeWidth=".8"></circle>
            <circle cx="144" cy="144" r="3.600" fill="url(#pk-list-bk-hub)"></circle>
          </g>
          <path id="pk-list-bk-b1" d="M3 112L158 134M5 140L157 98M9 46L155 110M6 92L156 48M20 18L146 62"></path>
          <path id="pk-list-bk-dots" d="M3 112h.01M158 134h.01M5 140h.01M157 98h.01M9 46h.01M155 110h.01M6 92h.01M156 48h.01M20 18h.01M146 62h.01M22 130h.01M140 20h.01"></path>
          <path id="pk-list-bk-s1" d="M22 130L148 26"></path>
          <path id="pk-list-bk-s2" d="M140 20L24 152"></path>
          <g id="pk-list-bk-beams" fill="none" strokeLinecap="round">
            <use href="#pk-list-bk-b1" stroke="#ff2b2b" strokeOpacity=".07" strokeWidth="5.6"></use>
            <use href="#pk-list-bk-b1" stroke="#ff2b2b" strokeOpacity=".2" strokeWidth="2.6"></use>
            <use href="#pk-list-bk-b1" stroke="#ff2b2b" strokeWidth=".9"></use>
            <use href="#pk-list-bk-b1" stroke="#ffc9c2" strokeWidth=".36"></use>
            <use href="#pk-list-bk-dots" stroke="#ff2b2b" strokeOpacity=".3" strokeWidth="5.200"></use>
            <use href="#pk-list-bk-dots" stroke="#ff2b2b" strokeWidth="2.500"></use>
            <use href="#pk-list-bk-dots" stroke="#fff" strokeWidth="1.100"></use>
          </g>
          <g id="pk-list-bk-sw1" fill="none" strokeLinecap="round">
            <use href="#pk-list-bk-s1" stroke="#ff2b2b" strokeOpacity=".07" strokeWidth="5.6"></use>
            <use href="#pk-list-bk-s1" stroke="#ff2b2b" strokeOpacity=".2" strokeWidth="2.6"></use>
            <use href="#pk-list-bk-s1" stroke="#ff2b2b" strokeWidth=".9"></use>
            <use href="#pk-list-bk-s1" stroke="#ffc9c2" strokeWidth=".36"></use>
          </g>
          <g id="pk-list-bk-sw2" fill="none" strokeLinecap="round">
            <use href="#pk-list-bk-s2" stroke="#ff2b2b" strokeOpacity=".07" strokeWidth="5.6"></use>
            <use href="#pk-list-bk-s2" stroke="#ff2b2b" strokeOpacity=".2" strokeWidth="2.6"></use>
            <use href="#pk-list-bk-s2" stroke="#ff2b2b" strokeWidth=".9"></use>
            <use href="#pk-list-bk-s2" stroke="#ffc9c2" strokeWidth=".36"></use>
          </g>
          <g id="pk-list-bk-marks" fill="none" stroke="#7dff9a" strokeOpacity=".62" strokeWidth="1.100">
            <path d="M3 11V3H11M159 11V3H151M3 145V153H11M159 145V153H151"></path>
          </g>
          <g id="pk-list-bk-bg">
            <circle cx="81" cy="78" r="124" fill="url(#pk-list-bk-halo)"></circle>
            <path d="M-240 22H330M-240 134H330" fill="none" stroke="#7dff9a" strokeOpacity=".1" strokeWidth=".7"></path>
            <path d="M-110 -80V260M-190 -80V260" fill="none" stroke="#7dff9a" strokeOpacity=".08" strokeWidth=".7"></path>
            <path d="M-110 22h.01M-110 134h.01M-190 22h.01M-190 134h.01M-28 22h.01M-28 134h.01M190 22h.01M190 134h.01" fill="none" stroke="#bff5d2" strokeOpacity=".3" strokeWidth="1.800" strokeLinecap="round"></path>
            <path d="M-28 -30H190V186H-28Z" fill="#020a06" fillOpacity=".22" stroke="#1c4a32" strokeWidth="1.600"></path>
            <path d="M-6 -8H168V164H-6Z" fill="#020a06" fillOpacity=".34" stroke="#2f6b4c" strokeWidth="1.600"></path>
            <path d="M-28 -30L-6 -8M190 -30L168 -8M-28 186L-6 164M190 186L168 164" fill="none" stroke="#2f6b4c" strokeOpacity=".7" strokeWidth=".9"></path>
            <ellipse cx="81" cy="2" rx="64" ry="26" fill="url(#pk-list-bk-halo)"></ellipse>
            <rect x="49" y="-1" width="64" height="2.400" rx="1.200" fill="#eafff2"></rect>
          </g>
          {/* the sealed sixth poster: something tall under a dust sheet, tied shut */}
          <linearGradient id="pk-list-v2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a4438"></stop>
            <stop offset=".45" stopColor="#25211b"></stop>
            <stop offset="1" stopColor="#0d0b08"></stop>
          </linearGradient>
          <linearGradient id="pk-list-v3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#efd9a6" stopOpacity=".85"></stop>
            <stop offset="1" stopColor="#efd9a6" stopOpacity="0"></stop>
          </linearGradient>
          <g id="pk-list-v-drape">
            <ellipse cx="80" cy="153" rx="64" ry="6" fill="#000" opacity=".6"></ellipse>
            <path d="M24 153C30 128 34 104 44 82C50 68 60 60 68 48C74 38 80 24 88 20C95 22 99 34 104 46C110 60 118 72 123 94C128 116 132 136 136 152C124 158 110 152 97 156C84 159 72 153 60 157C46 160 34 157 24 153Z" fill="url(#pk-list-v2)"></path>
            <path d="M70 52C60 74 66 92 56 116C52 128 50 142 52 156M97 44C104 66 96 88 104 112C108 126 110 140 110 154M84 30C80 50 86 70 80 96C78 116 82 138 78 157" fill="none" stroke="#000" strokeOpacity=".38" strokeWidth="3.400" strokeLinecap="round"></path>
            <path d="M73 54C63 76 69 94 59 118C55 130 53 144 55 155M100 46C107 68 99 90 107 114C111 128 113 142 113 153M87 32C83 52 89 72 83 98C81 118 85 140 81 156" fill="none" stroke="#b5a585" strokeOpacity=".16" strokeWidth="1.200" strokeLinecap="round"></path>
            <path d="M44 82C50 68 60 60 68 48C74 38 80 24 88 20C95 22 99 34 104 46C110 60 118 72 123 94" fill="none" stroke="url(#pk-list-v3)" strokeWidth="1.100" strokeLinecap="round"></path>
          </g>
        </defs>
      </svg>
      <div className="pk-list-top">
        <button type="button" className="pk-list-back" onClick={onBack}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7 2.5L1.800 8L7 13.500M2.300 8H14.500" fill="none" stroke="#f8a810" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>Back</button>
        <div className="pk-list-title">
          <h1 className="pk-list-h1">Upcoming Packs</h1>
          <p className="pk-list-sub">COMING ATTRACTIONS <b>5</b></p>
        </div>
      </div>
      <button type="button" className="pk-list-stage" onClick={v.stageOpen} aria-label={v.stageLabel} onPointerDown={v.hold} onPointerUp={v.free} onPointerCancel={v.free} onPointerLeave={v.free}>
        {v.show.cinema ? (
          <span className={`pk-list-scene pk-list-w-cinema ${v.sc.cinema}`}>
            <svg className="pk-list-bd" viewBox="0 0 480 200" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
              <use href="#pk-list-c-seats" transform="translate(280 -8) scale(1.25)"></use>
              <use href="#pk-list-c-floor" transform="translate(230 -30) scale(1.75 1.6)"></use>
              <use href="#pk-list-c-val" transform="translate(280 0) scale(1.25)"></use>
            </svg>
            <span className="pk-list-bulbs" aria-hidden="true">
              <svg className="pk-list-l">
                <path d="M3 4H143" fill="none" stroke="#6d4c1c" strokeWidth="4" strokeLinecap="round" strokeDasharray="0 14"></path>
              </svg>
              <svg className="pk-list-l pk-list-a-blink">
                <path d="M3 4H143" fill="none" stroke="#ffe6a6" strokeWidth="4" strokeLinecap="round" strokeDasharray="0 42"></path>
              </svg>
              <svg className="pk-list-l pk-list-a-blink" style={{ '--dl': '.32s' } as React.CSSProperties}>
                <path d="M17 4H143" fill="none" stroke="#ffe6a6" strokeWidth="4" strokeLinecap="round" strokeDasharray="0 42"></path>
              </svg>
              <svg className="pk-list-l pk-list-a-blink" style={{ '--dl': '.64s' } as React.CSSProperties}>
                <path d="M31 4H143" fill="none" stroke="#ffe6a6" strokeWidth="4" strokeLinecap="round" strokeDasharray="0 42"></path>
              </svg>
            </span>
            {' '}
            <span className="pk-list-scrim" aria-hidden="true"></span>
            {' '}
            <span className="pk-list-hb" aria-hidden="true">
              <svg className="pk-list-l pk-list-a-swing" viewBox="0 0 160 160" style={{ '--t': '7.4s', '--r': '5deg', transformOrigin: '50% -6%' } as React.CSSProperties}>
                <use href="#pk-list-c-beams"></use>
              </svg>
              <svg className="pk-list-l pk-list-a-float" viewBox="0 0 160 160" style={{ '--t': '5.1s', '--y': '2.2%', '--r': '1.2deg', transformOrigin: '50% 48%' } as React.CSSProperties}>
                <use href="#pk-list-h-cinema"></use>
              </svg>
            </span>
            {' '}
            <span className="pk-list-copy">
              <span className="pk-list-lock">
                <b className="pk-list-t1">Own the</b>
                <b className="pk-list-t2">Screens</b>
              </span>
              <span className="pk-list-fan">
                <i>Keep the box office.</i>
              </span>
            </span>
          </span>
        ) : null}
        {v.show.sue ? (
          <span className={`pk-list-scene pk-list-w-sue ${v.sc.sue}`}>
            <svg className="pk-list-bd" viewBox="0 0 480 200" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
              <g transform="translate(280 0) scale(1.25)">
                <use href="#pk-list-s-bg"></use>
              </g>
            </svg>
            <span className="pk-list-scrim" aria-hidden="true"></span>
            {' '}
            <span className="pk-list-hb" aria-hidden="true">
              <svg className="pk-list-l pk-list-a-drift" viewBox="0 0 160 160" style={{ '--t': '8.6s', '--x': '6%' } as React.CSSProperties}>
                <use href="#pk-list-s-cloud"></use>
              </svg>
              <svg className="pk-list-l" viewBox="0 0 160 160">
                <use href="#pk-list-pigeon-b" transform="translate(24 90) scale(-.52 .52)"></use>
              </svg>
              <svg className="pk-list-l pk-list-a-bob" viewBox="0 0 160 160" style={{ '--t': '2.3s', '--r': '16deg', transformOrigin: '12% 62%' } as React.CSSProperties}>
                <use href="#pk-list-pigeon-h" transform="translate(24 90) scale(-.52 .52)"></use>
              </svg>
              <svg className="pk-list-l pk-list-a-jolt" viewBox="0 0 160 160">
                <use href="#pk-list-h-sue"></use>
                <use href="#pk-list-s-sign" transform="translate(21.300 33.100) scale(.68)" strokeWidth="1.100"></use>
              </svg>
              <svg className="pk-list-l pk-list-a-thump" viewBox="0 0 160 160" style={{ '--y': '4%' } as React.CSSProperties}>
                <use href="#pk-list-m-sue"></use>
              </svg>
            </span>
            {' '}
            <span className="pk-list-copy">
              <span className="pk-list-lock">
                <b className="pk-list-t1">Sue</b>
                <b className="pk-list-t2">Everyone</b>
              </span>
              <span className="pk-list-fan">
                <i>Sue anyone in town.</i>
                <i>Take their stuff.</i>
              </span>
            </span>
          </span>
        ) : null}
        {v.show.nine ? (
          <span className={`pk-list-scene pk-list-w-nine ${v.sc.nine}`}>
            <svg className="pk-list-bd" viewBox="0 0 480 200" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
              <g transform="translate(280 0) scale(1.25)">
                <use href="#pk-list-n-bg"></use>
              </g>
            </svg>
            <span className="pk-list-scrim" aria-hidden="true"></span>
            {' '}
            <span className="pk-list-hb" aria-hidden="true">
              <svg className="pk-list-l" viewBox="0 0 160 160">
                <use href="#pk-list-n-chair" transform="translate(12 130) scale(.42)"></use>
                <use href="#pk-list-n-far" transform="translate(15 60) scale(.24)"></use>
                <use href="#pk-list-n-base"></use>
              </svg>
              <span className="pk-list-rings"></span>
              <svg className="pk-list-l pk-list-a-spin" viewBox="0 0 160 160" style={{ '--t': '30s', transformOrigin: '50% 45%' } as React.CSSProperties}>
                <use href="#pk-list-n-a"></use>
              </svg>
              <svg className="pk-list-l pk-list-a-spinb" viewBox="0 0 160 160" style={{ '--t': '21s', transformOrigin: '50% 45%' } as React.CSSProperties}>
                <use href="#pk-list-n-b"></use>
              </svg>
              <svg className="pk-list-l pk-list-a-spin" viewBox="0 0 160 160" style={{ '--t': '42s', transformOrigin: '50% 45%' } as React.CSSProperties}>
                <use href="#pk-list-n-c"></use>
              </svg>
              <svg className="pk-list-l" viewBox="0 0 160 160">
                <use href="#pk-list-n-ball"></use>
              </svg>
              <svg className="pk-list-l pk-list-a-drift" viewBox="0 0 160 160" style={{ '--t': '4.600s', '--x': '2.200%' } as React.CSSProperties}>
                <use href="#pk-list-n-iris"></use>
              </svg>
              <svg className="pk-list-l" viewBox="0 0 160 160">
                <use href="#pk-list-n-lid"></use>
              </svg>
            </span>
            {' '}
            <span className="pk-list-copy">
              <span className="pk-list-lock">
                <b className="pk-list-t1">The Gilded</b>
                <b className="pk-list-t2">Nine</b>
              </span>
              <span className="pk-list-fan">
                <i>Trade anything.</i>
                <i>Decide everything.</i>
              </span>
            </span>
          </span>
        ) : null}
        {v.show.folly ? (
          <span className={`pk-list-scene pk-list-w-folly ${v.sc.folly}`}>
            <svg className="pk-list-bd" viewBox="0 0 480 200" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
              <g transform="translate(280 0) scale(1.25)">
                <use href="#pk-list-o-bg"></use>
              </g>
            </svg>
            <span className="pk-list-scrim" aria-hidden="true"></span>
            {' '}
            <span className="pk-list-hb" aria-hidden="true">
              <svg className="pk-list-l pk-list-a-swing" viewBox="0 0 160 160" style={{ '--t': '6.200s', '--r': '3.500deg', transformOrigin: '47.500% -18.750%' } as React.CSSProperties}>
                <use href="#pk-list-o-lamp"></use>
              </svg>
              <span className="pk-list-grp pk-list-a-jolt">
                <svg className="pk-list-l" viewBox="0 0 160 160">
                  <use href="#pk-list-h-folly"></use>
                </svg>
                <span className="pk-list-led" style={{ left: '76.060%', width: '3.840%', background: '#270b08' } as React.CSSProperties}>
                  <svg viewBox="0 0 6.150 108" preserveAspectRatio="none" style={{ '--t': '16s' } as React.CSSProperties}>
                    <path fill="#e5342b" d="M1.440 .7L1.970 .2L5.110 .2L5.580 .7L5.050 1.200L1.910 1.200ZM1.250 .88L1.720 1.380L1.520 4.720L.99 5.220L.52 4.720L.72 1.380ZM1.160 5.400L1.690 4.900L4.830 4.900L5.300 5.400L4.770 5.900L1.630 5.900ZM.97 5.580L1.440 6.080L1.240 9.420L.71 9.920L.24 9.420L.44 6.080ZM.88 10.100L1.410 9.600L4.550 9.600L5.020 10.100L4.490 10.600L1.350 10.600ZM5.470 5.580L5.940 6.080L5.740 9.420L5.210 9.920L4.740 9.420L4.940 6.080ZM1.440 11.500L1.970 11L5.110 11L5.580 11.500L5.050 12L1.910 12ZM5.750 11.680L6.220 12.180L6.020 15.520L5.490 16.020L5.020 15.520L5.220 12.180ZM5.470 16.380L5.940 16.880L5.740 20.220L5.210 20.720L4.740 20.220L4.940 16.880ZM1.440 22.300L1.970 21.800L5.110 21.800L5.580 22.300L5.050 22.800L1.910 22.800ZM5.750 22.480L6.220 22.980L6.020 26.320L5.490 26.820L5.020 26.320L5.220 22.980ZM5.470 27.180L5.940 27.680L5.740 31.020L5.210 31.520L4.740 31.020L4.940 27.680ZM.88 31.700L1.410 31.200L4.550 31.200L5.020 31.700L4.490 32.200L1.350 32.200ZM.97 27.180L1.440 27.680L1.240 31.020L.71 31.520L.24 31.020L.44 27.680ZM1.250 22.480L1.720 22.980L1.520 26.320L.99 26.820L.52 26.320L.72 22.980ZM1.160 27L1.690 26.500L4.830 26.500L5.300 27L4.770 27.500L1.630 27.500ZM1.440 33.100L1.970 32.600L5.110 32.600L5.580 33.100L5.050 33.600L1.910 33.600ZM5.750 33.280L6.220 33.780L6.020 37.120L5.490 37.620L5.020 37.120L5.220 33.780ZM1.250 33.280L1.720 33.780L1.520 37.120L.99 37.620L.52 37.120L.72 33.780ZM1.160 37.800L1.690 37.300L4.830 37.300L5.300 37.800L4.770 38.300L1.630 38.300ZM5.470 37.980L5.940 38.480L5.740 41.820L5.210 42.320L4.740 41.820L4.940 38.480ZM.88 42.500L1.410 42L4.550 42L5.020 42.500L4.490 43L1.350 43ZM1.440 43.900L1.970 43.400L5.110 43.400L5.580 43.900L5.050 44.400L1.910 44.400ZM5.750 44.080L6.220 44.580L6.020 47.920L5.490 48.420L5.020 47.920L5.220 44.580ZM5.470 48.780L5.940 49.280L5.740 52.620L5.210 53.120L4.740 52.620L4.940 49.280ZM.88 53.300L1.410 52.800L4.550 52.800L5.020 53.300L4.490 53.800L1.350 53.800ZM.97 48.780L1.440 49.280L1.240 52.620L.71 53.120L.24 52.620L.44 49.280ZM1.250 44.080L1.720 44.580L1.520 47.920L.99 48.420L.52 47.920L.72 44.580ZM5.750 54.880L6.220 55.380L6.020 58.720L5.490 59.220L5.020 58.720L5.220 55.380ZM5.470 59.580L5.940 60.080L5.740 63.420L5.210 63.920L4.740 63.420L4.940 60.080ZM1.440 65.500L1.970 65L5.110 65L5.580 65.500L5.050 66L1.910 66ZM5.750 65.680L6.220 66.180L6.020 69.520L5.490 70.020L5.020 69.520L5.220 66.180ZM1.160 70.200L1.690 69.700L4.830 69.700L5.300 70.200L4.770 70.700L1.630 70.700ZM.97 70.380L1.440 70.880L1.240 74.220L.71 74.720L.24 74.220L.44 70.880ZM.88 74.900L1.410 74.400L4.550 74.400L5.020 74.900L4.490 75.400L1.350 75.400ZM1.440 76.300L1.970 75.800L5.110 75.800L5.580 76.300L5.050 76.800L1.910 76.800ZM5.750 76.480L6.220 76.980L6.020 80.320L5.490 80.820L5.020 80.320L5.220 76.980ZM1.160 81L1.690 80.500L4.830 80.500L5.300 81L4.770 81.500L1.630 81.500ZM5.470 81.180L5.940 81.680L5.740 85.020L5.210 85.520L4.740 85.020L4.940 81.680ZM.88 85.700L1.410 85.200L4.550 85.200L5.020 85.700L4.490 86.200L1.350 86.200ZM1.250 87.280L1.720 87.780L1.520 91.120L.99 91.620L.52 91.120L.72 87.780ZM1.160 91.800L1.690 91.300L4.830 91.300L5.300 91.800L4.770 92.300L1.630 92.300ZM5.750 87.280L6.220 87.780L6.020 91.120L5.490 91.620L5.020 91.120L5.220 87.780ZM5.470 91.980L5.940 92.480L5.740 95.820L5.210 96.320L4.740 95.820L4.940 92.480ZM1.440 97.900L1.970 97.400L5.110 97.400L5.580 97.900L5.050 98.400L1.910 98.400ZM1.250 98.080L1.720 98.580L1.520 101.920L.99 102.420L.52 101.920L.72 98.580ZM1.160 102.600L1.690 102.100L4.830 102.100L5.300 102.600L4.770 103.100L1.630 103.100ZM5.470 102.780L5.940 103.280L5.740 106.620L5.210 107.120L4.740 106.620L4.940 103.280ZM.88 107.300L1.410 106.800L4.550 106.800L5.020 107.300L4.490 107.800L1.350 107.800Z"></path>
                  </svg>
                </span>
                {' '}
                <span className="pk-list-led" style={{ left: '79.900%', width: '4.220%', background: '#1e0a07' } as React.CSSProperties}>
                  <svg viewBox="0 0 6.750 108" preserveAspectRatio="none" style={{ '--t': '1.600s' } as React.CSSProperties}>
                    <path fill="#e5342b" d="M1.290 .7L1.820 .2L4.960 .2L5.430 .7L4.900 1.200L1.760 1.200ZM5.600 .88L6.070 1.380L5.870 4.720L5.340 5.220L4.870 4.720L5.070 1.380ZM5.320 5.580L5.790 6.080L5.590 9.420L5.060 9.920L4.590 9.420L4.790 6.080ZM1.290 11.500L1.820 11L4.960 11L5.430 11.500L4.900 12L1.760 12ZM5.600 11.680L6.070 12.180L5.870 15.520L5.340 16.020L4.870 15.520L5.070 12.180ZM5.320 16.380L5.790 16.880L5.590 20.220L5.060 20.720L4.590 20.220L4.790 16.880ZM.73 20.900L1.260 20.400L4.400 20.400L4.870 20.900L4.340 21.400L1.200 21.400ZM.82 16.380L1.290 16.880L1.090 20.220L.56 20.720L.09 20.220L.29 16.880ZM1.100 11.680L1.570 12.180L1.370 15.520L.84 16.020L.37 15.520L.57 12.180ZM1.010 16.200L1.540 15.700L4.680 15.700L5.150 16.200L4.620 16.700L1.480 16.700ZM1.290 22.300L1.820 21.800L4.960 21.800L5.430 22.300L4.900 22.800L1.760 22.800ZM5.600 22.480L6.070 22.980L5.870 26.320L5.340 26.820L4.870 26.320L5.070 22.980ZM1.100 22.480L1.570 22.980L1.370 26.320L.84 26.820L.37 26.320L.57 22.980ZM1.010 27L1.540 26.500L4.680 26.500L5.150 27L4.620 27.500L1.480 27.500ZM5.320 27.180L5.790 27.680L5.590 31.020L5.060 31.520L4.590 31.020L4.790 27.680ZM.73 31.700L1.260 31.200L4.400 31.200L4.870 31.700L4.340 32.200L1.200 32.200ZM1.290 33.100L1.820 32.600L4.960 32.600L5.430 33.100L4.900 33.600L1.760 33.600ZM5.600 33.280L6.070 33.780L5.870 37.120L5.340 37.620L4.870 37.120L5.070 33.780ZM5.320 37.980L5.790 38.480L5.590 41.820L5.060 42.320L4.590 41.820L4.790 38.480ZM.73 42.500L1.260 42L4.400 42L4.870 42.500L4.340 43L1.200 43ZM.82 37.980L1.290 38.480L1.090 41.820L.56 42.320L.09 41.820L.29 38.480ZM1.100 33.280L1.570 33.780L1.370 37.120L.84 37.620L.37 37.120L.57 33.780ZM5.600 44.080L6.070 44.580L5.870 47.920L5.340 48.420L4.870 47.920L5.070 44.580ZM5.320 48.780L5.790 49.280L5.590 52.620L5.060 53.120L4.590 52.620L4.790 49.280ZM1.290 54.700L1.820 54.200L4.960 54.200L5.430 54.700L4.900 55.200L1.760 55.200ZM5.600 54.880L6.070 55.380L5.870 58.720L5.340 59.220L4.870 58.720L5.070 55.380ZM1.010 59.400L1.540 58.900L4.680 58.900L5.150 59.400L4.620 59.900L1.480 59.900ZM.82 59.580L1.290 60.080L1.090 63.420L.56 63.920L.09 63.420L.29 60.080ZM.73 64.100L1.260 63.600L4.400 63.600L4.870 64.100L4.340 64.600L1.200 64.600ZM1.290 65.500L1.820 65L4.960 65L5.430 65.500L4.900 66L1.760 66ZM5.600 65.680L6.070 66.180L5.870 69.520L5.340 70.020L4.870 69.520L5.070 66.180ZM1.010 70.200L1.540 69.700L4.680 69.700L5.150 70.200L4.620 70.700L1.480 70.700ZM5.320 70.380L5.790 70.880L5.590 74.220L5.060 74.720L4.590 74.220L4.790 70.880ZM.73 74.900L1.260 74.400L4.400 74.400L4.870 74.900L4.340 75.400L1.200 75.400ZM1.100 76.480L1.570 76.980L1.370 80.320L.84 80.820L.37 80.320L.57 76.980ZM1.010 81L1.540 80.500L4.680 80.500L5.150 81L4.620 81.500L1.480 81.500ZM5.600 76.480L6.070 76.980L5.870 80.320L5.340 80.820L4.870 80.320L5.070 76.980ZM5.320 81.180L5.790 81.680L5.590 85.020L5.060 85.520L4.590 85.020L4.790 81.680ZM1.290 87.100L1.820 86.600L4.960 86.600L5.430 87.100L4.900 87.600L1.760 87.600ZM1.100 87.280L1.570 87.780L1.370 91.120L.84 91.620L.37 91.120L.57 87.780ZM1.010 91.800L1.540 91.300L4.680 91.300L5.150 91.800L4.620 92.300L1.480 92.300ZM5.320 91.980L5.790 92.480L5.590 95.820L5.060 96.320L4.590 95.820L4.790 92.480ZM.73 96.500L1.260 96L4.400 96L4.870 96.500L4.340 97L1.200 97ZM1.290 97.900L1.820 97.400L4.960 97.400L5.430 97.900L4.900 98.400L1.760 98.400ZM1.100 98.080L1.570 98.580L1.370 101.920L.84 102.420L.37 101.920L.57 98.580ZM1.010 102.600L1.540 102.100L4.680 102.100L5.150 102.600L4.620 103.100L1.480 103.100ZM.82 102.780L1.290 103.280L1.090 106.620L.56 107.120L.09 106.620L.29 103.280ZM.73 107.300L1.260 106.800L4.400 106.800L4.870 107.300L4.340 107.800L1.200 107.800ZM5.320 102.780L5.790 103.280L5.590 106.620L5.060 107.120L4.590 106.620L4.790 103.280Z"></path>
                  </svg>
                </span>
                <svg className="pk-list-l pk-list-a-clap" viewBox="0 0 160 160" style={{ '--r': '11deg', transformOrigin: '11.250% 25.940%' } as React.CSSProperties}>
                  <use href="#pk-list-m-folly"></use>
                </svg>
                <svg className="pk-list-l" viewBox="0 0 160 160">
                  <use href="#pk-list-o-pin"></use>
                </svg>
              </span>
            </span>
            <svg className="pk-list-rain" viewBox="0 0 480 400" preserveAspectRatio="none" aria-hidden="true">
              <path d="M20.100 64.700l-7.300 29.100M79.600 110.500l-4.800 19.200M263.100 76.500l-5.500 21.800M391.700 124.600l-4.500 18M205.600 26.800l-6.700 26.700M231.200 28.100l-4.900 19.600M307.200 39.100l-6.700 26.900M311.900 82.900l-6.500 25.900M426.300 73.800l-4.100 16.500M274.900 138.300l-4.500 18M37.900 29l-6.300 25.300M269.200 55.200l-6.900 27.600M405.900 182.700l-6.500 25.900M20.100 264.700l-7.300 29.100M79.600 310.500l-4.800 19.200M263.100 276.500l-5.500 21.800M391.700 324.600l-4.500 18M205.600 226.800l-6.700 26.700M231.200 228.100l-4.900 19.600M307.200 239.100l-6.700 26.900M311.900 282.900l-6.500 25.900M426.300 273.800l-4.100 16.500M274.900 338.300l-4.500 18M37.900 229l-6.300 25.300M269.200 255.200l-6.900 27.600M405.900 382.700l-6.500 25.900" fill="none" stroke="#dfe8df" strokeWidth=".9" opacity=".42"></path>
            </svg>
            <span className="pk-list-copy">
              <span className="pk-list-lock">
                <b className="pk-list-t1">The</b>
                <b className="pk-list-t2">Folly</b>
              </span>
              <span className="pk-list-fan">
                <i>Risk everything</i>
                <i>on one film.</i>
              </span>
            </span>
          </span>
        ) : null}
        {v.show.blackout ? (
          <span className={`pk-list-scene pk-list-w-blackout ${v.sc.blackout}`}>
            <svg className="pk-list-bd" viewBox="0 0 480 200" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
              <g transform="translate(296 0) scale(1.25)">
                <use href="#pk-list-bk-bg"></use>
              </g>
            </svg>
            <span className="pk-list-scrim" aria-hidden="true"></span>
            {' '}
            <span className="pk-list-hb" aria-hidden="true">
              <PkBlackoutDoor />
              <svg className="pk-list-l" viewBox="0 0 160 160">
                <use href="#pk-list-bk-marks"></use>
              </svg>
              <svg className="pk-list-l pk-list-a-breath" viewBox="0 0 160 160">
                <use href="#pk-list-bk-beams"></use>
              </svg>
              <svg className="pk-list-l pk-list-a-sway" viewBox="0 0 160 160" style={{ '--t': '6.400s', '--r': '3.200deg', transformOrigin: '13.750% 81.250%' } as React.CSSProperties}>
                <use href="#pk-list-bk-sw1"></use>
              </svg>
              <svg className="pk-list-l pk-list-a-sway" viewBox="0 0 160 160" style={{ '--t': '8.200s', '--r': '2.600deg', transformOrigin: '87.500% 12.500%' } as React.CSSProperties}>
                <use href="#pk-list-bk-sw2"></use>
              </svg>
            </span>
            <span className="pk-list-bk-lines" aria-hidden="true"></span>
            {' '}
            <span className="pk-list-bk-scan" aria-hidden="true"></span>
            {' '}
            <span className="pk-list-bk-cam" aria-hidden="true">
              <i className="pk-list-a-blink"></i>
              REC CAM 04
            </span>
            {' '}
            <span className="pk-list-copy">
              <span className="pk-list-lock">
                <b className="pk-list-t1">The Blackout</b>
                <b className="pk-list-t2">Job</b>
              </span>
              <span className="pk-list-fan">
                <i>Your film crew</i>
                <i>robs rivals blind.</i>
              </span>
            </span>
          </span>
        ) : null}
        <span className={`pk-list-prog ${v.progClass}`} aria-hidden="true">
          {v.ticks.map((t: any, tIndex: number) => (
            <i key={tIndex} className={`pk-list-tick ${t.cls}`}></i>
          ))}
        </span>
        {' '}
        <span className={`pk-list-go ${v.goClass}`} aria-hidden="true">
          <svg viewBox="0 0 12 12">
            <path d="M4.500 2L8.500 6L4.500 10" fill="none" stroke="#f9f6ef" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        </span>
        {' '}
        <span className="pk-list-frame" aria-hidden="true"></span>
      </button>
      <div className="pk-list-wall">
        <span className={`pk-list-spot ${v.spot.cls}`} aria-hidden="true" style={{ '--c': v.spot.c, '--r': v.spot.r, '--h': v.spot.h } as React.CSSProperties}></span>
        {' '}
        <button type="button" className={`pk-list-poster pk-list-w-cinema ${v.lit.cinema}`} onClick={() => onOpenPack('cinema')} style={{ '--i': '0' } as React.CSSProperties} aria-label="Cinema Chain">
          <span className="pk-list-box" aria-hidden="true">
            <svg className="pk-list-l" viewBox="0 0 160 160">
              <use href="#pk-list-c-seats"></use>
              <use href="#pk-list-c-seatline"></use>
              <use href="#pk-list-c-beams" opacity=".8"></use>
              <use href="#pk-list-c-floor"></use>
              <path d="M14 138H146" fill="none" stroke="#6d4c1c" strokeWidth="3.200" strokeLinecap="round" strokeDasharray="0 11"></path>
              <path d="M14 138H146" fill="none" stroke="#ffe6a6" strokeWidth="3.200" strokeLinecap="round" strokeDasharray="0 33"></path>
              <use href="#pk-list-c-val"></use>
            </svg>
            <svg className="pk-list-l pk-list-a-float" viewBox="0 0 160 160" style={{ '--y': '2.400%', '--r': '1.300deg', transformOrigin: '50% 48%' } as React.CSSProperties}>
              <use href="#pk-list-h-cinema"></use>
            </svg>
          </span>
          {' '}
          <span className="pk-list-name">
            <b className="pk-list-t1">Cinema</b>
            <b className="pk-list-t2">Chain</b>
          </span>
          {' '}
          <span className="pk-list-veil" aria-hidden="true"></span>
        </button>
        {' '}
        <button type="button" className={`pk-list-poster pk-list-w-sue ${v.lit.sue}`} onClick={() => onOpenPack('sue')} style={{ '--i': '1' } as React.CSSProperties} aria-label="Sue Everyone">
          <span className="pk-list-box" aria-hidden="true">
            <svg className="pk-list-l" viewBox="0 0 160 160">
              <use href="#pk-list-s-bg"></use>
              <use href="#pk-list-s-cloud"></use>
              <use href="#pk-list-pigeon-b" transform="translate(24 90) scale(-.52 .52)"></use>
              <use href="#pk-list-pigeon-h" transform="translate(24 90) scale(-.52 .52)"></use>
              <use href="#pk-list-pigeon-b" transform="translate(136 90) scale(.52)"></use>
              <use href="#pk-list-pigeon-h" transform="translate(136 90) scale(.52)"></use>
              <use href="#pk-list-h-sue"></use>
              <use href="#pk-list-s-sign" transform="translate(0 8)" strokeWidth=".8"></use>
            </svg>
            <svg className="pk-list-l pk-list-a-thump" viewBox="0 0 160 160" style={{ '--y': '5%' } as React.CSSProperties}>
              <use href="#pk-list-m-sue"></use>
            </svg>
          </span>
          {' '}
          <span className="pk-list-name">
            <b className="pk-list-t1">Sue</b>
            <b className="pk-list-t2">Everyone</b>
          </span>
          {' '}
          <span className="pk-list-veil" aria-hidden="true"></span>
        </button>
        {' '}
        <button type="button" className={`pk-list-poster pk-list-w-nine ${v.lit.nine}`} onClick={() => onOpenPack('nine')} style={{ '--i': '2' } as React.CSSProperties} aria-label="The Gilded Nine">
          <span className="pk-list-box" aria-hidden="true">
            <svg className="pk-list-l" viewBox="0 0 160 160">
              <use href="#pk-list-n-bg"></use>
              <use href="#pk-list-n-chair" transform="translate(24 148) scale(.42)"></use>
              <use href="#pk-list-n-chair" transform="translate(136 148) scale(-.42 .42)"></use>
              <use href="#pk-list-n-far" transform="translate(13 58) scale(.24)"></use>
              <use href="#pk-list-n-far" transform="translate(147 58) scale(-.24 .24)"></use>
              <use href="#pk-list-n-base"></use>
            </svg>
            <span className="pk-list-rings"></span>
            <svg className="pk-list-l" viewBox="0 0 160 160">
              <use href="#pk-list-n-b"></use>
            </svg>
            <svg className="pk-list-l pk-list-a-spin" viewBox="0 0 160 160" style={{ transformOrigin: '50% 45%' } as React.CSSProperties}>
              <use href="#pk-list-n-a"></use>
            </svg>
            <svg className="pk-list-l pk-list-a-spinb" viewBox="0 0 160 160" style={{ transformOrigin: '50% 45%' } as React.CSSProperties}>
              <use href="#pk-list-n-c"></use>
            </svg>
            <svg className="pk-list-l" viewBox="0 0 160 160">
              <use href="#pk-list-n-ball"></use>
              <use href="#pk-list-n-iris"></use>
              <use href="#pk-list-n-lid"></use>
            </svg>
          </span>
          {' '}
          <span className="pk-list-name">
            <b className="pk-list-t1">The Gilded</b>
            <b className="pk-list-t2">Nine</b>
          </span>
          {' '}
          <span className="pk-list-veil" aria-hidden="true"></span>
        </button>
        {' '}
        <button type="button" className={`pk-list-poster pk-list-w-folly ${v.lit.folly}`} onClick={() => onOpenPack('folly')} style={{ '--i': '3' } as React.CSSProperties} aria-label="The Folly">
          <span className="pk-list-box" aria-hidden="true">
            <svg className="pk-list-l" viewBox="0 0 160 160">
              <use href="#pk-list-o-bg"></use>
              <use href="#pk-list-o-lamp"></use>
              <use href="#pk-list-h-folly"></use>
            </svg>
            <svg className="pk-list-l pk-list-a-clap" viewBox="0 0 160 160" style={{ '--r': '11deg', transformOrigin: '11.250% 25.940%' } as React.CSSProperties}>
              <use href="#pk-list-m-folly"></use>
            </svg>
            <svg className="pk-list-l" viewBox="0 0 160 160">
              <use href="#pk-list-o-pin"></use>
              <path d="M146.900 71.900l-4.300 17.300M37.500 122l-4.100 16.300M118.300 14.800l-4.200 16.800M18.700 2.700l-3.800 15.300M89.100 91.500l-3.800 15M91.600 135.500l-4.100 16.300M171.400 51.200l-4.200 16.900M106.800 131.700l-2.700 10.700M29 71.700l-3.200 12.700M117.500 71.400l-3.400 13.600M83.700 98.400l-2.300 9.100M136.300 15.900l-2.900 11.500M134.800 115.400l-3.400 13.600" fill="none" stroke="#dfe8df" strokeWidth=".55" opacity=".42"></path>
            </svg>
          </span>
          {' '}
          <span className="pk-list-name">
            <b className="pk-list-t1">The</b>
            <b className="pk-list-t2">Folly</b>
          </span>
          {' '}
          <span className="pk-list-veil" aria-hidden="true"></span>
        </button>
        <button type="button" className={`pk-list-poster pk-list-w-blackout ${v.lit.blackout}`} onClick={() => onOpenPack('blackout')} style={{ '--i': '4' } as React.CSSProperties} aria-label="The Blackout Job">
          <span className="pk-list-box" aria-hidden="true">
            <svg className="pk-list-l" viewBox="0 0 160 160">
              <use href="#pk-list-bk-bg"></use>
            </svg>
            <PkBlackoutDoor />
            <svg className="pk-list-l" viewBox="0 0 160 160">
              <use href="#pk-list-bk-marks"></use>
            </svg>
            <svg className="pk-list-l pk-list-a-breath" viewBox="0 0 160 160">
              <use href="#pk-list-bk-beams"></use>
            </svg>
            <svg className="pk-list-l pk-list-a-sway" viewBox="0 0 160 160" style={{ '--t': '6.400s', '--r': '3.200deg', transformOrigin: '13.750% 81.250%' } as React.CSSProperties}>
              <use href="#pk-list-bk-sw1"></use>
            </svg>
          </span>
          {' '}
          <span className="pk-list-bk-lines" aria-hidden="true"></span>
          {' '}
          <span className="pk-list-name">
            <b className="pk-list-t1">The Blackout</b>
            <b className="pk-list-t2">Job</b>
          </span>
          {' '}
          <span className="pk-list-veil" aria-hidden="true"></span>
        </button>
        {' '}
        <div className="pk-list-poster pk-list-sealed" style={{ '--i': '5' } as React.CSSProperties}>
          <span className="pk-list-box" aria-hidden="true">
            <svg className="pk-list-l" viewBox="0 0 160 160">
              <use href="#pk-list-v-drape"></use>
            </svg>
          </span>
          {' '}
          <span className="pk-list-strap" aria-hidden="true"></span>
          {' '}
          <svg className="pk-list-seal" viewBox="38 38 44 44" aria-hidden="true">
            <path d="M60 41C66 40 70 44 74 46C78 50 80 54 79 60C80 66 77 71 73 74C69 78 64 80 60 79C55 80 50 78 46 74C42 71 40 65 41 60C40 54 43 49 47 46C51 43 55 41 60 41Z" fill="#000" opacity=".6" transform="translate(.6 1.400)"></path>
            <path d="M60 41C66 40 70 44 74 46C78 50 80 54 79 60C80 66 77 71 73 74C69 78 64 80 60 79C55 80 50 78 46 74C42 71 40 65 41 60C40 54 43 49 47 46C51 43 55 41 60 41Z" fill="url(#pk-list-v1)"></path>
            <circle cx="60" cy="60" r="12.500" fill="none" stroke="#5e3f0a" strokeWidth=".9"></circle>
            <circle cx="60" cy="60" r="11.200" fill="none" stroke="#ffd98a" strokeWidth=".5" opacity=".6"></circle>
            <path d="M60 52.500a3.400 3.400 0 0 1 1.800 6.300l1.400 7.700h-6.400l1.400-7.700a3.400 3.400 0 0 1 1.800-6.300Z" fill="#2a1b05"></path>
          </svg>
          <span className="pk-list-name">CLASSIFIED</span>
        </div>
      </div>
    </div>
  );
}
