import React from 'react';
import { Glyph } from './Glyph';
import css from './ReleaseStrategy.module.css';

export interface FestivalOptionModel {
  id: string;
  name: string;
  description: string;
  cost: number;
  qualityRequirement: number;
  qualityMet: boolean;
  affordable: boolean;
  timingRight: boolean;
  timingLabel: string;
  weekLabel: string;
  hue: number;
}

const join = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(' ');
const money = (value: number) => value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M` : `$${Math.round(value / 1_000)}k`;
const branch = (count: number) => Array.from({ length: count }, (_, i) => {
  const degrees = 105 + (i / Math.max(1, count - 1)) * 108;
  const radians = degrees * Math.PI / 180;
  return { x: 50 + Math.cos(radians) * 32, y: 46 + Math.sin(radians) * 32, rotation: degrees - 152 };
});

const Laurel: React.FC<{ density: number }> = ({ density }) => <svg className={css.laurel} viewBox="0 0 100 92" aria-hidden="true">
  <path className={css.tie} d="M42 83 Q50 89 58 83" fill="none" strokeLinecap="round" />
  {[1, -1].map(side => <g key={side} transform={side === -1 ? 'translate(100,0) scale(-1,1)' : undefined}>
    <path className={css.stem} d="M45 81 C31 77 21 65 19 48 C17 34 22 22 30 14" fill="none" strokeLinecap="round" />
    {branch(density).map((leaf, index) => <ellipse key={index} className={css.leaf} cx={leaf.x} cy={leaf.y} rx="9" ry="4" transform={`rotate(${leaf.rotation} ${leaf.x} ${leaf.y})`} />)}
  </g>)}
</svg>;

export const FestivalsStep: React.FC<{
  qualityScore: number;
  selectedFestivalId: string | null;
  festivals: FestivalOptionModel[];
  onSelectFestival: (id: string | null) => void;
  onContinue: () => void;
  onBack: () => void;
}> = ({ qualityScore, selectedFestivalId, festivals, onSelectFestival, onContinue, onBack }) => <>
  <div className={css.circuit}>{festivals.map(festival => {
    const eligible = festival.qualityMet && festival.affordable && festival.timingRight;
    const selected = selectedFestivalId === festival.id;
    return <button type="button" key={festival.id} disabled={!eligible} aria-label={`${festival.name} festival`} aria-pressed={selected}
      className={join(css.fest, selected && css.on, !eligible && css.shut)} style={{ '--fh': String(festival.hue) } as React.CSSProperties} onClick={() => onSelectFestival(festival.id)}>
      <div className={css.festhead}><span className={css.wreath}><Laurel density={Math.max(5, Math.min(9, Math.round(5 + (festival.qualityRequirement - 60) / 5)))} /><em className={css.wreathin}>{selected ? 'OFFICIAL\nSELECTION' : festival.name.toUpperCase()}</em></span><div className={css.festname}><b>{festival.name}</b><p>{festival.description}</p></div><em className={css.festcost}>{money(festival.cost)}</em></div>
      <div className={css.festwin}><Glyph id="calendar" size={12} /><span>{festival.weekLabel.toUpperCase()}</span><i className={festival.timingRight ? css.cool : css.bad}>{festival.timingLabel}</i></div>
      <div className={css.gatewrap}><span className={css.gatelbl}>QUALITY REQ</span><div className={join(css.gate2, festival.qualityMet ? css.gopen : css.gclosed)}><u style={{ width: `${qualityScore}%` }} /><i style={{ left: `${festival.qualityRequirement}%` }}><s /></i></div><b className={festival.qualityMet ? css.good : css.bad}>{festival.qualityRequirement} · yours {qualityScore}</b></div>
      {!festival.affordable && <span className={css.festReason}>NOT ENOUGH CASH</span>}
    </button>;
  })}</div>
  <button type="button" className={join(css.fest, css.skip, selectedFestivalId === null && css.on)} onClick={() => onSelectFestival(null)} aria-label="Skip Festivals" aria-pressed={selectedFestivalId === null}>
    <div className={css.festhead}><span className={css.wreath}><svg className={join(css.laurel, css.hollow)} viewBox="0 0 100 92" aria-hidden="true"><circle cx="50" cy="46" r="31" fill="none" strokeDasharray="3 5" /></svg><em className={css.wreathin}>NO{`\n`}LAURELS</em></span><div className={css.festname}><b>Skip Festivals</b><p>Go straight to general release.</p></div></div>
  </button>
  <div className={css.foot}><button type="button" className={css.backText} onClick={onBack}>BACK</button><button type="button" className={css.next} onClick={onContinue}>CONTINUE</button></div>
</>;
