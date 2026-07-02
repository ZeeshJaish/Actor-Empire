import type {
    Business,
    LogEntry,
    Message,
    NewsItem,
    Player,
    StudioFinanceEntry,
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
    getStudioOperatingMandate,
    isAcquiredStudio,
    performStudioTreasuryTransfer,
} from './studioGroup';
import { planSubsidiaryProject } from './subsidiaryOperations';

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
    id: SubsidiaryDecisionOption['id'],
    label: string,
    description: string,
    preview: string,
    tone: SubsidiaryDecisionOption['tone'],
): SubsidiaryDecisionOption => ({
    id,
    label,
    description,
    preview,
    tone,
});

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
    if (weeklyProfit < 0 || studio.balance < Math.max(40_000_000, (studio.stats.valuation || 0) * 0.04)) return 'EMERGENCY_CAPITAL';
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

const getDecisionTitle = (type: SubsidiaryDecisionType) => {
    if (type === 'EMERGENCY_CAPITAL') return 'Emergency Capital Request';
    if (type === 'LEADERSHIP_CHANGE') return 'Leadership Replacement Vote';
    if (type === 'RIGHTS_ACQUISITION') return 'Internal Rights Acquisition';
    if (type === 'DORMANT_FRANCHISE') return 'Dormant Franchise Call';
    if (type === 'PARTNERSHIP') return 'Strategic Partnership Offer';
    if (type === 'FLOP_RESPONSE') return 'Consecutive Flops Response';
    if (type === 'INDEPENDENCE_REQUEST') return 'Independence Request';
    return 'Risky Production Approval';
};

const createDecision = (player: Player, studio: Business): SubsidiaryDecision | null => {
    if (!isAcquiredStudio(studio) || studio.studioState?.operatingModel === 'FULL_MERGER') return null;
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

    const decisionCopy: Record<SubsidiaryDecisionType, {
        summary: string;
        stakes: string[];
        logic: string[];
        followUp: SubsidiaryDecision['followUp'];
        options: SubsidiaryDecisionOption[];
    }> = {
        RISKY_PRODUCTION: {
            summary: `${studio.name} wants permission to take a bigger creative swing under its current mandate.`,
            stakes: [
                `${formatMoneyShort(recommendedAmount || 0)} exposure if the project moves forward`,
                'Could create a strong new studio-side slate proposal',
                'Declining protects capital but slows momentum',
            ],
            logic: [
                `${personality} management is pushing for a bolder slate moment.`,
                `${mandate.budgetAppetite.toLowerCase()} budget appetite and ${mandate.releasePace.toLowerCase()} pace support a board-level approval.`,
                `${studio.name} has ${formatMoneyShort(studio.balance)} available capital before commitment.`,
            ],
            followUp: {
                label: 'Slate pressure',
                effect: 'Approval creates a board-reviewed project package; decline slows momentum.',
            },
            options: [
                createDecisionOption('APPROVE', 'Authorize Swing', 'Let the studio assemble the project package.', 'Creates a real subsidiary project proposal.', 'positive'),
                createDecisionOption('DECLINE', 'Hold Capital', 'Tell leadership to wait for a cleaner project.', 'Protects cash but cools studio momentum.', 'negative'),
            ],
        },
        EMERGENCY_CAPITAL: {
            summary: `${studio.name} is asking the group for emergency capital support.`,
            stakes: [
                `${formatMoneyShort(recommendedAmount || 0)} capital injection requested`,
                'Protects confidence and keeps the label stable',
                'Declining may trigger investor and employee pressure',
            ],
            logic: [
                `Weekly result is ${formatMoneyShort(studio.stats.weeklyProfit || 0)}, so liquidity pressure is visible.`,
                `${studio.name} has ${formatMoneyShort(studio.balance)} cash against its operating slate.`,
                'The request uses the existing HQ treasury transfer system.',
            ],
            followUp: {
                label: 'Liquidity watch',
                effect: 'The label stabilizes if funded, or investor confidence drops if refused.',
            },
            options: [
                createDecisionOption('APPROVE', 'Inject Capital', 'Fund the studio from headquarters if available.', 'Stabilizes confidence and adds studio cash.', 'positive'),
                createDecisionOption('DECLINE', 'Refuse Bailout', 'Force management to absorb the pressure.', 'Saves HQ cash but damages confidence.', 'negative'),
            ],
        },
        LEADERSHIP_CHANGE: {
            summary: `${studio.name} wants authority to replace its current studio chief.`,
            stakes: [
                'Can reset confidence after repeated weak performance',
                'May unsettle staff and creative partners',
                'Leaving leadership in place avoids disruption',
            ],
            logic: [
                `${studio.stats.recentFlopStreak || 0} recent flop streak is forcing a governance review.`,
                `${personality} company culture affects how quickly leadership pushes for change.`,
                'A leadership change updates studio health without creating a new duplicate management screen.',
            ],
            followUp: {
                label: 'Leadership reset',
                effect: 'A reset clears flop pressure but may bruise culture.',
            },
            options: [
                createDecisionOption('APPROVE', 'Replace CEO', 'Install a new operator and reset confidence.', 'Boosts confidence with some culture friction.', 'positive'),
                createDecisionOption('DECLINE', 'Retain CEO', 'Keep the current management team in charge.', 'Avoids disruption but investors lose faith.', 'negative'),
            ],
        },
        RIGHTS_ACQUISITION: {
            summary: `${studio.name} wants to acquire ${relatedTitle} for its internal slate.`,
            stakes: [
                `${formatMoneyShort(recommendedAmount || 0)} rights purchase from studio capital`,
                'Expands catalog/IP available to this subsidiary',
                'Declining keeps the slate focused on current assets',
            ],
            logic: [
                `${mandate.ipStrategy.replaceAll('_', ' ').toLowerCase()} strategy points leadership toward owned-IP expansion.`,
                `${personality} profile makes this studio more likely to pitch catalog plays.`,
                'If approved, the title enters the same studio IP/catolog area already used by Development Lab.',
            ],
            followUp: {
                label: 'Catalog expansion',
                effect: 'The new rights package becomes usable by this studio.',
            },
            options: [
                createDecisionOption('APPROVE', 'Buy Rights', 'Let the subsidiary acquire the package.', 'Adds the title to this studio’s IP vault.', 'positive'),
                createDecisionOption('DECLINE', 'Pass', 'Keep current catalog discipline.', 'No spend, but franchise momentum softens.', 'neutral'),
            ],
        },
        DORMANT_FRANCHISE: {
            summary: `${studio.name} wants to decide what happens to ${relatedTitle}, a dormant franchise lane in its catalog.`,
            stakes: [
                'Reviving the franchise can lift momentum and create sequel appetite',
                'Selling or shelving protects cash but may weaken catalog value',
                'Fans and trade press will read this as a strategic signal',
            ],
            logic: [
                `${mandate.focus.replaceAll('_', ' ').toLowerCase()} focus makes recognizable IP more valuable.`,
                `${personality} management is more likely to push old brands back into motion.`,
                dormantFranchiseTitle ? `${dormantFranchiseTitle} already exists in this studio’s release history.` : 'The studio has a dormant franchise-style package ready for review.',
            ],
            followUp: {
                label: 'Franchise watch',
                effect: 'Approval raises momentum and future sequel pressure; decline cools the catalog lane.',
            },
            options: [
                createDecisionOption('APPROVE', 'Retain & Revive', 'Keep the franchise and prepare a revival lane.', 'Boosts momentum and catalog value.', 'positive'),
                createDecisionOption('DECLINE', 'Shelve Asset', 'Keep the banner quiet and avoid near-term spend.', 'Protects focus but lowers franchise heat.', 'neutral'),
            ],
        },
        PARTNERSHIP: {
            summary: `${studio.name} has a partnership offer that could co-finance its next slate move.`,
            stakes: [
                'Partner money reduces exposure',
                'Creative control may become less clean',
                'Streaming-first labels can convert this into steady pipeline strength',
            ],
            logic: [
                `${mandate.focus.replaceAll('_', ' ').toLowerCase()} focus makes outside platform alignment attractive.`,
                `${personality} studios tend to trade exclusivity for pipeline speed.`,
                `${studio.name} has ${formatMoneyShort(studio.balance)} capital, so the partnership is strategic rather than desperate.`,
            ],
            followUp: {
                label: 'Partner obligations',
                effect: 'Approval boosts capital and future activity; decline keeps full control.',
            },
            options: [
                createDecisionOption('APPROVE', 'Accept Partner', 'Take the strategic partner and co-finance the slate.', 'Adds capital and social buzz.', 'positive'),
                createDecisionOption('DECLINE', 'Stay Solo', 'Keep the studio fully independent on this slate.', 'Keeps control but loses partner momentum.', 'neutral'),
            ],
        },
        FLOP_RESPONSE: {
            summary: `${studio.name} needs a response plan after consecutive underperformers.`,
            stakes: [
                'A public reset can protect investor confidence',
                'A patient response preserves creative trust',
                'Doing nothing risks the studio becoming a problem child',
            ],
            logic: [
                `${studio.stats.recentFlopStreak || 0} consecutive flops triggered this decision.`,
                `${personality} leadership changes how harsh the response should be.`,
                'The response affects future confidence and momentum without forcing busywork.',
            ],
            followUp: {
                label: 'Recovery arc',
                effect: 'Approval starts a turnaround posture; decline keeps current culture but hurts confidence.',
            },
            options: [
                createDecisionOption('APPROVE', 'Order Reset', 'Cut the slate, reset leadership pressure and rebuild trust.', 'Clears flop streak and steadies investors.', 'positive'),
                createDecisionOption('DECLINE', 'Stay Course', 'Let the team recover without a public reset.', 'Protects creatives but investors worry.', 'negative'),
            ],
        },
        INDEPENDENCE_REQUEST: {
            summary: `${studio.name} is asking for more autonomy after strong internal confidence.`,
            stakes: [
                'More independence can improve morale and label identity',
                'Less control means fewer direct interventions',
                'This can turn a controlled subsidiary into a stronger self-running label',
            ],
            logic: [
                `${studio.stats.investorConfidence || 0}/100 investor confidence makes the board comfortable asking for freedom.`,
                `${personality} culture prefers prestige identity over tight HQ command.`,
                'Operating-model pressure now responds to studio performance instead of being a static button.',
            ],
            followUp: {
                label: 'Autonomy pressure',
                effect: 'Approval grants independence; decline keeps control with a morale cost.',
            },
            options: [
                createDecisionOption('APPROVE', 'Grant Independence', 'Let the studio operate as an independent label.', 'Changes model to Independent Label.', 'positive'),
                createDecisionOption('DECLINE', 'Keep Control', 'Keep strategic command under HQ.', 'Keeps control but confidence dips.', 'negative'),
            ],
        },
    };

    const copy = decisionCopy[type];
    return {
        id: `sub_decision_${commonId}`,
        studioId: studio.id,
        studioName: studio.name,
        type,
        status: 'PENDING',
        title: getDecisionTitle(type),
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
    player: Player,
    studio: Business,
    decision: SubsidiaryDecision,
    action: 'CREATED' | 'APPROVE' | 'DECLINE',
): Player => {
    const verb = action === 'CREATED' ? 'faces' : action === 'APPROVE' ? 'approves' : 'declines';
    const headline = `${studio.name} ${verb} ${decision.title}`;
    const newsItem: NewsItem = {
        id: `news_sub_decision_${decision.id}_${action}`,
        headline,
        subtext: action === 'CREATED'
            ? `${decision.personality} leadership has sent a board-level decision to the group.`
            : `${decision.outcomeSummary || decision.summary}${decision.followUp ? ` Follow-up: ${decision.followUp.effect}` : ''}`,
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
            authorName: 'Studio Board Watch',
            authorHandle: '@boardwatch',
            authorAvatar: '🏛️',
            content: action === 'CREATED'
                ? `${studio.name} board docket: ${decision.title}. ${decision.personality} labels are becoming more assertive.`
                : `${studio.name} ${verb} ${decision.title}. ${decision.recommendedAmount ? `${formatMoneyShort(decision.recommendedAmount)} decision.` : 'Governance call.'}`,
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

const getArcTitle = (decision: SubsidiaryDecision, optionId: SubsidiaryDecisionOption['id']) => {
    if (decision.type === 'PARTNERSHIP') return optionId === 'APPROVE' ? 'Partner Obligations' : 'Solo Slate Pressure';
    if (decision.type === 'DORMANT_FRANCHISE') return optionId === 'APPROVE' ? 'Franchise Revival Watch' : 'Dormant Catalog Watch';
    if (decision.type === 'FLOP_RESPONSE') return optionId === 'APPROVE' ? 'Turnaround Plan' : 'Flop Pressure Watch';
    if (decision.type === 'INDEPENDENCE_REQUEST') return optionId === 'APPROVE' ? 'Autonomy Transition' : 'Control Tension';
    if (decision.type === 'EMERGENCY_CAPITAL') return optionId === 'APPROVE' ? 'Liquidity Stabilization' : 'Cash Pressure Watch';
    if (decision.type === 'RIGHTS_ACQUISITION') return optionId === 'APPROVE' ? 'Catalog Integration' : 'Missed Rights Heat';
    if (decision.type === 'LEADERSHIP_CHANGE') return optionId === 'APPROVE' ? 'New Leadership Honeymoon' : 'Leadership Scrutiny';
    return optionId === 'APPROVE' ? 'Approved Slate Pressure' : 'Paused Slate Heat';
};

const buildArcBeats = (
    player: Player,
    decision: SubsidiaryDecision,
    optionId: SubsidiaryDecisionOption['id'],
): SubsidiaryDecisionArc['beats'] => {
    const firstPulse = futureWeek(player.age, player.currentWeek, 4);
    const secondPulse = futureWeek(player.age, player.currentWeek, 10);
    const label = decision.followUp?.label || getArcTitle(decision, optionId);
    const positive = optionId === 'APPROVE';

    const firstEffect = positive
        ? decision.followUp?.effect || 'The approved board action begins shaping studio behavior.'
        : `Declining ${decision.title} leaves management watching the consequences.`;
    const secondEffect = positive
        ? `The ${label.toLowerCase()} creates measurable studio momentum and trade chatter.`
        : `The ${label.toLowerCase()} settles, but confidence remains sensitive.`;

    return [
        {
            label,
            effect: firstEffect,
            pulseWeek: firstPulse.week,
            pulseYear: firstPulse.year,
        },
        {
            label: positive ? 'Industry Readout' : 'Pressure Readout',
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
): SubsidiaryDecisionArc | null => {
    if (!decision.followUp && optionId !== 'DECLINE') return null;
    const beats = buildArcBeats(player, decision, optionId);
    return {
        id: `sub_arc_${decision.id}_${optionId.toLowerCase()}`,
        studioId: studio.id,
        studioName: studio.name,
        sourceDecisionId: decision.id,
        sourceDecisionType: decision.type,
        title: getArcTitle(decision, optionId),
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
): Business => {
    const studioState = normalizeStudioState(studio.studioState, player.currentWeek);
    const arc = createDecisionArc(player, studio, decision, optionId, outcomeSummary);
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
    const newsItem: NewsItem = {
        id: `news_sub_arc_${arc.id}_${arc.beatsResolved}_${player.age}_${player.currentWeek}`,
        headline: `${studio.name} Storyline: ${arc.title}`,
        subtext: `${beat.label}: ${beat.effect}`,
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: arc.tone === 'negative' ? 'LOW' : 'MEDIUM',
    };
    const logEntry: LogEntry = {
        week: player.currentWeek,
        year: player.age,
        message: `📌 ${studio.name} storyline advanced: ${arc.title} — ${beat.label}.`,
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
            authorName: 'Studio Board Watch',
            authorHandle: '@boardwatch',
            authorAvatar: '🏛️',
            content: `${studio.name} update: ${arc.title}. ${beat.effect}`,
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
        const message: Message = {
            id: `msg_sub_decision_${decision.id}`,
            sender: `${studio.name} Board`,
            subject: `Board Decision: ${decision.title}`,
            text: `${decision.summary} Stakes: ${decision.stakes.join(' ')}`,
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
            message: `🏛️ ${currentStudio.name} submitted ${decision.title} for ownership approval.`,
            type: 'neutral',
        };
        nextPlayer = createDecisionMedia({
            ...nextPlayer,
            inbox: [message, ...(nextPlayer.inbox || [])].slice(0, 120),
            logs: [logEntry, ...(nextPlayer.logs || [])].slice(0, 50),
        }, updatedStudio, decision, 'CREATED');
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

    let nextPlayer = player;
    let updatedStudio: Business = { ...studio, studioState };
    let outcomeSummary = '';

    if (optionId === 'APPROVE') {
        if (decision.type === 'RISKY_PRODUCTION') {
            const proposal = planSubsidiaryProject(player, updatedStudio);
            const proposalWithDecision: SubsidiaryProjectProposal | null = proposal ? {
                ...proposal,
                logic: [
                    `Ownership approved ${decision.title} before this package entered the slate.`,
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
                ? `${proposalWithDecision.title} has been submitted as a real subsidiary project proposal.`
                : 'Leadership received approval, but no viable project package was ready yet.';
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
            outcomeSummary = `${formatMoneyShort(amount)} emergency support was injected from headquarters.`;
            updatedStudio = resolveDecisionOnStudio(studioAfterTransfer, nextPlayer, decision, optionId, outcomeSummary, undefined, {
                stats: {
                    ...studioAfterTransfer.stats,
                    investorConfidence: clamp((studioAfterTransfer.stats.investorConfidence || 50) + 7),
                    brandHealth: clamp((studioAfterTransfer.stats.brandHealth || 50) + 2),
                },
            });
        } else if (decision.type === 'LEADERSHIP_CHANGE') {
            outcomeSummary = 'A new studio chief has been authorized to reset the company rhythm.';
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
            const rightsTitle = decision.relatedTitle || 'Untitled Rights Package';
            const ledgerState = addFinanceEntry({
                ...studioState,
                purchasedIPTitles: [rightsTitle, ...(studioState.purchasedIPTitles || [])].filter((title, index, titles) => titles.indexOf(title) === index),
            }, player, {
                id: `sub_rights_buy_${studio.id}_${player.age}_${player.currentWeek}_${Date.now()}`,
                amount: -amount,
                type: 'IP_ACQUISITION',
                label: `${rightsTitle} internal rights acquisition`,
            });
            outcomeSummary = `${rightsTitle} has been added to ${studio.name}'s IP vault.`;
            updatedStudio = resolveDecisionOnStudio(updatedStudio, player, decision, optionId, outcomeSummary, ledgerState, {
                balance: updatedStudio.balance - amount,
                stats: {
                    ...updatedStudio.stats,
                    studioMomentum: clamp((updatedStudio.stats.studioMomentum || 50) + 3),
                },
            });
        } else if (decision.type === 'DORMANT_FRANCHISE') {
            outcomeSummary = `Franchise ${decision.relatedTitle || 'asset'} stays with ${studio.name} and enters a revival watch.`;
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
                label: 'Strategic slate partnership advance',
            });
            outcomeSummary = `${studio.name} accepted a strategic partner and added ${formatMoneyShort(partnerCapital)} to its slate capacity.`;
            updatedStudio = resolveDecisionOnStudio(updatedStudio, player, decision, optionId, outcomeSummary, ledgerState, {
                balance: updatedStudio.balance + partnerCapital,
                stats: {
                    ...updatedStudio.stats,
                    studioMomentum: clamp((updatedStudio.stats.studioMomentum || 50) + 4),
                    investorConfidence: clamp((updatedStudio.stats.investorConfidence || 50) + 3),
                },
            });
        } else if (decision.type === 'FLOP_RESPONSE') {
            outcomeSummary = `${studio.name} ordered a slate reset after the flop streak.`;
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
            outcomeSummary = `${studio.name} was granted more independence and now operates as an independent label.`;
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
        outcomeSummary = decision.type === 'EMERGENCY_CAPITAL'
            ? 'Emergency support was declined. Management must absorb the cash pressure.'
            : decision.type === 'RIGHTS_ACQUISITION'
                ? `${decision.relatedTitle || 'The rights package'} was passed on for now.`
                : decision.type === 'DORMANT_FRANCHISE'
                    ? `${decision.relatedTitle || 'The dormant franchise'} stays shelved for now.`
                    : decision.type === 'PARTNERSHIP'
                        ? 'The strategic partner was declined, keeping full control inside the group.'
                        : decision.type === 'FLOP_RESPONSE'
                            ? 'The studio will stay the course despite flop pressure.'
                            : decision.type === 'INDEPENDENCE_REQUEST'
                                ? 'The studio remains under controlled subsidiary command.'
                : decision.type === 'RISKY_PRODUCTION'
                    ? 'The risky slate swing was paused until leadership brings a cleaner package.'
                    : 'The current leadership team remains in place.';
        updatedStudio = resolveDecisionOnStudio(updatedStudio, player, decision, optionId, outcomeSummary, undefined, {
            stats: {
                ...updatedStudio.stats,
                investorConfidence: clamp((updatedStudio.stats.investorConfidence || 50) - confidenceDrop),
                studioMomentum: clamp((updatedStudio.stats.studioMomentum || 50) - 2),
            },
        });
    }

    updatedStudio = attachDecisionArc(nextPlayer, updatedStudio, decision, optionId, outcomeSummary);
    nextPlayer = updateStudioOnPlayer({ ...nextPlayer }, updatedStudio);
    nextPlayer = createDecisionMedia(nextPlayer, updatedStudio, {
        ...decision,
        outcomeSummary,
    }, optionId);
    const logEntry: LogEntry = {
        week: nextPlayer.currentWeek,
        year: nextPlayer.age,
        message: optionId === 'APPROVE'
            ? `✅ ${updatedStudio.name} board approved ${decision.title}.`
            : `🛑 ${updatedStudio.name} board declined ${decision.title}.`,
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
