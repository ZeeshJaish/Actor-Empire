import React, { useId, useState } from 'react';
import { Info } from 'lucide-react';
import type { ProjectCostSummary } from '../../../../services/projectCostPresentation';

interface ProjectCostCardProps {
    summary: ProjectCostSummary;
    translate: (key: string) => string;
    formatMoney: (value: number) => string;
    compact?: boolean;
    title?: string;
    valueLabel?: string;
    overBudget?: boolean;
}

export const ProjectCostCard: React.FC<ProjectCostCardProps> = ({ summary, translate: tr, formatMoney,
    compact = false, title, valueLabel, overBudget = false }) => {
    const [pinned, setPinned] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const detailsId = useId();
    const open = pinned || hovered || focused;
    const close = () => { setPinned(false); setHovered(false); setFocused(false); };
    const label = title || tr(summary.marketing === null ? 'projectCost.recordedTotal'
        : summary.marketingKind === 'SPENT' ? 'projectCost.totalCost' : 'projectCost.totalBudget');
    const displayedValue = valueLabel || formatMoney(summary.total);
    return (
        <button type="button" data-testid={compact ? 'planning-cost-card' : 'project-cost-card'}
            aria-label={`${label}: ${displayedValue}. ${tr(open ? 'projectCost.closeBreakdown' : 'projectCost.viewBreakdown')}`}
            aria-describedby={open ? detailsId : undefined}
            aria-expanded={open}
            onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }}
            onPointerLeave={() => setHovered(false)}
            onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setFocused(true); }}
            onBlur={close}
            onClick={() => { const wasOpen = open; close(); setPinned(!wasOpen); }}
            onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close(); } }}
            className={`relative w-full text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${compact
                ? 'min-h-16 rounded-xl py-1 text-right'
                : 'h-[120px] rounded-3xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-sm sm:p-6'}`}>
            <span aria-hidden={open} className={`flex h-full flex-col justify-center transition-opacity motion-reduce:transition-none ${compact ? 'items-end' : ''} ${open && !compact ? 'opacity-0' : 'opacity-100'}`}>
                <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} mb-2 font-black uppercase tracking-widest text-zinc-500`}>{label}</span>
                <span className={`${compact ? 'text-sm sm:text-xl font-mono' : 'text-xl sm:text-3xl'} whitespace-nowrap font-bold tracking-tight ${overBudget ? 'text-rose-500' : compact ? 'text-emerald-400' : 'text-white'}`}>
                    {displayedValue}
                </span>
                <span className="mt-1 flex items-center gap-1 text-[8px] font-bold text-zinc-500"><Info size={10} />{tr('projectCost.viewBreakdown')}</span>
            </span>
            <span id={detailsId} aria-hidden={!open} className={`absolute z-30 flex flex-col justify-center gap-1 rounded-2xl border border-zinc-700 bg-zinc-900 p-3 text-left shadow-xl transition-opacity motion-reduce:transition-none ${compact
                ? 'right-0 top-full w-64 max-w-[calc(100vw-32px)]'
                : 'inset-0'} ${open ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'}`}>
                <span className="flex justify-between gap-2 text-[10px] sm:text-xs"><span className="text-zinc-400">{tr('projectCost.production')}</span><span className="font-mono text-white">{formatMoney(summary.production)}</span></span>
                <span className="flex justify-between gap-2 text-[10px] sm:text-xs"><span className="text-zinc-400">{tr(summary.marketingKind === 'RESERVED' ? 'projectCost.marketingReserved' : 'projectCost.marketingSpent')}</span><span className="font-mono text-amber-300">{summary.marketing === null ? tr('projectCost.notRecorded') : formatMoney(summary.marketing)}</span></span>
                {summary.returned > 0 && <span className="flex justify-between gap-2 text-[10px] sm:text-xs"><span className="text-zinc-400">{tr('projectCost.returnedReserve')}</span><span className="font-mono text-emerald-300">{formatMoney(summary.returned)}</span></span>}
                <span className="flex justify-between gap-2 border-t border-white/10 pt-1 text-[10px] font-bold sm:text-xs"><span className="text-zinc-300">{tr(summary.marketing === null ? 'projectCost.recordedTotal' : 'projectCost.total')}</span><span className="font-mono text-white">{formatMoney(summary.total)}</span></span>
            </span>
        </button>
    );
};
