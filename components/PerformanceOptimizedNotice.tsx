import React from 'react';
import { Gauge, X } from 'lucide-react';

type PerformanceOptimizedNoticeProps = {
  title: string;
  message: string;
  automaticLabel: string;
  cinematicLabel: string;
  performanceLabel: string;
  onKeepAutomatic: () => void;
  onUseCinematic: () => void;
  onUsePerformance: () => void;
};

export const PerformanceOptimizedNotice: React.FC<PerformanceOptimizedNoticeProps> = ({
  title,
  message,
  automaticLabel,
  cinematicLabel,
  performanceLabel,
  onKeepAutomatic,
  onUseCinematic,
  onUsePerformance,
}) => (
  <aside
    className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[95] mx-auto max-w-md rounded-3xl border border-emerald-400/25 bg-zinc-950/95 p-4 text-white shadow-2xl backdrop-blur-xl"
    aria-live="polite"
    aria-label={title}
  >
    <div className="flex items-start gap-3">
      <div className="rounded-2xl bg-emerald-400 p-2.5 text-black"><Gauge size={20} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="font-black">{title}</div>
          <button
            type="button"
            onClick={onKeepAutomatic}
            className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
            aria-label={automaticLabel}
          >
            <X size={17} />
          </button>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{message}</p>
      </div>
    </div>
    <div className="mt-3 grid grid-cols-3 gap-2">
      <button type="button" onClick={onKeepAutomatic} className="rounded-xl bg-emerald-400 px-2 py-2.5 text-[10px] font-black uppercase tracking-wide text-black">
        {automaticLabel}
      </button>
      <button type="button" onClick={onUseCinematic} className="rounded-xl bg-zinc-800 px-2 py-2.5 text-[10px] font-black uppercase tracking-wide text-white">
        {cinematicLabel}
      </button>
      <button type="button" onClick={onUsePerformance} className="rounded-xl bg-zinc-800 px-2 py-2.5 text-[10px] font-black uppercase tracking-wide text-white">
        {performanceLabel}
      </button>
    </div>
  </aside>
);

