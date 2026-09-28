
import React from 'react';
import { ArrowLeft, Camera, X, Play } from 'lucide-react';

interface SocialFolderProps {
    onBack: () => void;
    onOpenX: () => void;
    onOpenInsta: () => void;
    onOpenYoutube?: () => void;
}

export const SocialFolder: React.FC<SocialFolderProps> = ({ onBack, onOpenX, onOpenInsta, onOpenYoutube }) => {
    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col z-50 animate-in zoom-in-95 duration-200">
            <button type="button" aria-label="Close Social folder" onClick={onBack} className="absolute left-3 top-8 z-10 grid h-11 w-11 place-items-center rounded-full bg-zinc-800/90 text-white" ><ArrowLeft size={20} /></button>
            <div className="p-6 pt-16 flex-1 flex flex-col items-center justify-center" onClick={onBack}>
                <div 
                    className="bg-zinc-800/80 border border-zinc-700 p-8 rounded-[3rem] w-full max-w-64 min-w-0 grid grid-cols-2 gap-4 shadow-2xl"
                    onClick={(e) => e.stopPropagation()} 
                >
                    {/* X Icon */}
                    <button type="button" className="flex min-w-0 min-h-11 flex-col items-center gap-2 group cursor-pointer" onClick={onOpenX}>
                        <div className="aspect-square w-full max-w-20 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform border border-zinc-700">
                            <X size={40} strokeWidth={3} />
                        </div>
                        <span className="text-white text-xs font-bold">X</span>
                    </button>

                    {/* Instagram Icon */}
                    <button type="button" className="flex min-w-0 min-h-11 flex-col items-center gap-2 group cursor-pointer" onClick={onOpenInsta}>
                        <div className="aspect-square w-full max-w-20 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform">
                            <Camera size={36} fill="white" />
                        </div>
                        <span className="text-white text-xs font-bold">Instagram</span>
                    </button>

                    {/* YouTube Icon (New) */}
                    {onOpenYoutube && (
                        <button type="button" className="flex min-w-0 min-h-11 flex-col items-center gap-2 group cursor-pointer" onClick={onOpenYoutube}>
                            <div className="aspect-square w-full max-w-20 bg-[#FF0000] rounded-2xl flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform relative overflow-hidden">
                                <Play size={40} fill="white" className="ml-1" />
                            </div>
                            <span className="text-white text-xs font-bold">YouTube</span>
                        </button>
                    )}
                </div>
                
                <div className="mt-8 text-white/50 text-sm animate-pulse">Social Media</div>
            </div>
        </div>
    );
};
