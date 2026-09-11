import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Player, StreamingBuyerAuctionSession } from '../types';
import {
    advanceStreamingBuyerAuction,
    calculateStreamingBuyerAuctionSellerValue,
    getStreamingBuyerAuctionLeader,
    placeStreamingBuyerAuctionBid,
    reconcileStreamingBuyerAuction,
    withdrawStreamingBuyerAuctionBid,
} from '../services/streamingBuyerAuctions';
import { getContentMarketFunds } from '../services/streamingContentMarket';
import { getStreamingDayOneMarket } from '../services/streamingDayOneMarkets';
import css from '../content-market-exact/ContentMarket.module.css';
import { cx } from '../content-market-exact/cx';
import { PlatformMark, Poster } from '../content-market-exact/Poster';

const money = (value: number) => value >= 1e9
    ? `$${(value / 1e9).toFixed(1)}B`
    : `$${(value / 1e6).toFixed(value >= 10e6 ? 1 : 2).replace(/\.0+$/, '')}M`;

interface Props {
    player: Player;
    session: StreamingBuyerAuctionSession;
    onUpdatePlayer: (player: Player) => void;
    onExit: () => void;
}

export default function StreamingBuyerAuctionRoom({ player, session, onUpdatePlayer, onExit }: Props) {
    const playerRef = useRef(player);
    const updateRef = useRef(onUpdatePlayer);
    playerRef.current = player;
    updateRef.current = onUpdatePlayer;
    const leader = getStreamingBuyerAuctionLeader(session);
    const startingUpfront = Math.min(
        session.lot.referenceValue * 2.2,
        Math.max(session.lot.minimumGuarantee, (leader?.minimumGuarantee || session.lot.minimumGuarantee) + session.lot.minimumBidIncrement * 2),
    );
    const [upfront, setUpfront] = useState(startingUpfront);
    const [backend, setBackend] = useState(session.lot.allowedTerms.backendMaximum);
    const [marketing, setMarketing] = useState(session.lot.allowedTerms.marketingMaximum);
    const [futureGreenlight, setFutureGreenlight] = useState(session.lot.allowedTerms.futureGreenlightAllowed);
    const [feedback, setFeedback] = useState('');
    const [termsOpen, setTermsOpen] = useState(false);
    const [expandedBidId, setExpandedBidId] = useState<string | null>(null);

    useEffect(() => {
        const restored = reconcileStreamingBuyerAuction(playerRef.current, session.id, Date.now());
        if (restored.changed) updateRef.current(restored.player);
        const timer = window.setInterval(() => {
            const result = advanceStreamingBuyerAuction(playerRef.current, session.id, 1, Date.now());
            if (result.changed) updateRef.current(result.player);
        }, 1_000);
        return () => window.clearInterval(timer);
    }, [session.id]);

    const playerBid = session.playerBidId ? session.bids.find(bid => bid.id === session.playerBidId) || null : null;
    const previewTerms = { minimumGuarantee: upfront, licensorRevenueShare: backend, marketingGuarantee: marketing, futureGreenlight };
    const previewValue = calculateStreamingBuyerAuctionSellerValue(session.lot, previewTerms);
    const guaranteedExposure = upfront + marketing + (futureGreenlight ? session.lot.allowedTerms.futureGreenlightReserve : 0);
    const funds = getContentMarketFunds(player) + (playerBid?.guaranteedExposure || 0);
    const canBid = session.status === 'LIVE' && guaranteedExposure <= funds && upfront >= session.lot.minimumGuarantee;
    const countries = session.lot.countryIds.map(id => getStreamingDayOneMarket(id)?.country || id).join(', ');
    const activeBids = useMemo(() => session.bids.filter(bid => bid.status === 'ACTIVE')
        .sort((left, right) => right.sellerValue - left.sellerValue), [session.bids]);

    const placeBid = () => {
        const result = placeStreamingBuyerAuctionBid(player, session.id, previewTerms, Date.now());
        if (result.changed) {
            onUpdatePlayer(result.player);
            setFeedback(result.session?.leaderBidId === result.session?.playerBidId ? 'Your complete contract leads the room.' : 'Offer submitted. The seller is weighing every term.');
        } else setFeedback(result.detail || 'This offer could not be submitted.');
    };
    const withdraw = () => {
        const result = withdrawStreamingBuyerAuctionBid(player, session.id);
        if (result.changed) onUpdatePlayer(result.player);
        setFeedback(result.detail || 'Your offer was withdrawn. The other buyers remain live.');
    };

    const titleHue = [...session.lot.sourceProjectId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
    const playerTint = player.ownedStreamingPlatform.identity?.primaryColor || 'var(--epx-mkwrap-c)';
    const seconds = Math.max(0, session.roomSecondsRemaining);
    const heat = seconds <= 5 ? 'x3' : seconds <= 10 ? 'x2' : 'x1';
    const drain = Math.max(0, Math.min(100, (seconds / 15) * 100));
    const sellerReads = Object.entries(session.lot.sellerPriorities)
        .sort((left, right) => right[1] - left[1])[0]?.[0] || 'cash';
    const appetite = sellerReads === 'backend' ? 'their share of revenue'
        : sellerReads === 'marketing' ? 'the marketing behind it'
            : sellerReads === 'futureGreenlight' ? 'the next relationship' : 'the guarantee';
    const bestValue = leader?.sellerValue || 0;

    if (session.status !== 'LIVE') {
        const won = session.status === 'WON';
        const winner = session.winnerBidId ? session.bids.find(bid => bid.id === session.winnerBidId) : null;
        return <div className={css.mkwrap} data-content-market-design="zip-exact">
            <section className={cx(css.mk, css.mkroom)} data-content-market-scene="room" role="dialog" aria-label="Live rights auction">
                <div className={cx(css.mkverdict, css['mk-' + (won ? 'won' : 'lost')])} style={{ ['--epx-mkwrap-oh' as string]: String(titleHue) }}>
                    <div className={css.mkgavel} />
                    {winner && <span className={css.mkvmark}><PlatformMark name={winner.bidderName} tint={winner.isPlayer ? playerTint : session.rivals.find(rival => rival.bidderId === winner.bidderId)?.color || '#777'} /></span>}
                    <b className={css.mkvsold}>{session.status === 'NO_SALE' ? 'NO SALE' : 'SOLD'}</b>
                    <span className={css.mkvwho}>{won ? 'TO YOU' : winner ? `TO ${winner.bidderName.toUpperCase()}` : 'ROOM CLOSED'}</span>
                    <div className={css.mkvprice}>{winner ? money(winner.minimumGuarantee) : '—'}</div>
                    <p className={css.mkvnote}>{session.resultReason || (won ? 'The contract is registered in your catalogue.' : 'Nothing was charged.')}</p>
                    <button className={css.mkmark} type="button" onClick={onExit}>RETURN TO THE MARKET</button>
                </div>
            </section>
        </div>;
    }

    return <div className={css.mkwrap} data-content-market-design="zip-exact">
        <section className={cx(css.mk, css.mkroom, css['mkh-' + heat])} data-content-market-scene="room" role="dialog" aria-label="Live rights auction" style={{ ['--epx-mkwrap-dh' as string]: String(titleHue) }}>
            <div className={css.mkspot} />
            <header className={css.mkroomtop}>
                <button className={css.mkback} type="button" aria-label="Leave auction room" onClick={onExit}>←</button>
                <div className={css.mkroomlot}>
                    <span className={css.mkposterchip}><Poster id={session.lot.sourceProjectId} title={session.lot.title} genre={session.lot.genre} hue={titleHue} size="xs" /></span>
                    <div><b>{session.lot.title}</b><span>{session.lot.sellerName}</span></div>
                </div>
                <div className={cx(css.mkclock, seconds <= 8 ? css.urgent : '')}>0:{String(seconds).padStart(2, '0')}</div>
            </header>
            <div className={css.mkdrain}><u style={{ width: `${drain}%` }} className={seconds <= 8 ? css.urgent : ''} /></div>

            <div className={css.mkscroll}>
                <div className={cx(css.mkboard, leader?.isPlayer ? css.mine : '', css['mkb-' + heat])}>
                    <span>LEADING CONTRACT</span>
                    <b>{leader ? money(leader.minimumGuarantee) : money(session.lot.minimumGuarantee)}</b>
                    <div className={css.mkboardsub}>
                        {leader && <PlatformMark name={leader.bidderName} tint={leader.isPlayer ? playerTint : session.rivals.find(rival => rival.bidderId === leader.bidderId)?.color || '#777'} small />}
                        <em>{leader ? `${leader.licensorRevenueShare}% backend` : 'reserve'}</em>
                        {leader && leader.marketingGuarantee > 0 && <em>{money(leader.marketingGuarantee)} mktg</em>}
                    </div>
                    <p className={leader?.isPlayer ? css.mkleads : ''}>{leader?.isPlayer ? 'You are leading.' : leader ? `${leader.bidderName} is leading.` : 'No contract on the table.'}</p>
                </div>

                <button className={css.mkbrief} type="button">
                    <PlatformMark name={session.lot.sellerName} tint={`hsl(${titleHue} 58% 44%)`} small />
                    <span className={css.mkbrieftext}>{session.lot.sellerName} is reading <b>{appetite}</b></span>
                    <i>•</i>
                </button>
                {session.lot.notice && <p className={css.mkbriefopen}>{session.lot.notice}</p>}
                {playerBid && <div className={cx(css.mkstand, leader?.isPlayer ? css.mine : '')}>
                    <b>{leader?.isPlayer ? '1st' : `${activeBids.findIndex(bid => bid.id === playerBid.id) + 1}`}</b>
                    <p>{leader?.isPlayer ? 'You hold the room.' : previewValue > bestValue ? 'Your revised contract would take the lead.' : 'Improve the complete contract to move ahead.'}</p>
                </div>}

                <div className={css.mkcontracts} aria-label="Auction offers">
                    {activeBids.map((bid, index) => {
                        const tint = bid.isPlayer ? playerTint : session.rivals.find(rival => rival.bidderId === bid.bidderId)?.color || '#777';
                        const open = expandedBidId === bid.id;
                        const valueWidth = bestValue > 0 ? Math.max(8, Math.round((bid.sellerValue / bestValue) * 100)) : 0;
                        return <div key={bid.id} className={cx(css.mkoffer2, bid.isPlayer ? css.mine : '', index === 0 ? css.top : '')} style={{ ['--epx-mkwrap-oh' as string]: String(titleHue) }}>
                            <button className={css.mkofferhead} type="button" onClick={() => setExpandedBidId(open ? null : bid.id)}>
                                <i className={css.mkrank}>{index + 1}</i>
                                <PlatformMark name={bid.bidderName} tint={tint} small />
                                <b className={css.mkoffwho}>{bid.bidderName}</b>
                                <em className={css.mkoffterse}>{bid.licensorRevenueShare}% backend{bid.marketingGuarantee ? ` · ${money(bid.marketingGuarantee)}` : ''}</em>
                                <b className={css.mkoffmg}>{money(bid.minimumGuarantee)}</b>
                            </button>
                            <i className={css.mkvalue} style={{ width: `${valueWidth}%` }} />
                            {open && <div className={css.mkoffterms}>
                                {[
                                    ['GUARANTEE', money(bid.minimumGuarantee)],
                                    ['BACKEND', `${bid.licensorRevenueShare}%`],
                                    ['MARKETING', bid.marketingGuarantee ? money(bid.marketingGuarantee) : 'None'],
                                    ['FUTURE ORIGINAL', bid.futureGreenlight ? 'Committed' : 'Not offered'],
                                ].map(([key, value]) => <div className={css.mkctcell} key={key}><span>{key}</span><b>{value}</b></div>)}
                            </div>}
                        </div>;
                    })}
                    {!activeBids.length && <p className={css.mkempty}>Nothing has been tabled yet.</p>}
                </div>
                {feedback && <p className={css.mkbriefopen} role="status">{feedback}</p>}
            </div>

            <section className={css.mkmaker} aria-label="Auction offer console">
                <button className={css.mkmyterms} type="button" onClick={() => setTermsOpen(true)}>
                    <span>{backend}% backend</span>
                    <span>{marketing ? `${money(marketing)} mktg` : 'no mktg'}</span>
                    {futureGreenlight && <span>future original</span>}
                    <i>edit</i>
                </button>
                <div className={css.mkmakerrow}>
                    <button className={css.mkstep} type="button" onClick={() => setUpfront(Math.max(session.lot.minimumGuarantee, upfront - session.lot.minimumBidIncrement))}>−</button>
                    <b className={guaranteedExposure > funds ? css.mkover : ''}>{money(upfront)}</b>
                    <button className={css.mkstep} type="button" onClick={() => setUpfront(upfront + session.lot.minimumBidIncrement)}>+</button>
                </div>
                <button className={cx(css.mkbid, !canBid ? css.dead : '')} type="button" disabled={!canBid} onClick={placeBid}>
                    {guaranteedExposure > funds ? `SHORT BY ${money(guaranteedExposure - funds)}` : `${playerBid ? 'REVISE' : 'TABLE'} ${money(guaranteedExposure)}`}
                </button>
            </section>

            {termsOpen && <div className={css.mksheetwrap} onClick={() => setTermsOpen(false)}>
                <div className={css.mkfilters} onClick={event => event.stopPropagation()}>
                    <div className={css.mkfhead}><b>YOUR TERMS</b><button type="button" onClick={() => setTermsOpen(false)}>Done</button></div>
                    <div className={css.mkdials}>
                        <div className={css.mkdial}><span>THEY KEEP</span><b>{backend}%</b><div><button type="button" onClick={() => setBackend(Math.max(session.lot.allowedTerms.backendMinimum, backend - 1))}>−</button><button type="button" onClick={() => setBackend(Math.min(session.lot.allowedTerms.backendMaximum, backend + 1))}>+</button></div></div>
                        {session.lot.allowedTerms.marketingMaximum > 0 && <div className={css.mkdial}><span>MARKETING</span><b>{marketing ? money(marketing) : '—'}</b><div><button type="button" onClick={() => setMarketing(Math.max(0, marketing - 100_000))}>−</button><button type="button" onClick={() => setMarketing(Math.min(session.lot.allowedTerms.marketingMaximum, marketing + 100_000))}>+</button></div></div>}
                    </div>
                    {session.lot.allowedTerms.futureGreenlightAllowed && <><span className={css.mkflabel}>SWEETENER</span><div className={css.mkfrow}><button type="button" className={futureGreenlight ? css.on : ''} onClick={() => setFutureGreenlight(!futureGreenlight)}>{futureGreenlight ? '✓ ' : ''}Future original</button></div></>}
                    {playerBid && <button className={css.mkfclear} type="button" onClick={withdraw}>Withdraw your standing contract</button>}
                </div>
            </div>}
        </section>
    </div>;
}
