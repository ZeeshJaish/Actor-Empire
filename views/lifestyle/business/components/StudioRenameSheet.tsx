import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Clock3, Megaphone, X } from 'lucide-react';
import type { Business, Player } from '../../../../types';
import {
    getStudioNameError,
    getStudioRenameAvailability,
    getStudioRenameQuote,
    normalizeStudioName,
    renameAcquiredStudio,
    STUDIO_NAME_MAX_LENGTH,
} from '../../../../services/studioRebrand';

interface StudioRenameSheetProps {
    player: Player;
    studio: Business;
    onClose: () => void;
    onRenamed: (player: Player, newName: string) => void;
}

const formatMoney = (value: number) => {
    const safe = Math.max(0, Number(value) || 0);
    if (safe >= 1_000_000_000) return `$${(safe / 1_000_000_000).toFixed(1)}B`;
    if (safe >= 1_000_000) return `$${(safe / 1_000_000).toFixed(1)}M`;
    if (safe >= 1_000) return `$${(safe / 1_000).toFixed(0)}K`;
    return `$${safe.toFixed(0)}`;
};

export const StudioRenameSheet: React.FC<StudioRenameSheetProps> = ({
    player,
    studio,
    onClose,
    onRenamed,
}) => {
    const [studioNameDraft, setStudioNameDraft] = React.useState('');
    const [feedback, setFeedback] = React.useState('');
    const quote = getStudioRenameQuote(player, studio);
    const renameAvailability = getStudioRenameAvailability(player, studio);
    const nameError = getStudioNameError(player, studio, studioNameDraft);
    const canFundRename = studio.balance >= quote.cost;

    React.useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [onClose]);

    const confirmRename = () => {
        const result = renameAcquiredStudio({
            player,
            studioId: studio.id,
            value: studioNameDraft,
        });
        if (!result.success) {
            setFeedback(result.error || 'The studio could not be renamed.');
            return;
        }
        onRenamed(result.player, normalizeStudioName(studioNameDraft));
    };

    return (
        <div
            className="absolute inset-0 z-[110] flex items-end justify-center bg-black/80 px-3 backdrop-blur-sm sm:items-center"
            onClick={onClose}
        >
            <motion.section
                role="dialog"
                aria-modal="true"
                aria-labelledby="studio-rename-title"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 28 }}
                transition={{ duration: 0.2 }}
                onClick={event => event.stopPropagation()}
                className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border-2 border-[#3b3020] bg-[#100d09] px-4 pt-3 shadow-[0_-14px_50px_rgba(0,0,0,0.6)] sm:rounded-[28px]"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
                <div className="mx-auto h-1 w-12 rounded-full bg-white/15 sm:hidden" />
                <div className="mt-3 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-amber-300/25 bg-amber-300/[0.08] text-amber-200">
                            <Megaphone size={19} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[7px] font-black uppercase tracking-[0.22em] text-amber-300">Public Rebrand</div>
                            <h2 id="studio-rename-title" className="mt-1 text-xl font-black uppercase leading-none text-white">Rename this studio</h2>
                            <p className="mt-2 text-[11px] font-bold leading-relaxed text-zinc-400">
                                The new name updates your studio group immediately and becomes an industry story.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close rename studio"
                        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[13px] border border-white/10 bg-black/40 text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="mt-5 rounded-[17px] border border-white/[0.08] bg-black/35 p-3">
                    <div className="text-[7px] font-black uppercase tracking-[0.15em] text-zinc-500">Current name</div>
                    <div className="mt-1 break-words text-sm font-black leading-snug text-white">{studio.name}</div>
                </div>

                <label htmlFor="studio-name-draft" className="mt-4 block text-[8px] font-black uppercase tracking-[0.16em] text-zinc-400">
                    New studio name
                </label>
                <div className={`mt-2 rounded-[17px] border-2 bg-black/45 px-3 py-2.5 ${
                    studioNameDraft && nameError ? 'border-rose-400/55' : 'border-white/10 focus-within:border-amber-300/50'
                }`}>
                    <input
                        id="studio-name-draft"
                        autoFocus
                        value={studioNameDraft}
                        maxLength={STUDIO_NAME_MAX_LENGTH}
                        disabled={!renameAvailability.allowed}
                        onChange={event => {
                            setStudioNameDraft(event.target.value);
                            setFeedback('');
                        }}
                        placeholder="Enter the new name"
                        className="w-full bg-transparent text-base font-black text-white outline-none placeholder:text-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-600"
                    />
                    <div className="mt-1 text-right font-mono text-[7px] font-black text-zinc-600">
                        {studioNameDraft.length}/{STUDIO_NAME_MAX_LENGTH}
                    </div>
                </div>
                <div aria-live="polite" className="min-h-5 pt-1.5 text-[9px] font-bold text-rose-300">
                    {studioNameDraft ? (feedback || nameError || '') : feedback}
                </div>

                {!renameAvailability.allowed ? (
                    <div role="status" className="mt-2 flex gap-3 rounded-[17px] border border-amber-300/25 bg-amber-300/[0.06] p-3">
                        <Clock3 size={18} className="mt-0.5 shrink-0 text-amber-300" />
                        <div>
                            <div className="text-[9px] font-black uppercase text-amber-100">Rebrand temporarily locked</div>
                            <p className="mt-1 text-[9px] font-bold leading-relaxed text-zinc-400">{renameAvailability.message}</p>
                        </div>
                    </div>
                ) : null}

                <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-[15px] border border-amber-300/15 bg-amber-300/[0.06] p-3">
                        <div className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-500">One-time cost</div>
                        <div className="mt-1 font-mono text-lg font-black text-amber-200">{formatMoney(quote.cost)}</div>
                    </div>
                    <div className="rounded-[15px] border border-sky-300/15 bg-sky-300/[0.05] p-3">
                        <div className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-500">Paid by</div>
                        <div className="mt-1 text-sm font-black uppercase text-sky-100">Studio capital</div>
                    </div>
                </div>
                <p className="mt-2 text-[9px] font-bold leading-relaxed text-zinc-500">
                    Covers legal filings, signage and the public launch. Your personal cash is not charged.
                </p>

                {quote.hasProtectedNamePromise ? (
                    <div className="mt-4 flex gap-3 rounded-[17px] border-2 border-rose-400/35 bg-rose-400/[0.08] p-3 text-rose-100">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-300" />
                        <div>
                            <div className="text-[9px] font-black uppercase">This breaks your closing promise</div>
                            <p className="mt-1 text-[9px] font-bold leading-relaxed text-rose-100/70">
                                You signed a promise to protect this name. Renaming will trigger a lawsuit from the former owners, with the first court hearing next week. You may settle, restore the name, or fight and risk larger damages.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="mt-4 flex gap-3 rounded-[17px] border border-emerald-300/20 bg-emerald-300/[0.05] p-3 text-emerald-100">
                        <Megaphone size={17} className="mt-0.5 shrink-0 text-emerald-300" />
                        <p className="text-[9px] font-bold leading-relaxed text-emerald-100/75">
                            Expect neutral industry gossip and curiosity. The rename itself does not lower the studio’s performance.
                        </p>
                    </div>
                )}

                {!canFundRename ? (
                    <div role="alert" className="mt-3 rounded-[14px] border border-rose-400/25 bg-rose-400/[0.07] px-3 py-2 text-[9px] font-bold text-rose-200">
                        This studio has {formatMoney(studio.balance)}. Inject more capital from the Finance tab before renaming.
                    </div>
                ) : null}

                <div className="mt-5 grid grid-cols-[0.8fr_1.2fr] gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-12 cursor-pointer rounded-[16px] border-2 border-white/10 bg-black/35 px-3 text-[10px] font-black uppercase text-zinc-300 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    >
                        Keep name
                    </button>
                    <button
                        type="button"
                        onClick={confirmRename}
                        disabled={!renameAvailability.allowed || !studioNameDraft || Boolean(nameError) || !canFundRename}
                        className="min-h-12 cursor-pointer rounded-[16px] border-2 border-amber-200/40 bg-amber-300 px-3 text-[10px] font-black uppercase text-black shadow-[0_5px_0_#6b4304] transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 active:translate-y-0.5 active:shadow-[0_2px_0_#6b4304] disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
                    >
                        Pay {formatMoney(quote.cost)} & Rename
                    </button>
                </div>
            </motion.section>
        </div>
    );
};
