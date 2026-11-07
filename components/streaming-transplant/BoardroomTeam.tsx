/**
 * #165 (plan §21.13, §21.17): the Boardroom's TEAM, the mockup made real.
 *
 *   - THE TABLE, seen from above (#182): a long walnut table, the founder at its head, three chairs a side in pairs
 *     that face each other (Marketing ↔ Content, Technology ↔ International, Money ↔ Trust). Each chair: a face, a
 *     status ring (green working, amber something waits for you, blue in training, dashed an empty chair) and a brass
 *     name plate on the table. The in-tray and the minutes lie at the table's foot.
 *   - THE IN-TRAY, pinned at the bottom: the cards your executives left for you. Each is a memo on paper ("From:
 *     Jonah Reed, Marketing"), with Approve, Change and No; Approve lands a rubber stamp and the memo slides away.
 *   - THE DOSSIER, an executive's sheet (#183), a symmetric player card: the portrait centred in its level ring, four
 *     equal stat tiles with what each does, pay and rival risk as two chips, the jobs' one-size switches (Do it, Ask me,
 *     Off), three equal limit steppers, and Train | Let go pinned at the bottom.
 *   - THE CVs, for an empty chair: three candidates in the same card language, a gold Hire, signed with a stamp.
 *   - THE MINUTES, the week's report: what the team did and why.
 *
 * Every number comes from `getStreamingTeamView`; every tap calls a service through HQ (nothing heavy on a tap).
 */
import React, { useEffect, useMemo, useState } from 'react';
import css from './presentation/screens/Boardroom/BoardroomTeam.module.css';
import { cx } from './presentation/cx';
import type {
    Gender,
    OwnedStreamingTeamCard,
    OwnedStreamingTeamReportEntry,
    OwnedStreamingTeamSeat,
    StreamingExecutiveStrategy,
    StreamingRivalResponseId,
    StreamingTeamJobId,
    StreamingTeamJobMode,
    StreamingTeamSeatId,
} from '../../types';
import type { StreamingTeamSeatView, StreamingTeamView } from '../../services/team/streamingTeam';
import { PersonFace } from './PersonFace';
import type { StreamingStepDownRole, StreamingStepDownView } from '../../services/streamingStepDown';

export interface BoardroomTeamResult { ok: boolean; message?: string; /** #180: a lower offer turned down */ refused?: boolean }

export interface BoardroomTeamActions {
    setMode: (seatId: StreamingTeamSeatId, jobId: StreamingTeamJobId, mode: StreamingTeamJobMode) => void;
    setLimits: (seatId: StreamingTeamSeatId, patch: Partial<Pick<OwnedStreamingTeamSeat, 'weeklyMoney' | 'actionMoney' | 'weeklyEnergy'>>) => void;
    /** #180: at their ask, or 15% less */
    hire: (seatId: StreamingTeamSeatId, candidateId: string, offer?: 'ASK' | 'LOWER') => BoardroomTeamResult;
    train: (seatId: StreamingTeamSeatId) => BoardroomTeamResult;
    dismiss: (seatId: StreamingTeamSeatId) => void;
    approve: (cardId: string, answer?: StreamingRivalResponseId) => BoardroomTeamResult;
    decline: (cardId: string) => void;
    /** Change: the room the card is about, to do it your way */
    change: (card: OwnedStreamingTeamCard) => void;
    /** #166: name who takes over if you step down */
    nameSuccessor: (type: 'EXECUTIVE' | 'FAMILY_HEIR', candidateId: string) => void;
    /** #191: step down (Executive Chair, or leave the board), and come back as CEO */
    stepDown?: (role: StreamingStepDownRole) => BoardroomTeamResult;
    returnAsCeo?: () => BoardroomTeamResult;
}

export type TeamSheet =
    | { kind: 'SEAT'; seatId: StreamingTeamSeatId }
    | { kind: 'HIRE'; seatId: StreamingTeamSeatId }
    | { kind: 'TRAY' }
    | { kind: 'REPORT' }
    | { kind: 'SUCCESSION' };

const money = (value: number): string => {
    const abs = Math.abs(value);
    const text = abs >= 1e9 ? `$${(abs / 1e9).toFixed(1).replace(/\.0$/, '')}B`
        : abs >= 1e6 ? `$${(abs / 1e6).toFixed(1).replace(/\.0$/, '')}M`
            : abs >= 1e3 ? `$${Math.round(abs / 1e3)}K` : `$${Math.round(abs)}`;
    return value < 0 ? `−${text}` : text;
};

const STRATEGY: Record<StreamingExecutiveStrategy, { label: string; line: string }> = {
    GROWTH_FIRST: { label: 'Growth first', line: 'Spends up to your limits' },
    MARGIN_FIRST: { label: 'Margin first', line: 'Spends carefully, asks more' },
    CREATIVE_FIRST: { label: 'Creative first', line: 'Backs the bold pick' },
    TECHNOLOGY_FIRST: { label: 'Technology first', line: 'Puts the stream first' },
    TRUST_FIRST: { label: 'Trust first', line: 'Safety before speed' },
    GLOBAL_FIRST: { label: 'Global first', line: 'Thinks in markets' },
    BALANCED: { label: 'Balanced', line: 'Weighs every side' },
};

/* #182: the long table seen from above, the founder at its head and three chairs a side in pairs that face each
   other. Rows in % of the room's height. */
const PAIRS: Array<{ y: number; seats: [StreamingTeamSeatId, StreamingTeamSeatId] }> = [
    { y: 33, seats: ['MARKETING', 'CONTENT'] },
    { y: 50, seats: ['TECHNOLOGY', 'INTERNATIONAL'] },
    { y: 67, seats: ['MONEY', 'TRUST'] },
];

const MODE_LABEL: Record<StreamingTeamJobMode, string> = { DO: 'Do it', ASK: 'Ask me', OFF: 'Off' };

const statusLine = (seat: StreamingTeamSeatView, absoluteWeek: number): string => {
    if (!seat.executive) return `Empty chair · ${seat.candidates.length} candidates`;
    if (seat.status === 'TRAINING' && seat.executive.trainingReadyAtAbsoluteWeek) {
        const weeks = Math.max(0, seat.executive.trainingReadyAtAbsoluteWeek - absoluteWeek);
        return `In training · level ${seat.executive.level + 1} in ${weeks} week${weeks === 1 ? '' : 's'}`;
    }
    const parts = [`${seat.doneThisWeek} done`];
    if (seat.waiting) parts.push(`${seat.waiting} waiting`);
    return parts.join(' · ');
};

/* ================================================================== the tab =================================== */

export const TeamTab = ({
    team, founderInitials, founderName, founderAvatar, founderGender, onOpen, stepDown,
}: {
    team: StreamingTeamView;
    /** #191: who runs the company, once you have stepped down */
    stepDown?: StreamingStepDownView | null;
    founderInitials: string;
    /** #179: the founder's own picture at the head of the table */
    founderName?: string;
    founderAvatar?: string | null;
    founderGender?: Gender | null;
    onOpen: (sheet: TeamSheet) => void;
}) => {
    const filled = team.totals.filled;
    return (
        <div className={css.team}>
            <section className={css.sec}>
                <div className={css.head}>
                    <h2>Your team</h2>
                    <span>{filled} of 6 chairs filled</span>
                </div>

                <div className={css.room} role="group" aria-label="The boardroom table">
                    <i className={css.pendant} aria-hidden="true" />
                    <div className={css.table} aria-hidden="true"><i className={css.inlay} /><i className={css.tableSheen} /></div>
                    <div className={css.founder}>
                        <span className={css.chairBack} aria-hidden="true" />
                        <span className={css.founderAv}>{founderName && (founderAvatar || founderGender) ? <PersonFace name={founderName} src={founderAvatar} gender={founderGender} /> : founderInitials}</span>
                        <span className={cx(css.plate, css.plateFounder)}>{founderName && <b>{founderName.split(' ')[0]}</b>}<small>{stepDown?.role === 'FOUNDER_EMERITUS' ? 'YOU · OFF THE BOARD' : 'YOU · CHAIR'}</small></span>
                    </div>
                    {PAIRS.flatMap((pair, row) => pair.seats.map((seatId, side) => {
                        const seat = team.seats.find(item => item.seatId === seatId);
                        if (!seat) return null;
                        const status = seat.status;
                        return (
                            <button
                                key={seat.seatId}
                                type="button"
                                className={cx(css.place, side ? css.placeRight : css.placeLeft, css[`st_${status}`])}
                                style={{ top: `${pair.y}%`, ['--i' as string]: row * 2 + side }}
                                onClick={() => onOpen(seat.executive ? { kind: 'SEAT', seatId: seat.seatId } : { kind: 'HIRE', seatId: seat.seatId })}
                                aria-label={seat.executive
                                    ? `${seat.executive.name}, ${seat.copy.label}, level ${seat.executive.level}${seat.waiting ? `, ${seat.waiting} waiting` : ''}`
                                    : `Empty ${seat.copy.label} chair, hire`}
                            >
                                <span className={css.seat}>
                                    <span className={css.chairBack} aria-hidden="true" />
                                    <span className={css.av}>
                                        {seat.executive ? <PersonFace name={seat.executive.name} gender={seat.executive.gender} /> : '+'}
                                        {seat.executive && <em className={css.lvl}>L{seat.executive.level}</em>}
                                        {seat.waiting > 0 && <b className={css.badge}>{seat.waiting}</b>}
                                        {status === 'TRAINING' && <b className={css.badgeTrain} aria-hidden="true">⏳</b>}
                                    </span>
                                </span>
                                <span className={css.plate}>
                                    <b>{seat.executive ? seat.executive.name.split(' ')[0] : 'Hire'}</b>
                                    {/* #191: the successor runs the company from their chair */}
                                    <small>{stepDown && !stepDown.ceo.you && seat.executive?.name === stepDown.ceo.name ? `CEO · ${seat.copy.label}` : seat.copy.label}</small>
                                </span>
                            </button>
                        );
                    }))}
                    {/* the in-tray and the minutes lie at the table's foot */}
                    <div className={css.desk}>
                        <button
                            type="button"
                            className={cx(css.deskItem, team.totals.waiting > 0 && css.trayFull)}
                            onClick={() => onOpen({ kind: 'TRAY' })}
                            aria-label={team.totals.waiting ? `In-tray, ${team.totals.waiting} waiting` : 'In-tray, clear'}
                        >
                            <span className={css.trayBox} aria-hidden="true">
                                {Array.from({ length: Math.min(3, team.totals.waiting) }, (_, index) => <i key={index} style={{ ['--p' as string]: index }} />)}
                            </span>
                            <span className={css.deskLabel}>{team.totals.waiting ? `${team.totals.waiting} waiting` : 'In-tray'}</span>
                        </button>
                        <button
                            type="button"
                            className={css.deskItem}
                            onClick={() => onOpen({ kind: 'REPORT' })}
                            aria-label={`Minutes, week ${team.reportCompanyWeek ?? team.companyWeek}`}
                        >
                            <span className={css.book} aria-hidden="true"><b>MINUTES</b><small>WEEK {team.reportCompanyWeek ?? team.companyWeek}</small></span>
                            <span className={css.deskLabel}>{team.totals.doneThisWeek} done</span>
                        </button>
                    </div>
                </div>
                <div className={css.key} aria-hidden="true">
                    <span><i className={css.kWork} />Working</span>
                    <span><i className={css.kWait} />Waiting for you</span>
                    <span><i className={css.kTrain} />Training</span>
                    <span><i className={css.kEmpty} />Empty</span>
                </div>
            </section>

            {/* #174: before Opening Night the weekly run waits (runStreamingTeamWeek needs a live service) */}
            {!team.live && (
                <p className={css.prelaunch}>
                    <b>Before launch</b> · Your team starts work on Opening Night. Until then no one acts or asks.
                </p>
            )}
            <section className={css.week}>
                <div><span>DONE</span><b>{team.totals.doneThisWeek}</b><small>this week</small></div>
                <div className={team.totals.waiting ? css.weekWarn : ''}><span>WAITING</span><b>{team.totals.waiting}</b><small>for you</small></div>
                <div><span>ENERGY</span><b>⚡{team.totals.energyUsed}<small>/{team.totals.energyAllowance}</small></b><small>team, this week</small></div>
            </section>
            <p className={css.floor}>
                <b>Cash floor</b> · {team.floor.weeks} weeks of costs ({money(team.floor.amount)}).
                {team.floor.hasCfo ? ' Your CFO holds anything below it.' : ' No one spends below it.'}
            </p>

            <section className={css.sec}>
                {team.seats.map(seat => (
                    <button
                        key={seat.seatId}
                        type="button"
                        className={cx(css.row, !seat.executive && css.rowEmpty)}
                        onClick={() => onOpen(seat.executive ? { kind: 'SEAT', seatId: seat.seatId } : { kind: 'HIRE', seatId: seat.seatId })}
                    >
                        <span className={cx(css.rowAv, css[`st_${seat.status}`])}>{seat.executive ? <PersonFace name={seat.executive.name} gender={seat.executive.gender} /> : '+'}</span>
                        <span className={css.rowId}>
                            <b>{seat.executive ? seat.executive.name : `${seat.copy.label} chair is empty`}</b>
                            <span>{seat.copy.label}{seat.executive ? ` · L${seat.executive.level}` : ''} · {statusLine(seat, team.absoluteWeek)}</span>
                        </span>
                        <span className={css.rowNum}>
                            {seat.executive
                                ? seat.limits.weeklyEnergy > 0 ? <em>⚡{seat.usage.energyUsed}/{seat.limits.weeklyEnergy}</em> : <em className={css.dim}>no ⚡</em>
                                : <em className={css.hireChip}>Hire · ⚡{team.hireEnergy}</em>}
                            <i aria-hidden="true">›</i>
                        </span>
                    </button>
                ))}
                {team.leftovers.length > 0 && (
                    <p className={css.leftovers}>
                        {team.leftovers.map(item => `${item.name} (${item.roleLabel})`).join(' and ')} {team.leftovers.length === 1 ? 'has' : 'have'} no chair on the new team, and move{team.leftovers.length === 1 ? 's' : ''} on at the next weekly close ({money(team.leftovers.reduce((sum, item) => sum + item.salary, 0))} a week in salaries stops).
                    </p>
                )}
            </section>

            {/* #166: succession, moved here from the Legacy office */}
            <section className={css.sec}>
                <button type="button" className={css.successor} onClick={() => onOpen({ kind: 'SUCCESSION' })}>
                    <span className={css.successorKey} aria-hidden="true">⚿</span>
                    {stepDown && !stepDown.ceo.you ? (
                        <span className={css.rowId}>
                            <span className={css.eyebrow}>CHIEF EXECUTIVE</span>
                            <b>{stepDown.ceo.name}</b>
                            <span>{stepDown.role === 'EXECUTIVE_CHAIR' ? 'You chair the board' : 'You left the board'} · come back as CEO</span>
                        </span>
                    ) : (
                        <span className={css.rowId}>
                            <span className={css.eyebrow}>IF YOU STEP DOWN</span>
                            <b>{team.succession.plan ? team.succession.plan.name : 'Nobody named'}</b>
                            <span>{team.succession.plan ? `${team.succession.plan.role} · readiness ${team.succession.plan.readiness}` : 'The board would choose for you. Name a successor.'}</span>
                        </span>
                    )}
                    <i className={css.chevron} aria-hidden="true">›</i>
                </button>
            </section>
        </div>
    );
};

/* ================================================================== the pinned bar ============================ */

export const TeamBar = ({ team, onOpen }: { team: StreamingTeamView; onOpen: (sheet: TeamSheet) => void }) => (
    <div className={css.bar}>
        <button type="button" className={cx(css.barTray, !team.totals.waiting && css.barTrayClear)} onClick={() => onOpen({ kind: 'TRAY' })}>
            <span className={css.trayIcon} aria-hidden="true"><i /><i /><i /></span>
            {team.totals.waiting ? `${team.totals.waiting} waiting` : 'In-tray clear'}
        </button>
        <button type="button" className={css.barReport} onClick={() => onOpen({ kind: 'REPORT' })}>Week's report</button>
    </div>
);

/* ================================================================== the sheets ================================ */

export const TeamSheets = ({
    team, sheet, onClose, onOpen, actions, stepDown,
}: {
    team: StreamingTeamView;
    /** #191: stepping down and coming back */
    stepDown?: StreamingStepDownView | null;
    sheet: TeamSheet | null;
    onClose: () => void;
    onOpen: (sheet: TeamSheet) => void;
    actions: BoardroomTeamActions;
}) => {
    useEffect(() => {
        if (!sheet) return undefined;
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [sheet, onClose]);
    if (!sheet) return null;
    const seat = 'seatId' in sheet ? team.seats.find(item => item.seatId === sheet.seatId) || null : null;
    return (
        <div className={css.scrim} onClick={onClose}>
            <div className={css.sheet} role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
                <span className={css.grip} aria-hidden="true" />
                <button type="button" className={css.close} onClick={onClose} aria-label="Close">✕</button>
                {sheet.kind === 'SEAT' && seat?.executive && <Dossier seat={seat} team={team} actions={actions} onClose={onClose} />}
                {sheet.kind === 'SEAT' && seat && !seat.executive && <Hire seat={seat} team={team} actions={actions} onDone={() => onOpen({ kind: 'SEAT', seatId: seat.seatId })} />}
                {sheet.kind === 'HIRE' && seat && <Hire seat={seat} team={team} actions={actions} onDone={() => onOpen({ kind: 'SEAT', seatId: seat.seatId })} />}
                {sheet.kind === 'TRAY' && <Tray team={team} actions={actions} />}
                {sheet.kind === 'REPORT' && <Minutes team={team} onTray={() => onOpen({ kind: 'TRAY' })} />}
                {sheet.kind === 'SUCCESSION' && <Succession team={team} actions={actions} stepDown={stepDown} />}
            </div>
        </div>
    );
};

/* ---- the dossier ---- */

/* #183: a stat as one of four equal tiles: its number, its bar, and what it does at our table */
const StatTile = ({ label, value, line, warn }: { label: string; value: number; line: string; warn?: boolean }) => (
    <div className={cx(css.tile, warn && css.tileWarn)}>
        <span className={css.tileLabel}>{label}</span>
        <b className={css.tileValue}>{Math.round(value)}</b>
        <i className={css.statBar}><em style={{ width: `${Math.max(0, Math.min(100, value))}%` }} className={warn ? css.warnFill : ''} /></i>
        <small className={css.tileLine}>{line}</small>
    </div>
);

/* #183: a limit as one of three equal steppers in a row */
const Stepper = ({ label, value, max, step, energy, onChange }: {
    label: string; value: number; max: number; step: number; energy?: boolean; onChange: (next: number) => void;
}) => (
    <div className={css.limit}>
        <span className={css.limitLabel}>{label}</span>
        <b className={css.limitValue}>{energy ? `⚡${value}` : money(value)}</b>
        <small className={css.limitMax}>up to {energy ? `⚡${max}` : money(max)}</small>
        <span className={css.stepper}>
            {/* steps land on round numbers: a value between steps snaps to the next one */}
            <button type="button" aria-label={`Less ${label.toLowerCase()}`} onClick={() => onChange(Math.max(0, Math.ceil(value / step) * step - step))} disabled={value <= 0}>−</button>
            <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, Math.floor(value / step) * step + step))} disabled={value >= max}>+</button>
        </span>
    </div>
);

const Dossier = ({ seat, team, actions, onClose }: {
    seat: StreamingTeamSeatView; team: StreamingTeamView; actions: BoardroomTeamActions; onClose: () => void;
}) => {
    const exec = seat.executive!;
    const [note, setNote] = useState<string | null>(null);
    const [confirmGo, setConfirmGo] = useState(false);
    const strategy = STRATEGY[exec.strategy];
    const xpFrom = 18 * (exec.level - 1);
    const xpPct = exec.level >= 5 ? 100 : Math.max(0, Math.min(100, ((exec.experience - xpFrom) / 18) * 100));
    /* a round step for the money steppers: $1M, $2M, $5M, $10M, $25M or $50M, about a fifteenth of the ceiling */
    const moneyStep = [1, 2, 5, 10, 25, 50].map(value => value * 1_000_000)
        .reduce((best, value) => (Math.abs(value - seat.caps.weeklyMoney / 15) < Math.abs(best - seat.caps.weeklyMoney / 15) ? value : best), 1_000_000);
    const training = seat.status === 'TRAINING';
    const trainWeeks = training && exec.trainingReadyAtAbsoluteWeek ? Math.max(0, exec.trainingReadyAtAbsoluteWeek - team.absoluteWeek) : 0;
    const leave = Math.round(exec.leaveChance * 100);
    const first = exec.name.split(' ')[0];
    return (
        <div className={css.dossier}>
            <div className={css.folderTab}>{exec.roleLabel.toUpperCase()}</div>
            {/* #183: a symmetric player card: the portrait in the middle, its level as the ring around it */}
            <div className={css.card}>
                <span className={cx(css.portrait, css[`st_${seat.status}`])} style={{ ['--xp' as string]: `${xpPct}%` }}>
                    <span className={css.portraitFace}><PersonFace name={exec.name} gender={exec.gender} /></span>
                    <em className={css.portraitLevel}>LEVEL {exec.level}</em>
                </span>
                <h3 className={css.cardName}>{exec.name}</h3>
                <p className={css.cardLine}>{strategy.label} · {strategy.line}</p>
                <small className={css.cardXp}>{exec.level >= 5 ? 'Top level' : `${Math.max(0, exec.experience - xpFrom)}/18 to level ${exec.level + 1}`}</small>
            </div>

            <div className={css.tiles}>
                <StatTile label="SKILL" value={exec.skill} line={exec.meaning.skill} />
                <StatTile label="LOYALTY" value={exec.loyalty} line={exec.meaning.loyalty} warn={exec.loyalty < 45} />
                <StatTile label="AMBITION" value={exec.ambition} line={exec.meaning.ambition} />
                <StatTile label="ETHICS" value={exec.ethics} line={exec.meaning.ethics} warn={exec.ethics < 45} />
            </div>
            <div className={css.chips}>
                <span className={css.chip}>
                    <small>PAY</small>
                    <b>{money(exec.salary)}<i>/wk</i></b>
                    {/* #180: their options, and how much has vested */}
                    <em>{exec.options ? `options ${exec.options.percent}%, ${Math.round(exec.options.vested * 100)}% vested` : 'no options'}</em>
                </span>
                <span className={cx(css.chip, leave > 0 && css.chipWarn)}>
                    <small>RIVAL RISK</small>
                    <b>{leave}%</b>
                    <em>{leave > 0 ? 'if a rival calls' : 'rivals rarely lure them'}</em>
                </span>
            </div>

            <h4 className={css.subhead}>Runs for you</h4>
            {seat.jobs.map(job => (
                <div key={job.id} className={cx(css.job, !job.available && css.jobOff)}>
                    <div className={css.jobId}>
                        <b>{job.label}</b>
                        <span>{job.available ? job.line : 'After the company lists'}</span>
                    </div>
                    {/* one size for every switch: a mode the job does not have leaves its slot empty */}
                    <div className={css.seg} role="radiogroup" aria-label={job.label}>
                        {(['DO', 'ASK', 'OFF'] as StreamingTeamJobMode[]).map(mode => (job.modes.includes(mode) ? (
                            <button
                                key={mode}
                                type="button"
                                role="radio"
                                aria-checked={job.mode === mode}
                                className={cx(job.mode === mode && css.segOn, job.mode === mode && css[`seg_${mode}`])}
                                disabled={!job.available}
                                onClick={() => actions.setMode(seat.seatId, job.id, mode)}
                            >{MODE_LABEL[mode]}</button>
                        ) : <span key={mode} className={css.segGap} aria-hidden="true" />))}
                    </div>
                </div>
            ))}

            {seat.seatId !== 'MONEY' && (
                <>
                    <h4 className={css.subhead}>Limits <small>by themselves, each week</small></h4>
                    <div className={css.limits}>
                        <Stepper label="Money a week" value={seat.limits.weeklyMoney} max={seat.caps.weeklyMoney} step={moneyStep}
                            onChange={next => actions.setLimits(seat.seatId, { weeklyMoney: next })} />
                        <Stepper label="Most for one" value={seat.limits.actionMoney} max={Math.min(seat.caps.actionMoney, seat.limits.weeklyMoney)} step={moneyStep}
                            onChange={next => actions.setLimits(seat.seatId, { actionMoney: next })} />
                        <Stepper label="Energy a week" value={seat.limits.weeklyEnergy} max={seat.caps.weeklyEnergy} step={5} energy
                            onChange={next => actions.setLimits(seat.seatId, { weeklyEnergy: next })} />
                    </div>
                    <p className={css.usage}>This week: {seat.usage.actionsUsed}/{seat.usage.actionsPerWeek} jobs · {money(seat.usage.moneyUsed)} · ⚡{seat.usage.energyUsed} · your energy ⚡{team.energy}</p>
                </>
            )}
            {note && <p className={css.toast} role="status">{note}</p>}

            {/* Train | Let go, pinned at the bottom, the same width */}
            <div className={css.pinned}>
                <button type="button" className={css.trainBtn} disabled={training || !seat.train} onClick={() => {
                    if (!seat.train) return;
                    const result = actions.train(seat.seatId);
                    setNote(result.ok ? `Training started: level ${seat.train.nextLevel} in ${seat.train.weeks} weeks.` : result.message || 'Could not start training.');
                }}>
                    {training ? <>In training<small>level {exec.level + 1} in {trainWeeks} wk</small></>
                        : seat.train ? <>Train to level {seat.train.nextLevel}<small>{money(seat.train.cash)} · ⚡{seat.train.energy} · {seat.train.weeks} wk</small></>
                            : <>Top level<small>nothing left to learn</small></>}
                </button>
                <button type="button" className={cx(css.letGo, confirmGo && css.letGoArmed)} onClick={() => {
                    if (!confirmGo) { setConfirmGo(true); return; }
                    actions.dismiss(seat.seatId);
                    onClose();
                }}>{confirmGo ? <>Tap again<small>to let {first} go</small></> : <>Let go<small>the chair empties</small></>}</button>
            </div>
        </div>
    );
};

/* ---- the CVs ---- */

const Hire = ({ seat, team, actions, onDone }: {
    seat: StreamingTeamSeatView; team: StreamingTeamView; actions: BoardroomTeamActions; onDone: () => void;
}) => {
    const [signed, setSigned] = useState<string | null>(null);
    const [refused, setRefused] = useState<string[]>([]);
    const [note, setNote] = useState<string | null>(null);
    const hire = (candidateId: string, offer: 'ASK' | 'LOWER') => {
        const result = actions.hire(seat.seatId, candidateId, offer);
        if (result.refused) { setRefused(current => [...current, candidateId]); setNote(result.message || 'They said no.'); return; }
        if (!result.ok) { setNote(result.message || 'That hire could not be completed.'); return; }
        setSigned(candidateId);
        setNote(result.message || null);
        window.setTimeout(onDone, 900);
    };
    return (
        <div className={css.hire}>
            <div className={css.folderTab}>HIRE · {seat.copy.title.toUpperCase()}</div>
            <h3 className={css.sheetTitle}>The {seat.copy.label} chair</h3>
            <p className={css.sheetLine}>{seat.copy.line}. Each asks for their own package; new people in {seat.nextCandidatesInWeeks} week{seat.nextCandidatesInWeeks === 1 ? '' : 's'}.</p>
            {seat.candidates.length === 0 && <p className={css.empty}>No one is looking this set. New people in {seat.nextCandidatesInWeeks} week{seat.nextCandidatesInWeeks === 1 ? '' : 's'}.</p>}
            {seat.candidates.map((candidate, index) => (
                <article key={candidate.id} className={cx(css.cv, signed === candidate.id && css.cvSigned, refused.includes(candidate.id) && css.cvGone)} style={{ ['--i' as string]: index }}>
                    <header>
                        <span className={cx(css.cvAv, css[`ring_${candidate.grade}`])}><PersonFace name={candidate.name} gender={candidate.gender} /></span>
                        <div>
                            <b>{candidate.name}</b>
                            <span>{candidate.roleLabel} · {candidate.yearsExperience} yrs · {candidate.where}</span>
                        </div>
                        <em className={css[`grade_${candidate.grade}`]}>{candidate.grade}</em>
                    </header>
                    <p className={css.cvSpec}>{candidate.specialty} · {candidate.style} · {STRATEGY[candidate.preferredStrategy].label}</p>
                    {/* #183: the same four tiles as their page */}
                    <div className={css.tiles}>
                        <StatTile label="SKILL" value={candidate.skill} line={candidate.meaning.skill} />
                        <StatTile label="LOYALTY" value={candidate.loyalty} line={candidate.meaning.loyalty} warn={candidate.loyalty < 45} />
                        <StatTile label="AMBITION" value={candidate.ambition} line={candidate.meaning.ambition} />
                        <StatTile label="ETHICS" value={candidate.ethics} line={candidate.meaning.ethics} warn={candidate.ethics < 45} />
                    </div>
                    <p className={css.cvPlus}>+ {candidate.strength}</p>
                    <p className={css.cvMinus}>− {candidate.caution}</p>
                    {/* #180: their own package, by who they are and who we are */}
                    <div className={css.ask}>
                        <span><small>PAY</small><b>{money(candidate.ask.weekly)}<i>/wk</i></b></span>
                        <span><small>TO SIGN</small><b>{money(candidate.ask.signing)}</b></span>
                        <span><small>OPTIONS</small><b>{candidate.ask.optionsPercent}%</b><i>≈ {money(candidate.ask.optionsValue)}</i></span>
                    </div>
                    <p className={css.askWhy}>{candidate.why}</p>
                    <div className={css.hireRow}>
                        <button type="button" className={css.hireBtn} disabled={Boolean(signed) || refused.includes(candidate.id)} onClick={() => hire(candidate.id, 'ASK')}>
                            Hire at their ask<small>⚡{team.hireEnergy}</small>
                        </button>
                        <button type="button" className={css.lowerBtn} disabled={Boolean(signed) || refused.includes(candidate.id)} onClick={() => hire(candidate.id, 'LOWER')}>
                            15% less<small>{Math.round(candidate.lower.chance * 100)}% say yes · ⚡{team.hireEnergy}</small>
                        </button>
                    </div>
                    {signed === candidate.id && <span className={css.stamp} aria-hidden="true">SIGNED</span>}
                    {refused.includes(candidate.id) && <span className={cx(css.stamp, css.stampNo)} aria-hidden="true">NO</span>}
                </article>
            ))}
            {note && <p className={css.toast} role="status">{note}</p>}
        </div>
    );
};

/* ---- the in-tray ---- */

const ANSWERS: Array<{ id: StreamingRivalResponseId; label: string }> = [
    { id: 'MATCH_PACKAGE', label: 'Match the package' },
    { id: 'EXPAND_MANDATE', label: 'Bigger role' },
];

/* #171: the button says what approving does: open a room, set a price, or approve at its price */
const OPEN_LABELS: Record<string, string> = {
    OWNERSHIP: 'Open the term sheet', NETWORK: 'Open Network', LOCALIZATION: 'Open Localization', ORIGINALS: 'Open the Originals desk',
};
const approveLabel = (card: OwnedStreamingTeamCard): string => {
    /* #186: the CFO's call for a round opens Raise money */
    if (card.action.kind === 'OPEN_ROOM') return card.action.focusId === 'raise' ? 'Open Raise money' : OPEN_LABELS[card.action.room] || 'Open';
    if (card.action.kind === 'PRICE_CHANGE') return `Set $${card.action.monthly.toFixed(2)}`;
    if (card.action.kind === 'RAISE') return `Give +${card.action.percent}%`;
    return `Approve${card.cost > 0 ? ` ${money(card.cost)}` : card.energy > 0 ? ` ⚡${card.energy}` : ''}`;
};

const Tray = ({ team, actions }: { team: StreamingTeamView; actions: BoardroomTeamActions }) => {
    const [ghosts, setGhosts] = useState<Array<{ card: OwnedStreamingTeamCard; stamp: 'APPROVED' | 'DECLINED' }>>([]);
    const [note, setNote] = useState<string | null>(null);
    const names = useMemo(() => new Map(team.seats.flatMap(seat => seat.executive ? [[seat.executive.appointmentId, seat.executive.name] as const] : [])), [team.seats]);
    const seatLabel = (seatId: StreamingTeamSeatId) => team.seats.find(seat => seat.seatId === seatId)?.copy.label || '';
    const leave = (card: OwnedStreamingTeamCard, stamp: 'APPROVED' | 'DECLINED') => {
        setGhosts(current => [...current, { card, stamp }]);
        window.setTimeout(() => setGhosts(current => current.filter(item => item.card.id !== card.id)), 900);
    };
    const live = team.tray.filter(card => !ghosts.some(ghost => ghost.card.id === card.id));
    const shown = [...ghosts.map(ghost => ({ card: ghost.card, stamp: ghost.stamp })), ...live.map(card => ({ card, stamp: null as null }))];
    return (
        <div className={css.trayWrap}>
            <div className={css.folderTab}>IN-TRAY · WEEK {team.companyWeek}</div>
            <h3 className={css.sheetTitle}>{live.length ? `${live.length} waiting for you` : 'Nothing waiting'}</h3>
            <p className={css.sheetLine}>Approve does what your own button does, at the same price and energy; who carries it out lands it under or over budget. A memo waits two weeks.</p>
            {shown.length === 0 && <p className={css.empty}>Your team has nothing to ask. Switch a job to Ask me and they will bring you cards.</p>}
            {shown.map(({ card, stamp }) => {
                const from = names.get(card.appointmentId) || 'Your team';
                const call = card.jobId === 'RIVAL_CALL';
                /* #168: an Original pitch reads like a script's cover page */
                const pitch = card.action.kind === 'ORIGINAL_PITCH';
                /* #181: an ambitious executive asks for a raise */
                const raise = card.action.kind === 'RAISE';
                const weeksLeft = Math.max(0, card.expiresAtAbsoluteWeek - team.absoluteWeek);
                return (
                    <article key={card.id} className={cx(css.memo, call && css.memoCall, pitch && css.memoPitch, stamp && css.memoLeaving)}>
                        <header className={css.memoHead}>
                            <span>{call ? 'URGENT CALL' : pitch ? 'PITCH · ORIGINAL' : raise ? 'PAY REVIEW' : 'MEMO'}</span>
                            <span>{weeksLeft === 0 ? 'answer this week' : `waits ${weeksLeft} week${weeksLeft === 1 ? '' : 's'}`}</span>
                        </header>
                        <p className={css.memoFrom}><b>From</b> {from}, {seatLabel(card.seatId)} · <b>To</b> You</p>
                        {pitch ? (
                            <div className={css.pitchSheet}>
                                <h4 className={css.pitchTitle}>{card.title}</h4>
                                {card.detail && <p className={css.pitchLine}>{card.detail}</p>}
                            </div>
                        ) : (
                            <>
                                <h4>{card.title}</h4>
                                {card.detail && <p className={css.memoDetail}>{card.detail}</p>}
                            </>
                        )}
                        {card.reason && <p className={css.memoWhy}><b>Why</b> {card.reason}</p>}
                        {(card.cost > 0 || card.energy > 0) && (
                            <p className={css.memoPrice}>{card.cost > 0 && <span>{money(card.cost)}</span>}{card.energy > 0 && <span>⚡{card.energy}</span>}</p>
                        )}
                        {!stamp && (call ? (
                            <div className={css.memoActions}>
                                {ANSWERS.map(answer => (
                                    <button key={answer.id} type="button" className={css.approve} onClick={() => {
                                        const result = actions.approve(card.id, answer.id);
                                        if (result.ok) leave(card, 'APPROVED'); else setNote(result.message || 'That could not be done.');
                                    }}>{answer.label}</button>
                                ))}
                                <button type="button" className={css.no} onClick={() => { actions.decline(card.id); leave(card, 'DECLINED'); }}>Let go</button>
                            </div>
                        ) : pitch ? (
                            <div className={css.memoActions}>
                                <button type="button" className={css.approve} onClick={() => {
                                    const result = actions.approve(card.id);
                                    if (result.ok) leave(card, 'APPROVED'); else setNote(result.message || 'That could not be done.');
                                }}>Take it to the desk</button>
                                <button type="button" className={css.no} onClick={() => { actions.decline(card.id); leave(card, 'DECLINED'); }}>Pass</button>
                            </div>
                        ) : (
                            <div className={css.memoActions}>
                                <button type="button" className={css.approve} onClick={() => {
                                    const result = actions.approve(card.id);
                                    if (result.ok) leave(card, 'APPROVED'); else setNote(result.message || 'That could not be done.');
                                }}>{approveLabel(card)}</button>
                                {!raise && <button type="button" className={css.change} onClick={() => actions.change(card)}>Change</button>}
                                <button type="button" className={css.no} onClick={() => { actions.decline(card.id); leave(card, 'DECLINED'); }}>No</button>
                            </div>
                        ))}
                        {stamp && <span className={cx(css.stamp, stamp === 'DECLINED' && css.stampNo)} aria-hidden="true">{pitch ? (stamp === 'APPROVED' ? 'TAKEN' : 'PASSED') : stamp}</span>}
                    </article>
                );
            })}
            {note && <p className={css.toast} role="status">{note}</p>}
        </div>
    );
};

/* ---- succession ---- */

/* #191: step down as Executive Chair or leaving the board; the successor runs the company through the team; come back
   as CEO (yours at 51%, else the board's call) */
const StepDown = ({ view, actions }: { view: StreamingStepDownView; actions: BoardroomTeamActions }) => {
    const [armed, setArmed] = useState<StreamingStepDownRole | 'RETURN' | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const act = (result: BoardroomTeamResult) => { setNote(result.message || (result.ok ? 'Done.' : 'That could not be done.')); setArmed(null); };
    if (!view.ceo.you) {
        return (
            <div className={css.stepDown}>
                <span className={css.eyebrow}>CHIEF EXECUTIVE</span>
                <b>{view.ceo.name} runs the company</b>
                <p>{view.role === 'EXECUTIVE_CHAIR' ? 'You chair the board and keep your shares.' : 'You keep your shares; you left the board.'} The team does every job it can itself.</p>
                <p className={css.stepDownWho}>{view.returnBy === 'YOURS' ? 'At 51% or more, coming back is yours to decide.' : `Under 51%, the board decides: it agrees from 60 confidence (now ${view.boardConfidence}).`}</p>
                {armed === 'RETURN' ? (
                    <div className={css.stepDownActions}>
                        <button type="button" className={css.stepDownYes} onClick={() => act(actions.returnAsCeo!())}>Come back as CEO</button>
                        <button type="button" className={css.stepDownNo} onClick={() => setArmed(null)}>Not yet</button>
                    </div>
                ) : <button type="button" className={css.stepDownBtn} onClick={() => setArmed('RETURN')}>Come back as CEO</button>}
                {note && <p className={css.toast} role="status">{note}</p>}
            </div>
        );
    }
    return (
        <div className={css.stepDown}>
            <span className={css.eyebrow}>STEP DOWN</span>
            <b>{view.successor ? `${view.successor.name} takes over` : 'Name a successor below'}</b>
            <p>They run the company through the team: every job they can do themselves, they do. The board{view.successor ? ` (and the market, once listed) react${view.successor.skill >= 60 ? 's well' : 's warily'} to them` : ' reacts to who they are'}. You can come back as CEO.</p>
            {view.stepDownBlocked ? <p className={css.stepDownWho}>{view.stepDownBlocked}</p> : armed && armed !== 'RETURN' ? (
                <div className={css.stepDownActions}>
                    <span>{armed === 'EXECUTIVE_CHAIR' ? 'Step down and chair the board?' : 'Step down and leave the board?'}</span>
                    <button type="button" className={css.stepDownYes} onClick={() => act(actions.stepDown!(armed))}>Step down</button>
                    <button type="button" className={css.stepDownNo} onClick={() => setArmed(null)}>Stay</button>
                </div>
            ) : (
                <div className={css.stepDownChoices}>
                    <button type="button" className={css.stepDownChoice} onClick={() => setArmed('EXECUTIVE_CHAIR')}><b>Executive Chair</b><span>Keep your shares and your seat</span></button>
                    <button type="button" className={css.stepDownChoice} onClick={() => setArmed('LEAVE_BOARD')}><b>Leave the board</b><span>Keep your shares only</span></button>
                </div>
            )}
            {note && <p className={css.toast} role="status">{note}</p>}
        </div>
    );
};

const Succession = ({ team, actions, stepDown }: { team: StreamingTeamView; actions: BoardroomTeamActions; stepDown?: StreamingStepDownView | null }) => (
    <div className={css.succession}>
        <div className={css.folderTab}>SUCCESSION</div>
        <h3 className={css.sheetTitle}>If you step down</h3>
        {stepDown && actions.stepDown && actions.returnAsCeo && <StepDown view={stepDown} actions={actions} />}
        {/* #191: while someone else runs the company, there is no one to name */}
        {!(stepDown && !stepDown.ceo.you) && <p className={css.sheetLine}>Name who would run the company. You keep your shares; naming someone changes nothing until you hand over.</p>}
        {!(stepDown && !stepDown.ceo.you) && team.succession.candidates.length === 0 && <p className={css.empty}>No one to name yet. Hire a team, or wait for your family to grow.</p>}
        {!(stepDown && !stepDown.ceo.you) && team.succession.candidates.map(candidate => {
            const named = team.succession.plan?.candidateId === candidate.id && team.succession.plan.type === candidate.type;
            return (
                <div key={`${candidate.type}:${candidate.id}`} className={cx(css.heir, named && css.heirNamed)}>
                    <span className={css.rowAv}><PersonFace name={candidate.name} gender={candidate.gender} /></span>
                    <span className={css.rowId}>
                        <b>{candidate.name}</b>
                        <span>{candidate.role} · {candidate.readinessNote}</span>
                        <i className={css.readiness}><em style={{ width: `${Math.max(0, Math.min(100, candidate.readinessScore))}%` }} /></i>
                    </span>
                    {named
                        ? <em className={css.namedChip}>Named</em>
                        : <button type="button" className={css.nameBtn} onClick={() => actions.nameSuccessor(candidate.type, candidate.id)}>Name · {candidate.readinessScore}</button>}
                </div>
            );
        })}
    </div>
);

/* ---- the minutes ---- */

const KIND: Record<OwnedStreamingTeamReportEntry['kind'], { label: string; tone: string }> = {
    DONE: { label: 'Done', tone: 'good' },
    APPROVED: { label: 'Approved by you', tone: 'good' },
    ASKED: { label: 'Asked you', tone: 'wait' },
    HELD: { label: 'Held: cash floor', tone: 'wait' },
    DECLINED: { label: 'You said no', tone: 'dim' },
    NOTE: { label: 'Note', tone: 'dim' },
};

const Minutes = ({ team, onTray }: { team: StreamingTeamView; onTray: () => void }) => {
    const names = new Map(team.seats.flatMap(seat => seat.executive ? [[seat.executive.appointmentId, seat.executive] as const] : []));
    const spent = team.report.reduce((sum, entry) => sum + (entry.kind === 'DONE' ? entry.cost : 0), 0);
    const energy = team.report.reduce((sum, entry) => sum + (entry.kind === 'DONE' ? entry.energy : 0), 0);
    return (
        <div className={css.minutes}>
            <div className={css.folderTab}>MINUTES · WEEK {team.reportCompanyWeek ?? team.companyWeek}</div>
            <h3 className={css.sheetTitle}>Your team this week</h3>
            <p className={css.sheetLine}>{team.report.filter(entry => entry.kind === 'DONE').length} done · {money(spent)} · ⚡{energy} · {team.totals.waiting} waiting for you</p>
            {team.report.length === 0 && <p className={css.empty}>Nothing yet. Your team reports at each weekly close.</p>}
            <ol className={css.minutesList}>
                {team.report.map(entry => {
                    const who = entry.appointmentId ? names.get(entry.appointmentId) : null;
                    const kind = KIND[entry.kind];
                    return (
                        <li key={entry.id} className={cx(css[`mk_${kind.tone}`], entry.outcome === 'GREAT' && css.mkGreat, entry.outcome === 'SLIP' && css.mkSlip)}>
                            <span className={css.minAv}>{who ? <PersonFace name={who.name} gender={who.gender} /> : '•'}</span>
                            <div>
                                <span className={css.minKind}>
                                    {kind.label}{who ? ` · ${who.name.split(' ')[0]}` : ''}
                                    {/* #181: how it turned out, when it was out of the ordinary */}
                                    {entry.outcome === 'GREAT' && <i className={css.outcome}>Great move</i>}
                                    {entry.outcome === 'SLIP' && <i className={cx(css.outcome, css.outcomeSlip)}>Slip</i>}
                                </span>
                                <b>{entry.title}</b>
                                {entry.detail && <span className={css.minWhy}>{entry.detail}</span>}
                            </div>
                            {(entry.cost > 0 || entry.energy > 0) && (
                                <em>{entry.cost > 0 ? money(entry.cost) : ''}{entry.cost > 0 && entry.energy > 0 ? ' · ' : ''}{entry.energy > 0 ? `⚡${entry.energy}` : ''}</em>
                            )}
                        </li>
                    );
                })}
            </ol>
            {team.totals.waiting > 0 && <button type="button" className={css.toTray} onClick={onTray}>Open the in-tray · {team.totals.waiting}</button>}
        </div>
    );
};
