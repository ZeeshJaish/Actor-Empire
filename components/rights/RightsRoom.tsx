/**
 * #316: the Production House's rights, in the order a producer thinks of them. Zeesh, 2026-11-07: "Hume right office ke pages redesign karna
 * hai kiu ki wo page ka flow and hi mujhe pasand nahi". One room: what needs you, what is out there earning, what is on your shelf. A title
 * opens one sheet. Selling is picking: one goes to the Rights Floor, two or more go in together.
 */
import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import type { Player, StreamingBiddingSession, StreamingOfferVersion, StreamingRightsDurationPreference, StreamingRightsExclusivityPolicy, StreamingRightsRenewalPreference, StreamingRightsStudioMandate } from '../../types';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { PHASE_ONE_ENERGY_COSTS } from '../../services/energyCosts';
import { upsertStreamingBiddingSession } from '../../services/streamingBidding';
import { resolveStreamingRightsRenewal, updateStreamingRightsStudioMandate, type StreamingRightsCalendarItem } from '../../services/streamingRightsCalendar';
import { getStreamingStudioCommercialStatement } from '../../services/streamingRightsOffice';
import { resolveStreamingPlatformBrandById } from '../../services/streamingPlatformBrandRegistry';
import { getStreamingTitlePlacement } from '../../services/streamingTitlePlacement';
import {
    estimateRightsPackage,
    getRightsPartners,
    getRightsReasonWords,
    getRightsRoom,
    getRightsTitleFigures,
    getRightsTitleSheet,
    leaveRightsPackageRoom,
    openRightsPackageRoom,
    signRightsPackage,
    type RightsRoomTitle,
} from '../../services/rightsRoom';
import { OriginalPoster } from '../originals/OriginalsDesk';
import { StreamingWarRoomStep } from '../../views/lifestyle/business/release-strategy-transplant/StreamingWarRoomStep';
import { runTaskAd } from '../../services/forcedAds';

const GOLD = '#e7b64a';
const MOST_IN_A_PACKAGE = 12;

const money = (value: number): string => {
    const amount = Math.max(0, Number(value) || 0);
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
    return `$${Math.round(amount)}`;
};

const words = (value: string): string => value.toLowerCase().replaceAll('_', ' ').replace(/^./, first => first.toUpperCase());

type Screen =
    | { name: 'ROOM' }
    | { name: 'TITLE'; projectId: string }
    | { name: 'SELL' }
    | { name: 'TEAM' }
    | { name: 'PARTNERS'; focus?: string }
    | { name: 'MONEY' };

interface Moment { stamp: string; title: string; amount: number; line: string; color: string }

/* a service's own colour can be almost white (Apple TV+) or very bright (Hulu), and the words on it have to stay readable */
const wordsOn = (color: string): string => {
    const hex = String(color || '').replace('#', '');
    const full = hex.length === 3 ? hex.split('').map(digit => digit + digit).join('') : hex;
    const [r, g, b] = [0, 2, 4].map(start => parseInt(full.slice(start, start + 2), 16) / 255);
    if ([r, g, b].some(Number.isNaN)) return '#fff';
    const lit = (value: number) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lit(r) + 0.7152 * lit(g) + 0.0722 * lit(b) > 0.35 ? '#000' : '#fff';
};

interface RightsRoomProps {
    player: Player;
    studioId: string;
    onUpdatePlayer: (player: Player) => void;
    onClose: () => void;
    onSellTitle: (projectId: string) => void;
    onOpenFilm: (projectId: string) => void;
}

const Top: React.FC<{ eyebrow: string; title: string; onBack: () => void; right?: React.ReactNode }> = ({ eyebrow, title, onBack, right }) => (
    <header className="grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 pb-2.5 pt-[max(18px,calc(10px+env(safe-area-inset-top)))]">
        <button type="button" onClick={onBack} aria-label="Back" className="grid h-11 w-11 place-items-center rounded-[13px] border border-white/10 bg-white/[0.04] text-zinc-300 active:scale-95"><ArrowLeft size={18} /></button>
        <div className="min-w-0">
            <p className="text-[9px] font-black uppercase leading-tight tracking-[0.16em]" style={{ color: GOLD }}>{eyebrow}</p>
            <h1 className="mt-0.5 text-[22px] font-black leading-[1.1] text-white">{title}</h1>
        </div>
        {right || <span />}
    </header>
);

const Stat: React.FC<{ label: string; value: string; color?: string; data?: string }> = ({ label, value, color, data }) => (
    <div className="min-w-0 rounded-[14px] border border-white/[0.07] bg-[#15130f] px-2 py-2.5" data-rights-stat={data}>
        <span className="block whitespace-nowrap text-[8px] font-black uppercase leading-tight tracking-[0.05em] text-zinc-500">{label}</span>
        <b className="mt-1 block font-mono text-[clamp(14px,4.6vw,19px)] font-extrabold leading-[1.1]" style={{ color: color || '#fff' }}>{value}</b>
    </div>
);

const SectionHead: React.FC<{ title: string; right?: React.ReactNode; alert?: boolean }> = ({ title, right, alert }) => (
    <div className="mx-4 mb-2 mt-4 flex items-baseline justify-between gap-3">
        <h2 className={`text-[14px] font-black ${alert ? 'text-[#ff8a94]' : 'text-white'}`}>{title}</h2>
        {right && <span className="shrink-0 text-[10px] font-extrabold text-zinc-500">{right}</span>}
    </div>
);

const Answers: React.FC<{ canRenew: boolean; onRenew: () => void; onLetGo: () => void; onShop: () => void; renewLabel?: string }> = ({ canRenew, onRenew, onLetGo, onShop, renewLabel = 'Renew' }) => (
    <>
        <div className={`mt-2.5 grid gap-2 ${canRenew ? 'grid-cols-[1.5fr_1fr]' : 'grid-cols-1'}`}>
            {canRenew && <button type="button" data-rights-renew onClick={onRenew} className="h-11 rounded-xl text-[12px] font-black text-[#14110a] active:scale-[0.98]" style={{ background: GOLD }}>{renewLabel}</button>}
            <button type="button" data-rights-let-go onClick={onLetGo} className="h-11 rounded-xl border border-white/10 bg-white/[0.05] text-[12px] font-black text-zinc-200 active:scale-[0.98]">Let it go</button>
        </div>
        <button type="button" data-rights-shop onClick={onShop} className="mt-1 flex h-9 w-full items-center justify-center gap-1 text-[10.5px] font-extrabold text-zinc-400 active:text-white">Shop it around instead <ChevronRight size={12} /></button>
    </>
);

const WaitingCard: React.FC<{ item: StreamingRightsCalendarItem; week: number; position: string; onAnswer: (item: StreamingRightsCalendarItem, action: 'ACCEPT_RENEWAL' | 'RETURN_TO_MARKET' | 'LET_EXPIRE') => void; onOpen: () => void }> = ({ item, week, position, onAnswer, onOpen }) => {
    const economics = item.offerDisposition === 'OFFERED' ? item.proposedEconomics : null;
    const left = Math.max(0, item.sourceExpiresAtAbsoluteWeek - week);
    return (
        <section>
            <SectionHead title="Waiting for you" alert right={position} />
            <motion.article key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} data-rights-waiting={item.id} className="mx-4 rounded-[18px] border bg-gradient-to-br from-[#241c0d] to-[#14110b] p-3" style={{ borderColor: `${GOLD}55` }}>
                <button type="button" onClick={onOpen} className="grid w-full grid-cols-[62px_1fr] gap-3 text-left">
                    <OriginalPoster title={item.title} small className="h-[84px] rounded-[9px]" />
                    <span className="min-w-0">
                        <span className="block text-[15px] font-black leading-tight text-white">{item.title}</span>
                        <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-zinc-400">
                            {economics ? `${item.incumbentBuyer.name} wants it for ${economics.durationWeeks} more weeks.` : `${item.incumbentBuyer.name} has made no offer.`} {left > 0 ? `Ends in ${left} ${left === 1 ? 'week' : 'weeks'}.` : 'Ends this week.'}
                        </span>
                        {economics && <span className="mt-1 block font-mono text-[22px] font-extrabold leading-none text-[#f2cf7c]">{money(economics.minimumGuarantee)}</span>}
                        {getRightsReasonWords(item.protectionReasons) && <span className="mt-1 block text-[10px] font-bold leading-snug text-zinc-500">{getRightsReasonWords(item.protectionReasons)}</span>}
                    </span>
                </button>
                <Answers canRenew={Boolean(economics)} onRenew={() => onAnswer(item, 'ACCEPT_RENEWAL')} onLetGo={() => onAnswer(item, 'LET_EXPIRE')} onShop={() => onAnswer(item, 'RETURN_TO_MARKET')} />
            </motion.article>
        </section>
    );
};

const ServiceTile: React.FC<{ title: RightsRoomTitle; onOpen: () => void }> = ({ title, onOpen }) => (
    <button type="button" data-rights-on-service={title.projectId} onClick={onOpen} className="relative h-[150px] w-[104px] shrink-0 overflow-hidden rounded-xl border-2 text-left active:scale-[0.98]" style={{ borderColor: title.buyerColor, boxShadow: `0 0 12px ${title.buyerColor}44` }}>
        <OriginalPoster title={title.title} className="absolute inset-0" />
        <span className="absolute inset-x-0 top-0 z-10 px-1 py-[3px] text-center text-[8px] font-black uppercase leading-tight tracking-[0.05em]" style={{ background: title.buyerColor, color: wordsOn(title.buyerColor) }}>{title.buyerName}</span>
        <span className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/80 to-transparent px-[7px] pb-[7px] pt-5">
            <span className="block text-[11px] font-black leading-[1.1] text-white">{title.title}</span>
            <span className="mt-[3px] block text-[9px] font-extrabold text-zinc-300">{title.weeksLeft === null ? (title.onYourService ? 'Yours' : 'For good') : title.weeksLeft === 0 ? 'Ends this week' : `${title.weeksLeft}w left`}</span>
            {title.weeksLeft !== null && <span className="mt-1 block h-[3px] overflow-hidden rounded-sm bg-white/15"><span className="block h-full bg-white" style={{ width: `${Math.round((1 - title.used) * 100)}%` }} /></span>}
        </span>
    </button>
);

const ShelfTile: React.FC<{ title: RightsRoomTitle; picked: boolean; onTap: () => void; delay?: number }> = ({ title, picked, onTap, delay = 0 }) => (
    <motion.button type="button" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} data-rights-free={title.projectId} data-picked={picked ? 'yes' : 'no'} onClick={onTap} aria-pressed={picked} aria-label={`${title.title}, ${picked ? 'picked' : 'not picked'}`} className="relative h-[124px] min-w-0 overflow-hidden rounded-xl border text-left transition active:scale-[0.97]" style={picked ? { borderColor: GOLD, borderWidth: 2, boxShadow: `0 0 14px ${GOLD}55` } : { borderColor: 'rgba(255,255,255,.08)' }}>
        <OriginalPoster title={title.title} className="absolute inset-0" />
        <span className="absolute right-1.5 top-1.5 z-10 grid h-[22px] w-[22px] place-items-center rounded-full border-2 text-[#14110a]" style={picked ? { background: GOLD, borderColor: GOLD } : { borderColor: 'rgba(255,255,255,.62)', background: 'rgba(0,0,0,.4)' }}>{picked && <Check size={13} strokeWidth={4} />}</span>
        <span className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/80 to-transparent px-[7px] pb-1.5 pt-[18px]">
            <span className="block text-[11px] font-black leading-[1.1] text-white">{title.title}</span>
            <span className="mt-[3px] block text-[9px] font-extrabold text-zinc-300">★ {title.rating.toFixed(1)}</span>
        </span>
    </motion.button>
);

const Chip: React.FC<{ on: boolean; onTap: () => void; children: React.ReactNode; data?: string }> = ({ on, onTap, children, data }) => (
    <button type="button" data-rights-chip={data} aria-pressed={on} onClick={onTap} className={`min-h-10 rounded-[11px] border px-3 py-2 text-[11.5px] leading-tight transition active:scale-95 ${on ? 'font-black text-[#14110a]' : 'border-white/10 bg-white/[0.04] font-extrabold text-zinc-300'}`} style={on ? { background: GOLD, borderColor: GOLD } : undefined}>{children}</button>
);

const AIMS: Array<{ id: StreamingRightsRenewalPreference; label: string; says: string }> = [
    { id: 'BALANCED', label: 'Balanced', says: 'Renews anything that is not weak. Weak titles end.' },
    { id: 'RENEW_WINNERS', label: 'Winners only', says: 'Renews only what is doing well. The rest end, or go back on the market if rivals want them.' },
    { id: 'UPFRONT_SECURITY', label: 'Cash now', says: 'Gives up 2 points of its share on each deal for the money up front.' },
    { id: 'BACKEND_UPSIDE', label: 'More share later', says: 'Asks for 3 more points of what the title earns.' },
    { id: 'RELATIONSHIP_FIRST', label: 'Good partners', says: 'Keeps partners happy, even on a soft title. Your closest partners ask you.' },
    { id: 'RETEST_MARKET', label: 'Test the market', says: 'Sends every title back on the market when its deal ends.' },
];
const LENGTHS: Array<{ id: StreamingRightsDurationPreference; label: string; says: string }> = [
    { id: 'SHORT', label: 'Short', says: 'Half as long, less money. The title comes back sooner.' },
    { id: 'BALANCED', label: 'As offered', says: 'Whatever length the service offers.' },
    { id: 'LONG', label: 'Long', says: 'Half as long again, more money, less per week.' },
];
const EXCLUSIVES: Array<{ id: StreamingRightsExclusivityPolicy; label: string; says: string }> = [
    { id: 'ALLOW_WITHIN_LIMITS', label: 'May renew', says: 'The team treats them like any other title.' },
    { id: 'REQUIRE_APPROVAL', label: 'Ask me', says: 'Every exclusive renewal comes to you first.' },
    { id: 'RESTRICT', label: 'Never', says: 'They go back on the market when the deal ends.' },
];
const LIMITS = [50_000_000, 100_000_000, 150_000_000, 250_000_000];

export const TeamScreen: React.FC<{ mandate: StreamingRightsStudioMandate; onPatch: (patch: Partial<StreamingRightsStudioMandate>) => void; onBack: () => void }> = ({ mandate, onPatch, onBack }) => {
    const teamRenews = mandate.controlMode !== 'FULL';
    const label = 'mx-4 mb-1.5 mt-3.5 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500';
    const says = 'mx-4 mt-1.5 text-[10.5px] font-semibold leading-snug text-zinc-500';
    return (
        <div className="flex h-full flex-col" data-rights-team>
            <Top eyebrow="Rights team" title="Who decides" onBack={onBack} />
            <div className="min-h-0 flex-1 overflow-y-auto pb-[max(24px,env(safe-area-inset-bottom))]">
                <div className="mx-4 grid grid-cols-2 gap-2">
                    {([['CUSTOM', 'Team renews', 'It takes fair offers on what you sold. You only see what you protect below.', teamRenews], ['FULL', 'I decide', 'Every renewal waits for you. No answer, and the licence ends.', !teamRenews]] as const).map(([mode, name, line, on]) => (
                        <button key={mode} type="button" data-rights-mode={mode} aria-pressed={on} onClick={() => onPatch({ controlMode: mode })} className={`min-h-[104px] rounded-2xl p-3 text-left transition active:scale-[0.98] ${on ? 'border-2 bg-[#241c0d]' : 'border border-white/[0.08] bg-[#15130f]'}`} style={on ? { borderColor: GOLD } : undefined}>
                            <b className="block text-[14px] font-black text-white">{name}</b>
                            <small className="mt-1 block text-[10.5px] font-semibold leading-snug text-zinc-400">{line}</small>
                        </button>
                    ))}
                </div>
                <p className={label}>What the team aims for</p>
                <div className="mx-4 flex flex-wrap gap-1.5">{AIMS.map(aim => <Chip key={aim.id} data={aim.id} on={mandate.renewalPreference === aim.id} onTap={() => onPatch({ renewalPreference: aim.id })}>{aim.label}</Chip>)}</div>
                <p className={says}>{AIMS.find(aim => aim.id === mandate.renewalPreference)?.says}</p>
                <p className={label}>How long</p>
                <div className="mx-4 flex flex-wrap gap-1.5">{LENGTHS.map(item => <Chip key={item.id} data={`LENGTH_${item.id}`} on={mandate.durationPreference === item.id} onTap={() => onPatch({ durationPreference: item.id })}>{item.label}</Chip>)}</div>
                <p className={says}>{LENGTHS.find(item => item.id === mandate.durationPreference)?.says}</p>
                <p className={label}>Exclusive titles</p>
                <div className="mx-4 flex flex-wrap gap-1.5">{EXCLUSIVES.map(item => <Chip key={item.id} data={item.id} on={mandate.exclusivityPolicy === item.id} onTap={() => onPatch({ exclusivityPolicy: item.id })}>{item.label}</Chip>)}</div>
                <p className={says}>{EXCLUSIVES.find(item => item.id === mandate.exclusivityPolicy)?.says}</p>
                <p className={label}>Ask me above</p>
                <div className="mx-4 flex flex-wrap gap-1.5">{LIMITS.map(limit => <Chip key={limit} data={`LIMIT_${limit}`} on={mandate.maximumAutomaticGuarantee === limit} onTap={() => onPatch({ maximumAutomaticGuarantee: limit })}>{money(limit)}</Chip>)}</div>
                <p className={says}>The team signs up to this much on its own. Anything bigger comes to you.</p>
                <p className={label}>Always comes to you</p>
                <div className="mx-4 flex flex-wrap gap-1.5">
                    <Chip data="FRANCHISES" on={mandate.protectFranchises} onTap={() => onPatch({ protectFranchises: !mandate.protectFranchises })}>Franchises</Chip>
                    <Chip data="WORLDWIDE" on={mandate.protectGlobalExclusives} onTap={() => onPatch({ protectGlobalExclusives: !mandate.protectGlobalExclusives })}>Worldwide exclusives</Chip>
                </div>
            </div>
        </div>
    );
};

const TIER_WORDS: Record<string, string> = { TRUSTED_PARTNER: 'Trusted partner', PREFERRED: 'Good partner', WORKING: 'Working together', STRAINED: 'Strained' };
const TREND_WORDS: Record<string, string> = { IMPROVING: 'getting better', STABLE: 'steady', DECLINING: 'getting worse' };

export const PartnersScreen: React.FC<{ player: Player; studioId: string; focus?: string; onBack: () => void }> = ({ player, studioId, focus, onBack }) => {
    const partners = useMemo(() => getRightsPartners(player, studioId), [player, studioId]);
    return (
        <div className="flex h-full flex-col" data-rights-partners>
            <Top eyebrow="Who you deal with" title="Partners" onBack={onBack} />
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
                {partners.map(partner => (
                    <article key={partner.platformId} data-rights-partner={partner.platformId} className="rounded-2xl border bg-[#15130f] p-3" style={{ borderColor: partner.platformId === focus ? partner.color : 'rgba(255,255,255,.07)' }}>
                        <div className="flex items-baseline justify-between gap-3">
                            <h3 className="min-w-0 text-[15px] font-black text-white">{partner.name}</h3>
                            <b className="shrink-0 font-mono text-[15px] font-extrabold text-[#7ce3a8]">{money(partner.paid)}</b>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><i className="block h-full rounded-full" style={{ width: `${Math.max(3, Math.min(100, partner.score))}%`, background: partner.color }} /></div>
                        <p className="mt-1.5 text-[11px] font-bold text-zinc-300">{TIER_WORDS[partner.tier] || words(partner.tier)}, {TREND_WORDS[partner.trend] || words(partner.trend)}</p>
                        <p className="mt-0.5 text-[10.5px] font-semibold leading-snug text-zinc-500">{partner.deals} {partner.deals === 1 ? 'deal' : 'deals'} · {partner.renewals} {partner.renewals === 1 ? 'renewal' : 'renewals'}{partner.madeForThem ? ` · ${partner.madeForThem} made for them` : ''}{partner.turnedDown ? ` · you turned down ${partner.turnedDown}` : ''}</p>
                    </article>
                ))}
                {!partners.length && <p className="pt-10 text-center text-[12px] font-semibold text-zinc-500">No deals with anyone yet. Sell a title and your first partner shows up here.</p>}
            </div>
        </div>
    );
};

export const MoneyScreen: React.FC<{ player: Player; studioId: string; yearIncome: number; onBack: () => void }> = ({ player, studioId, yearIncome, onBack }) => {
    const statement = useMemo(() => getStreamingStudioCommercialStatement(player, studioId), [player, studioId]);
    const row = (name: string, value: number, line?: string) => (
        <div key={name} className="flex items-baseline justify-between gap-3 border-t border-white/[0.06] py-2.5 first:border-t-0">
            <span className="min-w-0 text-[12px] font-bold leading-snug text-zinc-300">{name}{line && <small className="mt-0.5 block text-[10px] font-semibold text-zinc-500">{line}</small>}</span>
            <b className="shrink-0 font-mono text-[14px] font-extrabold text-white">{money(value)}</b>
        </div>
    );
    return (
        <div className="flex h-full flex-col" data-rights-money>
            <Top eyebrow="What rights have paid" title="Money" onBack={onBack} />
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
                <div className="grid grid-cols-2 gap-2">
                    <Stat label="This year" value={money(yearIncome)} color="#7ce3a8" />
                    <Stat label="All time" value={money(statement.cashIncome)} color="#f2cf7c" />
                </div>
                <p className="mb-1 mt-4 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Into your studio</p>
                <section className="rounded-2xl border border-white/[0.07] bg-[#15130f] px-3">
                    {row('Deals signed', statement.licensingGuarantees)}
                    {row('Your share of what they earned', statement.backendPaid)}
                    {row('Fees for making their shows', statement.producerFeesPaid)}
                    {row('Licences resold', statement.downstreamTransferProceeds)}
                </section>
                <p className="mb-1 mt-4 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Not yours to spend</p>
                <section className="rounded-2xl border border-white/[0.07] bg-[#15130f] px-3">
                    {row('Their money for making it', statement.platformFundedProductionBudgets, 'Goes into the production')}
                    {row('Held for later seasons', statement.lockedFutureSeasonFunding, 'Comes when those seasons are made')}
                </section>
            </div>
        </div>
    );
};

export default function RightsRoom({ player, studioId, onUpdatePlayer, onClose, onSellTitle, onOpenFilm }: RightsRoomProps) {
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const studioName = player.businesses.find(business => business.id === studioId)?.name || 'Your studio';
    const view = useMemo(() => getRightsRoom(player, studioId), [player, studioId]);
    const [stack, setStack] = useState<Screen[]>([{ name: 'ROOM' }]);
    const [note, setNote] = useState('');
    const screen = stack[stack.length - 1];
    const go = (next: Screen) => { setNote(''); setStack(current => [...current, next]); };
    const back = () => { setNote(''); if (stack.length > 1) setStack(current => current.slice(0, -1)); else onClose(); };
    const [picked, setPicked] = useState<string[]>([]);
    const [durationWeeks, setDurationWeeks] = useState(104);
    const [exclusive, setExclusive] = useState(true);
    const [newestFirst, setNewestFirst] = useState(false);
    const [moment, setMoment] = useState<Moment | null>(null);
    const [room, setRoom] = useState<StreamingBiddingSession | null>(null);
    const dealEnergy = PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT;

    const showMoment = (next: Moment) => {
        setMoment(next);
        window.setTimeout(() => setMoment(current => (current === next ? null : current)), 2200);
    };

    const answer = (item: StreamingRightsCalendarItem, action: 'ACCEPT_RENEWAL' | 'RETURN_TO_MARKET' | 'LET_EXPIRE') => {
        const result = resolveStreamingRightsRenewal(player, { caseId: item.id, action, absoluteWeek: week });
        if (!result.changed) {
            setNote(result.detail || 'This decision is no longer open.');
            return;
        }
        onUpdatePlayer(result.player);
        const left = Math.max(0, item.sourceExpiresAtAbsoluteWeek - week);
        if (action === 'ACCEPT_RENEWAL') {
            setNote('');
            showMoment({ stamp: 'RENEWED', title: item.title, amount: item.proposedEconomics?.minimumGuarantee || 0, line: `${item.incumbentBuyer.name} · ${item.proposedEconomics?.durationWeeks || 0} weeks`, color: resolveStreamingPlatformBrandById(item.incumbentBuyer.platformId || item.incumbentBuyer.id, item.incumbentBuyer.name).primaryColor });
        } else {
            setNote(action === 'LET_EXPIRE' ? `${item.title} ends in ${left} ${left === 1 ? 'week' : 'weeks'}, then it comes back to you.` : `${item.title} goes back on the market in ${left} ${left === 1 ? 'week' : 'weeks'}.`);
        }
    };

    const answerTitle = (caseId: string, action: 'ACCEPT_RENEWAL' | 'RETURN_TO_MARKET' | 'LET_EXPIRE') => {
        const item = Object.values(player.world.streamingRightsCalendar?.renewalCases || {}).find(candidate => candidate.id === caseId);
        if (item) answer({ ...item, weeksRemaining: Math.max(0, item.sourceExpiresAtAbsoluteWeek - week) }, action);
    };

    const togglePick = (projectId: string) => {
        setNote('');
        setPicked(current => {
            if (current.includes(projectId)) return current.filter(id => id !== projectId);
            if (current.length >= MOST_IN_A_PACKAGE) { setNote(`${MOST_IN_A_PACKAGE} titles is the most one room can take.`); return current; }
            return [...current, projectId];
        });
    };

    const sell = () => {
        if (picked.length === 1) { onSellTitle(picked[0]); return; }
        const opened = openRightsPackageRoom(player, { studioId, projectIds: picked, durationWeeks, exclusivity: exclusive ? 'EXCLUSIVE' : 'NON_EXCLUSIVE' });
        if (!opened.session) { setNote(opened.message || 'The room could not open.'); return; }
        onUpdatePlayer(opened.player);
        setRoom(opened.session);
    };

    const roomUpdate = (next: StreamingBiddingSession) => {
        setRoom(next);
        onUpdatePlayer({ ...player, world: { ...player.world, streamingBiddingSessions: upsertStreamingBiddingSession(player.world.streamingBiddingSessions, next) } });
    };

    const takeOffer = (offer: StreamingOfferVersion, session: StreamingBiddingSession) => {
        const signed = signRightsPackage(player, session, offer);
        if (!signed.signed) { setNote(signed.message); return; }
        onUpdatePlayer(signed.player);
        setRoom(null);
        setPicked([]);
        setStack([{ name: 'ROOM' }]);
        setNote('');
        // the sale is saved; the break (if loaded and allowed) comes before the SOLD moment
        void runTaskAd('RIGHTS_SOLD').finally(() => showMoment({ stamp: 'SOLD', title: `${signed.titles} titles`, amount: signed.total, line: `${offer.platformName} · ${offer.exclusivity === 'EXCLUSIVE' ? 'exclusive' : 'shared'} · ${offer.durationWeeks} weeks`, color: resolveStreamingPlatformBrandById(offer.platformId, offer.platformName).primaryColor }));
    };

    if (room) return (
        <div className="fixed inset-0 z-[70] bg-black" data-rights-package-room>
            <StreamingWarRoomStep
                film={{ title: room.title, art: 'drama', hue: 40, tagline: '' }}
                session={room}
                marketPlatforms={[]}
                canAccept={player.energy.current >= dealEnergy}
                energyCost={dealEnergy}
                onStart={() => undefined}
                onSessionChange={roomUpdate}
                onAccept={takeOffer}
                onFinish={() => setRoom(null)}
                onContinue={() => setRoom(null)}
                onLeave={() => { onUpdatePlayer(leaveRightsPackageRoom(player, room)); setRoom(null); setPicked([]); }}
                onBack={() => setRoom(null)}
            />
        </div>
    );

    const noteLine = note ? <p role="status" data-rights-note className="mx-4 mt-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-bold leading-snug text-zinc-200">{note}</p> : null;

    const body = (() => {
        if (screen.name === 'TEAM') return <TeamScreen mandate={view.mandate} onBack={back} onPatch={patch => onUpdatePlayer(updateStreamingRightsStudioMandate(player, { studioId, absoluteWeek: week, patch }))} />;
        if (screen.name === 'PARTNERS') return <PartnersScreen player={player} studioId={studioId} focus={screen.focus} onBack={back} />;
        if (screen.name === 'MONEY') return <MoneyScreen player={player} studioId={studioId} yearIncome={view.yearIncome} onBack={back} />;

        if (screen.name === 'TITLE') {
            const sheet = getRightsTitleSheet(player, studioId, screen.projectId);
            if (!sheet) {
                /* on the player's own service: no contract to read */
                const placement = getStreamingTitlePlacement(player, screen.projectId);
                const name = view.onServices.find(title => title.projectId === screen.projectId)?.title || view.freeToSell.find(title => title.projectId === screen.projectId)?.title || 'This title';
                return (
                    <div className="flex h-full flex-col" data-rights-title-sheet={screen.projectId}>
                        <div className="relative h-[196px] shrink-0">
                            <OriginalPoster title={name} className="absolute inset-0" />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-[#0b0a08]" />
                            <button type="button" onClick={back} aria-label="Back" className="absolute left-4 top-[max(16px,calc(10px+env(safe-area-inset-top)))] z-10 grid h-11 w-11 place-items-center rounded-[13px] border border-white/15 bg-black/40 text-zinc-200 active:scale-95"><ArrowLeft size={18} /></button>
                            <h2 className="absolute inset-x-4 bottom-2 z-10 font-serif text-[28px] font-extrabold italic leading-[1.05] text-white">{name}</h2>
                        </div>
                        <div className="mx-4 mt-3 rounded-[18px] border bg-gradient-to-br from-[#241c0d] to-[#14110b] p-3" style={{ borderColor: `${GOLD}55` }}>
                            <p className="text-[15px] font-black leading-tight text-white">{placement.line}</p>
                            {placement.whyNotSellOutside && <p className="mt-1 text-[11px] font-semibold leading-snug text-zinc-400">{placement.whyNotSellOutside}</p>}
                        </div>
                        <div className="mt-auto p-4 pb-[max(16px,env(safe-area-inset-bottom))]"><button type="button" data-rights-open-film onClick={() => onOpenFilm(screen.projectId)} className="h-12 w-full rounded-[13px] border border-white/[0.08] bg-[#15130f] text-[12px] font-black text-zinc-200 active:scale-[0.98]">Open the title</button></div>
                    </div>
                );
            }
            return (
                <div className="flex h-full flex-col" data-rights-title-sheet={sheet.projectId}>
                    <div className="min-h-0 flex-1 overflow-y-auto pb-3">
                        <div className="relative h-[196px]">
                            <OriginalPoster title={sheet.title} className="absolute inset-0" />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-[#0b0a08]" />
                            <button type="button" onClick={back} aria-label="Back" className="absolute left-4 top-[max(16px,calc(10px+env(safe-area-inset-top)))] z-10 grid h-11 w-11 place-items-center rounded-[13px] border border-white/15 bg-black/40 text-zinc-200 active:scale-95"><ArrowLeft size={18} /></button>
                            <div className="absolute left-[68px] right-4 top-[max(26px,calc(env(safe-area-inset-top)+10px))] z-10 flex flex-wrap gap-1.5">
                                <span className="rounded-full px-2.5 py-[5px] text-[9px] font-black uppercase tracking-[0.05em]" style={{ background: sheet.buyerColor, color: wordsOn(sheet.buyerColor) }}>On {sheet.buyerName}</span>
                                {sheet.weeksLeft !== null && <span className="rounded-full px-2.5 py-[5px] text-[9px] font-black uppercase tracking-[0.05em] text-[#14110a]" style={{ background: GOLD }}>{sheet.weeksLeft} {sheet.weeksLeft === 1 ? 'week' : 'weeks'} left</span>}
                            </div>
                            <div className="absolute inset-x-4 bottom-2 z-10">
                                <h2 className="font-serif text-[28px] font-extrabold italic leading-[1.05] text-white">{sheet.title}</h2>
                                <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">{sheet.kind} · {sheet.genre} · ★ {sheet.rating.toFixed(1)}</p>
                            </div>
                        </div>
                        <div className="mx-4 mt-2.5 grid grid-cols-3 gap-2">
                            <Stat label="They paid" value={money(sheet.theyPaid)} />
                            <Stat label="Your share" value={`${Math.round(sheet.yourShare)}%`} />
                            <Stat label="Earned" value={money(sheet.earned)} color="#7ce3a8" />
                        </div>
                        <SectionHead title="What happens next" />
                        <article data-rights-next className="mx-4 rounded-[18px] border bg-gradient-to-br from-[#241c0d] to-[#14110b] p-3" style={{ borderColor: `${GOLD}55` }}>
                            <p className="text-[15px] font-black leading-tight text-white">{sheet.next.headline}</p>
                            <p className="mt-1 text-[11px] font-semibold leading-snug text-zinc-400">{sheet.next.line}</p>
                            {sheet.next.caseId && <Answers canRenew={sheet.next.canRenew} renewLabel="Renew now" onRenew={() => answerTitle(sheet.next.caseId!, 'ACCEPT_RENEWAL')} onLetGo={() => answerTitle(sheet.next.caseId!, 'LET_EXPIRE')} onShop={() => answerTitle(sheet.next.caseId!, 'RETURN_TO_MARKET')} />}
                        </article>
                        {noteLine}
                        {sheet.history.length > 0 && <section className="mx-4 mt-2.5 rounded-2xl border border-white/[0.07] bg-[#15130f] p-3" data-rights-history>
                            <h3 className="mb-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Its rights so far</h3>
                            {sheet.history.map((row, index) => (
                                <div key={`${row.what}:${index}`} className="grid grid-cols-[1fr_auto] gap-x-3 border-t border-white/[0.05] py-1.5 first:border-t-0">
                                    <span className="min-w-0 text-[11.5px] font-bold leading-snug text-zinc-200">{row.what}<small className="mt-0.5 block text-[10px] font-semibold text-zinc-500">{row.detail}. {row.when}</small></span>
                                    {row.money !== null && <b className="font-mono text-[12px] font-extrabold text-[#f2cf7c]">{money(row.money)}</b>}
                                </div>
                            ))}
                        </section>}
                    </div>
                    <footer className="grid shrink-0 grid-cols-2 gap-2 border-t border-white/[0.06] bg-[#0b0a08] px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-2.5">
                        <button type="button" data-rights-open-film disabled={!sheet.canOpenFilm} onClick={() => onOpenFilm(sheet.projectId)} className="min-h-12 rounded-[13px] border border-white/[0.08] bg-[#15130f] px-2 text-[12px] font-black text-zinc-200 active:scale-[0.98]">Open the {sheet.kind === 'Series' ? 'series' : 'film'}</button>
                        <button type="button" data-rights-open-partner onClick={() => go({ name: 'PARTNERS', focus: sheet.buyerId })} className="min-h-12 rounded-[13px] border border-white/[0.08] bg-[#15130f] px-2 text-[12px] font-black leading-tight text-zinc-200 active:scale-[0.98]">Partner: {sheet.buyerName}</button>
                    </footer>
                </div>
            );
        }

        if (screen.name === 'SELL') {
            const list = newestFirst
                ? [...view.freeToSell].sort((left, right) => (right.releasedAtAbsoluteWeek ?? -1) - (left.releasedAtAbsoluteWeek ?? -1) || left.title.localeCompare(right.title))
                : view.freeToSell;
            const together = picked.length >= 2;
            const estimate = together ? estimateRightsPackage(picked.map(id => getRightsTitleFigures(player, id)), durationWeeks, exclusive ? 'EXCLUSIVE' : 'NON_EXCLUSIVE') : null;
            return (
                <div className="flex h-full flex-col" data-rights-selling>
                    <Top eyebrow={studioName} title="Free to sell" onBack={back} right={<button type="button" data-rights-sort aria-label="Change the order" onClick={() => setNewestFirst(value => !value)} className="h-11 rounded-[13px] border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black text-zinc-200 active:scale-95">{newestFirst ? 'Newest first' : 'Best first'}</button>} />
                    <div className="min-h-0 flex-1 overflow-y-auto pb-3">
                        <div className="grid grid-cols-3 gap-2 px-4 pt-1.5">{list.map(title => <ShelfTile key={title.projectId} title={title} picked={picked.includes(title.projectId)} onTap={() => togglePick(title.projectId)} />)}</div>
                        <p className="mx-4 mt-2.5 text-[10.5px] font-semibold leading-snug text-zinc-500">One title goes to the Rights Floor. Two or more go in together as one package.</p>
                    </div>
                    <footer className="shrink-0 border-t border-white/[0.07] bg-[#0b0a08] px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-2.5" data-rights-sell-bar>
                        <div className="flex items-baseline justify-between gap-3 text-[11px] font-extrabold text-zinc-400">
                            <span>{picked.length ? `${picked.length} picked` : 'Tap the titles you want to sell'}</span>
                            {picked.length > 0 && <button type="button" data-rights-clear onClick={() => setPicked([])} className="min-h-6 text-zinc-300 active:text-white">Clear</button>}
                        </div>
                        {together && <div className="mt-2 space-y-1.5">
                            <div className="grid grid-cols-3 gap-1.5">{[[52, '1 year'], [104, '2 years'], [156, '3 years']].map(([weeks, label]) => <Chip key={weeks} data={`WEEKS_${weeks}`} on={durationWeeks === weeks} onTap={() => setDurationWeeks(Number(weeks))}>{label}</Chip>)}</div>
                            <div className="grid grid-cols-2 gap-1.5">
                                <Chip data="EXCLUSIVE" on={exclusive} onTap={() => setExclusive(true)}>One service</Chip>
                                <Chip data="SHARED" on={!exclusive} onTap={() => setExclusive(false)}>Shared, pays less</Chip>
                            </div>
                        </div>}
                        {estimate && <p data-rights-estimate className="mt-2 text-[11px] font-bold leading-snug text-zinc-300">Should fetch about <b className="font-mono text-[#f2cf7c]">{money(estimate.low)} to {money(estimate.high)}</b>, worldwide. {exclusive ? 'One service has them alone.' : 'You can still put them on your own service.'}</p>}
                        {noteLine && <div className="-mx-4">{noteLine}</div>}
                        <button type="button" data-rights-sell-go disabled={!picked.length} onClick={sell} className="mt-2 min-h-[52px] w-full rounded-[14px] text-[13px] font-black uppercase tracking-[0.04em] text-[#14110a] transition active:scale-[0.99] disabled:bg-white/10 disabled:text-zinc-500" style={picked.length ? { background: GOLD } : undefined}>
                            {together ? `Sell ${picked.length} together` : picked.length === 1 ? 'Sell this one' : 'Pick a title'}
                        </button>
                    </footer>
                </div>
            );
        }

        /* the room */
        const first = view.waiting[0];
        return (
            <div className="flex h-full flex-col" data-rights-room-home>
                <Top eyebrow={studioName} title="Rights" onBack={back} right={
                    <button type="button" data-rights-open-team onClick={() => go({ name: 'TEAM' })} className="flex min-h-11 items-center gap-1.5 rounded-[13px] border px-3 text-[11px] font-black leading-tight text-[#f2cf7c] active:scale-95" style={{ background: `${GOLD}18`, borderColor: `${GOLD}55` }}>
                        <i className={`h-[7px] w-[7px] shrink-0 rounded-full ${view.mandate.controlMode === 'FULL' ? 'bg-[#f2cf7c]' : 'bg-[#7ce3a8] shadow-[0_0_8px_#7ce3a8]'}`} />{view.mandate.controlMode === 'FULL' ? 'I decide' : 'Team renews'}
                    </button>
                } />
                <div className="min-h-0 flex-1 overflow-y-auto pb-3">
                    <div className="mx-4 mt-0.5 grid grid-cols-3 gap-2">
                        <Stat data="year" label="This year" value={money(view.yearIncome)} color="#7ce3a8" />
                        <Stat data="on-services" label="On services" value={String(view.onServices.length)} />
                        <Stat data="free" label="Free to sell" value={String(view.freeToSell.length)} color="#f2cf7c" />
                    </div>
                    {view.note && <p data-rights-desk-note className="mx-4 mt-2 text-[10.5px] font-bold leading-snug text-zinc-500">Last from the team: {view.note}</p>}
                    {noteLine}
                    {view.openRooms.length > 0 && <section>
                        <SectionHead title="Still in the room" alert />
                        <div className="mx-4 space-y-2">{view.openRooms.map(item => (
                            <button key={item.id} type="button" data-rights-back-to-room={item.id} onClick={() => setRoom(player.world.streamingBiddingSessions?.[item.biddingSessionId || ''] || null)} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border bg-[#241c0d] px-3 py-2 text-left active:scale-[0.99]" style={{ borderColor: `${GOLD}55` }}>
                                <span className="min-w-0 text-[13px] font-black leading-tight text-white">{item.components.length} titles<small className="mt-0.5 block text-[10.5px] font-semibold text-zinc-400">Buyers are waiting on your answer</small></span>
                                <span className="flex shrink-0 items-center gap-1 text-[11px] font-black text-[#f2cf7c]">Go back <ChevronRight size={13} /></span>
                            </button>
                        ))}</div>
                    </section>}
                    {first && <WaitingCard item={first} week={week} position={`1 of ${view.waiting.length}`} onAnswer={answer} onOpen={() => go({ name: 'TITLE', projectId: first.sourceProjectId })} />}
                    {view.onServices.length > 0 && <section>
                        <SectionHead title="On services" right={`${view.onServices.length}`} />
                        <div className="flex gap-[9px] overflow-x-auto px-4 pb-1 [scrollbar-width:none]">{view.onServices.map(title => <ServiceTile key={title.projectId} title={title} onOpen={() => go({ name: 'TITLE', projectId: title.projectId })} />)}</div>
                    </section>}
                    {view.freeToSell.length > 0 && <section>
                        <SectionHead title="Free to sell" />
                        {view.suggestion && <button type="button" data-rights-suggestion onClick={() => { setPicked(view.suggestion!.projectIds); go({ name: 'SELL' }); }} className="mx-4 mb-2 flex min-h-10 w-[calc(100%-32px)] items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left text-[11px] font-bold leading-snug text-zinc-200 active:scale-[0.99]">Your team would sell {view.suggestion.projectIds.length} of these together <ChevronRight size={13} className="shrink-0" /></button>}
                        <div className="grid grid-cols-3 gap-2 px-4">{view.freeToSell.slice(0, 6).map((title, index) => <ShelfTile key={title.projectId} title={title} delay={index * 0.03} picked={picked.includes(title.projectId)} onTap={() => { togglePick(title.projectId); go({ name: 'SELL' }); }} />)}</div>
                        <button type="button" data-rights-see-all onClick={() => go({ name: 'SELL' })} className="mx-4 mt-2 flex h-11 w-[calc(100%-32px)] items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] text-[11.5px] font-black text-zinc-200 active:scale-[0.99]">{view.freeToSell.length > 6 ? `See all ${view.freeToSell.length}` : 'Sell from these'} <ChevronRight size={13} /></button>
                    </section>}
                    {view.heldBack.length > 0 && <p data-rights-held-back className="mx-4 mt-3 text-[10.5px] font-semibold leading-snug text-zinc-500">{view.heldBack.length} more {view.heldBack.length === 1 ? 'title is' : 'titles are'} held back: {view.heldBack[0].why}</p>}
                    {!view.onServices.length && !view.freeToSell.length && !first && <p className="mx-6 pt-16 text-center text-[12px] font-semibold leading-snug text-zinc-500">Nothing to sell yet. Finish a film or a series and its rights land here.</p>}
                </div>
                <footer className="grid shrink-0 grid-cols-2 gap-2 border-t border-white/[0.06] bg-[#0b0a08] px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-2.5">
                    <button type="button" data-rights-open-partners onClick={() => go({ name: 'PARTNERS' })} className="h-12 rounded-[13px] border border-white/[0.08] bg-[#15130f] text-[12px] font-black text-zinc-200 active:scale-[0.98]">Partners</button>
                    <button type="button" data-rights-open-money onClick={() => go({ name: 'MONEY' })} className="h-12 rounded-[13px] border border-white/[0.08] bg-[#15130f] text-[12px] font-black text-zinc-200 active:scale-[0.98]">Money</button>
                </footer>
            </div>
        );
    })();

    return (
        <div className="fixed inset-0 z-[60] bg-[#0b0a08] text-white" data-rights-room>
            <AnimatePresence mode="wait" initial={false}>
                <motion.div key={screen.name === 'TITLE' ? `TITLE:${screen.projectId}` : screen.name} className="h-full" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>{body}</motion.div>
            </AnimatePresence>
            <AnimatePresence>
                {moment && <motion.button type="button" data-rights-moment initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoment(null)} aria-label="Close" className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center backdrop-blur-sm">
                    <motion.span initial={{ scale: 2.4, rotate: -14, opacity: 0 }} animate={{ scale: 1, rotate: -6, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }} className="rounded-lg border-[3px] px-4 py-1.5 font-serif text-[34px] font-black italic tracking-wide" style={{ color: GOLD, borderColor: GOLD }}>{moment.stamp}</motion.span>
                    <motion.b initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.18 }} className="font-mono text-[44px] font-extrabold leading-none text-white">{money(moment.amount)}</motion.b>
                    <motion.span initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.28 }} className="text-[14px] font-black text-white">{moment.title}</motion.span>
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.36 }} className="flex items-center gap-1.5 text-[12px] font-extrabold text-zinc-200"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: moment.color }} />{moment.line}</motion.span>
                </motion.button>}
            </AnimatePresence>
        </div>
    );
}

