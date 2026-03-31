
import React, { useState, useEffect } from 'react';
import { AuditionOpportunity, ProjectDetails } from '../types';
import { formatMoney } from '../services/formatUtils';
import { STUDIO_CATALOG } from '../services/studioLogic';
import { ArrowLeft, Film, Tv, Info, DollarSign, Crown, CheckCircle, Shield, Zap, User, TrendingUp, Users, Globe, List, Percent, Minus, Plus, Sparkles, Handshake, Calendar, BarChart3, Clock, AlertCircle } from 'lucide-react';

interface ProjectDetailViewProps {
    opportunity: AuditionOpportunity;
    onBack: () => void;
    onAction: () => void;
    actionLabel: React.ReactNode;
    isProcessing?: boolean;
    isNegotiating?: boolean;
    currentOffer?: number;
    currentRoyalty?: number;
    onCounter?: (salary: number, royalty: number) => void;
    actionDisabled?: boolean;
    actionColorClass?: string;
    headerTitle?: string;
    actionIcon?: React.ReactNode;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
    opportunity,
    onBack,
    onAction,
    actionLabel,
    isProcessing = false,
    isNegotiating = false,
    currentOffer = 0,
    currentRoyalty = 0,
    onCounter,
    actionDisabled = false,
    actionColorClass = 'bg-white text-black hover:bg-zinc-200',
    headerTitle = 'Project Details',
    actionIcon
}) => {
    const [counterSalary, setCounterSalary] = useState(currentOffer || opportunity.estimatedIncome);
    const [counterRoyaltyPct, setCounterRoyaltyPct] = useState(currentRoyalty || opportunity.royaltyPercentage || 0);
    const [studioPatience, setStudioPatience] = useState(3); // 3 Strikes
    const [negotiationStatus, setNegotiationStatus] = useState<'PENDING' | 'REJECTED' | 'ACCEPTED'>('PENDING');
    const [studioMessage, setStudioMessage] = useState<string>("");

    useEffect(() => {
        setCounterSalary(currentOffer || opportunity.estimatedIncome);
        setCounterRoyaltyPct(currentRoyalty || opportunity.royaltyPercentage || 0);
    }, [currentOffer, currentRoyalty, opportunity]);

    // Data Extraction
    const project = opportunity.project || {} as ProjectDetails;
    const studio = STUDIO_CATALOG[project.studioId] || { name: project.studioId || 'Independent', color: 'text-zinc-400' };
    const universe = opportunity.universeContract;
    
    // Formatting
    const displaySalary = isNegotiating ? currentOffer : opportunity.estimatedIncome;
    const displayRoyalty = isNegotiating ? currentRoyalty : opportunity.royaltyPercentage || 0;

    // Theme Colors
    const isUniverse = !!universe || !!project.universeId;
    const themeColor = isUniverse ? 'bg-indigo-600' : 'bg-zinc-800';
    const textColor = isUniverse ? 'text-indigo-200' : 'text-zinc-400';

    const changeSalary = (delta: number) => setCounterSalary(prev => Math.max(0, prev + delta));
    const changeRoyalty = (delta: number) => setCounterRoyaltyPct(prev => Math.max(0, parseFloat((prev + delta).toFixed(1))));

    // Determine estimated weeks
    let estimatedFilmingWeeks = project.type === 'MOVIE' ? '10-14' : '12-16';
    if (universe) {
        estimatedFilmingWeeks = `Multi-Year (${universe.films.length} Films)`;
    }

    // Only show energy cost if we are looking at an ACTIVE commitment, not just an opportunity
    const showWeeklyEnergy = false; 

    // --- REALISTIC NEGOTIATION LOGIC ---
    const handleSubmitCounter = () => {
        if (!onCounter) return;

        // 1. Calculate Budget Cap
        // Assume maximum cast budget is ~25% of total budget for a single lead
        // If it's an indie (<$5M), maybe less flex.
        const budget = project.estimatedBudget || 1000000;
        const maxSalaryCap = budget * 0.25; 
        
        // Backend points are expensive. 1% roughly eq to $500k value perception for logic
        // or simply limit points based on budget tier.
        const maxPoints = project.budgetTier === 'LOW' ? 5 : project.budgetTier === 'MID' ? 3 : 2; // High budgets give fewer points usually

        const demandTooHigh = counterSalary > maxSalaryCap;
        const pointsTooHigh = counterRoyaltyPct > maxPoints;

        if (demandTooHigh || pointsTooHigh) {
            const newPatience = studioPatience - 1;
            setStudioPatience(newPatience);
            
            if (newPatience <= 0) {
                setNegotiationStatus('REJECTED');
                setStudioMessage("The studio has pulled the offer. You asked for too much.");
                // Disable interactions
            } else {
                setStudioMessage(`"That is way over our budget. We can't do that." (${newPatience} attempts left)`);
                // Auto-reset to a "Middle Ground" to simulate counter-counter
                setCounterSalary(Math.floor((counterSalary + (currentOffer || 0)) / 2));
                setCounterRoyaltyPct(Math.max(0, counterRoyaltyPct - 0.5));
            }
        } else {
            // ACCEPTED LOGIC
            // If reasonable, we call the parent onCounter which updates the official offer state
            setStudioMessage("The studio accepts your terms!");
            onCounter(counterSalary, counterRoyaltyPct);
        }
    };

    return (
        <div className="absolute inset-0 z-[200] bg-[#050505] flex flex-col text-white animate-in slide-in-from-right duration-300 font-sans overflow-hidden">
            
            {/* HERO HEADER */}
            <div className={`relative ${themeColor} pt-20 pb-6 px-6 shadow-xl shrink-0 transition-colors duration-500`}>
                <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-b from-black/20 to-black/60 pointer-events-none"></div>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    {isUniverse ? <Globe size={120} /> : <Film size={120} />}
                </div>

                <div className="relative z-10 flex items-center justify-between mb-4">
                    <button onClick={onBack} className="p-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-colors"><ArrowLeft size={20}/></button>
                    <div className="text-[10px] font-bold uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full backdrop-blur-md">{headerTitle}</div>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                            {project.type === 'MOVIE' ? <Film size={20} /> : <Tv size={20} />}
                        </div>
                        {isUniverse && <span className="bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded uppercase flex items-center gap-1"><Crown size={10}/> Franchise</span>}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight mb-2 text-white shadow-sm line-clamp-2">
                        {isUniverse && universe ? universe.characterName : project.title}
                    </h1>
                        <div className={`text-xs font-bold ${textColor} uppercase tracking-wider flex items-center gap-2`}>
                            {isUniverse && universe ? <span>{universe.universeId} Universe</span> : <span>{studio.name}</span>}
                            <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                            <span>{project.genre}</span>
                            {project.type === 'SERIES' && project.episodes && (
                                <>
                                    <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                                    <span>{project.episodes} Episodes</span>
                                </>
                            )}
                            {universe && <span className="text-amber-400">• Universe Lead</span>}
                        </div>
                </div>
            </div>

            {/* SCROLL CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-zinc-950">
                
                {/* 1. UNIVERSE CONTRACT CARD */}
                {universe && (
                    <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-3xl overflow-hidden">
                        <div className="bg-indigo-900/40 p-4 border-b border-indigo-500/20 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest">
                                <Sparkles size={14}/> Contract Commitments
                            </div>
                            <div className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded font-bold">{universe.films.length}-Picture Deal</div>
                        </div>
                        
                        <div className="divide-y divide-indigo-500/10">
                            {universe.films.map((film, idx) => (
                                <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="text-indigo-500/50 font-black text-lg w-4">{idx + 1}</div>
                                        <div>
                                            <div className="font-bold text-sm text-zinc-200">{film.title}</div>
                                            <div className="text-[10px] text-indigo-400/70 uppercase tracking-wide">{film.type.replace('_', ' ')}</div>
                                        </div>
                                    </div>
                                    <div className={`text-[10px] font-bold px-2 py-1 rounded border ${film.role === 'LEAD' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                                        {film.role}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. PRODUCTION INTEL */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Info size={12}/> Production Intel
                        </div>
                        {project.isFamous && <div className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">Prestige Project</div>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-6">
                        {/* Director */}
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-700 shrink-0">
                                <User size={14}/>
                            </div>
                            <div>
                                <div className="text-[9px] text-zinc-500 uppercase font-bold">Director</div>
                                <div className="font-bold text-white text-sm leading-tight mb-0.5">{project.directorName}</div>
                                <div className="text-[10px] text-indigo-400">{project.visibleDirectorTier}</div>
                            </div>
                        </div>

                        {/* Script Buzz */}
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-pink-500 border border-zinc-700 shrink-0">
                                <TrendingUp size={14}/>
                            </div>
                            <div>
                                <div className="text-[9px] text-zinc-500 uppercase font-bold">Script Buzz</div>
                                <div className="font-bold text-pink-400 text-sm leading-tight">{project.visibleScriptBuzz}</div>
                            </div>
                        </div>

                        {/* Cast Strength */}
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-emerald-500 border border-zinc-700 shrink-0">
                                <Users size={14}/>
                            </div>
                            <div>
                                <div className="text-[9px] text-zinc-500 uppercase font-bold">Cast</div>
                                <div className="font-bold text-emerald-400 text-sm leading-tight">{project.visibleCastStrength}</div>
                            </div>
                        </div>

                        {/* Budget */}
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-amber-500 border border-zinc-700 shrink-0">
                                <BarChart3 size={14}/>
                            </div>
                            <div>
                                <div className="text-[9px] text-zinc-500 uppercase font-bold">Budget Tier</div>
                                <div className="font-bold text-amber-400 text-sm leading-tight">{project.budgetTier}</div>
                                {project.estimatedBudget && <div className="text-[10px] text-zinc-500">~{formatMoney(project.estimatedBudget)}</div>}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800">
                        <div className="text-[9px] text-zinc-500 uppercase font-bold mb-2">Logline</div>
                        <p className="text-sm text-zinc-300 italic leading-relaxed">"{project.description}"</p>
                    </div>
                </div>

                {/* 3. CAST LIST (If Available) */}
                {project.castList && project.castList.length > 0 && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Users size={12}/> Key Cast & Crew
                        </div>
                        <div className="space-y-3">
                            {project.castList.map(member => (
                                <div key={member.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img src={member.image} className="w-8 h-8 rounded-full object-cover border border-zinc-700"/>
                                        <div>
                                            <div className="text-sm font-bold text-zinc-200">{member.name}</div>
                                            <div className="text-[10px] text-zinc-500">{member.role}</div>
                                        </div>
                                    </div>
                                    {member.isPlayer && <div className="text-[9px] font-bold bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">YOU</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. SCHEDULE */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Calendar size={12}/> Production Schedule
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400">Est. Engagement</span>
                            <span className="text-white font-bold">{estimatedFilmingWeeks}</span> 
                        </div>
                        {showWeeklyEnergy && (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-400">Weekly Energy Cost</span>
                                <span className="text-amber-400 font-bold flex items-center gap-1"><Zap size={10}/> {opportunity.config.energyCost} / wk</span> 
                            </div>
                        )}
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400">Location</span>
                            <span className="text-white font-bold">Los Angeles (Studio)</span> 
                        </div>
                    </div>
                </div>

                {/* 5. NEGOTIATION / OFFER CARD */}
                <div className={`rounded-3xl p-1 border-2 ${isNegotiating ? 'bg-amber-950/10 border-amber-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className={`${isNegotiating ? 'bg-amber-500/10' : 'bg-zinc-800/50'} rounded-[20px] p-5`}>
                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isNegotiating ? 'text-amber-500' : 'text-zinc-500'}`}>
                            {isNegotiating ? <Handshake size={14}/> : <DollarSign size={14}/>} 
                            {isNegotiating ? 'Contract Negotiation' : 'Compensation'}
                        </div>

                        {/* Current Offer Display */}
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Total Base Salary</div>
                                <div className="text-3xl font-mono font-bold text-white tracking-tight leading-none">${displaySalary ? displaySalary.toLocaleString() : '0'}</div>
                            </div>
                            {(displayRoyalty > 0 || isNegotiating) && (
                                <div className="text-right">
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Backend</div>
                                    <div className="text-xl font-mono font-bold text-amber-400 leading-none">{displayRoyalty}%</div>
                                </div>
                            )}
                        </div>

                        {/* Studio Message Feedback */}
                        {isNegotiating && studioMessage && (
                            <div className={`mb-4 p-3 rounded-lg text-xs font-bold border flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${negotiationStatus === 'REJECTED' ? 'bg-rose-900/50 border-rose-500 text-rose-200' : 'bg-zinc-900 border-zinc-700 text-zinc-300'}`}>
                                <AlertCircle size={14} className={negotiationStatus === 'REJECTED' ? 'text-rose-500' : 'text-zinc-500'} />
                                {studioMessage}
                            </div>
                        )}

                        {/* Negotiation Inputs */}
                        {isNegotiating && onCounter && negotiationStatus !== 'REJECTED' && (
                            <div className="bg-black/40 rounded-xl p-3 border border-white/10 space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                    <span>Counter Offer</span>
                                    <span>Patience: {studioPatience}/3</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button onClick={() => changeSalary(-500000)} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 text-zinc-400"><Minus size={14}/></button>
                                    <div className="flex-1 bg-zinc-900 rounded-lg py-2 px-2 text-center border border-zinc-700">
                                        <span className="text-sm font-mono font-bold text-white">${counterSalary.toLocaleString()}</span>
                                    </div>
                                    <button onClick={() => changeSalary(500000)} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 text-zinc-400"><Plus size={14}/></button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button onClick={() => changeRoyalty(-0.5)} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 text-zinc-400"><Minus size={14}/></button>
                                    <div className="flex-1 bg-zinc-900 rounded-lg py-2 px-2 text-center border border-zinc-700">
                                        <span className="text-sm font-mono font-bold text-amber-400">{counterRoyaltyPct}% Points</span>
                                    </div>
                                    <button onClick={() => changeRoyalty(0.5)} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 text-zinc-400"><Plus size={14}/></button>
                                </div>

                                <button 
                                    onClick={handleSubmitCounter}
                                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-lg text-xs uppercase tracking-wide transition-colors shadow-lg"
                                >
                                    Submit Counter
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ACTION FOOTER (Only if not in active negotiation state OR negotiating but not rejected) */}
                {(!isNegotiating || (isNegotiating && negotiationStatus !== 'REJECTED')) && (
                    <div className="pt-4 pb-20">
                        <button 
                            onClick={onAction}
                            disabled={isProcessing || actionDisabled || (isNegotiating && negotiationStatus === 'REJECTED')}
                            className={`w-full py-4 rounded-2xl font-bold text-base shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${actionDisabled ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : actionColorClass}`}
                        >
                            {isProcessing ? (
                                <span className="animate-pulse">Processing...</span>
                            ) : (
                                <>
                                    {actionIcon || <CheckCircle size={20}/>} {actionLabel}
                                </>
                            )}
                        </button>
                    </div>
                )}

            </div>

        </div>
    );
};
