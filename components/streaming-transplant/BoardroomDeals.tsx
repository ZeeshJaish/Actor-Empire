/*
 * #177 (plan §22.7): the Boardroom's M&A tab as a teaser for the feature coming in a future update (Zeesh, 2026-11-03:
 * "M&a wala section apge me content dalna hoga jo hype create karega game ka upcoming feature ki like in future kar ke").
 *
 *   - THE DEAL ROOM: what M&A will be, and a rumour ticker made from this world's own rivals (marked as rumours: none
 *     of it happens);
 *   - six moving previews, one per kind of deal, drawn in CSS so they cost nothing; they rest when motion is reduced.
 * Nothing here can be tapped into: there is no M&A yet.
 */
import React from 'react';
import css from './presentation/screens/Boardroom/BoardroomDeals.module.css';
import { cx } from './presentation/cx';

type DealId = 'RIVAL' | 'LIBRARY' | 'MARKET' | 'BIDS' | 'HOSTILE' | 'MERGE';

const DEALS: ReadonlyArray<{ id: DealId; title: string; line: string }> = [
    { id: 'RIVAL', title: 'Buy a rival', line: 'Their members and their shows become yours' },
    { id: 'LIBRARY', title: "Buy a studio's library", line: 'Every title, its rights and its fans' },
    { id: 'MARKET', title: 'Buy into a market', line: "A local service's homes, overnight" },
    { id: 'BIDS', title: 'Bidding wars', line: 'Rivals bid for the same prize' },
    { id: 'HOSTILE', title: 'Hostile takeovers', line: 'Tender offers, and how to fight one off' },
    { id: 'MERGE', title: 'Merge two brands', line: 'Keep both, fold one in, or rename' },
];

/** a few seconds of each deal, drawn */
const Scene: React.FC<{ id: DealId }> = ({ id }) => {
    if (id === 'RIVAL') return (
        <svg viewBox="0 0 140 84" aria-hidden="true">
            <circle className={css.ring} cx="70" cy="42" r="18" />
            <circle className={cx(css.ours, css.toMid)} cx="38" cy="42" r="13" />
            <circle className={cx(css.theirs, css.fromRight)} cx="102" cy="42" r="13" />
            <text className={css.tag} x="70" y="76" textAnchor="middle">+ MEMBERS</text>
        </svg>
    );
    if (id === 'LIBRARY') return (
        <svg viewBox="0 0 140 84" aria-hidden="true">
            <rect className={css.vault} x="92" y="16" width="38" height="52" rx="6" />
            <circle className={css.dial} cx="111" cy="42" r="9" />
            {[0, 1, 2].map(index => (
                <rect key={index} className={cx(css.poster, css[`slide${index}`])} x="12" y="24" width="22" height="34" rx="3" />
            ))}
        </svg>
    );
    if (id === 'MARKET') return (
        <svg viewBox="0 0 140 84" aria-hidden="true">
            <path className={css.horizon} d="M8 70 Q70 30 132 70" />
            <circle className={cx(css.ripple, css.rippleA)} cx="70" cy="54" r="6" />
            <circle className={cx(css.ripple, css.rippleB)} cx="70" cy="54" r="6" />
            <path className={css.pin} d="M70 54 c-7-9-9-13-9-17 a9 9 0 0 1 18 0 c0 4-2 8-9 17z" />
        </svg>
    );
    if (id === 'BIDS') return (
        <svg viewBox="0 0 140 84" aria-hidden="true">
            <line className={css.base} x1="20" y1="72" x2="120" y2="72" />
            <rect className={cx(css.bar, css.barA)} x="40" y="20" width="18" height="52" rx="3" />
            <rect className={cx(css.bar, css.barB)} x="82" y="20" width="18" height="52" rx="3" />
            <text className={cx(css.tag, css.bidA)} x="49" y="14" textAnchor="middle">$4.2B</text>
            <text className={cx(css.tag, css.bidB)} x="91" y="14" textAnchor="middle">$4.6B</text>
        </svg>
    );
    if (id === 'HOSTILE') return (
        <svg viewBox="0 0 140 84" aria-hidden="true">
            <circle className={css.flash} cx="70" cy="42" r="30" />
            <path className={css.shield} d="M70 12 L94 21 V41 C94 57 84 67 70 73 C56 67 46 57 46 41 V21 Z" />
            <path className={css.crack} d="M72 24 L66 38 L74 44 L67 60" />
        </svg>
    );
    return (
        <svg viewBox="0 0 140 84" aria-hidden="true">
            <rect className={css.fused} x="46" y="18" width="48" height="48" rx="10" />
            <rect className={cx(css.ours, css.squareA)} x="30" y="26" width="32" height="32" rx="7" />
            <rect className={cx(css.theirs, css.squareB)} x="78" y="26" width="32" height="32" rx="7" />
        </svg>
    );
};

const rumoursOf = (company: string, rivals: string[]): string[] => {
    const named = rivals.filter(Boolean);
    const [a, b, c] = [named[0] || 'A rival service', named[1] || 'Another service', named[2] || named[0] || 'A rival'];
    return [
        `${a} is said to be studying a bid for a regional service in Brazil`,
        `Bankers circle ${b} after a quiet quarter`,
        `${c}'s film library could be on the block`,
        `${a} and ${b} deny merger talks`,
        `${company} named in takeover chatter`,
        'A Gulf fund is shopping for a streamer with 20M members',
    ];
};

export const BoardroomDeals: React.FC<{ companyName: string; rivals: string[] }> = ({ companyName, rivals }) => {
    const rumours = rumoursOf(companyName, rivals);
    return (
        <div className={css.deals}>
            <section className={css.hero}>
                <span className={css.lock} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                </span>
                <em className={css.eyebrow}>M&amp;A · COMING IN A FUTURE UPDATE</em>
                <h2 className={css.title}>THE DEAL ROOM</h2>
                <p className={css.pitch}>Buy a rival, a library or a way into a market. Your rivals will be shopping too.</p>
                <div className={css.ticker} aria-label="Rumours">
                    <div className={css.tape}>
                        {[0, 1].map(copy => (
                            <span key={copy} aria-hidden={copy === 1}>
                                {rumours.map(line => <span key={line} className={css.rumour}><b>RUMOUR</b>{line}</span>)}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <ul className={css.grid}>
                {DEALS.map((deal, index) => (
                    <li key={deal.id} className={css.card} style={{ ['--i' as string]: index }}>
                        <span className={css.scene}><Scene id={deal.id} /></span>
                        <b>{deal.title}</b>
                        <span>{deal.line}</span>
                    </li>
                ))}
            </ul>

            <p className={css.foot}>Activists and hostile bids return with it. Until then, no one can buy you either.</p>
        </div>
    );
};

export default BoardroomDeals;
