import type { Player } from '../../types';
import type {
    FinalizeSharedIndustryB8ReportInput,
    SharedIndustryB8IntegritySnapshot,
    SharedIndustryB8Report,
    SharedIndustryB8Snapshot,
    SharedIndustryB8Violation,
} from './sharedIndustryB8Types';

export type {
    SharedIndustryB8Regime,
    SharedIndustryB8Report,
    SharedIndustryB8Snapshot,
    SharedIndustryB8Violation,
} from './sharedIndustryB8Types';

export const SHARED_INDUSTRY_B8_CHECKPOINTS = [520, 1_300, 2_600, 5_200, 20_800] as const;

const duplicateCount = (ids: string[]): number => ids.length - new Set(ids).size;

const finiteIssueCount = (values: unknown[]): number => values.reduce<number>((count, value) => (
    typeof value === 'number' && !Number.isFinite(value) ? count + 1 : count
), 0);

const materialNumbers = (player: Player): unknown[] => {
    const studios = Object.values(player.world.studios || {});
    const platforms = Object.values(player.world.platforms || {});
    const productions = Object.values(player.world.industryProductions || {});
    const rightsContracts = Object.values(player.world.streamingRightsContracts || {});
    return [
        player.money,
        ...player.world.projects.flatMap(project => [project.quality, project.rating, project.boxOffice]),
        ...studios.flatMap(studio => [
            studio.valuation,
            studio.reputation,
            studio.cashReserve,
            studio.ai?.finance.debtPrincipalMillions,
            studio.ai?.finance.weeklyOperatingCostMillions,
            studio.ai?.finance.committedSpendMillions,
        ]),
        ...platforms.flatMap(platform => [
            platform.cashReserve,
            platform.subscribers,
            platform.valuation,
            platform.ai?.debtMillions,
            platform.ai?.standaloneValuationBillions,
        ]),
        ...productions.flatMap(production => [
            production.budgetMillions,
            production.paidMillions,
            production.productionCalendar.totalWeeks,
            production.productionCalendar.elapsedWeeks,
        ]),
        ...rightsContracts.flatMap(contract => [
            contract.startsAtAbsoluteWeek,
            contract.expiresAtAbsoluteWeek,
            contract.durationWeeks,
        ]),
    ];
};

const negativeCashIssueCount = (player: Player): number => {
    const studios = Object.values(player.world.studios || {});
    const platforms = Object.values(player.world.platforms || {});
    return [
        ...studios.map(studio => studio.cashReserve),
        ...platforms.map(platform => platform.cashReserve),
    ].filter(value => typeof value === 'number' && value < 0).length;
};

const danglingProjectReferenceCount = (player: Player): number => {
    const projectIds = new Set(player.world.projects.map(project => project.id));
    const productions = Object.values(player.world.industryProductions || {});
    const productionProjectIds = new Set(productions.map(production => production.canonicalProjectId));
    const productionReferences = productions
        .filter(production => production.status === 'RELEASED'
            && production.canonicalProjectId
            && !projectIds.has(production.canonicalProjectId));
    const rightsReferences = Object.values(player.world.streamingRightsContracts || {})
        .filter(contract => contract.sourceProjectId
            && !projectIds.has(contract.sourceProjectId)
            && !productionProjectIds.has(contract.sourceProjectId));
    return productionReferences.length + rightsReferences.length;
};

const invalidStreamingTheatricalReleaseCount = (player: Player): number => player.world.projects.filter(project => (
    project.releaseStrategy === 'STREAMING_ONLY' && Number(project.boxOffice) > 0
)).length;

const unboundedHistoryIssueCount = (player: Player): number => {
    const ledger = player.world.industryEvents;
    let count = 0;
    if ((ledger?.events.length || 0) > 520) count += 1;
    if ((ledger?.publishedEventKeys.length || 0) > 1_040) count += 1;
    return count;
};

export const observeSharedIndustryB8Week = (
    previous: SharedIndustryB8Snapshot | undefined,
    player: Player,
    absoluteWeek: number,
): SharedIndustryB8Snapshot => {
    const projectIds = player.world.projects.map(project => project.id);
    const productionIds = Object.values(player.world.industryProductions || {}).map(production => production.id);
    const eventIds = (player.world.industryEvents?.events || []).map(event => event.id);
    const previousEventIds = new Set(previous?.eventIds || []);
    const integrity: SharedIndustryB8IntegritySnapshot = {
        nonFiniteValues: finiteIssueCount(materialNumbers(player)),
        duplicateProjectIds: duplicateCount(projectIds),
        duplicateProductionIds: duplicateCount(productionIds),
        duplicateEventIds: duplicateCount(eventIds),
        danglingProjectReferences: danglingProjectReferenceCount(player),
        invalidStreamingTheatricalReleases: invalidStreamingTheatricalReleaseCount(player),
        unexplainedNegativeCash: negativeCashIssueCount(player),
        unboundedHistories: unboundedHistoryIssueCount(player),
    };
    return {
        absoluteWeek,
        counts: {
            studios: Object.keys(player.world.studios || {}).length,
            platforms: Object.keys(player.world.platforms || {}).length,
            projects: projectIds.length,
            productions: productionIds.length,
            rightsContracts: Object.keys(player.world.streamingRightsContracts || {}).length,
            industryEvents: eventIds.length,
        },
        integrity,
        projectIds,
        productionIds,
        eventIds,
        materialEventCount: previous
            ? eventIds.filter(id => !previousEventIds.has(id)).length
            : eventIds.length,
    };
};

const integrityMaximum = (
    snapshots: SharedIndustryB8Snapshot[],
    key: keyof SharedIndustryB8IntegritySnapshot,
): number => snapshots.reduce((maximum, snapshot) => Math.max(maximum, snapshot.integrity[key]), 0);

export const finalizeSharedIndustryB8Report = (
    input: FinalizeSharedIndustryB8ReportInput,
): SharedIndustryB8Report => {
    const checkpoints = [...input.snapshots].sort((left, right) => left.absoluteWeek - right.absoluteWeek);
    const expectedCheckpoints = [...(input.expectedCheckpoints || [])];
    const observedWeeks = new Set(checkpoints.map(checkpoint => checkpoint.absoluteWeek));
    return {
        regime: input.regime,
        seed: input.seed,
        horizonWeeks: checkpoints[checkpoints.length - 1]?.absoluteWeek || 0,
        checkpoints,
        expectedCheckpoints,
        integrity: {
            nonFiniteValues: integrityMaximum(checkpoints, 'nonFiniteValues'),
            duplicateProjectIds: integrityMaximum(checkpoints, 'duplicateProjectIds'),
            duplicateProductionIds: integrityMaximum(checkpoints, 'duplicateProductionIds'),
            duplicateEventIds: integrityMaximum(checkpoints, 'duplicateEventIds'),
            danglingProjectReferences: integrityMaximum(checkpoints, 'danglingProjectReferences'),
            invalidStreamingTheatricalReleases: integrityMaximum(checkpoints, 'invalidStreamingTheatricalReleases'),
            unexplainedNegativeCash: integrityMaximum(checkpoints, 'unexplainedNegativeCash'),
            unboundedHistories: integrityMaximum(checkpoints, 'unboundedHistories'),
            missingCheckpoints: expectedCheckpoints.filter(week => !observedWeeks.has(week)).length,
        },
    };
};

export const assertSharedIndustryB8Integrity = (
    report: SharedIndustryB8Report,
): SharedIndustryB8Violation[] => {
    const week = report.horizonWeeks;
    const violations: SharedIndustryB8Violation[] = [];
    const add = (condition: boolean, code: SharedIndustryB8Violation['code'], detail: string) => {
        if (condition) violations.push({ code, detail, absoluteWeek: week });
    };
    add(report.integrity.nonFiniteValues > 0, 'NON_FINITE_VALUE', `${report.integrity.nonFiniteValues} non-finite material values`);
    add(report.integrity.duplicateProjectIds > 0, 'DUPLICATE_PROJECT_ID', `${report.integrity.duplicateProjectIds} duplicate project IDs`);
    add(report.integrity.duplicateProductionIds > 0, 'DUPLICATE_PRODUCTION_ID', `${report.integrity.duplicateProductionIds} duplicate production IDs`);
    add(report.integrity.duplicateEventIds > 0, 'DUPLICATE_EVENT_ID', `${report.integrity.duplicateEventIds} duplicate event IDs`);
    add(report.integrity.danglingProjectReferences > 0, 'DANGLING_PROJECT_REFERENCE', `${report.integrity.danglingProjectReferences} dangling project references`);
    add(report.integrity.invalidStreamingTheatricalReleases > 0, 'INVALID_STREAMING_THEATRICAL_RELEASE', `${report.integrity.invalidStreamingTheatricalReleases} streaming-only theatrical leaks`);
    add(report.integrity.unexplainedNegativeCash > 0, 'UNEXPLAINED_NEGATIVE_CASH', `${report.integrity.unexplainedNegativeCash} impossible negative cash records`);
    add(report.integrity.unboundedHistories > 0, 'UNBOUNDED_HISTORY', `${report.integrity.unboundedHistories} unbounded history registries`);
    add(report.integrity.missingCheckpoints > 0, 'CHECKPOINT_MISSING', `${report.integrity.missingCheckpoints} requested checkpoints missing`);
    return violations;
};
