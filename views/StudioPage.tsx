import React, { useState } from 'react';
import { Player, NPCActor, StudioContract, ContractType, PaymentMode } from '../types';
import { Users, Briefcase, Star, TrendingUp, DollarSign, X, Check, AlertCircle, Info, Clock, Calendar, Film, ShieldAlert, PenTool } from 'lucide-react';
import { getAvailableTalent, NPC_DATABASE } from '../services/npcLogic';
import { calculateNPCAsk, evaluateOffer, createContract } from '../services/talentService';

interface StudioPageProps {
    player: Player;
    onUpdatePlayer: (player: Player) => void;
    onBack: () => void;
}

export const StudioPage: React.FC<StudioPageProps> = ({ player, onUpdatePlayer, onBack }) => {
    const [activeTab, setActiveTab] = useState<'ROSTER' | 'MARKET'>('ROSTER');
    const [selectedNPC, setSelectedNPC] = useState<NPCActor | null>(null);
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPFRONT');
    const [negotiationDuration, setNegotiationDuration] = useState(3);
    const [offerAmountStr, setOfferAmountStr] = useState<string>('');
    const [negotiationResult, setNegotiationResult] = useState<{ success: boolean, message: string, maintenanceFee?: number } | null>(null);

    const studio = player.businesses.find(b => b.type === 'PRODUCTION_HOUSE');
    const signedContracts = studio?.studioState?.talentRoster || player.studio?.talentRoster || [];
    
    // Initialize memory if needed
    const studioMemory = player.studioMemory || {};
    const cooldowns = studioMemory.cooldowns || {};
    const attempts = studioMemory.attempts || {};

    const availableActors = getAvailableTalent(player.currentWeek, 'ACTOR', player.flags.extraNPCs || [])
        .filter(npc => !signedContracts.some(c => c.npcId === npc.id))
        .filter(npc => !(cooldowns[npc.id] && cooldowns[npc.id] > player.currentWeek));

    const handlePaymentModeChange = (newMode: PaymentMode) => {
        if (newMode === paymentMode) return;
        
        const currentVal = parseInt(offerAmountStr.replace(/,/g, '')) || 0;
        if (currentVal > 0) {
            if (newMode === 'WEEKLY_INSTALLMENTS') {
                // Upfront -> Weekly
                setOfferAmountStr(Math.ceil((currentVal * 1.1) / 52).toLocaleString());
            } else {
                // Weekly -> Upfront
                setOfferAmountStr(Math.floor((currentVal * 52) / 1.1).toLocaleString());
            }
        }
        setPaymentMode(newMode);
    };

    const handleNegotiate = () => {
        if (!selectedNPC || !studio) return;
        
        const offerAmount = parseInt(offerAmountStr.replace(/,/g, '')) || 0;
        
        const result = evaluateOffer(
            selectedNPC, 
            negotiationDuration, 
            offerAmount,
            paymentMode,
            player.stats.fame, 
            studio.stats.valuation || 0
        );

        setNegotiationResult(result);

        const updatedPlayer = { ...player };
        if (!updatedPlayer.studioMemory) updatedPlayer.studioMemory = {};
        if (!updatedPlayer.studioMemory.attempts) updatedPlayer.studioMemory.attempts = {};
        if (!updatedPlayer.studioMemory.cooldowns) updatedPlayer.studioMemory.cooldowns = {};

        if (result.success && result.maintenanceFee !== undefined) {
            const newContract = createContract(
                selectedNPC.id,
                'MOVIE_DEAL',
                paymentMode,
                negotiationDuration,
                result.totalContractValue,
                result.maintenanceFee,
                player.currentWeek
            );

            // Sync with both global studio and business studioState
            if (!updatedPlayer.studio) updatedPlayer.studio = { isUnlocked: true, baseType: 'GARAGE', talentRoster: [], lastTalentRefreshWeek: 0 };
            if (!updatedPlayer.studio.talentRoster) updatedPlayer.studio.talentRoster = [];
            updatedPlayer.studio.talentRoster.push(newContract);

            updatedPlayer.businesses = updatedPlayer.businesses.map(b => {
                if (b.id === studio.id) {
                    const studioState = b.studioState || { scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0 };
                    return {
                        ...b,
                        studioState: {
                            ...studioState,
                            talentRoster: [...(studioState.talentRoster || []), newContract]
                        }
                    };
                }
                return b;
            });
            
            // Pay upfront if applicable
            if (paymentMode === 'UPFRONT') {
                updatedPlayer.money -= result.totalContractValue;
                updatedPlayer.finance.history.unshift({
                    id: `tx_upfront_${Date.now()}`,
                    week: player.currentWeek,
                    year: player.age,
                    amount: -result.totalContractValue,
                    category: 'EXPENSE',
                    description: `Contract Upfront: ${selectedNPC.name}`
                });
            }

            // Clear attempts on success
            delete updatedPlayer.studioMemory.attempts[selectedNPC.id];
            
            onUpdatePlayer(updatedPlayer);
        } else {
            // Failed attempt
            const currentAttempts = updatedPlayer.studioMemory.attempts[selectedNPC.id] || 0;
            const newAttempts = currentAttempts + 1;
            updatedPlayer.studioMemory.attempts[selectedNPC.id] = newAttempts;
            
            if (newAttempts >= 3) {
                // Cooldown for 12 weeks
                updatedPlayer.studioMemory.cooldowns[selectedNPC.id] = player.currentWeek + 12;
                delete updatedPlayer.studioMemory.attempts[selectedNPC.id];
            }
            
            onUpdatePlayer(updatedPlayer);
        }
    };

    const getNPCById = (id: string) => {
        return [...availableActors, ...NPC_DATABASE, ...(player.flags.extraNPCs || [])].find(n => n.id === id);
    };

    const ask = selectedNPC ? calculateNPCAsk(selectedNPC, negotiationDuration) : null;
    const currentAttempts = selectedNPC ? (attempts[selectedNPC.id] || 0) : 0;
    const attemptsLeft = 3 - currentAttempts;

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Talent Management</h1>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Farm System & Roster</p>
                </div>
                <button onClick={onBack} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 p-1 bg-zinc-900 rounded-2xl">
                <button 
                    onClick={() => setActiveTab('ROSTER')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'ROSTER' ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-white'}`}
                >
                    <Users size={16} /> Roster ({signedContracts.length})
                </button>
                <button 
                    onClick={() => setActiveTab('MARKET')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'MARKET' ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-white'}`}
                >
                    <Star size={16} /> Market
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-32">
                {activeTab === 'ROSTER' ? (
                    <div className="space-y-4">
                        {signedContracts.length === 0 ? (
                            <div className="text-center py-12 bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
                                <Users size={48} className="mx-auto text-zinc-700 mb-4" />
                                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No talent signed yet</p>
                                <button onClick={() => setActiveTab('MARKET')} className="mt-4 text-amber-500 text-xs font-bold uppercase hover:underline">Browse the Market</button>
                            </div>
                        ) : (
                            signedContracts.map(contract => {
                                const npc = getNPCById(contract.npcId);
                                if (!npc) return null;
                                return (
                                    <div key={contract.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex items-center gap-4">
                                        <img src={npc.avatar} alt={npc.name} className="w-16 h-16 rounded-2xl bg-black border border-zinc-700" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-white">{npc.name}</h3>
                                                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded-md font-black uppercase">{npc.tier}</span>
                                            </div>
                                            <div className="text-xs text-zinc-500 flex items-center gap-3 mt-1">
                                                <span className="flex items-center gap-1"><TrendingUp size={12}/> {Math.floor(npc.stats?.fame || 0)} Fame</span>
                                                <span className="flex items-center gap-1"><Star size={12}/> {Math.floor(npc.stats?.talent || 0)} Talent</span>
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
                                                    <Film size={10}/> {contract.moviesRemaining}/{contract.totalMovies} Movies Left
                                                </span>
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-800 px-2 py-1 rounded-lg flex items-center gap-1">
                                                    <DollarSign size={10}/> ${contract.maintenanceFee.toLocaleString()}/wk Upkeep
                                                </span>
                                                {contract.paymentMode === 'WEEKLY_INSTALLMENTS' && contract.installmentsPaid < contract.totalInstallments && (
                                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
                                                        Installments: {contract.installmentsPaid}/{contract.totalInstallments}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex gap-3 mb-2">
                            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-200/70 leading-relaxed font-medium">
                                Talent pool refreshes every 3 weeks. Unknowns have high potential but low starting fame. Established stars are expensive but bring immediate buzz.
                            </p>
                        </div>
                        {availableActors.map(npc => (
                            <div key={npc.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex items-center gap-4 group hover:border-amber-500/50 transition-all">
                                <img src={npc.avatar} alt={npc.name} className="w-16 h-16 rounded-2xl bg-black border border-zinc-700 group-hover:border-amber-500/30 transition-all" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white">{npc.name}</h3>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black uppercase ${npc.tier === 'UNKNOWN' ? 'bg-zinc-800 text-zinc-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                            {npc.tier}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 italic line-clamp-1 mb-2">"{npc.bio}"</p>
                                    <div className="flex items-center gap-3">
                                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                                            <TrendingUp size={10}/> {Math.floor(npc.stats?.fame || 0)}
                                        </div>
                                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                                            <Star size={10}/> {Math.floor(npc.stats?.talent || 0)}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { 
                                        setSelectedNPC(npc); 
                                        setNegotiationResult(null); 
                                        setOfferAmountStr('');
                                        setNegotiationDuration(3);
                                    }}
                                    className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-500 transition-all"
                                >
                                    Deal
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Negotiation Modal */}
            {selectedNPC && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-[#fdfbf7] border-x-8 border-y-[12px] border-[#e8e4d9] rounded-sm w-full max-w-lg p-6 sm:p-8 shadow-2xl relative text-zinc-900 font-serif my-auto">
                        {/* Texture overlay */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
                        
                        <button onClick={() => setSelectedNPC(null)} className="absolute top-2 right-2 p-2 text-zinc-400 hover:text-zinc-700 z-20 bg-[#fdfbf7] rounded-full">
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6 border-b-2 border-zinc-300 pb-4 relative z-10">
                            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-zinc-900">Talent Agreement</h2>
                            <p className="text-xs text-zinc-500 font-sans uppercase tracking-widest mt-1">Standard Motion Picture Contract</p>
                        </div>

                        {!negotiationResult ? (
                            <div className="space-y-6 relative z-10">
                                <div className="text-sm leading-relaxed">
                                    <p className="mb-4">
                                        This Agreement is made and entered into by and between <strong>{player.businesses?.[0]?.name || 'The Studio'}</strong> ("Studio") and <strong>{selectedNPC.name}</strong> ("Artist").
                                    </p>
                                    
                                    {/* Stats Block */}
                                    <div className="bg-zinc-100 p-3 rounded border border-zinc-200 mb-4 font-sans flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img src={selectedNPC.avatar} alt={selectedNPC.name} className="w-10 h-10 rounded-full border border-zinc-300" />
                                            <div>
                                                <div className="text-xs font-bold uppercase text-zinc-500">{selectedNPC.tier}</div>
                                                <div className="font-bold">{selectedNPC.name}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 text-sm">
                                            <div className="flex flex-col items-center"><span className="text-xs text-zinc-500 uppercase">Fame</span><span className="font-bold">{Math.floor(selectedNPC.stats?.fame || 0)}</span></div>
                                            <div className="flex flex-col items-center"><span className="text-xs text-zinc-500 uppercase">Talent</span><span className="font-bold">{Math.floor(selectedNPC.stats?.talent || 0)}</span></div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 font-sans">
                                        {/* Terms */}
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 block">1. Commitment (Movies)</label>
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="number"
                                                    value={negotiationDuration}
                                                    onChange={(e) => setNegotiationDuration(parseInt(e.target.value) || 1)}
                                                    className="w-24 bg-white border border-zinc-300 rounded px-3 py-2 text-zinc-900 font-bold focus:outline-none focus:border-amber-500"
                                                    min="1"
                                                    max={10}
                                                />
                                                <span className="text-sm text-zinc-600">Motion Pictures</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 block">2. Payment Structure</label>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handlePaymentModeChange('UPFRONT')}
                                                    className={`flex-1 py-2 rounded text-xs font-bold uppercase tracking-widest border transition-all ${paymentMode === 'UPFRONT' ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50'}`}
                                                >
                                                    Upfront
                                                </button>
                                                <button 
                                                    onClick={() => handlePaymentModeChange('WEEKLY_INSTALLMENTS')}
                                                    className={`flex-1 py-2 rounded text-xs font-bold uppercase tracking-widest border transition-all ${paymentMode === 'WEEKLY_INSTALLMENTS' ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50'}`}
                                                >
                                                    Weekly (52w)
                                                </button>
                                            </div>
                                            {paymentMode === 'WEEKLY_INSTALLMENTS' && (
                                                <p className="text-[10px] text-zinc-500 mt-1 italic">* Weekly installments include a 10% financing premium.</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 block">3. Compensation Offer</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                                                <input 
                                                    type="text"
                                                    value={offerAmountStr}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        setOfferAmountStr(val ? parseInt(val).toLocaleString() : '');
                                                    }}
                                                    placeholder={paymentMode === 'UPFRONT' ? ask?.totalAmount.toLocaleString() : ask?.weeklyInstallment.toLocaleString()}
                                                    className="w-full bg-white border border-zinc-300 rounded px-3 py-3 pl-7 text-zinc-900 font-bold text-lg focus:outline-none focus:border-amber-500"
                                                />
                                                {paymentMode === 'WEEKLY_INSTALLMENTS' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">/ week</span>}
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <span className="text-[10px] text-zinc-500">Market Ask: ${paymentMode === 'UPFRONT' ? ask?.totalAmount.toLocaleString() : ask?.weeklyInstallment.toLocaleString()}{paymentMode === 'WEEKLY_INSTALLMENTS' ? '/wk' : ''}</span>
                                                <span className="text-[10px] text-zinc-500">+ ${ask?.maintenanceFee.toLocaleString()}/wk maintenance</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-zinc-300 font-sans flex items-center justify-between">
                                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                        Attempts Left: <span className={attemptsLeft === 1 ? 'text-red-600' : 'text-zinc-900'}>{attemptsLeft}</span>
                                    </div>
                                    <button 
                                        onClick={handleNegotiate}
                                        disabled={!offerAmountStr}
                                        className="px-6 py-2 bg-zinc-900 text-white font-bold uppercase tracking-widest rounded hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center gap-2 shadow-md"
                                    >
                                        <PenTool size={16} /> Sign & Offer
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center animate-in zoom-in-95 duration-300 relative z-10 py-4">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 ${negotiationResult.success ? 'border-emerald-600 text-emerald-600' : 'border-red-600 text-red-600'} bg-white shadow-sm`}>
                                    {negotiationResult.success ? <Check size={40} /> : <X size={40} />}
                                </div>
                                
                                <h3 className="text-xl font-black uppercase tracking-widest mb-2 text-zinc-900">
                                    {negotiationResult.success ? 'Agreement Executed' : 'Offer Rejected'}
                                </h3>
                                
                                <p className="text-zinc-700 font-serif italic text-lg mb-6 leading-relaxed px-4">
                                    "{negotiationResult.message}"
                                </p>
                                
                                {!negotiationResult.success && (
                                    <div className="mb-8 font-sans">
                                        {attemptsLeft > 0 ? (
                                            <p className="text-sm text-zinc-500 font-bold">You have {attemptsLeft} attempt(s) remaining.</p>
                                        ) : (
                                            <div className="bg-red-50 border border-red-200 rounded p-3 flex items-center justify-center gap-2 text-red-700 text-sm">
                                                <ShieldAlert size={16} />
                                                <p>Negotiations have broken down. 12-week cooldown applied.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {negotiationResult.success && (
                                    <div className="bg-zinc-50 rounded border border-zinc-200 p-4 mb-8 font-sans text-left">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Contract Value</div>
                                                <div className="text-lg font-black text-zinc-900">
                                                    ${(parseInt(offerAmountStr.replace(/,/g, '')) || 0).toLocaleString()}{paymentMode === 'WEEKLY_INSTALLMENTS' ? '/wk' : ''}
                                                </div>
                                                {paymentMode === 'WEEKLY_INSTALLMENTS' && (
                                                    <div className="text-[10px] text-zinc-500 mt-1">For 52 weeks</div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Maintenance</div>
                                                <div className="text-lg font-black text-zinc-900">
                                                    ${negotiationResult.maintenanceFee?.toLocaleString()}/wk
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <button 
                                    onClick={() => {
                                        if (negotiationResult.success || attemptsLeft === 0) {
                                            setSelectedNPC(null);
                                        } else {
                                            setNegotiationResult(null);
                                        }
                                    }}
                                    className="w-full py-3 bg-zinc-900 text-white font-bold uppercase tracking-widest rounded hover:bg-zinc-800 transition-all font-sans"
                                >
                                    {negotiationResult.success ? 'Close Document' : (attemptsLeft === 0 ? 'Close Document' : 'Revise Offer')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
