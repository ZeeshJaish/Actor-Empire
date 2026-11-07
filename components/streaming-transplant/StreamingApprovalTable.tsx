/*
 * #229 (plan §25.8): the approval screen. Zeesh (2026-11-04): "jaha ho button dabane ke bad hm log ko approval screeen khule
 * jaha sab bote daal rhe apna , just like how we do when filing ipo".
 *
 * What is asked and how much; the CFO's read first on money; one call to one director; the seats counted one at a time;
 * CARRIED or NOT CARRIED. The action happens only after that. Nothing reaches the save until the count ends.
 */
import React, { useEffect, useRef, useState } from 'react';
import '../../styles/streaming-listing-host.css';
import AccessibleDialog from '../AccessibleDialog';
import css from './presentation/screens/TheListing/TheListing.module.css';
import { cx } from './presentation/cx';
import { PersonFace } from './PersonFace';
import { TableBoard, type TableSeatView } from './TheTable';
import {
  STREAMING_APPROVAL_ARGUMENTS,
  applyStreamingApprovalCall,
  streamingApprovalCount,
  type StreamingApprovalCall,
  type StreamingApprovalMeeting,
} from '../../services/streamingApprovalMeeting';
import { STREAMING_APPROVAL_NO_WEEKS } from '../../services/streamingApproval';

const pct = (value: number) => `${(Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, '')}%`;

const StreamingApprovalTable: React.FC<{
  meeting: StreamingApprovalMeeting;
  /** the count has ended: write the result and do the action; what it says comes back */
  onCounted: (call: StreamingApprovalCall | null) => { carried: boolean; message: string };
  onClose: () => void;
}> = ({ meeting, onCounted, onClose }) => {
  const holders = meeting.mode === 'HOLDERS';
  const hasSpeaker = Boolean(meeting.speaker);
  const [heard, setHeard] = useState(0);
  const [target, setTarget] = useState<string | null>(null);
  const [call, setCall] = useState<StreamingApprovalCall | null>(null);
  const [resolved, setResolved] = useState(-1);
  const [outcome, setOutcome] = useState<{ carried: boolean; message: string } | null>(null);
  const settled = useRef(false);

  const { seats, reply } = applyStreamingApprovalCall(meeting, call);
  const reading = heard === 1;
  const ready = !hasSpeaker || heard >= 2;
  const voting = resolved >= 0;
  const finished = resolved >= seats.length;
  const shown = seats.slice(0, Math.max(0, resolved));
  const count = streamingApprovalCount(meeting, shown);

  /* the CFO reads it */
  useEffect(() => {
    if (!reading) return undefined;
    const id = window.setTimeout(() => setHeard(2), 900);
    return () => clearTimeout(id);
  }, [reading]);
  /* the seats are counted one at a time */
  useEffect(() => {
    if (!voting || finished) return undefined;
    const id = window.setTimeout(() => setResolved(n => n + 1), 560);
    return () => clearTimeout(id);
  }, [voting, resolved, finished]);
  /* the count has ended */
  useEffect(() => {
    if (!finished || settled.current) return;
    settled.current = true;
    setOutcome(onCounted(call));
  }, [finished]);

  const tile = (seat: typeof seats[number], index: number): TableSeatView => {
    const done = index < resolved;
    const split = seat.forShare > 0 && seat.forShare < 1;
    return {
      id: seat.id,
      name: seat.name,
      who: seat.who,
      role: seat.role,
      gender: seat.gender,
      avatar: seat.avatar,
      verdict: !done ? null : split ? `${Math.round(seat.forShare * 100)}% FOR` : seat.forShare > 0 ? 'FOR' : 'AGAINST',
      tone: !done ? null : seat.forShare >= 0.5 ? 'for' : 'against',
      disabled: !ready || voting || Boolean(call) || !seat.callable,
    };
  };

  /* who said no, and why; for a yes, who still said no */
  const reasons = finished ? seats.filter(seat => seat.reason && (outcome?.carried ? seat.forShare < 0.5 : seat.forShare < 1)).slice(0, 3) : [];

  return (
    <AccessibleDialog className="lh-backdrop" role="dialog" aria-label={meeting.eyebrow} onEscape={() => { if (!voting || finished) onClose(); }}>
      <section className="lh-stage">
        <div className={css.ls}>
          <div className={css.lstop}>
            {(!voting || finished) && <button type="button" className={css.lsback} aria-label="Close" onClick={onClose}>‹</button>}
            <div className={css.tbtopline}><span className={css.lseyebrow}>{meeting.eyebrow}</span></div>
          </div>
          <div className={cx(css.lsscene, css.div)}>
            <div className={css.tbwrap}>
              <div className={css.tbhead}>
                <b>{meeting.headline}</b>
                <em className={meeting.chipWarn ? css.warn : css.ok}>{meeting.chip}</em>
                <p className={css.tbwhat}>{meeting.what}</p>
              </div>

              {meeting.speaker && (
                <div className={cx(css.tbexecs, css.tbexecsone)}>
                  <div className={cx(css.tbexec, heard >= 2 && (meeting.speaker.ok ? css.ok : css.warn))}>
                    <div className={css.tbexectop}>
                      <PersonFace className={css.tbface} name={meeting.speaker.name} gender={meeting.speaker.gender as never} src={meeting.speaker.avatar} />
                      <div><b>{meeting.speaker.name}</b><span>{meeting.speaker.role}</span></div>
                    </div>
                    <i className={css.tbchip}>{heard >= 2 ? meeting.speaker.chip : reading ? 'READING' : 'WAITING'}</i>
                    {heard >= 2 && <p>{meeting.speaker.line}</p>}
                  </div>
                </div>
              )}

              <TableBoard
                center={meeting.center}
                forCount={holders ? pct(count.forTotal) : Math.round(count.forTotal)}
                againstCount={holders ? pct(count.againstTotal) : Math.round(count.againstTotal)}
                seats={seats.map(tile)}
                targetId={target}
                onSeat={id => setTarget(current => (current === id ? null : id))}
                reply={reply}
                result={outcome ? outcome.carried : null}
              />
              {reasons.length > 0 && (
                <ul className={css.tbwhy}>
                  {reasons.map(seat => <li key={seat.id}><b>{seat.who}</b> {seat.reason}</li>)}
                </ul>
              )}
            </div>

            {target && !voting && (
              <div className={css.lslobby}>
                <span>ONE CALL · {seats.find(seat => seat.id === target)!.name.toUpperCase()}</span>
                {STREAMING_APPROVAL_ARGUMENTS.map(argument => (
                  <button key={argument.id} type="button" onClick={() => { setCall({ seatId: target, argumentId: argument.id }); setTarget(null); }}>
                    <b>{argument.label}</b><em>“{argument.line}”</em>
                  </button>
                ))}
              </div>
            )}

            {!target && !voting && (
              <div className={css.lsfoot}>
                <p className={css.lsfootnote}>
                  {hasSpeaker && heard === 0 ? 'Your CFO reads it first, then it goes to the vote.'
                    : call ? 'Your call is made. The vote is what it is now.'
                      : seats.some(seat => seat.callable) ? 'Before the vote you may call one person: tap a seat.' : 'It goes to the vote.'}
                </p>
                {hasSpeaker && heard === 0
                  ? <button type="button" className={css.lsgo} onClick={() => setHeard(1)}>SEND IT ROUND THE TABLE</button>
                  : <button type="button" className={cx(css.lsgo, !ready && css.off)} disabled={!ready} onClick={() => setResolved(0)}>PUT IT TO THE VOTE</button>}
              </div>
            )}
            {outcome && (
              <div className={css.lsfoot}>
                <p className={css.lsfootnote}>{outcome.carried ? `${outcome.message}.` : `They will not hear this again for ${STREAMING_APPROVAL_NO_WEEKS} weeks.`}</p>
                <button type="button" className={css.lsgo} onClick={onClose}>{outcome.carried ? 'DONE' : 'BACK'}</button>
              </div>
            )}
          </div>
        </div>
      </section>
    </AccessibleDialog>
  );
};

export default StreamingApprovalTable;
