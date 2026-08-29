/* ============================================================================
   THE RACK WALL

   A room, not a table. Cabinets stand on a floor: the ones you own have solid
   faces and lit drives, the ones you rent are outlined and cooler-toned, and
   the lease positions you have not filled are empty floor. The difference
   between owning and renting is a thing you can see from across the screen.

   Above them, the room's traffic scrolls like a real monitor — a continuous
   trace with a moving edge, not a row of dashes.

   The rails down the side are the room's real limits: power amber, cooling
   blue, fibre green. The one that is the ceiling glows.
   ========================================================================== */

import { useMemo } from 'react';
import type { Duty, Facility, FacilityListing, Limiting } from '../../finance/build';

const DUTY_TINT: Record<Duty, string> = {
  ORIGIN: 'var(--sf-brand-on)',
  REGIONAL: '#4b8f8c',
  EDGE: '#7a6bb5',
  ENCODE: '#c9a227',
  SERVICES: '#5c6b7a',
  LIVE: '#e0762f',
  FUTURE: '#3a4453',
};

interface Props {
  facility: Facility;
  listing?: FacilityListing;
  limiting: Limiting;
  activeGroupId?: string;
  compact?: boolean;
  /** 0–1. Drives how hard the room looks like it is working. */
  load?: number;
  /** How many of these cabinets you own. The rest are rented. */
  owned?: number;
}

/* A repeatable trace, seeded so a room's shape is its own and never jumps. */
function tracePath(seed: number, load: number): string {
  const points: number[] = [];
  let s = seed || 7;
  for (let i = 0; i <= 48; i += 1) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const noise = (s / 4294967296) * 0.5 + 0.5;
    const wave = 0.55 + Math.sin(i * 0.7) * 0.18 + Math.sin(i * 0.23) * 0.12;
    points.push(Math.max(0.08, Math.min(1, wave * noise * (0.35 + load))));
  }
  const step = 100 / 48;
  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${(30 - v * 26).toFixed(2)}`).join(' ');
  return `${line} L100,30 L0,30 Z`;
}

export function RackWall({ facility, listing, limiting, activeGroupId, compact, load = 0.4, owned }: Props) {
  const positions = listing?.rackPositions ?? 0;
  const cabinets: Array<{ id: string; duty: Duty; groupId: string } | null> = [];

  facility.groups.forEach((group) => {
    for (let i = 0; i < group.racks; i += 1) {
      cabinets.push({ id: `${group.id}-${i}`, duty: group.duty, groupId: group.id });
    }
  });
  /* Show enough empty positions to make the room's headroom obvious, not every
     one of them — twelve dashed slots for two racks reads as an error. */
  const freeTotal = Math.max(0, positions - cabinets.length);
  const freeShown = Math.min(freeTotal, Math.max(2, 8 - cabinets.length));
  for (let i = 0; i < freeShown; i += 1) cabinets.push(null);

  const seed = useMemo(
    () => facility.id.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7),
    [facility.id],
  );
  const path = useMemo(() => tracePath(seed, Math.min(1, load)), [seed, load]);

  const supply = [
    { id: 'POWER' as Limiting, label: 'Power', tone: 'power', used: facility.power.used, cap: facility.power.contracted, unit: 'kW' },
    { id: 'COOLING' as Limiting, label: 'Cooling', tone: 'cool', used: facility.cooling.used, cap: facility.cooling.available, unit: 'kW' },
    { id: 'BANDWIDTH' as Limiting, label: 'Fibre', tone: 'fibre', used: facility.bandwidth.used, cap: facility.bandwidth.available, unit: 'Gb' },
  ];

  const ownedCount = typeof owned === 'number' ? owned : cabinets.filter(Boolean).length;
  const rentedCount = cabinets.filter(Boolean).length - ownedCount;
  const freeCount = freeTotal;

  return (
    <div className={compact ? 'rw is-compact' : 'rw'} style={{ ['--load' as string]: Math.max(0.08, Math.min(1, load)) }}>
      <div className="rw-tracehead">
        <b>Traffic through this room</b>
        <s>{Math.round(Math.min(1, load) * 100)}% of its ceiling</s>
      </div>

      {/* A monitor, not decoration: the trace scrolls, the edge marks now. */}
      <div className="rw-monitor" aria-hidden="true">
        <svg viewBox="0 0 100 30" preserveAspectRatio="none">
          <g className="rw-scroll">
            <path className="rw-fill" d={path} />
            <path className="rw-fill" d={path} transform="translate(100,0)" />
          </g>
        </svg>
        <span className="rw-now" />
      </div>

      <div className={limiting === 'COOLING' ? 'rw-room is-hot' : 'rw-room'}>
        <div className="rw-ceil" aria-hidden="true"><i className={limiting === 'COOLING' ? 'is-hot' : undefined} /></div>

        <div className="rw-floor">
          {cabinets.slice(0, 20).map((cab, i) => {
            if (!cab) return <span key={`empty-${i}`} className="rw-slot" title="Free rack position" />;
            const rented = i >= ownedCount;
            return (
              <span
                key={cab.id}
                className={`rw-cab${facility.built ? ' is-built' : ''}${rented ? ' is-rented' : ' is-owned'}${cab.groupId === activeGroupId ? ' is-active' : ''}`}
                style={{ ['--duty' as string]: DUTY_TINT[cab.duty], ['--i' as string]: i }}
                title={`${cab.duty}${rented ? ' · rented' : ' · owned'}`}
              >
                <i className="rw-vent" />
                <i className="rw-led" /><i className="rw-led" /><i className="rw-led" /><i className="rw-led" />
                <i className="rw-foot" />
              </span>
            );
          })}
          {freeTotal > freeShown && <span className="rw-more">+{freeTotal - freeShown} free</span>}
        </div>

        <div className="rw-ground" aria-hidden="true" />
        <div className={`rw-rail${limiting === 'POWER' ? ' is-lit' : ''}`} aria-hidden="true" />
        <div className={`rw-fibrerail${limiting === 'BANDWIDTH' ? ' is-lit' : ''}`} aria-hidden="true" />
      </div>

      <div className="rw-legend">
        <span className="is-owned"><i />{ownedCount} owned</span>
        {rentedCount > 0 && <span className="is-rented"><i />{rentedCount} rented</span>}
        {freeCount > 0 && <span className="is-free"><i />{freeCount} free</span>}
      </div>

      <ul className="rw-supply">
        {supply.map((line) => {
          const fill = Math.min(1, line.used / Math.max(1, line.cap));
          const tight = limiting === line.id;
          return (
            <li key={line.id} className={`is-${line.tone}${tight ? ' is-tight' : ''}`}>
              <em>{line.label}</em>
              <span className="rw-bar"><i style={{ width: `${fill * 100}%` }} /></span>
              <s>{Math.round(line.used)}/{Math.round(line.cap)}{line.unit}</s>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { DUTY_TINT };
