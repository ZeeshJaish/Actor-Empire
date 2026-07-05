import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Player, DatingMatch, DatingPreferences, PregnancyCarrier } from '../../types';
import { generateTinderProfile, calculateSwipeSuccess } from '../../services/datingLogic';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { spendPlayerEnergy } from '../../services/premiumLogic';
import { getPregnancyCarrier, getPregnancyFeedbackCopy } from '../../services/familyLogic';
import { DatingPreferencesSheet, preferenceLabel } from './DatingPreferencesSheet';
import { getPlayerLanguage, t } from '../../services/i18n';
import { ArrowLeft, Flame, X, Heart, MessageCircle, Briefcase, Send, ChevronLeft, Calendar, Moon, Link2, Sparkles, SlidersHorizontal } from 'lucide-react';

interface TinderAppProps {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
    onDateSuccess?: (match: DatingMatch) => void;
    onTriggerBabyNaming?: (pending: {
        partnerId: string;
        partnerName: string;
        pregnancyCarrier?: PregnancyCarrier;
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

const TINDER_CHAT_TEMPLATE_KEYS = {
    CHAT_SMALL_TALK: [
        'dating.tinder.chat.smallTalk.0',
        'dating.tinder.chat.smallTalk.1',
        'dating.tinder.chat.smallTalk.2',
        'dating.tinder.chat.smallTalk.3',
        'dating.tinder.chat.smallTalk.4',
    ],
    CHAT_DEEP_TALK: [
        'dating.tinder.chat.deepTalk.0',
        'dating.tinder.chat.deepTalk.1',
        'dating.tinder.chat.deepTalk.2',
        'dating.tinder.chat.deepTalk.3',
        'dating.tinder.chat.deepTalk.4',
    ],
    CHAT_PLAYFUL: [
        'dating.tinder.chat.playful.0',
        'dating.tinder.chat.playful.1',
        'dating.tinder.chat.playful.2',
        'dating.tinder.chat.playful.3',
        'dating.tinder.chat.playful.4',
    ],
    FLIRT_COMPLIMENT: [
        'dating.tinder.chat.flirtCompliment.0',
        'dating.tinder.chat.flirtCompliment.1',
        'dating.tinder.chat.flirtCompliment.2',
        'dating.tinder.chat.flirtCompliment.3',
        'dating.tinder.chat.flirtCompliment.4',
    ],
    FLIRT_HEAT_CHECK: [
        'dating.tinder.chat.flirtHeatCheck.0',
        'dating.tinder.chat.flirtHeatCheck.1',
        'dating.tinder.chat.flirtHeatCheck.2',
        'dating.tinder.chat.flirtHeatCheck.3',
        'dating.tinder.chat.flirtHeatCheck.4',
    ],
    DATE: [
        'dating.tinder.chat.date.0',
        'dating.tinder.chat.date.1',
        'dating.tinder.chat.date.2',
        'dating.tinder.chat.date.3',
        'dating.tinder.chat.date.4',
    ],
    CASUAL_KEEP_CASUAL: [
        'dating.tinder.chat.casualKeepCasual.0',
        'dating.tinder.chat.casualKeepCasual.1',
        'dating.tinder.chat.casualKeepCasual.2',
        'dating.tinder.chat.casualKeepCasual.3',
        'dating.tinder.chat.casualKeepCasual.4',
    ],
    CASUAL_LATE_NIGHT: [
        'dating.tinder.chat.casualLateNight.0',
        'dating.tinder.chat.casualLateNight.1',
        'dating.tinder.chat.casualLateNight.2',
        'dating.tinder.chat.casualLateNight.3',
    ],
    OFFICIAL: [
        'dating.tinder.chat.official.0',
        'dating.tinder.chat.official.1',
        'dating.tinder.chat.official.2',
        'dating.tinder.chat.official.3',
        'dating.tinder.chat.official.4',
    ],
    MATCH_RESPONSES: [
        'dating.tinder.response.match.0',
        'dating.tinder.response.match.1',
        'dating.tinder.response.match.2',
        'dating.tinder.response.match.3',
        'dating.tinder.response.match.4',
    ],
    DEEP_RESPONSES: [
        'dating.tinder.response.deep.0',
        'dating.tinder.response.deep.1',
        'dating.tinder.response.deep.2',
        'dating.tinder.response.deep.3',
    ],
    PLAYFUL_RESPONSES: [
        'dating.tinder.response.playful.0',
        'dating.tinder.response.playful.1',
        'dating.tinder.response.playful.2',
        'dating.tinder.response.playful.3',
    ],
    FLIRT_HEAT_RESPONSES: [
        'dating.tinder.response.flirtHeat.0',
        'dating.tinder.response.flirtHeat.1',
        'dating.tinder.response.flirtHeat.2',
        'dating.tinder.response.flirtHeat.3',
    ],
    FLIRT_RESPONSES: [
        'dating.tinder.response.flirt.0',
        'dating.tinder.response.flirt.1',
        'dating.tinder.response.flirt.2',
        'dating.tinder.response.flirt.3',
        'dating.tinder.response.flirt.4',
    ],
    DATE_RESPONSES: [
        'dating.tinder.response.date.0',
        'dating.tinder.response.date.1',
        'dating.tinder.response.date.2',
        'dating.tinder.response.date.3',
        'dating.tinder.response.date.4',
    ],
    CASUAL_RESPONSES: [
        'dating.tinder.response.casual.0',
        'dating.tinder.response.casual.1',
        'dating.tinder.response.casual.2',
        'dating.tinder.response.casual.3',
        'dating.tinder.response.casual.4',
    ],
    OFFICIAL_RESPONSES: [
        'dating.tinder.response.official.0',
        'dating.tinder.response.official.1',
        'dating.tinder.response.official.2',
        'dating.tinder.response.official.3',
    ],
    REJECT_RESPONSES: [
        'dating.tinder.response.reject.0',
        'dating.tinder.response.reject.1',
        'dating.tinder.response.reject.2',
        'dating.tinder.response.reject.3',
        'dating.tinder.response.reject.4',
    ],
    GHOSTED_RESPONSES: [
        'dating.tinder.response.ghosted.0',
        'dating.tinder.response.ghosted.1',
        'dating.tinder.response.ghosted.2',
    ],
    HOOKUP_SUCCESS: [
        'dating.tinder.response.hookupSuccess.0',
        'dating.tinder.response.hookupSuccess.1',
        'dating.tinder.response.hookupSuccess.2',
    ],
    HOOKUP_FAIL: [
        'dating.tinder.response.hookupFail.0',
        'dating.tinder.response.hookupFail.1',
        'dating.tinder.response.hookupFail.2',
    ],
};

const CHAT_OPTION_COPY_KEYS: Record<Exclude<TinderChatVariant, 'COMPLIMENT' | 'HEAT_CHECK' | 'KEEP_CASUAL' | 'LATE_NIGHT'>, { labelKey: string; descriptionKey: string }> = {
    SMALL_TALK: { labelKey: 'dating.tinder.option.smallTalk.label', descriptionKey: 'dating.tinder.option.smallTalk.description' },
    DEEP_TALK: { labelKey: 'dating.tinder.option.deepTalk.label', descriptionKey: 'dating.tinder.option.deepTalk.description' },
    PLAYFUL: { labelKey: 'dating.tinder.option.playful.label', descriptionKey: 'dating.tinder.option.playful.description' },
};

const FLIRT_OPTION_COPY_KEYS: Record<'COMPLIMENT' | 'HEAT_CHECK', { labelKey: string; descriptionKey: string }> = {
    COMPLIMENT: { labelKey: 'dating.tinder.option.compliment.label', descriptionKey: 'dating.tinder.option.compliment.description' },
    HEAT_CHECK: { labelKey: 'dating.tinder.option.heatCheck.label', descriptionKey: 'dating.tinder.option.heatCheck.description' },
};

const CASUAL_OPTION_COPY_KEYS: Record<'KEEP_CASUAL' | 'LATE_NIGHT', { labelKey: string; descriptionKey: string }> = {
    KEEP_CASUAL: { labelKey: 'dating.tinder.option.keepCasual.label', descriptionKey: 'dating.tinder.option.keepCasual.description' },
    LATE_NIGHT: { labelKey: 'dating.tinder.option.lateNight.label', descriptionKey: 'dating.tinder.option.lateNight.description' },
};

const tinderStageKey = (stage?: DatingMatch['tinderStage']) => {
    switch (stage) {
        case 'TALKING':
            return 'dating.tinder.stage.talking';
        case 'CASUAL':
            return 'dating.tinder.stage.casual';
        case 'FWB':
            return 'dating.tinder.stage.fwb';
        case 'GHOSTED':
            return 'dating.tinder.stage.ghosted';
        case 'DATING':
            return 'dating.tinder.stage.dating';
        default:
            return 'dating.tinder.stage.matched';
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
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const pickTranslated = (keys: string[]) => tr(pick(keys));
    const getChatOptionCopy = (option: keyof typeof CHAT_OPTION_COPY_KEYS) => {
        const copy = CHAT_OPTION_COPY_KEYS[option];
        return { label: tr(copy.labelKey), description: tr(copy.descriptionKey) };
    };
    const getFlirtOptionCopy = (option: keyof typeof FLIRT_OPTION_COPY_KEYS) => {
        const copy = FLIRT_OPTION_COPY_KEYS[option];
        return { label: tr(copy.labelKey), description: tr(copy.descriptionKey) };
    };
    const getCasualOptionCopy = (option: keyof typeof CASUAL_OPTION_COPY_KEYS) => {
        const copy = CASUAL_OPTION_COPY_KEYS[option];
        return { label: tr(copy.labelKey), description: tr(copy.descriptionKey) };
    };
    const tinderStageLabel = (stage?: DatingMatch['tinderStage']) => tr(tinderStageKey(stage));
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
    const [showPreferencesSheet, setShowPreferencesSheet] = useState(false);
    const [recentTinderNames, setRecentTinderNames] = useState<string[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const replyTimeoutRef = useRef<number | null>(null);

    const currentAbsoluteWeek = useMemo(() => getAbsoluteWeek(player.age, player.currentWeek), [player.age, player.currentWeek]);
    const matches = player.dating.matches.filter(m => !m.isPremium);
    const activeChatMatch = matches.find(match => match.id === activeChatMatchId) || null;

    useEffect(() => {
        if (player.dating.isTinderActive) {
            setView(activeChatMatchId ? 'CHAT' : 'SWIPE');
            setCurrentProfile(generateTinderProfile(player.dating.preferences, {
                excludeNames: player.dating.matches.filter(match => !match.isPremium).map(match => match.name),
            }));
        }
    }, []);

    useEffect(() => {
        if (!showPreferencesSheet) {
            setPreferences(player.dating.preferences);
        }
    }, [
        player.dating.preferences.gender,
        player.dating.preferences.minAge,
        player.dating.preferences.maxAge,
        showPreferencesSheet,
    ]);

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

    const getMatchPregnancyCarrier = (match: DatingMatch) => getPregnancyCarrier(player.gender, match.gender);

    const buildPregnancyRequest = (match: DatingMatch, pregnancyCarrier: PregnancyCarrier) => {
        const babyGender = Math.random() > 0.5 ? 'MALE' : 'FEMALE';
        const suggestedFirstName = babyGender === 'MALE' ? 'Leo' : 'Mia';
        const activePartner = player.relationships.find(rel => (rel.relation === 'Partner' || rel.relation === 'Spouse') && rel.name !== match.name);

        return {
            partnerId: match.id,
            partnerName: match.name,
            pregnancyCarrier,
            babyGender,
            suggestedFirstName,
            birthWeekAbsolute: currentAbsoluteWeek + 39,
            eventWeek: player.currentWeek,
            eventYear: player.age,
            shouldCreateScandalNews: !!activePartner,
        };
    };

    const rememberTinderProfile = (profile: DatingMatch) => {
        setRecentTinderNames(prev => [profile.name, ...prev.filter(name => name !== profile.name)].slice(0, 24));
    };

    const getTinderProfileExclusions = () => {
        const matchedNames = player.dating.matches.filter(match => !match.isPremium).map(match => match.name);
        const currentName = currentProfile?.name ? [currentProfile.name] : [];
        const names = [...recentTinderNames, ...currentName, ...matchedNames];
        return {
            excludeNames: names,
            excludeFirstNames: names.map(name => name.split(/\s+/)[0]),
        };
    };

    const loadNewProfile = (nextPreferences = preferences) => {
        const nextProfile = generateTinderProfile(nextPreferences, getTinderProfileExclusions());
        setCurrentProfile(nextProfile);
        rememberTinderProfile(nextProfile);
        setLastSwipe(null);
    };

    const saveDatingPreferences = () => {
        onUpdatePlayer({
            ...player,
            dating: {
                ...player.dating,
                preferences,
            },
        });
        loadNewProfile(preferences);
        setShowPreferencesSheet(false);
        pushFeedback(tr('dating.preferences.tinderSaved', { preferences: preferenceLabel(preferences, language) }), 'success');
    };

    const updateMatch = (
        matchId: string,
        updater: (match: DatingMatch) => DatingMatch,
        options?: { energyCost?: number; mutatePlayer?: (nextPlayer: Player) => void }
    ) => {
        if ((options?.energyCost || 0) > player.energy.current) {
            pushFeedback(tr('dating.tinder.feedback.notEnoughEnergy'), 'error');
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
                    chatHistory: [{ sender: 'MATCH', text: pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.MATCH_RESPONSES) }],
                    tinderStage: 'MATCHED',
                    dateCount: 0,
                    intimacyCount: 0,
                    lastInteractionAbsolute: currentAbsoluteWeek,
                };

                onUpdatePlayer({
                    ...player,
                    dating: { ...player.dating, matches: [matchWithChat, ...player.dating.matches] },
                    logs: [
                        { week: player.currentWeek, year: player.age, message: tr('dating.tinder.log.matched', { name: matchWithChat.name }), type: 'positive' },
                        ...player.logs,
                    ].slice(0, 80),
                });
                pushFeedback(tr('dating.tinder.feedback.matched', { name: matchWithChat.name.split(' ')[0] }), 'success');
            } else {
                pushFeedback(tr('dating.tinder.feedback.noMatch'), 'neutral');
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
                playerText = pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.CHAT_DEEP_TALK);
                responseText = pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.DEEP_RESPONSES);
                chemistryDelta = 4;
                energyCost = TINDER_ENERGY_COSTS.DEEP_TALK;
            } else if (variant === 'PLAYFUL') {
                playerText = pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.CHAT_PLAYFUL);
                responseText = pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.PLAYFUL_RESPONSES);
                chemistryDelta = 3;
                energyCost = TINDER_ENERGY_COSTS.PLAYFUL;
            } else {
                playerText = pickTranslated(stage === 'GHOSTED' ? TINDER_CHAT_TEMPLATE_KEYS.GHOSTED_RESPONSES : TINDER_CHAT_TEMPLATE_KEYS.CHAT_SMALL_TALK);
                responseText = pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.MATCH_RESPONSES);
                chemistryDelta = 2;
                energyCost = TINDER_ENERGY_COSTS.SMALL_TALK;
            }
            if (stage === 'MATCHED') nextStage = 'TALKING';
        }

        if (action === 'FLIRT') {
            if (variant === 'HEAT_CHECK') {
                playerText = pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.FLIRT_HEAT_CHECK);
                responseText = pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.FLIRT_HEAT_RESPONSES);
                chemistryDelta = 5;
                energyCost = TINDER_ENERGY_COSTS.HEAT_CHECK;
            } else {
                playerText = pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.FLIRT_COMPLIMENT);
                responseText = pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.FLIRT_RESPONSES);
                chemistryDelta = 4;
                energyCost = TINDER_ENERGY_COSTS.COMPLIMENT;
            }
            if (stage === 'GHOSTED' && activeChatMatch.chemistry >= 65) nextStage = 'TALKING';
            if (stage === 'MATCHED') nextStage = 'TALKING';
        }

        if (action === 'DATE') {
            playerText = pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.DATE);
            const score = activeChatMatch.chemistry + (stage === 'TALKING' ? 10 : stage === 'CASUAL' ? 14 : stage === 'FWB' ? 12 : stage === 'GHOSTED' ? -12 : 0);
            const success = score >= 58 || Math.random() * 100 < score;
            responseText = success ? pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.DATE_RESPONSES) : pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.REJECT_RESPONSES);
            chemistryDelta = success ? 8 : -4;
            nextStage = success ? 'CASUAL' : (stage === 'FWB' ? 'FWB' : 'TALKING');
            energyCost = TINDER_ENERGY_COSTS.DATE;
            modal = {
                title: success ? tr('dating.tinder.modal.dateLocked.title') : tr('dating.tinder.modal.dateRejected.title'),
                body: success
                    ? tr('dating.tinder.modal.dateLocked.body', { name: activeChatMatch.name.split(' ')[0] })
                    : tr('dating.tinder.modal.dateRejected.body', { name: activeChatMatch.name.split(' ')[0] }),
                tone: success ? 'success' : 'neutral',
            };
        }

        if (action === 'CASUAL') {
            const isLateNight = variant === 'LATE_NIGHT';
            playerText = pickTranslated(isLateNight ? TINDER_CHAT_TEMPLATE_KEYS.CASUAL_LATE_NIGHT : TINDER_CHAT_TEMPLATE_KEYS.CASUAL_KEEP_CASUAL);
            const score = activeChatMatch.chemistry + ((activeChatMatch.dateCount || 0) * 10) + (stage === 'CASUAL' ? 12 : stage === 'FWB' ? 14 : 0) + (isLateNight ? 6 : 0);
            const success = score >= 62 || Math.random() * 100 < score;
            responseText = success ? pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.CASUAL_RESPONSES) : pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.REJECT_RESPONSES);
            chemistryDelta = success ? (isLateNight ? 7 : 5) : -3;
            nextStage = success ? (isLateNight && stage === 'CASUAL' ? 'FWB' : 'CASUAL') : (stage === 'FWB' ? 'FWB' : 'TALKING');
            energyCost = isLateNight ? TINDER_ENERGY_COSTS.LATE_NIGHT : TINDER_ENERGY_COSTS.KEEP_CASUAL;
            modal = {
                title: success ? (isLateNight ? tr('dating.tinder.modal.afterDark.title') : tr('dating.tinder.modal.casualThing.title')) : tr('dating.tinder.modal.tooSoon.title'),
                body: success
                    ? isLateNight
                        ? tr('dating.tinder.modal.afterDark.body', { name: activeChatMatch.name.split(' ')[0] })
                        : tr('dating.tinder.modal.casualThing.body', { name: activeChatMatch.name.split(' ')[0] })
                    : tr('dating.tinder.modal.tooSoon.body', { name: activeChatMatch.name.split(' ')[0] }),
                tone: success ? 'success' : 'neutral',
            };
        }

        if (action === 'OFFICIAL') {
            playerText = pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.OFFICIAL);
            const score = activeChatMatch.chemistry + ((activeChatMatch.dateCount || 0) * 12) + ((activeChatMatch.intimacyCount || 0) * 4) + (stage === 'CASUAL' ? 8 : stage === 'FWB' ? -4 : 0);
            officialSuccess = score >= 78 || Math.random() * 100 < score;
            responseText = officialSuccess ? pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.OFFICIAL_RESPONSES) : pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.REJECT_RESPONSES);
            chemistryDelta = officialSuccess ? 10 : -5;
            nextStage = officialSuccess ? 'DATING' : (stage === 'FWB' ? 'FWB' : 'CASUAL');
            energyCost = TINDER_ENERGY_COSTS.OFFICIAL;
            modal = {
                title: officialSuccess ? tr('dating.tinder.modal.officialNow.title') : tr('dating.tinder.modal.notReady.title'),
                body: officialSuccess
                    ? tr('dating.tinder.modal.officialNow.body', { name: activeChatMatch.name.split(' ')[0] })
                    : tr('dating.tinder.modal.notReady.body', { name: activeChatMatch.name.split(' ')[0] }),
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
        const playerText = tr('dating.tinder.chat.hookupPlayer');
        const responseText = success ? pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.HOOKUP_SUCCESS) : pickTranslated(TINDER_CHAT_TEMPLATE_KEYS.HOOKUP_FAIL);
        const immediateHistory = [...historyBase, { sender: 'PLAYER' as const, text: playerText, tag: tr('dating.tinder.action.hookUp') }];
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

        const pregnancyCarrier = getMatchPregnancyCarrier(activeChatMatch);
        const pregnancyTriggered = success && onTriggerBabyNaming && pregnancyCarrier !== 'NONE' && Math.random() < 0.12;
        const pregnancyFeedback = getPregnancyFeedbackCopy(pregnancyTriggered ? pregnancyCarrier : 'NONE', activeChatMatch.name, player);
        setResultModal({
            title: success ? (pregnancyTriggered ? tr('dating.tinder.modal.pregnancyConfirmed.title') : tr('dating.tinder.modal.hookupLocked.title')) : tr('dating.tinder.modal.killedMood.title'),
            body: success
                ? pregnancyTriggered
                    ? pregnancyFeedback.body
                    : pregnancyCarrier === 'NONE'
                        ? pregnancyFeedback.body
                        : tr('dating.tinder.modal.hookupLocked.body', { name: activeChatMatch.name.split(' ')[0] })
                : tr('dating.tinder.modal.killedMood.body', { name: activeChatMatch.name.split(' ')[0] }),
            tone: success ? 'success' : 'neutral',
        });

        if (pregnancyTriggered) {
            window.setTimeout(() => {
                onTriggerBabyNaming?.(buildPregnancyRequest(activeChatMatch, pregnancyCarrier));
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
                            {tr('dating.tinder.update')}
                        </div>
                        <h3 className="mt-4 text-2xl font-bold text-gray-900">{resultModal.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">{resultModal.body}</p>
                        <button
                            onClick={() => setResultModal(null)}
                            className="mt-5 w-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-3 text-sm font-bold text-white"
                        >
                            {tr('common.continue')}
                        </button>
                    </div>
                </div>
            )}

            {view === 'SETUP' && (
                <div className="flex-1 p-8 flex flex-col bg-gradient-to-br from-rose-500 to-orange-600 text-white overflow-y-auto custom-scrollbar">
                    <div className="flex-1 flex flex-col justify-center min-h-[500px]">
                        <div className="flex justify-center mb-6 drop-shadow-md"><Flame size={64} fill="white" /></div>
                        <h2 className="text-3xl font-bold text-center mb-2 drop-shadow-sm">{tr('dating.tinder.welcome')}</h2>
                        <p className="text-center text-white/90 mb-10 text-sm font-medium">{tr('dating.tinder.welcomeSub')}</p>

                        <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md space-y-8 shadow-xl border border-white/20">
                            <div>
	                                <label className="text-xs font-bold uppercase tracking-widest mb-3 block opacity-90">{tr('dating.preferences.interestedIn')}</label>
	                                <div className="flex bg-black/20 p-1 rounded-xl backdrop-blur-sm">
	                                    <button onClick={() => setPreferences({ ...preferences, gender: 'MALE' })} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${preferences.gender === 'MALE' ? 'bg-white text-rose-500 shadow-md' : 'text-white hover:bg-white/10'}`}>{tr('dating.preferences.gender.men')}</button>
	                                    <button onClick={() => setPreferences({ ...preferences, gender: 'FEMALE' })} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${preferences.gender === 'FEMALE' ? 'bg-white text-rose-500 shadow-md' : 'text-white hover:bg-white/10'}`}>{tr('dating.preferences.gender.women')}</button>
	                                    <button onClick={() => setPreferences({ ...preferences, gender: 'ALL' })} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${preferences.gender === 'ALL' ? 'bg-white text-rose-500 shadow-md' : 'text-white hover:bg-white/10'}`}>{tr('dating.preferences.gender.everyone')}</button>
	                                </div>
	                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-4">
	                                    <label className="text-xs font-bold uppercase tracking-widest opacity-90">{tr('dating.preferences.ageRange')}</label>
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
	                                        <div className="absolute top-[-8px] left-0 text-[10px] font-bold opacity-60 uppercase">{tr('dating.preferences.minAge')}</div>
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
	                                        <div className="absolute top-[-8px] right-0 text-[10px] font-bold opacity-60 uppercase">{tr('dating.preferences.maxAge')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 space-y-4">
                            <button onClick={handleSetupComplete} className="w-full bg-white text-rose-500 py-4 rounded-full font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                                {tr('dating.tinder.startSwiping')}
                            </button>
                            <button onClick={onBack} className="w-full text-white/70 text-sm font-bold hover:text-white transition-colors">{tr('x.cancel')}</button>
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
                        <div className="text-center text-xs text-gray-400 py-2">{tr('dating.tinder.chatHint')}</div>
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
                            <button onClick={() => setChatAction('CHAT')} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${chatAction === 'CHAT' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>{tr('dating.tinder.action.chat')}</button>
                            <button onClick={() => setChatAction('FLIRT')} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${chatAction === 'FLIRT' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{tr('dating.tinder.action.flirt')}</button>
                            <button onClick={() => setChatAction('DATE')} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${chatAction === 'DATE' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{tr('dating.tinder.action.date')}</button>
                            <button onClick={() => setChatAction('CASUAL')} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${chatAction === 'CASUAL' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{tr('dating.tinder.action.casual')}</button>
                            <button onClick={() => setChatAction('OFFICIAL')} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${chatAction === 'OFFICIAL' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{tr('dating.tinder.action.official')}</button>
                        </div>

                        {chatAction === 'CHAT' && (
                            <div className="grid grid-cols-1 gap-2">
                                {(['SMALL_TALK', 'DEEP_TALK', 'PLAYFUL'] as const).map((option) => {
                                    const copy = getChatOptionCopy(option);
                                    return (
                                    <button key={option} onClick={() => runChatAction('CHAT', option)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-left">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">{copy.label}</div>
                                                <div className="mt-1 text-xs text-gray-500">{copy.description}</div>
                                            </div>
                                            <EnergyBadge cost={TINDER_ENERGY_COSTS[option]} />
                                        </div>
                                    </button>
                                    );
                                })}
                            </div>
                        )}

                        {chatAction === 'FLIRT' && (
                            <div className="grid grid-cols-1 gap-2">
                                {(['COMPLIMENT', 'HEAT_CHECK'] as const).map((option) => {
                                    const copy = getFlirtOptionCopy(option);
                                    return (
                                    <button key={option} onClick={() => runChatAction('FLIRT', option)} className="rounded-2xl border border-pink-200 bg-pink-50 px-4 py-4 text-left">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">{copy.label}</div>
                                                <div className="mt-1 text-xs text-gray-500">{copy.description}</div>
                                            </div>
                                            <EnergyBadge cost={TINDER_ENERGY_COSTS[option]} tone="warm" />
                                        </div>
                                    </button>
                                    );
                                })}
                            </div>
                        )}

                        {chatAction === 'DATE' && (
                            <button onClick={() => runChatAction('DATE')} className="w-full rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4 text-left">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-bold text-gray-900">{tr('dating.tinder.option.askDate.label')}</div>
                                        <div className="mt-1 text-xs text-gray-500">{tr('dating.tinder.option.askDate.description')}</div>
                                    </div>
                                    <EnergyBadge cost={TINDER_ENERGY_COSTS.DATE} tone="warm" />
                                </div>
                            </button>
                        )}

                        {chatAction === 'CASUAL' && (
                            <div className="grid grid-cols-1 gap-2">
                                <div className="grid grid-cols-2 gap-2">
                                    {(['KEEP_CASUAL', 'LATE_NIGHT'] as const).map((option) => {
                                        const copy = getCasualOptionCopy(option);
                                        return (
                                        <button key={option} onClick={() => runChatAction('CASUAL', option)} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-left">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">{copy.label}</div>
                                                    <div className="mt-1 text-xs text-gray-500">{copy.description}</div>
                                                </div>
                                                <EnergyBadge cost={TINDER_ENERGY_COSTS[option]} tone="warm" />
                                            </div>
                                        </button>
                                        );
                                    })}
                                </div>
                                <button onClick={handleHookUp} className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-4 text-left">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                        <div className="text-sm font-bold text-gray-900">{tr('dating.tinder.option.intimacy.label')}</div>
                                            <div className="mt-1 text-xs text-gray-500">{tr('dating.tinder.option.intimacy.description')}</div>
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
                                        <div className="text-sm font-bold text-gray-900">{tr('dating.tinder.option.makeOfficial.label')}</div>
                                        <div className="mt-1 text-xs text-gray-500">{tr('dating.tinder.option.makeOfficial.description')}</div>
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
                        <div className="flex flex-col items-center gap-1">
                            <button onClick={() => setView('SWIPE')} className={`p-2 rounded-full ${view === 'SWIPE' ? 'text-pink-500' : 'text-gray-300'}`}><Flame size={28} fill={view === 'SWIPE' ? 'currentColor' : 'none'} /></button>
                            <button
                                onClick={() => setShowPreferencesSheet(true)}
                                className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-gray-500"
                            >
                                {preferenceLabel(preferences, language)}
                            </button>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setShowPreferencesSheet(true)} className="p-2 rounded-full text-gray-400 hover:bg-gray-100" aria-label={tr('dating.tinder.editFilters')}>
                                <SlidersHorizontal size={22} />
                            </button>
                            <button onClick={onBack} className="p-2 rounded-full text-gray-400 hover:bg-gray-100"><ArrowLeft size={24} /></button>
                        </div>
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
                                    {currentProfile.bio && (
                                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/75">
                                            {currentProfile.bio}
                                        </p>
                                    )}
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
                            <h3 className="text-pink-500 font-bold text-sm uppercase tracking-wider mb-4">{tr('dating.tinder.yourMatches', { count: matches.length })}</h3>
                            {matches.length === 0 ? (
                                <div className="text-center text-gray-400 mt-20">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Heart size={32} className="text-gray-300" /></div>
                                    <p>{tr('dating.tinder.noMatches')}</p>
                                    <button onClick={() => setView('SWIPE')} className="mt-4 text-pink-500 font-bold text-sm">{tr('dating.tinder.startSwiping')}</button>
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
            {showPreferencesSheet && (
                <DatingPreferencesSheet
                    preferences={preferences}
                    onChange={setPreferences}
                    onClose={() => {
                        setPreferences(player.dating.preferences);
                        setShowPreferencesSheet(false);
                    }}
                    onSave={saveDatingPreferences}
                    language={language}
                    tone="tinder"
                />
            )}
        </div>
    );
};
