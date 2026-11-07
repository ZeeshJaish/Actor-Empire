/*
 * #217 (plan §24): THE BOARD. Zeesh (2026-11-04): "ऑनरशिप में जो द बोर्ड सेक्शन आ रहा है ... द बोर्ड क्यों चाहिए ... बोर्ड का हटना
 * रहना भी थोड़ा सेट करना होगा। बोर्ड हम लोग जब चूज़ करें तो वहाँ भी जैसे कैसे हम लोग 3-4 ऑप्शंस मिलते हैं ... बोर्ड डिच भी कर सकते हैं".
 *
 * On OWNERSHIP, one short row: how much it trusts you, and who sits. It opens a sheet of its own: what the board is and
 * what it decides at your stake; each director with their past, their term, Renew when it is up, and Remove; and Find a
 * director: four people from the industry, a new set every 4 weeks.
 */
import React, { useEffect, useState } from 'react';
import team from './presentation/screens/Boardroom/BoardroomTeam.module.css';
import css from './presentation/screens/Boardroom/BoardroomBoard.module.css';
import { cx } from './presentation/cx';
import { CareerList } from './BoardroomTeam';
import { PersonFace } from './PersonFace';
import type { StreamingBoardDirectorView, StreamingBoardView } from '../../services/streamingBoard';

export interface BoardroomBoardActions {
    appointDirector?: (personId: string) => { ok: boolean; message?: string };
    renewDirector?: (directorId: string) => { ok: boolean; message?: string };
    removeDirector?: (directorId: string) => { ok: boolean; message?: string };
}

const money = (value: number): string => (value >= 1e6 ? `$${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(value / 1e3)}K`);
const termWords = (weeks: number | null) => {
    if (weeks === null) return 'Their seat';
    if (weeks < 52) return `${weeks} wk${weeks === 1 ? '' : 's'}`;
    const years = Math.round(weeks / 52 * 10) / 10;
    return `${String(years).replace(/\.0$/, '')} yr${years === 1 ? '' : 's'}`;
};

const Meter = ({ confidence }: { confidence: number }) => (
    <div className={css.meter} role="img" aria-label={`Board confidence ${confidence} of 100`}>
        <i className={confidence < 40 ? css.meterBad : confidence < 55 ? css.meterWarn : css.meterGood} style={{ width: `${confidence}%` }} />
        <u style={{ left: '40%' }} aria-hidden="true" />
        <u style={{ left: '55%' }} aria-hidden="true" />
    </div>
);

/** OWNERSHIP's one row */
export const BoardRow = ({ board, onOpen }: { board: StreamingBoardView; onOpen: () => void }) => (
    <button type="button" className={cx(css.row, board.termEnding && css.rowAsk)} onClick={onOpen}>
        <span className={css.rowTop}>
            <b>The board</b>
            <span className={css.faces} aria-hidden="true">
                {board.directors.slice(0, 4).map(director => <i key={director.id}><PersonFace name={director.name} gender={director.gender} /></i>)}
            </span>
            <em aria-hidden="true">›</em>
        </span>
        <Meter confidence={board.confidence} />
        <span className={css.rowFoot}>
            <span>{board.confidence}/100 confidence</span>
            <span>{board.termEnding ? `${board.termEnding.name.split(' ')[0]}'s term: ${termWords(board.termEnding.weeksLeft)} left` : `${board.directors.length} director${board.directors.length === 1 ? '' : 's'}${board.seatsLeft > 0 ? ` · ${board.seatsLeft} seat${board.seatsLeft === 1 ? '' : 's'} free` : ''}`}</span>
        </span>
    </button>
);

/* a director: their row, and on a tap their past and what you can do about them */
const Director: React.FC<{
    director: StreamingBoardDirectorView; open: boolean; onToggle: () => void; actions: BoardroomBoardActions; onNote: (note: string) => void;
}> = ({ director, open, onToggle, actions, onNote }) => {
    const [armed, setArmed] = useState(false);
    const say = (result?: { ok: boolean; message?: string }) => onNote(result?.message || (result?.ok ? 'Done.' : 'That could not be done.'));
    const asked = Boolean(director.renew);
    return (
        <div className={cx(css.director, asked && css.directorAsk)}>
            <button type="button" className={css.directorTop} aria-expanded={open} onClick={onToggle}>
                <span className={team.rowAv}><PersonFace name={director.name} gender={director.gender} /></span>
                <span className={css.who}><b>{director.name}</b><small>{director.seat} · {director.line}</small></span>
                <span className={css.term}><b>{termWords(director.weeksLeft)}</b><small>{director.weekly > 0 ? `${money(director.weekly)} a week` : 'no fee'}</small></span>
            </button>
            {director.renew && (
                <div className={css.renew}>
                    <p>Their term is up in {termWords(director.weeksLeft)}. {director.renew.line}</p>
                    {director.renew.allowed && actions.renewDirector && <button type="button" className={css.go} onClick={() => say(actions.renewDirector?.(director.id))}>Renew for 3 years</button>}
                </div>
            )}
            {open && (
                <div className={css.more}>
                    {director.career && <CareerList career={director.career} />}
                    <p className={css.line}>{director.remove.line}</p>
                    {director.remove.allowed && actions.removeDirector && (armed ? (
                        <div className={css.arm}>
                            <button type="button" className={css.removeYes} onClick={() => { say(actions.removeDirector?.(director.id)); setArmed(false); }}>Remove {director.name.split(' ')[0]}</button>
                            <button type="button" className={css.keep} onClick={() => setArmed(false)}>Keep</button>
                        </div>
                    ) : <button type="button" className={css.remove} onClick={() => setArmed(true)}>Remove from the board</button>)}
                </div>
            )}
        </div>
    );
};

export const BoardSheet = ({ board, actions, onClose }: { board: StreamingBoardView; actions: BoardroomBoardActions; onClose: () => void }) => {
    const [openId, setOpenId] = useState<string | null>(null);
    const [finding, setFinding] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    const weeks = `${board.nextInWeeks} week${board.nextInWeeks === 1 ? '' : 's'}`;
    return (
        <div className={team.scrim} onClick={onClose}>
            <div className={team.sheet} role="dialog" aria-modal="true" aria-label="The board" onClick={event => event.stopPropagation()}>
                <span className={team.grip} aria-hidden="true" />
                <div className={team.sheetBar}><button type="button" className={team.close} onClick={onClose} aria-label="Close">✕</button></div>
                <div className={team.folderTab}>THE BOARD</div>
                <h3 className={team.sheetTitle}>Who watches the company</h3>
                <p className={team.sheetLine}>Your team runs the company. The board sits over them for the shareholders.</p>

                <div className={css.confidence}>
                    <div className={css.confidenceTop}><b>{board.confidence}<small>/100</small></b><span>{board.line}</span></div>
                    <Meter confidence={board.confidence} />
                    <ul className={css.about}>{board.about.map(line => <li key={line}>{line}</li>)}</ul>
                </div>

                <h4 className={team.subhead}>Who sits on it</h4>
                {board.directors.length === 0 && <p className={team.empty}>Nobody yet.</p>}
                {board.directors.map(director => (
                    <Director key={director.id} director={director} open={openId === director.id} onToggle={() => setOpenId(openId === director.id ? null : director.id)} actions={actions} onNote={setNote} />
                ))}
                {note && <p className={css.toast} role="status">{note}</p>}

                <h4 className={team.subhead}>Independent seats · {board.seats - board.seatsLeft} of {board.seats}</h4>
                {board.seatsLeft === 0 && <p className={css.line}>All {board.seats} are taken. Remove someone to make room.</p>}
                {board.seatsLeft > 0 && actions.appointDirector && !finding && (
                    <button type="button" className={css.find} onClick={() => setFinding(true)}>Find a director<small>{board.candidates.length} people · new ones in {weeks}</small></button>
                )}
                {board.seatsLeft > 0 && finding && (
                    <div className={css.people}>
                        {board.candidates.length === 0 && <p className={team.empty}>Nobody is free right now. New people in {weeks}.</p>}
                        {board.candidates.map(person => (
                            <article key={person.id} className={css.person}>
                                <header>
                                    <span className={team.rowAv}><PersonFace name={person.name} gender={person.gender} /></span>
                                    <span className={css.who}><b>{person.name}</b><small>{person.line}</small></span>
                                    <em className={cx(css.grade, person.grade === 'STAR' && css.gradeStar)}>{person.grade}</em>
                                </header>
                                <CareerList career={person.career} />
                                <div className={css.facts}>
                                    <span><small>BRINGS</small><b>+{person.adds}</b><i>confidence</i></span>
                                    <span><small>FEE</small><b>{money(person.weekly)}</b><i>a week</i></span>
                                    <span><small>TERM</small><b>3</b><i>years</i></span>
                                </div>
                                <button type="button" className={css.go} onClick={() => {
                                    const result = actions.appointDirector?.(person.id);
                                    setNote(result?.message || (result?.ok ? 'Done.' : 'That could not be done.'));
                                    if (result?.ok) setFinding(false);
                                }}>Appoint {person.name.split(' ')[0]} · ⚡{board.energy}</button>
                            </article>
                        ))}
                        <p className={css.line}>Senior people from the industry. A new set in {weeks}.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
