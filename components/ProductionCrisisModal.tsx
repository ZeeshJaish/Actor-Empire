import React, { useState } from 'react';
import { Player, ScheduledEvent } from '../types';
import { AlertTriangle, Film, ChevronRight, Activity, Clapperboard, PlayCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { showAd } from '../services/adLogic';

interface ProductionCrisisModalProps {
    player: Player;
    event: ScheduledEvent;
    onChoice: (choiceIndex: number) => void;
}

export const ProductionCrisisModal: React.FC<ProductionCrisisModalProps> = ({ player, event, onChoice }) => {
    const [isProcessingAd, setIsProcessingAd] = useState(false);
    const { options, projectId } = event.data;
    const project = player.commitments.find(c => c.id === projectId);

    if (!project) return null;

    const handleChoice = async (opt: any) => {
        if (opt.isGolden) {
            setIsProcessingAd(true);
            try {
                const success = await showAd('REWARDED_BAILOUT');
                if (success) {
                    onChoice(opt.index);
                }
            } catch (error) {
                console.error("Ad failed:", error);
            } finally {
                setIsProcessingAd(false);
            }
        } else {
            onChoice(opt.index);
        }
    };

    const isDirectorDecision = event.type === 'DIRECTOR_DECISION';
    const themeColor = isDirectorDecision ? 'cyan' : 'red';
    const accentGradient = isDirectorDecision 
        ? 'from-cyan-600 via-blue-500 to-indigo-500' 
        : 'from-red-600 via-rose-500 to-orange-500';

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`w-full max-w-md bg-[#0a0a0a] rounded-3xl overflow-hidden border border-${themeColor}-900/50 shadow-[0_0_50px_rgba(${isDirectorDecision ? '6,182,212' : '220,38,38'},0.15)] relative`}
            >
                {isProcessingAd && (
                    <div className="absolute inset-0 z-[210] bg-black/90 flex flex-col items-center justify-center p-6 text-center">
                        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                        <h3 className="text-white font-bold text-lg mb-2">Preparing Golden Option...</h3>
                        <p className="text-zinc-400 text-sm">Your star power is being summoned.</p>
                    </div>
                )}

                {/* Top warning bar */}
                <div className={`h-2 w-full bg-gradient-to-r ${accentGradient}`} />
                
                {/* Header */}
                <div className="p-6 pb-4 border-b border-white/5 relative overflow-hidden">
                    <div className={`absolute -right-4 -top-4 text-${themeColor}-500/10`}>
                        {isDirectorDecision ? <Clapperboard size={120} /> : <AlertTriangle size={120} />}
                    </div>
                    
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <div className={`w-10 h-10 rounded-full bg-${themeColor}-500/20 flex items-center justify-center border border-${themeColor}-500/30`}>
                            {isDirectorDecision ? <Clapperboard size={20} className={`text-${themeColor}-500`} /> : <Activity size={20} className="text-red-500" />}
                        </div>
                        <div>
                            <div className={`text-[10px] font-mono text-${themeColor}-400 uppercase tracking-widest font-bold`}>
                                {isDirectorDecision ? 'Director Decision' : 'Production Alert'}
                            </div>
                            <div className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                                <Film size={12} /> {project.name}
                            </div>
                        </div>
                    </div>
                    
                    <h2 className="text-2xl font-black text-white tracking-tight leading-tight relative z-10">
                        {event.title}
                    </h2>
                </div>

                {/* Body */}
                <div className="p-6 pt-4">
                    <div className={`bg-${themeColor}-950/20 border border-${themeColor}-900/30 rounded-2xl p-4 mb-6 relative`}>
                        {/* Decorative quotes */}
                        <div className={`absolute -top-3 -left-2 text-4xl text-${themeColor}-500/20 font-serif`}>"</div>
                        <p className="text-sm text-zinc-300 leading-relaxed relative z-10">
                            {event.description}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 px-2">
                            {isDirectorDecision ? 'Creative Choice' : 'Select Action'}
                        </div>
                        {options.map((opt: any) => (
                            <motion.button 
                                key={opt.index}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleChoice(opt)}
                                className={`w-full p-4 ${opt.isGolden ? 'bg-amber-950/30 border-amber-500/50' : 'bg-zinc-900/80 border-white/5'} hover:bg-zinc-800 text-white rounded-2xl transition-all border hover:border-${themeColor}-500/50 flex items-center justify-between group relative overflow-hidden`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-r from-${themeColor}-500/0 via-${themeColor}-500/0 to-${themeColor}-500/5 opacity-0 group-hover:opacity-100 transition-opacity`} />
                                
                                <div className="flex items-center gap-3 relative z-10">
                                    {opt.isGolden && <PlayCircle size={18} className="text-amber-500" />}
                                    <span className={`text-sm font-bold tracking-wide ${opt.isGolden ? 'text-amber-400' : ''}`}>{opt.label}</span>
                                </div>
                                
                                <div className={`w-8 h-8 rounded-full bg-black/50 flex items-center justify-center group-hover:bg-${themeColor}-500/20 transition-colors relative z-10`}>
                                    <ChevronRight size={16} className={`text-zinc-500 group-hover:text-${themeColor}-400`} />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
