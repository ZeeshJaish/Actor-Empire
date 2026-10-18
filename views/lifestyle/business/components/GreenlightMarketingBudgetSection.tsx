import React from 'react';
import { DollarSign } from 'lucide-react';
import {
    type MarketingBudgetPreset,
    MARKETING_BUDGET_PRESETS,
    getMarketingBudgetForPreset,
} from '../greenlightUtils';

interface GreenlightMarketingBudgetSectionProps {
    marketingBudgetPreset: MarketingBudgetPreset;
    reservedMarketingBudget: number;
    productionBudget: number;
    maxMarketingBudget: number;
    onPresetChange: (preset: MarketingBudgetPreset) => void;
    onReservedBudgetChange: (value: number) => void;
    formatMoney: (value: number) => string;
    translate: (key: any) => string;
}

export const GreenlightMarketingBudgetSection: React.FC<GreenlightMarketingBudgetSectionProps> = ({
    marketingBudgetPreset,
    reservedMarketingBudget,
    productionBudget,
    maxMarketingBudget,
    onPresetChange,
    onReservedBudgetChange,
    formatMoney,
    translate,
}) => (
    <div className="bg-zinc-950/70 border border-amber-500/20 rounded-2xl p-5 space-y-5 shadow-[0_0_24px_rgba(245,158,11,0.08)]">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign size={16} /> {translate('greenlight.marketing.reservedCampaignBudget')}
                </h3>
                <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{translate('greenlight.marketing.reservedCampaignBody')}</p>
            </div>
            <div className="text-left sm:text-right">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">{translate('greenlight.marketing.reserved')}</div>
                <div className="font-mono text-3xl font-black text-amber-300">{formatMoney(reservedMarketingBudget)}</div>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MARKETING_BUDGET_PRESETS.map(option => {
                const amount = getMarketingBudgetForPreset(option.id, productionBudget);
                const isSelected = marketingBudgetPreset === option.id;
                return (
                    <button
                        type="button"
                        key={option.id}
                        onClick={() => {
                            onPresetChange(option.id);
                            onReservedBudgetChange(amount);
                        }}
                        className={`p-4 rounded-xl border text-left transition-all ${isSelected ? 'bg-amber-500/10 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.18)]' : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-amber-500/40 hover:text-white'}`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] font-black uppercase tracking-widest">{translate(`greenlight.marketing.preset.${option.id}.label`)}</div>
                            <div className="font-mono text-xs font-black text-amber-300">{formatMoney(amount)}</div>
                        </div>
                        <div className="mt-2 text-[10px] text-zinc-500 leading-tight">{translate(`greenlight.marketing.preset.${option.id}.note`)}</div>
                    </button>
                );
            })}
        </div>

        <div className={`rounded-xl border p-4 transition-all ${marketingBudgetPreset === 'CUSTOM' ? 'border-amber-500/50 bg-amber-500/5' : 'border-zinc-800 bg-black/25'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                    type="button"
                    onClick={() => onPresetChange('CUSTOM')}
                    className={`shrink-0 px-4 py-3 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-colors ${marketingBudgetPreset === 'CUSTOM' ? 'border-amber-400 bg-amber-400 text-black' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white'}`}
                >
                    {translate('greenlight.marketing.custom')}
                </button>
                <div className="flex-1">
                    <input
                        type="range"
                        min="0"
                        max={maxMarketingBudget}
                        step="50000"
                        value={reservedMarketingBudget}
                        onChange={event => {
                            onPresetChange('CUSTOM');
                            onReservedBudgetChange(Math.min(maxMarketingBudget, Math.max(0, Number(event.target.value) || 0)));
                        }}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <div className="mt-2 flex justify-between text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                        <span>No reserve</span>
                        <span>Max {formatMoney(maxMarketingBudget)}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
