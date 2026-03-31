
import React, { useState, useEffect, useRef } from 'react';
import { Player, DatingMatch, DatingPreferences } from '../../types';
import { generateTinderProfile, calculateSwipeSuccess } from '../../services/datingLogic';
import { ArrowLeft, Flame, X, Heart, MessageCircle, Settings, User, Briefcase, Send, ChevronLeft, Calendar } from 'lucide-react';

interface TinderAppProps {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
    // New prop to handle moving a match to a real relationship
    onDateSuccess?: (match: DatingMatch) => void;
}

const CHAT_TEMPLATES = {
    PLAYER_START: [
        "Hey! How's your week going?",
        "Love your profile picture.",
        "So, what brings you here?",
        "Are you an actor too?",
        "We should grab a drink sometime."
    ],
    PLAYER_FLIRT: [
        "You're kinda cute.",
        "Stop distracting me, I'm trying to work 😉",
        "I bet you're trouble.",
        "Just saw your pic and forgot my pickup line.",
        "Are you always this good looking?"
    ],
    PLAYER_ASK_OUT: [
        "We should stop texting and actually meet.",
        "Are you free this weekend? Let's grab dinner.",
        "I know a great spot in WeHo. Join me?",
        "Let's get a drink. My treat.",
        "I'd love to take you out on a proper date."
    ],
    MATCH_RESPONSES: [
        "Hey! Just busy with work mostly.",
        "Thanks! Yours is cute too.",
        "Just looking for something real.",
        "Not an actor, but I love movies.",
        "I'd love that."
    ],
    FLIRT_RESPONSES: [
        "You're making me blush 😊",
        "Bold. I like it.",
        "Smooth...",
        "😉",
        "Careful now."
    ],
    REJECT_RESPONSES: [
        "I think we should get to know each other better first.",
        "Maybe later! Busy week.",
        "Let's stick to chatting for a bit.",
        "Haha slow down tiger."
    ]
};

export const TinderApp: React.FC<TinderAppProps> = ({ player, onBack, onUpdatePlayer, onDateSuccess }) => {
    const [view, setView] = useState<'SETUP' | 'SWIPE' | 'MATCHES' | 'CHAT'>('SETUP');
    const [preferences, setPreferences] = useState<DatingPreferences>(player.dating.preferences);
    const [currentProfile, setCurrentProfile] = useState<DatingMatch | null>(null);
    const [lastSwipe, setLastSwipe] = useState<'LEFT' | 'RIGHT' | null>(null);
    
    // Chat State
    const [activeChatMatch, setActiveChatMatch] = useState<DatingMatch | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (player.dating.isTinderActive) {
            setView('SWIPE');
            loadNewProfile();
        }
    }, []);

    // Scroll chat to bottom when messages update
    useEffect(() => {
        if (view === 'CHAT' && activeChatMatch?.chatHistory) {
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [view, activeChatMatch?.chatHistory]);

    const loadNewProfile = () => {
        setCurrentProfile(generateTinderProfile(preferences));
        setLastSwipe(null);
    };

    const handleSetupComplete = () => {
        onUpdatePlayer({
            ...player,
            dating: { ...player.dating, isTinderActive: true, preferences }
        });
        setView('SWIPE');
        loadNewProfile();
    };

    const handleSwipe = (dir: 'LEFT' | 'RIGHT') => {
        setLastSwipe(dir);
        
        if (dir === 'RIGHT' && currentProfile) {
            const isMatch = calculateSwipeSuccess(player, currentProfile);
            if (isMatch) {
                // Initialize empty chat history
                const matchWithChat: DatingMatch = { ...currentProfile, chatHistory: [] };
                
                onUpdatePlayer({
                    ...player,
                    dating: { ...player.dating, matches: [matchWithChat, ...player.dating.matches] }
                });
            }
        }

        setTimeout(() => {
            loadNewProfile();
        }, 300);
    };

    const handleOpenChat = (match: DatingMatch) => {
        setActiveChatMatch(match);
        setView('CHAT');
    };

    const handleSendMessage = (text: string, type: 'NORMAL' | 'FLIRT' | 'ASK_OUT') => {
        if (!activeChatMatch) return;

        // 1. Determine Player Message Content if not provided
        let playerText = text;
        if (!playerText) {
            if (type === 'FLIRT') playerText = CHAT_TEMPLATES.PLAYER_FLIRT[Math.floor(Math.random() * CHAT_TEMPLATES.PLAYER_FLIRT.length)];
            else if (type === 'ASK_OUT') playerText = CHAT_TEMPLATES.PLAYER_ASK_OUT[Math.floor(Math.random() * CHAT_TEMPLATES.PLAYER_ASK_OUT.length)];
            else playerText = CHAT_TEMPLATES.PLAYER_START[Math.floor(Math.random() * CHAT_TEMPLATES.PLAYER_START.length)];
        }

        // 2. Add Player Message IMMEDIATELY
        const historyWithPlayerMsg = [...(activeChatMatch.chatHistory || []), { sender: 'PLAYER' as const, text: playerText }];
        
        // Update local state first for instant feedback
        setActiveChatMatch({ ...activeChatMatch, chatHistory: historyWithPlayerMsg });

        // 3. Generate Response after delay
        let responseText = "";
        let success = false;

        if (type === 'ASK_OUT') {
            // Success check based on chemistry
            if (activeChatMatch.chemistry > 60) {
                responseText = "I'd love to! When and where? 😍";
                success = true;
            } else {
                responseText = CHAT_TEMPLATES.REJECT_RESPONSES[Math.floor(Math.random() * CHAT_TEMPLATES.REJECT_RESPONSES.length)];
            }
        } else if (type === 'FLIRT') {
            responseText = CHAT_TEMPLATES.FLIRT_RESPONSES[Math.floor(Math.random() * CHAT_TEMPLATES.FLIRT_RESPONSES.length)];
            // Boost chemistry slightly
            activeChatMatch.chemistry = Math.min(100, activeChatMatch.chemistry + 5);
        } else {
            responseText = CHAT_TEMPLATES.MATCH_RESPONSES[Math.floor(Math.random() * CHAT_TEMPLATES.MATCH_RESPONSES.length)];
            activeChatMatch.chemistry = Math.min(100, activeChatMatch.chemistry + 2);
        }

        // Simulate typing delay
        setTimeout(() => {
            const finalHistory = [...historyWithPlayerMsg, { sender: 'MATCH' as const, text: responseText }];
            
            // Update Match in Player State
            const updatedMatches = player.dating.matches.map(m => 
                m.id === activeChatMatch.id ? { ...m, chatHistory: finalHistory, chemistry: activeChatMatch.chemistry } : m
            );

            onUpdatePlayer({
                ...player,
                dating: { ...player.dating, matches: updatedMatches }
            });
            
            // Re-sync local state
            setActiveChatMatch({ ...activeChatMatch, chatHistory: finalHistory });

            // Handle Date Success (Move to Real Relationship)
            if (success && onDateSuccess) {
                setTimeout(() => {
                    onDateSuccess(activeChatMatch);
                    setView('MATCHES'); // Return to list (match will be gone)
                    alert(`It's a date! ${activeChatMatch.name} added to your Connections.`);
                }, 1500);
            }

        }, 1000 + Math.random() * 1000); // 1-2s delay
    };

    const matches = player.dating.matches.filter(m => !m.isPremium);

    // --- RENDER ---

    return (
        <div className="absolute inset-0 bg-white flex flex-col z-40 text-black animate-in slide-in-from-bottom duration-300 font-sans overflow-hidden">
            
            {/* SETUP SCREEN */}
            {view === 'SETUP' && (
                <div className="flex-1 p-8 flex flex-col bg-gradient-to-br from-rose-500 to-orange-600 text-white overflow-y-auto custom-scrollbar">
                    <div className="flex-1 flex flex-col justify-center min-h-[500px]">
                        <div className="flex justify-center mb-6 drop-shadow-md"><Flame size={64} fill="white" /></div>
                        <h2 className="text-3xl font-bold text-center mb-2 drop-shadow-sm">Welcome to Tinder</h2>
                        <p className="text-center text-white/90 mb-10 text-sm font-medium">Let's set up your preferences to find your perfect match.</p>

                        <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md space-y-8 shadow-xl border border-white/20">
                            {/* Gender Preference */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest mb-3 block opacity-90">Interested In</label>
                                <div className="flex bg-black/20 p-1 rounded-xl backdrop-blur-sm">
                                    <button onClick={() => setPreferences({...preferences, gender: 'MALE'})} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${preferences.gender === 'MALE' ? 'bg-white text-rose-500 shadow-md' : 'text-white hover:bg-white/10'}`}>Men</button>
                                    <button onClick={() => setPreferences({...preferences, gender: 'FEMALE'})} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${preferences.gender === 'FEMALE' ? 'bg-white text-rose-500 shadow-md' : 'text-white hover:bg-white/10'}`}>Women</button>
                                    <button onClick={() => setPreferences({...preferences, gender: 'ALL'})} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${preferences.gender === 'ALL' ? 'bg-white text-rose-500 shadow-md' : 'text-white hover:bg-white/10'}`}>Everyone</button>
                                </div>
                            </div>

                            {/* Age Preference */}
                            <div>
                                <div className="flex justify-between items-end mb-4">
                                    <label className="text-xs font-bold uppercase tracking-widest opacity-90">Age Range</label>
                                    <span className="font-mono font-bold text-lg">{preferences.minAge} - {preferences.maxAge}</span>
                                </div>
                                
                                <div className="space-y-6">
                                    <div className="relative pt-2">
                                        <input 
                                            type="range" min="18" max="50" 
                                            value={preferences.minAge} 
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if(val <= preferences.maxAge) setPreferences({...preferences, minAge: val});
                                            }}
                                            className="w-full h-2 bg-black/20 rounded-lg appearance-none cursor-pointer accent-white"
                                        />
                                        <div className="absolute top-[-8px] left-0 text-[10px] font-bold opacity-60 uppercase">Min Age</div>
                                    </div>
                                    <div className="relative pt-2">
                                        <input 
                                            type="range" min="18" max="60" 
                                            value={preferences.maxAge} 
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if(val >= preferences.minAge) setPreferences({...preferences, maxAge: val});
                                            }}
                                            className="w-full h-2 bg-black/20 rounded-lg appearance-none cursor-pointer accent-white"
                                        />
                                        <div className="absolute top-[-8px] right-0 text-[10px] font-bold opacity-60 uppercase">Max Age</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 space-y-4">
                            <button onClick={handleSetupComplete} className="w-full bg-white text-rose-500 py-4 rounded-full font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                                Start Swiping
                            </button>
                            <button onClick={onBack} className="w-full text-white/70 text-sm font-bold hover:text-white transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CHAT VIEW (DEEP INTERACTION) */}
            {view === 'CHAT' && activeChatMatch && (
                <div className="flex-1 flex flex-col bg-white min-h-0">
                    {/* Chat Header */}
                    <div className="p-4 pt-12 flex items-center gap-3 border-b border-gray-100 bg-white shadow-sm z-10 shrink-0">
                        <button onClick={() => setView('MATCHES')} className="text-gray-400 hover:text-gray-600"><ChevronLeft size={28} /></button>
                        <img src={activeChatMatch.image} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1">
                            <div className="font-bold text-gray-900">{activeChatMatch.name}</div>
                            <div className="text-xs text-rose-500 flex items-center gap-1"><Flame size={10} fill="currentColor"/> {activeChatMatch.chemistry}% Chemistry</div>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                        <div className="text-center text-xs text-gray-400 py-4">You matched with {activeChatMatch.name}</div>
                        {activeChatMatch.chatHistory?.map((msg, i) => (
                            <div key={i} className={`flex ${msg.sender === 'PLAYER' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-sm ${msg.sender === 'PLAYER' ? 'bg-rose-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Controls */}
                    <div className="p-3 border-t border-gray-100 bg-white shrink-0 safe-area-pb">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <button onClick={() => handleSendMessage("", 'FLIRT')} className="bg-pink-50 text-pink-600 py-3 rounded-xl text-xs font-bold hover:bg-pink-100 transition-colors">Flirt</button>
                            <button onClick={() => handleSendMessage("", 'NORMAL')} className="bg-gray-100 text-gray-600 py-3 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors">Small Talk</button>
                        </div>
                        <button 
                            onClick={() => handleSendMessage("", 'ASK_OUT')} 
                            className="w-full py-4 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold rounded-xl shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                        >
                            <Calendar size={18}/> Ask on Date
                        </button>
                    </div>
                </div>
            )}

            {/* MAIN APP (SWIPE & MATCHES) */}
            {(view === 'SWIPE' || view === 'MATCHES') && (
                <>
                    <div className="p-4 pt-12 flex justify-between items-center border-b border-gray-100 bg-white z-10 shrink-0">
                        <button onClick={() => setView('MATCHES')} className={`p-2 rounded-full ${view === 'MATCHES' ? 'text-pink-500' : 'text-gray-300'}`}><MessageCircle size={28} fill={view === 'MATCHES' ? "currentColor" : "none"}/></button>
                        <button onClick={() => setView('SWIPE')} className={`p-2 rounded-full ${view === 'SWIPE' ? 'text-pink-500' : 'text-gray-300'}`}><Flame size={28} fill={view === 'SWIPE' ? "currentColor" : "none"}/></button>
                        <button onClick={onBack} className="p-2 rounded-full text-gray-400 hover:bg-gray-100"><ArrowLeft size={24}/></button>
                    </div>

                    {view === 'SWIPE' && currentProfile && (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-50 overflow-hidden relative">
                            {/* Card */}
                            <div className={`w-full max-w-sm aspect-[3/4] bg-black rounded-3xl relative overflow-hidden shadow-2xl transition-transform duration-300 ${lastSwipe === 'LEFT' ? '-translate-x-full rotate-[-20deg] opacity-0' : lastSwipe === 'RIGHT' ? 'translate-x-full rotate-[20deg] opacity-0' : ''}`}>
                                <img src={currentProfile.image} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                                    <h2 className="text-3xl font-bold flex items-end gap-2">
                                        {currentProfile.name.split(' ')[0]} 
                                        <span className="text-xl font-normal opacity-80">{currentProfile.age}</span>
                                    </h2>
                                    <p className="text-white/80 flex items-center gap-1 mt-1"><Briefcase size={14}/> {currentProfile.job}</p>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex gap-6 mt-8">
                                <button onClick={() => handleSwipe('LEFT')} className="w-16 h-16 bg-white rounded-full text-rose-500 shadow-xl flex items-center justify-center border border-rose-100 hover:scale-110 transition-transform">
                                    <X size={32} strokeWidth={3} />
                                </button>
                                <button onClick={() => handleSwipe('RIGHT')} className="w-16 h-16 bg-white rounded-full text-emerald-500 shadow-xl flex items-center justify-center border border-emerald-100 hover:scale-110 transition-transform">
                                    <Heart size={32} fill="currentColor" />
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'MATCHES' && (
                        <div className="flex-1 overflow-y-auto p-4 bg-white">
                            <h3 className="text-pink-500 font-bold text-sm uppercase tracking-wider mb-4">Your Matches ({matches.length})</h3>
                            {matches.length === 0 ? (
                                <div className="text-center text-gray-400 mt-20">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Heart size={32} className="text-gray-300"/></div>
                                    <p>No matches yet.</p>
                                    <button onClick={() => setView('SWIPE')} className="mt-4 text-pink-500 font-bold text-sm">Start Swiping</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {matches.map(match => (
                                        <div key={match.id} onClick={() => handleOpenChat(match)} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer border border-gray-100">
                                            <img src={match.image} className="w-16 h-16 rounded-full object-cover" />
                                            <div>
                                                <div className="font-bold text-lg">{match.name.split(' ')[0]}</div>
                                                <div className="text-xs text-gray-500">{match.job}</div>
                                            </div>
                                            <div className="ml-auto p-2 bg-gray-100 rounded-full text-pink-500"><MessageCircle size={20}/></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
