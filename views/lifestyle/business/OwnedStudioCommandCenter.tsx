import React from 'react';
import { motion } from 'motion/react';
import {
    ArrowLeft,
    Banknote,
    Building2,
    CheckCircle2,
    ChevronRight,
    Clapperboard,
    Crown,
    FileKey2,
    Film,
    Landmark,
    Layers3,
    ShieldCheck,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react';
import type { Business, Player } from '../../../types';
import { ACQUISITION_COMMITMENTS, getAcquisitionCase } from '../../../services/studioAcquisition';
import { getOperatingModelDefinition } from '../../../services/studioGroup';

interface OwnedStudioCommandCenterProps {
    player: Player;
    studio: Business;
    onBack: () => void;
    onChangeOperatingModel: () => void;
}

const formatMoney = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    const absolute = Math.abs(safe);
    const sign = safe < 0 ? '-' : '';
    if (absolute >= 1_000_000_000) return `${sign}$${(absolute / 1_000_000_000).toFixed(1)}B`;
    if (absolute >= 1_000_000) return `${sign}$${(absolute / 1_000_000).toFixed(1)}M`;
    if (absolute >= 1_000) return `${sign}$${(absolute / 1_000).toFixed(0)}K`;
    return `${sign}$${absolute.toFixed(0)}`;
};

const CommandSection: React.FC<{
    eyebrow: string;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}> = ({ eyebrow, title, icon, children }) => (
    <section className="relative overflow-hidden rounded-[22px] border-2 border-[#29251f] bg-[#0d0c0b] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_7px_0_#020202]">
        <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-amber-300/20 bg-[#2a1b06] text-amber-200 shadow-[0_4px_0_#120a01]">
                {icon}
            </div>
            <div>
                <div className="text-[6px] font-black uppercase tracking-[0.23em] text-amber-300">{eyebrow}</div>
                <h2 className="mt-1 text-[15px] font-black uppercase leading-none text-white">{title}</h2>
            </div>
        </div>
        <div className="mt-4">{children}</div>
    </section>
);

const Meter: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
    <div>
        <div className="flex items-center justify-between gap-3">
            <span className="text-[6px] font-black uppercase tracking-[0.16em] text-zinc-600">{label}</span>
            <span className="font-mono text-[9px] font-black text-white">{Math.round(value)}/100</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
    </div>
);

export const OwnedStudioCommandCenter: React.FC<OwnedStudioCommandCenterProps> = ({
    player,
    studio,
    onBack,
    onChangeOperatingModel,
}) => {
    const acquisitionCase = getAcquisitionCase(player, studio.id);
    const model = getOperatingModelDefinition(studio.studioState?.operatingModel);
    const commitments = player.commitments.filter(commitment => commitment.projectDetails?.studioId === studio.id);
    const releases = player.activeReleases.filter(release => release.projectDetails?.studioId === studio.id);
    const pastProjects = player.pastProjects.filter(project => project.studioId === studio.id);
    const activeSlate = [
        ...(studio.studioState?.concepts || []).map(concept => {
            const script = studio.studioState?.scripts?.find(candidate => candidate.id === concept.scriptId);
            return { id: concept.id, title: script?.title || 'Untitled Development', phase: 'DEVELOPMENT' };
        }),
        ...commitments.map(commitment => ({
            id: commitment.id,
            title: commitment.name,
            phase: (commitment.projectPhase || 'PLANNING').replaceAll('_', ' '),
        })),
        ...releases.map(release => ({
            id: release.id,
            title: release.name,
            phase: release.distributionPhase === 'STREAMING' ? 'STREAMING' : 'RELEASE',
        })),
    ];
    const rightsTitles = [
        ...(studio.studioState?.ownedRights || []).map(right => right.title),
        ...(studio.studioState?.purchasedIPTitles || []),
        ...pastProjects.map(project => project.name),
    ].filter((title, index, titles) => title && titles.indexOf(title) === index);
    const departmentLevels = Object.values(studio.studioState?.departments || {}).reduce<number>((sum, level) => sum + Number(level || 0), 0);
    const equipmentLevels = Object.values(studio.studioState?.equipment || {}).reduce<number>((sum, level) => sum + Number(level || 0), 0);
    const retainedTalent = studio.staff.length + (studio.studioState?.talentRoster?.length || 0);
    const debt = (acquisitionCase?.closing?.verifiedDebt || 0) + (acquisitionCase?.closing?.hiddenLiabilities || 0);
    const weeklyResult = studio.stats.weeklyProfit || 0;
    const signedCommitments = ACQUISITION_COMMITMENTS.filter(commitment => acquisitionCase?.offer?.commitments?.includes(commitment.id));

    const authority = model?.id === 'INDEPENDENT_LABEL'
        ? ['Review performance', 'Set broad mandate', 'Receive profits or absorb losses']
        : model?.id === 'CONTROLLED_SUBSIDIARY'
            ? ['Set strategy and budgets', 'Control leadership', 'Authorize major productions']
            : model?.id === 'FULL_MERGER'
                ? ['Integration authority', 'Transfer catalog and facilities', 'Absorb debt and liabilities']
                : ['Choose an operating model to unlock control authority'];

    return (
        <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="fixed inset-0 z-[70] flex flex-col bg-[#050505] text-white"
        >
            <header className="relative shrink-0 overflow-hidden border-b border-[#29251f] bg-[#0c0a08] px-4 pb-5 pt-12">
                <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
                <div className="relative flex items-start gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border-2 border-[#342c20] bg-[#15110c] text-zinc-400 shadow-[0_4px_0_#020202] active:translate-y-0.5 active:shadow-[0_2px_0_#020202]"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="text-[7px] font-black uppercase tracking-[0.27em] text-amber-300">Studio Command Center</div>
                        <h1 className="mt-1 truncate font-serif text-2xl font-black uppercase italic tracking-tight">{studio.name}</h1>
                        <div className="mt-2 flex items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.14em] text-zinc-400">
                                Owned Studio
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.14em] ${model ? 'border-amber-300/25 bg-amber-300/[0.08] text-amber-200' : 'border-rose-300/25 bg-rose-300/[0.08] text-rose-200'}`}>
                                {model?.label || 'Decision Required'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="relative mt-5 grid grid-cols-3 overflow-hidden rounded-[18px] border-2 border-[#29251f] bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="border-r border-[#29251f] p-3">
                        <div className="text-[5px] font-black uppercase tracking-widest text-zinc-600">Valuation</div>
                        <div className="mt-1 font-mono text-[12px] font-black text-white">{formatMoney(studio.stats.valuation)}</div>
                    </div>
                    <div className="border-r border-[#29251f] p-3">
                        <div className="text-[5px] font-black uppercase tracking-widest text-zinc-600">Capital</div>
                        <div className="mt-1 font-mono text-[12px] font-black text-emerald-300">{formatMoney(studio.balance)}</div>
                    </div>
                    <div className="p-3">
                        <div className="text-[5px] font-black uppercase tracking-widest text-zinc-600">Weekly</div>
                        <div className={`mt-1 flex items-center gap-1 font-mono text-[12px] font-black ${weeklyResult >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {weeklyResult >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {formatMoney(weeklyResult)}
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4 custom-scrollbar">
                <div className="mx-auto max-w-3xl space-y-4">
                    <CommandSection eyebrow="Board Directive" title="Control Authority" icon={<Crown size={19} />}>
                        <div className="grid gap-2">
                            {authority.map(item => (
                                <div key={item} className="flex items-center gap-2 rounded-[12px] border border-white/[0.06] bg-black/35 px-3 py-2">
                                    <CheckCircle2 size={13} className="shrink-0 text-amber-300" />
                                    <span className="text-[8px] font-bold text-zinc-300">{item}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={onChangeOperatingModel}
                            className="mt-3 flex min-h-11 w-full items-center justify-between rounded-[14px] border-2 border-amber-300/30 bg-[#2a1b06] px-3 text-[8px] font-black uppercase tracking-[0.15em] text-amber-100 shadow-[0_4px_0_#120a01] active:translate-y-0.5 active:shadow-[0_2px_0_#120a01]"
                        >
                            Change Operating Model <ChevronRight size={14} />
                        </button>
                    </CommandSection>

                    <CommandSection eyebrow="Company Ledger" title="Financial Position" icon={<Banknote size={19} />}>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                ['Annual Revenue', formatMoney((studio.stats.weeklyRevenue || 0) * 52), 'text-emerald-300'],
                                ['Annual Expenses', formatMoney((studio.stats.weeklyExpenses || 0) * 52), 'text-zinc-300'],
                                ['Debt & Liabilities', formatMoney(debt), debt > 0 ? 'text-rose-300' : 'text-zinc-300'],
                                ['Lifetime Revenue', formatMoney(studio.stats.lifetimeRevenue || 0), 'text-amber-200'],
                            ].map(([label, value, color]) => (
                                <div key={label} className="rounded-[13px] border border-white/[0.06] bg-black/35 p-3">
                                    <div className="text-[5px] font-black uppercase tracking-[0.14em] text-zinc-600">{label}</div>
                                    <div className={`mt-1 font-mono text-[11px] font-black ${color}`}>{value}</div>
                                </div>
                            ))}
                        </div>
                    </CommandSection>

                    <CommandSection eyebrow="Production Board" title="Active Slate" icon={<Clapperboard size={19} />}>
                        {activeSlate.length ? (
                            <div className="space-y-2">
                                {activeSlate.slice(0, 4).map(project => (
                                    <div key={project.id} className="flex items-center justify-between gap-3 rounded-[13px] border border-white/[0.06] bg-black/35 px-3 py-2.5">
                                        <div className="min-w-0">
                                            <div className="truncate text-[9px] font-black uppercase text-white">{project.title}</div>
                                            <div className="mt-1 text-[5px] font-black uppercase tracking-[0.15em] text-sky-300">{project.phase}</div>
                                        </div>
                                        <Film size={14} className="shrink-0 text-zinc-600" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-[13px] border border-dashed border-white/10 bg-black/25 px-4 py-5 text-center text-[8px] font-bold text-zinc-600">
                                No active productions under this studio.
                            </div>
                        )}
                    </CommandSection>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <CommandSection eyebrow="Rights Vault" title="Catalog & IP" icon={<Layers3 size={19} />}>
                            <div className="flex items-end justify-between">
                                <div>
                                    <div className="font-mono text-3xl font-black text-amber-200">{rightsTitles.length}</div>
                                    <div className="text-[6px] font-black uppercase tracking-[0.16em] text-zinc-600">Controlled titles</div>
                                </div>
                                <FileKey2 size={24} className="text-zinc-700" />
                            </div>
                            <div className="mt-3 space-y-1.5">
                                {rightsTitles.slice(0, 3).map(title => (
                                    <div key={title} className="truncate border-l-2 border-amber-300/35 pl-2 text-[8px] font-bold text-zinc-400">{title}</div>
                                ))}
                                {!rightsTitles.length ? <div className="text-[8px] font-bold text-zinc-600">No catalog records yet.</div> : null}
                            </div>
                        </CommandSection>

                        <CommandSection eyebrow="Production Assets" title="Facilities & Talent" icon={<Building2 size={19} />}>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-[13px] border border-white/[0.06] bg-black/35 p-3">
                                    <Building2 size={15} className="text-emerald-300" />
                                    <div className="mt-2 font-mono text-xl font-black text-white">{departmentLevels + equipmentLevels}</div>
                                    <div className="text-[5px] font-black uppercase tracking-wider text-zinc-600">Facility levels</div>
                                </div>
                                <div className="rounded-[13px] border border-white/[0.06] bg-black/35 p-3">
                                    <Users size={15} className="text-purple-300" />
                                    <div className="mt-2 font-mono text-xl font-black text-white">{retainedTalent}</div>
                                    <div className="text-[5px] font-black uppercase tracking-wider text-zinc-600">Retained talent</div>
                                </div>
                            </div>
                        </CommandSection>
                    </div>

                    <CommandSection eyebrow="Company Condition" title="Momentum & Brand" icon={<Sparkles size={19} />}>
                        <div className="space-y-3">
                            <Meter label="Studio Momentum" value={studio.stats.studioMomentum || studio.stats.hype || 0} color="bg-amber-300" />
                            <Meter label="Brand Health" value={studio.stats.brandHealth || 0} color="bg-sky-300" />
                            <Meter label="Investor Confidence" value={studio.stats.investorConfidence || 0} color="bg-emerald-300" />
                        </div>
                    </CommandSection>

                    <CommandSection eyebrow="Closing Archive" title="Acquisition Record" icon={<Landmark size={19} />}>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-[13px] border border-white/[0.06] bg-black/35 p-3">
                                <div className="text-[5px] font-black uppercase tracking-wider text-zinc-600">Purchase Price</div>
                                <div className="mt-1 font-mono text-[12px] font-black text-amber-200">{formatMoney(acquisitionCase?.closing?.finalPrice || 0)}</div>
                            </div>
                            <div className="rounded-[13px] border border-white/[0.06] bg-black/35 p-3">
                                <div className="text-[5px] font-black uppercase tracking-wider text-zinc-600">Control Since</div>
                                <div className="mt-1 text-[10px] font-black text-white">
                                    Y{acquisitionCase?.closing?.signedYear ?? studio.studioState?.acquiredYear ?? player.age} · W{acquisitionCase?.closing?.signedWeek ?? studio.studioState?.acquiredWeek ?? player.currentWeek}
                                </div>
                            </div>
                        </div>
                        {signedCommitments.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {signedCommitments.map(commitment => (
                                    <span key={commitment.id} className="flex items-center gap-1 rounded-full border border-emerald-300/15 bg-emerald-300/[0.05] px-2.5 py-1 text-[6px] font-black uppercase tracking-wider text-emerald-200">
                                        <ShieldCheck size={9} /> {commitment.shortLabel}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </CommandSection>
                </div>
            </main>
        </motion.div>
    );
};
