import React from 'react';
import { type StudioEquipment } from '../../../../types';
import { getEquipmentStageName } from '../FacilitiesView';

export const GREENLIGHT_GEAR_TIERS: Record<string, {
    name: string;
    desc: string;
    cost: number;
    quality: number;
}> = {
    TIER_1: { name: 'Indie Kit', desc: 'Basic DSLR and mirrorless setup.', cost: 10_000, quality: 2 },
    TIER_2: { name: 'Prosumer Setup', desc: 'Mid-tier professional equipment.', cost: 100_000, quality: 5 },
    TIER_3: { name: 'Standard Industry', desc: 'Industry standard digital cinema gear.', cost: 500_000, quality: 8 },
    TIER_4: { name: 'High-End Premium', desc: 'Custom large-format rigs and lenses.', cost: 2_500_000, quality: 15 },
    TIER_5: { name: 'Cutting-Edge', desc: 'Experimental tech and massive setups.', cost: 8_500_000, quality: 30 },
};

const GEAR_CATEGORIES = [
    {
        id: 'cameras',
        name: 'Camera Rigs',
        icon: '🎥',
        tiers: {
            TIER_1: { name: 'Indie Kit', desc: 'Basic DSLR and mirrorless setup.' },
            TIER_2: { name: 'Prosumer Setup', desc: 'RED Komodo or similar mid-tier.' },
            TIER_3: { name: 'Panavision Standard', desc: 'Industry standard digital cinema cameras.' },
            TIER_4: { name: 'IMAX & Arri Rental', desc: 'Custom large-format rigs and lenses.' },
            TIER_5: { name: 'Experimental Tech', desc: 'Cutting-edge prototypes.' },
        },
    },
    {
        id: 'lighting',
        name: 'Lighting & Grip',
        icon: '💡',
        tiers: {
            TIER_1: { name: 'Basic Reflectors', desc: 'Natural light and bounce boards.' },
            TIER_2: { name: 'LED Panel Kit', desc: 'Portable LED lighting setup.' },
            TIER_3: { name: 'CineGrip Co.', desc: 'Standard LED panels and grip trucks.' },
            TIER_4: { name: 'Luminance Pro', desc: 'Stadium arrays and specialized rigs.' },
            TIER_5: { name: 'Sun-Sync Tech', desc: 'Massive artificial sunlight arrays.' },
        },
    },
    {
        id: 'sound',
        name: 'Sound Engineering',
        icon: '🎙️',
        tiers: {
            TIER_1: { name: 'Zoom Recorder', desc: 'Basic field recorder and lavs.' },
            TIER_2: { name: 'Pro Boom Kit', desc: 'High-quality shotgun mics.' },
            TIER_3: { name: 'ClearAudio Rentals', desc: 'Professional boom mics and recorders.' },
            TIER_4: { name: 'Dolby Atmos Stage', desc: 'Full spatial audio capture setup.' },
            TIER_5: { name: 'Neural Audio Lab', desc: 'AI-enhanced perfect isolation.' },
        },
    },
    {
        id: 'practicalEffects',
        name: 'Practical Sets',
        icon: '📦',
        tiers: {
            TIER_1: { name: 'Garage Studio', desc: 'DIY sets and basic props.' },
            TIER_2: { name: 'Indie Warehouse', desc: 'Rented space with modular walls.' },
            TIER_3: { name: 'Studio B Backlot', desc: 'Standard warehouse and basic sets.' },
            TIER_4: { name: 'Pinewood Stages', desc: 'Massive soundstages and custom builds.' },
            TIER_5: { name: 'Volume Stage', desc: 'Massive LED volume for virtual production.' },
        },
    },
] as const;

interface GreenlightEquipmentStepProps {
    studioEquipment?: StudioEquipment;
    choices: Record<string, string>;
    onChange: (choices: Record<string, string>) => void;
    onBack: () => void;
    onNext: () => void;
    formatMoney: (value: number) => string;
}

export const GreenlightEquipmentStep: React.FC<GreenlightEquipmentStepProps> = ({
    studioEquipment,
    choices,
    onChange,
    onBack,
    onNext,
    formatMoney,
}) => (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 max-w-4xl mx-auto px-4 pt-6 pb-44">
        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl p-6 mb-6 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-2">Equipment & Gear</h2>
            <p className="text-zinc-400 text-sm">Rent gear or use your studio&apos;s owned equipment to boost quality.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GEAR_CATEGORIES.map(gear => {
                const ownedLevel = studioEquipment?.[gear.id as keyof StudioEquipment] || 0;
                const choice = choices[gear.id];
                return (
                    <div key={gear.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <span className="text-lg">{gear.icon}</span> {gear.name}
                        </h3>

                        <div className="space-y-2">
                            <button
                                onClick={() => onChange({ ...choices, [gear.id]: 'OWNED' })}
                                disabled={ownedLevel === 0}
                                className={`w-full p-3 rounded-lg border text-left transition-all flex justify-between items-center ${
                                    choice === 'OWNED'
                                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                                        : ownedLevel === 0
                                            ? 'bg-zinc-950 border-zinc-800/50 text-zinc-600 cursor-not-allowed'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                                }`}
                            >
                                <div>
                                    <div className="font-bold text-sm">Use Owned Gear</div>
                                    <div className="text-[10px] opacity-80">
                                        Level {ownedLevel} ({getEquipmentStageName(gear.id, ownedLevel)})
                                    </div>
                                    <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                                        Quality +{ownedLevel * 3}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-emerald-400">$0</div>
                                    <div className="text-[9px] uppercase">Cost</div>
                                </div>
                            </button>

                            {Object.entries(GREENLIGHT_GEAR_TIERS).map(([tierKey, tierData]) => {
                                const specificData = gear.tiers[tierKey as keyof typeof gear.tiers];
                                const isSelected = choice === tierKey;
                                let colorClass = 'text-blue-400';
                                let bgClass = 'bg-blue-500/10 border-blue-500';
                                if (tierKey === 'TIER_1') {
                                    colorClass = 'text-zinc-400';
                                    bgClass = 'bg-zinc-500/10 border-zinc-500';
                                }
                                if (tierKey === 'TIER_2') {
                                    colorClass = 'text-green-400';
                                    bgClass = 'bg-green-500/10 border-green-500';
                                }
                                if (tierKey === 'TIER_4') {
                                    colorClass = 'text-purple-400';
                                    bgClass = 'bg-purple-500/10 border-purple-500';
                                }
                                if (tierKey === 'TIER_5') {
                                    colorClass = 'text-amber-400';
                                    bgClass = 'bg-amber-500/10 border-amber-500';
                                }
                                return (
                                    <button
                                        key={tierKey}
                                        onClick={() => onChange({ ...choices, [gear.id]: tierKey })}
                                        className={`w-full p-3 rounded-lg border text-left transition-all flex justify-between items-center ${
                                            isSelected
                                                ? `${bgClass} text-white`
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                                        }`}
                                    >
                                        <div>
                                            <div className="font-bold text-sm">{specificData.name}</div>
                                            <div className="text-[10px] opacity-80">{specificData.desc}</div>
                                            <div className={`text-[10px] ${colorClass} font-bold mt-0.5`}>
                                                Quality +{tierData.quality}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-mono font-bold ${colorClass}`}>{formatMoney(tierData.cost)}</div>
                                            <div className="text-[9px] uppercase">Cost</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe-lg bg-gradient-to-t from-[#020a05] via-[#020a05]/90 to-transparent pointer-events-none flex justify-center z-30">
            <div className="pointer-events-auto flex gap-4 w-full max-w-md">
                <button
                    onClick={onBack}
                    className="flex-1 bg-zinc-900/80 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl border border-zinc-700 backdrop-blur-md transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={onNext}
                    className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider py-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105"
                >
                    Next: Location
                </button>
            </div>
        </div>
    </div>
);
