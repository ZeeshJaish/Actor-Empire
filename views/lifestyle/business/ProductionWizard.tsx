
import React, { useState, useEffect } from 'react';
import { Player } from '../../../types';
import { createBusiness, HEAD_OF_PRODUCTION_CANDIDATES } from '../../../services/businessLogic';
import { ArrowLeft, ArrowRight, Camera, Check, Clapperboard, Star, Users, Zap, Lock, DollarSign, TrendingUp, ShieldCheck, Crown, Sparkles, X, AlertTriangle, ChevronRight, PenTool } from 'lucide-react';

interface ProductionWizardProps {
    player: Player;
    onCancel: () => void;
    onUpdatePlayer: (p: Player) => void;
    onComplete: () => void;
}

export const ProductionWizard: React.FC<ProductionWizardProps> = ({ player, onCancel, onUpdatePlayer, onComplete }) => {
    // Start at Step 0 (The Gate) instead of 1
    const [step, setStep] = useState(0); 
    const [name, setName] = useState('');
    const [headOfProd, setHeadOfProd] = useState<string | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    
    // --- CUTSCENE STATE ---
    const [showConfirm, setShowConfirm] = useState(false);
    const [playCutscene, setPlayCutscene] = useState(false);
    const [cutsceneLine, setCutsceneLine] = useState('');
    const [cutsceneOpacity, setCutsceneOpacity] = useState(0); // 0 to 1
    const [flash, setFlash] = useState(false);
    
    // --- DOCUMENT INTERACTION STATE ---
    const [isSigning, setIsSigning] = useState(false);
    const [isStamping, setIsStamping] = useState(false);

    // Dynamic Text State (Typewriter for Gate)
    const DREAMS = [
        "The Next Cinematic Universe",
        "The Next Avatar",
        "The Next Titanic",
        "The Next Avengers",
        "The Next Godfather",
        "Your Own Legacy"
    ];

    const [displayText, setDisplayText] = useState('');
    const [index, setIndex] = useState(0);
    const [subIndex, setSubIndex] = useState(0);
    const [reverse, setReverse] = useState(false);

    // Typing Logic
    useEffect(() => {
        if (step !== 0) return; // Only run on Gate

        if (index >= DREAMS.length) {
             setIndex(0); 
             return;
        }

        if (subIndex === DREAMS[index].length + 1 && !reverse) {
            const timeout = setTimeout(() => {
                setReverse(true);
            }, 2000); // Wait 2s before deleting
            return () => clearTimeout(timeout);
        }

        if (subIndex === 0 && reverse) {
            setReverse(false);
            setIndex((prev) => (prev + 1) % DREAMS.length);
            return;
        }

        const timeout = setTimeout(() => {
            setSubIndex((prev) => prev + (reverse ? -1 : 1));
        }, reverse ? 30 : 80); // Typing speed vs Deleting speed

        return () => clearTimeout(timeout);
    }, [subIndex, index, reverse, step]);

    useEffect(() => {
        setDisplayText(DREAMS[index].substring(0, subIndex));
    }, [subIndex, index]);

    // --- ORIGIN STORY GENERATOR ---
    const getOriginStory = () => {
        if (player.age < 25) {
            return [
                "They said you were too young to understand the business.",
                "They said you were just a fleeting trend.",
                "Today, you buy the ones who doubted you."
            ];
        }
        if (player.stats.reputation < 30) {
            return [
                "The tabloids call you a liability.",
                "The studios are afraid to hire you.",
                "So you'll build a studio that answers to no one."
            ];
        }
        if (player.age >= 40 && player.stats.fame > 80) {
            return [
                "Decades of reading other people's lines.",
                "Thousands of hours waiting in trailers.",
                "It's time to write your own history."
            ];
        }
        // Default / Rich Outsider
        return [
            "The critics don't know your vision yet.",
            "But money speaks a language everyone understands.",
            "Time to buy your seat at the table."
        ];
    };

    const handleConfirmSetup = () => {
        setShowConfirm(false);
        setPlayCutscene(true);

        const lines = getOriginStory();
        
        // Sequence Timeline
        setCutsceneLine(lines[0]);
        setCutsceneOpacity(1); // Immediate fade in via CSS transition

        setTimeout(() => setCutsceneOpacity(0), 3000);

        // Line 2
        setTimeout(() => {
            setCutsceneLine(lines[1]);
            setCutsceneOpacity(1);
        }, 4000);
        setTimeout(() => setCutsceneOpacity(0), 7000);

        // Line 3
        setTimeout(() => {
            setCutsceneLine(lines[2]);
            setCutsceneOpacity(1);
        }, 8000);
        setTimeout(() => setCutsceneOpacity(0), 11500);

        // Flash & Transition
        setTimeout(() => setFlash(true), 12500);
        setTimeout(() => {
            setPlayCutscene(false);
            setStep(1);
        }, 13500);
    };

    const COST = 50000000;

    const handleFinalRatify = () => {
        if (!name || !headOfProd) return;
        
        // 1. Start Signing Animation
        setIsSigning(true);
        
        // 2. Wait for Signature to write (1.5s)
        setTimeout(() => {
            // 3. Trigger Stamp Animation
            setIsStamping(true);
            
            // 4. Wait for Stamp Impact (2s) then Launch
            setTimeout(() => {
                handleLaunchLogic();
            }, 2000);
        }, 1500);
    };

    const handleLaunchLogic = () => {
        setIsAnimating(true);

        setTimeout(() => {
            const newBiz = createBusiness(name, 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', { 
                quality: 'LUXURY', 
                pricing: 'HIGH', 
                marketing: 'HIGH', 
                headOfProductionId: headOfProd 
            }, '🎬', player.currentWeek);

            const hopName = HEAD_OF_PRODUCTION_CANDIDATES.find(h => h.id === headOfProd)?.name;

            onUpdatePlayer({
                ...player,
                money: player.money - COST,
                businesses: [...player.businesses, newBiz],
                logs: [...player.logs, { 
                    week: player.currentWeek, 
                    year: player.age, 
                    message: `GRAND OPENING: ${name} Production House established! ${hopName} hired as Head of Production.`, 
                    type: 'positive' 
                }],
                news: [{
                    id: `news_studio_launch_${Date.now()}`,
                    headline: `${player.name} launches ${name} Studios with $50M investment.`,
                    subtext: "Industry experts call it a bold move.",
                    category: 'TOP_STORY',
                    week: player.currentWeek,
                    year: player.age,
                    impactLevel: 'HIGH'
                }, ...player.news]
            });
            onComplete();
        }, 2500); // Animation wait
    };

    // --- RENDER: LAUNCH ANIMATION ---
    if (isAnimating) {
        return (
            <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/30 via-black to-black"></div>
                <div className="relative z-10 space-y-6">
                    <div className="text-6xl animate-bounce">🎬</div>
                    <h1 className="text-4xl font-serif font-black text-white uppercase tracking-widest">{name}</h1>
                    <div className="text-amber-500 font-bold uppercase tracking-[0.5em] text-xs animate-pulse">Grand Opening</div>
                    <div className="flex justify-center gap-2 mt-8">
                        <Camera className="text-white animate-ping" size={24}/>
                        <Camera className="text-white animate-ping delay-100" size={24}/>
                        <Camera className="text-white animate-ping delay-200" size={24}/>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER: CUTSCENE ---
    if (playCutscene) {
        return (
            <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-center px-8 transition-colors duration-1000">
                <div 
                    className="font-serif text-2xl md:text-3xl text-white font-bold leading-relaxed tracking-wide transition-opacity duration-1000"
                    style={{ opacity: cutsceneOpacity }}
                >
                    {cutsceneLine}
                </div>
                {flash && <div className="absolute inset-0 bg-white animate-out fade-out duration-[1500ms] pointer-events-none"></div>}
            </div>
        );
    }

    // --- STEP 0: THE GATE (Progress & Unlock) ---
    if (step === 0) {
        const progress = Math.min(100, (player.money / COST) * 100);
        const remaining = Math.max(0, COST - player.money);
        const canAfford = player.money >= COST;

        return (
            <div className="fixed inset-0 z-[60] bg-[#050505] flex flex-col animate-in slide-in-from-right duration-300 font-sans overflow-hidden">
                {/* Cinematic Background */}
                <style>{`
                    @keyframes spotlight {
                        0% { transform: rotate(0deg) scale(1); opacity: 0.3; }
                        50% { transform: rotate(15deg) scale(1.2); opacity: 0.6; }
                        100% { transform: rotate(0deg) scale(1); opacity: 0.3; }
                    }
                    .animate-spotlight { animation: spotlight 8s infinite ease-in-out; }
                `}</style>
                <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[80%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent animate-spotlight"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/80 to-black pointer-events-none"></div>

                {/* CONFIRMATION MODAL */}
                {showConfirm && (
                    <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
                        <div className="bg-[#0a0a0a] border border-amber-900/30 w-full max-w-sm rounded-3xl p-8 relative overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.1)]">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-700 via-yellow-500 to-amber-700"></div>
                            
                            <div className="text-center space-y-6">
                                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
                                    <AlertTriangle size={32} className="text-amber-500" />
                                </div>
                                
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Major Investment</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        This action requires a capital injection of <span className="text-white font-bold font-mono">$50,000,000</span>.
                                    </p>
                                    <p className="text-zinc-500 text-xs mt-4 italic">
                                        "This transfer is irreversible. Are you ready to become a Mogul?"
                                    </p>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <button 
                                        onClick={handleConfirmSetup}
                                        className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-black font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-amber-900/20 transition-all active:scale-[0.98]"
                                    >
                                        Sign The Check
                                    </button>
                                    <button 
                                        onClick={() => setShowConfirm(false)}
                                        className="w-full py-3 text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-wider"
                                    >
                                        Not Yet
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="relative z-10 p-6 pt-12 flex justify-between items-center shrink-0">
                    <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors p-2 bg-black/50 rounded-full backdrop-blur-md"><ArrowLeft size={20}/></button>
                    <div className="flex items-center gap-2 text-[10px] text-amber-400 font-black uppercase tracking-[0.2em] border border-amber-500/30 px-3 py-1 rounded-full bg-amber-950/40 backdrop-blur-md">
                        <Crown size={12} fill="currentColor" /> Elite Tier
                    </div>
                </div>

                <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="min-h-full flex flex-col items-center justify-center p-8 text-center space-y-10">
                        
                        {/* HERO SECTION */}
                        <div className="space-y-6 relative">
                            {/* Glowing Icon */}
                            <div className="relative mx-auto w-28 h-28">
                                <div className={`absolute inset-0 bg-amber-500 blur-3xl opacity-20 animate-pulse`}></div>
                                <div className={`w-full h-full rounded-[2rem] flex items-center justify-center relative z-10 shadow-2xl border-t border-l border-white/10 ${canAfford ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' : 'bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-600 border-zinc-700'}`}>
                                    {canAfford ? <Clapperboard size={56} strokeWidth={1.5} /> : <Lock size={56} strokeWidth={1.5} />}
                                </div>
                                {canAfford && <div className="absolute -top-2 -right-2 bg-white text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-lg animate-bounce">READY</div>}
                            </div>

                            <div>
                                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 uppercase tracking-tighter leading-[0.9] mb-4 drop-shadow-xl">
                                    Production<br/>House
                                </h1>
                                
                                {/* DYNAMIC TEXT TYPEWRITER */}
                                <div className="h-8 flex items-center justify-center overflow-hidden relative">
                                    <div className="text-amber-400 text-xs md:text-sm font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                                        Create <span className="text-white drop-shadow-md">{displayText}</span>
                                        <span className="w-0.5 h-4 bg-amber-400 animate-pulse"></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* STATS & FUNDING */}
                        <div className="w-full max-w-sm bg-zinc-900/80 border border-white/5 p-1 rounded-[2rem] backdrop-blur-md shadow-2xl">
                            <div className="bg-black/50 rounded-[1.7rem] p-6 space-y-5">
                                
                                <div className="flex justify-between items-end">
                                    <div className="text-left">
                                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Target Capital</div>
                                        <div className="text-2xl font-black text-white tracking-tight">$50M</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${remaining === 0 ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                            {remaining === 0 ? 'Fully Funded' : 'Remaining'}
                                        </div>
                                        <div className={`text-lg font-mono font-bold ${remaining === 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                            {remaining === 0 ? <Check size={20}/> : `$${remaining.toLocaleString()}`}
                                        </div>
                                    </div>
                                </div>

                                {/* Cinematic Progress Bar */}
                                <div className="relative h-6 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 shadow-inner">
                                    {/* Grid Lines */}
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 z-10"></div>
                                    
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-out relative ${canAfford ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-amber-900 to-amber-600'}`} 
                                        style={{ width: `${progress}%` }}
                                    >
                                        <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/50 blur-[2px]"></div>
                                        {canAfford && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                                    </div>
                                </div>

                                <div className="flex justify-between text-[10px] text-zinc-600 font-mono pt-1">
                                    <span>LIQUID: ${player.money.toLocaleString()}</span>
                                    <span>{progress.toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* FEATURES TICKER */}
                        <div className="flex justify-center gap-2 flex-wrap max-w-xs">
                            <div className="bg-zinc-900/50 border border-zinc-800 px-3 py-2 rounded-lg flex items-center gap-2">
                                <TrendingUp size={14} className="text-amber-500"/>
                                <span className="text-[10px] font-bold text-zinc-300 uppercase">100% Profits</span>
                            </div>
                            <div className="bg-zinc-900/50 border border-zinc-800 px-3 py-2 rounded-lg flex items-center gap-2">
                                <Star size={14} className="text-amber-500"/>
                                <span className="text-[10px] font-bold text-zinc-300 uppercase">Own IP</span>
                            </div>
                            <div className="bg-zinc-900/50 border border-zinc-800 px-3 py-2 rounded-lg flex items-center gap-2">
                                <Users size={14} className="text-amber-500"/>
                                <span className="text-[10px] font-bold text-zinc-300 uppercase">Cast Stars</span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 bg-gradient-to-t from-black via-black to-transparent relative z-20 shrink-0">
                    <button 
                        onClick={() => canAfford && setShowConfirm(true)}
                        disabled={!canAfford}
                        className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.15em] shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center justify-center gap-3 transition-all duration-300 group ${
                            canAfford 
                            ? 'bg-amber-500 hover:bg-amber-400 text-black scale-[1.02] shadow-[0_0_20px_rgba(245,158,11,0.3)]' 
                            : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
                        }`}
                    >
                        {canAfford ? (
                            <>Initialize Setup <ArrowRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform"/></>
                        ) : (
                            <><Lock size={16}/> Insufficient Funds</>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // --- STEP 1 & 2: THE LEGAL DOCUMENT ---
    return (
        <div className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 pt-12 border-b border-zinc-800 flex justify-between items-center bg-black/50 backdrop-blur-md shrink-0">
                <button onClick={onCancel} className="text-zinc-500 hover:text-white"><ArrowLeft size={24}/></button>
                <div className="flex flex-col items-center">
                    <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Premium Setup</div>
                    <h2 className="text-white font-serif font-bold text-lg">Production House</h2>
                </div>
                <div className="w-6"></div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#050505] flex flex-col">
                
                <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 animate-in fade-in slide-in-from-bottom duration-500">
                   
                   {/* UNIFIED DOCUMENT CONTAINER */}
                   <div className="w-full max-w-sm bg-[#f2f2f2] text-black p-8 rounded-sm shadow-2xl relative overflow-hidden transform transition-all rotate-1 hover:rotate-0 duration-500 border border-zinc-300 min-h-[500px] flex flex-col">
                       
                       {/* Document Header */}
                       <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
                           <div>
                               <h2 className="font-serif font-black text-2xl uppercase tracking-tighter leading-none">Articles of<br/>Incorporation</h2>
                           </div>
                           <div className="text-[10px] font-mono opacity-60 text-right">
                               FORM 882-AZ<br/>
                               {new Date().toLocaleDateString()}
                           </div>
                       </div>

                       {/* STEP 1: ENTITY NAME */}
                       {step === 1 && (
                           <div className="space-y-6 font-serif flex-1 flex flex-col animate-in fade-in duration-300">
                               <div className="text-[10px] font-sans font-bold uppercase tracking-widest border-b border-black/10 pb-1 mb-2">Article I: Identity</div>
                               <p className="text-sm leading-relaxed">
                                   I, the undersigned, hereby establish a new media entity for the purpose of global entertainment domination.
                               </p>

                               <div className="mt-8">
                                   <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-50 font-sans">Corporate Entity Name</label>
                                   <input 
                                       type="text" 
                                       value={name}
                                       onChange={(e) => setName(e.target.value)}
                                       placeholder="ENTER NAME HERE"
                                       className="w-full bg-transparent border-b-2 border-black/20 py-2 text-xl font-bold uppercase tracking-wide focus:outline-none focus:border-black transition-colors placeholder:text-black/20 font-serif"
                                       autoFocus
                                   />
                               </div>

                               <div className="flex-1"></div>

                               <div className="flex justify-end pt-4">
                                   <button 
                                       onClick={() => setStep(2)}
                                       disabled={!name}
                                       className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-amber-700 transition-colors disabled:opacity-30 font-sans"
                                   >
                                       Proceed to Schedule A <ArrowRight size={14}/>
                                   </button>
                               </div>
                           </div>
                       )}

                       {/* STEP 2: HEAD OF PRODUCTION */}
                       {step === 2 && (
                           <div className="space-y-4 font-serif flex-1 flex flex-col animate-in fade-in slide-in-from-right duration-300">
                               <div className="text-[10px] font-sans font-bold uppercase tracking-widest border-b border-black/10 pb-1 mb-2">Schedule A: Executive Appointment</div>
                               <p className="text-xs leading-relaxed opacity-70 mb-2">
                                   Select an initial Head of Production to oversee studio operations.
                               </p>

                               <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
                                   {HEAD_OF_PRODUCTION_CANDIDATES.map(cand => {
                                       const isSelected = headOfProd === cand.id;
                                       return (
                                           <button 
                                               key={cand.id}
                                               onClick={() => setHeadOfProd(cand.id)}
                                               className={`w-full text-left p-3 border rounded-sm transition-all relative group ${isSelected ? 'border-black bg-black/5' : 'border-black/10 hover:border-black/30'}`}
                                           >
                                               <div className="flex justify-between items-start">
                                                   <div className="font-bold text-sm uppercase tracking-wide">{cand.name}</div>
                                                   {isSelected && <div className="text-black"><PenTool size={14} fill="currentColor"/></div>}
                                               </div>
                                               <div className="text-[10px] font-sans uppercase font-bold text-black/50 mt-1">{cand.bonus}</div>
                                               <div className="text-[10px] italic opacity-70 mt-1 leading-tight">{cand.description}</div>
                                           </button>
                                       );
                                   })}
                               </div>

                               <div className="border-t-2 border-black pt-4 mt-2">
                                   <div className="flex justify-between items-end mb-4">
                                       <div className="text-xs relative min-w-[120px]">
                                           <span className="block text-[8px] uppercase font-bold opacity-50 font-sans mb-1">Founder Signature</span>
                                           <div className="relative h-8 border-b border-black/10">
                                               {/* Signature Animation: Reveals width from 0 to 100% */}
                                               <div className={`absolute bottom-0 left-0 whitespace-nowrap overflow-hidden transition-all duration-[1500ms] ease-out ${isSigning || isStamping ? 'w-full opacity-100' : 'w-0 opacity-0'}`}>
                                                   <span className="font-serif italic text-2xl font-bold text-blue-900" style={{ fontFamily: '"Brush Script MT", cursive' }}>{player.name}</span>
                                               </div>
                                               {!(isSigning || isStamping) && <span className="absolute bottom-1 left-0 text-[10px] text-black/20 font-sans tracking-widest">x____________________</span>}
                                           </div>
                                       </div>
                                       
                                       <div className="text-right">
                                           <div className="text-[8px] uppercase font-bold opacity-50 font-sans">Capital Commitment</div>
                                           <div className="font-mono font-bold text-sm">${COST.toLocaleString()}</div>
                                       </div>
                                   </div>

                                   {/* Ratify Button (The Stamp) */}
                                   <div className="flex justify-center">
                                       <button 
                                           onClick={handleFinalRatify}
                                           disabled={!headOfProd || isSigning || isStamping}
                                           className="relative group disabled:opacity-50"
                                       >
                                           <div className="w-24 h-24 rounded-full border-4 border-dashed border-red-900/30 flex items-center justify-center group-hover:border-red-600 group-hover:bg-red-50 transition-all bg-white">
                                               <div className="text-[10px] font-bold text-red-900/50 uppercase text-center leading-tight group-hover:text-red-600 font-sans">
                                                   Click to<br/>Sign & Ratify
                                               </div>
                                           </div>
                                       </button>
                                   </div>
                               </div>
                           </div>
                       )}

                       {/* STAMP ANIMATION (Overlay) */}
                       {isStamping && (
                           <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                               <div className="border-8 border-red-600 text-red-600 font-black text-5xl p-4 rounded-lg transform -rotate-12 opacity-0 animate-stamp-in shadow-xl bg-red-600/10 backdrop-blur-[1px]">
                                   APPROVED
                               </div>
                           </div>
                       )}
                       
                       {/* Background Texture */}
                       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50 pointer-events-none mix-blend-multiply"></div>
                   </div>
                   
                   <p className="text-zinc-500 text-xs mt-8 font-mono animate-pulse">
                       {step === 1 ? 'Waiting for entity name...' : isSigning ? 'Signing document...' : isStamping ? 'Finalizing...' : 'Waiting for executive appointment...'}
                   </p>
                   
                   <style>{`
                       @keyframes stamp-in {
                           0% { opacity: 0; transform: scale(3) rotate(0deg); }
                           100% { opacity: 0.9; transform: scale(1) rotate(-12deg); }
                       }
                       .animate-stamp-in { animation: stamp-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                   `}</style>
               </div>

            </div>
        </div>
    );
};
