import type {
    OwnedStreamingInfrastructureSetupDraft,
    OwnedStreamingOpeningProgrammeCommission,
    Player,
    StreamingLaunchMarketingForecastSnapshot,
    StreamingOpeningProgrammeFocus,
    StreamingOpeningProgrammeState,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { commitStreamingInfrastructureSetup, getStreamingInfrastructureDraftFacilities, getStreamingInfrastructureForecast } from './streamingInfrastructure';
import { deriveStreamingNetworkCoverage, formatStreamingCoveragePercent, STREAMING_SERVED_COVERAGE_SHARE } from './streamingNetworkCoverage';
import {
    getStreamingLaunchDefinitionSignature,
    getStreamingLaunchProgramView,
    getStreamingOpeningMarketDecisionState,
    type StreamingLaunchDestination,
} from './streamingLaunchProgram';
import { beginStreamingMarketClearance } from './streamingMarkets';
import { quoteStreamingMarketFilingEnergy } from './streamingMarketFilingQuote';
import { reserveOwnedStreamingLaunchMarketing } from './streamingLaunchMarketingLifecycle';

export type StreamingOpeningWorkstreamId =
    | 'INFRASTRUCTURE'
    | 'CLEARANCES'
    | 'MARKETING'
    | 'CATALOGUE'
    | 'SERVICE'
    | 'PRICING'
    | 'REHEARSAL';

export type StreamingOpeningWorkstreamStatus =
    | 'NOT_STARTED'
    | 'IN_PROGRESS'
    | 'ACTION_REQUIRED'
    | 'DELAYED'
    | 'LOCKED'
    | 'PASSED'
    | 'READY';

export interface StreamingOpeningWorkstreamView {
    id: StreamingOpeningWorkstreamId;
    label: string;
    status: StreamingOpeningWorkstreamStatus;
    detail: string;
    readyAtAbsoluteWeek: number | null;
    elapsedWeeks: number | null;
    remainingWeeks: number | null;
    controlsDate: boolean;
    actionLabel: string | null;
    operationIds: string[];
}

export interface StreamingOpeningProgrammeView {
    state: StreamingOpeningProgrammeState;
    commissioned: boolean;
    commission: OwnedStreamingOpeningProgrammeCommission | null;
    absoluteWeek: number;
    earliestOpeningAbsoluteWeek: number | null;
    dateCertainty: 'ESTIMATE' | 'CONFIRMED';
    controllingWorkstreamId: StreamingOpeningWorkstreamId | null;
    remainingWeeks: number;
    cityCount: number;
    rackCount: number;
    releasedCapital: number;
    workstreams: StreamingOpeningWorkstreamView[];
}

export interface StreamingOpeningCommissionInput {
    infrastructureDraft: OwnedStreamingInfrastructureSetupDraft;
    marketingForecast: StreamingLaunchMarketingForecastSnapshot;
    openingCountryIds: string[];
    expectedLaunchDefinitionSignature: string;
}

export interface StreamingOpeningCommissionQuote {
    idempotencyKey: string;
    launchDefinitionSignature: string;
    infrastructureConfigurationSignature: string;
    rehearsalSignature: string | null;
    marketingForecastSignature: string;
    infrastructureDueNow: number;
    marketFilingDueNow: number;
    marketingReservation: number;
    filingEnergy: number;
    totalCashRequired: number;
    ready: boolean;
    blockers: string[];
}

export interface StreamingOpeningCommissionResult {
    player: Player;
    changed: boolean;
    reason: 'COMMISSIONED' | 'ALREADY_COMMISSIONED' | 'NOT_READY' | 'STALE_EVIDENCE'
        | 'INSUFFICIENT_TREASURY' | 'INSUFFICIENT_ENERGY'
        | 'INFRASTRUCTURE_REJECTED' | 'MARKETING_REJECTED';
    quote: StreamingOpeningCommissionQuote;
    message: string;
}

export class StreamingOpeningProgrammeWeekError extends Error {
    constructor(
        public readonly workstreamId: 'CLEARANCES' | 'MARKETING',
        public readonly operation: string,
        public readonly cause: unknown,
    ) {
        super(`${workstreamId}: ${operation}`);
        this.name = 'StreamingOpeningProgrammeWeekError';
    }
}

const openingOperations = (player: Player) => normalizeOwnedStreamingPlatformState(
    player.ownedStreamingPlatform,
    player.id,
).marketOperations.filter(operation => (
    operation.entryKind === 'OPENING' && operation.countryId && operation.status !== 'EXITED'
));

export const getStreamingOpeningCommissionQuote = (
    player: Player,
    draft: OwnedStreamingInfrastructureSetupDraft,
    marketingForecast: StreamingLaunchMarketingForecastSnapshot,
): StreamingOpeningCommissionQuote => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const forecast = getStreamingInfrastructureForecast(player, draft);
    const launchDefinitionSignature = getStreamingLaunchDefinitionSignature(player);
    const decision = getStreamingOpeningMarketDecisionState(player);
    const unfiledIds = new Set(decision.unfiledOperationIds);
    const unfiled = openingOperations(player).filter(operation => unfiledIds.has(operation.id));
    const rehearsal = draft.lastLaunchRehearsal;
    const requiredMilestones = ['OPENING_MARKETS', 'SERVICE_IDENT', 'STOREFRONT_PRICING', 'OPENING_CATALOGUE', 'PRICING', 'LAUNCH_BLUEPRINT'];
    const launchView = getStreamingLaunchProgramView(player);
    const blockers = requiredMilestones.flatMap(id => launchView.milestones.find(item => item.id === id)?.complete
        ? [] : [`${id.toLowerCase().replaceAll('_', ' ')} is incomplete.`]);
    if (!decision.readyToCommission) blockers.push('An opening-market application needs player action.');
    if (unfiled.length > 0) blockers.push('File every selected opening market in Market Clearance before commissioning.');
    const coverage = deriveStreamingNetworkCoverage({
        facilities: getStreamingInfrastructureDraftFacilities(draft),
        openingCountryIds: decision.selectedCountryIds,
        fibreState: platform.fibre,
    });
    const thinMarkets = coverage.countries.filter(country => country.grade !== 'SERVED');
    if (coverage.countries.length !== new Set(decision.selectedCountryIds).size || thinMarkets.length > 0) {
        const named = thinMarkets.slice(0, 2).map(country =>
            `${country.countryId} ${formatStreamingCoveragePercent(country.coveredShare)}`).join(', ');
        blockers.push(`Opening-market geographic coverage needs ${formatStreamingCoveragePercent(STREAMING_SERVED_COVERAGE_SHARE)} in every country${named ? `: ${named}${thinMarkets.length > 2 ? ` +${thinMarkets.length - 2} more` : ''}` : '.'}`);
    }
    if (!rehearsal || rehearsal.configurationSignature !== forecast.configurationSignature || rehearsal.verdict === 'BROKE') {
        blockers.push('The exact infrastructure configuration has not passed rehearsal.');
    }
    const marketFilingDueNow = unfiled.reduce((sum, operation) => sum + operation.plannedCosts.total, 0);
    const marketingReservation = Math.max(0, Math.round(platform.launchMarketingDraft?.budgetCeiling || 0));
    const idempotencyKey = [
        'opening-programme',
        platform.identity?.slug || player.id,
        launchDefinitionSignature,
        forecast.configurationSignature,
        marketingForecast.signature,
    ].join(':');
    return {
        idempotencyKey,
        launchDefinitionSignature,
        infrastructureConfigurationSignature: forecast.configurationSignature,
        rehearsalSignature: rehearsal?.configurationSignature || null,
        marketingForecastSignature: marketingForecast.signature,
        infrastructureDueNow: forecast.transactionCost,
        marketFilingDueNow,
        marketingReservation,
        filingEnergy: quoteStreamingMarketFilingEnergy(unfiled.length),
        totalCashRequired: forecast.transactionCost + marketFilingDueNow + marketingReservation,
        ready: blockers.length === 0,
        blockers,
    };
};

export const commissionStreamingOpeningProgramme = (
    player: Player,
    input: StreamingOpeningCommissionInput,
): StreamingOpeningCommissionResult => {
    const quote = getStreamingOpeningCommissionQuote(player, input.infrastructureDraft, input.marketingForecast);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.openingProgrammeCommission?.idempotencyKey === quote.idempotencyKey) {
        return { player, changed: false, reason: 'ALREADY_COMMISSIONED', quote, message: 'This opening programme is already commissioned.' };
    }
    if (input.expectedLaunchDefinitionSignature !== quote.launchDefinitionSignature) {
        return { player, changed: false, reason: 'STALE_EVIDENCE', quote, message: 'The launch definition changed. Reopen the blueprint before commissioning.' };
    }
    if (!quote.ready) return { player, changed: false, reason: 'NOT_READY', quote, message: quote.blockers[0] || 'The opening programme is not ready.' };
    if (platform.treasuryCash < quote.totalCashRequired) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY', quote, message: 'Company treasury cannot cover the complete commission.' };
    }
    if (player.energy.current < quote.filingEnergy) {
        return { player, changed: false, reason: 'INSUFFICIENT_ENERGY', quote, message: 'Not enough energy remains to file every opening-market application.' };
    }

    let candidate = player;
    const marketResult = beginStreamingMarketClearance(candidate, input.openingCountryIds, 'OPENING');
    if (marketResult.reason === 'INSUFFICIENT_TREASURY') return { player, changed: false, reason: 'INSUFFICIENT_TREASURY', quote, message: 'Opening-market filing costs exceed treasury.' };
    if (marketResult.reason === 'INSUFFICIENT_ENERGY') return { player, changed: false, reason: 'INSUFFICIENT_ENERGY', quote, message: 'Opening-market filings need more energy.' };
    if (marketResult.changed) candidate = marketResult.player;

    const infrastructure = commitStreamingInfrastructureSetup(candidate, input.infrastructureDraft);
    if (!infrastructure.changed && infrastructure.reason !== 'ALREADY_CONFIGURED') {
        return { player, changed: false, reason: 'INFRASTRUCTURE_REJECTED', quote, message: infrastructure.issues[0]?.message || 'Infrastructure commission was rejected.' };
    }
    candidate = infrastructure.changed ? infrastructure.player : candidate;
    const setup = candidate.ownedStreamingPlatform.infrastructureSetup;
    if (!setup) return { player, changed: false, reason: 'INFRASTRUCTURE_REJECTED', quote, message: 'Infrastructure did not produce a commissioned setup.' };

    const marketing = reserveOwnedStreamingLaunchMarketing(
        candidate,
        input.marketingForecast,
        setup.readyAtAbsoluteWeek,
        input.openingCountryIds,
        { idempotencyKey: quote.idempotencyKey },
    );
    if (marketing.reason === 'INSUFFICIENT_TREASURY' || marketing.reason === 'LOCKED') {
        return { player, changed: false, reason: 'MARKETING_REJECTED', quote, message: 'Launch marketing could not be reserved.' };
    }
    candidate = marketing.changed ? marketing.player : candidate;
    const absoluteWeek = getAbsoluteWeek(candidate.age, candidate.currentWeek);
    const current = normalizeOwnedStreamingPlatformState(candidate.ownedStreamingPlatform, candidate.id);
    const commission: OwnedStreamingOpeningProgrammeCommission = {
        id: createDeterministicId('streaming_opening_programme', current.simulationSeed, quote.idempotencyKey),
        idempotencyKey: quote.idempotencyKey,
        committedAtAbsoluteWeek: absoluteWeek,
        launchDefinitionSignature: quote.launchDefinitionSignature,
        infrastructureConfigurationSignature: quote.infrastructureConfigurationSignature,
        rehearsalSignature: quote.rehearsalSignature!,
        openingCountryIds: [...new Set(input.openingCountryIds.map(id => id.trim().toUpperCase()).filter(Boolean))].sort(),
        marketingForecastSignature: quote.marketingForecastSignature,
        infrastructureDueNow: quote.infrastructureDueNow,
        marketFilingDueNow: quote.marketFilingDueNow,
        marketingReservation: quote.marketingReservation,
        totalCashRequired: quote.totalCashRequired,
        revision: 1,
    };
    const ledgerKey = `${quote.idempotencyKey}:commissioned`;
    const ledger = current.eventLedger.some(entry => entry.idempotencyKey === ledgerKey) ? current.eventLedger : [...current.eventLedger, {
        id: createDeterministicId('streaming_event', current.simulationSeed, ledgerKey),
        idempotencyKey: ledgerKey,
        absoluteWeek,
        type: 'MILESTONE_REACHED' as const,
        summary: 'The Streaming+ Opening Programme was commissioned.',
        source: 'PLAYER_ACTION' as const,
        metadata: { readyAtAbsoluteWeek: setup.readyAtAbsoluteWeek, countryCount: commission.openingCountryIds.length },
    }];
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...current,
        openingProgrammeCommission: commission,
        infrastructureSetupDraft: null,
        launchProgram: { ...current.launchProgram, defineDraft: null, status: 'READY' },
        eventLedger: ledger,
    }, candidate.id);
    return {
        player: { ...candidate, ownedStreamingPlatform: nextPlatform },
        changed: true,
        reason: 'COMMISSIONED',
        quote,
        message: 'Opening Programme commissioned. Construction, filings and launch preparation are underway.',
    };
};

const legacyCommission = (player: Player): OwnedStreamingOpeningProgrammeCommission | null => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const setup = platform.infrastructureSetup;
    if (!setup || platform.launchCommit) return null;
    const rehearsalSignature = setup.loadTest.launchRehearsal?.configurationSignature || setup.loadTest.configurationSignature;
    const launchDefinitionSignature = platform.launchProgram.lastBlueprintSignature || getStreamingLaunchDefinitionSignature(player);
    const marketingSignature = platform.launchMarketingPlan?.forecastSnapshot.signature || 'legacy-no-marketing';
    const idempotencyKey = `legacy-opening-programme:${platform.identity?.slug || player.id}:${setup.committedAtAbsoluteWeek}`;
    return {
        id: createDeterministicId('streaming_opening_programme', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        committedAtAbsoluteWeek: setup.committedAtAbsoluteWeek,
        launchDefinitionSignature,
        infrastructureConfigurationSignature: setup.loadTest.configurationSignature,
        rehearsalSignature,
        openingCountryIds: openingOperations(player).map(operation => operation.countryId!).sort(),
        marketingForecastSignature: marketingSignature,
        infrastructureDueNow: setup.capitalInvested,
        marketFilingDueNow: 0,
        marketingReservation: platform.launchMarketingPlan?.budgetCeiling || 0,
        totalCashRequired: setup.capitalInvested + (platform.launchMarketingPlan?.budgetCeiling || 0),
        revision: 1,
    };
};

export const getStreamingOpeningProgrammeView = (player: Player): StreamingOpeningProgrammeView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const commission = platform.openingProgrammeCommission || legacyCommission(player);
    const setup = platform.infrastructureSetup;
    if (platform.launchCommit) return {
        state: 'LIVE', commissioned: true, commission, absoluteWeek,
        earliestOpeningAbsoluteWeek: platform.launchCommit.committedAtAbsoluteWeek,
        dateCertainty: 'CONFIRMED', controllingWorkstreamId: null, remainingWeeks: 0,
        cityCount: setup?.networkPlacements.length || 0,
        rackCount: setup?.networkPlacements.reduce((sum, item) => sum + item.racks, 0) || 0,
        releasedCapital: setup?.capitalInvested || 0, workstreams: [],
    };
    if (!commission || !setup) return {
        state: getStreamingLaunchProgramView(player).status === 'READY' ? 'READY_TO_COMMISSION' : 'DRAFT',
        commissioned: false, commission: null, absoluteWeek, earliestOpeningAbsoluteWeek: null,
        dateCertainty: 'ESTIMATE', controllingWorkstreamId: null, remainingWeeks: 0,
        cityCount: 0, rackCount: 0, releasedCapital: 0, workstreams: [],
    };
    const operations = openingOperations(player).filter(operation => commission.openingCountryIds.includes(operation.countryId!));
    const actionOperations = operations.filter(operation => ['ADDITIONAL_REQUIREMENT', 'TEMPORARILY_REJECTED'].includes(operation.clearance?.outcome || ''));
    const clearancesReady = operations.length > 0 && operations.every(operation => ['READY', 'ACTIVE'].includes(operation.status));
    const clearanceReadyWeek = clearancesReady ? absoluteWeek : operations.reduce<number | null>((latest, operation) => {
        const ready = operation.approvalReadyAtAbsoluteWeek;
        return ready === null ? latest : Math.max(latest || 0, ready);
    }, null);
    const marketing = platform.launchMarketingPlan;
    const infrastructureReady = absoluteWeek >= setup.readyAtAbsoluteWeek;
    const marketingReady = !marketing || absoluteWeek >= marketing.endsAtAbsoluteWeek;
    const timed = [
        { id: 'INFRASTRUCTURE' as const, ready: setup.readyAtAbsoluteWeek, incomplete: !infrastructureReady },
        { id: 'CLEARANCES' as const, ready: clearanceReadyWeek, incomplete: !clearancesReady },
        { id: 'MARKETING' as const, ready: marketing?.endsAtAbsoluteWeek || commission.committedAtAbsoluteWeek, incomplete: !marketingReady },
    ];
    const controlling = timed.filter(item => item.incomplete).sort((a, b) => (b.ready || Number.MAX_SAFE_INTEGER) - (a.ready || Number.MAX_SAFE_INTEGER))[0] || null;
    const earliestOpeningAbsoluteWeek = timed.reduce((latest, item) => Math.max(latest, item.ready || absoluteWeek), absoluteWeek);
    const elapsed = Math.max(0, absoluteWeek - setup.committedAtAbsoluteWeek);
    const workstreams: StreamingOpeningWorkstreamView[] = [
        {
            id: 'INFRASTRUCTURE', label: 'Infrastructure', status: infrastructureReady ? 'READY' : 'IN_PROGRESS',
            detail: infrastructureReady ? 'The commissioned network is operational.' : `Crews are building ${setup.networkPlacements.reduce((sum, item) => sum + item.racks, 0)} racks across ${setup.networkPlacements.length} cities.`,
            readyAtAbsoluteWeek: setup.readyAtAbsoluteWeek, elapsedWeeks: elapsed,
            remainingWeeks: Math.max(0, setup.readyAtAbsoluteWeek - absoluteWeek), controlsDate: controlling?.id === 'INFRASTRUCTURE', actionLabel: null, operationIds: [],
        },
        {
            id: 'CLEARANCES', label: 'Government clearance',
            status: actionOperations.length ? 'ACTION_REQUIRED' : clearancesReady ? 'READY' : 'IN_PROGRESS',
            detail: actionOperations.length ? `${actionOperations.length} market ${actionOperations.length === 1 ? 'needs' : 'need'} your response.` : clearancesReady ? 'Every opening country is cleared.' : `${operations.filter(operation => operation.status === 'CLEARANCE').length} government reviews in progress.`,
            readyAtAbsoluteWeek: clearanceReadyWeek, elapsedWeeks: elapsed,
            remainingWeeks: clearanceReadyWeek === null ? null : Math.max(0, clearanceReadyWeek - absoluteWeek), controlsDate: controlling?.id === 'CLEARANCES',
            actionLabel: actionOperations.length ? 'Resolve government request' : null, operationIds: actionOperations.map(operation => operation.id),
        },
        {
            id: 'MARKETING', label: 'Launch marketing', status: marketingReady ? 'READY' : 'IN_PROGRESS',
            detail: marketing ? marketingReady ? 'Opening campaign preparation is ready.' : `Campaign preparation runs through week ${marketing.endsAtAbsoluteWeek}.` : 'No paid opening campaign was commissioned.',
            readyAtAbsoluteWeek: marketing?.endsAtAbsoluteWeek || commission.committedAtAbsoluteWeek,
            elapsedWeeks: elapsed, remainingWeeks: marketing ? Math.max(0, marketing.endsAtAbsoluteWeek - absoluteWeek) : 0,
            controlsDate: controlling?.id === 'MARKETING', actionLabel: null, operationIds: [],
        },
        { id: 'CATALOGUE', label: 'Opening catalogue', status: 'LOCKED', detail: 'The commissioned catalogue is locked.', readyAtAbsoluteWeek: commission.committedAtAbsoluteWeek, elapsedWeeks: null, remainingWeeks: 0, controlsDate: false, actionLabel: null, operationIds: [] },
        { id: 'SERVICE', label: 'Service identity and storefront', status: 'LOCKED', detail: 'The approved viewer experience is locked.', readyAtAbsoluteWeek: commission.committedAtAbsoluteWeek, elapsedWeeks: null, remainingWeeks: 0, controlsDate: false, actionLabel: null, operationIds: [] },
        { id: 'PRICING', label: 'Service and pricing', status: 'LOCKED', detail: 'The opening commercial offer is locked.', readyAtAbsoluteWeek: commission.committedAtAbsoluteWeek, elapsedWeeks: null, remainingWeeks: 0, controlsDate: false, actionLabel: null, operationIds: [] },
        { id: 'REHEARSAL', label: 'Load rehearsal', status: 'PASSED', detail: 'The commissioned configuration passed its final rehearsal.', readyAtAbsoluteWeek: commission.committedAtAbsoluteWeek, elapsedWeeks: null, remainingWeeks: 0, controlsDate: false, actionLabel: null, operationIds: [] },
    ];
    const state: StreamingOpeningProgrammeState = actionOperations.length
        ? 'ACTION_REQUIRED'
        : infrastructureReady && clearancesReady && marketingReady ? 'READY_TO_OPEN' : 'EXECUTING';
    return {
        state, commissioned: true, commission, absoluteWeek, earliestOpeningAbsoluteWeek,
        dateCertainty: actionOperations.length || !clearancesReady ? 'ESTIMATE' : 'CONFIRMED',
        controllingWorkstreamId: controlling?.id || null,
        remainingWeeks: Math.max(0, earliestOpeningAbsoluteWeek - absoluteWeek),
        cityCount: new Set(setup.networkPlacements.map(item => item.cityId)).size,
        rackCount: setup.networkPlacements.reduce((sum, item) => sum + item.racks, 0),
        releasedCapital: setup.capitalInvested,
        workstreams,
    };
};

export const getStreamingOpeningProgrammeFocus = (
    destination: StreamingLaunchDestination,
): StreamingOpeningProgrammeFocus => {
    if (['NETWORK_BLUEPRINT', 'FACILITIES', 'RACK_GROUPS', 'PHYSICAL_CAPACITY', 'COMMISSIONING', 'REHEARSAL'].includes(destination)) return 'INFRASTRUCTURE';
    if (destination === 'MARKET_CLEARANCE') return 'CLEARANCES';
    if (destination === 'OPENING_NIGHT') return 'OVERVIEW';
    return 'LAUNCH_PLAN';
};

export const appendStreamingOpeningProgrammeTransitions = (
    beforePlayer: Player,
    afterPlayer: Player,
): Player => {
    const before = getStreamingOpeningProgrammeView(beforePlayer);
    const after = getStreamingOpeningProgrammeView(afterPlayer);
    if (!after.commissioned || after.state === 'LIVE') return afterPlayer;
    const platform = normalizeOwnedStreamingPlatformState(afterPlayer.ownedStreamingPlatform, afterPlayer.id);
    const changed = after.workstreams.filter(workstream => {
        const previous = before.workstreams.find(item => item.id === workstream.id);
        return previous && previous.status !== workstream.status;
    });
    if (!changed.length && before.state === after.state) return afterPlayer;
    const additions = changed.map(workstream => {
        const key = `opening-programme:${after.absoluteWeek}:${workstream.id}:${workstream.status}`;
        const operation = workstream.operationIds[0]
            ? platform.marketOperations.find(item => item.id === workstream.operationIds[0])
            : null;
        return {
            id: createDeterministicId('streaming_event', platform.simulationSeed, key),
            idempotencyKey: key,
            absoluteWeek: after.absoluteWeek,
            type: 'MILESTONE_REACHED' as const,
            summary: `${workstream.label}: ${workstream.status.toLowerCase().replaceAll('_', ' ')}.`,
            source: 'WEEK_PROCESSOR' as const,
            metadata: {
                workstreamId: workstream.id,
                status: workstream.status,
                operationId: operation?.id || null,
                countryId: operation?.countryId || null,
                actionRequired: workstream.status === 'ACTION_REQUIRED',
                requiredAction: workstream.actionLabel,
            },
        };
    });
    const existing = new Set(platform.eventLedger.map(entry => entry.idempotencyKey));
    const eventLedger = [...platform.eventLedger, ...additions.filter(entry => !existing.has(entry.idempotencyKey))];
    if (eventLedger.length === platform.eventLedger.length) return afterPlayer;
    return {
        ...afterPlayer,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...platform, eventLedger }, afterPlayer.id),
    };
};
