
import React, { useState, useEffect, useMemo } from 'react';
import { Player, PendingEvent, ClothingItem, PressInteraction, ClothingCategory, Stats, Vehicle, Award } from '../types';
import { CLOTHING_CATALOG, CAR_CATALOG, MOTORCYCLE_CATALOG, BOAT_CATALOG, AIRCRAFT_CATALOG } from '../services/lifestyleLogic';
import { generatePressInteractions, determineWinners, Nomination, sanitizeAwardRecords, generateSeasonWinners } from '../services/awardLogic';
import { RED_CARPET_INTERVIEWS } from '../services/premiereLogic';
import { NPC_DATABASE } from '../services/npcLogic';
import { Camera, Star, Mic2, Shirt, ArrowRight, Trophy, Zap, X, MapPin, Watch, Footprints, Layers, Check, Car, Barcode, Users, Tv, Sparkles, Music, Video, Clapperboard, Globe, FastForward, Glasses, ShoppingBag, Gem } from 'lucide-react';

interface RedCarpetEventProps {
    player: Player;
    event: PendingEvent;
    onComplete: (updatedPlayer: Player) => void;
}

type Phase = 'OUTFIT' | 'LIMO_ARRIVAL' | 'CARPET_WALK' | 'MONEY_SHOT' | 'RED_CARPET_INTERVIEW' | 'CEREMONY_INTRO' | 'CEREMONY_FLOW' | 'SUMMARY' | 'PREMIERE_SCREENING';

type CeremonyStepType = 'FILLER_CATEGORY' | 'PLAYER_CATEGORY';

interface CeremonyStep {
    type: CeremonyStepType;
    categoryName: string;
    nominees: string[];
    winner: string;
    isPlayerWinner?: boolean;
    data?: any; // For player results
}

const upsertAwardRecord = (awards: Award[], nextAward: Award): Award[] => {
    const existingIndex = awards.findIndex(award =>
        award.type === nextAward.type &&
        award.year === nextAward.year &&
        award.category === nextAward.category &&
        award.projectId === nextAward.projectId
    );

    if (existingIndex === -1) {
        return [...awards, nextAward];
    }

    return awards.map((award, index) =>
        index === existingIndex
            ? { ...award, ...nextAward, id: award.id, outcome: nextAward.outcome === 'WON' ? 'WON' : award.outcome }
            : award
    );
};

const buildFallbackOpponentNames = (category: string, playerName: string): string[] => {
    const isActress = category.includes('Actress');
    const isActor = category.includes('Actor') && !category.includes('Actress');
    const isDirector = category.includes('Director');
    const isProjectAward = (category.includes('Picture') || category.includes('Series') || category.includes('Musical') || category.includes('Film')) && !isActor && !isActress && !isDirector;

    if (isProjectAward) {
        return ['Midnight Echo', 'Glass Kingdom', 'Neon Harbor'];
    }

    if (isDirector) {
        return ['Ava Laurent', 'Marcus Vale', 'Elena Cross'];
    }

    const pool = NPC_DATABASE
        .filter(npc => {
            if (isActress) return npc.gender === 'FEMALE';
            if (isActor) return npc.gender === 'MALE';
            return true;
        })
        .map(npc => npc.name)
        .filter(name => !!name && name !== playerName);

    const uniqueNames = Array.from(new Set(pool));
    const shuffled = uniqueNames.sort(() => 0.5 - Math.random());

    return shuffled.slice(0, 3).length > 0 ? shuffled.slice(0, 3) : ['Alex Mercer', 'Jordan Vale', 'Taylor Quinn'];
};

// --- VISUAL ASSETS ---

const STYLE = `
@keyframes beam-sweep-left {
  0%, 100% { transform: rotate(-25deg) scaleY(1.5); opacity: 0.1; }
  50% { transform: rotate(15deg) scaleY(1.5); opacity: 0.4; }
}
@keyframes beam-sweep-right {
  0%, 100% { transform: rotate(25deg) scaleY(1.5); opacity: 0.1; }
  50% { transform: rotate(-15deg) scaleY(1.5); opacity: 0.4; }
}
@keyframes flash-burst {
  0% { opacity: 0; transform: scale(0.5); }
  10% { opacity: 1; transform: scale(1.5); }
  100% { opacity: 0; transform: scale(0); }
}
@keyframes pulse-slow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}
@keyframes slide-up-fade {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
.animate-beam-left { animation: beam-sweep-left 8s infinite ease-in-out; transform-origin: bottom center; }
.animate-beam-right { animation: beam-sweep-right 7s infinite ease-in-out; transform-origin: bottom center; }
.animate-flash-pop { animation: flash-burst 0.3s ease-out forwards; }
.animate-pulse-slow { animation: pulse-slow 3s infinite ease-in-out; }
.animate-slide-up { animation: slide-up-fade 0.5s ease-out forwards; }
`;

const SearchBeam = ({ side, delay }: { side: 'left' | 'right', delay: string }) => (
    <div 
        className={`absolute bottom-0 w-[100px] h-[150vh] bg-gradient-to-t from-white via-white/10 to-transparent blur-2xl pointer-events-none ${side === 'left' ? 'left-[-10%] animate-beam-left' : 'right-[-10%] animate-beam-right'}`}
        style={{ animationDelay: delay }}
    />
);

const PaparazziFlash: React.FC<{ x: number; y: number; delay: number }> = ({ x, y, delay }) => (
    <div 
        className="absolute w-16 h-16 bg-white rounded-full blur-xl animate-flash-pop pointer-events-none mix-blend-hard-light"
        style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}ms`, opacity: 0 }}
    />
);

// --- NEWS ASSETS ---
const HEADLINES_GOOD = [
    "CRITICS HAIL NEW STAR", "A NIGHT TO REMEMBER", "RED CARPET TRIUMPH", "THE TALK OF THE TOWN", "HOLLYWOOD'S NEW ICON"
];
const HEADLINES_BAD = [
    "FASHION FAUX PAS?", "A QUIET RECEPTION", "MIXED REACTIONS AT PREMIERE", "STYLE MISSES THE MARK"
];

// Slot Button Component
const SlotButton = ({ label, subLabel, icon, isActive, hasItem, onClick, disabled, className }: any) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`relative p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 text-center group ${className} ${
            disabled ? 'opacity-20 cursor-not-allowed border-zinc-800 bg-zinc-900' :
            isActive ? 'border-amber-500 bg-amber-950/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]' :
            hasItem ? 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800' :
            'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700'
        }`}
    >
        <div className={`p-3 rounded-full transition-colors ${isActive ? 'bg-amber-500 text-black' : hasItem ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-950 text-zinc-600'}`}>
            {icon}
        </div>
        <div>
            <div className={`text-[10px] uppercase font-bold tracking-widest mb-0.5 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`}>{label}</div>
            <div className={`text-xs font-bold leading-tight line-clamp-1 ${hasItem ? 'text-white' : 'text-zinc-700 italic'}`}>
                {subLabel}
            </div>
        </div>
        {hasItem && isActive && <div className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>}
    </button>
);

export const RedCarpetEvent: React.FC<RedCarpetEventProps> = ({ player, event, onComplete }) => {
    const [phase, setPhase] = useState<Phase>('OUTFIT');
    
    // Outfit State
    const [equippedItems, setEquippedItems] = useState<{
        OUTFIT: ClothingItem | null;
        TOP: ClothingItem | null;
        BOTTOM: ClothingItem | null;
        SHOES: ClothingItem | null;
        EYEWEAR: ClothingItem | null;
        WATCH: ClothingItem | null;
        BAG: ClothingItem | null;
        JEWELRY: ClothingItem | null;
    }>({ 
        OUTFIT: null, TOP: null, BOTTOM: null, SHOES: null,
        EYEWEAR: null, WATCH: null, BAG: null, JEWELRY: null 
    });

    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [activeSlot, setActiveSlot] = useState<string | null>(null);

    // Logic State
    const [pressQuestions, setPressQuestions] = useState<PressInteraction[]>([]);
    const [currentResults, setCurrentResults] = useState<any[]>([]);
    
    // Ceremony Flow State
    const [ceremonyQueue, setCeremonyQueue] = useState<CeremonyStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [stepPhase, setStepPhase] = useState<'TRANSITION' | 'REVEAL_NOMINEES' | 'TENSION' | 'RESULT'>('TRANSITION');
    const [revealedNomineesCount, setRevealedNomineesCount] = useState(0);
    const [hypeImpact, setHypeImpact] = useState(0);
    
    // Animation State
    const [walkProgress, setWalkProgress] = useState(0); 
    const [isDoorOpen, setIsDoorOpen] = useState(false); 

    // Generators
    const flashes = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        side: (i % 2 === 0 ? 'left' : 'right') as 'left' | 'right',
        x: i % 2 === 0 ? Math.random() * 30 : 70 + (Math.random() * 30),
        y: 40 + Math.random() * 40,
        delay: Math.random() * 4000
    })), []);

    // Helpers
    const ownedClothes = useMemo(() => {
        const allItems = player.assets
            .map(id => CLOTHING_CATALOG.find(c => c.id === id))
            .filter(c => c !== undefined) as ClothingItem[];
        const uniqueItems = new Map<string, ClothingItem>();
        allItems.forEach(item => uniqueItems.set(item.id, item));
        return Array.from(uniqueItems.values());
    }, [player.assets]);

    const ownedVehicles = useMemo(() => {
        const allVehiclesCatalog = [...CAR_CATALOG, ...MOTORCYCLE_CATALOG, ...BOAT_CATALOG, ...AIRCRAFT_CATALOG];
        const allItems = player.assets
            .map(id => player.customItems.find(item => item.id === id) || allVehiclesCatalog.find(v => v.id === id))
            .filter(v => v !== undefined) as Vehicle[];
        const uniqueVehicles = new Map<string, Vehicle>();
        allItems.forEach(item => uniqueVehicles.set(item.id, item));
        return Array.from(uniqueVehicles.values());
    }, [player.assets, player.customItems]);

    const nominations = event.data?.nominations || [];
    const fullBallot = event.data?.fullBallot as Record<string, Nomination[]>;

    // Calculate Style
    const totalStylePoints = (Object.values(equippedItems) as (ClothingItem | null)[])
        .filter((item): item is ClothingItem => item !== null)
        .reduce((sum, item) => sum + (item.auditionBonus * 10), 0);

    const isVestMode = !equippedItems.OUTFIT && (!equippedItems.TOP || !equippedItems.BOTTOM);
    const finalOutfitName = isVestMode 
        ? "Old Vest & Shorts" 
        : equippedItems.OUTFIT 
            ? equippedItems.OUTFIT.name 
            : `${equippedItems.TOP?.name} & ${equippedItems.BOTTOM?.name}`;

    const newspaperHeadline = useMemo(() => {
        const pool = isVestMode ? HEADLINES_BAD : HEADLINES_GOOD;
        return pool[Math.floor(Math.random() * pool.length)];
    }, [isVestMode]);

    // --- SETUP CEREMONY SCHEDULE ---
    useEffect(() => {
        if (currentResults.length > 0 && ceremonyQueue.length === 0) {
            const queue: CeremonyStep[] = [];
            
            // Generate Filler Categories dynamically from the Full Ballot data if available
            if (fullBallot) {
                // Get all categories except the ones the player is in
                const playerCategories = new Set(nominations.map((n: any) => n.category));
                const otherCategories = Object.keys(fullBallot).filter(cat => !playerCategories.has(cat));
                
                // Shuffle and pick 3 fillers
                const selectedFillers = otherCategories.sort(() => 0.5 - Math.random()).slice(0, 3);
                
                selectedFillers.forEach(cat => {
                    const nominees = fullBallot[cat];
                    // Pick a random winner from the list based on score (simulated)
                    // The ballot is already sorted by score in awardLogic, so [0] is the winner
                    const winnerNom = nominees[0];
                    const winnerName = winnerNom.nomineeName || winnerNom.project.name;
                    
                    queue.push({
                        type: 'FILLER_CATEGORY',
                        categoryName: cat,
                        nominees: nominees.map(n => n.nomineeName || n.project.name),
                        winner: winnerName
                    });
                });
            } else {
                // Fallback if no full ballot (Legacy saves)
                queue.push({
                   type: 'FILLER_CATEGORY',
                   categoryName: "Best Cinematography",
                   nominees: ["Generic Movie A", "Generic Movie B", "Generic Movie C"],
                   winner: "Generic Movie A"
                });
            }

            // 2. Add Player Category (The Tension Moment)
            if (currentResults.length > 0) {
                const result = currentResults[0]; // Focusing on primary nomination
                
                // Find rivals from ballot if possible
                let opponentNames: string[] = [];
                if (fullBallot && fullBallot[result.nomination.category]) {
                    opponentNames = fullBallot[result.nomination.category]
                        .filter((n: any) => !n.isPlayer)
                        .map((n: any) => n.nomineeName || n.project.name)
                        .filter((name: string) => !!name && name.trim().length > 0);
                } else {
                    opponentNames = buildFallbackOpponentNames(result.nomination.category, player.name);
                }

                if (opponentNames.length === 0) {
                    opponentNames = buildFallbackOpponentNames(result.nomination.category, player.name);
                }
                
                // Ensure unique set of names including player
                const displayNominees = [...opponentNames.slice(0, 3), player.name].sort(() => 0.5 - Math.random());

                queue.push({
                    type: 'PLAYER_CATEGORY',
                    categoryName: result.nomination.category,
                    nominees: displayNominees,
                    winner: result.won ? player.name : opponentNames[0], // If player lost, top rival wins
                    isPlayerWinner: result.won,
                    data: result
                });
            }

            setCeremonyQueue(queue);
        }
    }, [currentResults]);

    // --- SELECTION HANDLERS ---

    const handleEquip = (item: ClothingItem) => {
        const cat = item.category;
        
        if (cat === 'OUTFIT') {
            setEquippedItems(prev => ({ ...prev, OUTFIT: item, TOP: null, BOTTOM: null }));
        } else if (cat === 'TOP' || cat === 'BOTTOM') {
            setEquippedItems(prev => ({ ...prev, OUTFIT: null, [cat]: item }));
        } else if (cat === 'SHOES') {
            setEquippedItems(prev => ({ ...prev, SHOES: item }));
        } else if (cat === 'ACCESSORY' && item.subCategory) {
            // Equip specific accessory slot based on subCategory
            setEquippedItems(prev => ({ ...prev, [item.subCategory!]: item }));
        }
    };

    const handleUnequip = (slot: string) => {
        setEquippedItems(prev => ({ ...prev, [slot]: null }));
    };

    const getItemsForSlot = (slot: string) => {
        // Handle specialized accessory slots
        if (['EYEWEAR', 'WATCH', 'BAG', 'JEWELRY'].includes(slot)) {
            return ownedClothes.filter(i => i.category === 'ACCESSORY' && i.subCategory === slot);
        }
        // Handle standard slots
        return ownedClothes.filter(i => i.category === slot);
    };

    // --- SEQUENCER ---

    const handleConfirmOutfit = () => {
        if (event.type === 'PREMIERE') {
            // Map RedCarpetInterview to PressInteraction
            const mappedQuestions: PressInteraction[] = RED_CARPET_INTERVIEWS.map(q => ({
                id: q.id,
                question: q.question,
                options: q.options.map(o => ({
                    text: o.text,
                    style: o.style === 'FUNNY' ? 'BOLD' : o.style === 'CONTROVERSIAL' ? 'RISKY' : 'SAFE',
                    consequences: { buzz: o.impact }
                }))
            }));
            // Pick 1 random question
            setPressQuestions([mappedQuestions[Math.floor(Math.random() * mappedQuestions.length)]]);
        } else {
            const questions = generatePressInteractions(1);
            const outcomes = determineWinners(nominations, fullBallot);
            setPressQuestions(questions);
            setCurrentResults(outcomes);
        }
        setPhase('LIMO_ARRIVAL');
    };

    const handleSkipCeremony = () => {
        // Calculate results immediately if skipping from Outfit/Intro
        if (currentResults.length === 0) {
            const outcomes = determineWinners(nominations, fullBallot);
            setCurrentResults(outcomes);
        }
        setPhase('SUMMARY');
    };

    // LIMO -> CARPET -> MONEY SHOT -> INTERVIEW -> INTRO
    useEffect(() => {
        if (phase === 'LIMO_ARRIVAL') {
            const t1 = setTimeout(() => setIsDoorOpen(true), 2500);
            const t2 = setTimeout(() => setPhase('CARPET_WALK'), 4000);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
    }, [phase]);

    useEffect(() => {
        if (phase === 'CARPET_WALK') {
            const interval = setInterval(() => {
                setWalkProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setPhase('MONEY_SHOT');
                        return 100;
                    }
                    return prev + 0.8;
                });
            }, 30);
            return () => clearInterval(interval);
        }
    }, [phase]);

    useEffect(() => {
        if (phase === 'MONEY_SHOT') {
            const t = setTimeout(() => setPhase('RED_CARPET_INTERVIEW'), 7000); 
            return () => clearTimeout(t);
        }
    }, [phase]);

    const handlePressAnswer = (choice: PressInteraction['options'][0]) => {
        const updatedStats: Stats = { ...player.stats };
        const outfitBonus = totalStylePoints / 20; 
        
        updatedStats.reputation = Math.max(0, Math.min(100, updatedStats.reputation + (choice.consequences.reputation || 0) + outfitBonus));
        updatedStats.fame = Math.max(0, Math.min(100, updatedStats.fame + (choice.consequences.fame || 0) + outfitBonus));
        updatedStats.followers = (updatedStats.followers || 0) + (choice.consequences.followers || 0);
        
        if (event.type === 'PREMIERE') {
            setHypeImpact((choice.consequences.buzz || 0) + outfitBonus);
            setPhase('PREMIERE_SCREENING');
        } else {
            setPhase('CEREMONY_INTRO');
        }
    };

    // --- CEREMONY FLOW CONTROL ---
    
    // Intro Timeout
    useEffect(() => {
        if (phase === 'CEREMONY_INTRO') {
            const t = setTimeout(() => setPhase('CEREMONY_FLOW'), 4000);
            return () => clearTimeout(t);
        }
    }, [phase]);

    // Step Processor
    useEffect(() => {
        if (phase !== 'CEREMONY_FLOW' || ceremonyQueue.length === 0) return;

        const currentStep = ceremonyQueue[currentStepIndex];

        if (currentStep.type === 'FILLER_CATEGORY') {
            // Fast Flow: 2.5s display time for industry pacing
            const t = setTimeout(() => {
                handleNextStep();
            }, 2500); 
            return () => clearTimeout(t);
        } 
        else if (currentStep.type === 'PLAYER_CATEGORY') {
            // Complex Flow: Transition -> Reveal Nominees -> Tension -> Result
            if (stepPhase === 'TRANSITION') {
                const t = setTimeout(() => {
                    setStepPhase('REVEAL_NOMINEES');
                    setRevealedNomineesCount(0);
                }, 2500); // 2.5s "Up Next" screen
                return () => clearTimeout(t);
            }
            if (stepPhase === 'REVEAL_NOMINEES') {
                // Reveal one by one
                if (revealedNomineesCount < currentStep.nominees.length) {
                    const t = setTimeout(() => {
                        setRevealedNomineesCount(prev => prev + 1);
                    }, 1200); // 1.2s per name read
                    return () => clearTimeout(t);
                } else {
                    // All revealed, hold for tension
                    const t = setTimeout(() => setStepPhase('TENSION'), 1000);
                    return () => clearTimeout(t);
                }
            }
            if (stepPhase === 'TENSION') {
                // The silence before the winner
                const t = setTimeout(() => setStepPhase('RESULT'), 2500);
                return () => clearTimeout(t);
            }
            // RESULT phase waits for user click to continue
        }
    }, [phase, currentStepIndex, stepPhase, revealedNomineesCount, ceremonyQueue]);

    const handleNextStep = () => {
        if (currentStepIndex < ceremonyQueue.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
            setStepPhase('TRANSITION'); 
            setRevealedNomineesCount(0);
        } else {
            setPhase('SUMMARY');
        }
    };

    const handleFinish = () => {
        let updatedPlayer = { ...player };
        
        if (event.type === 'PREMIERE' && event.data?.projectId) {
            const commitmentIndex = updatedPlayer.commitments.findIndex(c => c.id === event.data.projectId);
            if (commitmentIndex !== -1) {
                const commitment = updatedPlayer.commitments[commitmentIndex];
                if (commitment.projectDetails) {
                    updatedPlayer.commitments[commitmentIndex] = {
                        ...commitment,
                        projectDetails: {
                            ...commitment.projectDetails,
                            hiddenStats: {
                                ...commitment.projectDetails.hiddenStats,
                                redCarpetHype: hypeImpact
                            }
                        }
                    };
                }
            }
            // Add news about the premiere
            const newsItem = {
                id: `news_premiere_${Date.now()}`,
                headline: `${player.name} shines at ${event.title}!`,
                subtext: `The premiere was a massive success, boosting hype for the upcoming release.`,
                category: 'YOU' as any,
                week: player.currentWeek,
                year: player.age,
                impactLevel: 'MEDIUM' as any
            };
            updatedPlayer.news = [newsItem, ...updatedPlayer.news];
            updatedPlayer.stats.fame = Math.min(100, updatedPlayer.stats.fame + 2);
            updatedPlayer.stats.followers += 10000;
        } else if (event.type === 'AWARD_CEREMONY') {
            const pastProjectsUpdate = [...player.pastProjects];
            let newsToAdd: any = null;
            let updatedAwards = [...updatedPlayer.awards];
            const awardYear = event.data?.awardYear || player.age;

            currentResults.forEach(res => {
                const awardEntry: Award = {
                    id: `award_${Date.now()}_${Math.random()}`,
                    name: event.title,
                    category: res.nomination.category,
                    year: awardYear,
                    outcome: res.won ? 'WON' : 'NOMINATED',
                    projectId: res.nomination.project.id,
                    projectName: res.nomination.project.name,
                    type: event.data.awardDef.type
                };
                updatedAwards = upsertAwardRecord(updatedAwards, awardEntry);

                const projIndex = pastProjectsUpdate.findIndex(p => p.id === res.nomination.project.id);
                if (projIndex >= 0) {
                    const proj = pastProjectsUpdate[projIndex];
                    const newAwards = sanitizeAwardRecords(upsertAwardRecord((proj.awards || []) as Award[], awardEntry));
                    pastProjectsUpdate[projIndex] = { ...proj, awards: newAwards as any };
                }

                if (res.won) {
                    updatedPlayer.stats.fame = Math.min(100, updatedPlayer.stats.fame + 5);
                    updatedPlayer.stats.reputation = Math.min(100, updatedPlayer.stats.reputation + 2);
                    updatedPlayer.stats.followers += 50000;
                    newsToAdd = {
                        id: `news_win_${Date.now()}`,
                        headline: `${player.name} wins Best Actor at ${event.title}!`,
                        category: 'TOP_STORY', week: player.currentWeek, year: player.age, impactLevel: 'HIGH'
                    };
                }
            });

            updatedPlayer.awards = sanitizeAwardRecords(updatedAwards);
            updatedPlayer.pastProjects = pastProjectsUpdate;
            const awardType = event.data?.awardDef?.type;
            if (['GOLDEN_GLOBE', 'BAFTA', 'OSCAR', 'EMMY'].includes(awardType)) {
                const historyEntry = generateSeasonWinners(updatedPlayer, awardType, awardYear);
                updatedPlayer.world = {
                    ...updatedPlayer.world,
                    awardHistory: [
                        ...(updatedPlayer.world.awardHistory || []).filter(entry => !(entry.type === awardType && entry.year === awardYear)),
                        historyEntry
                    ]
                };
            }
            if (newsToAdd) updatedPlayer.news = [newsToAdd, ...updatedPlayer.news];
        }

        updatedPlayer.pendingEvent = null;
        onComplete(updatedPlayer);
    };

    // --- RENDERERS ---

    if (phase === 'OUTFIT') {
        return (
            <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col font-sans pt-safe-top">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-black to-black pointer-events-none"></div>
                
                {/* Header */}
                <div className="relative z-10 p-6 text-center flex justify-between items-start">
                    <div className="w-10"></div> {/* Spacer for center alignment */}
                    <div>
                        <div className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.4em] mb-2">The Dressing Room</div>
                        <h2 className="text-3xl font-serif text-white tracking-tight">{event.title}</h2>
                    </div>
                    <button onClick={handleSkipCeremony} className="text-zinc-500 hover:text-white p-2" title="Skip Event">
                        <FastForward size={20} />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 relative z-10 flex flex-col px-6 pb-safe-xl overflow-y-auto custom-scrollbar">
                    
                    {/* 1. Avatar Preview (The "Mirror") */}
                    <div className="flex justify-center mb-8 relative">
                        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-b from-amber-500 to-transparent relative z-10">
                            <img src={player.avatar} className="w-full h-full rounded-full object-cover border-4 border-black bg-zinc-900" />
                        </div>
                        {/* Glow behind avatar */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-600/20 blur-3xl rounded-full pointer-events-none"></div>
                        
                        {/* Stats Pill */}
                        <div className="absolute -bottom-3 bg-zinc-900 border border-zinc-800 px-4 py-1.5 rounded-full shadow-xl flex items-center gap-2 z-20">
                            <Star size={12} className="text-amber-500 fill-amber-500"/>
                            <span className="text-xs font-bold text-white tracking-wide">Style: {totalStylePoints.toFixed(0)}</span>
                        </div>
                    </div>

                    {/* 2. Slot Grid */}
                    <div className="space-y-4 max-w-md mx-auto w-full">
                        {/* Body Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-[1px] flex-1 bg-zinc-900"></div>
                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Base Layer</span>
                                <div className="h-[1px] flex-1 bg-zinc-900"></div>
                            </div>
                            
                            <SlotButton 
                                label="Full Outfit" 
                                subLabel={equippedItems.OUTFIT ? equippedItems.OUTFIT.name : "Suit / Dress / Set"} 
                                icon={<Star size={20}/>}
                                isActive={activeSlot === 'OUTFIT'}
                                hasItem={!!equippedItems.OUTFIT}
                                onClick={() => setActiveSlot('OUTFIT')}
                                className="w-full"
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <SlotButton 
                                    label="Top" 
                                    subLabel={equippedItems.TOP ? equippedItems.TOP.name : "Shirt / Jacket"} 
                                    icon={<Shirt size={20}/>}
                                    isActive={activeSlot === 'TOP'}
                                    hasItem={!!equippedItems.TOP}
                                    disabled={!!equippedItems.OUTFIT}
                                    onClick={() => setActiveSlot('TOP')}
                                />
                                <SlotButton 
                                    label="Bottom" 
                                    subLabel={equippedItems.BOTTOM ? equippedItems.BOTTOM.name : "Pants / Skirt"} 
                                    icon={<Layers size={20}/>}
                                    isActive={activeSlot === 'BOTTOM'}
                                    hasItem={!!equippedItems.BOTTOM}
                                    disabled={!!equippedItems.OUTFIT}
                                    onClick={() => setActiveSlot('BOTTOM')}
                                />
                            </div>
                        </div>

                        {/* Accessories Section (SPLIT INTO 4) */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3">
                                <div className="h-[1px] flex-1 bg-zinc-900"></div>
                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Details</span>
                                <div className="h-[1px] flex-1 bg-zinc-900"></div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <SlotButton 
                                    label="Shoes" 
                                    subLabel={equippedItems.SHOES ? equippedItems.SHOES.name : "Footwear"} 
                                    icon={<Footprints size={20}/>}
                                    isActive={activeSlot === 'SHOES'}
                                    hasItem={!!equippedItems.SHOES}
                                    onClick={() => setActiveSlot('SHOES')}
                                />
                                <SlotButton 
                                    label="Watch" 
                                    subLabel={equippedItems.WATCH ? equippedItems.WATCH.name : "Timepiece"} 
                                    icon={<Watch size={20}/>}
                                    isActive={activeSlot === 'WATCH'}
                                    hasItem={!!equippedItems.WATCH}
                                    onClick={() => setActiveSlot('WATCH')}
                                />
                                <SlotButton 
                                    label="Eyewear" 
                                    subLabel={equippedItems.EYEWEAR ? equippedItems.EYEWEAR.name : "Glasses"} 
                                    icon={<Glasses size={20}/>}
                                    isActive={activeSlot === 'EYEWEAR'}
                                    hasItem={!!equippedItems.EYEWEAR}
                                    onClick={() => setActiveSlot('EYEWEAR')}
                                />
                                <SlotButton 
                                    label="Bag" 
                                    subLabel={equippedItems.BAG ? equippedItems.BAG.name : "Carry"} 
                                    icon={<ShoppingBag size={20}/>}
                                    isActive={activeSlot === 'BAG'}
                                    hasItem={!!equippedItems.BAG}
                                    onClick={() => setActiveSlot('BAG')}
                                />
                                <SlotButton 
                                    label="Jewelry" 
                                    subLabel={equippedItems.JEWELRY ? equippedItems.JEWELRY.name : "Bling"} 
                                    icon={<Gem size={20}/>}
                                    isActive={activeSlot === 'JEWELRY'}
                                    hasItem={!!equippedItems.JEWELRY}
                                    onClick={() => setActiveSlot('JEWELRY')}
                                    className="col-span-2"
                                />
                            </div>
                        </div>

                        {/* Arrival Section (NEW) */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3">
                                <div className="h-[1px] flex-1 bg-zinc-900"></div>
                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Arrival</span>
                                <div className="h-[1px] flex-1 bg-zinc-900"></div>
                            </div>
                            
                            <SlotButton 
                                label="Ride" 
                                subLabel={selectedVehicle ? selectedVehicle.name : "Taxi / Limo Service"} 
                                icon={<Car size={20}/>}
                                isActive={activeSlot === 'VEHICLE'}
                                hasItem={!!selectedVehicle}
                                onClick={() => setActiveSlot('VEHICLE')}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Footer / Action */}
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-safe-lg bg-gradient-to-t from-black via-black to-transparent z-20">
                     <button 
                        onClick={handleConfirmOutfit}
                        className={`w-full py-4 rounded-2xl font-bold text-sm shadow-2xl flex items-center justify-center gap-2 transition-all ${
                            isVestMode 
                            ? 'bg-rose-950/50 text-rose-500 border border-rose-900/50 hover:bg-rose-900/50' 
                            : 'bg-white text-black hover:bg-zinc-200'
                        }`}
                    >
                        {isVestMode ? 'Go in Vest & Shorts (Panic Mode)' : 'Confirm Look'} <ArrowRight size={16}/>
                    </button>
                </div>

                {/* 4. INVENTORY DRAWER (Overlay) */}
                {activeSlot && (
                    <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setActiveSlot(null)}>
                        <div 
                            className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-[2rem] border-t border-zinc-800 shadow-2xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-300"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Drawer Handle */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-12 h-1.5 bg-zinc-800 rounded-full"></div>
                            </div>

                            {/* Drawer Header */}
                            <div className="px-6 py-4 flex justify-between items-center border-b border-zinc-800">
                                <div className="text-lg font-bold text-white capitalize">Select {activeSlot === 'VEHICLE' ? 'Vehicle' : activeSlot.toLowerCase()}</div>
                                <button onClick={() => setActiveSlot(null)} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"><X size={18}/></button>
                            </div>

                            {/* Items List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                {/* Special Logic for Vehicle Drawer */}
                                {activeSlot === 'VEHICLE' ? (
                                    <>
                                        <button 
                                            onClick={() => { setSelectedVehicle(null); setActiveSlot(null); }}
                                            className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all group ${
                                                !selectedVehicle 
                                                ? 'border-amber-500 bg-amber-950/20' 
                                                : 'border-zinc-800 bg-black hover:bg-zinc-800'
                                            }`}
                                        >
                                            <div className="text-left">
                                                <div className={`font-bold text-base ${!selectedVehicle ? 'text-white' : 'text-zinc-300'}`}>Taxi / Limo Service</div>
                                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Default Option</div>
                                            </div>
                                            {!selectedVehicle && <div className="bg-amber-500 text-black p-1 rounded-full"><Check size={14} strokeWidth={3}/></div>}
                                        </button>

                                        {ownedVehicles.length > 0 && ownedVehicles.map(veh => {
                                            const isSelected = selectedVehicle?.id === veh.id;
                                            return (
                                                <button 
                                                    key={veh.id} 
                                                    onClick={() => { setSelectedVehicle(veh); setActiveSlot(null); }}
                                                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all group ${
                                                        isSelected 
                                                        ? 'border-amber-500 bg-amber-950/20' 
                                                        : 'border-zinc-800 bg-black hover:bg-zinc-800'
                                                    }`}
                                                >
                                                    <div className="text-left">
                                                        <div className={`font-bold text-base ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{veh.name}</div>
                                                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{veh.vehicleType} • +{veh.reputationBonus} Rep</div>
                                                    </div>
                                                    {isSelected && <div className="bg-amber-500 text-black p-1 rounded-full"><Check size={14} strokeWidth={3}/></div>}
                                                </button>
                                            )
                                        })}
                                    </>
                                ) : (
                                    // Standard Clothing Drawer Logic
                                    <>
                                        <button 
                                            onClick={() => { handleUnequip(activeSlot); setActiveSlot(null); }}
                                            className="w-full p-4 rounded-xl border border-zinc-700 border-dashed text-zinc-500 text-sm font-bold uppercase hover:bg-zinc-800 flex items-center justify-center gap-2"
                                        >
                                            <X size={14}/> Unequip / None
                                        </button>
                                        
                                        {getItemsForSlot(activeSlot).length === 0 ? (
                                            <div className="py-12 text-center text-zinc-600 text-sm">
                                                You don't own any items for this slot.
                                                <div className="text-[10px] mt-2 text-zinc-700 uppercase tracking-wider">Visit Lifestyle Store</div>
                                            </div>
                                        ) : (
                                            getItemsForSlot(activeSlot).map(item => {
                                                const isSelected = (equippedItems as any)[activeSlot]?.id === item.id;
                                                return (
                                                    <button 
                                                        key={item.id} 
                                                        onClick={() => { handleEquip(item); setActiveSlot(null); }}
                                                        className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all group ${
                                                            isSelected 
                                                            ? 'border-amber-500 bg-amber-950/20' 
                                                            : 'border-zinc-800 bg-black hover:bg-zinc-800'
                                                        }`}
                                                    >
                                                        <div className="text-left">
                                                            <div className={`font-bold text-base ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{item.name}</div>
                                                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{item.style} • +{item.auditionBonus * 10} Style</div>
                                                        </div>
                                                        {isSelected ? (
                                                            <div className="bg-amber-500 text-black p-1 rounded-full"><Check size={14} strokeWidth={3}/></div>
                                                        ) : (
                                                            <div className="opacity-0 group-hover:opacity-100 text-zinc-500 text-xs font-bold uppercase transition-opacity">Equip</div>
                                                        )}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        );
    }

    // --- ENTRANCE SCENE ---
    if (phase === 'LIMO_ARRIVAL' || phase === 'CARPET_WALK' || phase === 'MONEY_SHOT') {
        const isMoneyShot = phase === 'MONEY_SHOT';
        const isWalking = phase === 'CARPET_WALK';
        
        // Use vehicle name for cinematic text
        const vehicleName = selectedVehicle ? selectedVehicle.name : "Luxury Limo Service";

        return (
            <div className="fixed inset-0 z-50 bg-[#020202] flex flex-col items-center justify-center overflow-hidden">
                <style>{STYLE}</style>
                
                {/* 1. LIMO OVERLAY (Title Card) */}
                <div className={`absolute inset-0 z-50 bg-black flex flex-col items-center justify-center transition-opacity duration-[1500ms] pointer-events-none ${phase === 'LIMO_ARRIVAL' && !isDoorOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="text-amber-500/50 text-[10px] uppercase tracking-[0.6em] mb-6 animate-pulse">The Arrival</div>
                    
                    <div className="px-8 text-center max-w-xl">
                        <div className="text-white font-serif text-3xl md:text-5xl leading-tight mb-3">
                            {vehicleName}
                        </div>
                        <div className="text-zinc-500 text-xs md:text-sm font-bold uppercase tracking-[0.3em] border-t border-zinc-800 pt-3 inline-block">
                            Arriving at Red Carpet
                        </div>
                    </div>
                </div>

                {/* 2. THE SCENE (Perspective) */}
                <div 
                    className={`absolute inset-0 transition-all duration-[2000ms] ease-out ${phase === 'LIMO_ARRIVAL' ? 'opacity-0 scale-110 blur-sm' : 'opacity-100 scale-100 blur-0'}`}
                    style={{ perspective: '1000px' }}
                >
                    {/* ... (Keep existing 3D Scene setup same as provided in previous code) ... */}
                    {/* Simplified scene structure for brevity in this response, retaining crucial visual logic */}
                     {/* --- BACKDROP: THE THEATRE --- */}
                    <div className="absolute top-0 left-0 right-0 h-[65%] bg-gradient-to-b from-[#0f0f12] via-[#1a1a2e] to-[#2a0a0a] z-0 overflow-hidden flex flex-col items-center justify-end pb-24">
                        <SearchBeam side="left" delay="0s" />
                        <SearchBeam side="right" delay="2s" />
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                        <div className="relative w-[300px] flex flex-col items-center z-10">
                            <div className="w-full h-12 bg-amber-200 shadow-[0_0_50px_rgba(251,191,36,0.6)] flex items-center justify-center rounded-t-lg border-b-4 border-amber-600">
                                <div className="font-black text-2xl tracking-[0.2em] text-red-900 uppercase">PREMIERE</div>
                            </div>
                            <div className="w-[340px] bg-red-900 p-2 shadow-2xl border-x-8 border-amber-500 relative">
                                <div className="absolute inset-0 border-[2px] border-dashed border-yellow-200 opacity-30 animate-pulse"></div>
                                <div className="bg-white p-3 text-center shadow-inner">
                                    <div className="text-black font-black uppercase text-xl tracking-tighter leading-none">{event.title}</div>
                                </div>
                            </div>
                            <div className="flex justify-between w-[280px] h-40 bg-zinc-900 relative">
                                <div className="w-8 h-full bg-gradient-to-r from-amber-700 to-amber-900"></div>
                                <div className="w-8 h-full bg-gradient-to-r from-amber-900 to-amber-700"></div>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-20 bg-red-900"></div>
                            </div>
                        </div>
                    </div>

                    {/* --- FLOOR: THE CARPET & CROWD --- */}
                    <div 
                        className="absolute bottom-0 left-0 right-0 h-[100%] origin-bottom z-10 flex justify-center"
                        style={{ transform: 'rotateX(55deg) scale(1.8) translateY(15%)' }}
                    >
                        <div className="w-[40%] h-full bg-gradient-to-r from-black to-[#111] relative overflow-hidden flex flex-col items-end pt-20 gap-4 pr-2">
                            {[...Array(15)].map((_, i) => (
                                <div key={i} className="w-8 h-8 bg-zinc-800 rounded-full opacity-50 blur-[1px]"></div>
                            ))}
                        </div>
                        <div className="w-[30%] max-w-[300px] h-full bg-gradient-to-b from-[#500000] via-[#800000] to-[#a00000] relative shadow-[0_0_80px_rgba(220,38,38,0.3)]">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-40 mix-blend-multiply"></div>
                            <div className="absolute left-[-4px] top-0 bottom-0 w-1 bg-yellow-500/80 shadow-[0_0_15px_rgba(234,179,8,0.8)]"></div>
                             <div className="absolute right-[-4px] top-0 bottom-0 w-1 bg-yellow-500/80 shadow-[0_0_15px_rgba(234,179,8,0.8)]"></div>
                        </div>
                        <div className="w-[40%] h-full bg-gradient-to-l from-black to-[#111] relative overflow-hidden flex flex-col items-start pt-20 gap-4 pl-2">
                            {[...Array(15)].map((_, i) => (
                                <div key={i} className="w-8 h-8 bg-zinc-800 rounded-full opacity-50 blur-[1px]"></div>
                            ))}
                        </div>
                    </div>

                    {/* 3. FLASHES & ATMOSPHERE */}
                    <div className="absolute inset-0 z-20 pointer-events-none">
                        {isWalking && flashes.map((f) => (
                            <PaparazziFlash key={f.id} x={f.x} y={f.y} delay={f.delay} />
                        ))}
                        <div className={`absolute inset-0 bg-white transition-opacity duration-700 ${isMoneyShot ? 'opacity-100' : 'opacity-0'}`}></div>
                    </div>

                    {/* 4. THE PLAYER AVATAR */}
                    <div 
                        className={`absolute left-1/2 -translate-x-1/2 bottom-[10%] z-30 flex flex-col items-center transition-all duration-[100ms] linear`}
                        style={{
                            transform: `translateX(-50%) scale(${0.35 + (walkProgress / 100) * 0.9}) translateY(${walkProgress > 0 ? (100 - walkProgress) * -2.5 : 0}px)`,
                            filter: isMoneyShot ? 'contrast(1.2) brightness(1.1)' : 'none'
                        }}
                    >
                        <div className="w-32 h-6 bg-black/60 blur-lg rounded-[100%] absolute bottom-0 translate-y-3 scale-x-150"></div>
                        <img 
                            src={player.avatar} 
                            className="w-48 h-48 rounded-full border-4 border-white/20 shadow-2xl object-cover relative z-10 bg-zinc-900"
                        />
                    </div>

                    {/* 5. MONEY SHOT FRAME */}
                    {isMoneyShot && (
                        <div className="absolute inset-0 z-40 flex items-center justify-center animate-in fade-in duration-1000 delay-500">
                             <div className="relative rotate-1 scale-90 md:scale-100 shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-[#f0f0f0] max-w-md w-full mx-4 animate-in zoom-in-50 duration-700 overflow-hidden font-serif text-black border-r-4 border-b-4 border-zinc-300">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50 pointer-events-none mix-blend-multiply"></div>
                                <div className="p-4 pb-2 border-b-2 border-black flex flex-col items-center relative z-10">
                                    <div className="w-full flex justify-between text-[8px] font-bold uppercase tracking-widest border-b border-black pb-1 mb-1">
                                        <span>Vol. CCIV No. 24</span>
                                        <span>Los Angeles, California</span>
                                        <span>$2.00</span>
                                    </div>
                                    <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-none font-serif text-center mb-1">The Daily Star</h1>
                                </div>
                                <div className="p-4 relative z-10 h-[65vh] flex flex-col items-center justify-center">
                                     <h2 className="text-3xl font-black leading-[0.9] mb-4 uppercase italic text-center">{newspaperHeadline}</h2>
                                     <div className="relative w-full aspect-[4/3] bg-zinc-200 mb-2 border border-black p-1 shadow-sm">
                                        <img src={player.avatar} className="w-full h-full object-cover grayscale contrast-125 brightness-110" />
                                     </div>
                                     <p className="text-[10px] text-center mt-2 font-sans">{player.name} stuns on the red carpet.</p>
                                </div>
                             </div>
                        </div>
                    )}

                </div>
            </div>
        );
    }

    // --- INTERVIEW PHASE ---
    if (phase === 'RED_CARPET_INTERVIEW') {
        const question = pressQuestions[0];
        if (!question) {
            setPhase('CEREMONY_INTRO');
            return <div className="fixed inset-0 bg-black"></div>;
        }

        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-end md:justify-center overflow-hidden font-sans">
                {/* ... (Keep interview rendering same as existing) ... */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black pointer-events-none"></div>
                
                 {/* Camera UI Overlay */}
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                            <span className="text-red-600 font-bold tracking-widest text-xs">REC</span>
                        </div>
                    </div>
                </div>

                <div className="w-full max-w-md relative z-20 p-6 pb-12 md:pb-6 animate-in slide-in-from-bottom duration-500">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center border-4 border-black shadow-lg relative z-10">
                            <Mic2 size={24} className="text-black" />
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-r-2xl rounded-tl-2xl -ml-6 pl-8 border border-white/10">
                            <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Press Question</div>
                        </div>
                    </div>
                    <div className="mb-8">
                        <h3 className="text-3xl md:text-4xl font-black text-white leading-none tracking-tight drop-shadow-xl italic">"{question.question}"</h3>
                    </div>
                    <div className="space-y-3">
                        {question.options.map((opt, i) => (
                            <button key={i} onClick={() => handlePressAnswer(opt)} className="w-full relative group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur-xl p-5 text-left transition-all hover:border-amber-500/50 hover:bg-zinc-800 active:scale-[0.98]">
                                <div className="text-base font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">{opt.text}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- CEREMONY PHASES ---

    if (phase === 'CEREMONY_INTRO') {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
                <style>{STYLE}</style>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] opacity-20"></div>
                
                <div className="z-10 flex flex-col items-center space-y-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-700 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.4)] animate-pulse-slow">
                        <Trophy size={40} className="text-black" />
                    </div>
                    
                    <div className="space-y-2">
                        <h1 className="text-4xl md:text-6xl font-serif text-white tracking-widest uppercase font-black">
                            {event.title}
                        </h1>
                        <div className="flex items-center justify-center gap-3 text-zinc-400 uppercase tracking-[0.3em] text-[10px] md:text-xs">
                            <span>Los Angeles</span>
                            <span className="text-amber-500">•</span>
                            <span>Live Broadcast</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleSkipCeremony} 
                        className="mt-8 flex items-center gap-2 text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-wider border border-zinc-800 hover:border-zinc-600 px-4 py-2 rounded-full transition-colors"
                    >
                        <FastForward size={14} /> Skip Ceremony
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'CEREMONY_FLOW') {
        const currentStep = ceremonyQueue[currentStepIndex];
        
        // --- 1. FAST CATEGORIES (Industry Flavor) ---
        if (currentStep.type === 'FILLER_CATEGORY') {
            return (
                <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black"></div>
                    
                    <div className="relative z-10 w-full max-w-md text-center">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Award Category</div>
                        <h2 className="text-3xl font-serif text-white border-b border-zinc-800 pb-6 mb-8">{currentStep.categoryName}</h2>
                        
                        <div className="space-y-3">
                            {currentStep.nominees.map((nom, idx) => {
                                const isWinner = nom === currentStep.winner;
                                return (
                                    <div key={idx} className={`p-4 rounded-xl flex justify-between items-center transition-all duration-500 ${isWinner ? 'bg-white text-black scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'bg-zinc-900 text-zinc-500'}`}>
                                        <span className="font-bold text-sm uppercase tracking-wider">{nom}</span>
                                        {isWinner && <Trophy size={16} className="text-amber-500 animate-bounce"/>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    
                    {/* Skip Button for Flow */}
                    <div className="absolute bottom-10">
                        <button onClick={handleSkipCeremony} className="text-zinc-600 hover:text-zinc-400 text-xs uppercase font-bold tracking-widest">Skip</button>
                    </div>
                </div>
            );
        }

        // --- 2. PLAYER CATEGORY (High Tension) ---
        if (currentStep.type === 'PLAYER_CATEGORY') {
            
            // A. TRANSITION SCREEN
            if (stepPhase === 'TRANSITION') {
                return (
                    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in duration-700">
                        <div className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.5em] mb-4 animate-pulse">Coming Up Next</div>
                        <h2 className="text-5xl font-serif text-white font-black tracking-tight">{currentStep.categoryName}</h2>
                    </div>
                );
            }

            // B. TENSION & REVEAL
            const showWinner = stepPhase === 'RESULT';

            return (
                <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6">
                    <style>{STYLE}</style>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black"></div>
                    
                    {/* Category Title */}
                    <div className="absolute top-12 left-0 right-0 text-center z-10">
                        <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-2">Category</div>
                        <h2 className="text-3xl font-serif text-white">{currentStep.categoryName}</h2>
                    </div>

                    {/* Nominees List (One by One) */}
                    <div className="relative z-10 w-full max-w-sm space-y-4">
                        <div className="text-center text-zinc-500 text-xs uppercase tracking-widest mb-4">Nominees</div>
                        {currentStep.nominees.map((nom, idx) => {
                            const isVisible = idx < revealedNomineesCount || stepPhase === 'TENSION' || stepPhase === 'RESULT';
                            
                            if (!isVisible) return null;

                            const isPlayer = nom === player.name;
                            const isWinner = nom === currentStep.winner;
                            
                            // Visual State Logic
                            let containerClass = "bg-zinc-900 border-zinc-800 text-zinc-500 opacity-0 animate-slide-up"; // Default
                            
                            if (showWinner) {
                                if (isWinner) {
                                    containerClass = "bg-amber-500/20 border-amber-500 text-white scale-110 shadow-[0_0_50px_rgba(245,158,11,0.3)] z-20 opacity-100";
                                } else {
                                    containerClass = "bg-black border-zinc-900 text-zinc-700 opacity-50 blur-[1px]";
                                }
                            } else {
                                containerClass = isPlayer 
                                    ? "bg-zinc-800 border-zinc-700 text-white shadow-lg opacity-100 animate-slide-up" 
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 opacity-100 animate-slide-up";
                            }

                            return (
                                <div 
                                    key={idx} 
                                    className={`p-5 rounded-2xl border flex items-center justify-between transition-all duration-1000 ${containerClass}`}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-bold text-lg tracking-tight">{nom}</span>
                                        {isPlayer && <span className="text-[10px] text-amber-500 uppercase font-bold tracking-wider">You</span>}
                                    </div>
                                    {showWinner && isWinner && <Trophy size={24} className="text-amber-400 animate-bounce"/>}
                                </div>
                            )
                        })}
                    </div>

                    {/* Tension Text / Trigger */}
                    <div className="absolute bottom-20 left-0 right-0 text-center z-20 h-20 flex flex-col items-center justify-center">
                        {stepPhase === 'TENSION' && (
                            <div className="animate-pulse-slow">
                                <div className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-4">The award goes to...</div>
                            </div>
                        )}
                        
                        {stepPhase === 'RESULT' && (
                            <div className="animate-in slide-in-from-bottom duration-700 fade-in">
                                {currentStep.isPlayerWinner ? (
                                    <div className="text-center space-y-2">
                                        <div className="text-2xl font-black text-amber-400 uppercase tracking-tighter">YOU WON!</div>
                                        <div className="text-xs text-zinc-400">The crowd erupts in applause!</div>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-2">
                                        <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Winner</div>
                                        <div className="text-xl font-bold text-white">{currentStep.winner}</div>
                                        <button 
                                            onClick={handleNextStep}
                                            className="text-zinc-400 underline text-xs mt-4 opacity-50 hover:opacity-100 block mx-auto"
                                        >
                                            Applaud Politely & Continue
                                        </button>
                                    </div>
                                )}
                                {currentStep.isPlayerWinner && (
                                    <button 
                                        onClick={handleNextStep}
                                        className="mt-6 bg-amber-500 text-black px-8 py-3 rounded-full font-bold text-sm hover:bg-amber-400 transition-colors shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                                    >
                                        Accept Award
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
    }

    if (phase === 'PREMIERE_SCREENING') {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
                <style>{STYLE}</style>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] opacity-20"></div>
                
                <div className="z-10 flex flex-col items-center space-y-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-700 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.4)] animate-pulse-slow">
                        <Clapperboard size={40} className="text-black" />
                    </div>
                    
                    <div className="space-y-2">
                        <h1 className="text-4xl md:text-6xl font-serif text-white tracking-widest uppercase font-black">
                            {event.title}
                        </h1>
                        <div className="flex items-center justify-center gap-3 text-zinc-400 uppercase tracking-[0.3em] text-[10px] md:text-xs">
                            <span>Exclusive Screening</span>
                            <span className="text-amber-500">•</span>
                            <span>World Premiere</span>
                        </div>
                    </div>

                    <div className="max-w-md bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-6 rounded-2xl space-y-4">
                        <p className="text-zinc-300 italic">"The lights dim, the projector hums, and for the first time, the world sees your vision. The audience is captivated..."</p>
                        <div className="flex justify-center gap-4">
                            <div className="text-center">
                                <div className="text-[10px] text-zinc-500 uppercase font-bold">Hype Boost</div>
                                <div className="text-amber-500 font-black text-xl">+{hypeImpact.toFixed(0)}</div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => setPhase('SUMMARY')} 
                        className="mt-8 bg-white text-black px-8 py-3 rounded-full font-bold text-sm hover:bg-zinc-200 transition-colors"
                    >
                        End Premiere
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'SUMMARY') {
        const isPremiere = event.type === 'PREMIERE';
        const wins = currentResults.filter(r => r.won).length;
        
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in">
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
                    
                    <div className="space-y-2">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em]">{isPremiere ? 'Premiere Concluded' : 'Ceremony Closed'}</div>
                        <h2 className="text-4xl font-serif text-white">{isPremiere ? 'Premiere Highlights' : "Night's Highlights"}</h2>
                    </div>
                    
                    <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
                        {isPremiere ? (
                            <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
                                <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center text-2xl font-bold text-black">
                                    <Sparkles size={32} />
                                </div>
                                <div className="text-left">
                                    <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Hype Generated</div>
                                    <div className="text-white text-sm">
                                        Your presence at the premiere has significantly boosted the film's buzz.
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${wins > 0 ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                                    {wins}
                                </div>
                                <div className="text-left">
                                    <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Your Awards</div>
                                    <div className="text-white text-sm">
                                        {wins > 0 ? "A historic night for your career." : "Nominated, but no wins tonight."}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Note */}
                        <div className="space-y-3 text-left">
                            <div className="text-[10px] text-zinc-600 uppercase font-bold tracking-wider">Note</div>
                            <div className="text-xs text-zinc-400 italic">
                                {isPremiere ? "The first reviews are coming in, and they look promising." : "Results for other categories are now available in the IMDb app."}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 text-center">
                        <div>
                            <div className="text-xs text-zinc-500 uppercase">Fame</div>
                            <div className="text-emerald-400 font-bold">+{isPremiere ? 'Med' : (wins > 0 ? 'High' : 'Low')}</div>
                        </div>
                        {!isPremiere && (
                            <div>
                                <div className="text-xs text-zinc-500 uppercase">Reputation</div>
                                <div className="text-emerald-400 font-bold">+{wins > 0 ? 'High' : 'Med'}</div>
                            </div>
                        )}
                        <div>
                            <div className="text-xs text-zinc-500 uppercase">Followers</div>
                            <div className="text-emerald-400 font-bold">+{isPremiere ? '10k' : (wins > 0 ? '50k' : '10k')}</div>
                        </div>
                        {isPremiere && (
                            <div>
                                <div className="text-xs text-zinc-500 uppercase">Hype</div>
                                <div className="text-amber-400 font-bold">+{hypeImpact.toFixed(0)}</div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-6 bg-zinc-900 border-t border-zinc-800">
                    <button onClick={handleFinish} className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200">
                        {isPremiere ? 'Leave Premiere' : 'Leave Party & Save'}
                    </button>
                </div>
            </div>
        );
    }

    return null;
};
