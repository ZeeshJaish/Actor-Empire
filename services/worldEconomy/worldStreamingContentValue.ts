import type { OwnedStreamingSlateEntry, Player } from '../../types';
import { resolveHistoricalCatalogueTitle } from '../historicalCatalogue';
import type { StreamingCatalogueReadContext } from '../streamingContentAvailability';

const bounded = (n:number, lo:number, hi:number) => Math.max(lo,Math.min(hi,Number.isFinite(n)?n:lo));

/** Authored title quality is a simulation input, not a measured audience rating. */
export const streamingTitleQuality = (player: Player, projectId: string, preparedContext?: StreamingCatalogueReadContext): number => {
    const index = preparedContext?.player === player ? preparedContext.titleIndex : undefined;
    const raw = index ? index.worldProjects.get(projectId) || index.pastProjects.get(projectId) || index.historicalTitle(projectId) || {} : (player.world.projects || []).find(project => String(project.id) === projectId) as any
        || (player.pastProjects || []).find(project => String(project.id) === projectId) as any
        || resolveHistoricalCatalogueTitle(player, projectId) || {};
    const quality = Number(raw.quality ?? raw.finalQuality);
    const rating = Number(raw.rating ?? raw.imdbRating);
    return bounded(Number.isFinite(quality) ? quality : Number.isFinite(rating) ? rating * 10 : 60,0,100);
};

/** Prior settled age anchors a title: editing its slate date cannot mint another premiere. */
export const streamingTitleWeeksAvailable = (player: Player, entry: OwnedStreamingSlateEntry, absoluteWeek: number): number => {
    const platform=player.ownedStreamingPlatform;
    const launch=platform.launchCommit?.committedAtAbsoluteWeek ?? absoluteWeek;
    let age=Math.max(1,absoluteWeek-launch-entry.launchWeek+2);
    const viewing=player.world.worldStreamingViewing;
    const prior=viewing?.platforms.PLAYER?.titlePerformance.find(row=>row.projectId===entry.projectId);
    if(prior && viewing!.lastProcessedAbsoluteWeek<=absoluteWeek)
        age=Math.max(age,prior.weeksAvailable+absoluteWeek-viewing!.lastProcessedAbsoluteWeek);
    for(const snapshot of platform.weeklyHistory) {
        if(snapshot.absoluteWeek>absoluteWeek) continue;
        const row=snapshot.operations?.titlePerformance?.find(title=>title.projectId===entry.projectId);
        if(row) age=Math.max(age,row.weeksAvailable+absoluteWeek-snapshot.absoluteWeek);
    }
    return age;
};

export const streamingTitleFreshness = (weeksAvailable:number):number =>
    Math.exp(-Math.max(0,weeksAvailable-1)/26);

export const streamingCatalogueValue = (titles: {quality:number;weeksAvailable:number;genre:string}[]) => {
    const count=titles.length;
    const quality=count?titles.reduce((sum,title)=>sum+title.quality,0)/count:0;
    const freshness=count?titles.reduce((sum,title)=>sum+streamingTitleFreshness(title.weeksAvailable),0)/count:0;
    const genres=new Set(titles.map(title=>title.genre)).size;
    // Smooth breadth returns rather than equating 26 titles with an unlimited library.
    const breadth=100*(1-Math.exp(-(count+Math.min(genres,12)*1.5)/24));
    const strength=breadth*(.15+.85*Math.pow(quality/100,1.5))*(.55+.45*freshness);
    return {quality,freshness,strength};
};

/** Only completed weeks can influence the next offer. Configured SLA is the launch fallback. */
export const streamingDeliveredService = (player:Player,absoluteWeek:number):number => {
    const platform=player.ownedStreamingPlatform;
    const prior=platform.weeklyHistory.filter(row=>row.absoluteWeek<absoluteWeek && row.operations)
        .slice(-4).map(row=>row.operations!.playbackSuccessRate).filter(Number.isFinite);
    return bounded(prior.length?prior.reduce((sum,n)=>sum+n,0)/prior.length:
        platform.infrastructureSetup?.reliabilityTarget ?? platform.metrics.technologyHealth ?? 55,0,100);
};
