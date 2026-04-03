import React, { useState } from 'react';
import { Player, ActiveRelease } from '../../types';
import { PLATFORMS } from '../../services/streamingLogic';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

interface BoxOfficeAppProps {
  player: Player;
  onBack: () => void;
}

export const BoxOfficeApp: React.FC<BoxOfficeAppProps> = ({ player, onBack }) => {
  const [tab, setTab] = useState<'THEATERS' | 'STREAMING'>('THEATERS');
  
  // Safe access to arrays
  const activeReleases = player.activeReleases || [];
  const theatrical = activeReleases.filter(r => r.distributionPhase === 'THEATRICAL');
  const streaming = activeReleases.filter(r => r.distributionPhase === 'STREAMING' && r.streaming);

  const formatMoney = (amount: number) => {
      if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
      if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}k`;
      return `$${amount}`;
  };

  const formatMoneyShort = (amount: number) => {
      if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
      if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
      return `${amount}`;
  };

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
                        <div className="text-center text-zinc-600 mt-10 text-sm">No active theatrical releases.<br/>Complete a movie project to see stats here.</div>
                    )}
                    {theatrical.map(rel => {
                        // Calculate max for bar graph scaling
                        const maxWeekly = Math.max(...rel.weeklyGross, 1);
                        
                        return (
                            <div key={rel.id} className="bg-zinc-800 p-4 rounded-2xl border border-zinc-700 shadow-lg">
                                <div className="flex justify-between items-start mb-3 gap-3">
                                    <div className="min-w-0">
                                        <div className="font-bold text-lg leading-tight break-words">{rel.name}</div>
                                        <div className="text-[10px] text-zinc-400 break-words">{rel.projectDetails.genre} • {rel.projectDetails.studioId.replace(/_/g, ' ')}</div>
                                    </div>
                                    <div className="text-xs bg-emerald-900 text-emerald-400 px-2 py-1 rounded font-mono font-bold shrink-0">Wk {rel.weekNum}</div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-4 bg-black/20 p-3 rounded-xl">
                                    <div className="min-w-0">
                                        <div className="text-[10px] text-zinc-500 uppercase font-bold">Total Gross</div>
                                        <div className="text-white font-bold font-mono text-sm break-all">{formatMoney(rel.totalGross)}</div>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] text-zinc-500 uppercase font-bold">Budget</div>
                                        <div className="text-zinc-400 font-bold font-mono text-sm break-all">{formatMoney(rel.budget)}</div>
                                    </div>
                                </div>

                                {/* Bar Graph Visualization */}
                                <div>
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2 flex items-center gap-1">
                                        <TrendingUp size={12}/> Weekly Revenue
                                    </div>
                                    <div className="flex items-end gap-2 h-24 w-full overflow-x-auto pb-1 no-scrollbar">
                                        {rel.weeklyGross.map((gross, idx) => {
                                            const heightPercent = Math.max(15, (gross / maxWeekly) * 100);
                                            const isLatest = idx === rel.weeklyGross.length - 1;
                                            return (
                                                <div key={idx} className="flex flex-col items-center justify-end h-full min-w-[36px] flex-1">
                                                    <span className={`text-[9px] font-mono mb-1 ${isLatest ? 'text-emerald-300 font-bold' : 'text-zinc-500'}`}>
                                                        {formatMoneyShort(gross)}
                                                    </span>
                                                    <div className="w-full bg-zinc-700/30 rounded-t-md relative h-full flex items-end">
                                                         <div 
                                                            style={{height: `${heightPercent}%`}} 
                                                            className={`w-full rounded-t-md transition-all duration-500 ${isLatest ? 'bg-emerald-500' : 'bg-emerald-500/40'}`}
                                                         ></div>
                                                    </div>
                                                    <span className="text-[9px] text-zinc-600 mt-1">W{idx+1}</span>
                                                </div>
                                            )
                                        })}
                                        {/* Placeholder for future weeks to fill space visually if few weeks */}
                                        {[...Array(Math.max(0, 5 - rel.weeklyGross.length))].map((_, i) => (
                                            <div key={`placeholder-${i}`} className="flex flex-col items-center justify-end h-full min-w-[36px] flex-1 opacity-20">
                                                <div className="w-full bg-zinc-800 rounded-t-md h-full"></div>
                                                <span className="text-[9px] text-zinc-700 mt-1">-</span>
                                            </div>
                                        ))}
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
                        <div className="text-center text-zinc-600 mt-10 text-sm">No active streaming titles.</div>
                    )}
                    {streaming.map(rel => {
                        const platform = PLATFORMS[rel.streaming!.platformId];
                        const weeklyViews = rel.streaming!.weeklyViews || [];
                        const maxViews = Math.max(...weeklyViews, 1);

                        return (
                            <div key={rel.id} className="bg-zinc-800 p-4 rounded-2xl border border-zinc-700 shadow-lg">
                                <div className="flex justify-between items-start mb-3 gap-3">
                                    <div className="font-bold text-lg min-w-0 break-words">{rel.name}</div>
                                    <div className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${platform.color} bg-white/10 shrink-0`}>{platform.name}</div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-black/20 p-3 rounded-xl min-w-0">
                                        <div className="text-[10px] text-zinc-500 uppercase font-bold">Total Views</div>
                                        <div className="text-white font-bold font-mono text-lg break-all">{formatViews(rel.streaming!.totalViews)}</div>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-xl flex flex-col justify-center min-w-0">
                                        <div className="text-[10px] text-zinc-500 uppercase font-bold">Latest Week</div>
                                        <div className="text-zinc-300 text-sm font-mono font-bold break-all">
                                            {weeklyViews.length > 0 ? formatViews(weeklyViews[weeklyViews.length-1]) : '0'}
                                        </div>
                                    </div>
                                </div>

                                {/* Bar Graph for Streaming */}
                                <div>
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2 flex items-center gap-1">
                                        <TrendingUp size={12}/> Weekly Viewership
                                    </div>
                                    <div className="flex items-end gap-2 h-24 w-full overflow-x-auto pb-1 no-scrollbar">
                                        {weeklyViews.map((views, idx) => {
                                            const heightPercent = Math.max(15, (views / maxViews) * 100);
                                            const isLatest = idx === weeklyViews.length - 1;
                                            return (
                                                <div key={idx} className="flex flex-col items-center justify-end h-full min-w-[36px] flex-1">
                                                    <span className={`text-[9px] font-mono mb-1 ${isLatest ? 'text-white font-bold' : 'text-zinc-500'}`}>
                                                        {formatViewsShort(views)}
                                                    </span>
                                                    <div className="w-full bg-zinc-700/30 rounded-t-md relative h-full flex items-end">
                                                         <div 
                                                            style={{height: `${heightPercent}%`}} 
                                                            className={`w-full rounded-t-md transition-all duration-500 ${isLatest ? 'bg-indigo-500' : 'bg-indigo-500/40'}`}
                                                         ></div>
                                                    </div>
                                                    <span className="text-[9px] text-zinc-600 mt-1">W{idx+1}</span>
                                                </div>
                                            )
                                        })}
                                         {/* Placeholder for future weeks */}
                                         {[...Array(Math.max(0, 5 - weeklyViews.length))].map((_, i) => (
                                            <div key={`placeholder-${i}`} className="flex flex-col items-center justify-end h-full min-w-[36px] flex-1 opacity-20">
                                                <div className="w-full bg-zinc-800 rounded-t-md h-full"></div>
                                                <span className="text-[9px] text-zinc-700 mt-1">-</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {rel.streaming!.isLeaving && (
                                    <div className="text-xs text-rose-500 font-bold mt-3 bg-rose-500/10 px-3 py-2 rounded-lg flex items-center justify-center border border-rose-500/20">
                                        ⚠️ Leaving platform soon
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
