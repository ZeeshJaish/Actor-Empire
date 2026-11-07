/*
 * #173 (plan §21.17): MARKETS, the IPO in this update.
 *
 *   Before listing: THE ROAD TO THE BELL, the six gates as steps on a rail, each with the room that clears it (two are
 *   musts); YOUR LISTING, your symbol on an exchange plate (#215: tap it to choose) and what a 10–30% float would raise
 *   and leave you (#189: chosen in the listing's ask); RING THE BELL (25⚡), which opens the listing (a listing under way resumes for
 *   nothing).
 *   After listing: the price and its line, the market's value and your stake's; the quarter's guidance and who set it;
 *   the last report with its optional earnings call (10⚡); the open shareholder vote as a ballot that closes on its
 *   week (unanswered, the public decides); the last result.
 *
 * #188 (plan §22.3 point 12): the one home for the stock; the old Public markets desk is gone. The line carries what
 * a share is worth (dashed) and this week's reasons; THE NEXT REPORT holds the promise (three kinds, each showing
 * what it would set) or the one made; THE REGISTER shows who holds the shares; EARLIER keeps the past reports and
 * votes, folded.
 */
import React, { useState } from 'react';
import css from './presentation/screens/Boardroom/BoardroomMarkets.module.css';
import { cx } from './presentation/cx';
import type { StreamingGuidanceTone } from '../../types';
import type { StreamingListingDeskView, StreamingListingRoom } from '../../services/streamingListingDesk';
import { STREAMING_TICKER_MAX, STREAMING_TICKER_MIN, cleanStreamingTicker } from '../../services/streamingTicker';
import { streamingTickerOptions } from './streamingIpoPresentationModel';

export interface BoardroomMarketsActions {
    ringBell: () => { ok: boolean; message?: string };
    /** #215: your name on the stock market */
    setTicker?: (ticker: string) => { ok: boolean; message?: string };
    holdCall: () => { ok: boolean; message?: string };
    vote: (voteId: string, choice: 'FOR' | 'AGAINST') => { ok: boolean; message?: string };
    /** #188: the promise for the next report */
    promise: (tone: StreamingGuidanceTone) => { ok: boolean; message?: string };
    openRoom: (room: StreamingListingRoom) => void;
    /** #209: what a share pays each quarter */
    setDividend?: (perShareQuarter: number) => { ok: boolean; message?: string };
}

/* #209: the dividend: what a share pays each quarter, changed whenever you like; a raise lifts the price, a cut hurts it */
const Dividend = ({ dividend, onSet }: { dividend: NonNullable<StreamingListingDeskView['dividend']>; onSet: (perShare: number) => { ok: boolean; message?: string } }) => {
    const [perShareNow, setPerShareNow] = useState(dividend.perShare);
    const [note, setNote] = useState<string | null>(null);
    const step = dividend.price >= 20 ? 0.05 : 0.01;
    const yearly = dividend.price > 0 ? Math.round(perShareNow * 4 / dividend.price * 1000) / 10 : 0;
    const cost = perShareNow * dividend.shares;
    const changed = Math.abs(perShareNow - dividend.perShare) > 0.0001;
    return (
        <section className={css.sec}>
            <div className={css.head}><h2>The dividend</h2><span>{dividend.perShare > 0 ? `next in ${dividend.nextInWeeks} week${dividend.nextInWeeks === 1 ? '' : 's'}` : 'none yet'}</span></div>
            <div className={css.card}>
                <div className={css.dividendRow}>
                    <button type="button" aria-label="A smaller dividend" disabled={perShareNow <= 0 || !dividend.canSet} onClick={() => setPerShareNow(Math.max(0, Math.round((perShareNow - step) * 100) / 100))}>−</button>
                    <div className={css.dividendValue}><b>${perShareNow.toFixed(2)}</b><small>a share, each quarter</small></div>
                    <button type="button" aria-label="A bigger dividend" disabled={!dividend.canSet} onClick={() => setPerShareNow(Math.round((perShareNow + step) * 100) / 100)}>+</button>
                </div>
                <div className={css.dividendFacts}>
                    <span><small>A YEAR</small><b>{yearly}%</b></span>
                    <span><small>A QUARTER</small><b>{money(cost)}</b></span>
                    <span><small>TO YOU</small><b>{money(cost * dividend.yourShare)}</b></span>
                </div>
                {dividend.canSet && <button type="button" className={css.dividendGo} disabled={!changed} onClick={() => {
                    const result = onSet(perShareNow);
                    setNote(result.message || (result.ok ? 'Done.' : 'That could not be done.'));
                }}>{changed ? (perShareNow > dividend.perShare ? 'Raise the dividend' : perShareNow > 0 ? 'Cut the dividend' : 'End the dividend') : 'The dividend now'}</button>}
                <p className={css.fine}>{dividend.line}</p>
                {note && <p className={css.fine}>{note}</p>}
            </div>
        </section>
    );
};

const money = (value: number): string => {
    const abs = Math.abs(value);
    const text = abs >= 1e9 ? `$${(abs / 1e9).toFixed(1).replace(/\.0$/, '')}B` : abs >= 1e6 ? `$${(abs / 1e6).toFixed(1).replace(/\.0$/, '')}M` : abs >= 500 ? `$${Math.round(abs / 1e3)}K` : '$0';
    return value < 0 ? `−${text}` : text;
};
const people = (value: number) => (value >= 1e6 ? `${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `${Math.round(value / 1e3)}K`);
const shareCount = (value: number) => (value >= 1e9 ? `${(value / 1e9).toFixed(2)}B` : value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : `${Math.round(value / 1e3)}K`);
const perShare = (value: number) => `$${value >= 100 ? value.toFixed(0) : value.toFixed(2)}`;
const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1).replace(/\.0$/, '')}%`;
const ROOM_WORDS: Record<StreamingListingRoom, string> = { MONEY: 'Money', TEAM: 'Team', OWNERSHIP: 'Ownership', AUDIENCE: 'Audience', STATUS: 'Status' };
const TONE_WORDS: Record<string, string> = { CONSERVATIVE: 'Conservative', BALANCED: 'Balanced', AMBITIOUS: 'Ambitious' };

const Bell = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /><path d="M12 3v2" />
    </svg>
);

/** the exchange's plate: letters lit like a ticker board */
const Plate = ({ ticker, sub }: { ticker: string; sub?: string }) => (
    <div className={css.plate}>
        <span className={css.plateLed}>{ticker.split('').map((letter, index) => <i key={index}>{letter}</i>)}</span>
        {sub && <span className={css.plateSub}>{sub}</span>}
    </div>
);

/** #215: the plate is yours to change until the listing begins: a tap, its suggestions, or your own letters */
const TickerChoice = ({ ticker, from, onSet }: { ticker: string; from: string; onSet: (ticker: string) => { ok: boolean; message?: string } }) => {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState('');
    const [note, setNote] = useState<string | null>(null);
    const options = [...new Set([ticker, ...streamingTickerOptions(from)])].slice(0, 4);
    const use = (value: string) => {
        const result = onSet(value);
        if (!result.ok) { setNote(result.message || 'That could not be used.'); return; }
        setDraft('');
        setNote(null);
        setOpen(false);
    };
    return (
        <>
            <button type="button" className={css.tickerBtn} aria-expanded={open} aria-label={`Your stock symbol is ${ticker}. Change it`} onClick={() => { setOpen(!open); setNote(null); }}>
                <Plate ticker={ticker} sub="EMPIRE EXCHANGE" />
                <span className={css.tickerWords}><b>Your name on the stock market</b><small>{open ? 'Pick one, or write your own' : 'Tap to change it'}</small></span>
            </button>
            {open && (
                <div className={css.tickerPick}>
                    <div className={css.tickerChips}>
                        {options.map(option => <button type="button" key={option} className={cx(css.tickerChip, option === ticker && css.tickerChipOn)} onClick={() => use(option)}>{option}</button>)}
                    </div>
                    <div className={css.tickerOwn}>
                        <input
                            aria-label="Your own stock symbol"
                            placeholder={`${STREAMING_TICKER_MIN} to ${STREAMING_TICKER_MAX} letters`}
                            maxLength={STREAMING_TICKER_MAX}
                            value={draft}
                            onChange={event => { setDraft(cleanStreamingTicker(event.target.value)); setNote(null); }}
                            onKeyDown={event => { if (event.key === 'Enter' && draft.length >= STREAMING_TICKER_MIN) use(draft); }}
                        />
                        <button type="button" disabled={draft.length < STREAMING_TICKER_MIN} onClick={() => use(draft)}>Use it</button>
                    </div>
                    {note && <p className={css.tickerNote} role="status">{note}</p>}
                </div>
            )}
        </>
    );
};

/** the price's line; #188: with what a share is worth as a dashed line */
const Line = ({ values, up, worth }: { values: number[]; up: boolean; worth?: number }) => {
    if (values.length < 2) return null;
    const min = Math.min(...values, worth ?? Infinity);
    const max = Math.max(...values, worth ?? -Infinity);
    const range = Math.max(0.01, max - min);
    const y = (value: number) => (36 - (value - min) / range * 32 - 2).toFixed(2);
    const points = values.map((value, index) => `${(index / (values.length - 1) * 100).toFixed(2)},${y(value)}`).join(' ');
    return (
        <svg className={cx(css.line, up ? css.lineUp : css.lineDown)} viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
            {worth !== undefined && <line className={css.worthLine} x1="0" x2="100" y1={y(worth)} y2={y(worth)} />}
            <polyline points={points} />
        </svg>
    );
};

export const BoardroomMarkets = ({ view, actions }: { view: StreamingListingDeskView; actions: BoardroomMarketsActions }) => {
    const [note, setNote] = useState<string | null>(null);
    const [voted, setVoted] = useState<'FOR' | 'AGAINST' | null>(null);
    const [promise, setPromise] = useState<StreamingGuidanceTone | null>(null);
    const [showEarlier, setShowEarlier] = useState(false);

    if (!view.listed) {
        const musts = view.gates.filter(gate => gate.hardGate);
        /* the bell needs every must and four steps in all */
        const needed = Math.max(4 - view.cleared, musts.filter(gate => !gate.passed).length, 1);
        return (
            <div className={css.markets}>
                <section className={css.sec}>
                    <div className={css.head}><h2>The road to the bell</h2><span>{view.cleared} of {view.gates.length} cleared</span></div>
                    <p className={css.lead}>Going public is optional. The bell needs the {musts.length} musts and four steps in all; each step names the room that clears it.</p>
                    <ol className={css.rail}>
                        {view.gates.map((gate, index) => (
                            <li key={gate.id} className={cx(css.step, gate.passed && css.stepDone)} style={{ ['--i' as string]: index } as React.CSSProperties}>
                                <i className={css.node} aria-hidden="true">{gate.passed ? '✓' : index + 1}</i>
                                <div className={css.stepBody}>
                                    <b>{gate.label}</b>
                                    <span>{gate.hardGate && <em className={css.must}>MUST</em>}{gate.passed ? gate.value : gate.requirement}</span>
                                    {!gate.passed && <small>Cleared by {gate.where}</small>}
                                </div>
                                <button type="button" className={css.roomChip} onClick={() => actions.openRoom(gate.room)} aria-label={`Open ${ROOM_WORDS[gate.room]}`}>
                                    {ROOM_WORDS[gate.room]} ›
                                </button>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className={css.sec}>
                    <div className={css.head}><h2>Your listing</h2><span>worth about {money(view.valuation)}</span></div>
                    <div className={css.listing}>
                        {view.tickerFrom && actions.setTicker
                            ? <TickerChoice ticker={view.ticker} from={view.tickerFrom} onSet={actions.setTicker} />
                            : <Plate ticker={view.ticker} sub={view.resume ? 'EMPIRE EXCHANGE · IN THE LISTING' : 'EMPIRE EXCHANGE'} />}
                        {/* #189: the price and how much you sell are chosen in the listing's ask */}
                        <div className={css.readouts}>
                            <div><span>{view.range.low.percent}–{view.range.high.percent}% RAISES</span><b className={css.rangeB}>{money(view.range.low.raise)}–{money(view.range.high.raise)}</b></div>
                            <div><span>YOU KEEP</span><b className={css.rangeB}>{view.range.high.keep}–{view.range.low.keep}%</b></div>
                        </div>
                        <p className={css.fine}>In the listing you choose what we are worth and how much to sell. New shares sell a little under what we are worth. Under 51% the board can outvote you.</p>
                    </div>
                    <button type="button" className={cx(css.bell, !view.ready && css.bellLocked)} disabled={!view.ready} onClick={() => {
                        const result = actions.ringBell();
                        if (!result.ok) setNote(result.message || 'The listing could not begin.');
                    }}>
                        <span className={css.bellIcon}><Bell /></span>
                        <span className={css.bellText}>
                            <b>{view.resume ? 'Back to the listing' : 'Ring the bell'}</b>
                            <small>{view.ready ? view.resume ? 'Your listing is under way' : 'Opens the listing: the ask, scrutiny, the offer, the market, public life' : `Clear ${needed} more step${needed === 1 ? '' : 's'} first`}</small>
                        </span>
                        {!view.resume && <span className={css.bellCost}>⚡{view.bellEnergy}</span>}
                    </button>
                    {note && <p className={css.toast} role="status">{note}</p>}
                </section>
            </div>
        );
    }

    const share = view.share!;
    const up = share.changePercent >= 0;
    const gap = share.valuePerShare > 0 ? (share.price / share.valuePerShare - 1) * 100 : 0;
    const register = view.register;
    const othersShares = register ? Math.max(0, register.sharesOutstanding - register.founderShares - register.publicShares) : 0;
    const promised = view.guidanceOptions.find(option => option.tone === promise) || null;
    const earlier = [view.history.length ? `${view.history.length} report${view.history.length === 1 ? '' : 's'}` : '', view.pastVotes.length ? `${view.pastVotes.length} vote${view.pastVotes.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');
    return (
        <div className={css.markets}>
            <section className={css.sec}>
                <div className={css.quote}>
                    <Plate ticker={share.ticker} sub="EMPIRE EXCHANGE" />
                    <div className={css.price}>
                        <b>${share.price.toFixed(2)}</b>
                        <em className={up ? css.up : css.down}>{up ? '▲' : '▼'} {Math.abs(share.changePercent).toFixed(2)}%</em>
                    </div>
                </div>
                <Line values={share.history} up={up} worth={share.valuePerShare} />
                <div className={css.lineKey}>
                    <span>{share.history.length} weeks</span>
                    <span className={css.worthKey}>- - a share is worth {perShare(share.valuePerShare)} · {Math.abs(gap) < 1 ? 'priced at its value' : `priced ${Math.round(Math.abs(gap))}% ${gap > 0 ? 'above' : 'below'}`}</span>
                </div>
                {share.drivers.length > 0 && (
                    <div className={css.drivers} aria-label="Why the price moved this week">
                        {share.drivers.map(driver => <span key={driver}>{driver}</span>)}
                    </div>
                )}
                <div className={css.tiles}>
                    <div><span>MARKET VALUE</span><b>{money(share.marketCap)}</b></div>
                    <div><span>YOUR STAKE</span><b>{share.stakePercent.toFixed(1)}%</b><small>{money(share.stakeValue)}</small></div>
                </div>
            </section>

            {view.dividend && actions.setDividend && <Dividend dividend={view.dividend} onSet={actions.setDividend} />}

            <section className={css.sec}>
                <div className={css.head}><h2>The next report</h2><span>{view.nextReportInWeeks === 0 ? 'this week' : `in ${view.nextReportInWeeks} week${view.nextReportInWeeks === 1 ? '' : 's'}`}</span></div>
                {view.guidance ? (
                    <div className={css.card}>
                        <span className={css.eyebrow}>QUARTER {view.guidance.cycleNumber} · YOUR PROMISE · {(TONE_WORDS[view.guidance.tone] || view.guidance.tone).toUpperCase()}</span>
                        <div className={css.targets}>
                            <div><span>MEMBERS</span><b>{people(view.guidance.subscriberTarget)}</b></div>
                            <div><span>PLAN REVENUE</span><b>{money(view.guidance.revenueTarget)}</b></div>
                            <div><span>NET CASH</span><b>{money(view.guidance.cashTarget)}</b></div>
                            <div><span>PLAYBACK</span><b>{view.guidance.playbackTarget.toFixed(2)}%</b></div>
                        </div>
                        <span>Set by {view.guidance.setBy || 'you'}. The report is scored against it.</span>
                    </div>
                ) : view.guidanceOptions.length > 0 && (
                    <div className={css.promise}>
                        <p className={css.lead}>Promise the market a number. The report is scored against it; with no promise, against the trend.</p>
                        <div className={css.tones} role="radiogroup" aria-label="Your promise">
                            {view.guidanceOptions.map(option => (
                                <button key={option.tone} type="button" role="radio" aria-checked={promise === option.tone}
                                    className={cx(css.tone, promise === option.tone && css.toneOn)} onClick={() => setPromise(option.tone)}>
                                    <span className={css.toneName}>{option.label}</span>
                                    <b>{people(option.subscriberTarget)}</b><small>members</small>
                                    <b>{money(option.revenueTarget)}</b><small>plan revenue</small>
                                    <em>{option.risk}</em>
                                </button>
                            ))}
                        </div>
                        <button type="button" className={css.promiseBtn} disabled={!promised} onClick={() => {
                            if (!promised) return;
                            const result = actions.promise(promised.tone);
                            setNote(result.ok ? `${promised.label} promise made: the next report is scored against it.` : result.message || 'The promise could not be made.');
                            if (result.ok) setPromise(null);
                        }}>
                            {promised ? `Promise: ${promised.label}` : 'Choose a promise'}
                        </button>
                    </div>
                )}
                {view.report && (
                    <div className={cx(css.card, css[`report${view.report.outcome}`])}>
                        <span className={css.eyebrow}>QUARTER {view.report.cycleNumber} REPORT · {view.report.weeksAgo === 0 ? 'THIS WEEK' : `${view.report.weeksAgo} WK AGO`}</span>
                        <b><em className={css.verdict}>{view.report.outcome}</em> {view.report.headline}</b>
                        <span>Score {Math.round(view.report.score)} · the price moved {signed(view.report.reactionPercent)}</span>
                        {view.report.call === 'AVAILABLE' && (
                            <button type="button" className={css.callBtn} onClick={() => {
                                const result = actions.holdCall();
                                setNote(result.ok ? (view.report!.outcome === 'MISS' ? 'Call held: it softens the miss at the next quote.' : 'Call held: it lifts the price at the next quote.') : result.message || 'The call could not be held.');
                            }}>
                                Hold the earnings call <i>⚡{view.report.callEnergy}</i>
                            </button>
                        )}
                        {view.report.call === 'HELD' && <small className={css.called}>Call held{view.report.callEffectPercent !== null ? `: ${signed(view.report.callEffectPercent)} at the next quote` : ''}.</small>}
                    </div>
                )}
            </section>

            {view.vote && (
                <section className={css.sec}>
                    <div className={css.ballot}>
                        <header><span>SHAREHOLDER VOTE</span><span>{view.vote.dueInWeeks === 0 ? 'closes this week' : `closes in ${view.vote.dueInWeeks} week${view.vote.dueInWeeks === 1 ? '' : 's'}`}</span></header>
                        <b>{view.vote.title}</b>
                        <p>{view.vote.summary}</p>
                        <div className={css.support}>
                            <i><em style={{ width: `${view.vote.support}%` }} /><u style={{ left: '50%' }} /></i>
                            <span>Institutions {Math.round(view.vote.support)}% for · your {view.vote.founderPercent.toFixed(0)}% {view.vote.founderPercent > 50 ? 'decides it' : 'weighs in'}</span>
                        </div>
                        <small>Unanswered by its week, the public decides.</small>
                        {voted ? <span className={cx(css.stamp, voted === 'AGAINST' && css.stampNo)} aria-hidden="true">{voted === 'FOR' ? 'FOR' : 'AGAINST'}</span> : (
                            <div className={css.ballotActions}>
                                {(['FOR', 'AGAINST'] as const).map(choice => (
                                    <button key={choice} type="button" className={choice === 'FOR' ? css.for : css.against} onClick={() => {
                                        const result = actions.vote(view.vote!.id, choice);
                                        if (result.ok) setVoted(choice); else setNote(result.message || 'The vote could not be cast.');
                                    }}>{choice === 'FOR' ? 'Vote for' : 'Vote against'}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}
            {view.lastVote && (
                <p className={css.lastVote}>
                    <b>{view.lastVote.title}</b> {view.lastVote.passed ? 'passed' : 'failed'}{view.lastVote.support !== null ? ` (${Math.round(view.lastVote.support)}%)` : ''}{view.lastVote.decidedBy === 'PUBLIC' ? ': the public decided' : ''}. {view.lastVote.consequence}
                </p>
            )}

            {register && (
                <section className={css.sec}>
                    <div className={css.head}><h2>The register</h2><span>{shareCount(register.sharesOutstanding)} shares</span></div>
                    <div className={css.register}>
                        <i className={css.regBar} aria-hidden="true">
                            <em className={css.regYou} style={{ width: `${share.stakePercent}%` }} />
                            <em className={css.regOthers} style={{ width: `${register.othersPercent}%` }} />
                            <em className={css.regPublic} style={{ width: `${register.publicPercent}%` }} />
                        </i>
                        <ul className={css.regRows}>
                            <li><i className={css.regYou} /><b>You</b><span>{shareCount(register.founderShares)} · {money(register.founderValue)}</span><em>{share.stakePercent.toFixed(1)}%</em></li>
                            {register.othersPercent > 0 && <li><i className={css.regOthers} /><b>Investors and the team</b><span>{shareCount(othersShares)}</span><em>{register.othersPercent.toFixed(1)}%</em></li>}
                            <li><i className={css.regPublic} /><b>The public</b><span>{shareCount(register.publicShares)} · traded each week</span><em>{register.publicPercent.toFixed(1)}%</em></li>
                        </ul>
                    </div>
                    <button type="button" className={cx(css.roomChip, css.regChip)} onClick={() => actions.openRoom('OWNERSHIP')}>Buy back shares · Ownership ›</button>
                    <p className={css.fine}>Your own shares trade in the phone's Stocks app, with your own money.</p>
                </section>
            )}

            {earlier && (
                <section className={css.sec}>
                    <button type="button" className={css.earlier} aria-expanded={showEarlier} onClick={() => setShowEarlier(open => !open)}>
                        <span><b>Earlier</b><small>{earlier}</small></span><i aria-hidden="true">{showEarlier ? '−' : '+'}</i>
                    </button>
                    {showEarlier && (
                        <ul className={css.past}>
                            {view.history.map(item => (
                                <li key={`report-${item.cycleNumber}`} className={css[`report${item.outcome}`]}>
                                    <em className={css.verdict}>{item.outcome}</em>
                                    <span><b>Quarter {item.cycleNumber}</b> {item.headline}</span>
                                    <i className={item.reactionPercent >= 0 ? css.up : css.down}>{signed(item.reactionPercent)}</i>
                                </li>
                            ))}
                            {view.pastVotes.map((item, index) => (
                                <li key={`vote-${index}`}>
                                    <em className={cx(css.verdict, item.passed ? css.votePassed : css.voteFailed)}>{item.passed ? 'PASSED' : 'FAILED'}</em>
                                    <span><b>{item.title}</b>{item.support !== null ? ` ${Math.round(item.support)}% for` : ''}{item.founderVote ? `; you voted ${item.founderVote === 'FOR' ? 'for' : 'against'}` : ''}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}
            {note && <p className={css.toast} role="status">{note}</p>}
        </div>
    );
};
