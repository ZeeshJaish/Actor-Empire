
import React from 'react';
import { ArrowLeft, Flame, Gem } from 'lucide-react';

interface DatingFolderProps {
    onBack: () => void;
    onOpenTinder: () => void;
    onOpenLuxe: () => void;
}

export const DatingFolder: React.FC<DatingFolderProps> = ({ onBack, onOpenTinder, onOpenLuxe }) => {
    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col z-50 animate-in zoom-in-95 duration-200">
            <button type="button" aria-label="Close Dating folder" onClick={onBack} className="absolute left-3 top-8 z-10 grid h-11 w-11 place-items-center rounded-full bg-zinc-800/90 text-white"><ArrowLeft size={20} /></button>
            <div className="p-6 pt-16 flex-1 flex flex-col items-center justify-center" onClick={onBack}>
                <div 
                    className="bg-zinc-900/90 border border-zinc-700 p-8 rounded-[3rem] w-full max-w-64 min-w-0 grid grid-cols-2 gap-4 shadow-2xl"
                    onClick={(e) => e.stopPropagation()} 
                >
                    {/* Tinder Icon */}
                    <button type="button" className="flex min-w-0 min-h-11 flex-col items-center gap-2 group cursor-pointer" onClick={onOpenTinder}>
                        <div className="aspect-square w-full max-w-20 bg-gradient-to-tr from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform">
                            <Flame size={40} fill="white" />
                        </div>
                        <span className="text-white text-xs font-bold">Tinder</span>
                    </button>

                    {/* Luxe Icon */}
                    <button type="button" className="flex min-w-0 min-h-11 flex-col items-center gap-2 group cursor-pointer" onClick={onOpenLuxe}>
                        <div className="aspect-square w-full max-w-20 bg-black border border-amber-500/50 rounded-2xl flex items-center justify-center text-amber-500 shadow-lg group-active:scale-95 transition-transform relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent"></div>
                            <Gem size={36} />
                        </div>
                        <span className="text-white text-xs font-bold">Luxe</span>
                    </button>
                </div>
                
                <div className="mt-8 text-white/50 text-sm animate-pulse">Tap outside to close</div>
            </div>
        </div>
    );
};
