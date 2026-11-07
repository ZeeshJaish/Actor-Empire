import React from 'react';
import { Clock, Palette } from 'lucide-react';
import { type GreenlightPacing, type GreenlightVisualStyle } from '../greenlightTypes';
import { formatSetupChange, getBestEffectsMix, getEffectsCostShare, getEffectsMixQuality, getVisualStyleQuality, PACING_EFFECTS } from '../../../../services/greenlightSetupEffects';
import { formatGenreLabel } from '../../../../services/genreCatalog';

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

const percent = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(Math.round(value * 100))}%`;

const STYLE_FIT_LABEL: Record<string, string> = { 2: 'Great fit', 1: 'Good fit', 0: 'Neutral', '-1': 'Poor fit' };

interface GreenlightArtDirectionSectionProps {
    genre?: string;
    effectsCost?: number;
    formatMoney?: (value: number) => string;
    visualStyle: GreenlightVisualStyle;
    pacing: GreenlightPacing;
    tone: number;
    onVisualStyleChange: (value: GreenlightVisualStyle) => void;
    onPacingChange: (value: GreenlightPacing) => void;
    onToneChange: (value: number) => void;
}

export const GreenlightArtDirectionSection: React.FC<GreenlightArtDirectionSectionProps> = ({
    genre,
    effectsCost = 0,
    formatMoney,
    visualStyle,
    pacing,
    tone,
    onVisualStyleChange,
    onPacingChange,
    onToneChange,
}) => {
    const genreName = genre ? formatGenreLabel(genre) : 'this genre';
    const mixQuality = getEffectsMixQuality(genre, tone);
    const best = getBestEffectsMix(genre);
    return (
    <>
        <div id="setup-style" className="space-y-4 scroll-mt-16">
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
                        <div className={`mt-1.5 text-[9px] font-black uppercase tracking-[0.06em] ${getVisualStyleQuality(genre, style.id) > 0 ? 'text-emerald-300' : getVisualStyleQuality(genre, style.id) < 0 ? 'text-rose-300' : 'text-zinc-500'}`}>
                            {STYLE_FIT_LABEL[String(getVisualStyleQuality(genre, style.id))]}{getVisualStyleQuality(genre, style.id) ? ` ${formatSetupChange(getVisualStyleQuality(genre, style.id))} quality` : ''}
                        </div>
                    </button>
                ))}
            </div>
        </div>

        <div id="setup-pacing" className="space-y-4 scroll-mt-16">
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
                        <div className="mt-1.5 text-[9px] font-black leading-tight text-amber-200/90">
                            {option.id === 'MODERATE' ? 'Even' : `Pull ${percent(PACING_EFFECTS[option.id].pull)} · Hold ${percent(PACING_EFFECTS[option.id].hold)}`}
                        </div>
                    </button>
                ))}
            </div>
        </div>

        <div id="setup-effects" className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 scroll-mt-16">
            <div className="flex justify-between text-sm font-bold mb-4">
                <span className={tone < 50 ? 'text-emerald-400' : 'text-zinc-500'}>Practical Effects</span>
                <span className={tone > 50 ? 'text-purple-400' : 'text-zinc-500'}>CGI Heavy</span>
            </div>
            <div className="relative">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={tone}
                    onChange={event => onToneChange(parseInt(event.target.value))}
                    aria-label="Practical effects or CGI"
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                {genre && <span aria-hidden="true" className="pointer-events-none absolute -bottom-2.5 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-amber-300" style={{ left: `${best}%` }} />}
            </div>
            <div className="mt-4 text-center text-xs text-zinc-400">
                {tone < 30 ? 'Focus on practical sets and stunts.' : tone > 70 ? 'Heavy reliance on visual effects.' : 'Balanced approach.'}
            </div>
            <div data-effects-read className="mt-2 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-black/30 p-2">
                    <div className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">Fit for {genreName}</div>
                    <div className={`mt-0.5 font-mono text-sm font-black ${mixQuality > 0 ? 'text-emerald-300' : mixQuality < 0 ? 'text-rose-300' : 'text-zinc-300'}`}>{formatSetupChange(mixQuality)} quality</div>
                </div>
                <div className="rounded-lg bg-black/30 p-2">
                    <div className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">Effects bill</div>
                    <div className="mt-0.5 font-mono text-sm font-black text-white">{formatMoney ? formatMoney(effectsCost) : `+${Math.round(getEffectsCostShare(tone) * 100)}%`}</div>
                </div>
            </div>
        </div>
    </>
    );
};
