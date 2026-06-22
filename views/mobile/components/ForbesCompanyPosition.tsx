import React from 'react';
import {
    Activity,
    ChevronRight,
    Crown,
    Landmark,
    PieChart,
    TrendingUp,
} from 'lucide-react';
import type { CompanyPosition } from '../../../services/companyPosition';
import { formatMoney } from '../../../services/formatUtils';

interface ForbesCompanyPositionProps {
    position?: CompanyPosition;
    onOpenStocks: () => void;
}

const EMPTY_POSITION: CompanyPosition = {
    shares: 0,
    stockValue: 0,
    stockPercent: 0,
    negotiatedPercent: 0,
    investedValue: 0,
    ownershipPercent: 0,
    strategicThreshold: 25,
    influenceStatus: 'NO_STAKE',
    estimatedAnnualDividend: 0,
};

const POSITION_LABELS: Record<CompanyPosition['influenceStatus'], string> = {
    NO_STAKE: 'No Current Stake',
    FINANCIAL_STAKE: 'Financial Stake',
    STRATEGIC_STAKE: 'Strategic Stake',
    CONTROLLING_OWNER: 'Controlling Owner',
};

const formatOwnershipPercent = (value: number) => {
    if (value === 0 || value === 100) return `${value}%`;
    if (value < 0.01) return '<0.01%';
    if (value < 1) return `${value.toFixed(2)}%`;
    return `${value.toFixed(1)}%`;
};

export const ForbesCompanyPosition: React.FC<ForbesCompanyPositionProps> = ({
    position = EMPTY_POSITION,
    onOpenStocks,
}) => {
    const hasStake = position.ownershipPercent > 0;
    const isControlling = position.influenceStatus === 'CONTROLLING_OWNER';
    const progress = isControlling
        ? 100
        : Math.min(100, (position.ownershipPercent / position.strategicThreshold) * 100);
    const financialValue = position.stockValue + position.investedValue;

    return (
        <section className="mb-5 overflow-hidden rounded-2xl border border-sky-400/20 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_44%),#0a0a0c] shadow-[0_12px_35px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-3.5 py-2.5">
                <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.22em] text-sky-300">
                    <PieChart size={13} /> Your Position
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[6px] font-black uppercase tracking-[0.14em] ${
                    isControlling
                        ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                        : hasStake
                            ? 'border-sky-400/25 bg-sky-400/10 text-sky-300'
                            : 'border-white/10 bg-white/[0.03] text-zinc-600'
                }`}>
                    {POSITION_LABELS[position.influenceStatus]}
                </span>
            </div>

            <div className="px-3.5 py-3">
                <div className="grid grid-cols-[1.05fr_1fr_0.85fr] items-end gap-3">
                    <div className="min-w-0">
                        <div className="text-[6px] font-black uppercase tracking-[0.17em] text-zinc-600">Ownership</div>
                        <div className={`mt-0.5 font-mono text-2xl font-black leading-none ${isControlling ? 'text-amber-300' : hasStake ? 'text-sky-300' : 'text-zinc-500'}`}>
                            {formatOwnershipPercent(position.ownershipPercent)}
                        </div>
                    </div>
                    <div className="min-w-0 border-l border-white/[0.07] pl-3">
                        <div className="text-[6px] font-black uppercase tracking-[0.17em] text-zinc-600">Position Value</div>
                        <div className="mt-1 truncate font-mono text-[11px] font-black text-white">{formatMoney(financialValue)}</div>
                    </div>
                    <div className="min-w-0 border-l border-white/[0.07] pl-3 text-right">
                        <div className="text-[6px] font-black uppercase tracking-[0.14em] text-zinc-600">Strategic Target</div>
                        <div className={`mt-1 font-mono text-[11px] font-black ${isControlling ? 'text-amber-300' : 'text-sky-300'}`}>
                            {isControlling ? 'CONTROL' : `${position.strategicThreshold}%`}
                        </div>
                    </div>
                </div>

                {!isControlling ? (
                    <div className="mt-2.5">
                        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]" aria-label={`${formatOwnershipPercent(position.ownershipPercent)} of ${position.strategicThreshold}% strategic target`}>
                            <div
                                className={`h-full rounded-full ${position.influenceStatus === 'STRATEGIC_STAKE' ? 'bg-emerald-400' : 'bg-sky-400'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                ) : null}

                <div className="mt-2.5 flex min-h-9 items-center justify-between gap-3 border-t border-white/[0.07] pt-2.5">
                    {isControlling ? (
                        <div className="flex min-w-0 items-center gap-2 text-[7px] font-bold text-zinc-400">
                            <Crown size={12} className="shrink-0 text-amber-300" />
                            <span className="truncate">You control company strategy</span>
                        </div>
                    ) : hasStake ? (
                        <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-white/[0.07]">
                            <div className="pr-2">
                                <div className="text-[5px] font-black uppercase tracking-widest text-zinc-700">Shares</div>
                                <div className="mt-0.5 truncate font-mono text-[8px] font-black text-zinc-300">{position.shares.toLocaleString()}</div>
                            </div>
                            <div className="px-2">
                                <div className="text-[5px] font-black uppercase tracking-widest text-zinc-700">Private</div>
                                <div className="mt-0.5 font-mono text-[8px] font-black text-violet-300">{formatOwnershipPercent(position.negotiatedPercent)}</div>
                            </div>
                            <div className="pl-2">
                                <div className="text-[5px] font-black uppercase tracking-widest text-zinc-700">Dividend</div>
                                <div className="mt-0.5 truncate font-mono text-[8px] font-black text-emerald-300">{formatMoney(position.estimatedAnnualDividend)}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex min-w-0 items-center gap-2 text-[7px] font-semibold text-zinc-500">
                            <Landmark size={12} className="shrink-0" />
                            <span className="truncate">No shares or negotiated equity held</span>
                        </div>
                    )}

                    {position.linkedStockId ? (
                    <button
                        type="button"
                        aria-label="Open Stocks"
                        onClick={onOpenStocks}
                        className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-sky-400/20 bg-sky-400/[0.07] px-2.5 text-[6px] font-black uppercase tracking-[0.12em] text-sky-300 transition-colors hover:bg-sky-400/10"
                    >
                        <Activity size={12} /> Stocks <ChevronRight size={11} />
                    </button>
                ) : hasStake && position.negotiatedPercent > 0 ? (
                    <div className="flex shrink-0 items-center gap-1 text-[5px] font-black uppercase tracking-[0.1em] text-violet-300">
                        <TrendingUp size={10} /> Private equity
                    </div>
                ) : null}
                </div>
            </div>
        </section>
    );
};
