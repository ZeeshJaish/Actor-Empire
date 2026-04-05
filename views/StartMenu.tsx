
import React, { useState, useEffect } from 'react';
import { Play, Plus, Trash2, Clapperboard, Star, User, Calendar, Award } from 'lucide-react';
import { Player } from '../types';

interface StartMenuProps {
  saveSlots: Record<number, Player | null>;
  onSelectSlot: (slot: number) => void;
  onDeleteSlot: (slot: number) => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({ saveSlots, onSelectSlot, onDeleteSlot }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [view, setView] = useState<'MAIN' | 'SLOTS'>('MAIN');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    // Intro Sequence Timing
    const timer1 = setTimeout(() => {
        setShowSplash(false);
    }, 2500); // Splash visible for 2.5s

    const timer2 = setTimeout(() => {
        setShowMenu(true);
    }, 2800); // Menu appears shortly after

    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  const renderSlot = (slot: number) => {
    const save = saveSlots[slot];
    const isDeleting = confirmDelete === slot;

    return (
        <div key={slot} className="relative group">
            <button
                onClick={() => !isDeleting && onSelectSlot(slot)}
                className={`w-full h-24 rounded-3xl relative overflow-hidden transition-all duration-500 border flex items-center justify-between px-6 ${
                    save 
                    ? 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-600 hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] backdrop-blur-sm' 
                    : 'bg-zinc-900/20 border-zinc-900 border-dashed hover:bg-zinc-900/40 hover:border-zinc-700'
                }`}
            >
                <div className="flex flex-col items-start relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-800 px-2 py-0.5 rounded">Slot {slot}</span>
                        {save && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Active</span>}
                    </div>
                    {save ? (
                        <div className="flex flex-col items-start">
                            <span className="text-lg font-bold text-white leading-tight">{save.name}</span>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Calendar size={10}/> Age {save.age}</span>
                                <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Award size={10}/> {save.stats.fame.toLocaleString()} Fame</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-start">
                            <span className="text-lg font-bold text-zinc-600">Empty Slot</span>
                            <span className="text-[10px] text-zinc-700 uppercase tracking-wider">Start New Career</span>
                        </div>
                    )}
                </div>

                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 relative z-10 ${save ? 'bg-white text-black group-hover:scale-110 group-hover:rotate-12' : 'bg-zinc-800 text-zinc-600 group-hover:bg-zinc-700'}`}>
                    {save ? <Play size={20} fill="currentColor" /> : <Plus size={22} />}
                </div>
                
                {/* Hover Glow Effect */}
                {save && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>}
            </button>

            {save && (
                <div className="absolute -right-2 -top-2 z-30">
                    {isDeleting ? (
                        <div className="flex items-center gap-1 animate-in zoom-in duration-200">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteSlot(slot); setConfirmDelete(null); }}
                                className="bg-rose-600 text-white p-2 rounded-full shadow-lg hover:bg-rose-500 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                                className="bg-zinc-700 text-white p-2 rounded-full shadow-lg hover:bg-zinc-600 transition-colors"
                            >
                                <Plus size={14} className="rotate-45" />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(slot); }}
                            className="bg-zinc-800 text-zinc-500 p-2 rounded-full shadow-lg hover:bg-rose-900/50 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="h-full relative flex flex-col items-center justify-center bg-black font-sans overflow-hidden">
        {/* Custom CSS for blob animations */}
        <style>{`
            @keyframes float {
                0% { transform: translate(0px, 0px) scale(1); }
                33% { transform: translate(30px, -50px) scale(1.1); }
                66% { transform: translate(-20px, 20px) scale(0.9); }
                100% { transform: translate(0px, 0px) scale(1); }
            }
            .animate-blob {
                animation: float 10s infinite ease-in-out;
            }
            .delay-2000 { animation-delay: 2s; }
            .delay-4000 { animation-delay: 4s; }
        `}</style>

        {/* --- SPLASH SCREEN (INTRO) --- */}
        <div className={`absolute inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-1000 ${showSplash ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden">
                {/* Background Effects for Splash */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/20 via-black to-black"></div>
                
                <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-[2000ms]">
                    <div className="mb-6 relative">
                        <Clapperboard size={64} className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" />
                        <Star size={24} className="text-amber-500 absolute -top-2 -right-4 animate-pulse fill-amber-500" />
                    </div>
                    
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500 tracking-[0.2em] mb-2 drop-shadow-lg">
                        ZEESH BUILDS
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="h-[1px] w-8 bg-zinc-700"></div>
                        <span className="text-[10px] font-bold text-zinc-500 tracking-[0.5em] uppercase">Presents</span>
                        <div className="h-[1px] w-8 bg-zinc-700"></div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- MAIN MENU --- */}
        <div className={`relative z-10 w-full h-full flex flex-col items-center justify-between py-12 px-6 transition-all duration-1000 ${showMenu ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            
            {/* Background Animated Shapes */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px] animate-blob mix-blend-screen" />
                <div className="absolute bottom-[10%] right-[-20%] w-[400px] h-[400px] bg-amber-900/10 rounded-full blur-[80px] animate-blob delay-2000 mix-blend-screen" />
                <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-purple-900/10 rounded-full blur-[60px] animate-blob delay-4000 mix-blend-screen" />
                
                {/* Noise Texture Overlay */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
            </div>

            {/* Top Section: Title (Text Only) */}
            <div className="flex-1 flex flex-col items-center justify-center w-full">
                <div className="relative">
                    <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 leading-[0.85] text-center mb-6 drop-shadow-2xl">
                        ACTOR<br/>EMPIRE
                    </h1>
                    <div className="absolute -right-6 -top-6 text-amber-500 animate-pulse">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
                    <span className="w-8 h-[1px] bg-zinc-800"></span>
                    <span>Version 1.0.11</span>
                    <span className="w-8 h-[1px] bg-zinc-800"></span>
                </div>
            </div>

            {/* Middle Section: Main Menu or Save Slots */}
            <div className="w-full max-w-sm space-y-4 relative z-20">
                {view === 'MAIN' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <button 
                            onClick={() => setView('SLOTS')}
                            className="w-full py-6 bg-white text-black font-black text-xl rounded-full hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_50px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3"
                        >
                            <Play size={24} fill="currentColor" /> START CAREER
                        </button>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.5em]">Select Save Slot</div>
                            <button 
                                onClick={() => setView('MAIN')}
                                className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest underline underline-offset-4"
                            >
                                Back
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {[1, 2, 3].map(renderSlot)}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Section: Footer Credits */}
            <div className="mt-8 text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                    Designed & Built by Zeesh
                </div>
            </div>

        </div>
    </div>
  );
};
