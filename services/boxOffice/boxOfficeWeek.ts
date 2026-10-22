import type { ActiveRelease, Business, IndustryProject, Player, ProjectDetails } from '../../types';
import { getDefaultCinemaChainIdsForRegion, getReleaseRegionIdsForProject } from '../distributionRevenue';
import { normalizeWorldPopulationState } from '../worldEconomy/worldPopulation';
import { normalizeWorldAudienceEconomyState } from '../worldEconomy/worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from '../worldEconomy/worldAudienceParticipation';
import { getCinemaRecognitionShare } from './boxOfficeAwareness';
import { NPC_DATABASE } from '../npcLogic';
import { getAbsoluteWeek } from '../legacyLogic';
import { readCinemaWorldAudience } from './boxOfficeAudienceAdapters';
import { normalizeCinemaTitle, preserveCinemaCastRecognition } from './boxOfficeInputs';
import { simulateCinemaWeek } from './boxOfficeMarket';
import { migrateCinemaState, CinemaMigrationError } from './boxOfficeMigration';
import { CINEMA_MARKET_TUNING_VERSION } from './boxOfficeProfiles';
import { commitCinemaWeek } from './boxOfficeLiveSettlement';
import type { CinemaTitleInput, CinemaWeekInput, CinemaWeekResult } from './boxOfficeTypes';
export { serializeCinemaFacts } from './boxOfficeIdentity';
import { serializeCinemaFacts } from './boxOfficeIdentity';
export const findCinemaBusiness = (player: Player, ownerId: string): Business | undefined => {
    if(typeof ownerId!=='string'||!ownerId)return undefined;
    const direct = player.businesses.find(b => b.type === 'PRODUCTION_HOUSE' && (b.id === ownerId || b.studioState?.acquisitionPortfolio?.sourceStudioId === ownerId));
    if (direct)
        return direct;
    const acquired = (player.flags?.studioAcquisitionCases || []).find(c => c.status === 'ACQUIRED' && c.studioId === ownerId && c.closing?.outcome === 'CONTROL');
    const takeover = (player.stockTakeovers || []).find(c => c.relatedStudioId === ownerId && Number(c.ownershipPercent) >= 50);
    const id = acquired?.closing?.acquiredBusinessId || takeover?.acquiredBusinessId;
    return player.businesses.find(b => b.type === 'PRODUCTION_HOUSE' && b.id === id);
};
export const prepareCinemaAudienceWorld = (player: Player, absoluteWeek: number): Player => {
    const population = normalizeWorldPopulationState(player.world.worldPopulation, absoluteWeek);
    const audience = normalizeWorldAudienceEconomyState(player.world.worldAudienceEconomy, population, absoluteWeek);
    const participation = normalizeWorldAudienceParticipationState(player.world.worldAudienceParticipation, population, audience, absoluteWeek);
    return { ...player, world: { ...player.world, worldPopulation: population, worldAudienceEconomy: audience, worldAudienceParticipation: participation } };
};
export const cinemaIndustryProjectDetails = (player: Player, project: IndustryProject): ProjectDetails => {
    const production = Object.values(player.world.industryProductions || {}).find(p => p.canonicalProjectId === project.id);
    const talent = production?.studioAiExecution?.talent;
    const outside = player.outsideProductions?.find(p => p.projectId === project.id);
    const quality = project.quality;
    const cast = (talent?.talentParticipation?.contracts || []).filter(c => c.role === 'ACTOR').map(c => ({ id: c.talentId, actorId: c.talentId, name: c.talentName, role: 'Cast', roleType: 'SUPPORTING' as const, type: 'ACTOR' as const, isPlayer: c.talentId === 'PLAYER_SELF', image: '' }));
    if (project.leadActorId && !cast.some(c => c.actorId === project.leadActorId))
        cast.push({ id: project.leadActorId, actorId: project.leadActorId, name: project.leadActorName, role: 'Lead', roleType: 'SUPPORTING', type: 'ACTOR', isPlayer: project.leadActorId === 'PLAYER_SELF', image: '' });
    const lead = cast.find(c => c.actorId === project.leadActorId);
    if (lead)
        (lead as {
            roleType: string;
        }).roleType = 'LEAD';
    return { title: project.title, type: 'MOVIE', genre: project.genre, studioId: project.studioId, budgetTier: project.budgetTier,
        estimatedBudget: production ? production.budgetMillions * 1e6 : outside?.budget || 0,
        description: outside?.logline || project.title, subtype: 'STANDALONE', visibleHype: 'LOW', visibleDirectorTier: 'Established', visibleScriptBuzz: 'Delivered', visibleCastStrength: 'Delivered',
        releaseStrategy: project.releaseStrategy || 'THEATRICAL',
        screeningStrategy: production?.studioAiExecution?.selectedReleaseMode === 'LIMITED_THEATRICAL' || outside?.releasePath === 'FESTIVAL' ? 'REGIONAL' : 'INTERNATIONAL',
        directorId: project.directorId, directorName: project.directorName, castList: project.cinemaCast || cast, universeId: project.universeId,
        originalLanguageId: 'english', cinemaExposure: project.cinemaExposure, talentParticipation: talent?.talentParticipation,
        hiddenStats: { qualityScore: quality, scriptQuality: production?.writerSkill || outside?.scoutReport.scriptQuality || quality,
            directorQuality: outside?.scoutReport.directorQuality || quality, castingStrength: talent?.packageScore || outside?.scoutReport.castQuality || quality,
            rawHype: 0, distributionPower: 0, prestigeBonus: 0 } };
};
export const normalizeLiveTitle = (player: Player, id: string, project: ProjectDetails, releaseWeek: number, route: CinemaTitleInput['owner']['route'], world: ReturnType<typeof readCinemaWorldAudience>, release?: ActiveRelease): CinemaTitleInput => {
    const ownerId=project.studioId || player.world.cinemaMarket?.titles[id]?.ownerId || `legacy-owner:${id}`;
    const title = normalizeCinemaTitle({ player, titleId: id, project, owner: { id: ownerId, route } });
    const regions = getReleaseRegionIdsForProject(project), countries = world.countries!.filter(c => regions.includes(c.regionId));
    const chains = Object.fromEntries(countries.map(c => [c.id, project.releaseChainSelections?.[c.regionId] || getDefaultCinemaChainIdsForRegion(project, c.regionId)]));
    if (title.exposure)
        title.exposure = { ...title.exposure, events: title.exposure.events.map(e => ({ ...e, titleId: id })) };
    const signed=Object.values(player.world.streamingRightsContracts || {}).filter(c=>c.sourceProjectId===id);
    const now=player.world.worldPopulation?.lastProcessedAbsoluteWeek ?? getAbsoluteWeek(player.age,player.currentWeek);
    const windows=signed.filter(c=>c.status==='ACTIVE'&&c.expiresAtAbsoluteWeek>now).map(c=>({platformId:c.buyer.platformId || c.buyerPlatformId,
        countryIds:c.territory==='GLOBAL'&&!c.countryIds.length ? countries.map(m=>m.id) : [...c.countryIds],absoluteWeek:c.startsAtAbsoluteWeek,publiclyKnown:true}));
    if(!signed.length&&release?.streaming)windows.push({platformId:release.streaming.platformId,countryIds:countries.map(c=>c.id),absoluteWeek:release.streaming.startWeekAbsolute || releaseWeek,publiclyKnown:true});
    title.market = { releaseWeek, runtimeMinutes: Math.max(45, Math.min(240, Number((project as any).runtimeMinutes) || 120)),
        languages: [project.originalLanguageId || 'english'], countryIds: countries.map(c => c.id), chainIds: [...new Set(Object.values(chains).flat())], chainIdsByCountry: chains, format: 'STANDARD',
        universeId: project.universeId, returningCharacterIds: [...new Set(title.cast.flatMap(c => c.characterIds))],
        payoff: title.delivery.deliveredQuality || 50, accessibility: title.delivery.scriptQuality, urgency: ['ACTION', 'ADVENTURE', 'SCI_FI', 'SUPERHERO', 'FANTASY'].includes(project.genre) ? 65 : 45,
        ...(windows.length ? {streamingWindows:windows} : {}) };
    return title;
};
export const buildCinemaWeekInput = (player: Player, absoluteWeek: number): CinemaWeekInput => {
    const state = player.world.cinemaMarket;
    if (!state)
        throw new Error('Migrate cinema before building live week');
    const hasCandidates=player.activeReleases.some(r=>r.type==='MOVIE'&&r.distributionPhase==='THEATRICAL'&&r.status!=='FINISHED'&&!state.titles[r.id]?.closed&&state.titles[r.id]?.basis!=='LEGACY_FULLY_SETTLED')
        ||player.world.projects.some(p=>p.mediaType!=='SERIES'&&p.releaseStrategy==='THEATRICAL'&&p.cinema?.settlementBasis==='UNSETTLED_WEEKLY'&&!state.titles[p.id]?.closed);
    const prepared = prepareCinemaAudienceWorld(player, absoluteWeek), world = readCinemaWorldAudience(prepared,{includeStreamingAlternatives:hasCandidates});
    const byId = new Map<string, CinemaTitleInput>();
    for (const release of player.activeReleases || []) {
        if (release.type !== 'MOVIE' || release.distributionPhase !== 'THEATRICAL' || release.status === 'FINISHED')
            continue;
        const paid = state.titles[release.id];
        if (paid?.closed || paid?.basis === 'LEGACY_FULLY_SETTLED')
            continue;
        const activation = paid?.activationWeek ?? release.cinema?.activationWeek ?? absoluteWeek;
        if (activation > absoluteWeek)
            continue;
        const releaseWeek = release.releasedAtAbsoluteWeek ?? (release.releaseYear && release.releaseWeek ? getAbsoluteWeek(release.releaseYear, release.releaseWeek) : absoluteWeek - Math.max(0, release.weekNum - 1));
        byId.set(release.id, normalizeLiveTitle(prepared, release.id, release.projectDetails, Math.max(0, releaseWeek), findCinemaBusiness(player, release.projectDetails.studioId) ? 'PLAYER_STUDIO' : 'ACCEPTED_ROLE', world, release));
    }
    for (const project of player.world.projects) {
        if (byId.has(project.id) || project.mediaType === 'SERIES' || project.releaseStrategy !== 'THEATRICAL' || project.cinema?.settlementBasis !== 'UNSETTLED_WEEKLY')
            continue;
        const paid = state.titles[project.id];
        if (paid?.closed || (paid?.activationWeek ?? project.cinema.activationWeek) > absoluteWeek)
            continue;
        const details = cinemaIndustryProjectDetails(prepared, project);
        byId.set(project.id, normalizeLiveTitle(prepared, project.id, details, paid?.activationWeek ?? project.cinema.activationWeek, findCinemaBusiness(player, project.studioId) ? 'PLAYER_STUDIO' : 'NPC_STUDIO', world));
    }
    const input: CinemaWeekInput = { ...world, absoluteWeek, seed: 20261022, tuningVersion: CINEMA_MARKET_TUNING_VERSION, knowledge: 'OBSERVED', titles: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)), marketState: state.market };
    const financeBasis = input.titles.map(t => {
        const r = player.activeReleases.find(r => r.id === t.id), p = Object.values(player.world.industryProductions || {}).find(p => p.canonicalProjectId === t.id), o = player.outsideProductions?.find(o => o.projectId === t.id);
        return { id: t.id, ledger: state.titles[t.id], gross: r?.totalGross, receipts: r?.totalStudioReceipts, releaseBudget: r?.budget, releaseWeekNum: r?.weekNum, royalty: r?.royaltyPercentage, actorPayee: r?.actorRoyaltyPayeeId, music: r?.projectDetails.musicPlan, destinationBusinessId: findCinemaBusiness(player, t.owner.id)?.id, investor: r?.investorPlan || r?.projectDetails.investorPlan, talent: r?.projectDetails.talentParticipation || p?.studioAiExecution?.talent?.talentParticipation, stake: o ? { id: o.id, stake: o.stakePercent, paid: o.playerPayout } : undefined };
    });
    input.live = { clockEpoch: state.clockEpoch, sourceSignature: serializeCinemaFacts({ input, financeBasis, careerClock: { age: player.age, week: player.currentWeek } }) };
    return input;
};
export const admitOutsideCinemaTitles = (player: Player, absoluteWeek: number): Player => {
    const projects = [...player.world.projects];
    for (const item of player.outsideProductions || []) {
        if (item.releasePath === 'STREAMING' || item.status !== 'RELEASED' || !item.cinema || item.cinema.activationWeek > absoluteWeek || projects.some(p => p.id === item.projectId))
            continue;
        const lead = NPC_DATABASE.find(n => n.name === item.castNames[0]);
        const quality = Math.max(1, Math.min(100, item.scoutReport.scriptQuality * .35 + item.scoutReport.directorQuality * .25 + item.scoutReport.castQuality * .2 + item.scoutReport.budgetDiscipline * .2 - item.scoutReport.risk * .15));
        projects.push({ id: item.projectId, title: item.projectTitle, mediaType: 'MOVIE', genre: item.genre, studioId: `outside-producer:${item.offerId}`, budgetTier: item.budget >= 150e6 ? 'BLOCKBUSTER' : item.budget >= 80e6 ? 'HIGH' : item.budget >= 30e6 ? 'MID' : 'LOW',
            quality, rating: Math.max(1, Math.min(10, quality / 10)), boxOffice: 0, year: player.age, weekReleased: player.currentWeek, leadActorId: lead?.id || `outside-cast:${item.id}`, leadActorName: item.castNames[0] || 'Independent cast', directorName: item.directorName, reviews: 'In theaters: awaiting actual audience results', releaseStrategy: 'THEATRICAL', cinema: item.cinema,
            cinemaExposure: { version: 1, attentionBasis: 'PACKAGE', attentionPotential: Math.round(quality * .3), events: [{ id: `outside-announcement:${item.id}`, titleId: item.projectId, absoluteWeek, kind: 'ANNOUNCEMENT', channel: 'PRODUCER_RELEASE', impressions: 0, recognitionShare: lead ? getCinemaRecognitionShare([{ personId: lead.id, name: lead.name, roleType: 'LEAD', roleWeight: 1, fame: lead.stats.fame, isPlayer: false, characterIds: [] }], { releasedTitleCount: 0, prestige: 0 }) : .002 }] } });
    }
    return projects.length === player.world.projects.length ? player : { ...player, world: { ...player.world, projects } };
};
export const processCinemaMarketWeek = (player: Player, absoluteWeek: number): {
    player: Player;
    result: CinemaWeekResult;
} => {
    const migration = migrateCinemaState(player, absoluteWeek - 1);
    if (migration.status === 'REJECTED')
        throw new CinemaMigrationError(migration.diagnostics.map(d => d.code));
    let prepared = admitOutsideCinemaTitles(migration.player, absoluteWeek);
    let changed = false;
    const projects = prepared.world.projects.map(project => {
        if (project.cinemaCast || project.cinema?.settlementBasis !== 'UNSETTLED_WEEKLY' || prepared.world.cinemaMarket?.titles[project.id]?.closed) return project;
        const details = preserveCinemaCastRecognition(cinemaIndustryProjectDetails(prepared, project), prepared);
        changed = true;
        return { ...project, cinemaCast: details.castList || [] };
    });
    if (changed) prepared = { ...prepared, world: { ...prepared.world, projects } };
    const result = simulateCinemaWeek(buildCinemaWeekInput(prepared, absoluteWeek));
    return { player: commitCinemaWeek(prepared, result).player, result };
};
