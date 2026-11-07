/*
 * #229 (plan §25.8): The Table, the look of the listing's vote, as a piece any vote can use: a tally, the seats with their
 * faces, one call, and the stamp. The listing (ListingTable) and every other approval (StreamingApprovalTable) draw it.
 */
import React from 'react';
import css from './presentation/screens/TheListing/TheListing.module.css';
import { cx } from './presentation/cx';
import { PersonFace } from './PersonFace';

export interface TableSeatView {
  id: string;
  name: string;
  /** the short name on the tile */
  who: string;
  /** the tiny caps line */
  role: string;
  gender?: string | null;
  avatar?: string | null;
  /** once counted: FOR, AGAINST, or how a crowd split */
  verdict: string | null;
  tone: 'for' | 'against' | null;
  /** tapping it picks whom to call */
  disabled: boolean;
}

export const TableBoard: React.FC<{
  center: string;
  forCount: React.ReactNode;
  againstCount: React.ReactNode;
  seats: TableSeatView[];
  targetId: string | null;
  onSeat: (id: string) => void;
  reply?: string | null;
  result?: boolean | null;
}> = ({ center, forCount, againstCount, seats, targetId, onSeat, reply, result }) => (
  <div className={css.tbboard}>
    <div className={css.tbtally}>
      <span className={css.for}>FOR <b>{forCount}</b></span>
      <i>{center}</i>
      <span className={css.against}><b>{againstCount}</b> AGAINST</span>
    </div>
    <div className={css.tbseats}>
      {seats.map(seat => (
        <button key={seat.id} type="button"
          className={cx(css.tbseat, seat.tone === 'for' && css.for, seat.tone === 'against' && css.against, targetId === seat.id && css.targeted)}
          disabled={seat.disabled}
          onClick={() => onSeat(seat.id)}>
          <PersonFace className={css.tbseatface} name={seat.name} gender={seat.gender as never} src={seat.avatar} />
          <b>{seat.who}</b>
          <span>{seat.role}</span>
          <em>{seat.verdict ?? '·'}</em>
        </button>
      ))}
    </div>
    {reply && <p className={css.tbreply}>{reply}</p>}
    {result !== null && result !== undefined && <div className={cx(css.tbresult, result ? css.ok : css.bad)}>{result ? 'CARRIED' : 'NOT CARRIED'}</div>}
  </div>
);
