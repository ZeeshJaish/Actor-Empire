import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Script } from '../../../../types';

interface DiscardScriptDialogProps {
    script: Script;
    onClose: () => void;
    onConfirm: () => void;
}

export const DiscardScriptDialog: React.FC<DiscardScriptDialogProps> = ({ script, onClose, onConfirm }) => (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4" role="alertdialog" aria-modal="true" aria-labelledby="discard-script-title">
        <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close discard script dialog" />
        <div className="relative w-full sm:max-w-md overflow-hidden rounded-t-3xl sm:rounded-2xl border border-rose-500/25 bg-zinc-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-5">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-400">
                        <AlertTriangle size={21} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-rose-400">Permanent Action</p>
                        <h2 id="discard-script-title" className="mt-1 text-xl font-black text-white">Discard this project?</h2>
                    </div>
                </div>
                <button type="button" onClick={onClose} className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white" aria-label="Close" title="Close">
                    <X size={19} />
                </button>
            </div>

            <div className="space-y-4 px-5 py-5">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">{script.status.replace('_', ' ')}</p>
                    <p className="mt-1 break-words text-base font-black text-white">{script.title}</p>
                </div>
                <p className="text-sm leading-relaxed text-zinc-300">
                    The script and its unfinished production setup will be removed. Money and development time already spent will not be refunded.
                </p>
                {script.lockedStreamingFunding && (
                    <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-3 text-xs leading-relaxed text-emerald-200">
                        Reserved streaming renewal funds stay available for a replacement project.
                    </p>
                )}
            </div>

            <div className="flex gap-3 border-t border-zinc-800 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
                <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-300 transition-colors hover:bg-zinc-900">
                    Keep Project
                </button>
                <button type="button" onClick={onConfirm} className="flex-[1.25] rounded-xl bg-rose-500 px-4 py-3 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-rose-400">
                    <span className="flex items-center justify-center gap-2"><Trash2 size={15} /> Discard</span>
                </button>
            </div>
        </div>
    </div>
);
