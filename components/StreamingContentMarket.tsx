import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, BellOff, CalendarDays, Check, ChevronDown, ChevronRight, Clock3, FileSignature, Film, Gavel, Handshake, LibraryBig, Search, Sparkles, Wallet, X } from 'lucide-react';
import type { OwnedStreamingRightsNegotiation, Player } from '../types';
import AccessibleDialog from './AccessibleDialog';
import { type Brand, Mark } from './streaming-transplant/StreamingBrandVisuals';
import { brandVars } from './streaming-transplant/presentation/brand';
import { Poster } from './studio-finance/components/Poster';
import { STREAMING_STARTER_CATALOG_PACKAGES } from '../services/streamingCatalog';
import { getStreamingDayOneMarket } from '../services/streamingDayOneMarkets';
import { establishContentMarketCatalogue, getContentMarketAuctionCollections, getContentMarketListings, getContentMarketCollections, getContentMarketOwnedTitles, getContentMarketFunds, getContentMarketSupplySummary,
    linkContentMarketOwnedTitles, purchaseContentMarketListing, purchaseContentMarketCollection, saveContentMarketStrategy, submitContentMarketPrivateOffer } from '../services/streamingContentMarket';
import { normalizeOwnedStreamingPlatformState, compactOwnedStreamingPlatformForPersistence } from '../services/ownedStreamingPlatform';
import { PHASE_ONE_ENERGY_COSTS } from '../services/energyCosts';
import { acceptStreamingRightsCounter, reviseStreamingRightsNegotiation,
    signStreamingRightsDeal, withdrawStreamingRightsNegotiation, type StreamingRightsTermsInput } from '../services/streamingRightsMarketplace';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingBuyerAuctionLots, openStreamingBuyerAuction } from '../services/streamingBuyerAuctions';
import { followStreamingUpcomingRightsSale, getStreamingUpcomingRightsSales } from '../services/streamingUpcomingRights';
import StreamingBuyerAuctionRoom from './StreamingBuyerAuctionRoom';
import ContentMarketOneSheet from './ContentMarketOneSheet';
import { ContentMarket as ExactContentMarket, type MarketScene } from '../content-market-exact/ExactContentMarket';
import { buildExactContentMarketLots } from '../content-market-exact/adapter';
import type { Lot as ExactContentMarketLot, Offer as ExactContentMarketOffer } from '../content-market-exact/model';
import '../styles/streaming-content-market.css';

const money = (n: number) => n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2).replace(/\.00$/, '')}M` : `$${Math.round(n).toLocaleString()}`;
const countries = (ids: string[]) => ids.length ? ids.map(id => getStreamingDayOneMarket(id)?.country || id).join(', ') : 'Worldwide';
type Draft = NonNullable<Player['ownedStreamingPlatform']['contentMarketDraft']>;
interface Props {
    player: Player; brand: Brand; onUpdatePlayer: (player: Player) => void; onClose: () => void;
    onOpenFinance: () => void; onCommission: () => void; onReview: () => void;
    returnToLaunch?: boolean;
    onResumeLegacy?: () => void;
    onExistingNegotiations?: () => void;
    initialOfferId?: string;
    initialAuctionId?: string;
}

function PrivateOfferEditor({ title, sellerName, terms, setTerms, availableCountryIds, advanced, setAdvanced, onCancel, onSubmit, busy }: {
    title: string;
    sellerName: string;
    terms: StreamingRightsTermsInput;
    setTerms: React.Dispatch<React.SetStateAction<StreamingRightsTermsInput | null>>;
    availableCountryIds: string[];
    advanced: boolean;
    setAdvanced: (value: boolean) => void;
    onCancel: () => void;
    onSubmit: () => void;
    busy: boolean;
}) {
    const patchTerms = (patch: Partial<StreamingRightsTermsInput>) => setTerms(current => current ? { ...current, ...patch } : current);
    const chosenCountries = terms.countryIds || availableCountryIds;
    const toggleCountry = (id: string) => patchTerms({
        countryIds: chosenCountries.includes(id) ? chosenCountries.filter(countryId => countryId !== id) : [...chosenCountries, id],
        territory: 'MULTI_REGION',
    });
    const sellerInitials = sellerName.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
    return <section className="cm-offer-stage" aria-label="Private offer terms">
        <div className="cm-negotiator"><span>{sellerInitials}</span><div><em>WHO IS ACROSS THE TABLE</em><b>Rights representative</b><small>{sellerName}</small></div></div>
        <p className="cm-negotiator-line">You are redlining the published terms for <b>{title}</b>. The seller replies after the week progresses.</p>
        <div className="cm-offer-editor">
        <div className="cm-editor-head"><div><span>HEADS OF TERMS · DRAFT</span><h2>Shape your offer</h2></div><button aria-label="Close offer editor" onClick={onCancel}><X size={18} /></button></div>
        <label><span>Upfront offer</span><input type="number" min={0} step={250000} value={terms.minimumGuarantee} onChange={event => patchTerms({ minimumGuarantee: Number(event.target.value) })} /><small>{money(terms.minimumGuarantee)}</small></label>
        <label><span>Your revenue share</span><input type="range" min={45} max={90} value={terms.platformRevenueShare} onChange={event => patchTerms({ platformRevenueShare: Number(event.target.value) })} /><small>{terms.platformRevenueShare}% platform · {100 - terms.platformRevenueShare}% rights holder</small></label>
        <div className="cm-editor-pair"><label><span>Term</span><select value={terms.durationWeeks} onChange={event => patchTerms({ durationWeeks: Number(event.target.value) })}><option value={52}>1 year</option><option value={104}>2 years</option><option value={156}>3 years</option><option value={260}>5 years</option></select></label><label><span>Rights</span><select value={terms.exclusivity} onChange={event => patchTerms({ exclusivity: event.target.value as any })}><option value="NON_EXCLUSIVE">Shared</option><option value="EXCLUSIVE">Exclusive</option></select></label></div>
        <fieldset className="cm-country-pick"><legend>Markets in this proposal</legend>{availableCountryIds.map(id => <button type="button" key={id} aria-pressed={chosenCountries.includes(id)} onClick={() => toggleCountry(id)}>{getStreamingDayOneMarket(id)?.country || id}</button>)}</fieldset>
        <button type="button" className="cm-advanced-toggle" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}>Deal protections <ChevronDown size={15} /></button>
        {advanced && <div className="cm-advanced-grid"><label><span>Marketing commitment</span><input type="number" min={0} step={250000} value={terms.marketingGuarantee} onChange={event => patchTerms({ marketingGuarantee: Number(event.target.value) })} /></label><label><span>Viewership bonus</span><input type="number" min={0} step={250000} value={terms.viewershipBonusAmount} onChange={event => patchTerms({ viewershipBonusAmount: Number(event.target.value) })} /></label><label><span>Bonus at viewers</span><input type="number" min={0} step={100000} value={terms.viewershipBonusThreshold} onChange={event => patchTerms({ viewershipBonusThreshold: Number(event.target.value) })} /></label><label><span>Cancellation penalty</span><input type="number" min={0} step={250000} value={terms.cancellationPenalty} onChange={event => patchTerms({ cancellationPenalty: Number(event.target.value) })} /></label><label><span>Change of control</span><select value={terms.changeOfControl} onChange={event => patchTerms({ changeOfControl: event.target.value as StreamingRightsTermsInput['changeOfControl'] })}><option value="NONE">No restriction</option><option value="NOTICE">Notify rights holder</option><option value="CONSENT_REQUIRED">Consent required</option></select></label><label className="cm-check"><input type="checkbox" checked={terms.renewalOption} onChange={event => patchTerms({ renewalOption: event.target.checked })} /><span>Renewal option</span></label><label className="cm-check"><input type="checkbox" checked={terms.sublicensingAllowed} onChange={event => patchTerms({ sublicensingAllowed: event.target.checked })} /><span>Sublicensing</span></label><label className="cm-check"><input type="checkbox" checked={terms.sequelRightsIncluded} onChange={event => patchTerms({ sequelRightsIncluded: event.target.checked })} /><span>Sequel rights</span></label></div>}
        <div className="cm-editor-actions"><button className="cm-walk" onClick={onCancel}>Cancel</button><button className="cm-primary" disabled={busy || chosenCountries.length === 0 || terms.minimumGuarantee <= 0} onClick={onSubmit}>Send private offer</button></div>
        </div>
        <p className="cm-offer-footnote">Nothing is charged while an offer is with the seller. Rights remain available until both sides sign.</p>
    </section>;
}

function ContentMarketPower({ treasury, available, withinReach, totalListed }: {
    treasury: number;
    available: number;
    withinReach: number;
    totalListed: number;
}) {
    const committed = Math.max(0, treasury - available);
    const availablePercent = treasury > 0 ? Math.max(2, Math.min(100, (available / treasury) * 100)) : 0;
    return <section className="cm-power" aria-label="Content buying power">
        <div className="cm-power-head"><span>BUYING POWER</span><em><b>{withinReach}</b> of {totalListed} listed deals within reach</em></div>
        <strong>{money(available)}</strong>
        <div className="cm-power-track" aria-hidden="true"><i style={{ width: `${availablePercent}%` }} /></div>
        <div className="cm-power-legend"><span className="is-free">{money(available)} to spend</span><span className="is-held">{money(committed)} committed</span><span>{money(treasury)} treasury</span></div>
    </section>;
}

function ContentMarketGate({ player, funds, listingPrices, owned, liveRooms, brand, onBack, onStudio, onCommission, onMarket }: {
    player: Player;
    funds: number;
    listingPrices: number[];
    owned: ReturnType<typeof getContentMarketOwnedTitles>;
    liveRooms: number;
    brand: Brand;
    onBack: () => void;
    onStudio: () => void;
    onCommission: () => void;
    onMarket: () => void;
}) {
    const treasury = player.ownedStreamingPlatform.treasuryCash;
    const readyOwned = owned.filter(title => !title.linked && !title.unavailableReason);
    const marketCount = listingPrices.length;
    const withinReach = listingPrices.filter(price => price <= funds).length;
    return <AccessibleDialog className="cm-market cm-market-gate" data-epx-root style={brandVars(brand)} aria-label="Content Market" onEscape={onBack}>
        <div className="cm-gate-glow" />
        <header className="cm-gate-top">
            <button type="button" aria-label="Back" onClick={onBack}><ArrowLeft size={19} /></button>
            <div><strong>ADD CONTENT</strong><span>WHERE IS IT COMING FROM?</span></div>
            <span className="cm-mark"><Mark brand={brand} /></span>
        </header>
        <main className="cm-gate-scroll">
            <ContentMarketPower treasury={treasury} available={funds} withinReach={withinReach} totalListed={marketCount} />
            <button type="button" className="cm-door is-studio" onClick={onStudio}>
                <span className="cm-door-art cm-door-stack">{readyOwned.slice(0, 3).map((title, index) => <span key={title.id} style={{ '--cm-stack-index': index } as React.CSSProperties}><Poster seed={title.id} size={54} /></span>)}</span>
                <span className="cm-door-copy"><b>FROM YOUR STUDIO</b><small>Bring titles your companies control. Only eligible streaming markets are linked.</small><em>{readyOwned.length} READY · NO INTERNAL FEE</em></span>
                <ChevronRight size={17} />
            </button>
            <button type="button" className="cm-door is-original" onClick={onCommission}>
                <span className="cm-door-art cm-door-frame"><i><Film size={19} /></i></span>
                <span className="cm-door-copy"><b>COMMISSION AN ORIGINAL</b><small>Start with a brief, fund production, and secure the rights written into the commission.</small><em>BUILD FROM A BRIEF</em></span>
                <ChevronRight size={17} />
            </button>
            <button type="button" className="cm-door is-market" onClick={onMarket}>
                <span className="cm-door-art cm-door-wall">{listingPrices.slice(0, 6).map((_, index) => <span key={index}><Poster seed={`content-market-door-${index}`} size={34} /></span>)}</span>
                <span className="cm-door-copy"><b>THE MARKET</b><small>License released titles, collections, and announced rights from other companies.</small><em>{marketCount} LISTED · {liveRooms} LIVE</em></span>
                <ChevronRight size={17} />
            </button>
        </main>
    </AccessibleDialog>;
}

export default function StreamingContentMarket({ player, brand, onUpdatePlayer, onClose, onOpenFinance, onCommission, onReview, returnToLaunch, onResumeLegacy, onExistingNegotiations, initialOfferId, initialAuctionId }: Props) {
    const platform = player.ownedStreamingPlatform;
    const [draft, setDraft] = useState<Draft>(() => initialAuctionId
        ? { ...(platform.contentMarketDraft || { search: '', ownedIds: [] }), tab: 'AUCTIONS', selectedId: initialAuctionId }
        : initialOfferId
        ? { ...(platform.contentMarketDraft || { search: '', ownedIds: [] }), tab: 'OFFERS', selectedId: initialOfferId }
        : platform.contentMarketDraft || { tab: 'ALL', search: '', selectedId: null, ownedIds: platform.catalogSetupDraft?.selectedOwnedProjectIds || [] });
    const [feedback, setFeedback] = useState('');
    const [busy, setBusy] = useState(false);
    const [offerEditor, setOfferEditor] = useState(false);
    const [advancedOffer, setAdvancedOffer] = useState(false);
    const [offerTerms, setOfferTerms] = useState<StreamingRightsTermsInput | null>(null);
    const [atGate, setAtGate] = useState(() => !initialOfferId && !initialAuctionId && !platform.contentMarketDraft?.selectedId);
    const listings = useMemo(() => getContentMarketListings(player), [player]);
    const collections = useMemo(() => getContentMarketCollections(player), [player]);
    const supplySummary = useMemo(() => getContentMarketSupplySummary(player), [player]);
    const auctionLots = useMemo(() => getStreamingBuyerAuctionLots(player), [player]);
    const upcomingSales = useMemo(() => getStreamingUpcomingRightsSales(player), [player]);
    const auctionListingIds = useMemo(() => new Set(auctionLots.filter(lot => lot.listingKind === 'TITLE').map(lot => lot.listingId)), [auctionLots]);
    const auctionCollectionIds = useMemo(() => new Set(getContentMarketAuctionCollections(player).map(collection => collection.id)), [player]);
    const owned = useMemo(() => getContentMarketOwnedTitles(player), [player]);
    const selected = listings.find(o => o.id === draft.selectedId);
    const collection = collections.find(o => o.id === draft.selectedId);
    const auctionLot = auctionLots.find(lot => lot.id === draft.selectedId)
        || platform.buyerAuctionSessions.find(session => session.id === draft.selectedId)?.lot
        || null;
    const activeAuctionSession = platform.buyerAuctionSessions.find(session => session.lot.id === auctionLot?.id) || null;
    const privateOffers = platform.rightsNegotiations.filter(offer => Boolean(offer.proposalVersion));
    const selectedOffer = privateOffers.find(offer => offer.id === draft.selectedId) || null;
    const selectedUpcoming = upcomingSales.find(sale => sale.id === draft.selectedId) || null;
    const selectedUpcomingLot = auctionLots.find(lot => lot.upcomingRightsSaleId === selectedUpcoming?.id) || null;
    const funds = getContentMarketFunds(player);
    const patch = (value: Partial<Draft>) => { setDraft(d => ({ ...d, ...value })); setFeedback(''); };
    const persistDraft = () => {
        const p = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
        onUpdatePlayer({ ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...p, contentMarketDraft: draft }, player.id) });
    };
    useEffect(() => {
        if (JSON.stringify(player.ownedStreamingPlatform.contentMarketDraft) === JSON.stringify(draft)) return;
        const timer = window.setTimeout(persistDraft, 350);
        return () => window.clearTimeout(timer);
    }, [draft, player, onUpdatePlayer]);
    const leave = (next: () => void) => { persistDraft(); next(); };
    const accept = (action: () => { player: Player; changed: boolean; detail: string }) => {
        if (busy) return;
        setBusy(true);
        try {
            const result = action();
            if (result.changed) {
                const next = { ...draft, selectedId: null, ownedIds: [] };
                setDraft(next);
                onUpdatePlayer({ ...result.player, ownedStreamingPlatform: { ...result.player.ownedStreamingPlatform, contentMarketDraft: next } });
            }
            setFeedback(result.detail);
        } finally { setBusy(false); }
    };
    const query = draft.search.trim().toLowerCase();
    const visible = listings.filter(o => !auctionListingIds.has(o.id) && (draft.tab === 'ALL' || draft.tab === o.title.projectType)
        && `${o.title.title} ${o.title.genre} ${o.sellerName}`.toLowerCase().includes(query));
    const visibleCollections = collections.filter(o => !auctionCollectionIds.has(o.id) && ['ALL', 'COLLECTIONS'].includes(draft.tab) && o.package.name.toLowerCase().includes(query));
    const visibleOwned = owned.filter(o => `${o.title} ${o.genre}`.toLowerCase().includes(query));
    const ownedIds = draft.ownedIds.filter(id => owned.some(o => o.id === id && !o.linked && !o.unavailableReason));
    const detail = selected || collection || auctionLot || selectedUpcoming;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const statusLabel = (offer: OwnedStreamingRightsNegotiation) => ({
        AWAITING_RESPONSE: `Awaiting reply · ${Math.max(0, (offer.responseDueAbsoluteWeek || absoluteWeek) - absoluteWeek)} weeks`,
        SELLER_COUNTERED: 'Counter received', SELLER_ACCEPTED: `Accepted · ${Math.max(0, (offer.signingDeadlineAbsoluteWeek || absoluteWeek) - absoluteWeek)} weeks to sign`,
        SELLER_DECLINED: 'Declined', RIGHTS_SOLD: 'Sold elsewhere', WITHDRAWN: 'Withdrawn', EXPIRED: 'Expired', SIGNED: 'Signed',
    }[offer.responseStatus || ''] || offer.status.replaceAll('_', ' ').toLowerCase());
    const beginOffer = (source: typeof selected | OwnedStreamingRightsNegotiation) => {
        if (!source) return;
        const base = 'terms' in source ? source.terms : source;
        setOfferTerms({ territory: base.territory, durationWeeks: base.durationWeeks, exclusivity: base.exclusivity,
            windowType: base.windowType, minimumGuarantee: base.minimumGuarantee, platformRevenueShare: base.platformRevenueShare,
            marketingGuarantee: base.marketingGuarantee, viewershipBonusThreshold: base.viewershipBonusThreshold,
            viewershipBonusAmount: base.viewershipBonusAmount, renewalOption: base.renewalOption,
            sublicensingAllowed: base.sublicensingAllowed, sequelRightsIncluded: base.sequelRightsIncluded,
            changeOfControl: base.changeOfControl, cancellationPenalty: base.cancellationPenalty,
            countryIds: 'terms' in source ? source.countryIds : source.countryIds });
        setAdvancedOffer(false); setOfferEditor(true); setFeedback('');
    };
    const submitPrivateOffer = () => {
        if (!offerTerms || (!selected && !selectedOffer) || busy) return;
        setBusy(true);
        try {
            const result = selected
                ? submitContentMarketPrivateOffer(player, selected.id, offerTerms)
                : reviseStreamingRightsNegotiation(player, selectedOffer!.id, offerTerms);
            if (!result.changed || !result.negotiation) { setFeedback(result.detail || 'This offer could not be submitted.'); return; }
            onUpdatePlayer(result.player); setOfferEditor(false);
            setDraft(current => ({ ...current, tab: 'OFFERS', selectedId: result.negotiation!.id }));
            setFeedback(`Private offer sent. ${result.negotiation.sellerName} will reply after ${Math.max(2, (result.negotiation.responseDueAbsoluteWeek || absoluteWeek + 2) - absoluteWeek)} processed weeks.`);
        } finally { setBusy(false); }
    };
    const updateOffer = (result: ReturnType<typeof acceptStreamingRightsCounter>, success: string) => {
        if (result.changed) { onUpdatePlayer(result.player); setFeedback(success); }
        else setFeedback(result.detail || 'This offer can no longer be changed.');
    };
    const signOffer = (offer: OwnedStreamingRightsNegotiation) => {
        const result = signStreamingRightsDeal(player, offer.id);
        if (!result.changed) { setFeedback(result.detail || 'The agreement could not be signed. No money was charged.'); return; }
        onUpdatePlayer(establishContentMarketCatalogue(result.player)); setFeedback(`${offer.title} is signed and now appears in your catalogue.`);
    };
    const enterAuction = () => {
        if (!auctionLot || busy) return;
        setBusy(true);
        try {
            const result = openStreamingBuyerAuction(player, auctionLot.id, Date.now());
            if (result.session) {
                onUpdatePlayer(result.player);
                setDraft(current => ({ ...current, tab: 'AUCTIONS', selectedId: result.session!.id }));
            } else setFeedback(result.detail || 'This auction can no longer be entered.');
        } finally { setBusy(false); }
    };
    const enterUpcomingAuction = () => {
        if (!selectedUpcomingLot || busy) return;
        setBusy(true);
        try {
            const result = openStreamingBuyerAuction(player, selectedUpcomingLot.id, Date.now());
            if (result.session) {
                onUpdatePlayer(result.player);
                setDraft(current => ({ ...current, tab: 'AUCTIONS', selectedId: result.session!.id }));
            } else setFeedback(result.detail || 'This auction can no longer be entered.');
        } finally { setBusy(false); }
    };
    const toggleUpcomingFollow = () => {
        if (!selectedUpcoming) return;
        const result = followStreamingUpcomingRightsSale(player, selectedUpcoming.id);
        if (result.changed) onUpdatePlayer(result.player);
        setFeedback(result.detail);
    };
    const exactLots = useMemo(() => buildExactContentMarketLots(player, {
        listings,
        collections,
        auctionLots: auctionLots.filter(lot => !platform.buyerAuctionSessions.some(session => session.lot.id === lot.id && session.status !== 'LIVE')),
        upcomingSales,
        ownedTitles: owned,
    }), [player, listings, collections, auctionLots, upcomingSales, owned, platform.buyerAuctionSessions]);
    const exactInitialScene: MarketScene = atGate ? 'GATE'
        : draft.tab === 'OWNED' || draft.selectedId === '__open_studio__' ? 'STUDIO'
            : exactLots.some(lot => lot.id === draft.selectedId) ? 'DETAIL' : 'MARKET';
    const runExactAction = (action: () => { player: Player; changed: boolean; detail: string }) => {
        if (busy) return { changed: false, detail: 'Another market action is already processing.' };
        setBusy(true);
        try {
            const result = action();
            if (result.changed) onUpdatePlayer(result.player);
            setFeedback(result.detail);
            return { changed: result.changed, detail: result.detail };
        } finally { setBusy(false); }
    };
    const acquireExactLot = (lot: ExactContentMarketLot) => {
        if (lot.unavailableReason || lot.linked) return { changed: false, detail: lot.unavailableReason || 'This title is already in your catalogue.' };
        if (lot.sourceKind === 'LISTING') {
            const source = listings.find(item => item.id === lot.sourceId);
            return source ? runExactAction(() => purchaseContentMarketListing(player, source.id, source.signature)) : { changed: false, detail: 'This listing is no longer available.' };
        }
        if (lot.sourceKind === 'COLLECTION') {
            const source = collections.find(item => item.id === lot.sourceId);
            return source ? runExactAction(() => purchaseContentMarketCollection(player, source.id, source.signature)) : { changed: false, detail: 'This collection is no longer available.' };
        }
        if (lot.sourceKind === 'STUDIO') return runExactAction(() => linkContentMarketOwnedTitles(player, [lot.sourceId]));
        return { changed: false, detail: 'Open the live room or follow the announced sale.' };
    };
    const sendExactOffer = (lot: ExactContentMarketLot, offer: ExactContentMarketOffer) => {
        const source = listings.find(item => item.id === lot.sourceId);
        if (!source) return { changed: false, detail: 'This listing is no longer open for private offers.' };
        const result = submitContentMarketPrivateOffer(player, source.id, {
            territory: source.terms.territory,
            countryIds: offer.markets,
            durationWeeks: offer.termWeeks,
            exclusivity: offer.excl === 'EXCLUSIVE' ? 'EXCLUSIVE' : 'NON_EXCLUSIVE',
            windowType: offer.window === 'FIRST' ? 'FIRST_WINDOW' : offer.window === 'PERPETUAL' ? 'PERMANENT' : 'SECOND_WINDOW',
            minimumGuarantee: offer.mg,
            platformRevenueShare: 100 - offer.backendPct,
            marketingGuarantee: offer.marketing,
            viewershipBonusThreshold: 0,
            viewershipBonusAmount: 0,
            renewalOption: offer.renewal !== 'None',
            sublicensingAllowed: offer.sublicense,
            sequelRightsIncluded: offer.sequel,
            changeOfControl: source.terms.changeOfControl,
            cancellationPenalty: source.terms.cancellationPenalty,
        });
        if (result.changed) onUpdatePlayer(result.player);
        setFeedback(result.detail || (result.changed ? 'Private offer sent.' : 'This offer could not be sent.'));
        return { changed: result.changed, detail: result.detail || 'Private offer sent. The seller will answer after week progression.' };
    };
    const openExactRoom = (lot: ExactContentMarketLot) => {
        const source = auctionLots.find(item => item.id === lot.sourceId);
        if (!source || busy) return;
        setBusy(true);
        try {
            const result = openStreamingBuyerAuction(player, source.id, Date.now());
            if (result.session) {
                onUpdatePlayer(result.player);
                setDraft(current => ({ ...current, tab: 'AUCTIONS', selectedId: result.session!.id }));
            } else setFeedback(result.detail || 'This auction can no longer be entered.');
        } finally { setBusy(false); }
    };
    const followExactLot = (lot: ExactContentMarketLot) => {
        const sale = upcomingSales.find(item => item.id === lot.sourceId);
        if (!sale) return { changed: false, detail: 'This sale is no longer available.' };
        const result = followStreamingUpcomingRightsSale(player, sale.id);
        if (result.changed) onUpdatePlayer(result.player);
        setFeedback(result.detail);
        return { changed: result.changed, detail: result.detail };
    };
    if (!selectedOffer && !activeAuctionSession) return <AccessibleDialog className="cm-market-exact-shell" data-epx-root style={brandVars(brand)} aria-label="Content Market" onEscape={() => leave(onClose)}>
        <ExactContentMarket
            key={draft.selectedId || 'root'}
            brand={brand}
            state={{ treasury: platform.treasuryCash, committed: Math.max(0, platform.treasuryCash - funds), week: player.currentWeek, subs: platform.metrics.subscribers || 0 }}
            catalogue={exactLots}
            supplySummary={supplySummary}
            initialScene={exactInitialScene}
            initialLotId={draft.selectedId}
            initialQuery={draft.search}
            onQueryChange={search => patch({ search })}
            onNavigation={(scene, lotId) => {
                if (scene === 'GATE') {
                    setAtGate(true);
                    patch({ selectedId: null });
                    return;
                }
                setAtGate(false);
                if (scene === 'STUDIO') patch({ tab: 'OWNED', selectedId: '__open_studio__', search: '' });
                else if (scene === 'MARKET') patch({ tab: 'ALL', selectedId: '__open_market__' });
                else if (lotId) patch({ selectedId: lotId });
            }}
            onBack={() => leave(onClose)}
            onCommission={() => leave(onCommission)}
            onAcquired={acquireExactLot}
            onOfferSent={sendExactOffer}
            onEnterRoom={openExactRoom}
            onFollow={followExactLot}
            offerCount={privateOffers.length}
            onOpenOffers={() => {
                const latest = [...privateOffers].reverse()[0];
                if (latest) patch({ tab: 'OFFERS', selectedId: latest.id });
            }}
        />
    </AccessibleDialog>;
    if (activeAuctionSession) return <AccessibleDialog className="cm-market-exact-shell" data-epx-root style={brandVars(brand)} aria-label="Content Market" onEscape={() => patch({ tab: 'AUCTIONS', selectedId: null })}>
        <StreamingBuyerAuctionRoom player={player} session={activeAuctionSession} onUpdatePlayer={onUpdatePlayer} onExit={() => patch({ tab: 'AUCTIONS', selectedId: null })} />
    </AccessibleDialog>;
    return <AccessibleDialog className="cm-market cm-market-floor" data-epx-root style={brandVars(brand)} aria-label="Content Market" onEscape={() => detail || selectedOffer ? patch({ selectedId: null }) : setAtGate(true)}>
        <header className="cm-top"><button aria-label={detail || selectedOffer ? 'Back to Content Market' : 'Back'} onClick={() => detail || selectedOffer ? patch({ selectedId: null }) : setAtGate(true)}><ArrowLeft size={20} /></button>
            <div><strong>{detail || selectedOffer ? 'CONTENT MARKET' : 'THE MARKET'}</strong><span>{platform.identity?.name} · {detail || selectedOffer ? 'Review agreement' : `WEEK ${player.currentWeek} · ${listings.length + collections.length + auctionLots.length} LOTS`}</span></div><span className="cm-mark"><Mark brand={brand} /></span></header>
        {detail || selectedOffer ? <div className="cm-funds"><span>Available funds <b>{money(funds)}</b></span><button onClick={() => leave(onOpenFinance)}><Wallet size={15} /> Studio Finance</button></div> : <div className="cm-floor-power"><ContentMarketPower treasury={platform.treasuryCash} available={funds} withinReach={[...listings.map(item => item.terms.minimumGuarantee), ...collections.map(item => item.totalGuarantee)].filter(price => price <= funds).length} totalListed={listings.length + collections.length} /></div>}
        <div className="cm-deal-nav cm-market-shelves"><button className="cm-offer-nav" aria-pressed={draft.tab === 'ALL'} onClick={() => patch({ tab: 'ALL', selectedId: null })}><Film size={15} /><span>MARKET</span><b>{listings.length + collections.length}</b></button><button className="cm-offer-nav" aria-pressed={draft.tab === 'AUCTIONS'} onClick={() => patch({ tab: 'AUCTIONS', selectedId: null })}><Gavel size={15} /><span>LIVE ROOMS</span><b>{auctionLots.filter(lot => !platform.buyerAuctionSessions.some(session => session.lot.id === lot.id && session.status !== 'LIVE')).length}</b></button><button className="cm-offer-nav" aria-pressed={draft.tab === 'UPCOMING'} onClick={() => patch({ tab: 'UPCOMING', selectedId: null })}><CalendarDays size={15} /><span>UPCOMING</span><b>{upcomingSales.filter(sale => ['ANNOUNCED', 'LIVE'].includes(sale.status)).length}</b></button><button className="cm-offer-nav" aria-pressed={draft.tab === 'OFFERS'} onClick={() => patch({ tab: 'OFFERS', selectedId: null })}><Clock3 size={15} /><span>YOUR OFFERS</span><b>{privateOffers.filter(offer => ['OPEN', 'COUNTERED', 'READY_TO_SIGN'].includes(offer.status)).length}</b></button></div>
        <main className="cm-scroll">
            {feedback && <p className="cm-feedback" role="status">{feedback}</p>}
            {selectedOffer ? <>
                <div className="cm-title"><Poster seed={selectedOffer.sourceProjectId} size={68} /><div><span className="cm-kicker">PRIVATE OFFER · V{selectedOffer.proposalVersion}</span><h1>{selectedOffer.title}</h1><p>{selectedOffer.sellerName}</p></div></div>
                <div className={`cm-offer-status is-${(selectedOffer.responseStatus || 'AWAITING_RESPONSE').toLowerCase()}`}><Clock3 size={16} /><div><b>{statusLabel(selectedOffer)}</b><small>{selectedOffer.responseStatus === 'AWAITING_RESPONSE' ? 'Rights remain on the market until you sign.' : selectedOffer.responseReason}</small></div></div>
                <dl className="cm-terms cm-terms-compact"><div><dt>Your upfront offer</dt><dd>{money(selectedOffer.minimumGuarantee)}</dd></div><div><dt>Markets</dt><dd>{countries(selectedOffer.countryIds)}</dd></div><div><dt>Duration</dt><dd>{selectedOffer.durationWeeks} weeks</dd></div><div><dt>Your revenue share</dt><dd>{selectedOffer.platformRevenueShare}%</dd></div><div><dt>Rights</dt><dd>{selectedOffer.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'}</dd></div></dl>
                {selectedOffer.responseStatus === 'SELLER_COUNTERED' && <div className="cm-counter-strip"><span>Owner revision</span><b>{money(selectedOffer.counterMinimumGuarantee || 0)} · {selectedOffer.counterPlatformRevenueShare}% to your platform</b></div>}
                {offerEditor && offerTerms ? <PrivateOfferEditor title={selectedOffer.title} sellerName={selectedOffer.sellerName} terms={offerTerms} setTerms={setOfferTerms} availableCountryIds={selectedOffer.countryIds} advanced={advancedOffer} setAdvanced={setAdvancedOffer} onCancel={() => setOfferEditor(false)} onSubmit={submitPrivateOffer} busy={busy} /> : <div className="cm-offer-actions">
                    {selectedOffer.responseStatus === 'AWAITING_RESPONSE' && <button className="cm-secondary" onClick={() => beginOffer(selectedOffer)}>Revise offer</button>}
                    {selectedOffer.responseStatus === 'SELLER_COUNTERED' && <button className="cm-primary" onClick={() => updateOffer(acceptStreamingRightsCounter(player, selectedOffer.id), 'Counter accepted. Review once more, then sign.')}>Accept revised terms</button>}
                    {selectedOffer.responseStatus === 'SELLER_COUNTERED' && <button className="cm-secondary" onClick={() => beginOffer(selectedOffer)}>Send another offer</button>}
                    {selectedOffer.responseStatus === 'SELLER_ACCEPTED' && <button className="cm-primary" disabled={absoluteWeek > (selectedOffer.signingDeadlineAbsoluteWeek || absoluteWeek) || funds < selectedOffer.minimumGuarantee} onClick={() => signOffer(selectedOffer)}><FileSignature size={16} /> Sign agreement · {money(selectedOffer.minimumGuarantee)}</button>}
                    {['OPEN', 'COUNTERED', 'READY_TO_SIGN'].includes(selectedOffer.status) && <button className="cm-walk" onClick={() => updateOffer(withdrawStreamingRightsNegotiation(player, selectedOffer.id), 'Offer withdrawn. Nothing was charged.')}>Walk away</button>}
                </div>}
                {funds < selectedOffer.minimumGuarantee && ['OPEN', 'COUNTERED', 'READY_TO_SIGN'].includes(selectedOffer.status) && <button className="cm-finance-link" onClick={() => leave(onOpenFinance)}>Available funds no longer cover this offer · Open Studio Finance <ChevronRight size={14} /></button>}
            </> : selectedUpcoming ? <>
                <div className="cm-title"><Poster seed={selectedUpcoming.sourceProjectId} size={68} /><div><span className="cm-kicker">UPCOMING · {selectedUpcoming.publicInterest} INTEREST</span><h1>{selectedUpcoming.title}</h1><p>{selectedUpcoming.sellerName}</p></div></div>
                <p className="cm-note">This is a real production-linked sale, not a guaranteed hit. Public interest can change with production progress, marketing, delays, and release results.</p>
                <dl className="cm-terms cm-terms-compact"><div><dt>Sale status</dt><dd>{selectedUpcoming.status.replaceAll('_', ' ')}</dd></div><div><dt>Bidding opens</dt><dd>Week {selectedUpcoming.opensAtAbsoluteWeek}</dd></div><div><dt>Expected availability</dt><dd>Week {selectedUpcoming.plannedAvailabilityAbsoluteWeek}</dd></div><div><dt>Markets</dt><dd>{countries(selectedUpcoming.countryIds)}</dd></div><div><dt>Opening level</dt><dd>{money(selectedUpcoming.minimumGuarantee)}</dd></div><div><dt>Public interest</dt><dd>{selectedUpcoming.publicInterestScore}/100</dd></div></dl>
                <div className="cm-interest-drivers">{selectedUpcoming.publicInterestDrivers.map(driver => <span key={driver}>{driver}</span>)}</div>
                {selectedUpcoming.status === 'ANNOUNCED' && <button className="cm-secondary" onClick={toggleUpcomingFollow}>{selectedUpcoming.followedAtAbsoluteWeek == null ? <Bell size={16} /> : <BellOff size={16} />}{selectedUpcoming.followedAtAbsoluteWeek == null ? 'Follow this sale' : 'Stop following'}</button>}
                {selectedUpcoming.status === 'LIVE' && selectedUpcomingLot && <button className="cm-primary" disabled={busy || funds < selectedUpcomingLot.minimumGuarantee} onClick={enterUpcomingAuction}>Enter live auction</button>}
                {selectedUpcoming.status === 'ACQUIRED' && <p className="cm-feedback">Future rights acquired. The title remains unavailable until canonical delivery and week {selectedUpcoming.plannedAvailabilityAbsoluteWeek}.</p>}
                {selectedUpcoming.status === 'LOST' && <p className="cm-feedback">{selectedUpcoming.winnerName || 'Another platform'} won this rights window.</p>}
                {selectedUpcoming.status === 'WITHDRAWN' && <p className="cm-feedback">The sale was withdrawn because the underlying production is no longer eligible.</p>}
            </> : auctionLot ? <>
                <div className="cm-title"><Poster seed={auctionLot.sourceProjectId} size={68} /><div><span className="cm-kicker">LIVE AUCTION · {auctionLot.listingKind === 'CATALOGUE_PACKAGE' ? `${auctionLot.catalogueComponentIds?.length || 0} TITLES` : auctionLot.projectType}</span><h1>{auctionLot.title}</h1><p>{auctionLot.sellerName}</p></div></div>
                <p className="cm-note">The rights scope below is frozen for this room. You can compete with upfront money, seller backend, marketing support, and—when allowed—a future original.</p>
                <dl className="cm-terms"><div><dt>Opening level</dt><dd>{money(auctionLot.minimumGuarantee)}</dd></div><div><dt>Markets</dt><dd>{countries(auctionLot.countryIds)}</dd></div><div><dt>Duration</dt><dd>{auctionLot.durationWeeks} weeks</dd></div><div><dt>Rights</dt><dd>{auctionLot.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'} · {auctionLot.windowType === 'FIRST_WINDOW' ? 'First window' : 'Second window'}</dd></div><div><dt>Seller backend range</dt><dd>{auctionLot.allowedTerms.backendMinimum}–{auctionLot.allowedTerms.backendMaximum}%</dd></div><div><dt>Room clock</dt><dd>15 seconds · 45 second hard cap</dd></div></dl>
                {auctionLot.notice && <p className="cm-feedback">{auctionLot.notice}</p>}
                <button className="cm-primary" disabled={busy || funds < auctionLot.minimumGuarantee} onClick={enterAuction}>Enter live auction</button>
                <p className="cm-note">Entering opens a saved, binding room. Leaving or backgrounding the app does not reset its clock or rival offers.</p>
            </> : detail ? <>
                <div className="cm-detail-hero"><span><ContentMarketOneSheet seed={selected?.title.id || collection!.package.id} title={selected?.title.title || collection!.package.name} genre={selected?.title.genre || 'Mixed'} variant="hero" /></span></div>
                <div className="cm-detail-body"><span className="cm-kicker">{selected ? `${selected.countryIds.length} MARKETS · RIGHTS AVAILABLE` : `${collection!.rows.length} TITLES · COLLECTION`}</span><h1>{selected?.title.title || collection!.package.name}</h1><p className="cm-detail-line">{selected?.sellerName || collection!.sellerName} · {selected ? selected.title.projectType === 'SERIES' ? 'Series' : 'Film' : 'Catalogue package'}</p>
                <p className="cm-note">This agreement grants streaming access only for the eligible markets and window written below.</p>
                {selected && <>
                    {selected.sourceLicenseId && <p className="cm-note">Original owner: {selected.originalOwnerName}. Reseller: {selected.sellerName}. Existing obligations transfer with these rights.</p>}
                    <div className="cm-asking"><span>ASKING GUARANTEE</span><b>{money(selected.terms.minimumGuarantee)}</b><div><em><i>{selected.countryIds.length}</i>markets</em><em><i>{selected.terms.durationWeeks}</i>weeks</em><em><i>{selected.terms.platformRevenueShare}%</i>your share</em></div></div>
                    <section className="cm-contract-sheet"><header><b>STREAMING RIGHTS AGREEMENT</b><span>LISTED TERMS</span></header><dl className="cm-terms"><div><dt>Guarantee</dt><dd>{money(selected.terms.minimumGuarantee)}</dd></div>
                        <div><dt>Markets</dt><dd>{countries(selected.countryIds)}</dd></div><div><dt>Duration</dt><dd>{selected.terms.durationWeeks} weeks</dd></div>
                        <div><dt>Rights</dt><dd>{selected.terms.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'} · {selected.terms.windowType === 'FIRST_WINDOW' ? 'First window' : selected.terms.windowType === 'PERMANENT' ? 'Permanent' : 'Second window'}</dd></div>
                        <div><dt>Your revenue share</dt><dd>{selected.terms.platformRevenueShare}%</dd></div><div><dt>Rights holder share</dt><dd>{100 - selected.terms.platformRevenueShare}%</dd></div>
                        <div><dt>Availability</dt><dd>{selected.unavailableReason ? 'See restriction below' : 'Immediately after signing'}</dd></div>
                        <div><dt>Backend basis</dt><dd>Title-attributed adjusted gross receipts</dd></div>
                        <div><dt>Guarantee</dt><dd>{selected.inheritedContract?.guaranteeRecoupment === 'RECOUPABLE' ? 'Original guarantee remains recoupable' : 'Non-recoupable'}</dd></div>
                        <div><dt>Backend cap</dt><dd>{selected.inheritedContract?.backendCap == null ? 'Uncapped' : money(selected.inheritedContract.backendCap)}</dd></div>
                        <div><dt>Renewal option</dt><dd>{selected.inheritedContract?.renewalOption ? 'Included' : 'Not included'}</dd></div>
                        <div><dt>Sublicensing</dt><dd>{selected.inheritedContract?.sublicensingAllowed ? 'Allowed' : 'Not included'}</dd></div>
                        <div><dt>Sequel rights</dt><dd>{selected.inheritedContract?.sequelRightsIncluded ? 'Included' : 'Not included'}</dd></div>
                        <div><dt>Change of control</dt><dd>{(selected.inheritedContract?.changeOfControl || selected.terms.changeOfControl).replaceAll('_', ' ').toLowerCase()}</dd></div>
                        {!!selected.inheritedContract?.marketingGuarantee && <div><dt>Marketing commitment</dt><dd>{money(selected.inheritedContract.marketingGuarantee)}</dd></div>}
                        {!!selected.inheritedContract?.viewershipBonusAmount && <div><dt>Viewership bonus</dt><dd>{money(selected.inheritedContract.viewershipBonusAmount)} at {selected.inheritedContract.viewershipBonusThreshold?.toLocaleString()} views</dd></div>}
                        {!!selected.inheritedContract?.cancellationPenalty && <div><dt>Cancellation penalty</dt><dd>{money(selected.inheritedContract.cancellationPenalty)}</dd></div>}
                    </dl></section>
                    <p className="cm-note">{selected.inheritedContract ? 'You acquire the remaining window, not a new term. The transfer payment does not reset original royalty or recoupment obligations.' : 'The rights window starts when you sign, including before your platform launches. No extra marketing or viewership-bonus payment is required.'} Scheduling and language preparation follow in Content Desk.</p>
                    {selected.unavailableReason && <p className="cm-feedback">{selected.unavailableReason}</p>}
                    {offerEditor && offerTerms ? <PrivateOfferEditor title={selected.title.title} sellerName={selected.sellerName} terms={offerTerms} setTerms={setOfferTerms} availableCountryIds={selected.countryIds} advanced={advancedOffer} setAdvanced={setAdvancedOffer} onCancel={() => setOfferEditor(false)} onSubmit={submitPrivateOffer} busy={busy} /> : <div className="cm-decision-rail"><button className="cm-primary" disabled={busy || !!selected.unavailableReason || funds < selected.terms.minimumGuarantee} onClick={() => accept(() => purchaseContentMarketListing(player, selected.id, selected.signature))}>Accept listed terms · {money(selected.terms.minimumGuarantee)}</button><button className="cm-secondary" disabled={busy || !!selected.unavailableReason} onClick={() => beginOffer(selected)}><Handshake size={16} /> Make private offer</button><small>Seller replies after 2–3 processed weeks. No money or rights move until signature.</small></div>}
                </>}
                {collection && <><dl className="cm-terms"><div><dt>Collection price</dt><dd>{money(collection.totalGuarantee)}</dd></div><div><dt>Markets</dt><dd>{countries(collection.package.requestedCountryIds)}</dd></div><div><dt>Duration</dt><dd>104 weeks from signing</dd></div></dl>
                    <h2 className="cm-section-label">Title breakdown</h2>{collection.rows.map(row => <div className="cm-allocation" key={row.componentProjectId}><span>{collection.package.components.find(c => c.sourceProjectId === row.componentProjectId)?.title}<small>{row.durationWeeks} weeks · {row.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'} · {row.licensorRevenueShare}% rights holder share</small><small>{row.guaranteeRecoupment === 'RECOUPABLE' ? 'Recoupable guarantee' : 'Non-recoupable guarantee'} · {row.backendCap == null ? 'Uncapped backend' : `${money(row.backendCap)} backend cap`}</small></span><b>{money(row.minimumGuarantee)}</b></div>)}
                    <p className="cm-note">The collection is purchased together. Each title keeps its own contract and allocated price. Backend uses title-attributed adjusted gross receipts. Renewal options are included; shared titles permit sublicensing. Sequel rights are not included. Change of control requires notice; cancellation penalty is 20% of each title’s guarantee.</p>
                    <p className="cm-note">Signing uses {PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT} energy. {player.energy.current < PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT ? 'Not enough energy to sign yet.' : ''}</p>
                    <button className="cm-primary" disabled={busy || funds < collection.totalGuarantee || player.energy.current < PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT} onClick={() => accept(() => purchaseContentMarketCollection(player, collection.id, collection.signature))}>Acquire collection · {money(collection.totalGuarantee)}</button></>}
                {funds < (selected?.terms.minimumGuarantee || collection?.totalGuarantee || 0) && <button className="cm-finance-link" onClick={() => leave(onOpenFinance)}>Insufficient available funds · Open Studio Finance <ChevronRight size={14} /></button>}</div>
            </> : <>
                <div className="cm-intro"><span className="cm-kicker">{draft.tab === 'OFFERS' ? 'DEAL DESK' : draft.tab === 'AUCTIONS' ? 'AUCTION FLOOR' : draft.tab === 'UPCOMING' ? 'RIGHTS CALENDAR' : 'AVAILABLE CONTENT'}</span><h1>{draft.tab === 'OFFERS' ? 'Your offers.' : draft.tab === 'AUCTIONS' ? 'Live rights rooms.' : draft.tab === 'UPCOMING' ? 'What opens next.' : 'Find your next title.'}</h1><p>{draft.tab === 'OFFERS' ? 'Every private proposal, reply, and signing window in one place.' : draft.tab === 'AUCTIONS' ? 'Compete against funded platforms for titles and complete collections.' : draft.tab === 'UPCOMING' ? 'Track real productions before their streaming rights reach the floor.' : 'Released films, series, and collections for your service.'}</p></div>
                {draft.tab === 'OFFERS' ? <>
                    <button className="cm-finance-link" onClick={() => patch({ tab: 'ALL', selectedId: null })}><ArrowLeft size={14} /> Browse available content</button>
                    <div className="cm-section-heading"><span>DEAL DESK</span><b>Your private offers</b><small>Replies arrive through processed weeks. Nothing is charged until a signed agreement.</small></div>
                    <div className="cm-offer-ledger">{[...privateOffers].reverse().map(offer => <button className="cm-offer-ticket" key={offer.id} onClick={() => patch({ selectedId: offer.id })}><span className="cm-ticket-art"><ContentMarketOneSheet seed={offer.sourceProjectId} title={offer.title} genre="Drama" /></span><span className="cm-ticket-copy"><em>PRIVATE OFFER · V{offer.proposalVersion}</em><strong>{offer.title}</strong><small>{offer.sellerName}</small><span className={`cm-status-text is-${(offer.responseStatus || 'awaiting_response').toLowerCase()}`}>{statusLabel(offer)}</span></span><span className="cm-ticket-price"><small>YOUR GUARANTEE</small><b>{money(offer.responseStatus === 'SELLER_COUNTERED' ? offer.counterMinimumGuarantee || offer.minimumGuarantee : offer.minimumGuarantee)}</b><ChevronRight size={15} /></span></button>)}</div>
                    {!privateOffers.length && <div className="cm-empty"><Handshake size={28} /><h2>No private offers yet</h2><p>Open a title and choose Make private offer. The rights holder will answer after two or three processed weeks.</p></div>}
                </> : draft.tab === 'AUCTIONS' ? <>
                    <button className="cm-finance-link" onClick={() => patch({ tab: 'ALL', selectedId: null })}><ArrowLeft size={14} /> Browse listed-price content</button>
                    <div className="cm-section-heading"><span>AUCTION FLOOR</span><b>Live rights rooms</b><small>Each room has a saved clock, funded rivals, and a frozen rights scope.</small></div>
                    <div className="cm-auction-list cm-room-board">{auctionLots.map(lot => {
                        const history = platform.buyerAuctionSessions.find(session => session.lot.id === lot.id);
                        return <button className="cm-room-card" key={lot.id} onClick={() => patch({ selectedId: history?.id || lot.id })}><span className="cm-room-art"><ContentMarketOneSheet seed={lot.sourceProjectId} title={lot.title} genre={lot.genre} /><em>{history ? history.status.replaceAll('_', ' ') : 'ROOM OPEN'}</em></span><span className="cm-room-copy"><strong>{lot.title}</strong><small>{lot.sellerName} · {lot.listingKind === 'CATALOGUE_PACKAGE' ? `${lot.catalogueComponentIds?.length || 0} title collection` : lot.genre.replaceAll('_', ' ')}</small><span>{countries(lot.countryIds)} · {lot.durationWeeks} weeks</span><b>{history ? history.status.replaceAll('_', ' ') : `From ${money(lot.minimumGuarantee)}`}</b></span><ChevronRight size={17} /></button>;
                    })}</div>
                    {!auctionLots.length && <div className="cm-empty"><Gavel size={28} /><h2>No live rooms this week</h2><p>Eligible sellers rotate between listed terms, private negotiation, and live auctions. Check again after week progression.</p></div>}
                </> : draft.tab === 'UPCOMING' ? <>
                    <button className="cm-finance-link" onClick={() => patch({ tab: 'ALL', selectedId: null })}><ArrowLeft size={14} /> Browse available content</button>
                    <div className="cm-section-heading"><span>RIGHTS CALENDAR</span><b>What opens next</b><small>Follow public sales tied to real productions before the room opens.</small></div>
                    <div className="cm-upcoming-list">{upcomingSales.map(sale => <button className="cm-upcoming-card" key={sale.id} onClick={() => patch({ selectedId: sale.id })}><span className="cm-upcoming-date"><small>{sale.status === 'ANNOUNCED' ? 'OPENS' : 'STATUS'}</small><b>{sale.status === 'ANNOUNCED' ? `WK ${sale.opensAtAbsoluteWeek}` : sale.status.replaceAll('_', ' ')}</b></span><span className="cm-row-copy"><strong>{sale.title}</strong><small>{sale.sellerName} · {sale.genre.replaceAll('_', ' ')}</small><small>Expected week {sale.plannedAvailabilityAbsoluteWeek} · {sale.publicInterest.toLowerCase()} interest</small></span><span className="cm-upcoming-mark">{sale.followedAtAbsoluteWeek != null && <Bell size={14} />}<ChevronRight size={15} /></span></button>)}</div>
                    {!upcomingSales.length && <div className="cm-empty"><CalendarDays size={28} /><h2>No announced sales</h2><p>Eligible future productions appear here after their rights holder schedules a public sale.</p></div>}
                </> : <>
                {!platform.starterCatalog && platform.catalogSetupDraft?.opportunityProjectId && onResumeLegacy && <button className="cm-finance-link" onClick={() => leave(onResumeLegacy)}>Resume your saved opening agreement <ChevronRight size={14} /></button>}
                {platform.rightsNegotiations.some(n => ['OPEN', 'COUNTERED', 'READY_TO_SIGN'].includes(n.status)) && onExistingNegotiations && <button className="cm-finance-link" onClick={() => leave(onExistingNegotiations)}>Review existing negotiations <ChevronRight size={14} /></button>}
                <div className="cm-shortcuts"><button onClick={() => patch({ tab: 'OWNED' })}><LibraryBig size={18} /><span>Bring from my studio<small>{owned.filter(o => !o.linked && !o.unavailableReason).length} available titles</small></span><ChevronRight size={15} /></button>
                    <button onClick={() => leave(onCommission)}><Sparkles size={18} /><span>Commission an Original<small>Brief, funding, and production</small></span><ChevronRight size={15} /></button></div>
                <label className="cm-search"><Search size={17} /><input aria-label="Search content" placeholder="Search titles, genres, or studios" value={draft.search} onChange={e => patch({ search: e.target.value })} /></label>
                <div className="cm-filters" aria-label="Content source">{(['ALL', 'MOVIE', 'SERIES', 'COLLECTIONS', 'OWNED'] as const).map(tab => <button key={tab} aria-pressed={draft.tab === tab} onClick={() => patch({ tab, selectedId: null, ...(tab === 'OWNED' ? { search: '' } : {}) })}>{({ ALL: 'All', MOVIE: 'Films', SERIES: 'Series', COLLECTIONS: 'Collections', OWNED: 'My studio' })[tab]}</button>)}</div>
                {draft.tab === 'OWNED' ? <><div className="cm-section-heading cm-studio-heading"><span>YOUR STUDIO VAULT</span><b>Bring a release across</b><small>The title stays owned by your production company. Your platform only receives eligible streaming rights.</small></div><div className="cm-studio-shelf">{visibleOwned.map(t => <button className="cm-studio-card" key={t.id} disabled={t.linked || !!t.unavailableReason} aria-pressed={ownedIds.includes(t.id)} onClick={() => patch({ ownedIds: ownedIds.includes(t.id) ? ownedIds.filter(id => id !== t.id) : [...ownedIds, t.id] })}>
                    <span className="cm-studio-art"><ContentMarketOneSheet seed={t.id} title={t.title} genre={t.genre} />{ownedIds.includes(t.id) && <i><Check size={17} /></i>}</span><span className="cm-studio-copy"><strong>{t.title}</strong><small>{t.studioName} · {t.genre.replaceAll('_', ' ')}</small><em>{t.linked ? 'ALREADY IN CATALOGUE' : t.unavailableReason ? 'UNAVAILABLE' : 'AVAILABLE RIGHTS'}</em><span>{t.linked ? 'Already linked' : t.unavailableReason || countries(t.countryIds)}</span>{t.excludedCountryIds.length > 0 && <span>Except {countries(t.excludedCountryIds)}</span>}<b>NO INTERNAL FEE</b></span></button>)}</div>
                    {!visibleOwned.length && <div className="cm-empty"><LibraryBig size={28} /><h2>No studio releases found</h2><p>Released titles from production houses you control appear here. You can also license content from the market.</p></div>}
                    {ownedIds.length > 0 && <div className="cm-studio-action"><span><b>{ownedIds.length}</b> selected</span><button className="cm-primary" disabled={busy} onClick={() => accept(() => linkContentMarketOwnedTitles(player, ownedIds))}>Add {ownedIds.length} studio {ownedIds.length === 1 ? 'title' : 'titles'} · No internal fee</button></div>}
                </> : <><div className="cm-market-grid">{visible.map(o => <button className="cm-row cm-market-card" key={o.id} onClick={() => patch({ selectedId: o.id })}><span className="cm-card-art"><ContentMarketOneSheet seed={o.title.id} title={o.title.title} genre={o.title.genre} /><em>LISTED NOW</em>{o.title.rating ? <b>{o.title.rating.toFixed(1)}</b> : null}</span><span className="cm-card-copy"><strong>{o.title.title}</strong><small>{o.sellerName}</small><span><b>{money(o.terms.minimumGuarantee)}</b><em>{o.title.projectType === 'SERIES' ? 'SERIES' : 'FILM'} · {o.countryIds.length} MARKETS</em></span></span></button>)}
                    {visibleCollections.map(o => <button className="cm-row cm-market-card" key={o.id} onClick={() => patch({ selectedId: o.id })}><span className="cm-card-art cm-card-collection"><ContentMarketOneSheet seed={o.package.id} title={o.package.name} genre="Mixed" /><em>COLLECTION</em><b>{o.rows.length}</b></span><span className="cm-card-copy"><strong>{o.package.name}</strong><small>{o.sellerName}</small><span><b>{money(o.totalGuarantee)}</b><em>{o.rows.length} TITLES · ONE DEAL</em></span></span></button>)}</div>
                    {!visible.length && !visibleCollections.length && <div className="cm-empty"><Film size={28} /><h2>No matching listings</h2><p>Try another filter or return after more titles are released. Your studio and Original options remain above.</p></div>}</>}
                {platform.starterCatalog && <label className="cm-strategy">Catalogue strategy<select value={platform.starterCatalog.packageId} onChange={e => onUpdatePlayer(saveContentMarketStrategy(player, e.target.value as any))}>{STREAMING_STARTER_CATALOG_PACKAGES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select><small>A programming direction, with no purchase fee.</small></label>}
                </>}
            </>}
        </main>
        <footer className="cm-footer"><button onClick={() => leave(onClose)}>{returnToLaunch ? 'Return to launch plan' : 'Back to Content Desk'}</button>{platform.starterCatalog && <button onClick={() => leave(onReview)}>Open Content Desk <ChevronRight size={14} /></button>}</footer>
    </AccessibleDialog>;
}
