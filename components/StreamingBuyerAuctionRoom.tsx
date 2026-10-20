import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Player, StreamingBuyerAuctionSession, StreamingAuctionFutureFundingTerms } from '../types';
import {
    advanceStreamingBuyerAuction,
    getStreamingBuyerAuctionBackendCapability,
    calculateStreamingBuyerAuctionSellerValue,
    getStreamingBuyerAuctionLeader,
    placeStreamingBuyerAuctionBid,
    reconcileStreamingBuyerAuction,
    withdrawStreamingBuyerAuctionBid,
} from '../services/streamingBuyerAuctions';
import { resolveAuctionContinuation } from '../services/streamingAuctionTerms';
import { activateAuctionFutureFunding } from '../services/streamingAuctionFunding';
import { getContentMarketFunds } from '../services/streamingContentMarket';
import { reuseStreamingPresentationSource } from '../services/streamingPresentationInputs';
import css from '../content-market-exact/ContentMarket.module.css';
import { cx } from '../content-market-exact/cx';
import { OfferUsdInput } from '../content-market-exact/OfferControls';
import { parseOfferUsd } from '../content-market-exact/model';
import { PlatformMark, Poster } from '../content-market-exact/Poster';

const money = (value: number) => value >= 1e9
    ? `$${(value / 1e9).toFixed(1)}B`
    : `$${(value / 1e6).toFixed(value >= 10e6 ? 1 : 2).replace(/\.0+$/, '')}M`;

const fundingLabel = (funding: StreamingAuctionFutureFundingTerms) =>
    `${funding.count} ${funding.kind === 'NEXT_SEASON' ? 'next season' : funding.kind === 'SEQUEL' ? 'sequel' : 'new original'}${funding.count > 1 ? 's' : ''}`;

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
    // One caller-owned immutable presentation snapshot. Actions below always
    // use playerRef.current; no cached capability can authorize a transaction.
    const presentationRef = useRef(player);
    const readPlayer = reuseStreamingPresentationSource(presentationRef.current, player, 'AUCTION_ROOM');
    presentationRef.current = readPlayer;
    const lotKey = JSON.stringify(session.lot);
    const leader = getStreamingBuyerAuctionLeader(session);
    const startingUpfront = Math.min(
        session.lot.referenceValue * 2.2,
        Math.max(session.lot.minimumGuarantee, (leader?.minimumGuarantee || session.lot.minimumGuarantee) + session.lot.minimumBidIncrement * 2),
    );
    const [upfrontDraft, setUpfrontDraft] = useState(String(Math.round(startingUpfront / 100_000) * 100_000));
    const parsedUpfront = parseOfferUsd(upfrontDraft, Number.MAX_SAFE_INTEGER);
    const upfront = parsedUpfront.value ?? 0;
    const setUpfront = (amount: number) => setUpfrontDraft(String(amount));
    const [backend, setBackend] = useState(0);
    const [productionFunding, setProductionFunding] = useState(0);
    const [futureGreenlight, setFutureGreenlight] = useState(false);
    const [futureFunding, setFutureFunding] = useState<StreamingAuctionFutureFundingTerms>({
        kind: session.lot.projectType === 'SERIES' ? 'NEXT_SEASON' : 'SEQUEL', count: 1,
        budgetPerProject: Math.max(1_000_000, session.lot.allowedTerms.futureGreenlightReserve),
        format: 'ANY', commitment: 'FIRM', deadlineWeeks: 52, platformRightsPercent: 100,
    });
    const [fundingActivated, setFundingActivated] = useState(false);
    const [fundingFeedback, setFundingFeedback] = useState('');
    const [feedback, setFeedback] = useState('');
    const [submittingBid, setSubmittingBid] = useState(false);
    const bidFrame = useRef<number | null>(null);
    const bidTimer = useRef<number | null>(null);
    useEffect(() => () => {
        if (bidFrame.current !== null) cancelAnimationFrame(bidFrame.current);
        if (bidTimer.current !== null) clearTimeout(bidTimer.current);
    }, []);
    const [termsOpen, setTermsOpen] = useState(false);
    const [expandedBidId, setExpandedBidId] = useState<string | null>(null);

    useEffect(() => {
        if (session.status !== 'LIVE') return;
        const restored = reconcileStreamingBuyerAuction(playerRef.current, session.id, Date.now());
        if (restored.changed) updateRef.current(restored.player);
        if (restored.session?.status !== 'LIVE') return;
        const timer = window.setInterval(() => {
            const result = advanceStreamingBuyerAuction(playerRef.current, session.id, 1, Date.now());
            if (result.changed) updateRef.current(result.player);
            if (result.session?.status !== 'LIVE') window.clearInterval(timer);
        }, 1_000);
        return () => window.clearInterval(timer);
    }, [session.id, session.status]);

    const backendCapability = useMemo(() => getStreamingBuyerAuctionBackendCapability(readPlayer, session.lot), [readPlayer, lotKey]);
    const backendAvailable = backendCapability.advertising || backendCapability.rental;
    const backendReason = 'Backend unavailable: enable advertising or rental in an eligible market with matching title rights.';
    const offeredBackend = backendAvailable ? backend : 0;
    useEffect(() => { if (!backendAvailable) setBackend(0); }, [backendAvailable]);
    const continuation = useMemo(() => resolveAuctionContinuation(readPlayer, session.lot.sourceProjectId, session.lot.title, session.lot.projectType), [readPlayer, lotKey]);
    const playerBid = session.playerBidId ? session.bids.find(bid => bid.id === session.playerBidId) || null : null;
    const previewTerms = {
        minimumGuarantee: upfront, licensorRevenueShare: offeredBackend, marketingGuarantee: 0,
        futureGreenlight, productionFunding: session.lot.upcomingRightsSaleId ? productionFunding : 0,
        ...(futureGreenlight ? { futureFunding } : {}),
    };
    const previewValue = calculateStreamingBuyerAuctionSellerValue(session.lot, previewTerms, 1, backendCapability.eligibleRevenueFraction);
    const firmFutureReserve = futureGreenlight && futureFunding.commitment === 'FIRM'
        ? futureFunding.count * futureFunding.budgetPerProject : 0;
    const guaranteedExposure = upfront + previewTerms.productionFunding + firmFutureReserve;
    const availableFunds = useMemo(() => getContentMarketFunds(readPlayer), [readPlayer]);
    const funds = availableFunds + (playerBid?.guaranteedExposure || 0);
    const validFutureFunding = !futureGreenlight || futureFunding.budgetPerProject >= 100_000;
    const canBid = parsedUpfront.value !== null && upfront % 100_000 === 0 && validFutureFunding && session.status === 'LIVE' && guaranteedExposure <= funds && upfront >= session.lot.minimumGuarantee;
    const activeBids = useMemo(() => session.bids.filter(bid => bid.status === 'ACTIVE')
        .sort((left, right) => right.sellerValue - left.sellerValue), [session.bids]);

    const placeBid = () => {
        if (submittingBid || !canBid) return;
        const clickedAt = Date.now();
        const termsAtClick = { ...previewTerms };
        setSubmittingBid(true);
        bidFrame.current = requestAnimationFrame(() => {
            bidTimer.current = window.setTimeout(() => {
                const result = placeStreamingBuyerAuctionBid(playerRef.current, session.id, termsAtClick, clickedAt);
                if (result.changed) {
                    updateRef.current(result.player);
                    setFeedback(result.session?.leaderBidId === result.session?.playerBidId ? 'Your complete contract leads the room.' : 'Offer submitted. The seller is weighing every term.');
                } else setFeedback(result.detail || 'This offer could not be submitted.');
                setSubmittingBid(false);
            }, 0);
        });
    };
    const withdraw = () => {
        const result = withdrawStreamingBuyerAuctionBid(player, session.id);
        if (result.changed) onUpdatePlayer(result.player);
        setFeedback(result.detail || 'Your offer was withdrawn. The other buyers remain live.');
    };

    const titleHue = [...session.lot.sourceProjectId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
    const playerTint = player.ownedStreamingPlatform.identity?.primaryColor || '#8d7bff';
    const seconds = Math.max(0, session.roomSecondsRemaining);
    const heat = seconds <= 5 ? 'x3' : seconds <= 10 ? 'x2' : 'x1';
    const drain = Math.max(0, Math.min(100, (seconds / 15) * 100));
    const clock = `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    const extensionVisible = !!session.lastExtensionSeconds
        && session.lastExtensionAtSecond !== undefined
        && session.activeSecondsElapsed - session.lastExtensionAtSecond < 3;
    const sellerReads = Object.entries(session.lot.sellerPriorities)
        .sort((left, right) => right[1] - left[1])[0]?.[0] || 'cash';
    const appetite = sellerReads === 'backend' ? 'their share of revenue'
        : sellerReads === 'futureGreenlight' ? 'the next relationship' : 'the guarantee';
    const bestValue = leader?.sellerValue || 0;

    if (session.status !== 'LIVE') {
        const won = session.status === 'WON';
        const collection = session.lot.listingKind === 'CATALOGUE_PACKAGE';
        const format = collection ? `Collection${session.lot.catalogueComponentIds.length ? ` · ${session.lot.catalogueComponentIds.length} titles` : ''}`
            : session.lot.projectType === 'SERIES' ? 'Series' : 'Film';
        const winner = session.winnerBidId ? session.bids.find(bid => bid.id === session.winnerBidId) : null;
        const optionalFunding = won && winner?.futureFunding?.commitment === 'OPTION' ? winner.futureFunding : null;
        const activated = fundingActivated || player.ownedStreamingPlatform.rightsObligations?.some(
            obligation => obligation.sourceAuctionId === session.id && obligation.fundingActivatedAtAbsoluteWeek != null,
        );
        const activateFunding = () => {
            const result = activateAuctionFutureFunding(playerRef.current, session.id);
            if (result.changed) {
                updateRef.current(result.player);
                setFundingActivated(true);
            }
            setFundingFeedback(result.changed ? 'Funding activated. The seller will deliver the project within 52 weeks.' : result.reason === 'INSUFFICIENT_CASH' ? 'Your platform needs more available funds to activate this deal.' : result.reason === 'ALREADY_ACTIVE' ? 'This funding deal is already active.' : 'This funding deal is no longer available.');
        };
        return <div className={css.mkwrap} data-content-market-design="zip-exact">
            <section className={cx(css.mk, css.mkroom, css.mkauction)} style={{ ['--epx-auction-own' as string]: playerTint, ['--epx-result-tint' as string]: winner ? winner.isPlayer ? playerTint : session.rivals.find(rival => rival.bidderId === winner.bidderId)?.color || `hsl(${titleHue} 55% 58%)` : `hsl(${titleHue} 55% 58%)` }} data-content-market-scene="room" role="dialog" aria-label="Live rights auction">
                <div data-auction-result={session.status} className={cx(css.mkverdict, css.mkauctionresult, css['mk-' + (won ? 'won' : 'lost')])}>
                    <div className={css.mkresultbody}>
                        <div className={css.mkresultidentity}>
                            <div className={css.mkresultposter}><Poster id={session.lot.sourceProjectId} title={session.lot.title} genre={collection ? 'Mixed' : session.lot.genre} hue={titleHue} size="md" stack={collection ? session.lot.catalogueComponentIds.length : undefined} /></div>
                            <div className={css.mkresultcopy}>
                                <h1>{won ? 'Acquired' : winner ? 'Sold' : session.status === 'NO_SALE' ? 'No sale' : session.status === 'INVALIDATED' ? 'Rights unavailable' : session.status === 'WITHDRAWN' ? 'Offer withdrawn' : 'Room closed'}</h1>
                                <h2>{session.lot.title}</h2>
                                <p>{session.lot.sellerName} · {format}{!collection && ` · ${session.lot.genre.replaceAll('_', ' ')}`}</p>
                            </div>
                        </div>
                        {winner && <div className={css.mkresultbuyer}>
                            <PlatformMark name={winner.bidderName} tint={winner.isPlayer ? playerTint : session.rivals.find(rival => rival.bidderId === winner.bidderId)?.color || '#777'} small />
                            <span>{won ? 'Added to your platform' : `Acquired by ${winner.bidderName}`}</span>
                        </div>}
                        {winner ? <dl className={css.mkresultfacts}>
                            <div className={css.mkresultfee}><dt>Upfront guarantee</dt><dd title={`$${winner.minimumGuarantee.toLocaleString('en-US')}`}>{money(winner.minimumGuarantee)}</dd></div>
                            <div><dt>Backend share</dt><dd>{winner.licensorRevenueShare}%</dd></div>
                            <div><dt>Rights term</dt><dd>{session.lot.durationWeeks} weeks</dd></div>
                            <div><dt>Coverage</dt><dd>{session.lot.countryIds.length ? `${session.lot.countryIds.length} ${session.lot.countryIds.length === 1 ? 'country' : 'countries'}` : session.lot.territory === 'GLOBAL' ? 'Global' : session.lot.territory.replaceAll('_', ' ')}</dd></div>
                            {winner.productionFunding > 0 && <div><dt>Production funding</dt><dd>{money(winner.productionFunding)}</dd></div>}
                            {winner.futureFunding && <div><dt>Future funding</dt><dd>{fundingLabel(winner.futureFunding)} · {winner.futureFunding.commitment === 'OPTION' ? 'Optional' : 'Firm'}</dd></div>}
                        </dl> : session.status === 'NO_SALE' && <p className={css.mkresultsettlement}>No rights transferred · No payment charged</p>}
                        <p className={css.mkresultnote}>{session.resultReason || (won ? 'The contract is registered in your catalogue.' : winner ? 'The seller accepted the winning contract.' : 'This room has closed. Return to the market to explore other available rights.')}</p>
                        {optionalFunding && <div className={css.mkfundingresult}>
                            <b>YOUR OPTIONAL DEAL</b>
                            <p>{fundingLabel(optionalFunding)} · {money(optionalFunding.budgetPerProject)} per title · {optionalFunding.platformRightsPercent}% platform rights</p>
                            <p>Funding is reserved when activated and paid when production starts. The seller delivers within 52 weeks of activation.</p>
                            <button className={css.mkfundingactivate} type="button" disabled={activated} onClick={activateFunding}>{activated ? 'FUNDING ACTIVATED' : `ACTIVATE FUNDING · ${money(optionalFunding.count * optionalFunding.budgetPerProject)}`}</button>
                        </div>}
                        {fundingFeedback && <p className={css.mkresultnote} role="status">{fundingFeedback}</p>}
                        <button className={cx(css.mkmark, css.mkresultexit)} type="button" onClick={onExit}>Return to the market</button>
                    </div>
                </div>
            </section>
        </div>;
    }

    return <div className={css.mkwrap} data-content-market-design="zip-exact">
        <section className={cx(css.mk, css.mkroom, css.mkauction, css['mkh-' + heat])} data-content-market-scene="room" role="dialog" aria-label="Live rights auction" style={{ ['--epx-mkwrap-dh' as string]: String(titleHue), ['--epx-auction-own' as string]: playerTint }}>
            <div className={css.mkspot} />
            <header className={css.mkroomtop}>
                <button className={css.mkback} type="button" aria-label="Leave auction room" onClick={onExit}>←</button>
                <div className={css.mkroomlot}>
                    <span className={css.mkposterchip}><Poster id={session.lot.sourceProjectId} title={session.lot.title} genre={session.lot.genre} hue={titleHue} size="xs" /></span>
                    <div><b>{session.lot.title}</b><span>{session.lot.sellerName}</span></div>
                </div>
                <div className={cx(css.mkclock, seconds <= 8 ? css.urgent : '')}>{clock}</div>
            </header>
            {extensionVisible && <p key={`${session.lastExtensionAtSecond}:${session.lastExtensionSeconds}`} className={css.mkextension} role="status">+{session.lastExtensionSeconds}s · New bid, room extended</p>}
            <div className={css.mkdrain}><u style={{ width: `${drain}%` }} className={seconds <= 8 ? css.urgent : ''} /></div>

            <div className={css.mkscroll}>
                <div className={cx(css.mkboard, leader?.isPlayer ? css.mine : '', css['mkb-' + heat])} style={{ ['--epx-auction-brand' as string]: leader?.isPlayer ? playerTint : session.rivals.find(rival => rival.bidderId === leader?.bidderId)?.color || '#ffc266' }}>
                    <span>LEADING CONTRACT</span>
                    <b>{leader ? money(leader.minimumGuarantee) : money(session.lot.minimumGuarantee)}</b>
                    <div className={css.mkboardsub}>
                        {leader && <PlatformMark name={leader.bidderName} tint={leader.isPlayer ? playerTint : session.rivals.find(rival => rival.bidderId === leader.bidderId)?.color || '#777'} small />}
                        <em>{leader ? `${leader.licensorRevenueShare}% backend` : 'reserve'}</em>
                        {leader?.isPlayer && <span className={css.mkplatformbadge}>YOUR PLATFORM</span>}
                        {leader && leader.productionFunding > 0 && <em>{money(leader.productionFunding)} production funding</em>}
                        {leader?.futureFunding && <em>{fundingLabel(leader.futureFunding)}{leader.futureFunding.commitment === 'OPTION' ? ' · optional' : ''}</em>}
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
                        return <div key={bid.id} className={cx(css.mkoffer2, bid.isPlayer ? css.mine : '', index === 0 ? css.top : '')} style={{ ['--epx-auction-brand' as string]: tint }}>
                            <button className={css.mkofferhead} type="button" onClick={() => setExpandedBidId(open ? null : bid.id)}>
                                <i className={css.mkrank}>{index + 1}</i>
                                <PlatformMark name={bid.bidderName} tint={tint} small />
                                <b className={css.mkoffwho}>{bid.bidderName}{bid.isPlayer && <span className={css.mkplatformbadge}>YOUR PLATFORM</span>}</b>
                                <em className={css.mkoffterse}>{bid.licensorRevenueShare}% backend</em>
                                <b className={css.mkoffmg}>{money(bid.minimumGuarantee)}</b>
                            </button>
                            <i className={css.mkvalue} style={{ width: `${valueWidth}%` }} />
                            {open && <div className={css.mkoffterms}>
                                {[
                                    ['GUARANTEE', money(bid.minimumGuarantee)],
                                    ['BACKEND', `${bid.licensorRevenueShare}%`],
                                    ...(bid.productionFunding > 0 ? [['PRODUCTION FUNDING', money(bid.productionFunding)]] : []),
                                    ['FUTURE FUNDING', bid.futureFunding ? `${fundingLabel(bid.futureFunding)} · ${bid.futureFunding.commitment === 'FIRM' ? 'Firm commitment' : 'Optional deal'}` : 'Not offered'],
                                    ...(bid.futureFunding ? [
                                        ['FUNDING PER TITLE', money(bid.futureFunding.budgetPerProject)],
                                        ['FUTURE STREAMING SHARE', `${bid.futureFunding.platformRightsPercent}%`],
                                        ['DELIVERY', 'Within 52 weeks'],
                                    ] : []),
                                ].map(([key, value]) => <div className={css.mkctcell} key={key}><span>{key}</span><b>{value}</b></div>)}
                            </div>}
                        </div>;
                    })}
                    {!activeBids.length && <p className={css.mkempty}>Nothing has been tabled yet.</p>}
                </div>
            </div>

            <section className={css.mkmaker} aria-label="Auction offer console">
                {!backendAvailable && <p className={css.mkbidfeedback}>{backendReason}</p>}
                {feedback && <p className={css.mkbidfeedback} role="status" aria-live="polite">{feedback}</p>}
                <button className={css.mkmyterms} type="button" onClick={() => setTermsOpen(true)}>
                    <span>{offeredBackend ? `${offeredBackend}% backend` : 'no backend'}</span>
                    {previewTerms.productionFunding > 0 && <span>{money(previewTerms.productionFunding)} production</span>}
                    <span>{futureGreenlight ? fundingLabel(futureFunding) : 'no future funding'}</span>
                    <i>edit</i>
                </button>
                <div className={css.mkmakerrow}>
                    <button className={css.mkstep} type="button" aria-label="Decrease upfront bid" onClick={() => setUpfront(Math.max(session.lot.minimumGuarantee, upfront - session.lot.minimumBidIncrement))}>−</button>
                    <OfferUsdInput label="Upfront bid" draft={upfrontDraft} onChange={setUpfrontDraft} maximum={Number.MAX_SAFE_INTEGER} minimum={session.lot.minimumGuarantee} increment={100_000} />
                    <button className={css.mkstep} type="button" aria-label="Increase upfront bid" onClick={() => setUpfront(upfront + session.lot.minimumBidIncrement)}>+</button>
                </div>
                <button className={cx(css.mkbid, !canBid ? css.dead : '')} type="button" disabled={!canBid || submittingBid} aria-busy={submittingBid} onClick={placeBid}>
                    {submittingBid ? 'SUBMITTING BID…' : parsedUpfront.value === null || upfront % 100_000 !== 0 ? 'ENTER A VALID AMOUNT' : guaranteedExposure > funds ? `SHORT BY ${money(guaranteedExposure - funds)}` : `${playerBid ? 'REVISE' : 'TABLE'} ${money(upfront)}`}
                </button>
                <small className={css.mkbidbudget}>{money(guaranteedExposure)} reserved · {money(upfront)} upfront{previewTerms.productionFunding > 0 ? ` + ${money(previewTerms.productionFunding)} production funding` : ''}{firmFutureReserve > 0 ? ` + ${money(firmFutureReserve)} future funding` : ''}{futureGreenlight && futureFunding.commitment === 'OPTION' ? ' · optional funding is reserved only when activated' : ''}</small>
            </section>

            {termsOpen && <div className={css.mksheetwrap} onClick={() => setTermsOpen(false)}>
                <div className={css.mkfilters} onClick={event => event.stopPropagation()}>
                    <div className={css.mkfhead}><b>YOUR TERMS</b><button type="button" onClick={() => setTermsOpen(false)}>Done</button></div>
                    <div className={css.mktermrows}>
                        <div className={css.mkbackendrow}>
                            <span><b>Backend</b><small>{!backendAvailable ? backendReason : backend ? 'One share of this title’s actual ads + rental receipts' : 'Off · no revenue share offered'}</small></span>
                            <div><button type="button" aria-label="Decrease backend share" disabled={!backendAvailable || backend === 0} onClick={() => setBackend(Math.max(0, backend - 1))}>−</button><b>{backend}%</b><button type="button" aria-label="Increase backend share" disabled={!backendAvailable || backend >= session.lot.allowedTerms.backendMaximum} onClick={() => setBackend(Math.min(session.lot.allowedTerms.backendMaximum, backend + 1))}>+</button></div>
                        </div>
                        {session.lot.upcomingRightsSaleId && <label className={css.mkfundingfield}>Current production funding ($M)<input type="number" min="0" step="0.1" value={productionFunding / 1_000_000} onChange={event => setProductionFunding(Math.max(0, Number(event.target.value) || 0) * 1_000_000)} /><small>Additional funding for this title's production.</small></label>}
                    </div>
                    {session.lot.allowedTerms.futureGreenlightAllowed && <div className={css.mkfunding}>
                        <label className={css.mkfundingtoggle}><input type="checkbox" checked={futureGreenlight} onChange={event => setFutureGreenlight(event.target.checked)} /><span><b>Offer future project funding</b><small>Fund only this film’s sequel or this series’s next season.</small></span></label>
                        {futureGreenlight && <>
                            <div className={css.mkfundinggrid}>
                                <label className={css.mkfundingfield}>Project<select value={futureFunding.kind} onChange={event => setFutureFunding(previous => ({ ...previous, kind: event.target.value as StreamingAuctionFutureFundingTerms['kind'] }))}>{session.lot.projectType === 'MOVIE' && <option value="SEQUEL">Sequel</option>}{session.lot.projectType === 'SERIES' && <option value="NEXT_SEASON">Next season</option>}</select></label>
                                <label className={css.mkfundingfield}>Number of titles<select value={futureFunding.count} onChange={event => setFutureFunding(previous => ({ ...previous, count: Number(event.target.value) }))}>{[1, 2, 3].map(count => <option key={count} value={count}>{count}</option>)}</select></label>
                                <label className={css.mkfundingfield}>Funding per title ($M)<input type="number" min="0.1" step="0.1" value={futureFunding.budgetPerProject / 1_000_000} onChange={event => setFutureFunding(previous => ({ ...previous, budgetPerProject: Math.max(0, Number(event.target.value) || 0) * 1_000_000 }))} /></label>
                                <label className={css.mkfundingfield}>Format<select value={futureFunding.format} onChange={event => setFutureFunding(previous => ({ ...previous, format: event.target.value as StreamingAuctionFutureFundingTerms['format'] }))}><option value="ANY">Any format</option><option value="LIVE_ACTION">Live action</option><option value="ANIMATED">Animated</option><option value="ANIME">Anime</option></select></label>
                            </div>
                            <p className={css.mkfundingnote}>{money(futureFunding.count * futureFunding.budgetPerProject)} total funding · {continuation.baseTitle}{session.lot.projectType === 'SERIES' ? ' · seasons' : ' · parts'} {continuation.firstInstallmentNumber}{futureFunding.count > 1 ? `–${continuation.firstInstallmentNumber + futureFunding.count - 1}` : ''} · delivery within 52 weeks of signing.</p>
                        </>}
                    </div>}
                    {playerBid && <button className={css.mkfclear} type="button" onClick={withdraw}>Withdraw your standing contract</button>}
                </div>
            </div>}
        </section>
    </div>;
}
