import React, { useEffect, useState } from 'react';
import { BookOpen, Clock, Globe, PenTool, RefreshCw, ShoppingCart, Star } from 'lucide-react';
import { Business, Player, Script } from '../../../../types';
import { resolveProjectType } from '../../../../services/businessLogic';
import { formatGenreLabel, formatProjectFormatLabel } from '../../../../services/genreCatalog';
import { createMarketTrends, getGenreMarketTrend, getScriptMarketDemand } from '../../../../services/marketTrends';
import { getPlayerLanguage, t } from '../../../../services/i18n';
import { getStudioMarketScripts, StudioMarketLane } from '../../../../services/studioMarket';
import { RightsMarket } from './RightsMarket';
import { formatCurrency } from '../developmentLabFormatting';

export interface DevelopmentLabMarketProps {
    market: Script[];
    player: Player;
    studio: Business;
    onUpdatePlayer: (player: Player) => void;
    playerMoney: number;
    onBuy: (script: Script, cost: number) => void;
    onRefresh: () => void;
    weeksUntilRefresh: number;
    currentWeek: number;
    marketTrends: ReturnType<typeof createMarketTrends>;
    language: ReturnType<typeof getPlayerLanguage>;
    initialRightsMarketOpportunityId?: string;
    onRightsMarketTargetConsumed?: () => void;
}

const getSourceMaterialLabel = (source?: string) => {
    if (!source) return 'Original';
    if (source === 'LIFE_RIGHTS') return 'Life Rights';
    if (source === 'DOCUMENTARY_SUBJECT') return 'Doc Access';
    if (source === 'SPEC_SCRIPT') return 'Spec Script';
    return source.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, character => character.toUpperCase());
};

export const DevelopmentLabMarket: React.FC<DevelopmentLabMarketProps> = ({
    market,
    player,
    studio,
    onUpdatePlayer,
    playerMoney,
    onBuy,
    onRefresh,
    weeksUntilRefresh,
    currentWeek,
    marketTrends,
    language,
    initialRightsMarketOpportunityId,
    onRightsMarketTargetConsumed,
}) => {
    const [marketLane, setMarketLane] = useState<StudioMarketLane>('SCRIPTS');
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

    useEffect(() => {
        if (initialRightsMarketOpportunityId) setMarketLane('PROPERTIES');
    }, [initialRightsMarketOpportunityId]);

    return (
        <div className="space-y-5 pb-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.26em] text-amber-400">Studio Exchange</div>
                    <h2 className="mt-2 text-3xl font-black uppercase tracking-tight">Market</h2>
                    <p className="mt-2 max-w-xl text-xs leading-relaxed text-zinc-500">
                        Acquire scripts and adaptable source material, or track valuable entertainment IP.
                    </p>
                </div>
                <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left sm:w-auto sm:shrink-0 sm:text-right">
                    <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-600">Funds</span>
                    <span className="font-mono text-sm font-black text-emerald-300">{formatCurrency(playerMoney)}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                {[
                    { id: 'SCRIPTS', labelKey: 'developmentLab.vault.scripts', icon: <PenTool size={13} /> },
                    { id: 'PROPERTIES', labelKey: 'developmentLab.market.ipRights', icon: <Globe size={13} /> },
                ].map(lane => (
                    <button
                        key={lane.id}
                        onClick={() => setMarketLane(lane.id as StudioMarketLane)}
                        className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[9px] font-black uppercase tracking-[0.12em] transition-all ${
                            marketLane === lane.id
                                ? 'bg-amber-500 text-black shadow-[0_0_18px_rgba(245,158,11,0.18)]'
                                : 'text-zinc-600 hover:bg-zinc-900 hover:text-zinc-300'
                        }`}
                    >
                        {lane.icon}
                        {tr(lane.labelKey)}
                    </button>
                ))}
            </div>

            {marketLane === 'PROPERTIES' ? (
                <RightsMarket
                    player={player}
                    studio={studio}
                    onUpdatePlayer={onUpdatePlayer}
                    embedded
                    initialOpportunityId={initialRightsMarketOpportunityId}
                    onInitialOpportunityConsumed={onRightsMarketTargetConsumed}
                />
            ) : (
                <SourceMaterialMarket
                    market={getStudioMarketScripts(market || [])}
                    playerMoney={playerMoney}
                    onBuy={onBuy}
                    onRefresh={onRefresh}
                    weeksUntilRefresh={weeksUntilRefresh}
                    currentWeek={currentWeek}
                    marketTrends={marketTrends}
                    language={language}
                />
            )}
        </div>
    );
};

interface SourceMaterialMarketProps {
    market: Script[];
    playerMoney: number;
    onBuy: (script: Script, cost: number) => void;
    onRefresh: () => void;
    weeksUntilRefresh: number;
    currentWeek: number;
    marketTrends: ReturnType<typeof createMarketTrends>;
    language: ReturnType<typeof getPlayerLanguage>;
}

const SourceMaterialMarket: React.FC<SourceMaterialMarketProps> = ({
    market,
    playerMoney,
    onBuy,
    onRefresh,
    weeksUntilRefresh,
    currentWeek,
    marketTrends,
    language,
}) => {
    const [filter, setFilter] = useState<'ALL' | 'TRENDING' | 'MOVIE' | 'SERIES'>('ALL');
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

    const filteredMarket = (market || []).filter(script => {
        if (filter === 'ALL') return true;
        if (filter === 'TRENDING') return getScriptMarketDemand(script, currentWeek, marketTrends) >= 1.08;
        return resolveProjectType(script.projectType, (script as any).type, (script as any).projectDetails?.type) === filter;
    });

    return (
        <div className="space-y-6">
            <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div className="flex-1">
                    <h3 className="text-xl font-black uppercase leading-none tracking-tight">
                        {tr('developmentLab.market.sourceTitle')}
                    </h3>
                    <div className="mt-4 max-w-2xl space-y-2">
                        <p className="text-sm leading-relaxed text-zinc-400">
                            {tr('developmentLab.market.sourceSubtitle')}
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="flex w-fit items-center gap-2 rounded-lg border border-amber-500/10 bg-amber-500/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-500/80">
                                <Clock size={12} />
                                {tr(weeksUntilRefresh === 1 ? 'developmentLab.market.refreshesInWeek' : 'developmentLab.market.refreshesInWeeks', { weeks: weeksUntilRefresh })}
                            </div>
                            <button
                                onClick={onRefresh}
                                disabled={playerMoney < 250000}
                                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                                    playerMoney >= 250000
                                        ? 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                        : 'cursor-not-allowed border-zinc-900 bg-zinc-900/20 text-zinc-600 opacity-50'
                                }`}
                            >
                                <RefreshCw size={12} className={playerMoney >= 250000 ? 'animate-spin' : ''} />
                                {tr('developmentLab.market.refreshNow', { amount: formatCurrency(250000) })}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="hide-scrollbar flex gap-4 overflow-x-auto border-b border-zinc-800/20 pb-2">
                {[
                    { id: 'ALL', labelKey: 'developmentLab.market.filter.all' },
                    { id: 'TRENDING', labelKey: 'developmentLab.market.filter.trending' },
                    { id: 'MOVIE', labelKey: 'developmentLab.market.filter.movie' },
                    { id: 'SERIES', labelKey: 'developmentLab.market.filter.series' },
                ].map(filterOption => (
                    <button
                        key={filterOption.id}
                        onClick={() => setFilter(filterOption.id as typeof filter)}
                        className={`relative whitespace-nowrap pb-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                            filter === filterOption.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'
                        }`}
                    >
                        {tr(filterOption.labelKey)}
                        {filter === filterOption.id && <div className="absolute bottom-[-1px] left-0 right-0 h-px bg-white" />}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
                {filteredMarket.map((script, index) => {
                    const demand = getScriptMarketDemand(script, currentWeek, marketTrends);
                    const trend = getGenreMarketTrend(script.genres[0] || 'DRAMA', currentWeek, marketTrends, language);
                    const cost = script.purchaseCost || Math.floor((script.baseQuality || 50) * 15000 * demand);
                    const canAfford = playerMoney >= cost;
                    const colors = [
                        'from-blue-600 to-blue-900',
                        'from-emerald-600 to-emerald-900',
                        'from-rose-600 to-rose-900',
                        'from-amber-600 to-amber-900',
                        'from-purple-600 to-purple-900',
                        'from-indigo-600 to-indigo-900',
                    ];
                    const coverGradient = colors[index % colors.length];
                    const isBook = script.sourceMaterialType === 'BOOK';

                    return (
                        <div key={script.id} className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 transition-all duration-500 hover:-translate-y-2 hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                            <div className={`relative flex aspect-[3/4.5] flex-col justify-between overflow-hidden bg-gradient-to-br ${coverGradient} p-6`}>
                                <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-20" />

                                <div className="relative z-10 flex items-start justify-between">
                                    <div className="flex flex-col gap-1">
                                        <span className="rounded border border-white/10 bg-black/60 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                                            {getSourceMaterialLabel(script.sourceMaterialType)}
                                        </span>
                                        {isBook && (
                                            <div className="flex items-center gap-1 rounded bg-amber-500/90 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-black">
                                                <BookOpen size={8} />
                                                {tr('developmentLab.market.novel')}
                                            </div>
                                        )}
                                    </div>
                                    {script.hype && script.hype > 70 && (
                                        <div className="animate-pulse rounded-full bg-white px-2 py-1 text-[8px] font-black uppercase tracking-widest text-black shadow-xl">
                                            {trend.label}
                                        </div>
                                    )}
                                </div>

                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black uppercase italic leading-[0.9] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                        {script.title}
                                    </h3>
                                    {script.author && (
                                        <p className="mt-2 text-[10px] font-bold uppercase italic tracking-widest text-white/70">
                                            {tr('developmentLab.market.byAuthor', { author: script.author })}
                                        </p>
                                    )}
                                    <div className="mt-4 flex flex-wrap gap-1">
                                        {script.genres.map(genre => (
                                            <span key={genre} className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[7px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                                                {formatGenreLabel(genre)}
                                            </span>
                                        ))}
                                        {script.format && (
                                            <span className="rounded-full border border-sky-500/30 bg-sky-500/20 px-2 py-0.5 text-[7px] font-bold uppercase tracking-widest text-sky-200">
                                                {formatProjectFormatLabel(script.format)}
                                            </span>
                                        )}
                                        {script.tags?.map(tag => (
                                            <span key={tag} className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[7px] font-bold uppercase tracking-widest text-amber-300">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="absolute bottom-0 left-0 top-0 w-1 bg-black/20" />
                            </div>

                            <div className="flex flex-1 flex-col justify-between bg-zinc-900/50 p-5">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{tr('developmentLab.market.demandLabel', { label: trend.label })}</span>
                                        <div className="flex items-center gap-1">
                                            <Star size={10} className="fill-amber-500 text-amber-500" />
                                            <span className="font-mono text-xs font-black text-white">{Math.round(demand * 100)}%</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] leading-relaxed text-zinc-500">{trend.reason}</p>
                                    {script.logline && <p className="line-clamp-3 text-[11px] font-medium leading-relaxed text-zinc-400">{script.logline}</p>}
                                    {script.subjectName && (
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                                            {tr('developmentLab.market.subject', { subject: script.subjectName })}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-4 border-t border-zinc-800 pt-4">
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{tr('developmentLab.market.rightsCost')}</span>
                                            <span className={`font-mono text-xl font-black tracking-tighter ${canAfford ? 'text-white' : 'text-rose-500'}`}>
                                                {formatCurrency(cost)}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{tr('developmentLab.market.potential')}</span>
                                            <div className="mt-1 flex justify-end gap-1">
                                                {[1, 2, 3, 4, 5].map(score => (
                                                    <div key={score} className={`h-1.5 w-1.5 rounded-full ${score <= Math.ceil((script.baseQuality || 0) / 20) ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]' : 'bg-zinc-800'}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onBuy(script, cost)}
                                        disabled={!canAfford}
                                        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                            canAfford
                                                ? 'bg-white text-black hover:scale-[1.02] hover:bg-amber-500 active:scale-95'
                                                : 'cursor-not-allowed bg-zinc-800 text-zinc-600'
                                        }`}
                                    >
                                        <ShoppingCart size={12} />
                                        {canAfford ? tr('developmentLab.market.acquireRights') : tr('developmentLab.market.insufficientFunds')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredMarket.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 py-20 text-zinc-600">
                    <BookOpen size={48} className="mb-4 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">{tr('developmentLab.market.noItems')}</p>
                    <button
                        onClick={onRefresh}
                        disabled={playerMoney < 250000}
                        className="mt-6 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-amber-500 transition-all hover:bg-amber-500/10 hover:text-amber-400 active:scale-95"
                    >
                        <RefreshCw size={14} />
                        {tr('developmentLab.market.forceRefresh', { amount: formatCurrency(250000) })}
                    </button>
                </div>
            )}
        </div>
    );
};
