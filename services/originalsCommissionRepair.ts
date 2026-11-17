/**
 * 2026-11-15 (B13): give back the original commissions that the old 40-item cap dropped.
 * Up to 1.0.28 a service kept only its newest 40 commissions. An older original lost its commission record, and
 * with it its Original page, Renew, its place in the Originals count and filter. Its project still carries the
 * commission id (`hiddenStats.ownedStreamingCommissionId`), and the event ledger may still hold the
 * ORIGINAL_COMMISSIONED entry, so the record can be rebuilt on load. Idempotent: it only adds missing ids.
 */
import type { Player, OwnedStreamingOriginalCommission } from '../types';
import { normalizeOriginalCommission, OWNED_STREAMING_ORIGINAL_COMMISSION_LIMIT } from './ownedStreamingPlatform';

type ProjectLike = { id?: string; name?: string; title?: string; type?: string; studioId?: string; scriptId?: string; budget?: number; projectDetails?: Record<string, any> };

export const restoreDroppedOriginalCommissions = (player: Player): Player => {
    const platform = player?.ownedStreamingPlatform;
    if (!platform || !Array.isArray(platform.originalCommissions)) return player;
    const known = new Set(platform.originalCommissions.map(commission => commission.id));
    const ledger = new Map<string, { absoluteWeek?: number; metadata?: Record<string, unknown> }>();
    for (const entry of platform.eventLedger || []) {
        const id = entry?.type === 'ORIGINAL_COMMISSIONED' ? String(entry.metadata?.commissionId || '') : '';
        if (id) ledger.set(id, entry);
    }
    const restored: OwnedStreamingOriginalCommission[] = [];
    const consider = (project: ProjectLike | undefined, released: boolean) => {
        const details = project?.projectDetails || {};
        const id = String(details?.hiddenStats?.ownedStreamingCommissionId || '');
        if (!id || known.has(id)) return;
        const fromLedger = ledger.get(id);
        const meta = fromLedger?.metadata || {};
        const record = normalizeOriginalCommission({
            id,
            scriptId: String(meta.scriptId || details.sourceScriptId || project?.scriptId || `restored-script:${id}`),
            producerStudioId: String(meta.producerStudioId || details.studioId || project?.studioId || 'restored-producer'),
            canonicalProjectId: project?.id || null,
            title: details.title || project?.name || project?.title,
            projectType: details.type || project?.type,
            genre: details.genre,
            episodes: details.episodes,
            productionBudgetCap: Number(meta.productionBudgetCap || details.budget || project?.budget || 0),
            status: released ? 'RELEASED' : 'IN_PRODUCTION',
            commissionedAtAbsoluteWeek: Number(fromLedger?.absoluteWeek || 0),
        });
        if (!record) return;
        known.add(id);
        restored.push(record);
    };
    for (const release of player.activeReleases || []) consider(release as unknown as ProjectLike, true);
    for (const commitment of player.commitments || []) consider(commitment as unknown as ProjectLike, false);
    /* A released original keeps its content-accounting asset, `original:<commissionId>`, with its project, title,
       type, genre and start week; its world project names the producing studio. */
    const worldProjects = new Map((player.world?.projects || []).map(project => [project.id, project]));
    for (const asset of platform.contentAccounting?.assets || []) {
        if (asset?.source !== 'ORIGINAL' || !String(asset.id || '').startsWith('original:')) continue;
        const id = String(asset.id).slice('original:'.length);
        if (!id || known.has(id)) continue;
        const meta = ledger.get(id)?.metadata || {};
        const world = worldProjects.get(asset.projectId) as { studioId?: string; title?: string } | undefined;
        const record = normalizeOriginalCommission({
            id,
            scriptId: String(meta.scriptId || `restored-script:${id}`),
            producerStudioId: String(meta.producerStudioId || world?.studioId || 'restored-producer'),
            canonicalProjectId: asset.projectId || null,
            title: asset.title || world?.title,
            projectType: asset.projectType,
            genre: asset.genre,
            productionBudgetCap: Number(meta.productionBudgetCap || asset.costBasis || 0),
            status: 'RELEASED',
            commissionedAtAbsoluteWeek: Number(ledger.get(id)?.absoluteWeek || asset.startsAtAbsoluteWeek || 0),
        });
        if (!record) continue;
        known.add(id);
        restored.push(record);
    }
    if (!restored.length) return player;
    restored.sort((a, b) => a.commissionedAtAbsoluteWeek - b.commissionedAtAbsoluteWeek);
    return {
        ...player,
        ownedStreamingPlatform: {
            ...platform,
            originalCommissions: [...restored, ...platform.originalCommissions].slice(-OWNED_STREAMING_ORIGINAL_COMMISSION_LIMIT),
        },
    };
};
