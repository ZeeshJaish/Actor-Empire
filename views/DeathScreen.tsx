import React from 'react';
import { Player, Relationship } from '../types';
import { Skull, ArrowRight, RefreshCw, Trophy, DollarSign, Film, Crown, Users, Quote, Sparkles, ChevronLeft } from 'lucide-react';
import { calculateDynastyScore, calculateLegacyScore, getLegacyArchetype, getLegacyObituary, getLegacyTributes, getRelationshipAge } from '../services/legacyLogic';

interface DeathScreenProps {
    player: Player;
    onContinueAsChild: (child: Relationship) => void;
    onStartNewGame: () => void;
    isPreview?: boolean;
    onClosePreview?: () => void;
}

const formatCompactMoney = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
    return `$${value.toLocaleString()}`;
};

export const DeathScreen: React.FC<DeathScreenProps> = ({
    player,
    onContinueAsChild,
    onStartNewGame,
    isPreview = false,
    onClosePreview
}) => {
    const children = player.relationships.filter(r => r.relation === 'Child');
    const totalAwards = player.awards?.length || 0;
    const totalProjects = player.pastProjects.length;
    const businessCount = player.businesses?.length || 0;
    const dynastyScore = calculateDynastyScore(player);
    const currentLegacyScore = calculateLegacyScore({
        netWorth: player.money,
        awards: totalAwards,
        moviesMade: totalProjects,
        peakFame: player.stats.fame,
        businessCount
    });
    const archetype = getLegacyArchetype(player);
    const obituary = getLegacyObituary(player);
    const tributes = getLegacyTributes(player);
    const rememberedFor = player.pastProjects
        .slice()
        .sort((a, b) => ((b.projectDetails?.qualityScore || b.imdbRating || 0) - (a.projectDetails?.qualityScore || a.imdbRating || 0)))[0];

    const socialVerdict =
        player.stats.reputation >= 75 ? 'Beloved by the public' :
        player.stats.reputation >= 45 ? 'Deeply debated by the public' :
        'A controversial public figure';

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,53,15,0.28)_0%,rgba(12,10,9,0.95)_40%,rgba(0,0,0,1)_100%)] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-10 md:py-14">
                <div className="flex items-center justify-between mb-6">
                    <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.35em] text-amber-400/80">
                        {isPreview ? 'Legacy Preview' : 'Final Curtain'}
                    </div>
                    {isPreview && onClosePreview && (
                        <button
                            onClick={onClosePreview}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-black uppercase tracking-wider"
                        >
                            <ChevronLeft size={14} />
                            Back To Career
                        </button>
                    )}
                </div>

                <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] items-start">
                    <div className="space-y-6">
                        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 backdrop-blur-xl p-6 md:p-8 shadow-2xl">
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-zinc-900 border-4 border-amber-500/20 flex items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)]">
                                    {player.avatar ? (
                                        <img src={player.avatar} alt={player.name} className="w-full h-full object-cover grayscale opacity-80" />
                                    ) : (
                                        <Skull size={52} className="text-amber-500/50" />
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-[0.25em]">
                                        <Sparkles size={12} />
                                        {archetype}
                                    </div>
                                    <div>
                                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white">{player.name}</h1>
                                        <p className="text-lg md:text-xl text-amber-200/70 font-serif italic mt-1">
                                            {isPreview ? `Legacy simulation at age ${player.age}` : `Passed away at age ${player.age}`}
                                        </p>
                                    </div>
                                    <p className="text-sm md:text-base text-zinc-300 leading-relaxed max-w-2xl">
                                        {obituary}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                                <DollarSign size={20} className="text-emerald-400 mb-3" />
                                <div className="text-2xl font-black">{formatCompactMoney(player.money)}</div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-2">Estate Value</div>
                            </div>
                            <div className="rounded-3xl border border-sky-500/20 bg-sky-500/5 p-5">
                                <Film size={20} className="text-sky-400 mb-3" />
                                <div className="text-2xl font-black">{totalProjects}</div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-2">Released Projects</div>
                            </div>
                            <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/5 p-5">
                                <Trophy size={20} className="text-yellow-400 mb-3" />
                                <div className="text-2xl font-black">{totalAwards}</div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-2">Awards Won</div>
                            </div>
                            <div className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-5">
                                <Crown size={20} className="text-purple-400 mb-3" />
                                <div className="text-2xl font-black">{dynastyScore}</div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-2">Dynasty Score</div>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 backdrop-blur-xl p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-5">
                                <Quote size={18} className="text-amber-400" />
                                <h3 className="text-lg font-black uppercase tracking-widest text-white">What People Said</h3>
                            </div>
                            <div className="grid gap-3">
                                {tributes.map((tribute, index) => (
                                    <div key={`${tribute}-${index}`} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm text-zinc-300 leading-relaxed">
                                        {tribute}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 backdrop-blur-xl p-6">
                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-4">Legacy Breakdown</div>
                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">Current Legacy Score</span>
                                    <span className="font-black text-white">{currentLegacyScore}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">Peak Fame</span>
                                    <span className="font-black text-white">{Math.round(player.stats.fame)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">Businesses Built</span>
                                    <span className="font-black text-white">{businessCount}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">Public Verdict</span>
                                    <span className="font-black text-amber-300 text-right">{socialVerdict}</span>
                                </div>
                                {rememberedFor && (
                                    <div className="pt-4 border-t border-white/10">
                                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2">Most Remembered For</div>
                                        <div className="text-white font-bold">{rememberedFor.name}</div>
                                        <div className="text-zinc-400 text-xs mt-1">
                                            {rememberedFor.imdbRating ? `IMDb ${rememberedFor.imdbRating.toFixed(1)} • ` : ''}
                                            {rememberedFor.type === 'SERIES' ? 'Series Event' : 'Film Landmark'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 backdrop-blur-xl p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <Users size={18} className="text-emerald-400" />
                                <h3 className="text-lg font-black uppercase tracking-widest text-white">Legacy Handoff</h3>
                            </div>

                            {children.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                        Choose an heir to carry the empire forward. They inherit wealth, businesses, and bloodline momentum, but must still make their own name.
                                    </p>
                                    {isPreview && (
                                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/80">
                                            Preview mode is read-only. Close the preview when you’re done checking the summary screen.
                                        </div>
                                    )}
                                    {children.map(child => (
                                        <button
                                            key={child.id}
                                            onClick={() => {
                                                if (isPreview) return;
                                                onContinueAsChild(child);
                                            }}
                                            className={`w-full p-4 bg-white/[0.03] border rounded-2xl transition-all flex items-center justify-between group ${
                                                isPreview
                                                    ? 'border-white/5 opacity-70 cursor-default'
                                                    : 'border-white/8 hover:bg-white/[0.06] hover:border-amber-500/30'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4 text-left">
                                                <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border border-white/10">
                                                    {child.image ? (
                                                        <img src={child.image} alt={child.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-lg font-black text-zinc-500">
                                                            {child.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{child.name}</div>
                                                    <div className="text-xs text-zinc-500">
                                                        Age {getRelationshipAge(child, player.age, player.currentWeek)} • Bloodline Continues
                                                    </div>
                                                </div>
                                            </div>
                                            <ArrowRight size={18} className="text-zinc-600 group-hover:text-white transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4 text-sm text-zinc-300">
                                    Your bloodline ends here. The legend remains, but no heir stands ready to continue the family story.
                                </div>
                            )}

                            <div className="pt-5 mt-5 border-t border-white/10">
                                {isPreview && onClosePreview ? (
                                    <button
                                        onClick={onClosePreview}
                                        className="w-full py-4 bg-transparent border border-zinc-800 text-zinc-300 rounded-full hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-sm"
                                    >
                                        <RefreshCw size={16} /> Close Preview
                                    </button>
                                ) : (
                                    <button
                                        onClick={onStartNewGame}
                                        className="w-full py-4 bg-transparent border border-zinc-800 text-zinc-300 rounded-full hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-sm"
                                    >
                                        <RefreshCw size={16} /> Start New Life
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
