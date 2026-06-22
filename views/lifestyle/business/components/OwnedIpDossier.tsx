import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
    Archive,
    BarChart3,
    BookOpen,
    ChevronRight,
    Clapperboard,
    Clock,
    Film,
    Flame,
    Globe,
    Layers,
    ShieldCheck,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Users,
    X,
    RefreshCw,
} from 'lucide-react';
import { OwnedRight, Player, Script } from '../../../../types';
import { getOwnedIpPerformance, OwnedIpMomentum } from '../../../../services/ownedIpPerformance';
import { getOwnedRightRenewalQuote } from '../../../../services/rightsNegotiation';

interface OwnedIpDossierProps {
    ownedRight: OwnedRight;
    player: Player;
    studioId: string;
    scripts: Script[];
    currentWeek: number;
    onClose: () => void;
    onDevelop: () => void;
    onOpenProject: (projectId: string) => void;
    onOpenFranchise: () => void;
    onOpenUniverse: () => void;
    onRenew: () => { changed: boolean; message: string };
}

const formatMoney = (value: number) => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace('.0', '')}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace('.0', '')}M`;
    if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
    return `$${Math.round(value)}`;
};

const formatLabel = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());

const getIpTypePresentation = (type: OwnedRight['propertyType']) => {
    if (type === 'CHARACTER') return { label: 'Character IP', Icon: Users, tone: 'border-sky-400/35 bg-sky-400/10 text-sky-300' };
    if (type === 'STORY_WORLD') return { label: 'Story World IP', Icon: Globe, tone: 'border-violet-400/35 bg-violet-400/10 text-violet-300' };
    if (type === 'FRANCHISE') return { label: 'Franchise IP', Icon: Layers, tone: 'border-amber-400/35 bg-amber-400/10 text-amber-300' };
    return { label: 'Catalog IP', Icon: Archive, tone: 'border-teal-400/35 bg-teal-400/10 text-teal-300' };
};

const getMomentumPresentation = (momentum: OwnedIpMomentum) => {
    if (momentum === 'HOT') return { Icon: Flame, tone: 'text-orange-300', surface: 'border-orange-400/25 bg-orange-400/[0.08]' };
    if (momentum === 'RISING') return { Icon: TrendingUp, tone: 'text-emerald-300', surface: 'border-emerald-400/25 bg-emerald-400/[0.08]' };
    if (momentum === 'COOLING') return { Icon: TrendingDown, tone: 'text-sky-300', surface: 'border-sky-400/25 bg-sky-400/[0.08]' };
    return { Icon: BarChart3, tone: momentum === 'UNPROVEN' ? 'text-zinc-500' : 'text-amber-200', surface: 'border-white/10 bg-white/[0.035]' };
};

const metricValue = (value: string, accent = false) => (
    <p className={`mt-1 font-mono text-sm font-black ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</p>
);

export const OwnedIpDossier: React.FC<OwnedIpDossierProps> = ({
    ownedRight,
    player,
    studioId,
    scripts,
    currentWeek,
    onClose,
    onDevelop,
    onOpenProject,
    onOpenFranchise,
    onOpenUniverse,
    onRenew,
}) => {
    const [renewalFeedback, setRenewalFeedback] = useState<string | null>(null);
    const performance = useMemo(() => getOwnedIpPerformance({
        ownedRight,
        studioId,
        scripts,
        activeReleases: player.activeReleases,
        pastProjects: player.pastProjects,
    }), [ownedRight, studioId, scripts, player.activeReleases, player.pastProjects]);
    const ipType = getIpTypePresentation(ownedRight.propertyType);
    const IpTypeIcon = ipType.Icon;
    const momentum = getMomentumPresentation(performance.momentum);
    const MomentumIcon = momentum.Icon;
    const isPermanent = ownedRight.expiresAtWeek === undefined;
    const isStudioOriginal = ownedRight.ownershipSource === 'STUDIO_ORIGINAL';
    const renewalQuote = getOwnedRightRenewalQuote({ ownedRight, currentWeek });
    const weeksLeft = isPermanent ? null : Math.max(0, (ownedRight.expiresAtWeek || 0) - currentWeek);
    const projectsValue = isStudioOriginal
        ? `${performance.releases.length} released`
        : ownedRight.projectsAllowed === undefined
        ? `${ownedRight.projectsUsed} made`
        : `${Math.max(0, ownedRight.projectsAllowed - ownedRight.projectsUsed)} left`;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`${ownedRight.title} IP Performance Dossier`}
            className="fixed inset-0 z-[120] overflow-y-auto bg-[#060608]"
        >
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mx-auto min-h-full w-full max-w-3xl pb-28"
            >
                <header className="sticky top-0 z-20 border-b border-white/10 bg-[#08080b] px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[8px] font-black uppercase tracking-[0.24em] text-amber-300">IP Performance Dossier</p>
                            <h2 className="mt-2 truncate text-2xl font-black uppercase leading-none text-white">{ownedRight.title}</h2>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="text-[8px] font-black uppercase tracking-[0.16em] text-zinc-600">{formatLabel(ownedRight.primaryGenre)}</span>
                                <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em] ${ipType.tone}`}>
                                    <IpTypeIcon size={11} /> {ipType.label}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[7px] font-black uppercase tracking-[0.14em] text-emerald-300">
                                    <ShieldCheck size={11} /> {isStudioOriginal ? 'Studio Original' : 'Owned'}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close IP dossier"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-zinc-500 transition-colors hover:text-white"
                        >
                            <X size={19} />
                        </button>
                    </div>
                </header>

                <main className="space-y-7 px-5 py-5">
                    <section>
                        <div className="mb-3 flex items-center gap-2">
                            <ShieldCheck size={14} className="text-amber-300" />
                            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300">Ownership Command</h3>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/[0.025] sm:grid-cols-4 sm:divide-y-0">
                            {[
                                ['Control', isStudioOriginal ? 'Studio Original' : formatLabel(ownedRight.dealType)],
                                ['Timeline', isPermanent ? 'Permanent' : `${weeksLeft} weeks`],
                                ['Projects', projectsValue],
                                [isStudioOriginal ? 'Created' : 'Acquired', isStudioOriginal ? 'In House' : formatMoney(ownedRight.purchasePrice)],
                            ].map(([label, value]) => (
                                <div key={label} className="px-3 py-3">
                                    <p className="text-[7px] font-black uppercase tracking-[0.15em] text-zinc-600">{label}</p>
                                    <p className="mt-1 text-xs font-black text-zinc-200">{value}</p>
                                </div>
                            ))}
                        </div>
                        {ownedRight.creativeGuarantee ? (
                            <div className="mt-3 border-l-2 border-violet-400 bg-violet-400/[0.06] px-4 py-3">
                                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-violet-300">Restriction · {ownedRight.creativeGuarantee.title}</p>
                                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{ownedRight.creativeGuarantee.description}</p>
                            </div>
                        ) : null}
                    </section>

                    <section>
                        <div className="mb-3 flex items-center gap-2">
                            <Layers size={14} className="text-amber-300" />
                            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300">Expansion Command</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={onOpenFranchise}
                                className="group rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-3 text-left transition-colors hover:border-amber-300/40"
                            >
                                <span className="flex items-center justify-between text-amber-300">
                                    <Layers size={16} /> <ChevronRight size={14} />
                                </span>
                                <span className="mt-3 block text-[9px] font-black uppercase tracking-[0.13em] text-white">Franchise Command</span>
                                <span className="mt-1 block text-[8px] leading-relaxed text-zinc-600">Sequels, spin-offs, finales and reboots.</span>
                            </button>
                            <button
                                type="button"
                                onClick={onOpenUniverse}
                                className="group rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-3 py-3 text-left transition-colors hover:border-violet-300/40"
                            >
                                <span className="flex items-center justify-between text-violet-300">
                                    <Globe size={16} /> <ChevronRight size={14} />
                                </span>
                                <span className="mt-3 block text-[9px] font-black uppercase tracking-[0.13em] text-white">Universe Command</span>
                                <span className="mt-1 block text-[8px] leading-relaxed text-zinc-600">Shared canon, sagas, phases and events.</span>
                            </button>
                        </div>
                        <div className="mt-2 flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] text-[8px] font-black uppercase tracking-[0.13em] text-zinc-500"
                            >
                                <Clock size={13} /> Hold IP
                            </button>
                            {renewalQuote.available ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const result = onRenew();
                                        setRenewalFeedback(result.message);
                                    }}
                                    className="flex min-h-10 flex-[1.3] items-center justify-center gap-2 rounded-lg border border-sky-400/25 bg-sky-400/[0.08] text-[8px] font-black uppercase tracking-[0.13em] text-sky-300"
                                >
                                    <RefreshCw size={13} /> Renew Licence · {formatMoney(renewalQuote.cost)}
                                </button>
                            ) : null}
                        </div>
                        {renewalFeedback ? (
                            <p className="mt-2 border-l-2 border-sky-400 px-3 py-2 text-[9px] text-sky-200">{renewalFeedback}</p>
                        ) : null}
                    </section>

                    <section>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <BarChart3 size={14} className="text-amber-300" />
                                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300">Performance Pulse</h3>
                            </div>
                            <span className="text-[7px] font-black uppercase tracking-[0.15em] text-zinc-700">Existing release data</span>
                        </div>
                        <div className="grid grid-cols-4 divide-x divide-white/10 border-y border-white/10 bg-white/[0.02] py-3">
                            <div className="min-w-0 px-2 first:pl-0">
                                <p className="text-[6px] font-black uppercase tracking-[0.13em] text-zinc-600">Lifetime Gross</p>
                                {metricValue(performance.releases.length ? formatMoney(performance.lifetimeGross) : 'Unproven', performance.lifetimeGross > 0)}
                            </div>
                            <div className="min-w-0 px-2">
                                <p className="text-[6px] font-black uppercase tracking-[0.13em] text-zinc-600">Avg Rating</p>
                                {metricValue(performance.averageRating === null ? '—' : performance.averageRating.toFixed(1))}
                            </div>
                            <div className="min-w-0 px-2">
                                <p className="text-[6px] font-black uppercase tracking-[0.13em] text-zinc-600">Releases</p>
                                {metricValue(String(performance.releases.length))}
                            </div>
                            <div className="min-w-0 px-2 pr-0">
                                <p className="text-[6px] font-black uppercase tracking-[0.13em] text-zinc-600">Awards</p>
                                {metricValue(String(performance.awardsWon))}
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                                <p className="text-[7px] font-black uppercase tracking-[0.14em] text-zinc-600">Audience Strength</p>
                                <div className="mt-2 flex items-center gap-2 text-sm font-black uppercase text-violet-200">
                                    <Users size={15} /> {formatLabel(performance.audienceStrength)}
                                </div>
                            </div>
                            <div className={`rounded-xl border px-3 py-3 ${momentum.surface}`}>
                                <p className="text-[7px] font-black uppercase tracking-[0.14em] text-zinc-600">Momentum</p>
                                <div className={`mt-2 flex items-center gap-2 text-sm font-black uppercase ${momentum.tone}`}>
                                    <MomentumIcon size={15} /> {formatLabel(performance.momentum)}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="mb-3 flex items-center gap-2">
                            <Film size={14} className="text-amber-300" />
                            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300">Screen History</h3>
                        </div>
                        {performance.releases.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-6 text-center">
                                <Sparkles size={24} className="mx-auto text-zinc-700" />
                                <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">No screen releases yet</p>
                                <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">This IP is unproven. Its first release will establish audience strength and momentum.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/10 border-y border-white/10">
                                {performance.releases.map(release => (
                                    <div key={release.id} className="flex items-center gap-3 py-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-zinc-500">
                                            {release.projectType === 'SERIES' ? <BookOpen size={15} /> : <Film size={15} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-black uppercase text-white">{release.title}</p>
                                            <p className="mt-1 text-[7px] font-black uppercase tracking-[0.13em] text-zinc-600">
                                                {release.projectType} · {release.state} · {formatMoney(release.gross)} {release.rating === null ? '' : `· ${release.rating.toFixed(1)} ★`}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onOpenProject(release.id)}
                                            className="flex shrink-0 items-center gap-1 text-[7px] font-black uppercase tracking-[0.12em] text-amber-300"
                                        >
                                            Open Project <ChevronRight size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <div className="mb-3 flex items-center gap-2">
                            <Clapperboard size={14} className="text-amber-300" />
                            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300">Development Pipeline</h3>
                        </div>
                        {performance.linkedScripts.length === 0 ? (
                            <p className="border-l-2 border-zinc-800 py-2 pl-4 text-[10px] text-zinc-600">No active scripts are connected to this IP.</p>
                        ) : (
                            <div className="space-y-2">
                                {performance.linkedScripts.map(script => (
                                    <div key={script.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2.5">
                                        <div className="min-w-0">
                                            <p className="truncate text-[11px] font-black uppercase text-zinc-200">{script.title}</p>
                                            <p className="mt-1 text-[7px] font-black uppercase tracking-[0.13em] text-zinc-600">{script.projectType} · {formatLabel(script.status)}</p>
                                        </div>
                                        <span className="flex shrink-0 items-center gap-1 text-[7px] font-black uppercase tracking-[0.12em] text-zinc-500">
                                            <Clock size={11} /> Pipeline
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </main>

            </motion.div>
            <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#08080b] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                <div className="mx-auto flex w-full max-w-3xl gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="min-h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.035] text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400"
                        >
                            Back to IP Library
                        </button>
                        <button
                            type="button"
                            onClick={isStudioOriginal ? onOpenFranchise : onDevelop}
                            className="flex min-h-11 flex-[1.4] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-[8px] font-black uppercase tracking-[0.15em] text-black"
                        >
                            {isStudioOriginal ? <Layers size={14} /> : <Clapperboard size={14} />}
                            {isStudioOriginal ? 'Open Franchise Command' : 'Develop IP'}
                        </button>
                </div>
            </footer>
        </div>
    );
};
