
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
            <div className="p-6 pt-16 flex-1 flex flex-col items-center justify-center" onClick={onBack}>
                <div 
                    className="bg-zinc-900/90 border border-zinc-700 p-8 rounded-[3rem] w-64 grid grid-cols-2 gap-6 shadow-2xl"
                    onClick={(e) => e.stopPropagation()} 
                >
                    {/* Tinder Icon */}
                    <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={onOpenTinder}>
                        <div className="w-20 h-20 bg-gradient-to-tr from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform">
                            <Flame size={40} fill="white" />
                        </div>
                        <span className="text-white text-xs font-bold">Tinder</span>
                    </div>

                    {/* Luxe Icon */}
                    <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={onOpenLuxe}>
                        <div className="w-20 h-20 bg-black border border-amber-500/50 rounded-2xl flex items-center justify-center text-amber-500 shadow-lg group-active:scale-95 transition-transform relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent"></div>
                            <Gem size={36} />
                        </div>
                        <span className="text-white text-xs font-bold">Luxe</span>
                    </div>
                </div>
                
                <div className="mt-8 text-white/50 text-sm animate-pulse">Tap outside to close</div>
            </div>
        </div>
    );
};
