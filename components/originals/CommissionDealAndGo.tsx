import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, X, Zap } from 'lucide-react';
import { studioPossessive, type OriginalBill, type OriginalDealKind } from '../../services/originalsDeal';
import { ORIGINALS_SEASON_STYLE_NAMES } from '../../services/originalsStudios';
import { OriginalPoster } from './OriginalsDesk';

const money = (value: number) => (value >= 1_000_000_000
    ? `$${(value / 1_000_000_000).toFixed(1)}B`
    : value >= 1_000_000
        ? `$${(value / 1_000_000).toFixed(1)}M`
        : value > 0
            ? `$${Math.round(value / 1_000)}K`
            : '$0');

const Bullet: React.FC<{ good?: boolean; children: React.ReactNode }> = ({ good, children }) => (
    <li className="flex items-start gap-2 text-[12px] font-semibold leading-snug text-zinc-300">
        {good ? <Check size={13} className="mt-0.5 shrink-0 text-emerald-300" /> : <X size={13} className="mt-0.5 shrink-0 text-rose-300" />}
        <span>{children}</span>
    </li>
);

/** #287: how the player takes it: yours for ever, or cheaper for three years */
export const CommissionDealStep: React.FC<{
    studioName: string;
    buy: OriginalBill;
    licence: OriginalBill;
    feePercent: number;
    canLicence: boolean;
    locked?: boolean;
    /** #301: where the finished title can land with this studio */
    qualityRange?: { low: number; high: number };
    deal: OriginalDealKind;
    onDeal: (deal: OriginalDealKind) => void;
    onBack: () => void;
    onNext: () => void;
}> = ({ studioName, buy, licence, feePercent, canLicence, qualityRange, deal, onDeal, onBack, onNext }) => {
    const saved = Math.round((1 - licence.total / Math.max(1, buy.total)) * 100);
    const card = (active: boolean) => `relative block w-full rounded-2xl border-2 p-4 text-left transition-colors ${active ? 'border-rose-400 bg-rose-500/[0.07] shadow-[0_0_22px_rgba(244,63,94,.18)]' : 'border-white/10 bg-white/[0.03]'}`;
    return (
        <div data-commission-deal className="px-4 pb-32 pt-4">
            <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <h2 className="text-lg font-black leading-tight text-white">How do you take it?</h2>
                <p className="mt-1 text-xs font-semibold text-zinc-400">{studioName} makes it either way. This decides who keeps it.</p>
                {qualityRange && (
                    <div data-quality-range className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-white/10 pt-2.5">
                        <span className="min-w-0 text-[11px] font-semibold leading-snug text-zinc-400">You are not on their set. The finished quality could land</span>
                        <span className="shrink-0 font-mono text-sm font-black text-white">{qualityRange.low} to {qualityRange.high}</span>
                    </div>
                )}
            </div>
            <div className="space-y-2.5">
                <button type="button" data-deal="BUY" aria-pressed={deal === 'BUY'} onClick={() => onDeal('BUY')} className={card(deal === 'BUY')}>
                    {deal === 'BUY' && <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-white"><Check size={14} /></span>}
                    <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-rose-200/80">Buy it</span>
                    <span className="block text-lg font-black leading-tight text-white">Yours for ever</span>
                    <span className="mt-1 block font-mono text-2xl font-black text-amber-300">{money(buy.total)}</span>
                    <span className="block text-[11px] font-semibold text-zinc-500">{money(buy.making)} to make + {studioPossessive(studioName)} {feePercent}%</span>
                    <ul className="mt-2.5 space-y-1">
                        <Bullet good>Renew whenever you want</Bullet>
                        <Bullet good>Spin-offs and sequels are yours</Bullet>
                        <Bullet good>Sell it on to others later</Bullet>
                    </ul>
                </button>
                <button type="button" data-deal="LICENCE" aria-pressed={deal === 'LICENCE'} disabled={!canLicence} onClick={() => onDeal('LICENCE')} className={`${card(deal === 'LICENCE')} ${canLicence ? '' : 'opacity-60'}`}>
                    {deal === 'LICENCE' && <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-white"><Check size={14} /></span>}
                    <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-rose-200/80">Licence it</span>
                    <span className="block text-lg font-black leading-tight text-white">Cheaper, for 3 years</span>
                    <span className="mt-1 block font-mono text-2xl font-black text-amber-300">{money(licence.total)}</span>
                    <span className="block text-[11px] font-semibold text-zinc-500">{canLicence ? `About ${Math.round((licence.total / Math.max(1, licence.making)) * 100)}% of what it costs to make, no fee` : `${studioName} cannot carry the cost. It needs paying in full.`}</span>
                    <ul className="mt-2.5 space-y-1">
                        <Bullet good>{saved}% less to pay now</Bullet>
                        <Bullet>Goes back to {studioName} after 3 years</Bullet>
                        <Bullet>Season 2 means a new negotiation</Bullet>
                    </ul>
                </button>
            </div>
            <PinnedBar onBack={onBack} nextLabel="Next: Go" onNext={onNext} />
        </div>
    );
};

export const PinnedBar: React.FC<{ onBack: () => void; nextLabel: string; onNext?: () => void; disabled?: boolean; skip?: () => void }> = ({ onBack, nextLabel, onNext, disabled, skip }) => (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-6" style={{ background: 'linear-gradient(to top, #0d0306 76%, rgba(13,3,6,.9) 90%, transparent)' }}>
        {skip && <button type="button" data-skip-to-deal onClick={skip} className="mx-auto mb-2 flex min-h-9 items-center px-3 text-[10px] font-black uppercase tracking-[0.12em] text-rose-300">Skip to Deal ›</button>}
        <div className="grid grid-cols-[1fr_2fr] gap-3">
            <button type="button" onClick={onBack} className="min-h-[52px] rounded-2xl border border-white/10 bg-zinc-900 text-sm font-black text-white">Back</button>
            <button type="button" data-commission-next onClick={onNext} disabled={disabled} className="min-h-[52px] rounded-2xl bg-rose-500 text-sm font-black uppercase tracking-[0.08em] text-white disabled:bg-zinc-800 disabled:text-zinc-500">{nextLabel}</button>
        </div>
    </div>
);

const BillLine: React.FC<{ label: string; amount: number }> = ({ label, amount }) => (
    <div className="flex items-baseline justify-between gap-3 py-[3px]">
        <span className="text-[13px] font-semibold text-zinc-300">{label}</span>
        <span className="font-mono text-[13px] font-black text-white">{money(amount)}</span>
    </div>
);

/** #287: Go is the whole bill, on all three ways: above the line, below the line, the studio's fee, the total, paid at once */
export const CommissionGoStep: React.FC<{
    title: string;
    studioName: string;
    isOwnStudio: boolean;
    episodes: number;
    isSeries: boolean;
    seasonName?: string;
    deal: OriginalDealKind;
    bill: OriginalBill;
    energyCost: number;
    energy: number;
    treasury: number;
    errors: string[];
    busy?: boolean;
    onBack: () => void;
    onCommission: () => void;
}> = ({ title, studioName, isOwnStudio, episodes, isSeries, seasonName, deal, bill, energyCost, energy, treasury, errors, busy, onBack, onCommission }) => {
    const short = treasury < bill.total;
    const tired = energy < energyCost;
    const problems = [
        ...(short ? [`The platform is short by ${money(bill.total - treasury)}.`] : []),
        ...(tired ? [`You need ${energyCost}⚡ for this.`] : []),
        ...errors,
    ];
    const chip = 'rounded-md border border-white/15 bg-black/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-zinc-200';
    return (
        <div data-commission-go className="px-4 pb-32 pt-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
                <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                        <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Commission approval</span>
                        <span className="block text-xl font-black uppercase leading-tight text-white">{title}</span>
                    </span>
                    <span className={`shrink-0 text-right text-[8px] font-black uppercase tracking-[0.1em] ${problems.length ? 'text-rose-300' : 'text-emerald-300'}`}>{problems.length ? 'Not yet' : 'Ready to commission'}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={chip}>{studioName}</span>
                    {isSeries && <span className={chip}>{episodes} episodes</span>}
                    {seasonName && <span className={chip}>{seasonName}</span>}
                    {!isOwnStudio && <span className={chip}>{deal === 'BUY' ? 'Buy it' : 'Licence, 3 years'}</span>}
                </div>
            </div>

            <div className="mt-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <div className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Above the line</div>
                {bill.above.map(line => <BillLine key={line.label} {...line} />)}
                <div className="mb-1 mt-2.5 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Below the line</div>
                {bill.below.map(line => <BillLine key={line.label} {...line} />)}
            </div>

            <div className="mt-2.5 rounded-2xl border border-amber-300/30 bg-amber-300/[0.05] p-3.5">
                <div className="flex items-baseline justify-between gap-3"><span className="text-[13px] font-black text-zinc-200">{isSeries ? 'Making the season' : 'Making the film'}</span><span className="font-mono text-[13px] font-black text-amber-300">{money(bill.making)}</span></div>
                {!isOwnStudio && deal === 'BUY' && <div className="mt-0.5 flex items-baseline justify-between gap-3"><span className="text-[13px] font-semibold text-zinc-300">{studioPossessive(studioName)} own fee, {bill.feePercent}%</span><span className="font-mono text-[13px] font-black text-amber-300">{money(bill.fee)}</span></div>}
                {!isOwnStudio && deal === 'LICENCE' && <div className="mt-0.5 flex items-baseline justify-between gap-3"><span className="text-[13px] font-semibold text-zinc-300">{studioName} carries the rest for 3 years</span><span className="font-mono text-[13px] font-black text-zinc-400">−{money(bill.making - bill.total)}</span></div>}
                <div className="mt-2 flex items-end justify-between gap-3 border-t border-amber-300/20 pt-2">
                    <span className="min-w-0">
                        <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-zinc-400">Paid now, all at once</span>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500">{isSeries ? `about ${money(bill.perEpisode)} an episode · ` : ''}{energyCost}<Zap size={10} className="fill-amber-300 text-amber-300" /></span>
                    </span>
                    <span data-bill-total className="font-mono text-2xl font-black text-amber-300">{money(bill.total)}</span>
                </div>
            </div>

            {problems.length > 0 && (
                <div data-go-problems className="mt-2.5 space-y-1 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3">
                    {problems.map(problem => <p key={problem} className="flex items-start gap-2 text-xs font-semibold text-rose-100"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> {problem}</p>)}
                </div>
            )}
            <PinnedBar onBack={onBack} nextLabel={busy ? 'Commissioning…' : 'Commission'} onNext={onCommission} disabled={problems.length > 0 || busy} />
        </div>
    );
};

/** #287: the moment it is ordered: a stamp, then what the industry is saying */
export const CommissionMoment: React.FC<{
    title: string;
    platformName: string;
    headline: string;
    subtext?: string;
    post?: { handle: string; text: string };
    onDone: () => void;
}> = ({ title, platformName, headline, subtext, post, onDone }) => {
    const [stamped, setStamped] = useState(false);
    useEffect(() => {
        const timer = window.setTimeout(() => setStamped(true), 350);
        return () => window.clearTimeout(timer);
    }, []);
    return (
        <div data-commission-moment className="flex min-h-full flex-col items-center px-4 pb-32 pt-6 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-300">A {platformName} Original</div>
            <div className="relative mt-3 w-full max-w-[280px]">
                <OriginalPoster title={title} className="h-[300px] rounded-2xl border border-white/10">
                    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/70 to-transparent p-4 pt-12">
                        <div className="text-xl font-black leading-tight text-white">{title}</div>
                    </div>
                </OriginalPoster>
                <div
                    data-commissioned-stamp
                    className="absolute left-1/2 top-[44%] z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border-[3px] border-rose-400 bg-rose-950/60 px-4 py-1.5 text-2xl font-black uppercase tracking-tight text-rose-200 shadow-[0_0_30px_rgba(244,63,94,.6)]"
                    style={{ transform: `translate(-50%, -50%) rotate(-7deg) scale(${stamped ? 1 : 2.4})`, opacity: stamped ? 1 : 0, transition: 'transform 220ms cubic-bezier(.2,1.4,.4,1), opacity 160ms ease-out' }}
                >
                    Commissioned
                </div>
            </div>
            <div className="mt-4 w-full max-w-md space-y-2 text-left">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-rose-300">Production Weekly</div>
                    <p className="mt-0.5 text-sm font-black leading-snug text-white">{headline}</p>
                    {subtext && <p className="mt-1 text-xs font-medium text-zinc-400">{subtext}</p>}
                </div>
                {post && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <div className="text-[10px] font-bold text-zinc-500">{post.handle} · X</div>
                        <p className="mt-0.5 text-xs font-medium text-zinc-200">{post.text}</p>
                    </div>
                )}
            </div>
            <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-6" style={{ background: 'linear-gradient(to top, #0d0306 76%, rgba(13,3,6,.9) 90%, transparent)' }}>
                <button type="button" data-to-active-slate onClick={onDone} className="min-h-[52px] w-full rounded-2xl bg-rose-500 text-sm font-black uppercase tracking-[0.1em] text-white">To the Active Slate</button>
            </div>
        </div>
    );
};

export { ORIGINALS_SEASON_STYLE_NAMES };
