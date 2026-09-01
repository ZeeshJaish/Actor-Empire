import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Clock3, FileSignature, Radio, X } from 'lucide-react';
import type { StreamingBiddingSession, StreamingCataloguePackageComponent, StreamingOfferVersion } from '../../../../types';
import {
    advanceStreamingBiddingSession,
    getStreamingBiddingClosingOffers,
} from '../../../../services/streamingBidding';
import { resolveStreamingPlatformBrandById } from '../../../../services/streamingPlatformBrandRegistry';
import { formatStreamingBiddingRightsLotScope } from '../../../../services/streamingRightsCompatibility';
import StreamingPlatformBrand from '../../../../components/StreamingPlatformBrand';
import '../../../../styles/streaming-bidding-room.css';

interface StreamingBiddingRoomProps {
    session: StreamingBiddingSession | null;
    canAccept: boolean;
    energyCost: number;
    onStart: () => void;
    onSessionChange: (session: StreamingBiddingSession) => void;
    onAccept: (offer: StreamingOfferVersion) => void;
    onLeave: () => void;
    onBack: () => void;
    preflightMessage?: string | null;
    canStart?: boolean;
}

const formatMoney = (value: number): string => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1)}M`;
    return `$${Math.round(value / 1_000).toLocaleString()}k`;
};

const formatDealStructure = (offer: StreamingOfferVersion): string => {
    if (offer.dealStructure === 'FLAT_LICENSE') return 'Flat licence';
    if (offer.dealStructure === 'PRE_BUY') return 'Pre-buy and funding';
    return 'Guarantee and backend';
};

const OfferSlip: React.FC<{
    offer: StreamingOfferVersion;
    canAccept: boolean;
    energyCost: number;
    onAccept: (offer: StreamingOfferVersion) => void;
    rightsScope: string;
    packageComponents?: StreamingCataloguePackageComponent[];
}> = ({ offer, canAccept, energyCost, onAccept, rightsScope, packageComponents }) => {
    const brand = resolveStreamingPlatformBrandById(offer.platformId, offer.platformName);
    const packageRows = offer.componentTerms || [];
    const backendRange = packageRows.length
        ? `${Math.min(...packageRows.map(row => row.licensorRevenueShare))}-${Math.max(...packageRows.map(row => row.licensorRevenueShare))}%`
        : null;
    return (
    <motion.article
        layout
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="streaming-bid-slip"
        style={{ '--bid-platform-color': brand.primaryColor } as React.CSSProperties}
    >
        <header className="streaming-bid-slip__header">
            <div>
                <span className="streaming-bid-slip__eyebrow"><StreamingPlatformBrand brand={brand} variant="WORDMARK" size="XS" /> · Revision {offer.revision}</span>
                <h3>{formatMoney(offer.minimumGuarantee)}</h3>
            </div>
            <div className="streaming-bid-slip__structure">{packageRows.length ? `${packageRows.length} titles · ${backendRange} backend` : formatDealStructure(offer)}</div>
        </header>

        <div className="streaming-bid-slip__terms" aria-label={`${offer.platformName} contract terms`}>
            <div><span>Backend</span><strong>{offer.licensorRevenueShare}%</strong></div>
            <div><span>Basis</span><strong>Adjusted gross</strong></div>
            <div><span>Guarantee</span><strong>{offer.guaranteeRecoupment === 'RECOUPABLE' ? 'Recoupable' : 'Non-recoupable'}</strong></div>
            <div><span>Backend cap</span><strong>{offer.backendCap === null ? 'Uncapped' : formatMoney(offer.backendCap)}</strong></div>
            <div><span>Term</span><strong>{offer.durationWeeks} weeks</strong></div>
            <div><span>Rights</span><strong>{rightsScope} · {offer.exclusivity === 'EXCLUSIVE' ? 'exclusive' : 'shared'}</strong></div>
            <div><span>Localization</span><strong>{offer.localization === 'DUBS_AND_SUBTITLES' ? 'Dubs + subtitles' : offer.localization === 'SUBTITLES' ? 'Subtitles' : 'Not included'}</strong></div>
            <div><span>Renewal</span><strong>{offer.renewalOption ? 'First option' : 'Open market'}</strong></div>
        </div>

        {packageRows.length ? <details className="streaming-bid-slip__schedule">
            <summary><span>Title schedule</span><small>Guarantee · backend · recoupment</small></summary>
            <div>
                {packageRows.map((row, index) => {
                    const component = packageComponents?.find(candidate => candidate.sourceProjectId === row.componentProjectId);
                    return <p key={row.componentProjectId}><i>{String(index + 1).padStart(2, '0')}</i><span><strong>{component?.title || row.componentProjectId}</strong><small>{row.countryIds.length} markets · {row.durationWeeks}w</small></span><b>{formatMoney(row.minimumGuarantee)}</b><em>{row.licensorRevenueShare}%</em><u>{row.guaranteeRecoupment === 'RECOUPABLE' ? 'Recoupable' : 'Non-recoupable'}{row.backendCap === null ? ' · uncapped' : ` · ${formatMoney(row.backendCap)} cap`}</u></p>;
                })}
            </div>
        </details> : null}

        {(offer.productionFunding > 0 || offer.futureSeasonFunding > 0) && (
            <div className="streaming-bid-slip__funding">
                {offer.productionFunding > 0 && <span>Production fund {formatMoney(offer.productionFunding)}</span>}
                {offer.futureSeasonFunding > 0 && <span>Future season {formatMoney(offer.futureSeasonFunding)}</span>}
            </div>
        )}

        <button
            type="button"
            className="streaming-bid-slip__accept"
            disabled={!canAccept}
            onClick={() => onAccept(offer)}
        >
            <FileSignature size={16} aria-hidden="true" />
            {canAccept ? `Accept terms · ${energyCost}E` : `Need ${energyCost}E`}
        </button>
    </motion.article>
    );
};

const eventCopy = (session: StreamingBiddingSession, event: StreamingBiddingSession['events'][number]): string => {
    const platform = session.platformStates.find(state => state.platformId === event.platformId)?.platformName;
    if (event.type === 'OPENED') return `${platform} put the first contract on the table.`;
    if (event.type === 'PITCHED') return `${platform} entered the room.`;
    if (event.type === 'REVISED') return `${platform} replaced its terms.`;
    if (event.type === 'FINAL') return `${platform} marked its contract final.`;
    if (event.type === 'WITHDREW') return `${platform} left the room.`;
    if (event.type === 'CLOSED') return 'The live floor closed. Standing contracts remain available.';
    return `${platform || 'The room'} updated the contract table.`;
};

export const StreamingBiddingRoom: React.FC<StreamingBiddingRoomProps> = ({
    session,
    canAccept,
    energyCost,
    onStart,
    onSessionChange,
    onAccept,
    onLeave,
    onBack,
    preflightMessage,
    canStart = true,
}) => {
    const latestSessionRef = React.useRef(session);
    const onSessionChangeRef = React.useRef(onSessionChange);
    latestSessionRef.current = session;
    onSessionChangeRef.current = onSessionChange;

    React.useEffect(() => {
        if (!session || session.status !== 'LIVE') return undefined;
        const interval = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            const current = latestSessionRef.current;
            if (!current || current.status !== 'LIVE') return;
            onSessionChangeRef.current(advanceStreamingBiddingSession(current, 1));
        }, 1_000);
        return () => window.clearInterval(interval);
    }, [session?.id, session?.status]);

    if (!session) {
        return (
            <section className="streaming-bidding-room streaming-bidding-room--idle">
                <div className="streaming-bidding-room__opening-mark"><Radio size={30} aria-hidden="true" /></div>
                <p className="streaming-bidding-room__kicker">Rights floor ready</p>
                <h3>Open the contract table</h3>
                <p>{preflightMessage || 'Worldwide rights available. Platforms will compete against one another; you can accept a standing contract or let the room close.'}</p>
                <div className="streaming-bidding-room__idle-actions">
                    <button type="button" className="streaming-bidding-room__back" onClick={onBack}>Back</button>
                    <button type="button" className="streaming-bidding-room__start" disabled={!canStart} onClick={onStart}>{canStart ? 'Start bidding war' : 'No eligible market'}</button>
                </div>
            </section>
        );
    }

    const offers = getStreamingBiddingClosingOffers(session);
    const closing = session.status === 'CLOSING' || session.status === 'LEFT';
    const progress = Math.max(0, Math.min(100, session.roomSecondsRemaining / 15 * 100));
    const rightsScope = formatStreamingBiddingRightsLotScope(session.rightsLot);
    const isPackage = session.subjectKind === 'CATALOGUE_PACKAGE';

    return (
        <section className={`streaming-bidding-room ${closing ? 'streaming-bidding-room--closing' : ''}`}>
            <header className="streaming-bidding-room__clock" aria-live="polite">
                {isPackage ? <div className="streaming-bidding-room__package-line"><span>CATALOGUE LOT</span><strong>{session.title}</strong><small>{session.catalogueComponents?.length || session.componentLots?.length || 0} titles · all-or-nothing decision</small></div> : null}
                <div className="streaming-bidding-room__clock-copy">
                    <span><Clock3 size={15} aria-hidden="true" /> Room clock</span>
                    <strong>{closing ? 'Closing table' : `${session.roomSecondsRemaining}s`}</strong>
                </div>
                <div className="streaming-bidding-room__clock-track" aria-hidden="true">
                    <motion.div animate={{ width: `${closing ? 0 : progress}%` }} transition={{ duration: 0.35 }} />
                </div>
                <p>{closing ? 'Live revisions have stopped. Choose any standing contract or leave it unsigned.' : 'A new pitch can extend this shared clock. Every platform waits the same six seconds before acting again.'}</p>
                {session.rightsLot.notice && <p className="streaming-bidding-room__scope-notice">{session.rightsLot.notice}</p>}
            </header>

            <div className="streaming-bidding-room__layout">
                <main className="streaming-bidding-room__offers">
                    <div className="streaming-bidding-room__section-heading">
                        <div><span>Standing contracts</span><strong>{offers.length}</strong></div>
                        <p>Terms are shown as written. No contract is selected automatically.</p>
                    </div>
                    <AnimatePresence mode="popLayout">
                        {offers.map(offer => (
                            <OfferSlip key={offer.id} offer={offer} canAccept={canAccept && session.status !== 'LEFT'} energyCost={energyCost} onAccept={onAccept} rightsScope={rightsScope} packageComponents={session.catalogueComponents} />
                        ))}
                    </AnimatePresence>
                </main>

                <aside className="streaming-bidding-room__market">
                    <div className="streaming-bidding-room__bidders">
                        <h3>Bidders</h3>
                        {session.platformStates.map(state => {
                            const brand = resolveStreamingPlatformBrandById(state.platformId, state.platformName);
                            const responseProgress = state.status === 'RESPONDING'
                                ? (state.actionCooldownSeconds - state.secondsUntilAction) / state.actionCooldownSeconds
                                : 1;
                            return (
                                <div className="streaming-bidder" key={state.platformId}>
                                    <div className="streaming-bidder__identity">
                                        <i style={{ background: brand.primaryColor }} />
                                        <StreamingPlatformBrand brand={brand} variant="WORDMARK" size="XS" />
                                        <small>{state.status === 'RESPONDING' ? `${state.secondsUntilAction}s` : state.status.toLowerCase()}</small>
                                    </div>
                                    <div className="streaming-bidder__response"><i style={{ width: `${responseProgress * 100}%`, background: brand.primaryColor }} /></div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="streaming-bidding-room__tape">
                        <h3>Market tape</h3>
                        {[...session.events].reverse().slice(0, 10).map(event => (
                            <div key={event.id}><time>{String(event.activeSecond).padStart(2, '0')}s</time><p>{eventCopy(session, event)}</p></div>
                        ))}
                    </div>
                </aside>
            </div>

            <footer className="streaming-bidding-room__footer">
                <button type="button" className="streaming-bidding-room__back" onClick={onBack}>Back</button>
                {closing && session.status !== 'LEFT' && (
                    <button type="button" className="streaming-bidding-room__leave" onClick={onLeave}><X size={15} /> Leave without signing</button>
                )}
                {session.status === 'LEFT' && <p>The room is closed unsigned. A fresh market can form next game week.</p>}
            </footer>
        </section>
    );
};
