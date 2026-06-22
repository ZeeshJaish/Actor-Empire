import React from 'react';
import { Archive, X } from 'lucide-react';
import { Universe } from '../../../../types';

interface UniverseRetirementDialogProps {
    universe: Universe;
    onClose: () => void;
    onConfirm: () => void;
}

export const UniverseRetirementDialog: React.FC<UniverseRetirementDialogProps> = ({
    universe,
    onClose,
    onConfirm
}) => (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4" role="alertdialog" aria-modal="true" aria-labelledby="retire-universe-title">
        <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close retirement dialog" />
        <div className="relative w-full overflow-hidden rounded-t-3xl border border-amber-500/25 bg-zinc-950 shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-5">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-300">
                        <Archive size={21} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-amber-300">Legacy Decision</p>
                        <h2 id="retire-universe-title" className="mt-1 text-xl font-black text-white">Retire this universe?</h2>
                    </div>
                </div>
                <button type="button" onClick={onClose} className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white" aria-label="Close" title="Close">
                    <X size={19} />
                </button>
            </div>

            <div className="space-y-4 px-5 py-5">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Universe Archive</p>
                    <p className="mt-1 break-words text-base font-black text-white">{universe.name}</p>
                </div>
                <p className="text-sm leading-relaxed text-zinc-300">
                    New phases, sagas, and event films will stop. Existing releases, characters, records, and timeline history stay visible.
                </p>
                <p className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-3 text-xs leading-relaxed text-sky-200">
                    Legacy merchandise can continue at reduced catalog demand. You can later relaunch the IP through a reboot project.
                </p>
            </div>

            <div className="flex gap-3 border-t border-zinc-800 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
                <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-300 transition-colors hover:bg-zinc-900">
                    Keep Active
                </button>
                <button type="button" onClick={onConfirm} className="flex-[1.25] rounded-xl bg-amber-400 px-4 py-3 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-amber-300">
                    <span className="flex items-center justify-center gap-2"><Archive size={15} /> Retire Universe</span>
                </button>
            </div>
        </div>
    </div>
);
