
import React, { useState } from 'react';
import { Player, NPCActor, Studio } from '../../types';
import { formatMoney } from '../../services/formatUtils';
import { NPC_DATABASE } from '../../services/npcLogic';
import { STUDIO_CATALOG } from '../../services/studioLogic';
import { PLATFORMS, PlatformProfile } from '../../services/streamingLogic';
import { PROPERTY_CATALOG, CAR_CATALOG, MOTORCYCLE_CATALOG, BOAT_CATALOG, AIRCRAFT_CATALOG, CLOTHING_CATALOG } from '../../services/lifestyleLogic';
import { ArrowLeft, TrendingUp, DollarSign, Crown, Video, Building2, User, ChevronRight, Award, Star, Zap, Share2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ForbesAppProps {
  player: Player;
  onBack: () => void;
}

type Tab = 'ACTORS' | 'STUDIOS' | 'STREAMING' | 'MY_RANK';

export const ForbesApp: React.FC<ForbesAppProps> = ({ player, onBack }) => {
  const [tab, setTab] = useState<Tab>('ACTORS');

  // --- 1. CALCULATE PLAYER NET WORTH ---
  const allAssetsCatalog = [
      ...PROPERTY_CATALOG, ...CAR_CATALOG, ...MOTORCYCLE_CATALOG, 
      ...BOAT_CATALOG, ...AIRCRAFT_CATALOG, ...CLOTHING_CATALOG
  ];
  
  const assetsValue = player.assets.reduce((sum, assetId) => {
      const item = allAssetsCatalog.find(i => i.id === assetId);
      return sum + (item?.price || 0);
  }, 0);
  
  const playerNetWorth = player.money + assetsValue;

  // --- 2. BUILD RANKINGS ---
  
  // ACTORS
  const actorRanking = [
      ...NPC_DATABASE.map(npc => ({
          id: npc.id,
          name: npc.name,
          netWorth: npc.netWorth,
          isPlayer: false,
          tier: npc.tier,
          avatar: npc.avatar
      })),
      {
          id: 'player',
          name: player.name,
          netWorth: playerNetWorth,
          isPlayer: true,
          tier: player.stats.fame > 90 ? 'ICON' : player.stats.fame > 70 ? 'A_LIST' : player.stats.fame > 40 ? 'ESTABLISHED' : 'RISING',
          avatar: player.avatar
      }
  ].sort((a, b) => b.netWorth - a.netWorth);

  const playerRankIndex = actorRanking.findIndex(a => a.isPlayer);
  const playerRank = playerRankIndex + 1;

  // STUDIOS
  const studioRanking = player.world.studios 
    ? (Object.values(player.world.studios) as any[]).sort((a, b) => b.valuation - a.valuation)
    : (Object.values(STUDIO_CATALOG) as any[]).sort((a, b) => b.valuation - a.valuation);

  // STREAMERS
  const platformRanking = player.world.platforms
    ? (Object.values(player.world.platforms) as any[]).sort((a, b) => b.subscribers - a.subscribers)
    : (Object.values(PLATFORMS) as any[]).sort((a, b) => b.subscribers - a.subscribers);


  const formatValuation = (val: number) => {
      // Assuming val is in Billions
      if (val >= 1000) return `$${(val / 1000).toFixed(1)}T`;
      return `$${val}B`;
  };

  const formatSubs = (val: number) => `${val}M`;

  return (
    <div className="absolute inset-0 bg-black flex flex-col z-40 text-white animate-in slide-in-from-right duration-300 font-sans">
        {/* Header */}
        <div className="bg-zinc-900 p-4 pt-12 pb-3 shadow-lg flex items-center justify-between shrink-0 border-b border-zinc-800">
            <button onClick={onBack} className="p-1 rounded-full hover:bg-white/10 transition-colors"><ArrowLeft size={20} className="text-zinc-400"/></button>
            <div className="flex flex-col items-center">
                <h2 className="text-2xl font-black tracking-[0.2em] uppercase font-serif italic">FORBES</h2>
                <div className="text-[7px] tracking-[0.4em] text-zinc-500 uppercase font-black">The World's Richest</div>
            </div>
            <div className="w-8"></div>
        </div>

        {/* Tabs */}
        <div className="flex bg-zinc-950 border-b border-zinc-800 font-sans">
            <button onClick={() => setTab('ACTORS')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex flex-col items-center gap-1.5 ${tab === 'ACTORS' ? 'text-white bg-zinc-900 border-b-2 border-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
                <User size={16}/> Actors
            </button>
            <button onClick={() => setTab('STUDIOS')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex flex-col items-center gap-1.5 ${tab === 'STUDIOS' ? 'text-white bg-zinc-900 border-b-2 border-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
                <Building2 size={16}/> Studios
            </button>
            <button onClick={() => setTab('STREAMING')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex flex-col items-center gap-1.5 ${tab === 'STREAMING' ? 'text-white bg-zinc-900 border-b-2 border-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
                <Video size={16}/> Stream
            </button>
            <button onClick={() => setTab('MY_RANK')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex flex-col items-center gap-1.5 ${tab === 'MY_RANK' ? 'text-amber-400 bg-zinc-900 border-b-2 border-amber-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
                <Crown size={16}/> My Rank
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar font-sans bg-black">
            
            {/* ACTORS LIST */}
            {tab === 'ACTORS' && (
                <div className="divide-y divide-zinc-900">
                    {actorRanking.map((actor, idx) => (
                        <div key={actor.id} className={`flex items-center gap-4 p-4 ${actor.isPlayer ? 'bg-zinc-900/50' : ''}`}>
                            <div className={`font-mono font-bold text-lg w-8 text-center ${idx < 3 ? 'text-amber-400' : 'text-zinc-600'}`}>
                                #{idx + 1}
                            </div>
                            <div className="relative">
                                <img src={actor.avatar} className={`w-10 h-10 rounded-full object-cover ${actor.isPlayer ? 'border-2 border-amber-500' : 'grayscale opacity-70'}`} />
                                {idx === 0 && <div className="absolute -top-2 -right-2 text-amber-400"><Crown size={12} fill="currentColor"/></div>}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <div className={`font-bold ${actor.isPlayer ? 'text-white' : 'text-zinc-300'}`}>{actor.name}</div>
                                    {actor.isPlayer && <span className="bg-amber-500 text-black text-[8px] font-bold px-1.5 rounded">YOU</span>}
                                </div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{actor.tier.replace('_', ' ')}</div>
                            </div>
                            <div className="font-mono font-bold text-emerald-500 text-sm">
                                {formatMoney(actor.netWorth)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* STUDIOS LIST */}
            {tab === 'STUDIOS' && (
                <div className="p-4 space-y-3">
                    {studioRanking.map((studio, idx) => (
                        <div key={studio.id} className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-5 rounded-[2rem] flex flex-col gap-4 group hover:bg-zinc-900/60 hover:border-white/10 transition-all duration-500">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`font-serif italic font-black text-3xl leading-none w-8 ${idx < 3 ? 'text-amber-500' : 'text-zinc-800'}`}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="font-black text-xl leading-none mb-1.5 uppercase tracking-tighter group-hover:text-amber-400 transition-colors">{studio.name}</div>
                                        <div className="flex items-center gap-2.5">
                                            <div className="px-1.5 py-0.5 bg-zinc-800 rounded text-[7px] text-zinc-400 uppercase tracking-widest font-black">{studio.archetype}</div>
                                            <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
                                            <div className="text-[8px] text-emerald-500/80 uppercase tracking-widest font-black">Market Leader</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[7px] text-zinc-600 uppercase font-black tracking-[0.2em] mb-1">Valuation</div>
                                    <div className="font-mono text-xl font-black text-white leading-none">{formatValuation(studio.valuation)}</div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 flex flex-col items-center">
                                    <div className="text-[6px] text-zinc-600 uppercase font-black tracking-widest mb-1">Casting</div>
                                    <div className="text-[10px] font-black text-zinc-400">{(studio.castingBias?.reputation || 1).toFixed(1)}x</div>
                                </div>
                                <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 flex flex-col items-center">
                                    <div className="text-[6px] text-zinc-600 uppercase font-black tracking-widest mb-1">Quality</div>
                                    <div className="text-[10px] font-black text-zinc-400">{(studio.qualityBias?.script || 1).toFixed(1)}x</div>
                                </div>
                                <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 flex flex-col items-center">
                                    <div className="text-[6px] text-zinc-600 uppercase font-black tracking-widest mb-1">Pay</div>
                                    <div className="text-[10px] font-black text-zinc-400">{(studio.payMultiplier || 1).toFixed(1)}x</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* STREAMERS LIST */}
            {tab === 'STREAMING' && (
                <div className="p-4 space-y-4">
                    {platformRanking.map((plat, idx) => (
                        <div key={plat.id} className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-[2.5rem] overflow-hidden relative group hover:bg-zinc-900/60 transition-all duration-700">
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${plat.color || 'bg-indigo-500'} opacity-20 group-hover:opacity-40 transition-opacity`}></div>
                            
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`font-serif italic font-black text-2xl leading-none w-6 ${idx < 3 ? 'text-white' : 'text-zinc-800'}`}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className={`text-2xl font-black uppercase tracking-tighter leading-none mb-1 ${plat.color || 'text-indigo-400'}`}>{plat.name}</div>
                                        <div className="text-[8px] text-zinc-500 font-black uppercase tracking-[0.3em]">Global Network</div>
                                    </div>
                                </div>
                                <div className="bg-white/5 px-3 py-1 rounded-full text-[8px] font-black text-zinc-400 border border-white/5 uppercase tracking-widest backdrop-blur-md">
                                    {plat.churnRate}% Churn
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                <div className="bg-black/40 p-4 rounded-[1.5rem] border border-white/5 shadow-inner">
                                    <div className="text-[7px] text-zinc-600 uppercase font-black tracking-[0.2em] mb-1.5">Subscribers</div>
                                    <div className="font-mono text-2xl text-white font-black leading-none">{formatSubs(plat.subscribers)}</div>
                                </div>
                                <div className="bg-black/40 p-4 rounded-[1.5rem] border border-white/5 shadow-inner">
                                    <div className="text-[7px] text-zinc-600 uppercase font-black tracking-[0.2em] mb-1.5">Valuation</div>
                                    <div className="font-mono text-2xl text-emerald-400 font-black leading-none">{formatValuation(plat.valuation)}</div>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center gap-3">
                                <div className="flex-1 h-1 bg-zinc-800/50 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (plat.subscribers / 300) * 100)}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className={`h-full ${plat.color || 'bg-indigo-500'} shadow-[0_0_10px_rgba(99,102,241,0.4)]`}
                                    />
                                </div>
                                <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Market Share</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MY_RANK TAB */}
            {tab === 'MY_RANK' && (
                <div className="flex flex-col min-h-full bg-zinc-950">
                    {/* Premium Editorial Hero */}
                    <div className="relative h-[400px] overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black z-10"></div>
                        <motion.img 
                            initial={{ scale: 1.2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 0.6 }}
                            transition={{ duration: 1.5 }}
                            src={player.avatar} 
                            className="w-full h-full object-cover grayscale" 
                        />
                        
                        <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 pb-12">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-[1px] w-12 bg-amber-500"></div>
                                    <div className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em]">The Power List</div>
                                </div>
                                <h1 className="text-7xl font-black leading-none mb-4 tracking-tighter">
                                    <span className="text-white block">RANK</span>
                                    <span className="text-amber-500 block italic font-serif">#{playerRank}</span>
                                </h1>
                                <p className="text-zinc-400 text-sm max-w-[240px] leading-relaxed font-serif italic">
                                    "Success is not final, failure is not fatal: it is the courage to continue that counts."
                                </p>
                            </motion.div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="px-6 -mt-8 relative z-30 grid grid-cols-2 gap-4">
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="bg-zinc-900/80 backdrop-blur-xl border border-white/5 p-6 rounded-[2rem] shadow-2xl"
                        >
                            <div className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-2">Net Worth</div>
                            <div className="text-2xl font-black text-emerald-400 font-mono tracking-tighter">{formatMoney(playerNetWorth)}</div>
                            <div className="mt-4 flex items-center gap-2">
                                <TrendingUp size={12} className="text-emerald-500" />
                                <span className="text-[8px] text-emerald-500 font-bold uppercase">+12% this year</span>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="bg-zinc-900/80 backdrop-blur-xl border border-white/5 p-6 rounded-[2rem] shadow-2xl"
                        >
                            <div className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-2">Fame Level</div>
                            <div className="text-2xl font-black text-amber-400 tracking-tighter uppercase italic font-serif">{player.stats.fame > 90 ? 'Icon' : player.stats.fame > 70 ? 'A-List' : 'Rising'}</div>
                            <div className="mt-4 flex items-center gap-2">
                                <Star size={12} className="text-amber-500" fill="currentColor" />
                                <span className="text-[8px] text-amber-500 font-bold uppercase">{player.stats.fame}% Global Reach</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Secondary Stats */}
                    <div className="p-6 space-y-4">
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.9 }}
                            className="bg-zinc-900/40 border border-white/5 p-5 rounded-[2rem] flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                    <Award size={24} />
                                </div>
                                <div>
                                    <div className="text-xs font-black uppercase tracking-widest text-white">Awards Won</div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Industry Recognition</div>
                                </div>
                            </div>
                            <div className="text-2xl font-black text-white">{player.awards?.length || 0}</div>
                        </motion.div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-5 bg-white text-black rounded-[2rem] font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
                        >
                            <Share2 size={16} />
                            Share My Ranking
                        </motion.button>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};
