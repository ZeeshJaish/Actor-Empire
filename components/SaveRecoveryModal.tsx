import React from 'react';
import { ArchiveRestore, ShieldCheck } from 'lucide-react';

interface SaveRecoveryModalProps {
    playerName: string;
    age: number;
    week: number;
    violations: string[];
    isRecovering: boolean;
    onRecover: () => void;
    onCancel: () => void;
}

export const SaveRecoveryModal: React.FC<SaveRecoveryModalProps> = ({
    playerName,
    age,
    week,
    isRecovering,
    onRecover,
    onCancel,
}) => (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/90 p-5 backdrop-blur-md">
        <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-recovery-title"
            className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-amber-300/25 bg-[#11100e] shadow-[0_28px_100px_rgba(0,0,0,0.75)]"
        >
            <div className="h-1 bg-gradient-to-r from-amber-500 via-yellow-200 to-emerald-400" />
            <div className="p-6">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/10 text-emerald-300">
                        <ShieldCheck size={27} />
                    </div>
                    <div className="min-w-0 pt-1">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Career protection</div>
                        <h2 id="save-recovery-title" className="mt-1 text-2xl font-black leading-tight text-white">Safe backup found</h2>
                    </div>
                </div>

                <p className="mt-5 text-sm font-semibold leading-relaxed text-zinc-400">
                    The latest career file did not pass its safety check. Your last verified save is ready and has not been changed.
                </p>

                <div className="mt-5 border-y border-white/10 py-4">
                    <div className="truncate text-lg font-black text-white">{playerName}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                        <span>Age {age}</span>
                        <span className="text-amber-400">•</span>
                        <span>Week {week}</span>
                    </div>
                </div>

                <div className="mt-6 space-y-2.5">
                    <button
                        type="button"
                        disabled={isRecovering}
                        onClick={onRecover}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-4 text-sm font-black uppercase tracking-[0.12em] text-black transition-colors hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60"
                    >
                        <ArchiveRestore size={18} />
                        {isRecovering ? 'Recovering…' : 'Recover Safe Save'}
                    </button>
                    <button
                        type="button"
                        disabled={isRecovering}
                        onClick={onCancel}
                        className="w-full rounded-2xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
                    >
                        Back to Save Slots
                    </button>
                </div>
            </div>
        </section>
    </div>
);

