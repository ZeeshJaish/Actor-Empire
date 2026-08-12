import type {
    GameLanguage,
    Message,
    NewsItem,
    Player,
    ScheduledEvent,
    ShareholderInfluenceLevel,
    ShareholderVote,
    ShareholderVoteType,
    Stock,
} from '../types';
import { getStockOwnershipPercent, normalizeStockPrice, normalizeStockPriceHistory } from './stockLogic';
import { getPlayerLanguage, t } from './i18n';

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
const WEEKS_PER_YEAR = 52;

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const roundVotingPower = (value: number) => Math.round(value * 100) / 100;

const getAbsoluteWeek = (year: number, week: number) => (
    (Math.max(1, Math.round(Number(year) || 1)) - 1) * WEEKS_PER_YEAR
    + Math.min(WEEKS_PER_YEAR, Math.max(1, Math.round(Number(week) || 1)))
    - 1
);

const addWeeks = (year: number, week: number, weeks: number) => {
    const absoluteWeek = getAbsoluteWeek(year, week) + Math.max(0, Math.round(weeks));
    return {
        year: Math.floor(absoluteWeek / WEEKS_PER_YEAR) + 1,
        week: (absoluteWeek % WEEKS_PER_YEAR) + 1,
    };
};

const getVoteDueDate = (vote: ShareholderVote) => {
    const rawDueWeek = Math.max(1, Math.round(Number(vote.dueWeek) || 1));
    const normalizedDueWeek = ((rawDueWeek - 1) % WEEKS_PER_YEAR) + 1;
    const inferredDueYear = Math.max(1, Math.round(Number(vote.createdYear) || 1))
        + Math.floor((rawDueWeek - 1) / WEEKS_PER_YEAR);
    return {
        week: normalizedDueWeek,
        year: Number.isFinite(vote.dueYear)
            ? Math.max(1, Math.round(Number(vote.dueYear)))
            : inferredDueYear,
    };
};

export const isShareholderVoteExpired = (
    vote: ShareholderVote,
    player: Pick<Player, 'age' | 'currentWeek'>,
) => {
    if (vote.status === 'EXPIRED') return true;
    const due = getVoteDueDate(vote);
    return getAbsoluteWeek(player.age, player.currentWeek) >= getAbsoluteWeek(due.year, due.week);
};

const getHoldingPercent = (player: Pick<Player, 'portfolio'>, stock: Stock) => {
    const shares = Math.max(0, player.portfolio.find(item => item.stockId === stock.id)?.shares || 0);
    return getStockOwnershipPercent(shares, stock);
};

export const getShareholderInfluence = (ownershipPercent: number, language: GameLanguage = 'en'): ShareholderInfluence => {
    if (ownershipPercent >= 51) {
        return {
            level: 'CONTROLLING_OWNER',
            label: t(language, 'services.shareholder.influence.CONTROLLING_OWNER.label'),
            threshold: 51,
            rights: [
                t(language, 'services.shareholder.influence.CONTROLLING_OWNER.rights.controlVotes'),
                t(language, 'services.shareholder.influence.CONTROLLING_OWNER.rights.takeoverCommand'),
                t(language, 'services.shareholder.influence.CONTROLLING_OWNER.rights.boardControl'),
            ],
        };
    }
    if (ownershipPercent >= 30) {
        return {
            level: 'BOARD_SEAT',
            label: t(language, 'services.shareholder.influence.BOARD_SEAT.label'),
            threshold: 30,
            nextThreshold: 51,
            rights: [
                t(language, 'services.shareholder.influence.BOARD_SEAT.rights.boardSeat'),
                t(language, 'services.shareholder.influence.BOARD_SEAT.rights.strategyPressure'),
                t(language, 'services.shareholder.influence.BOARD_SEAT.rights.takeoverLeverage'),
            ],
        };
    }
    if (ownershipPercent >= 20) {
        return {
            level: 'STRATEGIC_INFLUENCE',
            label: t(language, 'services.shareholder.influence.STRATEGIC_INFLUENCE.label'),
            threshold: 20,
            nextThreshold: 30,
            rights: [
                t(language, 'services.shareholder.influence.STRATEGIC_INFLUENCE.rights.strategicProposals'),
                t(language, 'services.shareholder.influence.STRATEGIC_INFLUENCE.rights.managementPressure'),
                t(language, 'services.shareholder.influence.STRATEGIC_INFLUENCE.rights.allianceLeverage'),
            ],
        };
    }
    if (ownershipPercent >= 10) {
        return {
            level: 'SHAREHOLDER_VOTER',
            label: t(language, 'services.shareholder.influence.SHAREHOLDER_VOTER.label'),
            threshold: 10,
            nextThreshold: 20,
            rights: [
                t(language, 'services.shareholder.influence.SHAREHOLDER_VOTER.rights.boardVotes'),
                t(language, 'services.shareholder.influence.SHAREHOLDER_VOTER.rights.ballots'),
            ],
        };
    }
    return {
        level: 'PASSIVE_INVESTOR',
        label: t(language, 'services.shareholder.influence.PASSIVE_INVESTOR.label'),
        threshold: 0,
        nextThreshold: 10,
        rights: [
            t(language, 'services.shareholder.influence.PASSIVE_INVESTOR.rights.financialExposure'),
            t(language, 'services.shareholder.influence.PASSIVE_INVESTOR.rights.dividends'),
        ],
    };
};

const getVoteTemplate = (language: GameLanguage, type: ShareholderVoteType, stock: Stock) => {
    const vars = { company: stock.name };
    switch (type) {
        case 'DIVIDEND_POLICY':
            return {
                title: t(language, 'services.shareholder.vote.dividend.title', vars),
                summary: t(language, 'services.shareholder.vote.dividend.summary'),
                stakes: [
                    t(language, 'services.shareholder.vote.dividend.stakeFor'),
                    t(language, 'services.shareholder.vote.dividend.stakeAgainst'),
                ],
            };
        case 'SLATE_APPROVAL':
            return {
                title: t(language, 'services.shareholder.vote.slate.title', vars),
                summary: t(language, 'services.shareholder.vote.slate.summary'),
                stakes: [
                    t(language, 'services.shareholder.vote.slate.stakeFor'),
                    t(language, 'services.shareholder.vote.slate.stakeAgainst'),
                ],
            };
        case 'CEO_CONFIDENCE':
            return {
                title: t(language, 'services.shareholder.vote.ceo.title', vars),
                summary: t(language, 'services.shareholder.vote.ceo.summary'),
                stakes: [
                    t(language, 'services.shareholder.vote.ceo.stakeFor'),
                    t(language, 'services.shareholder.vote.ceo.stakeAgainst'),
                ],
            };
        case 'CAPITAL_RAISE':
        default:
            return {
                title: t(language, 'services.shareholder.vote.capital.title', vars),
                summary: t(language, 'services.shareholder.vote.capital.summary'),
                stakes: [
                    t(language, 'services.shareholder.vote.capital.stakeFor'),
                    t(language, 'services.shareholder.vote.capital.stakeAgainst'),
                ],
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
    language: GameLanguage = 'en',
): ShareholderVote | null => {
    const ownershipPercent = getHoldingPercent(player, stock);
    if (getShareholderInfluence(ownershipPercent).level === 'PASSIVE_INVESTOR') return null;

    const template = getVoteTemplate(language, type, stock);
    const expectedSupport = clamp(48 + (ownershipPercent * 0.65) + (stock.dividendYield * 120) - (stock.volatility * 90), 28, 82);

    const dueDate = addWeeks(player.age, player.currentWeek, 4);

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
        dueWeek: dueDate.week,
        dueYear: dueDate.year,
    };
};

const createVoteMessage = (vote: ShareholderVote, language: GameLanguage = 'en'): Message => ({
    id: `msg_${vote.id}`,
    sender: 'Shareholder Services',
    subject: t(language, 'services.shareholder.message.subject', { symbol: vote.stockSymbol }),
    text: t(language, 'services.shareholder.message.text', {
        company: vote.companyName,
        stake: vote.playerVotingPower.toFixed(2),
    }),
    type: 'SHAREHOLDER_VOTE' as Message['type'],
    data: { voteId: vote.id, stockId: vote.stockId },
    isRead: false,
    weekSent: vote.createdWeek,
    expiresIn: 4,
});

export const processShareholderVoting = (player: Player): Player => {
    const language = getPlayerLanguage(player);
    const existingVotes = Array.isArray(player.shareholderVotes) ? player.shareholderVotes : [];
    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const expiredVoteIds = new Set<string>();
    const normalizedVotes = existingVotes.map(vote => {
        if (vote.status !== 'OPEN') return vote;
        const due = getVoteDueDate(vote);
        if (currentAbsoluteWeek < getAbsoluteWeek(due.year, due.week)) {
            if (vote.dueWeek === due.week && vote.dueYear === due.year) return vote;
            return { ...vote, dueWeek: due.week, dueYear: due.year };
        }
        expiredVoteIds.add(vote.id);
        return {
            ...vote,
            status: 'EXPIRED' as const,
            dueWeek: due.week,
            dueYear: due.year,
        };
    });
    let nextVotes = normalizedVotes.every((vote, index) => vote === existingVotes[index])
        ? existingVotes
        : normalizedVotes;
    let nextInbox = Array.isArray(player.inbox) ? player.inbox : [];
    let nextPendingEvents = Array.isArray(player.pendingEvents) ? player.pendingEvents : [];

    if (expiredVoteIds.size > 0) {
        nextInbox = nextInbox.map(message => {
            if (!expiredVoteIds.has(String(message.data?.voteId || ''))) return message;
            return {
                ...message,
                isExpired: true,
                expiresIn: undefined,
                expiredAtWeek: player.currentWeek,
                expiredNoticeWeeks: Math.max(2, Number(message.expiredNoticeWeeks || 0)),
            };
        });
        nextPendingEvents = nextPendingEvents.filter(event => !expiredVoteIds.has(String(event.data?.voteId || '')));
    }

    const hasOpenVoteForStock = (stockId: string) => nextVotes.some(vote => vote.stockId === stockId && vote.status === 'OPEN');

    player.stocks
        .filter(stock => stock.sector === 'MEDIA' && Boolean(stock.relatedStudioId))
        .forEach(stock => {
            if (hasOpenVoteForStock(stock.id)) return;
            const ownershipPercent = getHoldingPercent(player, stock);
            if (ownershipPercent < 10) return;
            const lastVote = nextVotes
                .filter(vote => vote.stockId === stock.id)
                .sort((a, b) => (
                    getAbsoluteWeek(b.createdYear, b.createdWeek)
                    - getAbsoluteWeek(a.createdYear, a.createdWeek)
                ))[0];
            if (
                lastVote
                && currentAbsoluteWeek - getAbsoluteWeek(lastVote.createdYear, lastVote.createdWeek) < VOTE_CYCLE_WEEKS
            ) return;

            const vote = createShareholderVote(player, stock, undefined, language);
            if (!vote) return;
            nextVotes = [vote, ...nextVotes].slice(0, 24);
            nextInbox = [createVoteMessage(vote, language), ...nextInbox].slice(0, 120);
            if (!nextPendingEvents.some(event => event.data?.voteId === vote.id)) {
                nextPendingEvents = [...nextPendingEvents, createShareholderVoteEvent(vote, language)].slice(0, 12);
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

const createShareholderVoteEvent = (vote: ShareholderVote, language: GameLanguage = 'en'): ScheduledEvent => ({
    id: `event_${vote.id}`,
    week: vote.createdWeek,
    type: 'LIFE_EVENT',
    title: t(language, 'services.shareholder.event.titleFallback', { symbol: vote.stockSymbol }),
    description: vote.summary,
    data: {
        stockDecisionType: 'SHAREHOLDER_VOTE',
        voteId: vote.id,
        stockId: vote.stockId,
        lifeEvent: {
            id: `life_${vote.id}`,
            type: 'NETWORKING',
            title: t(language, 'life.event.shareholder.title', { company: vote.companyName }),
            titleKey: 'life.event.shareholder.title',
            description: t(language, 'life.event.shareholder.description', { summary: vote.summary, stake: vote.playerVotingPower.toFixed(2) }),
            descriptionKey: 'life.event.shareholder.description',
            textVars: { company: vote.companyName, summary: vote.summary, stake: vote.playerVotingPower.toFixed(2) },
            category: t(language, 'services.shareholder.event.category'),
            options: [
                {
                    id: 'VOTE_FOR',
                    label: t(language, 'life.event.shareholder.for.label'),
                    labelKey: 'life.event.shareholder.for.label',
                    description: t(language, 'life.event.shareholder.for.description'),
                    descriptionKey: 'life.event.shareholder.for.description',
                    previewEffects: [
                        { label: t(language, 'life.effect.vote'), labelKey: 'life.effect.vote', value: t(language, 'services.shareholder.value.for'), tone: 'positive' },
                        { label: t(language, 'life.effect.market'), labelKey: 'life.effect.market', value: t(language, 'services.shareholder.value.visibleReaction'), tone: 'neutral' },
                    ],
                    impact: (player: Player) => {
                        const result = resolveShareholderVote(player, vote.id, 'FOR');
                        return {
                            updatedPlayer: result.player,
                            log: result.vote?.outcomeSummary || t(language, 'life.event.shareholder.for.log', { company: vote.companyName }),
                            logKey: result.vote?.outcomeSummary ? undefined : 'life.event.shareholder.for.log',
                            logVars: { company: vote.companyName },
                            effects: [
                                { label: t(language, 'life.effect.decision'), labelKey: 'life.effect.decision', value: t(language, 'services.shareholder.value.for'), tone: result.success ? 'positive' : 'neutral' },
                            ],
                        };
                    },
                },
                {
                    id: 'VOTE_AGAINST',
                    label: t(language, 'life.event.shareholder.against.label'),
                    labelKey: 'life.event.shareholder.against.label',
                    description: t(language, 'life.event.shareholder.against.description'),
                    descriptionKey: 'life.event.shareholder.against.description',
                    previewEffects: [
                        { label: t(language, 'life.effect.vote'), labelKey: 'life.effect.vote', value: t(language, 'services.shareholder.value.against'), tone: 'neutral' },
                        { label: t(language, 'life.effect.pressure'), labelKey: 'life.effect.pressure', value: t(language, 'services.shareholder.value.boardChallenge'), tone: 'negative' },
                    ],
                    impact: (player: Player) => {
                        const result = resolveShareholderVote(player, vote.id, 'AGAINST');
                        return {
                            updatedPlayer: result.player,
                            log: result.vote?.outcomeSummary || t(language, 'life.event.shareholder.against.log', { company: vote.companyName }),
                            logKey: result.vote?.outcomeSummary ? undefined : 'life.event.shareholder.against.log',
                            logVars: { company: vote.companyName },
                            effects: [
                                { label: t(language, 'life.effect.decision'), labelKey: 'life.effect.decision', value: t(language, 'services.shareholder.value.against'), tone: result.success ? 'neutral' : 'negative' },
                            ],
                        };
                    },
                },
                {
                    id: 'ADVISOR_SAFE_VOTE',
                    label: t(language, 'life.event.shareholder.advisor.label'),
                    labelKey: 'life.event.shareholder.advisor.label',
                    description: t(language, 'life.event.shareholder.advisor.description'),
                    descriptionKey: 'life.event.shareholder.advisor.description',
                    isGolden: true,
                    previewEffects: [
                        { label: t(language, 'life.effect.rewardAd'), labelKey: 'life.effect.rewardAd', value: t(language, 'services.shareholder.value.required'), tone: 'neutral' },
                        { label: t(language, 'life.effect.risk'), labelKey: 'life.effect.risk', value: t(language, 'services.shareholder.value.saferRoute'), tone: 'positive' },
                    ],
                    impact: (player: Player) => {
                        const result = resolveShareholderVote(player, vote.id, 'FOR', { golden: true });
                        return {
                            updatedPlayer: result.player,
                            log: result.vote?.outcomeSummary || t(language, 'life.event.shareholder.advisor.log', { company: vote.companyName }),
                            logKey: result.vote?.outcomeSummary ? undefined : 'life.event.shareholder.advisor.log',
                            logVars: { company: vote.companyName },
                            effects: [
                                { label: t(language, 'life.effect.goldenOption'), labelKey: 'life.effect.goldenOption', value: t(language, 'services.shareholder.value.advisorLed'), tone: 'positive' },
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
    const language = getPlayerLanguage(player);
    const votes = Array.isArray(player.shareholderVotes) ? player.shareholderVotes : [];
    const vote = votes.find(candidate => candidate.id === voteId);
    if (!vote) return { success: false, player, reason: 'VOTE_NOT_FOUND' };
    if (vote.status !== 'OPEN' || isShareholderVoteExpired(vote, player)) {
        return { success: false, player, vote, reason: 'VOTE_CLOSED' };
    }

    const support = selectedVote === 'FOR'
        ? vote.expectedSupport + (vote.playerVotingPower * 0.55) + (options.golden ? 18 : 0)
        : vote.expectedSupport - (vote.playerVotingPower * 0.55);
    const passed = support >= 50;
    const stockImpact = selectedVote === 'FOR'
        ? (passed ? 0.025 : -0.012)
        : (passed ? -0.018 : 0.01);
    const outcomeSummary = passed
        ? t(language, 'services.shareholder.result.passed', {
            company: vote.companyName,
            support: Math.round(clamp(support)),
            advisorSuffix: options.golden ? t(language, 'services.shareholder.result.advisorSuffix') : '',
        })
        : t(language, 'services.shareholder.result.rejected', {
            company: vote.companyName,
            opposition: Math.round(clamp(100 - support)),
        });
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
        headline: t(language, 'services.shareholder.news.headline', {
            company: vote.companyName,
            decision: t(language, passed ? 'services.shareholder.news.back' : 'services.shareholder.news.reject'),
        }),
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
            stocks: player.stocks.map(stock => {
                if (stock.id !== vote.stockId) return stock;
                const nextPrice = normalizeStockPrice(stock, stock.price * (1 + stockImpact));
                return {
                    ...stock,
                    price: nextPrice,
                    priceHistory: [...normalizeStockPriceHistory(stock), nextPrice].slice(-20),
                };
            }),
            news: [newsItem, ...(player.news || [])].slice(0, 80),
            inbox: (player.inbox || []).filter(message => message.data?.voteId !== voteId),
            pendingEvents: (player.pendingEvents || []).filter(event => event.data?.voteId !== voteId),
            logs: [
                {
                    week: player.currentWeek,
                    year: player.age,
                    message: t(language, 'services.shareholder.log.resolved', {
                        symbol: vote.stockSymbol,
                        vote: t(language, selectedVote === 'FOR' ? 'services.shareholder.value.for' : 'services.shareholder.value.against'),
                    }),
                    type: passed ? 'positive' as const : 'neutral' as const,
                },
                ...(player.logs || []),
            ].slice(0, 50),
        },
    };
};
