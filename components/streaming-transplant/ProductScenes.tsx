/**
 * The PRODUCT tab's previews (#126; plan §19.13): every coming product as a moving thumbnail, the way a video plays
 * a few seconds of itself under a finger (Zeesh, 2026-11-02: "जैसे कैसे यूट्यूब वीडियो का थंबनेल दिखता है … उस थंबनेल
 * में … एक प्रीव्यू चला है छोटा छोटा"; then "थोड़ा और डायनेमिक … रियल वर्ल्ड से कुछ कुछ चीज़ें पे मिक करके").
 *
 * Each scene is a small piece of the real world at 320 × 180 (16:9): a stadium on a match night, a cartoon hillside,
 * a red carpet under flashes, a theme park at dusk. Motion is CSS only and loops (ProductShowcase.module.css); a
 * scene runs only while its card is on screen (`data-play`) or it is the open sheet's, and reduced motion shows its
 * resting frame, which is drawn to read on its own.
 */
import React from 'react';
import p from './presentation/screens/NetworkDesk/ProductShowcase.module.css';
import { cx } from './presentation/cx';
import type { ProductShowcaseId } from './productShowcaseCatalogue';

const DISPLAY = "'Anton', Impact, sans-serif";
const SANS = 'Inter, system-ui, sans-serif';
const v = (vars: Record<string, string | number>) => vars as React.CSSProperties;
/** the same scatter every time: a stand's crowd, a night's stars */
const rand = (i: number, seed: number) => { const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x); };
const heart = (x: number, y: number, s: number) =>
  `M${x} ${y + s * .35}C${x} ${y - s * .1} ${x - s * .85} ${y - s * .25} ${x - s * .9} ${y + s * .3}C${x - s * .95} ${y + s * .75} ${x - s * .3} ${y + s * 1.05} ${x} ${y + s * 1.3}`
  + `C${x + s * .3} ${y + s * 1.05} ${x + s * .95} ${y + s * .75} ${x + s * .9} ${y + s * .3}C${x + s * .85} ${y - s * .25} ${x} ${y - s * .1} ${x} ${y + s * .35}Z`;
const star = (cx: number, cy: number, r: number) => Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
  return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
}).join(' ');
const Sky: React.FC<{ id: string; stops: string[] }> = ({ id, stops }) => (
  <>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {stops.map((stop, i) => <stop key={i} offset={i / Math.max(1, stops.length - 1)} stopColor={stop} />)}
      </linearGradient>
    </defs>
    <rect width="320" height="180" fill={`url(#${id})`} />
  </>
);
const Stars: React.FC<{ n: number; seed: number; top?: number; bottom?: number }> = ({ n, seed, top = 0, bottom = 90 }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const twinkle = rand(i, seed + 2) > .55;
      return <circle key={i} cx={rand(i, seed) * 320} cy={top + rand(i, seed + 1) * (bottom - top)} r={rand(i, seed + 3) > .8 ? 1.2 : .7} fill="#e0e7ff"
        opacity=".75" className={twinkle ? p.blink : undefined} style={twinkle ? v({ '--d': `${1.6 + rand(i, seed + 4) * 2}s`, animationDelay: `${-rand(i, seed + 5) * 3}s` }) : undefined} />;
    })}
  </>
);

/* ═══ Live & Sports: a match night, as the broadcast shows it ═══ */
const LiveScene: React.FC<{ uid: string }> = ({ uid }) => {
  const stand = (x: number) => { const t = x / 320; return 40 - 52 * t * (1 - t); };
  const crowd = Array.from({ length: 56 }, (_, i) => { const x = 4 + rand(i, 1) * 312; const top = stand(x) + 4; return { x, y: top + rand(i, 2) * (88 - top), c: rand(i, 3) }; });
  const column = (k: number) => {
    const b0 = 8 + k * 304 / 12, b1 = 8 + (k + 1) * 304 / 12, t0 = 58 + k * 204 / 12, t1 = 58 + (k + 1) * 204 / 12;
    return `M${b0} 180L${b1} 180L${t1} 96L${t0} 96Z`;
  };
  const players: Array<[number, number, string, number]> = [
    [96, 124, '#f8fafc', 0], [128, 150, '#f8fafc', 1], [118, 108, '#f8fafc', 2], [176, 132, '#f8fafc', 3], [214, 112, '#f8fafc', 4],
    [146, 118, '#f43f5e', 5], [196, 150, '#f43f5e', 6], [232, 134, '#f43f5e', 7], [88, 146, '#f43f5e', 8], [250, 112, '#f43f5e', 9],
  ];
  return (
    <>
      <Sky id={`${uid}-sky`} stops={['#030614', '#0d1a3a']} />
      <defs>
        <linearGradient id={`${uid}-pitch`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b5130" /><stop offset="1" stopColor="#15803d" /></linearGradient>
        <linearGradient id={`${uid}-cone`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f8fafc" stopOpacity=".5" /><stop offset="1" stopColor="#f8fafc" stopOpacity="0" /></linearGradient>
      </defs>
      <path d="M0 94L0 40Q160 14 320 40L320 94Z" fill="#0f1934" />
      <path d="M0 94L0 68Q160 50 320 68L320 94Z" fill="#15214a" />
      {crowd.map((dot, i) => {
        const lit = dot.c > .72;
        return <circle key={i} cx={dot.x} cy={dot.y} r={dot.c > .9 ? 1.4 : 1} fill={dot.c > .9 ? '#fde68a' : lit ? '#a5b4d8' : '#4b5b85'}
          className={lit ? p.blink : undefined} style={lit ? v({ '--d': `${.9 + dot.c * 1.4}s`, animationDelay: `${-dot.c * 4}s` }) : undefined} />;
      })}
      {[42, 278].map((x, i) => (
        <g key={x}>
          <path d={i ? `M${x - 4} 22L${x + 4} 22L250 180L120 180Z` : `M${x - 4} 22L${x + 4} 22L200 180L70 180Z`} fill={`url(#${uid}-cone)`}
            className={p.blink} style={v({ '--o': '.55', '--d': `${2.6 + i * .7}s` })} />
          <line x1={x} y1="24" x2={x} y2="96" stroke="#26345a" strokeWidth="3" />
          <rect x={x - 12} y="12" width="24" height="11" rx="2" fill="#e8eeff" />
          {[0, 1, 2].map(k => <circle key={k} cx={x - 7 + k * 7} cy="17.5" r="2.2" fill="#fffbe6" />)}
        </g>
      ))}
      <path d="M8 180L312 180L262 96L58 96Z" fill={`url(#${uid}-pitch)`} />
      {Array.from({ length: 6 }, (_, i) => <path key={i} d={column(i * 2)} fill="#ffffff" opacity=".06" />)}
      <g fill="none" stroke="#f8fafc" strokeOpacity=".6" strokeWidth="1.1">
        <path d="M8 180L312 180L262 96L58 96Z" />
        <line x1="160" y1="96" x2="160" y2="180" />
        <ellipse cx="160" cy="136" rx="30" ry="12" />
        <path d="M18 163L56 163L74 113L48 113" />
        <path d="M302 163L264 163L246 113L272 113" />
      </g>
      {players.map(([x, y, fill, k]) => (
        <g key={k} className={p.move} style={v({ '--x': `${(rand(k, 7) - .5) * 26}px`, '--y': `${(rand(k, 8) - .5) * 10}px`, '--d': `${2.4 + rand(k, 9) * 2}s`, animationDelay: `${-rand(k, 10) * 3}s` })}>
          <ellipse cx={x} cy={y + 4.5} rx="4" ry="1.4" fill="#052e16" opacity=".55" />
          <rect x={x - 2.4} y={y - 5} width="4.8" height="8" rx="2.2" fill={fill} />
          <circle cx={x} cy={y - 7} r="2" fill="#f5d0b0" />
        </g>
      ))}
      <g className={p.ball}><circle cx="150" cy="140" r="2.4" fill="#ffffff" /></g>
      <g fontFamily={SANS}>
        <rect x="10" y="9" width="150" height="20" rx="4" fill="#05070d" opacity=".86" />
        <rect x="10" y="9" width="36" height="20" rx="4" fill="#e11d48" />
        <circle cx="18" cy="19" r="2.6" fill="#fff" className={p.blink} />
        <text x="23.5" y="22.6" fontSize="9.5" fontWeight="900" fill="#fff">LIVE</text>
        <text x="52" y="23" fontSize="10.5" fontWeight="800" fill="#e5e7eb">HAR 2–1 SUN</text>
        <text x="153" y="23" textAnchor="end" fontSize="10" fontWeight="700" fill="#fda4af">67'</text>
      </g>
    </>
  );
};

/* ═══ Kids: a cartoon hillside ═══ */
const KidsScene: React.FC<{ uid: string }> = ({ uid }) => (
  <>
    <Sky id={`${uid}-sky`} stops={['#38bdf8', '#7dd3fc', '#bae6fd']} />
    {[['#f87171', 96], ['#fb923c', 86], ['#facc15', 76], ['#4ade80', 66], ['#60a5fa', 56]].map(([colour, r]) => (
      <path key={colour as string} d={`M${60 - (r as number)} 150A${r} ${r} 0 0 1 ${60 + (r as number)} 150`} stroke={colour as string} strokeWidth="8" fill="none" opacity=".5" />
    ))}
    <g className={p.spin} style={v({ '--d': '24s' })}>
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x="267" y="10" width="6" height="12" rx="3" fill="#fde047" transform={`rotate(${i * 30} 270 40)`} />)}
    </g>
    <circle cx="270" cy="40" r="17" fill="#facc15" />
    <circle cx="264" cy="37" r="1.9" fill="#7c2d12" /><circle cx="276" cy="37" r="1.9" fill="#7c2d12" />
    <path d="M263 44Q270 51 277 44" stroke="#7c2d12" strokeWidth="1.9" fill="none" strokeLinecap="round" />
    {[[110, 30, 0], [190, 52, 1]].map(([x, y, k]) => (
      <g key={k} className={p.move} style={v({ '--x': k ? '-34px' : '30px', '--d': `${9 + k * 3}s` })}>
        <path d={`M${x} ${y}a10 10 0 0 1 18 -6a12 12 0 0 1 22 4a9 9 0 0 1 2 18h-40a8 8 0 0 1 -2 -16z`} fill="#ffffff" opacity=".92" />
      </g>
    ))}
    <path d="M0 132Q60 100 130 122T260 112T340 122L340 180L0 180Z" fill="#86efac" />
    <path d="M0 152Q80 126 170 148T340 140L340 180L0 180Z" fill="#4ade80" />
    {Array.from({ length: 9 }, (_, i) => (
      <g key={i}><circle cx={20 + i * 36} cy={164 + (i % 3) * 4} r="3" fill={['#f472b6', '#fde047', '#ffffff'][i % 3]} /><circle cx={20 + i * 36} cy={164 + (i % 3) * 4} r="1.1" fill="#f59e0b" /></g>
    ))}
    {[[40, '#f87171', 0], [64, '#60a5fa', 1], [236, '#f472b6', 2]].map(([x, colour, k]) => (
      <g key={k as number} className={p.rise} style={v({ '--y': '-232px', '--d': `${8 + (k as number) * 1.5}s`, animationDelay: `${-(k as number) * 2.8}s` })}>
        <ellipse cx={x as number} cy="196" rx="9" ry="11" fill={colour as string} />
        <path d={`M${(x as number) - 2} 207l2 3l2 -3z`} fill={colour as string} />
        <path d={`M${x} 210q-4 8 0 16q4 8 0 14`} stroke="#ffffff" strokeWidth=".8" fill="none" opacity=".8" />
      </g>
    ))}
    <ellipse cx="118" cy="153" rx="14" ry="3.4" fill="#166534" className={p.shadow} style={v({ '--d': '1.4s' })} />
    <g className={p.hop} style={v({ '--y': '-22px', '--d': '1.4s' })}>
      <ellipse cx="118" cy="138" rx="16" ry="14" fill="#fbbf24" />
      <ellipse cx="111" cy="134" rx="4.2" ry="5" fill="#ffffff" /><ellipse cx="125" cy="134" rx="4.2" ry="5" fill="#ffffff" />
      <circle cx="112" cy="135" r="2.2" fill="#1e293b" /><circle cx="126" cy="135" r="2.2" fill="#1e293b" />
      <circle cx="106" cy="142" r="2.6" fill="#fb7185" opacity=".6" /><circle cx="130" cy="142" r="2.6" fill="#fb7185" opacity=".6" />
      <path d="M113 144Q118 149 123 144" stroke="#7c2d12" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
    <g className={p.bob} style={v({ '--y': '-6px', '--d': '1.9s' })}>
      <polygon points={star(196, 144, 15)} fill="#c084fc" stroke="#a855f7" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="191" cy="143" r="1.8" fill="#1e293b" /><circle cx="201" cy="143" r="1.8" fill="#1e293b" />
      <path d="M192 148Q196 151 200 148" stroke="#1e293b" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </g>
  </>
);

/* ═══ Games: a side-scroller running ═══ */
const GamesScene: React.FC<{ uid: string }> = ({ uid }) => {
  const peaks = 'M0 120L40 86L78 110L120 72L168 112L210 82L256 116L292 90L320 120L320 180L0 180Z';
  const hills = 'M0 134Q40 112 80 130T160 126T240 132T320 134L320 180L0 180Z';
  return (
    <>
      <Sky id={`${uid}-sky`} stops={['#1e1b4b', '#3b1d7a', '#5b21b6']} />
      <Stars n={18} seed={11} bottom={70} />
      <circle cx="262" cy="34" r="12" fill="#ede9fe" /><circle cx="258" cy="31" r="2.6" fill="#c4b5fd" /><circle cx="266" cy="38" r="1.8" fill="#c4b5fd" />
      <g className={p.drift} style={v({ '--x': '-320px', '--d': '26s' })}><path d={peaks} fill="#3b2a7d" /><path d={peaks} fill="#3b2a7d" transform="translate(320 0)" /></g>
      <g className={p.drift} style={v({ '--x': '-320px', '--d': '12s' })}><path d={hills} fill="#4c1d95" /><path d={hills} fill="#4c1d95" transform="translate(320 0)" /></g>
      <rect y="146" width="320" height="34" fill="#2e1065" />
      <line x1="0" y1="146.5" x2="320" y2="146.5" stroke="#a78bfa" strokeWidth="1.5" />
      <g className={p.drift} style={v({ '--x': '-20px', '--d': '.5s' })}>
        {Array.from({ length: 18 }, (_, i) => <line key={i} x1={i * 20} y1="150" x2={i * 20 - 6} y2="180" stroke="#4c1d95" strokeWidth="2" />)}
      </g>
      <g className={p.drift} style={v({ '--x': '-352px', '--d': '5.5s' })}>
        {[190, 214, 238, 300, 324, 348, 410, 434].map((x, i) => (
          <g key={x} className={p.coin} style={v({ animationDelay: `${-i * .14}s` })}>
            <circle cx={x} cy={i % 3 === 1 ? 98 : 104} r="6" fill="#fde047" stroke="#ca8a04" strokeWidth="1.4" />
            <rect x={x - 1} y={(i % 3 === 1 ? 98 : 104) - 3.2} width="2" height="6.4" rx="1" fill="#ca8a04" />
          </g>
        ))}
      </g>
      <g className={p.drift} style={v({ '--x': '-380px', '--d': '3.4s' })}>
        <rect x="330" y="131" width="15" height="15" rx="3" fill="#f43f5e" />
        <path d="M330 131l3 -5l3 5l3 -5l3 5l3 -5l0 5" fill="#f43f5e" />
        <circle cx="335" cy="137" r="1.5" fill="#fff" /><circle cx="341" cy="137" r="1.5" fill="#fff" />
      </g>
      <ellipse cx="95" cy="147" rx="11" ry="2.6" fill="#1e1035" className={p.shadow} style={v({ '--d': '1.1s' })} />
      <g className={p.hop} style={v({ '--y': '-36px', '--d': '1.1s' })}>
        <rect x="84" y="124" width="22" height="22" rx="6" fill="#a78bfa" />
        <rect x="91" y="129" width="14" height="7" rx="3" fill="#1e1b4b" />
        <circle cx="95" cy="132.5" r="1.5" fill="#fff" /><circle cx="101" cy="132.5" r="1.5" fill="#fff" />
        <rect x="80" y="134" width="6" height="3" rx="1.5" fill="#f43f5e" />
      </g>
      <g fontFamily={DISPLAY}>
        <text x="10" y="22" fontSize="13" fill="#f5f3ff" letterSpacing=".5">SCORE 004210</text>
      </g>
      {[0, 1, 2].map(i => <path key={i} d={heart(276 + i * 14, 11, 6)} fill={i < 2 ? '#f43f5e' : '#4c1d95'} />)}
    </>
  );
};

/* ═══ Interactive: the story stops and waits for a choice ═══ */
const InteractiveScene: React.FC<{ uid: string }> = ({ uid }) => (
  <>
    <rect width="320" height="180" fill="#060a12" />
    <defs>
      <linearGradient id={`${uid}-lamp`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fef9c3" stopOpacity=".35" /><stop offset="1" stopColor="#fef9c3" stopOpacity="0" /></linearGradient>
    </defs>
    <path d="M0 0L120 40L120 112L0 180Z" fill="#0f1828" />
    <path d="M320 0L200 40L200 112L320 180Z" fill="#0d1524" />
    <path d="M0 0L320 0L200 40L120 40Z" fill="#0a111d" />
    <path d="M0 180L320 180L200 112L120 112Z" fill="#0c1422" />
    <rect x="120" y="40" width="80" height="72" fill="#08101c" />
    {[0, 1, 2, 3].map(i => <line key={i} x1={0} y1={180 - i * 18} x2={120} y2={112 - i * 3} stroke="#22d3ee" strokeOpacity=".05" />)}
    <path d="M150 46L170 46L196 112L124 112Z" fill={`url(#${uid}-lamp)`} className={p.flicker} />
    <rect x="152" y="43" width="16" height="4" rx="1" fill="#fef9c3" className={p.flicker} />
    <rect x="128" y="54" width="26" height="46" rx="1.5" fill="#1a2540" stroke="#22d3ee" strokeOpacity=".25" />
    <rect x="166" y="54" width="26" height="46" rx="1.5" fill="#1a2540" stroke="#22d3ee" strokeOpacity=".25" />
    <circle cx="150" cy="78" r="1.4" fill="#94a3b8" /><circle cx="170" cy="78" r="1.4" fill="#94a3b8" />
    <rect x="168" y="98" width="22" height="2" fill="#22d3ee" className={p.blink} />
    <rect width="320" height="12" fill="#000" /><rect y="168" width="320" height="12" fill="#000" />
    <text x="160" y="28" textAnchor="middle" fontFamily={SANS} fontSize="8.5" fontWeight="800" letterSpacing="2.4" fill="#cbd5e1">WHAT DO YOU DO?</text>
    {/* the choice sits clear of the card's SOON corner (bottom right) */}
    <rect x="44" y="105" width="232" height="3" rx="1.5" fill="#1e293b" />
    <rect x="44" y="105" width="232" height="3" rx="1.5" fill="#22d3ee" className={p.drain} style={v({ '--d': '4.5s' })} />
    <g fontFamily={SANS}>
      <rect x="44" y="112" width="110" height="26" rx="7" fill="#050912" opacity=".92" stroke="#ffffff" strokeOpacity=".28" />
      <text x="99" y="129" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#e2e8f0" letterSpacing=".6">OPEN THE DOOR</text>
      <rect x="166" y="112" width="110" height="26" rx="7" fill="#050912" opacity=".92" stroke="#ffffff" strokeOpacity=".28" />
      <rect x="166" y="112" width="110" height="26" rx="7" fill="#22d3ee" opacity=".22" stroke="#22d3ee" strokeWidth="1.6" className={p.choose} />
      <text x="221" y="129" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#e2e8f0" letterSpacing=".6">RUN</text>
    </g>
  </>
);

/* ═══ Shorts: a phone's feed, one swipe at a time ═══ */
const ShortsScene: React.FC<{ uid: string }> = ({ uid }) => {
  const panel = (k: number, top: number) => {
    const y = top;
    if (k === 1) return (
      <g key={`${k}-${top}`}>
        <rect x="122" y={y} width="76" height="152" fill={`url(#${uid}-p2)`} />
        <circle cx="176" cy={y + 34} r="12" fill="#fde68a" opacity=".85" />
        <path d={`M122 ${y + 120}L198 ${y + 108}L198 ${y + 152}L122 ${y + 152}Z`} fill="#3f0d1d" />
        <circle cx="150" cy={y + 74} r="5" fill="#1c0710" />
        <path d={`M150 ${y + 79}L146 ${y + 98}L138 ${y + 108}M148 ${y + 96}L158 ${y + 104}M150 ${y + 84}L162 ${y + 80}M150 ${y + 84}L140 ${y + 90}`} stroke="#1c0710" strokeWidth="3.4" strokeLinecap="round" fill="none" />
        <rect x="130" y={y + 110} width="34" height="3" rx="1.5" fill="#1c0710" transform={`rotate(-8 147 ${y + 111})`} />
      </g>
    );
    if (k === 2) return (
      <g key={`${k}-${top}`}>
        <rect x="122" y={y} width="76" height="152" fill={`url(#${uid}-p3)`} />
        <circle cx="180" cy={y + 26} r="7" fill="#e0e7ff" />
        {[[124, 70], [138, 92], [152, 58], [166, 84], [182, 66]].map(([x, h], i) => (
          <g key={i}><rect x={x} y={y + 152 - h} width="13" height={h} fill="#0b1433" />
            {Array.from({ length: Math.floor(h / 12) }, (_, j) => <rect key={j} x={x + 3} y={y + 152 - h + 5 + j * 12} width="2.4" height="3" fill="#fde68a" opacity={(i + j) % 3 ? .9 : .3} />)}</g>
        ))}
      </g>
    );
    return (
      <g key={`${k}-${top}`}>
        <rect x="122" y={y} width="76" height="152" fill={`url(#${uid}-p1)`} />
        <circle cx="160" cy={y + 30} r="18" fill="#f0abfc" opacity=".25" />
        <circle cx="160" cy={y + 64} r="6" fill="#2a0636" />
        <path d={`M160 ${y + 70}L158 ${y + 100}M158 ${y + 100}L150 ${y + 122}M158 ${y + 100}L170 ${y + 120}M159 ${y + 78}L146 ${y + 66}M159 ${y + 78}L174 ${y + 70}`} stroke="#2a0636" strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
    );
  };
  return (
    <>
      <Sky id={`${uid}-sky`} stops={['#14031b', '#2c0a3a']} />
      <defs>
        <linearGradient id={`${uid}-p1`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c3aed" /><stop offset="1" stopColor="#db2777" /></linearGradient>
        <linearGradient id={`${uid}-p2`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fb923c" /><stop offset="1" stopColor="#be123c" /></linearGradient>
        <linearGradient id={`${uid}-p3`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1d4ed8" /><stop offset="1" stopColor="#0f172a" /></linearGradient>
        <clipPath id={`${uid}-screen`}><rect x="122" y="14" width="76" height="152" rx="9" /></clipPath>
      </defs>
      {[[40, 50, 26, '#e879f9'], [278, 42, 20, '#818cf8'], [62, 140, 18, '#f472b6'], [262, 140, 28, '#c026d3'], [26, 98, 12, '#a78bfa']].map(([x, y, r, colour], i) => (
        <circle key={i} cx={x as number} cy={y as number} r={r as number} fill={colour as string} opacity=".16" className={p.move}
          style={v({ '--x': `${i % 2 ? -10 : 12}px`, '--y': `${i % 2 ? 8 : -6}px`, '--d': `${4 + i}s` })} />
      ))}
      <rect x="116" y="7" width="88" height="166" rx="15" fill="#050507" stroke="#3f3f46" strokeWidth="2" />
      <g clipPath={`url(#${uid}-screen)`}>
        <g className={p.feed} style={v({ '--h': '152px' })}>
          {panel(0, 14)}{panel(1, 166)}{panel(2, 318)}{panel(0, 470)}
        </g>
        <path d={heart(188, 98, 6)} fill="#f43f5e" className={p.pulse} style={v({ '--s': '1.25', '--d': '2.5s', '--o': '1' })} />
        <rect x="183" y="116" width="10" height="8" rx="3" fill="#ffffff" opacity=".9" />
        <path d="M183 132l10 -4l-3 9z" fill="#ffffff" opacity=".9" />
        <rect x="128" y="144" width="38" height="3" rx="1.5" fill="#ffffff" opacity=".9" />
        <rect x="128" y="150" width="26" height="3" rx="1.5" fill="#ffffff" opacity=".6" />
        <rect x="126" y="160" width="68" height="2" fill="#ffffff" opacity=".25" />
        <rect x="126" y="160" width="68" height="2" fill="#ffffff" className={p.fill} style={v({ '--d': '2.5s' })} />
      </g>
      {[0, 1, 2].map(i => (
        <path key={i} d={heart(222 + i * 9, 150, 5)} fill={['#f43f5e', '#e879f9', '#fb7185'][i]} className={p.rise}
          style={v({ '--y': '-90px', '--d': '3.2s', animationDelay: `${-i * 1.05}s` })} />
      ))}
    </>
  );
};

/* ═══ Podcasts: two mics, on air ═══ */
const PodcastsScene: React.FC<{ uid: string }> = ({ uid }) => {
  const mic = (x: number, flip: boolean) => (
    <g>
      <path d={flip ? `M320 54L${x + 34} 70L${x + 12} 94` : `M0 54L${x - 22} 70L${x + 10} 94`} stroke="#57534e" strokeWidth="3" fill="none" strokeLinejoin="round" />
      <rect x={x} y="90" width="22" height="40" rx="11" fill="#1f2937" stroke="#4b5563" />
      {[0, 1, 2, 3, 4].map(i => <line key={i} x1={x + 4} y1={96 + i * 4} x2={x + 18} y2={96 + i * 4} stroke="#6b7280" strokeWidth=".8" />)}
      <rect x={x} y="114" width="22" height="4" fill="#fb923c" />
    </g>
  );
  return (
    <>
      <Sky id={`${uid}-sky`} stops={['#1a120d', '#2b1d14']} />
      {Array.from({ length: 24 }, (_, i) => (
        <rect key={i} x={8 + (i % 8) * 39} y={42 + Math.floor(i / 8) * 26} width="33" height="20" rx="4" fill="#ffffff" opacity=".035" stroke="#ffffff" strokeOpacity=".05" />
      ))}
      <rect x="122" y="10" width="76" height="24" rx="5" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.4" className={p.blink} style={v({ '--o': '.55', '--d': '1.8s' })} />
      <text x="160" y="26.5" textAnchor="middle" fontFamily={SANS} fontSize="11" fontWeight="900" letterSpacing="2.6" fill="#fecaca">ON AIR</text>
      {mic(76, false)}{mic(222, true)}
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} x={126 + i * 5.6} y={98} width="3.4" height="40" rx="1.7" fill="#fb923c" className={p.eqc}
          style={v({ '--d': `${.45 + rand(i, 21) * .5}s`, animationDelay: `${-rand(i, 22)}s` })} />
      ))}
      <rect y="150" width="320" height="30" fill="#3b2a1e" />
      <line x1="0" y1="150.5" x2="320" y2="150.5" stroke="#78350f" />
      {[48, 268].map((x, i) => (
        <g key={x}>
          <rect x={x} y="136" width="16" height="14" rx="2.5" fill="#e7e5e4" />
          <path d={`M${x + 16} 140q6 0 6 4q0 4 -6 4`} stroke="#e7e5e4" strokeWidth="2" fill="none" />
          <path d={`M${x + 5} 132q-3 -5 0 -9q3 -4 0 -8`} stroke="#d6d3d1" strokeWidth="1.2" fill="none" className={p.rise}
            style={v({ '--y': '-14px', '--d': '2.8s', animationDelay: `${-i * 1.2}s` })} />
        </g>
      ))}
    </>
  );
};

/* ═══ Music: a record spinning ═══ */
const MusicScene: React.FC<{ uid: string }> = ({ uid }) => (
  <>
    <Sky id={`${uid}-sky`} stops={['#03211c', '#064e3b']} />
    <g transform="rotate(-6 82 84)">
      <rect x="34" y="36" width="96" height="96" rx="4" fill="#0f766e" />
      {[40, 30, 20, 10].map((r, i) => <circle key={r} cx="82" cy="78" r={r} fill="none" stroke={i % 2 ? '#a7f3d0' : '#34d399'} strokeOpacity=".5" strokeWidth="3" />)}
      <rect x="44" y="114" width="52" height="5" rx="2" fill="#ecfdf5" opacity=".8" />
    </g>
    <g className={p.spin} style={v({ '--d': '3.4s' })}>
      <circle cx="176" cy="92" r="60" fill="#070b0a" />
      {[56, 50, 44, 38, 32].map(r => <circle key={r} cx="176" cy="92" r={r} fill="none" stroke="#1d2a27" strokeWidth="1" />)}
      <path d="M134 62A52 52 0 0 1 176 40" stroke="#ffffff" strokeOpacity=".2" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="176" cy="92" r="18" fill="#34d399" />
      <rect x="168" y="84" width="10" height="4" rx="1" fill="#ecfdf5" opacity=".9" />
      <circle cx="176" cy="92" r="2.4" fill="#03211c" />
    </g>
    <circle cx="264" cy="40" r="9" fill="#374151" />
    <path d="M264 40L240 60L216 104" stroke="#9ca3af" strokeWidth="3" fill="none" strokeLinecap="round" />
    <rect x="208" y="100" width="12" height="7" rx="2" fill="#d1d5db" transform="rotate(-26 214 104)" />
    {Array.from({ length: 7 }, (_, i) => (
      <rect key={i} x={244 + i * 8} y="92" width="5" height="44" rx="2.5" fill="#34d399" className={p.eq}
        style={v({ '--d': `${.4 + rand(i, 31) * .5}s`, animationDelay: `${-rand(i, 32)}s` })} />
    ))}
    {[[206, 54, 0], [140, 40, 1], [226, 84, 2]].map(([x, y, k]) => (
      <g key={k} className={p.rise} style={v({ '--y': '-44px', '--d': '4s', animationDelay: `${-k * 1.35}s` })}>
        <circle cx={x} cy={y} r="3.6" fill="#a7f3d0" />
        <rect x={x + 2.4} y={y - 14} width="1.8" height="14" fill="#a7f3d0" />
        <path d={`M${x + 4.2} ${y - 14}q6 2 5 8`} stroke="#a7f3d0" strokeWidth="1.8" fill="none" />
      </g>
    ))}
  </>
);

/* ═══ Fan Club: a member's card, and the club growing ═══ */
const FanClubScene: React.FC<{ uid: string }> = ({ uid }) => (
  <>
    <Sky id={`${uid}-sky`} stops={['#1c0820', '#3f0b35', '#4a0d3b']} />
    <defs>
      <linearGradient id={`${uid}-card`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f472b6" /><stop offset="1" stopColor="#7c3aed" /></linearGradient>
      <linearGradient id={`${uid}-beam`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f9a8d4" stopOpacity=".28" /><stop offset="1" stopColor="#f9a8d4" stopOpacity="0" /></linearGradient>
      <clipPath id={`${uid}-cardclip`}><rect x="86" y="30" width="148" height="88" rx="12" /></clipPath>
    </defs>
    <path d="M10 0L40 0L120 180L-40 180Z" fill={`url(#${uid}-beam)`} className={p.sweep} style={v({ '--a': '10deg', '--d': '4.5s', '--ox': '50%', '--oy': '0%' })} />
    <path d="M280 0L310 0L360 180L200 180Z" fill={`url(#${uid}-beam)`} className={p.sweep} style={v({ '--a': '10deg', '--d': '5.2s', '--ox': '50%', '--oy': '0%' })} />
    <g className={p.bob} style={v({ '--y': '-4px', '--d': '3.2s' })}>
      <rect x="86" y="30" width="148" height="88" rx="12" fill={`url(#${uid}-card)`} />
      <rect x="91" y="35" width="138" height="78" rx="9" fill="none" stroke="#ffffff" strokeOpacity=".35" />
      <text x="100" y="52" fontFamily={SANS} fontSize="10" fontWeight="900" letterSpacing="2.4" fill="#ffffff">FAN CLUB</text>
      <rect x="100" y="62" width="18" height="13" rx="3" fill="#fde68a" />
      <line x1="100" y1="68.5" x2="118" y2="68.5" stroke="#ca8a04" strokeWidth=".8" />
      <polygon points={star(210, 56, 12)} fill="#ffffff" opacity=".9" />
      <text x="100" y="104" fontFamily={SANS} fontSize="8.5" fontWeight="700" letterSpacing="1.2" fill="#fdf2f8">MEMBER · No. 000128</text>
      <g clipPath={`url(#${uid}-cardclip)`}>
        <g className={p.shine} style={v({ '--from': '0px', '--to': '230px', '--d': '3.4s' })}><rect x="60" y="20" width="22" height="110" fill="#ffffff" opacity=".28" transform="skewX(-20)" /></g>
      </g>
    </g>
    {['#fda4af', '#c4b5fd', '#93c5fd', '#fcd34d', '#86efac'].map((colour, i) => (
      <circle key={colour} cx={84 + i * 22} cy="140" r="11" fill={colour} stroke="#2a0a29" strokeWidth="2.5" />
    ))}
    <g className={p.slideIn} style={v({ '--sx': '36px', '--sy': '0px', '--d': '4s' })}>
      <circle cx="194" cy="140" r="11" fill="#f9a8d4" stroke="#2a0a29" strokeWidth="2.5" />
    </g>
    <text x="211" y="137" fontFamily={SANS} fontSize="11" fontWeight="900" fill="#f9a8d4" className={p.pop} style={v({ '--d': '4s' })}>+1</text>
    {[[30, 0], [58, 1], [276, 2], [300, 3]].map(([x, k]) => (
      <path key={k} d={heart(x, 164, 6)} fill="#f472b6" className={p.rise} style={v({ '--y': '-120px', '--d': '4.2s', animationDelay: `${-k * 1.05}s` })} />
    ))}
  </>
);

/* ═══ Premieres: the red carpet on opening night ═══ */
const PremieresScene: React.FC<{ uid: string }> = ({ uid }) => {
  const post = (t: number, left: boolean) => {
    const x = left ? 116 + 30 * t : 204 - 30 * t, y = 176 - 92 * t, h = 14 - 8 * t;
    return { x, y, h };
  };
  const posts = [0, .33, .66].flatMap(t => [post(t, true), post(t, false)]);
  return (
    <>
      <Sky id={`${uid}-sky`} stops={['#06030a', '#1c0710']} />
      <defs>
        <linearGradient id={`${uid}-spot`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#fff7ed" stopOpacity=".3" /><stop offset="1" stopColor="#fff7ed" stopOpacity="0" /></linearGradient>
      </defs>
      <path d="M0 180L22 180L120 -10L90 -10Z" fill={`url(#${uid}-spot)`} className={p.sweep} style={v({ '--a': '12deg', '--d': '4.4s', '--ox': '0%', '--oy': '100%' })} />
      <path d="M298 180L320 180L230 -10L200 -10Z" fill={`url(#${uid}-spot)`} className={p.sweep} style={v({ '--a': '12deg', '--d': '5s', '--ox': '100%', '--oy': '100%' })} />
      <rect x="78" y="8" width="164" height="74" fill="#160a10" />
      <rect x="96" y="20" width="128" height="32" rx="3" fill="#2a0a12" stroke="#f59e0b" strokeWidth="1.2" />
      <text x="160" y="42" textAnchor="middle" fontFamily={DISPLAY} fontSize="15" fill="#fde68a" letterSpacing="1">WORLD PREMIERE</text>
      {Array.from({ length: 13 }, (_, i) => [17, 55].map(y => (
        <circle key={`${i}-${y}`} cx={100 + i * 10} cy={y} r="1.7" fill="#fde68a" className={p.blink}
          style={v({ '--d': '1.3s', '--o': '.2', animationDelay: `${-(y === 17 ? i : 12 - i) * .1}s` })} />
      )))}
      <rect x="138" y="58" width="44" height="24" fill="#fbbf24" opacity=".22" />
      <path d="M118 180L202 180L172 82L148 82Z" fill="#b91c1c" />
      <path d="M136 180L184 180L166 82L154 82Z" fill="#dc2626" opacity=".5" />
      {posts.map((point, i) => <rect key={i} x={point.x - 1.4} y={point.y - point.h} width="2.8" height={point.h} rx="1" fill="#d4a017" />)}
      {[0, 1].map(side => (
        <path key={side} d={side ? 'M204 168Q194 152 195 140M195 140Q186 126 186 110' : 'M116 168Q126 152 125 140M125 140Q134 126 134 110'}
          stroke="#991b1b" strokeWidth="1.6" fill="none" />
      ))}
      {[[20, 120, 0], [52, 98, 1], [34, 150, 2], [292, 112, 3], [268, 140, 4], [300, 152, 5], [70, 132, 6]].map(([x, y, k]) => (
        <g key={k} className={p.flash} style={v({ '--d': '2.4s', animationDelay: `${-rand(k, 41) * 2.4}s` })}>
          <circle cx={x} cy={y} r="9" fill="#ffffff" opacity=".25" />
          <path d={`M${x - 8} ${y}L${x + 8} ${y}M${x} ${y - 8}L${x} ${y + 8}`} stroke="#ffffff" strokeWidth="1.4" />
          <circle cx={x} cy={y} r="3" fill="#ffffff" />
        </g>
      ))}
      {[0, 1].map(side => (
        <g key={side} fill="#05020a" transform={side ? 'translate(320 0) scale(-1 1)' : undefined}>
          <circle cx="22" cy="150" r="9" /><path d="M4 180Q8 160 22 160Q40 160 44 180Z" />
          <rect x="30" y="140" width="16" height="11" rx="2" />
          <circle cx="62" cy="158" r="8" /><path d="M46 180Q50 166 62 166Q76 166 80 180Z" />
        </g>
      ))}
    </>
  );
};

/* ═══ Merch Shop: the shop, open ═══ */
const MerchScene: React.FC<{ uid: string }> = ({ uid }) => (
  <>
    <Sky id={`${uid}-sky`} stops={['#151003', '#2a1f07']} />
    <defs>
      <linearGradient id={`${uid}-poster`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f97316" /><stop offset="1" stopColor="#7c2d12" /></linearGradient>
    </defs>
    <g className={p.flicker}>
      <text x="18" y="38" fontFamily={DISPLAY} fontSize="24" fill="none" stroke="#facc15" strokeOpacity=".35" strokeWidth="4" letterSpacing="2">SHOP</text>
      <text x="18" y="38" fontFamily={DISPLAY} fontSize="24" fill="none" stroke="#fde047" strokeWidth="1.3" letterSpacing="2">SHOP</text>
    </g>
    <rect x="192" y="18" width="70" height="88" rx="3" fill="#0f172a" stroke="#fde68a" strokeOpacity=".4" />
    <rect x="197" y="23" width="60" height="78" fill={`url(#${uid}-poster)`} />
    <text x="227" y="76" textAnchor="middle" fontFamily={DISPLAY} fontSize="30" fill="#ffffff" opacity=".2">HIT</text>
    <rect x="203" y="88" width="48" height="5" rx="1" fill="#fff7ed" opacity=".85" />
    <rect y="112" width="320" height="5" fill="#3d2d0c" /><rect y="150" width="320" height="30" fill="#211806" />
    <g className={p.swing} style={v({ '--a': '4deg', '--d': '2.8s' })}>
      <path d="M118 16q0 -7 6 -7q6 0 6 6q0 4 -6 6v4" stroke="#a8a29e" strokeWidth="1.8" fill="none" />
      <path d="M124 25L96 42M124 25L152 42" stroke="#a8a29e" strokeWidth="1.8" />
      <path d="M100 42L86 56L94 68L101 61L101 106L147 106L147 61L154 68L162 56L148 42Q137 51 124 51Q111 51 100 42Z" fill="#facc15" />
      <polygon points={star(124, 80, 11)} fill="#1f2937" />
      <path d="M152 60L160 74" stroke="#a8a29e" strokeWidth=".8" />
      <rect x="153" y="74" width="18" height="11" rx="2" fill="#fff7ed" />
      <text x="162" y="82.5" textAnchor="middle" fontFamily={SANS} fontSize="7" fontWeight="900" fill="#78350f">$24</text>
    </g>
    <rect x="176" y="128" width="22" height="22" rx="3" fill="#fde68a" />
    <path d="M198 133q7 0 7 6q0 6 -7 6" stroke="#fde68a" strokeWidth="3" fill="none" />
    <rect x="181" y="134" width="12" height="9" rx="1.5" fill="#f59e0b" />
    {[0, 1].map(i => (
      <path key={i} d={`M${182 + i * 8} 124q-3 -5 0 -9q3 -4 0 -8`} stroke="#e7e5e4" strokeWidth="1.3" fill="none" className={p.rise}
        style={v({ '--y': '-16px', '--d': '2.6s', animationDelay: `${-i * 1.3}s` })} />
    ))}
    <path d="M36 156L64 156L68 178L32 178Z" fill="#facc15" />
    <path d="M42 156q0 -10 8 -10q8 0 8 10" stroke="#facc15" strokeWidth="2" fill="none" />
    <text x="72" y="160" fontFamily={SANS} fontSize="12" fontWeight="900" fill="#fde047" className={p.pop} style={v({ '--d': '3.2s' })}>+1</text>
  </>
);

/* ═══ Fan Festival: the stage, the screen, the crowd ═══ */
const FestivalScene: React.FC<{ uid: string }> = ({ uid }) => (
  <>
    <Sky id={`${uid}-sky`} stops={['#06051a', '#1e1b4b']} />
    <defs>
      <linearGradient id={`${uid}-screen`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4f46e5" /><stop offset="1" stopColor="#db2777" /></linearGradient>
      <clipPath id={`${uid}-clip`}><rect x="84" y="24" width="152" height="64" rx="3" /></clipPath>
      {['#818cf8', '#f472b6', '#22d3ee', '#fde68a'].map((colour, i) => (
        <linearGradient key={colour} id={`${uid}-beam${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colour} stopOpacity=".45" /><stop offset="1" stopColor={colour} stopOpacity="0" /></linearGradient>
      ))}
    </defs>
    {[40, 110, 210, 280].map((x, i) => (
      <path key={x} d={`M${x - 4} 14L${x + 4} 14L${x + 40} 180L${x - 40} 180Z`} fill={`url(#${uid}-beam${i})`} className={p.sweep}
        style={v({ '--a': `${14 + i * 3}deg`, '--d': `${3.2 + i * .6}s`, '--ox': '50%', '--oy': '0%', animationDelay: `${-i * .8}s` })} />
    ))}
    <rect y="8" width="320" height="7" fill="#312e81" />
    <rect x="84" y="24" width="152" height="64" rx="3" fill={`url(#${uid}-screen)`} />
    <g clipPath={`url(#${uid}-clip)`}>
      <text x="160" y="66" textAnchor="middle" fontFamily={DISPLAY} fontSize="26" fill="#eef2ff" letterSpacing="1.5">FAN FEST</text>
      <g className={p.shine} style={v({ '--from': '0px', '--to': '230px', '--d': '3s' })}><rect x="60" y="20" width="26" height="80" fill="#ffffff" opacity=".22" transform="skewX(-18)" /></g>
    </g>
    <rect x="82" y="22" width="156" height="68" rx="4" fill="none" stroke="#a5b4fc" strokeOpacity=".5" />
    <path d="M56 104L264 104L292 120L28 120Z" fill="#1e1b4b" stroke="#818cf8" strokeOpacity=".6" />
    {[[146, 0], [176, 1]].map(([x, k]) => (
      <g key={k} className={p.bob} style={v({ '--y': '-2px', '--d': '1.6s', animationDelay: `${-k * .5}s` })}>
        <circle cx={x} cy="88" r="4" fill="#0b0a1a" /><path d={`M${x - 5} 104L${x - 4} 93L${x + 4} 93L${x + 5} 104Z`} fill="#0b0a1a" />
      </g>
    ))}
    {Array.from({ length: 12 }, (_, i) => (
      <rect key={i} x={rand(i, 51) * 320} y="-10" width="3" height="5" fill={['#f472b6', '#fde68a', '#22d3ee', '#a5b4fc'][i % 4]} className={p.fall}
        style={v({ '--d': `${3.6 + rand(i, 52) * 1.8}s`, '--r': `${180 + rand(i, 53) * 360}deg`, animationDelay: `${-rand(i, 54) * 5}s` })} />
    ))}
    {Array.from({ length: 14 }, (_, i) => {
      const x = 8 + i * 23 + (i % 2) * 4, y = 152 + (i % 3) * 5;
      return (
        <g key={i} className={p.bob} style={v({ '--y': `${-3 - (i % 3) * 2}px`, '--d': `${.8 + rand(i, 55) * .6}s`, animationDelay: `${-rand(i, 56)}s` })}>
          <circle cx={x} cy={y} r="8" fill="#0a0918" />
          <path d={`M${x - 16} 180Q${x - 14} ${y + 8} ${x} ${y + 8}Q${x + 14} ${y + 8} ${x + 16} 180Z`} fill="#0a0918" />
          {i % 4 === 1 && <><rect x={x + 7} y={y - 20} width="5" height="8" rx="1" fill="#e0e7ff" className={p.blink} style={v({ '--d': '1.4s' })} />
            <line x1={x + 6} y1={y - 4} x2={x + 9} y2={y - 12} stroke="#0a0918" strokeWidth="3" /></>}
        </g>
      );
    })}
  </>
);

/* ═══ Studio Tours: the tram through the backlot ═══ */
const ToursScene: React.FC<{ uid: string }> = ({ uid }) => {
  const stage = (x: number, w: number, n: string) => (
    <g>
      <path d={`M${x} 140L${x} 84Q${x + w / 2} 64 ${x + w} 84L${x + w} 140Z`} fill="#ece7df" stroke="#b8afa3" />
      <rect x={x + w / 2 - 15} y="108" width="30" height="32" fill="#c9bfb2" />
      <text x={x + w / 2} y="104" textAnchor="middle" fontFamily={DISPLAY} fontSize="20" fill="#8a7e70">{n}</text>
    </g>
  );
  return (
    <>
      <Sky id={`${uid}-sky`} stops={['#7cc4f2', '#bfe3f7', '#fde7b0']} />
      <circle cx="54" cy="54" r="16" fill="#fff7d6" opacity=".9" />
      {[[120, 26, 0], [226, 40, 1]].map(([x, y, k]) => (
        <g key={k} className={p.move} style={v({ '--x': k ? '-30px' : '26px', '--d': `${10 + k * 3}s` })}>
          <path d={`M${x} ${y}a9 9 0 0 1 16 -5a11 11 0 0 1 20 3a8 8 0 0 1 2 16h-36a7 7 0 0 1 -2 -14z`} fill="#ffffff" opacity=".9" />
        </g>
      ))}
      <g>
        <line x1="262" y1="36" x2="254" y2="84" stroke="#8a7e70" strokeWidth="2" /><line x1="282" y1="36" x2="290" y2="84" stroke="#8a7e70" strokeWidth="2" />
        <rect x="256" y="20" width="32" height="20" rx="9" fill="#d8d0c4" stroke="#8a7e70" />
        <polygon points={star(272, 30, 6)} fill="#38bdf8" />
      </g>
      {stage(16, 104, '7')}{stage(128, 100, '12')}{stage(236, 98, '21')}
      <g fill="#14532d">
        <rect x="121" y="96" width="3" height="44" fill="#6b4f2a" />
        <path d="M122 96q-14 -4 -20 6q10 -6 20 -6zM122 96q14 -4 20 6q-10 -6 -20 -6zM122 96q-4 -12 -14 -14q10 6 14 14zM122 96q4 -12 14 -14q-10 6 -14 14z" />
      </g>
      <rect y="140" width="320" height="40" fill="#5b5550" />
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x={6 + i * 38} y="159" width="20" height="2.4" fill="#e7e1d8" opacity=".8" />)}
      <g className={p.drift} style={v({ '--x': '560px', '--d': '11s' })}>
        <g transform="translate(-230 0)">
          {[0, 1, 2].map(k => (
            <g key={k} transform={`translate(${k * 64} 0)`}>
              <rect x="0" y="120" width="58" height="26" rx="6" fill="#f8fafc" stroke="#cbd5e1" />
              <rect x="0" y="136" width="58" height="4" fill="#38bdf8" />
              <rect x="-2" y="114" width="62" height="5" rx="2" fill="#0ea5e9" />
              {[0, 1, 2].map(w => <g key={w}><rect x={6 + w * 17} y="124" width="12" height="9" rx="2" fill="#bae6fd" />
                <circle cx={12 + w * 17} cy="128" r="2.6" fill={['#7c2d12', '#1e293b', '#a16207'][(w + k) % 3]} /></g>)}
              <circle cx="12" cy="147" r="4" fill="#1c1917" /><circle cx="46" cy="147" r="4" fill="#1c1917" />
              {k < 2 && <rect x="58" y="138" width="6" height="2" fill="#475569" />}
            </g>
          ))}
        </g>
      </g>
    </>
  );
};

/* ═══ World: a theme park at dusk ═══ */
const WorldScene: React.FC<{ uid: string }> = ({ uid }) => (
  <>
    <Sky id={`${uid}-sky`} stops={['#070b1f', '#2e1065', '#7a2752']} />
    <Stars n={20} seed={61} bottom={80} />
    {[[232, 40, '#fde68a', 0], [96, 30, '#5eead4', 1], [176, 22, '#f9a8d4', 2]].map(([x, y, colour, k]) => (
      <g key={k as number} className={p.ring} style={v({ '--d': '2.8s', animationDelay: `${-(k as number) * .93}s` })}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = i * Math.PI / 6;
          return <line key={i} x1={(x as number) + Math.cos(a) * 6} y1={(y as number) + Math.sin(a) * 6} x2={(x as number) + Math.cos(a) * 18} y2={(y as number) + Math.sin(a) * 18}
            stroke={colour as string} strokeWidth="1.6" strokeLinecap="round" />;
        })}
        <circle cx={x as number} cy={y as number} r="2" fill={colour as string} />
      </g>
    ))}
    <line x1="64" y1="94" x2="38" y2="156" stroke="#134e4a" strokeWidth="3" /><line x1="64" y1="94" x2="90" y2="156" stroke="#134e4a" strokeWidth="3" />
    <g className={p.spin} style={v({ '--d': '16s' })}>
      <circle cx="64" cy="94" r="44" fill="none" stroke="#2dd4bf" strokeWidth="2" />
      <circle cx="64" cy="94" r="30" fill="none" stroke="#2dd4bf" strokeOpacity=".4" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = i * Math.PI / 4;
        return <g key={i}><line x1="64" y1="94" x2={64 + Math.cos(a) * 44} y2={94 + Math.sin(a) * 44} stroke="#2dd4bf" strokeOpacity=".55" />
          <circle cx={64 + Math.cos(a) * 44} cy={94 + Math.sin(a) * 44} r="4.6" fill={i % 2 ? '#f9a8d4' : '#fde68a'} /></g>;
      })}
      <circle cx="64" cy="94" r="5" fill="#2dd4bf" />
    </g>
    <g fill="#1b1846">
      <rect x="132" y="96" width="66" height="54" />
      <rect x="124" y="82" width="16" height="68" /><rect x="190" y="82" width="16" height="68" /><rect x="154" y="70" width="22" height="80" />
      <polygon points="124,82 132,60 140,82" /><polygon points="190,82 198,60 206,82" /><polygon points="154,70 165,40 176,70" />
    </g>
    {[[130, 96], [196, 96], [162, 84], [162, 104], [146, 116], [180, 116]].map(([x, y], i) => (
      <rect key={i} x={x} y={y} width="4" height="6" rx="2" fill="#fde68a" className={p.blink} style={v({ '--d': `${2 + i * .4}s`, '--o': '.45' })} />
    ))}
    <path d="M206 156C222 70 244 64 260 108S288 156 320 72" stroke="#5eead4" strokeWidth="2" fill="none" />
    {[214, 232, 250, 268, 286, 304].map(x => <line key={x} x1={x} y1="156" x2={x} y2={x < 240 ? 96 : x < 280 ? 120 : 100} stroke="#134e4a" strokeWidth="1.4" />)}
    <g className={p.coaster}><rect x="-7" y="-4" width="14" height="7" rx="2.5" fill="#f9a8d4" /><circle cx="-3" cy="3.5" r="1.6" fill="#0b1026" /><circle cx="3" cy="3.5" r="1.6" fill="#0b1026" /></g>
    <path d="M0 156Q80 146 160 152T320 150L320 180L0 180Z" fill="#0b1026" />
    {Array.from({ length: 16 }, (_, i) => (
      <circle key={i} cx={8 + i * 20} cy={162 + (i % 3) * 5} r="1.4" fill={['#fde68a', '#5eead4', '#f9a8d4'][i % 3]} className={p.blink}
        style={v({ '--d': `${1 + (i % 4) * .3}s`, animationDelay: `${-i * .17}s` })} />
    ))}
  </>
);

/* ═══ Stick: plug it in, and the TV comes alive ═══ */
const StickScene: React.FC<{ uid: string }> = ({ uid }) => (
  <>
    <Sky id={`${uid}-sky`} stops={['#0b1222', '#111827']} />
    <defs>
      <linearGradient id={`${uid}-hero`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2563eb" /><stop offset="1" stopColor="#7c3aed" /></linearGradient>
      <radialGradient id={`${uid}-lamp`}><stop offset="0" stopColor="#fde68a" stopOpacity=".35" /><stop offset="1" stopColor="#fde68a" stopOpacity="0" /></radialGradient>
    </defs>
    <circle cx="290" cy="70" r="46" fill={`url(#${uid}-lamp)`} />
    <path d="M280 62L300 62L306 80L274 80Z" fill="#fde68a" opacity=".85" /><line x1="290" y1="80" x2="290" y2="150" stroke="#475569" strokeWidth="2" />
    <rect y="150" width="320" height="30" fill="#0a0f1a" />
    <rect x="58" y="140" width="204" height="14" rx="2" fill="#1e293b" />
    <path d="M150 130L170 130L178 140L142 140Z" fill="#1e293b" />
    <rect x="70" y="24" width="180" height="106" rx="6" fill="#020617" stroke="#334155" strokeWidth="3" />
    <g className={p.screenOn}>
      <rect x="74" y="28" width="172" height="98" rx="3" fill="#0b1220" />
      <rect x="80" y="34" width="160" height="38" rx="3" fill={`url(#${uid}-hero)`} />
      <text x="88" y="52" fontFamily={DISPLAY} fontSize="13" fill="#ffffff">TONIGHT</text>
      <rect x="88" y="58" width="30" height="7" rx="3.5" fill="#ffffff" opacity=".9" />
      {['#f43f5e', '#f59e0b', '#22c55e', '#06b6d4', '#a855f7'].map((colour, i) => (
        <rect key={colour} x={80 + i * 32.5} y="80" width="28" height="38" rx="3" fill={colour} opacity=".85" className={p.tile} style={v({ animationDelay: `${-3.4 + i * .12}s` })} />
      ))}
      <rect x="78" y="78" width="32" height="42" rx="4" fill="none" stroke="#ffffff" strokeWidth="1.8" className={p.focus} style={v({ '--x1': '32.5px', '--x2': '65px' })} />
    </g>
    <g className={p.plug}>
      <rect x="250" y="94" width="26" height="9" rx="3" fill="#1d4ed8" stroke="#60a5fa" />
      <circle cx="270" cy="98.5" r="1.5" fill="#bfdbfe" className={p.blink} style={v({ '--d': '.9s' })} />
    </g>
    <rect x="200" y="143" width="24" height="7" rx="3.5" fill="#334155" />
    <circle cx="206" cy="146.5" r="1.3" fill="#94a3b8" /><circle cx="212" cy="146.5" r="1.3" fill="#94a3b8" /><circle cx="218" cy="146.5" r="1.3" fill="#ef4444" />
    <path d="M24 150L42 150L40 132L26 132Z" fill="#7c2d12" />
    <path d="M33 132q-14 -12 -6 -30q6 12 6 30zM33 132q12 -16 4 -34q-8 14 -4 34zM33 132q16 -6 18 -24q-12 6 -18 24z" fill="#166534" />
  </>
);

/* ═══ Telco Bundles: the signal reaches the phone ═══ */
const TelcoScene: React.FC<{ uid: string }> = ({ uid }) => (
  <>
    <Sky id={`${uid}-sky`} stops={['#020617', '#0c1f3a']} />
    <Stars n={14} seed={71} bottom={60} />
    {[[0, 52], [34, 84], [60, 40], [96, 70], [128, 58], [166, 92], [196, 48]].map(([x, h], i) => (
      <g key={i}>
        <rect x={x} y={180 - h} width={x === 196 ? 22 : 30} height={h} fill="#0b1630" />
        {Array.from({ length: Math.floor(h / 10) * 2 }, (_, j) => (
          <rect key={j} x={x + 5 + (j % 2) * 12} y={180 - h + 6 + Math.floor(j / 2) * 10} width="4" height="4" fill="#fde68a"
            opacity={rand(i * 9 + j, 72) > .55 ? .85 : .15} className={rand(i * 9 + j, 73) > .85 ? p.blink : undefined} style={v({ '--d': '2.4s' })} />
        ))}
      </g>
    ))}
    <g stroke="#64748b" strokeWidth="1.6">
      <line x1="56" y1="148" x2="70" y2="40" /><line x1="84" y1="148" x2="70" y2="40" />
      {[0, 1, 2, 3].map(i => <line key={i} x1={58 + i * 2.6} y1={136 - i * 26} x2={82 - i * 2.6} y2={122 - i * 26} />)}
    </g>
    <rect x="62" y="46" width="5" height="12" fill="#94a3b8" /><rect x="73" y="46" width="5" height="12" fill="#94a3b8" />
    <circle cx="70" cy="38" r="2.2" fill="#ef4444" className={p.blink} style={v({ '--d': '1.2s' })} />
    {[0, 1, 2].map(i => (
      <circle key={i} cx="70" cy="40" r="56" fill="none" stroke="#4ade80" strokeWidth="2" className={p.ring} style={v({ '--d': '2.4s', animationDelay: `${-i * .8}s` })} />
    ))}
    <rect x="212" y="26" width="82" height="170" rx="13" fill="#070b14" stroke="#334155" strokeWidth="2" />
    <rect x="218" y="34" width="70" height="160" rx="8" fill="#101827" />
    {[0, 1, 2, 3].map(i => (
      <rect key={i} x={226 + i * 5} y={50 - i * 2.4} width="3.4" height={3 + i * 2.4} rx="1" fill="#4ade80" className={p.bars}
        style={v({ '--d': '2.4s', animationDelay: `${i * .25}s` })} />
    ))}
    <text x="282" y="51" textAnchor="end" fontFamily={SANS} fontSize="7" fontWeight="800" fill="#cbd5e1">5G</text>
    <g className={p.slideIn} style={v({ '--sx': '0px', '--sy': '-26px', '--d': '5s' })}>
      <rect x="222" y="62" width="62" height="40" rx="7" fill="#f8fafc" />
      <rect x="227" y="68" width="11" height="11" rx="3" fill="#4ade80" />
      <path d="M229.5 73.5l2.5 2.5l4 -5" stroke="#052e16" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <text x="242" y="76" fontFamily={SANS} fontSize="7.5" fontWeight="900" fill="#0f172a">Included</text>
      <text x="227" y="92" fontFamily={SANS} fontSize="7" fontWeight="600" fill="#334155">with your plan</text>
    </g>
  </>
);

/* ═══ News: on air, breaking ═══ */
const NewsScene: React.FC<{ uid: string }> = ({ uid }) => {
  const land = Array.from({ length: 40 }, (_, i) => ({ x: rand(i, 81) * 104, y: 30 + rand(i, 82) * 86, r: 1.4 + rand(i, 83) * 2.2 }));
  const ticker = 'MARKETS UP 2%  ·  RAIN ALL WEEKEND  ·  CITY FC WIN THE CUP  ·  ';
  return (
    <>
      <Sky id={`${uid}-sky`} stops={['#061230', '#0b2a5e']} />
      <defs>
        <clipPath id={`${uid}-globe`}><circle cx="236" cy="72" r="52" /></clipPath>
        <clipPath id={`${uid}-tick`}><rect x="38" y="160" width="282" height="20" /></clipPath>
        <radialGradient id={`${uid}-glow`}><stop offset="0" stopColor="#3b82f6" stopOpacity=".35" /><stop offset="1" stopColor="#3b82f6" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="236" cy="72" r="70" fill={`url(#${uid}-glow)`} />
      <circle cx="236" cy="72" r="52" fill="#0d2c63" stroke="#60a5fa" strokeOpacity=".4" />
      <g clipPath={`url(#${uid}-globe)`}>
        <g className={p.drift} style={v({ '--x': '-104px', '--d': '9s' })}>
          {[184, 288].map(offset => land.map((dot, i) => <circle key={`${offset}-${i}`} cx={offset + dot.x} cy={dot.y} r={dot.r} fill="#3b82f6" opacity=".7" />))}
        </g>
        {[52, 34, 16].map(rx => <ellipse key={rx} cx="236" cy="72" rx={rx} ry="52" fill="none" stroke="#93c5fd" strokeOpacity=".18" />)}
        {[-30, -10, 10, 30].map(dy => <line key={dy} x1="180" y1={72 + dy} x2="292" y2={72 + dy} stroke="#93c5fd" strokeOpacity=".14" />)}
      </g>
      <g className={p.tilt} style={v({ '--d': '5s' })}>
        <circle cx="80" cy="84" r="14" fill="#1e293b" />
        <path d="M50 128Q52 102 80 102Q108 102 110 128Z" fill="#1e293b" />
        <path d="M77 104L83 104L81 118Z" fill="#dc2626" />
      </g>
      <path d="M0 122L180 122L188 140L0 140Z" fill="#12244a" stroke="#3b82f6" strokeOpacity=".25" />
      <g className={p.slideIn} style={v({ '--sx': '-80px', '--sy': '0px', '--d': '6s' })}>
        <rect x="0" y="116" width="112" height="16" fill="#dc2626" />
        <text x="8" y="127.5" fontFamily={SANS} fontSize="9" fontWeight="900" letterSpacing="1.2" fill="#ffffff">BREAKING NEWS</text>
        <rect x="0" y="132" width="246" height="18" fill="#f8fafc" />
        <text x="8" y="144.5" fontFamily={SANS} fontSize="9" fontWeight="800" fill="#0f172a">Storm reaches the coast tonight</text>
      </g>
      <rect x="0" y="160" width="320" height="20" fill="#070d1c" />
      <g clipPath={`url(#${uid}-tick)`}>
        <g className={p.drift} style={v({ '--x': '-300px', '--d': '10s' })}>
          {[42, 342].map(x => <text key={x} x={x} y="173.5" fontFamily={SANS} fontSize="8.5" fontWeight="800" fill="#e2e8f0" textLength="300" lengthAdjust="spacingAndGlyphs">{ticker}</text>)}
        </g>
      </g>
      <rect x="0" y="160" width="36" height="20" fill="#dc2626" />
      <text x="18" y="173.5" textAnchor="middle" fontFamily={SANS} fontSize="8.5" fontWeight="900" fill="#ffffff">LIVE</text>
      <rect x="10" y="10" width="62" height="18" rx="4" fill="#020617" opacity=".8" />
      <circle cx="19" cy="19" r="2.8" fill="#ef4444" className={p.blink} />
      <text x="26" y="22.5" fontFamily={DISPLAY} fontSize="11" fill="#ffffff" letterSpacing=".6">NEWS 24</text>
    </>
  );
};

/* ═══ Creators: recording, growing, uploading ═══ */
const CreatorsScene: React.FC<{ uid: string }> = ({ uid }) => (
  <>
    <Sky id={`${uid}-sky`} stops={['#160f06', '#2b1608']} />
    <defs>
      <linearGradient id={`${uid}-led`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f472b6" /><stop offset=".5" stopColor="#a78bfa" /><stop offset="1" stopColor="#22d3ee" /></linearGradient>
      <linearGradient id={`${uid}-cam`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f59e0b" /><stop offset="1" stopColor="#7c2d12" /></linearGradient>
    </defs>
    <rect x="0" y="28" width="320" height="3" fill={`url(#${uid}-led)`} className={p.blink} style={v({ '--o': '.6', '--d': '3s' })} />
    <rect x="0" y="31" width="320" height="10" fill={`url(#${uid}-led)`} opacity=".12" />
    <circle cx="64" cy="80" r="36" fill="none" stroke="#fde68a" strokeOpacity=".18" strokeWidth="10" className={p.blink} style={v({ '--o': '.5', '--d': '2.6s' })} />
    <circle cx="64" cy="80" r="29" fill="none" stroke="#fff7ed" strokeWidth="6" />
    <line x1="64" y1="109" x2="64" y2="176" stroke="#44403c" strokeWidth="3" />
    <line x1="160" y1="118" x2="138" y2="176" stroke="#57534e" strokeWidth="2.4" /><line x1="160" y1="118" x2="182" y2="176" stroke="#57534e" strokeWidth="2.4" />
    <line x1="160" y1="118" x2="160" y2="176" stroke="#57534e" strokeWidth="2.4" />
    <rect x="140" y="46" width="40" height="72" rx="6" fill="#0b0f19" stroke="#44403c" />
    <rect x="143" y="50" width="34" height="64" rx="3" fill={`url(#${uid}-cam)`} />
    <circle cx="160" cy="80" r="8" fill="#3b1a07" /><path d="M146 114Q148 94 160 94Q172 94 174 114Z" fill="#3b1a07" />
    <circle cx="150" cy="57" r="2.4" fill="#ef4444" className={p.blink} style={v({ '--d': '1s' })} />
    <text x="155" y="59.4" fontFamily={SANS} fontSize="6" fontWeight="900" fill="#ffffff">REC</text>
    <g className={p.pop} style={v({ '--d': '3.6s' })}>
      <rect x="208" y="50" width="98" height="28" rx="8" fill="#0b0f19" opacity=".92" stroke="#f59e0b" strokeOpacity=".5" />
      <text x="218" y="68" fontFamily={SANS} fontSize="10" fontWeight="900" fill="#fde68a">+1.2K followers</text>
    </g>
    <rect x="208" y="90" width="98" height="36" rx="8" fill="#0b0f19" opacity=".92" />
    <text x="218" y="104" fontFamily={SANS} fontSize="8.5" fontWeight="700" fill="#e7e5e4">Uploading</text>
    <rect x="218" y="112" width="78" height="4" rx="2" fill="#44403c" />
    <rect x="218" y="112" width="78" height="4" rx="2" fill="#f59e0b" className={p.fill} style={v({ '--d': '3.6s' })} />
    {[0, 1, 2].map(i => (
      <path key={i} d={heart(250 + i * 16, 156, 5)} fill={['#f43f5e', '#f59e0b', '#fb7185'][i]} className={p.rise}
        style={v({ '--y': '-46px', '--d': '3s', animationDelay: `${-i}s` })} />
    ))}
  </>
);

/* ═══ Awards: and the winner is ═══ */
const AwardsScene: React.FC<{ uid: string }> = ({ uid }) => (
  <>
    <Sky id={`${uid}-sky`} stops={['#0c0803', '#241806']} />
    <defs>
      <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fef3c7" /><stop offset=".45" stopColor="#eab308" /><stop offset="1" stopColor="#92400e" /></linearGradient>
      <linearGradient id={`${uid}-spot`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fffbeb" stopOpacity=".32" /><stop offset="1" stopColor="#fffbeb" stopOpacity="0" /></linearGradient>
      <clipPath id={`${uid}-cup`}><path d="M134 54L186 54Q184 96 160 102Q136 96 134 54Z" /></clipPath>
    </defs>
    <path d="M30 0L48 0L190 180L120 180Z" fill={`url(#${uid}-spot)`} className={p.sweep} style={v({ '--a': '8deg', '--d': '4.2s', '--ox': '0%', '--oy': '0%' })} />
    <path d="M272 0L290 0L200 180L130 180Z" fill={`url(#${uid}-spot)`} className={p.sweep} style={v({ '--a': '8deg', '--d': '4.8s', '--ox': '100%', '--oy': '0%' })} />
    <path d="M0 0L58 0Q40 60 52 120Q40 160 48 180L0 180Z" fill="#7f1d1d" />
    <path d="M14 0Q4 90 16 180M30 0Q22 90 32 180" stroke="#5b1414" strokeWidth="3" fill="none" />
    <path d="M320 0L262 0Q280 60 268 120Q280 160 272 180L320 180Z" fill="#7f1d1d" />
    <path d="M306 0Q316 90 304 180M290 0Q298 90 288 180" stroke="#5b1414" strokeWidth="3" fill="none" />
    <path d="M0 0L320 0L320 12Q240 22 160 14Q80 22 0 12Z" fill="#991b1b" />
    <text x="160" y="34" textAnchor="middle" fontFamily={SANS} fontSize="8" fontWeight="800" letterSpacing="2.2" fill="#fde68a" className={p.blink} style={v({ '--o': '.45', '--d': '2.4s' })}>AND THE WINNER IS…</text>
    <ellipse cx="160" cy="166" rx="120" ry="16" fill="#3b2a0a" />
    <ellipse cx="160" cy="160" rx="62" ry="10" fill="#fde68a" opacity=".22" className={p.blink} style={v({ '--o': '.6', '--d': '3s' })} />
    <path d="M134 60q-18 2 -14 18q4 12 18 12" stroke={`url(#${uid}-gold)`} strokeWidth="4" fill="none" />
    <path d="M186 60q18 2 14 18q-4 12 -18 12" stroke={`url(#${uid}-gold)`} strokeWidth="4" fill="none" />
    <path d="M134 54L186 54Q184 96 160 102Q136 96 134 54Z" fill={`url(#${uid}-gold)`} />
    <polygon points={star(160, 74, 9)} fill="#fffbeb" opacity=".75" />
    <g clipPath={`url(#${uid}-cup)`}>
      <g className={p.shine} style={v({ '--from': '0px', '--to': '160px', '--d': '3s' })}><rect x="110" y="40" width="14" height="80" fill="#ffffff" opacity=".55" transform="skewX(-20)" /></g>
    </g>
    <rect x="156" y="102" width="8" height="16" fill="#ca8a04" />
    <rect x="146" y="118" width="28" height="7" rx="1.5" fill="#a16207" />
    <rect x="140" y="125" width="40" height="13" rx="2" fill="#78350f" />
    <rect x="148" y="129" width="24" height="4" rx="1" fill="#fde68a" opacity=".7" />
    {Array.from({ length: 16 }, (_, i) => (
      <rect key={i} x={40 + rand(i, 91) * 240} y="-10" width="2.6" height="4.4" fill={['#fde68a', '#facc15', '#fef3c7', '#f59e0b'][i % 4]} className={p.fall}
        style={v({ '--d': `${3.8 + rand(i, 92) * 2.2}s`, '--r': `${200 + rand(i, 93) * 300}deg`, animationDelay: `${-rand(i, 94) * 6}s` })} />
    ))}
  </>
);

/* ═══ VR Cinema: a screen in space, inside a headset ═══ */
const VrScene: React.FC<{ uid: string }> = ({ uid }) => (
  <>
    <Sky id={`${uid}-sky`} stops={['#04020c', '#1c0a33']} />
    <defs>
      <linearGradient id={`${uid}-film`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#312e81" /><stop offset="1" stopColor="#be185d" /></linearGradient>
      <linearGradient id={`${uid}-spill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c084fc" stopOpacity=".28" /><stop offset="1" stopColor="#c084fc" stopOpacity="0" /></linearGradient>
      <clipPath id={`${uid}-screen`}><path d="M54 26Q160 8 266 26L266 104Q160 120 54 104Z" /></clipPath>
    </defs>
    <g className={p.drift} style={v({ '--x': '-320px', '--d': '40s' })}>
      {[0, 320].map(offset => Array.from({ length: 22 }, (_, i) => <circle key={`${offset}-${i}`} cx={offset + rand(i, 101) * 320} cy={rand(i, 102) * 180} r=".8" fill="#e9d5ff" opacity=".7" />))}
    </g>
    <g className={p.drift} style={v({ '--x': '-320px', '--d': '20s' })}>
      {[0, 320].map(offset => Array.from({ length: 10 }, (_, i) => <circle key={`${offset}-${i}`} cx={offset + rand(i, 103) * 320} cy={rand(i, 104) * 180} r="1.4" fill="#f5f3ff" />))}
    </g>
    <path d="M54 104L266 104L226 180L94 180Z" fill={`url(#${uid}-spill)`} />
    <path d="M54 26Q160 8 266 26L266 104Q160 120 54 104Z" fill={`url(#${uid}-film)`} />
    <g clipPath={`url(#${uid}-screen)`}>
      <circle cx="210" cy="50" r="18" fill="#fbcfe8" opacity=".8" />
      <circle cx="96" cy="40" r="1" fill="#fff" /><circle cx="130" cy="30" r="1" fill="#fff" /><circle cx="168" cy="44" r="1" fill="#fff" />
      <path d="M54 96Q110 78 160 92T266 88L266 120L54 120Z" fill="#1e1b4b" />
      <g className={p.drift} style={v({ '--x': '260px', '--d': '6s' })}>
        <path d="M24 70L44 76L24 82L28 76Z" fill="#f5f3ff" /><path d="M24 76L10 76" stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round" />
      </g>
    </g>
    <path d="M54 26Q160 8 266 26L266 104Q160 120 54 104Z" fill="none" stroke="#c084fc" strokeOpacity=".5" strokeWidth="1.5" />
    <g className={p.tilt} style={v({ '--d': '7s' })}>
      <path d="M100 180Q104 150 160 148Q216 150 220 180Z" fill="#0a0612" />
      <circle cx="160" cy="138" r="21" fill="#0a0612" />
      <rect x="136" y="128" width="48" height="18" rx="8" fill="#1f1235" stroke="#c084fc" strokeOpacity=".7" strokeWidth="1.4" />
      <rect x="141" y="133" width="38" height="8" rx="4" fill="#c084fc" className={p.blink} style={v({ '--o': '.35', '--d': '2.2s' })} />
      <path d="M136 137Q128 137 130 128M184 137Q192 137 190 128" stroke="#1f1235" strokeWidth="3" fill="none" />
    </g>
  </>
);

const SCENES: Record<ProductShowcaseId, React.FC<{ uid: string }>> = {
  LIVE: LiveScene, KIDS: KidsScene, GAMES: GamesScene, INTERACTIVE: InteractiveScene, SHORTS: ShortsScene,
  PODCASTS: PodcastsScene, MUSIC: MusicScene, FAN_CLUB: FanClubScene, PREMIERES: PremieresScene, MERCH: MerchScene,
  FESTIVAL: FestivalScene, TOURS: ToursScene, WORLD: WorldScene, STICK: StickScene, TELCO: TelcoScene,
  NEWS: NewsScene, CREATORS: CreatorsScene, AWARDS: AwardsScene, VR: VrScene,
};

/** a product's moving preview: `live` runs it wherever it is (the featured card, the open sheet); otherwise it runs
 *  while its card is on screen (the card's `data-play`) */
export const ProductScene: React.FC<{ id: ProductShowcaseId; uid: string; live?: boolean; className?: string }> = ({ id, uid, live = false, className }) => {
  const Scene = SCENES[id];
  return (
    <svg className={cx(p.scene, live && p.live, className)} viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" data-scene={id}>
      <Scene uid={uid} />
    </svg>
  );
};

export default ProductScene;
