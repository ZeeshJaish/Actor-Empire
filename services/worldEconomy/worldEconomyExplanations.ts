import type { Player } from '../../types';
import { createDeterministicId } from '../deterministicRandom';

export interface WorldEconomyExplanation {
    id: string;
    materialityRank: number;
    tone: 'POSITIVE' | 'WATCH' | 'CRITICAL' | 'NEUTRAL';
    surfaces: Array<'CEO_REPORT' | 'ANALYTICS' | 'AUDIENCE'>;
    title: string;
    reason: string;
    sourceIds: string[];
}

export const buildWorldEconomyExplanations = (
    player: Player,
    absoluteWeek: number,
): WorldEconomyExplanation[] => {
    const customers = player.world.worldStreamingCustomers;
    const viewing = player.world.worldStreamingViewing;
    const economy = player.world.worldStreamingPlatformEconomy;
    const platform = economy?.platforms.PLAYER;
    if (!customers || !viewing || !economy || !platform) return [];

    const customerRows = Object.values(customers.countries)
        .flatMap(country => country.platformSummaries.filter(summary => summary.platformId === 'PLAYER'));
    const joins = customerRows.reduce((sum, row) => sum + row.joins + row.reactivations, 0);
    const cancellations = customerRows.reduce((sum, row) => sum + row.cancellations, 0);
    const shared = customerRows.reduce((sum, row) => sum + row.sharedActiveViewers, 0);
    const piracy = customerRows.reduce((sum, row) => sum + row.piracyReach, 0);
    const reasons = new Set(customerRows.map(row => row.strongestReasonId));
    const sources = [
        `WE5:${customers.sourceFingerprint}`,
        `WE6:${viewing.sourceFingerprint}`,
        `WE7:${economy.sourceFingerprint}`,
    ];
    const result: WorldEconomyExplanation[] = [];
    const add = (
        key: string,
        materialityRank: number,
        tone: WorldEconomyExplanation['tone'],
        title: string,
        reason: string,
        surfaces: WorldEconomyExplanation['surfaces'] = ['CEO_REPORT', 'ANALYTICS'],
    ) => result.push({
        id: createDeterministicId('world-economy-explanation', absoluteWeek, key),
        materialityRank,
        tone,
        surfaces,
        title,
        reason,
        sourceIds: sources,
    });

    const baseAccounts = Math.max(1, platform.endingPaidAccounts + cancellations - joins);
    const netMovement = joins - cancellations;
    if (Math.abs(netMovement) / baseAccounts >= .005) {
        add(
            'audience-movement',
            88 + Math.min(10, Math.round(Math.abs(netMovement) / baseAccounts * 100)),
            netMovement >= 0 ? 'POSITIVE' : 'CRITICAL',
            netMovement >= 0 ? 'Subscriber momentum is material' : 'Subscriber losses need attention',
            netMovement >= 0
                ? `${joins.toLocaleString()} joins and returns outweighed ${cancellations.toLocaleString()} cancellations.`
                : `${cancellations.toLocaleString()} cancellations outweighed ${joins.toLocaleString()} joins and returns.`,
        );
    }
    if (cancellations / baseAccounts >= .02 || reasons.has('PRICE') || reasons.has('COMPETITOR')) {
        const pressure = reasons.has('PRICE') ? 'pricing' : reasons.has('COMPETITOR') ? 'rival offers' : 'retention pressure';
        add('churn-pressure', 84, 'WATCH', 'Churn has a visible cause', `The strongest committed customer signal is ${pressure}; ${cancellations.toLocaleString()} accounts cancelled.`, ['CEO_REPORT', 'ANALYTICS', 'AUDIENCE']);
    }
    if (shared / Math.max(1, platform.endingPaidAccounts) >= .08) {
        add('sharing', 76, 'WATCH', 'Sharing is expanding reach beyond paid homes', `${shared.toLocaleString()} active viewers are watching through shared access. This grows reach without counting them as subscription revenue.`, ['ANALYTICS', 'AUDIENCE']);
    }
    if (piracy / Math.max(1, platform.endingPaidAccounts + shared) >= .05) {
        add('piracy', 74, 'WATCH', 'Unlicensed demand is material', `${piracy.toLocaleString()} viewers are in piracy reach. Their viewing is not booked as subscription cash.`, ['ANALYTICS', 'AUDIENCE']);
    }
    if (platform.weeklyOperatingResult < 0) {
        add('operating-loss', 91, 'CRITICAL', 'Audience scale is not covering operations', `Weekly revenue was $${Math.round(platform.weeklyRevenue).toLocaleString()} against $${Math.round(platform.appliedWeeklyOperatingCost).toLocaleString()} of operating cost.`);
    }
    const hoursPerViewer = platform.hoursViewed / Math.max(1, platform.viewingAccounts);
    if (platform.viewingAccounts > 0 && (hoursPerViewer >= 6 || hoursPerViewer < 1.25)) {
        add(
            'viewing-depth',
            68,
            hoursPerViewer >= 6 ? 'POSITIVE' : 'WATCH',
            hoursPerViewer >= 6 ? 'Viewing depth is strengthening retention' : 'Accounts are not finding enough to watch',
            `Committed viewing averaged ${hoursPerViewer.toFixed(1)} hours per active account this week.`,
            ['CEO_REPORT', 'ANALYTICS', 'AUDIENCE'],
        );
    }
    if (player.world.worldEconomyHealth?.warningCodes.length) {
        add('recovered-derived-state', 100, 'NEUTRAL', 'World data recovered safely', 'Derived audience data was rebuilt before this week was committed; player money, projects, rights and ownership were preserved.');
    }

    return result
        .sort((left, right) => right.materialityRank - left.materialityRank || left.id.localeCompare(right.id))
        .slice(0, 3);
};
