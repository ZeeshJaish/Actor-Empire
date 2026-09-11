import React from 'react';
import { FilmSheet } from './FilmSheet';
import type { ReleaseFilmArt } from './model';
import css from './ReleaseStrategy.module.css';

export interface ReleaseCalendarRivalModel { id: string; title: string; scale: 'TENTPOLE' | 'MID' | 'SMALL'; genre?: string }
export interface ReleaseCalendarSlotModel { week: number; weekOfYear: number; selectable: boolean; isCurrent: boolean; selected: boolean; season: string; event: string | null; rivals: ReleaseCalendarRivalModel[] }
const join = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(' ');
const rivalRoom = { TENTPOLE: 60, MID: 31, SMALL: 13 };

export const CalendarStep: React.FC<{
  film: ReleaseFilmArt;
  slots: ReleaseCalendarSlotModel[];
  selectedWeek: number;
  onSelectWeek: (week: number) => void;
  onContinue: () => void;
  onBack: () => void;
  locked?: boolean;
}> = ({ film, slots, selectedWeek, onSelectWeek, onContinue, onBack, locked = false }) => {
  const [previewWeek, setPreviewWeek] = React.useState(selectedWeek);
  const dragging = React.useRef(false);
  const startWeek = slots[0]?.week || 1;
  const shown = slots.find(slot => slot.week === previewWeek) || slots.find(slot => slot.week === selectedWeek) || slots[0];
  const rows = React.useMemo(() => {
    const output: ReleaseCalendarSlotModel[][] = [];
    for (const slot of slots) {
      const current = output[output.length - 1];
      if (!current || current.length >= 9 || (slot.weekOfYear === 1 && current.length > 0)) output.push([slot]);
      else current.push(slot);
    }
    return output;
  }, [slots]);
  const atPointer = (event: React.PointerEvent) => {
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-release-week]') as HTMLElement | null;
    const week = Number(target?.dataset.releaseWeek);
    const slot = slots.find(candidate => candidate.week === week && candidate.selectable);
    if (slot && !locked) { setPreviewWeek(slot.week); onSelectWeek(slot.week); }
  };
  const yours = shown ? Math.max(0, 100 - shown.rivals.reduce((sum, rival) => sum + rivalRoom[rival.scale], 0)) : 100;
  const rank = shown ? shown.rivals.filter(rival => rivalRoom[rival.scale] > yours).length + 1 : 1;

  return <>
    <div className={css.year} onPointerDown={event => { if (!locked) { dragging.current = true; atPointer(event); } }} onPointerMove={event => dragging.current && atPointer(event)} onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}>
      <div className={css.yeartop}><b>52-WEEK RELEASE BOARD</b><em>WEEK {slots.find(slot => slot.isCurrent)?.weekOfYear || 1} NOW</em></div>
      {rows.map((row, index) => <React.Fragment key={row[0].week}>
        {index > 0 && row[0].weekOfYear === 1 && <span className={css.yearbreak}><i /><b>NEXT YEAR</b><i /></span>}
        <div className={css.dates} data-row-start={row[0].week}>
          {row.map(cell => {
            const nextYear = cell.week > startWeek && cell.weekOfYear < slots[0].weekOfYear;
            const label = `Week ${cell.weekOfYear}${nextYear ? ' next year' : ''}`;
            return <button type="button" key={cell.week} data-release-week={cell.week} disabled={!cell.selectable || (locked && cell.week !== selectedWeek)} aria-label={label}
              className={join(css.date, cell.selectable ? css.dopen : css.ddead, cell.isCurrent && css.dtoday, cell.rivals.length > 0 && css.dhot, cell.week === selectedWeek && css.dpick, cell.week === previewWeek && css.dnow)}
              onClick={() => { if (!locked) { setPreviewWeek(cell.week); onSelectWeek(cell.week); } }}><b>{cell.weekOfYear}</b><span className={css.dmarks}>{cell.rivals.length === 0 ? <i className={css.dclear} /> : cell.rivals.map(rival => <i key={rival.id} className={css[`w-${rival.scale.toLowerCase()}`]} />)}</span></button>;
          })}
        </div>
      </React.Fragment>)}
      <p className={css.yearhint}>{locked ? 'Platform contract signed — the premiere date is locked.' : 'Drag across a lit date to compare the valid release weekends.'}</p>
    </div>
    {shown && <div className={join(css.faceoff, shown.week === selectedWeek && css.on)}>
      <div className={css.fohead}><span className={css.fowk}><i>WEEK</i><b>{shown.weekOfYear}</b></span><em className={css.foseason}>{shown.season}{shown.weekOfYear < slots[0].weekOfYear ? ' · NEXT YEAR' : ''}</em>{shown.week === selectedWeek && <span className={css.fomine}>YOUR DATE</span>}</div>
      <div className={css.ring}><div className={join(css.corner, rank === 1 && css.wins)}>{rank === 1 && <span className={css.crown}>★</span>}<div className={css.mysheet}><FilmSheet film={film} size="sm" /></div><b className={css.pct}>{Math.round(yours)}%</b><em>YOURS</em></div><span className={css.vs}>VS</span><div className={css.corner}>{shown.rivals.length === 0 ? <span className={css.alone}><i /><em>NOBODY ELSE<br />OPENS</em></span> : <div className={css.rivalsheets}>{shown.rivals.map(rival => <span className={css.rivalsheet} key={rival.id} style={{ '--st': String(rivalRoom[rival.scale] / 60) } as React.CSSProperties}><b>{rival.title}</b><em>{rival.scale}</em></span>)}</div>}</div></div>
      <div className={join(css.verdict, css[`r-${rank}`])}><b>{rank}</b><div><em>YOU OPEN {rank === 1 ? 'FIRST' : rank === 2 ? 'SECOND' : 'THIRD'}</em><p>{shown.event || (shown.rivals.length ? 'A contested weekend. The campaign must work.' : 'A clear path for the opening.')}</p></div></div>
    </div>}
    <div className={css.foot}><button type="button" className={css.backText} onClick={onBack}>BACK</button><button type="button" className={join(css.next, !selectedWeek && css.dead)} disabled={!selectedWeek} onClick={onContinue}>REVIEW</button></div>
  </>;
};
