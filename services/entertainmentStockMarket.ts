import type { IndustryProject, Player, Stock } from '../types';
import { getStockOutstandingShares, getStockOwnershipPercent } from './stockLogic';

export type StockCompanyType = 'ENTERTAINMENT_STUDIO' | 'CONSUMER_COMPANY';

export interface EntertainmentStockSnapshot {
    isEntertainment: boolean;
    companyType: StockCompanyType;
    marketCap: number;
    holdingShares: number;
    positionValue: number;
    ownershipPercent: number;
    changeAmount: number;
    changePercent: number;
    hits: number;
    flops: number;
    hitRate: number;
    momentumScore: number;
    momentumLabel: 'Cold' | 'Watch' | 'Steady' | 'Hot';
    performanceLabel: string;
    primaryDriver: string;
    latestRelease?: string;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const roundPercent = (value: number) => Math.round(value * 10_000) / 10_000;

const isHit = (outcome: string) => ['HIT', 'SUCCESS', 'BLOCKBUSTER'].some(label => outcome.toUpperCase().includes(label));

const isFlop = (outcome: string) => ['FLOP', 'BOMB', 'DISASTER'].some(label => outcome.toUpperCase().includes(label));

const getStudioProjects = (player: Pick<Player, 'world'>, studioId?: string): IndustryProject[] => {
    if (!studioId) return [];
    return [...(player.world.projects || [])]
        .filter(project => project.studioId === studioId)
        .sort((a, b) => (b.year - a.year) || (b.weekReleased - a.weekReleased))
        .slice(0, 8);
};

const getMomentumLabel = (score: number): EntertainmentStockSnapshot['momentumLabel'] => {
    if (score >= 72) return 'Hot';
    if (score >= 52) return 'Steady';
    if (score >= 35) return 'Watch';
    return 'Cold';
};

const getPerformanceLabel = (hits: number, flops: number, momentum: number) => {
    if (hits >= 2 && hits > flops) return 'Hit-powered';
    if (flops >= 2 && flops > hits) return 'Under pressure';
    if (momentum >= 72) return 'Market favorite';
    if (momentum < 35) return 'Confidence weak';
    return 'Mixed slate';
};

const getPrimaryDriver = (
    stock: Stock,
    projects: IndustryProject[],
    momentumLabel: EntertainmentStockSnapshot['momentumLabel'],
) => {
    const latest = projects[0];
    if (latest) {
        const outcome = latest.reviews || 'release';
        return `${latest.title} · ${outcome.replaceAll('_', ' ')}`;
    }
    if (stock.relatedStudioId) return `${stock.name} slate · ${momentumLabel.toLowerCase()} momentum`;
    return `${stock.sector.toLowerCase()} sector movement`;
};

export const getEntertainmentStockSnapshot = (
    player: Pick<Player, 'portfolio' | 'world'>,
    stock: Stock,
): EntertainmentStockSnapshot => {
    const isEntertainment = stock.sector === 'MEDIA' && Boolean(stock.relatedStudioId);
    const outstandingShares = getStockOutstandingShares(stock);
    const holdingShares = Math.max(0, player.portfolio.find(item => item.stockId === stock.id)?.shares || 0);
    const positionValue = holdingShares * Math.max(0, stock.price || 0);
    const ownershipPercent = getStockOwnershipPercent(holdingShares, stock);
    const historyStart = stock.priceHistory[0] || stock.price || 1;
    const changeAmount = stock.price - historyStart;
    const changePercent = historyStart > 0 ? (changeAmount / historyStart) * 100 : 0;
    const projects = getStudioProjects(player, stock.relatedStudioId);
    const hits = projects.filter(project => isHit(project.reviews || '')).length;
    const flops = projects.filter(project => isFlop(project.reviews || '')).length;
    const decided = hits + flops;
    const hitRate = decided ? Math.round((hits / decided) * 100) : 0;
    const averageQuality = projects.length
        ? projects.reduce((sum, project) => sum + Math.max(0, project.quality || 0), 0) / projects.length
        : 55;
    const outcomeForce = (hits * 10) - (flops * 12);
    const marketTrend = Math.max(-15, Math.min(15, changePercent * 2));
    const momentumScore = Math.round(clamp(50 + outcomeForce + ((averageQuality - 55) * 0.35) + marketTrend));
    const momentumLabel = getMomentumLabel(momentumScore);

    return {
        isEntertainment,
        companyType: isEntertainment ? 'ENTERTAINMENT_STUDIO' : 'CONSUMER_COMPANY',
        marketCap: Math.max(0, stock.price || 0) * outstandingShares,
        holdingShares,
        positionValue,
        ownershipPercent,
        changeAmount,
        changePercent,
        hits,
        flops,
        hitRate,
        momentumScore,
        momentumLabel,
        performanceLabel: getPerformanceLabel(hits, flops, momentumScore),
        primaryDriver: getPrimaryDriver(stock, projects, momentumLabel),
        latestRelease: projects[0]?.title,
    };
};
