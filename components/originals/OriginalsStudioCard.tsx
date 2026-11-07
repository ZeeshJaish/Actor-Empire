import React from 'react';
import { Check, Star } from 'lucide-react';
import { ORIGINALS_SEASON_STYLE_NAMES, type OriginalsStudioCard as Card } from '../../services/originalsStudios';

const Dial: React.FC<{ value: number; label: string }> = ({ value, label }) => {
    const radius = 17;
    const length = 2 * Math.PI * radius;
    const color = value >= 75 ? '#34d399' : value >= 60 ? '#fbbf24' : '#fb7185';
    return (
        <div className="flex min-w-0 flex-col items-center gap-1">
            <div className="relative h-11 w-11 shrink-0">
                <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90" aria-hidden="true">
                    <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="4" />
                    <circle cx="22" cy="22" r={radius} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(value / 100) * length} ${length}`} />
                </svg>
                <span className="absolute inset-0 grid place-items-center font-mono text-[11px] font-black text-white">{value}</span>
            </div>
            <span className="w-full text-center text-[8px] font-black uppercase leading-[1.15] tracking-[0.04em] text-zinc-400">{label}</span>
        </div>
    );
};

/** #277: a studio as the head of a platform would want to see it: what it is, what it has made, and how it works */
export const OriginalsStudioCard: React.FC<{
    studio: Card;
    feePercent?: number;
    feeLine?: string;
    /** The line about how it spends a season: on a pitch it is theirs, on your own script it is yours */
    spendingNote?: string;
    selected?: boolean;
    compact?: boolean;
    onSelect?: () => void;
}> = ({ studio, feePercent, feeLine, spendingNote, selected, compact, onSelect }) => {
    const { record } = studio;
    const total = Math.max(1, record.hits + record.average + record.flops);
    const head = (
        <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl text-[13px] font-black text-white" style={{ background: studio.color }}>{studio.mark}</span>
            <span className="min-w-0">
                <span className="block truncate text-sm font-black text-white">{studio.name}</span>
                <span className="mt-0.5 block truncate text-[9px] font-black uppercase tracking-[0.12em] text-rose-200/70">{studio.typeLabel}</span>
            </span>
            {typeof feePercent === 'number' && (
                <span className="text-right">
                    <span className="block text-[8px] font-black uppercase tracking-[0.1em] text-zinc-500">Their fee</span>
                    <span className="block font-mono text-sm font-black text-amber-300">+{feePercent}%</span>
                </span>
            )}
        </div>
    );
    if (compact) {
        return (
            <button
                type="button"
                data-studio-row={studio.id}
                onClick={onSelect}
                aria-pressed={Boolean(selected)}
                className={`w-full rounded-2xl border p-3 text-left transition-colors active:scale-[0.99] ${selected ? 'border-rose-400 bg-rose-500/10' : 'border-white/10 bg-white/[0.04]'}`}
            >
                {head}
                <span className="mt-1.5 block truncate text-[11px] font-semibold text-zinc-400">{studio.line}</span>
            </button>
        );
    }
    return (
        <div data-studio-card={studio.id} className={`relative rounded-2xl border p-3.5 ${selected ? 'border-rose-400 bg-rose-500/[0.07] shadow-[0_0_24px_rgba(244,63,94,.18)]' : 'border-white/10 bg-white/[0.04]'}`}>
            {head}
            <p className="mt-2.5 text-xs font-semibold leading-relaxed text-zinc-300">{studio.line}</p>
            {feeLine && <p className="mt-1 text-[11px] font-semibold leading-snug text-amber-200/80">{feeLine}</p>}

            <div className="mt-3">
                <div className="flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">
                    <span>Track record · {record.titles} {record.titles === 1 ? 'title' : 'titles'}</span>
                    {record.rating > 0 && <span className="inline-flex shrink-0 items-center gap-1 text-zinc-300"><Star size={9} className="fill-yellow-400 text-yellow-400" /> {record.rating.toFixed(1)} average</span>}
                </div>
                {record.thin ? (
                    <p className="mt-1.5 text-[11px] font-semibold text-zinc-500">Too few titles yet to judge it by.</p>
                ) : (
                    <>
                        <div className="mt-1.5 flex h-2 gap-0.5 overflow-hidden rounded-full">
                            {record.hits > 0 && <span className="bg-emerald-400" style={{ width: `${(record.hits / total) * 100}%` }} />}
                            {record.average > 0 && <span className="bg-zinc-500" style={{ width: `${(record.average / total) * 100}%` }} />}
                            {record.flops > 0 && <span className="bg-rose-500" style={{ width: `${(record.flops / total) * 100}%` }} />}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[10px] font-bold text-zinc-400">
                            <span><span className="text-emerald-300">{record.hits} {record.hits === 1 ? 'hit' : 'hits'}</span> · {record.average} average · <span className="text-rose-300">{record.flops} {record.flops === 1 ? 'flop' : 'flops'}</span></span>
                            {record.genres.length > 0 && <span className="text-zinc-300">Mostly {record.genres.join(', ').toLowerCase()}</span>}
                        </div>
                    </>
                )}
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1">
                <Dial value={studio.creative} label="Creative" />
                <Dial value={studio.onSet} label="On set" />
                <Dial value={studio.budgetControl} label="Budget control" />
                <Dial value={studio.starPull} label="Star pull" />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-2.5">
                <span className="min-w-0">
                    <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">How they spend a season</span>
                    {spendingNote && <span className="mt-0.5 block text-[11px] font-semibold text-zinc-400">{spendingNote}</span>}
                </span>
                <span className="shrink-0 text-sm font-black uppercase tracking-[0.04em] text-violet-300">{ORIGINALS_SEASON_STYLE_NAMES[studio.style]}</span>
            </div>
            {selected && (
                <span aria-hidden="true" className="absolute right-2.5 top-2.5 hidden h-5 w-5 place-items-center rounded-full bg-rose-500 text-white">
                    <Check size={12} />
                </span>
            )}
        </div>
    );
};
