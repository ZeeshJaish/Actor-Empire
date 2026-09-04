import type {
    PlatformId,
    StreamingBiddingRightsLot,
    StreamingLicenseExclusivity,
    StreamingLicenseTerritory,
    StreamingRightsContract,
    StreamingRightsWindowType,
    WorldState,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import {
    getStreamingDayOneMarket,
    normalizeStreamingDayOneMarketIds,
    STREAMING_DAY_ONE_MARKETS,
} from './streamingDayOneMarkets';

export type StreamingRightsCompatibilityStatus =
    | 'AVAILABLE'
    | 'PARTIALLY_AVAILABLE'
    | 'AVAILABLE_IN_FUTURE'
    | 'RESTRICTED'
    | 'UNAVAILABLE';

export type StreamingRightsCompatibilityAction =
    | 'LICENSE'
    | 'SUBLICENSE'
    | 'RELEASE'
    | 'CHANGE_OF_CONTROL';

export type StreamingRightsConflictCode =
    | 'INVALID_SCOPE'
    | 'EXCLUSIVE_OVERLAP'
    | 'NON_EXCLUSIVE_SLOT_LIMIT'
    | 'SOURCE_CONTRACT_MISSING'
    | 'SUBLICENSE_NOT_PERMITTED'
    | 'SUBLICENSE_SELLER_MISMATCH'
    | 'SUBLICENSE_SCOPE_EXCEEDED'
    | 'SUBLICENSE_WINDOW_EXCEEDED'
    | 'SUBLICENSE_EXCLUSIVITY_EXCEEDED'
    | 'RELATED_IP_RESTRICTED'
    | 'CHANGE_OF_CONTROL_CONSENT_REQUIRED';

export interface StreamingRightsConflict {
    code: StreamingRightsConflictCode;
    contractIds: string[];
    countryIds: string[];
    earliestCompatibleStartWeek: number | null;
    detail: string;
}

export interface StreamingRightsCompatibilityInput {
    world: Pick<WorldState, 'streamingRightsContracts'>;
    sourceProjectId: string;
    buyerPlatformId: PlatformId | null;
    sellerPartyId?: string | null;
    territory: StreamingLicenseTerritory;
    countryIds?: string[];
    startsAtAbsoluteWeek: number;
    expiresAtAbsoluteWeek: number;
    windowType: StreamingRightsWindowType;
    exclusivity: StreamingLicenseExclusivity;
    action?: StreamingRightsCompatibilityAction;
    sourceContractId?: string | null;
    relatedProjectIds?: string[];
    excludeContractIds?: string[];
    /** Maximum simultaneous shared licences per country/window. */
    nonExclusiveSlotLimit?: number;
}

export interface StreamingRightsCompatibilityResult {
    status: StreamingRightsCompatibilityStatus;
    /** True only when the exact requested scope can proceed now. */
    available: boolean;
    requestedCountryIds: string[];
    availableCountryIds: string[];
    blockedCountryIds: string[];
    compatibleWindowTypes: StreamingRightsWindowType[];
    controllingContractIds: string[];
    conflicts: StreamingRightsConflict[];
    earliestCompatibleStartWeek: number | null;
    summary: string;
}

/** Compatibility adapter retained for callers introduced before A3. */
export interface StreamingRightsAvailabilityInput {
    player?: unknown;
    world: Pick<WorldState, 'streamingRightsContracts'>;
    sourceProjectId: string;
    buyerPlatformId: PlatformId | null;
    exclusivity: StreamingLicenseExclusivity;
    startsAtAbsoluteWeek: number;
    expiresAtAbsoluteWeek: number;
    territory?: StreamingLicenseTerritory;
    countryIds?: string[];
    windowType?: StreamingRightsWindowType;
    sellerPartyId?: string | null;
    action?: StreamingRightsCompatibilityAction;
    sourceContractId?: string | null;
    relatedProjectIds?: string[];
    excludeLicenseIds?: string[];
    nonExclusiveSlotLimit?: number;
}

export type StreamingRightsAvailabilityResult = StreamingRightsCompatibilityResult & {
    conflictLicenseIds: string[];
};

export interface BuildStreamingBiddingRightsLotInput {
    world: Pick<WorldState, 'streamingRightsContracts'>;
    sourceProjectId: string;
    sellerPartyId: string;
    startsAtAbsoluteWeek: number;
    maximumDurationWeeks?: number;
    windowType?: StreamingRightsWindowType;
    /** Full Control may supply a smaller scope in a later phase. */
    desiredCountryIds?: string[];
    excludeContractIds?: string[];
}

export interface BuildStreamingBiddingRightsLotResult {
    lot: StreamingBiddingRightsLot | null;
    compatibility: StreamingRightsCompatibilityResult;
}

const CANONICAL_COUNTRY_IDS = STREAMING_DAY_ONE_MARKETS.map(market => market.id).sort();
const WINDOW_TYPES: StreamingRightsWindowType[] = ['FIRST_WINDOW', 'SECOND_WINDOW', 'PERMANENT'];

interface IndexedStreamingRightsContract {
    contract: StreamingRightsContract;
    registryOrder: number;
}

interface StreamingRightsRegistryCompatibilityIndex {
    activeBySourceProjectId: Map<string, IndexedStreamingRightsContract[]>;
    activeSequelBySourceProjectId: Map<string, IndexedStreamingRightsContract[]>;
}

const streamingRightsRegistryCompatibilityIndexes = new WeakMap<
    Record<string, StreamingRightsContract>,
    StreamingRightsRegistryCompatibilityIndex
>();

const getStreamingRightsRegistryCompatibilityIndex = (
    registry: Record<string, StreamingRightsContract>,
): StreamingRightsRegistryCompatibilityIndex => {
    const existing = streamingRightsRegistryCompatibilityIndexes.get(registry);
    if (existing) return existing;

    const index: StreamingRightsRegistryCompatibilityIndex = {
        activeBySourceProjectId: new Map(),
        activeSequelBySourceProjectId: new Map(),
    };
    Object.values(registry).forEach((contract, registryOrder) => {
        if (contract.status !== 'ACTIVE') return;
        const indexed = { contract, registryOrder };
        const active = index.activeBySourceProjectId.get(contract.sourceProjectId) || [];
        active.push(indexed);
        index.activeBySourceProjectId.set(contract.sourceProjectId, active);
        if (!contract.sequelRightsIncluded) return;
        const sequel = index.activeSequelBySourceProjectId.get(contract.sourceProjectId) || [];
        sequel.push(indexed);
        index.activeSequelBySourceProjectId.set(contract.sourceProjectId, sequel);
    });
    streamingRightsRegistryCompatibilityIndexes.set(registry, index);
    return index;
};

const finiteWeek = (value: number, fallback = 0): number => (
    Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback
);

const windowsOverlap = (
    leftStart: number,
    leftEnd: number,
    rightStart: number,
    rightEnd: number,
): boolean => leftStart <= rightEnd && rightStart <= leftEnd;

const getRequestedCountryIds = (
    territory: StreamingLicenseTerritory,
    countryIds: string[] | undefined,
): string[] => territory === 'GLOBAL'
    ? [...CANONICAL_COUNTRY_IDS]
    : normalizeStreamingDayOneMarketIds(countryIds).sort();

/** Empty bounded legacy scopes are treated conservatively as unknown/global. */
const getContractCountryIds = (contract: StreamingRightsContract): string[] => {
    if (contract.territory === 'GLOBAL') return [...CANONICAL_COUNTRY_IDS];
    const bounded = normalizeStreamingDayOneMarketIds(contract.countryIds).sort();
    return bounded.length ? bounded : [...CANONICAL_COUNTRY_IDS];
};

const countryName = (countryId: string): string => (
    getStreamingDayOneMarket(countryId)?.country || countryId
);

const uniqueSorted = (values: string[]): string[] => Array.from(new Set(values)).sort();

const contractBuyerName = (contract: StreamingRightsContract | undefined): string => (
    contract?.buyer?.name || contract?.buyerPlatformId || 'another platform'
);

const finiteCompatibilityWeek = (contracts: StreamingRightsContract[]): number | null => {
    if (!contracts.length || contracts.some(contract => contract.expiresAtAbsoluteWeek >= Number.MAX_SAFE_INTEGER)) {
        return null;
    }
    return Math.max(...contracts.map(contract => contract.expiresAtAbsoluteWeek + 1));
};

const conflictDetail = (
    code: StreamingRightsConflictCode,
    countryIds: string[],
    contracts: StreamingRightsContract[],
): string => {
    const scope = countryIds.length === 1 ? countryName(countryIds[0]) : `${countryIds.length} markets`;
    const first = contracts[0];
    if (code === 'EXCLUSIVE_OVERLAP') {
        return `${scope} overlaps ${contractBuyerName(first)}'s ${first?.exclusivity === 'EXCLUSIVE' ? 'exclusive' : 'existing'} licence.`;
    }
    if (code === 'NON_EXCLUSIVE_SLOT_LIMIT') return `${scope} has no remaining shared licence slot.`;
    if (code === 'SUBLICENSE_NOT_PERMITTED') return 'The source contract does not permit sublicensing.';
    if (code === 'SUBLICENSE_SELLER_MISMATCH') return 'The proposed seller does not control the source contract.';
    if (code === 'SUBLICENSE_SCOPE_EXCEEDED') return 'The sublicense exceeds the source contract territory.';
    if (code === 'SUBLICENSE_WINDOW_EXCEEDED') return 'The sublicense exceeds the source contract dates.';
    if (code === 'SUBLICENSE_EXCLUSIVITY_EXCEEDED') return 'The sublicense grants stronger exclusivity than the source contract.';
    if (code === 'SOURCE_CONTRACT_MISSING') return 'The source contract is missing from the canonical ledger.';
    if (code === 'RELATED_IP_RESTRICTED') return 'A canonical related-IP grant controls these rights.';
    if (code === 'CHANGE_OF_CONTROL_CONSENT_REQUIRED') return 'The controlling contract requires consent before ownership changes.';
    return 'The requested territory does not contain a valid country snapshot.';
};

const makeConflict = (
    code: StreamingRightsConflictCode,
    countryIds: string[],
    contracts: StreamingRightsContract[],
): StreamingRightsConflict => ({
    code,
    contractIds: uniqueSorted(contracts.map(contract => contract.id)),
    countryIds: uniqueSorted(countryIds),
    earliestCompatibleStartWeek: finiteCompatibilityWeek(contracts),
    detail: conflictDetail(code, countryIds, contracts),
});

const sourceRestriction = (
    input: StreamingRightsCompatibilityInput,
    registry: Record<string, StreamingRightsContract>,
    requestedCountryIds: string[],
): StreamingRightsConflict | null => {
    if (input.action !== 'SUBLICENSE' && input.action !== 'CHANGE_OF_CONTROL') return null;
    const source = input.sourceContractId ? registry[input.sourceContractId] : undefined;
    if (!source) return makeConflict('SOURCE_CONTRACT_MISSING', requestedCountryIds, []);

    if (input.action === 'CHANGE_OF_CONTROL') {
        return source.changeOfControl === 'CONSENT_REQUIRED'
            ? makeConflict('CHANGE_OF_CONTROL_CONSENT_REQUIRED', requestedCountryIds, [source])
            : null;
    }

    if (!source.sublicensingAllowed) return makeConflict('SUBLICENSE_NOT_PERMITTED', requestedCountryIds, [source]);
    const sourceControllerIds = new Set([
        source.buyer.id,
        source.buyer.platformId,
        source.buyerPlatformId,
    ].filter(Boolean));
    if (input.sellerPartyId && !sourceControllerIds.has(input.sellerPartyId as PlatformId)) {
        return makeConflict('SUBLICENSE_SELLER_MISMATCH', requestedCountryIds, [source]);
    }
    const sourceCountries = new Set(getContractCountryIds(source));
    if (requestedCountryIds.some(countryId => !sourceCountries.has(countryId))) {
        return makeConflict('SUBLICENSE_SCOPE_EXCEEDED', requestedCountryIds, [source]);
    }
    if (
        input.startsAtAbsoluteWeek < source.startsAtAbsoluteWeek
        || input.expiresAtAbsoluteWeek > source.expiresAtAbsoluteWeek
    ) return makeConflict('SUBLICENSE_WINDOW_EXCEEDED', requestedCountryIds, [source]);
    if (input.exclusivity === 'EXCLUSIVE' && source.exclusivity !== 'EXCLUSIVE') {
        return makeConflict('SUBLICENSE_EXCLUSIVITY_EXCEEDED', requestedCountryIds, [source]);
    }
    return null;
};

const summarize = (
    result: Omit<StreamingRightsCompatibilityResult, 'summary'>,
    registry: Record<string, StreamingRightsContract>,
): string => {
    if (result.status === 'AVAILABLE') {
        return result.requestedCountryIds.length === CANONICAL_COUNTRY_IDS.length
            ? 'Worldwide rights available.'
            : result.requestedCountryIds.length === 1
                ? `${countryName(result.requestedCountryIds[0])} rights available.`
                : `Available in ${result.requestedCountryIds.length} countries.`;
    }
    const firstConflict = result.conflicts[0];
    const firstCountry = firstConflict?.countryIds[0];
    const firstContract = firstConflict?.contractIds.length ? registry[firstConflict.contractIds[0]] : undefined;
    if (firstCountry && firstContract && firstConflict.code === 'EXCLUSIVE_OVERLAP') {
        const until = firstConflict.earliestCompatibleStartWeek === null
            ? 'permanently'
            : `until Week ${Math.max(0, firstConflict.earliestCompatibleStartWeek - 1)}`;
        return `${countryName(firstCountry)} is exclusively licensed to ${contractBuyerName(firstContract)} ${until}.`;
    }
    if (result.status === 'PARTIALLY_AVAILABLE') {
        return `Available in ${result.availableCountryIds.length} countries; ${result.blockedCountryIds.length} blocked.`;
    }
    if (result.status === 'AVAILABLE_IN_FUTURE' && result.earliestCompatibleStartWeek !== null) {
        return `Available after Week ${result.earliestCompatibleStartWeek - 1}.`;
    }
    return firstConflict?.detail || 'The requested streaming rights are unavailable.';
};

export const resolveStreamingRightsCompatibility = (
    rawInput: StreamingRightsCompatibilityInput,
): StreamingRightsCompatibilityResult => {
    const input: StreamingRightsCompatibilityInput = {
        ...rawInput,
        startsAtAbsoluteWeek: finiteWeek(rawInput.startsAtAbsoluteWeek),
        expiresAtAbsoluteWeek: Math.max(
            finiteWeek(rawInput.startsAtAbsoluteWeek),
            finiteWeek(rawInput.expiresAtAbsoluteWeek, finiteWeek(rawInput.startsAtAbsoluteWeek)),
        ),
    };
    const registry = (input.world.streamingRightsContracts || {}) as Record<string, StreamingRightsContract>;
    const requestedCountryIds = getRequestedCountryIds(input.territory, input.countryIds);
    const excludedIds = new Set([
        ...(input.excludeContractIds || []),
        ...(input.action === 'SUBLICENSE' && input.sourceContractId ? [input.sourceContractId] : []),
    ]);
    const invalidScope = input.territory !== 'GLOBAL' && requestedCountryIds.length === 0;
    if (invalidScope) {
        const conflict = makeConflict('INVALID_SCOPE', [], []);
        const result: Omit<StreamingRightsCompatibilityResult, 'summary'> = {
            status: 'RESTRICTED', available: false, requestedCountryIds: [], availableCountryIds: [],
            blockedCountryIds: [], compatibleWindowTypes: [], controllingContractIds: [],
            conflicts: [conflict], earliestCompatibleStartWeek: null,
        };
        return { ...result, summary: summarize(result, registry) };
    }

    const sourceClauseConflict = sourceRestriction(input, registry, requestedCountryIds);
    if (sourceClauseConflict) {
        const result: Omit<StreamingRightsCompatibilityResult, 'summary'> = {
            status: 'RESTRICTED', available: false, requestedCountryIds,
            availableCountryIds: [], blockedCountryIds: [...requestedCountryIds],
            compatibleWindowTypes: [], controllingContractIds: sourceClauseConflict.contractIds,
            conflicts: [sourceClauseConflict],
            earliestCompatibleStartWeek: sourceClauseConflict.earliestCompatibleStartWeek,
        };
        return { ...result, summary: summarize(result, registry) };
    }

    const compatibilityIndex = getStreamingRightsRegistryCompatibilityIndex(registry);
    const exactContracts = (compatibilityIndex.activeBySourceProjectId.get(input.sourceProjectId) || [])
        .map(indexed => indexed.contract)
        .filter(contract => !excludedIds.has(contract.id));
    const relatedIds = Array.from(new Set(input.relatedProjectIds || []));
    const relatedContracts = relatedIds
        .flatMap(projectId => compatibilityIndex.activeSequelBySourceProjectId.get(projectId) || [])
        .sort((left, right) => left.registryOrder - right.registryOrder)
        .map(indexed => indexed.contract)
        .filter(contract => (
            !excludedIds.has(contract.id)
            && windowsOverlap(
                input.startsAtAbsoluteWeek,
                input.expiresAtAbsoluteWeek,
                contract.startsAtAbsoluteWeek,
                contract.expiresAtAbsoluteWeek,
            )
        ));
    if (relatedContracts.length) {
        const overlappingCountries = requestedCountryIds.filter(countryId => relatedContracts.some(contract => (
            getContractCountryIds(contract).includes(countryId)
        )));
        if (overlappingCountries.length) {
            const conflict = makeConflict('RELATED_IP_RESTRICTED', overlappingCountries, relatedContracts);
            const result: Omit<StreamingRightsCompatibilityResult, 'summary'> = {
                status: 'RESTRICTED', available: false, requestedCountryIds,
                availableCountryIds: requestedCountryIds.filter(id => !overlappingCountries.includes(id)),
                blockedCountryIds: uniqueSorted(overlappingCountries), compatibleWindowTypes: [],
                controllingContractIds: conflict.contractIds, conflicts: [conflict],
                earliestCompatibleStartWeek: conflict.earliestCompatibleStartWeek,
            };
            return { ...result, summary: summarize(result, registry) };
        }
    }

    const conflicts: StreamingRightsConflict[] = [];
    const blocked = new Set<string>();
    for (const countryId of requestedCountryIds) {
        const overlapping = exactContracts.filter(contract => (
            getContractCountryIds(contract).includes(countryId)
            && windowsOverlap(
                input.startsAtAbsoluteWeek,
                input.expiresAtAbsoluteWeek,
                contract.startsAtAbsoluteWeek,
                contract.expiresAtAbsoluteWeek,
            )
        ));
        const exclusiveConflicts = overlapping.filter(contract => (
            input.exclusivity === 'EXCLUSIVE' || contract.exclusivity === 'EXCLUSIVE'
        ));
        if (exclusiveConflicts.length) {
            blocked.add(countryId);
            conflicts.push(makeConflict('EXCLUSIVE_OVERLAP', [countryId], exclusiveConflicts));
            continue;
        }
        if (input.exclusivity === 'NON_EXCLUSIVE') {
            const slotLimit = Math.max(1, Math.floor(input.nonExclusiveSlotLimit ?? 3));
            const shared = overlapping.filter(contract => (
                contract.exclusivity === 'NON_EXCLUSIVE'
                && contract.windowType === input.windowType
            ));
            if (shared.length >= slotLimit) {
                blocked.add(countryId);
                conflicts.push(makeConflict('NON_EXCLUSIVE_SLOT_LIMIT', [countryId], shared));
            }
        }
    }

    const availableCountryIds = requestedCountryIds.filter(countryId => !blocked.has(countryId));
    const blockedCountryIds = requestedCountryIds.filter(countryId => blocked.has(countryId));
    const controllingContractIds = uniqueSorted(conflicts.flatMap(conflict => conflict.contractIds));
    const futureWeeks = conflicts
        .map(conflict => conflict.earliestCompatibleStartWeek)
        .filter((week): week is number => week !== null);
    const hasPermanentConflict = conflicts.some(conflict => conflict.earliestCompatibleStartWeek === null);
    const earliestCompatibleStartWeek = conflicts.length && !hasPermanentConflict
        ? Math.max(...futureWeeks)
        : null;
    const status: StreamingRightsCompatibilityStatus = !blockedCountryIds.length
        ? 'AVAILABLE'
        : availableCountryIds.length
            ? 'PARTIALLY_AVAILABLE'
            : earliestCompatibleStartWeek !== null
                ? 'AVAILABLE_IN_FUTURE'
                : 'UNAVAILABLE';
    const result: Omit<StreamingRightsCompatibilityResult, 'summary'> = {
        status,
        available: status === 'AVAILABLE',
        requestedCountryIds,
        availableCountryIds,
        blockedCountryIds,
        compatibleWindowTypes: availableCountryIds.length
            ? exactContracts.length ? [input.windowType] : [...WINDOW_TYPES]
            : [],
        controllingContractIds,
        conflicts,
        earliestCompatibleStartWeek,
    };
    return { ...result, summary: summarize(result, registry) };
};

export const formatStreamingRightsCompatibilitySummary = (
    result: StreamingRightsCompatibilityResult,
): string => result.summary;

const formatExcludedMarketsNotice = (countryIds: string[]): string | null => {
    if (!countryIds.length) return null;
    if (countryIds.length === 1) {
        return `${countryName(countryIds[0])} is already licensed. This auction covers the remaining eligible markets.`;
    }
    return `${countryName(countryIds[0])} and ${countryIds.length - 1} other markets are already licensed. This auction covers the remaining eligible markets.`;
};

/** Builds the strictest common lot so both exclusive and shared offers remain valid. */
export const buildStreamingBiddingRightsLot = (
    input: BuildStreamingBiddingRightsLotInput,
): BuildStreamingBiddingRightsLotResult => {
    const startsAtAbsoluteWeek = finiteWeek(input.startsAtAbsoluteWeek);
    const maximumDurationWeeks = Math.max(1, Math.floor(input.maximumDurationWeeks ?? 156));
    const desiredCountryIds = input.desiredCountryIds === undefined
        ? [...CANONICAL_COUNTRY_IDS]
        : normalizeStreamingDayOneMarketIds(input.desiredCountryIds).sort();
    const requestedTerritory: StreamingLicenseTerritory = input.desiredCountryIds === undefined
        || desiredCountryIds.length === CANONICAL_COUNTRY_IDS.length
        ? 'GLOBAL'
        : desiredCountryIds.length === 1 ? 'DOMESTIC' : 'MULTI_REGION';
    const compatibility = resolveStreamingRightsCompatibility({
        world: input.world,
        sourceProjectId: input.sourceProjectId,
        buyerPlatformId: null,
        sellerPartyId: input.sellerPartyId,
        territory: requestedTerritory,
        countryIds: requestedTerritory === 'GLOBAL' ? [] : desiredCountryIds,
        startsAtAbsoluteWeek,
        expiresAtAbsoluteWeek: startsAtAbsoluteWeek + maximumDurationWeeks,
        windowType: input.windowType || 'FIRST_WINDOW',
        exclusivity: 'EXCLUSIVE',
        excludeContractIds: input.excludeContractIds,
    });
    const countryIds = compatibility.availableCountryIds.slice().sort();
    if (!countryIds.length) return { lot: null, compatibility };
    const excludedCountryIds = desiredCountryIds
        .filter(countryId => !countryIds.includes(countryId))
        .sort();
    const territory: StreamingLicenseTerritory = countryIds.length === CANONICAL_COUNTRY_IDS.length
        ? 'GLOBAL'
        : countryIds.length === 1 ? 'DOMESTIC' : 'MULTI_REGION';
    const windowType = input.windowType || 'FIRST_WINDOW';
    const lot: StreamingBiddingRightsLot = {
        id: createDeterministicId(
            'streaming_rights_lot',
            input.sourceProjectId,
            input.sellerPartyId,
            startsAtAbsoluteWeek,
            maximumDurationWeeks,
            windowType,
            countryIds.join(','),
        ),
        sourceProjectId: input.sourceProjectId,
        territory,
        countryIds,
        excludedCountryIds,
        startsAtAbsoluteWeek,
        maximumDurationWeeks,
        windowType,
        notice: formatExcludedMarketsNotice(excludedCountryIds),
    };
    return { lot, compatibility };
};

export const formatStreamingBiddingRightsLotScope = (lot: StreamingBiddingRightsLot): string => {
    if (lot.territory === 'GLOBAL' && lot.countryIds.length === CANONICAL_COUNTRY_IDS.length) return 'Worldwide';
    if (lot.countryIds.length === 1) return countryName(lot.countryIds[0]);
    return `${lot.countryIds.length} markets`;
};

export const validateStreamingRightsAvailability = (
    input: StreamingRightsAvailabilityInput,
): StreamingRightsAvailabilityResult => {
    const result = resolveStreamingRightsCompatibility({
        world: input.world,
        sourceProjectId: input.sourceProjectId,
        buyerPlatformId: input.buyerPlatformId,
        sellerPartyId: input.sellerPartyId,
        territory: input.territory || 'GLOBAL',
        countryIds: input.countryIds,
        startsAtAbsoluteWeek: input.startsAtAbsoluteWeek,
        expiresAtAbsoluteWeek: input.expiresAtAbsoluteWeek,
        windowType: input.windowType || 'FIRST_WINDOW',
        exclusivity: input.exclusivity,
        action: input.action,
        sourceContractId: input.sourceContractId,
        relatedProjectIds: input.relatedProjectIds,
        excludeContractIds: input.excludeLicenseIds,
        nonExclusiveSlotLimit: input.nonExclusiveSlotLimit,
    });
    return { ...result, conflictLicenseIds: result.controllingContractIds };
};
