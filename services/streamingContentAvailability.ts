import type { OwnedStreamingPlatformState, Player } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { getStreamingCatalogProjectIds, resolveStreamingCatalogTitle } from './streamingCatalog';
import { resolveStreamingRightsCompatibility } from './streamingRightsCompatibility';
import { normalizeStreamingDayOneMarketIds } from './streamingDayOneMarkets';
import { projectStreamingCommercialOffers } from './streamingCommercialOffers';
import { normalizeStreamingRightsAccessGrant } from './streamingRightsAccessGrant';
import { evaluateStreamingTitleRoute, type StreamingTitleAccessDecision, type StreamingTitleAccessRoute } from './streamingTitleAccess';
import { resolveStreamingProductionReadiness } from './streamingProductionReadiness';

export const getOwnedPlatformPackageCountryIds = (platform: OwnedStreamingPlatformState): string[] => {
    const operations = (platform.marketOperations || [])
        .filter(operation => operation.scope === 'COUNTRY' && operation.countryId);
    // Once live, an explicit market record is authoritative, including an empty
    // ACTIVE set. Planned opening countries must never restore suspended billing.
    if (operations.length && platform.lifecycle === 'ACTIVE') {
        return normalizeStreamingDayOneMarketIds(operations.filter(operation => operation.status === 'ACTIVE')
            .map(operation => operation.countryId)).sort();
    }
    const available = normalizeStreamingDayOneMarketIds(operations.filter(operation =>
        operation.status === 'ACTIVE' || (operation.entryKind === 'OPENING'
            && operation.status !== 'EXITED' && operation.status !== 'SUSPENDED'))
        .map(operation => operation.countryId));
    const planned = normalizeStreamingDayOneMarketIds(platform.identity?.dayOneMarketIds || []);
    return (available.length ? available : operations.length ? [] : planned.length ? planned : ['US', 'CA', 'MX']).slice().sort();
};

export type ContentAvailability = 'IN_PRODUCTION' | 'AWAITING_AVAILABILITY' | 'READY' | 'SCHEDULED' | 'LIVE' | 'RIGHTS_EXPIRED' | 'RIGHTS_UNAVAILABLE';
export const CONTENT_AVAILABILITY_LABELS: Record<ContentAvailability, string> = {
    IN_PRODUCTION: 'In production', AWAITING_AVAILABILITY: 'Awaiting availability', READY: 'Ready to schedule',
    SCHEDULED: 'Scheduled', LIVE: 'Live', RIGHTS_EXPIRED: 'Rights expired', RIGHTS_UNAVAILABLE: 'Rights unavailable',
};

/** Re-evaluate studio access against grants elsewhere, including old saved imports. */
export const getOwnedTitleCountryAccess = (player: Player, projectId: string, countryIds: string[], absoluteWeek?: number) => {
    const week = absoluteWeek ?? getAbsoluteWeek(player.age, player.currentWeek);
    const registry = player.world.streamingRightsContracts || {};
    const buyerId = player.ownedStreamingPlatform.identity?.slug || `player-platform:${player.id}`;
    const ownContracts = Object.values(registry).filter(c => c.sourceProjectId === projectId
        && c.buyer.type === 'PLAYER_PLATFORM' && c.buyer.id === buyerId).map(c => c.id);
    return countryIds.filter(countryId => (['FIRST_WINDOW', 'SECOND_WINDOW', 'PERMANENT'] as const).every(windowType =>
        resolveStreamingRightsCompatibility({ world: player.world, sourceProjectId: projectId, buyerPlatformId: null,
            territory: 'DOMESTIC', countryIds: [countryId], startsAtAbsoluteWeek: week, expiresAtAbsoluteWeek: week + 1,
            windowType, exclusivity: 'NON_EXCLUSIVE', excludeContractIds: ownContracts,
        }).available));
};

/** Adapts existing canonical/buyer-local title positions to the shared C2 rule. */
export const evaluatePlayerStreamingTitleRoute = (
    player: Player,
    projectId: string,
    countryId: string,
    absoluteWeek: number,
    route: StreamingTitleAccessRoute,
    prepared?: { platform: OwnedStreamingPlatformState; ownedTitleIds: ReadonlySet<string> },
): StreamingTitleAccessDecision => {
    const platform = prepared?.platform || normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const offer = projectStreamingCommercialOffers(platform.serviceConfiguration.pricing);
    const commission = platform.originalCommissions.find(item => item.canonicalProjectId === projectId);
    const ready = resolveStreamingProductionReadiness(player, projectId, commission).ready;
    const slate = platform.launchSlate?.entries.find(entry => entry.projectId === projectId);
    const slateReleaseAtAbsoluteWeek = slate && platform.launchCommit
        ? platform.launchCommit.committedAtAbsoluteWeek + slate.launchWeek - 1
        : absoluteWeek;
    const generalReleaseAtAbsoluteWeek = commission?.releasePlan?.premiereAtAbsoluteWeek
        ?? slateReleaseAtAbsoluteWeek;
    const owned = Boolean(commission || (prepared
        ? prepared.ownedTitleIds.has(projectId)
        : resolveStreamingCatalogTitle(player, projectId)?.source === 'OWNED_LIBRARY'));
    const licenses = platform.catalogLicenses.filter(license => license.sourceProjectId === projectId)
        .sort((left, right) => right.startsAtAbsoluteWeek - left.startsAtAbsoluteWeek || left.id.localeCompare(right.id));
    const canUseOwnedPosition = owned && getOwnedTitleCountryAccess(player, projectId, [countryId], absoluteWeek).includes(countryId);
    const configuredModes = [
        ...(offer.subscriptions.length ? ['SUBSCRIPTION' as const] : []),
        ...(offer.freeAdOffer ? ['AD_SUPPORTED' as const] : []),
        ...(offer.storeOffer ? ['RENTAL' as const, 'PURCHASE' as const] : []),
    ];
    const ownedPosition = canUseOwnedPosition ? {
        contractId: `owned:${projectId}`,
        territory: 'GLOBAL' as const,
        countryIds: [] as string[],
        startsAtAbsoluteWeek: 0,
        expiresAtAbsoluteWeek: Number.MAX_SAFE_INTEGER,
        status: 'ACTIVE' as const,
        accessGrant: {
            schemaVersion: 1 as const,
            modes: configuredModes,
            earlyWindowWeeks: 4,
            purchaseFulfillment: 'PERPETUAL' as const,
            source: 'EXPLICIT' as const,
        },
    } : null;
    const licensedPositions = licenses.map(licence => {
        const canonical = player.world.streamingRightsContracts?.[licence.id];
        return {
            contractId: canonical?.id || licence.id,
            territory: canonical?.territory || licence.territory,
            countryIds: canonical?.countryIds || licence.countryIds || [],
            startsAtAbsoluteWeek: canonical?.startsAtAbsoluteWeek ?? licence.startsAtAbsoluteWeek,
            expiresAtAbsoluteWeek: canonical?.expiresAtAbsoluteWeek ?? licence.expiresAtAbsoluteWeek,
            status: canonical?.status || licence.status,
            accessGrant: normalizeStreamingRightsAccessGrant(canonical?.accessGrant || licence.accessGrant) || {
            schemaVersion: 1 as const,
            modes: [],
            earlyWindowWeeks: 0,
            purchaseFulfillment: 'NONE' as const,
            source: 'LEGACY_SNAPSHOT' as const,
            },
        };
    });
    const positions = [...(ownedPosition ? [ownedPosition] : []), ...licensedPositions]
        .sort((left, right) => (
            Number(right.territory === 'GLOBAL' || right.countryIds.includes(countryId))
            - Number(left.territory === 'GLOBAL' || left.countryIds.includes(countryId))
        ));
    const base = {
        titleId: projectId,
        countryId,
        absoluteWeek,
        productionReadyAtAbsoluteWeek: ready
            ? Math.max(0, commission?.localization?.readyAtAbsoluteWeek || 0)
            : Number.MAX_SAFE_INTEGER,
        generalReleaseAtAbsoluteWeek,
        marketActive: getOwnedPlatformPackageCountryIds(platform).includes(countryId),
        offer,
        route,
    };
    let denial: StreamingTitleAccessDecision | null = null;
    for (const position of positions) {
        const decision = evaluateStreamingTitleRoute({ ...base, position });
        if (decision.allowed) return decision;
        denial ||= decision;
    }
    return denial || evaluateStreamingTitleRoute({ ...base, position: null });
};

export const getStreamingContentAvailability = (
    player: Player,
    projectId: string,
    countries = getOwnedPlatformPackageCountryIds(player.ownedStreamingPlatform),
    includeRoutes = true,
) => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const commission = platform.originalCommissions.find(c => c.canonicalProjectId === projectId);
    const title = resolveStreamingCatalogTitle(player, projectId);
    const source = commission ? 'ORIGINAL' as const : title?.source === 'OWNED_LIBRARY' ? 'OWNED' as const : 'LICENSED' as const;
    const licenses = platform.catalogLicenses.filter(l => l.sourceProjectId === projectId);
    const active = licenses.filter(l => l.status === 'ACTIVE' && l.startsAtAbsoluteWeek <= week && l.expiresAtAbsoluteWeek > week);
    const owned = source !== 'LICENSED';
    const coveredCountryIds = owned ? getOwnedTitleCountryAccess(player, projectId, countries) : countries.filter(country => active.some(l =>
        l.territory === 'GLOBAL' || (l.countryIds?.length ? l.countryIds.includes(country)
            : l.territory === 'MULTI_REGION' || country === countries[0])));
    const readiness = resolveStreamingProductionReadiness(player, projectId, commission);
    const readyProduction = readiness.ready;
    const available = readyProduction && (owned || active.length > 0) && (!countries.length || coveredCountryIds.length > 0);
    const slate = platform.launchSlate?.entries.find(e => e.projectId === projectId);
    const programWeek = platform.launchCommit
        ? Math.max(1, week - platform.launchCommit.committedAtAbsoluteWeek + 1)
        : platform.weeklyHistory.at(-1)?.operations?.programWeek || 0;
    const released = commission?.releasePlan
        ? platform.lifecycle === 'ACTIVE' && commission.releasePlan.premiereAtAbsoluteWeek <= week
        : Boolean(commission && readiness.status === 'RELEASED') || Boolean(slate && platform.lifecycle === 'ACTIVE' && slate.launchWeek <= programWeek);
    const status: ContentAvailability = !readyProduction ? 'IN_PRODUCTION'
        : !owned && !active.length ? licenses.some(l => l.status === 'ACTIVE' && l.startsAtAbsoluteWeek > week)
            ? 'AWAITING_AVAILABILITY' : 'RIGHTS_EXPIRED'
        : !available ? 'RIGHTS_UNAVAILABLE'
        : released ? 'LIVE' : slate || commission?.releasePlan ? 'SCHEDULED' : 'READY';
    const raw = (player.pastProjects || []).find(p => p.id === projectId) as any
        || player.world.projects.find(p => p.id === projectId) as any;
    const runtime = Number(raw?.runtimeMinutes || raw?.projectDetails?.runtimeMinutes || 0);
    const episodeMinutes = Number(raw?.episodeRuntimeMinutes || raw?.projectDetails?.episodeRuntimeMinutes || 0);
    const episodes = Number(raw?.episodes || commission?.episodes || 8);
    const isSeries = (title?.projectType || commission?.projectType) === 'SERIES';
    const estimated = !(runtime > 0 || (isSeries && episodeMinutes > 0));
    const hours = runtime > 0 ? runtime / 60 : isSeries ? Math.max(1, episodes) * (episodeMinutes || 45) / 60 : 2;
    const routesByCountry: Record<string, Record<string, StreamingTitleAccessDecision>> = {};
    for (const countryId of includeRoutes ? countries : []) {
        const routeRows: Record<string, StreamingTitleAccessDecision> = {};
        const offer = projectStreamingCommercialOffers(platform.serviceConfiguration.pricing);
        for (const plan of offer.subscriptions) {
            routeRows[`SUBSCRIPTION:${plan.id}`] = evaluatePlayerStreamingTitleRoute(player, projectId, countryId, week,
                { kind: 'SUBSCRIPTION', planId: plan.id });
        }
        routeRows.SUBSCRIPTION = routeRows[`SUBSCRIPTION:${offer.subscriptions[0]?.id}`]
            || evaluatePlayerStreamingTitleRoute(player, projectId, countryId, week,
                { kind: 'SUBSCRIPTION', planId: '' });
        for (const kind of ['AD_SUPPORTED', 'RENTAL', 'PURCHASE'] as const) {
            routeRows[kind] = evaluatePlayerStreamingTitleRoute(player, projectId, countryId, week, { kind });
        }
        routesByCountry[countryId] = routeRows;
    }
    return { source, status, available, coveredCountryIds, hours, estimated, routesByCountry };
};

/** Viewer previews obey the same current rights, premiere and delivery gates as gameplay. */
export const getStreamingPlayableCatalogProjectIds = (player: Player): string[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    return getStreamingCatalogProjectIds(platform).filter(projectId => {
        const availability = getStreamingContentAvailability(player, projectId);
        return availability.available && Object.values(availability.routesByCountry).some(routes =>
            Object.values(routes).some(route => route.allowed));
    });
};
