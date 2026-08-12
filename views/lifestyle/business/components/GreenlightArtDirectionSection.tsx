import React from 'react';
import { Clock, Palette } from 'lucide-react';
import { type GreenlightPacing, type GreenlightVisualStyle } from '../greenlightTypes';

const VISUAL_STYLES = [
    { id: 'REALISTIC', name: 'Realistic', desc: 'Grounded and authentic.', icon: '🎥' },
    { id: 'STYLISTIC', name: 'Stylistic', desc: 'Bold and artistic.', icon: '🎨' },
    { id: 'GRITTY', name: 'Gritty', desc: 'Dark and raw.', icon: '🌑' },
    { id: 'VIBRANT', name: 'Vibrant', desc: 'Colorful and energetic.', icon: '🌈' },
    { id: 'MINIMALIST', name: 'Minimalist', desc: 'Clean and simple.', icon: '⚪' },
    { id: 'NOIR', name: 'Noir', desc: 'High contrast and moody.', icon: '🕶️' },
] as const;

const PACING_OPTIONS = [
    { id: 'SLOW', name: 'Slow Burn', desc: 'Patient and atmospheric.', icon: '🕯️' },
    { id: 'MODERATE', name: 'Moderate', desc: 'Balanced and steady.', icon: '⚖️' },
    { id: 'FAST', name: 'Fast-Paced', desc: 'Quick and engaging.', icon: '⚡' },
    { id: 'FRENETIC', name: 'Frenetic', desc: 'High energy and chaotic.', icon: '🌪️' },
] as const;

interface GreenlightArtDirectionSectionProps {
    visualStyle: GreenlightVisualStyle;
    pacing: GreenlightPacing;
    tone: number;
    onVisualStyleChange: (value: GreenlightVisualStyle) => void;
    onPacingChange: (value: GreenlightPacing) => void;
    onToneChange: (value: number) => void;
}

export const GreenlightArtDirectionSection: React.FC<GreenlightArtDirectionSectionProps> = ({
    visualStyle,
    pacing,
    tone,
    onVisualStyleChange,
    onPacingChange,
    onToneChange,
}) => (
    <>
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Palette size={16} className="text-emerald-400" /> Visual Style
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {VISUAL_STYLES.map(style => (
                    <button
                        type="button"
                        key={style.id}
                        onClick={() => onVisualStyleChange(style.id)}
                        className={`p-4 rounded-xl border text-left transition-all group ${visualStyle === style.id ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                    >
                        <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{style.icon}</div>
                        <div className="font-black text-xs uppercase tracking-wider mb-1">{style.name}</div>
                        <div className="text-[10px] opacity-60 leading-tight">{style.desc}</div>
                    </button>
                ))}
            </div>
        </div>

        <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-amber-400" /> Pacing
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {PACING_OPTIONS.map(option => (
                    <button
                        type="button"
                        key={option.id}
                        onClick={() => onPacingChange(option.id)}
                        className={`p-4 rounded-xl border text-center transition-all group ${pacing === option.id ? 'bg-amber-500/10 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                    >
                        <div className="text-2xl mb-2 group-hover:rotate-12 transition-transform">{option.icon}</div>
                        <div className="font-black text-[10px] uppercase tracking-wider mb-1">{option.name}</div>
                        <div className="text-[9px] opacity-60 leading-tight">{option.desc}</div>
                    </button>
                ))}
            </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex justify-between text-sm font-bold mb-4">
                <span className={tone < 50 ? 'text-emerald-400' : 'text-zinc-500'}>Practical Effects</span>
                <span className={tone > 50 ? 'text-purple-400' : 'text-zinc-500'}>CGI Heavy</span>
            </div>
            <input
                type="range"
                min="0"
                max="100"
                value={tone}
                onChange={event => onToneChange(parseInt(event.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="mt-4 text-center text-xs text-zinc-400">
                {tone < 30 ? 'Focus on practical sets and stunts.' : tone > 70 ? 'Heavy reliance on visual effects.' : 'Balanced approach.'}
            </div>
        </div>
    </>
);
