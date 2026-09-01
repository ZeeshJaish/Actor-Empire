import { useMemo, useState } from 'react';
import { Archive, ChevronDown, Film, Gavel, Layers3, ShieldCheck } from 'lucide-react';
import type { PlatformId, Player, StreamingBiddingSession, StreamingOfferVersion } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
    acceptStreamingCataloguePackageOffer,
    createStreamingCataloguePackage,
    getStreamingCataloguePackageDesk,
} from '../services/streamingCataloguePackages';
import {
    acceptStreamingBiddingOffer,
    createStreamingCatalogueBiddingSession,
    leaveStreamingBiddingSession,
    upsertStreamingBiddingSession,
} from '../services/streamingBidding';
import { PHASE_ONE_ENERGY_COSTS } from '../services/energyCosts';
import { resolveStreamingPlatformBrandById } from '../services/streamingPlatformBrandRegistry';
import { StreamingBiddingRoom } from '../views/lifestyle/business/components/StreamingBiddingRoom';
import '../styles/streaming-catalogue-packages.css';

interface StreamingCataloguePackageDeskProps {
    player: Player;
    studioId: string;
    onUpdatePlayer: (player: Player) => void;
}

const PLATFORM_TERMS: Record<PlatformId, { baseBid: number; ceiling: number; quality: number }> = {
    NETFLIX: { baseBid: 24_000_000, ceiling: 620_000_000, quality: 72 },
    APPLE_TV: { baseBid: 30_000_000, ceiling: 760_000_000, quality: 84 },
    DISNEY_PLUS: { baseBid: 22_000_000, ceiling: 680_000_000, quality: 76 },
    HULU: { baseBid: 15_000_000, ceiling: 260_000_000, quality: 62 },
    YOUTUBE: { baseBid: 8_000_000, ceiling: 130_000_000, quality: 46 },
};

const formatMoney = (value: number): string => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    return `$${Math.round(value).toLocaleString()}`;
};

export default function StreamingCataloguePackageDesk({
    player,
    studioId,
    onUpdatePlayer,
}: StreamingCataloguePackageDeskProps) {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const studio = player.businesses.find(business => business.id === studioId);
    const desk = useMemo(() => getStreamingCataloguePackageDesk(player, studioId, absoluteWeek), [player, studioId, absoluteWeek]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [durationWeeks, setDurationWeeks] = useState(104);
    const [exclusive, setExclusive] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [room, setRoom] = useState<StreamingBiddingSession | null>(() => {
        const live = desk.live.find(cataloguePackage => cataloguePackage.biddingSessionId);
        return live?.biddingSessionId ? player.world.streamingBiddingSessions?.[live.biddingSessionId] || null : null;
    });

    const persistSession = (nextSession: StreamingBiddingSession) => {
        setRoom(nextSession);
        onUpdatePlayer({
            ...player,
            world: {
                ...player.world,
                streamingBiddingSessions: upsertStreamingBiddingSession(player.world.streamingBiddingSessions, nextSession),
            },
        });
    };

    const createPackage = () => {
        if (selectedIds.length < 2) {
            setFeedback('Choose at least two completed titles.');
            return;
        }
        const selectedTitles = desk.eligibleTitles.filter(title => selectedIds.includes(title.id));
        const genreCounts = selectedTitles.reduce((counts, title) => ({ ...counts, [title.genre]: (counts[title.genre] || 0) + 1 }), {} as Record<string, number>);
        const leadingGenre = (Object.entries(genreCounts) as Array<[string, number]>)
            .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0];
        const result = createStreamingCataloguePackage(player, {
            studioId,
            name: `${studio?.name || 'Studio'} ${leadingGenre ? `${leadingGenre.toLowerCase()} ` : ''}collection`,
            projectIds: selectedIds,
            source: 'PLAYER_CURATED',
            absoluteWeek,
            startsAtAbsoluteWeek: absoluteWeek,
            maximumDurationWeeks: durationWeeks,
            windowType: 'FIRST_WINDOW',
            exclusivity: exclusive ? 'EXCLUSIVE' : 'NON_EXCLUSIVE',
        });
        if (!result.package) {
            setFeedback(result.reason === 'NOT_ENOUGH_ELIGIBLE_TITLES' ? 'Fewer than two titles have compatible rights.' : 'This Production House cannot create the package.');
            return;
        }
        onUpdatePlayer(result.player);
        setSelectedIds([]);
        setFeedback(`${result.package.name} is ready for market review.`);
    };

    const openMarket = (packageId: string) => {
        const cataloguePackage = player.world.streamingCataloguePackages?.[packageId];
        if (!cataloguePackage) return;
        try {
            const session = createStreamingCatalogueBiddingSession({
                cataloguePackage,
                platforms: (Object.keys(PLATFORM_TERMS) as PlatformId[]).map(platformId => {
                    const platform = player.world.platforms?.[platformId];
                    const terms = PLATFORM_TERMS[platformId];
                    const brand = resolveStreamingPlatformBrandById(platformId, platform?.name);
                    const relationship = studio?.studioState?.platformRelations?.[platformId];
                    return {
                        id: platformId,
                        name: platform?.name || brand.displayName,
                        color: brand.primaryColor,
                        cashAvailable: Math.max(0, Number(platform?.cashReserve || 0)) * 1_000_000,
                        baseBid: terms.baseBid,
                        acquisitionCeiling: terms.ceiling,
                        qualityPreference: terms.quality,
                        relationshipMultiplier: Math.max(.84, Math.min(1.16, 1 + Number(relationship?.trustModifier || 0) / 100)),
                        canStartNewBids: Boolean(platform),
                    };
                }),
            });
            const livePackage = { ...cataloguePackage, lifecycle: 'LIVE' as const, biddingSessionId: session.id };
            const nextPlayer: Player = {
                ...player,
                world: {
                    ...player.world,
                    streamingCataloguePackages: { ...player.world.streamingCataloguePackages, [packageId]: livePackage },
                    streamingBiddingSessions: upsertStreamingBiddingSession(player.world.streamingBiddingSessions, session),
                },
            };
            setRoom(session);
            onUpdatePlayer(nextPlayer);
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : 'No platform can carry this package today.');
        }
    };

    const acceptOffer = (offer: StreamingOfferVersion) => {
        if (!room?.cataloguePackageId) return;
        const acceptedSession = acceptStreamingBiddingOffer(room, offer.id);
        const prepared: Player = {
            ...player,
            world: {
                ...player.world,
                streamingBiddingSessions: upsertStreamingBiddingSession(player.world.streamingBiddingSessions, acceptedSession),
            },
        };
        const result = acceptStreamingCataloguePackageOffer(prepared, {
            packageId: room.cataloguePackageId,
            session: acceptedSession,
            offerId: offer.id,
            absoluteWeek,
        });
        if (!result.changed) {
            setFeedback(result.detail || 'The package could not be signed.');
            return;
        }
        setRoom(null);
        onUpdatePlayer(result.player);
        setFeedback(`${result.package?.name || 'Package'} signed for ${formatMoney(result.package?.totalGuarantee || 0)}.`);
    };

    const leaveRoom = () => {
        if (!room?.cataloguePackageId) return;
        const left = leaveStreamingBiddingSession(room);
        const cataloguePackage = player.world.streamingCataloguePackages?.[room.cataloguePackageId];
        setRoom(left);
        onUpdatePlayer({
            ...player,
            world: {
                ...player.world,
                streamingBiddingSessions: upsertStreamingBiddingSession(player.world.streamingBiddingSessions, left),
                streamingCataloguePackages: cataloguePackage ? {
                    ...player.world.streamingCataloguePackages,
                    [cataloguePackage.id]: { ...cataloguePackage, lifecycle: 'WITHDRAWN' },
                } : player.world.streamingCataloguePackages,
            },
        });
    };

    if (room) {
        return <div className="scp-room-shell"><StreamingBiddingRoom
            session={room}
            canAccept={player.energy.current >= PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT}
            energyCost={PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT}
            onStart={() => undefined}
            onSessionChange={persistSession}
            onAccept={acceptOffer}
            onLeave={leaveRoom}
            onBack={() => setRoom(null)}
        /></div>;
    }

    return (
        <section className="streaming-catalogue-desk">
            <header className="scp-intro">
                <div className="scp-reel"><Layers3 size={24} /><span>{desk.eligibleTitleCount}</span></div>
                <div><p>PORTFOLIO LICENSING / WEEK {absoluteWeek}</p><h2>Package Desk</h2><span>Move several completed films through one market decision. Every title keeps its own rights and earnings record.</span></div>
            </header>

            {feedback ? <div className="scp-feedback" role="status"><ShieldCheck size={15} />{feedback}</div> : null}

            <div className="scp-workbench">
                <section className="scp-title-selector">
                    <header><div><span>AVAILABLE NEGATIVES</span><h3>Build a catalogue lot</h3></div><strong>{selectedIds.length}/12</strong></header>
                    <div className="scp-title-list">
                        {desk.eligibleTitles.length ? desk.eligibleTitles.map((title, index) => {
                            const selected = selectedIds.includes(title.id);
                            return <button type="button" key={title.id} className={selected ? 'is-selected' : ''} onClick={() => setSelectedIds(current => selected ? current.filter(id => id !== title.id) : current.length < 12 ? [...current, title.id] : current)}>
                                <i>{String(index + 1).padStart(2, '0')}</i><span><strong>{title.title}</strong><small>{title.genre.toLowerCase()} · quality {Math.round(title.quality)}</small></span><b>{selected ? 'IN LOT' : 'ADD'}</b>
                            </button>;
                        }) : <div className="scp-empty-line"><Archive size={18} />No unreserved completed titles are available.</div>}
                    </div>
                </section>

                <aside className="scp-mandate">
                    <p>SALE MANDATE</p>
                    <label><span>Term</span><select value={durationWeeks} onChange={event => setDurationWeeks(Number(event.target.value))}><option value={52}>52 weeks</option><option value={104}>104 weeks</option><option value={156}>156 weeks</option></select><ChevronDown size={14} /></label>
                    <label className="scp-check"><input type="checkbox" checked={exclusive} onChange={event => setExclusive(event.target.checked)} /><span><strong>Exclusive window</strong><small>Shared rights are safer for repeat licensing.</small></span></label>
                    <div className="scp-mandate-readout"><span>Selected</span><strong>{selectedIds.length} titles</strong><small>Worldwide requested · exact conflicts removed per title</small></div>
                    <button type="button" disabled={selectedIds.length < 2} onClick={createPackage}><Film size={15} />Prepare package</button>
                </aside>
            </div>

            <section className="scp-proposals">
                <header><div><span>PORTFOLIO PROPOSALS</span><h3>Portfolio proposals</h3></div><strong>{desk.ready.length + desk.live.length}</strong></header>
                {[...desk.live, ...desk.ready].length ? [...desk.live, ...desk.ready].map(cataloguePackage => (
                    <article key={cataloguePackage.id} className="scp-proposal">
                        <div className="scp-proposal-spine"><span>{cataloguePackage.lifecycle}</span><i /></div>
                        <div className="scp-proposal-title"><h4>{cataloguePackage.name}</h4><p>{cataloguePackage.components.length} titles · {cataloguePackage.requestedExclusivity === 'EXCLUSIVE' ? 'exclusive' : 'shared'} · up to {cataloguePackage.maximumDurationWeeks} weeks</p></div>
                        <div className="scp-proposal-titles">{cataloguePackage.components.slice(0, 3).map(component => <span key={component.sourceProjectId}>{component.title}</span>)}{cataloguePackage.components.length > 3 ? <small>+{cataloguePackage.components.length - 3} more</small> : null}</div>
                        <button type="button" onClick={() => cataloguePackage.lifecycle === 'LIVE' && cataloguePackage.biddingSessionId ? setRoom(player.world.streamingBiddingSessions?.[cataloguePackage.biddingSessionId] || null) : openMarket(cataloguePackage.id)}><Gavel size={15} />{cataloguePackage.lifecycle === 'LIVE' ? 'Return to room' : 'Open bidding room'}</button>
                    </article>
                )) : <div className="scp-empty-line"><Layers3 size={18} />No package proposal is waiting.</div>}
            </section>

            {desk.signed.length ? <section className="scp-signed"><header><span>SIGNED PORTFOLIOS</span><strong>{desk.signed.length}</strong></header>{desk.signed.slice(0, 8).map(cataloguePackage => <div key={cataloguePackage.id}><span>{cataloguePackage.name}<small>{cataloguePackage.components.length} title contracts</small></span><strong>{formatMoney(cataloguePackage.totalGuarantee)}</strong></div>)}</section> : null}
        </section>
    );
}
