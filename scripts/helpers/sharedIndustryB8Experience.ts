import type { IndustryContentFingerprint, IndustryEventFact, Player } from '../../types';
import type {
    SharedIndustryB8ExperienceMetrics,
    SharedIndustryB8Regime,
} from './sharedIndustryB8Types';

export type { SharedIndustryB8ExperienceMetrics } from './sharedIndustryB8Types';

export type SharedIndustryB8ExperienceViolationCode =
    | 'EXCESSIVE_DOMINANCE'
    | 'NO_MAJOR_FAILURE'
    | 'NO_SMALL_BREAKOUT'
    | 'UNEXPLAINED_RESCUE'
    | 'FINGERPRINT_REPEAT'
    | 'PUBLIC_SILENCE'
    | 'PUBLIC_EVENT_DROUGHT'
    | 'PUBLIC_EVENT_OVERLOAD'
    | 'ROUTINE_EVENT_SPAM';

export interface SharedIndustryB8ExperienceViolation {
    code: SharedIndustryB8ExperienceViolationCode;
    regime: SharedIndustryB8Regime | 'MATRIX';
    detail: string;
    observed: number;
    limit: number;
}

export interface SharedIndustryB8ExperienceEvaluation {
    healthy: boolean;
    measurements: SharedIndustryB8ExperienceMetrics[];
    violations: SharedIndustryB8ExperienceViolation[];
}

interface SharedIndustryB8ExperienceAccumulator {
    regime: SharedIndustryB8Regime;
    seed: string;
    seenProjectIds: Set<string>;
    seenEventIds: Set<string>;
    seenPublicEventIds: Set<string>;
    seenFundingKeys: Set<string>;
    standaloneSignatures: Set<string>;
    commercialByYear: Map<number, Map<string, number>>;
    materialEventsByYear: Map<number, number>;
    majorExpensiveFailures: number;
    smallRegionalBreakouts: number;
    genuineCompanyFailures: number;
    unexplainedRescueCashEvents: number;
    exactNonLineageFingerprintRepeats: number;
    materialPublicEvents: number;
    routineAccountingEvents: number;
}

const yearForWeek = (absoluteWeek: number): number => Math.floor(Math.max(1, absoluteWeek) - 1) / 52 | 0;

const allFingerprints = (player: Player): Map<string, IndustryContentFingerprint> => new Map([
    ...Object.values(player.world.studios || {}).flatMap(studio => (
        studio.ai?.intelligence?.content.selectedFingerprints || []
    )),
    ...Object.values(player.world.platforms || {}).flatMap(platform => (
        platform.ai?.intelligence?.content.selectedFingerprints || []
    )),
].map(item => [item.id, item]));

const projectOutcome = (project: Player['world']['projects'][number]): 'HIT' | 'SOLID' | 'FLOP' => {
    const streaming = project.streamingWindows?.map(window => window.performance.outcome) || [];
    if (streaming.includes('HIT') || /major audience|critical success/i.test(project.reviews || '')) return 'HIT';
    if (streaming.includes('FLOP') || /disappoint|flop/i.test(project.reviews || '')) return 'FLOP';
    return 'SOLID';
};

const commercialValue = (project: Player['world']['projects'][number]): number => (
    Math.max(0, Number(project.boxOffice || 0)) / 1_000_000
    + (project.streamingWindows || []).reduce((sum, window) => (
        sum + Math.max(0, Number(window.performance.viewsMillions || 0)) * 10
    ), 0)
);

const isMajor = (player: Player, studioId: string): boolean => {
    const studio = player.world.studios?.[studioId];
    return studio?.ai?.profile.launchClass === 'ESTABLISHED_MAJOR'
        || (!studio?.isNpcVenture && Number(studio?.valuation || 0) >= 20);
};

const isSmallOrRegional = (player: Player, studioId: string): boolean => {
    const studio = player.world.studios?.[studioId];
    if (!studio) return false;
    return studio.ai?.origin === 'REGIONAL'
        || studio.ai?.origin === 'GENERATED'
        || ['BOOTSTRAPPED_BOUTIQUE', 'FOUNDER_BACKED', 'BREAKOUT_COMPANY']
            .includes(studio.ai?.profile.launchClass || '')
        || Number(studio.valuation || 0) < 5;
};

const isRoutineAccounting = (event: IndustryEventFact): boolean => (
    /routine|weekly accounting|operating payment|bookkeeping/i.test(`${event.headline} ${event.detail}`)
);

export const createSharedIndustryB8ExperienceAccumulator = (
    regime: SharedIndustryB8Regime,
    seed: string,
): SharedIndustryB8ExperienceAccumulator => ({
    regime,
    seed,
    seenProjectIds: new Set(),
    seenEventIds: new Set(),
    seenPublicEventIds: new Set(),
    seenFundingKeys: new Set(),
    standaloneSignatures: new Set(),
    commercialByYear: new Map(),
    materialEventsByYear: new Map(),
    majorExpensiveFailures: 0,
    smallRegionalBreakouts: 0,
    genuineCompanyFailures: 0,
    unexplainedRescueCashEvents: 0,
    exactNonLineageFingerprintRepeats: 0,
    materialPublicEvents: 0,
    routineAccountingEvents: 0,
});

export const observeSharedIndustryB8Experience = (
    accumulator: SharedIndustryB8ExperienceAccumulator,
    player: Player,
    absoluteWeek: number,
): void => {
    // The persisted public archive is bounded, but ownership materialization
    // and compaction may insert a project before an already-seen tail record.
    // Scan the bounded archive by identity rather than assuming append order.
    const newProjects = player.world.projects
        .filter(project => !accumulator.seenProjectIds.has(project.id))
        .sort((left, right) => (
            Number(left.year || 0) - Number(right.year || 0)
            || Number(left.weekReleased || 0) - Number(right.weekReleased || 0)
            || left.id.localeCompare(right.id)
        ));
    const fingerprints = newProjects.length ? allFingerprints(player) : new Map<string, IndustryContentFingerprint>();
    const productionsByProjectId = newProjects.length
        ? new Map(Object.values(player.world.industryProductions || {}).map(production => [production.canonicalProjectId, production]))
        : new Map();
    for (const project of newProjects) {
        accumulator.seenProjectIds.add(project.id);
        const projectYear = Math.max(0, Number(project.year || yearForWeek(absoluteWeek)) - 1);
        const yearScores = accumulator.commercialByYear.get(projectYear) || new Map<string, number>();
        yearScores.set(project.studioId, (yearScores.get(project.studioId) || 0) + commercialValue(project));
        accumulator.commercialByYear.set(projectYear, yearScores);

        const outcome = projectOutcome(project);
        const production = productionsByProjectId.get(project.id);
        if (outcome === 'FLOP' && isMajor(player, project.studioId)
            && Number(production?.budgetMillions || 0) >= 30) {
            accumulator.majorExpensiveFailures += 1;
        }
        const criticalBreakout = Number(project.rating || 0) >= 8.5;
        if ((outcome === 'HIT' || criticalBreakout) && isSmallOrRegional(player, project.studioId)) {
            accumulator.smallRegionalBreakouts += 1;
        }

        const fingerprint = project.industryContentFingerprintId
            ? production?.studioAiExecution?.fingerprintSnapshot
                || fingerprints.get(project.industryContentFingerprintId)
            : undefined;
        if (fingerprint && fingerprint.relationship === 'STANDALONE' && !project.universeId) {
            if (accumulator.standaloneSignatures.has(fingerprint.noveltySignature)) {
                accumulator.exactNonLineageFingerprintRepeats += 1;
            }
            accumulator.standaloneSignatures.add(fingerprint.noveltySignature);
        }
    }

    for (const event of player.world.industryEvents?.events || []) {
        if (accumulator.seenEventIds.has(event.id)) continue;
        accumulator.seenEventIds.add(event.id);
        if (event.type === 'COMPANY_CLOSED') accumulator.genuineCompanyFailures += 1;
    }

    const eventById = new Map((player.world.industryEvents?.events || []).map(event => [event.id, event]));
    const publicEventIds = new Set([
        ...(player.news || []).flatMap(item => item.industryEventId || []),
        ...(player.x?.feed || []).flatMap(item => item.industryEventId || []),
        ...(player.instagram?.feed || []).flatMap(item => item.industryEventId || []),
    ]);
    for (const eventId of publicEventIds) {
        if (accumulator.seenPublicEventIds.has(eventId)) continue;
        accumulator.seenPublicEventIds.add(eventId);
        accumulator.materialPublicEvents += 1;
        const event = eventById.get(eventId);
        if (event && isRoutineAccounting(event)) accumulator.routineAccountingEvents += 1;
        const eventYear = event ? yearForWeek(event.absoluteWeek) : yearForWeek(absoluteWeek);
        accumulator.materialEventsByYear.set(eventYear, (accumulator.materialEventsByYear.get(eventYear) || 0) + 1);
    }

    for (const platform of Object.values(player.world.platforms || {})) {
        const decisions = platform.ai?.decisionHistory || [];
        for (const finance of platform.ai?.financeHistory || []) {
            if (finance.absoluteWeek !== absoluteWeek) continue;
            const funding = Number(finance.rescueIncomeMillions || 0) + Number(finance.externalInvestmentIncomeMillions || 0);
            if (funding <= 0) continue;
            const key = `${platform.id}:${absoluteWeek}`;
            if (accumulator.seenFundingKeys.has(key)) continue;
            accumulator.seenFundingKeys.add(key);
            const disclosed = decisions.some(decision => decision.absoluteWeek === absoluteWeek && (
                decision.action === 'PARENT_RESCUE'
                || decision.action === 'EXTERNAL_RECAPITALIZATION'
                || decision.type === 'PARENT_RESCUE'
            ));
            if (!disclosed) accumulator.unexplainedRescueCashEvents += 1;
        }
    }
};

export const finalizeSharedIndustryB8Experience = (
    accumulator: SharedIndustryB8ExperienceAccumulator,
    player: Player,
    horizonWeeks: number,
): SharedIndustryB8ExperienceMetrics => {
    const commercialYearWins: Record<string, number> = {};
    for (const scores of accumulator.commercialByYear.values()) {
        const winner = [...scores.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0];
        if (winner) commercialYearWins[winner] = (commercialYearWins[winner] || 0) + 1;
    }
    const measuredYears = Math.max(1, Math.ceil(horizonWeeks / 52));
    const activeStudios = Object.values(player.world.studios || {})
        .filter(studio => !['CLOSED', 'SOLD_MERGED', 'DORMANT'].includes(studio.ai?.status || 'ACTIVE')).length;
    const activePlatforms = Object.values(player.world.platforms || {})
        .filter(platform => platform.ai?.status !== 'DORMANT').length;
    let silentYears = 0;
    for (let year = 0; year < measuredYears; year += 1) {
        if (!accumulator.materialEventsByYear.get(year)) silentYears += 1;
    }
    return {
        regime: accumulator.regime,
        seed: accumulator.seed,
        measuredYears,
        commercialYearWins,
        majorExpensiveFailures: accumulator.majorExpensiveFailures,
        smallRegionalBreakouts: accumulator.smallRegionalBreakouts,
        genuineCompanyFailures: accumulator.genuineCompanyFailures,
        unexplainedRescueCashEvents: accumulator.unexplainedRescueCashEvents,
        exactNonLineageFingerprintRepeats: accumulator.exactNonLineageFingerprintRepeats,
        materialPublicEvents: accumulator.materialPublicEvents,
        routineAccountingEvents: accumulator.routineAccountingEvents,
        silentYears,
        activeCompaniesAtEnd: activeStudios + activePlatforms,
    };
};

export const evaluateSharedIndustryB8Experience = (
    matrix: SharedIndustryB8ExperienceMetrics[],
): SharedIndustryB8ExperienceEvaluation => {
    const violations: SharedIndustryB8ExperienceViolation[] = [];
    const add = (
        code: SharedIndustryB8ExperienceViolationCode,
        regime: SharedIndustryB8Regime | 'MATRIX',
        detail: string,
        observed: number,
        limit: number,
    ) => violations.push({ code, regime, detail, observed, limit });

    for (const metrics of matrix) {
        const measuredCommercialYears = Object.values(metrics.commercialYearWins).reduce((sum, value) => sum + value, 0);
        const highestWins = Math.max(0, ...Object.values(metrics.commercialYearWins));
        const dominance = measuredCommercialYears ? highestWins / measuredCommercialYears : 0;
        if (metrics.regime === 'BASELINE' && dominance > 0.65) {
            add('EXCESSIVE_DOMINANCE', metrics.regime, 'One company wins more than 65% of baseline measured commercial years.', dominance, 0.65);
        }
        if (metrics.unexplainedRescueCashEvents > 0) add('UNEXPLAINED_RESCUE', metrics.regime, 'Rescue cash lacks a persisted funding explanation.', metrics.unexplainedRescueCashEvents, 0);
        if (metrics.exactNonLineageFingerprintRepeats > 0) add('FINGERPRINT_REPEAT', metrics.regime, 'A standalone project exactly repeats a prior content fingerprint.', metrics.exactNonLineageFingerprintRepeats, 0);
        if (metrics.materialPublicEvents === 0 || metrics.silentYears === metrics.measuredYears) add('PUBLIC_SILENCE', metrics.regime, 'The public industry remains silent for the complete measured run.', metrics.silentYears, metrics.measuredYears - 1);
        const annualPublicEvents = metrics.materialPublicEvents / Math.max(1, metrics.measuredYears);
        if (metrics.materialPublicEvents > 0 && annualPublicEvents < 24) add('PUBLIC_EVENT_DROUGHT', metrics.regime, 'Player-visible material industry events fall below the frozen annual cadence band.', annualPublicEvents, 24);
        if (annualPublicEvents > 120) add('PUBLIC_EVENT_OVERLOAD', metrics.regime, 'Player-visible material industry events exceed the frozen annual cadence band.', annualPublicEvents, 120);
        if (metrics.materialPublicEvents > 0 && metrics.routineAccountingEvents >= metrics.materialPublicEvents) add('ROUTINE_EVENT_SPAM', metrics.regime, 'Every public event is routine accounting rather than material world news.', metrics.routineAccountingEvents, metrics.materialPublicEvents - 1);
    }

    const majorFailures = matrix.reduce((sum, item) => sum + item.majorExpensiveFailures, 0);
    if (majorFailures === 0) add('NO_MAJOR_FAILURE', 'MATRIX', 'No established major records an expensive project failure.', 0, 1);
    const breakoutRegimes = new Set<SharedIndustryB8Regime>(['BASELINE', 'BOOM', 'CROWDED']);
    const breakouts = matrix.filter(item => breakoutRegimes.has(item.regime))
        .reduce((sum, item) => sum + item.smallRegionalBreakouts, 0);
    if (breakouts === 0) add('NO_SMALL_BREAKOUT', 'MATRIX', 'No small or regional company records a breakout.', 0, 1);

    return { healthy: violations.length === 0, measurements: matrix, violations };
};
