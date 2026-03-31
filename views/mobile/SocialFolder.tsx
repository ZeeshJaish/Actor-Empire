
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
            <div className="p-6 pt-16 flex-1 flex flex-col items-center justify-center" onClick={onBack}>
                <div 
                    className="bg-zinc-800/80 border border-zinc-700 p-8 rounded-[3rem] w-64 grid grid-cols-2 gap-6 shadow-2xl"
                    onClick={(e) => e.stopPropagation()} 
                >
                    {/* X Icon */}
                    <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={onOpenX}>
                        <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform border border-zinc-700">
                            <X size={40} strokeWidth={3} />
                        </div>
                        <span className="text-white text-xs font-bold">X</span>
                    </div>

                    {/* Instagram Icon */}
                    <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={onOpenInsta}>
                        <div className="w-20 h-20 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform">
                            <Camera size={36} fill="white" />
                        </div>
                        <span className="text-white text-xs font-bold">Instagram</span>
                    </div>

                    {/* YouTube Icon (New) */}
                    {onOpenYoutube && (
                        <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={onOpenYoutube}>
                            <div className="w-20 h-20 bg-[#FF0000] rounded-2xl flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform relative overflow-hidden">
                                <Play size={40} fill="white" className="ml-1" />
                            </div>
                            <span className="text-white text-xs font-bold">YouTube</span>
                        </div>
                    )}
                </div>
                
                <div className="mt-8 text-white/50 text-sm animate-pulse">Social Media</div>
            </div>
        </div>
    );
};
