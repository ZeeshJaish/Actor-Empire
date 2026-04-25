import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DatingMatch, NewsItem, Player, Relationship, XPost } from '../../types';
import {
    calculateSwipeSuccess,
    getLuxeCandidates,
    getLuxeInviteOutcome,
    LUXE_INVITE_COSTS,
    LUXE_REFRESH_COST,
    LUXE_REFRESH_CYCLE_WEEKS,
} from '../../services/datingLogic';
import { getEstimatedNetWorth } from '../../services/loanLogic';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import {
    ArrowLeft,
    Camera,
    Crown,
    EyeOff,
    Gem,
    Info,
    Lock,
    Martini,
    MessageCircle,
    Send,
    ShipWheel,
    Sparkles,
    Wallet,
} from 'lucide-react';

interface LuxeAppProps {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
}

type LuxeView = 'GATE' | 'BROWSE' | 'CHAT';
type InviteKind = keyof typeof LUXE_INVITE_COSTS;
type InviteMode = 'PRIVATE' | 'PUBLIC';
type ChatActionMode = 'CHAT' | 'FLIRT' | 'ASK' | 'INTIMACY';
const LUXE_CHAT_ACTION_ENERGY_COST = 5;
const LUXE_INTIMACY_ENERGY_COST = 8;

const CHAT_OPTIONS = [
    {
        id: 'SMALL_TALK',
        label: 'Small Talk',
        lines: [
            'You have expensive taste. I respect that.',
            'What does a calm week look like in your world?',
            'You seem too polished to be boring.',
            'Tell me something real that never makes it into interviews.',
            'What kind of places make you actually want to stay longer than five minutes?',
            'I feel like your profile is leaving out the interesting part on purpose.',
        ],
        chemistryGain: 2,
    },
    {
        id: 'DEEP_TALK',
        label: 'Deep Talk',
        lines: [
            'What part of your life still feels real when everything else is a performance?',
            'When people talk about you, what do they always get wrong?',
            'What are you still chasing even after all this success?',
            'What kind of person actually gets past your public armor?',
            'What do you protect most fiercely these days?',
            'Has fame made you softer, colder, or just harder to surprise?',
        ],
        chemistryGain: 3,
    },
    {
        id: 'CAREER_TALK',
        label: 'Career Talk',
        lines: [
            'Tell me what you are building right now that people still underestimate.',
            'What move are you making next that nobody sees coming?',
            'You strike me as someone who plays a very long game.',
            'What kind of legacy are you actually interested in leaving behind?',
            'Which room still excites you when you walk into it?',
            'What project are you waiting for the world to catch up to?',
        ],
        chemistryGain: 2,
    },
];

const FLIRT_OPTIONS = [
    {
        id: 'TEASE',
        label: 'Tease',
        lines: [
            'You look like a very bad idea in the best possible way.',
            'You have the kind of face that starts expensive problems.',
            'You seem suspiciously aware of your own effect on people.',
            'You definitely enjoy being trouble.',
            'You are either a masterpiece or a warning sign.',
            'This level of charm usually comes with fine print.',
        ],
        chemistryGain: 3,
    },
    {
        id: 'COMPLIMENT',
        label: 'Compliment',
        lines: [
            'You wear status well. Most people cannot pull that off.',
            'You have a very unfair amount of presence.',
            'You make confidence look effortless.',
            'There is something dangerously elegant about your whole energy.',
            'You have the kind of face people remember in the wrong moments.',
            'You somehow manage to look both unreachable and inviting.',
        ],
        chemistryGain: 4,
    },
    {
        id: 'TURN_UP_HEAT',
        label: 'Turn Up Heat',
        lines: [
            'You and I would either become iconic or scandalous.',
            'I can already tell the gossip blogs would hate us.',
            'The chemistry here feels more expensive than it should.',
            'If we meet in person, subtlety probably dies first.',
            'This is starting to feel like the kind of mistake I would enjoy.',
            'You seem like the sort of person who ruins self-control on contact.',
        ],
        chemistryGain: 5,
    },
];

const WARM_RESPONSES = [
    'That was smoother than I expected.',
    'You might actually be interesting.',
    'I like this energy.',
    'Keep going. I am listening.',
];

const COOL_RESPONSES = [
    'Bold.',
    'Maybe.',
    'Convince me.',
    'You are trying. I appreciate the effort.',
];

const INVITE_OPTIONS: Array<{
    kind: InviteKind;
    label: string;
    icon: React.ReactNode;
    description: string;
    bestFor: string;
}> = [
    {
        kind: 'PRIVATE_DINNER',
        label: 'Private Dinner',
        icon: <Martini size={15} />,
        description: 'A discreet chemistry test with no cameras.',
        bestFor: 'Private romance',
    },
    {
        kind: 'ART_GALA',
        label: 'Art Gala',
        icon: <Sparkles size={15} />,
        description: 'Prestige-heavy and tasteful with soft buzz.',
        bestFor: 'Prestige matches',
    },
    {
        kind: 'YACHT_ESCAPE',
        label: 'Yacht Escape',
        icon: <ShipWheel size={15} />,
        description: 'Ultra-luxury intimacy and status flex.',
        bestFor: 'Power players',
    },
    {
        kind: 'RED_CARPET',
        label: 'Red Carpet',
        icon: <Camera size={15} />,
        description: 'Maximum optics, maximum gossip potential.',
        bestFor: 'Public-facing matches',
    },
    {
        kind: 'FASHION_WEEK',
        label: 'Fashion Week',
        icon: <Crown size={15} />,
        description: 'Style spectacle with premium attention.',
        bestFor: 'Media magnets',
    },
];

export const LuxeApp: React.FC<LuxeAppProps> = ({ player, onBack, onUpdatePlayer }) => {
    const [view, setView] = useState<LuxeView>('GATE');
    const [candidates, setCandidates] = useState<DatingMatch[]>([]);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
    const [activeChatMatchId, setActiveChatMatchId] = useState<string | null>(null);
    const [inviteMode, setInviteMode] = useState<InviteMode>('PRIVATE');
    const [chatActionMode, setChatActionMode] = useState<ChatActionMode>('CHAT');
    const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'error' | 'neutral' } | null>(null);
    const [resultModal, setResultModal] = useState<{ title: string; body: string; tone: 'success' | 'error' | 'neutral'; meta?: string } | null>(null);
    const [liveChatHistory, setLiveChatHistory] = useState<DatingMatch['chatHistory']>([]);
    const [showProfileDetails, setShowProfileDetails] = useState(false);
    const [isAwaitingReply, setIsAwaitingReply] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const pendingReplyTimeoutRef = useRef<number | null>(null);

    const estimatedNetWorth = useMemo(() => getEstimatedNetWorth(player), [player]);
    const canAccess = player.stats.fame >= 30 || estimatedNetWorth >= 1000000;
    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const cycleStartAbsoluteWeek = currentAbsoluteWeek - ((currentAbsoluteWeek - 1) % LUXE_REFRESH_CYCLE_WEEKS);
    const cycleIndex = Math.floor((cycleStartAbsoluteWeek - 1) / LUXE_REFRESH_CYCLE_WEEKS);
    const refreshOffset = player.dating.luxeRefreshOffset || 0;
    const rotationSeed = cycleIndex * 11 + refreshOffset * 3;
    const myMatches = player.dating.matches.filter(match => match.isPremium);
    const selectedCandidate = candidates.find(candidate => candidate.id === selectedCandidateId) || candidates[0] || null;
    const activeChatMatch = myMatches.find(match => match.id === activeChatMatchId) || null;
    const canAskToDate = !!activeChatMatch && activeChatMatch.officialStatus !== 'GHOSTED' && activeChatMatch.officialStatus !== 'DATING' && ((activeChatMatch.dateCount || 0) >= 1 || activeChatMatch.hasGoneOnDate || activeChatMatch.inviteHistory?.some(entry => entry.outcome === 'SUCCESS'));
    const canBeIntimate = !!activeChatMatch && activeChatMatch.officialStatus !== 'GHOSTED' && (((activeChatMatch.dateCount || 0) >= 1) || activeChatMatch.officialStatus === 'SEEING');
    const nextFreeRefreshInWeeks = Math.max(0, cycleStartAbsoluteWeek + LUXE_REFRESH_CYCLE_WEEKS - currentAbsoluteWeek);
    useEffect(() => {
        if (!player.dating.isLuxeActive) {
            setView('GATE');
            return;
        }
        if ((player.dating.luxeCycleStartAbsoluteWeek || 0) !== cycleStartAbsoluteWeek) {
            onUpdatePlayer({
                ...player,
                dating: {
                    ...player.dating,
                    luxeCycleStartAbsoluteWeek: cycleStartAbsoluteWeek,
                    luxeRefreshOffset: 0,
                },
            });
            return;
        }

        setView(activeChatMatchId ? 'CHAT' : 'BROWSE');
        setCandidates(getLuxeCandidates(player, 5, rotationSeed));
    }, [player.dating.isLuxeActive, player.currentWeek, player.dating.luxeCycleStartAbsoluteWeek, player.dating.luxeRefreshOffset, rotationSeed, canAccess]);

    useEffect(() => {
        if (!selectedCandidateId && candidates[0]) setSelectedCandidateId(candidates[0].id);
        if (selectedCandidateId && !candidates.some(candidate => candidate.id === selectedCandidateId)) {
            setSelectedCandidateId(candidates[0]?.id || null);
        }
    }, [candidates, selectedCandidateId]);

    useEffect(() => {
        if (view !== 'CHAT') return;
        const timeoutId = window.setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 50);
        return () => window.clearTimeout(timeoutId);
    }, [view, liveChatHistory.length, activeChatMatchId]);

    useEffect(() => {
        const persistedHistory = activeChatMatch?.chatHistory || [];
        setLiveChatHistory(prev => {
            if (activeChatMatchId === null) return [];
            if (persistedHistory.length === 0) return prev;
            return persistedHistory.length >= prev.length ? persistedHistory : prev;
        });
    }, [activeChatMatchId]);

    useEffect(() => {
        setShowProfileDetails(false);
    }, [view, activeChatMatchId, selectedCandidateId]);

    useEffect(() => {
        if (!activeChatMatchId) {
            setIsAwaitingReply(false);
        }
    }, [activeChatMatchId]);

    useEffect(() => {
        return () => {
            if (pendingReplyTimeoutRef.current) {
                window.clearTimeout(pendingReplyTimeoutRef.current);
            }
        };
    }, []);

    const pushFeedback = (message: string, tone: 'success' | 'error' | 'neutral' = 'neutral') => {
        setFeedback({ message, tone });
        setTimeout(() => setFeedback(null), 2800);
    };

    const showResultModal = (title: string, body: string, tone: 'success' | 'error' | 'neutral', meta?: string) => {
        setResultModal({ title, body, tone, meta });
    };

    const handleApply = () => {
        if (!canAccess) return;
        const updatedPlayer = {
            ...player,
            dating: {
                ...player.dating,
                isLuxeActive: true,
                luxeCycleStartAbsoluteWeek: cycleStartAbsoluteWeek,
                luxeRefreshOffset: 0,
            },
        };
        onUpdatePlayer(updatedPlayer);
        setCandidates(getLuxeCandidates(updatedPlayer, 5, cycleIndex * 11));
        setView('BROWSE');
    };

    const handlePaidRefresh = () => {
        if (player.money < LUXE_REFRESH_COST) {
            pushFeedback(`You need ${formatMoneyCompact(LUXE_REFRESH_COST)} for a concierge refresh.`, 'error');
            return;
        }

        const updatedPlayer = {
            ...player,
            money: player.money - LUXE_REFRESH_COST,
            dating: {
                ...player.dating,
                luxeCycleStartAbsoluteWeek: cycleStartAbsoluteWeek,
                luxeRefreshOffset: refreshOffset + 1,
            },
            logs: [
                {
                    week: player.currentWeek,
                    year: player.age,
                    message: `💎 Paid ${formatMoneyCompact(LUXE_REFRESH_COST)} for a fresh Luxe curation.`,
                    type: 'neutral' as const,
                },
                ...player.logs,
            ].slice(0, 80),
        };

        onUpdatePlayer(updatedPlayer);
        pushFeedback('Luxe concierge refreshed your elite picks.', 'success');
    };

    const handlePass = (candidateId: string) => {
        setCandidates(prev => prev.filter(candidate => candidate.id !== candidateId));
    };

    const handleSignal = (candidate: DatingMatch) => {
        const existingMatch = player.dating.matches.find(match => match.isPremium && match.id === candidate.id);
        if (existingMatch) {
            setCandidates(prev => prev.filter(entry => entry.id !== candidate.id));
            setActiveChatMatchId(existingMatch.id);
            setChatActionMode('CHAT');
            setView('CHAT');
            pushFeedback(`${candidate.name.split(' ')[0]} is already in your elite connections.`, 'neutral');
            return;
        }

        const isMatch = calculateSwipeSuccess(player, candidate);
        if (!isMatch) {
            const shouldMakeNoise = (candidate.followers || 0) > 2500000 || Math.random() < 0.18;
            const noisyPlayer = shouldMakeNoise
                ? {
                      ...player,
                      news: [
                          {
                              id: `news_luxe_signal_${Date.now()}`,
                              headline: `${candidate.name} notices ${player.name} sliding into elite DMs`,
                              subtext: `Insiders are whispering that ${player.name} tried to make a discreet Luxe connection with ${candidate.name}.`,
                              category: 'YOU',
                              week: player.currentWeek,
                              year: player.age,
                              impactLevel: 'MEDIUM',
                          },
                          ...player.news,
                      ].slice(0, 80),
                      logs: [
                          {
                              week: player.currentWeek,
                              year: player.age,
                              message: `🗞️ Your Luxe signal to ${candidate.name} stirred a little chatter.`,
                              type: 'neutral' as const,
                          },
                          ...player.logs,
                      ].slice(0, 80),
                  }
                : player;
            setCandidates(prev => prev.filter(entry => entry.id !== candidate.id));
            if (shouldMakeNoise) onUpdatePlayer(noisyPlayer);
            pushFeedback(`${candidate.name.split(' ')[0]} passed. Luxe will keep your dignity intact.`, 'neutral');
            return;
        }

        const enriched: DatingMatch = {
            ...candidate,
            chatHistory: candidate.chatHistory?.length ? candidate.chatHistory : [{ sender: 'MATCH', text: openingLine(candidate) }],
            officialStatus: candidate.officialStatus || 'MATCHED',
            dateCount: candidate.dateCount || 0,
            intimacyCount: candidate.intimacyCount || 0,
            scandalHeat: candidate.scandalHeat || 0,
            lastInteractionAbsolute: currentAbsoluteWeek,
        };

        onUpdatePlayer({
            ...player,
            dating: {
                ...player.dating,
                matches: [enriched, ...player.dating.matches],
            },
            logs: [
                { week: player.currentWeek, year: player.age, message: `💎 Luxe matched you with ${candidate.name}.`, type: 'positive' },
                ...player.logs,
            ].slice(0, 80),
        });
        setCandidates(prev => prev.filter(entry => entry.id !== candidate.id));
        setSelectedCandidateId(null);
        setActiveChatMatchId(enriched.id);
        setLiveChatHistory(enriched.chatHistory || []);
        setChatActionMode('CHAT');
        setView('CHAT');
        pushFeedback(`${candidate.name.split(' ')[0]} matched. Keep the energy expensive.`, 'success');
    };

    const updatePremiumMatch = (matchId: string, updater: (match: DatingMatch) => DatingMatch) => {
        onUpdatePlayer({
            ...player,
            dating: {
                ...player.dating,
                matches: player.dating.matches.map(match => (match.id === matchId ? updater(match) : match)),
            },
        });
    };

    const sendChatOption = (optionLabel: string, lines: string[], chemistryGain: number, responsePool: string[]) => {
        if (!activeChatMatch) return;
        if (isAwaitingReply) {
            pushFeedback('Let them answer first.', 'neutral');
            return;
        }
        if (player.energy.current < LUXE_CHAT_ACTION_ENERGY_COST) {
            pushFeedback(`You need ${LUXE_CHAT_ACTION_ENERGY_COST} energy to keep the conversation going.`, 'error');
            return;
        }
        const playerText = pick(lines);
        const responseText = pick((activeChatMatch.compatibility || activeChatMatch.chemistry) >= 74 ? responsePool : COOL_RESPONSES);
        const historyBase = liveChatHistory?.length ? liveChatHistory : activeChatMatch.chatHistory || [];
        const immediateHistory = [
            ...historyBase,
            { sender: 'PLAYER' as const, text: playerText, tag: optionLabel },
        ];
        const finalHistory = [
            ...immediateHistory,
            { sender: 'MATCH' as const, text: responseText },
        ];
        setLiveChatHistory(immediateHistory);
        setIsAwaitingReply(true);

        if (pendingReplyTimeoutRef.current) {
            window.clearTimeout(pendingReplyTimeoutRef.current);
        }
        pendingReplyTimeoutRef.current = window.setTimeout(() => {
            setLiveChatHistory(finalHistory);
            setIsAwaitingReply(false);
            pendingReplyTimeoutRef.current = null;
        }, 320);

        onUpdatePlayer({
            ...player,
            energy: {
                ...player.energy,
                current: Math.max(0, player.energy.current - LUXE_CHAT_ACTION_ENERGY_COST),
            },
            dating: {
                ...player.dating,
                matches: player.dating.matches.map(match =>
                    match.id === activeChatMatch.id
                        ? {
                              ...match,
                              chemistry: Math.min(100, match.chemistry + chemistryGain),
                              chatHistory: finalHistory,
                              lastInteractionAbsolute: currentAbsoluteWeek,
                              officialStatus: match.officialStatus === 'COOLDOWN'
                                  ? 'MATCHED'
                                  : match.officialStatus === 'GHOSTED' && match.chemistry >= 70
                                      ? 'COOLDOWN'
                                      : match.officialStatus,
                          }
                        : match
                ),
            },
        });
    };

    const handleInvite = (inviteKind: InviteKind) => {
        if (!activeChatMatch) return;
        if (isAwaitingReply) {
            pushFeedback('Let them answer first.', 'neutral');
            return;
        }
        const cost = LUXE_INVITE_COSTS[inviteKind];
        if (player.energy.current < LUXE_CHAT_ACTION_ENERGY_COST) {
            pushFeedback(`You need ${LUXE_CHAT_ACTION_ENERGY_COST} energy to make a move.`, 'error');
            return;
        }
        if (player.money < cost) {
            pushFeedback(`You need ${formatMoneyCompact(cost)} for that move.`, 'error');
            return;
        }

        const outcome = getLuxeInviteOutcome(player, activeChatMatch, inviteKind, inviteMode);
        const option = INVITE_OPTIONS.find(entry => entry.kind === inviteKind)!;
        const historyBase = liveChatHistory?.length ? liveChatHistory : activeChatMatch.chatHistory || [];
        const immediateHistory = [
            ...historyBase,
            {
                sender: 'PLAYER' as const,
                text:
                    inviteMode === 'PRIVATE'
                        ? `Let's do ${option.label} quietly. Keep this between us.`
                        : `Come with me to ${option.label}. Let them talk.`,
                tag: option.label,
            },
        ];
        const finalHistory = [
            ...immediateHistory,
            {
                sender: 'MATCH' as const,
                text: outcome.success
                    ? inviteMode === 'PRIVATE'
                        ? 'Good. Quiet is more attractive anyway.'
                        : 'Fine. If we are being seen, we do it properly.'
                    : inviteMode === 'PRIVATE'
                        ? 'Too much intimacy too early.'
                        : 'Public optics need better chemistry than this.',
            },
        ];
        setLiveChatHistory(immediateHistory);
        setIsAwaitingReply(true);

        if (pendingReplyTimeoutRef.current) {
            window.clearTimeout(pendingReplyTimeoutRef.current);
        }
        pendingReplyTimeoutRef.current = window.setTimeout(() => {
            setLiveChatHistory(finalHistory);
            setIsAwaitingReply(false);
            pendingReplyTimeoutRef.current = null;
        }, 320);

        if (!outcome.success) {
            onUpdatePlayer({
                ...player,
                money: player.money - Math.floor(cost * 0.35),
                energy: {
                    ...player.energy,
                    current: Math.max(0, player.energy.current - LUXE_CHAT_ACTION_ENERGY_COST),
                },
                dating: {
                    ...player.dating,
                    matches: player.dating.matches.map(match =>
                        match.id === activeChatMatch.id
                            ? {
                                  ...match,
                                  chemistry: Math.max(8, match.chemistry + outcome.chemistryGain),
                                  chatHistory: finalHistory,
                                  inviteHistory: [...(match.inviteHistory || []), { kind: option.label, mode: inviteMode, outcome: 'REJECTED' }],
                              }
                            : match
                    ),
                },
                logs: [
                    { week: player.currentWeek, year: player.age, message: `💸 ${option.label} fizzled and still cost you ${formatMoneyCompact(Math.floor(cost * 0.35))}.`, type: 'negative' },
                    ...player.logs,
                ].slice(0, 80),
            });
            pushFeedback(outcome.headline, 'neutral');
            showResultModal(
                'Invite Rejected',
                `${activeChatMatch.name.split(' ')[0]} was not ready for ${inviteMode === 'PRIVATE' ? 'a private move' : 'a public moment'}. You still burned ${formatMoneyCompact(Math.floor(cost * 0.35))} and ${LUXE_CHAT_ACTION_ENERGY_COST} energy making the attempt.`,
                'neutral',
                `${option.label} • chemistry ${outcome.chemistryGain >= 0 ? '+' : ''}${outcome.chemistryGain}`
            );
            return;
        }

        const updatedPlayer = buildPostInvitePlayer(player, activeChatMatch, finalHistory, option.label, inviteMode, cost, outcome);
        onUpdatePlayer({
            ...updatedPlayer,
            energy: {
                ...updatedPlayer.energy,
                current: Math.max(0, player.energy.current - LUXE_CHAT_ACTION_ENERGY_COST),
            },
        });
        pushFeedback(outcome.headline, 'success');
        showResultModal(
            'Date Locked In',
            `${activeChatMatch.name.split(' ')[0]} said yes to ${inviteMode === 'PRIVATE' ? 'a private' : 'a public'} ${option.label.toLowerCase()}. You are closer now, but still not official until you define the relationship.`,
            'success',
            `${option.label} • chemistry +${Math.max(0, outcome.chemistryGain)}`
        );
    };

    const handleAskToDate = () => {
        if (!activeChatMatch) return;
        if (isAwaitingReply) {
            pushFeedback('Let them answer first.', 'neutral');
            return;
        }
        if (player.energy.current < LUXE_CHAT_ACTION_ENERGY_COST) {
            pushFeedback(`You need ${LUXE_CHAT_ACTION_ENERGY_COST} energy to define this.`, 'error');
            return;
        }
        if (!canAskToDate) {
            pushFeedback('Take them on a proper date first.', 'neutral');
            return;
        }

        const historyBase = liveChatHistory?.length ? liveChatHistory : activeChatMatch.chatHistory || [];
        const immediateHistory = [
            ...historyBase,
            { sender: 'PLAYER' as const, text: `I want this to be real. Let's make it official.`, tag: 'Ask to Date' },
        ];
        const defineScore = Math.min(
            97,
            (activeChatMatch.chemistry || 0) * 0.58 +
            (activeChatMatch.compatibility || activeChatMatch.chemistry || 0) * 0.24 +
            player.stats.reputation * 0.08 +
            player.stats.fame * 0.06 +
            (activeChatMatch.relationshipIntent === 'LONG_TERM' ? 12 : 0) +
            (activeChatMatch.relationshipIntent === 'PRIVATE_ROMANCE' ? 8 : 0) +
            (activeChatMatch.relationshipIntent === 'POWER_COUPLE' && inviteMode === 'PUBLIC' ? 6 : 0) +
            (activeChatMatch.officialStatus === 'SEEING' ? 8 : activeChatMatch.officialStatus === 'COOLDOWN' ? -10 : 0)
        );
        const accepted = Math.random() * 100 < defineScore;
        const finalHistory = [
            ...immediateHistory,
            {
                sender: 'MATCH' as const,
                text: accepted
                    ? 'Good. Then stop acting casual and call this what it is.'
                    : 'Not yet. I like this, but I am not ready to label it.',
            },
        ];

        setLiveChatHistory(immediateHistory);
        setIsAwaitingReply(true);

        if (pendingReplyTimeoutRef.current) {
            window.clearTimeout(pendingReplyTimeoutRef.current);
        }
        pendingReplyTimeoutRef.current = window.setTimeout(() => {
            setLiveChatHistory(finalHistory);
            setIsAwaitingReply(false);
            pendingReplyTimeoutRef.current = null;
        }, 320);

        if (!accepted) {
            onUpdatePlayer({
                ...player,
                energy: {
                    ...player.energy,
                    current: Math.max(0, player.energy.current - LUXE_CHAT_ACTION_ENERGY_COST),
                },
                dating: {
                    ...player.dating,
                    matches: player.dating.matches.map(match =>
                        match.id === activeChatMatch.id
                            ? {
                                  ...match,
                                  chemistry: Math.max(12, match.chemistry - 2),
                                  chatHistory: finalHistory,
                                  lastInteractionAbsolute: currentAbsoluteWeek,
                                  officialStatus: match.officialStatus === 'GHOSTED' ? 'GHOSTED' : 'COOLDOWN',
                              }
                            : match
                    ),
                },
                logs: [
                    { week: player.currentWeek, year: player.age, message: `💔 ${activeChatMatch.name} wants more time before making things official.`, type: 'neutral' },
                    ...player.logs,
                ].slice(0, 80),
            });
            pushFeedback(`${activeChatMatch.name.split(' ')[0]} is not ready to define it yet.`, 'neutral');
            showResultModal(
                'Not Official Yet',
                `${activeChatMatch.name.split(' ')[0]} wants more time before becoming your official partner.`,
                'neutral',
                `Chemistry -2 • ${LUXE_CHAT_ACTION_ENERGY_COST}E`
            );
            return;
        }

        const updatedPlayer = buildOfficialLuxeRelationshipPlayer(player, activeChatMatch);
        onUpdatePlayer({
            ...updatedPlayer,
            energy: {
                ...updatedPlayer.energy,
                current: Math.max(0, player.energy.current - LUXE_CHAT_ACTION_ENERGY_COST),
            },
        });
        setActiveChatMatchId(null);
        setChatActionMode('CHAT');
        setView('BROWSE');
        pushFeedback(`${activeChatMatch.name.split(' ')[0]} made it official.`, 'success');
        showResultModal(
            'Official Partner',
            `${activeChatMatch.name} is now officially your partner and will appear in Connections.`,
            'success',
            'Partner status confirmed'
        );
    };

    const handleIntimacy = () => {
        if (!activeChatMatch) return;
        if (isAwaitingReply) {
            pushFeedback('Let the current moment land first.', 'neutral');
            return;
        }
        if (player.energy.current < LUXE_INTIMACY_ENERGY_COST) {
            pushFeedback(`You need ${LUXE_INTIMACY_ENERGY_COST} energy for a move like that.`, 'error');
            return;
        }
        if (!canBeIntimate) {
            pushFeedback('Build more chemistry and go on at least one date first.', 'neutral');
            return;
        }

        const historyBase = liveChatHistory?.length ? liveChatHistory : activeChatMatch.chatHistory || [];
        const immediateHistory = [
            ...historyBase,
            { sender: 'PLAYER' as const, text: 'Come closer. I want this to turn into something dangerous.', tag: 'Intimacy' },
        ];
        const intimacyScore = Math.min(
            98,
            (activeChatMatch.chemistry || 0) * 0.54 +
            (activeChatMatch.compatibility || activeChatMatch.chemistry || 0) * 0.2 +
            player.stats.looks * 0.14 +
            player.stats.fame * 0.08 +
            (activeChatMatch.relationshipIntent === 'CASUAL' ? 12 : 0) +
            (activeChatMatch.relationshipIntent === 'PRIVATE_ROMANCE' ? 10 : 0) +
            (activeChatMatch.officialStatus === 'SEEING' ? 8 : activeChatMatch.officialStatus === 'MATCHED' ? -4 : activeChatMatch.officialStatus === 'COOLDOWN' ? -10 : 0)
        );
        const success = Math.random() * 100 < intimacyScore;
        const finalHistory = [
            ...immediateHistory,
            {
                sender: 'MATCH' as const,
                text: success
                    ? 'That was reckless. I liked it.'
                    : 'Too fast. You are pushing the tension too hard.',
            },
        ];
        const hasExistingRomance = player.relationships.some(rel => rel.relation === 'Partner' || rel.relation === 'Spouse');
        const scandalBoost = (activeChatMatch.privacyStyle === 'MEDIA_MAGNET' ? 18 : activeChatMatch.privacyStyle === 'PUBLIC_FACING' ? 12 : 5) + (hasExistingRomance ? 26 : 0);

        setLiveChatHistory(immediateHistory);
        setIsAwaitingReply(true);

        if (pendingReplyTimeoutRef.current) {
            window.clearTimeout(pendingReplyTimeoutRef.current);
        }
        pendingReplyTimeoutRef.current = window.setTimeout(() => {
            setLiveChatHistory(finalHistory);
            setIsAwaitingReply(false);
            pendingReplyTimeoutRef.current = null;
        }, 320);

        const updatedPlayer = {
            ...player,
            energy: {
                ...player.energy,
                current: Math.max(0, player.energy.current - LUXE_INTIMACY_ENERGY_COST),
            },
            dating: {
                ...player.dating,
                matches: player.dating.matches.map(match =>
                    match.id === activeChatMatch.id
                        ? {
                              ...match,
                              chemistry: Math.max(10, Math.min(100, match.chemistry + (success ? 6 : -5))),
                              chatHistory: finalHistory,
                              intimacyCount: (match.intimacyCount || 0) + (success ? 1 : 0),
                              scandalHeat: Math.max(0, (match.scandalHeat || 0) + (success ? scandalBoost : Math.floor(scandalBoost * 0.5))),
                              officialStatus: success ? (match.officialStatus === 'MATCHED' ? 'SEEING' : match.officialStatus) : 'COOLDOWN',
                              lastInteractionAbsolute: currentAbsoluteWeek,
                          }
                        : match
                ),
            },
            logs: [
                {
                    week: player.currentWeek,
                    year: player.age,
                    message: success
                        ? `🔥 The tension with ${activeChatMatch.name} finally turned physical.`
                        : `⚠️ ${activeChatMatch.name} pulled back when things got more intimate.`,
                    type: success ? 'positive' : 'negative',
                },
                ...(hasExistingRomance && success
                    ? [{ week: player.currentWeek, year: player.age, message: `🗞️ You are now playing with affair-level risk.`, type: 'negative' as const }]
                    : []),
                ...player.logs,
            ].slice(0, 80),
            news: [
                ...((success && (activeChatMatch.privacyStyle !== 'LOW_KEY' || hasExistingRomance) && Math.random() < 0.45)
                    ? [{
                        id: `news_luxe_intimacy_${Date.now()}`,
                        headline: `${player.name} and ${activeChatMatch.name} trigger fresh intimate rumors`,
                        subtext: hasExistingRomance
                            ? 'The story is getting messier because insiders believe someone else may already be in the picture.'
                            : 'Whispers suggest this Luxe connection just crossed into much riskier territory.',
                        category: 'YOU' as const,
                        week: player.currentWeek,
                        year: player.age,
                        impactLevel: hasExistingRomance ? 'HIGH' as const : 'MEDIUM' as const,
                    }]
                    : []),
                ...player.news,
            ].slice(0, 80),
        };

        onUpdatePlayer(updatedPlayer);
        pushFeedback(success ? `${activeChatMatch.name.split(' ')[0]} let the tension escalate.` : `${activeChatMatch.name.split(' ')[0]} backed away from that move.`, success ? 'success' : 'neutral');
        showResultModal(
            success ? 'Intimacy Escalated' : 'Too Much, Too Fast',
            success
                ? `${activeChatMatch.name.split(' ')[0]} let the chemistry turn physical. This boosts heat, but it can also create gossip, attachment, and affair risk.`
                : `${activeChatMatch.name.split(' ')[0]} pulled back. The chemistry took a hit and the vibe is colder now.`,
            success ? 'success' : 'neutral',
            `${success ? '+' : ''}${success ? 6 : -5} chemistry • ${LUXE_INTIMACY_ENERGY_COST}E`
        );
    };

    const queuedCandidates = selectedCandidate
        ? candidates.filter(candidate => candidate.id !== selectedCandidate.id).slice(0, 3)
        : [];

    if (!player.dating.isLuxeActive) {
        return (
            <div className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#050505] font-serif text-white animate-in slide-in-from-bottom duration-300">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -left-12 top-24 h-44 w-44 rounded-full bg-amber-500/18 blur-3xl" />
                    <div className="absolute right-[-3rem] top-44 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl" />
                    <div className="absolute bottom-28 left-1/3 h-36 w-36 rounded-full bg-white/5 blur-3xl" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_24%),linear-gradient(to_bottom,#0a0a0a,#020202_55%,#000000)]" />
                </div>

                <div className="relative shrink-0 border-b border-white/5 bg-black/35 p-4 pt-12 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-3">
                        <button onClick={onBack} className="text-amber-500">
                            <ArrowLeft size={24} />
                        </button>
                        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.28em] text-amber-500">
                            <Gem size={16} /> Luxe
                        </div>
                        <div className="text-right font-sans text-[10px] uppercase tracking-[0.18em] text-amber-300/70">
                            Members only
                        </div>
                    </div>
                </div>

                {feedback && (
                    <div className="px-4 pt-3 shrink-0 relative">
                        <div
                            className={`rounded-2xl border px-4 py-3 text-xs font-sans ${
                                feedback.tone === 'success'
                                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
                                    : feedback.tone === 'error'
                                        ? 'border-rose-500/20 bg-rose-500/10 text-rose-100'
                                        : 'border-amber-500/20 bg-amber-500/10 text-amber-100'
                            }`}
                        >
                            {feedback.message}
                        </div>
                    </div>
                )}

                <div className="relative flex-1 overflow-y-auto px-4 pb-8 pt-6 custom-scrollbar">
                    <div className="mx-auto max-w-md rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,rgba(28,20,6,0.96),rgba(8,8,8,0.98))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-amber-500/30 bg-amber-500/10 shadow-[0_0_35px_rgba(245,158,11,0.16)]">
                                <Gem size={30} className="text-amber-400" />
                            </div>
                            <div className={`rounded-full border px-3 py-1.5 text-[10px] font-sans uppercase tracking-[0.18em] ${
                                canAccess
                                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                                    : 'border-white/10 bg-white/[0.04] text-zinc-400'
                            }`}>
                                {canAccess ? 'Qualified' : 'Locked'}
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="text-[11px] font-sans uppercase tracking-[0.24em] text-amber-300">Invitation Only</div>
                            <h2 className="mt-2 text-3xl font-bold leading-tight text-white">Luxe Membership</h2>
                            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                                Luxe is a private dating circle for fame, influence, and elite access. Build the right profile, then step into a more expensive kind of romance.
                            </p>
                        </div>

                        <div className="mt-6 rounded-[28px] border border-white/7 bg-black/35 p-4">
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-zinc-500">Entry Criteria</div>
                                <div className="text-[11px] font-sans text-zinc-500">Need one to qualify</div>
                            </div>

                            <div className="mt-4 space-y-3">
                                <GateRequirement
                                    label="Fame"
                                    requirement="30+"
                                    current={Math.round(player.stats.fame)}
                                    currentLabel={`${Math.round(player.stats.fame)}`}
                                    met={player.stats.fame >= 30}
                                />
                                <GateRequirement
                                    label="Net Worth"
                                    requirement="$1M+"
                                    current={estimatedNetWorth}
                                    currentLabel={formatMoneyCompact(estimatedNetWorth)}
                                    met={estimatedNetWorth >= 1000000}
                                />
                                <GateMetric label="Reputation" value={`${Math.round(player.stats.reputation)}`} accent={player.stats.reputation >= 60} />
                            </div>
                        </div>

                        <div className="mt-5 rounded-[24px] border border-white/6 bg-white/[0.03] p-4">
                            <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-zinc-500">What unlocks inside</div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-zinc-300">
                                <div className="rounded-2xl border border-white/6 bg-black/30 p-3">Curated elite picks</div>
                                <div className="rounded-2xl border border-white/6 bg-black/30 p-3">Private luxury dates</div>
                                <div className="rounded-2xl border border-white/6 bg-black/30 p-3">Buzz and scandal risk</div>
                                <div className="rounded-2xl border border-white/6 bg-black/30 p-3">High-status relationship arcs</div>
                            </div>
                        </div>

                        <div className="mt-6">
                            {canAccess ? (
                                <button
                                    onClick={handleApply}
                                    className="w-full rounded-full bg-[linear-gradient(135deg,#f8d05e,#f59e0b)] px-8 py-4 text-sm font-bold font-sans text-black shadow-lg shadow-amber-900/30 transition-transform hover:scale-[1.01]"
                                >
                                    Enter Luxe
                                </button>
                            ) : (
                                <div className="rounded-[22px] border border-white/8 bg-black/35 p-4 text-center">
                                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                                        <Lock size={16} className="text-zinc-400" />
                                    </div>
                                    <div className="mt-3 text-sm font-bold text-white">Your profile is not elite enough yet.</div>
                                    <div className="mt-1 text-xs font-sans text-zinc-500">Build fame or wealth to unlock Luxe access.</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#050505] font-serif text-white animate-in slide-in-from-bottom duration-300">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-12 top-24 h-44 w-44 rounded-full bg-amber-500/18 blur-3xl" />
                <div className="absolute right-[-3rem] top-44 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl" />
                <div className="absolute bottom-28 left-1/3 h-36 w-36 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_24%),linear-gradient(to_bottom,#0a0a0a,#020202_55%,#000000)]" />
            </div>

            <div className="relative shrink-0 border-b border-white/5 bg-black/35 p-4 pt-12 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                    <button onClick={view === 'CHAT' ? () => setView('BROWSE') : onBack} className="text-amber-500">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.28em] text-amber-500">
                        <Gem size={16} /> Luxe
                    </div>
                    <div className="text-right font-sans text-[10px] uppercase tracking-[0.18em] text-amber-300/70">
                        {player.dating.isLuxeActive ? `Week ${player.currentWeek}` : 'Members only'}
                    </div>
                </div>
            </div>

            {feedback && (
                <div className="px-4 pt-3 shrink-0">
                    <div
                        className={`rounded-2xl border px-4 py-3 text-xs font-sans ${
                            feedback.tone === 'success'
                                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
                                : feedback.tone === 'error'
                                    ? 'border-rose-500/20 bg-rose-500/10 text-rose-100'
                                    : 'border-amber-500/20 bg-amber-500/10 text-amber-100'
                        }`}
                    >
                        {feedback.message}
                    </div>
                </div>
            )}

            {resultModal && (
                <div className="absolute inset-0 z-[70] flex items-end justify-center bg-black/55 px-4 pb-8 pt-24 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(21,14,6,0.98),rgba(6,6,8,0.98))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
                        <div className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-sans uppercase tracking-[0.18em] ${
                            resultModal.tone === 'success'
                                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                                : resultModal.tone === 'error'
                                    ? 'border-rose-500/25 bg-rose-500/10 text-rose-200'
                                    : 'border-amber-500/25 bg-amber-500/10 text-amber-200'
                        }`}>
                            Luxe Update
                        </div>
                        <h3 className="mt-4 text-2xl font-bold text-white">{resultModal.title}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-zinc-300">{resultModal.body}</p>
                        {resultModal.meta && (
                            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[11px] font-sans uppercase tracking-[0.16em] text-zinc-400">
                                {resultModal.meta}
                            </div>
                        )}
                        <button
                            onClick={() => setResultModal(null)}
                            className="mt-5 w-full rounded-full bg-[linear-gradient(135deg,#f8d05e,#f59e0b)] px-4 py-3 text-sm font-bold font-sans text-black"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {view === 'BROWSE' && (
                <div className="relative flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 pb-8 pt-4 space-y-4">
                    {myMatches.length > 0 && (
                        <section>
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-xs font-sans font-bold uppercase tracking-widest text-amber-500">Elite Connections</h3>
                                <span className="text-[11px] font-sans text-zinc-500">{myMatches.length} active</span>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                {myMatches.map(match => (
                                    <button
                                        key={match.id}
                                        onClick={() => {
                                            setActiveChatMatchId(match.id);
                                            setView('CHAT');
                                        }}
                                        className="shrink-0 rounded-[26px] border border-white/6 bg-white/[0.03] px-3 py-3 text-left backdrop-blur-md"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative shrink-0">
                                                <img src={match.image} className="h-12 w-12 rounded-full border border-amber-500/40 object-cover" />
                                            <div className="absolute -bottom-1 -right-1 rounded-full border border-amber-500/30 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-sans text-amber-100">
                                                {match.chemistry}%
                                            </div>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-bold text-white">{match.name.split(' ')[0]}</div>
                                                <div className="mt-1 text-[10px] font-sans uppercase tracking-[0.16em] text-zinc-500">
                                                    {labelConnectionStage(match.officialStatus)} • {labelIntent(match.relationshipIntent)}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="rounded-[28px] border border-white/7 bg-[linear-gradient(180deg,rgba(16,16,22,0.96),rgba(5,5,7,0.98))] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-[11px] font-sans uppercase tracking-[0.2em] text-zinc-500">Curated This Cycle</div>
                                <div className="mt-1 text-xl font-bold text-white">{candidates.length} Luxe Picks</div>
                                <div className="mt-1 text-xs font-sans text-zinc-500">
                                    {nextFreeRefreshInWeeks === 0
                                        ? 'Free curation rotates this week.'
                                        : `Free refresh in ${nextFreeRefreshInWeeks} week${nextFreeRefreshInWeeks === 1 ? '' : 's'}.`}
                                </div>
                            </div>
                            <button
                                onClick={handlePaidRefresh}
                                className="rounded-full border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-xs font-sans font-bold text-amber-100 hover:bg-amber-500/15 flex items-center gap-2"
                            >
                                <Wallet size={14} /> {formatMoneyCompact(LUXE_REFRESH_COST)}
                            </button>
                        </div>
                    </section>

                    {selectedCandidate && (
                        <section className="space-y-4">
                            <div className="flex items-center justify-between gap-3 px-1">
                                <div className="text-[11px] font-sans uppercase tracking-[0.2em] text-zinc-500">
                                    Elite deck
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowProfileDetails(prev => !prev)}
                                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${showProfileDetails ? 'border-amber-400/40 bg-amber-500/10 text-amber-200' : 'border-white/10 bg-white/[0.03] text-zinc-400'}`}
                                        aria-label="Toggle profile details"
                                    >
                                        <Info size={14} />
                                    </button>
                                    <div className="flex gap-1.5">
                                    {candidates.map(candidate => (
                                        <button
                                            key={candidate.id}
                                            onClick={() => setSelectedCandidateId(candidate.id)}
                                            className={`h-1.5 rounded-full transition-all ${
                                                selectedCandidateId === candidate.id ? 'w-8 bg-amber-400' : 'w-3 bg-zinc-700 hover:bg-zinc-500'
                                            }`}
                                            aria-label={`View ${candidate.name}`}
                                        />
                                    ))}
                                    </div>
                                </div>
                            </div>

                            <div className="relative pt-2">
                                {queuedCandidates[1] && (
                                    <div className="pointer-events-none absolute left-[13%] right-[13%] top-0 h-[80%] rounded-[34px] border border-white/5 bg-zinc-900/55 shadow-[0_18px_50px_rgba(0,0,0,0.28)] rotate-[6deg]" />
                                )}
                                {queuedCandidates[0] && (
                                    <div className="pointer-events-none absolute left-[10%] right-[10%] top-3 h-[84%] rounded-[36px] border border-amber-500/12 bg-zinc-950/75 shadow-[0_20px_60px_rgba(0,0,0,0.35)] -rotate-[5deg]" />
                                )}

                                <section className="relative rounded-[36px] overflow-hidden border border-white/10 bg-zinc-950 shadow-[0_30px_90px_rgba(0,0,0,0.5)]">
                                    <div className="relative aspect-[3/4]">
                                        <button
                                            onClick={() => setShowProfileDetails(prev => !prev)}
                                            className="absolute inset-0 z-10"
                                            aria-label="Toggle profile details"
                                        />
                                        <img
                                            src={selectedCandidate.image}
                                            className={`h-full w-full object-cover transition-all duration-300 ${showProfileDetails ? 'scale-[1.03] blur-[3px]' : ''}`}
                                        />
                                        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.95)_8%,rgba(0,0,0,0.18)_45%,rgba(0,0,0,0.06)_100%)]" />
                                        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black to-transparent" />
                                        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/55 to-transparent" />
                                        {showProfileDetails && (
                                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.52),rgba(0,0,0,0.78))]" />
                                        )}

                                        <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
                                            <div className="flex gap-2 flex-wrap max-w-[72%]">
                                                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-sans uppercase tracking-[0.18em] text-white/85 backdrop-blur-md">
                                                    {selectedCandidate.prestigeTier}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${showProfileDetails ? 'border-amber-400/40 bg-amber-500/10 text-amber-200' : 'border-white/10 bg-black/30 text-white/80'} backdrop-blur-md`}
                                                >
                                                    <Info size={16} />
                                                </div>
                                                <div className="rounded-full border border-amber-400/25 bg-black/30 px-3 py-2 text-right backdrop-blur-md">
                                                    <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-amber-200/70">Chem</div>
                                                    <div className="text-lg font-bold text-white">{selectedCandidate.compatibility}%</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute bottom-0 left-0 right-0 p-5">
                                            <div className="space-y-4">
                                                {!showProfileDetails && (
                                                    <div>
                                                        <div className="text-4xl font-bold text-white leading-[0.95] drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                                                            {selectedCandidate.name}
                                                        </div>
                                                        <div className="mt-2 flex items-center gap-2 text-sm text-zinc-200 font-sans">
                                                            <span>{selectedCandidate.age}</span>
                                                            <span className="text-zinc-500">•</span>
                                                            <span className="uppercase tracking-[0.18em] text-amber-200">{selectedCandidate.job}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {!showProfileDetails && (
                                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                                        <span className="shrink-0 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-sans uppercase tracking-[0.16em] text-white/85 backdrop-blur-md">
                                                            {labelIntent(selectedCandidate.relationshipIntent)}
                                                        </span>
                                                        <span className="shrink-0 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-sans uppercase tracking-[0.16em] text-white/85 backdrop-blur-md">
                                                            {labelPrivacy(selectedCandidate.privacyStyle)}
                                                        </span>
                                                        {(selectedCandidate.luxeTraits || []).slice(0, 1).map(trait => (
                                                            <span key={trait} className="shrink-0 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-sans uppercase tracking-[0.16em] text-zinc-100 backdrop-blur-md">
                                                                {trait.replace(/_/g, ' ')}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {showProfileDetails && (
                                                    <div className="absolute inset-x-0 top-4 bottom-6 flex items-center px-2">
                                                        <div className="w-full rounded-[28px] border border-white/10 bg-black/35 p-4 backdrop-blur-xl shadow-[0_16px_50px_rgba(0,0,0,0.24)]">
                                                        <div className="flex flex-wrap gap-2">
                                                            <ModernInfoChip value={labelIntent(selectedCandidate.relationshipIntent)} />
                                                            <ModernInfoChip value={labelPrivacy(selectedCandidate.privacyStyle)} />
                                                            <ModernInfoChip value={formatEliteWorth(selectedCandidate.netWorth)} />
                                                            <ModernInfoChip value={`${formatCompactNumber(selectedCandidate.followers || 0)} followers`} />
                                                        </div>
                                                        <p className="mt-4 text-sm leading-relaxed text-zinc-100">{selectedCandidate.bio}</p>
                                                        <p className="mt-3 text-xs leading-relaxed font-sans text-zinc-400">{selectedCandidate.matchReason}</p>
                                                        <div className="mt-4 text-[10px] font-sans uppercase tracking-[0.18em] text-amber-200/65">
                                                            Tap again to return to the card
                                                        </div>
                                                    </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {!showProfileDetails && (
                                        <div className="p-5 bg-[linear-gradient(to_bottom,#0d0d13,#06060a)]">
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => handlePass(selectedCandidate.id)}
                                                    className="rounded-full border border-white/10 bg-white/[0.03] py-4 text-sm font-sans font-bold text-zinc-300 backdrop-blur-md"
                                                >
                                                    Pass
                                                </button>
                                                <button
                                                    onClick={() => handleSignal(selectedCandidate)}
                                                    className="rounded-full bg-[linear-gradient(135deg,#b45309,#f59e0b)] py-4 text-sm font-sans font-bold text-white flex items-center justify-center gap-2 shadow-[0_12px_35px_rgba(180,83,9,0.35)]"
                                                >
                                                    <Send size={15} /> Send Signal
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </div>

                            {queuedCandidates.length > 0 && !showProfileDetails && (
                                <div className="space-y-2">
                                    <div className="px-1 text-[11px] font-sans uppercase tracking-[0.18em] text-zinc-500">
                                        Up next
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                                        {queuedCandidates.map(candidate => (
                                            <button
                                                key={candidate.id}
                                                onClick={() => setSelectedCandidateId(candidate.id)}
                                                className="shrink-0 w-28 rounded-[26px] overflow-hidden border border-white/5 bg-zinc-950 text-left shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                                            >
                                                <img src={candidate.image} className="h-32 w-full object-cover" />
                                                <div className="p-3">
                                                    <div className="truncate text-sm font-bold text-white">
                                                        {candidate.name.split(' ')[0]}, {candidate.age}
                                                    </div>
                                                    <div className="mt-1 text-[10px] font-sans uppercase tracking-[0.15em] text-amber-400">
                                                        {candidate.compatibility}%
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            )}

            {view === 'CHAT' && activeChatMatch && (
                <div className="flex-1 min-h-0 flex flex-col bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_transparent_24%),linear-gradient(to_bottom,#09090b,#000000)] overflow-hidden">
                    <div className="relative shrink-0 border-b border-white/5 bg-black/78 px-4 pb-4 pt-4 backdrop-blur-xl safe-area-pt">
                        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
                        <div className="relative z-10 flex items-center gap-3">
                            <img
                                src={activeChatMatch.image}
                                className="h-12 w-12 rounded-full border border-amber-500/25 object-cover shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-lg font-bold text-white">{activeChatMatch.name}</div>
                                <div className="mt-1 flex items-center gap-2 text-xs font-sans">
                                    <span className="font-semibold text-amber-300">CHEM {activeChatMatch.chemistry}%</span>
                                    <span className="text-zinc-600">•</span>
                                    <span className="truncate text-zinc-400">{labelConnectionStage(activeChatMatch.officialStatus)}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowProfileDetails(prev => !prev)}
                                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${showProfileDetails ? 'border-amber-400/40 bg-amber-500/10 text-amber-200' : 'border-white/10 bg-white/[0.03] text-zinc-300'} backdrop-blur-md shrink-0`}
                                aria-label="Open Luxe profile details"
                            >
                                <Info size={16} />
                            </button>
                        </div>
                    </div>

                    {showProfileDetails && (
                        <div className="absolute inset-x-4 top-[7.25rem] z-30 rounded-[24px] border border-amber-500/20 bg-[linear-gradient(180deg,rgba(23,16,8,0.96),rgba(8,8,12,0.98))] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-amber-300/70">Luxe Profile</div>
                                    <div className="mt-2 truncate text-lg font-bold text-white">{activeChatMatch.name}</div>
                                    <div className="mt-1 text-xs font-sans text-zinc-400">{activeChatMatch.handle || '@private'} • {activeChatMatch.lastActiveLabel || 'Active now'}</div>
                                </div>
                                <button
                                    onClick={() => setShowProfileDetails(false)}
                                    className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-sans font-bold uppercase tracking-[0.14em] text-zinc-300"
                                >
                                    Close
                                </button>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <ModernInfoChip value={labelConnectionStage(activeChatMatch.officialStatus)} />
                                <ModernInfoChip value={activeChatMatch.prestigeTier || 'Elite'} />
                                <ModernInfoChip value={labelIntent(activeChatMatch.relationshipIntent)} />
                                <ModernInfoChip value={labelPrivacy(activeChatMatch.privacyStyle)} />
                                <ModernInfoChip value={formatEliteWorth(activeChatMatch.netWorth)} />
                            </div>
                            <p className="mt-4 text-sm leading-relaxed text-zinc-200">{activeChatMatch.bio || 'Private by design. The conversation is where the real profile lives.'}</p>
                        </div>
                    )}

                    <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-4 custom-scrollbar">
                        <div className="mb-4 text-center text-[11px] font-sans uppercase tracking-[0.16em] text-zinc-500">
                            You matched with {activeChatMatch.name.split(' ')[0]}
                        </div>
                        <div className="space-y-3">
                            {(liveChatHistory?.length ? liveChatHistory : activeChatMatch.chatHistory || []).map((msg, i) => {
                                const isPlayerMessage = msg.sender === 'PLAYER';
                                const playerBubbleStyle = isPlayerMessage ? {
                                    backgroundColor: '#f6cf66',
                                    borderColor: 'rgba(253, 230, 138, 0.85)',
                                    color: '#151008',
                                    WebkitTextFillColor: '#151008',
                                } as React.CSSProperties : undefined;
                                const playerTagStyle = isPlayerMessage ? {
                                    color: '#5f3f08',
                                    WebkitTextFillColor: '#5f3f08',
                                } as React.CSSProperties : undefined;
                                const playerTextStyle = isPlayerMessage ? {
                                    color: '#151008',
                                    WebkitTextFillColor: '#151008',
                                } as React.CSSProperties : undefined;
                                return (
                                    <div key={i} className={`flex flex-col ${isPlayerMessage ? 'items-end' : 'items-start'}`}>
                                        <div className={`mb-1 px-1 text-[10px] font-sans uppercase tracking-[0.16em] ${isPlayerMessage ? 'text-amber-300' : 'text-zinc-500'}`}>
                                            {isPlayerMessage ? 'You' : activeChatMatch.name.split(' ')[0]}
                                        </div>
                                        <div
                                            className={`relative z-10 max-w-[84%] rounded-[22px] px-4 py-3 text-sm font-sans leading-relaxed shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${
                                                isPlayerMessage
                                                    ? 'rounded-br-md border'
                                                    : 'rounded-bl-md border border-white/6 bg-white/[0.04] text-zinc-100 backdrop-blur-md'
                                            }`}
                                            style={playerBubbleStyle}
                                        >
                                            {msg.tag && (
                                                <div
                                                    className={`mb-2 text-[10px] font-sans uppercase tracking-[0.16em] ${isPlayerMessage ? '' : 'text-zinc-500'}`}
                                                    style={playerTagStyle}
                                                >
                                                    {msg.tag}
                                                </div>
                                            )}
                                            <p
                                                className={`${isPlayerMessage ? 'text-[15px] font-semibold leading-6' : 'text-[15px] font-medium leading-6 text-zinc-100'}`}
                                                style={playerTextStyle}
                                            >
                                                {msg.text}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            {isAwaitingReply && (
                                <div className="flex flex-col items-start">
                                    <div className="mb-1 px-1 text-[10px] font-sans uppercase tracking-[0.16em] text-zinc-500">
                                        {activeChatMatch.name.split(' ')[0]}
                                    </div>
                                    <div className="rounded-[20px] rounded-bl-md border border-white/6 bg-white/[0.04] px-4 py-3 backdrop-blur-md">
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-2 w-2 rounded-full bg-zinc-400/70 animate-pulse" />
                                            <span className="h-2 w-2 rounded-full bg-zinc-400/55 animate-pulse [animation-delay:120ms]" />
                                            <span className="h-2 w-2 rounded-full bg-zinc-400/40 animate-pulse [animation-delay:240ms]" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                    </div>

                    <div className="shrink-0 border-t border-white/5 bg-black/72 px-4 pb-5 pt-3 backdrop-blur-2xl safe-area-pb">
                        <div className="rounded-[24px] border border-white/7 bg-[linear-gradient(180deg,rgba(18,18,24,0.95),rgba(8,8,12,0.98))] p-3 shadow-[0_-10px_50px_rgba(0,0,0,0.22)] space-y-3">
                            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                <button
                                    onClick={() => setChatActionMode('CHAT')}
                                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-sans font-bold ${chatActionMode === 'CHAT' ? 'bg-white text-black' : 'border border-white/10 bg-white/[0.03] text-zinc-300'}`}
                                >
                                    Chat
                                </button>
                                <button
                                    onClick={() => setChatActionMode('FLIRT')}
                                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-sans font-bold ${chatActionMode === 'FLIRT' ? 'bg-amber-500 text-black' : 'border border-white/10 bg-white/[0.03] text-zinc-300'}`}
                                >
                                    Flirt
                                </button>
                                <button
                                    onClick={() => setChatActionMode('ASK')}
                                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-sans font-bold ${chatActionMode === 'ASK' ? 'bg-amber-200 text-black' : 'border border-white/10 bg-white/[0.03] text-zinc-300'}`}
                                >
                                    Ask Out
                                </button>
                                <button
                                    onClick={() => setChatActionMode('INTIMACY')}
                                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-sans font-bold ${chatActionMode === 'INTIMACY' ? 'bg-rose-300 text-black' : 'border border-white/10 bg-white/[0.03] text-zinc-300'}`}
                                >
                                    Intimacy
                                </button>
                            </div>

                            {chatActionMode === 'CHAT' && (
                                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                    {CHAT_OPTIONS.map(option => (
                                        <button
                                            key={option.id}
                                            onClick={() => sendChatOption(option.label, option.lines, option.chemistryGain, WARM_RESPONSES)}
                                            disabled={player.energy.current < LUXE_CHAT_ACTION_ENERGY_COST || isAwaitingReply}
                                            className="shrink-0 min-w-[148px] rounded-[18px] border border-white/8 bg-black/35 px-4 py-3 text-left hover:border-amber-500/30 hover:bg-black/55 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <div className="flex h-full items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-bold text-white">{option.label}</div>
                                                    <div className="mt-1 text-[11px] font-sans text-zinc-400">{LUXE_CHAT_ACTION_ENERGY_COST}E</div>
                                                </div>
                                                <MessageCircle size={15} className="shrink-0 text-zinc-500" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {chatActionMode === 'FLIRT' && (
                                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                    {FLIRT_OPTIONS.map(option => (
                                        <button
                                            key={option.id}
                                            onClick={() => sendChatOption(option.label, option.lines, option.chemistryGain, WARM_RESPONSES)}
                                            disabled={player.energy.current < LUXE_CHAT_ACTION_ENERGY_COST || isAwaitingReply}
                                            className="shrink-0 min-w-[148px] rounded-[18px] border border-amber-500/15 bg-amber-500/6 px-4 py-3 text-left hover:border-amber-500/35 hover:bg-amber-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <div className="flex h-full items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-bold text-white">{option.label}</div>
                                                    <div className="mt-1 text-[11px] font-sans text-zinc-400">{LUXE_CHAT_ACTION_ENERGY_COST}E</div>
                                                </div>
                                                <Sparkles size={15} className="shrink-0 text-amber-300" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {chatActionMode === 'ASK' && (
                                <>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-zinc-500">Date Style</div>
                                            <div className="mt-1 text-sm font-bold text-white">{labelInviteModeTitle(inviteMode)}</div>
                                            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                                                {labelInviteModeDescription(inviteMode)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex rounded-full border border-white/8 bg-black/50 p-1">
                                        <button
                                            onClick={() => setInviteMode('PRIVATE')}
                                            className={`flex-1 flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-sans font-bold ${
                                                inviteMode === 'PRIVATE' ? 'bg-white text-black' : 'text-zinc-400'
                                            }`}
                                        >
                                            <EyeOff size={14} /> Keep It Private
                                        </button>
                                        <button
                                            onClick={() => setInviteMode('PUBLIC')}
                                            className={`flex-1 flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-sans font-bold ${
                                                inviteMode === 'PUBLIC' ? 'bg-amber-500 text-black' : 'text-zinc-400'
                                            }`}
                                        >
                                            <Camera size={14} /> Go Public
                                        </button>
                                    </div>

                                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                        {INVITE_OPTIONS.map(option => (
                                            <button
                                                key={option.kind}
                                                onClick={() => handleInvite(option.kind)}
                                                disabled={player.energy.current < LUXE_CHAT_ACTION_ENERGY_COST || player.money < LUXE_INVITE_COSTS[option.kind] || isAwaitingReply}
                                                className="shrink-0 min-w-[220px] rounded-[20px] border border-white/7 bg-black/35 p-3 text-left hover:border-amber-500/35 hover:bg-black/60 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-0.5 text-amber-400 shrink-0">{option.icon}</div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-bold text-white">{option.label}</div>
                                                                <div className="mt-1 text-xs leading-relaxed text-zinc-400">
                                                                {option.description}
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-sans font-bold text-amber-300">
                                                                {formatMoneyCompact(LUXE_INVITE_COSTS[option.kind])}
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 text-[10px] font-sans uppercase tracking-[0.18em] text-zinc-500">
                                                            Best for {option.bestFor} • {LUXE_CHAT_ACTION_ENERGY_COST}E
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleAskToDate}
                                        disabled={!canAskToDate || player.energy.current < LUXE_CHAT_ACTION_ENERGY_COST || isAwaitingReply}
                                        className="w-full rounded-[20px] border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-left disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-bold text-white">Ask to Date</div>
                                                <div className="mt-1 text-xs leading-relaxed text-zinc-400">
                                                    {canAskToDate
                                                        ? 'Make it official. If they accept, they become your partner and move into Connections.'
                                                        : 'Unlocked after at least one successful Luxe date.'}
                                                </div>
                                            </div>
                                            <div className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-sans font-bold text-emerald-200">
                                                {LUXE_CHAT_ACTION_ENERGY_COST}E
                                            </div>
                                        </div>
                                    </button>
                                </>
                            )}

                            {chatActionMode === 'INTIMACY' && (
                                <div className="space-y-3">
                                    <div className="rounded-[20px] border border-rose-400/15 bg-rose-500/6 p-4">
                                        <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-rose-200/70">Danger Zone</div>
                                        <div className="mt-1 text-sm font-bold text-white">Escalate Into Intimacy</div>
                                        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                                            This can deepen attachment fast, but it also raises rumor pressure, scandal heat, and affair fallout if your life is already messy.
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleIntimacy}
                                        disabled={!canBeIntimate || player.energy.current < LUXE_INTIMACY_ENERGY_COST || isAwaitingReply}
                                        className="w-full rounded-[20px] border border-rose-400/20 bg-rose-500/8 px-4 py-3 text-left disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-bold text-white">Be Intimate</div>
                                                <div className="mt-1 text-xs leading-relaxed text-zinc-400">
                                                    {canBeIntimate
                                                        ? 'Push this connection into dangerous chemistry. Great for drama, not always great for your life.'
                                                        : 'Unlocked after you have gone on at least one successful Luxe date.'}
                                                </div>
                                            </div>
                                            <div className="shrink-0 rounded-full border border-rose-400/25 bg-rose-500/10 px-2.5 py-1 text-[10px] font-sans font-bold text-rose-200">
                                                {LUXE_INTIMACY_ENERGY_COST}E
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

const GateMetric = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
    <div className="flex items-center justify-between text-sm font-sans">
        <span className="text-zinc-400">{label}</span>
        <span className={accent ? 'font-bold text-amber-400' : 'font-bold text-white'}>{value}</span>
    </div>
);

const GateRequirement = ({
    label,
    requirement,
    currentLabel,
    met,
}: {
    label: string;
    requirement: string;
    current: number;
    currentLabel: string;
    met: boolean;
}) => (
    <div className="rounded-[18px] border border-white/6 bg-white/[0.03] p-3">
        <div className="flex items-center justify-between gap-3">
            <div>
                <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-zinc-500">{label}</div>
                <div className="mt-1 text-sm font-bold text-white">{currentLabel}</div>
            </div>
            <div className={`rounded-full px-3 py-1 text-[10px] font-sans uppercase tracking-[0.16em] ${
                met
                    ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                    : 'border border-white/10 bg-black/35 text-zinc-400'
            }`}>
                {met ? 'Met' : `Need ${requirement}`}
            </div>
        </div>
    </div>
);

const LuxStatPill = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-[20px] border border-white/6 bg-white/[0.04] px-4 py-3 backdrop-blur-md">
        <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-zinc-500">{label}</div>
        <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
);

const ModernInfoChip = ({ label, value }: { label?: string; value: string }) => (
    <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-2 backdrop-blur-md">
        {label ? (
            <div className="flex items-center gap-2">
                <span className="text-[9px] font-sans uppercase tracking-[0.16em] text-zinc-500">{label}</span>
                <span className="text-sm font-semibold text-white">{value}</span>
            </div>
        ) : (
            <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-zinc-300">{value}</div>
        )}
    </div>
);

const CompactStatPill = ({ label, value }: { label: string; value: string }) => (
    <div className="min-w-0 rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-2.5 backdrop-blur-md overflow-hidden">
        <div className="truncate text-[9px] font-sans uppercase tracking-[0.16em] text-zinc-500">{label}</div>
        <div className="mt-1 truncate text-sm font-semibold text-white">{value}</div>
    </div>
);

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const openingLine = (candidate: DatingMatch) => {
    if (candidate.relationshipIntent === 'POWER_COUPLE') return 'You look like someone who knows how to make headlines worth reading.';
    if (candidate.relationshipIntent === 'PRIVATE_ROMANCE' || candidate.relationshipIntent === 'DISCREET') return 'I prefer my favorites away from cameras. You may qualify.';
    return 'Your profile made the cut. That almost never happens.';
};

const labelIntent = (intent?: DatingMatch['relationshipIntent']) => {
    switch (intent) {
        case 'POWER_COUPLE':
            return 'Power Couple';
        case 'PRIVATE_ROMANCE':
            return 'Private Romance';
        case 'LONG_TERM':
            return 'Long-Term';
        case 'DISCREET':
            return 'Discreet';
        default:
            return 'Casual';
    }
};

const labelConnectionStage = (status?: DatingMatch['officialStatus']) => {
    switch (status) {
        case 'SEEING':
            return 'Seeing';
        case 'COOLDOWN':
            return 'Cooling Off';
        case 'GHOSTED':
            return 'Ghosted';
        case 'DATING':
            return 'Official';
        default:
            return 'Matched';
    }
};

const labelPrivacy = (style?: DatingMatch['privacyStyle']) => {
    switch (style) {
        case 'PUBLIC_FACING':
            return 'Public Facing';
        case 'MEDIA_MAGNET':
            return 'Media Magnet';
        default:
            return 'Low-Key';
    }
};

const labelInviteModeTitle = (mode: InviteMode) => {
    return mode === 'PRIVATE' ? 'Keep this off the radar' : 'Make it a public moment';
};

const labelInviteModeDescription = (mode: InviteMode) => {
    return mode === 'PRIVATE'
        ? 'Low gossip, quieter chemistry, and cleaner relationship optics.'
        : 'Higher buzz and public heat, but it can trigger gossip, speculation, or affair fallout.';
};

const formatEliteWorth = (value?: number) => {
    if (!value || value <= 0) return 'Undisclosed';
    if (value < 1000000) return 'Private Wealth';
    return formatMoneyCompact(value);
};

const formatCompactNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return `${Math.round(value)}`;
};

const formatMoneyCompact = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${Math.round(value)}`;
};

const buildPostInvitePlayer = (
    player: Player,
    match: DatingMatch,
    chatHistory: NonNullable<DatingMatch['chatHistory']>,
    inviteLabel: string,
    inviteMode: InviteMode,
    cost: number,
    outcome: ReturnType<typeof getLuxeInviteOutcome>
): Player => {
    const romanticRelations = player.relationships.filter(rel => rel.relation === 'Partner' || rel.relation === 'Spouse');
    const isAffair = romanticRelations.length > 0;
    const isSameGenderPublic = inviteMode === 'PUBLIC' && !!match.gender && match.gender === player.gender;
    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);

    const newsItems: NewsItem[] = [];
    const xPosts: XPost[] = [];

    if (inviteMode === 'PUBLIC') {
        newsItems.push({
            id: `news_luxe_${Date.now()}`,
            headline: isSameGenderPublic
                ? `${player.name}'s new public romance sparks intense speculation online`
                : `${player.name} steps out publicly with ${match.name}`,
            subtext: isSameGenderPublic
                ? 'Fans, tabloids, and insiders are all trying to decode the relationship and what it means for the star’s public image.'
                : 'The pairing is already generating buzz in fan circles and entertainment media.',
            category: 'YOU',
            week: player.currentWeek,
            year: player.age,
            impactLevel: isSameGenderPublic ? 'HIGH' : 'MEDIUM',
        });

        xPosts.push({
            id: `x_luxe_${Date.now()}`,
            authorId: 'fanwire',
            authorName: 'FanWire',
            authorHandle: '@fanwire',
            authorAvatar: 'https://api.dicebear.com/8.x/shapes/svg?seed=fanwire',
            content: isSameGenderPublic
                ? `${player.name} just went public with ${match.name} and the timeline is absolutely spiraling with speculation.`
                : `${player.name} and ${match.name} were just seen together and the chemistry looked very real.`,
            timestamp: Date.now(),
            likes: 1200 + Math.floor((match.followers || 0) * 0.0001),
            retweets: 160 + Math.floor((match.followers || 0) * 0.00002),
            replies: 220 + Math.floor((match.followers || 0) * 0.00003),
            isPlayer: false,
            isLiked: false,
            isRetweeted: false,
            isVerified: true,
        });
    }

    if (isAffair) {
        newsItems.push({
            id: `news_affair_${Date.now()}`,
            headline: `${player.name} faces affair whispers after luxe outing`,
            subtext: 'Observers are connecting dots between the public appearance and an existing relationship.',
            category: 'YOU',
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'HIGH',
        });
    }

    const reputationShift = outcome.reputationDelta - (isAffair ? 6 : 0) + (isSameGenderPublic ? 0 : 0);
    const followersShift = outcome.followerDelta + (isAffair ? 1800 : 0) + (isSameGenderPublic && inviteMode === 'PUBLIC' ? 2400 : 0);
    const happinessShift = outcome.success ? 4 : 0;

    return {
        ...player,
        money: player.money - cost,
        stats: {
            ...player.stats,
            followers: Math.max(0, player.stats.followers + followersShift),
            reputation: Math.max(0, Math.min(100, player.stats.reputation + reputationShift)),
            happiness: Math.max(0, Math.min(100, player.stats.happiness + happinessShift)),
        },
        dating: {
            ...player.dating,
            matches: player.dating.matches.map(entry =>
                entry.id === match.id
                      ? {
                          ...entry,
                          chemistry: Math.min(100, Math.max(12, entry.chemistry + outcome.chemistryGain)),
                          chatHistory,
                          hasGoneOnDate: true,
                          officialStatus: 'SEEING',
                          dateCount: (entry.dateCount || 0) + 1,
                          scandalHeat: Math.max(0, (entry.scandalHeat || 0) + (inviteMode === 'PUBLIC' ? 20 : 6) + (isAffair ? 18 : 0)),
                          lastInteractionAbsolute: currentAbsoluteWeek,
                          inviteHistory: [...(entry.inviteHistory || []), { kind: inviteLabel, mode: inviteMode, outcome: 'SUCCESS' }],
                      }
                    : entry
            ),
        },
        news: [...newsItems, ...player.news].slice(0, 80),
        x: {
            ...player.x,
            feed: [...xPosts, ...player.x.feed].slice(0, 100),
        },
        logs: [
            {
                week: player.currentWeek,
                year: player.age,
                message: `💎 ${match.name} said yes to ${inviteMode === 'PRIVATE' ? 'a private' : 'a public'} ${inviteLabel.toLowerCase()} costing ${formatMoneyCompact(cost)}.`,
                type: 'positive' as const,
            },
            ...(isAffair
                ? [{ week: player.currentWeek, year: player.age, message: `⚠️ Rumors of an affair are beginning to spread.`, type: 'negative' as const }]
                : []),
            ...(isSameGenderPublic
                ? [{ week: player.currentWeek, year: player.age, message: `🗞️ Your public relationship is triggering intense identity speculation across fan spaces.`, type: 'neutral' as const }]
                : []),
            ...player.logs,
        ].slice(0, 80),
    };
};

const buildOfficialLuxeRelationshipPlayer = (
    player: Player,
    match: DatingMatch
): Player => {
    const newRelationship = createLuxeRelationship(player, match);
    return {
        ...player,
        dating: {
            ...player.dating,
            matches: player.dating.matches.filter(entry => entry.id !== match.id),
        },
        relationships: [...player.relationships.filter(rel => rel.npcId !== match.npcId), newRelationship],
        logs: [
            {
                week: player.currentWeek,
                year: player.age,
                message: `❤️ ${match.name} is now officially your partner.`,
                type: 'positive' as const,
            },
            ...player.logs,
        ].slice(0, 80),
    };
};

const createLuxeRelationship = (player: Player, match: DatingMatch): Relationship => ({
    id: `rel_${match.id}_${Date.now()}`,
    name: match.name,
    relation: 'Partner',
    closeness: Math.min(95, 64 + Math.floor((match.compatibility || match.chemistry) / 5)),
    image: match.image,
    lastInteractionWeek: player.currentWeek,
    lastInteractionAbsolute: getAbsoluteWeek(player.age, player.currentWeek),
    npcId: match.npcId,
    age: match.age,
    gender: match.gender,
});
