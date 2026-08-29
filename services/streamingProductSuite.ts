import type {
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    OwnedStreamingProductBenefit,
    OwnedStreamingProductLine,
    Player,
    StreamingProductLaunchMode,
    StreamingProductLineId,
    StreamingProductRisk,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import { resolveStreamingCatalogTitle } from './streamingCatalog';
import { getStreamingOriginalLiveStatus } from './streamingOriginals';
import {
    findStreamingResearchDefinitionForProduct,
    markStreamingResearchInstallationOperating,
    markStreamingResearchInstallationStarted,
} from './streamingResearchLifecycle';

export interface StreamingProductDefinition {
    id: StreamingProductLineId;
    title: string;
    shortTitle: string;
    codename: string;
    tagline: string;
    description: string;
    audience: string;
    accent: string;
    baseCapitalCost: number;
    baseWeeklyOperatingCost: number;
    baseDevelopmentWeeks: number;
    staffRequired: number;
    peakLoadPercent: number;
    benefit: OwnedStreamingProductBenefit;
    risk: StreamingProductRisk;
    riskNote: string;
    strategicConsequence: string;
}

export interface StreamingProductLaunchPreview {
    definition: StreamingProductDefinition;
    launchMode: StreamingProductLaunchMode;
    capitalCost: number;
    weeklyOperatingCost: number;
    developmentWeeks: number;
    staffRequired: number;
    peakLoadPercent: number;
    risk: StreamingProductRisk;
    riskNote: string;
}

export interface StreamingProductLineView {
    definition: StreamingProductDefinition;
    record: OwnedStreamingProductLine | null;
    status: 'CORE_ACTIVE' | 'UNDER_DEVELOPMENT' | 'ACTIVE' | 'PAUSED' | 'AVAILABLE' | 'LOCKED';
    blockers: string[];
}

export interface StreamingProductSuiteView {
    available: boolean;
    absoluteWeek: number;
    lines: StreamingProductLineView[];
    activeDevelopment: OwnedStreamingProductLine | null;
    activeProductIds: StreamingProductLineId[];
    availableStaff: number;
    committedStaff: number;
    remainingStaff: number;
    weeklyOperatingCost: number;
    peakLoadPercent: number;
    weeklyRevenuePerSubscriber: number;
}

export interface StreamingProductWeeklyEffects {
    acquisitionRateDelta: number;
    churnRateDelta: number;
    engagementRateDelta: number;
    weeklyRevenuePerSubscriber: number;
    weeklyOperatingCost: number;
    peakLoadPercent: number;
    activeProductIds: StreamingProductLineId[];
}

export interface StreamingProductActionResult {
    player: Player;
    changed: boolean;
    reason?: 'NOT_AVAILABLE' | 'NOT_FOUND' | 'CORE_INCLUDED' | 'PROJECT_ACTIVE' | 'PREREQUISITE' | 'STAFF_REQUIRED' | 'INSUFFICIENT_TREASURY' | 'ALREADY_LAUNCHED' | 'SAME_WEEK';
    line?: OwnedStreamingProductLine;
}

const productBenefit = (partial: Partial<OwnedStreamingProductBenefit>): OwnedStreamingProductBenefit => ({
    acquisitionRateDelta: 0,
    churnRateDelta: 0,
    engagementRateDelta: 0,
    weeklyRevenuePerSubscriber: 0,
    productExperienceLevel: 0,
    advertisingCommerceLevel: 0,
    ...partial,
});

export const STREAMING_PRODUCT_DEFINITIONS: StreamingProductDefinition[] = [
    {
        id: 'CORE',
        title: 'EMPIRE+ Core',
        shortTitle: 'Core',
        codename: 'SIGNAL',
        tagline: 'The paid service everything else is built around.',
        description: 'Profiles, search, playback, the canonical catalog and subscription access already operating through the launch stack.',
        audience: 'The full paid audience',
        accent: '#67e8f9',
        baseCapitalCost: 0,
        baseWeeklyOperatingCost: 0,
        baseDevelopmentWeeks: 0,
        staffRequired: 0,
        peakLoadPercent: 0,
        benefit: productBenefit({ productExperienceLevel: 8 }),
        risk: 'LOW',
        riskNote: 'Core operating cost is already represented by the infrastructure stack.',
        strategicConsequence: 'Core remains the subscription and catalog foundation. It cannot be paused independently.',
    },
    {
        id: 'KIDS',
        title: 'EMPIRE+ Kids',
        shortTitle: 'Kids',
        codename: 'GARDEN',
        tagline: 'A safer, calmer world for family viewing.',
        description: 'Child profiles, age-aware discovery, guardian controls and a dedicated family storefront.',
        audience: 'Families and young viewers',
        accent: '#fbbf24',
        baseCapitalCost: 18_000_000,
        baseWeeklyOperatingCost: 260_000,
        baseDevelopmentWeeks: 3,
        staffRequired: 7,
        peakLoadPercent: 6,
        benefit: productBenefit({
            acquisitionRateDelta: 0.001,
            churnRateDelta: -0.0015,
            engagementRateDelta: 0.014,
            productExperienceLevel: 15,
        }),
        risk: 'LOW',
        riskNote: 'Weak safety operations or a thin family catalog will damage household trust.',
        strategicConsequence: 'Improves family retention, but commits the slate to sustained safe programming.',
    },
    {
        id: 'FREE',
        title: 'EMPIRE+ Free',
        shortTitle: 'Free',
        codename: 'OPENWAVE',
        tagline: 'An ad-supported front door into the platform.',
        description: 'A curated free tier with scheduled advertising, controlled catalog windows and a clear path to paid membership.',
        audience: 'Price-sensitive and trial viewers',
        accent: '#4ade80',
        baseCapitalCost: 35_000_000,
        baseWeeklyOperatingCost: 650_000,
        baseDevelopmentWeeks: 4,
        staffRequired: 12,
        peakLoadPercent: 18,
        benefit: productBenefit({
            acquisitionRateDelta: 0.0024,
            churnRateDelta: 0.0006,
            engagementRateDelta: 0.008,
            weeklyRevenuePerSubscriber: 0.14,
            productExperienceLevel: 18,
            advertisingCommerceLevel: 22,
        }),
        risk: 'MODERATE',
        riskNote: 'Ad load, rights restrictions and paid-tier cannibalization need active control.',
        strategicConsequence: 'Widens acquisition and creates advertising revenue, but adds heavy traffic and slight paid churn pressure.',
    },
    {
        id: 'LIVE',
        title: 'EMPIRE+ Live',
        shortTitle: 'Live',
        codename: 'PULSE',
        tagline: 'Turn releases, specials and events into appointments.',
        description: 'Live-event distribution, countdown rooms, synchronized premieres and recovery-aware event playback.',
        audience: 'Event and appointment viewers',
        accent: '#fb7185',
        baseCapitalCost: 60_000_000,
        baseWeeklyOperatingCost: 1_100_000,
        baseDevelopmentWeeks: 5,
        staffRequired: 16,
        peakLoadPercent: 28,
        benefit: productBenefit({
            acquisitionRateDelta: 0.002,
            churnRateDelta: -0.0004,
            engagementRateDelta: 0.018,
            productExperienceLevel: 30,
        }),
        risk: 'HIGH',
        riskNote: 'Live concurrency concentrates demand and turns technical failures into public events.',
        strategicConsequence: 'Creates appointment viewing and launch heat, but produces the largest predictable premiere spikes.',
    },
    {
        id: 'FAN',
        title: 'EMPIRE+ Fan',
        shortTitle: 'Fan',
        codename: 'BACKSTAGE',
        tagline: 'Keep a title alive after the credits.',
        description: 'Fandom hubs, creator notes, franchise timelines, bonus drops and title-linked membership rituals.',
        audience: 'Originals and franchise communities',
        accent: '#c084fc',
        baseCapitalCost: 22_000_000,
        baseWeeklyOperatingCost: 320_000,
        baseDevelopmentWeeks: 3,
        staffRequired: 9,
        peakLoadPercent: 7,
        benefit: productBenefit({
            acquisitionRateDelta: 0.001,
            churnRateDelta: -0.0012,
            engagementRateDelta: 0.015,
            weeklyRevenuePerSubscriber: 0.05,
            productExperienceLevel: 25,
        }),
        risk: 'MODERATE',
        riskNote: 'An empty fandom surface exposes weak franchise depth instead of hiding it.',
        strategicConsequence: 'Deepens loyalty and long-tail engagement, but performs only when Originals earn real communities.',
    },
    {
        id: 'STORE',
        title: 'EMPIRE+ Store',
        shortTitle: 'Store',
        codename: 'MARQUEE',
        tagline: 'Convert cultural heat into owned commerce.',
        description: 'A rights-aware storefront for merchandise, digital extras and product drops connected to canonical titles.',
        audience: 'Collectors and high-intent fans',
        accent: '#fb923c',
        baseCapitalCost: 40_000_000,
        baseWeeklyOperatingCost: 720_000,
        baseDevelopmentWeeks: 4,
        staffRequired: 12,
        peakLoadPercent: 4,
        benefit: productBenefit({
            churnRateDelta: -0.0002,
            weeklyRevenuePerSubscriber: 0.12,
            productExperienceLevel: 28,
            advertisingCommerceLevel: 35,
        }),
        risk: 'MODERATE',
        riskNote: 'Inventory, fulfillment and title-right restrictions can turn attention into cost.',
        strategicConsequence: 'Adds commerce contribution without magical sales; revenue scales only with the real active audience.',
    },
    {
        id: 'INTERACTIVE',
        title: 'EMPIRE+ Interactive',
        shortTitle: 'Interactive',
        codename: 'PORTAL',
        tagline: 'Let the audience enter the story.',
        description: 'Branching experiences, synchronized participation and high-response playback built on the strongest platform stack.',
        audience: 'Highly engaged premium viewers',
        accent: '#818cf8',
        baseCapitalCost: 95_000_000,
        baseWeeklyOperatingCost: 1_600_000,
        baseDevelopmentWeeks: 7,
        staffRequired: 22,
        peakLoadPercent: 30,
        benefit: productBenefit({
            acquisitionRateDelta: 0.0015,
            churnRateDelta: -0.001,
            engagementRateDelta: 0.025,
            weeklyRevenuePerSubscriber: 0.08,
            productExperienceLevel: 50,
        }),
        risk: 'HIGH',
        riskNote: 'Complex playback states, device variance and synchronized demand create frontier product risk.',
        strategicConsequence: 'Creates the deepest engagement layer, but requires Live, Fan and a global-grade technical foundation.',
    },
];

const LAUNCH_MODE_RULES: Record<StreamingProductLaunchMode, {
    costMultiplier: number;
    weekMultiplier: number;
    weeklyCostMultiplier: number;
    loadMultiplier: number;
    riskShift: number;
    note: string;
}> = {
    VALIDATED: {
        costMultiplier: 1.16,
        weekMultiplier: 1.3,
        weeklyCostMultiplier: 1,
        loadMultiplier: 0.92,
        riskShift: -1,
        note: 'Validated delivery adds testing and lowers opening load volatility.',
    },
    BALANCED: {
        costMultiplier: 1,
        weekMultiplier: 1,
        weeklyCostMultiplier: 1,
        loadMultiplier: 1,
        riskShift: 0,
        note: 'Balanced delivery keeps the designed cost, schedule and operating profile.',
    },
    FIRST_TO_MARKET: {
        costMultiplier: 1.08,
        weekMultiplier: 0.65,
        weeklyCostMultiplier: 1.05,
        loadMultiplier: 1.15,
        riskShift: 1,
        note: 'First-to-market delivery compresses product validation and raises opening load.',
    },
};

const RISK_ORDER: StreamingProductRisk[] = ['LOW', 'MODERATE', 'HIGH'];
const roundMoney = (value: number): number => Math.max(0, Math.round(value / 50_000) * 50_000);

export const previewStreamingProductLaunch = (
    definition: StreamingProductDefinition,
    launchMode: StreamingProductLaunchMode,
): StreamingProductLaunchPreview => {
    const rules = LAUNCH_MODE_RULES[launchMode];
    const riskIndex = Math.max(0, Math.min(
        RISK_ORDER.length - 1,
        RISK_ORDER.indexOf(definition.risk) + rules.riskShift,
    ));
    return {
        definition,
        launchMode,
        capitalCost: roundMoney(definition.baseCapitalCost * rules.costMultiplier),
        weeklyOperatingCost: roundMoney(definition.baseWeeklyOperatingCost * rules.weeklyCostMultiplier),
        developmentWeeks: Math.max(1, Math.ceil(definition.baseDevelopmentWeeks * rules.weekMultiplier)),
        staffRequired: definition.staffRequired,
        peakLoadPercent: Math.round(definition.peakLoadPercent * rules.loadMultiplier * 10) / 10,
        risk: RISK_ORDER[riskIndex],
        riskNote: `${definition.riskNote} ${rules.note}`,
    };
};

const activeRecord = (
    platform: OwnedStreamingPlatformState,
    lineId: StreamingProductLineId,
): OwnedStreamingProductLine | null => (
    lineId === 'CORE'
        ? null
        : platform.productLines.find(line => line.lineId === lineId && line.status === 'ACTIVE') || null
);

export const getStreamingProductStaffCapacity = (platform: OwnedStreamingPlatformState): number => (
    8
    + Math.max(0, platform.infrastructureSetup?.staffRequired || 0) * 3
    + Math.floor(platform.technologyLevels.CONTENT_OPERATIONS / 2)
    + Math.floor(platform.technologyLevels.PRODUCT_EXPERIENCE / 3)
);

const countFamilyTitles = (player: Player): number => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const familyGenres = new Set(['ANIMATION', 'ADVENTURE', 'FANTASY', 'COMEDY']);
    const catalogCount = platform.catalogProjectIds.filter(projectId => {
        const resolved = resolveStreamingCatalogTitle(player, projectId);
        return resolved ? familyGenres.has(String(resolved.genre).toUpperCase()) : false;
    }).length;
    const originalCount = platform.originalCommissions.filter(commission => (
        commission.strategy === 'KIDS_EVERGREEN'
        || familyGenres.has(String(commission.genre).toUpperCase())
    )).length;
    return new Set([
        ...platform.catalogProjectIds.filter(projectId => {
            const resolved = resolveStreamingCatalogTitle(player, projectId);
            return resolved ? familyGenres.has(String(resolved.genre).toUpperCase()) : false;
        }),
        ...platform.originalCommissions
            .filter(commission => commission.strategy === 'KIDS_EVERGREEN' || familyGenres.has(String(commission.genre).toUpperCase()))
            .map(commission => commission.canonicalProjectId || commission.id),
    ]).size || catalogCount + originalCount;
};

const countReleasedOriginals = (player: Player): number => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    return platform.originalCommissions.filter(commission => (
        getStreamingOriginalLiveStatus(player, commission) === 'RELEASED'
    )).length;
};

const getProductBlockers = (
    player: Player,
    definition: StreamingProductDefinition,
    availableStaff: number,
    committedStaff: number,
): string[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const blockers: string[] = [];
    const technology = platform.technologyLevels;
    const active = (id: StreamingProductLineId): boolean => id === 'CORE' || Boolean(activeRecord(platform, id));
    if (definition.id === 'KIDS') {
        const researchDefinition = findStreamingResearchDefinitionForProduct('KIDS');
        const researchProgram = researchDefinition
            ? platform.researchPrograms.find(program => program.definitionId === researchDefinition.id)
            : null;
        if (!researchProgram || !['READY_TO_INSTALL', 'INSTALLING', 'OPERATING'].includes(researchProgram.stage)) {
            blockers.push('Kids Mode research and IP clearance required');
        }
        if (technology.SECURITY < 10) blockers.push('Security Level 10 required');
        if (technology.CONTENT_OPERATIONS < 10) blockers.push('Content Operations Level 10 required');
        if (platform.catalogProjectIds.length < 3) blockers.push('At least 3 catalog titles required');
        if (countFamilyTitles(player) < 1) blockers.push('At least 1 family-ready title required');
    }
    if (definition.id === 'FREE') {
        if (technology.DELIVERY_CAPACITY < 20) blockers.push('Delivery Capacity Level 20 required');
        if (technology.DATA_RECOMMENDATIONS < 10) blockers.push('Audience Intelligence Level 10 required');
        if (platform.capacity.baselineConcurrentStreams < 1_000_000) blockers.push('1M normal concurrent streams required');
        if (platform.catalogProjectIds.length < 6) blockers.push('At least 6 catalog titles required');
    }
    if (definition.id === 'LIVE') {
        if (technology.DELIVERY_CAPACITY < 30) blockers.push('Delivery Capacity Level 30 required');
        if (technology.RELIABILITY < 25) blockers.push('Reliability Level 25 required');
        if (technology.CONTENT_OPERATIONS < 22) blockers.push('Content Operations Level 22 required');
        if (platform.capacity.burstConcurrentStreams < 6_000_000) blockers.push('6M burst streams required');
    }
    if (definition.id === 'FAN') {
        if (technology.DATA_RECOMMENDATIONS < 10) blockers.push('Audience Intelligence Level 10 required');
        if (technology.SECURITY < 10) blockers.push('Security Level 10 required');
        if (countReleasedOriginals(player) < 1) blockers.push('At least 1 released Original required');
    }
    if (definition.id === 'STORE') {
        if (technology.SECURITY < 25) blockers.push('Security Level 25 required');
        if (technology.ADVERTISING_COMMERCE < 20 && !active('FREE')) blockers.push('EMPIRE+ Free or Commerce Level 20 required');
        if (!active('FAN') && !active('FREE')) blockers.push('Fan or Free audience surface required');
    }
    if (definition.id === 'INTERACTIVE') {
        if (technology.PLAYBACK_QUALITY < 45) blockers.push('Playback Quality Level 45 required');
        if (technology.RELIABILITY < 30) blockers.push('Reliability Level 30 required');
        if (technology.DATA_RECOMMENDATIONS < 24) blockers.push('Audience Intelligence Level 24 required');
        if (platform.capacity.burstConcurrentStreams < 10_000_000) blockers.push('10M burst streams required');
        if (!active('LIVE')) blockers.push('EMPIRE+ Live required');
        if (!active('FAN')) blockers.push('EMPIRE+ Fan required');
    }
    if (definition.id !== 'CORE' && committedStaff + definition.staffRequired > availableStaff) {
        blockers.push(`${definition.staffRequired} available product staff required`);
    }
    return blockers;
};

export const getStreamingProductWeeklyEffects = (
    platform: OwnedStreamingPlatformState,
): StreamingProductWeeklyEffects => {
    const isOperational = platform.lifecycle === 'ACTIVE' && Boolean(platform.infrastructureSetup);
    const activeLines = isOperational
        ? platform.productLines.filter(line => line.status === 'ACTIVE')
        : [];
    return {
        acquisitionRateDelta: activeLines.reduce((sum, line) => sum + line.benefit.acquisitionRateDelta, 0),
        churnRateDelta: activeLines.reduce((sum, line) => sum + line.benefit.churnRateDelta, 0),
        engagementRateDelta: activeLines.reduce((sum, line) => sum + line.benefit.engagementRateDelta, 0),
        weeklyRevenuePerSubscriber: activeLines.reduce((sum, line) => sum + line.benefit.weeklyRevenuePerSubscriber, 0),
        weeklyOperatingCost: activeLines.reduce((sum, line) => sum + line.weeklyOperatingCost, 0),
        peakLoadPercent: activeLines.reduce((sum, line) => sum + line.peakLoadPercent, 0),
        activeProductIds: isOperational ? ['CORE', ...activeLines.map(line => line.lineId)] : [],
    };
};

export const getStreamingProductSuite = (player: Player): StreamingProductSuiteView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const available = Boolean(platform.lifecycle === 'ACTIVE' && platform.infrastructureSetup);
    const activeDevelopment = platform.productLines.find(line => line.status === 'UNDER_DEVELOPMENT') || null;
    const availableStaff = getStreamingProductStaffCapacity(platform);
    const committedStaff = platform.productLines
        .filter(line => line.status === 'ACTIVE' || line.status === 'UNDER_DEVELOPMENT')
        .reduce((sum, line) => sum + line.staffRequired, 0);
    const effects = getStreamingProductWeeklyEffects(platform);
    const lines = STREAMING_PRODUCT_DEFINITIONS.map(definition => {
        if (definition.id === 'CORE') {
            return {
                definition,
                record: null,
                status: available ? 'CORE_ACTIVE' as const : 'LOCKED' as const,
                blockers: available ? [] : ['Launch the core platform first'],
            };
        }
        const record = platform.productLines.find(line => line.lineId === definition.id) || null;
        const blockers = getProductBlockers(player, definition, availableStaff, committedStaff);
        const status: StreamingProductLineView['status'] = record?.status === 'UNDER_DEVELOPMENT'
            ? 'UNDER_DEVELOPMENT'
            : record?.status === 'ACTIVE'
                ? 'ACTIVE'
                : record?.status === 'PAUSED'
                    ? 'PAUSED'
                    : blockers.length || Boolean(activeDevelopment)
                        ? 'LOCKED'
                        : 'AVAILABLE';
        return { definition, record, status, blockers };
    });
    return {
        available,
        absoluteWeek,
        lines,
        activeDevelopment,
        activeProductIds: effects.activeProductIds,
        availableStaff,
        committedStaff,
        remainingStaff: Math.max(0, availableStaff - committedStaff),
        weeklyOperatingCost: effects.weeklyOperatingCost,
        peakLoadPercent: effects.peakLoadPercent,
        weeklyRevenuePerSubscriber: effects.weeklyRevenuePerSubscriber,
    };
};

export const startStreamingProductDevelopment = (
    player: Player,
    lineId: StreamingProductLineId,
    launchMode: StreamingProductLaunchMode,
): StreamingProductActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const suite = getStreamingProductSuite(player);
    if (!suite.available) return { player, changed: false, reason: 'NOT_AVAILABLE' };
    if (lineId === 'CORE') return { player, changed: false, reason: 'CORE_INCLUDED' };
    if (suite.activeDevelopment) return { player, changed: false, reason: 'PROJECT_ACTIVE' };
    const definition = STREAMING_PRODUCT_DEFINITIONS.find(item => item.id === lineId);
    if (!definition) return { player, changed: false, reason: 'NOT_FOUND' };
    if (platform.productLines.some(line => line.lineId === lineId)) {
        return { player, changed: false, reason: 'ALREADY_LAUNCHED' };
    }
    const view = suite.lines.find(line => line.definition.id === lineId);
    if (!view || view.status !== 'AVAILABLE') {
        return {
            player,
            changed: false,
            reason: view?.blockers.some(blocker => blocker.includes('staff')) ? 'STAFF_REQUIRED' : 'PREREQUISITE',
        };
    }
    const preview = previewStreamingProductLaunch(definition, launchMode);
    if (platform.treasuryCash < preview.capitalCost) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY' };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `product-line:${lineId}`;
    const line: OwnedStreamingProductLine = {
        id: createDeterministicId('streaming_product', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        lineId,
        title: definition.title,
        status: 'UNDER_DEVELOPMENT',
        launchMode,
        capitalCost: preview.capitalCost,
        weeklyOperatingCost: preview.weeklyOperatingCost,
        staffRequired: preview.staffRequired,
        peakLoadPercent: preview.peakLoadPercent,
        developmentWeeks: preview.developmentWeeks,
        benefit: { ...definition.benefit },
        risk: preview.risk,
        riskNote: preview.riskNote,
        strategicConsequence: definition.strategicConsequence,
        startedAtAbsoluteWeek: absoluteWeek,
        readyAtAbsoluteWeek: absoluteWeek + preview.developmentWeeks,
        launchedAtAbsoluteWeek: null,
        lastStatusChangedAtAbsoluteWeek: absoluteWeek,
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, `${idempotencyKey}:started`),
        idempotencyKey: `${idempotencyKey}:started`,
        absoluteWeek,
        type: 'PRODUCT_DEVELOPMENT_STARTED',
        summary: `${definition.title} entered product development in ${launchMode.toLowerCase().replaceAll('_', ' ')} mode.`,
        source: 'PLAYER_ACTION',
        metadata: {
            lineId,
            capitalCost: preview.capitalCost,
            readyAtAbsoluteWeek: line.readyAtAbsoluteWeek,
            staffRequired: line.staffRequired,
            peakLoadPercent: line.peakLoadPercent,
        },
    };
    const platformWithInstallation = markStreamingResearchInstallationStarted(
        {
            ...platform,
            treasuryCash: platform.treasuryCash - preview.capitalCost,
            productLines: [...platform.productLines, line],
            eventLedger: [...platform.eventLedger, ledger],
        },
        'PRODUCT_LINE',
        lineId,
        `${definition.title} · Product Lab`,
        line.readyAtAbsoluteWeek,
    );
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(platformWithInstallation, player.id),
        },
        changed: true,
        line,
    };
};

export const completeDueStreamingProductDevelopments = (
    platformValue: OwnedStreamingPlatformState,
    absoluteWeek: number,
): {
    platform: OwnedStreamingPlatformState;
    launchedLines: OwnedStreamingProductLine[];
    ledgerEntries: OwnedStreamingLedgerEntry[];
} => {
    let platform = platformValue;
    const launchedLines: OwnedStreamingProductLine[] = [];
    const ledgerEntries: OwnedStreamingLedgerEntry[] = [];
    const productLines = platform.productLines.map(line => {
        if (line.status !== 'UNDER_DEVELOPMENT' || absoluteWeek < line.readyAtAbsoluteWeek) return line;
        const launched: OwnedStreamingProductLine = {
            ...line,
            status: 'ACTIVE',
            launchedAtAbsoluteWeek: absoluteWeek,
            lastStatusChangedAtAbsoluteWeek: absoluteWeek,
        };
        launchedLines.push(launched);
        const key = `${line.idempotencyKey}:launched`;
        if (!platform.eventLedger.some(entry => entry.idempotencyKey === key)) {
            ledgerEntries.push({
                id: createDeterministicId('streaming_event', platform.simulationSeed, key),
                idempotencyKey: key,
                absoluteWeek,
                type: 'PRODUCT_LAUNCHED',
                summary: `${line.title} entered public operation.`,
                source: 'WEEK_PROCESSOR',
                metadata: {
                    lineId: line.lineId,
                    weeklyOperatingCost: line.weeklyOperatingCost,
                    peakLoadPercent: line.peakLoadPercent,
                },
            });
        }
        return launched;
    });
    if (!launchedLines.length) return { platform, launchedLines, ledgerEntries };
    const technologyLevels = { ...platform.technologyLevels };
    launchedLines.forEach(line => {
        technologyLevels.PRODUCT_EXPERIENCE = Math.max(
            technologyLevels.PRODUCT_EXPERIENCE,
            line.benefit.productExperienceLevel,
        );
        technologyLevels.ADVERTISING_COMMERCE = Math.max(
            technologyLevels.ADVERTISING_COMMERCE,
            line.benefit.advertisingCommerceLevel,
        );
    });
    platform = {
        ...platform,
        productLines,
        technologyLevels,
        milestoneKeys: Array.from(new Set([
            ...platform.milestoneKeys,
            'product-lab-operational',
            ...launchedLines.map(line => `product-line:${line.lineId.toLowerCase()}`),
        ])),
    };
    launchedLines.forEach(line => {
        platform = markStreamingResearchInstallationOperating(platform, 'PRODUCT_LINE', line.lineId, absoluteWeek);
    });
    return { platform, launchedLines, ledgerEntries };
};

export const setStreamingProductLinePaused = (
    player: Player,
    lineId: Exclude<StreamingProductLineId, 'CORE'>,
    paused: boolean,
): StreamingProductActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const line = platform.productLines.find(item => item.lineId === lineId);
    if (!line || line.status === 'UNDER_DEVELOPMENT') return { player, changed: false, reason: 'NOT_FOUND' };
    const targetStatus = paused ? 'PAUSED' : 'ACTIVE';
    if (line.status === targetStatus) return { player, changed: false, reason: 'ALREADY_LAUNCHED' };
    if (line.lastStatusChangedAtAbsoluteWeek === absoluteWeek) return { player, changed: false, reason: 'SAME_WEEK' };
    if (!paused) {
        const suite = getStreamingProductSuite(player);
        if (suite.committedStaff + line.staffRequired > suite.availableStaff) {
            return { player, changed: false, reason: 'STAFF_REQUIRED' };
        }
    }
    const changedLine: OwnedStreamingProductLine = {
        ...line,
        status: targetStatus,
        lastStatusChangedAtAbsoluteWeek: absoluteWeek,
    };
    const idempotencyKey = `${line.idempotencyKey}:status:${absoluteWeek}:${targetStatus}`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'PRODUCT_STATUS_CHANGED',
        summary: `${line.title} was ${paused ? 'paused' : 'returned to public operation'}.`,
        source: 'PLAYER_ACTION',
        metadata: { lineId, status: targetStatus },
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                productLines: platform.productLines.map(item => item.id === line.id ? changedLine : item),
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
        line: changedLine,
    };
};
