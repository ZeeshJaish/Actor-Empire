import React from 'react';
import { ArrowRight, Building2, Crown, LineChart, ShieldCheck } from 'lucide-react';
import type { Player, ScheduledEvent } from '../types';
import { formatMoney } from '../services/formatUtils';

interface StockControlEventModalProps {
    player: Player;
    event: ScheduledEvent;
    onOpenAcquisitionDesk: () => void;
    onReviewStock: () => void;
}

const formatPercent = (value: number) => `${Number(value || 0).toFixed(1)}%`;

export const StockControlEventModal: React.FC<StockControlEventModalProps> = ({
    player,
    event,
    onOpenAcquisitionDesk,
    onReviewStock,
}) => {
    const data = event.data || {};
    const stock = player.stocks.find(candidate => candidate.id === data.stockId);
    const companyName = data.companyName || stock?.name || 'the studio';
    const stockSymbol = data.stockSymbol || stock?.symbol || 'STK';
    const ownershipPercent = Number(data.ownershipPercent || 0);
    const effectiveControlPercent = Number(data.effectiveControlPercent || ownershipPercent);
    const position = player.portfolio.find(item => item.stockId === data.stockId);
    const positionValue = position && stock ? position.shares * stock.price : 0;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/92 p-4 text-white backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-sky-400/35 bg-zinc-950 shadow-2xl">
                <div className="h-2 bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300" />
                <div className="pointer-events-none absolute -right-8 -top-8 text-sky-400/10">
                    <Crown size={170} strokeWidth={1.25} />
                </div>

                <div className="relative border-b border-sky-400/15 p-5">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-300/35 bg-sky-400/15 text-sky-200">
                            <Crown size={24} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Majority Control Decision</div>
                            <div className="mt-1 flex items-center gap-2">
                                <span className="text-2xl font-black leading-none text-white">{stockSymbol}</span>
                                <span className="rounded-md bg-emerald-400/15 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-300">Control Ready</span>
                            </div>
                        </div>
                    </div>
                    <h2 className="text-3xl font-black leading-tight text-white">You control {companyName}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                        This is bigger than a normal stock trade. Your public-market position can now move into the acquisition desk and become an owned studio subsidiary.
                    </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <div className="mb-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-zinc-800 bg-black/35">
                        <div className="border-r border-zinc-800 p-3">
                            <div className="text-[8px] font-black uppercase tracking-wide text-zinc-500">Owned</div>
                            <div className="mt-1 font-mono text-lg font-black text-white">{formatPercent(ownershipPercent)}</div>
                        </div>
                        <div className="border-r border-zinc-800 p-3">
                            <div className="text-[8px] font-black uppercase tracking-wide text-zinc-500">Effective</div>
                            <div className="mt-1 font-mono text-lg font-black text-emerald-300">{formatPercent(effectiveControlPercent)}</div>
                        </div>
                        <div className="p-3">
                            <div className="text-[8px] font-black uppercase tracking-wide text-zinc-500">Value</div>
                            <div className="mt-1 truncate font-mono text-lg font-black text-sky-300">{formatMoney(positionValue)}</div>
                        </div>
                    </div>

                    <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                            <ShieldCheck size={14} /> Why This Matters
                        </div>
                        <p className="text-sm leading-relaxed text-emerald-50/80">
                            Opening the acquisition desk starts the formal transition path: funding, filings, closing steps, and studio integration. This is where control becomes a playable studio asset.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={onOpenAcquisitionDesk}
                            className="group flex min-h-24 w-full items-center justify-between gap-4 rounded-2xl border border-emerald-400/40 bg-emerald-400 px-4 text-left text-slate-950 shadow-lg shadow-emerald-950/25 transition active:scale-[0.99]"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-emerald-300">
                                    <Building2 size={21} />
                                </div>
                                <div>
                                    <div className="text-base font-black uppercase tracking-wide">Open Acquisition Desk</div>
                                    <div className="mt-1 text-xs font-bold leading-snug text-slate-800">Start the formal control transfer workflow.</div>
                                </div>
                            </div>
                            <ArrowRight className="shrink-0 transition group-active:translate-x-1" size={22} />
                        </button>

                        <button
                            type="button"
                            onClick={onReviewStock}
                            className="group flex min-h-20 w-full items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-left transition active:bg-zinc-800"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-sky-300">
                                    <LineChart size={20} />
                                </div>
                                <div>
                                    <div className="text-sm font-black uppercase tracking-wide text-white">Review Stock Position</div>
                                    <div className="mt-1 text-xs leading-snug text-zinc-400">Inspect ownership and use the manual acquisition button from Stocks.</div>
                                </div>
                            </div>
                            <ArrowRight className="shrink-0 text-zinc-500 transition group-active:translate-x-1" size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
