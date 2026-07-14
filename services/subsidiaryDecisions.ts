import type {
    Business,
    LogEntry,
    GameLanguage,
    Message,
    NewsItem,
    Player,
    StudioFinanceEntry,
    StudioOperatingMandate,
    SubsidiaryDecision,
    SubsidiaryDecisionArc,
    SubsidiaryDecisionOption,
    SubsidiaryDecisionType,
    SubsidiaryPersonality,
    SubsidiaryProjectProposal,
    XPost,
} from '../types';
import { normalizeStudioState } from './businessLogic';
import {
    getMandateOptionLabel,
    getStudioOperatingMandate,
    isAcquiredStudio,
    performStudioTreasuryTransfer,
} from './studioGroup';
import { planSubsidiaryProject } from './subsidiaryOperations';
import { getPlayerLanguage, t } from './i18n';

const formatMoneyShort = (value: number) => {
    const safe = Math.max(0, Math.floor(Number(value) || 0));
    if (safe >= 1_000_000_000) return `$${(safe / 1_000_000_000).toFixed(1)}B`;
    if (safe >= 1_000_000) return `$${(safe / 1_000_000).toFixed(1)}M`;
    if (safe >= 1_000) return `$${(safe / 1_000).toFixed(0)}K`;
    return `$${safe}`;
};

const absoluteWeek = (year: number, week: number) => (year * 52) + week;

const futureWeek = (year: number, week: number, offset: number) => {
    let nextYear = year;
    let nextWeek = week + offset;
    while (nextWeek > 52) {
        nextWeek -= 52;
        nextYear += 1;
    }
    return { week: nextWeek, year: nextYear };
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const seedNumber = (seed: string) => {
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash);
};

const pickSeeded = <T,>(items: T[], seed: string): T => items[seedNumber(seed) % items.length];

const updateStudioOnPlayer = (player: Player, studio: Business): Player => ({
    ...player,
    businesses: player.businesses.map(candidate => candidate.id === studio.id ? studio : candidate),
});

const createDecisionOption = (
    language: GameLanguage,
    type: SubsidiaryDecisionType,
    id: SubsidiaryDecisionOption['id'],
    tone: SubsidiaryDecisionOption['tone'],
): SubsidiaryDecisionOption => {
    const title = getDecisionTitle(type, language);
    return {
        id,
        label: t(language, `services.subsidiaryDecisions.option.${id}.label`),
        description: t(language, `services.subsidiaryDecisions.option.${id}.description`, { title }),
        preview: t(language, `services.subsidiaryDecisions.option.${id}.preview`, { title }),
        tone,
    };
};

const getLocalizedMandateLabel = (
    language: GameLanguage,
    key: keyof StudioOperatingMandate,
    value: string | undefined,
) => getMandateOptionLabel(key, value, language).toLowerCase();

export const getSubsidiaryPersonality = (studio: Business): SubsidiaryPersonality => {
    if (studio.studioState?.subsidiaryPersonality) return studio.studioState.subsidiaryPersonality;
    const mandate = getStudioOperatingMandate(studio);

    if (
        mandate.releasePace === 'AGGRESSIVE'
        || (mandate.budgetAppetite === 'PREMIUM' && mandate.objective === 'COMMERCIAL_FIRST')
    ) {
        return 'Aggressive';
    }
    if (mandate.focus === 'FRANCHISE_EXPANSION' || mandate.ipStrategy === 'SEQUELS_REBOOTS' || mandate.ipStrategy === 'OWNED_IP') return 'Franchise-driven';
    if (mandate.focus === 'PRESTIGE_AWARDS' || mandate.objective === 'PRESTIGE_FIRST') return 'Prestige-focused';
    if (mandate.creativeAppetite === 'BOLD') return 'Experimental';
    if (mandate.creativeAppetite === 'SAFE' || mandate.budgetAppetite === 'LEAN') return 'Conservative';
    if (mandate.focus === 'SERIES_FIRST') return 'Streaming-first';
    return 'Commercial';
};

const getDecisionCadenceWeeks = (personality: SubsidiaryPersonality, seed: string) => {
    const spread = seedNumber(seed) % 9;
    const base = 8 + spread;
    if (personality === 'Aggressive' || personality === 'Experimental') return Math.max(8, base - 2);
    if (personality === 'Conservative') return Math.min(16, base + 2);
    return base;
};

const getDecisionPriority = (studio: Business, personality: SubsidiaryPersonality): SubsidiaryDecisionType => {
    const weeklyProfit = studio.stats.weeklyProfit || 0;
    const weeklyBurn = Math.max(0, (studio.stats.weeklyExpenses || 0) - (studio.stats.weeklyRevenue || 0), -weeklyProfit);
    const minimumOperatingCash = Math.max(40_000_000, (studio.stats.valuation || 0) * 0.04);
    const cashRunwayWeeks = weeklyBurn > 0 ? studio.balance / weeklyBurn : Number.POSITIVE_INFINITY;
    const underfunded = studio.balance < minimumOperatingCash || (weeklyBurn > 0 && cashRunwayWeeks < 16);
    if (underfunded) return 'EMERGENCY_CAPITAL';
    if ((studio.stats.recentFlopStreak || 0) >= 2) return 'FLOP_RESPONSE';
    const state = studio.studioState;
    const hasIpLane = !!(state?.ownedRights?.length || state?.purchasedIPTitles?.length);
    const mandate = getStudioOperatingMandate(studio);
    if (personality === 'Prestige-focused' && (studio.stats.investorConfidence || 0) >= 82 && studio.studioState?.operatingModel === 'CONTROLLED_SUBSIDIARY') return 'INDEPENDENCE_REQUEST';
    if (personality === 'Streaming-first' || mandate.focus === 'SERIES_FIRST') return 'PARTNERSHIP';
    if (personality === 'Franchise-driven' || mandate.focus === 'FRANCHISE_EXPANSION' || mandate.ipStrategy === 'SEQUELS_REBOOTS') return 'DORMANT_FRANCHISE';
    if (mandate.ipStrategy !== 'ORIGINALS' && hasIpLane) return 'RIGHTS_ACQUISITION';
    return 'RISKY_PRODUCTION';
};

const getDecisionTitle = (type: SubsidiaryDecisionType, language: GameLanguage) => (
    t(language, `services.subsidiaryDecisions.title.${type}`)
);

const createDecision = (player: Player, studio: Business): SubsidiaryDecision | null => {
    if (!isAcquiredStudio(studio) || studio.studioState?.operatingModel === 'FULL_MERGER') return null;
    const language = getPlayerLanguage(player);
    const personality = getSubsidiaryPersonality(studio);
    const type = getDecisionPriority(studio, personality);
    const mandate = getStudioOperatingMandate(studio);
    const amountBase = Math.max(18_000_000, Math.round((studio.stats.valuation || studio.balance || 0) * 0.06));
    const recommendedAmount = type === 'EMERGENCY_CAPITAL'
        ? Math.min(140_000_000, Math.max(35_000_000, amountBase))
        : type === 'RIGHTS_ACQUISITION'
            ? Math.min(90_000_000, Math.max(22_000_000, Math.round(amountBase * 0.62)))
            : type === 'RISKY_PRODUCTION'
                ? Math.min(220_000_000, Math.max(55_000_000, Math.round(amountBase * 1.15)))
                : undefined;
    const dormantFranchiseTitle = player.pastProjects.find(project => project.studioId === studio.id && project.franchiseId)?.name;
    const relatedTitle = type === 'RIGHTS_ACQUISITION'
        ? pickSeeded(['Moonfire Archive', 'Cobalt Legends', 'Neon Crown', 'Ashfall Universe'], `${studio.id}:${player.age}:${player.currentWeek}:rights`)
        : type === 'DORMANT_FRANCHISE'
            ? (dormantFranchiseTitle || pickSeeded(['Iron Eclipse', 'Solar Vow', 'Sentinel Zero', 'Crystal Guard'], `${studio.id}:${player.age}:${player.currentWeek}:franchise`))
        : undefined;
    const commonId = `${studio.id}_${player.age}_${player.currentWeek}_${seedNumber(`${studio.id}:${type}:${player.age}:${player.currentWeek}`)}`;

    const textVars = {
        studio: studio.name,
        title: getDecisionTitle(type, language),
        amount: formatMoneyShort(recommendedAmount || 0),
        personality,
        budgetAppetite: getLocalizedMandateLabel(language, 'budgetAppetite', mandate.budgetAppetite),
        releasePace: getLocalizedMandateLabel(language, 'releasePace', mandate.releasePace),
        balance: formatMoneyShort(studio.balance),
        weeklyResult: formatMoneyShort(studio.stats.weeklyProfit || 0),
        flopStreak: studio.stats.recentFlopStreak || 0,
        ipStrategy: getLocalizedMandateLabel(language, 'ipStrategy', mandate.ipStrategy),
        focus: getLocalizedMandateLabel(language, 'focus', mandate.focus),
        relatedTitle: relatedTitle || '',
        dormantFranchiseTitle: dormantFranchiseTitle || '',
        investorConfidence: studio.stats.investorConfidence || 0,
    };
    const declineTone: Record<SubsidiaryDecisionType, SubsidiaryDecisionOption['tone']> = {
        RISKY_PRODUCTION: 'negative',
        EMERGENCY_CAPITAL: 'negative',
        LEADERSHIP_CHANGE: 'negative',
        RIGHTS_ACQUISITION: 'neutral',
        DORMANT_FRANCHISE: 'neutral',
        PARTNERSHIP: 'neutral',
        FLOP_RESPONSE: 'negative',
        INDEPENDENCE_REQUEST: 'negative',
    };
    const copy: {
        summary: string;
        stakes: string[];
        logic: string[];
        followUp: SubsidiaryDecision['followUp'];
        options: SubsidiaryDecisionOption[];
    } = {
        summary: t(language, `services.subsidiaryDecisions.${type}.summary`, textVars),
        stakes: [1, 2, 3].map(index => t(language, `services.subsidiaryDecisions.stake.${index}`, textVars)),
        logic: [1, 2, 3].map(index => t(language, `services.subsidiaryDecisions.logic.${index}`, textVars)),
        followUp: {
            label: t(language, `services.subsidiaryDecisions.followUp.${type}.label`, textVars),
            effect: t(language, `services.subsidiaryDecisions.followUp.${type}.effect`, textVars),
        },
        options: [
            createDecisionOption(language, type, 'APPROVE', 'positive'),
            createDecisionOption(language, type, 'DECLINE', declineTone[type]),
        ],
    };
    return {
        id: `sub_decision_${commonId}`,
        studioId: studio.id,
        studioName: studio.name,
        type,
        status: 'PENDING',
        title: getDecisionTitle(type, language),
        summary: copy.summary,
        personality,
        recommendedAmount,
        relatedTitle,
        followUp: copy.followUp,
        stakes: copy.stakes,
        logic: copy.logic,
        options: copy.options,
        createdWeek: player.currentWeek,
        createdYear: player.age,
        dueWeek: player.currentWeek + 8,
    };
};

const createDecisionMedia = (
    language: GameLanguage,
    {
        player,
        studio,
        decision,
        action,
    }: {
        player: Player;
        studio: Business;
        decision: SubsidiaryDecision;
        action: 'CREATED' | 'APPROVE' | 'DECLINE';
    },
): Player => {
    const vars = {
        studio: studio.name,
        title: decision.title,
        personality: decision.personality,
        summary: decision.outcomeSummary || decision.summary,
        followUp: decision.followUp?.effect || '',
        amount: decision.recommendedAmount ? formatMoneyShort(decision.recommendedAmount) : '',
    };
    const newsItem: NewsItem = {
        id: `news_sub_decision_${decision.id}_${action}`,
        headline: t(language, 'services.subsidiaryDecisions.media.news.headline', { ...vars, action: t(language, `services.subsidiaryDecisions.media.action.${action}`) }),
        subtext: action === 'CREATED'
            ? t(language, 'services.subsidiaryDecisions.media.news.createdSubtext', vars)
            : t(language, decision.followUp ? 'services.subsidiaryDecisions.media.news.resolvedFollowUpSubtext' : 'services.subsidiaryDecisions.media.news.resolvedSubtext', vars),
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: action === 'DECLINE' ? 'LOW' : 'MEDIUM',
    };
    const nextPlayer: Player = {
        ...player,
        news: [newsItem, ...(player.news || [])].slice(0, 80),
    };
    if (nextPlayer.x?.feed) {
        const post: XPost = {
            id: `x_sub_decision_${decision.id}_${action}`,
            authorId: 'studio_board_watch',
            authorName: t(language, 'services.subsidiaryDecisions.media.social.authorName'),
            authorHandle: '@boardwatch',
            authorAvatar: 'HQ',
            content: action === 'CREATED'
                ? t(language, 'services.subsidiaryDecisions.media.social.created', vars)
                : t(language, decision.recommendedAmount ? 'services.subsidiaryDecisions.media.social.resolvedAmount' : 'services.subsidiaryDecisions.media.social.resolvedGovernance', { ...vars, action: t(language, `services.subsidiaryDecisions.media.action.${action}`) }),
            timestamp: player.currentWeek,
            likes: action === 'CREATED' ? 1200 : action === 'APPROVE' ? 3400 : 900,
            retweets: action === 'CREATED' ? 90 : action === 'APPROVE' ? 260 : 64,
            replies: action === 'DECLINE' ? 180 : 120,
            isPlayer: false,
            isLiked: false,
            isRetweeted: false,
            isVerified: true,
            postType: 'FILM_OPINION',
            sentiment: action === 'DECLINE' ? 'NEUTRAL' : 'INDUSTRY',
        };
        nextPlayer.x.feed = [post, ...nextPlayer.x.feed].slice(0, 80);
    }
    return nextPlayer;
};

const getArcTone = (
    decision: SubsidiaryDecision,
    optionId: SubsidiaryDecisionOption['id'],
): SubsidiaryDecisionOption['tone'] => {
    const selected = decision.options.find(option => option.id === optionId);
    if (selected) return selected.tone;
    return optionId === 'APPROVE' ? 'positive' : 'neutral';
};

const getArcTitle = (
    decision: SubsidiaryDecision,
    optionId: SubsidiaryDecisionOption['id'],
    language: GameLanguage,
) => t(language, `services.subsidiaryDecisions.arc.title.${decision.type}.${optionId}`);

const buildArcBeats = (
    player: Player,
    decision: SubsidiaryDecision,
    optionId: SubsidiaryDecisionOption['id'],
    language: GameLanguage,
): SubsidiaryDecisionArc['beats'] => {
    const firstPulse = futureWeek(player.age, player.currentWeek, 4);
    const secondPulse = futureWeek(player.age, player.currentWeek, 10);
    const label = decision.followUp?.label || getArcTitle(decision, optionId, language);
    const positive = optionId === 'APPROVE';

    const firstEffect = positive
        ? decision.followUp?.effect || t(language, 'services.subsidiaryDecisions.arc.effect.approvedFallback')
        : t(language, 'services.subsidiaryDecisions.arc.effect.declinedFirst', { title: decision.title });
    const secondEffect = positive
        ? t(language, 'services.subsidiaryDecisions.arc.effect.approvedSecond', { label: label.toLowerCase() })
        : t(language, 'services.subsidiaryDecisions.arc.effect.declinedSecond', { label: label.toLowerCase() });

    return [
        {
            label,
            effect: firstEffect,
            pulseWeek: firstPulse.week,
            pulseYear: firstPulse.year,
        },
        {
            label: t(language, positive ? 'services.subsidiaryDecisions.arc.beat.industryReadout' : 'services.subsidiaryDecisions.arc.beat.pressureReadout'),
            effect: secondEffect,
            pulseWeek: secondPulse.week,
            pulseYear: secondPulse.year,
        },
    ];
};

const createDecisionArc = (
    player: Player,
    studio: Business,
    decision: SubsidiaryDecision,
    optionId: SubsidiaryDecisionOption['id'],
    outcomeSummary: string,
    language: GameLanguage,
): SubsidiaryDecisionArc | null => {
    if (!decision.followUp && optionId !== 'DECLINE') return null;
    const beats = buildArcBeats(player, decision, optionId, language);
    return {
        id: `sub_arc_${decision.id}_${optionId.toLowerCase()}`,
        studioId: studio.id,
        studioName: studio.name,
        sourceDecisionId: decision.id,
        sourceDecisionType: decision.type,
        title: getArcTitle(decision, optionId, language),
        summary: outcomeSummary || decision.summary,
        tone: getArcTone(decision, optionId),
        status: 'ACTIVE',
        beats,
        beatsResolved: 0,
        nextPulseWeek: beats[0]?.pulseWeek,
        nextPulseYear: beats[0]?.pulseYear,
        createdWeek: player.currentWeek,
        createdYear: player.age,
    };
};

const attachDecisionArc = (
    player: Player,
    studio: Business,
    decision: SubsidiaryDecision,
    optionId: SubsidiaryDecisionOption['id'],
    outcomeSummary: string,
    language: GameLanguage,
): Business => {
    const studioState = normalizeStudioState(studio.studioState, player.currentWeek);
    const arc = createDecisionArc(player, studio, decision, optionId, outcomeSummary, language);
    if (!arc) return studio;
    const existingArcs = studioState.activeDecisionArcs || [];
    if (existingArcs.some(candidate => candidate.id === arc.id)) return studio;

    return {
        ...studio,
        studioState: {
            ...studioState,
            activeDecisionArcs: [arc, ...existingArcs].slice(0, 12),
        },
    };
};

const getArcStatImpact = (arc: SubsidiaryDecisionArc) => {
    const approved = arc.tone === 'positive';
    if (arc.sourceDecisionType === 'PARTNERSHIP') {
        return approved
            ? { studioMomentum: 2, investorConfidence: 2, hype: 1 }
            : { studioMomentum: -1, investorConfidence: -1 };
    }
    if (arc.sourceDecisionType === 'DORMANT_FRANCHISE') {
        return approved
            ? { studioMomentum: 3, hype: 3, investorConfidence: 1 }
            : { studioMomentum: -1, hype: -2 };
    }
    if (arc.sourceDecisionType === 'FLOP_RESPONSE') {
        return approved
            ? { studioMomentum: 2, investorConfidence: 2, brandHealth: 1 }
            : { investorConfidence: -2, studioMomentum: -1 };
    }
    if (arc.sourceDecisionType === 'INDEPENDENCE_REQUEST') {
        return approved
            ? { brandHealth: 2, investorConfidence: 1, studioMomentum: 1 }
            : { brandHealth: -1, investorConfidence: -1 };
    }
    if (arc.sourceDecisionType === 'EMERGENCY_CAPITAL') {
        return approved
            ? { investorConfidence: 2, brandHealth: 1 }
            : { investorConfidence: -2, brandHealth: -1 };
    }
    if (arc.sourceDecisionType === 'RIGHTS_ACQUISITION') {
        return approved
            ? { studioMomentum: 2, hype: 1 }
            : { hype: -1 };
    }
    if (arc.sourceDecisionType === 'LEADERSHIP_CHANGE') {
        return approved
            ? { investorConfidence: 2, studioMomentum: 1 }
            : { investorConfidence: -1 };
    }
    return approved
        ? { studioMomentum: 2, hype: 1 }
        : { studioMomentum: -1 };
};

const applyArcStatImpact = (studio: Business, arc: SubsidiaryDecisionArc): Business => {
    const impact = getArcStatImpact(arc);
    return {
        ...studio,
        stats: {
            ...studio.stats,
            studioMomentum: clamp((studio.stats.studioMomentum || 50) + (impact.studioMomentum || 0)),
            investorConfidence: clamp((studio.stats.investorConfidence || 50) + (impact.investorConfidence || 0)),
            brandHealth: clamp((studio.stats.brandHealth || 50) + (impact.brandHealth || 0)),
            hype: clamp((studio.stats.hype || 50) + (impact.hype || 0)),
        },
    };
};

const createArcPulseMedia = (
    player: Player,
    studio: Business,
    arc: SubsidiaryDecisionArc,
    beat: SubsidiaryDecisionArc['beats'][number],
): Player => {
    const language = getPlayerLanguage(player);
    const newsItem: NewsItem = {
        id: `news_sub_arc_${arc.id}_${arc.beatsResolved}_${player.age}_${player.currentWeek}`,
        headline: t(language, 'services.subsidiaryDecisions.arc.news.headline', { studio: studio.name, title: arc.title }),
        subtext: t(language, 'services.subsidiaryDecisions.arc.news.subtext', { label: beat.label, effect: beat.effect }),
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: arc.tone === 'negative' ? 'LOW' : 'MEDIUM',
    };
    const logEntry: LogEntry = {
        week: player.currentWeek,
        year: player.age,
        message: t(language, 'services.subsidiaryDecisions.arc.log.advanced', { studio: studio.name, title: arc.title, label: beat.label }),
        type: arc.tone === 'negative' ? 'neutral' : 'positive',
    };
    const nextPlayer: Player = {
        ...player,
        news: [newsItem, ...(player.news || [])].slice(0, 80),
        logs: [logEntry, ...(player.logs || [])].slice(0, 50),
    };
    if (nextPlayer.x?.feed) {
        const post: XPost = {
            id: `x_sub_arc_${arc.id}_${arc.beatsResolved}_${player.age}_${player.currentWeek}`,
            authorId: 'studio_board_watch',
            authorName: t(language, 'services.subsidiaryDecisions.media.social.authorName'),
            authorHandle: '@boardwatch',
            authorAvatar: 'HQ',
            content: t(language, 'services.subsidiaryDecisions.arc.social.update', { studio: studio.name, title: arc.title, effect: beat.effect }),
            timestamp: player.currentWeek,
            likes: arc.tone === 'positive' ? 2600 : 1100,
            retweets: arc.tone === 'positive' ? 190 : 72,
            replies: arc.tone === 'negative' ? 210 : 96,
            isPlayer: false,
            isLiked: false,
            isRetweeted: false,
            isVerified: true,
            postType: 'FILM_OPINION',
            sentiment: arc.tone === 'negative' ? 'NEUTRAL' : 'INDUSTRY',
        };
        nextPlayer.x.feed = [post, ...nextPlayer.x.feed].slice(0, 80);
    }
    return nextPlayer;
};

const advanceDecisionArcsForStudio = (player: Player, studio: Business): { player: Player; studio: Business } => {
    const studioState = normalizeStudioState(studio.studioState, player.currentWeek);
    const arcs = studioState.activeDecisionArcs || [];
    if (!arcs.some(arc => arc.status === 'ACTIVE' && arc.nextPulseWeek && arc.nextPulseYear)) {
        return { player, studio: { ...studio, studioState } };
    }

    let nextPlayer = player;
    let nextStudio: Business = { ...studio, studioState };
    const currentAbsolute = absoluteWeek(player.age, player.currentWeek);
    const updatedArcs: SubsidiaryDecisionArc[] = arcs.map(arc => {
        if (arc.status !== 'ACTIVE' || !arc.nextPulseWeek || !arc.nextPulseYear) return arc;
        if (currentAbsolute < absoluteWeek(arc.nextPulseYear, arc.nextPulseWeek)) return arc;

        const beatIndex = Math.min(arc.beatsResolved || 0, arc.beats.length - 1);
        const beat = arc.beats[beatIndex];
        if (!beat) return arc;

        nextStudio = applyArcStatImpact(nextStudio, arc);
        nextPlayer = createArcPulseMedia(nextPlayer, nextStudio, arc, beat);

        const beatsResolved = beatIndex + 1;
        const nextBeat = arc.beats[beatsResolved];
        return {
            ...arc,
            beatsResolved,
            beats: arc.beats.map((candidate, index) => (
                index === beatIndex
                    ? { ...candidate, resolvedWeek: player.currentWeek, resolvedYear: player.age }
                    : candidate
            )),
            status: nextBeat ? 'ACTIVE' : 'COMPLETED',
            nextPulseWeek: nextBeat?.pulseWeek,
            nextPulseYear: nextBeat?.pulseYear,
            completedWeek: nextBeat ? arc.completedWeek : player.currentWeek,
            completedYear: nextBeat ? arc.completedYear : player.age,
        };
    });

    return {
        player: nextPlayer,
        studio: {
            ...nextStudio,
            studioState: {
                ...normalizeStudioState(nextStudio.studioState, player.currentWeek),
                activeDecisionArcs: updatedArcs,
            },
        },
    };
};

export const processSubsidiaryDecisionEngine = (player: Player): Player => {
    let nextPlayer = player;
    const currentAbsolute = absoluteWeek(player.age, player.currentWeek);

    nextPlayer.businesses.forEach(studio => {
        if (!studio.studioState || !isAcquiredStudio(studio) || studio.studioState.operatingModel === 'FULL_MERGER') return;
        const arcResult = advanceDecisionArcsForStudio(nextPlayer, studio);
        nextPlayer = arcResult.player;
        if (arcResult.studio !== studio) {
            nextPlayer = updateStudioOnPlayer({ ...nextPlayer }, arcResult.studio);
        }
        const currentStudio = nextPlayer.businesses.find(candidate => candidate.id === studio.id) || arcResult.studio;
        const studioState = normalizeStudioState(currentStudio.studioState, player.currentWeek);
        if ((studioState.subsidiaryDecisions || []).some(decision => decision.status === 'PENDING')) return;

        const personality = getSubsidiaryPersonality({ ...studio, studioState });
        const cadence = getDecisionCadenceWeeks(personality, `${studio.id}:${player.age}`);
        const lastAbsolute = typeof studioState.lastSubsidiaryDecisionWeek === 'number' && typeof studioState.lastSubsidiaryDecisionYear === 'number'
            ? absoluteWeek(studioState.lastSubsidiaryDecisionYear, studioState.lastSubsidiaryDecisionWeek)
            : absoluteWeek(studioState.acquiredYear || player.age, studioState.acquiredWeek || Math.max(1, player.currentWeek - cadence));

        if (currentAbsolute - lastAbsolute < cadence) return;
        const decision = createDecision(nextPlayer, { ...currentStudio, studioState });
        if (!decision) return;

        const updatedStudio: Business = {
            ...currentStudio,
            studioState: {
                ...studioState,
                subsidiaryPersonality: personality,
                subsidiaryDecisions: [
                    decision,
                    ...(studioState.subsidiaryDecisions || []),
                ].slice(0, 16),
                lastSubsidiaryDecisionWeek: player.currentWeek,
                lastSubsidiaryDecisionYear: player.age,
            },
        };
        nextPlayer = updateStudioOnPlayer({ ...nextPlayer }, updatedStudio);
        const language = getPlayerLanguage(nextPlayer);
        const message: Message = {
            id: `msg_sub_decision_${decision.id}`,
            sender: t(language, 'services.subsidiaryDecisions.inbox.sender', { studio: studio.name }),
            subject: t(language, 'services.subsidiaryDecisions.inbox.subject', { title: decision.title }),
            text: t(language, 'services.subsidiaryDecisions.inbox.text', {
                summary: decision.summary,
                stakes: decision.stakes.join(' '),
            }),
            type: 'SYSTEM',
            data: {
                studioId: studio.id,
                decisionId: decision.id,
                route: 'STUDIO_GROUP',
            },
            isRead: false,
            weekSent: player.currentWeek,
            expiresIn: 26,
        };
        const logEntry: LogEntry = {
            week: player.currentWeek,
            year: player.age,
            message: t(language, 'services.subsidiaryDecisions.log.submitted', {
                studio: currentStudio.name,
                title: decision.title,
            }),
            type: 'neutral',
        };
        nextPlayer = createDecisionMedia(language, {
            player: {
                ...nextPlayer,
                inbox: [message, ...(nextPlayer.inbox || [])].slice(0, 120),
                logs: [logEntry, ...(nextPlayer.logs || [])].slice(0, 50),
            },
            studio: updatedStudio,
            decision,
            action: 'CREATED',
        });
    });

    return nextPlayer;
};

const addFinanceEntry = (
    studioState: NonNullable<Business['studioState']>,
    player: Player,
    entry: Omit<StudioFinanceEntry, 'week' | 'year'>,
) => ({
    ...studioState,
    financeLedger: [{
        ...entry,
        week: player.currentWeek,
        year: player.age,
    }, ...(studioState.financeLedger || [])].slice(0, 200),
});

const resolveDecisionOnStudio = (
    studio: Business,
    player: Player,
    decision: SubsidiaryDecision,
    optionId: SubsidiaryDecisionOption['id'],
    outcomeSummary: string,
    extraState?: Partial<NonNullable<Business['studioState']>>,
    extraStudio?: Partial<Business>,
): Business => {
    const studioState = normalizeStudioState(studio.studioState, player.currentWeek);
    const resolvedDecision: SubsidiaryDecision = {
        ...decision,
        status: 'RESOLVED',
        selectedOptionId: optionId,
        resolvedWeek: player.currentWeek,
        resolvedYear: player.age,
        outcomeSummary,
    };
    return {
        ...studio,
        ...extraStudio,
        stats: {
            ...studio.stats,
            ...(extraStudio?.stats || {}),
        },
        studioState: {
            ...studioState,
            ...(extraState || {}),
            subsidiaryDecisions: (extraState?.subsidiaryDecisions || studioState.subsidiaryDecisions || []).map(candidate => (
                candidate.id === decision.id ? resolvedDecision : candidate
            )),
        },
    };
};

export const resolveSubsidiaryDecision = ({
    player,
    studioId,
    decisionId,
    optionId,
}: {
    player: Player;
    studioId: string;
    decisionId: string;
    optionId: SubsidiaryDecisionOption['id'];
}): {
    success: boolean;
    player: Player;
    decision?: SubsidiaryDecision;
    reason?: 'STUDIO_NOT_FOUND' | 'DECISION_NOT_FOUND' | 'DECISION_CLOSED' | 'OPTION_NOT_FOUND' | 'TREASURY_FAILED';
} => {
    const studio = player.businesses.find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE');
    if (!studio?.studioState) return { success: false, player, reason: 'STUDIO_NOT_FOUND' };
    const studioState = normalizeStudioState(studio.studioState, player.currentWeek);
    const decision = studioState.subsidiaryDecisions?.find(candidate => candidate.id === decisionId);
    if (!decision) return { success: false, player, reason: 'DECISION_NOT_FOUND' };
    if (decision.status !== 'PENDING') return { success: false, player, decision, reason: 'DECISION_CLOSED' };
    if (!decision.options.some(option => option.id === optionId)) return { success: false, player, decision, reason: 'OPTION_NOT_FOUND' };

    const language = getPlayerLanguage(player);
    let nextPlayer = player;
    let updatedStudio: Business = { ...studio, studioState };
    let outcomeSummary = '';
    const resolveVars = (extra: Record<string, string | number> = {}) => ({
        studio: updatedStudio.name,
        title: decision.title,
        amount: decision.recommendedAmount ? formatMoneyShort(decision.recommendedAmount) : '',
        relatedTitle: decision.relatedTitle || '',
        rightsTitle: decision.relatedTitle || t(language, 'services.subsidiaryDecisions.resolve.fallback.rightsPackage'),
        dormantTitle: decision.relatedTitle || t(language, 'services.subsidiaryDecisions.resolve.fallback.dormantFranchise'),
        ...extra,
    });

    if (optionId === 'APPROVE') {
        if (decision.type === 'RISKY_PRODUCTION') {
            const proposal = planSubsidiaryProject(player, updatedStudio);
            const proposalWithDecision: SubsidiaryProjectProposal | null = proposal ? {
                ...proposal,
                logic: [
                    t(language, 'services.subsidiaryDecisions.resolve.RISKY_PRODUCTION.APPROVE.logic', { title: decision.title }),
                    ...proposal.logic,
                ],
            } : null;
            const nextState = {
                ...studioState,
                subsidiaryProjectProposals: proposalWithDecision
                    ? [proposalWithDecision, ...(studioState.subsidiaryProjectProposals || [])].slice(0, 12)
                    : studioState.subsidiaryProjectProposals,
            };
            outcomeSummary = proposalWithDecision
                ? t(language, 'services.subsidiaryDecisions.resolve.RISKY_PRODUCTION.APPROVE.proposal', resolveVars({ proposalTitle: proposalWithDecision.title }))
                : t(language, 'services.subsidiaryDecisions.resolve.RISKY_PRODUCTION.APPROVE.noProposal', resolveVars());
            updatedStudio = resolveDecisionOnStudio(updatedStudio, player, decision, optionId, outcomeSummary, nextState, {
                stats: {
                    ...updatedStudio.stats,
                    studioMomentum: clamp((updatedStudio.stats.studioMomentum || 50) + 4),
                    hype: clamp((updatedStudio.stats.hype || 50) + 3),
                },
            });
        } else if (decision.type === 'EMERGENCY_CAPITAL') {
            const amount = decision.recommendedAmount || 50_000_000;
            const transfer = performStudioTreasuryTransfer({
                player,
                studioId,
                action: 'INJECT',
                counterparty: 'HQ',
                amount,
            });
            if (!transfer.success) return { success: false, player, decision, reason: 'TREASURY_FAILED' };
            nextPlayer = transfer.player;
            const studioAfterTransfer = nextPlayer.businesses.find(business => business.id === studioId) || updatedStudio;
            outcomeSummary = t(language, 'services.subsidiaryDecisions.resolve.EMERGENCY_CAPITAL.APPROVE.summary', resolveVars({ amount: formatMoneyShort(amount) }));
            updatedStudio = resolveDecisionOnStudio(studioAfterTransfer, nextPlayer, decision, optionId, outcomeSummary, undefined, {
                stats: {
                    ...studioAfterTransfer.stats,
                    investorConfidence: clamp((studioAfterTransfer.stats.investorConfidence || 50) + 7),
                    brandHealth: clamp((studioAfterTransfer.stats.brandHealth || 50) + 2),
                },
            });
        } else if (decision.type === 'LEADERSHIP_CHANGE') {
            outcomeSummary = t(language, 'services.subsidiaryDecisions.resolve.LEADERSHIP_CHANGE.APPROVE.summary', resolveVars());
            updatedStudio = resolveDecisionOnStudio(updatedStudio, player, decision, optionId, outcomeSummary, undefined, {
                stats: {
                    ...updatedStudio.stats,
                    investorConfidence: clamp((updatedStudio.stats.investorConfidence || 50) + 6),
                    brandHealth: clamp((updatedStudio.stats.brandHealth || 50) - 2),
                    recentFlopStreak: 0,
                },
            });
        } else if (decision.type === 'RIGHTS_ACQUISITION') {
            const amount = Math.min(decision.recommendedAmount || 30_000_000, Math.max(0, updatedStudio.balance));
            const rightsTitle = decision.relatedTitle || t(language, 'services.subsidiaryDecisions.resolve.fallback.rightsPackage');
            const ledgerState = addFinanceEntry({
                ...studioState,
                purchasedIPTitles: [rightsTitle, ...(studioState.purchasedIPTitles || [])].filter((title, index, titles) => titles.indexOf(title) === index),
            }, player, {
                id: `sub_rights_buy_${studio.id}_${player.age}_${player.currentWeek}_${Date.now()}`,
                amount: -amount,
                type: 'IP_ACQUISITION',
                label: t(language, 'services.subsidiaryDecisions.resolve.RIGHTS_ACQUISITION.APPROVE.ledger', { rightsTitle }),
            });
            outcomeSummary = t(language, 'services.subsidiaryDecisions.resolve.RIGHTS_ACQUISITION.APPROVE.summary', resolveVars({ rightsTitle }));
            updatedStudio = resolveDecisionOnStudio(updatedStudio, player, decision, optionId, outcomeSummary, ledgerState, {
                balance: updatedStudio.balance - amount,
                stats: {
                    ...updatedStudio.stats,
                    studioMomentum: clamp((updatedStudio.stats.studioMomentum || 50) + 3),
                },
            });
        } else if (decision.type === 'DORMANT_FRANCHISE') {
            outcomeSummary = t(language, 'services.subsidiaryDecisions.resolve.DORMANT_FRANCHISE.APPROVE.summary', resolveVars({
                dormantTitle: decision.relatedTitle || t(language, 'services.subsidiaryDecisions.resolve.fallback.asset'),
            }));
            updatedStudio = resolveDecisionOnStudio(updatedStudio, player, decision, optionId, outcomeSummary, undefined, {
                stats: {
                    ...updatedStudio.stats,
                    studioMomentum: clamp((updatedStudio.stats.studioMomentum || 50) + 7),
                    hype: clamp((updatedStudio.stats.hype || 50) + 5),
                    investorConfidence: clamp((updatedStudio.stats.investorConfidence || 50) + 2),
                },
            });
        } else if (decision.type === 'PARTNERSHIP') {
            const partnerCapital = decision.recommendedAmount || 55_000_000;
            const ledgerState = addFinanceEntry(studioState, player, {
                id: `sub_partner_${studio.id}_${player.age}_${player.currentWeek}_${Date.now()}`,
                amount: partnerCapital,
                type: 'CAPITAL_INJECTION',
                label: t(language, 'services.subsidiaryDecisions.resolve.PARTNERSHIP.APPROVE.ledger'),
            });
            outcomeSummary = t(language, 'services.subsidiaryDecisions.resolve.PARTNERSHIP.APPROVE.summary', resolveVars({
                partnerCapital: formatMoneyShort(partnerCapital),
            }));
            updatedStudio = resolveDecisionOnStudio(updatedStudio, player, decision, optionId, outcomeSummary, ledgerState, {
                balance: updatedStudio.balance + partnerCapital,
                stats: {
                    ...updatedStudio.stats,
                    studioMomentum: clamp((updatedStudio.stats.studioMomentum || 50) + 4),
                    investorConfidence: clamp((updatedStudio.stats.investorConfidence || 50) + 3),
                },
            });
        } else if (decision.type === 'FLOP_RESPONSE') {
            outcomeSummary = t(language, 'services.subsidiaryDecisions.resolve.FLOP_RESPONSE.APPROVE.summary', resolveVars());
            updatedStudio = resolveDecisionOnStudio(updatedStudio, player, decision, optionId, outcomeSummary, undefined, {
                stats: {
                    ...updatedStudio.stats,
                    recentFlopStreak: 0,
                    investorConfidence: clamp((updatedStudio.stats.investorConfidence || 50) + 5),
                    studioMomentum: clamp((updatedStudio.stats.studioMomentum || 50) + 3),
                    brandHealth: clamp((updatedStudio.stats.brandHealth || 50) - 1),
                },
            });
        } else if (decision.type === 'INDEPENDENCE_REQUEST') {
            outcomeSummary = t(language, 'services.subsidiaryDecisions.resolve.INDEPENDENCE_REQUEST.APPROVE.summary', resolveVars());
            updatedStudio = resolveDecisionOnStudio(updatedStudio, player, decision, optionId, outcomeSummary, {
                ...studioState,
                operatingModel: 'INDEPENDENT_LABEL',
                operatingModelChangedWeek: player.currentWeek,
                operatingModelChangedYear: player.age,
            }, {
                stats: {
                    ...updatedStudio.stats,
                    investorConfidence: clamp((updatedStudio.stats.investorConfidence || 50) + 4),
                    brandHealth: clamp((updatedStudio.stats.brandHealth || 50) + 3),
                },
            });
        }
    } else {
        const confidenceDrop = decision.type === 'EMERGENCY_CAPITAL' ? 8 : decision.type === 'LEADERSHIP_CHANGE' ? 5 : 3;
        outcomeSummary = t(language, `services.subsidiaryDecisions.resolve.${decision.type}.DECLINE.summary`, resolveVars());
        updatedStudio = resolveDecisionOnStudio(updatedStudio, player, decision, optionId, outcomeSummary, undefined, {
            stats: {
                ...updatedStudio.stats,
                investorConfidence: clamp((updatedStudio.stats.investorConfidence || 50) - confidenceDrop),
                studioMomentum: clamp((updatedStudio.stats.studioMomentum || 50) - 2),
            },
        });
    }

    updatedStudio = attachDecisionArc(nextPlayer, updatedStudio, decision, optionId, outcomeSummary, language);
    nextPlayer = updateStudioOnPlayer({ ...nextPlayer }, updatedStudio);
    nextPlayer = createDecisionMedia(language, {
        player: nextPlayer,
        studio: updatedStudio,
        decision: {
            ...decision,
            outcomeSummary,
        },
        action: optionId,
    });
    const logEntry: LogEntry = {
        week: nextPlayer.currentWeek,
        year: nextPlayer.age,
        message: optionId === 'APPROVE'
            ? t(language, 'services.subsidiaryDecisions.resolve.log.approved', { studio: updatedStudio.name, title: decision.title })
            : t(language, 'services.subsidiaryDecisions.resolve.log.declined', { studio: updatedStudio.name, title: decision.title }),
        type: optionId === 'APPROVE' ? 'positive' : 'neutral',
    };
    nextPlayer.logs = [logEntry, ...(nextPlayer.logs || [])].slice(0, 50);
    const finalDecision = updatedStudio.studioState?.subsidiaryDecisions?.find(candidate => candidate.id === decision.id);
    return {
        success: true,
        player: nextPlayer,
        decision: finalDecision || decision,
    };
};
