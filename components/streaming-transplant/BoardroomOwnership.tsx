/*
 * #172 (plan §21.17): OWNERSHIP, the Boardroom's cap table and the deals on it.
 *
 *   - WHO OWNS IT: one bar, a segment each, then a row each: a face, who they are, their stake, their seat, their share
 *     of profit, what they put in and when.
 *   - ON THE TABLE: each investor's offer as a term sheet (the terms with their dotted leaders, what they ask, what it
 *     brings, what to watch, your stake before and after, the CFO's read), signed on its line: Sign draws a signature,
 *     stamps SIGNED and puts the money in the treasury; Decline stamps it. A sheet that cannot be signed says why.
 *   #175: your own money and the bank are in Studio Finance › Capital, not here.
 *   #186: RAISE MONEY: what investors will read (five checks), and three rounds to call (Small, Growth, Big, each with
 *   what it may sell, about what it raises, what you keep, and its energy); while a round runs, the bankers' card; its
 *   offers are the term sheets on the table.
 *   #187: while private, an investor's row offers Buy out (their stake at our value × their premium, from the
 *   treasury); once listed, BUY BACK SHARES (1, 2, 5 or 10% within the year's 10%, over 4 weeks).
 */
import React, { useState } from 'react';
import css from './presentation/screens/Boardroom/BoardroomOwnership.module.css';
import { cx } from './presentation/cx';
import type { StreamingOwnershipHolder, StreamingOwnershipView, StreamingTermSheet } from '../../services/streamingInvestorOffers';
import type { Gender, OwnedStreamingSaleBid, StreamingInvestorRoundSize } from '../../types';
import type { StreamingSaleView } from '../../services/streamingCompanySale';
import { PersonFace } from './PersonFace';

export interface BoardroomOwnershipActions {
    sign: (offerId: string) => { ok: boolean; message?: string };
    decline: (offerId: string) => void;
    /** #186: call a round */
    callRound: (size: StreamingInvestorRoundSize) => { ok: boolean; message?: string };
    /** #187: buy an investor out (private); buy back shares (listed) */
    buyOut: (holderId: string) => { ok: boolean; message?: string };
    startBuyback: (percent: number) => { ok: boolean; message?: string };
    /** #190: sell the company */
    hireBankers?: () => { ok: boolean; message?: string };
    acceptBid?: (bidId: string) => { ok: boolean; message?: string };
    rejectBids?: () => { ok: boolean; message?: string };
}

const money = (value: number): string => {
    const abs = Math.abs(value);
    return abs >= 1e9 ? `$${(abs / 1e9).toFixed(1).replace(/\.0$/, '')}B` : abs >= 1e6 ? `$${(abs / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(abs / 1e3)}K`;
};
const percent = (value: number) => `${(Math.round(value * 10) / 10).toString()}%`;
/* a small tile's price, one line at 320: $70M, $350M, $1.4B */
const shortMoney = (value: number) => (value >= 1e9 || value < 1e8 ? money(value) : `$${Math.round(value / 1e6)}M`);

/* the cap table's colours: you in the brand's own, investors in a fixed order */
const TONES = ['#d9b25f', '#5aa9e6', '#b48cf2', '#56c596', '#f08a5d', '#7f8ea3', '#e66a9a'];

const KindIcon = ({ kind }: { kind: StreamingOwnershipHolder['kind'] }) => {
    const paths: Record<string, React.ReactNode> = {
        CELEBRITY: <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z" />,
        FUND: <><path d="M4 20V9l8-5 8 5v11" /><path d="M9 20v-6h6v6" /></>,
        FAMILY: <path d="M4 18h16M5 18l-1-9 5 4 3-6 3 6 5-4-1 9" />,
        SOVEREIGN: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16" /></>,
        FOUNDER: <path d="M12 3c3 2 5 6 5 10l-2 3H9l-2-3c0-4 2-8 5-10zM9 16l-2 4M15 16l2 4" />,
        PUBLIC: <path d="M4 19h16M6 16V9M10 16V6M14 16v-5M18 16V8" />,
        YOU: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
        TEAM: <><circle cx="9" cy="9" r="3" /><circle cx="16" cy="10" r="2.5" /><path d="M3 19c1-3 3.5-5 6-5s5 2 6 5M14 15c2.5 0 5 1.5 6 4" /></>,
    };
    return (
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {paths[kind] || paths.FUND}
        </svg>
    );
};

const Face = ({ initials, tone, kind, big, name, gender, src }: {
    initials: string; tone: string; kind: StreamingOwnershipHolder['kind']; big?: boolean;
    /* #179: a person's portrait (the founder's own picture, an investor of the industry); firms keep their initials */
    name?: string; gender?: Gender | null; src?: string | null;
}) => (
    /* the public's face is its ticker, whole */
    <span className={cx(css.face, big && css.faceBig, kind === 'PUBLIC' && css.faceTicker)} style={{ ['--tone' as string]: tone } as React.CSSProperties}>
        {name && (gender || src) ? <PersonFace name={name} gender={gender} src={src} /> : initials}
        <i className={css.kind}><KindIcon kind={kind} /></i>
    </span>
);

const KIND_WORDS: Record<StreamingOwnershipHolder['kind'], string> = {
    YOU: 'Founder', PUBLIC: 'Public', TEAM: 'Team options', CELEBRITY: 'Celebrity', FUND: 'Fund', FAMILY: 'Family office', SOVEREIGN: 'Sovereign fund', FOUNDER: 'Founder investor',
};

/* ── a term sheet ── */
interface TermSheetProps {
    sheet: StreamingTermSheet; founderPercent: number; founderName: string; cfoName: string | null; actions: BoardroomOwnershipActions; onGone: (message: string) => void;
}
const TermSheet: React.FC<TermSheetProps> = ({ sheet, founderPercent, founderName, cfoName, actions, onGone }) => {
    const [stage, setStage] = useState<'OPEN' | 'SIGNING' | 'SIGNED' | 'DECLINED'>('OPEN');
    const [note, setNote] = useState<string | null>(null);
    const sign = () => {
        if (!sheet.canSign || stage !== 'OPEN') return;
        setStage('SIGNING');
        /* the pen crosses the line first; then the deal is done */
        window.setTimeout(() => {
            const result = actions.sign(sheet.id);
            if (!result.ok) { setStage('OPEN'); setNote(result.message || 'It could not be signed.'); return; }
            setStage('SIGNED');
            window.setTimeout(() => onGone(`${sheet.name} owns ${percent(sheet.percent)}: ${money(sheet.capital)} is in the treasury.`), 1100);
        }, 650);
    };
    const decline = () => {
        if (stage !== 'OPEN') return;
        setStage('DECLINED');
        window.setTimeout(() => { actions.decline(sheet.id); onGone(`You declined ${sheet.name}'s offer.`); }, 900);
    };
    const rows: Array<[string, string]> = [
        ['Investment', money(sheet.capital)],
        ['For', `${percent(sheet.percent)} of the company`],
        ['Values you at', money(sheet.valuation)],
        ['Board seat', sheet.boardSeat ? 'Yes, one' : 'No'],
        ['Share of profit', sheet.profitSharePercent > 0 ? `${percent(sheet.profitSharePercent)} of revenue, weekly` : 'None'],
    ];
    return (
        <article className={cx(css.sheet, (stage === 'SIGNED' || stage === 'DECLINED') && css.sheetDone)}>
            <header className={css.sheetHead}>
                <span className={css.sheetTitle}>TERM SHEET</span>
                <span className={css.sheetStands}>{sheet.standsWeeks === null ? 'open' : sheet.standsWeeks === 0 ? 'last week to sign' : `stands ${sheet.standsWeeks} more week${sheet.standsWeeks === 1 ? '' : 's'}`}</span>
            </header>
            <p className={css.sheetFine}>Strategic investment · binding once signed by both parties</p>
            <div className={css.party}>
                <Face initials={sheet.initials} tone="#8a6a2f" kind={sheet.kind} name={sheet.name} gender={sheet.gender} />
                <div><b>{sheet.name}</b><span>{sheet.identity} · {KIND_WORDS[sheet.kind]}</span></div>
            </div>
            <dl className={css.terms}>
                {rows.map(([label, value]) => (
                    <div key={label}><dt>{label}</dt><i aria-hidden="true" /><dd>{value}</dd></div>
                ))}
            </dl>
            <ul className={css.clauses}>
                {sheet.asks && <li><b>They ask</b> {sheet.asks}</li>}
                {sheet.brings && <li><b>It brings</b> {sheet.brings}</li>}
                {sheet.watch && <li><b>Watch for</b> {sheet.watch}</li>}
            </ul>
            <div className={css.keep}>
                <span>You keep</span>
                <i className={css.keepBar}><em style={{ width: `${sheet.founderAfter}%` }} /><s style={{ left: `${sheet.founderAfter}%`, width: `${Math.max(0, founderPercent - sheet.founderAfter)}%` }} /><u style={{ left: '51%' }} /></i>
                <b>{percent(founderPercent)} → {percent(sheet.founderAfter)}</b>
            </div>
            <blockquote className={css.read}>{sheet.read}{cfoName ? <cite>— {cfoName}, CFO</cite> : null}</blockquote>
            <div className={css.signLine}>
                <span className={css.signX}>✕</span>
                <span className={css.signRule} />
                {(stage === 'SIGNING' || stage === 'SIGNED') && (
                    <svg className={css.scribble} viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M4 28c10-18 18-22 22-8s-6 18 4 4 14-20 18-6-4 14 6 2 12-16 18-4 2 10 10 0 10-12 16-2 4 8 12 0 14-10 20-2 6 6 14-2 12-6 18 0" />
                    </svg>
                )}
                <small>{founderName}, founder</small>
            </div>
            {stage === 'OPEN' && (
                <div className={css.sheetActions}>
                    <button type="button" className={css.sign} disabled={!sheet.canSign} onClick={sign}>Sign</button>
                    <button type="button" className={css.decline} onClick={decline}>Decline</button>
                </div>
            )}
            {stage === 'OPEN' && sheet.blocked && <p className={css.blocked}>{sheet.blocked}</p>}
            {note && <p className={css.blocked} role="status">{note}</p>}
            {stage === 'SIGNED' && <span className={css.stamp} aria-hidden="true">SIGNED</span>}
            {stage === 'DECLINED' && <span className={cx(css.stamp, css.stampNo)} aria-hidden="true">DECLINED</span>}
        </article>
    );
};

/* #187: an investor's stake bought back: the price, the premium, what you hold after */
const Buyout = ({ holder, actions, onNote }: { holder: StreamingOwnershipHolder; actions: BoardroomOwnershipActions; onNote: (note: string) => void }) => {
    const [armed, setArmed] = useState(false);
    const quote = holder.buyout!;
    return (
        <div className={css.buyout}>
            <span>{armed
                ? `Buy back ${holder.name.split(' ')[0]}'s ${percent(quote.percent)} for ${money(quote.price)} (${Math.round((quote.premium - 1) * 100)}% over our value): you hold ${percent(quote.founderAfter)}${holder.boardSeat ? ', their seat ends' : ''}.`
                : quote.blocked ? `${money(quote.price)} to buy out: ${quote.blocked.charAt(0).toLowerCase()}${quote.blocked.slice(1)}`
                    : `Buy out for ${money(quote.price)} · you hold ${percent(quote.founderAfter)}`}</span>
            {!quote.blocked && (armed ? (
                <span className={css.buyoutActions}>
                    <button type="button" className={css.buyoutYes} onClick={() => { const result = actions.buyOut(holder.id); onNote(result.message || (result.ok ? 'Bought out.' : 'That could not be done.')); setArmed(false); }}>Buy out</button>
                    <button type="button" className={css.buyoutNo} onClick={() => setArmed(false)}>Keep</button>
                </span>
            ) : <button type="button" className={css.buyoutBtn} onClick={() => setArmed(true)}>Buy out</button>)}
        </div>
    );
};

/* #190 (plan §22.4): selling the company: hire the bankers, then 3–5 bids with your share of each and who approves */
const BUYER_WORDS: Record<OwnedStreamingSaleBid['buyerKind'], string> = { RIVAL: 'Rival platform', MEDIA: 'Media group', TECH: 'Tech giant', PRIVATE_EQUITY: 'Private equity' };
const PAY_WORDS: Record<OwnedStreamingSaleBid['payment'], string> = { CASH: 'All cash', SHARES: 'In their shares', MIXED: 'Cash and shares' };
const SellTheCompany = ({ sale, companyName, actions, onNote }: { sale: StreamingSaleView; companyName: string; actions: BoardroomOwnershipActions; onNote: (note: string) => void }) => {
    const [armed, setArmed] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const who = sale.approvalBy === 'YOURS' ? 'At 51% or more it is yours to approve; the others sell with you at the same price.'
        : sale.approvalBy === 'BOARD' ? 'Under 51%, the board votes on a bid.'
            : 'Listed, a bid is a tender: the shareholders vote.';
    const weeks = (n: number) => `${n} week${n === 1 ? '' : 's'}`;
    return (
        <section className={css.sec}>
            <div className={css.head}><h2>Sell the company</h2><span>worth about {money(sale.worth)}</span></div>
            {sale.status === 'IDLE' && (
                <div className={css.saleCard}>
                    <p>Bankers bring 3–5 bids in 4 weeks: rival platforms, media groups, tech giants and private equity, each at a premium over our value, more the better our numbers. {who}</p>
                    <button type="button" className={css.saleBtn} onClick={() => {
                        const result = actions.hireBankers!();
                        onNote(result.message || (result.ok ? 'The bankers are calling buyers.' : 'That could not be done.'));
                    }}>Hire bankers <i>⚡{sale.energy}</i></button>
                </div>
            )}
            {sale.status === 'COOLDOWN' && <p className={css.empty}>You turned the last bids down. The bankers can be called again in {weeks(sale.weeksLeft)}.</p>}
            {sale.status === 'BANKERS' && (
                <div className={css.roundCard}>
                    <b>THE BANKERS ARE CALLING BUYERS</b>
                    <p>The bids come in {weeks(sale.weeksLeft)}. {who}</p>
                </div>
            )}
            {sale.status === 'BIDS' && (
                <>
                    {sale.bids.map(bid => (
                        <div key={bid.id} className={cx(css.bid, bid.status !== 'OPEN' && css.bidOff)}>
                            <div className={css.bidTop}>
                                <span className={css.bidMark} aria-hidden="true">{bid.buyerName.split(/\s+/).map(word => word[0] || '').join('').slice(0, 2).toUpperCase()}</span>
                                <div className={css.bidWho}><b>{bid.buyerName}</b><span>{BUYER_WORDS[bid.buyerKind]}</span></div>
                                <div className={css.bidPrice}><b>{money(bid.price)}</b><span>+{Math.round((bid.premium - 1) * 100)}% over our value</span></div>
                            </div>
                            <div className={css.bidTerms}>
                                <i>{PAY_WORDS[bid.payment]}</i>
                                <i>{bid.brand === 'KEEP' ? `Keeps ${companyName}` : 'Merges the brand'}</i>
                                <i>{bid.team === 'KEEP' ? 'Keeps the team' : 'Brings its own team'}</i>
                            </div>
                            <p className={css.bidYou}>You get <b>{money(bid.founderCash)}</b> for your {percent(sale.founderPercent)}
                                {bid.approval.by === 'YOURS' ? '' : ` · ${bid.approval.by === 'BOARD' ? 'the board' : 'the shareholders'} about ${bid.approval.support}% for`}</p>
                            {bid.status === 'VOTED_DOWN' ? <p className={css.bidVoted}>Voted down</p> : armed === bid.id ? (
                                <div className={css.bidActions}>
                                    <span>Sell {companyName} to {bid.buyerName} for {money(bid.price)}?</span>
                                    <button type="button" className={css.buyoutYes} onClick={() => {
                                        const result = actions.acceptBid!(bid.id);
                                        onNote(result.message || (result.ok ? 'Accepted.' : 'That could not be done.'));
                                        setArmed(null);
                                    }}>Sell</button>
                                    <button type="button" className={css.buyoutNo} onClick={() => setArmed(null)}>Keep</button>
                                </div>
                            ) : <button type="button" className={css.buyoutBtn} onClick={() => setArmed(bid.id)}>Accept this bid</button>}
                        </div>
                    ))}
                    <div className={css.saleFoot}>
                        <span>The bids stand {weeks(sale.weeksLeft)} more.</span>
                        {rejecting ? (
                            <span className={css.buyoutActions}>
                                <button type="button" className={css.buyoutNo} onClick={() => {
                                    const result = actions.rejectBids!();
                                    onNote(result.message || 'Every bid turned down.');
                                    setRejecting(false);
                                }}>Turn them all down</button>
                                <button type="button" className={css.buyoutNo} onClick={() => setRejecting(false)}>Wait</button>
                            </span>
                        ) : <button type="button" className={css.saleLink} onClick={() => setRejecting(true)}>Turn them all down</button>}
                    </div>
                </>
            )}
            {sale.status === 'CLOSING' && sale.closing && (
                <div className={css.roundCard}>
                    <b>CLOSING · {weeks(sale.weeksLeft).toUpperCase()} TO GO</b>
                    <p>{companyName} goes to {sale.closing.buyerName} for {money(sale.closing.price)}. You will be paid {money(sale.closing.founderCash)} for your {percent(sale.founderPercent)}, in cash; every holder is paid their share.</p>
                </div>
            )}
        </section>
    );
};

/* #187: a listed company buying back its shares */
const Buyback = ({ view, actions, onNote }: { view: StreamingOwnershipView; actions: BoardroomOwnershipActions; onNote: (note: string) => void }) => {
    const buyback = view.buyback!;
    return (
        <section className={css.sec}>
            <div className={css.head}><h2>Buy back shares</h2><span>{buyback.allowance}% left this year</span></div>
            {buyback.running ? (
                <div className={css.roundCard}>
                    <b>BUYING BACK {percent(buyback.running.percent)}</b>
                    <p>{percent(buyback.running.bought)} bought for {money(buyback.running.spent)} so far; {buyback.running.weeksLeft} week{buyback.running.weeksLeft === 1 ? '' : 's'} to go. The shares are retired, so every holder's % rises.</p>
                </div>
            ) : (
                <>
                    {buyback.last?.status === 'HELD' && <p className={css.empty}>The last buyback stopped at the cash floor after {percent(buyback.last.bought)} of {percent(buyback.last.percent)}.</p>}
                    <div className={css.sizes4}>
                        {buyback.options.map(option => (
                            <button key={option.percent} type="button" className={css.size} disabled={Boolean(option.blocked)} onClick={() => {
                                const result = actions.startBuyback(option.percent);
                                onNote(result.message || (result.ok ? 'The buyback starts.' : 'That could not be done.'));
                            }}>
                                <span className={css.sizePct}>{option.percent}%</span>
                                <span className={css.sizeAbout}>≈ {shortMoney(option.cost)}</span>
                                {option.blocked && <span className={css.sizeBlocked}>{option.blocked}</span>}
                            </button>
                        ))}
                    </div>
                    <p className={css.fine}>The company buys from the market over 4 weeks at each week's price, from the treasury and never under the cash floor. The shares are retired, so your % rises with every holder's.</p>
                </>
            )}
        </section>
    );
};

/* #186: Raise money: what investors read, and the three rounds */
const RaiseMoney = ({ view, actions, onNote }: { view: StreamingOwnershipView; actions: BoardroomOwnershipActions; onNote: (note: string) => void }) => {
    const round = view.round;
    return (
        <section className={css.sec}>
            <div className={css.head}>
                <h2>Raise money</h2>
                <span>{round.status === 'OPEN' ? `${round.label} round · ${round.standsWeeks} wk left` : round.status === 'RUNNING' ? `${round.label} round` : `worth about ${money(view.worth)}`}</span>
            </div>
            {view.listed && <p className={css.empty}>You are listed: new money comes from the market, not rounds.</p>}
            {!view.listed && round.status === 'RUNNING' && (
                <div className={css.roundCard}>
                    <b>{round.label?.toUpperCase()} ROUND · UP TO {percent(round.upToPercent)}</b>
                    <p>Your bankers are calling the industry's investors. Their offers come in {round.offersInWeeks} week{round.offersInWeeks === 1 ? '' : 's'}.</p>
                    <div className={css.roundSteps} aria-hidden="true">
                        {[0, 1, 2].map(step => <i key={step} className={3 - round.offersInWeeks > step ? css.stepOn : ''} />)}
                    </div>
                </div>
            )}
            {!view.listed && round.status === 'OPEN' && (
                <div className={css.roundCard}>
                    <b>{round.label?.toUpperCase()} ROUND · UP TO {percent(round.upToPercent)}</b>
                    <p>{round.offerCount ? `${round.offerCount} offer${round.offerCount === 1 ? '' : 's'} on the table below.` : 'No one made an offer this time.'} Sold {percent(round.soldPercent)} of {percent(round.upToPercent)}; the offers stand {round.standsWeeks} more week{round.standsWeeks === 1 ? '' : 's'}.</p>
                </div>
            )}
            {!view.listed && round.status === 'GAP' && (
                <p className={css.empty}>The last round has closed. The next can be called in {round.nextInWeeks} week{round.nextInWeeks === 1 ? '' : 's'}.</p>
            )}
            {!view.listed && round.status === 'NONE' && (
                <>
                    <div className={css.read5} aria-label="What investors will read">
                        {round.standing.checks.map(check => (
                            <span key={check.id} className={cx(css.chk, check.passed && css.chkOn)}>{check.passed ? '✓' : '✗'} {check.label}</span>
                        ))}
                    </div>
                    <div className={css.sizes}>
                        {round.sizes.map(size => (
                            <button
                                key={size.id}
                                type="button"
                                className={css.size}
                                disabled={Boolean(size.blocked)}
                                onClick={() => {
                                    const result = actions.callRound(size.id);
                                    onNote(result.message || (result.ok ? 'The round is called.' : 'That could not be done.'));
                                }}
                            >
                                <span className={css.sizeName}>{size.label.toUpperCase()}</span>
                                <span className={css.sizePct}><small>up to</small>{size.upToPercent}%</span>
                                <span className={css.sizeAbout}>≈ {money(size.about)}</span>
                                <span className={css.sizeKeep}>you keep {percent(size.founderAfter)}{size.capped ? ' (the line)' : ''}</span>
                                {size.blocked ? <span className={css.sizeBlocked}>{size.blocked}</span> : <span className={css.sizeCost}>⚡{size.energy}</span>}
                            </button>
                        ))}
                    </div>
                    <p className={css.fine}>Your bankers call the industry's investors: 2 to 6 offers in 3 weeks, more and better the more of these you pass. They stand 6 weeks; sign as many as the round allows.</p>
                </>
            )}
        </section>
    );
};

export const BoardroomOwnership = ({ view, companyName, founderName, actions, sale }: {
    view: StreamingOwnershipView; companyName: string; founderName: string; actions: BoardroomOwnershipActions;
    /** #190: selling the company */
    sale?: StreamingSaleView | null;
}) => {
    const [gone, setGone] = useState<string[]>([]);
    const [toast, setToast] = useState<string | null>(null);
    const tone = (index: number) => TONES[index % TONES.length];
    const offers = view.offers.filter(sheet => !gone.includes(sheet.id));
    const you = view.holders.find(holder => holder.kind === 'YOU');
    return (
        <div className={css.own}>
            <section className={css.sec}>
                <div className={css.head}><h2>Who owns {companyName}</h2><span>worth about {money(view.worth)}</span></div>
                <div className={css.cap} role="img" aria-label={view.holders.map(holder => `${holder.name} ${percent(holder.percent)}`).join(', ')}>
                    {view.holders.map((holder, index) => (
                        <i key={holder.id} style={{ flexGrow: Math.max(0.01, holder.percent), background: tone(index) }}>
                            {holder.percent >= 12 && <span>{holder.kind === 'YOU' ? 'You' : holder.name.split(' ')[0]} {Math.round(holder.percent)}%</span>}
                        </i>
                    ))}
                    <u className={css.majority} style={{ left: '51%' }} aria-hidden="true" />
                </div>
                <div className={css.capLegend}><span>0%</span><span className={css.majorityWord}>51% · control</span><span>100%</span></div>
                {view.holders.map((holder, index) => (
                    <div className={cx(css.holder, holder.kind === 'YOU' && css.holderYou)} key={holder.id}>
                        <Face initials={holder.initials} tone={tone(index)} kind={holder.kind} name={holder.name} gender={holder.gender} src={holder.avatar} />
                        <div className={css.hid}>
                            <b>{holder.kind === 'YOU' ? `${holder.name} (you)` : holder.name}</b>
                            <span>
                                {holder.identity}
                                {holder.boardSeat && holder.kind !== 'YOU' ? ' · board seat' : ''}
                                {holder.profitSharePercent > 0 ? ` · ${percent(holder.profitSharePercent)} of profit` : ''}
                            </span>
                        </div>
                        <div className={css.hpct}>
                            <b>{percent(holder.percent)}</b>
                            <span>{holder.kind === 'YOU' ? 'since week 1' : holder.invested > 0 ? `${money(holder.invested)} · wk ${holder.sinceWeek}` : `since wk ${holder.sinceWeek}`}</span>
                        </div>
                        {holder.buyout && <Buyout holder={holder} actions={actions} onNote={setToast} />}
                    </div>
                ))}
                <p className={cx(css.control, (you?.percent ?? 100) > 50 ? css.safe : css.risk)}>
                    {(you?.percent ?? 100) >= 100 ? 'You own the company outright. The board advises; it cannot outvote you.'
                        : (you?.percent ?? 100) > 50 ? `You hold ${percent(you!.percent)}: still control. The board advises; you decide.`
                            : `You hold ${percent(you?.percent ?? 0)}. You no longer control the company: the board can outvote you.`}
                </p>
            </section>

            <RaiseMoney view={view} actions={actions} onNote={setToast} />
            {view.buyback && <Buyback view={view} actions={actions} onNote={setToast} />}

            <section className={css.sec}>
                <div className={css.head}><h2>On the table</h2><span>{offers.length ? `${offers.length} term sheet${offers.length === 1 ? '' : 's'}` : 'none'}</span></div>
                {offers.length === 0 && (
                    <p className={css.empty}>{view.listed
                        ? 'You are listed: new money comes from the market, not term sheets.'
                        : view.round.status === 'RUNNING'
                            ? 'The offers come when the bankers are done.'
                            : 'No one is at the table. Call a round above: investors make their offers 3 weeks later.'}</p>
                )}
                {offers.map(sheet => (
                    <TermSheet key={sheet.id} sheet={sheet} founderPercent={view.founderPercent} founderName={founderName} cfoName={view.cfoName} actions={actions}
                        onGone={message => { setGone(current => [...current, sheet.id]); setToast(message); }} />
                ))}
                {toast && <p className={css.toast} role="status">{toast}</p>}
            </section>

            {sale && actions.hireBankers && <SellTheCompany sale={sale} companyName={companyName} actions={actions} onNote={setToast} />}
        </div>
    );
};
