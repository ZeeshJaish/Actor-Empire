import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
    AlertTriangle,
    BadgeCheck,
    Banknote,
    ChevronLeft,
    FileSignature,
    Gavel,
    Handshake,
    Scale,
    ShieldCheck,
    Sparkles,
    Swords,
    Timer,
    X,
} from 'lucide-react';
import { GameLanguage, RightsDealType, RightsNegotiation, RightsOpportunity } from '../../../../types';
import { getRightsDealQuote, RIGHTS_NEGOTIATION_MAX_ROUNDS } from '../../../../services/rightsNegotiation';
import { t } from '../../../../services/i18n';

interface RightsDealRoomProps {
    opportunity: RightsOpportunity;
    negotiation?: RightsNegotiation;
    studioBalance: number;
    reservedCapital: number;
    onClose: () => void;
    onStart: (dealType: RightsDealType, amount: number) => void;
    onCounter: (amount: number) => void;
    onAcceptTerms: () => void;
    onWithdraw: () => void;
    onSign: () => void;
    language: GameLanguage;
}

const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
    return `$${Math.round(value / 1_000)}K`;
};

const formatLabel = (value: string) => value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

const DEAL_ICONS = {
    OPTION: Timer,
    LICENSE: Scale,
    BUYOUT: Handshake,
    CATALOG_PURCHASE: FileSignature,
} as const;

const RESPONSE_TONE: Record<string, { eyebrowKey: string; titleKey: string; accent: string }> = {
    AWAITING_RESPONSE: { eyebrowKey: 'rightsDeal.response.AWAITING_RESPONSE.eyebrow', titleKey: 'rightsDeal.response.AWAITING_RESPONSE.title', accent: 'text-sky-300' },
    ACCEPTED: { eyebrowKey: 'rightsDeal.response.ACCEPTED.eyebrow', titleKey: 'rightsDeal.response.ACCEPTED.title', accent: 'text-emerald-300' },
    COUNTEROFFER: { eyebrowKey: 'rightsDeal.response.COUNTEROFFER.eyebrow', titleKey: 'rightsDeal.response.COUNTEROFFER.title', accent: 'text-amber-300' },
    CREATIVE_GUARANTEE: { eyebrowKey: 'rightsDeal.response.CREATIVE_GUARANTEE.eyebrow', titleKey: 'rightsDeal.response.CREATIVE_GUARANTEE.title', accent: 'text-violet-300' },
    RIVAL_OFFER: { eyebrowKey: 'rightsDeal.response.RIVAL_OFFER.eyebrow', titleKey: 'rightsDeal.response.RIVAL_OFFER.title', accent: 'text-rose-300' },
    BIDDING_WAR: { eyebrowKey: 'rightsDeal.response.BIDDING_WAR.eyebrow', titleKey: 'rightsDeal.response.BIDDING_WAR.title', accent: 'text-rose-300' },
    REJECTED: { eyebrowKey: 'rightsDeal.response.REJECTED.eyebrow', titleKey: 'rightsDeal.response.REJECTED.title', accent: 'text-rose-300' },
    READY_TO_SIGN: { eyebrowKey: 'rightsDeal.response.READY_TO_SIGN.eyebrow', titleKey: 'rightsDeal.response.READY_TO_SIGN.title', accent: 'text-emerald-300' },
    SIGNED: { eyebrowKey: 'rightsDeal.response.SIGNED.eyebrow', titleKey: 'rightsDeal.response.SIGNED.title', accent: 'text-emerald-300' },
    WITHDRAWN: { eyebrowKey: 'rightsDeal.response.WITHDRAWN.eyebrow', titleKey: 'rightsDeal.response.WITHDRAWN.title', accent: 'text-zinc-400' },
};

export const RightsDealRoom: React.FC<RightsDealRoomProps> = ({
    opportunity,
    negotiation,
    studioBalance,
    reservedCapital,
    onClose,
    onStart,
    onCounter,
    onAcceptTerms,
    onWithdraw,
    onSign,
    language,
}) => {
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const reduceMotion = useReducedMotion();
    const dealTypes = useMemo<RightsDealType[]>(() => (
        opportunity.propertyType === 'CATALOG'
            ? ['LICENSE', 'CATALOG_PURCHASE']
            : ['OPTION', 'LICENSE', 'BUYOUT']
    ), [opportunity.propertyType]);
    const [dealType, setDealType] = useState<RightsDealType>(dealTypes[0]);
    const quote = getRightsDealQuote(opportunity, dealType, undefined, language);
    const [offerAmount, setOfferAmount] = useState(quote.suggestedOffer);
    const [signing, setSigning] = useState(false);
    const response = negotiation ? RESPONSE_TONE[negotiation.status] : null;
    const availableCapital = Math.max(0, studioBalance - reservedCapital + (
        negotiation && !['SIGNED', 'WITHDRAWN', 'REJECTED'].includes(negotiation.status)
            ? (negotiation.agreedAmount || negotiation.counterAmount || negotiation.currentOffer)
            : 0
    ));
    const responseAmount = negotiation
        ? negotiation.agreedAmount || negotiation.counterAmount || negotiation.rivalAmount || negotiation.currentOffer
        : offerAmount;
    const counterMinimum = negotiation
        ? Math.max(
            negotiation.currentOffer + Math.max(250_000, Math.round(negotiation.currentOffer * 0.05)),
            negotiation.counterAmount || 0,
            negotiation.rivalAmount || 0,
        )
        : quote.suggestedOffer;
    const [counterAmount, setCounterAmount] = useState(counterMinimum);

    const chooseDeal = (next: RightsDealType) => {
        setDealType(next);
        setOfferAmount(getRightsDealQuote(opportunity, next, undefined, language).suggestedOffer);
    };

    const handleSign = () => {
        if (signing) return;
        setSigning(true);
        window.setTimeout(() => {
            onSign();
            setSigning(false);
        }, reduceMotion ? 80 : 650);
    };

    return (
        <motion.div
            className="fixed inset-0 z-[150] flex items-end justify-center bg-black/90 backdrop-blur-md md:items-center md:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            onWheel={event => event.stopPropagation()}
            onTouchMove={event => event.stopPropagation()}
        >
            <motion.section
                role="dialog"
                aria-modal="true"
                aria-label={`Acquire ${opportunity.title}`}
                initial={reduceMotion ? false : { y: 46, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { y: 28, opacity: 0 }}
                onClick={event => event.stopPropagation()}
                className={`flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden bg-[#090909] text-white shadow-[0_30px_100px_rgba(0,0,0,0.75)] md:max-h-[90dvh] ${
                    negotiation?.status === 'ACCEPTED' || negotiation?.status === 'READY_TO_SIGN' || negotiation?.status === 'SIGNED'
                        ? 'border-2 border-emerald-400 shadow-[0_30px_100px_rgba(0,0,0,0.75),0_0_36px_rgba(52,211,153,0.18)]'
                        : 'border border-amber-400/30'
                }`}
            >
                <header className="relative shrink-0 overflow-hidden border-b border-white/10 px-5 py-5 md:px-7">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.19),transparent_58%)]" />
                    <div className="relative flex items-center justify-between gap-4">
                        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center border border-white/10 text-zinc-400 hover:border-white/30 hover:text-white" aria-label="Close deal room">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-amber-400">Private Deal Room</p>
                            <h2 className="mt-1 truncate text-xl font-black uppercase md:text-2xl">{opportunity.title}</h2>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-zinc-600">Studio capital</p>
                            <p className="mt-1 font-mono text-sm font-black text-emerald-300">{formatCurrency(studioBalance)}</p>
                        </div>
                    </div>
                </header>

                <div className="overflow-y-auto overscroll-contain px-5 py-6 md:px-7">
                    {!negotiation ? (
                        <>
                            <div className="border-l-2 border-amber-400 pl-4">
                                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-400">Choose your play</p>
                                <h3 className="mt-2 text-3xl font-black uppercase leading-none">What do you want to own?</h3>
                                <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
                                    An Inside Report improves your leverage, but every public listing can be approached immediately.
                                </p>
                            </div>

                            <div className="mt-6 grid gap-2 sm:grid-cols-3">
                                {dealTypes.map(type => {
                                    const DealIcon = DEAL_ICONS[type];
                                    const dealQuote = getRightsDealQuote(opportunity, type, undefined, language);
                                    return (
                                        <button
                                            key={type}
                                            onClick={() => chooseDeal(type)}
                                            className={`min-h-32 border p-4 text-left transition-colors ${
                                                dealType === type
                                                    ? 'border-amber-400 bg-amber-400/10'
                                                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'
                                            }`}
                                        >
                                            <DealIcon size={20} className={dealType === type ? 'text-amber-300' : 'text-zinc-600'} />
                                            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.13em]">{dealQuote.label}</p>
                                            <p className="mt-2 font-mono text-sm font-black text-zinc-300">{formatCurrency(dealQuote.suggestedOffer)}</p>
                                            <p className="mt-3 text-[10px] font-semibold leading-relaxed text-zinc-500">{dealQuote.description}</p>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-6 border-y border-zinc-800 py-5">
                                <div className="flex items-start justify-between gap-5">
                                    <div>
                                        <label htmlFor="custom-rights-offer" className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">Your custom offer</label>
                                        <div className="mt-2 flex items-center border border-zinc-700 bg-zinc-950 focus-within:border-amber-400">
                                            <span className="border-r border-zinc-800 px-4 font-mono text-xl font-black text-emerald-300">$</span>
                                            <input
                                                id="custom-rights-offer"
                                                type="number"
                                                inputMode="numeric"
                                                min={quote.minimumOffer}
                                                max={quote.maximumOffer}
                                                step={250000}
                                                value={offerAmount}
                                                onChange={event => setOfferAmount(Math.max(0, Number(event.target.value) || 0))}
                                                className="min-w-0 flex-1 bg-transparent px-4 py-3 font-mono text-xl font-black text-white outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-w-[230px] text-right text-xs leading-relaxed text-zinc-500">{quote.description}</div>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                                    <span>Owner range {formatCurrency(quote.minimumOffer)}–{formatCurrency(quote.maximumOffer)}</span>
                                    <button onClick={() => setOfferAmount(quote.suggestedOffer)} className="text-amber-300 hover:text-amber-200">
                                        Use suggested {formatCurrency(quote.suggestedOffer)}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden border border-zinc-800 bg-zinc-800">
                                <div className="bg-zinc-950 p-4">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Capital held</p>
                                    <p className="mt-2 font-mono text-sm font-black">{formatCurrency(offerAmount)}</p>
                                </div>
                                <div className="bg-zinc-950 p-4">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Response time</p>
                                    <p className="mt-2 text-sm font-black">Next Week</p>
                                </div>
                            </div>
                        </>
                    ) : negotiation.status === 'READY_TO_SIGN' ? (
                        <div className="mx-auto max-w-xl">
                            <div className="relative overflow-hidden bg-[#eee7d7] px-6 py-7 text-[#17130c] shadow-[0_22px_55px_rgba(0,0,0,0.45)] md:px-9 md:py-9">
                                <div className="absolute right-[-34px] top-7 rotate-12 border-4 border-amber-800/25 px-8 py-2 text-xl font-black uppercase tracking-[0.2em] text-amber-800/25">Final</div>
                                <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-5">
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-[0.24em] text-black/45">Rights Acquisition Agreement</p>
                                        <h3 className="mt-2 max-w-sm text-3xl font-black uppercase leading-none">{opportunity.title}</h3>
                                    </div>
                                    <FileSignature size={30} />
                                </div>
                                <div className="grid grid-cols-2 gap-x-5 gap-y-6 py-6 text-sm">
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-black/40">Seller</p>
                                        <p className="mt-2 font-black">{opportunity.sellerName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-black/40">Deal</p>
                                        <p className="mt-2 font-black">{formatLabel(negotiation.dealType)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-black/40">Final price</p>
                                        <p className="mt-2 font-mono text-xl font-black">{formatCurrency(responseAmount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-black/40">Control</p>
                                        <p className="mt-2 font-black">{negotiation.dealType === 'BUYOUT' || negotiation.dealType === 'CATALOG_PURCHASE' ? 'Permanent' : 'Limited Term'}</p>
                                    </div>
                                </div>
                                {negotiation.creativeGuarantee && (
                                    <div className="border-y border-black/20 py-4">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-black/40">{negotiation.creativeGuarantee.title}</p>
                                        <p className="mt-2 text-sm font-semibold leading-relaxed">{negotiation.creativeGuarantee.description}</p>
                                    </div>
                                )}
                                <div className="mt-7 grid grid-cols-2 gap-6">
                                    <div className="border-b border-black pb-2 font-serif italic">Rights Holder</div>
                                    <div className="border-b border-black pb-2 font-serif italic">Your Studio</div>
                                </div>
                                <AnimatePresence>
                                    {signing && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 1.5, rotate: -12 }}
                                            animate={{ opacity: 1, scale: 1, rotate: -7 }}
                                            className="absolute bottom-16 right-8 border-4 border-emerald-800 px-4 py-2 text-xl font-black uppercase tracking-[0.2em] text-emerald-800"
                                        >
                                            Signed
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    ) : (
                        <>
                            {negotiation.status === 'ACCEPTED' && (
                                <motion.div
                                    initial={reduceMotion ? false : { opacity: 0, scale: 1.08 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="mb-6 flex items-center justify-between gap-4 border-2 border-emerald-400 bg-emerald-400/10 p-5 text-emerald-200"
                                >
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.24em]">Owner Decision</p>
                                        <p className="mt-2 text-3xl font-black uppercase leading-none">Offer Accepted</p>
                                        <p className="mt-2 text-xs font-semibold text-emerald-100/70">The negotiation is complete. Accept the terms to prepare the contract.</p>
                                    </div>
                                    <BadgeCheck size={44} className="shrink-0" />
                                </motion.div>
                            )}
                            <div className="flex items-start gap-4 border-b border-zinc-800 pb-6">
                                <div className={`flex h-12 w-12 shrink-0 items-center justify-center border border-white/10 bg-white/[0.04] ${response?.accent}`}>
                                    {['RIVAL_OFFER', 'BIDDING_WAR'].includes(negotiation.status)
                                        ? <Swords size={23} />
                                        : negotiation.status === 'REJECTED'
                                            ? <X size={23} />
                                            : negotiation.status === 'ACCEPTED'
                                                ? <BadgeCheck size={23} />
                                                : <Gavel size={23} />}
                                </div>
                                <div>
                                    <p className={`text-[9px] font-black uppercase tracking-[0.22em] ${response?.accent}`}>{response ? tr(response.eyebrowKey) : ''}</p>
                                    <h3 className="mt-2 text-2xl font-black uppercase leading-tight">{response ? tr(response.titleKey) : ''}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">{negotiation.responseSummary}</p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden border border-zinc-800 bg-zinc-800">
                                <div className="bg-zinc-950 p-3">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Round</p>
                                    <p className="mt-2 font-mono text-lg font-black">{negotiation.round}/{RIGHTS_NEGOTIATION_MAX_ROUNDS}</p>
                                </div>
                                <div className="bg-zinc-950 p-3">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Your offer</p>
                                    <p className="mt-2 font-mono text-sm font-black">{formatCurrency(negotiation.currentOffer)}</p>
                                </div>
                                <div className="bg-zinc-950 p-3">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Terms</p>
                                    <p className="mt-2 font-mono text-sm font-black">{formatCurrency(responseAmount)}</p>
                                </div>
                            </div>

                            {negotiation.creativeGuarantee && (
                                <div className="mt-5 border-l-2 border-violet-400 bg-violet-400/[0.07] p-4">
                                    <div className="flex items-center gap-2 text-violet-300">
                                        <Sparkles size={16} />
                                        <p className="text-[9px] font-black uppercase tracking-[0.18em]">{negotiation.creativeGuarantee.title}</p>
                                    </div>
                                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">{negotiation.creativeGuarantee.description}</p>
                                </div>
                            )}

                            {['COUNTEROFFER', 'RIVAL_OFFER', 'BIDDING_WAR', 'REJECTED'].includes(negotiation.status)
                                && negotiation.round < negotiation.maxRounds && (
                                <div className="mt-5 border border-zinc-800 bg-zinc-950 p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Improved offer</p>
                                            <p className="mt-2 font-mono text-2xl font-black">{formatCurrency(counterAmount)}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setCounterAmount(Math.max(counterMinimum, counterAmount - Math.max(250_000, Math.round(counterAmount * 0.05))))} className="h-10 w-10 border border-zinc-700 text-lg font-black">−</button>
                                            <button onClick={() => setCounterAmount(counterAmount + Math.max(250_000, Math.round(counterAmount * 0.05)))} className="h-10 w-10 border border-zinc-700 text-lg font-black">+</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <footer className="shrink-0 border-t border-white/10 bg-black px-5 py-4 md:px-7">
                    {!negotiation ? (
                        <button
                            onClick={() => onStart(dealType, offerAmount)}
                            disabled={offerAmount > availableCapital || offerAmount < quote.minimumOffer || offerAmount > quote.maximumOffer}
                            className="flex min-h-[52px] w-full items-center justify-center gap-2 bg-amber-400 px-5 text-[10px] font-black uppercase tracking-[0.18em] text-black transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
                        >
                            <Banknote size={17} /> {offerAmount > availableCapital
                                ? 'Not Enough Available Capital'
                                : offerAmount < quote.minimumOffer || offerAmount > quote.maximumOffer
                                    ? 'Enter An Offer Inside The Owner Range'
                                    : `Submit ${formatCurrency(offerAmount)} Offer`}
                        </button>
                    ) : negotiation.status === 'AWAITING_RESPONSE' ? (
                        <div className="flex min-h-[52px] items-center justify-center gap-3 border border-sky-400/20 bg-sky-400/[0.06] text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">
                            <Timer size={17} /> Response arrives next week
                        </div>
                    ) : negotiation.status === 'READY_TO_SIGN' ? (
                        <button onClick={handleSign} disabled={signing || responseAmount > studioBalance} className="flex min-h-[52px] w-full items-center justify-center gap-2 bg-emerald-400 px-5 text-[10px] font-black uppercase tracking-[0.18em] text-black disabled:bg-zinc-800 disabled:text-zinc-600">
                            <FileSignature size={17} /> {responseAmount > studioBalance ? 'Studio Cannot Fund Contract' : signing ? 'Signing Agreement...' : 'Sign Agreement'}
                        </button>
                    ) : negotiation.status === 'SIGNED' ? (
                        <button onClick={onClose} className="flex min-h-[52px] w-full items-center justify-center gap-2 bg-emerald-400 px-5 text-[10px] font-black uppercase tracking-[0.18em] text-black">
                            <ShieldCheck size={17} /> View In Rights Vault
                        </button>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {['ACCEPTED', 'COUNTEROFFER', 'CREATIVE_GUARANTEE', 'RIVAL_OFFER', 'BIDDING_WAR'].includes(negotiation.status) && (
                                <button onClick={onAcceptTerms} className="flex min-h-12 items-center justify-center gap-2 bg-amber-400 px-3 text-[9px] font-black uppercase tracking-[0.13em] text-black">
                                    <Handshake size={15} /> Accept Terms
                                </button>
                            )}
                            {['COUNTEROFFER', 'RIVAL_OFFER', 'BIDDING_WAR', 'REJECTED'].includes(negotiation.status) && negotiation.round < negotiation.maxRounds && (
                                <button onClick={() => onCounter(counterAmount)} className="flex min-h-12 items-center justify-center gap-2 border border-white/20 px-3 text-[9px] font-black uppercase tracking-[0.13em]">
                                    <Gavel size={15} /> Raise Offer
                                </button>
                            )}
                            <button onClick={onWithdraw} className="col-span-2 flex min-h-11 items-center justify-center gap-2 border border-rose-500/25 text-[9px] font-black uppercase tracking-[0.14em] text-rose-300">
                                <AlertTriangle size={14} /> Walk Away
                            </button>
                        </div>
                    )}
                </footer>
            </motion.section>
        </motion.div>
    );
};
