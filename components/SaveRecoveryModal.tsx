import React, { useState } from 'react';
import { ArchiveRestore, ShieldCheck } from 'lucide-react';
import { RecoveryReportCard } from './RecoveryReportCard';
import type { RecoveryReportHandle } from '../services/recoveryReports';
import type { RecoveryPoint, RecoveryReason } from '../services/recoveryList';

/* Week-speed Phase 2a (2026-11-17): the recovery list (services/recoveryList.ts). It opens only when a save fails to
   load or verify, or when a version we flagged as buggy wrote this career (D15). It lists the copies it can restore,
   newest first, says which weeks a restore loses, and the button is the confirmation. */
interface SaveRecoveryModalProps {
    playerName: string;
    reason: RecoveryReason;
    /** Newest first; each with the weeks a restore to it would lose. */
    points: Array<RecoveryPoint & { weeksLost: number }>;
    /** The last week this career showed on screen, when known. */
    lastShown: { age: number; week: number } | null;
    flaggedVersion?: string;
    isRecovering: boolean;
    onRecover: (pointIndex: number) => void;
    onCancel: () => void;
    /** Sends a report about this save (RecoveryReportCard). */
    onSendReport?: () => RecoveryReportHandle | null;
}

const savedOn = (savedAt: number | null): string | null => {
    if (savedAt === null) return null;
    try { return new Date(savedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return null; }
};

export const SaveRecoveryModal: React.FC<SaveRecoveryModalProps> = ({
    playerName,
    reason,
    points,
    lastShown,
    flaggedVersion,
    isRecovering,
    onRecover,
    onCancel,
    onSendReport,
}) => {
    const [selected, setSelected] = useState(0);
    const point = points[Math.min(selected, points.length - 1)];
    const flagged = reason === 'VERSION_FLAGGED';
    return (
        <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/90 p-5 pt-[max(1.25rem,calc(env(safe-area-inset-top)+10px))] pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+10px))] backdrop-blur-md">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="save-recovery-title"
                className="relative w-full max-w-sm max-h-full overflow-y-auto rounded-[2rem] border border-amber-300/25 bg-[#11100e] shadow-[0_28px_100px_rgba(0,0,0,0.75)]"
            >
                <div className="h-1 bg-gradient-to-r from-amber-500 via-yellow-200 to-emerald-400" />
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/10 text-emerald-300">
                            <ShieldCheck size={27} />
                        </div>
                        <div className="min-w-0 pt-1">
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Career protection</div>
                            <h2 id="save-recovery-title" className="mt-1 text-2xl font-black leading-tight text-white">
                                {flagged ? 'A safe copy is ready' : 'Safe backup found'}
                            </h2>
                        </div>
                    </div>

                    <p className="mt-5 text-sm font-semibold leading-relaxed text-zinc-400">
                        {flagged
                            ? `Version ${flaggedVersion || ''} had a problem that can affect careers. Your copy from before it is safe and has not been changed.`
                            : 'The latest career file did not pass its safety check. Your last verified save is ready and has not been changed.'}
                    </p>

                    <div className="mt-5 border-y border-white/10 py-4">
                        <div className="break-words text-lg font-black text-white">{playerName}</div>
                        {points.length === 1 ? (
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                                <span>Age {point.age}</span>
                                <span className="text-amber-400">•</span>
                                <span>Week {point.week}</span>
                                {savedOn(point.savedAt) && <><span className="text-amber-400">•</span><span>{savedOn(point.savedAt)}</span></>}
                            </div>
                        ) : (
                            <div className="mt-3 space-y-2" role="radiogroup" aria-label="Copies you can restore">
                                {points.map((item, index) => (
                                    <button
                                        key={`${item.kind}:${item.age}:${item.week}:${index}`}
                                        type="button"
                                        role="radio"
                                        aria-checked={index === selected}
                                        disabled={isRecovering}
                                        onClick={() => setSelected(index)}
                                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-black uppercase tracking-[0.14em] transition-colors ${index === selected ? 'border-amber-300/60 bg-amber-300/10 text-white' : 'border-white/10 text-zinc-400 hover:bg-white/5'}`}
                                    >
                                        <span>Age {item.age} • Week {item.week}</span>
                                        {savedOn(item.savedAt) && <span className="text-zinc-500">{savedOn(item.savedAt)}</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-300" data-recovery-loss>
                        {point.weeksLost > 0 && lastShown
                            ? `Restoring goes back to age ${point.age}, week ${point.week}. The ${point.weeksLost} week${point.weeksLost === 1 ? '' : 's'} after it, up to age ${lastShown.age}, week ${lastShown.week}, will be lost.`
                            : `Restoring goes back to age ${point.age}, week ${point.week}.`}
                        {' '}Anything you bought stays yours.
                    </p>

                    {onSendReport && <div className="mt-5"><RecoveryReportCard onSend={onSendReport} /></div>}

                    <div className="mt-6 space-y-2.5">
                        <button
                            type="button"
                            disabled={isRecovering}
                            onClick={() => onRecover(Math.min(selected, points.length - 1))}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-4 text-sm font-black uppercase tracking-[0.12em] text-black transition-colors hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60"
                        >
                            <ArchiveRestore size={18} />
                            {isRecovering ? 'Recovering…' : flagged ? 'Restore This Copy' : 'Recover Safe Save'}
                        </button>
                        <button
                            type="button"
                            disabled={isRecovering}
                            onClick={onCancel}
                            className="min-h-11 w-full rounded-2xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
                        >
                            {flagged ? 'Keep Playing' : 'Back to Save Slots'}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};
