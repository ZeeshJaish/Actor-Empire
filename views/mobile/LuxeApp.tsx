
import React, { useState, useEffect } from 'react';
import { Player, DatingMatch } from '../../types';
import { getLuxeCandidates, calculateSwipeSuccess } from '../../services/datingLogic';
import { ArrowLeft, Gem, Lock, Send, User } from 'lucide-react';

interface LuxeAppProps {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
}

export const LuxeApp: React.FC<LuxeAppProps> = ({ player, onBack, onUpdatePlayer }) => {
    const [candidates, setCandidates] = useState<DatingMatch[]>([]);
    const [view, setView] = useState<'GATE' | 'LIST'>('GATE');

    // Access Check: Fame > 30 OR Money > 1M
    const canAccess = player.stats.fame >= 30 || player.money >= 1000000;

    useEffect(() => {
        if (player.dating.isLuxeActive) {
            setView('LIST');
            setCandidates(getLuxeCandidates(player));
        }
    }, []);

    const handleApply = () => {
        if (canAccess) {
            onUpdatePlayer({ ...player, dating: { ...player.dating, isLuxeActive: true } });
            setCandidates(getLuxeCandidates(player));
            setView('LIST');
        }
    };

    const handleLike = (candidate: DatingMatch) => {
        const isMatch = calculateSwipeSuccess(player, candidate);
        if (isMatch) {
            // Add to matches
            onUpdatePlayer({
                ...player,
                dating: { ...player.dating, matches: [candidate, ...player.dating.matches] }
            });
            alert("It's a Match! Added to connections.");
        } else {
            // Remove from list temporarily
            setCandidates(prev => prev.filter(c => c.id !== candidate.id));
        }
    };

    const myMatches = player.dating.matches.filter(m => m.isPremium);

    return (
        <div className="absolute inset-0 bg-black flex flex-col z-40 text-white animate-in slide-in-from-bottom duration-300 font-serif">
            
            {/* Header */}
            <div className="p-4 pt-12 border-b border-amber-900/30 flex justify-between items-center bg-zinc-950">
                <button onClick={onBack} className="text-amber-500"><ArrowLeft size={24}/></button>
                <div className="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-widest">
                    <Gem size={16}/> Luxe
                </div>
                <div className="w-6"></div>
            </div>

            {view === 'GATE' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black">
                    <div className="w-24 h-24 border-2 border-amber-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                        <Gem size={48} className="text-amber-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Members Only</h2>
                    <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                        Luxe is an exclusive community for high-status individuals. 
                        Join the elite dating pool today.
                    </p>
                    
                    {canAccess ? (
                        <button onClick={handleApply} className="bg-amber-600 text-black px-8 py-3 rounded-full font-bold font-sans text-sm hover:bg-amber-500 transition-colors shadow-lg shadow-amber-900/20">
                            Apply for Membership
                        </button>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-zinc-500 text-xs font-sans">
                            <Lock size={16}/>
                            <span>Requirements not met.</span>
                            <span className="opacity-50">(Fame 30+ or $1M+ Net Worth)</span>
                        </div>
                    )}
                </div>
            )}

            {view === 'LIST' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    {/* Matches Section */}
                    {myMatches.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-xs font-sans font-bold text-amber-500 uppercase tracking-widest mb-3">Connections</h3>
                            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                                {myMatches.map(m => (
                                    <div key={m.id} className="flex flex-col items-center gap-2 shrink-0">
                                        <img src={m.image} className="w-14 h-14 rounded-full border border-amber-500 object-cover"/>
                                        <span className="text-[10px] text-zinc-400">{m.name.split(' ')[0]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <h3 className="text-xs font-sans font-bold text-zinc-500 uppercase tracking-widest mb-3">Today's Selection</h3>
                    <div className="space-y-4">
                        {candidates.map(candidate => (
                            <div key={candidate.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative group">
                                <div className="aspect-square relative">
                                    <img src={candidate.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                                    <div className="absolute bottom-0 left-0 p-4">
                                        <div className="text-xl font-bold text-white flex items-center gap-2">
                                            {candidate.name} <span className="text-sm font-normal text-zinc-300 font-sans">{candidate.age}</span>
                                        </div>
                                        <div className="text-xs text-amber-500 font-sans uppercase tracking-wider">{candidate.job}</div>
                                    </div>
                                </div>
                                <div className="p-3 bg-zinc-950 flex justify-between items-center">
                                    <div className="text-[10px] text-zinc-500 font-sans">Recently Active</div>
                                    <button 
                                        onClick={() => handleLike(candidate)}
                                        className="bg-zinc-800 hover:bg-amber-900/30 text-amber-500 p-2 rounded-full transition-colors"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
