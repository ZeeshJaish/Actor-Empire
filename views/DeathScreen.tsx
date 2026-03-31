import React from 'react';
import { Player, Relationship, BloodlineMember, INITIAL_PLAYER } from '../types';
import { Skull, ArrowRight, RefreshCw, Trophy, DollarSign, Film } from 'lucide-react';
import { getRelationshipAge } from '../services/legacyLogic';

interface DeathScreenProps {
    player: Player;
    onContinueAsChild: (child: Relationship) => void;
    onStartNewGame: () => void;
}

export const DeathScreen: React.FC<DeathScreenProps> = ({ player, onContinueAsChild, onStartNewGame }) => {
    const children = player.relationships.filter(r => r.relation === 'Child');
    
    const totalAwards = player.awards?.length || 0;
    const totalMovies = player.pastProjects.length;

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(50,0,0,0.3)_0%,rgba(0,0,0,1)_100%)] pointer-events-none" />
            
            <div className="relative z-10 w-full max-w-2xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                
                <div className="flex justify-center mb-6">
                    <div className="w-32 h-32 rounded-full bg-zinc-900 border-4 border-red-900/50 flex items-center justify-center overflow-hidden">
                        {player.avatar ? (
                            <img src={player.avatar} alt={player.name} className="w-full h-full object-cover grayscale opacity-70" />
                        ) : (
                            <Skull size={48} className="text-red-500/50" />
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-5xl font-black tracking-tighter text-red-50">{player.name}</h1>
                    <p className="text-xl text-red-400/80 font-serif italic">Passed away at age {player.age}</p>
                </div>

                <div className="grid grid-cols-3 gap-4 py-8 border-y border-red-900/30">
                    <div className="flex flex-col items-center p-4 bg-zinc-900/50 rounded-2xl">
                        <DollarSign size={24} className="text-green-500 mb-2" />
                        <span className="text-2xl font-bold">${(player.money / 1000000).toFixed(1)}M</span>
                        <span className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Net Worth</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-zinc-900/50 rounded-2xl">
                        <Film size={24} className="text-blue-500 mb-2" />
                        <span className="text-2xl font-bold">{totalMovies}</span>
                        <span className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Projects</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-zinc-900/50 rounded-2xl">
                        <Trophy size={24} className="text-yellow-500 mb-2" />
                        <span className="text-2xl font-bold">{totalAwards}</span>
                        <span className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Awards</span>
                    </div>
                </div>

                <div className="space-y-6 pt-4">
                    {children.length > 0 ? (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-zinc-400 uppercase tracking-widest">Pass the Torch</h3>
                            <p className="text-sm text-zinc-500 mb-4">Continue your legacy as one of your children. They will inherit your wealth and businesses, but must forge their own path in the industry.</p>
                            
                            <div className="grid gap-3">
                                {children.map(child => (
                                    <button
                                        key={child.id}
                                        onClick={() => onContinueAsChild(child)}
                                        className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800">
                                                {child.image ? (
                                                    <img src={child.image} alt={child.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-zinc-600">
                                                        {child.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-lg">{child.name}</div>
                                                <div className="text-sm text-zinc-500">Age {getRelationshipAge(child, player.age, player.currentWeek)}</div>
                                            </div>
                                        </div>
                                        <ArrowRight size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                            <p className="text-zinc-400">Your bloodline ends here. You leave behind a legacy, but no heir to continue it.</p>
                        </div>
                    )}

                    <div className="pt-8">
                        <button
                            onClick={onStartNewGame}
                            className="w-full py-4 bg-transparent border border-zinc-800 text-zinc-400 rounded-full hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-sm"
                        >
                            <RefreshCw size={16} /> Start New Game
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
