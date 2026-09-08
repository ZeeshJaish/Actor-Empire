import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Gavel, Megaphone, ShieldCheck, TrendingUp, XCircle } from 'lucide-react';
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
import '../styles/streaming-buyer-auction-room.css';

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

    if (session.status !== 'LIVE') {
        const won = session.status === 'WON';
        return <section className="cm-auction-room cm-auction-result" role="dialog" aria-label="Live rights auction">
            <div className={`cm-auction-verdict ${won ? 'is-won' : 'is-closed'}`}>
                {won ? <CheckCircle2 size={36} /> : <XCircle size={36} />}
                <span>AUCTION CLOSED</span>
                <h1>{won ? 'Rights secured.' : session.status === 'NO_SALE' ? 'No sale.' : 'Another platform won.'}</h1>
                <p>{session.resultReason}</p>
                <dl><div><dt>Lot</dt><dd>{session.lot.title}</dd></div><div><dt>Scope</dt><dd>{countries}</dd></div><div><dt>Outcome</dt><dd>{session.status.replaceAll('_', ' ')}</dd></div></dl>
                <button type="button" onClick={onExit}>Return to live auctions</button>
            </div>
        </section>;
    }

    return <section className="cm-auction-room" role="dialog" aria-label="Live rights auction">
        <div className="cm-auction-venue">
            <div className="cm-auction-head">
                <button type="button" aria-label="Leave auction room" onClick={onExit}><ArrowLeft size={18} /></button>
                <div><span>LIVE RIGHTS AUCTION</span><strong>{session.lot.title}</strong><small>{session.lot.listingKind === 'CATALOGUE_PACKAGE' ? `${session.lot.catalogueComponentIds?.length || 0} title collection` : `${session.lot.projectType === 'SERIES' ? 'Series' : 'Film'} · ${session.lot.genre.replaceAll('_', ' ')}`}</small></div>
                <div className={`cm-auction-clock ${session.roomSecondsRemaining <= 5 ? 'is-closing' : ''}`}><Clock3 size={14} /><b>{session.roomSecondsRemaining}</b><small>SEC</small></div>
            </div>
            <div className="cm-auction-scope"><span>{countries}</span><b>{session.lot.durationWeeks} weeks · {session.lot.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'}</b></div>
            {session.lot.notice && <p className="cm-auction-notice"><ShieldCheck size={14} />{session.lot.notice}</p>}
            <div className="cm-auction-leader">
                <span>SELLER'S LEADING CONTRACT</span>
                <strong>{leader?.bidderName || 'No qualified offer'}</strong>
                <b>{leader ? money(leader.minimumGuarantee) : '—'} <small>{leader ? `+ ${leader.licensorRevenueShare}% backend` : ''}</small></b>
            </div>
            <div className="cm-auction-tape" aria-label="Auction offers">
                {activeBids.map((bid, index) => <article key={bid.id} className={`${bid.isPlayer ? 'is-player' : ''} ${index === 0 ? 'is-leading' : ''}`}>
                    <i style={!bid.isPlayer ? { background: session.rivals.find(rival => rival.bidderId === bid.bidderId)?.color } : undefined} />
                    <div><strong>{bid.bidderName}</strong><small>{bid.isPlayer ? `Your offer · revision ${bid.revision}` : `Round ${bid.revision}`}</small></div>
                    <span><b>{money(bid.minimumGuarantee)}</b><small>{bid.licensorRevenueShare}% backend{bid.marketingGuarantee ? ` · ${money(bid.marketingGuarantee)} marketing` : ''}</small></span>
                </article>)}
                {!activeBids.length && <p className="cm-auction-wait"><Gavel size={22} />Waiting for the opening contract…</p>}
            </div>
        </div>

        <section className="cm-auction-console" aria-label="Auction offer console">
            <div className="cm-console-summary"><span><small>AVAILABLE</small><b>{money(funds)}</b></span><span><small>CURRENT COMMITMENT</small><b>{playerBid ? money(playerBid.guaranteedExposure) : 'None'}</b></span><span><small>CONTRACT STRENGTH</small><b className={previewValue > (leader?.sellerValue || 0) ? 'is-ahead' : ''}>{previewValue > (leader?.sellerValue || 0) ? 'Leading' : 'Behind'}</b></span></div>
            <div className="cm-console-controls">
                <label className="cm-bid-money"><span>Upfront</span><input aria-label="Auction upfront" type="number" step={session.lot.minimumBidIncrement} min={session.lot.minimumGuarantee} value={upfront} onChange={event => setUpfront(Number(event.target.value))} /><b>{money(upfront)}</b></label>
                <label><span>Seller backend</span><input aria-label="Seller backend" type="range" min={session.lot.allowedTerms.backendMinimum} max={session.lot.allowedTerms.backendMaximum} value={backend} onChange={event => setBackend(Number(event.target.value))} /><b>{backend}%</b></label>
                {session.lot.allowedTerms.marketingMaximum > 0 && <label><span><Megaphone size={12} /> Marketing</span><input aria-label="Marketing guarantee" type="range" min={0} max={session.lot.allowedTerms.marketingMaximum} step={100_000} value={marketing} onChange={event => setMarketing(Number(event.target.value))} /><b>{money(marketing)}</b></label>}
                {session.lot.allowedTerms.futureGreenlightAllowed && <label className="cm-greenlight"><input type="checkbox" checked={futureGreenlight} onChange={event => setFutureGreenlight(event.target.checked)} /><span><TrendingUp size={12} /> Future original with {session.lot.sellerName}</span><b>{futureGreenlight ? 'Included' : 'Off'}</b></label>}
            </div>
            {feedback && <p className="cm-console-feedback" role="status">{feedback}</p>}
            <div className="cm-console-action"><button type="button" className="cm-withdraw" disabled={!playerBid} onClick={withdraw}>Withdraw</button><button type="button" className="cm-place-bid" disabled={!canBid} onClick={placeBid}><Gavel size={17} />{playerBid ? 'Revise bid' : 'Place bid'} · {money(guaranteedExposure)}</button></div>
        </section>
    </section>;
}
