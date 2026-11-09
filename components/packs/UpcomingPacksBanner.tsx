import React, { useEffect, useRef } from 'react';
import { useMergedState } from './useMergedState';
import '../../styles/packs/upcoming-packs-banner.css';

const PK_IDS = ['cinema', 'sue', 'nine', 'folly', 'blackout'];
const PK_EVERY = 3200;
const PK_FADE = 720;
const PK_EVERY_STILL = 5000;

interface UpcomingPacksBannerProps {
  onOpen: () => void;
}

export default function UpcomingPacksBanner({ onOpen }: UpcomingPacksBannerProps) {
  const [state, set, latest] = useMergedState({ cur: 0, prev: -1, down: false });
  const tick = useRef<ReturnType<typeof setInterval>>(undefined);
  const clean = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      tick.current = setInterval(() => {
        if (document.visibilityState === 'hidden') return;
        set({ cur: (latest.current.cur + 1) % PK_IDS.length });
      }, PK_EVERY_STILL);
    } else {
      tick.current = setInterval(() => {
        if (document.visibilityState === 'hidden') return;
        const prev = latest.current.cur;
        set({ cur: (prev + 1) % PK_IDS.length, prev });
        clearTimeout(clean.current);
        clean.current = setTimeout(() => set({ prev: -1 }), PK_FADE);
      }, PK_EVERY);
    }
    return () => {
      clearInterval(tick.current);
      clearTimeout(clean.current);
    };
  }, []);

  const press = () => set({ down: true });
  const release = () => { if (latest.current.down) set({ down: false }); };

  const { cur, prev, down } = state;
  const on: Record<string, string> = {};
  const show: Record<string, boolean> = {};
  const lit: Record<string, string> = {};
  PK_IDS.forEach((id, i) => {
    on[id] = i === cur ? 'pk-ea-on pk-ea-live' : i === prev ? 'pk-ea-prev pk-ea-live' : '';
    show[id] = i === cur || i === prev;
    lit[id] = i === cur ? 'pk-ea-lit' : '';
  });
  const v = {
    on,
    show,
    lit,
    nudge: 'pk-ea-nudge-' + (cur % 2),
    winClass: down ? 'pk-ea-down' : '',
    press,
    release,
  };
  return (
    <div className="pk-ea-root">
      <span className="pk-ea-fontload" aria-hidden="true">SUBPOENA</span>
      <svg className="pk-ea-defs" aria-hidden="true">
        <defs>
          {/* worlds */}
          <radialGradient id="pk-ea-shade">
            <stop offset="0" stopColor="#000" stopOpacity=".66"></stop>
            <stop offset="1" stopColor="#000" stopOpacity="0"></stop>
          </radialGradient>
          {/* cinema */}
          <linearGradient id="pk-ea-cin-velvet" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="40" y2="0" spreadMethod="repeat">
            <stop offset="0" stopColor="#2c070b"></stop>
            <stop offset=".32" stopColor="#4a1019"></stop>
            <stop offset=".5" stopColor="#64161f"></stop>
            <stop offset=".68" stopColor="#4a1019"></stop>
            <stop offset="1" stopColor="#2c070b"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-cin-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffdf8e" stopOpacity=".5"></stop>
            <stop offset=".6" stopColor="#ffdf8e" stopOpacity=".15"></stop>
            <stop offset="1" stopColor="#ffdf8e" stopOpacity=".03"></stop>
          </linearGradient>
          <radialGradient id="pk-ea-cin-pool">
            <stop offset="0" stopColor="#ffdf8e" stopOpacity=".42"></stop>
            <stop offset="1" stopColor="#ffdf8e" stopOpacity="0"></stop>
          </radialGradient>
          <linearGradient id="pk-ea-cin-foil" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffefb8"></stop>
            <stop offset=".3" stopColor="#ecbd58"></stop>
            <stop offset=".62" stopColor="#d09b36"></stop>
            <stop offset=".84" stopColor="#f4d283"></stop>
            <stop offset="1" stopColor="#b3832a"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-cin-sheen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0"></stop>
            <stop offset=".5" stopColor="#fff" stopOpacity=".72"></stop>
            <stop offset="1" stopColor="#fff" stopOpacity="0"></stop>
          </linearGradient>
          <clipPath id="pk-ea-cin-clip">
            <path d="M24 0H206V164H24A24 24 0 0 1 0 140V104A22 22 0 0 0 0 60V24A24 24 0 0 1 24 0Z"></path>
          </clipPath>
          {/* sue */}
          <radialGradient id="pk-ea-sue-shadow">
            <stop offset="0" stopColor="#46567a" stopOpacity=".62"></stop>
            <stop offset="1" stopColor="#46567a" stopOpacity="0"></stop>
          </radialGradient>
          <linearGradient id="pk-ea-sue-col" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff"></stop>
            <stop offset=".44" stopColor="#eef0f5"></stop>
            <stop offset="1" stopColor="#b3bed3"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-sue-paper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fdfcf8"></stop>
            <stop offset="1" stopColor="#f3f2ec"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-sue-knob" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d98f54"></stop>
            <stop offset=".5" stopColor="#94481c"></stop>
            <stop offset="1" stopColor="#4c2109"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-sue-wood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#b86e38"></stop>
            <stop offset=".55" stopColor="#7c3a15"></stop>
            <stop offset="1" stopColor="#532409"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-sue-top" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d48d50"></stop>
            <stop offset="1" stopColor="#94501f"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-sue-brass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f4dc98"></stop>
            <stop offset=".5" stopColor="#c79a3e"></stop>
            <stop offset="1" stopColor="#7c5c1c"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-sue-bird" gradientUnits="userSpaceOnUse" x1="10" y1="10" x2="30" y2="30">
            <stop offset="0" stopColor="#d4dbe6"></stop>
            <stop offset=".5" stopColor="#9aa7bd"></stop>
            <stop offset="1" stopColor="#5d6b8b"></stop>
          </linearGradient>
          <g id="pk-ea-sue-pbody">
            <ellipse cx="24" cy="33" rx="13" ry="1.800" fill="#46587e" fillOpacity=".38"></ellipse>
            <path d="M16.500 29v3.600M21.500 29.500v3.100M14.500 33h4M19.500 33h4" stroke="#c8102e" strokeWidth="1.300" strokeLinecap="round" fill="none"></path>
            <path d="M30 21L43 26.500L41 30L27 27Z" fill="#59678a"></path>
            <path d="M34 24.500L42.500 27.500L41 30L33 28Z" fill="#2f3c5c"></path>
            <path d="M10 14C14 10 24 10 30 16C34 20 33.500 26 28 28.500C22 31 13 30 9 25C7 21 7 17 10 14Z" fill="url(#pk-ea-sue-bird)"></path>
            <path d="M14 15C20 12 28 15 34 24C27 26 18 25 14 19.500Z" fill="#b6c0d1"></path>
            <path d="M22.500 15.400L27.600 24.900M27 18L31.200 24.400" stroke="#3b4867" strokeWidth="2" strokeLinecap="round" fill="none"></path>
          </g>
          <g id="pk-ea-sue-phead">
            <path d="M9 16C7.800 11.500 8.600 8 11.600 7C15 7.600 17.300 11 17.300 14.400C14.400 17.600 11 17.800 9 16Z" fill="#4d6186"></path>
            <path d="M11.200 11.500C12.800 11 14.600 11.600 15.800 13C14.400 14.400 12 14.400 10.600 13.400Z" fill="#3f8a84" fillOpacity=".6"></path>
            <circle cx="10.500" cy="6.400" r="4.700" fill="#62739a"></circle>
            <path d="M6.300 5.200L1.800 7.200L6.400 8.100Z" fill="#2c3550"></path>
            <circle cx="9.300" cy="5.600" r="1.250" fill="#e9772a"></circle>
            <circle cx="9.200" cy="5.600" r=".6" fill="#10192f"></circle>
          </g>
          {/* nine */}
          <radialGradient id="pk-ea-nine-sky">
            <stop offset="0" stopColor="#dfe6e6" stopOpacity=".42"></stop>
            <stop offset="1" stopColor="#dfe6e6" stopOpacity="0"></stop>
          </radialGradient>
          <linearGradient id="pk-ea-nine-collar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#65686a"></stop>
            <stop offset=".42" stopColor="#2a2c2e"></stop>
            <stop offset="1" stopColor="#121314"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-nine-brass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c2a566"></stop>
            <stop offset=".32" stopColor="#a08a58"></stop>
            <stop offset=".68" stopColor="#7a6a43"></stop>
            <stop offset="1" stopColor="#574a2c"></stop>
          </linearGradient>
          <radialGradient id="pk-ea-nine-stone" cx=".42" cy=".3" r=".8">
            <stop offset="0" stopColor="#cfd0cb"></stop>
            <stop offset=".62" stopColor="#8e8f8b"></stop>
            <stop offset="1" stopColor="#57585a"></stop>
          </radialGradient>
          <linearGradient id="pk-ea-nine-lidu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8c8d89"></stop>
            <stop offset="1" stopColor="#c2c3bd"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-nine-lidl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9b9c97"></stop>
            <stop offset="1" stopColor="#5f605d"></stop>
          </linearGradient>
          <radialGradient id="pk-ea-nine-iris">
            <stop offset="0" stopColor="#d7d3c5"></stop>
            <stop offset=".55" stopColor="#b3ae9c"></stop>
            <stop offset=".86" stopColor="#6f6b5b"></stop>
            <stop offset="1" stopColor="#2c2a22"></stop>
          </radialGradient>
          <linearGradient id="pk-ea-nine-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a4145"></stop>
            <stop offset="1" stopColor="#1a1d20"></stop>
          </linearGradient>
          <g id="pk-ea-nine-chair">
            <ellipse cx="8" cy="-3" rx="44" ry="13" fill="url(#pk-ea-shade)" opacity=".8"></ellipse>
            <path d="M-19 -100L-27 -104L-25 -21L-17 -15Z" fill="#0c0e10"></path>
            <path d="M-19 -100L13 -106L5 -110L-27 -104Z" fill="#8b969c"></path>
            <path d="M-19 -100L13 -106L14 -25L-17 -15Z" fill="url(#pk-ea-nine-back)"></path>
            <path d="M-19 -100L13 -106" stroke="#c2a566" strokeWidth="1.600"></path>
            <path d="M-17 -24L14 -32L40 -22L10 -12Z" fill="#30373a"></path>
            <path d="M10 -12L40 -22L40 -16.500L10 -6.500Z" fill="#090a0c"></path>
            <path d="M-17 -24L10 -12L10 -6.500L-17 -18.500Z" fill="#0e1012"></path>
            <path d="M7.400 -7.600L12.400 -7.300L12 1L8 .6ZM36.600 -15.400L40 -16.500L39.600 -9L36.900 -8.200ZM-17 -18.500L-13.600 -17L-14 -10.400L-16.800 -11.600Z" fill="#090a0c"></path>
            <path d="M-11 -24C-12 -44 -10 -55 -1 -59C4 -61 11 -60 15 -56C19 -52 21 -44 20 -31L28 -28L34 -22L12 -14L-6 -20Z" fill="#050607"></path>
            <circle cx="5" cy="-69" r="7" fill="#050607"></circle>
            <path d="M5 -76A7 7 0 0 1 11.600 -71M5 -60C10 -60.400 14 -59 16.600 -55C19 -51.600 20.600 -46 20.600 -40" fill="none" stroke="#dbe7ee" strokeWidth="1.300" opacity=".7"></path>
          </g>
          <clipPath id="pk-ea-nine-clip">
            <circle cx="296" cy="62" r="29.400"></circle>
          </clipPath>
          {/* folly */}
          <linearGradient id="pk-ea-fol-board" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#343b36"></stop>
            <stop offset="1" stopColor="#161b18"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-fol-steel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d7d4c8"></stop>
            <stop offset="1" stopColor="#6e6c64"></stop>
          </linearGradient>
          <pattern id="pk-ea-fol-stripe" width="20" height="12" patternUnits="userSpaceOnUse" patternTransform="skewX(-32)">
            <rect width="20" height="12" fill="#141414"></rect>
            <rect width="10" height="12" fill="#e6e1cf"></rect>
          </pattern>
          <pattern id="pk-ea-fol-stripe2" width="20" height="10" patternUnits="userSpaceOnUse" patternTransform="translate(0 46) skewX(32)">
            <rect width="20" height="10" fill="#141414"></rect>
            <rect width="10" height="10" fill="#e6e1cf"></rect>
          </pattern>
          <pattern id="pk-ea-fol-drops" width="31" height="36" patternUnits="userSpaceOnUse" patternTransform="skewX(-14)">
            <path d="M6 2V13M18 16V30M27 6V14" stroke="#dfeee4" strokeOpacity=".2" strokeWidth=".7" strokeLinecap="round"></path>
          </pattern>
          <pattern id="pk-ea-fol-drops2" width="47" height="60" patternUnits="userSpaceOnUse" patternTransform="skewX(-14)">
            <path d="M10 3V25M33 31V49" stroke="#eef6ef" strokeOpacity=".36" strokeWidth=".9" strokeLinecap="round"></path>
          </pattern>
          <radialGradient id="pk-ea-fol-pool">
            <stop offset="0" stopColor="#f5f0dc" stopOpacity=".66"></stop>
            <stop offset=".5" stopColor="#f5f0dc" stopOpacity=".2"></stop>
            <stop offset="1" stopColor="#f5f0dc" stopOpacity="0"></stop>
          </radialGradient>
          <radialGradient id="pk-ea-fol-bloom" cx=".5" cy=".7" r=".62">
            <stop offset="0" stopColor="#e5342b" stopOpacity=".22"></stop>
            <stop offset="1" stopColor="#e5342b" stopOpacity="0"></stop>
          </radialGradient>
          <clipPath id="pk-ea-fol-led">
            <rect x="338.300" y="67.400" width="9.600" height="9.200"></rect>
          </clipPath>
          {/* THE BLACKOUT JOB: the approved page's vault door and collar, drawn around the same 288 face */}
          <linearGradient id="pk-ea-blk-colv" x1="0" y1="-16" x2="0" y2="304" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#b7ecca"></stop>
            <stop offset=".22" stopColor="#5c9c7c"></stop>
            <stop offset=".55" stopColor="#2a5b44"></stop>
            <stop offset="1" stopColor="#0d2a1e"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-blk-coltop" x1="0" y1="-16" x2="0" y2="164" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f0fff5" stopOpacity=".95"></stop>
            <stop offset="1" stopColor="#f0fff5" stopOpacity="0"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-blk-colb" x1="0" y1="-12" x2="0" y2="288" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#91baa0"></stop>
            <stop offset="1" stopColor="#1c241f"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-blk-barrel" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0d2a1e"></stop>
            <stop offset=".42" stopColor="#9edcb9"></stop>
            <stop offset=".62" stopColor="#3c7a5e"></stop>
            <stop offset="1" stopColor="#071a11"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-blk-plate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b3e9c8"></stop>
            <stop offset=".24" stopColor="#5a9b7a"></stop>
            <stop offset="1" stopColor="#143526"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-blk-boltv" x1="0" y1="15" x2="0" y2="273" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7cc29c"></stop>
            <stop offset=".5" stopColor="#2d5f49"></stop>
            <stop offset="1" stopColor="#0d261b"></stop>
          </linearGradient>
          <linearGradient id="pk-ea-blk-wv" x1="0" y1="86" x2="0" y2="204" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#e6fff0"></stop>
            <stop offset=".24" stopColor="#8fd4ad"></stop>
            <stop offset=".6" stopColor="#3a7559"></stop>
            <stop offset="1" stopColor="#123024"></stop>
          </linearGradient>
          <radialGradient id="pk-ea-blk-hub" cx=".4" cy=".26" r=".85">
            <stop offset="0" stopColor="#f4fff8"></stop>
            <stop offset=".38" stopColor="#8fd4ad"></stop>
            <stop offset="1" stopColor="#143526"></stop>
          </radialGradient>
          <radialGradient id="pk-ea-blk-halo">
            <stop offset="0" stopColor="#7dff9a" stopOpacity=".3"></stop>
            <stop offset=".55" stopColor="#7dff9a" stopOpacity=".1"></stop>
            <stop offset="1" stopColor="#7dff9a" stopOpacity="0"></stop>
          </radialGradient>
          <g id="pk-ea-blk-collar" fill="none">
            <circle cx="144" cy="144" r="152.400" stroke="url(#pk-ea-blk-colv)" strokeWidth="15.200"></circle>
            <circle cx="144" cy="144" r="160" stroke="url(#pk-ea-blk-coltop)" strokeWidth="1.800"></circle>
            <circle cx="144" cy="144" r="145.400" stroke="#010604" strokeWidth="3"></circle>
            <circle cx="144" cy="145.800" r="152.800" stroke="#020a06" strokeOpacity=".7" strokeWidth="6" strokeLinecap="round" strokeDasharray=".01 34.270"></circle>
            <circle cx="144" cy="144" r="152.800" stroke="url(#pk-ea-blk-colb)" strokeWidth="5.400" strokeLinecap="round" strokeDasharray=".01 34.270"></circle>
            <rect x="-24.200" y="68.800" width="21.600" height="64" rx="3.600" fill="#020a06" opacity=".6"></rect>
            <rect x="-24.200" y="164.800" width="21.600" height="64" rx="3.600" fill="#020a06" opacity=".6"></rect>
            <rect x="-25.800" y="64" width="21.600" height="64" rx="3.600" fill="url(#pk-ea-blk-barrel)"></rect>
            <rect x="-25.800" y="160" width="21.600" height="64" rx="3.600" fill="url(#pk-ea-blk-barrel)"></rect>
            <path d="M-27 78H-3M-27 112H-3M-27 174H-3M-27 208H-3" stroke="#04120b" strokeOpacity=".85" strokeWidth="2"></path>
          </g>
          <g id="pk-ea-blk-face">
            <circle cx="144" cy="144" r="102" fill="none" stroke="#050f0a" strokeOpacity=".8" strokeDasharray="1.200 7.800"></circle>
            <circle cx="144" cy="144" r="77.500" fill="none" stroke="#04140c" strokeOpacity=".7" strokeWidth="5" strokeDasharray="5 2 7 2 4 2 9 2 3 2 6 9"></circle>
            <path d="M95.930 65.560h.01M108.790 59h.01M122.520 54.540h.01M136.780 52.280h.01M151.220 52.280h.01M165.480 54.540h.01M179.210 59h.01M192.070 65.560h.01" fill="none" stroke="#04120b" strokeWidth="8" strokeLinecap="round"></path>
            <path d="M95.930 65.560h.01M108.790 59h.01M122.520 54.540h.01M136.780 52.280h.01M151.220 52.280h.01M165.480 54.540h.01M179.210 59h.01M192.070 65.560h.01" fill="none" stroke="#ff2b2b" strokeOpacity=".36" strokeWidth="12" strokeLinecap="round"></path>
            <path d="M95.930 65.560h.01M108.790 59h.01M122.520 54.540h.01M136.780 52.280h.01M151.220 52.280h.01M165.480 54.540h.01M179.210 59h.01M192.070 65.560h.01" fill="none" stroke="#ff2b2b" strokeWidth="6" strokeLinecap="round"></path>
            <path d="M95.930 65.560h.01M108.790 59h.01M122.520 54.540h.01M136.780 52.280h.01M151.220 52.280h.01M165.480 54.540h.01M179.210 59h.01M192.070 65.560h.01" fill="none" stroke="#ffd6d0" strokeWidth="2.400" strokeLinecap="round"></path>
            <g fill="none" strokeLinecap="round" strokeDasharray=".01 48.881" strokeDashoffset="24.445">
              <circle cx="144" cy="145.500" r="124.500" stroke="#020a06" strokeOpacity=".72" strokeWidth="16.400"></circle>
              <circle cx="144" cy="144" r="124.500" stroke="url(#pk-ea-blk-boltv)" strokeWidth="14.800"></circle>
              <circle cx="142.800" cy="142.400" r="124.500" stroke="#9edcb9" strokeOpacity=".75" strokeWidth="8"></circle>
              <circle cx="141.800" cy="141.200" r="124.500" stroke="#f4fff8" strokeOpacity=".85" strokeWidth="3"></circle>
            </g>
            <rect x="-6" y="86.400" width="42" height="26" rx="3" fill="#020a06" opacity=".6"></rect>
            <rect x="-6" y="182.400" width="42" height="26" rx="3" fill="#020a06" opacity=".6"></rect>
            <rect x="-6" y="83" width="42" height="26" rx="3" fill="url(#pk-ea-blk-plate)"></rect>
            <rect x="-6" y="179" width="42" height="26" rx="3" fill="url(#pk-ea-blk-plate)"></rect>
            <path d="M-6 83.700H36M-6 179.700H36" stroke="#f0fff5" strokeOpacity=".8" strokeWidth="1.400"></path>
            <path d="M14 96h.01M28 96h.01M14 192h.01M28 192h.01" fill="none" stroke="#020a06" strokeWidth="7.200" strokeLinecap="round"></path>
            <path d="M14 96h.01M28 96h.01M14 192h.01M28 192h.01" fill="none" stroke="#9edcb9" strokeWidth="5.400" strokeLinecap="round"></path>
            <g opacity=".5" transform="translate(0 5)">
              <circle cx="144" cy="144" r="48" fill="none" stroke="#020a06" strokeWidth="12"></circle>
              <path d="M136.800 131L139.600 96H148.400L151.200 131ZM154.140 133.140L188.290 124.980L191.010 133.350L158.590 146.830ZM157.470 150.280L175.770 180.250L168.650 185.420L145.820 158.750ZM142.180 158.750L119.350 185.420L112.230 180.250L130.530 150.280ZM129.410 146.830L96.990 133.350L99.710 124.980L133.860 133.140Z" fill="#020a06"></path>
              <circle cx="144" cy="144" r="19" fill="#020a06"></circle>
            </g>
            <path d="M136.800 131L139.600 96H148.400L151.200 131ZM154.140 133.140L188.290 124.980L191.010 133.350L158.590 146.830ZM157.470 150.280L175.770 180.250L168.650 185.420L145.820 158.750ZM142.180 158.750L119.350 185.420L112.230 180.250L130.530 150.280ZM129.410 146.830L96.990 133.350L99.710 124.980L133.860 133.140Z" fill="url(#pk-ea-blk-wv)" stroke="#04120b" strokeWidth=".9"></path>
            <circle cx="144" cy="144" r="48" fill="none" stroke="#04120b" strokeWidth="12.600"></circle>
            <circle cx="144" cy="144" r="48" fill="none" stroke="url(#pk-ea-blk-wv)" strokeWidth="11"></circle>
            <circle cx="144" cy="96" r="6.200" fill="url(#pk-ea-blk-hub)"></circle>
            <circle cx="189.650" cy="129.170" r="6.200" fill="url(#pk-ea-blk-hub)"></circle>
            <circle cx="172.210" cy="182.830" r="6.200" fill="url(#pk-ea-blk-hub)"></circle>
            <circle cx="115.790" cy="182.830" r="6.200" fill="url(#pk-ea-blk-hub)"></circle>
            <circle cx="98.350" cy="129.170" r="6.200" fill="url(#pk-ea-blk-hub)"></circle>
            <circle cx="144" cy="144" r="19" fill="#04120b"></circle>
            <circle cx="144" cy="144" r="17.600" fill="url(#pk-ea-blk-hub)"></circle>
            <circle cx="144" cy="144" r="9" fill="#123024" stroke="#cfffe0" strokeOpacity=".5" strokeWidth=".8"></circle>
            <circle cx="144" cy="144" r="3.600" fill="url(#pk-ea-blk-hub)"></circle>
          </g>
          <path id="pk-ea-blk-b1" d="M244 84L376 100M246 104L374 70M250 30L372 82M247 68L372 34"></path>
          <path id="pk-ea-blk-dots" d="M244 84h.01M376 100h.01M246 104h.01M374 70h.01M250 30h.01M372 82h.01M247 68h.01M372 34h.01M262 106h.01"></path>
          <path id="pk-ea-blk-s1" d="M262 106L358 20"></path>
        </defs>
      </svg>
      <button type="button" className={`pk-ea-win ${v.winClass}`} onClick={onOpen} aria-label="Upcoming Packs, 5 packs" onPointerDown={v.press} onPointerUp={v.release} onPointerCancel={v.release} onPointerLeave={v.release}>
        <span className={`pk-ea-spill ${v.lit.cinema}`} style={{ '--spill': '#e8b64c' } as React.CSSProperties} aria-hidden="true"></span>
        {' '}
        <span className={`pk-ea-spill ${v.lit.sue}`} style={{ '--spill': '#f4f1ea' } as React.CSSProperties} aria-hidden="true"></span>
        {' '}
        <span className={`pk-ea-spill ${v.lit.nine}`} style={{ '--spill': '#c2a566' } as React.CSSProperties} aria-hidden="true"></span>
        {' '}
        <span className={`pk-ea-spill ${v.lit.folly}`} style={{ '--spill': '#a4552a' } as React.CSSProperties} aria-hidden="true"></span>
        {' '}
        <span className={`pk-ea-spill ${v.lit.blackout}`} style={{ '--spill': '#4fcf7c' } as React.CSSProperties} aria-hidden="true"></span>
        {' '}
        <span className="pk-ea-gate" aria-hidden="true"></span>
        <div className="pk-ea-screen">
          {v.show.cinema ? (
            <div className={`pk-ea-scene pk-ea-w-cinema ${v.on.cinema}`}>
              <svg className="pk-ea-wide" viewBox="-60 0 460 124" aria-hidden="true">
                <rect x="-60" width="460" height="124" fill="url(#pk-ea-cin-velvet)"></rect>
              </svg>
              <svg className="pk-ea-far" viewBox="0 0 400 124" aria-hidden="true">
                <rect y="109" width="400" height="15" fill="#0b0203"></rect>
                <path d="M0 109H400" stroke="#b5862f" strokeOpacity=".42" strokeWidth=".7"></path>
              </svg>
              <svg className="pk-ea-art" viewBox="0 0 400 124" aria-hidden="true">
                <g className="pk-ea-cin-lights">
                  <g className="pk-ea-cin-b1">
                    <path d="M243 -6H249L271 110H221Z" fill="url(#pk-ea-cin-beam)"></path>
                    <path d="M244.500 -6H247.500L260 110H232Z" fill="url(#pk-ea-cin-beam)" opacity=".4"></path>
                  </g>
                  <g className="pk-ea-cin-b2">
                    <path d="M337 -6H343L365 110H315Z" fill="url(#pk-ea-cin-beam)"></path>
                    <path d="M338.500 -6H341.500L354 110H326Z" fill="url(#pk-ea-cin-beam)" opacity=".4"></path>
                  </g>
                  <ellipse className="pk-ea-cin-p1" cx="246" cy="114" rx="30" ry="3.200" fill="url(#pk-ea-cin-pool)"></ellipse>
                  <ellipse className="pk-ea-cin-p2" cx="340" cy="114" rx="30" ry="3.200" fill="url(#pk-ea-cin-pool)"></ellipse>
                </g>
                <ellipse cx="294" cy="110" rx="62" ry="6.500" fill="url(#pk-ea-shade)"></ellipse>
                <g className="pk-ea-cin-float">
                  <g transform="translate(228 23.500) rotate(-7 63 34) scale(.42)">
                    <g className="pk-ea-cin-stub">
                      <path d="M206 0H276A24 24 0 0 1 300 24V60A22 22 0 0 0 300 104V140A24 24 0 0 1 276 164H206Z" fill="url(#pk-ea-cin-foil)" stroke="#6e4610" strokeWidth="2"></path>
                      <path d="M216 12H272A16 16 0 0 1 288 28V54.500A30 30 0 0 0 288 109.500V136A16 16 0 0 1 272 152H216Z" fill="none" stroke="#5a3a08" strokeOpacity=".55" strokeWidth="2"></path>
                      <text transform="translate(262 82) rotate(90)" textAnchor="middle" dominantBaseline="central" fontFamily="Anton,sans-serif" fontSize="25" letterSpacing="2.600" fill="#14100a">ADMIT ONE</text>
                      <text transform="translate(233 82) rotate(90)" textAnchor="middle" dominantBaseline="central" fontFamily="Archivo,sans-serif" fontWeight="800" fontSize="11.500" letterSpacing="1.800" fill="#3e2806">SEAT 1</text>
                    </g>
                    <path d="M24 0H206V164H24A24 24 0 0 1 0 140V104A22 22 0 0 0 0 60V24A24 24 0 0 1 24 0Z" fill="url(#pk-ea-cin-foil)" stroke="#6e4610" strokeWidth="2"></path>
                    <circle cx="103" cy="84" r="64" fill="none" stroke="#5a3a08" strokeOpacity=".17" strokeWidth="84" strokeDasharray="2 9" clipPath="url(#pk-ea-cin-clip)"></circle>
                    <path d="M28 12H194V152H28A16 16 0 0 1 12 136V109.500A30 30 0 0 0 12 54.500V28A16 16 0 0 1 28 12Z" fill="none" stroke="#5a3a08" strokeOpacity=".62" strokeWidth="2.200"></path>
                    <path d="M205 4V160" fill="none" stroke="#2a1a05" strokeWidth="4" strokeDasharray=".1 10" strokeLinecap="round"></path>
                    <path d="M103 46L112.200 72.600L140.300 73.300L117.900 90.300L126 117.200L103 101.200L80 117.200L88.100 90.300L65.700 73.300L93.800 72.600Z" fill="#1a1208"></path>
                    <path d="M103 49L111 72L103 70Z" fill="#fff6dc" opacity=".2"></path>
                    <text x="103" y="35" textAnchor="middle" fontFamily="Archivo,sans-serif" fontWeight="800" fontSize="13.500" letterSpacing="2.400" fill="#4a3006">OPENING NIGHT</text>
                    <text x="103" y="145" textAnchor="middle" fontFamily="Archivo,sans-serif" fontWeight="800" fontSize="13.500" letterSpacing="2.400" fill="#3e2806">ROW A</text>
                    <g clipPath="url(#pk-ea-cin-clip)">
                      <rect className="pk-ea-cin-sheen" x="0" y="-20" width="46" height="204" fill="url(#pk-ea-cin-sheen)"></rect>
                    </g>
                  </g>
                </g>
              </svg>
              <div className="pk-ea-text">
                <b className="pk-ea-name">
                  <i>CINEMA</i>
                  {' '}
                  <u>CHAIN</u>
                </b>
                <span className="pk-ea-line">Own the screens.<br />Keep the box office.</span>
              </div>
            </div>
          ) : null}
          {v.show.sue ? (
            <div className={`pk-ea-scene pk-ea-w-sue ${v.on.sue}`}>
              <svg className="pk-ea-wide" viewBox="-60 0 460 124" aria-hidden="true">
                <rect x="-60" y="101" width="460" height="23" fill="#e9eaee"></rect>
                <path d="M-60 101H400" stroke="#8f9cb8" strokeOpacity=".62" strokeWidth=".9"></path>
                <rect x="-60" y="112" width="460" height="2.400" fill="#d6dbe6"></rect>
                <path d="M-60 112H400" stroke="#8f9cb8" strokeOpacity=".5" strokeWidth=".7"></path>
                <path d="M34 124L66 101H122L92 124Z" fill="#7f90b4" opacity=".16"></path>
              </svg>
              <svg className="pk-ea-far" viewBox="0 0 400 124" aria-hidden="true">
                <rect x="140" y="-2" width="270" height="66" fill="#bcc6d8"></rect>
                <path d="M172 62L196.49 -2H228.59L212 62Z" fill="url(#pk-ea-sue-col)"></path>
                <path d="M224 62L238.22 -2H271.93L266 62Z" fill="url(#pk-ea-sue-col)"></path>
                <path d="M276 62L279.95 -2H312.05L316 62Z" fill="url(#pk-ea-sue-col)"></path>
                <path d="M326 62L320.07 -2H353.78L368 62Z" fill="url(#pk-ea-sue-col)"></path>
                <path d="M380 62L363.41 -2H397.11L422 62Z" fill="url(#pk-ea-sue-col)"></path>
                <path d="M180 62L202.91 -2M188 62L209.33 -2M196 62L215.75 -2M204 62L222.17 -2M232.4 62L244.96 -2M240.8 62L251.7 -2M249.2 62L258.44 -2M257.6 62L265.19 -2M284 62L286.37 -2M292 62L292.79 -2M300 62L299.21 -2M308 62L305.63 -2M334.4 62L326.81 -2M342.8 62L333.56 -2M351.2 62L340.3 -2M359.6 62L347.04 -2M388.4 62L370.15 -2M396.8 62L376.89 -2M405.2 62L383.63 -2M413.6 62L390.37 -2" stroke="#7f8eae" strokeOpacity=".55" strokeWidth=".7" fill="none"></path>
                <path d="M172 12C230 8 360 8 420 12" stroke="#fff" strokeOpacity=".8" strokeWidth="1" fill="none"></path>
                <path transform="translate(224 -4) scale(.44)" fill="#2c3f70" fillOpacity=".3" d="M-6 62C6 34 34 24 60 34C70 8 110 -6 140 8C160 -14 206 -12 224 12C254 2 290 18 294 48C316 56 322 88 300 104C314 128 292 156 262 150C248 176 206 182 182 164C160 186 116 186 96 166C70 178 34 166 30 140C2 136 -14 104 6 88C-8 82 -12 72 -6 62Z"></path>
                <rect x="140" y="58" width="270" height="5.500" fill="#fbfaf6"></rect>
                <rect x="140" y="63.500" width="270" height="37.500" fill="#e2e5ec"></rect>
                <path d="M140 63.500H410" stroke="#8f9cb8" strokeOpacity=".75" strokeWidth=".9"></path>
                <path d="M140 69H410" stroke="#fff" strokeOpacity=".7" strokeWidth=".9"></path>
              </svg>
              <svg className="pk-ea-still" viewBox="0 0 400 124" aria-hidden="true">
                <g transform="translate(196 39.800) scale(-.58 .58) translate(-44 0)">
                  <use href="#pk-ea-sue-pbody"></use>
                  <g className="pk-ea-sue-head">
                    <use href="#pk-ea-sue-phead"></use>
                  </g>
                </g>
                <g transform="translate(219 44.300) scale(-.5 .5) translate(-44 0)">
                  <use href="#pk-ea-sue-pbody"></use>
                  <g className="pk-ea-sue-head pk-ea-sue-head2">
                    <use href="#pk-ea-sue-phead"></use>
                  </g>
                </g>
              </svg>
              <svg className="pk-ea-art" viewBox="0 0 400 124" aria-hidden="true">
                <g className="pk-ea-sue-pile">
                  <ellipse cx="296" cy="119.500" rx="80" ry="6" fill="url(#pk-ea-sue-shadow)"></ellipse>
                  <g transform="rotate(-1 296 90)">
                    <path d="M233 108L356 108L361 120.500H230.500Z" fill="#cfd5e2"></path>
                    <path d="M231 112H360.500M230.800 114.800H360.800M230.600 117.400H361" stroke="#8f9cb8" strokeWidth=".55" fill="none"></path>
                    <path d="M357 66L361.500 112L359 112L352 62Z" fill="#dfe3ea"></path>
                    <path d="M246 59H347L358 110.500H235Z" fill="url(#pk-ea-sue-paper)" stroke="#a8b1c6" strokeWidth=".7"></path>
                    <text x="296.500" y="98" textAnchor="middle" fontFamily="'Special Elite','Courier New',monospace" fontSize="10" letterSpacing="1.500" fill="#12234a">SUBPOENA</text>
                    <path d="M243 100.200H350M243 101.500H350" stroke="#12234a" strokeWidth=".55"></path>
                    <text x="243.500" y="107" fontFamily="'Special Elite','Courier New',monospace" fontSize="6" letterSpacing=".2" fill="#12234a">TO: YOUR EX</text>
                    <text x="349.500" y="107" textAnchor="end" fontFamily="'Special Elite','Courier New',monospace" fontSize="6" letterSpacing=".1" fill="#c8102e">RE: THE GOOD SOFA</text>
                    <g transform="rotate(-4 296 80)">
                      <g className="pk-ea-sue-ink">
                        <rect x="265" y="72" width="62" height="16" rx="2" fill="none" stroke="#c8102e" strokeWidth="1.700"></rect>
                        <text x="296" y="84.200" textAnchor="middle" fontFamily="Anton,sans-serif" fontSize="11" letterSpacing="1.400" fill="#c8102e">SERVED</text>
                      </g>
                    </g>
                    <ellipse className="pk-ea-sue-dark" cx="296" cy="89" rx="46" ry="5" fill="url(#pk-ea-sue-shadow)"></ellipse>
                  </g>
                </g>
                <g className="pk-ea-sue-stamp">
                  <g className="pk-ea-sue-tagswing">
                    <path d="M311 62C318 58 322 50 326 44" fill="none" stroke="#7a6743" strokeWidth=".6"></path>
                    <g transform="rotate(10 334 42)">
                      <path d="M325 37L346 37L346 49L325 49L320.500 43Z" fill="#efdcab" stroke="#b49a63" strokeWidth=".6"></path>
                      <circle cx="324.500" cy="43" r="1.100" fill="#fff" stroke="#8a7443" strokeWidth=".5"></circle>
                      <text x="336" y="42" textAnchor="middle" fontFamily="'Special Elite','Courier New',monospace" fontSize="3.700" fill="#12234a">STAMP THE</text>
                      <text x="336" y="46.500" textAnchor="middle" fontFamily="'Special Elite','Courier New',monospace" fontSize="3.700" fill="#12234a">SUBPOENA</text>
                    </g>
                  </g>
                  <g transform="translate(246 18) scale(.5)">
                    <path d="M41 90H159L174 110H26Z" fill="url(#pk-ea-sue-top)"></path>
                    <path d="M41 90H159" stroke="#f0c896" strokeWidth="1.400"></path>
                    <rect x="26" y="110" width="148" height="19" fill="url(#pk-ea-sue-wood)"></rect>
                    <path d="M26 110.600H174" stroke="#ffd9a8" strokeOpacity=".75" strokeWidth="1.500"></path>
                    <rect x="64" y="112.600" width="72" height="14" rx="1" fill="#f7efda" stroke="#7a6743" strokeWidth=".8"></rect>
                    <text x="100" y="124" textAnchor="middle" fontFamily="Anton,sans-serif" fontSize="11" letterSpacing="1.400" fill="#c8102e">SERVED</text>
                    <rect x="29" y="129" width="142" height="11" rx="1.600" fill="#8a0f22"></rect>
                    <path d="M71.500 90H128.500V97C128.500 104.500 71.500 104.500 71.500 97Z" fill="url(#pk-ea-sue-brass)"></path>
                    <path d="M100 2C114 2 126 10 126 23C126 33 118 39 112 43C109 45 108.500 47 109 50C110 53 116 53 116 56.500C116 60 110 60 109.500 63C109 66 110 69 113 73C117 78 123 80 126 85L127.500 91C127.500 97 72.500 97 72.500 91L74 85C77 80 83 78 87 73C90 69 91 66 90.500 63C90 60 84 60 84 56.500C84 53 90 53 91 50C91.500 47 91 45 88 43C82 39 74 33 74 23C74 10 86 2 100 2Z" fill="url(#pk-ea-sue-knob)"></path>
                    <path d="M84.500 8.500C78 14 76.600 25 82.400 33C81.400 24.500 83.200 15 91.500 6.800C89 6.800 86.500 7.400 84.500 8.500Z" fill="#fff" fillOpacity=".75"></path>
                    <path d="M91 50C95 52.600 105 52.600 109 50M90.500 63C94 65.600 106 65.600 109.500 63M74 85C84 89.600 116 89.600 126 85" fill="none" stroke="#1d0c05" strokeOpacity=".75" strokeWidth="1.300"></path>
                  </g>
                </g>
              </svg>
              <div className="pk-ea-text">
                <b className="pk-ea-name">
                  <i>SUE</i>
                  {' '}
                  <u>EVERYONE</u>
                </b>
                <span className="pk-ea-line">Sue anyone in town.<br />Take their stuff.</span>
              </div>
            </div>
          ) : null}
          {v.show.nine ? (
            <div className={`pk-ea-scene pk-ea-w-nine ${v.on.nine}`}>
              <svg className="pk-ea-wide" viewBox="-60 0 460 124" aria-hidden="true">
                <path d="M-6 96C26 84 44 100 70 78C92 60 120 76 142 50C160 30 186 40 206 8M60 124C74 108 96 112 118 96M150 124C164 108 186 100 214 104C226 106 230 116 228 124M190 4C206 20 222 28 214 52C208 72 234 86 228 124M344 -2C366 16 386 26 378 70C376 86 392 92 404 100M20 30C44 40 60 22 84 30" stroke="#c9ced0" strokeOpacity=".22" fill="none" strokeWidth=".8"></path>
              </svg>
              <svg className="pk-ea-far" viewBox="0 0 400 124" aria-hidden="true">
                <ellipse cx="296" cy="-8" rx="84" ry="112" fill="url(#pk-ea-nine-sky)"></ellipse>
                <ellipse cx="296" cy="64" rx="112" ry="66" fill="none" stroke="#c2a566" strokeOpacity=".36" strokeWidth=".8"></ellipse>
                <g transform="translate(218 44) scale(.31)">
                  <use href="#pk-ea-nine-chair"></use>
                </g>
                <g transform="translate(212 118) scale(.35)">
                  <use href="#pk-ea-nine-chair"></use>
                </g>
                <g transform="translate(374 44) scale(-.31 .31)">
                  <use href="#pk-ea-nine-chair"></use>
                </g>
                <g transform="translate(386 118) scale(-.35 .35)">
                  <use href="#pk-ea-nine-chair"></use>
                </g>
              </svg>
              <svg className="pk-ea-art" viewBox="0 0 400 124" aria-hidden="true">
                <ellipse cx="296" cy="118" rx="74" ry="6" fill="url(#pk-ea-shade)"></ellipse>
                <circle cx="296" cy="62" r="58" fill="url(#pk-ea-nine-collar)"></circle>
                <circle cx="296" cy="62" r="57.400" fill="none" stroke="#a8acad" strokeOpacity=".42" strokeWidth=".9"></circle>
                <circle cx="296" cy="62" r="53.300" fill="none" stroke="#a48f5c" strokeWidth="2.500" strokeDasharray=".1 13.850" strokeLinecap="round"></circle>
                <circle cx="296" cy="62" r="45.500" fill="none" stroke="url(#pk-ea-nine-brass)" strokeWidth="8.400"></circle>
                <circle cx="296" cy="62" r="49.900" fill="none" stroke="#17120a" strokeWidth=".9"></circle>
                <circle cx="296" cy="62" r="41.100" fill="none" stroke="#17120a" strokeWidth=".9"></circle>
                <g className="pk-ea-nine-a">
                  <circle cx="296" cy="62" r="45.500" fill="none" stroke="#17120a" strokeOpacity=".85" strokeWidth="4.800" strokeDasharray=".7 5.250"></circle>
                  <circle cx="296" cy="62" r="45.500" fill="none" stroke="#5f7f6e" strokeOpacity=".62" strokeWidth="7.400" strokeDasharray="20 66 12 58 16 114"></circle>
                  <rect x="292.500" y="12.500" width="7" height="9.500" fill="#050504"></rect>
                </g>
                <circle cx="296" cy="62" r="35.200" fill="none" stroke="url(#pk-ea-nine-brass)" strokeWidth="7"></circle>
                <circle cx="296" cy="62" r="31.600" fill="none" stroke="#17120a" strokeWidth="1"></circle>
                <g className="pk-ea-nine-b">
                  <circle cx="296" cy="62" r="38" fill="none" stroke="#17120a" strokeOpacity=".8" strokeWidth="1.300" strokeDasharray=".55 4.750"></circle>
                  <path d="M296 25.05L296 28.55M319.35 33.36L317.1 36.04M320.15 34.03L317.9 36.71M332.21 54.55L328.76 55.16M332.39 55.58L328.94 56.19M332.57 56.62L329.12 57.23M328.79 79.11L325.76 77.36M328.26 80.02L324.71 79.18L327.21 81.84M309.62 96.36L307.44 93.43L307.65 97.08M284.84 97.26L285.05 93.61L282.87 96.54M281.88 96.18L283.08 92.89M265.05 82.29L267.56 79.63L264 80.48M263.48 79.57L266.51 77.82M262.95 78.66L265.98 76.91M259.16 58.17L262.78 57.74L259.52 56.1M259.7 55.07L263.15 55.67M259.88 54.03L263.33 54.64M260.07 53L263.51 53.61M271 34.74L273.25 37.42M271.81 34.06L275.74 35.33M273.49 32.65L274.06 36.75" fill="none" stroke="#17120a" strokeOpacity=".9" strokeWidth=".6"></path>
                  <circle cx="296" cy="62" r="35.200" fill="none" stroke="#5f7f6e" strokeOpacity=".52" strokeWidth="6.200" strokeDasharray="14 72 9 126"></circle>
                  <rect x="292.800" y="23" width="6.400" height="7.800" fill="#050504" transform="rotate(180 296 62)"></rect>
                </g>
                <circle cx="296" cy="62" r="30.400" fill="url(#pk-ea-nine-stone)"></circle>
                <g clipPath="url(#pk-ea-nine-clip)">
                  <circle cx="296" cy="62" r="30" fill="#070707"></circle>
                  <g className="pk-ea-nine-look">
                    <circle cx="296" cy="61" r="11.800" fill="url(#pk-ea-nine-iris)"></circle>
                    <circle cx="296" cy="61" r="11.800" fill="none" stroke="#17140c" strokeOpacity=".5" strokeWidth="3" strokeDasharray=".6 2.200"></circle>
                    <circle className="pk-ea-nine-pupil" cx="296" cy="61" r="4.600" fill="#040404"></circle>
                    <circle cx="293.600" cy="58.200" r="1.400" fill="#fff" opacity=".85"></circle>
                  </g>
                  <g className="pk-ea-nine-u">
                    <path d="M254 18H338V62H323C311 52.500 303 49.500 296 49.500C289 49.500 281 52.500 269 62H254Z" fill="url(#pk-ea-nine-lidu)"></path>
                    <path d="M269 62C281 52.500 289 49.500 296 49.500C303 49.500 311 52.500 323 62" fill="none" stroke="#000" strokeOpacity=".55" strokeWidth="2.600" transform="translate(0 1.300)"></path>
                    <path d="M269 62C281 52.500 289 49.500 296 49.500C303 49.500 311 52.500 323 62" fill="none" stroke="#e6e6df" strokeOpacity=".75" strokeWidth=".8"></path>
                    <path d="M268 50C278 42 288 39 296 39C304 39 314 42 324 50" fill="none" stroke="#5a5b58" strokeOpacity=".55" strokeWidth=".9"></path>
                  </g>
                  <g className="pk-ea-nine-l">
                    <path d="M254 106H338V62H323C311 69 303 72.500 296 72.500C289 72.500 281 69 269 62H254Z" fill="url(#pk-ea-nine-lidl)"></path>
                    <path d="M269 62C281 69 289 72.500 296 72.500C303 72.500 311 69 323 62" fill="none" stroke="#2c2c2b" strokeWidth="1.100"></path>
                  </g>
                </g>
                <circle cx="296" cy="62" r="30.400" fill="none" stroke="#0a0a0a" strokeWidth="1.300"></circle>
                <path className="pk-ea-nine-glint" d="M260 30A48 48 0 0 1 332 30" fill="none" stroke="#fff4cf" strokeOpacity=".7" strokeWidth="1.300" strokeLinecap="round"></path>
              </svg>
              <div className="pk-ea-text">
                <b className="pk-ea-name">
                  <i>THE GILDED</i>
                  {' '}
                  <u>NINE</u>
                </b>
                <span className="pk-ea-line">Trade anything.<br />Decide everything.</span>
              </div>
            </div>
          ) : null}
          {v.show.folly ? (
            <div className={`pk-ea-scene pk-ea-w-folly ${v.on.folly}`}>
              <svg className="pk-ea-wide" viewBox="-60 0 460 124" aria-hidden="true">
                <rect x="-60" y="110" width="460" height="14" fill="#101813" opacity=".86"></rect>
                <path d="M-60 110H400" stroke="#cfe0d4" strokeOpacity=".16" strokeWidth=".8"></path>
                <path d="M30 116H72M104 120H146M172 115H204M204 115H240M262 119H300M318 114H366M226 121H250" stroke="#dfeee4" strokeOpacity=".24" strokeWidth=".9" strokeLinecap="round"></path>
              </svg>
              <svg className="pk-ea-far" viewBox="0 0 400 124" aria-hidden="true">
                <path d="M206 124C206 58 246 9 296 9C346 9 386 58 386 124" fill="none" stroke="#0e1511" strokeOpacity=".82" strokeWidth="1.700"></path>
                <path d="M296 9V124M276 12C258 38 250 80 252 124M316 12C334 38 342 80 340 124M256 21C238 48 228 84 226 124M336 21C354 48 364 84 366 124M268 15C286 21 306 21 324 15M244 30C272 40 320 40 348 30M224 52C262 66 330 66 368 52M212 82C256 96 336 96 380 82M268 15L296 37L324 15M244 30L272 56L296 37L320 56L348 30M224 52L252 86M368 52L340 86" fill="none" stroke="#0e1511" strokeOpacity=".68" strokeWidth=".9"></path>
                <path d="M286 9L296 2L306 9L296 16Z" fill="#0e1511" fillOpacity=".8"></path>
                <g fill="#0d1310">
                  <rect x="220" y="-2" width="1.500" height="126"></rect>
                  <rect x="232" y="-2" width="1.200" height="126"></rect>
                  <rect x="388" y="-2" width="1.500" height="126"></rect>
                </g>
                <path d="M220.700 26L232.600 44M232.600 26L220.700 44M220.700 62L232.600 80M232.600 62L220.700 80" stroke="#0d1310" strokeWidth=".7" fill="none"></path>
                <rect x="207" y="44" width="34" height="2" fill="#a4552a" opacity=".45"></rect>
                <rect x="207" y="44" width="34" height=".6" fill="#e0a07a" opacity=".25"></rect>
                <rect x="378" y="82" width="22" height="2" fill="#a4552a" opacity=".45"></rect>
              </svg>
              <svg className="pk-ea-art" viewBox="0 0 400 124" aria-hidden="true">
                <circle cx="272" cy="16" r="56" fill="url(#pk-ea-fol-pool)"></circle>
                <ellipse cx="296" cy="116" rx="66" ry="5.500" fill="url(#pk-ea-shade)"></ellipse>
                <g className="pk-ea-fol-lamp">
                  <path d="M272 -14V5" stroke="#0e1411" strokeWidth="1.100"></path>
                  <rect x="269.200" y="4" width="5.600" height="4.600" rx="1" fill="#0e1411"></rect>
                  <ellipse cx="272" cy="14" rx="5" ry="5.600" fill="#fffbe6"></ellipse>
                  <path d="M267 9.600C265.400 13 266 18 269 20.600H275C278 18 278.600 13 277 9.600M266.400 14H277.600M272 8.600V20.600" fill="none" stroke="#0e1411" strokeWidth=".85"></path>
                </g>
                <g className="pk-ea-fol-slate">
                  <g transform="rotate(-2.500 296 78)">
                    <rect x="242" y="45" width="110" height="68" rx="2" fill="url(#pk-ea-fol-board)" stroke="#4d4030" strokeWidth="2"></rect>
                    <path d="M242 62V70M242 94V104M352 50V58M352 84V96M260 113H272M330 113H342" stroke="#a4552a" strokeOpacity=".75" strokeWidth="2"></path>
                    <rect x="243" y="46" width="108" height="10" fill="url(#pk-ea-fol-stripe2)"></rect>
                    <path d="M243 56H351" stroke="#050505" strokeWidth="1"></path>
                    <path d="M270 48L276 50M311 52L317 50M336 47L340 49" stroke="#7a5a3a" strokeWidth=".8"></path>
                    <path d="M245 82H350M245 106H350" stroke="#d9d6c8" strokeOpacity=".2" strokeWidth=".6"></path>
                    <path d="M247.2 61.17 L251.84 60.66 M249.63 60.92 L249.37 69M253.32 60.74 L253.12 69.17 M257.24 60.57 L257.45 68.99 M253.17 65.12 L257.35 64.61M262.85 60.69 L259.14 60.86 L258.98 68.69 L262.96 68.43 M259.03 64.56 L262.23 64.22M270.97 60.94 L267.26 61.11 L267 69.11 M267.15 64.81 L270.25 64.47M274.41 60.58 C272.76 60.49 272.04 62.9 272.09 65.13 C272.19 67.54 273.17 69 274.36 68.75 C275.86 68.57 276.58 66.34 276.47 63.93 C276.37 61.69 275.55 60.23 274 60.75M278.37 60.57 L278.11 68.82 L281.46 68.56M283.25 60.23 L282.99 68.49 L286.35 68.23M287.72 60.64 L289.79 65.11 M291.95 60.47 L289.37 69.07" fill="none" stroke="#efeadb" strokeWidth=".95" strokeLinecap="round" strokeLinejoin="round"></path>
                    <text x="247.400" y="78.200" fontFamily="Archivo,sans-serif" fontWeight="800" fontSize="4.300" letterSpacing=".5" fill="#c9c6b8">TAKE</text>
                    <g className="pk-ea-fol-t0" transform="translate(2.200 0)">
                      <path d="M263.600 73.800C262.200 73.800 261.700 75.200 261.700 76.300C261.700 77.500 262.300 78.500 263.500 78.500C264.800 78.500 265.300 77.200 265.300 76.100C265.300 74.900 264.700 73.800 263.400 74" fill="none" stroke="#efeadb" strokeWidth=".8" strokeLinecap="round"></path>
                    </g>
                    <g className="pk-ea-fol-t1" transform="translate(2.200 0)">
                      <path d="M262.500 74.600L263.700 73.700L263.500 78.600" fill="none" stroke="#efeadb" strokeWidth=".8" strokeLinecap="round" strokeLinejoin="round"></path>
                    </g>
                    <path transform="translate(2.200 0)" d="M270 73.800L269.800 78.400M272.300 73.700L272.100 78.500M274.600 73.800L274.500 78.400M276.900 73.700L276.800 78.500M268.800 77.600L278 74.600" fill="none" stroke="#d9d6c8" strokeOpacity=".55" strokeWidth=".6" strokeLinecap="round"></path>
                    <path d="M255.500 104.400C254.400 99 255.200 94.600 257 90.800M254 93L257.200 90L259.800 93.400" fill="none" stroke="#efeadb" strokeOpacity=".9" strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M267.56 94.59 C266.52 93.45 264.32 93.6 263.86 95.27 C263.4 97.1 267.67 97.1 267.79 99.07 C267.91 101.05 264.9 101.58 263.57 99.98M269.29 101.35 L269.46 93.9 L273.62 101.19 L273.85 93.75M275.53 101.08 L277.84 93.48 L280.27 101.08 M276.45 98.49 L279.46 98.19M282.17 101.3 L282.23 93.93 C284.25 93.39 286.45 94.08 286.1 95.98 C285.87 97.5 283.79 97.95 282.23 97.73M291.04 94.21 L296.24 93.76 M293.75 93.98 L293.47 101.13M297.8 93.9 L297.57 101.35 M302.19 93.75 L302.42 101.19 M297.62 97.77 L302.3 97.32M308.37 93.83 L304.21 93.99 L304.04 100.9 L308.48 100.67 M304.09 97.25 L307.67 96.95M317.12 94.65 C316.08 93.51 313.89 93.66 313.42 95.33 C312.96 97.16 317.24 97.16 317.35 99.13 C317.47 101.11 314.46 101.64 313.13 100.04M319.14 93.6 L318.85 100.9 L322.61 100.67M324.05 101.35 L326.36 93.75 L328.79 101.35 M324.98 98.76 L327.98 98.46M330.35 94.16 L335.55 93.71 M333.06 93.93 L332.77 101.08M341.38 94.08 L337.22 94.23 L337.05 101.15 L341.49 100.92 M337.1 97.5 L340.69 97.19" fill="none" stroke="#efeadb" strokeOpacity=".92" strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round"></path>
                    <rect x="300" y="58" width="50" height="21.500" rx="1.800" fill="#090404" stroke="#3d1414" strokeWidth=".9"></rect>
                    <rect x="301" y="59" width="48" height="19.500" rx="1" fill="url(#pk-ea-fol-bloom)"></rect>
                    <text x="302.800" y="64.300" fontFamily="Archivo,sans-serif" fontWeight="800" fontSize="3.500" letterSpacing=".5" fill="#d9d4c4">BUDGET</text>
                    <text x="347.900" y="64.300" textAnchor="end" fontFamily="Archivo,sans-serif" fontWeight="800" fontSize="3.500" letterSpacing=".4" fill="#e5342b">OVER</text>
                    <path d="M308.18 68.3L310.44 68.3M310.82 68.72L310.61 71.58M310.55 72.42L310.33 75.28M307.62 75.7L309.88 75.7M307.45 72.42L307.23 75.28M307.72 68.72L307.51 71.58M307.9 72L310.16 72M312.78 68.3L315.04 68.3M315.42 68.72L315.21 71.58M315.15 72.42L314.93 75.28M312.22 75.7L314.48 75.7M312.05 72.42L311.83 75.28M312.32 68.72L312.11 71.58M312.5 72L314.76 72M319.38 68.3L321.63 68.3M322.02 68.72L321.81 71.58M321.75 72.42L321.53 75.28M318.82 75.7L321.08 75.7M318.65 72.42L318.43 75.28M318.92 68.72L318.71 71.58M319.1 72L321.36 72M323.98 68.3L326.24 68.3M326.62 68.72L326.41 71.58M326.35 72.42L326.13 75.28M323.42 75.7L325.68 75.7M323.25 72.42L323.03 75.28M323.52 68.72L323.31 71.58M323.7 72L325.96 72M328.58 68.3L330.84 68.3M331.22 68.72L331.01 71.58M330.95 72.42L330.73 75.28M328.02 75.7L330.28 75.7M327.85 72.42L327.63 75.28M328.12 68.72L327.91 71.58M328.3 72L330.56 72M335.18 68.3L337.44 68.3M337.82 68.72L337.61 71.58M337.55 72.42L337.33 75.28M334.62 75.7L336.88 75.7M334.45 72.42L334.23 75.28M334.72 68.72L334.51 71.58M334.9 72L337.16 72M339.78 68.3L342.04 68.3M342.42 68.72L342.21 71.58M342.15 72.42L341.93 75.28M339.22 75.7L341.48 75.7M339.05 72.42L338.83 75.28M339.32 68.72L339.11 71.58M339.5 72L341.76 72M344.38 68.3L346.63 68.3M347.02 68.72L346.81 71.58M346.75 72.42L346.53 75.28M343.82 75.7L346.08 75.7M343.65 72.42L343.43 75.28M343.92 68.72L343.71 71.58M344.1 72L346.36 72" fill="none" stroke="#e5342b" strokeOpacity=".1" strokeWidth=".9"></path>
                    <path d="M310.82 68.72L310.61 71.58M310.55 72.42L310.33 75.28M307.72 68.72L307.51 71.58M307.9 72L310.16 72M315.42 68.72L315.21 71.58M315.15 72.42L314.93 75.28M319.38 68.3L321.63 68.3M322.02 68.72L321.81 71.58M318.82 75.7L321.08 75.7M318.65 72.42L318.43 75.28M319.1 72L321.36 72M326.62 68.72L326.41 71.58M326.35 72.42L326.13 75.28M323.52 68.72L323.31 71.58M323.7 72L325.96 72M328.58 68.3L330.84 68.3M331.22 68.72L331.01 71.58M330.95 72.42L330.73 75.28M328.02 75.7L330.28 75.7M327.85 72.42L327.63 75.28M328.12 68.72L327.91 71.58M335.18 68.3L337.44 68.3M337.82 68.72L337.61 71.58M337.55 72.42L337.33 75.28M334.62 75.7L336.88 75.7M334.72 68.72L334.51 71.58M334.9 72L337.16 72M305.6 68.4L302.7 68.4L302.5 72L305.2 72L305 75.7L302.1 75.7M304.1 67.3L303.6 76.7" fill="none" stroke="#f0382c" strokeWidth=".9"></path>
                    <path d="M316.300 75L315.800 76.900M332.100 75L331.600 76.900" fill="none" stroke="#f0382c" strokeWidth=".85" strokeLinecap="round"></path>
                    <g clipPath="url(#pk-ea-fol-led)">
                      <path className="pk-ea-fol-d2" d="M339.78 68.3L342.04 68.3M342.15 72.42L341.93 75.28M339.22 75.7L341.48 75.7M339.05 72.42L338.83 75.28M339.32 68.72L339.11 71.58M339.5 72L341.76 72M339.78 80.3L342.04 80.3M342.42 80.72L342.21 83.58M342.15 84.42L341.93 87.28M339.78 92.3L342.04 92.3M342.42 92.72L342.21 95.58M342.15 96.42L341.93 99.28M339.22 99.7L341.48 99.7M339.05 96.42L338.83 99.28M339.32 92.72L339.11 95.58M339.5 96L341.76 96M339.78 104.3L342.04 104.3M342.42 104.72L342.21 107.58M342.15 108.42L341.93 111.28M339.22 111.7L341.48 111.7M339.32 104.72L339.11 107.58M339.5 108L341.76 108M339.78 116.3L342.04 116.3M342.42 116.72L342.21 119.58M342.15 120.42L341.93 123.28M339.22 123.7L341.48 123.7M339.05 120.42L338.83 123.28M339.32 116.72L339.11 119.58M342.42 128.72L342.21 131.58M342.15 132.42L341.93 135.28M339.78 140.3L342.04 140.3M342.42 140.72L342.21 143.58M339.22 147.7L341.48 147.7M339.05 144.42L338.83 147.28M339.5 144L341.76 144M339.78 152.3L342.04 152.3M342.42 152.72L342.21 155.58M342.15 156.42L341.93 159.28M339.22 159.7L341.48 159.7M339.5 156L341.76 156M342.42 164.72L342.21 167.58M342.15 168.42L341.93 171.28M339.32 164.72L339.11 167.58M339.5 168L341.76 168M339.78 176.3L342.04 176.3M342.15 180.42L341.93 183.28M339.22 183.7L341.48 183.7M339.32 176.72L339.11 179.58M339.5 180L341.76 180M339.78 188.3L342.04 188.3M342.15 192.42L341.93 195.28M339.22 195.7L341.48 195.7M339.05 192.42L338.83 195.28M339.32 188.72L339.11 191.58M339.5 192L341.76 192" fill="none" stroke="#f0382c" strokeWidth=".9"></path>
                      <path className="pk-ea-fol-d1" d="M344.38 68.3L346.63 68.3M347.02 68.72L346.81 71.58M346.75 72.42L346.53 75.28M343.82 75.7L346.08 75.7M344.1 72L346.36 72M347.02 80.72L346.81 83.58M346.75 84.42L346.53 87.28M343.92 80.72L343.71 83.58M344.1 84L346.36 84M344.38 92.3L346.63 92.3M346.75 96.42L346.53 99.28M343.82 99.7L346.08 99.7M343.92 92.72L343.71 95.58M344.1 96L346.36 96M344.38 104.3L346.63 104.3M346.75 108.42L346.53 111.28M343.82 111.7L346.08 111.7M343.65 108.42L343.43 111.28M343.92 104.72L343.71 107.58M344.1 108L346.36 108M344.38 116.3L346.63 116.3M347.02 116.72L346.81 119.58M346.75 120.42L346.53 123.28M344.38 128.3L346.63 128.3M347.02 128.72L346.81 131.58M346.75 132.42L346.53 135.28M343.82 135.7L346.08 135.7M343.65 132.42L343.43 135.28M343.92 128.72L343.71 131.58M344.1 132L346.36 132M344.38 140.3L346.63 140.3M347.02 140.72L346.81 143.58M346.75 144.42L346.53 147.28M343.82 147.7L346.08 147.7M343.92 140.72L343.71 143.58M344.1 144L346.36 144M344.38 152.3L346.63 152.3M347.02 152.72L346.81 155.58M346.75 156.42L346.53 159.28M343.82 159.7L346.08 159.7M343.65 156.42L343.43 159.28M343.92 152.72L343.71 155.58M347.02 164.72L346.81 167.58M346.75 168.42L346.53 171.28M344.38 176.3L346.63 176.3M347.02 176.72L346.81 179.58M343.82 183.7L346.08 183.7M343.65 180.42L343.43 183.28M344.1 180L346.36 180M344.38 188.3L346.63 188.3M347.02 188.72L346.81 191.58M346.75 192.42L346.53 195.28M343.82 195.7L346.08 195.7M344.1 192L346.36 192" fill="none" stroke="#f0382c" strokeWidth=".9"></path>
                    </g>
                    <rect x="301" y="59" width="48" height="8" rx="1" fill="#fff" opacity=".035"></rect>
                    <g className="pk-ea-fol-stick">
                      <rect x="242" y="33" width="112" height="12" rx="1.500" fill="url(#pk-ea-fol-stripe)" stroke="#0a0a0a" strokeWidth="1"></rect>
                      <path d="M260 36L268 38M296 41L306 39M332 37L338 40" stroke="#7a5a3a" strokeWidth=".9"></path>
                    </g>
                    <rect x="241" y="39" width="9" height="13" rx="1" fill="url(#pk-ea-fol-steel)" stroke="#1c1c1c" strokeWidth=".7"></rect>
                    <circle cx="245.500" cy="45" r="3.200" fill="#cfccbe" stroke="#1c1c1c" strokeWidth=".9"></circle>
                    <circle cx="245.500" cy="45" r="1.100" fill="#2a2a2a"></circle>
                  </g>
                </g>
                <path d="M245.03 121.05L244.53 112.1L243.73 119.81ZM245.03 121.05L233.21 123.86L243.73 119.81ZM239.6 115.95L238.72 107.66L238.26 114.74ZM239.6 115.95L228.64 118.85L238.26 114.74ZM234.33 111.33L233.1 103.72L232.95 110.17ZM234.33 111.33L224.25 114.31L232.95 110.17ZM229.22 107.19L227.65 100.29L227.79 106.09ZM229.22 107.19L220.04 110.23L227.79 106.09ZM224.28 103.53L222.4 97.35L222.8 102.5ZM224.28 103.53L216 106.61L222.8 102.5ZM219.5 100.35L217.35 94.92L217.97 99.41ZM219.5 100.35L212.13 103.44L217.97 99.41ZM214.89 97.65L212.51 92.99L213.3 96.81ZM214.89 97.65L208.44 100.7L213.3 96.81ZM210.44 95.42L207.9 91.56L208.79 94.7ZM210.44 95.42L204.92 98.39L208.79 94.7ZM250 126Q225.5 101 207 94" fill="#101713" stroke="#101713" strokeWidth=".7"></path>
                <path d="M233.8 124.15L232.96 117.74L232.46 122.95ZM233.8 124.15L225.35 126.21L232.46 122.95ZM229.19 120.07L228.23 114.4L227.83 118.89ZM229.19 120.07L221.72 121.94L227.83 118.89ZM224.84 116.37L223.78 111.44L223.45 115.22ZM224.84 116.37L218.34 118.04L223.45 115.22ZM220.75 113.04L219.6 108.87L219.33 111.94ZM220.75 113.04L215.21 114.49L219.33 111.94ZM216.91 110.1L215.72 106.68L215.46 109.04ZM216.91 110.1L212.34 111.29L215.46 109.04ZM238 128Q224 115 214 108" fill="#0b110d" stroke="#0b110d" strokeWidth=".7"></path>
                <path d="M379.62 120.16L388.89 120.02L380.59 118.64ZM379.62 120.16L377.88 113.02L380.59 118.64ZM383.43 114.28L391.84 114.28L384.44 112.78ZM383.43 114.28L382.13 107.77L384.44 112.78ZM386.96 109.13L394.51 109.28L388.01 107.67ZM386.96 109.13L386.11 103.25L388.01 107.67ZM390.21 104.71L396.9 105.01L391.32 103.29ZM390.21 104.71L389.81 99.49L391.32 103.29ZM393.18 101.01L399 101.47L394.36 99.65ZM393.18 101.01L393.23 96.46L394.36 99.65ZM395.86 98.04L400.8 98.67L397.14 96.77ZM395.86 98.04L396.38 94.2L397.14 96.77ZM376 126Q390 103 398 96" fill="#101713" stroke="#101713" strokeWidth=".7"></path>
              </svg>
              <div className="pk-ea-rainbox" aria-hidden="true">
                <svg className="pk-ea-fol-rain pk-ea-fol-far" viewBox="0 0 492 190">
                  <rect width="492" height="190" fill="url(#pk-ea-fol-drops)"></rect>
                </svg>
                <svg className="pk-ea-fol-rain pk-ea-fol-near" viewBox="0 0 492 190">
                  <rect width="492" height="190" fill="url(#pk-ea-fol-drops2)"></rect>
                </svg>
              </div>
              <div className="pk-ea-text">
                <b className="pk-ea-name">
                  <i>THE</i>
                  {' '}
                  <u>FOLLY</u>
                </b>
                <span className="pk-ea-line">Risk everything<br />on one film.</span>
              </div>
            </div>
          ) : null}
          {v.show.blackout ? (
            <div className={`pk-ea-scene pk-ea-w-blackout ${v.on.blackout}`}>
              <svg className="pk-ea-wide" viewBox="-60 0 460 124" aria-hidden="true">
                <path d="M-60 24H400M-60 100H400" fill="none" stroke="#7dff9a" strokeOpacity=".1" strokeWidth=".7"></path>
                <path d="M46 -2V126M136 -2V126" fill="none" stroke="#7dff9a" strokeOpacity=".08" strokeWidth=".7"></path>
                <path d="M46 24h.01M46 100h.01M136 24h.01M136 100h.01M226 24h.01M226 100h.01" fill="none" stroke="#bff5d2" strokeOpacity=".3" strokeWidth="1.600" strokeLinecap="round"></path>
              </svg>
              <svg className="pk-ea-far" viewBox="0 0 400 124" aria-hidden="true">
                <circle cx="308" cy="62" r="96" fill="url(#pk-ea-blk-halo)"></circle>
                <path d="M226 -12H392V136H226Z" fill="#020a06" fillOpacity=".22" stroke="#1c4a32" strokeWidth="1.300"></path>
                <path d="M240 -3H378V127H240Z" fill="#020a06" fillOpacity=".34" stroke="#2f6b4c" strokeWidth="1.300"></path>
                <path d="M226 -12L240 -3M392 -12L378 -3M226 136L240 127M392 136L378 127" fill="none" stroke="#2f6b4c" strokeOpacity=".7" strokeWidth=".8"></path>
                <ellipse cx="308" cy="1" rx="52" ry="20" fill="url(#pk-ea-blk-halo)"></ellipse>
                <rect x="282" y="-1" width="52" height="2.200" rx="1.100" fill="#eafff2"></rect>
              </svg>
              <div className="pk-ea-art" aria-hidden="true">
                <span className="pk-ea-blk-door">
                  <svg className="pk-ea-blk-l" viewBox="0 0 288 288">
                    <use href="#pk-ea-blk-collar"></use>
                  </svg>
                  <span className="pk-ea-blk-ring pk-ea-blk-rim"></span>
                  <span className="pk-ea-blk-ring pk-ea-blk-mid"></span>
                  <span className="pk-ea-blk-ring pk-ea-blk-core"></span>
                  <svg className="pk-ea-blk-l" viewBox="0 0 288 288">
                    <use href="#pk-ea-blk-face"></use>
                  </svg>
                  <span className="pk-ea-blk-ring pk-ea-blk-light"></span>
                </span>
                <svg className="pk-ea-blk-l" viewBox="0 0 400 124">
                  <g fill="none" strokeLinecap="round">
                    <path d="M243 12V5H250M373 12V5H366M243 112V119H250M373 112V119H366" stroke="#7dff9a" strokeOpacity=".6" strokeWidth="1"></path>
                    <use href="#pk-ea-blk-b1" stroke="#ff2b2b" strokeOpacity=".07" strokeWidth="5"></use>
                    <use href="#pk-ea-blk-b1" stroke="#ff2b2b" strokeOpacity=".2" strokeWidth="2.4"></use>
                    <use href="#pk-ea-blk-b1" stroke="#ff2b2b" strokeWidth=".85"></use>
                    <use href="#pk-ea-blk-b1" stroke="#ffc9c2" strokeWidth=".34"></use>
                    <use href="#pk-ea-blk-dots" stroke="#ff2b2b" strokeOpacity=".3" strokeWidth="5.600"></use>
                    <use href="#pk-ea-blk-dots" stroke="#ff2b2b" strokeWidth="2.700"></use>
                    <use href="#pk-ea-blk-dots" stroke="#fff" strokeWidth="1.100"></use>
                    <g className="pk-ea-blk-sweep">
                      <use href="#pk-ea-blk-s1" stroke="#ff2b2b" strokeOpacity=".07" strokeWidth="5"></use>
                      <use href="#pk-ea-blk-s1" stroke="#ff2b2b" strokeOpacity=".2" strokeWidth="2.4"></use>
                      <use href="#pk-ea-blk-s1" stroke="#ff2b2b" strokeWidth=".85"></use>
                      <use href="#pk-ea-blk-s1" stroke="#ffc9c2" strokeWidth=".34"></use>
                    </g>
                  </g>
                </svg>
              </div>
              <span className="pk-ea-blk-lines" aria-hidden="true"></span>
              {' '}
              <span className="pk-ea-blk-scan" aria-hidden="true"></span>
              <div className="pk-ea-text">
                <b className="pk-ea-name">
                  <i>THE BLACKOUT</i>
                  {' '}
                  <u>JOB</u>
                </b>
                <span className="pk-ea-line">Your film crew<br />robs rivals blind.</span>
              </div>
            </div>
          ) : null}
        </div>
        <span className="pk-ea-glass" aria-hidden="true"></span>
        {' '}
        <span className="pk-ea-plate">
          <span>UPCOMING PACKS</span>
          <b>5</b>
        </span>
        {' '}
        <span className="pk-ea-go" aria-hidden="true">
          <svg className={v.nudge} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.400" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7"></path>
          </svg>
        </span>
      </button>
    </div>
  );
}
