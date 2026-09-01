import type {
    Business,
    PlatformId,
    Player,
    StreamingBiddingRightsLot,
    StreamingBiddingSession,
    StreamingCataloguePackageAutomation,
    StreamingCataloguePackage,
    StreamingCataloguePackageComponent,
    StreamingCataloguePackageDigest,
    StreamingCataloguePackagePolicy,
    StreamingCataloguePackageRegistry,
    StreamingCataloguePackageSource,
    StreamingCataloguePackageOfferRow,
    StreamingLicenseExclusivity,
    StreamingLocalizationPromise,
    StreamingRightsLocalizationTerms,
    StreamingRightsContract,
    StreamingRightsControlMode,
    StreamingRightsManagementState,
    StreamingRightsRenewalCase,
    StreamingRightsWindowType,
} from '../types';
import { STREAMING_CATALOGUE_PACKAGE_SCHEMA_VERSION } from '../types';
import { createDeterministicId } from './deterministicRandom';
import { PHASE_ONE_ENERGY_COSTS } from './energyCosts';
import { getInheritedStudioProjects } from './legacyLogic';
import { spendPlayerEnergy } from './premiumLogic';
import { applyInvestorPayoutMemory, calculateInvestorPayout } from './projectInvestors';
import {
    createStreamingLicenseContract,
    createStreamingRightsContractFromLicense,
    normalizeStreamingRightsContractRegistry,
    registerStreamingRightsContract,
} from './streamingRightsCore';
import { buildStreamingBiddingRightsLot, resolveStreamingRightsCompatibility } from './streamingRightsCompatibility';
import { normalizeStreamingDayOneMarketIds, STREAMING_DAY_ONE_MARKETS } from './streamingDayOneMarkets';

const asRecord = (value: unknown): Record<string, any> => (
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
);

const finiteNumber = (value: unknown, fallback: number): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};

export const normalizeStreamingCataloguePackagePolicy = (
    value: unknown,
): StreamingCataloguePackagePolicy => {
    const source = asRecord(value);
    const preferredSize = asRecord(source.preferredSize);
    const preferredMin = Math.max(2, Math.min(12, Math.round(finiteNumber(preferredSize.min, 3))));
    const preferredMax = Math.max(preferredMin, Math.min(12, Math.round(finiteNumber(preferredSize.max, 6))));
    const automation: StreamingCataloguePackageAutomation = source.automation === 'ROUTINE_AUTOMATIC'
        ? 'ROUTINE_AUTOMATIC'
        : 'SUGGEST_ONLY';
    return {
        automation,
        preferredSize: { min: preferredMin, max: preferredMax },
        maximumAutomaticSize: Math.max(2, Math.min(12, Math.round(finiteNumber(source.maximumAutomaticSize, 7)))),
        maximumAutomaticDurationWeeks: Math.max(13, Math.min(260, Math.round(finiteNumber(source.maximumAutomaticDurationWeeks, 104)))),
        allowAutomaticExclusive: source.allowAutomaticExclusive === true,
        allowAutomaticGlobal: source.allowAutomaticGlobal === true,
        minimumGuaranteeRatio: Math.max(0.5, Math.min(1.5, finiteNumber(source.minimumGuaranteeRatio, 0.85))),
    };
};

const cleanText = (value: unknown, fallback = '', maxLength = 180): string => {
    const text = typeof value === 'string' ? value.trim() : '';
    return (text || fallback).slice(0, maxLength);
};

const finiteMoney = (value: unknown): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
};

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum))
);

const sameStrings = (left: string[], right: string[]): boolean => (
    left.length === right.length && left.every((value, index) => value === right[index])
);

export const calculateStreamingCatalogueReferenceValue = (
    component: Pick<StreamingCataloguePackageComponent, 'quality' | 'audience' | 'budget' | 'theatricalGross' | 'streamingRevenue' | 'franchiseProtected'>,
): number => {
    const quality = clamp(Number(component.quality), 0, 100);
    const audienceValue = Math.min(180_000_000, Math.max(0, Number(component.audience) || 0) * 0.85);
    const budgetProof = Math.min(90_000_000, finiteMoney(component.budget) * 0.22);
    const theatricalProof = Math.min(260_000_000, finiteMoney(component.theatricalGross) * 0.18);
    const streamingProof = Math.min(180_000_000, finiteMoney(component.streamingRevenue) * 0.45);
    const qualityValue = quality * quality * 22_000;
    const franchiseValue = component.franchiseProtected ? 28_000_000 : 0;
    return Math.max(1_000_000, Math.round(
        1_000_000 + audienceValue + budgetProof + theatricalProof + streamingProof + qualityValue + franchiseValue,
    ));
};

export interface AllocateStreamingCatalogueGuaranteeInput {
    totalGuarantee: number;
    components: StreamingCataloguePackageComponent[];
    platformId: PlatformId;
    bidderValues: Record<string, number>;
    durationWeeks: number;
    exclusivity: StreamingLicenseExclusivity;
    localization: StreamingRightsLocalizationTerms;
    localizationRequirements: StreamingLocalizationPromise[];
}

export interface AllocateStreamingCatalogueGuaranteeResult {
    valid: boolean;
    rows: StreamingCataloguePackageOfferRow[];
    reason?: 'NOT_ENOUGH_TITLES' | 'INSUFFICIENT_GUARANTEE' | 'INVALID_REFERENCE_VALUES' | 'ALLOCATION_FAILED';
}

const normalizeWeights = (values: number[]): number[] | null => {
    const safe = values.map(value => Math.max(0, Number(value) || 0));
    const total = safe.reduce((sum, value) => sum + value, 0);
    if (total <= 0) return null;
    return safe.map(value => value / total);
};

const projectToBoundedTotal = (
    desired: number[],
    lower: number[],
    upper: number[],
    total: number,
    ids: string[],
): number[] | null => {
    const lowerTotal = lower.reduce((sum, value) => sum + value, 0);
    const upperTotal = upper.reduce((sum, value) => sum + value, 0);
    if (total < lowerTotal || total > upperTotal) return null;
    let lowShift = Math.min(...lower.map((value, index) => value - desired[index]));
    let highShift = Math.max(...upper.map((value, index) => value - desired[index]));
    for (let pass = 0; pass < 100; pass += 1) {
        const shift = (lowShift + highShift) / 2;
        const sum = desired.reduce((running, value, index) => running + clamp(value + shift, lower[index], upper[index]), 0);
        if (sum < total) lowShift = shift;
        else highShift = shift;
    }
    const shift = (lowShift + highShift) / 2;
    const projected = desired.map((value, index) => clamp(value + shift, lower[index], upper[index]));
    const integers = projected.map((value, index) => clamp(Math.floor(value), lower[index], upper[index]));
    let remaining = Math.round(total - integers.reduce((sum, value) => sum + value, 0));
    const addOrder = projected.map((value, index) => ({
        index,
        fraction: value - Math.floor(value),
        id: ids[index],
    })).sort((left, right) => right.fraction - left.fraction || left.id.localeCompare(right.id));
    while (remaining > 0) {
        let changed = false;
        for (const candidate of addOrder) {
            if (remaining <= 0) break;
            if (integers[candidate.index] >= upper[candidate.index]) continue;
            integers[candidate.index] += 1;
            remaining -= 1;
            changed = true;
        }
        if (!changed) return null;
    }
    return integers;
};

export const allocateStreamingCatalogueGuarantee = (
    input: AllocateStreamingCatalogueGuaranteeInput,
): AllocateStreamingCatalogueGuaranteeResult => {
    const components = input.components.slice().sort((left, right) => left.sourceProjectId.localeCompare(right.sourceProjectId));
    if (components.length < 2) return { valid: false, rows: [], reason: 'NOT_ENOUGH_TITLES' };
    const totalGuarantee = finiteMoney(input.totalGuarantee);
    const titleFloor = 1_000_000;
    const remainder = totalGuarantee - titleFloor * components.length;
    if (remainder < 0) return { valid: false, rows: [], reason: 'INSUFFICIENT_GUARANTEE' };
    const referenceValues = components.map(component => (
        component.referenceValue > 0 ? component.referenceValue : calculateStreamingCatalogueReferenceValue(component)
    ));
    const referenceWeights = normalizeWeights(referenceValues);
    if (!referenceWeights) return { valid: false, rows: [], reason: 'INVALID_REFERENCE_VALUES' };
    const bidderWeights = normalizeWeights(components.map(component => input.bidderValues[component.sourceProjectId]))
        || components.map(() => 1 / components.length);
    const hybridWeights = components.map((_, index) => (
        0.15 * (1 / components.length) + 0.60 * referenceWeights[index] + 0.25 * bidderWeights[index]
    ));
    const referenceAllocations = components.map((_, index) => titleFloor + remainder * referenceWeights[index]);
    const desired = components.map((_, index) => titleFloor + remainder * hybridWeights[index]);
    const lower = referenceAllocations.map(value => Math.ceil(Math.max(titleFloor, value * 0.5)));
    const upper = referenceAllocations.map(value => Math.max(titleFloor, Math.floor(value * 1.75)));
    const allocations = projectToBoundedTotal(
        desired,
        lower,
        upper,
        totalGuarantee,
        components.map(component => component.sourceProjectId),
    );
    if (!allocations) return { valid: false, rows: [], reason: 'ALLOCATION_FAILED' };
    const durationWeeks = Math.max(1, Math.round(input.durationWeeks));
    const rows = components.map((component, index): StreamingCataloguePackageOfferRow => {
        const uncertainty = 1 - clamp(component.quality, 0, 100) / 100;
        const fit = bidderWeights[index];
        const relativeFit = clamp(fit * components.length, 0, 2);
        const licensorRevenueShare = Math.round(clamp(2 + uncertainty * 5 + (1.15 - relativeFit) * 1.5, 1, 10));
        const minimumGuarantee = allocations[index];
        const expectedRoyaltyCost = Math.round(minimumGuarantee * (licensorRevenueShare / 100) * (0.8 + uncertainty));
        const backendCap = licensorRevenueShare >= 7
            ? null
            : Math.round(minimumGuarantee * (0.4 + licensorRevenueShare / 10));
        return {
            componentProjectId: component.sourceProjectId,
            componentLotId: component.rightsLot.id,
            minimumGuarantee,
            licensorRevenueShare,
            platformRevenueShare: 100 - licensorRevenueShare,
            backendBasis: 'ADJUSTED_GROSS_RECEIPTS',
            guaranteeRecoupment: licensorRevenueShare >= 5 ? 'RECOUPABLE' : 'NON_RECOUPABLE',
            backendCap,
            territory: component.rightsLot.territory,
            countryIds: [...component.rightsLot.countryIds],
            windowType: component.rightsLot.windowType,
            durationWeeks: Math.min(durationWeeks, component.rightsLot.maximumDurationWeeks),
            exclusivity: input.exclusivity,
            localization: input.localization,
            localizationRequirements: input.localizationRequirements.map(requirement => ({ ...requirement, countryIds: [...requirement.countryIds] })),
            expectedRoyaltyCost,
            expectedTotalCost: minimumGuarantee + expectedRoyaltyCost,
            referenceAllocation: Math.round(referenceAllocations[index]),
            bidderWeight: bidderWeights[index],
        };
    });
    const validation = validateStreamingCatalogueOfferRows({ components, rows, totalGuarantee });
    return validation.valid ? { valid: true, rows } : { valid: false, rows: [], reason: 'ALLOCATION_FAILED' };
};

export interface ValidateStreamingCatalogueOfferRowsInput {
    components: StreamingCataloguePackageComponent[];
    rows: StreamingCataloguePackageOfferRow[];
    totalGuarantee: number;
}

export interface ValidateStreamingCatalogueOfferRowsResult {
    valid: boolean;
    reason?: string;
}

export const validateStreamingCatalogueOfferRows = (
    input: ValidateStreamingCatalogueOfferRowsInput,
): ValidateStreamingCatalogueOfferRowsResult => {
    const components = input.components.slice().sort((left, right) => left.sourceProjectId.localeCompare(right.sourceProjectId));
    const rows = input.rows.slice().sort((left, right) => left.componentProjectId.localeCompare(right.componentProjectId));
    if (components.length < 2 || rows.length !== components.length) return { valid: false, reason: 'ROW_COUNT_MISMATCH' };
    const componentIds = components.map(component => component.sourceProjectId);
    const rowIds = rows.map(row => row.componentProjectId);
    if (new Set(componentIds).size !== componentIds.length || new Set(rowIds).size !== rowIds.length || !sameStrings(componentIds, rowIds)) {
        return { valid: false, reason: 'COMPONENT_MISMATCH' };
    }
    const totalGuarantee = finiteMoney(input.totalGuarantee);
    if (rows.reduce((sum, row) => sum + finiteMoney(row.minimumGuarantee), 0) !== totalGuarantee) {
        return { valid: false, reason: 'GUARANTEE_TOTAL_MISMATCH' };
    }
    const remainder = totalGuarantee - components.length * 1_000_000;
    if (remainder < 0) return { valid: false, reason: 'INSUFFICIENT_GUARANTEE' };
    const referenceValues = components.map(component => (
        component.referenceValue > 0 ? component.referenceValue : calculateStreamingCatalogueReferenceValue(component)
    ));
    const referenceWeights = normalizeWeights(referenceValues);
    if (!referenceWeights) return { valid: false, reason: 'INVALID_REFERENCE_VALUES' };
    for (let index = 0; index < components.length; index += 1) {
        const component = components[index];
        const row = rows[index];
        const referenceAllocation = 1_000_000 + remainder * referenceWeights[index];
        const lower = Math.ceil(Math.max(1_000_000, referenceAllocation * 0.5));
        const upper = Math.max(1_000_000, Math.floor(referenceAllocation * 1.75));
        if (row.minimumGuarantee < lower || row.minimumGuarantee > upper) return { valid: false, reason: 'ALLOCATION_OUT_OF_BOUNDS' };
        if (row.componentLotId !== component.rightsLot.id) return { valid: false, reason: 'LOT_MISMATCH' };
        if (!sameStrings(row.countryIds.slice().sort(), component.rightsLot.countryIds.slice().sort())) return { valid: false, reason: 'COUNTRY_MISMATCH' };
        if (row.territory !== component.rightsLot.territory || row.windowType !== component.rightsLot.windowType) return { valid: false, reason: 'SCOPE_MISMATCH' };
        if (row.durationWeeks < 1 || row.durationWeeks > component.rightsLot.maximumDurationWeeks) return { valid: false, reason: 'DURATION_MISMATCH' };
        if (row.platformRevenueShare + row.licensorRevenueShare !== 100) return { valid: false, reason: 'SHARE_MISMATCH' };
        if (row.expectedTotalCost !== row.minimumGuarantee + row.expectedRoyaltyCost) return { valid: false, reason: 'EXPOSURE_MISMATCH' };
    }
    return { valid: true };
};

const uniqueText = (value: unknown): string[] => Array.from(new Set(
    (Array.isArray(value) ? value : []).map(item => cleanText(item)).filter(Boolean),
)).sort();

const normalizePackage = (value: unknown): StreamingCataloguePackage | null => {
    const source = asRecord(value);
    const id = cleanText(source.id);
    const seller = asRecord(source.seller);
    const rawComponents = Array.isArray(source.components) ? source.components : [];
    if (!id || !cleanText(seller.id) || rawComponents.length < 2) return null;
    const components = rawComponents.flatMap(raw => {
        const component = asRecord(raw);
        const rightsLot = asRecord(component.rightsLot);
        const sourceProjectId = cleanText(component.sourceProjectId);
        if (!sourceProjectId || cleanText(rightsLot.sourceProjectId) !== sourceProjectId) return [];
        return [{
            ...component,
            sourceProjectId,
            title: cleanText(component.title, 'Untitled project'),
            projectType: component.projectType === 'SERIES' ? 'SERIES' as const : 'MOVIE' as const,
            genre: cleanText(component.genre, 'UNKNOWN'),
            originalLanguageId: cleanText(component.originalLanguageId, 'english'),
            sellerStudioId: cleanText(component.sellerStudioId, seller.id),
            quality: finiteMoney(component.quality),
            audience: finiteMoney(component.audience),
            budget: finiteMoney(component.budget),
            theatricalGross: finiteMoney(component.theatricalGross),
            streamingRevenue: finiteMoney(component.streamingRevenue),
            franchiseProtected: Boolean(component.franchiseProtected),
            rightsLot: {
                ...rightsLot,
                id: cleanText(rightsLot.id),
                sourceProjectId,
                territory: rightsLot.territory === 'GLOBAL'
                    ? 'GLOBAL'
                    : rightsLot.territory === 'MULTI_REGION' ? 'MULTI_REGION' : 'DOMESTIC',
                countryIds: uniqueText(rightsLot.countryIds),
                excludedCountryIds: uniqueText(rightsLot.excludedCountryIds),
                startsAtAbsoluteWeek: Math.max(0, Math.round(finiteNumber(rightsLot.startsAtAbsoluteWeek, 0))),
                maximumDurationWeeks: Math.max(1, Math.round(finiteNumber(rightsLot.maximumDurationWeeks, 104))),
                windowType: rightsLot.windowType === 'SECOND_WINDOW'
                    ? 'SECOND_WINDOW'
                    : rightsLot.windowType === 'PERMANENT' ? 'PERMANENT' : 'FIRST_WINDOW',
                notice: typeof rightsLot.notice === 'string' ? rightsLot.notice : null,
            } satisfies StreamingBiddingRightsLot,
            referenceValue: finiteMoney(component.referenceValue),
            referenceWeight: Math.max(0, finiteNumber(component.referenceWeight, 0)),
        } satisfies StreamingCataloguePackageComponent];
    }).sort((left, right) => left.sourceProjectId.localeCompare(right.sourceProjectId));
    if (components.length < 2) return null;
    return {
        ...source,
        schemaVersion: STREAMING_CATALOGUE_PACKAGE_SCHEMA_VERSION,
        id,
        idempotencyKey: cleanText(source.idempotencyKey, `streaming-catalogue-package:${id}`),
        source: ['PLAYER_CURATED', 'RIGHTS_DESK_PROPOSAL', 'PLATFORM_AI_SOURCING', 'OWNED_PLATFORM_MARKET'].includes(String(source.source))
            ? source.source as StreamingCataloguePackageSource
            : 'PLAYER_CURATED',
        lifecycle: ['DRAFT', 'READY', 'LIVE', 'SIGNED', 'WITHDRAWN', 'INVALIDATED'].includes(String(source.lifecycle))
            ? source.lifecycle
            : 'DRAFT',
        name: cleanText(source.name, 'Catalogue package'),
        seller: {
            type: seller.type === 'NPC_STUDIO' ? 'NPC_STUDIO' : 'PLAYER_STUDIO',
            id: cleanText(seller.id),
            name: cleanText(seller.name, 'Studio'),
            platformId: null,
        },
        createdAtAbsoluteWeek: Math.max(0, Math.round(finiteNumber(source.createdAtAbsoluteWeek, 0))),
        startsAtAbsoluteWeek: Math.max(0, Math.round(finiteNumber(source.startsAtAbsoluteWeek, 0))),
        requestedWindowType: source.requestedWindowType === 'SECOND_WINDOW' ? 'SECOND_WINDOW' : 'FIRST_WINDOW',
        requestedExclusivity: source.requestedExclusivity === 'NON_EXCLUSIVE' ? 'NON_EXCLUSIVE' : 'EXCLUSIVE',
        requestedCountryIds: uniqueText(source.requestedCountryIds),
        maximumDurationWeeks: Math.max(1, Math.round(finiteNumber(source.maximumDurationWeeks, 104))),
        components,
        excluded: Array.isArray(source.excluded) ? source.excluded.map(raw => {
            const exclusion = asRecord(raw);
            return {
                projectId: cleanText(exclusion.projectId),
                title: cleanText(exclusion.title, 'Unavailable project'),
                code: cleanText(exclusion.code, 'INVALID_PROJECT'),
                detail: cleanText(exclusion.detail, 'This title is unavailable.'),
            };
        }).filter(row => row.projectId) : [],
        controlModeAtCreation: ['STRATEGY', 'CUSTOM', 'FULL'].includes(String(source.controlModeAtCreation))
            ? source.controlModeAtCreation as StreamingRightsControlMode
            : 'CUSTOM',
        protectionReasons: uniqueText(source.protectionReasons),
        delegatedReason: typeof source.delegatedReason === 'string' ? source.delegatedReason : null,
        manualApprovalRequired: Boolean(source.manualApprovalRequired),
        biddingSessionId: typeof source.biddingSessionId === 'string' ? source.biddingSessionId : null,
        acceptedOfferId: typeof source.acceptedOfferId === 'string' ? source.acceptedOfferId : null,
        signedAtAbsoluteWeek: source.signedAtAbsoluteWeek === null ? null : Math.max(0, Math.round(finiteNumber(source.signedAtAbsoluteWeek, 0))),
        totalGuarantee: finiteMoney(source.totalGuarantee),
        totalExpectedExposure: finiteMoney(source.totalExpectedExposure),
        acceptedTerms: Array.isArray(source.acceptedTerms) ? source.acceptedTerms.map(row => ({ ...row })) : [],
        componentContractIds: uniqueText(source.componentContractIds),
        digestId: typeof source.digestId === 'string' ? source.digestId : null,
    } as StreamingCataloguePackage;
};

export const normalizeStreamingCataloguePackageRegistry = (
    value: unknown,
): StreamingCataloguePackageRegistry => {
    const source = asRecord(value);
    const registry: StreamingCataloguePackageRegistry = {};
    Object.values(source).forEach(raw => {
        const cataloguePackage = normalizePackage(raw);
        if (!cataloguePackage || registry[cataloguePackage.id]) return;
        registry[cataloguePackage.id] = cataloguePackage;
    });
    return registry;
};

export const reconstructSignedStreamingCataloguePackages = (
    packageValue: unknown,
    contractValue: unknown,
): StreamingCataloguePackageRegistry => {
    const registry = normalizeStreamingCataloguePackageRegistry(packageValue);
    const contracts = Object.values(normalizeStreamingRightsContractRegistry(contractValue));
    const grouped = new Map<string, StreamingRightsContract[]>();
    contracts.filter(contract => Boolean(contract.cataloguePackageId)).forEach(contract => {
        const packageId = contract.cataloguePackageId!;
        grouped.set(packageId, [...(grouped.get(packageId) || []), contract]);
    });
    grouped.forEach((group, packageId) => {
        if (registry[packageId] || group.length < 2) return;
        const ordered = group.slice().sort((left, right) => left.sourceProjectId.localeCompare(right.sourceProjectId));
        const totalGuarantee = ordered.reduce((sum, contract) => sum + contract.minimumGuarantee, 0);
        const referenceTotal = Math.max(1, totalGuarantee);
        const components: StreamingCataloguePackageComponent[] = ordered.map(contract => ({
            sourceProjectId: contract.sourceProjectId,
            title: contract.titleAtSigning,
            projectType: contract.projectType === 'SERIES' ? 'SERIES' : 'MOVIE',
            genre: contract.genre || 'UNKNOWN',
            originalLanguageId: 'unknown',
            sellerStudioId: contract.seller.id,
            quality: 0,
            audience: 0,
            budget: 0,
            theatricalGross: 0,
            streamingRevenue: 0,
            franchiseProtected: false,
            rightsLot: {
                id: createDeterministicId('historical_streaming_package_lot', packageId, contract.id),
                sourceProjectId: contract.sourceProjectId,
                territory: contract.territory,
                countryIds: [...(contract.countryIds || [])].sort(),
                excludedCountryIds: [],
                startsAtAbsoluteWeek: contract.startsAtAbsoluteWeek,
                maximumDurationWeeks: contract.durationWeeks,
                windowType: contract.windowType || 'FIRST_WINDOW',
                notice: null,
            },
            referenceValue: Math.max(1_000_000, contract.minimumGuarantee),
            referenceWeight: Math.max(1_000_000, contract.minimumGuarantee) / Math.max(referenceTotal, ordered.length * 1_000_000),
        }));
        const acceptedTerms: StreamingCataloguePackageOfferRow[] = ordered.map((contract, index) => ({
            componentProjectId: contract.sourceProjectId,
            componentLotId: components[index].rightsLot.id,
            minimumGuarantee: contract.minimumGuarantee,
            licensorRevenueShare: contract.licensorRevenueShare,
            platformRevenueShare: contract.platformRevenueShare,
            backendBasis: contract.backendBasis,
            guaranteeRecoupment: contract.guaranteeRecoupment,
            backendCap: contract.backendCap,
            territory: contract.territory,
            countryIds: [...(contract.countryIds || [])].sort(),
            windowType: contract.windowType || 'FIRST_WINDOW',
            durationWeeks: contract.durationWeeks,
            exclusivity: contract.exclusivity,
            localization: contract.localization,
            localizationRequirements: contract.localizationRequirements?.map(requirement => ({ ...requirement, countryIds: [...requirement.countryIds] })),
            expectedRoyaltyCost: 0,
            expectedTotalCost: contract.minimumGuarantee,
            referenceAllocation: contract.minimumGuarantee,
            bidderWeight: 1 / ordered.length,
        }));
        const first = ordered[0];
        registry[packageId] = {
            schemaVersion: STREAMING_CATALOGUE_PACKAGE_SCHEMA_VERSION,
            id: packageId,
            idempotencyKey: `historical-streaming-catalogue-package:${packageId}`,
            source: 'PLAYER_CURATED',
            lifecycle: 'SIGNED',
            name: `${first.seller.name} catalogue package`,
            seller: first.seller,
            createdAtAbsoluteWeek: Math.min(...ordered.map(contract => contract.signedAtAbsoluteWeek)),
            startsAtAbsoluteWeek: Math.min(...ordered.map(contract => contract.startsAtAbsoluteWeek)),
            requestedWindowType: first.windowType || 'FIRST_WINDOW',
            requestedExclusivity: first.exclusivity,
            requestedCountryIds: Array.from(new Set(ordered.flatMap(contract => contract.countryIds || []))).sort(),
            maximumDurationWeeks: Math.min(...ordered.map(contract => contract.durationWeeks)),
            components,
            excluded: [],
            controlModeAtCreation: 'CUSTOM',
            protectionReasons: [],
            delegatedReason: 'Reconstructed from existing canonical title contracts during save migration.',
            manualApprovalRequired: true,
            biddingSessionId: first.biddingSessionId,
            acceptedOfferId: first.sourceOfferId,
            signedAtAbsoluteWeek: Math.max(...ordered.map(contract => contract.signedAtAbsoluteWeek)),
            totalGuarantee,
            totalExpectedExposure: totalGuarantee,
            acceptedTerms,
            componentContractIds: ordered.map(contract => contract.id).sort(),
            digestId: null,
        };
    });
    return registry;
};

export interface CreateStreamingCataloguePackageInput {
    studioId: string;
    name: string;
    projectIds: string[];
    source: StreamingCataloguePackageSource;
    absoluteWeek: number;
    startsAtAbsoluteWeek: number;
    desiredCountryIds?: string[];
    maximumDurationWeeks: number;
    windowType: Exclude<StreamingRightsWindowType, 'PERMANENT'>;
    exclusivity: StreamingLicenseExclusivity;
}

export interface CreateStreamingCataloguePackageResult {
    player: Player;
    package: StreamingCataloguePackage | null;
    reason?: 'STUDIO_NOT_FOUND' | 'NOT_ENOUGH_ELIGIBLE_TITLES';
}

const projectTitle = (project: any): string => cleanText(project?.name || project?.title || project?.projectDetails?.title, 'Untitled project');
const projectStudioId = (project: any): string => cleanText(project?.studioId || project?.projectDetails?.studioId);
const projectType = (project: any): 'MOVIE' | 'SERIES' => (
    project?.projectType === 'SERIES' || project?.type === 'SERIES' || project?.projectDetails?.type === 'SERIES'
        ? 'SERIES'
        : 'MOVIE'
);
const projectGenre = (project: any): string => cleanText(project?.genre || project?.projectDetails?.genre, 'UNKNOWN');
const isCommissionedProject = (project: any): boolean => Boolean(
    project?.isPlatformCommissionCredit
    || project?.countsTowardOwnedStudioEvaluation === false
    || project?.projectDetails?.hiddenStats?.playerPlatformCommissionOfferId
);

const windowsOverlap = (leftStart: number, leftEnd: number, rightStart: number, rightEnd: number): boolean => (
    leftStart < rightEnd && rightStart < leftEnd
);

const reservedCountryIdsFor = (
    registry: StreamingCataloguePackageRegistry,
    projectId: string,
    input: CreateStreamingCataloguePackageInput,
): Set<string> => {
    const reserved = new Set<string>();
    const requestEnd = input.startsAtAbsoluteWeek + input.maximumDurationWeeks;
    Object.values(registry).forEach(existing => {
        if (existing.lifecycle !== 'LIVE' || existing.seller.id !== input.studioId) return;
        if (existing.requestedWindowType !== input.windowType) return;
        if (existing.requestedExclusivity === 'NON_EXCLUSIVE' && input.exclusivity === 'NON_EXCLUSIVE') return;
        const component = existing.components.find(row => row.sourceProjectId === projectId);
        if (!component) return;
        const lotEnd = component.rightsLot.startsAtAbsoluteWeek + component.rightsLot.maximumDurationWeeks;
        if (!windowsOverlap(input.startsAtAbsoluteWeek, requestEnd, component.rightsLot.startsAtAbsoluteWeek, lotEnd)) return;
        component.rightsLot.countryIds.forEach(countryId => reserved.add(countryId));
    });
    return reserved;
};

export const createStreamingCataloguePackage = (
    player: Player,
    input: CreateStreamingCataloguePackageInput,
): CreateStreamingCataloguePackageResult => {
    const studio = (player.businesses || []).find(business => business.id === input.studioId && business.type === 'PRODUCTION_HOUSE');
    if (!studio) return { player, package: null, reason: 'STUDIO_NOT_FOUND' };
    const projectMap = new Map<string, any>();
    [
        ...(player.pastProjects || []),
        ...(player.activeReleases || []).filter(release => release.status === 'FINISHED'),
        ...getInheritedStudioProjects(player, input.studioId),
    ].forEach(project => {
        if (project?.id && !projectMap.has(project.id)) projectMap.set(project.id, project);
    });
    const packageRegistry = normalizeStreamingCataloguePackageRegistry(player.world.streamingCataloguePackages);
    const requestedIds = uniqueText(input.projectIds);
    const desiredCountryIds = input.desiredCountryIds === undefined
        ? STREAMING_DAY_ONE_MARKETS.map(market => market.id).sort()
        : normalizeStreamingDayOneMarketIds(input.desiredCountryIds).sort();
    const excluded: StreamingCataloguePackage['excluded'] = [];
    const components: StreamingCataloguePackageComponent[] = [];
    requestedIds.forEach(projectId => {
        const project = projectMap.get(projectId);
        if (!project) {
            excluded.push({ projectId, title: 'Unavailable project', code: 'MISSING_PROJECT', detail: 'This project is not in the completed studio catalogue.' });
            return;
        }
        const title = projectTitle(project);
        if (projectStudioId(project) !== input.studioId) {
            excluded.push({ projectId, title, code: 'WRONG_STUDIO', detail: 'This Production House does not control the project.' });
            return;
        }
        if (isCommissionedProject(project)) {
            excluded.push({ projectId, title, code: 'NO_PROFIT_RIGHTS', detail: 'The commissioning platform owns the streaming profit rights.' });
            return;
        }
        const reserved = reservedCountryIdsFor(packageRegistry, projectId, input);
        const availableRequestedCountries = desiredCountryIds.filter(countryId => !reserved.has(countryId));
        if (!availableRequestedCountries.length) {
            excluded.push({ projectId, title, code: 'ALREADY_RESERVED', detail: 'A live package already reserves this exact rights scope.' });
            return;
        }
        const lotBuild = buildStreamingBiddingRightsLot({
            world: player.world,
            sourceProjectId: projectId,
            sellerPartyId: input.studioId,
            startsAtAbsoluteWeek: input.startsAtAbsoluteWeek,
            maximumDurationWeeks: input.maximumDurationWeeks,
            windowType: input.windowType,
            desiredCountryIds: availableRequestedCountries,
        });
        if (!lotBuild.lot) {
            excluded.push({ projectId, title, code: 'NO_ELIGIBLE_RIGHTS', detail: lotBuild.compatibility.summary });
            return;
        }
        const quality = Math.max(0, Number(project.projectQuality || project.productionPerformance || project.rating * 10 || project.imdbRating * 10 || 0));
        components.push({
            sourceProjectId: projectId,
            title,
            projectType: projectType(project),
            genre: projectGenre(project),
            originalLanguageId: cleanText(project.originalLanguageId || project.projectDetails?.originalLanguageId, 'english'),
            sellerStudioId: input.studioId,
            quality,
            audience: Math.max(0, Number(project.totalViews || project.streaming?.totalViews || 0)),
            budget: finiteMoney(project.budget || project.projectDetails?.estimatedBudget),
            theatricalGross: finiteMoney(project.gross || project.totalGross),
            streamingRevenue: finiteMoney(project.streamingRevenue || project.projectDetails?.streamingRevenue),
            franchiseProtected: Boolean(project.franchiseId || project.universeId || project.projectDetails?.franchiseId || project.projectDetails?.universeId),
            rightsLot: lotBuild.lot,
            referenceValue: 0,
            referenceWeight: 0,
        });
    });
    components.sort((left, right) => left.sourceProjectId.localeCompare(right.sourceProjectId));
    excluded.sort((left, right) => left.projectId.localeCompare(right.projectId));
    if (components.length < 2) return { player, package: null, reason: 'NOT_ENOUGH_ELIGIBLE_TITLES' };
    const referenceValues = components.map(component => calculateStreamingCatalogueReferenceValue(component));
    const referenceTotal = referenceValues.reduce((sum, value) => sum + value, 0);
    const valuedComponents = components.map((component, index) => ({
        ...component,
        referenceValue: referenceValues[index],
        referenceWeight: referenceTotal > 0 ? referenceValues[index] / referenceTotal : 1 / components.length,
    }));
    const controlMode = ['STRATEGY', 'CUSTOM', 'FULL'].includes(String(player.streamingRightsManagement?.controlMode))
        ? player.streamingRightsManagement!.controlMode
        : 'CUSTOM';
    const protectedIds = new Set(player.streamingRightsManagement?.protectedProjectIds || []);
    const protectionReasons = Array.from(new Set(valuedComponents.flatMap(component => [
        ...(component.franchiseProtected ? [`FRANCHISE:${component.sourceProjectId}`] : []),
        ...(protectedIds.has(component.sourceProjectId) ? [`PROTECTED:${component.sourceProjectId}`] : []),
    ]))).sort();
    const idempotencyKey = [
        input.source,
        input.studioId,
        Math.max(0, Math.round(input.absoluteWeek)),
        Math.max(0, Math.round(input.startsAtAbsoluteWeek)),
        input.windowType,
        input.exclusivity,
        Math.max(1, Math.round(input.maximumDurationWeeks)),
        desiredCountryIds.join(','),
        valuedComponents.map(component => component.sourceProjectId).join(','),
    ].join(':');
    const packageId = createDeterministicId('streaming_catalogue_package', idempotencyKey);
    const existing = packageRegistry[packageId];
    if (existing) return { player, package: existing };
    const cataloguePackage: StreamingCataloguePackage = {
        schemaVersion: STREAMING_CATALOGUE_PACKAGE_SCHEMA_VERSION,
        id: packageId,
        idempotencyKey,
        source: input.source,
        lifecycle: 'READY',
        name: cleanText(input.name, `${studio.name} Collection`),
        seller: { type: 'PLAYER_STUDIO', id: studio.id, name: studio.name, platformId: null },
        createdAtAbsoluteWeek: Math.max(0, Math.round(input.absoluteWeek)),
        startsAtAbsoluteWeek: Math.max(0, Math.round(input.startsAtAbsoluteWeek)),
        requestedWindowType: input.windowType,
        requestedExclusivity: input.exclusivity,
        requestedCountryIds: desiredCountryIds,
        maximumDurationWeeks: Math.max(1, Math.round(input.maximumDurationWeeks)),
        components: valuedComponents,
        excluded,
        controlModeAtCreation: controlMode,
        protectionReasons,
        delegatedReason: null,
        manualApprovalRequired: protectionReasons.length > 0 || valuedComponents.length > 7 || input.exclusivity === 'EXCLUSIVE' && desiredCountryIds.length === STREAMING_DAY_ONE_MARKETS.length,
        biddingSessionId: null,
        acceptedOfferId: null,
        signedAtAbsoluteWeek: null,
        totalGuarantee: 0,
        totalExpectedExposure: 0,
        acceptedTerms: [],
        componentContractIds: [],
        digestId: null,
    };
    return {
        player: {
            ...player,
            world: {
                ...player.world,
                streamingCataloguePackages: { ...packageRegistry, [packageId]: cataloguePackage },
            },
        },
        package: cataloguePackage,
    };
};

export type StreamingCataloguePackagePolicyPatch = Partial<Omit<StreamingCataloguePackagePolicy, 'preferredSize'>> & {
    preferredSize?: Partial<StreamingCataloguePackagePolicy['preferredSize']>;
};

export const updateStreamingCataloguePackagePolicy = (
    player: Player,
    patch: StreamingCataloguePackagePolicyPatch,
    absoluteWeek: number,
): Player => {
    const currentManagement = asRecord(player.streamingRightsManagement);
    const currentPolicy = normalizeStreamingCataloguePackagePolicy(currentManagement.packagePolicy);
    const packagePolicy = normalizeStreamingCataloguePackagePolicy({
        ...currentPolicy,
        ...patch,
        preferredSize: { ...currentPolicy.preferredSize, ...(patch.preferredSize || {}) },
    });
    const controlMode: StreamingRightsControlMode = ['STRATEGY', 'CUSTOM', 'FULL'].includes(String(currentManagement.controlMode))
        ? currentManagement.controlMode as StreamingRightsControlMode
        : 'CUSTOM';
    const policy = asRecord(currentManagement.policy) as StreamingRightsManagementState['policy'];
    return {
        ...player,
        streamingRightsManagement: {
            ...currentManagement,
            schemaVersion: 1,
            controlMode,
            policy,
            packagePolicy,
            protectedProjectIds: uniqueText(currentManagement.protectedProjectIds),
            manualContractIds: uniqueText(currentManagement.manualContractIds),
            updatedAtAbsoluteWeek: Math.max(0, Math.round(absoluteWeek)),
        } as StreamingRightsManagementState,
    };
};

export interface StreamingCataloguePackageDesk {
    studioId: string;
    eligibleTitleCount: number;
    eligibleTitles: Array<{ id: string; title: string; genre: string; quality: number }>;
    draft: StreamingCataloguePackage[];
    ready: StreamingCataloguePackage[];
    live: StreamingCataloguePackage[];
    signed: StreamingCataloguePackage[];
    history: StreamingCataloguePackage[];
    unresolvedCount: number;
    canCreateProposal: boolean;
}

const getCompletedStudioProjectMap = (player: Player, studioId: string): Map<string, any> => {
    const projects = new Map<string, any>();
    [
        ...(player.pastProjects || []),
        ...(player.activeReleases || []).filter(release => release.status === 'FINISHED'),
        ...getInheritedStudioProjects(player, studioId),
    ].forEach(project => {
        if (
            project?.id
            && !projects.has(project.id)
            && projectStudioId(project) === studioId
            && !isCommissionedProject(project)
        ) projects.set(project.id, project);
    });
    return projects;
};

export const getStreamingCataloguePackageDesk = (
    player: Player,
    studioId: string,
    absoluteWeek: number,
): StreamingCataloguePackageDesk => {
    const registry = normalizeStreamingCataloguePackageRegistry(player.world.streamingCataloguePackages);
    const packages = Object.values(registry)
        .filter(cataloguePackage => cataloguePackage.seller.id === studioId)
        .sort((left, right) => right.createdAtAbsoluteWeek - left.createdAtAbsoluteWeek || left.id.localeCompare(right.id));
    const unresolved = packages.filter(cataloguePackage => ['DRAFT', 'READY', 'LIVE'].includes(cataloguePackage.lifecycle));
    const reservedIds = new Set(unresolved.flatMap(cataloguePackage => cataloguePackage.components.map(component => component.sourceProjectId)));
    const eligibleTitles = [...getCompletedStudioProjectMap(player, studioId).values()]
        .filter(project => !reservedIds.has(project.id))
        .map(project => ({
            id: project.id as string,
            title: projectTitle(project),
            genre: projectGenre(project),
            quality: Math.max(0, Number(project.projectQuality || project.rating * 10 || 0)),
        }))
        .sort((left, right) => right.quality - left.quality || left.title.localeCompare(right.title));
    const eligibleTitleCount = eligibleTitles.length;
    return {
        studioId,
        eligibleTitleCount,
        eligibleTitles,
        draft: packages.filter(cataloguePackage => cataloguePackage.lifecycle === 'DRAFT'),
        ready: packages.filter(cataloguePackage => cataloguePackage.lifecycle === 'READY'),
        live: packages.filter(cataloguePackage => cataloguePackage.lifecycle === 'LIVE'),
        signed: packages.filter(cataloguePackage => cataloguePackage.lifecycle === 'SIGNED'),
        history: packages.filter(cataloguePackage => ['WITHDRAWN', 'INVALIDATED'].includes(cataloguePackage.lifecycle)),
        unresolvedCount: unresolved.length,
        canCreateProposal: unresolved.length < 3 && eligibleTitleCount >= 2 && Math.max(0, Math.round(absoluteWeek)) >= 0,
    };
};

export interface ProcessStreamingCataloguePackagesWeekResult {
    player: Player;
    processed: boolean;
    digest: StreamingCataloguePackageDigest | null;
    createdPackageIds: string[];
    signedPackageIds: string[];
    skippedReasons: string[];
}

export const processStreamingCataloguePackagesWeek = (
    player: Player,
    absoluteWeek: number,
): ProcessStreamingCataloguePackagesWeekResult => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const lastProcessed = Number(player.world.streamingCataloguePackagesLastProcessedWeek ?? -1);
    if (lastProcessed >= week) {
        return { player, processed: false, digest: null, createdPackageIds: [], signedPackageIds: [], skippedReasons: [] };
    }
    const currentManagement = asRecord(player.streamingRightsManagement);
    const controlMode: StreamingRightsControlMode = ['STRATEGY', 'CUSTOM', 'FULL'].includes(String(currentManagement.controlMode))
        ? currentManagement.controlMode as StreamingRightsControlMode
        : 'CUSTOM';
    const packagePolicy = normalizeStreamingCataloguePackagePolicy(currentManagement.packagePolicy);
    let nextPlayer = updateStreamingCataloguePackagePolicy(player, {}, week);
    const createdPackageIds: string[] = [];
    const skippedReasons: string[] = [];
    const unresolved = Object.values(normalizeStreamingCataloguePackageRegistry(nextPlayer.world.streamingCataloguePackages))
        .filter(cataloguePackage => ['DRAFT', 'READY', 'LIVE'].includes(cataloguePackage.lifecycle));
    const isProposalCycle = week % 4 === 0;
    if (controlMode === 'FULL') skippedReasons.push('FULL_CONTROL');
    else if (!isProposalCycle) skippedReasons.push('OFF_CYCLE');
    else if (unresolved.length >= 3) skippedReasons.push('WORKLOAD_CAP');
    else {
        const reservedProjectIds = new Set(unresolved.flatMap(cataloguePackage => (
            cataloguePackage.components.map(component => component.sourceProjectId)
        )));
        const studioCandidates = nextPlayer.businesses
            .filter(business => business.type === 'PRODUCTION_HOUSE' && business.isActive !== false)
            .sort((left, right) => left.id.localeCompare(right.id))
            .map(studio => {
                const projects = [...getCompletedStudioProjectMap(nextPlayer, studio.id).values()]
                    .filter(project => !reservedProjectIds.has(project.id))
                    .sort((left, right) => {
                        const scoreDifference = Number(right.projectQuality || right.rating * 10 || 0)
                            - Number(left.projectQuality || left.rating * 10 || 0);
                        return scoreDifference || String(left.id).localeCompare(String(right.id));
                    });
                return { studio, projects };
            })
            .filter(candidate => candidate.projects.length >= packagePolicy.preferredSize.min);
        const selected = studioCandidates[0];
        if (!selected) skippedReasons.push('NOT_ENOUGH_ELIGIBLE_TITLES');
        else {
            const titleCount = Math.min(
                packagePolicy.preferredSize.max,
                packagePolicy.maximumAutomaticSize,
                selected.projects.length,
                8,
            );
            const chosen = selected.projects.slice(0, titleCount);
            const genreCounts = chosen.reduce((counts, project) => {
                const genre = projectGenre(project);
                counts[genre] = (counts[genre] || 0) + 1;
                return counts;
            }, {} as Record<string, number>);
            const dominantGenre = (Object.entries(genreCounts) as Array<[string, number]>)
                .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0];
            const result = createStreamingCataloguePackage(nextPlayer, {
                studioId: selected.studio.id,
                name: `${selected.studio.name} ${dominantGenre ? `${dominantGenre.toLowerCase()} ` : ''}collection`,
                projectIds: chosen.map(project => project.id),
                source: 'RIGHTS_DESK_PROPOSAL',
                absoluteWeek: week,
                startsAtAbsoluteWeek: week,
                desiredCountryIds: controlMode === 'STRATEGY'
                    && packagePolicy.automation === 'ROUTINE_AUTOMATIC'
                    && !packagePolicy.allowAutomaticGlobal
                    ? STREAMING_DAY_ONE_MARKETS.slice(0, 5).map(market => market.id)
                    : undefined,
                maximumDurationWeeks: packagePolicy.maximumAutomaticDurationWeeks,
                windowType: 'FIRST_WINDOW',
                exclusivity: packagePolicy.allowAutomaticExclusive ? 'EXCLUSIVE' : 'NON_EXCLUSIVE',
            });
            nextPlayer = result.player;
            if (result.package) createdPackageIds.push(result.package.id);
            else skippedReasons.push(result.reason || 'PACKAGE_CREATION_FAILED');
        }
    }
    const digest: StreamingCataloguePackageDigest | null = createdPackageIds.length
        ? {
            id: createDeterministicId('streaming_catalogue_package_digest', week),
            absoluteWeek: week,
            proposed: createdPackageIds.length,
            signed: 0,
            skipped: skippedReasons.length,
            summary: `Package Desk: ${createdPackageIds.length} portfolio proposal prepared; 0 signed; ${skippedReasons.length} skipped.`,
        }
        : null;
    const existingDigests = Array.isArray(nextPlayer.world.streamingCataloguePackageDigests)
        ? nextPlayer.world.streamingCataloguePackageDigests
        : [];
    nextPlayer = {
        ...nextPlayer,
        world: {
            ...nextPlayer.world,
            streamingCataloguePackageDigests: digest
                ? [digest, ...existingDigests.filter(candidate => candidate.id !== digest.id)].slice(0, 52)
                : existingDigests,
            streamingCataloguePackagesLastProcessedWeek: week,
        },
    };
    return { player: nextPlayer, processed: true, digest, createdPackageIds, signedPackageIds: [], skippedReasons };
};

export interface StreamingCatalogueRenewalGroup {
    id: string;
    cataloguePackageId: string;
    packageName: string;
    incumbentBuyerId: string;
    windowType: StreamingRightsWindowType;
    cases: StreamingRightsRenewalCase[];
    nearestDeadlineAbsoluteWeek: number;
}

export const getStreamingCatalogueRenewalGroups = (
    player: Player,
    excludedCaseIds: string[] = [],
): StreamingCatalogueRenewalGroup[] => {
    const excluded = new Set(uniqueText(excludedCaseIds));
    const packages = normalizeStreamingCataloguePackageRegistry(player.world.streamingCataloguePackages);
    const contracts = normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts);
    const cases = Object.values(asRecord(player.world.streamingRightsCalendar).renewalCases || {}) as StreamingRightsRenewalCase[];
    const groups = new Map<string, StreamingCatalogueRenewalGroup>();
    cases.filter(renewalCase => !excluded.has(renewalCase.id)).forEach(renewalCase => {
        const contract = contracts[renewalCase.sourceContractId];
        const packageId = contract?.cataloguePackageId;
        if (!packageId || !packages[packageId]) return;
        const buyerId = renewalCase.incumbentBuyer.id;
        const key = `${packageId}:${buyerId}:${renewalCase.windowType}`;
        const existing = groups.get(key);
        if (existing) {
            existing.cases.push(renewalCase);
            existing.nearestDeadlineAbsoluteWeek = Math.min(existing.nearestDeadlineAbsoluteWeek, renewalCase.decisionDeadlineAbsoluteWeek);
        } else {
            groups.set(key, {
                id: createDeterministicId('streaming_catalogue_renewal_group', key),
                cataloguePackageId: packageId,
                packageName: packages[packageId].name,
                incumbentBuyerId: buyerId,
                windowType: renewalCase.windowType,
                cases: [renewalCase],
                nearestDeadlineAbsoluteWeek: renewalCase.decisionDeadlineAbsoluteWeek,
            });
        }
    });
    return [...groups.values()]
        .filter(group => group.cases.length > 0)
        .map(group => ({ ...group, cases: group.cases.sort((left, right) => left.title.localeCompare(right.title)) }))
        .sort((left, right) => left.nearestDeadlineAbsoluteWeek - right.nearestDeadlineAbsoluteWeek || left.id.localeCompare(right.id));
};

export type AcceptStreamingCataloguePackageOfferFailure =
    | 'PACKAGE_NOT_FOUND'
    | 'ALREADY_SIGNED'
    | 'INVALID_SESSION'
    | 'INVALID_OFFER'
    | 'MALFORMED_ALLOCATION'
    | 'RIGHTS_CHANGED'
    | 'INSUFFICIENT_BUYER_CASH'
    | 'INSUFFICIENT_ENERGY'
    | 'SELLER_NOT_FOUND'
    | 'BUYER_NOT_FOUND';

export interface AcceptStreamingCataloguePackageOfferInput {
    packageId: string;
    session: StreamingBiddingSession;
    offerId: string;
    absoluteWeek: number;
}

export interface AcceptStreamingCataloguePackageOfferResult {
    player: Player;
    package: StreamingCataloguePackage | null;
    contracts: StreamingRightsContract[];
    changed: boolean;
    reason?: AcceptStreamingCataloguePackageOfferFailure;
    detail?: string;
}

const rejectPackageOffer = (
    player: Player,
    cataloguePackage: StreamingCataloguePackage | null,
    reason: AcceptStreamingCataloguePackageOfferFailure,
    detail: string,
): AcceptStreamingCataloguePackageOfferResult => ({
    player,
    package: cataloguePackage,
    contracts: [],
    changed: false,
    reason,
    detail,
});

const withInvestorPayout = (project: any, receipt: number): { project: any; payout: number } => {
    const payout = calculateInvestorPayout(project?.investorPlan, receipt);
    if (payout <= 0) return { project, payout: 0 };
    const summary = project.investorPayouts || { lifetimeInvestorPayout: 0, weeklyInvestorPayouts: [] };
    return {
        payout,
        project: {
            ...project,
            investorPayouts: {
                lifetimeInvestorPayout: Math.max(0, Number(summary.lifetimeInvestorPayout || 0)) + payout,
                weeklyInvestorPayouts: [payout, ...(summary.weeklyInvestorPayouts || [])].slice(0, 260),
            },
        },
    };
};

/**
 * Commits a catalogue package as one transaction. Every component is rechecked
 * against the live canonical registry before any cash, energy, or title state
 * moves. One failed component rejects the complete package.
 */
export const acceptStreamingCataloguePackageOffer = (
    player: Player,
    input: AcceptStreamingCataloguePackageOfferInput,
): AcceptStreamingCataloguePackageOfferResult => {
    const packageRegistry = normalizeStreamingCataloguePackageRegistry(player.world.streamingCataloguePackages);
    const cataloguePackage = packageRegistry[cleanText(input.packageId)] || null;
    if (!cataloguePackage) return rejectPackageOffer(player, null, 'PACKAGE_NOT_FOUND', 'Catalogue package not found.');
    if (cataloguePackage.lifecycle === 'SIGNED') {
        const registry = normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts);
        const contracts = cataloguePackage.componentContractIds.map(id => registry[id]).filter(Boolean);
        return { player, package: cataloguePackage, contracts, changed: false, reason: 'ALREADY_SIGNED' };
    }
    const session = input.session;
    if (
        cataloguePackage.lifecycle !== 'LIVE'
        || session.subjectKind !== 'CATALOGUE_PACKAGE'
        || session.cataloguePackageId !== cataloguePackage.id
        || cataloguePackage.biddingSessionId !== session.id
        || session.status !== 'ACCEPTED'
        || session.acceptedOfferId !== input.offerId
    ) {
        return rejectPackageOffer(player, cataloguePackage, 'INVALID_SESSION', 'The accepted bidding room does not match this live package.');
    }
    const offer = session.offers.find(candidate => candidate.id === input.offerId && candidate.status === 'ACCEPTED');
    if (!offer || offer.cataloguePackageId !== cataloguePackage.id || !offer.componentTerms) {
        return rejectPackageOffer(player, cataloguePackage, 'INVALID_OFFER', 'The selected package offer is unavailable.');
    }
    const allocationValidation = validateStreamingCatalogueOfferRows({
        components: cataloguePackage.components,
        rows: offer.componentTerms,
        totalGuarantee: offer.minimumGuarantee,
    });
    if (!allocationValidation.valid) {
        return rejectPackageOffer(player, cataloguePackage, 'MALFORMED_ALLOCATION', allocationValidation.reason || 'The title allocation is invalid.');
    }
    const seller = player.businesses.find(business => business.id === cataloguePackage.seller.id && business.type === 'PRODUCTION_HOUSE');
    if (!seller) return rejectPackageOffer(player, cataloguePackage, 'SELLER_NOT_FOUND', 'The selling Production House no longer exists.');
    const buyer = player.world.platforms?.[offer.platformId];
    if (!buyer) return rejectPackageOffer(player, cataloguePackage, 'BUYER_NOT_FOUND', 'The bidding platform no longer exists.');
    if (buyer.cashReserve * 1_000_000 < offer.minimumGuarantee) {
        return rejectPackageOffer(player, cataloguePackage, 'INSUFFICIENT_BUYER_CASH', `${buyer.name} can no longer fund the accepted guarantee.`);
    }
    if (Math.max(0, Number(player.energy?.current || 0)) < PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT) {
        return rejectPackageOffer(player, cataloguePackage, 'INSUFFICIENT_ENERGY', 'Not enough energy to sign the catalogue package.');
    }

    const completedSourceProjects = getCompletedStudioProjectMap(player, cataloguePackage.seller.id);
    const missingSource = cataloguePackage.components.find(component => !completedSourceProjects.has(component.sourceProjectId));
    if (missingSource) {
        return rejectPackageOffer(
            player,
            cataloguePackage,
            'RIGHTS_CHANGED',
            `${missingSource.title}: the source project is no longer available to the selling studio.`,
        );
    }

    const componentById = new Map(cataloguePackage.components.map(component => [component.sourceProjectId, component]));
    for (const row of offer.componentTerms) {
        const component = componentById.get(row.componentProjectId);
        if (!component) return rejectPackageOffer(player, cataloguePackage, 'MALFORMED_ALLOCATION', 'An offer row does not match a package title.');
        const compatibility = resolveStreamingRightsCompatibility({
            world: player.world,
            sourceProjectId: component.sourceProjectId,
            buyerPlatformId: offer.platformId,
            sellerPartyId: cataloguePackage.seller.id,
            territory: row.territory,
            countryIds: row.countryIds,
            startsAtAbsoluteWeek: cataloguePackage.startsAtAbsoluteWeek,
            expiresAtAbsoluteWeek: cataloguePackage.startsAtAbsoluteWeek + row.durationWeeks,
            windowType: row.windowType,
            exclusivity: row.exclusivity,
        });
        if (!compatibility.available || !sameStrings(compatibility.availableCountryIds, row.countryIds.slice().sort())) {
            return rejectPackageOffer(player, cataloguePackage, 'RIGHTS_CHANGED', `${component.title}: ${compatibility.summary}`);
        }
    }

    const signedAtAbsoluteWeek = Math.max(0, Math.round(input.absoluteWeek));
    let stagedRegistry = normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts);
    const stagedContracts: StreamingRightsContract[] = [];
    for (const row of offer.componentTerms) {
        const component = componentById.get(row.componentProjectId)!;
        const contractId = createDeterministicId(
            'streaming_catalogue_contract',
            cataloguePackage.id,
            session.id,
            offer.id,
            component.sourceProjectId,
        );
        const license = createStreamingLicenseContract({
            id: contractId,
            sourceProject: { id: component.sourceProjectId, title: component.title, mediaType: component.projectType, genre: component.genre },
            buyerPlatformId: offer.platformId,
            platformContentPlanId: null,
            cataloguePackageId: cataloguePackage.id,
            licensorName: cataloguePackage.seller.name,
            territory: row.territory,
            countryIds: row.countryIds,
            durationWeeks: row.durationWeeks,
            exclusivity: row.exclusivity,
            minimumGuarantee: row.minimumGuarantee,
            platformRevenueShare: row.platformRevenueShare,
            signedAtAbsoluteWeek,
            startsAtAbsoluteWeek: cataloguePackage.startsAtAbsoluteWeek,
            origin: 'CATALOGUE_ACQUISITION',
            sellerType: 'STUDIO',
            sellerPlatformId: null,
            windowType: row.windowType,
            permanentPurchase: false,
            renewalOption: true,
            sublicensingAllowed: false,
            sequelRightsIncluded: false,
            changeOfControl: 'NOTICE',
        });
        const candidate = createStreamingRightsContractFromLicense({
            license,
            seller: cataloguePackage.seller,
            buyer: { type: 'AI_PLATFORM', id: offer.platformId, name: buyer.name, platformId: offer.platformId },
            guaranteeDisposition: 'PAID',
            settledAtAbsoluteWeek: signedAtAbsoluteWeek,
            localization: row.localization,
            localizationRequirements: row.localizationRequirements,
            guaranteeRecoupment: row.guaranteeRecoupment,
            backendCap: row.backendCap,
            biddingSessionId: session.id,
            sourceOfferId: offer.id,
            idempotencyKey: `streaming-catalogue-contract:${cataloguePackage.id}:${offer.id}:${component.sourceProjectId}`,
        });
        const registration = registerStreamingRightsContract(stagedRegistry, candidate);
        if (!registration.contract || !registration.changed) {
            return rejectPackageOffer(player, cataloguePackage, 'INVALID_OFFER', `Could not register ${component.title} as a new package contract.`);
        }
        stagedRegistry = registration.registry;
        stagedContracts.push(registration.contract);
    }

    const allocationByProjectId = new Map(offer.componentTerms.map(row => [row.componentProjectId, row.minimumGuarantee]));
    let investorPayoutTotal = 0;
    const pastProjects = player.pastProjects.map(project => {
        const receipt = allocationByProjectId.get(project.id) || 0;
        const result = withInvestorPayout(project, receipt);
        investorPayoutTotal += result.payout;
        return result.project;
    });
    const pastProjectIds = new Set(player.pastProjects.map(project => project.id));
    const activeReleases = player.activeReleases.map(project => {
        if (pastProjectIds.has(project.id)) return project;
        const receipt = allocationByProjectId.get(project.id) || 0;
        const result = withInvestorPayout(project, receipt);
        investorPayoutTotal += result.payout;
        return result.project;
    });
    const netStudioReceipt = offer.minimumGuarantee - investorPayoutTotal;
    const currentRelationship = seller.studioState?.platformRelations?.[offer.platformId];
    let updatedSeller: Business = {
        ...seller,
        balance: seller.balance + netStudioReceipt,
        stats: {
            ...seller.stats,
            weeklyRevenue: Number(seller.stats?.weeklyRevenue || 0) + netStudioReceipt,
            weeklyProfit: Number(seller.stats?.weeklyProfit || 0) + netStudioReceipt,
            lifetimeRevenue: Number(seller.stats?.lifetimeRevenue || 0) + netStudioReceipt,
        },
        studioState: seller.studioState ? {
            ...seller.studioState,
            platformRelations: {
                ...(seller.studioState.platformRelations || {}),
                [offer.platformId]: {
                    trustModifier: Math.max(-8, Math.min(8, Number(currentRelationship?.trustModifier || 0) + 1)),
                    recoveryWeeksRemaining: Math.max(0, Number(currentRelationship?.recoveryWeeksRemaining || 0)),
                    completedDeals: Math.max(0, Number(currentRelationship?.completedDeals || 0)) + 1,
                    profitableDeals: Math.max(0, Number(currentRelationship?.profitableDeals || 0)),
                    loyaltyScore: Math.min(100, Math.max(0, Number(currentRelationship?.loyaltyScore || 0)) + 2),
                    realizedPartnerValue: Math.max(0, Number(currentRelationship?.realizedPartnerValue || 0)) + offer.minimumGuarantee,
                    lastBreachWeek: currentRelationship?.lastBreachWeek,
                    lastBreachYear: currentRelationship?.lastBreachYear,
                },
            },
            financeLedger: [
                {
                    id: `catalogue_package_receipt_${cataloguePackage.id}_${offer.id}`,
                    week: player.currentWeek,
                    year: player.age,
                    amount: offer.minimumGuarantee,
                    type: 'STREAMING_DEAL' as const,
                    label: `${buyer.name} catalogue package guarantee - ${cataloguePackage.name}`,
                },
                ...offer.componentTerms.flatMap(row => {
                    const project = player.pastProjects.find(candidate => candidate.id === row.componentProjectId)
                        || player.activeReleases.find(candidate => candidate.id === row.componentProjectId);
                    const payout = calculateInvestorPayout(project?.investorPlan, row.minimumGuarantee);
                    return payout > 0 ? [{
                        id: `catalogue_package_investor_${cataloguePackage.id}_${row.componentProjectId}`,
                        week: player.currentWeek,
                        year: player.age,
                        amount: -payout,
                        type: 'INVESTOR_PAYOUT' as const,
                        label: `${componentById.get(row.componentProjectId)?.title || 'Catalogue title'} investor share`,
                        projectId: row.componentProjectId,
                    }] : [];
                }),
                ...(seller.studioState.financeLedger || []),
            ].slice(0, 260),
        } : seller.studioState,
    };
    offer.componentTerms.forEach(row => {
        const project = player.pastProjects.find(candidate => candidate.id === row.componentProjectId)
            || player.activeReleases.find(candidate => candidate.id === row.componentProjectId);
        const payout = calculateInvestorPayout(project?.investorPlan, row.minimumGuarantee);
        updatedSeller = applyInvestorPayoutMemory({
            studio: updatedSeller,
            plan: project?.investorPlan,
            payout,
            projectId: row.componentProjectId,
            projectTitle: componentById.get(row.componentProjectId)?.title,
            week: player.currentWeek,
            year: player.age,
        }) || updatedSeller;
    });

    const signedPackage: StreamingCataloguePackage = {
        ...cataloguePackage,
        lifecycle: 'SIGNED',
        acceptedOfferId: offer.id,
        signedAtAbsoluteWeek,
        totalGuarantee: offer.minimumGuarantee,
        totalExpectedExposure: offer.expectedTotalCost,
        acceptedTerms: offer.componentTerms.map(row => ({
            ...row,
            countryIds: [...row.countryIds],
            localizationRequirements: row.localizationRequirements?.map(requirement => ({ ...requirement, countryIds: [...requirement.countryIds] })),
        })),
        componentContractIds: stagedContracts.map(contract => contract.id).sort(),
    };
    const stagedContractIds = new Set(stagedContracts.map(contract => contract.id));
    const updatedBuyer = {
        ...buyer,
        cashReserve: Math.max(0, buyer.cashReserve - offer.minimumGuarantee / 1_000_000),
        ai: buyer.ai ? {
            ...buyer.ai,
            rightsContracts: [
                ...buyer.ai.rightsContracts.filter(contract => !stagedContractIds.has(contract.id)),
                ...stagedContracts,
            ],
        } : buyer.ai,
    };
    const nextPlayer: Player = {
        ...player,
        pastProjects,
        activeReleases,
        businesses: player.businesses.map(business => business.id === updatedSeller.id ? updatedSeller : business),
        world: {
            ...player.world,
            platforms: {
                ...player.world.platforms!,
                [offer.platformId]: updatedBuyer,
            },
            streamingRightsContracts: stagedRegistry,
            streamingCataloguePackages: { ...packageRegistry, [cataloguePackage.id]: signedPackage },
            streamingBiddingSessions: {
                ...(player.world.streamingBiddingSessions || {}),
                [session.id]: session,
            },
        },
    };
    spendPlayerEnergy(nextPlayer, PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT, `Catalogue signing: ${cataloguePackage.name}`);
    return { player: nextPlayer, package: signedPackage, contracts: stagedContracts, changed: true };
};
