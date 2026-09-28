import type {
    LegacyStreamingRightsHold, LegacyStreamingRightsMigrationSummary, OwnedStreamingCatalogLicense, Player,
    StreamingRightsContract, StreamingRightsContractParty, StreamingRightsContractRegistry,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeStreamingDayOneMarketIds } from './streamingDayOneMarkets';
import {
    createStreamingLicenseContract, createStreamingRightsContractFromLicense,
    normalizeStreamingRightsContractRegistry, registerStreamingRightsContract,
} from './streamingRightsCore';

const MIGRATION_VERSION = 1 as const;
const LEGACY_PLATFORM_IDS = new Set(['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE']);

const record = (value: unknown): Record<string, any> => (
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
);
const rows = (value: unknown): Record<string, any>[] => (
    Array.isArray(value) ? value.map(record) : []
);
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const week = (value: unknown, fallback: number): number => (
    Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback
);
const hasExplicitTerm = (source: Record<string, any>): boolean => (
    typeof source.permanentPurchase === 'boolean'
    || ['FIRST_WINDOW', 'SECOND_WINDOW', 'PERMANENT'].includes(source.windowType)
    || Number.isFinite(Number(source.durationWeeks)) && Number(source.durationWeeks) > 0
    || Number.isFinite(Number(source.expiresAtAbsoluteWeek)) && Number(source.expiresAtAbsoluteWeek) > 0
);
const isSyntheticFallback = (source: Record<string, any>): boolean => (
    source.legacySource === 'PRODUCTION_RELEASE'
    && !text(source.sourceOfferId)
    && !text(source.biddingSessionId)
);
const isExplicitlyEnded = (source: Record<string, any>): boolean => (
    source.status === 'TERMINATED' || source.status === 'TRANSFERRED_OUT'
);
const validLegacyPlatformId = (value: unknown): string => {
    const id = text(value).toUpperCase();
    return LEGACY_PLATFORM_IDS.has(id) ? id : '';
};

type Placement = {
    projectId: string;
    title: string;
    projectType: 'MOVIE' | 'SERIES';
    genre: string;
    studioId: string;
    buyerIds: Set<string>;
    hasSaleEvidence: boolean;
    contractIds: Set<string>;
    startsAtAbsoluteWeek: number;
};

const collectPlacements = (rawInput: Partial<Player> | Player, currentWeek: number): Map<string, Placement> => {
    const placements = new Map<string, Placement>();
    const add = (source: Record<string, any>, archived: boolean): void => {
        const projectId = text(source.id);
        if (!projectId) return;
        const streaming = record(source.streaming);
        const rawBuyerId = text(archived ? source.streamingPlatform : streaming.platformId);
        const buyerId = validLegacyPlatformId(rawBuyerId);
        const contractId = text(source.streamingContractId || streaming.contractId);
        const rawRuns = rows(source.streamingRuns);
        const runBuyerIds = rawRuns
            .map(run => validLegacyPlatformId(run.platformId))
            .filter(Boolean);
        const hasSaleEvidence = Boolean(rawBuyerId || contractId || rawRuns.length)
            || Number(source.streamingRevenue || 0) > 0
            || Number(source.streamingUpfrontFee || 0) > 0
            || (!archived && source.distributionPhase === 'STREAMING');
        if (!hasSaleEvidence) return;
        const releaseYear = week(source.releaseYear ?? source.year, 1);
        const releaseWeek = Math.max(1, Math.min(52, week(source.releaseWeek, 1)));
        const startsAtAbsoluteWeek = week(
            source.releasedAtAbsoluteWeek ?? streaming.startWeekAbsolute,
            archived ? getAbsoluteWeek(releaseYear, releaseWeek) : currentWeek,
        );
        const existing = placements.get(projectId) || {
            projectId,
            title: text(source.name) || 'Legacy film',
            projectType: source.projectType === 'SERIES' || source.type === 'SERIES' ? 'SERIES' as const : 'MOVIE' as const,
            genre: text(archived ? source.genre : record(source.projectDetails).genre) || 'DRAMA',
            studioId: text(archived ? source.studioId : record(source.projectDetails).studioId) || 'unknown-studio',
            buyerIds: new Set<string>(),
            hasSaleEvidence: false,
            contractIds: new Set<string>(),
            startsAtAbsoluteWeek,
        };
        if (buyerId) existing.buyerIds.add(buyerId);
        runBuyerIds.forEach(id => existing.buyerIds.add(id));
        if (contractId) existing.contractIds.add(contractId);
        existing.hasSaleEvidence = true;
        existing.startsAtAbsoluteWeek = Math.min(existing.startsAtAbsoluteWeek, startsAtAbsoluteWeek);
        placements.set(projectId, existing);
    };
    rows(rawInput.activeReleases).forEach(source => add(source, false));
    rows(rawInput.pastProjects).forEach(source => add(source, true));
    return placements;
};

const legacyScope = (source: Record<string, any>): Pick<StreamingRightsContract,
    'territory' | 'countryIds' | 'exclusivity'> => {
    const countries = normalizeStreamingDayOneMarketIds(source.countryIds).sort();
    const territory = source.territory === 'DOMESTIC' || source.territory === 'MULTI_REGION'
        ? source.territory
        : 'GLOBAL';
    return {
        territory,
        countryIds: territory === 'GLOBAL' ? [] : countries,
        exclusivity: source.exclusivity === 'NON_EXCLUSIVE' ? 'NON_EXCLUSIVE' : 'EXCLUSIVE',
    };
};
const hasUnresolvableScope = (source: Record<string, any>): boolean => (
    (source.territory === 'DOMESTIC' || source.territory === 'MULTI_REGION')
    && normalizeStreamingDayOneMarketIds(source.countryIds).length === 0
);

const promotePermanent = (
    contract: StreamingRightsContract,
    sourceScope: Record<string, any> = {},
): StreamingRightsContract => ({
    ...contract,
    ...legacyScope(sourceScope),
    windowType: 'PERMANENT',
    permanentPurchase: true,
    dealStructure: 'PERMANENT_ACQUISITION',
    expiresAtAbsoluteWeek: Number.MAX_SAFE_INTEGER,
    status: 'ACTIVE',
    renewalOption: false,
});

const makeHold = (
    projectId: string,
    reason: LegacyStreamingRightsHold['reason'],
    observedAtAbsoluteWeek: number,
): LegacyStreamingRightsHold => ({
    id: createDeterministicId('legacy_streaming_rights_hold', projectId),
    sourceProjectId: projectId,
    reason,
    observedAtAbsoluteWeek,
});

/** Reconcile only historical rights evidence. Never posts cash, awards, or ownership transfers. */
export const reconcileLegacyStreamingRights = (
    player: Player,
    rawInput: Partial<Player> | Player,
): Player => {
    if (player.world.legacyStreamingRightsMigration?.schemaVersion === MIGRATION_VERSION) return player;
    const currentWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const rawWorld = record(rawInput.world);
    const rawCanonical = rows(Object.values(record(rawWorld.streamingRightsContracts)));
    const rawOwnedLicenses = rows(record(rawInput.ownedStreamingPlatform).catalogLicenses);
    const rawAiLicenseRows = Object.entries(record(rawWorld.platforms))
        .flatMap(([platformId, platform]) => rows(record(record(platform).ai).rightsContracts)
            .map(source => ({ platformId, source })));
    const rawAiLicenses = rawAiLicenseRows.map(row => row.source);
    const rawLicenses = [...rawOwnedLicenses, ...rawAiLicenses];
    const explicitProjectIds = new Set<string>();
    const implicitContractIds = new Set<string>();
    const rawTermsByContractId = new Map<string, Record<string, any>>();
    [...rawCanonical, ...rawLicenses].forEach(source => {
        const projectId = text(source.sourceProjectId);
        if (!projectId) return;
        if (text(source.id)) rawTermsByContractId.set(text(source.id), source);
        if (isExplicitlyEnded(source)) {
            explicitProjectIds.add(projectId);
        } else if (isSyntheticFallback(source) || !hasExplicitTerm(source)) {
            if (text(source.id)) implicitContractIds.add(text(source.id));
        } else {
            explicitProjectIds.add(projectId);
        }
    });

    let registry: StreamingRightsContractRegistry = normalizeStreamingRightsContractRegistry(
        player.world.streamingRightsContracts,
    );
    const holds: Record<string, LegacyStreamingRightsHold> = { ...player.world.legacyStreamingRightsHolds };
    const placements = collectPlacements(rawInput, currentWeek);
    const permanentDealIds = new Set<string>();

    // A prior version may already have materialized a 52-week fallback. Its
    // provenance, not its synthetic duration, determines the old deal's term.
    Object.values(registry).forEach(contract => {
        if (isSyntheticFallback(record(contract))) {
            if (isExplicitlyEnded(record(contract))) {
                explicitProjectIds.add(contract.sourceProjectId);
                return;
            }
            implicitContractIds.add(contract.id);
            if (!placements.has(contract.sourceProjectId)) {
                const buyerId = validLegacyPlatformId(contract.buyer.platformId || contract.buyerPlatformId);
                if (buyerId) placements.set(contract.sourceProjectId, {
                    projectId: contract.sourceProjectId,
                    title: contract.titleAtSigning,
                    projectType: contract.projectType === 'SERIES' ? 'SERIES' : 'MOVIE',
                    genre: contract.genre || 'DRAMA',
                    studioId: contract.seller.id,
                    buyerIds: new Set([buyerId]),
                    hasSaleEvidence: true,
                    contractIds: new Set([contract.id]),
                    startsAtAbsoluteWeek: contract.startsAtAbsoluteWeek,
                });
            }
        }
    });

    for (const placement of placements.values()) {
        if (!placement.hasSaleEvidence || explicitProjectIds.has(placement.projectId)) continue;
        const contracts = Object.values(registry).filter(contract => contract.sourceProjectId === placement.projectId);
        const explicitContracts = contracts.filter(contract => !implicitContractIds.has(contract.id));
        if (explicitContracts.length) continue;
        const buyerIds = new Set(placement.buyerIds);
        contracts.forEach(contract => {
            const buyerId = validLegacyPlatformId(contract.buyer.platformId || contract.buyerPlatformId);
            if (buyerId) buyerIds.add(buyerId);
        });
        if (buyerIds.size !== 1) {
            holds[placement.projectId] = makeHold(
                placement.projectId,
                buyerIds.size ? 'CONFLICTING_EVIDENCE' : 'UNKNOWN_BUYER',
                currentWeek,
            );
            continue;
        }
        const buyerId = [...buyerIds][0];
        const matching = contracts.find(contract => (
            implicitContractIds.has(contract.id)
            && validLegacyPlatformId(contract.buyer.platformId || contract.buyerPlatformId) === buyerId
        ));
        if (matching) {
            if (hasUnresolvableScope(rawTermsByContractId.get(matching.id) || record(matching))) {
                holds[placement.projectId] = makeHold(placement.projectId,
                    'CONFLICTING_EVIDENCE', currentWeek);
                continue;
            }
            registry = { ...registry, [matching.id]: promotePermanent(matching,
                rawTermsByContractId.get(matching.id)) };
            permanentDealIds.add(matching.id);
            delete holds[placement.projectId];
            continue;
        }
        if (contracts.length || [...placement.contractIds].some(id => registry[id])) {
            holds[placement.projectId] = makeHold(placement.projectId, 'CONFLICTING_EVIDENCE', currentWeek);
            continue;
        }
        const contractId = [...placement.contractIds][0]
            || createDeterministicId('legacy_permanent_streaming_right', placement.projectId, buyerId);
        const seller: StreamingRightsContractParty = {
            type: (player.businesses || []).some(business => business.id === placement.studioId)
                ? 'PLAYER_STUDIO' : 'NPC_STUDIO',
            id: placement.studioId,
            name: (player.businesses || []).find(business => business.id === placement.studioId)?.name || placement.studioId,
            platformId: null,
        };
        const buyer: StreamingRightsContractParty = {
            type: 'AI_PLATFORM', id: buyerId,
            name: player.world.platforms?.[buyerId as keyof typeof player.world.platforms]?.name || buyerId,
            platformId: buyerId,
        };
        const license = createStreamingLicenseContract({
            id: contractId,
            sourceProject: { id: placement.projectId, title: placement.title,
                mediaType: placement.projectType, genre: placement.genre },
            buyerPlatformId: buyerId,
            platformContentPlanId: null,
            cataloguePackageId: null,
            licensorName: seller.name,
            territory: 'GLOBAL', countryIds: [], durationWeeks: 52,
            exclusivity: 'EXCLUSIVE', minimumGuarantee: 0,
            platformRevenueShare: 100,
            signedAtAbsoluteWeek: placement.startsAtAbsoluteWeek,
            startsAtAbsoluteWeek: placement.startsAtAbsoluteWeek,
            status: 'ACTIVE', origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null,
            windowType: 'PERMANENT', permanentPurchase: true,
        });
        const candidate = createStreamingRightsContractFromLicense({
            license, seller, buyer, guaranteeDisposition: 'LEGACY_PAID',
            settledAtAbsoluteWeek: placement.startsAtAbsoluteWeek,
            legacySource: 'PRODUCTION_RELEASE',
            idempotencyKey: `legacy-permanent:${placement.projectId}:${buyerId}`,
        });
        const registered = registerStreamingRightsContract(registry, candidate);
        if (registered.contract?.id === contractId) {
            registry = registered.registry;
            if (registered.changed) permanentDealIds.add(contractId);
            delete holds[placement.projectId];
        } else {
            holds[placement.projectId] = makeHold(placement.projectId, 'CONFLICTING_EVIDENCE', currentWeek);
        }
    }

    // Older AI buyer-local rows with missing terms may be rejected by the
    // stricter modern AI-state normalizer. Rebuild only the proven, active
    // rights position; this does not replay its historical cash settlement.
    const restoredAiLicenses = new Map<string, OwnedStreamingCatalogLicense[]>();
    for (const { platformId, source } of rawAiLicenseRows) {
        const contractId = text(source.id);
        const projectId = text(source.sourceProjectId);
        if (!contractId || !projectId || hasExplicitTerm(source)
            || source.status && source.status !== 'ACTIVE'
            || explicitProjectIds.has(projectId) || registry[contractId]) continue;
        if (!validLegacyPlatformId(platformId) || !text(source.titleAtSigning) || !text(source.licensorName)) {
            holds[projectId] = makeHold(projectId, 'UNKNOWN_BUYER', currentWeek);
            continue;
        }
        const startsAtAbsoluteWeek = week(source.startsAtAbsoluteWeek,
            week(source.signedAtAbsoluteWeek, currentWeek));
        if (hasUnresolvableScope(source)) {
            holds[projectId] = makeHold(projectId, 'CONFLICTING_EVIDENCE', currentWeek);
            continue;
        }
        const scope = legacyScope(source);
        const license = createStreamingLicenseContract({
            id: contractId,
            sourceProject: { id: projectId, title: text(source.titleAtSigning),
                mediaType: source.projectType === 'SERIES' ? 'SERIES' : 'MOVIE',
                genre: text(source.genre) || 'DRAMA' },
            buyerPlatformId: platformId,
            platformContentPlanId: null,
            cataloguePackageId: null,
            licensorName: text(source.licensorName),
            territory: scope.territory, countryIds: scope.countryIds, durationWeeks: 52,
            exclusivity: scope.exclusivity,
            minimumGuarantee: Math.max(0, Number(source.minimumGuarantee) || 0),
            platformRevenueShare: Math.max(0, Math.min(100, Number(source.platformRevenueShare) || 100)),
            signedAtAbsoluteWeek: week(source.signedAtAbsoluteWeek, startsAtAbsoluteWeek),
            startsAtAbsoluteWeek,
            status: 'ACTIVE', origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null,
            windowType: 'PERMANENT', permanentPurchase: true,
        });
        const candidate = createStreamingRightsContractFromLicense({
            license,
            buyer: { type: 'AI_PLATFORM', id: platformId,
                name: player.world.platforms?.[platformId as keyof typeof player.world.platforms]?.name || platformId,
                platformId },
            guaranteeDisposition: 'LEGACY_PAID',
            settledAtAbsoluteWeek: startsAtAbsoluteWeek,
            legacySource: 'PLATFORM_AI_LICENSE',
            idempotencyKey: `legacy-ai-permanent:${contractId}`,
        });
        const registered = registerStreamingRightsContract(registry, candidate);
        if (registered.contract?.id !== contractId) {
            holds[projectId] = makeHold(projectId, 'CONFLICTING_EVIDENCE', currentWeek);
            continue;
        }
        registry = registered.registry;
        restoredAiLicenses.set(platformId, [...(restoredAiLicenses.get(platformId) || []), license]);
        if (registered.changed) permanentDealIds.add(contractId);
        delete holds[projectId];
    }

    // Buyer-local licences from older saves may have been normalized with an
    // invented duration. Reconcile only raw licences with no stated term.
    const promotedIds = new Set<string>();
    rawLicenses.filter(source => !hasExplicitTerm(source) && !isExplicitlyEnded(source)
        && source.status !== 'EXPIRED' && text(source.id)).forEach(source => {
        const contract = registry[text(source.id)];
        if (!contract || explicitProjectIds.has(contract.sourceProjectId)) return;
        if (hasUnresolvableScope(source)) {
            holds[contract.sourceProjectId] = makeHold(contract.sourceProjectId,
                'CONFLICTING_EVIDENCE', currentWeek);
            return;
        }
        registry = { ...registry, [contract.id]: promotePermanent(contract, source) };
        promotedIds.add(contract.id);
        permanentDealIds.add(contract.id);
    });

    // An accepted room without a matching signed contract is evidence of a
    // possible prior sale, not authority to invent settlement or resell it.
    rows(Object.values(record(rawWorld.streamingBiddingSessions))).forEach(session => {
        if (session.status !== 'ACCEPTED' || !text(session.projectId)
            || session.subjectKind === 'CATALOGUE_PACKAGE') return;
        const acceptedOffers = rows(session.offers).filter(offer => (
            offer.status === 'ACCEPTED' || offer.id === session.acceptedOfferId
        ));
        const accountedFor = acceptedOffers.length > 0 && acceptedOffers.every(offer => (
            Object.values(registry).some(contract => (
                contract.sourceProjectId === session.projectId
                && !isSyntheticFallback(record(contract))
                && (contract.sourceOfferId === offer.id
                    || contract.biddingSessionId === session.id
                    || Boolean(validLegacyPlatformId(offer.platformId))
                        && validLegacyPlatformId(contract.buyer.platformId || contract.buyerPlatformId)
                            === validLegacyPlatformId(offer.platformId))
            ))
        ));
        if (!accountedFor) {
            holds[session.projectId] = makeHold(session.projectId,
                'UNVERIFIED_ACCEPTED_BID', currentWeek);
        }
    });
    const promoteLocal = <T extends { id: string; sourceProjectId: string }>(license: T): T => (
        promotedIds.has(license.id)
            ? { ...license,
                territory: registry[license.id]?.territory,
                countryIds: registry[license.id]?.countryIds,
                exclusivity: registry[license.id]?.exclusivity,
                windowType: 'PERMANENT', permanentPurchase: true,
                expiresAtAbsoluteWeek: Number.MAX_SAFE_INTEGER, renewalOption: false } as T
            : license
    );
    const ownedStreamingPlatform = promotedIds.size
        ? { ...player.ownedStreamingPlatform,
            catalogLicenses: player.ownedStreamingPlatform.catalogLicenses.map(promoteLocal) }
        : player.ownedStreamingPlatform;
    const platforms = promotedIds.size || restoredAiLicenses.size
        ? Object.fromEntries(Object.entries(player.world.platforms || {}).map(([id, platform]) => [id, {
            ...platform,
            ...(platform.ai ? { ai: { ...platform.ai,
                rightsContracts: [...platform.ai.rightsContracts.map(promoteLocal),
                    ...(restoredAiLicenses.get(id) || [])] } } : {}),
        }])) as Player['world']['platforms']
        : player.world.platforms;
    const summary: LegacyStreamingRightsMigrationSummary = {
        schemaVersion: MIGRATION_VERSION,
        reconciledAtAbsoluteWeek: currentWeek,
        explicitDealsPreserved: explicitProjectIds.size,
        permanentDealsProtected: permanentDealIds.size,
        unresolvedTitlesHeld: Object.keys(holds).length,
    };
    return {
        ...player,
        ownedStreamingPlatform,
        world: {
            ...player.world,
            platforms,
            streamingRightsContracts: normalizeStreamingRightsContractRegistry(registry),
            ...(Object.keys(holds).length ? { legacyStreamingRightsHolds: holds } : {}),
            legacyStreamingRightsMigration: summary,
        },
    };
};
