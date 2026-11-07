import React from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import type { OwnedStreamingAudienceGap, OwnedStreamingAudienceReport } from '../../types';

const homesLabel = (homes: number) => (homes >= 1_000_000 ? `${(homes / 1_000_000).toFixed(1)}M homes` : `${Math.round(homes / 1_000)}K homes`);

const Bar: React.FC<{ label: string; percent: number; color: string }> = ({ label, percent, color }) => (
    <div className="grid grid-cols-[66px_minmax(0,1fr)_30px] items-center gap-2">
        <span className="text-[9px] font-black uppercase tracking-[0.08em] text-zinc-500">{label}</span>
        <span className="block h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full" style={{ width: `${Math.min(100, percent)}%`, background: color }} /></span>
        <span className="text-right font-mono text-[10px] font-black text-zinc-300">{percent}%</span>
    </div>
);

const GapCard: React.FC<{ gap: OwnedStreamingAudienceGap }> = ({ gap }) => (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
        <h3 className="truncate text-sm font-black">{gap.title}</h3>
        <p className="mb-2.5 truncate text-[11px] font-semibold text-zinc-400">{gap.countryName} · {homesLabel(gap.homes)}</p>
        <div className="space-y-1.5">
            <Bar label="They want" percent={gap.wantPercent} color="#fbbf24" />
            <Bar label="You have" percent={gap.havePercent} color="#fb7185" />
        </div>
    </article>
);

/** #280: what the paid report found. It shows pitches that fit, and tags them everywhere. */
export const AudienceReportScreen: React.FC<{
    report: OwnedStreamingAudienceReport;
    weeksLeft: number;
    fittingPitches: number;
    onClose: () => void;
}> = ({ report, weeksLeft, fittingPitches, onClose }) => createPortal(
    <div data-audience-report className="fixed inset-0 z-[85] flex flex-col overflow-hidden bg-[#0a0406] font-sans text-white">
        <div className="grid shrink-0 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+14px)]">
            <button type="button" onClick={onClose} aria-label="Back" className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5"><ArrowLeft size={18} /></button>
            <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Paid research</div>
                <h1 className="text-lg font-black leading-tight">Audience report</h1>
            </div>
            <span className="rounded-lg border border-amber-300/30 px-2 py-1 text-center">
                <span className="block font-mono text-sm font-black leading-none text-amber-300">{weeksLeft}</span>
                <span className="block text-[7px] font-black uppercase tracking-wider text-zinc-400">weeks left</span>
            </span>
        </div>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-4 pt-1">
            <p className="text-xs font-semibold text-zinc-400">What your viewers want and your catalogue does not have.</p>
            {report.gaps.length ? report.gaps.map(gap => <GapCard key={gap.id} gap={gap} />) : <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs font-semibold text-zinc-500">Your catalogue already covers what your viewers want.</p>}
            <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] px-3 py-2.5 text-[11px] font-semibold text-zinc-300">
                <span className="mr-1.5 rounded bg-emerald-400/15 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-300">Fits your gap</span>
                This tag now shows on pitches and in your studio's Script Market.
            </p>
        </div>
        <div className="shrink-0 border-t border-white/10 bg-black/60 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3">
            <button type="button" onClick={onClose} className="min-h-[52px] w-full rounded-2xl bg-rose-500 text-sm font-black uppercase tracking-[0.1em] text-white active:scale-[0.99]">
                {fittingPitches ? `See ${fittingPitches} ${fittingPitches === 1 ? 'pitch' : 'pitches'} that fit` : 'Back to the Desk'}
            </button>
        </div>
    </div>,
    document.body,
);

export default AudienceReportScreen;
