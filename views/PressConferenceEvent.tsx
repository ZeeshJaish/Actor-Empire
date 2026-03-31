
import React, { useState } from 'react';
import { Player, PressInteraction, Stats } from '../types';
import { Mic2, ArrowRight, Users, Camera, X } from 'lucide-react';

interface PressConferenceEventProps {
    player: Player;
    projectName: string;
    questions: PressInteraction[];
    onComplete: (statsDelta: Partial<Stats>, buzzDelta: number, logMessage: string) => void;
    onClose: () => void;
}

export const PressConferenceEvent: React.FC<PressConferenceEventProps> = ({ player, projectName, questions, onComplete, onClose }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [accumulatedStats, setAccumulatedStats] = useState<Partial<Stats>>({});
    const [accumulatedBuzz, setAccumulatedBuzz] = useState(0);
    const [answersLog, setAnswersLog] = useState<string[]>([]);

    const currentQuestion = questions[currentQuestionIndex];

    const handleAnswer = (choice: PressInteraction['options'][0]) => {
        // Accumulate stats locally
        const newStats = { ...accumulatedStats };
        if (choice.consequences.fame) newStats.fame = (newStats.fame || 0) + choice.consequences.fame;
        if (choice.consequences.reputation) newStats.reputation = (newStats.reputation || 0) + choice.consequences.reputation;
        if (choice.consequences.followers) newStats.followers = (newStats.followers || 0) + choice.consequences.followers;
        
        setAccumulatedStats(newStats);
        setAccumulatedBuzz(prev => prev + (choice.consequences.buzz || 0));
        setAnswersLog(prev => [...prev, choice.style]); // Track style for final summary text

        // Next Question or Finish
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            finishConference(newStats, accumulatedBuzz + (choice.consequences.buzz || 0), [...answersLog, choice.style]);
        }
    };

    const finishConference = (finalStats: Partial<Stats>, finalBuzz: number, styles: string[]) => {
        // Generate a log message based on dominant style
        const styleCounts = styles.reduce((acc, style) => {
            acc[style] = (acc[style] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const dominantStyle = Object.keys(styleCounts).reduce((a, b) => styleCounts[a] > styleCounts[b] ? a : b);
        
        let message = `Completed press tour for ${projectName}. `;
        if (dominantStyle === 'RISKY') message += "Your controversial comments are making headlines.";
        else if (dominantStyle === 'BOLD') message += "You showed great confidence.";
        else if (dominantStyle === 'HUMBLE') message += "Critics charmed by your humility.";
        else message += "A standard, safe appearance.";

        onComplete(finalStats, finalBuzz, message);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-end md:justify-center overflow-hidden font-sans animate-in fade-in duration-300">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-black/80 to-black pointer-events-none"></div>
            
            {/* Simulated Flashes */}
            {[...Array(5)].map((_, i) => (
                <div 
                    key={i} 
                    className="absolute w-64 h-64 bg-white/10 rounded-full blur-[100px] animate-flash-pop" 
                    style={{
                        top: `${Math.random() * 50}%`,
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`,
                        animationDuration: '0.5s'
                    }}
                />
            ))}

            {/* Cancel Button */}
            <button onClick={onClose} className="absolute top-6 right-6 z-50 text-white/50 hover:text-white transition-colors">
                <X size={24} />
            </button>

            {/* Camera UI Overlay */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                        <span className="text-red-600 font-bold tracking-widest text-xs">LIVE</span>
                    </div>
                    <span className="text-white/50 font-mono text-xs">{projectName.toUpperCase()} PRESS JUNKET</span>
                </div>
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    <Users size={14} className="text-zinc-400"/>
                    <span className="text-xs font-bold text-white">Press Corps</span>
                </div>
            </div>

            {/* Main Interaction Area */}
            <div className="w-full max-w-md relative z-20 p-6 pb-12 md:pb-6 animate-in slide-in-from-bottom duration-500">
                
                {/* Progress Indicators */}
                <div className="flex gap-2 mb-6 justify-center">
                    {questions.map((_, idx) => (
                        <div key={idx} className={`h-1 flex-1 rounded-full transition-all duration-300 ${idx <= currentQuestionIndex ? 'bg-blue-500' : 'bg-zinc-800'}`}></div>
                    ))}
                </div>

                {/* Reporter / Context */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center border-4 border-black shadow-lg relative z-10 shrink-0">
                        <Mic2 size={24} className="text-white" />
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-r-2xl rounded-tl-2xl -ml-6 pl-8 border border-white/10">
                        <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Reporter Question {currentQuestionIndex + 1}</div>
                        <div className="text-xs text-white/80">Entertainment Weekly</div>
                    </div>
                </div>

                {/* The Question */}
                <div className="mb-8 min-h-[100px]">
                    <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight drop-shadow-xl italic">
                        "{currentQuestion.question}"
                    </h3>
                </div>

                {/* Options */}
                <div className="space-y-3">
                    {currentQuestion.options.map((opt, i) => (
                        <button 
                            key={i}
                            onClick={() => handleAnswer(opt)}
                            className="w-full relative group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur-xl p-5 text-left transition-all hover:border-blue-500/50 hover:bg-zinc-800 active:scale-[0.98]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:to-transparent transition-all duration-500"></div>
                            
                            <div className="relative z-10 flex justify-between items-center">
                                <div>
                                    <div className="text-base font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                                        {opt.text}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                            opt.style === 'RISKY' ? 'bg-rose-500/20 text-rose-400' :
                                            opt.style === 'BOLD' ? 'bg-purple-500/20 text-purple-400' :
                                            opt.style === 'HUMBLE' ? 'bg-emerald-500/20 text-emerald-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                            {opt.style}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                                    <ArrowRight size={16} />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="mt-8 text-center opacity-50">
                    <div className="inline-flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
                        <Camera size={12} />
                        Smile for the cameras
                    </div>
                </div>
            </div>
        </div>
    );
};
