
import React, { useState } from 'react';
import { BusinessBlueprint, BUSINESS_BLUEPRINTS, BUSINESS_THEMES, BUSINESS_AMENITIES, BUSINESS_PRODUCTION_TYPES, calculateSetupCost, createBusiness } from '../../../services/businessLogic';
import { BusinessType, BusinessSubtype, BusinessConfig, Player } from '../../../types';
import { ArrowLeft, Plus, Check } from 'lucide-react';

interface BusinessWizardProps {
    player: Player;
    onCancel: () => void;
    onUpdatePlayer: (p: Player) => void;
    onComplete: () => void;
}

export const BusinessWizard: React.FC<BusinessWizardProps> = ({ player, onCancel, onUpdatePlayer, onComplete }) => {
    const [wizStep, setWizStep] = useState(1);
    const [wizType, setWizType] = useState<BusinessType | null>(null);
    const [wizSubtype, setWizSubtype] = useState<BusinessSubtype | null>(null);
    const [wizConfig, setWizConfig] = useState<BusinessConfig>({ quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW', amenities: [] });
    const [wizName, setWizName] = useState('');

    const currentCost = wizType && wizSubtype ? calculateSetupCost(wizType, wizSubtype, wizConfig) : 0;
    const activeBlueprint = wizType ? BUSINESS_BLUEPRINTS[wizType] : null;

    const getAdditionalCost = (type: 'THEME' | 'PROD', id: string) => {
        if (!wizType || !wizSubtype) return 0;
        const tempConfig = { ...wizConfig };
        if (type === 'THEME') tempConfig.theme = undefined;
        if (type === 'PROD') tempConfig.productionType = undefined;
        const baseline = calculateSetupCost(wizType, wizSubtype, tempConfig);
        const targetConfig = { ...tempConfig };
        if (type === 'THEME') targetConfig.theme = id;
        if (type === 'PROD') targetConfig.productionType = id;
        return calculateSetupCost(wizType, wizSubtype, targetConfig) - baseline;
    };

    const handleLaunch = () => {
        if (!wizType || !wizSubtype || !wizName) return;
        const cost = calculateSetupCost(wizType, wizSubtype, wizConfig);
        if (player.money < cost) { alert("Insufficient funds!"); return; }
        const blueprint = BUSINESS_BLUEPRINTS[wizType];
        const emoji = blueprint.emojis[Math.floor(Math.random() * blueprint.emojis.length)];
        const newBiz = createBusiness(wizName, wizType, wizSubtype, wizConfig, emoji, player.currentWeek);
        onUpdatePlayer({
            ...player,
            money: player.money - cost,
            businesses: [...player.businesses, newBiz],
            logs: [...player.logs, { week: player.currentWeek, year: player.age, message: `Founded ${newBiz.name}`, type: 'positive' }]
        });
        onComplete();
    };

    const toggleAmenity = (amenId: string) => {
        const current = wizConfig.amenities || [];
        if (current.includes(amenId)) {
            setWizConfig({ ...wizConfig, amenities: current.filter(id => id !== amenId) });
        } else {
            setWizConfig({ ...wizConfig, amenities: [...current, amenId] });
        }
    };

    const WizardFooter = ({ disabled, label, onClick }: { disabled: boolean, label: string, onClick: () => void }) => (
        <div className="fixed bottom-24 left-4 right-4 z-30 animate-in slide-in-from-bottom-6 fade-in duration-500">
            <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 p-4 rounded-2xl shadow-2xl flex items-center justify-between ring-1 ring-white/10">
                <div>
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Total Capital</div>
                    <div className="text-xl font-mono font-black text-white tracking-tight">${currentCost.toLocaleString()}</div>
                </div>
                <button 
                    onClick={onClick} 
                    disabled={disabled} 
                    className="bg-white text-black px-8 py-3 rounded-xl font-bold text-sm hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-transform active:scale-95"
                >
                    {label}
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-40 pt-4 relative">
            <div className="flex items-center gap-4 mb-4">
                <button onClick={() => { if(wizStep > 1) setWizStep(wizStep - 1); else onCancel(); }} className="bg-zinc-900 p-2 rounded-full hover:bg-zinc-800"><ArrowLeft size={20}/></button>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">New Venture</h2>
            </div>

            {wizStep === 1 && (
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-2">Select Industry</h3>
                    {Object.values(BUSINESS_BLUEPRINTS)
                        .filter(bp => bp.type !== 'PRODUCTION_HOUSE') // Exclude Production House from standard wizard
                        .map((bp: BusinessBlueprint) => (
                        <button key={bp.type} onClick={() => { setWizType(bp.type); setWizStep(2); }} className="w-full p-5 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center gap-5 text-left hover:border-indigo-500 hover:bg-zinc-800/80 transition-all group">
                            <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">{bp.emojis[0]}</div>
                            <div>
                                <div className="font-bold text-white text-lg">{bp.name}</div>
                                <div className="text-xs text-zinc-500">{bp.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {wizStep === 2 && wizType && (
                <>
                    <div className="flex flex-col space-y-8">
                        <div>
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 pl-2">Business Model</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {BUSINESS_BLUEPRINTS[wizType].subtypes.map(sub => (
                                    <button 
                                        key={sub} 
                                        onClick={() => setWizSubtype(sub)} 
                                        className={`p-4 rounded-2xl border text-left text-sm font-bold transition-all flex justify-between items-center ${wizSubtype === sub ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
                                    >
                                        {sub.replace(/_/g, ' ')}
                                        {wizSubtype === sub && <div className="bg-black text-white rounded-full p-1"><Plus size={10}/></div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <WizardFooter disabled={!wizSubtype} label="Next Step" onClick={() => setWizStep(3)} />
                </>
            )}

            {wizStep === 3 && wizType && wizSubtype && activeBlueprint && (
                <>
                    <div className="flex flex-col space-y-8">
                        {/* SERVICE CONFIG */}
                        {activeBlueprint.model === 'SERVICE' && (
                            <>
                                <div>
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 pl-2">Interior Vibe</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {BUSINESS_THEMES.map(theme => {
                                            const addCost = getAdditionalCost('THEME', theme.id);
                                            const isSelected = wizConfig.theme === theme.id;
                                            return (
                                                <button 
                                                    key={theme.id} 
                                                    onClick={() => setWizConfig({ ...wizConfig, theme: theme.id })}
                                                    className={`p-3 rounded-2xl border text-left transition-all ${isSelected ? 'bg-indigo-900/40 border-indigo-500 ring-1 ring-indigo-500' : 'bg-zinc-900 border-zinc-800'}`}
                                                >
                                                    <div className={`font-bold text-sm mb-1 ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{theme.label}</div>
                                                    <div className={`text-[10px] font-mono ${isSelected ? 'text-indigo-300' : 'text-zinc-500'}`}>
                                                        {addCost > 0 ? `+$${addCost.toLocaleString()}` : 'Included'}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 pl-2">Facilities</h3>
                                    <div className="space-y-2">
                                        {BUSINESS_AMENITIES.map(amen => {
                                            const isSelected = (wizConfig.amenities || []).includes(amen.id);
                                            return (
                                                <button 
                                                    key={amen.id} 
                                                    onClick={() => toggleAmenity(amen.id)}
                                                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${isSelected ? 'bg-emerald-900/30 border-emerald-500' : 'bg-zinc-900 border-zinc-800'}`}
                                                >
                                                    <div className="text-left">
                                                        <div className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{amen.label}</div>
                                                        <div className="text-[10px] text-zinc-500 font-mono">+${amen.cost.toLocaleString()} Setup</div>
                                                    </div>
                                                    {isSelected && <div className="bg-emerald-500 text-black p-1 rounded-full"><Check size={12} strokeWidth={4}/></div>}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* PRODUCT CONFIG */}
                        {activeBlueprint.model === 'PRODUCT' && (
                            <div>
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 pl-2">Production Quality</h3>
                                <div className="space-y-2">
                                    {BUSINESS_PRODUCTION_TYPES.map(prod => {
                                        const addCost = getAdditionalCost('PROD', prod.id);
                                        const isSelected = wizConfig.productionType === prod.id;
                                        return (
                                            <button 
                                                key={prod.id} 
                                                onClick={() => setWizConfig({ ...wizConfig, productionType: prod.id })}
                                                className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${isSelected ? 'bg-indigo-900/40 border-indigo-500 ring-1 ring-indigo-500' : 'bg-zinc-900 border-zinc-800'}`}
                                            >
                                                <div className="text-left">
                                                    <div className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{prod.label}</div>
                                                    <div className="text-[10px] text-zinc-500">{prod.description}</div>
                                                </div>
                                                <div className={`text-xs font-bold font-mono ${isSelected ? 'text-indigo-400' : 'text-zinc-600'}`}>{addCost > 0 ? `+$${addCost.toLocaleString()}` : 'Included'}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    <WizardFooter disabled={false} label="Next Step" onClick={() => setWizStep(4)} />
                </>
            )}

            {wizStep === 4 && (
                <>
                    <div className="flex flex-col space-y-8">
                        <div>
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 pl-2">Brand Name</h3>
                            <input 
                                type="text" 
                                value={wizName} 
                                onChange={(e) => setWizName(e.target.value)} 
                                placeholder="e.g. Luxe & Co." 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-white text-lg font-bold focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700"
                            />
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                            <div className="text-[10px] text-zinc-500 leading-relaxed mb-3">
                                Summary includes {wizConfig.amenities?.length || 0} additional facilities and {wizConfig.theme ? 'custom interior' : 'standard setup'}.
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {wizSubtype && <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-1 rounded font-bold uppercase">{wizSubtype.replace(/_/g, ' ')}</span>}
                                {wizConfig.theme && <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-1 rounded font-bold uppercase">{BUSINESS_THEMES.find(t => t.id === wizConfig.theme)?.label}</span>}
                            </div>
                        </div>
                    </div>
                    <WizardFooter disabled={!wizName} label="Launch Venture" onClick={handleLaunch} />
                </>
            )}
        </div>
    );
};
