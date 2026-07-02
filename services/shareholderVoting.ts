import type {
    Message,
    NewsItem,
    Player,
    ScheduledEvent,
    ShareholderInfluenceLevel,
    ShareholderVote,
    ShareholderVoteType,
    Stock,
} from '../types';
import { getStockOwnershipPercent } from './stockLogic';

export interface ShareholderInfluence {
    level: ShareholderInfluenceLevel;
    label: string;
    threshold: number;
    nextThreshold?: number;
    rights: string[];
}

export interface ShareholderVoteResult {
    success: boolean;
    player: Player;
    vote?: ShareholderVote;
    reason?: 'VOTE_NOT_FOUND' | 'VOTE_CLOSED';
}

const VOTE_CYCLE_WEEKS = 12;

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const roundVotingPower = (value: number) => Math.round(value * 100) / 100;

const getHoldingPercent = (player: Pick<Player, 'portfolio'>, stock: Stock) => {
    const shares = Math.max(0, player.portfolio.find(item => item.stockId === stock.id)?.shares || 0);
    return getStockOwnershipPercent(shares, stock);
};

export const getShareholderInfluence = (ownershipPercent: number): ShareholderInfluence => {
    if (ownershipPercent >= 51) {
        return {
            level: 'CONTROLLING_OWNER',
            label: 'Controlling Owner',
            threshold: 51,
            rights: ['Control votes', 'takeover command', 'board control'],
        };
    }
    if (ownershipPercent >= 30) {
        return {
            level: 'BOARD_SEAT',
            label: 'Board Seat',
            threshold: 30,
            nextThreshold: 51,
            rights: ['Board seat', 'major strategy pressure', 'takeover leverage'],
        };
    }
    if (ownershipPercent >= 20) {
        return {
            level: 'STRATEGIC_INFLUENCE',
            label: 'Strategic Influence',
            threshold: 20,
            nextThreshold: 30,
            rights: ['Strategic proposals', 'management pressure', 'alliance leverage'],
        };
    }
    if (ownershipPercent >= 10) {
        return {
            level: 'SHAREHOLDER_VOTER',
            label: 'Shareholder Voter',
            threshold: 10,
            nextThreshold: 20,
            rights: ['Vote on board decisions', 'receive shareholder ballots'],
        };
    }
    return {
        level: 'PASSIVE_INVESTOR',
        label: 'Passive Investor',
        threshold: 0,
        nextThreshold: 10,
        rights: ['Financial exposure', 'dividends'],
    };
};

const getVoteTemplate = (type: ShareholderVoteType, stock: Stock) => {
    switch (type) {
        case 'DIVIDEND_POLICY':
            return {
                title: `${stock.name} dividend policy`,
                summary: 'Shareholders are voting on whether management should prioritize a richer dividend or keep cash for studio expansion.',
                stakes: ['FOR can lift income and investor confidence.', 'AGAINST keeps more capital inside the company.'],
            };
        case 'SLATE_APPROVAL':
            return {
                title: `${stock.name} slate approval`,
                summary: 'The board wants backing for its next entertainment slate and capital plan.',
                stakes: ['FOR supports management momentum.', 'AGAINST pressures the company to rethink spending.'],
            };
        case 'CEO_CONFIDENCE':
            return {
                title: `${stock.name} leadership confidence`,
                summary: 'Large holders are testing support for current leadership after recent studio performance.',
                stakes: ['FOR stabilizes leadership.', 'AGAINST increases pressure for a shake-up.'],
            };
        case 'CAPITAL_RAISE':
        default:
            return {
                title: `${stock.name} capital raise`,
                summary: 'The company wants permission to raise capital for production and acquisition opportunities.',
                stakes: ['FOR funds aggressive expansion.', 'AGAINST protects current shareholders from dilution.'],
            };
    }
};

const chooseVoteType = (player: Pick<Player, 'currentWeek'>, stock: Stock): ShareholderVoteType => {
    const choices: ShareholderVoteType[] = ['DIVIDEND_POLICY', 'SLATE_APPROVAL', 'CEO_CONFIDENCE', 'CAPITAL_RAISE'];
    const seed = Array.from(`${stock.id}:${player.currentWeek}`).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return choices[seed % choices.length];
};

export const createShareholderVote = (
    player: Pick<Player, 'age' | 'currentWeek' | 'portfolio'>,
    stock: Stock,
    type: ShareholderVoteType = chooseVoteType(player, stock),
): ShareholderVote | null => {
    const ownershipPercent = getHoldingPercent(player, stock);
    if (getShareholderInfluence(ownershipPercent).level === 'PASSIVE_INVESTOR') return null;

    const template = getVoteTemplate(type, stock);
    const expectedSupport = clamp(48 + (ownershipPercent * 0.65) + (stock.dividendYield * 120) - (stock.volatility * 90), 28, 82);

    return {
        id: `vote_${stock.id}_${type}_${player.age}_${player.currentWeek}`,
        stockId: stock.id,
        stockSymbol: stock.symbol,
        companyName: stock.name,
        type,
        title: template.title,
        summary: template.summary,
        stakes: template.stakes,
        status: 'OPEN',
        playerVotingPower: roundVotingPower(ownershipPercent),
        expectedSupport: Math.round(expectedSupport),
        createdWeek: player.currentWeek,
        createdYear: player.age,
        dueWeek: player.currentWeek + 4,
    };
};

const createVoteMessage = (vote: ShareholderVote): Message => ({
    id: `msg_${vote.id}`,
    sender: 'Shareholder Services',
    subject: `Shareholder Ballot: ${vote.stockSymbol}`,
    text: `${vote.companyName} has opened a shareholder decision. Your ${vote.playerVotingPower.toFixed(2)}% position gives you a meaningful vote.`,
    type: 'SHAREHOLDER_VOTE' as Message['type'],
    data: { voteId: vote.id, stockId: vote.stockId },
    isRead: false,
    weekSent: vote.createdWeek,
    expiresIn: 4,
});

export const processShareholderVoting = (player: Player): Player => {
    const existingVotes = Array.isArray(player.shareholderVotes) ? player.shareholderVotes : [];
    let nextVotes = existingVotes;
    let nextInbox = Array.isArray(player.inbox) ? player.inbox : [];
    let nextPendingEvents = Array.isArray(player.pendingEvents) ? player.pendingEvents : [];
    const hasOpenVoteForStock = (stockId: string) => nextVotes.some(vote => vote.stockId === stockId && vote.status === 'OPEN');

    player.stocks
        .filter(stock => stock.sector === 'MEDIA' && Boolean(stock.relatedStudioId))
        .forEach(stock => {
            if (hasOpenVoteForStock(stock.id)) return;
            const ownershipPercent = getHoldingPercent(player, stock);
            if (ownershipPercent < 10) return;
            const lastVote = existingVotes
                .filter(vote => vote.stockId === stock.id)
                .sort((a, b) => b.createdWeek - a.createdWeek)[0];
            if (lastVote && player.currentWeek - lastVote.createdWeek < VOTE_CYCLE_WEEKS) return;

            const vote = createShareholderVote(player, stock);
            if (!vote) return;
            nextVotes = [vote, ...nextVotes].slice(0, 24);
            nextInbox = [createVoteMessage(vote), ...nextInbox].slice(0, 120);
            if (!nextPendingEvents.some(event => event.data?.voteId === vote.id)) {
                nextPendingEvents = [...nextPendingEvents, createShareholderVoteEvent(vote)].slice(0, 12);
            }
        });

    if (nextVotes === existingVotes && nextInbox === player.inbox && nextPendingEvents === player.pendingEvents) return {
        ...player,
        shareholderVotes: existingVotes,
    };

    return {
        ...player,
        shareholderVotes: nextVotes,
        inbox: nextInbox,
        pendingEvents: nextPendingEvents,
    };
};

const createShareholderVoteEvent = (vote: ShareholderVote): ScheduledEvent => ({
    id: `event_${vote.id}`,
    week: vote.createdWeek,
    type: 'LIFE_EVENT',
    title: `Shareholder Decision: ${vote.stockSymbol}`,
    description: vote.summary,
    data: {
        stockDecisionType: 'SHAREHOLDER_VOTE',
        voteId: vote.id,
        stockId: vote.stockId,
        lifeEvent: {
            id: `life_${vote.id}`,
            type: 'NETWORKING',
            title: `Shareholder Decision: ${vote.companyName}`,
            titleKey: 'life.event.shareholder.title',
            description: `${vote.summary} Your ${vote.playerVotingPower.toFixed(2)}% stake gives you a direct voice instead of making you hunt inside Stocks.`,
            descriptionKey: 'life.event.shareholder.description',
            textVars: { company: vote.companyName, summary: vote.summary, stake: vote.playerVotingPower.toFixed(2) },
            category: 'Stock Decision',
            options: [
                {
                    id: 'VOTE_FOR',
                    label: 'Vote For',
                    labelKey: 'life.event.shareholder.for.label',
                    description: 'Back the board proposal and accept the market reaction.',
                    descriptionKey: 'life.event.shareholder.for.description',
                    previewEffects: [
                        { label: 'Vote', labelKey: 'life.effect.vote', value: 'For', tone: 'positive' },
                        { label: 'Market', labelKey: 'life.effect.market', value: 'Visible reaction', tone: 'neutral' },
                    ],
                    impact: (player: Player) => {
                        const result = resolveShareholderVote(player, vote.id, 'FOR');
                        return {
                            updatedPlayer: result.player,
                            log: result.vote?.outcomeSummary || `${vote.companyName} shareholder vote resolved.`,
                            logKey: result.vote?.outcomeSummary ? undefined : 'life.event.shareholder.for.log',
                            logVars: { company: vote.companyName },
                            effects: [
                                { label: 'Decision', labelKey: 'life.effect.decision', value: 'For', tone: result.success ? 'positive' : 'neutral' },
                            ],
                        };
                    },
                },
                {
                    id: 'VOTE_AGAINST',
                    label: 'Vote Against',
                    labelKey: 'life.event.shareholder.against.label',
                    description: 'Push back against the board proposal.',
                    descriptionKey: 'life.event.shareholder.against.description',
                    previewEffects: [
                        { label: 'Vote', labelKey: 'life.effect.vote', value: 'Against', tone: 'neutral' },
                        { label: 'Pressure', labelKey: 'life.effect.pressure', value: 'Board challenge', tone: 'negative' },
                    ],
                    impact: (player: Player) => {
                        const result = resolveShareholderVote(player, vote.id, 'AGAINST');
                        return {
                            updatedPlayer: result.player,
                            log: result.vote?.outcomeSummary || `${vote.companyName} shareholder vote resolved.`,
                            logKey: result.vote?.outcomeSummary ? undefined : 'life.event.shareholder.against.log',
                            logVars: { company: vote.companyName },
                            effects: [
                                { label: 'Decision', labelKey: 'life.effect.decision', value: 'Against', tone: result.success ? 'neutral' : 'negative' },
                            ],
                        };
                    },
                },
                {
                    id: 'ADVISOR_SAFE_VOTE',
                    label: 'Let Advisors Handle It',
                    labelKey: 'life.event.shareholder.advisor.label',
                    description: 'Watch a rewarded ad to take the safest guided vote and reduce messy fallout.',
                    descriptionKey: 'life.event.shareholder.advisor.description',
                    isGolden: true,
                    previewEffects: [
                        { label: 'Reward Ad', labelKey: 'life.effect.rewardAd', value: 'Required', tone: 'neutral' },
                        { label: 'Risk', labelKey: 'life.effect.risk', value: 'Safer route', tone: 'positive' },
                    ],
                    impact: (player: Player) => {
                        const result = resolveShareholderVote(player, vote.id, 'FOR', { golden: true });
                        return {
                            updatedPlayer: result.player,
                            log: result.vote?.outcomeSummary || `${vote.companyName} advisors guided the shareholder vote safely.`,
                            logKey: result.vote?.outcomeSummary ? undefined : 'life.event.shareholder.advisor.log',
                            logVars: { company: vote.companyName },
                            effects: [
                                { label: 'Golden Option', labelKey: 'life.effect.goldenOption', value: 'Advisor-led', tone: 'positive' },
                            ],
                        };
                    },
                },
            ],
        },
    },
});

export const resolveShareholderVote = (
    player: Player,
    voteId: string,
    selectedVote: 'FOR' | 'AGAINST',
    options: { golden?: boolean } = {},
): ShareholderVoteResult => {
    const votes = Array.isArray(player.shareholderVotes) ? player.shareholderVotes : [];
    const vote = votes.find(candidate => candidate.id === voteId);
    if (!vote) return { success: false, player, reason: 'VOTE_NOT_FOUND' };
    if (vote.status !== 'OPEN') return { success: false, player, vote, reason: 'VOTE_CLOSED' };

    const support = selectedVote === 'FOR'
        ? vote.expectedSupport + (vote.playerVotingPower * 0.55) + (options.golden ? 18 : 0)
        : vote.expectedSupport - (vote.playerVotingPower * 0.55);
    const passed = support >= 50;
    const stockImpact = selectedVote === 'FOR'
        ? (passed ? 0.025 : -0.012)
        : (passed ? -0.018 : 0.01);
    const outcomeSummary = passed
        ? `${vote.companyName} shareholders backed the proposal with ${Math.round(clamp(support))}% support${options.golden ? ' after advisor-led outreach' : ''}.`
        : `${vote.companyName} shareholders rejected the proposal with ${Math.round(clamp(100 - support))}% opposition.`;
    const resolvedVote: ShareholderVote = {
        ...vote,
        status: 'RESOLVED',
        selectedVote,
        outcomeSummary,
        resolvedWeek: player.currentWeek,
        resolvedYear: player.age,
    };
    const newsItem: NewsItem = {
        id: `news_${vote.id}_${selectedVote.toLowerCase()}`,
        headline: `${vote.companyName} shareholders ${passed ? 'back' : 'reject'} board proposal`,
        subtext: outcomeSummary,
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: Math.abs(stockImpact) >= 0.02 ? 'MEDIUM' : 'LOW',
    };

    return {
        success: true,
        vote: resolvedVote,
        player: {
            ...player,
            shareholderVotes: votes.map(candidate => candidate.id === voteId ? resolvedVote : candidate),
            stocks: player.stocks.map(stock => stock.id === vote.stockId
                ? {
                    ...stock,
                    price: Number(Math.max(0.01, stock.price * (1 + stockImpact)).toFixed(2)),
                    priceHistory: [...stock.priceHistory, Math.max(0.01, stock.price * (1 + stockImpact))].slice(-20),
                }
                : stock),
            news: [newsItem, ...(player.news || [])].slice(0, 80),
            inbox: (player.inbox || []).filter(message => message.data?.voteId !== voteId),
            pendingEvents: (player.pendingEvents || []).filter(event => event.data?.voteId !== voteId),
            logs: [
                {
                    week: player.currentWeek,
                    year: player.age,
                    message: `Shareholder Vote: ${vote.stockSymbol} ${selectedVote === 'FOR' ? 'for' : 'against'} resolved.`,
                    type: passed ? 'positive' as const : 'neutral' as const,
                },
                ...(player.logs || []),
            ].slice(0, 50),
        },
    };
};
