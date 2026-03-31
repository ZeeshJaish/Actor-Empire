import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Player, Business, StudioDepartments, StudioEquipment } from '../../../types';
import { formatMoney } from '../../../services/formatUtils';
import { ArrowLeft, Building2, PenTool, Video, Users, Clapperboard, MonitorPlay, Camera, Lightbulb, Mic, Box, Zap } from 'lucide-react';

interface FacilitiesViewProps {
    player: Player;
    studio: Business;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
}

const DEPARTMENTS = [
    { id: 'writing', name: 'Writing Room', icon: '✍️', desc: 'Improves quality of In-House Scripts.' },
    { id: 'directing', name: 'Directing Roster', icon: '🎬', desc: 'Determines skill of In-House Directors.' },
    { id: 'casting', name: 'Casting Dept', icon: '🎭', desc: 'Improves quality of In-House Actors.' },
    { id: 'production', name: 'Production Crew', icon: '🎥', desc: 'Base efficiency and quality of shoots.' },
    { id: 'postProduction', name: 'Post-Production', icon: '🖥️', desc: 'VFX and editing polish.' }
];

const EQUIPMENT = [
    { id: 'cameras', name: 'Camera Rigs', icon: '🎥', desc: 'From basic DSLRs to custom IMAX 70mm.' },
    { id: 'lighting', name: 'Lighting & Grip', icon: '💡', desc: 'From basic LED panels to stadium arrays.' },
    { id: 'sound', name: 'Sound Engineering', icon: '🎙️', desc: 'From boom mics to Dolby Atmos stages.' },
    { id: 'practicalEffects', name: 'Practical Sets', icon: '📦', desc: 'From empty warehouses to massive backlots.' }
];

const getUpgradeCost = (currentLevel: number, isDept: boolean) => {
    if (currentLevel >= 10) return 0;
    const base = isDept ? 500000 : 1000000;
    return base * Math.pow(1.5, currentLevel);
};

const getAnnualOverhead = (level: number, isDept: boolean) => {
    if (level === 0) return 0;
    const base = isDept ? 250000 : 100000; // Annual cost per level
    return base * level;
};

export const getEquipmentStageName = (id: string, level: number) => {
    if (level === 0) return "None";
    const stages: Record<string, string[]> = {
        cameras: [
            "Used DSLRs", "Prosumer DSLRs", "Basic Cinema Cameras", "RED Komodo",
            "ARRI Alexa Mini", "RED V-Raptor", "ARRI Alexa 35", "IMAX 70mm",
            "Custom Studio Rigs", "Next-Gen Experimental Rigs"
        ],
        lighting: [
            "Hardware Store Worklights", "Basic LED Panels", "Pro LED Kits", "Small Grip Truck",
            "Medium Grip Truck & HMIs", "Large Grip Truck & SkyPanels", "Full Studio Lighting Grid",
            "Stadium Arrays", "Automated Lighting Rigs", "Custom Volume Lighting"
        ],
        sound: [
            "Cheap Shotgun Mics", "Prosumer Boom Mics", "Basic Lavaliers & Mixers", "Pro Field Recorders",
            "Studio ADR Booth", "Foley Stage", "5.1 Surround Mixing Room", "7.1 Surround Mixing Room",
            "Dolby Atmos Stage", "State-of-the-Art Sound Lab"
        ],
        practicalEffects: [
            "Empty Garage", "Small Warehouse", "Basic Soundstage", "Medium Soundstage",
            "Large Soundstage", "Multiple Soundstages", "Small Backlot", "Massive Backlot",
            "Advanced Animatronics Shop", "Full Practical Effects Facility"
        ]
    };
    return stages[id]?.[level - 1] || "Unknown";
};

export const FacilitiesView: React.FC<FacilitiesViewProps> = ({ player, studio, onBack, onUpdatePlayer }) => {
    const [activeTab, setActiveTab] = useState<'DEPARTMENTS' | 'EQUIPMENT'>('DEPARTMENTS');


    const handleUpgrade = (id: string, isDept: boolean) => {
        const state = studio.studioState || { scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0 };
        const depts = state.departments || { writing: 0, directing: 0, casting: 0, production: 0, postProduction: 0 };
        const equip = state.equipment || { cameras: 0, lighting: 0, sound: 0, practicalEffects: 0 };

        const currentLevel = isDept ? depts[id as keyof StudioDepartments] : equip[id as keyof StudioEquipment];
        if (currentLevel >= 10) return;

        const cost = getUpgradeCost(currentLevel, isDept);
        if (studio.balance < cost) {
            alert("Not enough studio funds!");
            return;
        }

        const updatedStudio = { ...studio, balance: studio.balance - cost };
        if (isDept) {
            updatedStudio.studioState = { ...state, departments: { ...depts, [id]: currentLevel + 1 } };
        } else {
            updatedStudio.studioState = { ...state, equipment: { ...equip, [id]: currentLevel + 1 } };
        }

        const updatedPlayer = {
            ...player,
            businesses: player.businesses.map(b => b.id === studio.id ? updatedStudio : b)
        };
        onUpdatePlayer(updatedPlayer);
    };

    const depts = studio.studioState?.departments || { writing: 0, directing: 0, casting: 0, production: 0, postProduction: 0 };
    const equip = studio.studioState?.equipment || { cameras: 0, lighting: 0, sound: 0, practicalEffects: 0 };

    let totalAnnualOverhead = 0;
    Object.values(depts).forEach(lvl => totalAnnualOverhead += getAnnualOverhead(lvl as number, true));
    Object.values(equip).forEach(lvl => totalAnnualOverhead += getAnnualOverhead(lvl as number, false));

    return (
        <div className="h-full bg-black text-white flex flex-col absolute inset-0 pt-5">
            {/* Header */}
            <div className="shrink-0 z-50 bg-zinc-950 border-b border-zinc-800 px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                            <Building2 size={20} className="text-emerald-500" /> Facilities
                        </h1>
                        <div className="text-xs text-zinc-400 font-medium">Manage Studio Infrastructure</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Studio Funds</div>
                    <div className="text-lg font-mono font-bold text-emerald-400">{formatMoney(studio.balance)}</div>
                </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto pb-32">
                {/* Annual Overhead Warning */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Annual Overhead</div>
                        <div className="text-2xl font-black text-rose-400 font-mono">{formatMoney(totalAnnualOverhead)}<span className="text-sm text-zinc-500">/yr</span></div>
                    </div>
                    <div className="text-right text-xs text-zinc-500 max-w-[150px]">
                        Billed automatically on Week 52. Ensure you have cash reserves.
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 p-1 bg-zinc-900 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('DEPARTMENTS')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'DEPARTMENTS' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Departments
                    </button>
                    <button 
                        onClick={() => setActiveTab('EQUIPMENT')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'EQUIPMENT' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Equipment
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {(activeTab === 'DEPARTMENTS' ? DEPARTMENTS : EQUIPMENT).map(item => {
                        const currentLevel = activeTab === 'DEPARTMENTS' 
                            ? depts[item.id as keyof StudioDepartments] 
                            : equip[item.id as keyof StudioEquipment];
                        
                        const isMax = currentLevel >= 10;
                        const cost = getUpgradeCost(currentLevel, activeTab === 'DEPARTMENTS');
                        const canAfford = studio.balance >= cost;

                        return (
                            <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-zinc-700 transition-colors">
                                <div className="flex items-start sm:items-center gap-4 flex-1">
                                    <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-xl ${currentLevel > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                        {item.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-white">{item.name}</h3>
                                            <span className="text-[10px] font-black bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">LVL {currentLevel}</span>
                                        </div>
                                        <p className="text-xs text-zinc-400 mt-1">{item.desc}</p>
                                        {currentLevel > 0 && (
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                                                {activeTab === 'DEPARTMENTS' ? (
                                                    <>
                                                        <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                                            <Zap size={10} /> Quality: {10 + ((currentLevel - 1) * 9)}
                                                        </div>
                                                        <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                                                            <Users size={10} /> Fame: {10 + (currentLevel * 2)}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                                            <Zap size={10} /> Quality: +{currentLevel * 3}
                                                        </div>
                                                        <div className="text-[10px] text-blue-400 font-bold flex items-center gap-1">
                                                            <Box size={10} /> {getEquipmentStageName(item.id, currentLevel)}
                                                        </div>
                                                    </>
                                                )}
                                                <div className="text-[10px] text-rose-400 font-mono">
                                                    Overhead: {formatMoney(getAnnualOverhead(currentLevel, activeTab === 'DEPARTMENTS'))}/yr
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => handleUpgrade(item.id, activeTab === 'DEPARTMENTS')}
                                    disabled={isMax || !canAfford}
                                    className={`px-4 py-2 shrink-0 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                        isMax ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                                        : canAfford ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                    }`}
                                >
                                    {isMax ? 'MAX LEVEL' : (
                                        <>
                                            <Zap size={14} />
                                            Upgrade ({formatMoney(cost)})
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
