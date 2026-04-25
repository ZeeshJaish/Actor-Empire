import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Player, DatingMatch, DatingPreferences } from '../../types';
import { generateTinderProfile, calculateSwipeSuccess } from '../../services/datingLogic';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { spendPlayerEnergy } from '../../services/premiumLogic';
import { ArrowLeft, Flame, X, Heart, MessageCircle, Briefcase, Send, ChevronLeft, Calendar, Moon, Link2, Sparkles } from 'lucide-react';

interface TinderAppProps {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
    onDateSuccess?: (match: DatingMatch) => void;
    onTriggerBabyNaming?: (pending: {
        partnerId: string;
        partnerName: string;
        babyGender: 'MALE' | 'FEMALE';
        suggestedFirstName: string;
        birthWeekAbsolute: number;
        eventWeek: number;
        eventYear: number;
        shouldCreateScandalNews: boolean;
    }) => void;
}

type TinderView = 'SETUP' | 'SWIPE' | 'MATCHES' | 'CHAT';
type TinderAction = 'CHAT' | 'FLIRT' | 'DATE' | 'CASUAL' | 'OFFICIAL';
type TinderChatVariant =
    | 'SMALL_TALK'
    | 'DEEP_TALK'
    | 'PLAYFUL'
    | 'COMPLIMENT'
    | 'HEAT_CHECK'
    | 'KEEP_CASUAL'
    | 'LATE_NIGHT';

const CHAT_TEMPLATES = {
    CHAT_SMALL_TALK: [
        "Hey, how's your week actually going?",
        "You seem fun. What's the story?",
        "What are you doing when you're not pretending to answer messages?",
        "What does a calm week look like in your world?",
        "You feel like someone who disappears into fun plans. True?",
    ],
    CHAT_DEEP_TALK: [
        "What's something people always get wrong about you?",
        "What are you actually chasing right now?",
        "What would make this year feel worth it for you?",
        "You seem too polished to be boring. What's under that?",
        "What kind of person gets the real version of you?",
    ],
    CHAT_PLAYFUL: [
        "Scale of 1 to reckless, how bad of an idea are you?",
        "Serious question. Are you charming on purpose or is it accidental?",
        "Tell me one red flag you somehow make look good.",
        "What chaos level are you bringing if we hang out?",
        "You look like trouble, but the entertaining kind.",
    ],
    FLIRT_COMPLIMENT: [
        "You're kind of dangerously cute.",
        "I was going to play it cool, but that is not happening.",
        "You look like a bad decision I would absolutely make.",
        "You have no business being this easy to stare at.",
        "You look like the kind of person people write songs about.",
    ],
    FLIRT_HEAT_CHECK: [
        "If I made the first move in person, would that ruin your composure?",
        "I feel like subtle is wasted on us.",
        "You and I would either click instantly or become a disaster. I'm curious.",
        "Tell me if I'm reading this wrong, but the tension feels very real.",
        "If we met in person, I feel like subtlety would lose fast.",
    ],
    DATE: [
        "Let's stop texting and actually get drinks.",
        "You free this week? Let's do coffee or something dangerous.",
        "Come out with me. We can see if this is real.",
        "I know a fun little spot. You in?",
        "We should meet before the vibe disappears.",
    ],
    CASUAL_KEEP_CASUAL: [
        "No pressure. We can keep this easy and just have fun.",
        "Let's not overcomplicate this. Just chemistry and good timing.",
        "We don't need a label to enjoy this.",
        "I like this better when it stays light.",
        "Let's keep it casual and see where it goes.",
    ],
    CASUAL_LATE_NIGHT: [
        "Come through later. No speeches, just a vibe.",
        "Let's steal a late-night hour and keep this between us.",
        "After midnight feels more our speed.",
        "You free late? I want a version of this with less daylight and more tension.",
    ],
    OFFICIAL: [
        "I don't want this to stay random. Let's be real about it.",
        "I like you enough to stop pretending this is casual.",
        "I want to date you properly.",
        "Let's make this official.",
        "I think we've crossed out of app territory.",
    ],
    MATCH_RESPONSES: [
        "Okay, I like your energy.",
        "Haha, that's actually cute.",
        "You're easier to talk to than I expected.",
        "Alright, keep going.",
        "That was smooth.",
    ],
    FLIRT_RESPONSES: [
        "Bold. I like it.",
        "Okay wow.",
        "You're getting confident now.",
        "You might actually pull this off.",
        "Dangerous message.",
    ],
    DATE_RESPONSES: [
        "Okay, let's do it.",
        "That actually sounds fun.",
        "Fine. Pick the place.",
        "Yeah, I'd be into that.",
        "You know what, yes.",
    ],
    CASUAL_RESPONSES: [
        "Good. Keep it simple.",
        "That works for me.",
        "No label, no stress. I can do that.",
        "Honestly? That sounds ideal.",
        "Okay, easy and fun.",
    ],
    OFFICIAL_RESPONSES: [
        "Yeah. Let's do this properly.",
        "Okay, I'm in.",
        "I was hoping you'd say that.",
        "You know what? Yes.",
    ],
    REJECT_RESPONSES: [
        "Maybe slow down a little.",
        "I like this, but not that fast.",
        "Let's keep talking first.",
        "You're cute, but not yet.",
        "That feels like too much too soon.",
    ],
    GHOSTED_RESPONSES: [
        "Sorry, life got weird.",
        "I disappeared a little. My bad.",
        "You caught me on a comeback week.",
    ],
    HOOKUP_SUCCESS: [
        "Well. That escalated fast.",
        "Okay, that was a very good idea.",
        "Dangerous chemistry. I respect it.",
    ],
    HOOKUP_FAIL: [
        "Too fast.",
        "You killed the mood a little.",
        "That was not the move yet.",
    ],
};

const CHAT_OPTION_COPY: Record<Exclude<TinderChatVariant, 'COMPLIMENT' | 'HEAT_CHECK' | 'KEEP_CASUAL' | 'LATE_NIGHT'>, { label: string; description: string }> = {
    SMALL_TALK: { label: 'Small Talk', description: 'Keep it easy and keep them engaged. Costs 5E.' },
    DEEP_TALK: { label: 'Deep Talk', description: 'Push for emotional honesty and real curiosity. Costs 5E.' },
    PLAYFUL: { label: 'Playful', description: 'Go lighter, witty, and more chaotic. Costs 5E.' },
};

const FLIRT_OPTION_COPY: Record<'COMPLIMENT' | 'HEAT_CHECK', { label: string; description: string }> = {
    COMPLIMENT: { label: 'Compliment', description: 'Smooth praise with chemistry upside. Costs 5E.' },
    HEAT_CHECK: { label: 'Heat Check', description: 'Riskier tension play with bigger spikes. Costs 6E.' },
};

const CASUAL_OPTION_COPY: Record<'KEEP_CASUAL' | 'LATE_NIGHT', { label: string; description: string }> = {
    KEEP_CASUAL: { label: 'Keep Casual', description: 'No labels, just vibes and low pressure. Costs 6E.' },
    LATE_NIGHT: { label: 'Late Night', description: 'Private energy, quicker escalation, messier fallout. Costs 8E.' },
};

const tinderStageLabel = (stage?: DatingMatch['tinderStage']) => {
    switch (stage) {
        case 'TALKING':
            return 'Talking';
        case 'CASUAL':
            return 'Casual';
        case 'FWB':
            return 'FWB';
        case 'GHOSTED':
            return 'Ghosted';
        case 'DATING':
            return 'Dating';
        default:
            return 'Matched';
    }
};

const tinderStageTone = (stage?: DatingMatch['tinderStage']) => {
    switch (stage) {
        case 'FWB':
            return 'text-fuchsia-500';
        case 'CASUAL':
            return 'text-orange-500';
        case 'GHOSTED':
            return 'text-zinc-400';
        case 'DATING':
            return 'text-emerald-500';
        default:
            return 'text-rose-500';
    }
};

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const TINDER_ENERGY_COSTS = {
    SMALL_TALK: 5,
    DEEP_TALK: 5,
    PLAYFUL: 5,
    COMPLIMENT: 5,
    HEAT_CHECK: 6,
    DATE: 8,
    KEEP_CASUAL: 6,
    LATE_NIGHT: 8,
    INTIMACY: 12,
    OFFICIAL: 8,
} as const;

const EnergyBadge: React.FC<{ cost: number; tone?: 'default' | 'warm' | 'hot' | 'success' }> = ({ cost, tone = 'default' }) => {
    const toneClass =
        tone === 'warm'
            ? 'border-orange-200 bg-orange-100 text-orange-700'
            : tone === 'hot'
                ? 'border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700'
                : tone === 'success'
                    ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                    : 'border-gray-200 bg-white text-gray-700';

    return (
        <span className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-bold ${toneClass}`}>
            {cost}E
        </span>
    );
};

export const TinderApp: React.FC<TinderAppProps> = ({ player, onBack, onUpdatePlayer, onDateSuccess, onTriggerBabyNaming }) => {
    const [view, setView] = useState<TinderView>('SETUP');
    const [preferences, setPreferences] = useState<DatingPreferences>(player.dating.preferences);
    const [currentProfile, setCurrentProfile] = useState<DatingMatch | null>(null);
    const [lastSwipe, setLastSwipe] = useState<'LEFT' | 'RIGHT' | null>(null);
    const [activeChatMatchId, setActiveChatMatchId] = useState<string | null>(null);
    const [chatAction, setChatAction] = useState<TinderAction>('CHAT');
    const [liveHistory, setLiveHistory] = useState<DatingMatch['chatHistory']>([]);
    const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'error' | 'neutral' } | null>(null);
    const [resultModal, setResultModal] = useState<{ title: string; body: string; tone: 'success' | 'error' | 'neutral' } | null>(null);
    const [isAwaitingReply, setIsAwaitingReply] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const replyTimeoutRef = useRef<number | null>(null);

    const currentAbsoluteWeek = useMemo(() => getAbsoluteWeek(player.age, player.currentWeek), [player.age, player.currentWeek]);
    const matches = player.dating.matches.filter(m => !m.isPremium);
    const activeChatMatch = matches.find(match => match.id === activeChatMatchId) || null;

    useEffect(() => {
        if (player.dating.isTinderActive) {
            setView(activeChatMatchId ? 'CHAT' : 'SWIPE');
            setCurrentProfile(generateTinderProfile(preferences));
        }
    }, []);

    useEffect(() => {
        if (view === 'CHAT') {
            const timeout = window.setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 60);
            return () => window.clearTimeout(timeout);
        }
    }, [view, liveHistory.length, activeChatMatchId]);

    useEffect(() => {
        const persisted = activeChatMatch?.chatHistory || [];
        setLiveHistory(prev => {
            if (!activeChatMatchId) return [];
            if (persisted.length === 0) return prev;
            return persisted.length >= prev.length ? persisted : prev;
        });
    }, [activeChatMatchId]);

    useEffect(() => {
        return () => {
            if (replyTimeoutRef.current) window.clearTimeout(replyTimeoutRef.current);
        };
    }, []);

    const pushFeedback = (message: string, tone: 'success' | 'error' | 'neutral' = 'neutral') => {
        setFeedback({ message, tone });
        setTimeout(() => setFeedback(null), 2600);
    };

    const buildPregnancyRequest = (match: DatingMatch) => {
        const babyGender = Math.random() > 0.5 ? 'MALE' : 'FEMALE';
        const suggestedFirstName = babyGender === 'MALE' ? 'Leo' : 'Mia';
        const activePartner = player.relationships.find(rel => (rel.relation === 'Partner' || rel.relation === 'Spouse') && rel.name !== match.name);

        return {
            partnerId: match.id,
            partnerName: match.name,
            babyGender,
            suggestedFirstName,
            birthWeekAbsolute: currentAbsoluteWeek,
            eventWeek: player.currentWeek,
            eventYear: player.age,
            shouldCreateScandalNews: !!activePartner,
        };
    };

    const canTriggerPregnancy = (match: DatingMatch) => {
        const playerGender = player.gender;
        const matchGender = match.gender;
        if (!matchGender) return false;
        const oppositePair =
            (playerGender === 'MALE' && matchGender === 'FEMALE') ||
            (playerGender === 'FEMALE' && matchGender === 'MALE');
        return oppositePair;
    };

    const loadNewProfile = () => {
        setCurrentProfile(generateTinderProfile(preferences));
        setLastSwipe(null);
    };

    const updateMatch = (
        matchId: string,
        updater: (match: DatingMatch) => DatingMatch,
        options?: { energyCost?: number; mutatePlayer?: (nextPlayer: Player) => void }
    ) => {
        if ((options?.energyCost || 0) > player.energy.current) {
            pushFeedback('Not enough energy.', 'error');
            return false;
        }

        const nextPlayer: Player = {
            ...player,
            dating: {
                ...player.dating,
                matches: player.dating.matches.map(match => (match.id === matchId ? updater(match) : match)),
            },
        };

        if (options?.energyCost) {
            spendPlayerEnergy(nextPlayer, options.energyCost);
        }
        options?.mutatePlayer?.(nextPlayer);
        onUpdatePlayer(nextPlayer);
        return true;
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
                const matchWithChat: DatingMatch = {
                    ...currentProfile,
                    chatHistory: [{ sender: 'MATCH', text: pick(CHAT_TEMPLATES.MATCH_RESPONSES) }],
                    tinderStage: 'MATCHED',
                    dateCount: 0,
                    intimacyCount: 0,
                    lastInteractionAbsolute: currentAbsoluteWeek,
                };

                onUpdatePlayer({
                    ...player,
                    dating: { ...player.dating, matches: [matchWithChat, ...player.dating.matches] },
                    logs: [
                        { week: player.currentWeek, year: player.age, message: `🔥 Tinder matched you with ${matchWithChat.name}.`, type: 'positive' },
                        ...player.logs,
                    ].slice(0, 80),
                });
                pushFeedback(`${matchWithChat.name.split(' ')[0]} matched with you.`, 'success');
            } else {
                pushFeedback('No match. Onto the next one.', 'neutral');
            }
        }

        window.setTimeout(() => loadNewProfile(), 280);
    };

    const handleOpenChat = (match: DatingMatch) => {
        setActiveChatMatchId(match.id);
        setChatAction('CHAT');
        setView('CHAT');
    };

    const runChatAction = (action: TinderAction, variant?: TinderChatVariant) => {
        if (!activeChatMatch || isAwaitingReply) return;

        const historyBase = liveHistory?.length ? liveHistory : activeChatMatch.chatHistory || [];
        const stage = activeChatMatch.tinderStage || 'MATCHED';

        let playerText = '';
        let responseText = '';
        let chemistryDelta = 0;
        let nextStage = stage;
        let modal: { title: string; body: string; tone: 'success' | 'error' | 'neutral' } | null = null;
        let officialSuccess = false;
        let energyCost = 0;

        if (action === 'CHAT') {
            if (variant === 'DEEP_TALK') {
                playerText = pick(CHAT_TEMPLATES.CHAT_DEEP_TALK);
                responseText = pick([
                    "Okay, that's a better question.",
                    "You actually want a real answer, don't you?",
                    "That's more interesting than most people get.",
                    "Hmm. That's annoyingly good.",
                ]);
                chemistryDelta = 4;
                energyCost = TINDER_ENERGY_COSTS.DEEP_TALK;
            } else if (variant === 'PLAYFUL') {
                playerText = pick(CHAT_TEMPLATES.CHAT_PLAYFUL);
                responseText = pick([
                    "You're ridiculous. Continue.",
                    "Okay, that was actually funny.",
                    "I hate that I liked that.",
                    "You might be a problem and I'm listening.",
                ]);
                chemistryDelta = 3;
                energyCost = TINDER_ENERGY_COSTS.PLAYFUL;
            } else {
                playerText = pick(stage === 'GHOSTED' ? CHAT_TEMPLATES.GHOSTED_RESPONSES : CHAT_TEMPLATES.CHAT_SMALL_TALK);
                responseText = pick(CHAT_TEMPLATES.MATCH_RESPONSES);
                chemistryDelta = 2;
                energyCost = TINDER_ENERGY_COSTS.SMALL_TALK;
            }
            if (stage === 'MATCHED') nextStage = 'TALKING';
        }

        if (action === 'FLIRT') {
            if (variant === 'HEAT_CHECK') {
                playerText = pick(CHAT_TEMPLATES.FLIRT_HEAT_CHECK);
                responseText = pick([
                    "Okay, now we're pushing it.",
                    "You are definitely testing me.",
                    "That was bolder than expected.",
                    "Not subtle. I respect it.",
                ]);
                chemistryDelta = 5;
                energyCost = TINDER_ENERGY_COSTS.HEAT_CHECK;
            } else {
                playerText = pick(CHAT_TEMPLATES.FLIRT_COMPLIMENT);
                responseText = pick(CHAT_TEMPLATES.FLIRT_RESPONSES);
                chemistryDelta = 4;
                energyCost = TINDER_ENERGY_COSTS.COMPLIMENT;
            }
            if (stage === 'GHOSTED' && activeChatMatch.chemistry >= 65) nextStage = 'TALKING';
            if (stage === 'MATCHED') nextStage = 'TALKING';
        }

        if (action === 'DATE') {
            playerText = pick(CHAT_TEMPLATES.DATE);
            const score = activeChatMatch.chemistry + (stage === 'TALKING' ? 10 : stage === 'CASUAL' ? 14 : stage === 'FWB' ? 12 : stage === 'GHOSTED' ? -12 : 0);
            const success = score >= 58 || Math.random() * 100 < score;
            responseText = success ? pick(CHAT_TEMPLATES.DATE_RESPONSES) : pick(CHAT_TEMPLATES.REJECT_RESPONSES);
            chemistryDelta = success ? 8 : -4;
            nextStage = success ? 'CASUAL' : (stage === 'FWB' ? 'FWB' : 'TALKING');
            energyCost = TINDER_ENERGY_COSTS.DATE;
            modal = {
                title: success ? 'Date Locked' : 'Date Rejected',
                body: success
                    ? `${activeChatMatch.name.split(' ')[0]} said yes. This is now moving out of pure chat territory.`
                    : `${activeChatMatch.name.split(' ')[0]} was not ready to meet up yet.`,
                tone: success ? 'success' : 'neutral',
            };
        }

        if (action === 'CASUAL') {
            const isLateNight = variant === 'LATE_NIGHT';
            playerText = pick(isLateNight ? CHAT_TEMPLATES.CASUAL_LATE_NIGHT : CHAT_TEMPLATES.CASUAL_KEEP_CASUAL);
            const score = activeChatMatch.chemistry + ((activeChatMatch.dateCount || 0) * 10) + (stage === 'CASUAL' ? 12 : stage === 'FWB' ? 14 : 0) + (isLateNight ? 6 : 0);
            const success = score >= 62 || Math.random() * 100 < score;
            responseText = success ? pick(CHAT_TEMPLATES.CASUAL_RESPONSES) : pick(CHAT_TEMPLATES.REJECT_RESPONSES);
            chemistryDelta = success ? (isLateNight ? 7 : 5) : -3;
            nextStage = success ? (isLateNight && stage === 'CASUAL' ? 'FWB' : 'CASUAL') : (stage === 'FWB' ? 'FWB' : 'TALKING');
            energyCost = isLateNight ? TINDER_ENERGY_COSTS.LATE_NIGHT : TINDER_ENERGY_COSTS.KEEP_CASUAL;
            modal = {
                title: success ? (isLateNight ? 'After Dark' : 'Casual Thing') : 'Too Soon',
                body: success
                    ? isLateNight
                        ? `${activeChatMatch.name.split(' ')[0]} is into the private, after-hours version of this.`
                        : `${activeChatMatch.name.split(' ')[0]} is into keeping this easy, fun, and unlabeled.`
                    : `${activeChatMatch.name.split(' ')[0]} did not like trying to define this as casual yet.`,
                tone: success ? 'success' : 'neutral',
            };
        }

        if (action === 'OFFICIAL') {
            playerText = pick(CHAT_TEMPLATES.OFFICIAL);
            const score = activeChatMatch.chemistry + ((activeChatMatch.dateCount || 0) * 12) + ((activeChatMatch.intimacyCount || 0) * 4) + (stage === 'CASUAL' ? 8 : stage === 'FWB' ? -4 : 0);
            officialSuccess = score >= 78 || Math.random() * 100 < score;
            responseText = officialSuccess ? pick(CHAT_TEMPLATES.OFFICIAL_RESPONSES) : pick(CHAT_TEMPLATES.REJECT_RESPONSES);
            chemistryDelta = officialSuccess ? 10 : -5;
            nextStage = officialSuccess ? 'DATING' : (stage === 'FWB' ? 'FWB' : 'CASUAL');
            energyCost = TINDER_ENERGY_COSTS.OFFICIAL;
            modal = {
                title: officialSuccess ? 'Official Now' : 'Not Ready',
                body: officialSuccess
                    ? `${activeChatMatch.name.split(' ')[0]} said yes. This is now a real relationship.`
                    : `${activeChatMatch.name.split(' ')[0]} likes the connection, but not the label yet.`,
                tone: officialSuccess ? 'success' : 'neutral',
            };
        }

        const immediateHistory = [...historyBase, { sender: 'PLAYER' as const, text: playerText, tag: action }];
        const finalHistory = [...immediateHistory, { sender: 'MATCH' as const, text: responseText }];
        setLiveHistory(immediateHistory);
        setIsAwaitingReply(true);

        if (replyTimeoutRef.current) window.clearTimeout(replyTimeoutRef.current);
        replyTimeoutRef.current = window.setTimeout(() => {
            setLiveHistory(finalHistory);
            setIsAwaitingReply(false);
            replyTimeoutRef.current = null;
        }, 650);

        const updated = updateMatch(activeChatMatch.id, match => ({
            ...match,
            chemistry: Math.max(5, Math.min(100, match.chemistry + chemistryDelta)),
            chatHistory: finalHistory,
            tinderStage: nextStage,
            dateCount: (match.dateCount || 0) + (action === 'DATE' && chemistryDelta > 0 ? 1 : 0),
            lastInteractionAbsolute: currentAbsoluteWeek,
        }), { energyCost });

        if (!updated) {
            if (replyTimeoutRef.current) window.clearTimeout(replyTimeoutRef.current);
            setLiveHistory(historyBase);
            setIsAwaitingReply(false);
            return;
        }

        if (modal) setResultModal(modal);

        if (officialSuccess && onDateSuccess) {
            window.setTimeout(() => {
                onDateSuccess({ ...activeChatMatch, tinderStage: 'DATING', chemistry: Math.min(100, activeChatMatch.chemistry + chemistryDelta) });
                setActiveChatMatchId(null);
                setView('MATCHES');
            }, 900);
        }
    };

    const handleHookUp = () => {
        if (!activeChatMatch || isAwaitingReply) return;

        const historyBase = liveHistory?.length ? liveHistory : activeChatMatch.chatHistory || [];
        const stage = activeChatMatch.tinderStage || 'MATCHED';
        const successScore = activeChatMatch.chemistry + ((activeChatMatch.dateCount || 0) * 12) + (stage === 'CASUAL' ? 10 : stage === 'FWB' ? 15 : stage === 'GHOSTED' ? -18 : 0);
        const success = successScore >= 66 || Math.random() * 100 < successScore;
        const playerText = "Come over. Let's stop pretending this is innocent.";
        const responseText = success ? pick(CHAT_TEMPLATES.HOOKUP_SUCCESS) : pick(CHAT_TEMPLATES.HOOKUP_FAIL);
        const immediateHistory = [...historyBase, { sender: 'PLAYER' as const, text: playerText, tag: 'Hook Up' }];
        const finalHistory = [...immediateHistory, { sender: 'MATCH' as const, text: responseText }];

        setLiveHistory(immediateHistory);
        setIsAwaitingReply(true);
        if (replyTimeoutRef.current) window.clearTimeout(replyTimeoutRef.current);
        replyTimeoutRef.current = window.setTimeout(() => {
            setLiveHistory(finalHistory);
            setIsAwaitingReply(false);
            replyTimeoutRef.current = null;
        }, 650);

        const updated = updateMatch(activeChatMatch.id, match => ({
            ...match,
            chemistry: Math.max(5, Math.min(100, match.chemistry + (success ? 7 : -6))),
            chatHistory: finalHistory,
            tinderStage: success ? 'FWB' : (stage === 'FWB' ? 'FWB' : 'TALKING'),
            intimacyCount: (match.intimacyCount || 0) + (success ? 1 : 0),
            lastInteractionAbsolute: currentAbsoluteWeek,
        }), { energyCost: TINDER_ENERGY_COSTS.INTIMACY });

        if (!updated) {
            if (replyTimeoutRef.current) window.clearTimeout(replyTimeoutRef.current);
            setLiveHistory(historyBase);
            setIsAwaitingReply(false);
            return;
        }

        const pregnancyTriggered = success && onTriggerBabyNaming && canTriggerPregnancy(activeChatMatch) && Math.random() < 0.12;
        setResultModal({
            title: success ? (pregnancyTriggered ? 'It Got Serious Fast' : 'Hookup Locked') : 'Killed The Mood',
            body: success
                ? pregnancyTriggered
                    ? `${activeChatMatch.name.split(' ')[0]} went for it, and the fallout may be bigger than just chemistry now.`
                    : `${activeChatMatch.name.split(' ')[0]} went for it. This is now much messier and much more physical.`
                : `${activeChatMatch.name.split(' ')[0]} pulled back hard. The vibe is shakier now.`,
            tone: success ? 'success' : 'neutral',
        });

        if (pregnancyTriggered) {
            window.setTimeout(() => {
                onTriggerBabyNaming?.(buildPregnancyRequest(activeChatMatch));
            }, 900);
        }
    };

    const chatHistory = liveHistory?.length ? liveHistory : activeChatMatch?.chatHistory || [];

    return (
        <div className="absolute inset-0 bg-white flex flex-col z-40 text-black animate-in slide-in-from-bottom duration-300 font-sans overflow-hidden">
            {feedback && (
                <div className="absolute left-4 right-4 top-[5.5rem] z-50">
                    <div className={`rounded-2xl border px-4 py-3 text-xs font-bold ${
                        feedback.tone === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : feedback.tone === 'error'
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : 'border-gray-200 bg-white text-gray-700'
                    }`}>
                        {feedback.message}
                    </div>
                </div>
            )}

            {resultModal && (
                <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/35 px-4 pb-8 pt-24 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl">
                        <div className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                            resultModal.tone === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-100 text-pink-700'
                        }`}>
                            Tinder Update
                        </div>
                        <h3 className="mt-4 text-2xl font-bold text-gray-900">{resultModal.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">{resultModal.body}</p>
                        <button
                            onClick={() => setResultModal(null)}
                            className="mt-5 w-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-3 text-sm font-bold text-white"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {view === 'SETUP' && (
                <div className="flex-1 p-8 flex flex-col bg-gradient-to-br from-rose-500 to-orange-600 text-white overflow-y-auto custom-scrollbar">
                    <div className="flex-1 flex flex-col justify-center min-h-[500px]">
                        <div className="flex justify-center mb-6 drop-shadow-md"><Flame size={64} fill="white" /></div>
                        <h2 className="text-3xl font-bold text-center mb-2 drop-shadow-sm">Welcome to Tinder</h2>
                        <p className="text-center text-white/90 mb-10 text-sm font-medium">Fast matches, messy chemistry, and no prestige filter.</p>

                        <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md space-y-8 shadow-xl border border-white/20">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest mb-3 block opacity-90">Interested In</label>
                                <div className="flex bg-black/20 p-1 rounded-xl backdrop-blur-sm">
                                    <button onClick={() => setPreferences({ ...preferences, gender: 'MALE' })} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${preferences.gender === 'MALE' ? 'bg-white text-rose-500 shadow-md' : 'text-white hover:bg-white/10'}`}>Men</button>
                                    <button onClick={() => setPreferences({ ...preferences, gender: 'FEMALE' })} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${preferences.gender === 'FEMALE' ? 'bg-white text-rose-500 shadow-md' : 'text-white hover:bg-white/10'}`}>Women</button>
                                    <button onClick={() => setPreferences({ ...preferences, gender: 'ALL' })} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${preferences.gender === 'ALL' ? 'bg-white text-rose-500 shadow-md' : 'text-white hover:bg-white/10'}`}>Everyone</button>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-4">
                                    <label className="text-xs font-bold uppercase tracking-widest opacity-90">Age Range</label>
                                    <span className="font-mono font-bold text-lg">{preferences.minAge} - {preferences.maxAge}</span>
                                </div>

                                <div className="space-y-6">
                                    <div className="relative pt-2">
                                        <input
                                            type="range"
                                            min="18"
                                            max="50"
                                            value={preferences.minAge}
                                            onChange={e => {
                                                const val = parseInt(e.target.value, 10);
                                                if (val <= preferences.maxAge) setPreferences({ ...preferences, minAge: val });
                                            }}
                                            className="w-full h-2 bg-black/20 rounded-lg appearance-none cursor-pointer accent-white"
                                        />
                                        <div className="absolute top-[-8px] left-0 text-[10px] font-bold opacity-60 uppercase">Min Age</div>
                                    </div>
                                    <div className="relative pt-2">
                                        <input
                                            type="range"
                                            min="18"
                                            max="60"
                                            value={preferences.maxAge}
                                            onChange={e => {
                                                const val = parseInt(e.target.value, 10);
                                                if (val >= preferences.minAge) setPreferences({ ...preferences, maxAge: val });
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

            {view === 'CHAT' && activeChatMatch && (
                <div className="flex-1 flex flex-col bg-white min-h-0">
                    <div className="p-4 pt-12 flex items-center gap-3 border-b border-gray-100 bg-white shadow-sm z-10 shrink-0">
                        <button onClick={() => setView('MATCHES')} className="text-gray-400 hover:text-gray-600"><ChevronLeft size={28} /></button>
                        <img src={activeChatMatch.image} className="w-11 h-11 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900 truncate">{activeChatMatch.name}</div>
                            <div className={`text-xs flex items-center gap-1 ${tinderStageTone(activeChatMatch.tinderStage)}`}>
                                <Flame size={10} fill="currentColor" /> {activeChatMatch.chemistry}% • {tinderStageLabel(activeChatMatch.tinderStage)}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                        <div className="text-center text-xs text-gray-400 py-2">This one can still go anywhere.</div>
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`flex ${msg.sender === 'PLAYER' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm shadow-sm ${msg.sender === 'PLAYER' ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                                    {msg.tag && (
                                        <div className={`mb-1 text-[10px] uppercase tracking-[0.16em] font-bold ${msg.sender === 'PLAYER' ? 'text-white/70' : 'text-gray-400'}`}>
                                            {msg.tag}
                                        </div>
                                    )}
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isAwaitingReply && (
                            <div className="flex justify-start">
                                <div className="rounded-2xl rounded-bl-none border border-gray-100 bg-white px-4 py-3 shadow-sm">
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-gray-300 animate-pulse" />
                                        <span className="h-2 w-2 rounded-full bg-gray-300 animate-pulse [animation-delay:120ms]" />
                                        <span className="h-2 w-2 rounded-full bg-gray-300 animate-pulse [animation-delay:240ms]" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="p-3 border-t border-gray-100 bg-white shrink-0 safe-area-pb space-y-3">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            <button onClick={() => setChatAction('CHAT')} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${chatAction === 'CHAT' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>Chat</button>
                            <button onClick={() => setChatAction('FLIRT')} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${chatAction === 'FLIRT' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-500'}`}>Flirt</button>
                            <button onClick={() => setChatAction('DATE')} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${chatAction === 'DATE' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>Date</button>
                            <button onClick={() => setChatAction('CASUAL')} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${chatAction === 'CASUAL' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'}`}>Casual</button>
                            <button onClick={() => setChatAction('OFFICIAL')} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${chatAction === 'OFFICIAL' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>Official</button>
                        </div>

                        {chatAction === 'CHAT' && (
                            <div className="grid grid-cols-1 gap-2">
                                {(['SMALL_TALK', 'DEEP_TALK', 'PLAYFUL'] as const).map((option) => (
                                    <button key={option} onClick={() => runChatAction('CHAT', option)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-left">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">{CHAT_OPTION_COPY[option].label}</div>
                                                <div className="mt-1 text-xs text-gray-500">{CHAT_OPTION_COPY[option].description}</div>
                                            </div>
                                            <EnergyBadge cost={TINDER_ENERGY_COSTS[option]} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {chatAction === 'FLIRT' && (
                            <div className="grid grid-cols-1 gap-2">
                                {(['COMPLIMENT', 'HEAT_CHECK'] as const).map((option) => (
                                    <button key={option} onClick={() => runChatAction('FLIRT', option)} className="rounded-2xl border border-pink-200 bg-pink-50 px-4 py-4 text-left">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">{FLIRT_OPTION_COPY[option].label}</div>
                                                <div className="mt-1 text-xs text-gray-500">{FLIRT_OPTION_COPY[option].description}</div>
                                            </div>
                                            <EnergyBadge cost={TINDER_ENERGY_COSTS[option]} tone="warm" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {chatAction === 'DATE' && (
                            <button onClick={() => runChatAction('DATE')} className="w-full rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4 text-left">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-bold text-gray-900">Ask On Date</div>
                                        <div className="mt-1 text-xs text-gray-500">Best way to move this out of pure app mode. Costs 8E.</div>
                                    </div>
                                    <EnergyBadge cost={TINDER_ENERGY_COSTS.DATE} tone="warm" />
                                </div>
                            </button>
                        )}

                        {chatAction === 'CASUAL' && (
                            <div className="grid grid-cols-1 gap-2">
                                <div className="grid grid-cols-2 gap-2">
                                    {(['KEEP_CASUAL', 'LATE_NIGHT'] as const).map((option) => (
                                        <button key={option} onClick={() => runChatAction('CASUAL', option)} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-left">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">{CASUAL_OPTION_COPY[option].label}</div>
                                                    <div className="mt-1 text-xs text-gray-500">{CASUAL_OPTION_COPY[option].description}</div>
                                                </div>
                                                <EnergyBadge cost={TINDER_ENERGY_COSTS[option]} tone="warm" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <button onClick={handleHookUp} className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-4 text-left">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                        <div className="text-sm font-bold text-gray-900">Intimacy</div>
                                            <div className="mt-1 text-xs text-gray-500">Physical escalation. Can create drama, attachment, or pregnancy fallout. Costs 12E.</div>
                                        </div>
                                        <EnergyBadge cost={TINDER_ENERGY_COSTS.INTIMACY} tone="hot" />
                                    </div>
                                </button>
                            </div>
                        )}

                        {chatAction === 'OFFICIAL' && (
                            <button onClick={() => runChatAction('OFFICIAL')} className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-left">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-bold text-gray-900">Make It Official</div>
                                        <div className="mt-1 text-xs text-gray-500">Turns this into a real relationship if they say yes. Costs 8E.</div>
                                    </div>
                                    <EnergyBadge cost={TINDER_ENERGY_COSTS.OFFICIAL} tone="success" />
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {(view === 'SWIPE' || view === 'MATCHES') && (
                <>
                    <div className="p-4 pt-12 flex justify-between items-center border-b border-gray-100 bg-white z-10 shrink-0">
                        <button onClick={() => setView('MATCHES')} className={`p-2 rounded-full ${view === 'MATCHES' ? 'text-pink-500' : 'text-gray-300'}`}><MessageCircle size={28} fill={view === 'MATCHES' ? 'currentColor' : 'none'} /></button>
                        <button onClick={() => setView('SWIPE')} className={`p-2 rounded-full ${view === 'SWIPE' ? 'text-pink-500' : 'text-gray-300'}`}><Flame size={28} fill={view === 'SWIPE' ? 'currentColor' : 'none'} /></button>
                        <button onClick={onBack} className="p-2 rounded-full text-gray-400 hover:bg-gray-100"><ArrowLeft size={24} /></button>
                    </div>

                    {view === 'SWIPE' && currentProfile && (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-50 overflow-hidden relative">
                            <div className={`w-full max-w-sm aspect-[3/4] bg-black rounded-3xl relative overflow-hidden shadow-2xl transition-transform duration-300 ${lastSwipe === 'LEFT' ? '-translate-x-full rotate-[-20deg] opacity-0' : lastSwipe === 'RIGHT' ? 'translate-x-full rotate-[20deg] opacity-0' : ''}`}>
                                <img src={currentProfile.image} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                                    <h2 className="text-3xl font-bold flex items-end gap-2">
                                        {currentProfile.name.split(' ')[0]}
                                        <span className="text-xl font-normal opacity-80">{currentProfile.age}</span>
                                    </h2>
                                    <p className="text-white/80 flex items-center gap-1 mt-1"><Briefcase size={14} /> {currentProfile.job}</p>
                                </div>
                            </div>

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
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Heart size={32} className="text-gray-300" /></div>
                                    <p>No matches yet.</p>
                                    <button onClick={() => setView('SWIPE')} className="mt-4 text-pink-500 font-bold text-sm">Start Swiping</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {matches.map(match => (
                                        <div key={match.id} onClick={() => handleOpenChat(match)} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer border border-gray-100">
                                            <img src={match.image} className="w-16 h-16 rounded-full object-cover" />
                                            <div className="min-w-0">
                                                <div className="font-bold text-lg truncate">{match.name.split(' ')[0]}</div>
                                                <div className="text-xs text-gray-500">{match.job}</div>
                                                <div className={`mt-1 text-[11px] font-bold ${tinderStageTone(match.tinderStage)}`}>
                                                    {tinderStageLabel(match.tinderStage)} • {match.chemistry}%
                                                </div>
                                            </div>
                                            <div className="ml-auto p-2 bg-gray-100 rounded-full text-pink-500"><MessageCircle size={20} /></div>
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
