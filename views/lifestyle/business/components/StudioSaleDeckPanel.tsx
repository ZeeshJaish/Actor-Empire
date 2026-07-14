import React from 'react';
import {
    ArrowLeft,
    Banknote,
    BookOpen,
    ChevronRight,
    FileSignature,
    Gavel,
    Handshake,
    Landmark,
    Library,
    ReceiptText,
    Send,
    ShieldCheck,
    Tag,
} from 'lucide-react';
import type { Business, Player, StudioSaleOffer, StudioSaleTransferTerms } from '../../../../types';
import {
    acceptStudioSaleOffer,
    completeStudioSaleTransfer,
    counterAllStudioSaleOffers,
    counterStudioSaleOffer,
    createStudioSaleDeck,
    formatStudioSaleBuyerType,
    formatStudioSaleCatalogRights,
    formatStudioSaleNameRights,
    getStudioSaleEffectiveTransferTerms,
    getStudioSalePricingIssue,
    getStudioSaleReadiness,
    getStudioSaleValuation,
    getStudioSaleWindowState,
    normalizeStudioSalePricing,
    withdrawStudioSaleDeck,
} from '../../../../services/studioSale';

/* ============================================================
   Studio Sale Room — "The Deal Table"
   Setup (auction lot) → Offers (lit fuse + sealed bids)
   → Signing (drag-to-sign ceremony) → Sold (gavel finale)
   Pure presentation rebuild: all game logic stays in
   services/studioSale.ts.
   ============================================================ */

interface StudioSaleEntryCardProps {
    player: Player;
    studio: Business;
    onOpen: () => void;
}

interface StudioSaleRoomProps {
    player: Player;
    studio: Business;
    onBack: () => void;
    onUpdatePlayer: (player: Player) => void;
    onSold?: () => void;
}

const formatMoney = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    const absolute = Math.abs(safe);
    const sign = safe < 0 ? '-' : '';
    if (absolute >= 1_000_000_000) return `${sign}$${(absolute / 1_000_000_000).toFixed(1)}B`;
    if (absolute >= 1_000_000) return `${sign}$${(absolute / 1_000_000).toFixed(1)}M`;
    if (absolute >= 1_000) return `${sign}$${(absolute / 1_000).toFixed(0)}K`;
    return `${sign}$${absolute.toFixed(0)}`;
};

const formatMoneyInput = (value: number) => (
    value > 0 ? `$${Math.round(value).toLocaleString()}` : ''
);

const parseMoneyInput = (value: string) => (
    Number.parseInt(value.replace(/[^\d]/g, ''), 10) || 0
);

const activeDeckStatuses = ['LISTED', 'NEGOTIATING', 'SIGNING'] as const;

const isActiveDeck = (deck: Business['studioState']['saleDeck'] | undefined) => (
    Boolean(deck && activeDeckStatuses.includes(deck.status as any))
);

const getLiveStudio = (player: Player, studio: Business) => (
    (player.businesses || []).find(candidate => candidate.id === studio.id) || studio
);

const studioInitials = (name: string) => (
    name.split(/\s+/).slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase() || 'ST'
);

const getSignerName = (player: Player) => (
    (player.name || 'Authorized Seller').trim().replace(/\s+/g, ' ').slice(0, 28) || 'Authorized Seller'
);

const safeVibrate = (pattern: number | number[]) => {
    try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(pattern);
        }
    } catch {
        // Vibration support differs across WebView/browser shells; signing should never crash over haptics.
    }
};

/* ---------- scoped keyframes / effects ---------- */
const SALE_ROOM_STYLES = `
@keyframes ssrScreenIn{ from{ opacity:0; transform:translateY(14px) scale(.985);} to{ opacity:1; transform:none;} }
@keyframes ssrRise{ from{ opacity:0; transform:translateY(16px);} to{ opacity:1; transform:none;} }
@keyframes ssrLotSwing{ from{ opacity:0; transform:rotate(14deg) translateY(-16px);} to{ opacity:1; transform:rotate(3deg);} }
@keyframes ssrSheen{ 0%{ transform:translateX(-110%);} 45%,100%{ transform:translateX(110%);} }
@keyframes ssrBlink{ 0%,100%{ opacity:1;} 50%{ opacity:.25;} }
@keyframes ssrChipStamp{ 0%{ transform:scale(1);} 40%{ transform:scale(1.07) rotate(-1.5deg);} 100%{ transform:scale(1) translateY(-2px);} }
@keyframes ssrStampIn{ from{ opacity:0; transform:scale(.8) rotate(-3deg);} to{ opacity:1; transform:none;} }
@keyframes ssrSparkPulse{ from{ transform:translateY(-50%) scale(.85);} to{ transform:translateY(-50%) scale(1.25);} }
@keyframes ssrEnvShake{ 0%,88%,100%{ transform:none;} 90%{ transform:rotate(.7deg);} 93%{ transform:rotate(-.7deg);} 96%{ transform:rotate(.4deg);} }
@keyframes ssrDossierFlip{ 0%{ opacity:0; transform:rotateX(-55deg) translateY(-18px);} 60%{ opacity:1;} 100%{ opacity:1; transform:none;} }
@keyframes ssrDocIn{ from{ opacity:0; transform:translateY(60px) rotate(1.5deg);} to{ opacity:1; transform:none;} }
@keyframes ssrDocOut{ to{ opacity:0; transform:translateY(-90px) rotate(-2.5deg);} }
@keyframes ssrWaxStamp{ 0%{ opacity:0; transform:scale(2.6) rotate(-18deg);} 60%{ opacity:1; transform:scale(.92) rotate(-8deg);} 100%{ opacity:1; transform:scale(1) rotate(-8deg);} }
@keyframes ssrShake{ 0%,100%{ transform:none;} 20%{ transform:translate(2px,-2px);} 40%{ transform:translate(-2px,2px);} 60%{ transform:translate(2px,1px);} 80%{ transform:translate(-1px,-1px);} }
@keyframes ssrGavelSlam{ 0%{ opacity:0; transform:translateY(-90px) rotate(-50deg);} 55%{ opacity:1; transform:translateY(0) rotate(8deg);} 70%{ transform:translateY(-12px) rotate(-6deg);} 100%{ transform:translateY(0) rotate(0);} }
@keyframes ssrSoldPop{ from{ opacity:0; transform:scale(.4);} to{ opacity:1; transform:scale(1);} }
@keyframes ssrSoldLine{ from{ opacity:0; transform:translateX(-18px);} to{ opacity:1; transform:none;} }
@keyframes ssrConfFall{ 0%{ opacity:0; transform:translateY(0) rotate(0);} 8%{ opacity:1;} 100%{ opacity:.9; transform:translateY(110vh) rotate(660deg);} }
@keyframes ssrRaySpin{ to{ transform:translate(-50%,-50%) rotate(360deg);} }
.ssr-screen-in{ animation:ssrScreenIn .45s cubic-bezier(.22,1,.36,1) both; }
.ssr-rise{ animation:ssrRise .5s cubic-bezier(.22,1,.36,1) both; }
.ssr-lot{ animation:ssrLotSwing 1s cubic-bezier(.34,1.56,.64,1) both .25s; }
.ssr-sheen-host{ position:relative; overflow:hidden; }
.ssr-sheen{ position:absolute; inset:0; pointer-events:none; background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.45) 50%,transparent 65%); animation:ssrSheen 2.8s ease-in-out infinite .8s; }
.ssr-sheen-soft{ position:absolute; inset:0; pointer-events:none; background:linear-gradient(110deg,transparent 30%,rgba(252,211,77,.14) 50%,transparent 70%); animation:ssrSheen 3.2s ease-in-out infinite 1.2s; }
.ssr-blink{ animation:ssrBlink 1.4s infinite; }
.ssr-chip-stamp{ animation:ssrChipStamp .3s cubic-bezier(.34,1.56,.64,1); }
.ssr-stamp-in{ animation:ssrStampIn .45s cubic-bezier(.34,1.56,.64,1) both; }
.ssr-spark{ animation:ssrSparkPulse .5s ease-in-out infinite alternate; }
.ssr-env-shake{ animation:ssrEnvShake 1.1s ease-in-out infinite; }
.ssr-dossier-flip{ animation:ssrDossierFlip .7s cubic-bezier(.22,1,.36,1) both; }
.ssr-doc-in{ animation:ssrDocIn .55s cubic-bezier(.22,1,.36,1) both; }
.ssr-doc-out{ animation:ssrDocOut .45s cubic-bezier(.55,0,.55,.2) both; }
.ssr-wax{ animation:ssrWaxStamp .5s cubic-bezier(.5,0,.6,1.4) both; }
.ssr-shake{ animation:ssrShake .35s; }
.ssr-gavel{ animation:ssrGavelSlam .9s cubic-bezier(.5,0,.6,1.6) both .2s; }
.ssr-sold-word{ animation:ssrSoldPop .7s cubic-bezier(.34,1.56,.64,1) both .75s; }
.ssr-sold-line{ animation:ssrSoldLine .45s cubic-bezier(.22,1,.36,1) both; }
.ssr-conf{ position:absolute; top:-12px; width:7px; height:11px; opacity:0; animation:ssrConfFall linear infinite; }
.ssr-rays{ position:absolute; left:50%; top:22%; width:520px; height:520px; transform:translate(-50%,-50%); pointer-events:none; border-radius:50%;
  background:conic-gradient(from 0deg, transparent 0 14deg, rgba(252,211,77,.05) 14deg 20deg, transparent 20deg 40deg, rgba(252,211,77,.05) 40deg 46deg, transparent 46deg 70deg, rgba(252,211,77,.05) 70deg 76deg, transparent 76deg 104deg, rgba(252,211,77,.05) 104deg 110deg, transparent 110deg 140deg, rgba(252,211,77,.05) 140deg 146deg, transparent 146deg 180deg, rgba(252,211,77,.05) 180deg 186deg, transparent 186deg 220deg, rgba(252,211,77,.05) 220deg 226deg, transparent 226deg 260deg, rgba(252,211,77,.05) 260deg 266deg, transparent 266deg 300deg, rgba(252,211,77,.05) 300deg 306deg, transparent 306deg 360deg);
  animation:ssrRaySpin 26s linear infinite; }
.ssr-paper{ background:radial-gradient(circle at 20% 0%, rgba(252,211,77,.05), transparent 50%), repeating-linear-gradient(0deg,#181512 0px,#181512 28px,#1a1714 28px,#1a1714 29px), #181512; }
`;

const SaleRoomStyles: React.FC = () => <style>{SALE_ROOM_STYLES}</style>;

/* ---------- count-up hook ---------- */
const useCountUp = (target: number, duration = 1100, delay = 0) => {
    const [value, setValue] = React.useState(0);
    React.useEffect(() => {
        let raf = 0;
        const timer = window.setTimeout(() => {
            const start = performance.now();
            const tick = (now: number) => {
                const progress = Math.min(1, (now - start) / duration);
                const eased = 1 - Math.pow(1 - progress, 3);
                setValue(Math.round(target * eased));
                if (progress < 1) raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
        }, delay);
        return () => { window.clearTimeout(timer); cancelAnimationFrame(raf); };
    }, [target, duration, delay]);
    return value;
};

const CountMoney: React.FC<{ value: number; delay?: number; duration?: number; full?: boolean }> = ({ value, delay = 0, duration = 1100, full }) => {
    const current = useCountUp(value, duration, delay);
    return <>{full ? formatMoneyInput(current) || '$0' : formatMoney(current)}</>;
};

/* ---------- term option data ---------- */
const nameOptions: Array<{ id: StudioSaleTransferTerms['nameRights']; label: string; detail: string }> = [
    { id: 'BUYER_KEEPS_NAME', label: 'Name Included', detail: 'Higher bid — buyer owns the banner.' },
    { id: 'BUYER_REBRANDS', label: 'Rebrand Allowed', detail: 'Buyer may rename after transfer.' },
    { id: 'SELLER_RETAINS_NAME', label: 'Keep Name', detail: 'Lower bid — you keep naming rights.' },
];

const catalogOptions: Array<{ id: StudioSaleTransferTerms['catalogRights']; label: string; detail: string }> = [
    { id: 'FULL_LIBRARY', label: 'Full Library', detail: 'Best valuation — all catalog & IP transfers.' },
    { id: 'FUTURE_SLATE_ONLY', label: 'Future Slate', detail: 'Buyer gets operations & future projects.' },
    { id: 'SELLER_RETAINS_BACK_CATALOG', label: 'Keep Catalog', detail: 'Lower cash — stronger post-sale control.' },
];

/* ============================================================
   ENTRY CARD (finance tab)
   ============================================================ */
export const StudioSaleEntryCard: React.FC<StudioSaleEntryCardProps> = ({ player, studio, onOpen }) => {
    const liveStudio = getLiveStudio(player, studio);
    const deck = liveStudio.studioState?.saleDeck;
    const valuation = getStudioSaleValuation(player, liveStudio);
    const readiness = getStudioSaleReadiness(player, liveStudio);
    const liveDeck = isActiveDeck(deck) ? deck : null;
    const windowState = liveDeck ? getStudioSaleWindowState(player, liveDeck) : null;

    return (
        <div className="rounded-[18px] border-2 border-[#2d2414] bg-[#120d07] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-300">
                        <Handshake size={14} />
                        Studio Sale
                    </div>
                    <div className="mt-1 text-[15px] font-black uppercase leading-tight text-white">
                        {liveDeck ? 'The Sale Room Is Live' : 'Put The Banner On The Block'}
                    </div>
                    <p className="mt-1 text-[11px] font-bold leading-relaxed text-zinc-500">
                        {liveDeck
                            ? `${windowState?.availableOffers.length || 0} sealed bid${(windowState?.availableOffers.length || 0) === 1 ? '' : 's'} opened. Window closes W${liveDeck.offersCloseWeek}.`
                            : 'Valuation file, deal chips, a three-week bid window and a signing ceremony.'}
                    </p>
                </div>
                <div className="shrink-0 rounded-[15px] border border-amber-300/20 bg-black/30 px-3 py-2 text-right">
                    <div className="text-[10px] font-black uppercase text-zinc-600">Valuation</div>
                    <div className="font-mono text-[14px] font-black text-amber-200">{formatMoney(valuation.indicativeValue)}</div>
                </div>
            </div>
            {!readiness.canList && !liveDeck ? (
                <div className="mt-3 rounded-[13px] border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-[11px] font-bold leading-relaxed text-rose-100">
                    {readiness.blockers[0] || 'Sale requirements are not ready.'}
                </div>
            ) : null}
            <button
                type="button"
                onClick={onOpen}
                className="mt-3 flex min-h-12 w-full items-center justify-between rounded-[16px] border-2 border-amber-300/35 bg-amber-300 px-4 text-[11px] font-black uppercase text-black shadow-[0_5px_0_#6b4304] active:translate-y-0.5 active:shadow-[0_2px_0_#6b4304]"
            >
                {liveDeck ? 'Enter Sale Room' : 'Sell Studio'}
                <ChevronRight size={17} />
            </button>
        </div>
    );
};

/* ============================================================
   SHARED SMALL PIECES
   ============================================================ */
const SectionEyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`text-[9px] font-black uppercase tracking-[0.18em] text-amber-300 ${className}`}>{children}</div>
);

const MiniMetric: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone = 'text-white' }) => (
    <div className="min-w-0 rounded-[11px] border border-white/[0.06] bg-black/35 px-2 py-1.5">
        <div className="text-[7px] font-black uppercase tracking-[0.08em] text-zinc-600">{label}</div>
        <div className={`mt-0.5 truncate font-mono text-[11px] font-black ${tone}`}>{value}</div>
    </div>
);

const Stepper: React.FC<{
    label: string;
    sub: string;
    value: string;
    onDec: () => void;
    onInc: () => void;
}> = ({ label, sub, value, onDec, onInc }) => (
    <div className="min-w-0 overflow-hidden rounded-[15px] border border-white/[0.07] bg-black/35 px-1.5 py-2.5 text-center">
        <div className="truncate px-1 text-[8px] font-black uppercase tracking-[0.06em] text-zinc-500">{label}</div>
        <div className="mt-1.5 flex min-w-0 items-center justify-center gap-1">
            <button type="button" onClick={onDec} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border border-white/[0.12] bg-[#1c1917] text-[13px] font-black text-zinc-300 active:scale-90">−</button>
            <div className="min-w-0 flex-1 truncate font-mono text-[16px] font-black text-white">{value}</div>
            <button type="button" onClick={onInc} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border border-white/[0.12] bg-[#1c1917] text-[13px] font-black text-zinc-300 active:scale-90">+</button>
        </div>
        <div className="mt-1 truncate px-1 text-[7.5px] font-extrabold uppercase tracking-[0.05em] text-zinc-700">{sub}</div>
    </div>
);

/* ---------- deal chip ---------- */
const DealChip: React.FC<{
    selected: boolean;
    accent: 'gold' | 'sky';
    label: string;
    detail: string;
    onSelect: () => void;
}> = ({ selected, accent, label, detail, onSelect }) => {
    const [stamping, setStamping] = React.useState(false);
    const accentSel = accent === 'gold'
        ? 'border-amber-300 bg-gradient-to-br from-amber-300/[0.16] to-amber-300/[0.05] text-amber-200'
        : 'border-sky-300 bg-gradient-to-br from-sky-300/[0.15] to-sky-300/[0.04] text-sky-200';
    const badgeSel = accent === 'gold' ? 'bg-amber-300 text-black' : 'bg-sky-300 text-black';
    return (
        <button
            type="button"
            onClick={() => { onSelect(); setStamping(true); window.setTimeout(() => setStamping(false), 350); }}
            className={`relative rounded-[15px] border-[1.5px] p-2.5 text-left transition-colors ${stamping ? 'ssr-chip-stamp' : ''} ${selected ? `${accentSel} -translate-y-0.5` : 'border-white/[0.08] bg-black/35 text-zinc-500'}`}
        >
            <span className={`absolute -top-2 right-0 rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.06em] transition-all ${selected ? `${badgeSel} -rotate-6 scale-100 opacity-100` : 'scale-50 opacity-0'}`}>
                On Table
            </span>
            <div className="text-[10px] font-black uppercase leading-tight">{label}</div>
            <div className="mt-1 text-[8.5px] font-bold leading-snug opacity-70">{detail}</div>
        </button>
    );
};

/* ---------- signature pad ---------- */
const SignaturePad: React.FC<{ signed: boolean; signerName: string; onComplete: () => void }> = ({ signed, signerName, onComplete }) => {
    const trackRef = React.useRef<HTMLDivElement>(null);
    const [knobX, setKnobX] = React.useState(5);
    const [dragging, setDragging] = React.useState(false);
    const completedRef = React.useRef(false);
    const clipId = React.useId().replace(/:/g, '');
    const signatureFontSize = signerName.length > 22 ? 24 : signerName.length > 15 ? 28 : 32;

    React.useEffect(() => {
        if (!signed) { completedRef.current = false; setKnobX(5); }
    }, [signed]);

    React.useEffect(() => {
        if (!dragging) return;
        const onMove = (event: PointerEvent) => {
            const track = trackRef.current;
            if (!track || completedRef.current) return;
            const rect = track.getBoundingClientRect();
            const max = rect.width - 51;
            const next = Math.max(5, Math.min(max, event.clientX - rect.left - 23));
            setKnobX(next);
            if (next >= max - 4) {
                completedRef.current = true;
                setDragging(false);
                onComplete();
            }
        };
        const onUp = () => {
            setDragging(false);
            if (!completedRef.current) setKnobX(5);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    }, [dragging, onComplete]);

    return (
        <div className="border-t border-dashed border-amber-300/20 px-4 pb-4 pt-3">
            <div className="mb-2 flex justify-between text-[8px] font-black uppercase tracking-[0.16em] text-zinc-500">
                <span>Authorised Signature</span>
                {!signed ? <span className="ssr-blink text-amber-300/70">Drag the pen across →</span> : null}
            </div>
            <div
                ref={trackRef}
                className={`relative h-[58px] touch-none overflow-hidden rounded-[14px] border-[1.5px] bg-black/30 ${signed ? 'border-solid border-emerald-300/50' : 'border-dashed border-amber-300/35'}`}
            >
                <div
                    className={`absolute inset-y-0 left-0 ${signed ? 'bg-gradient-to-r from-emerald-300/[0.06] to-emerald-300/[0.14]' : 'bg-gradient-to-r from-amber-300/[0.08] to-amber-300/[0.22]'}`}
                    style={{ width: signed ? '100%' : knobX + 40 }}
                />
                <div className="absolute inset-x-3.5 bottom-3.5 h-px bg-white/20" />
                <svg className="pointer-events-none absolute inset-x-2.5 top-1 h-[46px] w-[calc(100%-20px)]" viewBox="0 0 300 50" preserveAspectRatio="none">
                    <defs>
                        <clipPath id={clipId}>
                            <rect
                                x="0"
                                y="0"
                                width={signed ? 300 : 0}
                                height="50"
                                style={{ transition: signed ? 'width .9s cubic-bezier(.22,1,.36,1)' : 'none' }}
                            />
                        </clipPath>
                    </defs>
                    <g clipPath={`url(#${clipId})`}>
                        <text
                            x="150"
                            y="33"
                            textAnchor="middle"
                            fontFamily="'Snell Roundhand','Brush Script MT','Segoe Script',cursive"
                            fontSize={signatureFontSize}
                            fontWeight={700}
                            fill="#f5f0e4"
                            stroke="#f5f0e4"
                            strokeWidth="0.55"
                            letterSpacing="0"
                            style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.45))' }}
                        >
                            {signerName}
                        </text>
                    </g>
                </svg>
                {!signed ? (
                    <div
                        onPointerDown={event => { event.preventDefault(); setDragging(true); }}
                        className="absolute top-1/2 flex h-[46px] w-[46px] -translate-y-1/2 cursor-grab items-center justify-center rounded-[14px] border-2 border-amber-300/55 bg-gradient-to-b from-amber-100 to-amber-300 text-[19px] text-black shadow-[0_3px_0_#6b4304,0_0_16px_rgba(252,211,77,0.3)] active:cursor-grabbing"
                        style={{ left: knobX }}
                    >
                        <FileSignature size={19} />
                    </div>
                ) : null}
            </div>
        </div>
    );
};

/* ============================================================
   SALE ROOM
   ============================================================ */
interface SoldSummary {
    buyerName: string;
    amount: number;
    cashAtClose: number;
    royaltyPercent: number;
    royaltyWeeks: number;
    nameRights: string;
    catalogRights: string;
    studioName: string;
}

interface CounterDraft { amount: string; royalty: string; }

export const StudioSaleRoom: React.FC<StudioSaleRoomProps> = ({
    player,
    studio,
    onBack,
    onUpdatePlayer,
    onSold,
}) => {
    const liveStudio = getLiveStudio(player, studio);
    const deck = liveStudio.studioState?.saleDeck;
    const activeDeck = isActiveDeck(deck) ? deck : null;
    const valuation = React.useMemo(() => getStudioSaleValuation(player, liveStudio), [player, liveStudio]);
    const readiness = React.useMemo(() => getStudioSaleReadiness(player, liveStudio), [player, liveStudio]);
    const windowState = activeDeck ? getStudioSaleWindowState(player, activeDeck) : null;
    const acceptedOffer = activeDeck?.offers.find(offer => offer.id === activeDeck.acceptedOfferId);

    const [feedback, setFeedback] = React.useState('');
    const [askInput, setAskInput] = React.useState(formatMoneyInput(valuation.recommendedAsk));
    const [floorInput, setFloorInput] = React.useState(formatMoneyInput(valuation.recommendedFloor));
    const [counterDrafts, setCounterDrafts] = React.useState<Record<string, CounterDraft>>({});
    const [revealedOfferIds, setRevealedOfferIds] = React.useState<string[]>([]);
    const [terms, setTerms] = React.useState<StudioSaleTransferTerms>({
        nameRights: 'BUYER_KEEPS_NAME',
        catalogRights: 'FULL_LIBRARY',
        sellerCredit: true,
        staffProtectionWeeks: 12,
        royaltyPercent: 2,
        royaltyWeeks: 104,
    });

    /* signing ceremony state */
    const [signingPage, setSigningPage] = React.useState(0);
    const [docSigned, setDocSigned] = React.useState(false);
    const [waxVisible, setWaxVisible] = React.useState(false);
    const [buttonReady, setButtonReady] = React.useState(false);
    const [docLeaving, setDocLeaving] = React.useState(false);
    const [shaking, setShaking] = React.useState(false);
    const [soldSummary, setSoldSummary] = React.useState<SoldSummary | null>(null);
    const timers = React.useRef<number[]>([]);
    const pushTimer = (id: number) => { timers.current.push(id); };
    React.useEffect(() => () => { timers.current.forEach(id => window.clearTimeout(id)); }, []);

    React.useEffect(() => {
        if (activeDeck) return;
        setAskInput(formatMoneyInput(valuation.recommendedAsk));
        setFloorInput(formatMoneyInput(valuation.recommendedFloor));
    }, [activeDeck?.id, valuation.recommendedAsk, valuation.recommendedFloor]);

    React.useEffect(() => {
        if (activeDeck) return;
        setTerms(current => {
            const normalized = getStudioSaleEffectiveTransferTerms(player, liveStudio, current);
            return normalized.catalogRights === current.catalogRights
                && normalized.nameRights === current.nameRights
                && normalized.sellerCredit === current.sellerCredit
                && normalized.staffProtectionWeeks === current.staffProtectionWeeks
                && normalized.royaltyPercent === current.royaltyPercent
                && normalized.royaltyWeeks === current.royaltyWeeks
                ? current
                : normalized;
        });
    }, [activeDeck?.id, player, liveStudio]);

    /* track which offers were seen so a new arrival gets the flip-open reveal */
    React.useEffect(() => {
        const ids = windowState?.availableOffers.map(offer => offer.id) || [];
        const unseen = ids.filter(id => !revealedOfferIds.includes(id));
        if (unseen.length > 0) {
            const timer = window.setTimeout(() => setRevealedOfferIds(current => [...current, ...unseen]), 700);
            pushTimer(timer);
        }
    }, [windowState?.availableOffers.length]);

    const askValue = parseMoneyInput(askInput);
    const floorValue = parseMoneyInput(floorInput);
    const pricingIssue = getStudioSalePricingIssue(valuation, askValue, floorValue);
    const syncPricingInputs = () => {
        const normalized = normalizeStudioSalePricing(valuation, askValue, floorValue);
        setAskInput(formatMoneyInput(normalized.askPrice));
        setFloorInput(formatMoneyInput(normalized.minimumPrice));
    };

    /* ---------- handlers (unchanged service wiring) ---------- */
    const handleList = () => {
        if (pricingIssue) { setFeedback(pricingIssue); return; }
        const listingTerms = getStudioSaleEffectiveTransferTerms(player, liveStudio, terms);
        const result = createStudioSaleDeck(player, liveStudio.id, askValue, floorValue, listingTerms);
        setFeedback(result.message);
        if (result.success) onUpdatePlayer(result.player);
    };

    const handleWithdraw = () => {
        const result = withdrawStudioSaleDeck(player, liveStudio.id);
        setFeedback(result.message);
        if (result.success) onUpdatePlayer(result.player);
    };

    const draftFor = (offerId: string): CounterDraft => counterDrafts[offerId] || { amount: '', royalty: '2' };
    const setDraft = (offerId: string, patch: Partial<CounterDraft>) => {
        setCounterDrafts(current => ({ ...current, [offerId]: { ...draftFor(offerId), ...patch } }));
    };

    const handleCounter = (offerId: string) => {
        const draft = draftFor(offerId);
        const amount = parseMoneyInput(draft.amount);
        if (!amount) { setFeedback('Enter a counter amount first.'); return; }
        const result = counterStudioSaleOffer(player, liveStudio.id, offerId, amount, Number(draft.royalty) || 0);
        setFeedback(result.message);
        if (result.success) onUpdatePlayer(result.player);
    };

    const handleCounterAll = (fromOfferId: string) => {
        const draft = draftFor(fromOfferId);
        const amount = parseMoneyInput(draft.amount);
        if (!amount) { setFeedback('Enter a counter amount first.'); return; }
        const result = counterAllStudioSaleOffers(player, liveStudio.id, amount, Number(draft.royalty) || 0);
        setFeedback(result.message);
        if (result.success) onUpdatePlayer(result.player);
    };

    const handleAccept = (offerId: string) => {
        const result = acceptStudioSaleOffer(player, liveStudio.id, offerId);
        setFeedback(result.message);
        if (result.success) {
            setSigningPage(0);
            setDocSigned(false);
            setWaxVisible(false);
            setButtonReady(false);
            onUpdatePlayer(result.player);
        }
    };

    const handleSignatureComplete = () => {
        setDocSigned(true);
        pushTimer(window.setTimeout(() => {
            setWaxVisible(true);
            setShaking(true);
            safeVibrate(40);
            pushTimer(window.setTimeout(() => setShaking(false), 400));
        }, 850));
        pushTimer(window.setTimeout(() => setButtonReady(true), 1300));
    };

    const advanceDocument = () => {
        if (!buttonReady) return;
        if (signingPage >= 3) { handleFinalSeal(); return; }
        setDocLeaving(true);
        pushTimer(window.setTimeout(() => {
            setSigningPage(current => current + 1);
            setDocSigned(false);
            setWaxVisible(false);
            setButtonReady(false);
            setDocLeaving(false);
        }, 420));
    };

    const handleFinalSeal = () => {
        if (!acceptedOffer || !activeDeck) return;
        const summary: SoldSummary = {
            buyerName: acceptedOffer.buyerName,
            amount: acceptedOffer.amount,
            cashAtClose: acceptedOffer.cashAtClose,
            royaltyPercent: acceptedOffer.royaltyPercent,
            royaltyWeeks: acceptedOffer.royaltyWeeks,
            nameRights: formatStudioSaleNameRights(activeDeck.transferTerms.nameRights),
            catalogRights: formatStudioSaleCatalogRights(activeDeck.transferTerms.catalogRights),
            studioName: liveStudio.name,
        };
        const result = completeStudioSaleTransfer(player, liveStudio.id);
        setFeedback(result.message);
        if (!result.success) return;
        onUpdatePlayer(result.player);
        setSoldSummary(summary);
        safeVibrate([30, 60, 30]);
    };

    const handleLeaveSoldScreen = () => {
        onSold?.();
        onBack();
    };

    /* ============================================================
       SETUP — the auction lot
       ============================================================ */
    const spreadBounds = { lo: valuation.indicativeValue * 0.72, hi: valuation.indicativeValue * 1.32 };
    const spreadPos = (value: number) => Math.max(2, Math.min(98, ((value - spreadBounds.lo) / (spreadBounds.hi - spreadBounds.lo)) * 100));
    const askPremium = valuation.indicativeValue > 0 ? ((askValue / valuation.indicativeValue) - 1) * 100 : 0;
    const spreadWarning = pricingIssue
        || (askPremium > 25 ? `Asking +${askPremium.toFixed(0)}% over valuation - expect thin interest.` : null);

    const renderSetup = () => (
        <div className="space-y-4">
            {/* banker's valuation file */}
            <section className="ssr-rise rounded-[22px] border-2 border-[#29251f] bg-[#0d0c0b] p-4 shadow-[0_6px_0_#020202]" style={{ animationDelay: '.05s' }}>
                <div className="flex items-baseline justify-between">
                    <SectionEyebrow>Banker's Valuation File</SectionEyebrow>
                    <div className="text-[8px] font-black uppercase tracking-[0.1em] text-zinc-700">Verified</div>
                </div>
                <div className="mt-2">
                    {[
                        { label: 'Annual Revenue', value: valuation.annualRevenue, tone: 'text-emerald-300', minus: false, delay: 250 },
                        { label: 'Catalog & IP Library', value: valuation.catalogValue, tone: 'text-sky-300', minus: false, delay: 390 },
                        { label: 'Outstanding Debt', value: valuation.debt, tone: valuation.debt > 0 ? 'text-rose-300' : 'text-zinc-400', minus: true, delay: 530 },
                    ].map((row, index, rows) => (
                        <div key={row.label} className={`flex items-center justify-between px-0.5 py-2.5 ${index < rows.length - 1 ? 'border-b border-dashed border-white/[0.06]' : ''}`}>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.06em] text-zinc-500">
                                <span className={`flex h-4 w-4 items-center justify-center rounded-[5px] text-[11px] font-black ${row.minus ? 'bg-rose-300/[0.12] text-rose-300' : 'bg-emerald-300/[0.12] text-emerald-300'}`}>
                                    {row.minus ? '−' : '+'}
                                </span>
                                {row.label}
                            </div>
                            <div className={`font-mono text-[14px] font-black ${row.tone}`}>
                                <CountMoney value={row.value} delay={row.delay} duration={900} />
                            </div>
                        </div>
                    ))}
                </div>
                {valuation.includedStudios.length > 1 ? (
                    <div className="mt-3 rounded-[14px] border border-white/[0.06] bg-black/30 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-600">Package Includes</div>
                            <div className="font-mono text-[9px] font-black uppercase text-amber-300/70">{valuation.includedStudios.length} studios</div>
                        </div>
                        <div className="mt-2 grid gap-1.5">
                            {valuation.includedStudios.slice(0, 4).map(part => (
                                <div key={part.id} className="flex min-w-0 items-center justify-between gap-2 border-t border-dashed border-white/[0.05] pt-1.5 first:border-t-0 first:pt-0">
                                    <div className="min-w-0">
                                        <div className="truncate text-[9px] font-black uppercase text-zinc-300">
                                            {part.isPrimary ? 'HQ' : 'Subsidiary'} · {part.name}
                                        </div>
                                        <div className="mt-0.5 text-[8px] font-bold text-zinc-600">
                                            Rev {formatMoney(part.annualRevenue)} · Debt {formatMoney(part.debt)}
                                        </div>
                                    </div>
                                    <div className="shrink-0 font-mono text-[10px] font-black text-amber-200">{formatMoney(part.estimatedValue)}</div>
                                </div>
                            ))}
                            {valuation.includedStudios.length > 4 ? (
                                <div className="text-[8px] font-black uppercase tracking-[0.08em] text-zinc-600">
                                    +{valuation.includedStudios.length - 4} more bundled banners
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : null}
                <div className="ssr-sheen-host mt-3 flex items-center justify-between rounded-[16px] border border-amber-300/25 bg-gradient-to-br from-amber-300/[0.10] to-amber-300/[0.03] px-4 py-3">
                    <span className="ssr-sheen-soft" />
                    <div className="text-[10px] font-black uppercase leading-tight tracking-[0.1em] text-amber-300/70">Indicative<br />Value</div>
                    <div className="font-mono text-[24px] font-black text-amber-200">
                        <CountMoney value={valuation.indicativeValue} delay={670} duration={1500} />
                    </div>
                </div>
            </section>

            {/* the spread */}
            <section className="ssr-rise rounded-[22px] border-2 border-[#29251f] bg-[#0d0c0b] p-4 shadow-[0_6px_0_#020202]" style={{ animationDelay: '.12s' }}>
                <SectionEyebrow>The Spread</SectionEyebrow>
                <div className="mt-1 text-[15px] font-black uppercase text-white">Set Ask & Walk-Away Floor</div>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <label className="rounded-[15px] border border-sky-300/[0.22] bg-black/35 px-3 py-2.5">
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#4c7f9c]">
                            <Gavel size={11} />
                            Walk-Away Floor
                        </span>
                        <input
                            value={floorInput}
                            onChange={event => setFloorInput(event.target.value)}
                            onBlur={syncPricingInputs}
                            inputMode="numeric"
                            className="mt-1.5 w-full bg-transparent font-mono text-[16px] font-black text-white outline-none placeholder:text-zinc-800"
                            placeholder="$180,000,000"
                        />
                    </label>
                    <label className="rounded-[15px] border border-amber-300/[0.28] bg-black/35 px-3 py-2.5">
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-amber-300/60">
                            <Banknote size={11} />
                            Asking Price
                        </span>
                        <input
                            value={askInput}
                            onChange={event => setAskInput(event.target.value)}
                            onBlur={syncPricingInputs}
                            inputMode="numeric"
                            className="mt-1.5 w-full bg-transparent font-mono text-[16px] font-black text-white outline-none placeholder:text-zinc-800"
                            placeholder="$250,000,000"
                        />
                    </label>
                </div>
                {/* spread track */}
                <div className="mt-5 px-1">
                    <div className="relative h-[34px]">
                        <div className="absolute inset-x-0 top-[14px] h-1.5 rounded-full bg-[#1c1917]" />
                        <div
                            className="absolute top-[14px] h-1.5 rounded-full bg-gradient-to-r from-sky-300 to-amber-300 transition-all duration-300"
                            style={{ left: `${Math.min(spreadPos(floorValue), spreadPos(askValue))}%`, width: `${Math.abs(spreadPos(askValue) - spreadPos(floorValue))}%` }}
                        />
                        <div className="absolute top-1 h-[26px] w-0.5 bg-white/50 transition-all duration-300" style={{ left: `${spreadPos(valuation.indicativeValue)}%` }}>
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[7px] font-black uppercase tracking-[0.1em] text-zinc-500">Valuation</span>
                        </div>
                        <div className="absolute top-[9px] h-4 w-4 -translate-x-1/2 rounded-full border-[3px] border-black bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.5)] transition-all duration-300" style={{ left: `${spreadPos(floorValue)}%` }} />
                        <div className="absolute top-[9px] h-4 w-4 -translate-x-1/2 rounded-full border-[3px] border-black bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.5)] transition-all duration-300" style={{ left: `${spreadPos(askValue)}%` }} />
                    </div>
                    <div className="mt-2 min-h-[15px] text-center text-[10px] font-extrabold leading-relaxed text-zinc-500">
                        {spreadWarning ? (
                            <span><b className="text-rose-300">{spreadWarning}</b></span>
                        ) : (
                            <span>
                                Asking <b className="text-amber-300">{askPremium >= 0 ? '+' : ''}{askPremium.toFixed(0)}%</b> vs valuation ·
                                spread of <b className="text-amber-300"> {formatMoney(Math.max(0, askValue - floorValue))}</b> to negotiate in.
                            </span>
                        )}
                    </div>
                </div>
            </section>

            {/* deal chips */}
            <section className="ssr-rise rounded-[22px] border-2 border-[#29251f] bg-[#120d07] p-4 shadow-[0_6px_0_#020202]" style={{ animationDelay: '.19s' }}>
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-amber-300/20 bg-[#2a1b06] text-amber-200">
                        <Tag size={18} />
                    </div>
                    <div>
                        <SectionEyebrow>Listing Terms</SectionEyebrow>
                        <h2 className="mt-1 text-[15px] font-black uppercase leading-none text-white">Stack Your Deal Chips</h2>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">
                        <FileSignature size={12} />
                        Name & Banner Rights
                    </div>
                    <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-1.5">
                        {nameOptions.map(option => (
                            <DealChip
                                key={option.id}
                                selected={terms.nameRights === option.id}
                                accent="gold"
                                label={option.label}
                                detail={option.detail}
                                onSelect={() => setTerms(current => ({ ...current, nameRights: option.id }))}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-4">
                    <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">
                        <Library size={12} />
                        IP & Catalog Transfer
                    </div>
                    <div className={`grid gap-1.5 ${valuation.isParentSale ? 'grid-cols-1' : 'grid-cols-[repeat(3,minmax(0,1fr))]'}`}>
                        {(valuation.isParentSale ? catalogOptions.filter(option => option.id === 'FULL_LIBRARY') : catalogOptions).map(option => (
                            <DealChip
                                key={option.id}
                                selected={terms.catalogRights === option.id}
                                accent="sky"
                                label={option.label}
                                detail={option.detail}
                                onSelect={() => setTerms(current => ({ ...current, catalogRights: option.id }))}
                            />
                        ))}
                    </div>
                    {valuation.isParentSale ? (
                        <div className="mt-2 rounded-[11px] border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2 text-[9px] font-bold leading-relaxed text-amber-100/70">
                            Parent sale transfers the full library with the production house and bundled subsidiaries.
                        </div>
                    ) : valuation.retainedCatalogTargetStudioName ? (
                        <div className="mt-2 rounded-[11px] border border-sky-300/15 bg-sky-300/[0.05] px-3 py-2 text-[9px] font-bold leading-relaxed text-sky-100/70">
                            Keep-catalog terms move retained IP into {valuation.retainedCatalogTargetStudioName} at closing.
                        </div>
                    ) : null}
                </div>

                <div className="mt-4 grid grid-cols-[repeat(3,minmax(0,1fr))] gap-1.5">
                    <Stepper
                        label="Royalty %"
                        sub="of buyer revenue"
                        value={terms.royaltyPercent.toFixed(1)}
                        onDec={() => setTerms(current => ({ ...current, royaltyPercent: Math.max(0, +(current.royaltyPercent - 0.5).toFixed(1)) }))}
                        onInc={() => setTerms(current => ({ ...current, royaltyPercent: Math.min(8, +(current.royaltyPercent + 0.5).toFixed(1)) }))}
                    />
                    <Stepper
                        label="Royalty Weeks"
                        sub={`≈ ${(terms.royaltyWeeks / 52).toFixed(1)} years`}
                        value={String(terms.royaltyWeeks)}
                        onDec={() => setTerms(current => ({ ...current, royaltyWeeks: Math.max(0, current.royaltyWeeks - 26) }))}
                        onInc={() => setTerms(current => ({ ...current, royaltyWeeks: Math.min(208, current.royaltyWeeks + 26) }))}
                    />
                    <Stepper
                        label="Staff Shield"
                        sub="weeks protected"
                        value={String(terms.staffProtectionWeeks)}
                        onDec={() => setTerms(current => ({ ...current, staffProtectionWeeks: Math.max(0, current.staffProtectionWeeks - 4) }))}
                        onInc={() => setTerms(current => ({ ...current, staffProtectionWeeks: Math.min(52, current.staffProtectionWeeks + 4) }))}
                    />
                </div>
            </section>

            {/* clearance stamps */}
            <section className="ssr-rise" style={{ animationDelay: '.26s' }}>
                <SectionEyebrow className="mb-2">Deal Clearance</SectionEyebrow>
                <div className="grid grid-cols-2 gap-2">
                    {readiness.requirements.map((requirement, index) => (
                        <div
                            key={requirement.id}
                            className={`ssr-stamp-in relative overflow-hidden rounded-[15px] border px-3 py-2.5 ${requirement.met ? 'border-emerald-300/20 bg-emerald-300/[0.05]' : 'border-rose-300/[0.22] bg-rose-300/[0.06]'}`}
                            style={{ animationDelay: `${0.35 + index * 0.1}s` }}
                        >
                            <div className="pr-16 text-[10px] font-black uppercase leading-tight text-white">{requirement.label}</div>
                            <div className="mt-1 pr-16 text-[9px] font-bold leading-snug text-zinc-500">{requirement.detail}</div>
                            <div className={`absolute right-2 top-1/2 -translate-y-1/2 rotate-[8deg] rounded-[6px] border-2 px-1.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${requirement.met ? 'border-emerald-300/60 text-emerald-300' : 'border-rose-300/60 text-rose-300'}`}>
                                {requirement.met ? 'Cleared' : 'Blocked'}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <button
                type="button"
                onClick={handleList}
                disabled={!readiness.canList}
                className="ssr-rise ssr-sheen-host flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[17px] border-2 border-amber-300/40 bg-gradient-to-b from-amber-100 to-amber-300 px-4 text-[12px] font-black uppercase tracking-[0.1em] text-black shadow-[0_6px_0_#6b4304] active:translate-y-[3px] active:shadow-[0_3px_0_#6b4304] disabled:cursor-not-allowed disabled:border-white/[0.07] disabled:bg-none disabled:bg-[#1c1917] disabled:text-zinc-600 disabled:shadow-none"
                style={{ animationDelay: '.33s' }}
            >
                {readiness.canList ? <span className="ssr-sheen" /> : null}
                <Send size={15} />
                Open For Offers — 3 Week Window
            </button>
        </div>
    );

    /* ============================================================
       OFFERS — the lit fuse
       ============================================================ */
    const offerHeat = (offer: StudioSaleOffer) => {
        if (!activeDeck) return 1;
        if (offer.amount >= activeDeck.askPrice || offer.amount >= activeDeck.minimumPrice * 1.08) return 3;
        if (offer.amount >= activeDeck.minimumPrice) return 2;
        return 1;
    };

    const buyerBadgeTone = (offer: StudioSaleOffer) => {
        if (offer.status === 'REJECTED') return 'border-rose-300/35 bg-rose-300/[0.07] text-rose-300';
        switch (offer.buyerType) {
            case 'PRIVATE_EQUITY': return 'border-emerald-300/35 bg-emerald-300/[0.07] text-emerald-300';
            case 'RIVAL_STUDIO': return 'border-sky-300/35 bg-sky-300/[0.07] text-sky-300';
            case 'STREAMING_PLATFORM': return 'border-violet-300/35 bg-violet-300/[0.07] text-violet-300';
            default: return 'border-amber-300/35 bg-amber-300/[0.07] text-amber-300';
        }
    };

    const toneStripe = (offer: StudioSaleOffer) => {
        if (!activeDeck || offer.status === 'REJECTED') return 'bg-gradient-to-b from-rose-300 to-transparent';
        if (offer.amount >= activeDeck.askPrice) return 'bg-gradient-to-b from-emerald-300 to-transparent';
        if (offer.amount >= activeDeck.minimumPrice) return 'bg-gradient-to-b from-amber-300 to-transparent';
        return 'bg-gradient-to-b from-zinc-600 to-transparent';
    };

    const renderDossier = (offer: StudioSaleOffer) => {
        if (!activeDeck) return null;
        const rejected = offer.status === 'REJECTED';
        const heat = rejected ? 0 : offerHeat(offer);
        const vsAsk = activeDeck.askPrice > 0 ? ((offer.amount / activeDeck.askPrice) - 1) * 100 : 0;
        const draft = draftFor(offer.id);
        const justRevealed = !revealedOfferIds.includes(offer.id);
        return (
            <article
                key={offer.id}
                className={`relative overflow-hidden rounded-[20px] border-2 border-[#26221b] bg-[#080706] shadow-[0_5px_0_#020202] ${justRevealed ? 'ssr-dossier-flip' : ''} ${rejected ? 'opacity-55' : ''}`}
                style={{ perspective: 900 }}
            >
                <div className={`absolute inset-y-0 left-0 w-1 ${toneStripe(offer)}`} />
                <div className="p-3.5 pl-[17px]">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] ${buyerBadgeTone(offer)}`}>
                                {rejected ? '✕ Walked Away' : `◆ ${formatStudioSaleBuyerType(offer.buyerType)}`}
                            </span>
                            <h3 className="mt-2 text-[17px] font-black uppercase leading-none text-white">{offer.buyerName}</h3>
                            <div className="mt-1 text-[10px] font-bold text-zinc-500">{offer.headline}</div>
                        </div>
                        <div className="shrink-0 text-right">
                            <div className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-700">Interest</div>
                            <div className="mt-1 flex justify-end gap-[2.5px]">
                                <span className={`h-4 w-[7px] rounded-[2.5px] ${heat >= 1 ? 'bg-[#7c5a10]' : 'bg-[#1f1b14]'}`} />
                                <span className={`h-4 w-[7px] rounded-[2.5px] ${heat >= 2 ? 'bg-[#c79a1e]' : 'bg-[#1f1b14]'}`} />
                                <span className={`h-4 w-[7px] rounded-[2.5px] ${heat >= 3 ? 'bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.6)]' : 'bg-[#1f1b14]'}`} />
                            </div>
                            <div className="mt-1 text-[8px] font-black uppercase tracking-[0.05em] text-amber-300/60">
                                {rejected ? 'gone' : ['cool', 'warm', 'burning'][heat - 1]}
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 rounded-[14px] border border-amber-300/[0.22] bg-gradient-to-br from-amber-300/[0.09] to-transparent px-3 py-2.5">
                        <div className="text-[8px] font-black uppercase tracking-[0.12em] text-amber-300/60">
                            {offer.counterStatus === 'ACCEPTED' ? 'Counter Locked' : 'Bid On Table'}
                        </div>
                        <div className="mt-0.5 font-mono text-[21px] font-black text-amber-200">{formatMoney(offer.amount)}</div>
                        <div className={`mt-0.5 text-[8px] font-black tracking-[0.04em] ${vsAsk >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {vsAsk >= 0 ? '▲' : '▼'} {Math.abs(vsAsk).toFixed(1)}% vs ask
                        </div>
                    </div>

                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                        <MiniMetric label="Cash" value={formatMoney(offer.cashAtClose)} tone="text-emerald-300" />
                        <MiniMetric label="Debt" value={formatMoney(offer.debtAssumed)} tone="text-sky-200" />
                        <MiniMetric label="Royalty" value={`${offer.royaltyPercent.toFixed(1)}%`} tone="text-violet-200" />
                        <MiniMetric label="Est. Stream" value={formatMoney(offer.royaltyEstimate)} tone="text-zinc-300" />
                    </div>

                    <p className="mt-2.5 text-[10px] font-bold leading-relaxed text-zinc-400">Buyer plans to {offer.buyerIntent}.</p>
                    <div className="mt-2 grid gap-1.5">
                        {offer.conditions.slice(0, 3).map(condition => (
                            <div key={condition} className="flex items-start gap-1.5 text-[9px] font-bold leading-snug text-zinc-500">
                                <ShieldCheck size={11} className="mt-0.5 shrink-0 text-emerald-300" />
                                <span>{condition}</span>
                            </div>
                        ))}
                    </div>

                    {offer.counterStatus ? (
                        <div className={`mt-3 rounded-[11px] border px-3 py-2 text-[9px] font-black uppercase tracking-[0.06em] ${
                            offer.counterStatus === 'ACCEPTED' ? 'border-emerald-300/30 bg-emerald-300/[0.07] text-emerald-200'
                            : offer.counterStatus === 'PENDING' ? 'border-sky-300/25 bg-sky-300/[0.06] text-sky-200'
                            : 'border-rose-300/30 bg-rose-300/[0.07] text-rose-200'}`}
                        >
                            {offer.counterStatus === 'PENDING' ? 'Counter sent - buyer responds next week'
                                : `Counter ${offer.counterStatus.toLowerCase()}${offer.counterAmount ? ` at ${formatMoney(offer.counterAmount)}` : ''}`}
                        </div>
                    ) : null}

                    {!rejected ? (
                        <>
                            <div className="mt-3 border-t border-dashed border-white/[0.08] pt-3">
                                <div className="flex gap-1.5">
                                    <label className="min-w-0 flex-1 rounded-[12px] border border-sky-300/20 bg-black/40 px-2.5 py-1.5">
                                        <span className="text-[7px] font-black uppercase tracking-[0.1em] text-[#4c7f9c]">Counter Amount</span>
                                        <input
                                            value={draft.amount}
                                            onChange={event => setDraft(offer.id, { amount: event.target.value })}
                                            onBlur={() => { const parsed = parseMoneyInput(draft.amount); if (parsed) setDraft(offer.id, { amount: formatMoneyInput(parsed) }); }}
                                            inputMode="numeric"
                                            placeholder={formatMoneyInput(activeDeck.askPrice)}
                                            className="mt-0.5 w-full bg-transparent font-mono text-[13px] font-black text-sky-100 outline-none placeholder:text-zinc-700"
                                        />
                                    </label>
                                    <label className="w-16 shrink-0 rounded-[12px] border border-sky-300/20 bg-black/40 px-2.5 py-1.5">
                                        <span className="text-[7px] font-black uppercase tracking-[0.1em] text-[#4c7f9c]">Roy %</span>
                                        <input
                                            value={draft.royalty}
                                            onChange={event => setDraft(offer.id, { royalty: event.target.value })}
                                            inputMode="decimal"
                                            className="mt-0.5 w-full bg-transparent font-mono text-[13px] font-black text-sky-100 outline-none"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => handleCounter(offer.id)}
                                        disabled={!parseMoneyInput(draft.amount)}
                                        className="shrink-0 rounded-[12px] border-[1.5px] border-sky-300/40 bg-sky-300/[0.12] px-3 text-[9px] font-black uppercase leading-tight tracking-[0.06em] text-sky-200 disabled:cursor-not-allowed disabled:opacity-35"
                                    >
                                        Send<br />Counter
                                    </button>
                                </div>
                            </div>
                            <div className="mt-2.5 grid grid-cols-[1fr_1.3fr] gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleCounterAll(offer.id)}
                                    disabled={!parseMoneyInput(draft.amount)}
                                    className="min-h-11 rounded-[14px] border border-sky-300/25 bg-sky-300/[0.06] px-2 text-[9.5px] font-black uppercase tracking-[0.05em] text-sky-200 disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    Counter All At This
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAccept(offer.id)}
                                    className="flex min-h-11 items-center justify-center gap-1.5 rounded-[14px] border-2 border-emerald-300/40 bg-gradient-to-b from-emerald-200 to-emerald-300 px-2 text-[10.5px] font-black uppercase tracking-[0.05em] text-black shadow-[0_4px_0_#064e3b] active:translate-y-0.5 active:shadow-[0_2px_0_#064e3b]"
                                >
                                    <FileSignature size={14} />
                                    Choose Buyer
                                </button>
                            </div>
                        </>
                    ) : null}
                </div>
            </article>
        );
    };

    const renderOffers = () => {
        if (!activeDeck || !windowState) return null;
        const fusePercent = Math.max(8, Math.min(96, (windowState.elapsedWeeks / Math.max(1, windowState.totalWeeks)) * 96));
        const topBid = windowState.availableOffers
            .filter(offer => offer.status !== 'REJECTED')
            .reduce((max, offer) => Math.max(max, offer.amount), 0);
        return (
            <div className="space-y-4">
                <section className="ssr-rise rounded-[22px] border-2 border-[#2d2414] bg-[#120d07] p-4 shadow-[0_6px_0_#020202]">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <SectionEyebrow>Market Window</SectionEyebrow>
                            <h2 className="mt-1 text-[17px] font-black uppercase leading-tight text-white">The Fuse Is Lit</h2>
                            <p className="mt-1.5 text-[10px] font-bold leading-relaxed text-zinc-500">
                                Bids arrive across three in-game weeks. Counter one buyer, counter the room, or pull the listing.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleWithdraw}
                            className="shrink-0 rounded-[13px] border border-rose-300/30 bg-rose-300/[0.07] px-3 py-2.5 text-[9px] font-black uppercase leading-tight tracking-[0.08em] text-rose-300"
                        >
                            Cancel<br />Sale
                        </button>
                    </div>

                    {/* fuse track */}
                    <div className="mt-4 px-1.5">
                        <div className="relative h-[5px] rounded-full bg-[#221d15]">
                            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#7c5a10] to-amber-300 transition-all duration-700" style={{ width: `${fusePercent}%` }} />
                            <div
                                className="ssr-spark absolute top-1/2 h-3.5 w-3.5 -ml-[7px] rounded-full transition-all duration-700"
                                style={{
                                    left: `${fusePercent}%`,
                                    background: 'radial-gradient(circle,#fff8dd 15%,#fcd34d 45%,transparent 70%)',
                                    filter: 'drop-shadow(0 0 6px #fcd34d)',
                                }}
                            />
                        </div>
                        <div className="mt-2.5 flex justify-between">
                            {Array.from({ length: windowState.totalWeeks }, (_, index) => {
                                const week = index + 1;
                                const reached = windowState.elapsedWeeks >= week;
                                return (
                                    <div key={week} className="w-[60px] text-center">
                                        <div className={`mx-auto h-2.5 w-2.5 rounded-full border-2 transition-all ${reached ? 'border-amber-300 bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.5)]' : 'border-[#3f3a30] bg-[#292524]'}`} />
                                        <div className={`mt-1 text-[8px] font-black uppercase tracking-[0.1em] ${reached ? 'text-amber-300' : 'text-zinc-700'}`}>
                                            {week === windowState.totalWeeks ? 'Closing' : `Week ${week}`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-3.5 grid grid-cols-3 overflow-hidden rounded-[15px] border border-amber-300/[0.14] bg-black/35">
                        <div className="border-r border-amber-300/10 px-3 py-2.5">
                            <div className="text-[8px] font-black uppercase tracking-[0.1em] text-zinc-700">Window</div>
                            <div className="mt-0.5 font-mono text-[14px] font-black text-amber-200">W{windowState.elapsedWeeks} / {windowState.totalWeeks}</div>
                        </div>
                        <div className="border-r border-amber-300/10 px-3 py-2.5">
                            <div className="text-[8px] font-black uppercase tracking-[0.1em] text-zinc-700">Bids In</div>
                            <div className="mt-0.5 font-mono text-[14px] font-black text-emerald-300">{windowState.availableOffers.length}</div>
                        </div>
                        <div className="px-3 py-2.5">
                            <div className="text-[8px] font-black uppercase tracking-[0.1em] text-zinc-700">Top Bid</div>
                            <div className="mt-0.5 font-mono text-[14px] font-black text-white">{topBid > 0 ? formatMoney(topBid) : '—'}</div>
                        </div>
                    </div>
                </section>

                <SectionEyebrow className="ssr-rise" >Buyer Dossiers</SectionEyebrow>
                <div className="flex flex-col gap-3">
                    {windowState.availableOffers.map(offer => renderDossier(offer))}
                    {windowState.pendingOffers.map(offer => (
                        <div
                            key={offer.id}
                            className={`relative flex items-center gap-3 overflow-hidden rounded-[18px] border-2 border-dashed border-[#3a352c] bg-[#0a0908] px-3.5 py-4 ${offer.availableWeek === windowState.elapsedWeeks + 1 ? 'ssr-env-shake border-amber-300/40' : ''}`}
                        >
                            {/* sealed envelope */}
                            <div className="relative h-[34px] w-[46px] shrink-0 rounded-[6px] border-[1.5px] border-[#3a352c] bg-gradient-to-b from-[#26211a] to-[#17130e]">
                                <div className="absolute -inset-x-px -top-px h-[18px] border-[1.5px] border-t-0 border-[#3a352c] bg-[#201b14]" style={{ clipPath: 'polygon(0 0,50% 100%,100% 0)' }} />
                                <div className="absolute left-1/2 top-[13px] h-[9px] w-[9px] -translate-x-1/2 rounded-full border border-[#6b5a2a] bg-[#4a3b18]" />
                            </div>
                            <div>
                                <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-700">Sealed Bid · Incoming</div>
                                <div className="mt-0.5 text-[12px] font-black uppercase text-[#6b6459]">{formatStudioSaleBuyerType(offer.buyerType)}</div>
                            </div>
                            <div className="absolute -right-[30px] top-3 rotate-[35deg] border-y border-dashed border-amber-300/30 bg-amber-300/[0.12] px-[34px] py-[3px] text-[7px] font-black uppercase tracking-[0.16em] text-amber-300/60">
                                Arrives W{offer.availableWeek}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    /* ============================================================
       SIGNING — the ceremony
       ============================================================ */
    const signingPages = acceptedOffer && activeDeck ? [
        {
            title: 'Purchase Agreement',
            icon: <ReceiptText size={19} />,
            body: (
                <>
                    <p className="text-[12px] font-semibold leading-[1.75] text-[#c9c5bd]">
                        <b className="text-white">{acceptedOffer.buyerName}</b> agrees to acquire <b className="text-white">{liveStudio.name}</b> and
                        all associated banner operations for the negotiated consideration below.
                    </p>
                    <div className="mt-3 flex min-w-0 items-center justify-between gap-2 rounded-[12px] border border-amber-300/[0.15] bg-amber-300/[0.04] px-3 py-2">
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-[0.1em] text-amber-300/60">Final Price</span>
                        <span className="min-w-0 truncate text-right font-mono text-[13px] font-black text-amber-200">{formatMoneyInput(acceptedOffer.amount)}</span>
                    </div>
                    <div className="mt-2 flex min-w-0 items-center justify-between gap-2 rounded-[12px] border border-amber-300/[0.15] bg-amber-300/[0.04] px-3 py-2">
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-[0.1em] text-amber-300/60">Net Cash At Close</span>
                        <span className="min-w-0 truncate text-right font-mono text-[13px] font-black text-amber-200">{formatMoneyInput(acceptedOffer.cashAtClose)}</span>
                    </div>
                    <p className="mt-3.5 text-[8px] font-semibold uppercase leading-[1.7] tracking-[0.04em] text-[#4d483f]">
                        Subject to banker fees, escrow release schedule and the transfer conditions enumerated in documents two through four.
                        Execution of this page binds both parties to the closing calendar.
                    </p>
                </>
            ),
        },
        {
            title: 'Name & Banner Rights',
            icon: <FileSignature size={19} />,
            body: (
                <>
                    <p className="text-[12px] font-semibold leading-[1.75] text-[#c9c5bd]">
                        {formatStudioSaleNameRights(activeDeck.transferTerms.nameRights)}
                    </p>
                    <div className="mt-3 flex min-w-0 items-center justify-between gap-2 rounded-[12px] border border-amber-300/[0.15] bg-amber-300/[0.04] px-3 py-2">
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-[0.1em] text-amber-300/60">Rights Package</span>
                        <span className="min-w-0 truncate text-right font-mono text-[12px] font-black uppercase text-amber-200">{nameOptions.find(option => option.id === activeDeck.transferTerms.nameRights)?.label}</span>
                    </div>
                    <p className="mt-3.5 text-[8px] font-semibold uppercase leading-[1.7] tracking-[0.04em] text-[#4d483f]">
                        Includes trademarks, title cards, idents and marketing marks connected to the banner as of the transfer date.
                    </p>
                </>
            ),
        },
        {
            title: 'IP Transfer Schedule',
            icon: <BookOpen size={19} />,
            body: (
                <>
                    <p className="text-[12px] font-semibold leading-[1.75] text-[#c9c5bd]">
                        {formatStudioSaleCatalogRights(activeDeck.transferTerms.catalogRights)}. Seller credit is {activeDeck.transferTerms.sellerCredit ? 'preserved' : 'not required'} on future public materials.
                    </p>
                    <div className="mt-3 flex min-w-0 items-center justify-between gap-2 rounded-[12px] border border-amber-300/[0.15] bg-amber-300/[0.04] px-3 py-2">
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-[0.1em] text-amber-300/60">Catalog Terms</span>
                        <span className="min-w-0 truncate text-right font-mono text-[12px] font-black uppercase text-amber-200">{catalogOptions.find(option => option.id === activeDeck.transferTerms.catalogRights)?.label}</span>
                    </div>
                    <p className="mt-3.5 text-[8px] font-semibold uppercase leading-[1.7] tracking-[0.04em] text-[#4d483f]">
                        Residual participations already contracted to talent remain attached to their titles after transfer.
                    </p>
                </>
            ),
        },
        {
            title: 'Royalty & Final Seal',
            icon: <Landmark size={19} />,
            body: (
                <>
                    <p className="text-[12px] font-semibold leading-[1.75] text-[#c9c5bd]">
                        {acceptedOffer.royaltyPercent > 0
                            ? <>A backend participation of <b className="text-white">{acceptedOffer.royaltyPercent.toFixed(1)}%</b> of buyer revenue collects weekly for <b className="text-white">{acceptedOffer.royaltyWeeks} weeks</b> after closing, wired directly into your accounts.</>
                            : 'No post-sale royalty participation. This is a clean cash exit.'}
                    </p>
                    {acceptedOffer.royaltyPercent > 0 ? (
                        <div className="mt-3 flex min-w-0 items-center justify-between gap-2 rounded-[12px] border border-amber-300/[0.15] bg-amber-300/[0.04] px-3 py-2">
                            <span className="shrink-0 text-[8px] font-black uppercase tracking-[0.1em] text-amber-300/60">Weekly Stream</span>
                            <span className="min-w-0 truncate text-right font-mono text-[12px] font-black text-amber-200">{acceptedOffer.royaltyPercent.toFixed(1)}% · {acceptedOffer.royaltyWeeks} WKS</span>
                        </div>
                    ) : null}
                    <p className="mt-3.5 text-[8px] font-semibold uppercase leading-[1.7] tracking-[0.04em] text-[#4d483f]">
                        This is the final instrument. Your signature below closes the sale, removes ownership, and releases the banner. There is no undo.
                    </p>
                </>
            ),
        },
    ] : [];

    const renderSigning = () => {
        const page = signingPages[signingPage];
        if (!acceptedOffer || !activeDeck || !page) return null;
        return (
            <div className={`flex h-full flex-col ${shaking ? 'ssr-shake' : ''}`}>
                {/* progress */}
                <div className="flex gap-1.5 px-4 pb-1 pt-3">
                    {signingPages.map((_, index) => (
                        <div key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-[#221d15]">
                            <div className={`h-full origin-left bg-amber-300 transition-transform duration-500 ${index < signingPage || (index === signingPage && buttonReady) ? 'scale-x-100' : 'scale-x-0'}`} />
                        </div>
                    ))}
                </div>
                {/* paper stack */}
                <div className="relative flex-1 overflow-hidden px-4 pt-3">
                    <div className="absolute inset-x-[26px] bottom-[60px] top-[22px] -rotate-[1.6deg] rounded-[18px] border border-[#26221b] bg-[#141210]" />
                    <div className="absolute inset-x-[26px] bottom-[60px] top-[22px] rotate-[1.2deg] rounded-[18px] border border-[#26221b] bg-[#100e0c]" />
                    <div
                        key={signingPage}
                        className={`ssr-paper absolute inset-x-4 bottom-[74px] top-3.5 flex flex-col overflow-hidden rounded-[20px] border border-[#3a342a] shadow-[0_18px_40px_rgba(0,0,0,0.7)] ${docLeaving ? 'ssr-doc-out' : 'ssr-doc-in'}`}
                    >
                        <div className="flex items-center gap-3 border-b border-dashed border-amber-300/[0.18] px-4 py-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border border-amber-300/30 bg-gradient-to-br from-[#2a1b06] to-[#171004] text-amber-200">
                                {page.icon}
                            </div>
                            <div>
                                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-300/60">Document {signingPage + 1} of {signingPages.length}</div>
                                <div className="mt-0.5 text-[17px] font-black uppercase leading-none text-white">{page.title}</div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-4">{page.body}</div>
                        {/* wax seal */}
                        {waxVisible ? (
                            <div className="ssr-wax pointer-events-none absolute bottom-[112px] right-5 h-[74px] w-[74px]">
                                <div
                                    className="flex h-full w-full items-center justify-center rounded-full border-[3px] border-[#7f1d1d]"
                                    style={{
                                        background: 'radial-gradient(circle at 35% 30%,#e5484d,#8c1d22 70%,#6b1216)',
                                        boxShadow: 'inset 0 -3px 8px rgba(0,0,0,.5), inset 0 3px 6px rgba(255,255,255,.18), 0 4px 14px rgba(0,0,0,.6)',
                                    }}
                                >
                                    <span className="font-serif text-[23px] font-black italic text-[#fecaca]" style={{ textShadow: '0 1px 2px rgba(0,0,0,.6)' }}>
                                        {studioInitials(liveStudio.name)}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                        <SignaturePad signed={docSigned} signerName={getSignerName(player)} onComplete={handleSignatureComplete} />
                    </div>
                </div>
                {/* advance */}
                <div className="px-4 pb-5">
                    <button
                        type="button"
                        onClick={advanceDocument}
                        disabled={!buttonReady}
                        className={`ssr-sheen-host flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[17px] border-2 text-[12px] font-black uppercase tracking-[0.1em] transition-colors ${
                            !buttonReady
                                ? 'cursor-not-allowed border-white/[0.07] bg-[#1c1917] text-zinc-600'
                                : signingPage >= 3
                                    ? 'border-emerald-300/40 bg-gradient-to-b from-emerald-200 to-emerald-300 text-black shadow-[0_6px_0_#064e3b] active:translate-y-[3px] active:shadow-[0_3px_0_#064e3b]'
                                    : 'border-amber-300/40 bg-gradient-to-b from-amber-100 to-amber-300 text-black shadow-[0_6px_0_#6b4304] active:translate-y-[3px] active:shadow-[0_3px_0_#6b4304]'
                        }`}
                    >
                        {buttonReady ? <span className="ssr-sheen" /> : null}
                        {!buttonReady ? 'Sign Document To Continue' : signingPage >= 3 ? (
                            <><Gavel size={16} /> Close The Sale</>
                        ) : <><span>Next Document</span><ChevronRight size={16} /></>}
                    </button>
                </div>
            </div>
        );
    };

    /* ============================================================
       SOLD — the gavel finale
       ============================================================ */
    const confetti = React.useMemo(() => {
        if (!soldSummary) return [];
        const colors = ['#fcd34d', '#fde68a', '#6ee7b7', '#7dd3fc', '#f5f0e4', '#c79a1e'];
        return Array.from({ length: 64 }, (_, index) => ({
            left: `${Math.random() * 100}%`,
            background: colors[index % colors.length],
            animationDuration: `${2.6 + Math.random() * 2.8}s`,
            animationDelay: `${0.9 + Math.random() * 1.6}s`,
            borderRadius: index % 3 === 0 ? '50%' : undefined,
        }));
    }, [soldSummary]);

    const renderSold = () => {
        if (!soldSummary) return null;
        return (
            <div
                className="relative flex h-full flex-col items-center justify-center overflow-hidden text-center"
                style={{ background: 'radial-gradient(circle at 50% 24%, #1c1305, #050505 62%)' }}
            >
                <div className="ssr-rays" />
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    {confetti.map((style, index) => <i key={index} className="ssr-conf" style={style} />)}
                </div>
                <div className="relative z-10 w-full max-w-[380px] px-6">
                    <div className="ssr-gavel mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/[0.08] text-amber-200">
                        <Gavel size={38} />
                    </div>
                    <div
                        className="ssr-sold-word mt-1 font-serif text-[64px] font-black italic leading-none"
                        style={{
                            background: 'linear-gradient(180deg,#fff8dd,#fcd34d 55%,#a3701c)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            color: 'transparent',
                            filter: 'drop-shadow(0 4px 18px rgba(252,211,77,.35))',
                        }}
                    >
                        SOLD
                    </div>
                    <div className="ssr-rise mt-2 text-[9px] font-black uppercase tracking-[0.34em] text-amber-300/60" style={{ animationDelay: '1.15s' }}>
                        {soldSummary.studioName} · Final Seal
                    </div>
                    <div className="ssr-rise mt-6" style={{ animationDelay: '1.35s' }}>
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Net Cash Wired To You</div>
                        <div className="mt-1.5 font-mono text-[34px] font-black text-emerald-300" style={{ textShadow: '0 0 30px rgba(110,231,183,.3)' }}>
                            <CountMoney value={soldSummary.cashAtClose} delay={1450} duration={1600} full />
                        </div>
                    </div>
                    <div className="mt-5 flex flex-col gap-2">
                        {[
                            { label: 'Buyer', value: soldSummary.buyerName, tone: 'text-white', delay: '1.7s' },
                            { label: 'Final Price', value: formatMoneyInput(soldSummary.amount), tone: 'text-amber-200', delay: '1.9s' },
                            {
                                label: 'Royalty Stream',
                                value: soldSummary.royaltyPercent > 0 ? `${soldSummary.royaltyPercent.toFixed(1)}% · ${soldSummary.royaltyWeeks} weeks` : 'Clean cash exit',
                                tone: 'text-violet-200',
                                delay: '2.1s',
                            },
                            { label: 'Banner Transfer', value: soldSummary.nameRights, tone: 'text-sky-200', delay: '2.3s' },
                        ].map(line => (
                            <div
                                key={line.label}
                                className="ssr-sold-line flex items-center justify-between rounded-[14px] border border-white/[0.08] bg-black/45 px-3.5 py-2.5 text-left"
                                style={{ animationDelay: line.delay }}
                            >
                                <span className="text-[9px] font-black uppercase tracking-[0.08em] text-zinc-500">{line.label}</span>
                                <span className={`max-w-[60%] truncate font-mono text-[12px] font-black ${line.tone}`}>{line.value}</span>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={handleLeaveSoldScreen}
                        className="ssr-rise ssr-sheen-host mt-6 flex min-h-[54px] w-full items-center justify-center rounded-[17px] border-2 border-emerald-300/40 bg-gradient-to-b from-emerald-200 to-emerald-300 text-[12px] font-black uppercase tracking-[0.1em] text-black shadow-[0_6px_0_#064e3b] active:translate-y-[3px] active:shadow-[0_3px_0_#064e3b]"
                        style={{ animationDelay: '2.6s' }}
                    >
                        <span className="ssr-sheen" />
                        Return To Your Empire
                    </button>
                </div>
            </div>
        );
    };

    /* ============================================================
       SHELL
       ============================================================ */
    const phase: 'sold' | 'signing' | 'offers' | 'setup' = soldSummary
        ? 'sold'
        : activeDeck?.status === 'SIGNING' ? 'signing'
        : activeDeck ? 'offers'
        : 'setup';

    return (
        <div className="ssr-screen-in fixed inset-0 z-[90] flex flex-col bg-[#050505] text-white">
            <SaleRoomStyles />
            {phase === 'sold' ? renderSold() : (
                <>
                    <header className="relative shrink-0 overflow-hidden border-b border-[#29251f] bg-[#0c0a08] px-4 pb-4 pt-12">
                        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
                        {phase === 'setup' ? (
                            <div className="ssr-lot absolute right-3.5 top-11 rotate-3 rounded-[12px] border-2 border-amber-300/35 bg-gradient-to-br from-[#241a08] to-[#120d05] px-3 py-2 text-center shadow-[0_4px_0_#020202,inset_0_1px_0_rgba(252,211,77,0.15)]">
                                <div className="text-[7px] font-black uppercase tracking-[0.22em] text-amber-300/60">Lot No.</div>
                                <div className="font-mono text-[17px] font-black text-amber-300">001</div>
                            </div>
                        ) : null}
                        <div className="relative flex items-start gap-3">
                            <button
                                type="button"
                                onClick={onBack}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border-2 border-[#342c20] bg-[#15110c] text-zinc-400 shadow-[0_4px_0_#020202] active:translate-y-0.5 active:shadow-[0_2px_0_#020202]"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div className="min-w-0 flex-1">
                                <div className="text-[7px] font-black uppercase tracking-[0.27em] text-amber-300">
                                    {phase === 'signing' ? 'Closing Ceremony' : 'Studio Sale Room'}
                                </div>
                                <h1 className={`mt-1 truncate font-serif text-2xl font-black uppercase italic tracking-tight ${phase === 'setup' ? 'pr-[70px] text-[21px]' : ''}`}>
                                    {phase === 'signing' ? 'The Signing Table' : liveStudio.name}
                                </h1>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    {phase === 'signing' && acceptedOffer ? (
                                        <span className="rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.14em] text-amber-200">
                                            {acceptedOffer.buyerName} · {formatMoney(acceptedOffer.amount)}
                                        </span>
                                    ) : phase === 'offers' && activeDeck ? (
                                        <>
                                            <span className="flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-300/[0.08] px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.14em] text-emerald-300">
                                                <span className="ssr-blink h-[5px] w-[5px] rounded-full bg-emerald-300" />
                                                Live On Market
                                            </span>
                                            <span className="rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.14em] text-amber-200">
                                                Ask {formatMoney(activeDeck.askPrice)}
                                            </span>
                                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.14em] text-zinc-400">
                                                Floor {formatMoney(activeDeck.minimumPrice)}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.14em] text-zinc-400">
                                            Setup
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    {phase === 'signing' ? (
                        <div className="flex-1 overflow-hidden">
                            {renderSigning()}
                            {feedback ? (
                                <div className="absolute inset-x-4 bottom-20 z-20 rounded-[14px] border border-amber-300/35 bg-[#1c1608] px-4 py-2 text-center text-[10px] font-black uppercase leading-snug text-amber-200 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
                                    {feedback}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <main className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-4 pb-28 pt-4">
                            <div className="mx-auto max-w-3xl space-y-4">
                                {phase === 'offers' ? renderOffers() : renderSetup()}
                                {feedback ? (
                                    <div className="rounded-[14px] border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2 text-[11px] font-black uppercase text-amber-200">
                                        {feedback}
                                    </div>
                                ) : null}
                            </div>
                        </main>
                    )}
                </>
            )}
        </div>
    );
};
