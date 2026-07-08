import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
    AlertTriangle,
    Award,
    BookOpen,
    Bookmark,
    BookmarkCheck,
    BadgeCheck,
    ChevronRight,
    Crosshair,
    Eye,
    FileSearch,
    Flame,
    Handshake,
    Library,
    LockKeyhole,
    Radar,
    Shield,
    Sparkles,
    Skull,
    TrendingUp,
    Users,
    X,
} from 'lucide-react';
import { Business, Player, RightsDealType, RightsOpportunity, RightsRarity, RightsSignal, StudioState } from '../../../../types';
import { normalizeStudioState } from '../../../../services/businessLogic';
import {
    commissionRightsScouting,
    getFeaturedRightsOpportunity,
    getRightsInvestigationQuote,
    normalizeRightsMarketState,
    resolveRightsInvestigationDecision,
    RIGHTS_MARKET_CYCLE_WEEKS,
    RIGHTS_MARKET_SCOUTED_CAPACITY,
    RIGHTS_SCOUTING_COST,
    startRightsInvestigation,
    toggleTrackedOpportunity,
} from '../../../../services/rightsMarket';
import {
    acceptRightsTerms,
    getLatestRightsNegotiation,
    getRightsOpportunityAction,
    getReservedRightsCapital,
    signRightsAgreement,
    startRightsNegotiation,
    submitRightsCounter,
    withdrawRightsNegotiation,
} from '../../../../services/rightsNegotiation';
import { generateRightsAcquisitionNews } from '../../../../services/newsLogic';
import { getPlayerLanguage, t } from '../../../../services/i18n';
import { spendPlayerEnergy } from '../../../../services/premiumLogic';
import { PHASE_ONE_ENERGY_COSTS } from '../../../../services/energyCosts';
import { RightsDealRoom } from './RightsDealRoom';

interface RightsMarketProps {
    player: Player;
    studio: Business;
    onUpdatePlayer: (player: Player) => void;
    embedded?: boolean;
    initialOpportunityId?: string;
    onInitialOpportunityConsumed?: () => void;
}

type RightsFilter = 'ALL' | 'AFFORDABLE' | 'HIGH_INTEREST' | 'EXPIRING' | 'TRACKED';

const FILTERS: { id: RightsFilter; labelKey: string }[] = [
    { id: 'ALL', labelKey: 'rightsMarket.filter.all' },
    { id: 'AFFORDABLE', labelKey: 'rightsMarket.filter.affordable' },
    { id: 'HIGH_INTEREST', labelKey: 'rightsMarket.filter.contested' },
    { id: 'EXPIRING', labelKey: 'rightsMarket.filter.expiring' },
    { id: 'TRACKED', labelKey: 'rightsMarket.filter.tracked' },
];

const EMBLEM_ICONS = {
    SHIELD: Shield,
    SKULL: Skull,
    FLAME: Flame,
    BOOK: BookOpen,
    LIBRARY: Library,
    AWARD: Award,
} as const;

const RARITY_STYLE: Record<RightsRarity, string> = {
    COMMON: 'border-zinc-600/60 bg-zinc-800/70 text-zinc-300',
    UNCOMMON: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    RARE: 'border-violet-500/50 bg-violet-500/10 text-violet-300',
    LEGENDARY: 'border-amber-400/60 bg-amber-400/10 text-amber-200',
};

const SIGNAL_TONE: Record<RightsSignal, string> = {
    LOW: 'text-emerald-300',
    MEDIUM: 'text-sky-300',
    HIGH: 'text-amber-300',
    EXTREME: 'text-rose-300',
};

const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
    if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
    return `$${value}`;
};

const formatLabel = (value: string) => value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

const weeksRemaining = (opportunity: RightsOpportunity, currentWeek: number) =>
    Math.max(0, opportunity.expiresAtWeek - currentWeek);

const investigationStatus = (opportunity: RightsOpportunity) => opportunity.investigationStatus || 'NONE';

const investigationWeeksRemaining = (opportunity: RightsOpportunity, currentWeek: number) =>
    Math.max(0, (opportunity.investigationCompletesWeek || currentWeek) - currentWeek);

const getStudioPrestige = (studio: Business) => Math.max(
    0,
    Math.min(100, Math.round(studio.stats?.brandHealth || studio.stats?.customerSatisfaction || 25)),
);

const Signal: React.FC<{ label: string; value: RightsSignal }> = ({ label, value }) => (
    <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.16em]">
        <span className="text-zinc-500">{label}</span>
        <span className={SIGNAL_TONE[value]}>{formatLabel(value)}</span>
    </div>
);

const REPORT_SIGNAL_WIDTH: Record<RightsSignal, string> = {
    LOW: '25%',
    MEDIUM: '50%',
    HIGH: '75%',
    EXTREME: '100%',
};

const ReportSignal: React.FC<{ label: string; value: RightsSignal }> = ({ label, value }) => (
    <div>
        <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.14em]">
            <span className="text-black/45">{label}</span>
            <span>{formatLabel(value)}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden bg-black/10">
            <div className="h-full bg-black" style={{ width: REPORT_SIGNAL_WIDTH[value] }} />
        </div>
    </div>
);

const RightsActionButton: React.FC<{
    action: ReturnType<typeof getRightsOpportunityAction>;
    onOpen: () => void;
}> = ({ action, onOpen }) => {
    const isAccepted = action.state === 'RESPONSE' && action.negotiation?.status === 'ACCEPTED';
    const isPositive = isAccepted || action.state === 'SIGNING' || action.state === 'COMPLETED';
    const isPending = action.state === 'PENDING';
    return (
        <button
            onClick={onOpen}
            disabled={action.state === 'COMPLETED'}
            className={`flex min-h-12 items-center justify-center gap-2 px-4 text-center text-[9px] font-black uppercase tracking-[0.14em] transition-colors ${
                isPositive
                    ? 'border border-emerald-800 bg-emerald-800 text-white shadow-[0_0_18px_rgba(6,95,70,0.18)]'
                    : isPending
                        ? 'border border-sky-900/30 bg-sky-900/10 text-sky-900'
                        : action.state === 'CLOSED'
                            ? 'border border-rose-900/30 bg-rose-900/5 text-rose-900'
                            : 'bg-black text-white hover:bg-amber-700'
            }`}
        >
            {isPositive ? <BadgeCheck size={15} /> : isPending ? <FileSearch size={15} /> : <Handshake size={15} />}
            {action.label}
        </button>
    );
};

export const RightsMarket: React.FC<RightsMarketProps> = ({ player, studio, onUpdatePlayer, embedded = false, initialOpportunityId, onInitialOpportunityConsumed }) => {
    const [filter, setFilter] = useState<RightsFilter>('ALL');
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [dealLeadId, setDealLeadId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const reduceMotion = useReducedMotion();
    const studioState = normalizeStudioState(studio.studioState, player.currentWeek);
    const prestige = getStudioPrestige(studio);
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

    const savedMarketSignature = JSON.stringify(studioState.rightsMarket || []);
    const savedNoticeSignature = JSON.stringify(studioState.rightsMarketNotices || []);
    const normalized = useMemo(() => normalizeRightsMarketState({
        opportunities: studioState.rightsMarket,
        notices: studioState.rightsMarketNotices,
        cycle: studioState.rightsMarketCycle,
        lastAdvanceWeek: studioState.lastRightsMarketAdvanceWeek,
        lastScoutingCycle: studioState.lastRightsScoutingCycle,
    }, {
        currentWeek: player.currentWeek,
        studioId: studio.id,
        studioBalance: studio.balance,
        studioPrestige: prestige,
    }), [
        player.currentWeek,
        prestige,
        savedMarketSignature,
        savedNoticeSignature,
        studio.balance,
        studio.id,
        studioState.lastRightsMarketAdvanceWeek,
        studioState.lastRightsScoutingCycle,
        studioState.rightsMarketCycle,
    ]);

    const normalizedMarketSignature = JSON.stringify(normalized.opportunities);
    const normalizedNoticeSignature = JSON.stringify(normalized.notices);

    useEffect(() => {
        const marketChanged = savedMarketSignature !== normalizedMarketSignature;
        const noticesChanged = savedNoticeSignature !== normalizedNoticeSignature;
        const metadataChanged = studioState.rightsMarketCycle !== normalized.cycle
            || studioState.lastRightsMarketAdvanceWeek !== normalized.lastAdvanceWeek;
        if (!marketChanged && !noticesChanged && !metadataChanged) return;

        const updatedStudio: Business = {
            ...studio,
            studioState: {
                ...studioState,
                rightsMarket: normalized.opportunities,
                rightsMarketCycle: normalized.cycle,
                lastRightsMarketAdvanceWeek: normalized.lastAdvanceWeek,
                lastRightsScoutingCycle: normalized.lastScoutingCycle,
                rightsMarketNotices: normalized.notices,
            },
        };
        onUpdatePlayer({
            ...player,
            businesses: player.businesses.map(business => business.id === studio.id ? updatedStudio : business),
        });
    }, [
        normalized.cycle,
        normalized.lastAdvanceWeek,
        normalized.lastScoutingCycle,
        normalizedMarketSignature,
        normalizedNoticeSignature,
        savedMarketSignature,
        savedNoticeSignature,
        studio.id,
        studioState.lastRightsMarketAdvanceWeek,
        studioState.rightsMarketCycle,
    ]);

    useEffect(() => {
        if (!selectedLeadId && !dealLeadId) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [dealLeadId, selectedLeadId]);

    const rightsStrategyEnergyCost = PHASE_ONE_ENERGY_COSTS.RIGHTS_STRATEGY_ACTION;
    const rightsSigningEnergyCost = PHASE_ONE_ENERGY_COSTS.RIGHTS_FINAL_SIGNING;
    const hasRightsStrategyEnergy = player.energy.current >= rightsStrategyEnergyCost;
    const hasRightsSigningEnergy = player.energy.current >= rightsSigningEnergyCost;

    const updateRightsState = (updates: Partial<StudioState>, balance = studio.balance, logMessage?: string, energyCost = 0) => {
        const updatedStudio: Business = {
            ...studio,
            balance,
            studioState: { ...studioState, ...updates },
        };
        const updatedPlayer: Player = {
            ...player,
            businesses: player.businesses.map(business => business.id === studio.id ? updatedStudio : business),
            logs: logMessage
                ? [...player.logs, {
                    week: player.currentWeek,
                    year: player.age,
                    message: logMessage,
                    type: 'neutral' as const,
                }].slice(-80)
                : player.logs,
        };
        if (energyCost > 0) spendPlayerEnergy(updatedPlayer, energyCost, 'Rights negotiation');
        onUpdatePlayer(updatedPlayer);
    };

    const handleToggleTrack = (opportunityId: string) => {
        const transition = toggleTrackedOpportunity(normalized.opportunities, opportunityId);
        if (!transition.changed) {
            setFeedback(
                transition.reason === 'TRACK_LIMIT'
                    ? 'Your intelligence desk can track only 3 active opportunities.'
                    : transition.reason === 'ACTIVE_INVESTIGATION'
                        ? 'An active investigation must remain on the Watch Desk.'
                        : 'That opportunity is no longer available.',
            );
            return;
        }
        const target = normalized.opportunities.find(item => item.id === opportunityId);
        const nowTracked = !target?.isTracked;
        updateRightsState({ rightsMarket: transition.opportunities }, studio.balance,
            `${nowTracked ? 'Tracking' : 'Stopped tracking'} rights opportunity: ${target?.title || 'Unknown IP'}.`);
        setFeedback(nowTracked ? 'Opportunity added to your watch desk.' : 'Opportunity removed from your watch desk.');
    };

    const handleCommissionScouting = () => {
        const transition = commissionRightsScouting({
            opportunities: normalized.opportunities,
            currentWeek: player.currentWeek,
            studioId: studio.id,
            studioBalance: studio.balance,
            studioPrestige: prestige,
            currentCycle: normalized.cycle,
            lastScoutingCycle: studioState.lastRightsScoutingCycle ?? -1,
        });

        if (!transition.changed) {
            const message = transition.reason === 'INSUFFICIENT_FUNDS'
                ? `Scouting requires ${formatCurrency(RIGHTS_SCOUTING_COST)}.`
                : transition.reason === 'ALREADY_SCOUTED'
                    ? 'Your scouts have already worked this industry cycle.'
                    : 'Your intelligence board is already at capacity.';
            setFeedback(message);
            return;
        }

        updateRightsState({
            rightsMarket: transition.opportunities,
            lastRightsScoutingCycle: normalized.cycle,
        }, studio.balance - transition.cost, 'Your studio commissioned new rights-market scouting.');
        setFeedback(`${transition.addedIds.length} fresh ${transition.addedIds.length === 1 ? 'lead' : 'leads'} reached your desk.`);
    };

    const handleStartInvestigation = (opportunityId: string) => {
        const transition = startRightsInvestigation({
            opportunities: normalized.opportunities,
            opportunityId,
            currentWeek: player.currentWeek,
            studioBalance: studio.balance,
        });
        if (!transition.changed) {
            const target = normalized.opportunities.find(item => item.id === opportunityId);
            const quote = target ? getRightsInvestigationQuote(target) : null;
            const messages = {
                INSUFFICIENT_FUNDS: quote ? `The Inside Report requires ${formatCurrency(quote.cost)}.` : 'Your studio cannot fund this report.',
                ACTIVE_LIMIT: 'Your intelligence team can investigate only 2 opportunities at once.',
                TRACK_LIMIT: 'Clear one Watch Desk slot before opening this investigation.',
                ALREADY_STARTED: 'This opportunity already has an active or completed report.',
                UNAVAILABLE: 'This opportunity is no longer available.',
                NOT_FOUND: 'The market file could not be found.',
            };
            setFeedback(messages[transition.reason || 'NOT_FOUND']);
            return;
        }

        const target = transition.opportunities.find(item => item.id === opportunityId);
        updateRightsState(
            { rightsMarket: transition.opportunities },
            studio.balance - transition.cost,
            `Inside Report commissioned for ${target?.title || 'a rights opportunity'} (${formatCurrency(transition.cost)}).`,
        );
        setFeedback(`Inside Report commissioned. Intelligence arrives in ${investigationWeeksRemaining(target!, player.currentWeek)}W.`);
    };

    const handleWalkAwayFromReport = (opportunityId: string) => {
        const transition = resolveRightsInvestigationDecision(
            normalized.opportunities,
            opportunityId,
            'WALK_AWAY',
            normalized.cycle,
        );
        if (!transition.changed) {
            setFeedback('The report is not ready for a decision yet.');
            return;
        }
        const target = normalized.opportunities.find(item => item.id === opportunityId);
        updateRightsState(
            { rightsMarket: transition.opportunities },
            studio.balance,
            `Walked away from ${target?.title || 'rights opportunity'}.`,
        );
        setFeedback('Opportunity dismissed for this market cycle.');
        setSelectedLeadId(null);
    };

    const negotiations = studioState.rightsNegotiations || [];
    const reservedCapital = getReservedRightsCapital(negotiations);

    const handleStartDeal = (opportunity: RightsOpportunity, dealType: RightsDealType, amount: number) => {
        if (!hasRightsStrategyEnergy) {
            setFeedback(`Need ${rightsStrategyEnergyCost} energy to submit a rights offer.`);
            return;
        }
        const transition = startRightsNegotiation({
            opportunity,
            negotiations,
            dealType,
            offerAmount: amount,
            currentWeek: player.currentWeek,
            studioBalance: studio.balance,
            studioPrestige: prestige,
        });
        if (!transition.changed) {
            const messages = {
                UNAVAILABLE: 'This IP is no longer open for offers.',
                DEAL_NOT_AVAILABLE: 'That deal structure is not available for this IP.',
                ACTIVE_NEGOTIATION: 'Your studio already has an open negotiation for this IP.',
                INVALID_OFFER: 'The owner will not consider an offer that far outside the deal range.',
                INSUFFICIENT_AVAILABLE_CAPITAL: 'Too much studio capital is already committed to other active offers.',
            };
            setFeedback(messages[transition.reason || 'UNAVAILABLE']);
            return;
        }
        updateRightsState(
            {
                rightsNegotiations: transition.negotiations,
                rightsMarket: normalized.opportunities.map(item => item.id === opportunity.id ? {
                    ...item,
                    isTracked: true,
                    expiresAtWeek: Math.max(item.expiresAtWeek, player.currentWeek + 5),
                } : item),
            },
            studio.balance,
            `Submitted a ${formatLabel(dealType)} offer for ${opportunity.title} at ${formatCurrency(amount)}.`,
            rightsStrategyEnergyCost,
        );
        setFeedback(`Offer delivered to ${opportunity.sellerName}. Response expected next week.`);
    };

    const handleCounterDeal = (negotiationId: string, amount: number) => {
        if (!hasRightsStrategyEnergy) {
            setFeedback(`Need ${rightsStrategyEnergyCost} energy to raise the rights offer.`);
            return;
        }
        const transition = submitRightsCounter({
            negotiations,
            negotiationId,
            amount,
            currentWeek: player.currentWeek,
            studioBalance: studio.balance,
        });
        if (!transition.changed) {
            setFeedback(
                transition.reason === 'ROUND_LIMIT'
                    ? 'The owner closed the bidding room after the final round.'
                    : transition.reason === 'INSUFFICIENT_AVAILABLE_CAPITAL'
                        ? 'Your studio cannot reserve enough capital for that offer.'
                        : 'That improved offer cannot be submitted.',
            );
            return;
        }
        updateRightsState({ rightsNegotiations: transition.negotiations }, studio.balance, `Raised the rights offer to ${formatCurrency(amount)}.`, rightsStrategyEnergyCost);
        setFeedback('Improved offer submitted. The owner responds next week.');
    };

    const handleAcceptDealTerms = (negotiationId: string) => {
        if (!hasRightsStrategyEnergy) {
            setFeedback(`Need ${rightsStrategyEnergyCost} energy to accept the rights terms.`);
            return;
        }
        const transition = acceptRightsTerms(negotiations, negotiationId);
        if (!transition.changed) {
            setFeedback('These terms are no longer available.');
            return;
        }
        updateRightsState({ rightsNegotiations: transition.negotiations }, studio.balance, 'Rights terms accepted. Contract prepared for signature.', rightsStrategyEnergyCost);
        setFeedback('Business Affairs prepared the final agreement.');
    };

    const handleWithdrawDeal = (negotiationId: string) => {
        const transition = withdrawRightsNegotiation(negotiations, negotiationId, language);
        if (!transition.changed) {
            setFeedback('This agreement can no longer be withdrawn.');
            return;
        }
        updateRightsState({ rightsNegotiations: transition.negotiations }, studio.balance, 'Studio withdrew from a rights negotiation.');
        setFeedback('Your studio left the table. Reserved capital has been released.');
        setDealLeadId(null);
    };

    const handleSignDeal = (opportunity: RightsOpportunity, negotiationId: string) => {
        if (!hasRightsSigningEnergy) {
            setFeedback(`Need ${rightsSigningEnergyCost} energy to sign the final rights agreement.`);
            return;
        }
        const transition = signRightsAgreement({
            negotiations,
            negotiationId,
            opportunity,
            currentWeek: player.currentWeek,
            studioBalance: studio.balance,
            studioName: studio.name,
            language,
        });
        if (!transition.changed || !transition.ownedRight) {
            setFeedback(transition.reason === 'INSUFFICIENT_FUNDS' ? 'The studio cannot fund the final contract.' : 'The agreement is not ready to sign.');
            return;
        }
        const updatedStudio: Business = {
            ...studio,
            balance: transition.balance,
            studioState: {
                ...studioState,
                rightsNegotiations: transition.negotiations,
                ownedRights: [...(studioState.ownedRights || []), transition.ownedRight],
                rightsMarket: normalized.opportunities.filter(item => item.id !== opportunity.id),
            },
        };
        const updatedPlayer: Player = {
            ...player,
            businesses: player.businesses.map(business => business.id === studio.id ? updatedStudio : business),
            news: [
                generateRightsAcquisitionNews(studio.name, opportunity.title, transition.ownedRight.dealType, player.currentWeek, player.age, language),
                ...(player.news || []),
            ],
            logs: [...player.logs, {
                week: player.currentWeek,
                year: player.age,
                message: `Signed ${formatLabel(transition.ownedRight.dealType)} agreement for ${opportunity.title} (${formatCurrency(transition.ownedRight.purchasePrice)}).`,
                type: 'positive' as const,
            }].slice(-80),
        };
        spendPlayerEnergy(updatedPlayer, rightsSigningEnergyCost, `Rights signing: ${opportunity.title}`);
        onUpdatePlayer(updatedPlayer);
        setFeedback(`${opportunity.title} added to Vault > Rights.`);
        setSelectedLeadId(null);
        setDealLeadId(null);
    };

    const opportunities = normalized.opportunities.filter(item => investigationStatus(item) !== 'DISMISSED');

    useEffect(() => {
        if (!initialOpportunityId) return;
        const target = opportunities.find(item => item.id === initialOpportunityId);
        if (target) {
            setSelectedLeadId(target.id);
            setDealLeadId(target.id);
        } else {
            setFeedback('That IP file has already closed or moved to the IP Library.');
        }
        onInitialOpportunityConsumed?.();
    }, [initialOpportunityId]);

    const featured = getFeaturedRightsOpportunity(opportunities);
    const tracked = opportunities.filter(item => item.isTracked);
    const latestNotice = normalized.notices[normalized.notices.length - 1];
    const selectedLead = opportunities.find(item => item.id === selectedLeadId);
    const selectedAction = selectedLead ? getRightsOpportunityAction(negotiations, selectedLead.id, language) : null;
    const dealLead = opportunities.find(item => item.id === dealLeadId);
    const dealNegotiation = dealLead ? getLatestRightsNegotiation(negotiations, dealLead.id) : undefined;
    const cycleWeeksRemaining = RIGHTS_MARKET_CYCLE_WEEKS - (player.currentWeek % RIGHTS_MARKET_CYCLE_WEEKS || 0);
    const alreadyScouted = studioState.lastRightsScoutingCycle === normalized.cycle;
    const scoutingAtCapacity = opportunities.length >= RIGHTS_MARKET_SCOUTED_CAPACITY;

    const visibleOpportunities = opportunities.filter(item => {
        if (item.id === featured?.id) return false;
        if (filter === 'AFFORDABLE') return item.askingPrice <= studio.balance;
        if (filter === 'HIGH_INTEREST') return item.rivalInterest === 'HIGH' || item.rivalInterest === 'EXTREME';
        if (filter === 'EXPIRING') return weeksRemaining(item, player.currentWeek) <= 2;
        if (filter === 'TRACKED') return item.isTracked;
        return true;
    });

    return (
        <div className={`relative min-h-full bg-[#050505] text-white ${embedded ? 'pb-8' : 'pb-24 md:pb-10'}`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.11),transparent_55%)]" />

            <section className={`relative border-b border-zinc-800/80 pb-5 ${embedded ? 'px-0 pt-1' : 'px-4 pt-4 md:px-6 md:pb-6'}`}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    {!embedded && (
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-amber-400">
                                <Radar size={14} /> Industry Intelligence
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tight md:text-4xl">Rights Market</h2>
                            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
                                Track forgotten IP, contested franchises, and valuable story worlds before rival studios move.
                            </p>
                        </div>
                    )}
                    {embedded && (
                        <div>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">
                                <Radar size={14} /> Intelligence Board
                            </div>
                            <p className="mt-2 max-w-xl text-xs leading-relaxed text-zinc-500">
                                Scout expiring IP, track rival interest, and commission an Inside Report before the market moves.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-stretch">
                        <div className="border border-zinc-800 bg-zinc-950 px-4 py-3">
                            <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">Studio Funds</span>
                            <span className="mt-1 block font-mono text-lg font-black text-emerald-300">{formatCurrency(studio.balance)}</span>
                        </div>
                        <div className="border border-zinc-800 bg-zinc-950 px-4 py-3">
                            <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">Next Cycle</span>
                            <span className="mt-1 block font-mono text-lg font-black">{cycleWeeksRemaining}W</span>
                        </div>
                        <button
                            onClick={handleCommissionScouting}
                            disabled={alreadyScouted || scoutingAtCapacity || studio.balance < RIGHTS_SCOUTING_COST}
                            className="col-span-2 flex min-h-14 items-center justify-center gap-2 border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-600 sm:col-auto"
                        >
                            <Crosshair size={15} />
                            {alreadyScouted ? 'Scouted This Cycle' : scoutingAtCapacity ? 'Desk At Capacity' : `Commission ${formatCurrency(RIGHTS_SCOUTING_COST)}`}
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {(feedback || latestNotice) && (
                        <motion.div
                            key={feedback || latestNotice?.id}
                            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-4 flex items-start justify-between gap-3 border-l-2 border-amber-400 bg-zinc-900/80 px-4 py-3 text-xs text-zinc-300"
                        >
                            <span>
                                {feedback || (latestNotice?.kind === 'EXPIRED'
                                    ? `${latestNotice.opportunityTitle} left the market before your studio acted.`
                                    : `${latestNotice?.opportunityTitle} enters its final week on the market.`)}
                            </span>
                            {feedback && (
                                <button onClick={() => setFeedback(null)} className="shrink-0 text-zinc-500 hover:text-white" aria-label="Dismiss notice">
                                    <X size={14} />
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            {tracked.length > 0 && (
                <section className={`relative border-b border-zinc-900 py-4 ${embedded ? 'px-0' : 'px-4 md:px-6'}`}>
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Watch Desk</h3>
                        <span className="font-mono text-[10px] text-zinc-600">{tracked.length}/3</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {tracked.map(item => (
                            (() => {
                                const negotiation = getLatestRightsNegotiation(negotiations, item.id);
                                const hasLiveDeal = negotiation && !['SIGNED', 'WITHDRAWN'].includes(negotiation.status);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => hasLiveDeal ? setDealLeadId(item.id) : setSelectedLeadId(item.id)}
                                        className="min-w-[210px] border border-zinc-800 bg-zinc-950 px-3 py-3 text-left transition-colors hover:border-amber-500/40"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="truncate text-xs font-black uppercase">{item.title}</span>
                                            {hasLiveDeal ? <Handshake size={14} className="shrink-0 text-emerald-300" /> : <BookmarkCheck size={14} className="shrink-0 text-amber-400" />}
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                                            <span className={hasLiveDeal ? 'text-emerald-300' : investigationStatus(item) === 'REPORT_READY' || investigationStatus(item) === 'PURSUIT_READY'
                                                ? 'text-amber-300'
                                                : investigationStatus(item) === 'INVESTIGATING'
                                                    ? 'text-sky-300'
                                                    : 'text-zinc-600'}>
                                                {hasLiveDeal
                                                    ? formatLabel(negotiation!.status)
                                                    : investigationStatus(item) === 'INVESTIGATING'
                                                        ? `Investigating · ${investigationWeeksRemaining(item, player.currentWeek)}W`
                                                        : investigationStatus(item) === 'REPORT_READY'
                                                            ? 'Report Ready'
                                                            : investigationStatus(item) === 'PURSUIT_READY'
                                                                ? 'Report Ready'
                                                                : `${weeksRemaining(item, player.currentWeek)}W left`}
                                            </span>
                                            {!hasLiveDeal && investigationStatus(item) === 'NONE' && (
                                                <span className={SIGNAL_TONE[item.rivalInterest]}>{formatLabel(item.rivalInterest)} rivals</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })()
                        ))}
                    </div>
                </section>
            )}

            <div className={`relative space-y-6 py-6 ${embedded ? 'px-0' : 'px-4 md:px-6'}`}>
                {featured && (
                    <motion.section
                        key={`${normalized.cycle}:${featured.id}`}
                        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        className={`relative overflow-hidden border bg-zinc-950 ${weeksRemaining(featured, player.currentWeek) <= 1 ? 'border-rose-500/60' : 'border-zinc-700'}`}
                        style={{ boxShadow: `0 24px 70px ${featured.accent}13` }}
                    >
                        <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: featured.accent }} />
                        <div className="pointer-events-none absolute right-[-60px] top-[-70px] h-56 w-56 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: featured.accent }} />
                        <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
                            <div className="p-5 pl-6 md:p-8 md:pl-9">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`border px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] ${RARITY_STYLE[featured.rarity]}`}>{featured.rarity} lead</span>
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Featured intelligence</span>
                                </div>

                                <div className="mt-6 flex items-start gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-white/10 bg-white/[0.04]" style={{ color: featured.accent }}>
                                        {React.createElement(EMBLEM_ICONS[featured.emblemKey], { size: 28, strokeWidth: 1.8 })}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{formatLabel(featured.archetype)}</p>
                                        <h3 className="mt-1 text-3xl font-black uppercase leading-none tracking-tight md:text-5xl">{featured.title}</h3>
                                        <p className="mt-3 text-sm font-bold uppercase tracking-widest text-zinc-500">{formatLabel(featured.primaryGenre)} · {formatLabel(featured.propertyType)}</p>
                                    </div>
                                </div>

                                <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 md:text-lg">{featured.shortPitch}</p>

                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                    <div className="border-l-2 border-emerald-400 bg-emerald-400/[0.05] px-4 py-3">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">Known upside</span>
                                        <p className="mt-1 text-sm font-bold text-zinc-200">{featured.visibleUpside}</p>
                                    </div>
                                    <div className="border-l-2 border-rose-400 bg-rose-400/[0.05] px-4 py-3">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-300">Public concern</span>
                                        <p className="mt-1 text-sm font-bold text-zinc-200">{featured.publicConcern}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-zinc-800 bg-black/35 p-5 md:p-7 lg:border-l lg:border-t-0">
                                <div className="grid grid-cols-2 gap-4 border-b border-zinc-800 pb-5">
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">Asking price</span>
                                        <p className="mt-1 font-mono text-2xl font-black">{formatCurrency(featured.askingPrice)}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">Window</span>
                                        <p className={`mt-1 font-mono text-2xl font-black ${weeksRemaining(featured, player.currentWeek) <= 1 ? 'text-rose-300' : 'text-white'}`}>{weeksRemaining(featured, player.currentWeek)}W</p>
                                    </div>
                                </div>
                                <div className="space-y-3 py-5">
                                    <Signal label="Fanbase" value={featured.fanbase} />
                                    <Signal label="Public risk" value={featured.publicRisk} />
                                    <Signal label="Rival interest" value={featured.rivalInterest} />
                                </div>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setSelectedLeadId(featured.id)}
                                        className="flex w-full items-center justify-center gap-2 bg-white px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-amber-300"
                                    >
                                        <Eye size={15} /> Open Lead
                                    </button>
                                    <button
                                        onClick={() => handleToggleTrack(featured.id)}
                                        className="flex w-full items-center justify-center gap-2 border border-zinc-700 bg-zinc-900 px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:border-amber-500/50 hover:text-amber-200"
                                    >
                                        {featured.isTracked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                                        {featured.isTracked ? 'Untrack' : 'Track Opportunity'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                )}

                <div className="flex gap-2 overflow-x-auto border-b border-zinc-800 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {FILTERS.map(option => (
                        <button
                            key={option.id}
                            onClick={() => setFilter(option.id)}
                            className={`shrink-0 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] transition-colors ${filter === option.id ? 'bg-amber-400 text-black' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}
                        >
                            {tr(option.labelKey)}
                        </button>
                    ))}
                </div>

                <section>
                    <div className="mb-4 flex items-end justify-between">
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight">Active Leads</h3>
                            <p className="mt-1 text-xs text-zinc-600">Public intelligence only. Move carefully.</p>
                        </div>
                        <span className="font-mono text-xs text-zinc-600">{visibleOpportunities.length}</span>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-2">
                        {visibleOpportunities.map(opportunity => {
                            const Emblem = EMBLEM_ICONS[opportunity.emblemKey];
                            const remaining = weeksRemaining(opportunity, player.currentWeek);
                            const action = getRightsOpportunityAction(negotiations, opportunity.id, language);
                            return (
                                <article key={opportunity.id} className={`group grid grid-cols-[auto_1fr_auto] gap-3 border p-4 transition-colors md:gap-4 md:p-5 ${
                                    action.state === 'RESPONSE' || action.state === 'SIGNING'
                                        ? 'border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_24px_rgba(16,185,129,0.08)]'
                                        : action.state === 'PENDING'
                                            ? 'border-sky-500/30 bg-sky-950/10'
                                            : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'
                                }`}>
                                    <div className="flex h-11 w-11 items-center justify-center border border-white/10 bg-white/[0.03]" style={{ color: opportunity.accent }}>
                                        <Emblem size={21} />
                                    </div>
                                    <button onClick={() => setSelectedLeadId(opportunity.id)} className="min-w-0 text-left">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="truncate text-base font-black uppercase tracking-tight">{opportunity.title}</h4>
                                            <span className={`border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest ${RARITY_STYLE[opportunity.rarity]}`}>{opportunity.rarity}</span>
                                            {investigationStatus(opportunity) !== 'NONE' && (
                                                <span className="border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-sky-200">
                                                    {investigationStatus(opportunity) === 'INVESTIGATING'
                                                        ? `${investigationWeeksRemaining(opportunity, player.currentWeek)}W Report`
                                                        : investigationStatus(opportunity) === 'REPORT_READY'
                                                            ? 'Report Ready'
                                                            : 'Pursuit Ready'}
                                                </span>
                                            )}
                                            {action.state !== 'AVAILABLE' && (
                                                <span className={`border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest ${
                                                    action.state === 'RESPONSE' || action.state === 'SIGNING'
                                                        ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
                                                        : action.state === 'PENDING'
                                                            ? 'border-sky-400/40 bg-sky-400/10 text-sky-200'
                                                            : 'border-rose-400/40 bg-rose-400/10 text-rose-200'
                                                }`}>{action.label}</span>
                                            )}
                                        </div>
                                        <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">{formatLabel(opportunity.archetype)} · {formatLabel(opportunity.primaryGenre)}</p>
                                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold">
                                            <span className="font-mono text-zinc-300">{formatCurrency(opportunity.askingPrice)}</span>
                                            <span className={remaining <= 1 ? 'text-rose-300' : 'text-zinc-500'}>{remaining}W left</span>
                                            <span className={SIGNAL_TONE[opportunity.rivalInterest]}>{formatLabel(opportunity.rivalInterest)} rivals</span>
                                        </div>
                                    </button>
                                    <div className="flex flex-col items-end justify-between gap-3">
                                        <button onClick={() => handleToggleTrack(opportunity.id)} className={`p-2 transition-colors ${opportunity.isTracked ? 'text-amber-400' : 'text-zinc-700 hover:text-zinc-300'}`} aria-label={opportunity.isTracked ? `Untrack ${opportunity.title}` : `Track ${opportunity.title}`}>
                                            {opportunity.isTracked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
                                        </button>
                                        <button onClick={() => setSelectedLeadId(opportunity.id)} className="p-2 text-zinc-700 transition-colors group-hover:text-white" aria-label={`Open ${opportunity.title}`}>
                                            <ChevronRight size={17} />
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {visibleOpportunities.length === 0 && (
                        <div className="border border-dashed border-zinc-800 py-14 text-center">
                            <Radar size={28} className="mx-auto text-zinc-800" />
                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">No leads match this filter</p>
                        </div>
                    )}
                </section>
            </div>

            <AnimatePresence>
                {selectedLead && (
                    <motion.div
                        className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 backdrop-blur-sm md:items-center md:p-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedLeadId(null)}
                        onWheel={event => event.stopPropagation()}
                        onTouchMove={event => event.stopPropagation()}
                    >
                        <motion.section
                            role="dialog"
                            aria-modal="true"
                            aria-label={`${selectedLead.title} public lead`}
                            initial={reduceMotion ? false : { y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={reduceMotion ? { opacity: 0 } : { y: 30, opacity: 0 }}
                            onClick={event => event.stopPropagation()}
                            className="flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden border border-zinc-300 bg-[#f4f0e6] text-[#171717] shadow-2xl md:max-h-[88dvh]"
                        >
                            <header className="flex shrink-0 items-center justify-between border-b border-black/15 px-5 py-4 md:px-7">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center bg-black text-white">
                                        {React.createElement(EMBLEM_ICONS[selectedLead.emblemKey], { size: 20 })}
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-black/45">Public rights lead</p>
                                        <p className="text-xs font-bold">File {selectedLead.id.slice(-7).toUpperCase()}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedLeadId(null)} className="flex h-10 w-10 items-center justify-center border border-black/15 transition-colors hover:bg-black hover:text-white" aria-label="Close lead sheet">
                                    <X size={19} />
                                </button>
                            </header>

                            {selectedLead.insideReport && ['REPORT_READY', 'PURSUIT_READY'].includes(investigationStatus(selectedLead)) ? (
                                <>
                                    <div className="overflow-y-auto px-5 py-6 md:px-8 md:py-8">
                                        <motion.div
                                            initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                                            className="relative overflow-hidden border-2 border-black px-5 py-6 md:px-7"
                                        >
                                            <div className="pointer-events-none absolute right-[-22px] top-[-16px] rotate-12 border-4 border-rose-800/65 px-4 py-2 text-xl font-black uppercase tracking-[0.16em] text-rose-800/65">
                                                Cleared
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-black">
                                                    <FileSearch size={22} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-[0.24em] text-black/45">Studio Intelligence</p>
                                                    <p className="text-lg font-black uppercase">The Inside Report</p>
                                                </div>
                                            </div>
                                            <h3 className="mt-8 max-w-lg text-4xl font-black uppercase leading-[0.9] tracking-tight md:text-6xl">{selectedLead.title}</h3>
                                            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-black/45">
                                                Confidential · File {selectedLead.id.slice(-7).toUpperCase()}
                                            </p>
                                        </motion.div>

                                        <motion.div
                                            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: reduceMotion ? 0 : 0.15 }}
                                            className="mt-5 grid grid-cols-2 gap-px border border-black/15 bg-black/15"
                                        >
                                            <div className="bg-[#f4f0e6] p-4">
                                                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-black/40">Estimated value</p>
                                                <p className="mt-2 font-mono text-lg font-black">
                                                    {formatCurrency(selectedLead.insideReport.estimatedValueLow)}–{formatCurrency(selectedLead.insideReport.estimatedValueHigh)}
                                                </p>
                                            </div>
                                            <div className="bg-[#f4f0e6] p-4">
                                                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-black/40">Seller ask</p>
                                                <p className="mt-2 font-mono text-lg font-black">{formatCurrency(selectedLead.askingPrice)}</p>
                                            </div>
                                        </motion.div>

                                        <motion.div
                                            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: reduceMotion ? 0 : 0.25 }}
                                            className="mt-5 grid gap-4 border-y border-black/15 py-5 sm:grid-cols-2"
                                        >
                                            <ReportSignal label="Audience loyalty" value={selectedLead.insideReport.audienceLoyalty} />
                                            <ReportSignal label="Commercial potential" value={selectedLead.insideReport.commercialPotential} />
                                            <ReportSignal label="Ownership risk" value={selectedLead.insideReport.ownershipRisk} />
                                            <ReportSignal label="Rival activity" value={selectedLead.insideReport.rivalActivity} />
                                        </motion.div>

                                        <motion.div
                                            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: reduceMotion ? 0 : 0.35 }}
                                            className="mt-5 border border-black/15 bg-black/[0.035] p-5"
                                        >
                                            <div className="flex items-center gap-2">
                                                <TrendingUp size={16} />
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/45">Recommended screen play</p>
                                            </div>
                                            <p className="mt-3 text-xl font-black uppercase">{formatLabel(selectedLead.insideReport.recommendedFormat)}</p>
                                        </motion.div>

                                        <motion.div
                                            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: reduceMotion ? 0 : 0.45 }}
                                            className="mt-4 grid gap-3 sm:grid-cols-2"
                                        >
                                            <div className="border-l-4 border-emerald-700 bg-emerald-900/[0.06] p-4">
                                                <div className="flex items-center gap-2 text-emerald-800">
                                                    <Sparkles size={15} />
                                                    <p className="text-[9px] font-black uppercase tracking-[0.18em]">Hidden advantage</p>
                                                </div>
                                                <p className="mt-3 text-sm font-bold leading-relaxed">{selectedLead.insideReport.hiddenAdvantage}</p>
                                            </div>
                                            <div className="border-l-4 border-rose-800 bg-rose-900/[0.06] p-4">
                                                <div className="flex items-center gap-2 text-rose-800">
                                                    <AlertTriangle size={15} />
                                                    <p className="text-[9px] font-black uppercase tracking-[0.18em]">Hidden danger</p>
                                                </div>
                                                <p className="mt-3 text-sm font-bold leading-relaxed">{selectedLead.insideReport.hiddenDanger}</p>
                                            </div>
                                        </motion.div>
                                    </div>

                                    <footer className="shrink-0 border-t border-black/15 bg-[#e9e3d5] p-4 md:px-7">
                                        <div className="grid grid-cols-2 gap-2">
                                            <RightsActionButton action={selectedAction!} onOpen={() => setDealLeadId(selectedLead.id)} />
                                            {selectedAction?.state === 'AVAILABLE' ? (
                                                <button
                                                    onClick={() => handleWalkAwayFromReport(selectedLead.id)}
                                                    className="flex min-h-12 items-center justify-center gap-2 border border-rose-900/30 px-3 text-[9px] font-black uppercase tracking-[0.12em] text-rose-900"
                                                >
                                                    <X size={14} /> Walk Away
                                                </button>
                                            ) : (
                                                <div className="flex min-h-12 items-center justify-center gap-2 border border-black/15 px-3 text-center text-[8px] font-black uppercase tracking-[0.12em] text-black/50">
                                                    <BadgeCheck size={14} /> Deal In Progress
                                                </div>
                                            )}
                                        </div>
                                    </footer>
                                </>
                            ) : (
                                <>
                                    <div className="overflow-y-auto px-5 py-6 md:px-8 md:py-8">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="border border-black/20 px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em]">{selectedLead.rarity}</span>
                                            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-black/45">{formatLabel(selectedLead.archetype)}</span>
                                        </div>
                                        <h3 className="mt-5 text-4xl font-black uppercase leading-[0.92] tracking-tight md:text-6xl">{selectedLead.title}</h3>
                                        <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-black/50">{formatLabel(selectedLead.primaryGenre)} · {formatLabel(selectedLead.propertyType)}</p>
                                        <p className="mt-7 text-lg font-medium leading-relaxed text-black/75">{selectedLead.shortPitch}</p>

                                        <div className="my-7 h-px bg-black/15" />

                                        <div className="grid gap-6 sm:grid-cols-2">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/40">Rights holder</p>
                                                <p className="mt-2 text-base font-black">{selectedLead.sellerName}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/40">Asking price</p>
                                                <p className="mt-2 font-mono text-2xl font-black">{formatCurrency(selectedLead.askingPrice)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/40">Why it is available</p>
                                                <p className="mt-2 text-sm font-semibold leading-relaxed">{selectedLead.availabilityReason}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/40">Market window</p>
                                                <p className="mt-2 text-sm font-black">{weeksRemaining(selectedLead, player.currentWeek)} weeks remaining</p>
                                            </div>
                                        </div>

                                        <div className="mt-7 grid gap-3 sm:grid-cols-2">
                                            <div className="border border-emerald-800/25 bg-emerald-900/[0.05] p-4">
                                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-800">Public opportunity</p>
                                                <p className="mt-2 text-sm font-bold leading-relaxed">{selectedLead.visibleUpside}</p>
                                            </div>
                                            <div className="border border-rose-800/25 bg-rose-900/[0.05] p-4">
                                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-800">Known concern</p>
                                                <p className="mt-2 text-sm font-bold leading-relaxed">{selectedLead.publicConcern}</p>
                                            </div>
                                        </div>

                                        <div className="mt-7 grid grid-cols-3 gap-2 border-y border-black/15 py-4 text-center">
                                            <div>
                                                <Users size={15} className="mx-auto text-black/35" />
                                                <p className="mt-2 text-[8px] font-black uppercase tracking-wider text-black/40">Fanbase</p>
                                                <p className="mt-1 text-xs font-black">{formatLabel(selectedLead.fanbase)}</p>
                                            </div>
                                            <div>
                                                <AlertTriangle size={15} className="mx-auto text-black/35" />
                                                <p className="mt-2 text-[8px] font-black uppercase tracking-wider text-black/40">Risk</p>
                                                <p className="mt-1 text-xs font-black">{formatLabel(selectedLead.publicRisk)}</p>
                                            </div>
                                            <div>
                                                <Crosshair size={15} className="mx-auto text-black/35" />
                                                <p className="mt-2 text-[8px] font-black uppercase tracking-wider text-black/40">Rivals</p>
                                                <p className="mt-1 text-xs font-black">{formatLabel(selectedLead.rivalInterest)}</p>
                                            </div>
                                        </div>

                                        {investigationStatus(selectedLead) === 'INVESTIGATING' && (
                                            <div className="mt-6 border-2 border-black bg-black p-5 text-white">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-300">Investigation active</p>
                                                        <p className="mt-2 text-xl font-black uppercase">Inside Report in progress</p>
                                                    </div>
                                                    <div className="font-mono text-3xl font-black text-sky-300">
                                                        {investigationWeeksRemaining(selectedLead, player.currentWeek)}W
                                                    </div>
                                                </div>
                                                <div className="mt-4 h-1.5 overflow-hidden bg-white/15">
                                                    <motion.div
                                                        className="h-full bg-sky-400"
                                                        initial={reduceMotion ? false : { width: 0 }}
                                                        animate={{
                                                            width: `${Math.max(15, Math.min(100, (
                                                                ((player.currentWeek - (selectedLead.investigationStartedWeek || player.currentWeek)) + 0.25)
                                                                / Math.max(1, (selectedLead.investigationCompletesWeek || player.currentWeek) - (selectedLead.investigationStartedWeek || player.currentWeek))
                                                            ) * 100))}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <footer className="shrink-0 border-t border-black/15 bg-[#e9e3d5] p-4 md:px-7">
                                        <div className="grid grid-cols-2 gap-2">
                                            <RightsActionButton action={selectedAction!} onOpen={() => setDealLeadId(selectedLead.id)} />
                                            {investigationStatus(selectedLead) === 'INVESTIGATING' ? (
                                                <div className="flex min-h-12 items-center justify-center gap-2 border border-black/15 bg-black/[0.04] px-3 text-center text-[8px] font-black uppercase tracking-[0.12em] text-black/50">
                                                    <LockKeyhole size={14} /> Report in {investigationWeeksRemaining(selectedLead, player.currentWeek)}W
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleStartInvestigation(selectedLead.id)}
                                                    className="flex min-h-12 items-center justify-center gap-2 border border-black/20 px-3 text-[8px] font-black uppercase tracking-[0.12em]"
                                                >
                                                    <FileSearch size={14} /> Inside Report
                                                </button>
                                            )}
                                        </div>
                                        {investigationStatus(selectedLead) !== 'INVESTIGATING' && investigationStatus(selectedLead) === 'NONE' && (
                                            <div className="mt-2 border border-black/15 bg-white/35 px-4 py-2 text-center">
                                                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-black/45">
                                                    Optional intelligence · {formatCurrency(getRightsInvestigationQuote(selectedLead).cost)} · {getRightsInvestigationQuote(selectedLead).durationWeeks}W
                                                </p>
                                            </div>
                                        )}
                                        {investigationStatus(selectedLead) === 'INVESTIGATING' ? (
                                            <div className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 border border-black/15 bg-black/[0.04] px-5 text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                                                <BookmarkCheck size={14} /> Tracked During Investigation
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleToggleTrack(selectedLead.id)}
                                                className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 border border-black/15 px-5 text-[9px] font-black uppercase tracking-[0.16em]"
                                            >
                                                {selectedLead.isTracked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                                                {selectedLead.isTracked ? 'Untrack Lead' : 'Track Lead'}
                                            </button>
                                        )}
                                    </footer>
                                </>
                            )}
                        </motion.section>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {dealLead && (
                    <RightsDealRoom
                        opportunity={dealLead}
                        negotiation={dealNegotiation}
                        studioBalance={studio.balance}
                        reservedCapital={reservedCapital}
                        onClose={() => setDealLeadId(null)}
                        onStart={(dealType, amount) => handleStartDeal(dealLead, dealType, amount)}
                        onCounter={(amount) => dealNegotiation && handleCounterDeal(dealNegotiation.id, amount)}
                        onAcceptTerms={() => dealNegotiation && handleAcceptDealTerms(dealNegotiation.id)}
                        onWithdraw={() => dealNegotiation && handleWithdrawDeal(dealNegotiation.id)}
	                        onSign={() => dealNegotiation && handleSignDeal(dealLead, dealNegotiation.id)}
                            energyAvailable={player.energy.current}
                            strategyEnergyCost={rightsStrategyEnergyCost}
                            signingEnergyCost={rightsSigningEnergyCost}
	                        language={language}
	                    />
                )}
            </AnimatePresence>
        </div>
    );
};
