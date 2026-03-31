
import React, { useState } from 'react';
import { Player, ActorSkills, Genre, Stats } from '../types';
import { formatMoney } from '../services/formatUtils';
import { ArrowLeft, Zap, DollarSign, Heart, Brain, Clapperboard, PlayCircle, ShieldAlert } from 'lucide-react';

interface StorePageProps {
    player: Player;
    onBack: () => void;
    onWatchAd: (type: 'REWARDED_CASH' | 'REWARDED_ENERGY' | 'REWARDED_STATS' | 'REWARDED_SKILL' | 'REWARDED_GENRE', data?: any) => void;
}

export const StorePage: React.FC<StorePageProps> = ({ player, onBack, onWatchAd }) => {
    const [selectedSkill, setSelectedSkill] = useState<keyof ActorSkills>('delivery');
    const [selectedGenre, setSelectedGenre] = useState<Genre>('ACTION');

    const GENRES: Genre[] = ['ACTION', 'DRAMA', 'COMEDY', 'ROMANCE', 'THRILLER', 'HORROR', 'SCI_FI', 'ADVENTURE', 'SUPERHERO'];
    const SKILLS: (keyof ActorSkills)[] = ['delivery', 'memorization', 'expression', 'improvisation', 'discipline', 'presence', 'charisma'];


    return (
        <div className="space-y-6 pb-24 pt-4 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
                    <ArrowLeft size={20} className="text-white" />
                </button>
                <h2 className="text-3xl font-bold text-white">Store</h2>
                <div className="ml-auto bg-amber-500/20 px-3 py-1 rounded-full text-amber-400 font-mono text-sm font-bold border border-amber-500/30 whitespace-nowrap">
                    {formatMoney(player.money)}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
                {/* Cash Ad */}
                <button 
                    onClick={() => onWatchAd('REWARDED_CASH')}
                    className="glass-card p-4 rounded-2xl text-left hover:bg-white/5 transition-all group border-emerald-500/30"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform"><DollarSign size={24}/></div>
                        <div className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Ad</div>
                    </div>
                    <div className="font-bold text-lg text-white">Get $10,000</div>
                    <div className="text-xs text-zinc-400">Instant cash injection</div>
                </button>

                {/* Energy Ad */}
                <button 
                    onClick={() => onWatchAd('REWARDED_ENERGY')}
                    className="glass-card p-4 rounded-2xl text-left hover:bg-white/5 transition-all group border-amber-500/30"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 group-hover:scale-110 transition-transform"><Zap size={24} fill="currentColor"/></div>
                        <div className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Ad</div>
                    </div>
                    <div className="font-bold text-lg text-white">Refill 25 Energy</div>
                    <div className="text-xs text-zinc-400">Keep working longer</div>
                </button>
            </div>

            {/* Wellbeing Package */}
            <button 
                onClick={() => onWatchAd('REWARDED_STATS')}
                className="w-full glass-card p-5 rounded-2xl flex items-center justify-between group border-rose-500/30 hover:bg-rose-900/10 transition-all"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-500/20 rounded-xl text-rose-400 group-hover:scale-110 transition-transform"><Heart size={28}/></div>
                    <div className="text-left">
                        <div className="font-bold text-lg text-white">Wellness Package</div>
                        <div className="text-xs text-zinc-400">Boost Health, Mood, Looks & Body to 90+</div>
                    </div>
                </div>
                <PlayCircle className="text-zinc-500 group-hover:text-rose-400 transition-colors" />
            </button>

            {/* Skill Boost */}
            <div className="glass-card p-5 rounded-2xl space-y-4 border-indigo-500/30">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Brain size={20}/></div>
                    <h3 className="font-bold text-white">Skill Master</h3>
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {SKILLS.map(skill => (
                        <button
                            key={skill}
                            onClick={() => setSelectedSkill(skill)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap capitalize transition-colors ${selectedSkill === skill ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}
                        >
                            {skill}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={() => onWatchAd('REWARDED_SKILL', selectedSkill)}
                    className="w-full py-3 bg-indigo-600/20 border border-indigo-500/50 rounded-xl text-indigo-300 font-bold text-sm hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                    <PlayCircle size={16}/> Boost {selectedSkill} (+10)
                </button>
            </div>

            {/* Genre Study */}
            <div className="glass-card p-5 rounded-2xl space-y-4 border-purple-500/30">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Clapperboard size={20}/></div>
                    <h3 className="font-bold text-white">Genre Study</h3>
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {GENRES.map(g => (
                        <button
                            key={g}
                            onClick={() => setSelectedGenre(g)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap capitalize transition-colors ${selectedGenre === g ? 'bg-purple-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}
                        >
                            {g}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={() => onWatchAd('REWARDED_GENRE', selectedGenre)}
                    className="w-full py-3 bg-purple-600/20 border border-purple-500/50 rounded-xl text-purple-300 font-bold text-sm hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                    <PlayCircle size={16}/> Study {selectedGenre} (+10 XP)
                </button>
            </div>

            <div className="text-center text-xs text-zinc-600 mt-4">
                Watch ads to support the game and get rewards.
            </div>
        </div>
    );
};
