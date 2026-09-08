import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronRight, Clock3, FileSignature, Film, Gavel, Handshake, LibraryBig, Search, Sparkles, Wallet, X } from 'lucide-react';
import type { OwnedStreamingRightsNegotiation, Player } from '../types';
import AccessibleDialog from './AccessibleDialog';
import { type Brand, Mark } from './streaming-transplant/StreamingBrandVisuals';
import { brandVars } from './streaming-transplant/presentation/brand';
import { Poster } from './studio-finance/components/Poster';
import { STREAMING_STARTER_CATALOG_PACKAGES } from '../services/streamingCatalog';
import { getStreamingDayOneMarket } from '../services/streamingDayOneMarkets';
import { establishContentMarketCatalogue, getContentMarketAuctionCollections, getContentMarketListings, getContentMarketCollections, getContentMarketOwnedTitles, getContentMarketFunds,
    linkContentMarketOwnedTitles, purchaseContentMarketListing, purchaseContentMarketCollection, saveContentMarketStrategy, submitContentMarketPrivateOffer } from '../services/streamingContentMarket';
import { normalizeOwnedStreamingPlatformState, compactOwnedStreamingPlatformForPersistence } from '../services/ownedStreamingPlatform';
import { PHASE_ONE_ENERGY_COSTS } from '../services/energyCosts';
import { acceptStreamingRightsCounter, reviseStreamingRightsNegotiation,
    signStreamingRightsDeal, withdrawStreamingRightsNegotiation, type StreamingRightsTermsInput } from '../services/streamingRightsMarketplace';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingBuyerAuctionLots, openStreamingBuyerAuction } from '../services/streamingBuyerAuctions';
import StreamingBuyerAuctionRoom from './StreamingBuyerAuctionRoom';
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

function PrivateOfferEditor({ terms, setTerms, availableCountryIds, advanced, setAdvanced, onCancel, onSubmit, busy }: {
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
    return <section className="cm-offer-editor" aria-label="Private offer terms">
        <div className="cm-editor-head"><div><span>CONFIDENTIAL TERM SHEET</span><h2>Shape your offer</h2></div><button aria-label="Close offer editor" onClick={onCancel}><X size={18} /></button></div>
        <label><span>Upfront offer</span><input type="number" min={0} step={250000} value={terms.minimumGuarantee} onChange={event => patchTerms({ minimumGuarantee: Number(event.target.value) })} /><small>{money(terms.minimumGuarantee)}</small></label>
        <label><span>Your revenue share</span><input type="range" min={45} max={90} value={terms.platformRevenueShare} onChange={event => patchTerms({ platformRevenueShare: Number(event.target.value) })} /><small>{terms.platformRevenueShare}% platform · {100 - terms.platformRevenueShare}% rights holder</small></label>
        <div className="cm-editor-pair"><label><span>Term</span><select value={terms.durationWeeks} onChange={event => patchTerms({ durationWeeks: Number(event.target.value) })}><option value={52}>1 year</option><option value={104}>2 years</option><option value={156}>3 years</option><option value={260}>5 years</option></select></label><label><span>Rights</span><select value={terms.exclusivity} onChange={event => patchTerms({ exclusivity: event.target.value as any })}><option value="NON_EXCLUSIVE">Shared</option><option value="EXCLUSIVE">Exclusive</option></select></label></div>
        <fieldset className="cm-country-pick"><legend>Markets in this proposal</legend>{availableCountryIds.map(id => <button type="button" key={id} aria-pressed={chosenCountries.includes(id)} onClick={() => toggleCountry(id)}>{getStreamingDayOneMarket(id)?.country || id}</button>)}</fieldset>
        <button type="button" className="cm-advanced-toggle" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}>Deal protections <ChevronDown size={15} /></button>
        {advanced && <div className="cm-advanced-grid"><label><span>Marketing commitment</span><input type="number" min={0} step={250000} value={terms.marketingGuarantee} onChange={event => patchTerms({ marketingGuarantee: Number(event.target.value) })} /></label><label><span>Viewership bonus</span><input type="number" min={0} step={250000} value={terms.viewershipBonusAmount} onChange={event => patchTerms({ viewershipBonusAmount: Number(event.target.value) })} /></label><label><span>Bonus at viewers</span><input type="number" min={0} step={100000} value={terms.viewershipBonusThreshold} onChange={event => patchTerms({ viewershipBonusThreshold: Number(event.target.value) })} /></label><label><span>Cancellation penalty</span><input type="number" min={0} step={250000} value={terms.cancellationPenalty} onChange={event => patchTerms({ cancellationPenalty: Number(event.target.value) })} /></label><label><span>Change of control</span><select value={terms.changeOfControl} onChange={event => patchTerms({ changeOfControl: event.target.value as StreamingRightsTermsInput['changeOfControl'] })}><option value="NONE">No restriction</option><option value="NOTICE">Notify rights holder</option><option value="CONSENT_REQUIRED">Consent required</option></select></label><label className="cm-check"><input type="checkbox" checked={terms.renewalOption} onChange={event => patchTerms({ renewalOption: event.target.checked })} /><span>Renewal option</span></label><label className="cm-check"><input type="checkbox" checked={terms.sublicensingAllowed} onChange={event => patchTerms({ sublicensingAllowed: event.target.checked })} /><span>Sublicensing</span></label><label className="cm-check"><input type="checkbox" checked={terms.sequelRightsIncluded} onChange={event => patchTerms({ sequelRightsIncluded: event.target.checked })} /><span>Sequel rights</span></label></div>}
        <div className="cm-editor-actions"><button className="cm-walk" onClick={onCancel}>Cancel</button><button className="cm-primary" disabled={busy || chosenCountries.length === 0 || terms.minimumGuarantee <= 0} onClick={onSubmit}>Send private offer</button></div>
    </section>;
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
    const listings = useMemo(() => getContentMarketListings(player), [player]);
    const collections = useMemo(() => getContentMarketCollections(player), [player]);
    const auctionLots = useMemo(() => getStreamingBuyerAuctionLots(player), [player]);
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
    const detail = selected || collection || auctionLot;
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
    if (activeAuctionSession) return <AccessibleDialog className="cm-market cm-auction-shell" data-epx-root style={brandVars(brand)} aria-label="Content Market" onEscape={() => patch({ tab: 'AUCTIONS', selectedId: null })}>
        <header className="cm-top"><div><strong>CONTENT MARKET</strong><span>{platform.identity?.name} · Auction floor</span></div><span className="cm-mark"><Mark brand={brand} /></span></header>
        <StreamingBuyerAuctionRoom player={player} session={activeAuctionSession} onUpdatePlayer={onUpdatePlayer} onExit={() => patch({ tab: 'AUCTIONS', selectedId: null })} />
    </AccessibleDialog>;
    return <AccessibleDialog className="cm-market" data-epx-root style={brandVars(brand)} aria-label="Content Market" onEscape={() => detail || selectedOffer ? patch({ selectedId: null }) : leave(onClose)}>
        <header className="cm-top"><button aria-label={detail || selectedOffer ? 'Back to Content Market' : 'Back'} onClick={() => detail || selectedOffer ? patch({ selectedId: null }) : leave(onClose)}><ArrowLeft size={20} /></button>
            <div><strong>CONTENT MARKET</strong><span>{platform.identity?.name} · {detail || selectedOffer ? 'Review agreement' : 'Build your catalogue'}</span></div><span className="cm-mark"><Mark brand={brand} /></span></header>
        <div className="cm-funds"><span>Available funds <b>{money(funds)}</b></span><button onClick={() => leave(onOpenFinance)}><Wallet size={15} /> Studio Finance</button></div>
        <div className="cm-deal-nav"><button className="cm-offer-nav" onClick={() => patch({ tab: 'OFFERS', selectedId: null })}><Clock3 size={15} /><span>Your offers</span><b>{privateOffers.filter(offer => ['OPEN', 'COUNTERED', 'READY_TO_SIGN'].includes(offer.status)).length}</b><ChevronRight size={14} /></button><button className="cm-offer-nav" onClick={() => patch({ tab: 'AUCTIONS', selectedId: null })}><Gavel size={15} /><span>Live auctions</span><b>{auctionLots.filter(lot => !platform.buyerAuctionSessions.some(session => session.lot.id === lot.id && session.status !== 'LIVE')).length}</b><ChevronRight size={14} /></button></div>
        <main className="cm-scroll">
            {feedback && <p className="cm-feedback" role="status">{feedback}</p>}
            {selectedOffer ? <>
                <div className="cm-title"><Poster seed={selectedOffer.sourceProjectId} size={68} /><div><span className="cm-kicker">PRIVATE OFFER · V{selectedOffer.proposalVersion}</span><h1>{selectedOffer.title}</h1><p>{selectedOffer.sellerName}</p></div></div>
                <div className={`cm-offer-status is-${(selectedOffer.responseStatus || 'AWAITING_RESPONSE').toLowerCase()}`}><Clock3 size={16} /><div><b>{statusLabel(selectedOffer)}</b><small>{selectedOffer.responseStatus === 'AWAITING_RESPONSE' ? 'Rights remain on the market until you sign.' : selectedOffer.responseReason}</small></div></div>
                <dl className="cm-terms cm-terms-compact"><div><dt>Your upfront offer</dt><dd>{money(selectedOffer.minimumGuarantee)}</dd></div><div><dt>Markets</dt><dd>{countries(selectedOffer.countryIds)}</dd></div><div><dt>Duration</dt><dd>{selectedOffer.durationWeeks} weeks</dd></div><div><dt>Your revenue share</dt><dd>{selectedOffer.platformRevenueShare}%</dd></div><div><dt>Rights</dt><dd>{selectedOffer.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'}</dd></div></dl>
                {selectedOffer.responseStatus === 'SELLER_COUNTERED' && <div className="cm-counter-strip"><span>Owner revision</span><b>{money(selectedOffer.counterMinimumGuarantee || 0)} · {selectedOffer.counterPlatformRevenueShare}% to your platform</b></div>}
                {offerEditor && offerTerms ? <PrivateOfferEditor terms={offerTerms} setTerms={setOfferTerms} availableCountryIds={selectedOffer.countryIds} advanced={advancedOffer} setAdvanced={setAdvancedOffer} onCancel={() => setOfferEditor(false)} onSubmit={submitPrivateOffer} busy={busy} /> : <div className="cm-offer-actions">
                    {selectedOffer.responseStatus === 'AWAITING_RESPONSE' && <button className="cm-secondary" onClick={() => beginOffer(selectedOffer)}>Revise offer</button>}
                    {selectedOffer.responseStatus === 'SELLER_COUNTERED' && <button className="cm-primary" onClick={() => updateOffer(acceptStreamingRightsCounter(player, selectedOffer.id), 'Counter accepted. Review once more, then sign.')}>Accept revised terms</button>}
                    {selectedOffer.responseStatus === 'SELLER_COUNTERED' && <button className="cm-secondary" onClick={() => beginOffer(selectedOffer)}>Send another offer</button>}
                    {selectedOffer.responseStatus === 'SELLER_ACCEPTED' && <button className="cm-primary" disabled={absoluteWeek > (selectedOffer.signingDeadlineAbsoluteWeek || absoluteWeek) || funds < selectedOffer.minimumGuarantee} onClick={() => signOffer(selectedOffer)}><FileSignature size={16} /> Sign agreement · {money(selectedOffer.minimumGuarantee)}</button>}
                    {['OPEN', 'COUNTERED', 'READY_TO_SIGN'].includes(selectedOffer.status) && <button className="cm-walk" onClick={() => updateOffer(withdrawStreamingRightsNegotiation(player, selectedOffer.id), 'Offer withdrawn. Nothing was charged.')}>Walk away</button>}
                </div>}
                {funds < selectedOffer.minimumGuarantee && ['OPEN', 'COUNTERED', 'READY_TO_SIGN'].includes(selectedOffer.status) && <button className="cm-finance-link" onClick={() => leave(onOpenFinance)}>Available funds no longer cover this offer · Open Studio Finance <ChevronRight size={14} /></button>}
            </> : auctionLot ? <>
                <div className="cm-title"><Poster seed={auctionLot.sourceProjectId} size={68} /><div><span className="cm-kicker">LIVE AUCTION · {auctionLot.listingKind === 'CATALOGUE_PACKAGE' ? `${auctionLot.catalogueComponentIds?.length || 0} TITLES` : auctionLot.projectType}</span><h1>{auctionLot.title}</h1><p>{auctionLot.sellerName}</p></div></div>
                <p className="cm-note">The rights scope below is frozen for this room. You can compete with upfront money, seller backend, marketing support, and—when allowed—a future original.</p>
                <dl className="cm-terms"><div><dt>Opening level</dt><dd>{money(auctionLot.minimumGuarantee)}</dd></div><div><dt>Markets</dt><dd>{countries(auctionLot.countryIds)}</dd></div><div><dt>Duration</dt><dd>{auctionLot.durationWeeks} weeks</dd></div><div><dt>Rights</dt><dd>{auctionLot.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'} · {auctionLot.windowType === 'FIRST_WINDOW' ? 'First window' : 'Second window'}</dd></div><div><dt>Seller backend range</dt><dd>{auctionLot.allowedTerms.backendMinimum}–{auctionLot.allowedTerms.backendMaximum}%</dd></div><div><dt>Room clock</dt><dd>15 seconds · 45 second hard cap</dd></div></dl>
                {auctionLot.notice && <p className="cm-feedback">{auctionLot.notice}</p>}
                <button className="cm-primary" disabled={busy || funds < auctionLot.minimumGuarantee} onClick={enterAuction}>Enter live auction</button>
                <p className="cm-note">Entering opens a saved, binding room. Leaving or backgrounding the app does not reset its clock or rival offers.</p>
            </> : detail ? <>
                <div className="cm-title"><Poster seed={selected?.title.id || collection!.package.id} size={68} /><div><span className="cm-kicker">{selected ? selected.title.projectType === 'SERIES' ? 'SERIES' : 'FILM' : `${collection!.rows.length} TITLES`}</span><h1>{selected?.title.title || collection!.package.name}</h1><p>{selected?.sellerName || collection!.sellerName}</p></div></div>
                <p className="cm-note">This agreement grants streaming rights for the listed markets and window.</p>
                {selected && <>
                    {selected.sourceLicenseId && <p className="cm-note">Original owner: {selected.originalOwnerName}. Reseller: {selected.sellerName}. Existing obligations transfer with these rights.</p>}
                    <dl className="cm-terms"><div><dt>Upfront payment</dt><dd>{money(selected.terms.minimumGuarantee)}</dd></div>
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
                    </dl>
                    <p className="cm-note">{selected.inheritedContract ? 'You acquire the remaining window, not a new term. The transfer payment does not reset original royalty or recoupment obligations.' : 'The rights window starts when you sign, including before your platform launches. No extra marketing or viewership-bonus payment is required.'} Scheduling and language preparation follow in Content Desk.</p>
                    {selected.unavailableReason && <p className="cm-feedback">{selected.unavailableReason}</p>}
                    {offerEditor && offerTerms ? <PrivateOfferEditor terms={offerTerms} setTerms={setOfferTerms} availableCountryIds={selected.countryIds} advanced={advancedOffer} setAdvanced={setAdvancedOffer} onCancel={() => setOfferEditor(false)} onSubmit={submitPrivateOffer} busy={busy} /> : <div className="cm-decision-rail"><button className="cm-primary" disabled={busy || !!selected.unavailableReason || funds < selected.terms.minimumGuarantee} onClick={() => accept(() => purchaseContentMarketListing(player, selected.id, selected.signature))}>Accept listed terms · {money(selected.terms.minimumGuarantee)}</button><button className="cm-secondary" disabled={busy || !!selected.unavailableReason} onClick={() => beginOffer(selected)}><Handshake size={16} /> Make private offer</button><small>Seller replies after 2–3 processed weeks. No money or rights move until signature.</small></div>}
                </>}
                {collection && <><dl className="cm-terms"><div><dt>Collection price</dt><dd>{money(collection.totalGuarantee)}</dd></div><div><dt>Markets</dt><dd>{countries(collection.package.requestedCountryIds)}</dd></div><div><dt>Duration</dt><dd>104 weeks from signing</dd></div></dl>
                    <h2 className="cm-section-label">Title breakdown</h2>{collection.rows.map(row => <div className="cm-allocation" key={row.componentProjectId}><span>{collection.package.components.find(c => c.sourceProjectId === row.componentProjectId)?.title}<small>{row.durationWeeks} weeks · {row.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'} · {row.licensorRevenueShare}% rights holder share</small><small>{row.guaranteeRecoupment === 'RECOUPABLE' ? 'Recoupable guarantee' : 'Non-recoupable guarantee'} · {row.backendCap == null ? 'Uncapped backend' : `${money(row.backendCap)} backend cap`}</small></span><b>{money(row.minimumGuarantee)}</b></div>)}
                    <p className="cm-note">The collection is purchased together. Each title keeps its own contract and allocated price. Backend uses title-attributed adjusted gross receipts. Renewal options are included; shared titles permit sublicensing. Sequel rights are not included. Change of control requires notice; cancellation penalty is 20% of each title’s guarantee.</p>
                    <p className="cm-note">Signing uses {PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT} energy. {player.energy.current < PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT ? 'Not enough energy to sign yet.' : ''}</p>
                    <button className="cm-primary" disabled={busy || funds < collection.totalGuarantee || player.energy.current < PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT} onClick={() => accept(() => purchaseContentMarketCollection(player, collection.id, collection.signature))}>Acquire collection · {money(collection.totalGuarantee)}</button></>}
                {funds < (selected?.terms.minimumGuarantee || collection?.totalGuarantee || 0) && <button className="cm-finance-link" onClick={() => leave(onOpenFinance)}>Insufficient available funds · Open Studio Finance <ChevronRight size={14} /></button>}
            </> : <>
                <div className="cm-intro"><span className="cm-kicker">{draft.tab === 'OFFERS' ? 'DEAL DESK' : draft.tab === 'AUCTIONS' ? 'AUCTION FLOOR' : 'AVAILABLE CONTENT'}</span><h1>{draft.tab === 'OFFERS' ? 'Your offers.' : draft.tab === 'AUCTIONS' ? 'Live rights rooms.' : 'Find your next title.'}</h1><p>{draft.tab === 'OFFERS' ? 'Every private proposal, reply, and signing window in one place.' : draft.tab === 'AUCTIONS' ? 'Compete against funded platforms for titles and complete collections.' : 'Released films, series, and collections for your service.'}</p></div>
                {draft.tab === 'OFFERS' ? <>
                    <button className="cm-finance-link" onClick={() => patch({ tab: 'ALL', selectedId: null })}><ArrowLeft size={14} /> Browse available content</button>
                    <div className="cm-offer-ledger">{[...privateOffers].reverse().map(offer => <button className="cm-row" key={offer.id} onClick={() => patch({ selectedId: offer.id })}><Poster seed={offer.sourceProjectId} size={44} /><span className="cm-row-copy"><strong>{offer.title}</strong><small>{offer.sellerName} · Version {offer.proposalVersion}</small><small className={`cm-status-text is-${(offer.responseStatus || 'awaiting_response').toLowerCase()}`}>{statusLabel(offer)}</small></span><span className="cm-price">{money(offer.responseStatus === 'SELLER_COUNTERED' ? offer.counterMinimumGuarantee || offer.minimumGuarantee : offer.minimumGuarantee)}<ChevronRight size={15} /></span></button>)}</div>
                    {!privateOffers.length && <div className="cm-empty"><Handshake size={28} /><h2>No private offers yet</h2><p>Open a title and choose Make private offer. The rights holder will answer after two or three processed weeks.</p></div>}
                </> : draft.tab === 'AUCTIONS' ? <>
                    <button className="cm-finance-link" onClick={() => patch({ tab: 'ALL', selectedId: null })}><ArrowLeft size={14} /> Browse listed-price content</button>
                    <div className="cm-auction-list">{auctionLots.map(lot => {
                        const history = platform.buyerAuctionSessions.find(session => session.lot.id === lot.id);
                        return <button className="cm-row cm-auction-row" key={lot.id} onClick={() => patch({ selectedId: history?.id || lot.id })}><Poster seed={lot.sourceProjectId} size={46} /><span className="cm-row-copy"><strong>{lot.title}</strong><small>{lot.sellerName} · {lot.listingKind === 'CATALOGUE_PACKAGE' ? `${lot.catalogueComponentIds?.length || 0} title collection` : lot.genre.replaceAll('_', ' ')}</small><small>{history ? history.status.replaceAll('_', ' ') : `${countries(lot.countryIds)} · ${lot.durationWeeks} weeks`}</small></span><span className="cm-price">{history ? history.status.replaceAll('_', ' ') : `From ${money(lot.minimumGuarantee)}`}<ChevronRight size={15} /></span></button>;
                    })}</div>
                    {!auctionLots.length && <div className="cm-empty"><Gavel size={28} /><h2>No live rooms this week</h2><p>Eligible sellers rotate between listed terms, private negotiation, and live auctions. Check again after week progression.</p></div>}
                </> : <>
                {!platform.starterCatalog && platform.catalogSetupDraft?.opportunityProjectId && onResumeLegacy && <button className="cm-finance-link" onClick={() => leave(onResumeLegacy)}>Resume your saved opening agreement <ChevronRight size={14} /></button>}
                {platform.rightsNegotiations.some(n => ['OPEN', 'COUNTERED', 'READY_TO_SIGN'].includes(n.status)) && onExistingNegotiations && <button className="cm-finance-link" onClick={() => leave(onExistingNegotiations)}>Review existing negotiations <ChevronRight size={14} /></button>}
                <div className="cm-shortcuts"><button onClick={() => patch({ tab: 'OWNED' })}><LibraryBig size={18} /><span>Bring from my studio<small>{owned.filter(o => !o.linked && !o.unavailableReason).length} available titles</small></span><ChevronRight size={15} /></button>
                    <button onClick={() => leave(onCommission)}><Sparkles size={18} /><span>Commission an Original<small>Brief, funding, and production</small></span><ChevronRight size={15} /></button></div>
                <label className="cm-search"><Search size={17} /><input aria-label="Search content" placeholder="Search titles, genres, or studios" value={draft.search} onChange={e => patch({ search: e.target.value })} /></label>
                <div className="cm-filters" aria-label="Content source">{(['ALL', 'MOVIE', 'SERIES', 'COLLECTIONS', 'OWNED'] as const).map(tab => <button key={tab} aria-pressed={draft.tab === tab} onClick={() => patch({ tab, selectedId: null })}>{({ ALL: 'All', MOVIE: 'Films', SERIES: 'Series', COLLECTIONS: 'Collections', OWNED: 'My studio' })[tab]}</button>)}</div>
                {draft.tab === 'OWNED' ? <>{visibleOwned.map(t => <button className="cm-row" key={t.id} disabled={t.linked || !!t.unavailableReason} onClick={() => patch({ ownedIds: ownedIds.includes(t.id) ? ownedIds.filter(id => id !== t.id) : [...ownedIds, t.id] })}>
                    <Poster seed={t.id} size={42} /><span className="cm-row-copy"><strong>{t.title}</strong><small>{t.studioName} · {t.genre.replaceAll('_', ' ')}</small><small>{t.linked ? 'Already in your catalogue' : t.unavailableReason || `Available: ${countries(t.countryIds)}`}</small>{t.excludedCountryIds.length > 0 && <small>Unavailable: {countries(t.excludedCountryIds)}</small>}</span>{ownedIds.includes(t.id) && <Check size={18} />}</button>)}
                    {!visibleOwned.length && <div className="cm-empty"><LibraryBig size={28} /><h2>No studio releases found</h2><p>Released titles from production houses you control appear here. You can also license content from the market.</p></div>}
                    {ownedIds.length > 0 && <button className="cm-primary" disabled={busy} onClick={() => accept(() => linkContentMarketOwnedTitles(player, ownedIds))}>Add {ownedIds.length} studio {ownedIds.length === 1 ? 'title' : 'titles'} · No internal fee</button>}
                </> : <>{visible.map(o => <button className="cm-row" key={o.id} onClick={() => patch({ selectedId: o.id })}><Poster seed={o.title.id} size={46} /><span className="cm-row-copy"><strong>{o.title.title}</strong><small>{o.title.projectType === 'SERIES' ? 'Series' : 'Film'} · {o.title.genre.replaceAll('_', ' ')}{o.title.rating ? ` · ${o.title.rating.toFixed(1)}` : ''}</small><small>{o.sellerName}</small><small>{o.unavailableReason || `${o.terms.durationWeeks} weeks · ${o.terms.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'}`}</small></span><span className="cm-price">{money(o.terms.minimumGuarantee)}<ChevronRight size={15} /></span></button>)}
                    {visibleCollections.map(o => <button className="cm-row" key={o.id} onClick={() => patch({ selectedId: o.id })}><Poster seed={o.package.id} size={46} /><span className="cm-row-copy"><strong>{o.package.name}</strong><small>{o.rows.length} titles · Collection</small><small>Review individual title prices</small></span><span className="cm-price">{money(o.totalGuarantee)}<ChevronRight size={15} /></span></button>)}
                    {!visible.length && !visibleCollections.length && <div className="cm-empty"><Film size={28} /><h2>No matching listings</h2><p>Try another filter or return after more titles are released. Your studio and Original options remain above.</p></div>}</>}
                {platform.starterCatalog && <label className="cm-strategy">Catalogue strategy<select value={platform.starterCatalog.packageId} onChange={e => onUpdatePlayer(saveContentMarketStrategy(player, e.target.value as any))}>{STREAMING_STARTER_CATALOG_PACKAGES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select><small>A programming direction, with no purchase fee.</small></label>}
                </>}
            </>}
        </main>
        <footer className="cm-footer"><button onClick={() => leave(onClose)}>{returnToLaunch ? 'Return to launch plan' : 'Back to Content Desk'}</button>{platform.starterCatalog && <button onClick={() => leave(onReview)}>Review catalogue <ChevronRight size={14} /></button>}</footer>
    </AccessibleDialog>;
}
