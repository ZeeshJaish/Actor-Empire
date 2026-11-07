/**
 * WHO'S OUT THERE (#140; plan §20.9 D). Zeesh, after trying #133: "हुज आउट देयर … विजुअली और बेटर".
 *  - "Of every 100 people streaming": a 10 × 10 grid of small figures, each audience group in its colour, so the
 *    split reads at a glance; every group named beside it with its share. Tap a group (a figure or its row) to read it.
 *  - The group's card: its icon and share, how many watch, three meters (hours a week, budget a month, how easily
 *    they switch), "Loves now" as the service's own logo, and what they want and when they leave, one line each.
 * The six groups take a validated categorical palette in a fixed order (neighbouring blocks pass the CVD and
 * normal-vision checks on this card), not the services' brand colours, which clash here (Netflix red beside fandom
 * pink, Disney blue too dark to read). The brand lives on the "Loves now" logo.
 */
import React, { useMemo, useState } from 'react';
import r from './presentation/screens/AudienceDesk/AudienceRoom.module.css';
import { cx } from './presentation/cx';
import { compact } from './audienceAtlasModel';
import StreamingPlatformBrand from '../StreamingPlatformBrand';
import { resolveStreamingPlatformBrandByName } from '../../services/streamingPlatformBrandRegistry';
import type { StreamingAudiencePersonaId, StreamingAudiencePersonaView } from '../../services/streamingAudienceMarket';

/* The grid's order: each group's figures sit together, in this order, and the colours follow it (validated adjacent). */
const ORDER: StreamingAudiencePersonaId[] = ['FAMILY_HOUSEHOLDS', 'VALUE_SEEKERS', 'LOCAL_FIRST', 'PRESTIGE_EXPLORERS', 'FANDOM_LOYALISTS', 'HABIT_STREAMERS'];
const COLOR: Record<string, string> = {
  FAMILY_HOUSEHOLDS: '#3987e5',
  VALUE_SEEKERS: '#d95926',
  LOCAL_FIRST: '#199e70',
  PRESTIGE_EXPLORERS: '#c98500',
  FANDOM_LOYALISTS: '#d55181',
  HABIT_STREAMERS: '#9085e9',
};
const SWITCH_STEPS = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;
const HOURS_FULL = 25;
const COLS = 10;
const CELL_W = 12;
const CELL_H = 14;

/* One figure: a head and shoulders, 10 × 12. */
const FIGURE = <><circle cx="5" cy="2.7" r="2.5" /><path d="M.8 12V9.7a4.2 4 0 0 1 8.4 0V12z" /></>;

const ICONS: Record<string, React.ReactNode> = {
  FAMILY_HOUSEHOLDS: <><circle cx="8" cy="7" r="2.6" /><circle cx="16.2" cy="8.6" r="2.1" /><path d="M3.5 20v-2.6A4.5 4.5 0 0 1 8 12.9a4.5 4.5 0 0 1 4.5 4.5V20" /><path d="M12.8 20v-1.9a3.4 3.4 0 0 1 6.8 0V20" /></>,
  VALUE_SEEKERS: <><path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.4 1.4 0 0 1 0 2l-6.7 6.7a1.4 1.4 0 0 1-2 0z" /><circle cx="8" cy="8" r="1.5" /></>,
  LOCAL_FIRST: <><path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 0 0-13 0c0 5 6.5 11 6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  PRESTIGE_EXPLORERS: <><circle cx="12" cy="9" r="5.2" /><path d="M9 13.6 7.5 21l4.5-2.4 4.5 2.4-1.5-7.4" /></>,
  FANDOM_LOYALISTS: <><circle cx="12" cy="12" r="4.8" /><path d="M7.4 16.9c-2.6 2-4.4 2.9-5 2.3-1-1 2.6-5.9 8-11s10.4-8 11.4-7c.6.6-.4 2.4-2.4 4.9" /></>,
  HABIT_STREAMERS: <><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4.5v4h-4" /><path d="m10 9 5 3-5 3z" /></>,
};

/** Largest remainder: whole figures out of 100 that add up to exactly 100. */
const figuresOf = (shares: number[]) => {
  const total = shares.reduce((sum, share) => sum + share, 0) || 1;
  const exact = shares.map(share => share / total * 100);
  const whole = exact.map(Math.floor);
  const left = 100 - whole.reduce((sum, value) => sum + value, 0);
  exact.map((value, index) => ({ index, rest: value - whole[index] }))
    .sort((a, b) => b.rest - a.rest || a.index - b.index)
    .slice(0, left)
    .forEach(({ index }) => { whole[index] += 1; });
  return whole;
};

const Meter: React.FC<{ label: string; steps: number; lit: number; value: string }> = ({ label, steps, lit, value }) => (
  <div className={r.ppMeter}>
    <span>{label}</span>
    <i aria-hidden="true">{Array.from({ length: steps }, (_, step) => <em key={step} className={step < lit ? r.ppLit : ''} style={{ ['--s' as string]: step }} />)}</i>
    <b>{value}</b>
  </div>
);

export const AudiencePeople: React.FC<{ personas: StreamingAudiencePersonaView[] }> = ({ personas }) => {
  const groups = useMemo(() => {
    const known = ORDER.map(id => personas.find(persona => persona.id === id)).filter((persona): persona is StreamingAudiencePersonaView => Boolean(persona));
    const rest = personas.filter(persona => !ORDER.includes(persona.id));
    const all = [...known, ...rest];
    const counts = figuresOf(all.map(persona => persona.sharePercent));
    return all.map((persona, index) => ({ persona, color: COLOR[persona.id] ?? '#8b93a5', figures: counts[index] }));
  }, [personas]);
  const biggest = useMemo(() => [...groups].sort((a, b) => b.persona.sharePercent - a.persona.sharePercent)[0]?.persona.id ?? null, [groups]);
  const [pickedId, setPickedId] = useState<StreamingAudiencePersonaId | null>(null);
  const current = groups.find(group => group.persona.id === (pickedId ?? biggest)) ?? groups[0];
  const maxBudget = Math.max(1, ...groups.map(group => group.persona.averageMonthlyEntertainmentBudget));
  if (!current) return null;

  const cells: Array<{ id: StreamingAudiencePersonaId; color: string }> = groups.flatMap(group => Array.from({ length: group.figures }, () => ({ id: group.persona.id, color: group.color })));
  const rows = Math.ceil(cells.length / COLS);
  const { persona, color } = current;
  const loves = resolveStreamingPlatformBrandByName(persona.bestFitPlatform);
  const budget = persona.averageMonthlyEntertainmentBudget;

  return (
    <>
      <section className={cx(r.card, r.rise, r.pp)} style={{ ['--i' as string]: 3 }}>
        <div className={r.eyebrow}>OF EVERY 100 PEOPLE STREAMING</div>
        <div className={r.ppBody}>
          <svg className={cx(r.ppGrid, pickedId && r.ppPicking)} viewBox={`0 0 ${COLS * CELL_W} ${rows * CELL_H}`} role="img"
            aria-label={groups.map(group => `${group.persona.name} ${group.figures}`).join(', ')}>
            {cells.map((cell, index) => (
              <g key={index} transform={`translate(${(index % COLS) * CELL_W + 1} ${Math.floor(index / COLS) * CELL_H + 1})`} onClick={() => setPickedId(cell.id)}>
                <g className={cx(r.ppFig, cell.id === current.persona.id && r.ppFigOn)} style={{ fill: cell.color, ['--d' as string]: index }}>{FIGURE}</g>
              </g>
            ))}
          </svg>
          <div className={r.ppKey} role="tablist" aria-label="Audience groups">
            {groups.map(group => (
              <button key={group.persona.id} type="button" role="tab" aria-selected={group.persona.id === current.persona.id}
                className={cx(r.ppKeyRow, group.persona.id === current.persona.id && r.ppKeyOn)} style={{ ['--pc' as string]: group.color }}
                onClick={() => setPickedId(group.persona.id)}>
                <i aria-hidden="true" />
                <span>{group.persona.name}</span>
                <b>{group.figures}</b>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section key={persona.id} className={cx(r.card, r.ppCard)} style={{ ['--pc' as string]: color }}>
        <div className={r.ppHead}>
          <span className={r.ppIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[persona.id]}</svg>
          </span>
          <div>
            <b>{persona.name}</b>
            <small>{compact(persona.activeViewers)} watching · {persona.subscriptionsPerHousehold} services a home</small>
          </div>
          <em>{current.figures}<s>%</s></em>
        </div>
        <div className={r.ppMeters}>
          <Meter label="Hours a week" steps={10} lit={Math.max(1, Math.round(persona.weeklyHours / HOURS_FULL * 10))} value={`${persona.weeklyHours} h`} />
          <Meter label="Budget a month" steps={10} lit={budget > 0 ? Math.max(1, Math.round(budget / maxBudget * 10)) : 0} value={budget > 0 ? `$${Math.round(budget)}` : '—'} />
          <Meter label="Switches" steps={3} lit={SWITCH_STEPS[persona.switchSensitivity]} value={persona.switchSensitivity} />
        </div>
        <div className={r.ppLoves}>
          <span>Loves now</span>
          {loves
            ? <span className={cx(r.ppLogo, r.ppLogoBrand)} style={{ background: loves.primaryColor, ['--pl-ink' as string]: loves.onPrimaryColor }}><StreamingPlatformBrand brand={loves} variant="LOCKUP" size="XS" /></span>
            : <span className={r.ppLogo}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 2.4 3.9 5.2 3.9 8.5s-1.3 6.1-3.9 8.5c-2.6-2.4-3.9-5.2-3.9-8.5s1.3-6.1 3.9-8.5z" /></svg><b>{persona.bestFitPlatform}</b></span>}
        </div>
        <p className={r.ppLine}><span>Wants</span>{persona.need}</p>
        <p className={r.ppLine}><span>Leaves when</span>{persona.leavesWhen}</p>
      </section>
    </>
  );
};
