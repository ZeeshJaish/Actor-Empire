import React from 'react';
import { ArrowLeft, Check, Clapperboard, Info, Star } from 'lucide-react';
import { type GreenlightStep } from '../greenlightTypes';

const STEP_ORDER: GreenlightStep[] = [
    'SELECT_SCRIPT',
    'DIRECTOR',
    'CAST',
    'CREW',
    'EQUIPMENT',
    'LOCATION',
    'SETUP',
    'CONFIRM',
    'BUZZ',
];

const NAVIGATION_STEPS: GreenlightStep[] = STEP_ORDER.slice(0, 8) as GreenlightStep[];
const STEP_LABELS = ['Script', 'Director', 'Cast', 'Crew', 'Gear', 'Loc', 'Setup', 'Go'];

interface GreenlightHeaderProps {
    step: GreenlightStep;
    onBack: () => void;
    onStepChange: (step: GreenlightStep) => void;
    selectedScriptId: string | null;
    currentEstimatedBuzz: number;
    currentEstimatedQuality: number;
    budgetBreakdown: {
        baseCost: number;
        scriptCost: number;
        equipmentCost: number;
    };
    musicBudget: number;
    reservedMarketingBudget: number;
    packageBudget: number;
    availableFunding: number;
    formatMoney: (value: number) => string;
    translate: (key: any) => string;
}

export const GreenlightHeader: React.FC<GreenlightHeaderProps> = ({
    step,
    onBack,
    onStepChange,
    selectedScriptId,
    currentEstimatedBuzz,
    currentEstimatedQuality,
    budgetBreakdown,
    musicBudget,
    reservedMarketingBudget,
    packageBudget,
    availableFunding,
    formatMoney,
    translate,
}) => {
    const stepIndex = STEP_ORDER.indexOf(step);
    const canNavigate = selectedScriptId !== null && step !== 'BUZZ';

    return (
        <div className="relative shrink-0 z-20 bg-emerald-950/40 backdrop-blur-2xl border-b border-emerald-500/20 shadow-2xl">
            <div className="max-w-5xl mx-auto w-full px-4 pt-safe-top pb-6">
                <div className="flex items-center justify-between gap-2 sm:gap-4 mb-6">
                    <button type="button" onClick={onBack} className="p-2 sm:p-2.5 bg-zinc-900/80 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all border border-zinc-800 shadow-lg group shrink-0">
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform sm:w-5 sm:h-5" />
                    </button>

                    <div className="flex flex-col items-center text-center shrink">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                            <Clapperboard className="text-emerald-500 hidden sm:block" size={18} />
                            <h1 className="text-base sm:text-xl font-black tracking-tighter text-white uppercase italic">GREENLIGHT</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] sm:text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-3 sm:px-4 py-1 rounded-full uppercase tracking-[0.2em] border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                {step.replace('_', ' ')}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center shrink-0 gap-2">
                        <div className="bg-black/60 px-3 py-2 sm:px-4 sm:py-3 rounded-2xl border border-amber-500/20 backdrop-blur-xl flex flex-col items-center justify-center shadow-2xl h-full">
                            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Buzz</span>
                            <div className="flex items-center gap-1">
                                <div className="relative inline-block w-[14px] h-[14px]">
                                    <Star size={14} className="absolute inset-0 text-zinc-700" />
                                    <div className="absolute inset-0 overflow-hidden" style={{ width: `${Math.min(100, Math.max(0, currentEstimatedBuzz))}%` }}>
                                        <Star size={14} className={`fill-amber-400 text-amber-400 ${currentEstimatedBuzz >= 100 ? 'animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : ''}`} />
                                    </div>
                                </div>
                                <span className="text-sm sm:text-lg font-mono font-black text-amber-400">{currentEstimatedBuzz}</span>
                            </div>
                        </div>

                        <div className="bg-black/60 px-3 py-2 sm:px-5 sm:py-3 rounded-2xl border border-emerald-500/20 backdrop-blur-xl flex flex-col items-end shadow-2xl min-w-[110px] sm:min-w-[160px]">
                            <div className="flex flex-col items-end mb-1 sm:mb-2">
                                <div className="flex items-center gap-1 group/budget relative">
                                    <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">Est. Budget</span>
                                    <Info size={8} className="text-zinc-600 cursor-help" />

                                    <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-2xl z-50 opacity-0 group-hover/budget:opacity-100 pointer-events-none transition-opacity">
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[9px]"><span className="text-zinc-500 uppercase">Base Production</span><span className="text-white font-mono">{formatMoney(budgetBreakdown.baseCost)}</span></div>
                                            <div className="flex justify-between text-[9px]"><span className="text-zinc-500 uppercase">{translate('greenlight.budget.scriptIp')}</span><span className="text-white font-mono">{formatMoney(budgetBreakdown.scriptCost)}</span></div>
                                            <div className="flex justify-between text-[9px]"><span className="text-zinc-500 uppercase">{translate('greenlight.budget.equipment')}</span><span className="text-white font-mono">{formatMoney(budgetBreakdown.equipmentCost)}</span></div>
                                            <div className="flex justify-between text-[9px]"><span className="text-zinc-500 uppercase">{translate('greenlight.budget.soundtrackArtists')}</span><span className="text-cyan-300 font-mono">{formatMoney(musicBudget)}</span></div>
                                            <div className="flex justify-between text-[9px]"><span className="text-zinc-500 uppercase">{translate('greenlight.marketing.reservedCampaignBudget')}</span><span className="text-amber-300 font-mono">{formatMoney(reservedMarketingBudget)}</span></div>
                                            <div className="pt-1.5 border-t border-zinc-800 flex justify-between text-[10px] font-bold"><span className="text-zinc-400 uppercase">{translate('greenlight.budget.totalPackage')}</span><span className="text-emerald-400 font-mono">{formatMoney(packageBudget)}</span></div>
                                        </div>
                                    </div>
                                </div>
                                <span className={`text-sm sm:text-xl font-mono font-black tracking-tighter ${packageBudget > availableFunding ? 'text-rose-500' : 'text-emerald-400'}`}>
                                    {formatMoney(packageBudget)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 w-full justify-end border-t border-white/5 pt-1 sm:pt-2">
                                <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-zinc-600">Est. Quality</span>
                                <span className={`text-[10px] sm:text-xs font-mono font-black ${currentEstimatedQuality > 80 ? 'text-amber-400' : currentEstimatedQuality > 60 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                    {currentEstimatedQuality}/100
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative px-2">
                    <div className="flex justify-between items-start relative">
                        <div className="absolute left-0 right-0 top-[14px] h-0.5 bg-zinc-900/50 -z-10 rounded-full"></div>
                        <div className="absolute left-0 top-[14px] h-0.5 bg-emerald-500 -z-10 transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${(stepIndex / 7) * 100}%` }}></div>

                        {STEP_LABELS.map((label, index) => {
                            const isActive = index === stepIndex;
                            const isCompleted = index < stepIndex;
                            return (
                                <button
                                    type="button"
                                    key={label}
                                    onClick={() => canNavigate && onStepChange(NAVIGATION_STEPS[index])}
                                    disabled={!canNavigate}
                                    className={`flex flex-col items-center gap-1.5 relative group ${canNavigate ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                >
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black border-2 transition-all duration-500 ${
                                        isActive
                                            ? 'bg-emerald-500 border-emerald-300 text-black scale-110 shadow-[0_0_15px_rgba(16,185,129,0.6)] z-10'
                                            : isCompleted
                                                ? 'bg-emerald-900 border-emerald-600 text-emerald-400 group-hover:bg-emerald-800'
                                                : 'bg-zinc-950 border-zinc-800 text-zinc-700 group-hover:border-zinc-600'
                                    }`}>
                                        {isCompleted ? <Check size={12} strokeWidth={4} /> : index + 1}
                                    </div>
                                    <span className={`text-[7px] font-bold uppercase tracking-tighter transition-colors duration-300 ${isActive ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                                        {label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
