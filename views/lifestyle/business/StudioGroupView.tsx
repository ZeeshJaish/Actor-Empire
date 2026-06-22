import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
    ArrowLeft,
    ArrowUpRight,
    Building2,
    Check,
    ChevronRight,
    Film,
    Landmark,
    Layers3,
    Sparkles,
    TrendingDown,
    TrendingUp,
    X,
} from 'lucide-react';
import type { Business, Player, SubsidiaryOperatingModel } from '../../../types';
import {
    getOperatingModelDefinition,
    getStudioGroup,
    OPERATING_MODELS,
    setSubsidiaryOperatingModel,
} from '../../../services/studioGroup';
import { OwnedStudioCommandCenter } from './OwnedStudioCommandCenter';

interface StudioGroupViewProps {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (player: Player) => void;
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

const modelTone: Record<'EMERALD' | 'SKY' | 'AMBER', string> = {
    EMERALD: 'border-emerald-400/35 bg-emerald-400/[0.08] text-emerald-300',
    SKY: 'border-sky-400/35 bg-sky-400/[0.08] text-sky-300',
    AMBER: 'border-amber-400/35 bg-amber-400/[0.08] text-amber-300',
};

const SubsidiaryPanel: React.FC<{
    player: Player;
    studio: Business;
    onConfigure: () => void;
    onOpen: () => void;
}> = ({ player, studio, onConfigure, onOpen }) => {
    const model = getOperatingModelDefinition(studio.studioState?.operatingModel);
    const slateCount = (studio.studioState?.concepts?.length || 0)
        + player.commitments.filter(commitment => commitment.projectDetails?.studioId === studio.id).length
        + player.activeReleases.filter(release => release.projectDetails?.studioId === studio.id).length;
    const catalogCount = (studio.studioState?.ownedRights?.length || 0)
        + (studio.studioState?.purchasedIPTitles?.length || 0)
        + player.pastProjects.filter(project => project.studioId === studio.id).length;
    const weeklyResult = studio.stats.weeklyProfit || 0;
    const momentum = Math.round(studio.stats.studioMomentum || studio.stats.hype || 0);
    const accent = model?.accent === 'SKY'
        ? { line: 'bg-sky-300', border: 'border-sky-300/35', text: 'text-sky-200', surface: 'bg-sky-300/[0.07]' }
        : model?.accent === 'AMBER'
            ? { line: 'bg-amber-300', border: 'border-amber-300/35', text: 'text-amber-200', surface: 'bg-amber-300/[0.07]' }
            : { line: 'bg-emerald-300', border: 'border-emerald-300/35', text: 'text-emerald-200', surface: 'bg-emerald-300/[0.07]' };

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-[24px] border-2 bg-[#0c0b0a] shadow-[0_8px_0_#020202,0_16px_34px_rgba(0,0,0,0.32)] ${model ? accent.border : 'border-rose-300/35'}`}
        >
            <div className={`absolute inset-y-0 left-0 w-1.5 ${model ? accent.line : 'bg-rose-300'}`} />
            <div className="relative p-4 pl-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border ${model ? `${accent.border} ${accent.surface} ${accent.text}` : 'border-rose-300/30 bg-rose-300/[0.07] text-rose-200'}`}>
                            <Landmark size={20} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[6px] font-black uppercase tracking-[0.22em] text-zinc-600">Owned Studio</div>
                            <h3 className="mt-1 line-clamp-2 font-serif text-[15px] font-black uppercase italic leading-[0.95] tracking-tight text-white">
                                {studio.name}
                            </h3>
                        </div>
                    </div>
                    <div className={`shrink-0 rounded-full border px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.14em] ${model ? modelTone[model.accent] : 'border-rose-300/30 bg-rose-300/[0.08] text-rose-200'}`}>
                        {model?.shortLabel || 'Board Decision Required'}
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-[1.15fr_0.85fr] gap-3">
                    <div className="rounded-[15px] border border-white/[0.07] bg-black/40 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-[6px] font-black uppercase tracking-[0.16em] text-zinc-600">Studio Health</div>
                            <div className={`font-mono text-[10px] font-black ${model ? accent.text : 'text-rose-200'}`}>{momentum}</div>
                        </div>
                        <div className="mt-2 flex gap-1">
                            {[20, 40, 60, 80, 100].map(level => (
                                <div key={level} className={`h-2 flex-1 rounded-sm ${momentum >= level ? (model ? accent.line : 'bg-rose-300') : 'bg-zinc-900'}`} />
                            ))}
                        </div>
                    </div>
                    <div className="rounded-[15px] border border-white/[0.07] bg-black/40 p-3">
                        <div className="text-[6px] font-black uppercase tracking-[0.16em] text-zinc-600">Weekly Result</div>
                        <div className={`mt-2 flex items-center gap-1 font-mono text-[12px] font-black ${weeklyResult >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {weeklyResult >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {formatMoney(weeklyResult)}
                        </div>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-[15px] border border-white/[0.07] bg-black/30">
                    <div className="border-r border-white/[0.07] p-2.5">
                        <div className="flex items-center gap-1.5 text-[5px] font-black uppercase tracking-wider text-zinc-600"><Film size={10} /> Active</div>
                        <div className="mt-1 font-mono text-[11px] font-black text-white">{slateCount}</div>
                    </div>
                    <div className="border-r border-white/[0.07] p-2.5">
                        <div className="flex items-center gap-1.5 text-[5px] font-black uppercase tracking-wider text-zinc-600"><Layers3 size={10} /> Catalog</div>
                        <div className="mt-1 font-mono text-[11px] font-black text-white">{catalogCount}</div>
                    </div>
                    <div className="p-2.5">
                        <div className="text-[5px] font-black uppercase tracking-wider text-zinc-600">Capital</div>
                        <div className="mt-1 truncate font-mono text-[11px] font-black text-emerald-300">{formatMoney(studio.balance)}</div>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-[0.82fr_1.18fr] gap-2">
                    <button
                        type="button"
                        onClick={onOpen}
                        className="flex min-h-11 items-center justify-between rounded-[14px] border-2 border-amber-300/30 bg-[#2a1b06] px-3 text-left text-[7px] font-black uppercase tracking-[0.14em] text-amber-100 shadow-[0_4px_0_#120a01] active:translate-y-0.5 active:shadow-[0_2px_0_#120a01]"
                    >
                        Open Studio <ChevronRight size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={onConfigure}
                        className={`flex min-h-11 items-center justify-between rounded-[14px] border px-3 text-left text-[7px] font-black uppercase tracking-[0.12em] ${model ? `${accent.border} ${accent.surface} ${accent.text}` : 'border-rose-300/30 bg-rose-300/[0.08] text-rose-200'}`}
                    >
                        <span className="truncate">Operating Model · {model?.shortLabel || 'Choose'}</span>
                        <ChevronRight size={13} className="shrink-0" />
                    </button>
                </div>
            </div>
        </motion.article>
    );
};

export const StudioGroupView: React.FC<StudioGroupViewProps> = ({ player, onBack, onUpdatePlayer }) => {
    const group = getStudioGroup(player);
    const [selectedStudioId, setSelectedStudioId] = React.useState<string | null>(null);
    const [commandStudioId, setCommandStudioId] = React.useState<string | null>(null);
    const [selectedModel, setSelectedModel] = React.useState<SubsidiaryOperatingModel | null>(null);
    const selectedStudio = group.subsidiaries.find(studio => studio.id === selectedStudioId);
    const commandStudio = group.subsidiaries.find(studio => studio.id === commandStudioId);
    const groupValuation = group.allStudios.reduce((total, studio) => total + (studio.stats.valuation || 0), 0);
    const groupCapital = group.allStudios.reduce((total, studio) => total + (studio.balance || 0), 0);
    const weeklyResult = group.allStudios.reduce((total, studio) => total + (studio.stats.weeklyProfit || 0), 0);

    const openModelCommand = (studio: Business) => {
        setSelectedStudioId(studio.id);
        setSelectedModel(studio.studioState?.operatingModel || null);
    };

    const confirmModel = () => {
        if (!selectedStudio || !selectedModel) return;
        const result = setSubsidiaryOperatingModel({
            player,
            studioId: selectedStudio.id,
            model: selectedModel,
        });
        if (!result.success) return;
        onUpdatePlayer(result.player);
        setSelectedStudioId(null);
        setSelectedModel(null);
    };

    if (commandStudio) {
        return (
            <>
                <OwnedStudioCommandCenter
                    player={player}
                    studio={commandStudio}
                    onBack={() => setCommandStudioId(null)}
                    onChangeOperatingModel={() => openModelCommand(commandStudio)}
                />
                <AnimatePresence>
                    {selectedStudio ? (
                        <OperatingModelDialog
                            studio={selectedStudio}
                            selectedModel={selectedModel}
                            onSelect={setSelectedModel}
                            onClose={() => setSelectedStudioId(null)}
                            onConfirm={confirmModel}
                        />
                    ) : null}
                </AnimatePresence>
            </>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#050506] text-white">
            <div className="relative overflow-hidden border-b border-[#29251f] bg-[#0b0907] px-4 pb-4 pt-12">
                <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
                <div className="relative flex items-center gap-3">
                    <button type="button" onClick={onBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400">
                        <ArrowLeft size={19} />
                    </button>
                    <div>
                        <div className="text-[8px] font-black uppercase tracking-[0.28em] text-amber-300">Empire Map</div>
                        <h1 className="mt-1 font-serif text-3xl font-black uppercase italic tracking-tight">Studio Group</h1>
                    </div>
                </div>
                <div className="relative mt-4 grid grid-cols-3 overflow-hidden rounded-[17px] border-2 border-[#29251f] bg-black/55">
                    <div className="border-r border-white/[0.08] p-3">
                        <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Group Valuation</div>
                        <div className="mt-1 font-mono text-sm font-black text-white">{formatMoney(groupValuation)}</div>
                    </div>
                    <div className="border-r border-white/[0.08] p-3">
                        <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Group Capital</div>
                        <div className="mt-1 font-mono text-sm font-black text-emerald-300">{formatMoney(groupCapital)}</div>
                    </div>
                    <div className="p-3">
                        <div className="text-[6px] font-black uppercase tracking-widest text-zinc-600">Weekly Result</div>
                        <div className={`mt-1 font-mono text-sm font-black ${weeklyResult >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatMoney(weeklyResult)}</div>
                    </div>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4 custom-scrollbar">
                <div className="mx-auto max-w-3xl">
                    {group.parentStudio ? (
                        <div className="rounded-[20px] border-2 border-amber-300/35 bg-[#171006] p-3 shadow-[0_6px_0_#050301]">
                            <div className="flex items-center gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-amber-300/25 bg-amber-300/[0.09] text-amber-200">
                                        <Landmark size={19} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[6px] font-black uppercase tracking-[0.22em] text-amber-300">Group Headquarters</div>
                                        <div className="mt-1 truncate font-serif text-[15px] font-black uppercase italic leading-none text-white">{group.parentStudio.name}</div>
                                        <div className="mt-1.5 font-mono text-[9px] font-black text-amber-200">
                                            {formatMoney(group.parentStudio.stats.valuation)} <span className="text-[5px] uppercase tracking-wider text-zinc-600">HQ Value</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <div className="mt-6 flex items-end justify-between px-1">
                        <div>
                            <div className="text-[7px] font-black uppercase tracking-[0.24em] text-zinc-600">Ownership Portfolio</div>
                            <h2 className="mt-1 text-lg font-black uppercase tracking-tight">Owned Studios</h2>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-xs font-black text-amber-300">
                            {group.subsidiaries.length}
                        </div>
                    </div>
                    <div className="mt-3 space-y-4">
                    {group.subsidiaries.length ? group.subsidiaries.map(studio => (
                        <SubsidiaryPanel
                            key={studio.id}
                            player={player}
                            studio={studio}
                            onOpen={() => setCommandStudioId(studio.id)}
                            onConfigure={() => openModelCommand(studio)}
                        />
                    )) : (
                        <div className="rounded-[30px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                            <Building2 size={30} className="mx-auto text-zinc-700" />
                            <h3 className="mt-4 text-lg font-black uppercase">No subsidiaries yet</h3>
                            <p className="mx-auto mt-2 max-w-sm text-[10px] font-semibold leading-relaxed text-zinc-500">
                                Studios acquired through Forbes will appear here with their finances, identity and operating model intact.
                            </p>
                        </div>
                    )}
                    </div>
                </div>
            </main>

            <AnimatePresence>
                {selectedStudio ? (
                    <OperatingModelDialog
                        studio={selectedStudio}
                        selectedModel={selectedModel}
                        onSelect={setSelectedModel}
                        onClose={() => setSelectedStudioId(null)}
                        onConfirm={confirmModel}
                    />
                ) : null}
            </AnimatePresence>
        </div>
    );
};

const OperatingModelDialog: React.FC<{
    studio: Business;
    selectedModel: SubsidiaryOperatingModel | null;
    onSelect: (model: SubsidiaryOperatingModel) => void;
    onClose: () => void;
    onConfirm: () => void;
}> = ({ studio, selectedModel, onSelect, onClose, onConfirm }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-end bg-black/80 p-3 backdrop-blur-sm sm:items-center sm:justify-center"
    >
        <motion.section
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="max-h-[92vh] w-full overflow-y-auto rounded-[32px] border border-amber-400/25 bg-[#0b0b0d] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.7)] sm:max-w-xl"
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-[8px] font-black uppercase tracking-[0.25em] text-amber-300">Board Directive</div>
                    <h2 className="mt-1 text-2xl font-black uppercase tracking-tight">Operating Model</h2>
                    <p className="mt-1 text-[10px] font-semibold text-zinc-500">{studio.name}</p>
                </div>
                <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-500">
                    <X size={18} />
                </button>
            </div>
            <div className="mt-5 space-y-3">
                {OPERATING_MODELS.map(model => {
                    const active = selectedModel === model.id;
                    return (
                        <button
                            key={model.id}
                            type="button"
                            onClick={() => onSelect(model.id)}
                            className={`w-full rounded-[24px] border p-4 text-left transition-all ${active ? modelTone[model.accent] : 'border-white/[0.08] bg-black/30 text-zinc-300'}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[8px] font-black uppercase tracking-[0.2em] opacity-70">{model.control}</div>
                                    <div className="mt-1 text-base font-black uppercase text-white">{model.label}</div>
                                </div>
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${active ? 'border-current bg-current text-black' : 'border-white/15 text-transparent'}`}>
                                    <Check size={15} />
                                </div>
                            </div>
                            <p className="mt-3 text-[9px] font-semibold leading-relaxed text-zinc-400">{model.description}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {model.benefits.slice(0, 2).map(benefit => (
                                    <span key={benefit} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[6px] font-black uppercase tracking-wider text-zinc-400">
                                        {benefit}
                                    </span>
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>
            <button
                type="button"
                disabled={!selectedModel}
                onClick={onConfirm}
                className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-amber-400 px-4 text-[9px] font-black uppercase tracking-[0.18em] text-black shadow-[0_8px_0_#7a4a0a] transition-transform active:translate-y-1 active:shadow-[0_4px_0_#7a4a0a] disabled:cursor-not-allowed disabled:opacity-40"
            >
                Confirm Operating Model <ArrowUpRight size={16} />
            </button>
        </motion.section>
    </motion.div>
);
