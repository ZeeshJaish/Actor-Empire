import type { OwnedStreamingPlatformState, Player, StreamingContentAccountingState, StreamingContentCostAsset, StreamingRightsContractRegistry } from '../types';
import { createDeterministicId } from './deterministicRandom';

const money = (value: unknown): number => Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.round(Number(value) || 0)));
const week = money;

export const normalizeStreamingContentAccounting = (value: unknown): StreamingContentAccountingState | undefined => {
    const source = value as StreamingContentAccountingState | undefined;
    if (source?.schemaVersion !== 1 || !Array.isArray(source.assets)) return undefined;
    const assets = new Map<string, StreamingContentCostAsset>();
    for (const item of source.assets) {
        if (!item || typeof item.id !== 'string' || !item.id || typeof item.projectId !== 'string') continue;
        const costBasis = money(item.costBasis);
        const asset: StreamingContentCostAsset = {
            id: item.id, projectId: item.projectId, title: String(item.title || 'Content'),
            source: item.source === 'ORIGINAL' ? 'ORIGINAL' : 'LICENSED_WINDOW',
            projectType: item.projectType === 'SERIES' ? 'SERIES' : 'MOVIE', genre: String(item.genre || 'Content'),
            costBasis, recognizedCost: Math.min(costBasis, money(item.recognizedCost)),
            startsAtAbsoluteWeek: item.startsAtAbsoluteWeek == null ? null : week(item.startsAtAbsoluteWeek),
            usefulLifeWeeks: Math.max(1, week(item.usefulLifeWeeks)),
            productionFundingOffset: money(item.productionFundingOffset),
        };
        // Duplicate projections cannot reset a cost already recognized.
        const prior = assets.get(asset.id);
        if (!prior || prior.recognizedCost < asset.recognizedCost) assets.set(asset.id, asset);
    }
    return { schemaVersion: 1, lastProcessedAbsoluteWeek: week(source.lastProcessedAbsoluteWeek), assets: [...assets.values()],
        unverifiedAssetIds: Array.isArray(source.unverifiedAssetIds) ? [...new Set(source.unverifiedAssetIds.filter(id => typeof id === 'string'))] : [] };
};

/** Integer cumulative recognition closes exactly to cost, including the final rounding dollar. */
const scheduledCost = (asset: StreamingContentCostAsset, atWeek: number): number => {
    if (asset.startsAtAbsoluteWeek === null || atWeek < asset.startsAtAbsoluteWeek) return 0;
    const elapsed = Math.min(asset.usefulLifeWeeks, atWeek - asset.startsAtAbsoluteWeek + 1);
    return Math.floor(asset.costBasis * (elapsed / asset.usefulLifeWeeks));
};

export const recognizeStreamingContentCost = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
    contracts: StreamingRightsContractRegistry = {},
    context: Partial<Pick<Player['world'], 'streamingRightsTransactions' | 'industryProductions'>> = {},
): { state: StreamingContentAccountingState; expense: number; byProject: Map<string, { asset: StreamingContentCostAsset; expense: number }> } => {
    const prior = normalizeStreamingContentAccounting(platform.contentAccounting);
    const priorWeek = prior?.lastProcessedAbsoluteWeek ?? platform.lastProcessedAbsoluteWeek
        ?? platform.launchCommit?.committedAtAbsoluteWeek ?? absoluteWeek - 1;
    const assets = new Map((prior?.assets || []).map(asset => [asset.id, { ...asset }]));
    const currentIds = new Set<string>();
    const disposals = new Set<string>();
    const unverifiedAssetIds: string[] = [];
    const fundedOriginals = new Map<string, { projectId: string; cost: number }>();
    for (const asset of assets.values()) if (asset.source === 'ORIGINAL') {
        fundedOriginals.set(asset.id, { projectId: asset.projectId, cost: asset.costBasis });
    }
    for (const commission of platform.originalCommissions) fundedOriginals.set(`original:${commission.id}`,
        { projectId: commission.canonicalProjectId || commission.id, cost: money(commission.productionFundingApplied) });
    const launchStart = (platform.launchCommit?.committedAtAbsoluteWeek ?? absoluteWeek - 1) + 1;
    const add = (candidate: StreamingContentCostAsset, paidAt = candidate.startsAtAbsoluteWeek ?? absoluteWeek, legacyBasis = candidate.costBasis) => {
        currentIds.add(candidate.id);
        const existing = assets.get(candidate.id);
        if (existing) {
            existing.projectId = candidate.projectId;
            existing.title = candidate.title;
            // Authorized production top-ups are new basis, never new receipts.
            existing.costBasis = Math.max(existing.costBasis, candidate.costBasis);
            existing.productionFundingOffset = Math.max(existing.productionFundingOffset || 0, candidate.productionFundingOffset || 0);
            if (existing.startsAtAbsoluteWeek === null || existing.recognizedCost === 0) {
                existing.startsAtAbsoluteWeek = candidate.startsAtAbsoluteWeek;
                existing.usefulLifeWeeks = candidate.usefulLifeWeeks;
            }
            return;
        }
        // Old saves have no per-asset book. Establish elapsed recognition once,
        // without refunding old expenses or billing all past weeks again today.
        const legacyElapsed = Math.max(0, Math.min(104, Math.min(priorWeek, absoluteWeek - 1) - Math.max(launchStart, paidAt) + 1));
        const recognizedCost = prior ? 0 : Math.min(candidate.costBasis, Math.floor(legacyBasis * (legacyElapsed / 104)));
        assets.set(candidate.id, { productionFundingOffset: 0, ...candidate, recognizedCost });
    };
    for (const license of platform.catalogLicenses) {
        const canonical = contracts[license.id];
        const id = `license:${license.id}`;
        if (license.origin === 'OWNED_STUDIO_TRANSFER' || canonical?.settlement.guarantee === 'INTERNAL'
            || canonical?.settlement.guarantee === 'PENDING') continue;
        if (canonical && canonical.buyer.type !== 'PLAYER_PLATFORM') continue;
        const transaction = canonical?.rightsTransactionId ? context.streamingRightsTransactions?.[canonical.rightsTransactionId] : undefined;
        const isSuccessor = Boolean(canonical?.rightsTransactionId);
        if (isSuccessor && (!transaction || transaction.status !== 'SETTLED' || transaction.successorContractId !== license.id)) {
            unverifiedAssetIds.push(id);
            continue;
        }
        const originalOffset = Math.max(assets.get(id)?.productionFundingOffset || 0,
            [...fundedOriginals.values()].filter(item => item.projectId === license.sourceProjectId).reduce((total, item) => total + item.cost, 0));
        const costBasis = isSuccessor ? money(transaction!.acceptedPrice)
            : money((canonical?.minimumGuarantee ?? license.minimumGuarantee)
                + Math.max(0, money(canonical?.productionFunding) - originalOffset));
        const startsAtAbsoluteWeek = Math.max(launchStart, license.startsAtAbsoluteWeek,
            transaction?.settledAtAbsoluteWeek ?? canonical?.settlement.settledAtAbsoluteWeek ?? license.signedAtAbsoluteWeek);
        const permanent = license.permanentPurchase || license.windowType === 'PERMANENT';
        const usefulLifeWeeks = permanent ? 104
            : Math.max(1, Math.min(license.durationWeeks, license.expiresAtAbsoluteWeek - startsAtAbsoluteWeek));
        add({ id, projectId: license.sourceProjectId, title: license.titleAtSigning, source: 'LICENSED_WINDOW',
            projectType: license.projectType || 'MOVIE', genre: license.genre || 'Licensed', costBasis,
            productionFundingOffset: originalOffset,
            recognizedCost: 0, startsAtAbsoluteWeek, usefulLifeWeeks },
        transaction?.settledAtAbsoluteWeek ?? canonical?.settlement.settledAtAbsoluteWeek ?? license.signedAtAbsoluteWeek,
        canonical?.minimumGuarantee ?? license.minimumGuarantee);
        if (license.status === 'TRANSFERRED_OUT' || license.status === 'TERMINATED') disposals.add(id);
    }
    for (const commission of platform.originalCommissions) {
        const entry = platform.launchSlate?.entries.find(row => row.source === 'ORIGINAL' && row.projectId === commission.canonicalProjectId);
        const premiere = commission.releasePlan?.premiereAtAbsoluteWeek
            ?? (entry && platform.launchCommit ? platform.launchCommit.committedAtAbsoluteWeek + entry.launchWeek - 1 : null);
        add({ id: `original:${commission.id}`, projectId: commission.canonicalProjectId || commission.id,
            title: commission.title, source: 'ORIGINAL', projectType: commission.projectType === 'SERIES' ? 'SERIES' : 'MOVIE',
            genre: commission.genre, costBasis: money(commission.productionFundingApplied), recognizedCost: 0,
            startsAtAbsoluteWeek: premiere === null ? null : Math.max(launchStart, premiere), usefulLifeWeeks: 104 },
        commission.greenlitAtAbsoluteWeek ?? commission.commissionedAtAbsoluteWeek);
    }
    // Recover a paid failed order even when the first upgraded week is the
    // cancellation week and the production service has removed its commission.
    for (const obligation of platform.rightsObligations) {
        if (!obligation.fundedProductionIds?.length) continue;
        const paid = platform.costCommitments.filter(commitment => commitment.sourceReferenceId === obligation.id && commitment.status === 'PAID')
            .reduce((total, commitment) => total + commitment.paidAmount, 0);
        const productions = obligation.fundedProductionIds.map(id => context.industryProductions?.[id]);
        const required = productions.reduce((total, production) => total + money((production?.budgetMillions || 0) * 1_000_000), 0);
        if (!required || paid < required) continue;
        productions.forEach((production, index) => {
            if (!production || production.status !== 'CANCELLED') return;
            const id = `original:${createDeterministicId('auction_original', obligation.id, index)}`;
            currentIds.add(id);
            if (assets.has(id)) return;
            add({ id, projectId: production.canonicalProjectId, title: production.title, source: 'ORIGINAL',
                projectType: production.projectType, genre: production.genre, costBasis: money(production.budgetMillions * 1_000_000),
                recognizedCost: 0, startsAtAbsoluteWeek: null, usefulLifeWeeks: 104 }, production.createdAtAbsoluteWeek);
        });
    }
    // A bounded commission projection may be compacted while its paid asset
    // remains. A delivered paid license supplies its eventual availability.
    for (const asset of assets.values()) if (asset.source === 'ORIGINAL' && asset.startsAtAbsoluteWeek === null) {
        const delivered = platform.catalogLicenses.filter(license => license.sourceProjectId === asset.projectId
            && !['TERMINATED', 'TRANSFERRED_OUT'].includes(license.status)
            && money(contracts[license.id]?.productionFunding) > 0
            && contracts[license.id]?.settlement.guarantee !== 'PENDING')
            .sort((left, right) => left.startsAtAbsoluteWeek - right.startsAtAbsoluteWeek)[0];
        if (delivered) {
            asset.startsAtAbsoluteWeek = Math.max(launchStart, delivered.startsAtAbsoluteWeek);
            asset.usefulLifeWeeks = Math.max(1, Math.min(104, delivered.expiresAtAbsoluteWeek - asset.startsAtAbsoluteWeek));
        }
    }
    const cancelledProjects = new Set(Object.values(context.industryProductions || {})
        .filter(production => production.status === 'CANCELLED').map(production => production.canonicalProjectId));
    for (const asset of assets.values()) if (asset.source === 'ORIGINAL' && cancelledProjects.has(asset.projectId)) disposals.add(asset.id);
    const byProject = new Map<string, { asset: StreamingContentCostAsset; expense: number }>();
    let expense = 0;
    if (absoluteWeek > priorWeek) for (const asset of assets.values()) {
        const target = disposals.has(asset.id) ? asset.costBasis : scheduledCost(asset, absoluteWeek);
        const amount = Math.min(asset.costBasis - asset.recognizedCost, Math.max(0, target - asset.recognizedCost));
        asset.recognizedCost += amount;
        expense += amount;
        if (amount) {
            const existing = byProject.get(asset.projectId);
            byProject.set(asset.projectId, { asset, expense: amount + (existing?.expense || 0) });
        }
    }
    return { expense, byProject, state: { schemaVersion: 1, lastProcessedAbsoluteWeek: Math.max(priorWeek, absoluteWeek),
        assets: [...assets.values()].filter(asset => currentIds.has(asset.id) || asset.recognizedCost < asset.costBasis), unverifiedAssetIds } };
};
