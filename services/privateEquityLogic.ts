import type { Player, Transaction } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import {
    getCompanyEquityPositions,
    type CompanyEquityPosition,
} from './companyPosition';

export const PRIVATE_EQUITY_REVIEW_WEEKS = 13;
export const PRIVATE_EQUITY_EXIT_LOCK_WEEKS = 26;
export const PRIVATE_EQUITY_DECLINE_COOLDOWN_WEEKS = 13;
export const PRIVATE_EQUITY_OFFER_LIFETIME_WEEKS = 6;

export type PrivateEquitySalePortion = 'HALF' | 'ALL';

export interface PrivateEquityWeekEvent {
    studioId: string;
    studioName: string;
    type: 'DISTRIBUTION' | 'VALUE_REVIEW' | 'EXIT_OFFER_READY' | 'EXIT_OFFER_EXPIRED';
    message: string;
    amount?: number;
    tone: 'positive' | 'neutral' | 'negative';
}

export interface PrivateEquityActionResult {
    success: boolean;
    player: Player;
    position?: CompanyEquityPosition;
    reason?: 'POSITION_NOT_FOUND' | 'EXIT_LOCKED' | 'EXIT_ALREADY_ACTIVE' | 'EXIT_COOLDOWN' | 'OFFER_NOT_READY' | 'OFFER_EXPIRED' | 'INVALID_POSITION';
}

const clamp = (value: number, min: number, max: number) => Math.max(
    min,
    Math.min(max, Number.isFinite(value) ? value : min),
);

const safeMoney = (value: unknown) => Math.max(0, Math.round(Number(value) || 0));
const roundPercent = (value: number) => Math.round(value * 10_000) / 10_000;
const absoluteWeek = (player: Pick<Player, 'age' | 'currentWeek'>) => getAbsoluteWeek(player.age, player.currentWeek);

const stableUnit = (key: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < key.length; index += 1) {
        hash ^= key.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4_294_967_295;
};

const getAcquisitionCase = (player: Pick<Player, 'flags'>, studioId: string): any => (
    (Array.isArray(player.flags?.studioAcquisitionCases) ? player.flags.studioAcquisitionCases : [])
        .find((entry: any) => entry?.studioId === studioId)
);

const normalizeExit = (
    exit: CompanyEquityPosition['exit'],
    percentOwned: number,
): CompanyEquityPosition['exit'] | undefined => {
    if (!exit || (exit.status !== 'MARKETING' && exit.status !== 'OFFER_READY')) return undefined;
    const percentForSale = clamp(Number(exit.percentForSale || 0), 0.01, percentOwned);
    const requestedAbsoluteWeek = Math.max(0, Math.round(Number(exit.requestedAbsoluteWeek || 0)));
    const offerReadyAbsoluteWeek = Math.max(requestedAbsoluteWeek + 1, Math.round(Number(exit.offerReadyAbsoluteWeek || requestedAbsoluteWeek + 2)));

    if (exit.status === 'MARKETING') {
        return {
            status: 'MARKETING',
            percentForSale,
            requestedAbsoluteWeek,
            offerReadyAbsoluteWeek,
        };
    }

    return {
        status: 'OFFER_READY',
        percentForSale,
        requestedAbsoluteWeek,
        offerReadyAbsoluteWeek,
        offerExpiresAbsoluteWeek: Math.max(
            offerReadyAbsoluteWeek + 1,
            Math.round(Number(exit.offerExpiresAbsoluteWeek || offerReadyAbsoluteWeek + PRIVATE_EQUITY_OFFER_LIFETIME_WEEKS)),
        ),
        referenceValue: safeMoney(exit.referenceValue),
        liquidityDiscountRate: clamp(Number(exit.liquidityDiscountRate || 0), 0.05, 0.3),
        advisoryFee: safeMoney(exit.advisoryFee),
        netProceeds: safeMoney(exit.netProceeds),
    };
};

export const normalizeCompanyEquityPositions = (
    player: Pick<Player, 'age' | 'currentWeek' | 'flags'>,
): CompanyEquityPosition[] => {
    const currentAbsoluteWeek = absoluteWeek(player);

    return getCompanyEquityPositions(player).flatMap((rawPosition) => {
        const percent = clamp(Number(rawPosition.percent || 0), 0, 49);
        if (percent <= 0 || !rawPosition.studioId) return [];

        const acquisitionCase = getAcquisitionCase(player, rawPosition.studioId);
        const acquiredYear = Math.max(1, Math.round(Number(
            rawPosition.acquiredYear
            || acquisitionCase?.closing?.signedYear
            || player.age,
        )));
        const acquiredWeek = clamp(Math.round(Number(
            rawPosition.acquiredWeek
            || acquisitionCase?.closing?.signedWeek
            || player.currentWeek,
        )), 1, 52);
        const acquiredAbsoluteWeek = getAbsoluteWeek(acquiredYear, acquiredWeek);
        const investedAmount = safeMoney(rawPosition.investedAmount);
        const entryCompanyValuation = Math.max(
            1,
            safeMoney(rawPosition.entryCompanyValuation),
            safeMoney(acquisitionCase?.publicValuation),
            percent > 0 ? Math.round(investedAmount / (percent / 100)) : 0,
        );
        const heldYears = Math.max(0, (currentAbsoluteWeek - acquiredAbsoluteWeek) / 52);
        const legacyAnnualMove = -0.03 + (stableUnit(`${rawPosition.studioId}:legacy-growth`) * 0.14);
        const legacyValuationFactor = clamp(
            Math.pow(1 + legacyAnnualMove, Math.min(12, heldYears)),
            0.55,
            2.5,
        );
        const hasTrackedValuation = Number.isFinite(Number(rawPosition.currentCompanyValuation))
            && Number(rawPosition.currentCompanyValuation) > 0;
        const currentCompanyValuation = hasTrackedValuation
            ? safeMoney(rawPosition.currentCompanyValuation)
            : Math.round(entryCompanyValuation * legacyValuationFactor);
        const shareholderIncomeEstimate = Number(acquisitionCase?.closing?.expectedAnnualIncome || 0);
        const inferredCompanyProfit = percent > 0
            ? shareholderIncomeEstimate / (percent / 100)
            : 0;
        const annualProfitEstimate = Number.isFinite(Number(rawPosition.annualProfitEstimate))
            ? Math.round(Number(rawPosition.annualProfitEstimate))
            : Math.round(inferredCompanyProfit || entryCompanyValuation * (0.02 + stableUnit(`${rawPosition.studioId}:profit`) * 0.055));
        const lastReviewAbsoluteWeek = Math.max(
            acquiredAbsoluteWeek,
            Math.round(Number(
                rawPosition.lastReviewAbsoluteWeek
                ?? (hasTrackedValuation ? acquiredAbsoluteWeek : currentAbsoluteWeek),
            )),
        );

        const position: CompanyEquityPosition = {
            ...rawPosition,
            studioId: String(rawPosition.studioId),
            studioName: String(rawPosition.studioName || acquisitionCase?.studioName || 'Private Studio'),
            percent: roundPercent(percent),
            investedAmount,
            acquiredWeek,
            acquiredYear,
            entryCompanyValuation,
            currentCompanyValuation,
            annualProfitEstimate,
            lastReviewAbsoluteWeek,
            lastQuarterChangePercent: clamp(Number(rawPosition.lastQuarterChangePercent || 0), -100, 100),
            lastQuarterOutcome: rawPosition.lastQuarterOutcome || 'VALUE_REVIEW',
            lastQuarterSummary: String(rawPosition.lastQuarterSummary || 'Private market estimate established.'),
            lifetimeDistributions: safeMoney(rawPosition.lifetimeDistributions),
            lastDistributionAbsoluteWeek: Number.isFinite(Number(rawPosition.lastDistributionAbsoluteWeek))
                ? Math.max(0, Math.round(Number(rawPosition.lastDistributionAbsoluteWeek)))
                : undefined,
            nextExitEligibleAbsoluteWeek: Number.isFinite(Number(rawPosition.nextExitEligibleAbsoluteWeek))
                ? Math.max(0, Math.round(Number(rawPosition.nextExitEligibleAbsoluteWeek)))
                : acquiredAbsoluteWeek + PRIVATE_EQUITY_EXIT_LOCK_WEEKS,
            exit: normalizeExit(rawPosition.exit, percent),
        };
        return [position];
    });
};

export const getPrivateEquityPosition = (
    player: Pick<Player, 'age' | 'currentWeek' | 'flags'>,
    studioId: string,
): CompanyEquityPosition | undefined => (
    normalizeCompanyEquityPositions(player).find(position => position.studioId === studioId)
);

export const getPrivateEquityPositionValue = (position: CompanyEquityPosition): number => (
    Math.round(Math.max(0, position.currentCompanyValuation || 0) * (Math.max(0, position.percent) / 100))
);

const writePositions = (player: Player, positions: CompanyEquityPosition[]): Player => ({
    ...player,
    flags: {
        ...player.flags,
        companyEquityPositions: positions,
    },
});

const createExitOffer = (
    position: CompanyEquityPosition,
    currentAbsoluteWeek: number,
): NonNullable<CompanyEquityPosition['exit']> => {
    const percentForSale = clamp(Number(position.exit?.percentForSale || 0), 0.01, position.percent);
    const referenceValue = Math.round(
        Math.max(0, position.currentCompanyValuation || 0)
        * (percentForSale / 100),
    );
    const liquidityDiscountRate = 0.08 + stableUnit(
        `${position.studioId}:${position.exit?.requestedAbsoluteWeek}:exit-discount`,
    ) * 0.14;
    const grossOffer = Math.round(referenceValue * (1 - liquidityDiscountRate));
    const advisoryFee = Math.round(grossOffer * 0.02);

    return {
        status: 'OFFER_READY',
        percentForSale,
        requestedAbsoluteWeek: position.exit?.requestedAbsoluteWeek || currentAbsoluteWeek,
        offerReadyAbsoluteWeek: currentAbsoluteWeek,
        offerExpiresAbsoluteWeek: currentAbsoluteWeek + PRIVATE_EQUITY_OFFER_LIFETIME_WEEKS,
        referenceValue,
        liquidityDiscountRate,
        advisoryFee,
        netProceeds: Math.max(0, grossOffer - advisoryFee),
    };
};

const reviewPosition = (
    position: CompanyEquityPosition,
    reviewAbsoluteWeek: number,
): { position: CompanyEquityPosition; event: PrivateEquityWeekEvent; distribution: number } => {
    const oldValuation = Math.max(1, position.currentCompanyValuation || position.entryCompanyValuation || 1);
    const profitYield = Number(position.annualProfitEstimate || 0) / oldValuation;
    const fundamentalMove = clamp(profitYield * 0.12, -0.035, 0.045);
    const marketMove = -0.075 + stableUnit(`${position.studioId}:${reviewAbsoluteWeek}:market`) * 0.16;
    const quarterlyMove = clamp(fundamentalMove + marketMove, -0.12, 0.15);
    const currentCompanyValuation = Math.max(
        Math.round((position.entryCompanyValuation || oldValuation) * 0.35),
        Math.round(oldValuation * (1 + quarterlyMove)),
    );
    const margin = Number(position.annualProfitEstimate || 0) / oldValuation;
    const annualProfitEstimate = Math.round(
        currentCompanyValuation
        * clamp(margin * (0.9 + stableUnit(`${position.studioId}:${reviewAbsoluteWeek}:profit`) * 0.2), -0.2, 0.25),
    );
    const boardRoll = stableUnit(`${position.studioId}:${reviewAbsoluteWeek}:distribution`);
    const canDistribute = annualProfitEstimate > 0 && boardRoll >= 0.53;
    const payoutRatio = canDistribute
        ? 0.12 + stableUnit(`${position.studioId}:${reviewAbsoluteWeek}:payout`) * 0.23
        : 0;
    const uncappedDistribution = Math.round(
        (annualProfitEstimate / 4)
        * payoutRatio
        * (position.percent / 100),
    );
    const stakeValue = currentCompanyValuation * (position.percent / 100);
    const distribution = canDistribute
        ? Math.max(0, Math.min(uncappedDistribution, Math.round(stakeValue * 0.05)))
        : 0;
    const retainedForGrowth = annualProfitEstimate > 0 && distribution === 0;
    const summary = distribution > 0
        ? `The board approved a private shareholder distribution after a ${quarterlyMove >= 0 ? 'stronger' : 'mixed'} quarter.`
        : retainedForGrowth
            ? 'The studio stayed profitable but retained earnings for productions and growth.'
            : 'The studio made no distribution while performance remained under pressure.';

    const nextPosition: CompanyEquityPosition = {
        ...position,
        currentCompanyValuation,
        annualProfitEstimate,
        lastReviewAbsoluteWeek: reviewAbsoluteWeek,
        lastQuarterChangePercent: Math.round(quarterlyMove * 10_000) / 100,
        lastQuarterOutcome: distribution > 0
            ? 'DISTRIBUTION'
            : retainedForGrowth
                ? 'RETAINED'
                : 'NO_DISTRIBUTION',
        lastQuarterSummary: summary,
        lifetimeDistributions: safeMoney(position.lifetimeDistributions) + distribution,
        lastDistributionAbsoluteWeek: distribution > 0
            ? reviewAbsoluteWeek
            : position.lastDistributionAbsoluteWeek,
    };

    return {
        position: nextPosition,
        distribution,
        event: {
            studioId: position.studioId,
            studioName: position.studioName || 'Private Studio',
            type: distribution > 0 ? 'DISTRIBUTION' : 'VALUE_REVIEW',
            amount: distribution || undefined,
            tone: distribution > 0 ? 'positive' : quarterlyMove < -0.05 ? 'negative' : 'neutral',
            message: distribution > 0
                ? `${position.studioName || 'Your private holding'} paid a $${distribution.toLocaleString()} shareholder distribution.`
                : `${position.studioName || 'Your private holding'}: ${summary}`,
        },
    };
};

export const processPrivateEquityWeek = (
    player: Player,
): { player: Player; events: PrivateEquityWeekEvent[] } => {
    const currentAbsoluteWeek = absoluteWeek(player);
    const events: PrivateEquityWeekEvent[] = [];
    const positions = normalizeCompanyEquityPositions(player).map(originalPosition => {
        let position = originalPosition;
        const reviewsDue = Math.min(
            4,
            Math.floor(Math.max(0, currentAbsoluteWeek - (position.lastReviewAbsoluteWeek || currentAbsoluteWeek)) / PRIVATE_EQUITY_REVIEW_WEEKS),
        );

        for (let review = 0; review < reviewsDue; review += 1) {
            const reviewAbsoluteWeek = (position.lastReviewAbsoluteWeek || currentAbsoluteWeek) + PRIVATE_EQUITY_REVIEW_WEEKS;
            const result = reviewPosition(position, reviewAbsoluteWeek);
            position = result.position;
            events.push(result.event);
        }

        if (position.exit?.status === 'MARKETING' && currentAbsoluteWeek >= position.exit.offerReadyAbsoluteWeek) {
            position = { ...position, exit: createExitOffer(position, currentAbsoluteWeek) };
            events.push({
                studioId: position.studioId,
                studioName: position.studioName || 'Private Studio',
                type: 'EXIT_OFFER_READY',
                tone: 'positive',
                message: `A buyer has submitted an offer for your ${position.studioName || 'private studio'} stake. Review it in Forbes.`,
            });
        } else if (
            position.exit?.status === 'OFFER_READY'
            && currentAbsoluteWeek > (position.exit.offerExpiresAbsoluteWeek || currentAbsoluteWeek)
        ) {
            position = {
                ...position,
                exit: undefined,
                nextExitEligibleAbsoluteWeek: currentAbsoluteWeek + PRIVATE_EQUITY_DECLINE_COOLDOWN_WEEKS,
            };
            events.push({
                studioId: position.studioId,
                studioName: position.studioName || 'Private Studio',
                type: 'EXIT_OFFER_EXPIRED',
                tone: 'neutral',
                message: `The buyer offer for ${position.studioName || 'your private holding'} expired. You can test the market again after the cooldown.`,
            });
        }

        return position;
    });

    return {
        player: writePositions(player, positions),
        events,
    };
};

export const requestPrivateEquityExit = ({
    player,
    studioId,
    portion,
    percentForSale: requestedPercentForSale,
}: {
    player: Player;
    studioId: string;
    /** Legacy shortcut retained for older callers and saved QA fixtures. */
    portion?: PrivateEquitySalePortion;
    /** Exact percentage points of the holding to market, rounded to 0.1%. */
    percentForSale?: number;
}): PrivateEquityActionResult => {
    const currentAbsoluteWeek = absoluteWeek(player);
    const positions = normalizeCompanyEquityPositions(player);
    const position = positions.find(entry => entry.studioId === studioId);
    if (!position) return { success: false, player, reason: 'POSITION_NOT_FOUND' };
    if (position.exit) return { success: false, player, position, reason: 'EXIT_ALREADY_ACTIVE' };
    const minimumExitWeek = getAbsoluteWeek(position.acquiredYear || player.age, position.acquiredWeek || player.currentWeek)
        + PRIVATE_EQUITY_EXIT_LOCK_WEEKS;
    if (currentAbsoluteWeek < minimumExitWeek) return { success: false, player, position, reason: 'EXIT_LOCKED' };
    if (currentAbsoluteWeek < (position.nextExitEligibleAbsoluteWeek || 0)) {
        return { success: false, player, position, reason: 'EXIT_COOLDOWN' };
    }

    const legacyPercentForSale = portion === 'HALF'
        ? position.percent / 2
        : portion === 'ALL'
            ? position.percent
            : undefined;
    const rawPercentForSale = requestedPercentForSale ?? legacyPercentForSale;
    const percentForSale = Math.round(Number(rawPercentForSale || 0) * 10) / 10;
    if (percentForSale < 0.1 || percentForSale > position.percent) {
        return { success: false, player, position, reason: 'INVALID_POSITION' };
    }
    const offerDelay = 2 + Math.floor(stableUnit(`${studioId}:${currentAbsoluteWeek}:buyer-delay`) * 4);
    const updatedPosition: CompanyEquityPosition = {
        ...position,
        exit: {
            status: 'MARKETING',
            percentForSale,
            requestedAbsoluteWeek: currentAbsoluteWeek,
            offerReadyAbsoluteWeek: currentAbsoluteWeek + offerDelay,
        },
        lastQuarterSummary: `Advisers are privately marketing ${percentForSale.toFixed(1)}% to potential buyers.`,
    };
    const nextPositions = positions.map(entry => entry.studioId === studioId ? updatedPosition : entry);

    return {
        success: true,
        position: updatedPosition,
        player: writePositions({
            ...player,
            logs: [{
                week: player.currentWeek,
                year: player.age,
                message: `Private sale process started for ${percentForSale.toFixed(1)}% of ${position.studioName || studioId}.`,
                type: 'neutral' as const,
            }, ...(player.logs || [])].slice(0, 50),
        }, nextPositions),
    };
};

export const declinePrivateEquityExit = ({
    player,
    studioId,
}: {
    player: Player;
    studioId: string;
}): PrivateEquityActionResult => {
    const currentAbsoluteWeek = absoluteWeek(player);
    const positions = normalizeCompanyEquityPositions(player);
    const position = positions.find(entry => entry.studioId === studioId);
    if (!position) return { success: false, player, reason: 'POSITION_NOT_FOUND' };
    if (!position.exit) return { success: false, player, position, reason: 'OFFER_NOT_READY' };
    const cooldown = position.exit.status === 'OFFER_READY'
        ? PRIVATE_EQUITY_DECLINE_COOLDOWN_WEEKS
        : 4;
    const updatedPosition: CompanyEquityPosition = {
        ...position,
        exit: undefined,
        nextExitEligibleAbsoluteWeek: currentAbsoluteWeek + cooldown,
        lastQuarterSummary: position.exit.status === 'OFFER_READY'
            ? 'You rejected the buyer offer and kept your stake.'
            : 'You paused the private sale process.',
    };

    return {
        success: true,
        position: updatedPosition,
        player: writePositions(
            player,
            positions.map(entry => entry.studioId === studioId ? updatedPosition : entry),
        ),
    };
};

const createExitTransaction = (
    player: Player,
    amount: number,
    studioName: string,
): Transaction => ({
    id: `private_equity_exit_${Date.now()}_${Math.round(amount)}`,
    week: player.currentWeek,
    year: player.age,
    amount,
    category: 'ASSET',
    description: `Private equity sale: ${studioName}`,
});

export const acceptPrivateEquityExit = ({
    player,
    studioId,
}: {
    player: Player;
    studioId: string;
}): PrivateEquityActionResult => {
    const currentAbsoluteWeek = absoluteWeek(player);
    const positions = normalizeCompanyEquityPositions(player);
    const position = positions.find(entry => entry.studioId === studioId);
    if (!position) return { success: false, player, reason: 'POSITION_NOT_FOUND' };
    if (position.exit?.status !== 'OFFER_READY') return { success: false, player, position, reason: 'OFFER_NOT_READY' };
    if (currentAbsoluteWeek > (position.exit.offerExpiresAbsoluteWeek || -1)) {
        return { success: false, player, position, reason: 'OFFER_EXPIRED' };
    }

    const soldPercent = clamp(position.exit.percentForSale, 0.01, position.percent);
    const remainingPercent = roundPercent(Math.max(0, position.percent - soldPercent));
    const saleRatio = clamp(soldPercent / position.percent, 0, 1);
    const proceeds = safeMoney(position.exit.netProceeds);
    if (proceeds <= 0) return { success: false, player, position, reason: 'INVALID_POSITION' };
    const studioName = position.studioName || studioId;
    const remainingPosition: CompanyEquityPosition | undefined = remainingPercent > 0.0001
        ? {
            ...position,
            percent: remainingPercent,
            investedAmount: Math.round(position.investedAmount * (1 - saleRatio)),
            exit: undefined,
            nextExitEligibleAbsoluteWeek: currentAbsoluteWeek + PRIVATE_EQUITY_DECLINE_COOLDOWN_WEEKS,
            lastQuarterSummary: `Sold ${soldPercent.toFixed(1)}%; ${remainingPercent.toFixed(1)}% remains in your portfolio.`,
        }
        : undefined;
    const nextPositions = positions.flatMap(entry => {
        if (entry.studioId !== studioId) return [entry];
        return remainingPosition ? [remainingPosition] : [];
    });
    const exitHistory = [
        {
            id: `private_equity_exit_${studioId}_${currentAbsoluteWeek}`,
            studioId,
            studioName,
            soldPercent,
            proceeds,
            referenceValue: safeMoney(position.exit?.referenceValue),
            liquidityDiscountRate: Number(position.exit?.liquidityDiscountRate || 0),
            week: player.currentWeek,
            year: player.age,
        },
        ...(Array.isArray(player.flags?.privateEquityExitHistory) ? player.flags.privateEquityExitHistory : []),
    ].slice(0, 20);
    const studioAcquisitionCases = Array.isArray(player.flags?.studioAcquisitionCases)
        ? player.flags.studioAcquisitionCases
        : [];
    const nextCases = remainingPosition
        ? studioAcquisitionCases
        : studioAcquisitionCases.map((entry: any) => (
            entry?.studioId !== studioId
                ? entry
                : {
                    ...entry,
                    status: 'CLOSED',
                    diligence: undefined,
                    offer: undefined,
                    sellerResponse: undefined,
                    closing: undefined,
                    reapproachAfterWeek: ((player.currentWeek - 1 + PRIVATE_EQUITY_EXIT_LOCK_WEEKS) % 52) + 1,
                    reapproachAfterYear: player.age + Math.floor((player.currentWeek - 1 + PRIVATE_EQUITY_EXIT_LOCK_WEEKS) / 52),
                }
        ));
    const transaction = createExitTransaction(player, proceeds, studioName);
    const nextPlayer = writePositions({
        ...player,
        money: Number(player.money || 0) + proceeds,
        finance: {
            ...player.finance,
            history: [transaction, ...(player.finance?.history || [])].slice(0, 200),
        },
        flags: {
            ...player.flags,
            privateEquityExitHistory: exitHistory,
            studioAcquisitionCases: nextCases,
        },
        logs: [{
            week: player.currentWeek,
            year: player.age,
            message: `Private stake sold: ${soldPercent.toFixed(1)}% of ${studioName} for ${proceeds.toLocaleString()} net.`,
            type: 'positive' as const,
        }, ...(player.logs || [])].slice(0, 50),
    }, nextPositions);

    return {
        success: true,
        player: nextPlayer,
        position: remainingPosition,
    };
};
