import React from 'react';
import { BookOpen, Check, Star } from 'lucide-react';

interface GreenlightScriptStepProps {
    scripts: any[];
    selectedScriptId: string | null;
    onSelectScript: (scriptId: string) => void;
    onOpenScriptMarket: () => void;
    onCancel: () => void;
    onNext: () => void;
}

export const GreenlightScriptStep: React.FC<GreenlightScriptStepProps> = ({
    scripts,
    selectedScriptId,
    onSelectScript,
    onOpenScriptMarket,
    onCancel,
    onNext,
}) => (
    <div className="space-y-6 max-w-5xl mx-auto px-4 pt-6 pb-44">
        {scripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <BookOpen size={48} className="opacity-20" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">No Scripts Available</h2>
                <p className="text-sm max-w-xs text-center leading-relaxed">Your vault is empty. Visit the script market, buy a project, then return here to green-light it.</p>
                <button type="button" onClick={onOpenScriptMarket} className="mt-8 px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 shadow-[0_0_25px_rgba(16,185,129,0.25)]">Open Script Market</button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                {scripts.map(script => (
                    <button
                        type="button"
                        key={script.id}
                        onClick={() => onSelectScript(script.id)}
                        className={`relative group text-left transition-all duration-500 hover:-translate-y-2 ${selectedScriptId === script.id ? 'scale-105 z-10' : 'hover:scale-105'}`}
                    >
                        <div className={`h-[320px] rounded-xl border-2 p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl ${
                            selectedScriptId === script.id
                                ? 'bg-zinc-900 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.2)]'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                        }`}>
                            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>

                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                        script.projectType === 'MOVIE'
                                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    }`}>
                                        {script.projectType}
                                    </div>
                                    {selectedScriptId === script.id && <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-black shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-in zoom-in"><Check size={14} strokeWidth={3} /></div>}
                                </div>

                                <h3 className={`text-2xl font-black uppercase leading-none mb-2 ${selectedScriptId === script.id ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                                    {script.title}
                                </h3>
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {script.genres.map((genre: string) => (
                                        <span key={genre} className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">#{genre}</span>
                                    ))}
                                </div>

                                <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed italic">
                                    "{script.logline || 'A compelling story waiting to be told...'}"
                                </p>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase text-zinc-600">Script Quality</span>
                                    <div className="flex items-center gap-1">
                                        <Star size={12} className="text-amber-500 fill-amber-500" />
                                        <span className="text-sm font-mono font-bold text-white">{script.quality}/100</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase text-zinc-600">Dev Time</span>
                                    <span className="text-xs font-mono text-zinc-400">{script.weeksInDevelopment} Weeks</span>
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe-lg bg-gradient-to-t from-[#020a05] via-[#020a05]/90 to-transparent pointer-events-none flex justify-center z-30">
            <div className="pointer-events-auto flex gap-4 w-full max-w-md">
                <button type="button" onClick={onCancel} className="flex-1 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold py-4 rounded-xl transition-colors border border-zinc-700 backdrop-blur-md">
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!selectedScriptId}
                    className={`flex-[2] font-black uppercase tracking-wider py-4 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 ${
                        selectedScriptId
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                >
                    Next: Director
                </button>
            </div>
        </div>
    </div>
);
