import type { Player } from '../types';

export const SAVE_INTEGRITY_FORMAT_VERSION = 1;

export type SaveIntegrityReason = 'AUTOSAVE' | 'PROCESS_WEEK' | 'MIGRATION' | 'IMPORT' | 'MANUAL';

export interface SaveIdentityFingerprint {
    count: number;
    digest: string;
}

export interface SaveProtectedState {
    money: number;
    stats: string;
    commitments: SaveIdentityFingerprint;
    activeReleases: SaveIdentityFingerprint;
    pastProjects: SaveIdentityFingerprint;
    businesses: SaveIdentityFingerprint;
    businessFinances: SaveIdentityFingerprint;
    portfolio: SaveIdentityFingerprint;
    activeLoans: SaveIdentityFingerprint;
    studioTalent: SaveIdentityFingerprint;
    awards: SaveIdentityFingerprint;
    relationships: SaveIdentityFingerprint;
    bloodline: SaveIdentityFingerprint;
    dynastyMembers: SaveIdentityFingerprint;
    dynastyArchives: SaveIdentityFingerprint;
    universes: SaveIdentityFingerprint;
    activeProductions: SaveIdentityFingerprint;
    activeRights: SaveIdentityFingerprint;
    studioCompanies: SaveIdentityFingerprint;
    studioCompanyState: string;
    industryIntelligenceState?: string;
    streamingLicences: SaveIdentityFingerprint;
    assets: SaveIdentityFingerprint;
    customItems: SaveIdentityFingerprint;
    premiumEntitlements: SaveIdentityFingerprint;
    ownedStreamingIdentity: string;
    ownedStreamingTreasury: number;
}

export interface SaveIntegrityManifest {
    formatVersion: typeof SAVE_INTEGRITY_FORMAT_VERSION;
    saveMigrationVersion: number;
    playerId: string;
    playerName: string;
    age: number;
    week: number;
    reason: SaveIntegrityReason;
    needsRecoveryCheckpoint: boolean;
    createdAt: number;
    protected: SaveProtectedState;
    digest: string;
}

export type SaveIntegrityResult =
    | { ok: true }
    | { ok: false; violations: string[] };

export type ProtectedSaveComparison = SaveIntegrityResult;

const cleanText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const finiteNumber = (value: unknown): number => {
    const number = Number(value);
    return Number.isFinite(number) ? number : Number.NaN;
};

const quoteStableString = (value: string): string => `"${value.replace(/[\\"\u0000-\u001f]/g, character => {
    if (character === '\\') return '\\\\';
    if (character === '"') return '\\"';
    if (character === '\b') return '\\b';
    if (character === '\f') return '\\f';
    if (character === '\n') return '\\n';
    if (character === '\r') return '\\r';
    if (character === '\t') return '\\t';
    return `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`;
})}"`;

const stableSerialize = (value: unknown): string => {
    if (value === null) return 'null';
    if (typeof value === 'string') return quoteStableString(value);
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) return `[${value.map(item => stableSerialize(item)).join(',')}]`;
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record).sort().map(key => `${quoteStableString(key)}:${stableSerialize(record[key])}`).join(',')}}`;
    }
    return 'null';
};

const stableHash = (value: unknown): string => {
    const text = stableSerialize(value);
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < text.length; index += 1) {
        const code = text.charCodeAt(index);
        first ^= code;
        first = Math.imul(first, 0x01000193);
        second ^= code + index;
        second = Math.imul(second, 0x85ebca6b);
    }
    return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
};

const identityToken = (value: unknown, index: number, fallbackPrefix: string): string => {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return cleanText(record.id)
        || cleanText(record.projectId)
        || cleanText(record.sourceProjectId)
        || cleanText(record.name)
        || cleanText(record.title)
        || `${fallbackPrefix}:${index}`;
};

const fingerprintTokens = (tokens: string[]): SaveIdentityFingerprint => {
    const sorted = [...tokens].sort((left, right) => left.localeCompare(right));
    return { count: tokens.length, digest: stableHash(sorted) };
};

const fingerprintArray = (value: unknown, prefix: string): SaveIdentityFingerprint => {
    const items = Array.isArray(value) ? value : [];
    return fingerprintTokens(items.map((item, index) => identityToken(item, index, prefix)));
};

const fingerprintRecord = (
    value: unknown,
    prefix: string,
    include: (record: Record<string, unknown>) => boolean = () => true,
): SaveIdentityFingerprint => {
    const record = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const tokens = Object.entries(record)
        .filter(([, item]) => include(item && typeof item === 'object' ? item as Record<string, unknown> : {}))
        .map(([key, item], index) => identityToken(item, index, `${prefix}:${key}`) || key);
    return fingerprintTokens(tokens);
};

const getPremiumEntitlements = (player: Player): unknown[] => {
    const flags = player.flags || {};
    const candidates = [flags.premiumPurchases, flags.permanentPremiumProductIds, flags.premiumEntitlements];
    return candidates.flatMap(value => Array.isArray(value) ? value : []);
};

const businessFinanceTokens = (player: Player): string[] => (player.businesses || []).map((business, index) => {
    const record = business as unknown as Record<string, unknown>;
    const studioState = record.studioState && typeof record.studioState === 'object'
        ? record.studioState as Record<string, unknown>
        : {};
    return stableSerialize({
        id: identityToken(record, index, 'business'),
        balance: finiteNumber(record.balance),
        debt: finiteNumber(record.debt || 0),
        productionFund: finiteNumber(studioState.productionFund || 0),
    });
});

const portfolioTokens = (player: Player): string[] => (player.portfolio || []).map((position, index) => stableSerialize({
    id: cleanText(position.stockId) || `portfolio:${index}`,
    shares: finiteNumber(position.shares),
    averageCost: finiteNumber(position.averageCost),
    totalInvested: finiteNumber(position.totalInvested),
}));

const activeLoanTokens = (player: Player): string[] => (player.finance?.loans || [])
    .filter(loan => loan.status === 'ACTIVE')
    .map((loan, index) => stableSerialize({
        id: cleanText(loan.id) || `loan:${index}`,
        principal: finiteNumber(loan.principal),
        weeksRemaining: finiteNumber(loan.weeksRemaining),
        weeklyPayment: finiteNumber(loan.weeklyPayment),
    }));

const studioCompanyState = (player: Player): string => stableHash(
    Object.values(player.world?.studios || {})
        .sort((left, right) => left.id.localeCompare(right.id))
        .map(studio => ({
            id: studio.id,
            cashReserve: finiteNumber(studio.cashReserve),
            valuation: finiteNumber(studio.valuation),
            controller: cleanText(studio.ai?.controller),
            debtPrincipalMillions: finiteNumber(studio.ai?.finance?.debtPrincipalMillions || 0),
            lastProcessedAbsoluteWeek: finiteNumber(studio.ai?.lastProcessedAbsoluteWeek ?? -1),
            ledgerIds: (studio.ai?.ledger || []).map(entry => entry.id).sort(),
            eventIds: (studio.ai?.events || []).map(event => event.id).sort(),
            handoffKeys: [...(studio.ai?.handoffKeys || [])].sort(),
        })),
);

const industryIntelligenceState = (player: Player): string => stableHash([
    ...Object.values(player.world?.studios || {}).map(studio => studio.ai?.intelligence),
    ...Object.values(player.world?.platforms || {}).map(platform => platform.ai?.intelligence),
]
    .filter(Boolean)
    .map(state => ({
        schemaVersion: state!.schemaVersion,
        companyId: state!.companyId,
        companyKind: state!.companyKind,
        lastProcessedAbsoluteWeek: state!.lastProcessedAbsoluteWeek,
        nextDueAbsoluteWeek: state!.nextDueAbsoluteWeek,
        decisionCycleByLane: state!.decisionCycleByLane,
        momentum: state!.momentum,
        averageOutcomeByLane: state!.learning.averageOutcomeByLane,
        capabilityProgress: state!.learning.capabilityProgress,
        repetitionFatigue: state!.learning.repetitionFatigue,
        franchiseFatigue: state!.learning.franchiseFatigue,
        content: state!.content,
        materialProposalIds: state!.proposals
            .filter(proposal => proposal.status !== 'SHADOW')
            .map(proposal => proposal.id)
            .sort(),
    }))
    .sort((left, right) => left.companyId.localeCompare(right.companyId)));

const nonFiniteCanonicalMoneyPaths = (player: Player): string[] => {
    const paths: string[] = [];
    const inspect = (path: string, value: unknown) => {
        if (value !== undefined && value !== null && !Number.isFinite(Number(value))) paths.push(path);
    };
    const inspectNumericTree = (path: string, value: unknown) => {
        if (typeof value === 'number') {
            if (!Number.isFinite(value)) paths.push(path);
            return;
        }
        if (Array.isArray(value)) {
            value.forEach((item, index) => inspectNumericTree(`${path}.${index}`, item));
            return;
        }
        if (value && typeof value === 'object') {
            Object.entries(value as Record<string, unknown>)
                .forEach(([key, item]) => inspectNumericTree(`${path}.${key}`, item));
        }
    };
    inspect('money', player.money);
    inspectNumericTree('stats', player.stats);
    (player.businesses || []).forEach((business, index) => {
        inspect(`businesses.${index}.balance`, business.balance);
        const record = business as unknown as Record<string, unknown>;
        inspect(`businesses.${index}.debt`, record.debt);
        const studioState = record.studioState && typeof record.studioState === 'object'
            ? record.studioState as Record<string, unknown>
            : {};
        inspect(`businesses.${index}.studioState.productionFund`, studioState.productionFund);
    });
    (player.portfolio || []).forEach((position, index) => {
        inspect(`portfolio.${index}.shares`, position.shares);
        inspect(`portfolio.${index}.averageCost`, position.averageCost);
        inspect(`portfolio.${index}.totalInvested`, position.totalInvested);
    });
    (player.finance?.loans || []).forEach((loan, index) => {
        inspect(`finance.loans.${index}.principal`, loan.principal);
        inspect(`finance.loans.${index}.weeklyPayment`, loan.weeklyPayment);
        inspect(`finance.loans.${index}.weeksRemaining`, loan.weeksRemaining);
    });
    inspect('ownedStreamingPlatform.treasuryCash', (player.ownedStreamingPlatform as unknown as Record<string, unknown>)?.treasuryCash);
    return paths;
};

const createProtectedState = (player: Player): SaveProtectedState => {
    const platform = player.ownedStreamingPlatform as unknown as Record<string, unknown>;
    const licences = Array.isArray(platform?.catalogLicenses) ? platform.catalogLicenses : [];
    const treasury = finiteNumber(platform?.treasuryCash || 0);
    const stats = player.stats && typeof player.stats === 'object' ? player.stats as unknown as Record<string, unknown> : {};

    return {
        money: finiteNumber(player.money),
        stats: stableHash(stats),
        commitments: fingerprintArray(player.commitments, 'commitment'),
        activeReleases: fingerprintArray(player.activeReleases, 'release'),
        pastProjects: fingerprintArray(player.pastProjects, 'past-project'),
        businesses: fingerprintArray(player.businesses, 'business'),
        businessFinances: fingerprintTokens(businessFinanceTokens(player)),
        portfolio: fingerprintTokens(portfolioTokens(player)),
        activeLoans: fingerprintTokens(activeLoanTokens(player)),
        studioTalent: fingerprintArray(
            (player.studio?.talentRoster || []).filter(contract => contract.status === 'ACTIVE'),
            'studio-talent',
        ),
        awards: fingerprintArray(player.awards, 'award'),
        relationships: fingerprintArray(player.relationships, 'relationship'),
        bloodline: fingerprintArray(player.bloodline, 'bloodline'),
        dynastyMembers: fingerprintRecord(player.flags?.dynastyCareer?.members, 'dynasty-member'),
        dynastyArchives: fingerprintRecord(player.flags?.dynastyCareerArchives, 'dynasty-archive'),
        universes: fingerprintRecord(player.world?.universes, 'universe'),
        activeProductions: fingerprintRecord(
            player.world?.industryProductions,
            'industry-production',
            production => !['DELIVERED', 'CANCELLED'].includes(cleanText(production.status).toUpperCase()),
        ),
        activeRights: fingerprintRecord(
            player.world?.streamingRightsContracts,
            'streaming-right',
            contract => cleanText(contract.status).toUpperCase() === 'ACTIVE',
        ),
        studioCompanies: fingerprintRecord(player.world?.studios, 'studio-company'),
        studioCompanyState: studioCompanyState(player),
        industryIntelligenceState: industryIntelligenceState(player),
        streamingLicences: fingerprintArray(licences, 'streaming-licence'),
        assets: fingerprintArray(player.assets, 'asset'),
        customItems: fingerprintArray(player.customItems, 'custom-item'),
        premiumEntitlements: fingerprintArray(getPremiumEntitlements(player), 'premium-entitlement'),
        ownedStreamingIdentity: stableSerialize({
            id: cleanText(platform?.id),
            name: cleanText(platform?.name),
            lifecycle: cleanText(platform?.lifecycle),
        }),
        ownedStreamingTreasury: treasury,
    };
};

const manifestDigestSource = (manifest: Omit<SaveIntegrityManifest, 'digest' | 'createdAt'>) => ({
    ...manifest,
    protected: manifest.protected,
});

export const createSaveIntegrityManifest = (
    player: Player,
    reason: SaveIntegrityReason,
    createdAt = Date.now(),
    needsRecoveryCheckpoint = false,
): SaveIntegrityManifest => {
    const core = {
        formatVersion: SAVE_INTEGRITY_FORMAT_VERSION,
        saveMigrationVersion: Math.max(0, Math.round(finiteNumber(player.flags?.saveMigrationVersion) || 0)),
        playerId: cleanText(player.id),
        playerName: cleanText(player.name),
        age: finiteNumber(player.age),
        week: finiteNumber(player.currentWeek),
        reason,
        needsRecoveryCheckpoint,
        protected: createProtectedState(player),
    } as const;
    return {
        ...core,
        createdAt: Math.max(0, Math.round(finiteNumber(createdAt) || 0)),
        digest: stableHash(manifestDigestSource(core)),
    };
};

const compareFingerprint = (
    label: string,
    before: SaveIdentityFingerprint,
    after: SaveIdentityFingerprint,
    violations: string[],
) => {
    if (before.count !== after.count || before.digest !== after.digest) violations.push(`${label} identities changed`);
};

export const compareProtectedSaveState = (before: Player, after: Player): ProtectedSaveComparison => {
    const left = createProtectedState(before);
    const right = createProtectedState(after);
    const violations: string[] = [];
    if (!Number.isFinite(right.money)) violations.push('player money is not finite');
    else if (left.money !== right.money) violations.push('player money changed');
    if (left.stats !== right.stats) violations.push('player stats changed');
    compareFingerprint('commitments', left.commitments, right.commitments, violations);
    compareFingerprint('activeReleases', left.activeReleases, right.activeReleases, violations);
    compareFingerprint('pastProjects', left.pastProjects, right.pastProjects, violations);
    compareFingerprint('businesses', left.businesses, right.businesses, violations);
    compareFingerprint('business financials', left.businessFinances, right.businessFinances, violations);
    compareFingerprint('portfolio', left.portfolio, right.portfolio, violations);
    compareFingerprint('activeLoans', left.activeLoans, right.activeLoans, violations);
    compareFingerprint('studioTalent', left.studioTalent, right.studioTalent, violations);
    compareFingerprint('awards', left.awards, right.awards, violations);
    compareFingerprint('relationships', left.relationships, right.relationships, violations);
    compareFingerprint('bloodline', left.bloodline, right.bloodline, violations);
    compareFingerprint('dynasty members', left.dynastyMembers, right.dynastyMembers, violations);
    compareFingerprint('dynasty archives', left.dynastyArchives, right.dynastyArchives, violations);
    compareFingerprint('universes', left.universes, right.universes, violations);
    compareFingerprint('activeProductions', left.activeProductions, right.activeProductions, violations);
    compareFingerprint('activeRights', left.activeRights, right.activeRights, violations);
    compareFingerprint('studio companies', left.studioCompanies, right.studioCompanies, violations);
    if (left.studioCompanyState !== right.studioCompanyState) violations.push('studio company state changed');
    if (left.industryIntelligenceState !== right.industryIntelligenceState) violations.push('industry intelligence state changed');
    compareFingerprint('streamingLicences', left.streamingLicences, right.streamingLicences, violations);
    compareFingerprint('assets', left.assets, right.assets, violations);
    compareFingerprint('customItems', left.customItems, right.customItems, violations);
    compareFingerprint('premiumEntitlements', left.premiumEntitlements, right.premiumEntitlements, violations);
    if (left.ownedStreamingIdentity !== right.ownedStreamingIdentity) violations.push('owned streaming identity changed');
    if (!Number.isFinite(right.ownedStreamingTreasury)) violations.push('owned streaming treasury is not finite');
    else if (left.ownedStreamingTreasury !== right.ownedStreamingTreasury) violations.push('owned streaming treasury changed');
    return violations.length ? { ok: false, violations } : { ok: true };
};

export const verifySaveIntegrity = (
    player: Player,
    manifest: SaveIntegrityManifest,
): SaveIntegrityResult => {
    const violations: string[] = [];
    if (!player || typeof player !== 'object') return { ok: false, violations: ['save payload is not an object'] };
    if (!cleanText(player.id) || !cleanText(player.name)) violations.push('player identity is missing');
    if (!Number.isFinite(Number(player.age)) || !Number.isFinite(Number(player.currentWeek))) violations.push('player time is invalid');
    if (!Number.isFinite(Number(player.money))) violations.push('player money is not finite');
    nonFiniteCanonicalMoneyPaths(player)
        .filter(path => path !== 'money')
        .forEach(path => violations.push(`${path} is not finite`));
    if (manifest.formatVersion !== SAVE_INTEGRITY_FORMAT_VERSION) violations.push('integrity format is unsupported');
    const rebuilt = createSaveIntegrityManifest(player, manifest.reason, manifest.createdAt, manifest.needsRecoveryCheckpoint === true);
    if (rebuilt.digest !== manifest.digest) {
        const legacyProtected = { ...rebuilt.protected } as SaveProtectedState;
        delete legacyProtected.industryIntelligenceState;
        const legacyDigest = stableHash(manifestDigestSource({
            formatVersion: rebuilt.formatVersion,
            saveMigrationVersion: rebuilt.saveMigrationVersion,
            playerId: rebuilt.playerId,
            playerName: rebuilt.playerName,
            age: rebuilt.age,
            week: rebuilt.week,
            reason: rebuilt.reason,
            needsRecoveryCheckpoint: rebuilt.needsRecoveryCheckpoint,
            protected: legacyProtected,
        }));
        if (legacyDigest !== manifest.digest) violations.push('integrity digest does not match save payload');
    }
    return violations.length ? { ok: false, violations } : { ok: true };
};
