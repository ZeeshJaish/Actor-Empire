import type { OwnedStreamingPlatformState, Player } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { resolveStreamingCatalogTitle } from './streamingCatalog';
import { resolveStreamingRightsCompatibility } from './streamingRightsCompatibility';
import { normalizeStreamingDayOneMarketIds } from './streamingDayOneMarkets';

export const getOwnedPlatformPackageCountryIds = (platform: OwnedStreamingPlatformState): string[] => {
    const active = normalizeStreamingDayOneMarketIds((platform.marketOperations || [])
        .filter(operation => operation.scope === 'COUNTRY' && operation.status !== 'EXITED' && operation.countryId
            && (operation.status === 'ACTIVE' || operation.entryKind === 'OPENING'))
        .map(operation => operation.countryId));
    const planned = normalizeStreamingDayOneMarketIds(platform.identity?.dayOneMarketIds || []);
    return (active.length ? active : planned.length ? planned : ['US', 'CA', 'MX']).slice().sort();
};

export type ContentAvailability = 'IN_PRODUCTION' | 'AWAITING_AVAILABILITY' | 'READY' | 'SCHEDULED' | 'LIVE' | 'RIGHTS_EXPIRED' | 'RIGHTS_UNAVAILABLE';
export const CONTENT_AVAILABILITY_LABELS: Record<ContentAvailability, string> = {
    IN_PRODUCTION: 'In production', AWAITING_AVAILABILITY: 'Awaiting availability', READY: 'Ready to schedule',
    SCHEDULED: 'Scheduled', LIVE: 'Live', RIGHTS_EXPIRED: 'Rights expired', RIGHTS_UNAVAILABLE: 'Rights unavailable',
};

/** Re-evaluate studio access against grants elsewhere, including old saved imports. */
export const getOwnedTitleCountryAccess = (player: Player, projectId: string, countryIds: string[]) => {
    const week = getAbsoluteWeek(player.age, player.currentWeek);
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

export const getStreamingContentAvailability = (player: Player, projectId: string, countries = getOwnedPlatformPackageCountryIds(player.ownedStreamingPlatform)) => {
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
    const readyProduction = !commission || ['DELIVERED', 'RELEASED'].includes(commission.status);
    const available = readyProduction && (owned || active.length > 0) && (!countries.length || coveredCountryIds.length > 0);
    const slate = platform.launchSlate?.entries.find(e => e.projectId === projectId);
    const programWeek = platform.weeklyHistory.at(-1)?.operations?.programWeek || 0;
    const released = commission?.status === 'RELEASED' || Boolean(slate && platform.lifecycle === 'ACTIVE' && slate.launchWeek <= programWeek);
    const status: ContentAvailability = !readyProduction ? 'IN_PRODUCTION'
        : !owned && !active.length ? licenses.some(l => l.status === 'ACTIVE' && l.startsAtAbsoluteWeek > week)
            ? 'AWAITING_AVAILABILITY' : 'RIGHTS_EXPIRED'
        : !available ? 'RIGHTS_UNAVAILABLE'
        : released ? 'LIVE' : slate ? 'SCHEDULED' : 'READY';
    const raw = (player.pastProjects || []).find(p => p.id === projectId) as any
        || player.world.projects.find(p => p.id === projectId) as any;
    const runtime = Number(raw?.runtimeMinutes || raw?.projectDetails?.runtimeMinutes || 0);
    const episodeMinutes = Number(raw?.episodeRuntimeMinutes || raw?.projectDetails?.episodeRuntimeMinutes || 0);
    const episodes = Number(raw?.episodes || commission?.episodes || 8);
    const isSeries = (title?.projectType || commission?.projectType) === 'SERIES';
    const estimated = !(runtime > 0 || (isSeries && episodeMinutes > 0));
    const hours = runtime > 0 ? runtime / 60 : isSeries ? Math.max(1, episodes) * (episodeMinutes || 45) / 60 : 2;
    return { source, status, available, coveredCountryIds, hours, estimated };
};
