import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
    Check,
    Clapperboard,
    BookOpenCheck,
    FileWarning,
    Film,
    GitBranch,
    Layers3,
    LibraryBig,
    LockKeyhole,
    PenLine,
    RefreshCw,
    ShieldCheck,
    Sparkles,
    Tv,
    X,
} from 'lucide-react';
import { OwnedRight, OwnedRightDevelopmentChoice } from '../../../../types';

interface OwnedRightDevelopmentBriefProps {
    ownedRight: OwnedRight;
    currentWeek: number;
    onClose: () => void;
    onAuthorize: (choice: OwnedRightDevelopmentChoice) => string | null;
    onAuthorized: (destination: 'ASSIGN_WRITER' | 'ACTIVE_SCRIPTS' | 'RIGHTS_LIBRARY', createdScriptId: string) => void;
}

const formatDealType = (value: string) => value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());

const SelectionCard: React.FC<{
    active: boolean;
    description: string;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    tone?: 'MOVIE' | 'SERIES' | 'CREATIVE';
    compact?: boolean;
}> = ({ active, description, icon, label, onClick, tone = 'CREATIVE', compact = false }) => {
    const activeTone = tone === 'MOVIE'
        ? 'border-sky-300 bg-sky-500/15 shadow-[0_0_26px_rgba(14,165,233,0.14)]'
        : tone === 'SERIES'
            ? 'border-rose-400 bg-rose-600/15 shadow-[0_0_26px_rgba(225,29,72,0.14)]'
            : 'border-amber-300 bg-amber-300/10 shadow-[0_0_24px_rgba(245,158,11,0.09)]';
    const accentText = tone === 'MOVIE' ? 'text-sky-200' : tone === 'SERIES' ? 'text-rose-200' : 'text-amber-200';
    const checkTone = tone === 'MOVIE' ? 'bg-sky-500' : tone === 'SERIES' ? 'bg-rose-600' : 'bg-amber-300 text-black';
    const selectedLabel = tone === 'MOVIE' ? 'Movie Selected' : tone === 'SERIES' ? 'Series Selected' : 'Selected';

    return (
    <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={`relative overflow-hidden rounded-[22px] border text-left transition-all duration-200 ${compact ? 'min-h-24 p-4' : 'min-h-32 p-4'} ${
            active ? activeTone : 'border-white/10 bg-gradient-to-br from-zinc-950 to-black hover:border-white/25'
        }`}
    >
        <div className={compact ? 'flex items-center gap-4 pr-8' : ''}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${active ? `border-current ${accentText}` : 'border-zinc-800 text-zinc-600'}`}>
                {icon}
            </div>
            <div className={compact ? 'min-w-0 flex-1' : ''}>
                <p className={`${compact ? '' : 'mt-4'} text-xs font-black uppercase tracking-[0.16em] text-white`}>{label}</p>
                <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-zinc-500">{description}</p>
            </div>
        </div>
        {active ? (
            <span className={`absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[7px] font-black uppercase tracking-widest text-white ${checkTone}`}>
                <Check size={11} strokeWidth={3} /> {selectedLabel}
            </span>
        ) : null}
    </button>
    );
};

const LockedCard: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
    <div className="relative min-h-24 overflow-hidden rounded-2xl border border-dashed border-zinc-800/80 bg-black/35 p-4 text-left opacity-60">
        <div className="flex items-start justify-between gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-zinc-800 text-zinc-700">{icon}</div>
            <LockKeyhole size={15} className="text-zinc-700" />
        </div>
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{label} · Locked</p>
        <p className="mt-1.5 text-[10px] font-semibold leading-relaxed text-zinc-700">Release this IP on screen to unlock.</p>
    </div>
);

export const OwnedRightDevelopmentBrief: React.FC<OwnedRightDevelopmentBriefProps> = ({
    ownedRight,
    currentWeek,
    onClose,
    onAuthorize,
    onAuthorized,
}) => {
    const reduceMotion = useReducedMotion();
    const [format, setFormat] = useState<OwnedRightDevelopmentChoice['format']>(
        ownedRight.propertyType === 'CATALOG' ? 'SERIES' : 'MOVIE',
    );
    const [strategy, setStrategy] = useState<OwnedRightDevelopmentChoice['strategy']>('FRESH_ADAPTATION');
    const [authorizedScriptId, setAuthorizedScriptId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const permanent = ownedRight.expiresAtWeek === undefined;
    const weeksLeft = permanent ? null : Math.max(0, (ownedRight.expiresAtWeek || currentWeek) - currentWeek);
    const projectsRemaining = ownedRight.projectsAllowed === undefined
        ? null
        : Math.max(0, ownedRight.projectsAllowed - ownedRight.projectsUsed);
    const authorized = Boolean(authorizedScriptId);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    const handleAuthorize = () => {
        if (authorized) return;
        const createdScriptId = onAuthorize({ format, strategy });
        if (!createdScriptId) {
            setError('Authorization failed because the rights are expired or the project allowance has been used.');
            return;
        }
        setError(null);
        setAuthorizedScriptId(createdScriptId);
    };

    return (
        <motion.div
            className="fixed inset-0 z-[190] flex items-end justify-center bg-black/90 backdrop-blur-md md:items-center md:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={authorized ? undefined : onClose}
        >
            <motion.section
                role="dialog"
                aria-modal="true"
                aria-label={`Develop ${ownedRight.title}`}
                initial={reduceMotion ? false : { opacity: 0, y: 42, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
                onClick={event => event.stopPropagation()}
                className="relative flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-amber-300/25 bg-[#080808] text-white shadow-[0_35px_120px_rgba(0,0,0,0.82)] md:max-h-[92dvh] md:rounded-[28px]"
            >
                <header className="relative shrink-0 overflow-hidden border-b border-white/10 px-5 py-5 md:px-7">
                    <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 82% 10%, ${ownedRight.accent}33, transparent 52%)` }} />
                    <div className="relative flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 rotate-[-3deg] items-center justify-center rounded-xl border border-amber-300/40 bg-amber-300/10 text-amber-200 shadow-[0_0_22px_rgba(245,158,11,0.12)]">
                            <Clapperboard size={23} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.26em] text-amber-300">Development Authorization</p>
                            <h2 className="mt-2 truncate text-2xl font-black uppercase leading-none md:text-3xl">{ownedRight.title}</h2>
                            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                                {formatDealType(ownedRight.dealType)} · {formatDealType(ownedRight.propertyType)}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={authorized}
                            aria-label="Close development brief"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-500 transition-colors hover:border-white/30 hover:text-white disabled:opacity-30"
                        >
                            <X size={19} />
                        </button>
                    </div>
                </header>

                <div className="overflow-y-auto overscroll-contain px-5 py-5 md:px-7 md:py-6">
                    <div className="flex flex-wrap gap-2">
                        <div className="flex min-h-11 flex-1 items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-2 text-xs font-black text-zinc-200">
                            <ShieldCheck size={15} className="shrink-0 text-emerald-300" />
                            <span>{permanent ? 'Permanent Control' : `${weeksLeft} Weeks Left`}</span>
                        </div>
                        <div className="flex min-h-11 flex-1 items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-4 py-2 text-xs font-black text-zinc-200">
                            <Layers3 size={15} className="shrink-0 text-amber-300" />
                            <span>{projectsRemaining === null ? 'Unlimited Projects' : `${projectsRemaining} Projects Left`}</span>
                        </div>
                    </div>

                    {ownedRight.creativeGuarantee ? (
                        <div className="mt-4 flex gap-3 border-l-2 border-violet-400 bg-violet-400/[0.06] px-4 py-3">
                            <FileWarning size={17} className="mt-0.5 shrink-0 text-violet-300" />
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-violet-300">{ownedRight.creativeGuarantee.title}</p>
                                <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-400">{ownedRight.creativeGuarantee.description}</p>
                            </div>
                        </div>
                    ) : null}

                    <section className="mt-6">
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">1 · Choose format</p>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <SelectionCard
                                active={format === 'MOVIE'}
                                description="Build a theatrical or streaming feature through the current movie pipeline."
                                icon={<Film size={20} />}
                                label="Movie"
                                onClick={() => setFormat('MOVIE')}
                                tone="MOVIE"
                            />
                            <SelectionCard
                                active={format === 'SERIES'}
                                description="Build an episodic project through the current series pipeline."
                                icon={<Tv size={20} />}
                                label="Series"
                                onClick={() => setFormat('SERIES')}
                                tone="SERIES"
                            />
                        </div>
                    </section>

                    <section className="mt-6">
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">2 · Choose creative play</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <SelectionCard
                                active={strategy === 'FRESH_ADAPTATION'}
                                description="A new screen interpretation that starts inside the existing concept workflow."
                                icon={<Sparkles size={20} />}
                                label="Fresh Adaptation"
                                onClick={() => setStrategy('FRESH_ADAPTATION')}
                                compact
                            />
                            <SelectionCard
                                active={strategy === 'REBOOT'}
                                description="A deliberate new-era take recognized by the existing reboot and franchise rules."
                                icon={<RefreshCw size={20} />}
                                label="Reboot"
                                onClick={() => setStrategy('REBOOT')}
                                compact
                            />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <LockedCard icon={<Film size={18} />} label="Sequel" />
                            <LockedCard icon={<GitBranch size={18} />} label="Spin-off" />
                        </div>
                    </section>

                    <div className={`mt-6 rounded-2xl border-l-4 p-4 ${format === 'MOVIE' ? 'border-sky-400 bg-sky-500/[0.07]' : 'border-rose-500 bg-rose-600/[0.07]'}`}>
                        <p className="text-[8px] font-black uppercase tracking-[0.18em] text-zinc-600">Authorization result</p>
                        <p className="mt-2 text-sm font-black text-white">
                            {format === 'MOVIE' ? 'Movie' : 'Series'} · {strategy === 'REBOOT' ? 'Reboot' : 'Fresh Adaptation'}
                        </p>
                        <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">
                            Uses one project allowance. The concept enters Active Scripts, where the next move is assigning a writer.
                        </p>
                    </div>

                    {error ? (
                        <div role="alert" className="mt-4 border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-200">{error}</div>
                    ) : null}
                </div>

                <footer className="shrink-0 border-t border-white/10 bg-black px-5 py-4 md:px-7">
                    <button
                        type="button"
                        onClick={handleAuthorize}
                        disabled={authorized}
                        className="flex min-h-[54px] w-full items-center justify-center gap-2 bg-amber-300 px-5 text-[10px] font-black uppercase tracking-[0.18em] text-black transition-colors hover:bg-amber-200 disabled:bg-emerald-400"
                    >
                        {authorized ? <Check size={18} /> : <Clapperboard size={18} />}
                        {authorized ? 'Development Authorized' : 'Begin Development'}
                    </button>
                </footer>

                <AnimatePresence>
                    {authorized ? (
                        <motion.div
                            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="absolute inset-0 z-20 flex items-end justify-center bg-black/80 p-4 backdrop-blur-md md:items-center md:p-8"
                        >
                            <div className="w-full max-w-md overflow-hidden rounded-[26px] border border-emerald-300/35 bg-[#0b110f] shadow-[0_26px_90px_rgba(0,0,0,0.72),0_0_40px_rgba(52,211,153,0.12)]">
                                <div className="relative overflow-hidden px-6 pb-5 pt-7 text-center">
                                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.16),transparent_62%)]" />
                                    <motion.div
                                        initial={reduceMotion ? false : { scale: 1.3, rotate: -8 }}
                                        animate={{ scale: 1, rotate: -3 }}
                                        className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-300 bg-emerald-300/10 text-emerald-300"
                                    >
                                        <ShieldCheck size={34} />
                                    </motion.div>
                                    <p className="relative mt-5 text-[9px] font-black uppercase tracking-[0.24em] text-emerald-300">Project Authorized</p>
                                    <h3 className="relative mt-2 text-2xl font-black uppercase leading-tight text-white">
                                        Untitled {ownedRight.title} Project
                                    </h3>
                                    <p className="relative mt-3 text-xs font-semibold leading-relaxed text-zinc-400">
                                        Your {format === 'MOVIE' ? 'movie' : 'series'} concept entered Active Scripts. Assign a writer to begin script development.
                                    </p>
                                </div>
                                <div className="space-y-2 border-t border-white/10 bg-black/35 p-4">
                                    <button
                                        type="button"
                                        onClick={() => authorizedScriptId && onAuthorized('ASSIGN_WRITER', authorizedScriptId)}
                                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-[9px] font-black uppercase tracking-[0.16em] text-black transition-colors hover:bg-amber-200"
                                    >
                                        <PenLine size={16} /> Assign Writer
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => authorizedScriptId && onAuthorized('ACTIVE_SCRIPTS', authorizedScriptId)}
                                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-[9px] font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/5"
                                    >
                                        <BookOpenCheck size={15} /> Go to Active Scripts
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => authorizedScriptId && onAuthorized('RIGHTS_LIBRARY', authorizedScriptId)}
                                        className="flex min-h-11 w-full items-center justify-center gap-2 px-4 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500 transition-colors hover:text-zinc-300"
                                    >
                                        <LibraryBig size={14} /> Stay in IP Library
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </motion.section>
        </motion.div>
    );
};
