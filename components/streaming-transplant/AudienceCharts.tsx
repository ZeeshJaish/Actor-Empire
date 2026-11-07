/**
 * The Audience room's charts (#131; plan §20.8). House rules (the dataviz guide): one axis, a recessive grid, thin
 * marks, a single series needs no legend (its tab names it), colour follows the thing (green came, red left, the
 * service's own colour for its line), and every line chart has a tap / hover layer. Pure presentation.
 */
import React, { useId, useMemo, useRef, useState } from 'react';
import r from './presentation/screens/AudienceDesk/AudienceRoom.module.css';
import { cx } from './presentation/cx';

/* ── a line over weeks ─────────────────────────────────────────────────── */
export interface TrendPointView { week: number; value: number }

export const TrendChart: React.FC<{
  points: TrendPointView[];
  format: (value: number) => string;
  color: string;
  /** lower is better (churn): a rise reads red in the tooltip */
  inverse?: boolean;
}> = ({ points, format, color, inverse = false }) => {
  const gradient = useId().replace(/:/g, '');
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 320, H = 132, L = 4, R = 44, T = 10, B = 8;
  const geom = useMemo(() => {
    const values = points.map(point => point.value);
    const min = Math.min(...values), max = Math.max(...values);
    const pad = (max - min) * .14 || Math.abs(max) * .05 || 1;
    const lo = min - pad, hi = max + pad;
    const x = (index: number) => L + (index / Math.max(1, points.length - 1)) * (W - L - R);
    const y = (value: number) => T + (1 - (value - lo) / (hi - lo)) * (H - T - B);
    const line = points.map((point, index) => `${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ');
    const ticks = [hi - pad, (hi + lo) / 2, lo + pad];
    return { x, y, line, area: `${L},${H - B} ${line} ${x(points.length - 1).toFixed(1)},${H - B}`, ticks };
  }, [points]);
  if (points.length < 2) return <div className={r.chartEmpty}>The line starts once two weeks have settled.</div>;
  const read = (event: React.PointerEvent) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return;
    const relative = ((event.clientX - box.left) / box.width) * W;
    const index = Math.round(((relative - L) / (W - L - R)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, index)));
  };
  /* #137: the tooltip shows only while you touch the line (a mouse reads it on hover); lifting the finger hides it */
  const onDown = (event: React.PointerEvent) => {
    /* a drag keeps reading the line even when the finger slides off it */
    if (event.pointerType !== 'mouse') {
      try { svg.current?.setPointerCapture(event.pointerId); } catch { /* the pointer already ended */ }
    }
    read(event);
  };
  const onMove = (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse' || event.buttons) read(event);
  };
  const onEnd = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') setHover(null);
  };
  const last = points.length - 1;
  const shown = hover ?? last;
  const change = shown > 0 ? points[shown].value - points[shown - 1].value : 0;
  const good = inverse ? change <= 0 : change >= 0;
  return (
    <div className={r.chart}>
      <svg ref={svg} className={r.chartSvg} viewBox={`0 0 ${W} ${H}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onEnd}
        onPointerCancel={() => setHover(null)} onPointerLeave={() => setHover(null)}
        role="img" aria-label={`From ${format(points[0].value)} in week ${points[0].week} to ${format(points[last].value)} in week ${points[last].week}`}>
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {geom.ticks.map(value => (
          <g key={value}>
            <line className={r.grid} x1={L} x2={W - R + 4} y1={geom.y(value)} y2={geom.y(value)} />
            <text className={r.tick} x={W - R + 8} y={geom.y(value) + 3}>{format(value)}</text>
          </g>
        ))}
        <polygon className={r.area} points={geom.area} fill={`url(#${gradient})`} />
        <polyline className={r.line} points={geom.line} stroke={color} pathLength={1} />
        {hover !== null && <line className={r.cross} x1={geom.x(hover)} x2={geom.x(hover)} y1={T} y2={H - B} />}
        {hover === null && <circle className={r.halo} cx={geom.x(last)} cy={geom.y(points[last].value)} r="9" fill={color} />}
        <circle className={r.dot} cx={geom.x(shown)} cy={geom.y(points[shown].value)} r="4.5" fill={color} />
      </svg>
      {hover !== null && (
        <div className={r.chartTip} style={{ left: `${Math.min(80, Math.max(16, geom.x(shown) / W * 100))}%` }}>
          <b>{format(points[shown].value)}</b>
          <span>WK {points[shown].week}{shown > 0 && <> · <em className={change === 0 ? '' : good ? r.up : r.down}>{change > 0 ? '▲' : change < 0 ? '▼' : '='} {format(Math.abs(change))}</em></>}</span>
        </div>
      )}
      <div className={r.chartAxis}><span>WK {points[0].week}</span><span>WK {points[Math.floor(last / 2)].week}</span><span>WK {points[last].week}</span></div>
    </div>
  );
};

/* ── a dial: where a value sits between comfortable and alarming ───────── */
const arcPath = (cx: number, cy: number, radius: number, from: number, to: number) => {
  const point = (t: number) => {
    const angle = Math.PI * (1 - t);
    return [cx + radius * Math.cos(angle), cy - radius * Math.sin(angle)];
  };
  const [x1, y1] = point(from), [x2, y2] = point(to);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

export const Dial: React.FC<{
  value: number;
  max: number;
  /** coloured bands from 0 to max, in order */
  zones: Array<{ to: number; color: string }>;
  display: string;
  label: string;
  caption: React.ReactNode;
  tone?: 'good' | 'warn' | 'bad';
}> = ({ value, max, zones, display, label, caption, tone }) => {
  const share = Math.max(0, Math.min(1, value / max));
  const [angle, setAngle] = useState(-90);
  React.useEffect(() => { const frame = requestAnimationFrame(() => setAngle(-90 + share * 180)); return () => cancelAnimationFrame(frame); }, [share]);
  let start = 0;
  return (
    <div className={cx(r.card, r.gauge)}>
      <svg viewBox="0 0 120 68" aria-hidden="true">
        <path className={r.track} d={arcPath(60, 60, 48, 0, 1)} />
        {zones.map(zone => {
          const from = start / max, to = Math.min(1, zone.to / max);
          start = zone.to;
          return <path key={zone.to} className={r.zone} d={arcPath(60, 60, 48, from, Math.max(from, to - .005))} stroke={zone.color} strokeOpacity=".75" />;
        })}
        <g className={r.needle} style={{ transform: `rotate(${angle}deg)`, transformOrigin: '60px 60px' }}>
          <line x1="60" y1="60" x2="60" y2="20" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <circle className={r.hub} cx="60" cy="60" r="4.5" />
      </svg>
      <b>{display}</b>
      <span>{label}</span>
      <small className={tone ? r[tone] : undefined}>{caption}</small>
    </div>
  );
};

/* ── a ring: one share of a whole ─────────────────────────────────────── */
export const Ring: React.FC<{ percent: number; color: string; display: string; label: string; caption: React.ReactNode }> = ({ percent, color, display, label, caption }) => {
  const radius = 30, circumference = 2 * Math.PI * radius;
  const [shown, setShown] = useState(0);
  React.useEffect(() => { const frame = requestAnimationFrame(() => setShown(Math.max(0, Math.min(100, percent)))); return () => cancelAnimationFrame(frame); }, [percent]);
  return (
    <div className={cx(r.card, r.gauge)}>
      <svg viewBox="0 0 120 68" aria-hidden="true">
        <circle cx="60" cy="34" r={radius} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" />
        <circle className={r.ringArc} cx="60" cy="34" r={radius} stroke={color} strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)} transform="rotate(-90 60 34)" />
      </svg>
      <b>{display}</b>
      <span>{label}</span>
      <small>{caption}</small>
    </div>
  );
};

/* ── a bar split into parts, with keys ────────────────────────────────── */
export interface SplitPart { id: string; label: string; value: number; color: string; display: string }

export const SplitBar: React.FC<{ parts: SplitPart[]; ariaLabel: string }> = ({ parts, ariaLabel }) => {
  const total = parts.reduce((sum, part) => sum + Math.max(0, part.value), 0) || 1;
  const shown = parts.filter(part => part.value > 0);
  return (
    <>
      <div className={r.split} role="img" aria-label={ariaLabel}>
        {shown.map(part => <i key={part.id} style={{ width: `${part.value / total * 100}%`, background: part.color }} />)}
      </div>
      <div className={r.keys}>
        {shown.map(part => <span key={part.id}><i style={{ background: part.color }} />{part.label} <b>{part.display}</b></span>)}
      </div>
    </>
  );
};

/* ── why they came, why they left: one row a reason ──────────────────── */
export interface ButterflyRow { id: string; label: string; came: number; left: number }

export const Butterfly: React.FC<{ rows: ButterflyRow[]; format: (value: number) => string }> = ({ rows, format }) => {
  const max = Math.max(1, ...rows.flatMap(row => [row.came, row.left]));
  return (
    <div>
      <div className={r.bfHead}><span>◀ LEFT</span><span>CAME ▶</span></div>
      {rows.map((row, index) => (
        <div className={r.bfRow} key={row.id} style={{ ['--i' as string]: index }}>
          <div className={r.bfLabel}>{row.label}</div>
          <div className={r.bfBars} aria-label={`${row.label}: ${format(row.left)} left, ${format(row.came)} came`}>
            <span className={cx(r.bfSide, r.left)}>{row.left > 0 && <i style={{ width: `${Math.max(3, row.left / max * 100)}%`, animationDelay: `${index * 60}ms` }} />}</span>
            <span className={cx(r.bfSide, r.right)}>{row.came > 0 && <i style={{ width: `${Math.max(3, row.came / max * 100)}%`, animationDelay: `${index * 60}ms` }} />}</span>
          </div>
          <div className={r.bfVals}><span>{row.left > 0 ? `−${format(row.left)}` : '—'}</span><span>{row.came > 0 ? `+${format(row.came)}` : '—'}</span></div>
        </div>
      ))}
    </div>
  );
};

/* ── the week's flow: joined against left ─────────────────────────────── */
export const FlowBar: React.FC<{ joined: number; returned: number; left: number; format: (value: number) => string }> = ({ joined, returned, left, format }) => {
  const total = Math.max(1, joined + returned + left);
  return (
    <div className={r.flow}>
      <div className={r.flowBar} role="img" aria-label={`${format(joined)} joined, ${format(returned)} came back, ${format(left)} left`}>
        {joined > 0 && <i style={{ width: `${joined / total * 100}%`, background: 'linear-gradient(90deg,#1f9d55,#4ade80)' }} />}
        {returned > 0 && <i style={{ width: `${returned / total * 100}%`, background: '#a7f3d0' }} />}
        {left > 0 && <i className={r.out} style={{ width: `${left / total * 100}%`, background: 'linear-gradient(90deg,#ff6b6f,#c2353b)' }} />}
      </div>
      <div className={r.flowKeys}>
        <span className={r.in}>JOINED<b>+{format(joined)}</b></span>
        <span className={r.back}>CAME BACK<b>{returned > 0 ? `+${format(returned)}` : '0'}</b></span>
        <span className={r.out}>LEFT<b>−{format(left)}</b></span>
      </div>
    </div>
  );
};
