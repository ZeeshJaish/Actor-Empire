import type { Player, StreamingAuctionFutureFundingTerms } from '../types';
/** Parse only the explicit saved agreement. Missing data never invents a funded deal. */
export const normalizeAuctionFutureFunding = (value: unknown): StreamingAuctionFutureFundingTerms | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    const v = value as Record<string, unknown>;
    if (!['NEW_ORIGINAL','SEQUEL','NEXT_SEASON'].includes(String(v.kind))
        || !['ANY','LIVE_ACTION','ANIMATED','ANIME'].includes(String(v.format))
        || !['FIRM','OPTION'].includes(String(v.commitment))
        || !Number.isInteger(v.count) || Number(v.count)<1 || Number(v.count)>3
        || !Number.isFinite(v.budgetPerProject) || Number(v.budgetPerProject)<100_000 || Number(v.budgetPerProject)>2_000_000_000
        || !Number.isInteger(v.platformRightsPercent) || Number(v.platformRightsPercent)<1 || Number(v.platformRightsPercent)>100
        || ![26,52].includes(Number(v.deadlineWeeks))) return undefined;
    return {kind:v.kind as StreamingAuctionFutureFundingTerms['kind'],count:Number(v.count),budgetPerProject:Number(v.budgetPerProject),
        format:v.format as StreamingAuctionFutureFundingTerms['format'],commitment:v.commitment as 'FIRM'|'OPTION',
        deadlineWeeks:Number(v.deadlineWeeks),platformRightsPercent:Number(v.platformRightsPercent),
        ...(typeof v.parentProjectId==='string' && v.parentProjectId ? {parentProjectId:v.parentProjectId}:{}),
        ...(typeof v.lineageId==='string' && v.lineageId ? {lineageId:v.lineageId}:{}),
        ...(Number.isSafeInteger(v.firstInstallmentNumber) && Number(v.firstInstallmentNumber)>1 ? {firstInstallmentNumber:Number(v.firstInstallmentNumber)}:{}),
        ...(typeof v.baseTitle==='string' && v.baseTitle.trim() ? {baseTitle:v.baseTitle.trim()}:{}),
    };
};

/** Resolve source identity once when bidding, then retain it through signing and save reload. */
export const resolveAuctionContinuation = (player: Player, sourceProjectId: string, title: string, projectType: 'MOVIE' | 'SERIES') => {
    const commission = player.ownedStreamingPlatform.originalCommissions.find(row => row.canonicalProjectId === sourceProjectId);
    const records: any[] = [...player.world.projects, ...player.pastProjects, ...player.activeReleases, ...player.commitments];
    const source = records.find(row => row.id === sourceProjectId) || {};
    const details = source.projectDetails || source;
    const lineageId = source.franchiseId || details.franchiseId || commission?.lineageId || sourceProjectId;
    const ordinalOf = (row: any): number => {
        const d = row.projectDetails || row;
        const n = Number(projectType === 'SERIES' ? row.seasonNumber || d.seasonNumber || row.installmentNumber || d.installmentNumber
            : row.installmentNumber || d.installmentNumber);
        return Number.isSafeInteger(n) && n > 0 ? n : 1;
    };
    let current = Math.max(ordinalOf(source), projectType === 'SERIES' ? commission?.seasonNumber || 1 : 1);
    // Parent links recover lineage for older industry projects without explicit franchise metadata.
    const visited = new Set<string>();
    let ancestor = source;
    let depth = 1;
    while (ancestor?.parentProjectId && !visited.has(ancestor.id)) {
        visited.add(ancestor.id);depth++;
        ancestor = records.find(row => row.id === ancestor.parentProjectId);
    }
    current = Math.max(current, depth);
    const suffix = title.match(/(?:\s+(?:part|sequel|season))?\s+(\d+)$/i);
    if (current === 1 && suffix && Number(suffix[1]) >= 2 && Number(suffix[1]) <= 20) current = Number(suffix[1]);
    const latest = records.filter(row => (row.franchiseId || row.projectDetails?.franchiseId) === lineageId)
        .reduce((n,row) => Math.max(n,ordinalOf(row)),current);
    const latestCommission = player.ownedStreamingPlatform.originalCommissions.filter(row => row.lineageId === lineageId)
        .reduce((n,row) => Math.max(n,row.seasonNumber || 1),latest);
    const latestPromised = player.ownedStreamingPlatform.rightsObligations
        .filter(row => row.status !== 'BREACHED' && row.futureFunding?.kind !== 'NEW_ORIGINAL'
            && (row.futureFunding?.lineageId === lineageId || row.sourceProjectId === sourceProjectId))
        .reduce((n,row) => Math.max(n,row.futureFunding?.firstInstallmentNumber ? row.futureFunding.firstInstallmentNumber + row.futureFunding.count - 1 : 1),latestCommission);
    const baseTitle = String(source.franchiseName || details.franchiseName || (suffix && Number(suffix[1]) === current
        ? title.slice(0,suffix.index).trim() : ancestor?.title || title)).replace(/\s+(?:part|sequel|season)$/i,'').trim() || title;
    return {parentProjectId:sourceProjectId,lineageId,firstInstallmentNumber:latestPromised+1,baseTitle};
};
