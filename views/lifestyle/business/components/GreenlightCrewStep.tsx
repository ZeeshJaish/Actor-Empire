import React from 'react';
import { Briefcase, Camera, Mic, Zap } from 'lucide-react';
import { type BackgroundCastingPlan, type Player } from '../../../../types';
import { BackgroundCastingPanel } from './BackgroundCastingPanel';
import { GreenlightCrewSelector } from './GreenlightCrewSelector';

type CrewMode = 'HIRE' | 'SELF' | 'IN_HOUSE';
type CrewKey = 'cinematographer' | 'composer' | 'lineProducer' | 'vfx';

interface GreenlightCrewStepProps {
    crewMarket: {
        cinematographers: any[];
        composers: any[];
        producers: any[];
        vfxTeams: any[];
    };
    crewMarketRefreshIn: number;
    crewMarketCycle: number;
    backgroundCastingPlan: BackgroundCastingPlan;
    backgroundCastingContext: any;
    onBackgroundCastingChange: (plan: BackgroundCastingPlan) => void;
    selectedCrew: Record<CrewKey, string | null>;
    crewModes: Record<CrewKey, CrewMode>;
    onSelectCrew: (key: CrewKey, talentId: string) => void;
    onCrewModeChange: (key: CrewKey, mode: CrewMode) => void;
    player: Player;
    hiredIds: string[];
    getInHouseQuality: (role: string) => number;
    getInHouseFame: (role: string) => number;
    getInHouseLevel: (role: string) => number;
    returningTalent?: any[];
    onNegotiate: (talentId: string, returningData: any) => void;
    formatMoney: (value: number) => string;
    onBack: () => void;
    onNext: () => void;
}

const CREW_ROLES: Array<{
    key: CrewKey;
    title: string;
    role: string;
    marketKey: keyof GreenlightCrewStepProps['crewMarket'];
    icon: React.ReactNode;
}> = [
    { key: 'cinematographer', title: 'Cinematographer', role: 'CINEMATOGRAPHER', marketKey: 'cinematographers', icon: <Camera size={16} /> },
    { key: 'composer', title: 'Composer', role: 'COMPOSER', marketKey: 'composers', icon: <Mic size={16} /> },
    { key: 'lineProducer', title: 'Line Producer', role: 'LINE_PRODUCER', marketKey: 'producers', icon: <Briefcase size={16} /> },
    { key: 'vfx', title: 'VFX & Post', role: 'VFX', marketKey: 'vfxTeams', icon: <Zap size={16} className="text-cyan-400" /> },
];

export const GreenlightCrewStep: React.FC<GreenlightCrewStepProps> = ({
    crewMarket,
    crewMarketRefreshIn,
    crewMarketCycle,
    backgroundCastingPlan,
    backgroundCastingContext,
    onBackgroundCastingChange,
    selectedCrew,
    crewModes,
    onSelectCrew,
    onCrewModeChange,
    player,
    hiredIds,
    getInHouseQuality,
    getInHouseFame,
    getInHouseLevel,
    returningTalent,
    onNegotiate,
    formatMoney,
    onBack,
    onNext,
}) => (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 max-w-4xl mx-auto px-4 pt-6 pb-44">
        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-400 mb-2">Crew Market</p>
                    <h2 className="text-xl font-black text-white mb-2">Build Your Production Team</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed">Hire specialists, use your studio departments, and populate the world around your principal cast.</p>
                </div>
                <div className="shrink-0 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <p className="text-[9px] uppercase tracking-widest font-black text-zinc-500">Availability refresh</p>
                    <p className="text-sm font-black text-emerald-300 mt-1">
                        {crewMarketRefreshIn === 1 ? 'Next week' : `In ${crewMarketRefreshIn} weeks`}
                    </p>
                    <p className="text-[9px] text-zinc-600 mt-1">Market cycle {crewMarketCycle + 1}</p>
                </div>
            </div>
        </div>

        <BackgroundCastingPanel
            plan={backgroundCastingPlan}
            context={backgroundCastingContext}
            onChange={onBackgroundCastingChange}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CREW_ROLES.map(entry => (
                <GreenlightCrewSelector
                    key={entry.key}
                    title={entry.title}
                    icon={entry.icon}
                    role={entry.role}
                    candidates={crewMarket[entry.marketKey]}
                    selectedId={selectedCrew[entry.key]}
                    onSelect={talentId => onSelectCrew(entry.key, talentId)}
                    mode={crewModes[entry.key]}
                    onModeChange={mode => onCrewModeChange(entry.key, mode)}
                    player={player}
                    hiredIds={hiredIds}
                    inHouseQuality={getInHouseQuality(entry.role)}
                    inHouseFame={getInHouseFame(entry.role)}
                    inHouseLevel={getInHouseLevel(entry.role)}
                    returningTalent={returningTalent}
                    onNegotiate={onNegotiate}
                    formatMoney={formatMoney}
                />
            ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe-lg bg-gradient-to-t from-[#020a05] via-[#020a05]/90 to-transparent pointer-events-none flex justify-center z-30">
            <div className="pointer-events-auto flex gap-4 w-full max-w-md">
                <button type="button" onClick={onBack} className="flex-1 bg-zinc-900/80 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl border border-zinc-700 backdrop-blur-md transition-colors">
                    Back
                </button>
                <button type="button" onClick={onNext} className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider py-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105">
                    Next: Equipment
                </button>
            </div>
        </div>
    </div>
);
