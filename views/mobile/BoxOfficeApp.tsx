
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Player, ActiveRelease } from '../../types';
import { formatMoney } from '../../services/formatUtils';
import { PLATFORMS } from '../../services/streamingLogic';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Film, Tv, AlertTriangle } from 'lucide-react';

interface BoxOfficeAppProps {
  player: Player;
  onBack: () => void;
}

export const BoxOfficeApp: React.FC<BoxOfficeAppProps> = ({ player, onBack }) => {
  const [tab, setTab] = useState<'THEATERS' | 'STREAMING'>('THEATERS');
  
  // Safe access to arrays
  const activeReleases = player.activeReleases || [];
  const theatrical = activeReleases.filter(r => r.distributionPhase === 'THEATRICAL');
  const streaming = activeReleases.filter(r => r.distributionPhase === 'STREAMING');


  const formatMoneyShort = (amount: number) => {
      if (amount >= 1_000_000_000_000) return `${(amount / 1_000_000_000_000).toFixed(1)}T`;
      if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
      if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
      if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
      return `${amount}`;
  }

  const formatViews = (num: number) => {
      if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
      return (num / 1_000).toFixed(0) + 'k';
  };

  const formatViewsShort = (num: number) => {
      if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
      return (num / 1_000).toFixed(0) + 'k';
  };

  return (
    <div className="absolute inset-0 bg-zinc-900 flex flex-col z-40 text-white animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="bg-emerald-900/50 p-4 pt-12 pb-3 shadow-lg flex items-center justify-between shrink-0 border-b border-emerald-500/20 backdrop-blur-md">
            <button onClick={onBack} className="p-1 rounded-full hover:bg-white/10"><ArrowLeft size={20}/></button>
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-lg">
                <BarChart3 size={20} /> BoxOffice
            </div>
            <div className="w-8"></div>
        </div>

        {/* Tabs */}
        <div className="flex bg-black/40 border-b border-emerald-500/20">
            <button onClick={() => setTab('THEATERS')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'THEATERS' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-900/20' : 'text-zinc-500 hover:text-zinc-300'}`}>In Theaters</button>
            <button onClick={() => setTab('STREAMING')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'STREAMING' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-900/20' : 'text-zinc-500 hover:text-zinc-300'}`}>Streaming</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            
            {/* THEATRICAL LIST */}
            {tab === 'THEATERS' && (
                <>
                    {theatrical.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-600">
                                <Film size={32} />
                            </div>
                            <div className="text-zinc-500 text-sm font-medium">No active theatrical releases.<br/>Complete a movie project to see stats here.</div>
                        </div>
                    )}
                    {theatrical.map(rel => {
                        // Calculate max for bar graph scaling
                        const maxWeekly = Math.max(...rel.weeklyGross, 1);
                        
                        return (
                            <div key={rel.id} className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl group hover:border-emerald-500/30 transition-all duration-500">
                                <div className="p-8 border-b border-white/5 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-serif italic font-black text-3xl leading-none uppercase tracking-tighter group-hover:text-emerald-400 transition-colors mb-2">{rel.name}</div>
                                            <div className="flex items-center gap-3">
                                                <div className="px-2 py-0.5 bg-zinc-800 rounded text-[9px] text-zinc-400 uppercase tracking-widest font-black">{rel.projectDetails.genre}</div>
                                                <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
                                                <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{rel.projectDetails.studioId.replace('_', ' ')}</div>
                                            </div>
                                        </div>
                                        <div className="bg-emerald-500 text-black px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                                            Week {rel.weekNum}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-6 mb-8">
                                        <div className="bg-black/40 p-6 rounded-3xl border border-white/5 shadow-inner">
                                            <div className="text-[8px] text-zinc-600 uppercase font-black tracking-[0.2em] mb-2">Total Gross</div>
                                            <div className="text-3xl font-black text-white font-mono leading-none">{formatMoney(rel.totalGross)}</div>
                                        </div>
                                        <div className="bg-black/40 p-6 rounded-3xl border border-white/5 shadow-inner">
                                            <div className="text-[8px] text-zinc-600 uppercase font-black tracking-[0.2em] mb-2">Budget</div>
                                            <div className="text-2xl font-black text-zinc-500 font-mono leading-none">{formatMoney(rel.budget)}</div>
                                        </div>
                                    </div>

                                    {/* Bar Graph Visualization */}
                                    <div className="bg-black/20 p-6 rounded-3xl border border-white/5">
                                        <div className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.3em] mb-6 flex items-center gap-3">
                                            <TrendingUp size={16} className="text-emerald-500"/> Revenue Performance
                                        </div>
                                        <div className="flex items-end gap-4 h-40 w-full overflow-x-auto pb-2 no-scrollbar">
                                            {rel.weeklyGross.map((gross, idx) => {
                                                const heightPercent = Math.max(15, (gross / maxWeekly) * 100);
                                                const isLatest = idx === rel.weeklyGross.length - 1;
                                                return (
                                                    <div key={idx} className="flex flex-col items-center justify-end h-full min-w-[50px] flex-1">
                                                        <span className={`text-[10px] font-mono font-black mb-3 ${isLatest ? 'text-emerald-400' : 'text-zinc-700'}`}>
                                                            {formatMoneyShort(gross)}
                                                        </span>
                                                        <div className="w-full bg-zinc-800/30 rounded-t-xl relative h-full flex items-end overflow-hidden">
                                                             <motion.div 
                                                                initial={{ height: 0 }}
                                                                animate={{ height: `${heightPercent}%` }}
                                                                transition={{ duration: 1, delay: idx * 0.1 }}
                                                                className={`w-full rounded-t-xl transition-all duration-700 ${isLatest ? 'bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)]' : 'bg-emerald-500/20'}`}
                                                             ></motion.div>
                                                        </div>
                                                        <span className={`text-[9px] font-black mt-3 uppercase tracking-widest ${isLatest ? 'text-emerald-500' : 'text-zinc-800'}`}>W{idx+1}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </>
            )}

            {/* STREAMING LIST */}
            {tab === 'STREAMING' && (
                <>
                    {streaming.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-600">
                                <Tv size={32} />
                            </div>
                            <div className="text-zinc-500 text-sm font-medium">No active streaming titles.</div>
                        </div>
                    )}
                    {streaming.map(rel => {
                        const platform = PLATFORMS[rel.streaming!.platformId];
                        const weeklyViews = rel.streaming!.weeklyViews || [];
                        const maxViews = Math.max(...weeklyViews, 1);

                        return (
                            <div key={rel.id} className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative group hover:border-indigo-500/20 transition-all duration-500">
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${platform.color || 'bg-indigo-500'} opacity-30 group-hover:opacity-60 transition-opacity`}></div>
                                
                                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-indigo-500/5 to-transparent">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-serif italic font-black text-2xl leading-none uppercase tracking-tighter group-hover:text-indigo-400 transition-colors mb-2">{rel.name}</div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">Exclusive Release</div>
                                                <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
                                                <div className={`text-[9px] font-black uppercase tracking-widest ${platform.color || 'text-indigo-400'}`}>
                                                    {platform.name}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                                            <TrendingUp size={16} className={platform.color?.replace('text-', 'text-') || 'text-indigo-400'} />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-6">
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="bg-black/40 p-5 rounded-[2rem] border border-white/5 shadow-inner">
                                            <div className="text-[8px] text-zinc-600 uppercase font-black tracking-[0.2em] mb-2">Total Views</div>
                                            <div className="font-mono text-2xl font-black text-white leading-none">{formatViews(rel.streaming!.totalViews)}</div>
                                        </div>
                                        <div className="bg-black/40 p-5 rounded-[2rem] border border-white/5 shadow-inner">
                                            <div className="text-[8px] text-zinc-600 uppercase font-black tracking-[0.2em] mb-2">Latest Week</div>
                                            <div className="font-mono text-2xl font-black text-indigo-400 leading-none">
                                                {weeklyViews.length > 0 ? formatViews(weeklyViews[weeklyViews.length-1]) : '0'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bar Graph for Streaming */}
                                    <div className="bg-black/20 p-6 rounded-[2.5rem] border border-white/5">
                                        <div className="text-[9px] text-zinc-600 uppercase font-black tracking-[0.3em] mb-6 flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                            Global Viewership Trend
                                        </div>
                                        <div className="flex items-end gap-3 h-32 w-full overflow-x-auto pb-2 no-scrollbar">
                                            {weeklyViews.map((views, idx) => {
                                                const heightPercent = Math.max(15, (views / maxViews) * 100);
                                                const isLatest = idx === weeklyViews.length - 1;
                                                return (
                                                    <div key={idx} className="flex flex-col items-center justify-end h-full min-w-[48px] flex-1">
                                                        <span className={`text-[10px] font-mono font-black mb-2 ${isLatest ? 'text-white' : 'text-zinc-700'}`}>
                                                            {formatViewsShort(views)}
                                                        </span>
                                                        <div className="w-full bg-zinc-800/30 rounded-t-xl relative h-full flex items-end overflow-hidden border border-white/5">
                                                             <div 
                                                                style={{height: `${heightPercent}%`}} 
                                                                className={`w-full rounded-t-xl transition-all duration-1000 ease-out ${isLatest ? 'bg-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.5)]' : 'bg-indigo-500/10'}`}
                                                             ></div>
                                                        </div>
                                                        <span className={`text-[9px] font-black mt-3 uppercase tracking-widest ${isLatest ? 'text-indigo-400' : 'text-zinc-800'}`}>W{idx+1}</span>
                                                    </div>
                                                )
                                            })}
                                             {/* Placeholder for future weeks */}
                                             {[...Array(Math.max(0, 5 - weeklyViews.length))].map((_, i) => (
                                                <div key={`placeholder-${i}`} className="flex flex-col items-center justify-end h-full min-w-[48px] flex-1 opacity-5">
                                                    <div className="w-full bg-zinc-800 rounded-t-xl h-full border border-white/5"></div>
                                                    <span className="text-[9px] text-zinc-900 mt-3 font-black">?</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {rel.streaming!.isLeaving && (
                                    <div className="mx-6 mb-6 text-[9px] text-rose-500 font-black uppercase tracking-[0.2em] bg-rose-500/5 px-6 py-4 rounded-2xl flex items-center justify-center border border-rose-500/10 animate-pulse">
                                        <AlertTriangle size={14} className="mr-3" /> License Expiring Soon
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </>
            )}
        </div>
        
        <div className="absolute bottom-1 left-0 right-0 flex justify-center pb-2 z-50 pointer-events-none">
             <div className="w-32 h-1 bg-white/20 rounded-full"></div>
        </div>
    </div>
  );
};
