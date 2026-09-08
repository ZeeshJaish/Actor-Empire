import React from 'react';
import { Download, House, RefreshCw, ShieldCheck } from 'lucide-react';

interface WeekProcessingRecoveryModalProps {
    age: number;
    week: number;
    failedStage: string;
    detail: string;
    isExporting: boolean;
    onRetry: () => void;
    onReturnToMenu: () => void;
    onExportBackup: () => void;
}

export const WeekProcessingRecoveryModal: React.FC<WeekProcessingRecoveryModalProps> = ({
    age,
    week,
    failedStage,
    detail,
    isExporting,
    onRetry,
    onReturnToMenu,
    onExportBackup,
}) => (
    <div className="fixed inset-0 z-[330] flex items-center justify-center bg-black/90 p-5 backdrop-blur-md">
        <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="week-recovery-title"
            className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-orange-300/20 bg-[#12100e] shadow-[0_28px_100px_rgba(0,0,0,0.78)]"
        >
            <div className="h-1 bg-gradient-to-r from-orange-600 via-amber-300 to-emerald-400" />
            <div className="p-6">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/10 text-emerald-300">
                        <ShieldCheck size={27} />
                    </div>
                    <div className="min-w-0 pt-1">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Career protected</div>
                        <h2 id="week-recovery-title" className="mt-1 text-2xl font-black leading-tight text-white">
                            Week {week} was not applied
                        </h2>
                    </div>
                </div>

                <p className="mt-5 text-sm font-semibold leading-relaxed text-zinc-400">
                    Your previous verified save is still intact. You can retry the same week, export a backup, or safely return to the menu.
                </p>

                <div className="mt-5 border-y border-white/10 py-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Stopped while</div>
                    <div className="mt-1 text-sm font-black text-white">{failedStage}</div>
                    <div className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{detail}</div>
                    <div className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">Age {age} • Week {week}</div>
                </div>

                <div className="mt-6 space-y-2.5">
                    <button
                        type="button"
                        onClick={onRetry}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-4 text-sm font-black uppercase tracking-[0.12em] text-black transition-colors hover:bg-amber-200"
                    >
                        <RefreshCw size={18} />
                        Retry Week
                    </button>
                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            type="button"
                            disabled={isExporting}
                            onClick={onExportBackup}
                            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-wait disabled:opacity-50"
                        >
                            <Download size={15} />
                            {isExporting ? 'Exporting…' : 'Export Backup'}
                        </button>
                        <button
                            type="button"
                            onClick={onReturnToMenu}
                            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                        >
                            <House size={15} />
                            Return to Menu
                        </button>
                    </div>
                </div>
            </div>
        </section>
    </div>
);
