import type {
    OwnedStreamingHqOnboardingState,
    Player,
    StreamingHqSection,
} from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { STREAMING_BRAND_PROMISES } from './streamingFounding';
import { STREAMING_EXECUTIVE_CANDIDATES } from './streamingCompany';
import {
    STREAMING_CAPACITY_PACKAGES,
    STREAMING_INFRASTRUCTURE_STRATEGIES,
} from './streamingInfrastructure';
import { resolveOwnedStreamingReach } from './streamingProgression';

export const STREAMING_HQ_SECTIONS: Array<{
    id: StreamingHqSection;
    label: string;
    title: string;
}> = [
    { id: 'HOME', label: 'Home', title: 'Command Centre' },
    { id: 'CONTENT', label: 'Content', title: 'Content Room' },
    { id: 'TECH', label: 'Tech', title: 'Technology Campus' },
    { id: 'MARKET', label: 'Market', title: 'Market Room' },
    { id: 'COMPANY', label: 'Company', title: 'Company Office' },
];

export const STREAMING_HQ_TOUR_STEPS: Array<{
    section: StreamingHqSection;
    kicker: string;
    title: string;
    description: string;
    focus: string;
}> = [
    {
        section: 'HOME',
        kicker: 'TOUR 1 OF 5',
        title: 'This is your command centre.',
        description: 'Start here for launch priorities, platform signals and the next decision that matters.',
        focus: 'Home explains the state of the business without making you hunt through every screen.',
    },
    {
        section: 'CONTENT',
        kicker: 'TOUR 2 OF 5',
        title: 'Every title earns a job.',
        description: 'Catalog, Originals and the future launch slate live in Content.',
        focus: 'Until rights are licensed, this room shows a truthful pre-launch state instead of fake performance.',
    },
    {
        section: 'TECH',
        kicker: 'TOUR 3 OF 5',
        title: 'Capacity is a business decision.',
        description: 'Servers, reliability, playback and product infrastructure will be configured here.',
        focus: 'Your founding philosophy is visible now; real purchases arrive in Phase 5.',
    },
    {
        section: 'MARKET',
        kicker: 'TOUR 4 OF 5',
        title: 'Know the audience before the fight.',
        description: 'Launch reach, positioning, competitors and regional signals belong in Market.',
        focus: 'Market share remains unavailable until the service is live and real results exist.',
    },
    {
        section: 'COMPANY',
        kicker: 'TOUR 5 OF 5',
        title: 'Control lives here.',
        description: 'Ownership, treasury, founding leadership and permanent records sit in Company.',
        focus: 'You remain CEO until you deliberately appoint someone else in a later phase.',
    },
];

export interface StreamingHqChecklistItem {
    id: 'INCORPORATED' | 'INFRASTRUCTURE' | 'CATALOG' | 'ORIGINAL' | 'SLATE' | 'LAUNCH_READY';
    title: string;
    description: string;
    complete: boolean;
    destination: StreamingHqSection;
    phase: number;
}

export interface StreamingHqSnapshot {
    platformName: string;
    statusLabel: 'PRE-LAUNCH' | 'LIVE' | 'SUSPENDED';
    treasuryCash: number;
    openingTreasuryCash: number;
    incorporationCost: number;
    setupCostsConsumed: number;
    founderOwnershipPercent: number;
    debtPrincipal: number;
    reachLevel: 0 | 1 | 2 | 3 | 4;
    reachLabel: string;
    reachDescription: string;
    reachLimitingFactors: string[];
    capitalModelLabel: string;
    currentCeoLabel: string;
    capitalActionCount: number;
    brandPromiseLabel: string;
    brandPromiseDescription: string;
    infrastructureLabel: string;
    infrastructureConfigured: boolean;
    capacityLabel: string;
    burstCapacityLabel: string;
    storageLabel: string;
    reliabilityLabel: string;
    infrastructureWeeklyCost: number | null;
    infrastructureDeploymentLabel: string;
    loadTestStatus: 'PASS' | 'CONDITIONAL' | 'FAIL' | null;
    technologyReadiness: number;
    catalogCount: number;
    subscriberLabel: string;
    marketShareLabel: string;
    executiveCount: number;
    leadershipWeeklyCost: number;
    executives: Array<{
        id: string;
        name: string;
        role: string;
        initials: string;
        specialty: string;
    }>;
    checklist: StreamingHqChecklistItem[];
    completedChecklistItems: number;
}

export const getStreamingHqSnapshot = (player: Player): StreamingHqSnapshot => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const identity = platform.identity;
    const founding = platform.foundingProfile;
    const brandPromise = STREAMING_BRAND_PROMISES.find(item => item.id === identity?.brandPromiseId);
    const infrastructureSetup = platform.infrastructureSetup;
    const reach = resolveOwnedStreamingReach(platform);
    const infrastructurePackage = STREAMING_CAPACITY_PACKAGES.find(
        item => item.id === infrastructureSetup?.capacityPackageId,
    );
    const infrastructureStrategy = STREAMING_INFRASTRUCTURE_STRATEGIES.find(
        item => item.id === platform.infrastructureStrategy,
    );
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const technologyValues = Object.values(platform.technologyLevels);
    const latestMarketShare = platform.competitiveWorld.marketShareHistory.at(-1);
    const playerMarketShare = latestMarketShare?.entries.find(item => item.id === 'PLAYER')?.sharePercent;
    const activeAppointments = platform.leadership.appointments.filter(item => item.status === 'ACTIVE');
    const executives = activeAppointments.map(appointment => {
        const candidate = STREAMING_EXECUTIVE_CANDIDATES.find(item => item.id === appointment.executiveId);
        const name = appointment.nameAtAppointment;
        return {
            id: appointment.id,
            name,
            role: candidate?.roleLabel || appointment.role.replaceAll('_', ' '),
            initials: candidate?.initials || name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(),
            specialty: candidate?.specialty || 'Company leadership',
        };
    });
    const currentCeoAppointment = platform.leadership.currentCeo.holderType === 'EXECUTIVE'
        ? activeAppointments.find(item => item.executiveId === platform.leadership.currentCeo.executiveId)
        : null;
    const infrastructureConfigured = Boolean(infrastructureSetup);
    const checklist: StreamingHqChecklistItem[] = [
        {
            id: 'INCORPORATED',
            title: 'Company incorporated',
            description: identity && founding ? `${identity.name} is legally founded and funded.` : 'Finish company incorporation.',
            complete: Boolean(identity && founding),
            destination: 'COMPANY',
            phase: 3,
        },
        {
            id: 'INFRASTRUCTURE',
            title: 'Configure infrastructure and plans',
            description: 'Set starting capacity, reliability and subscription tiers.',
            complete: infrastructureConfigured,
            destination: 'TECH',
            phase: 5,
        },
        {
            id: 'CATALOG',
            title: 'Secure the starter catalog',
            description: 'Import eligible owned titles and sign the first license.',
            complete: Boolean(platform.starterCatalog)
                && platform.milestoneKeys.includes('starter-catalog-established')
                && platform.catalogLicenses.length > 0,
            destination: 'CONTENT',
            phase: 6,
        },
        {
            id: 'ORIGINAL',
            title: 'Greenlight the first Original',
            description: 'Find an audience gap and commission the platform’s opening statement.',
            complete: platform.milestoneKeys.includes('first-original-greenlit'),
            destination: 'CONTENT',
            phase: 7,
        },
        {
            id: 'SLATE',
            title: 'Program the twelve-week slate',
            description: 'Balance premieres, retention titles and marketing beats.',
            complete: platform.milestoneKeys.includes('launch-slate-programmed'),
            destination: 'CONTENT',
            phase: 7,
        },
        {
            id: 'LAUNCH_READY',
            title: 'Clear final launch readiness',
            description: 'Resolve capacity, content and demand risks before going live.',
            complete: platform.milestoneKeys.includes('platform-launch-ready'),
            destination: 'HOME',
            phase: 8,
        },
    ];

    return {
        platformName: identity?.name || 'EMPIRE+',
        statusLabel: platform.lifecycle === 'ACTIVE'
            ? 'LIVE'
            : platform.lifecycle === 'SUSPENDED'
                ? 'SUSPENDED'
                : 'PRE-LAUNCH',
        treasuryCash: platform.treasuryCash,
        openingTreasuryCash: founding?.openingTreasuryCash || 0,
        incorporationCost: founding?.founderCashCharged || 0,
        setupCostsConsumed: founding?.setupCostsConsumed || 0,
        founderOwnershipPercent: platform.founderOwnershipPercent,
        debtPrincipal: platform.debtPrincipal,
        reachLevel: reach.level,
        reachLabel: `Level ${reach.level} • ${reach.label}`,
        reachDescription: reach.description,
        reachLimitingFactors: reach.limitingFactors,
        capitalModelLabel: founding?.incorporationModel === 'FIXED_V7'
            ? 'Founder-owned incorporation'
            : 'Legacy incorporation record',
        currentCeoLabel: currentCeoAppointment?.nameAtAppointment || player.name,
        capitalActionCount: platform.finance.capitalActions.length,
        brandPromiseLabel: brandPromise?.title || 'Brand promise pending',
        brandPromiseDescription: brandPromise?.description || 'Complete the founding identity.',
        infrastructureLabel: infrastructureSetup
            ? `${infrastructurePackage?.title || 'Delivery stack'} • ${infrastructureStrategy?.title || 'Configured network'}`
            : 'Level 0 foundation',
        infrastructureConfigured,
        capacityLabel: infrastructureConfigured
            ? `${platform.capacity.baselineConcurrentStreams.toLocaleString()} concurrent streams`
            : 'Not configured',
        burstCapacityLabel: infrastructureConfigured
            ? `${platform.capacity.burstConcurrentStreams.toLocaleString()} concurrent streams`
            : 'Not configured',
        storageLabel: infrastructureSetup
            ? `${infrastructureSetup.storageCapacityHours.toLocaleString()} viewing hours`
            : 'Not configured',
        reliabilityLabel: infrastructureSetup
            ? `${infrastructureSetup.reliabilityTarget}% target`
            : 'Not configured',
        infrastructureWeeklyCost: infrastructureSetup?.weeklyOperatingCost ?? null,
        infrastructureDeploymentLabel: infrastructureSetup
            ? absoluteWeek >= infrastructureSetup.readyAtAbsoluteWeek
                ? 'Operationally ready'
                : `Ready in ${infrastructureSetup.readyAtAbsoluteWeek - absoluteWeek} game week${infrastructureSetup.readyAtAbsoluteWeek - absoluteWeek === 1 ? '' : 's'}`
            : 'Setup not approved',
        loadTestStatus: infrastructureSetup?.loadTest.status ?? null,
        technologyReadiness: Math.round(
            technologyValues.reduce((sum, value) => sum + value, 0) / Math.max(1, technologyValues.length),
        ),
        catalogCount: platform.catalogProjectIds.length,
        subscriberLabel: platform.lifecycle === 'ACTIVE'
            ? platform.metrics.subscribers.toLocaleString()
            : 'First report after launch',
        marketShareLabel: platform.lifecycle === 'ACTIVE'
            ? playerMarketShare === undefined
                ? 'First market model pending'
                : `${playerMarketShare.toFixed(2)}% modeled global`
            : 'Available after launch',
        executiveCount: executives.length,
        leadershipWeeklyCost: activeAppointments.reduce(
            (sum, appointment) => sum + appointment.weeklyCompensation,
            0,
        ),
        executives,
        checklist,
        completedChecklistItems: checklist.filter(item => item.complete).length,
    };
};

const updateHqOnboarding = (
    player: Player,
    update: (state: OwnedStreamingHqOnboardingState, absoluteWeek: number) => OwnedStreamingHqOnboardingState,
): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.identity || !platform.foundingProfile || !['FOUNDING', 'ACTIVE', 'SUSPENDED'].includes(platform.lifecycle)) {
        return player;
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            hqOnboarding: update(platform.hqOnboarding, absoluteWeek),
        }, player.id),
    };
};

export const beginStreamingHqTour = (player: Player): Player => updateHqOnboarding(
    player,
    (state, absoluteWeek) => ({
        status: 'IN_PROGRESS',
        currentStep: 0,
        visitedSections: state.visitedSections.includes('HOME')
            ? state.visitedSections
            : [...state.visitedSections, 'HOME'],
        startedAtAbsoluteWeek: state.startedAtAbsoluteWeek ?? absoluteWeek,
        completedAtAbsoluteWeek: null,
    }),
);

export const visitStreamingHqSection = (
    player: Player,
    section: StreamingHqSection,
): Player => updateHqOnboarding(player, (state) => {
    const sectionIndex = STREAMING_HQ_TOUR_STEPS.findIndex(step => step.section === section);
    return {
        ...state,
        currentStep: state.status === 'IN_PROGRESS' && sectionIndex >= 0 ? sectionIndex : state.currentStep,
        visitedSections: state.visitedSections.includes(section)
            ? state.visitedSections
            : [...state.visitedSections, section],
    };
});

export const advanceStreamingHqTour = (player: Player): Player => updateHqOnboarding(
    player,
    (state, absoluteWeek) => {
        if (state.status !== 'IN_PROGRESS') return state;
        const nextStep = state.currentStep + 1;
        if (nextStep >= STREAMING_HQ_TOUR_STEPS.length) {
            return {
                ...state,
                status: 'COMPLETED',
                currentStep: STREAMING_HQ_TOUR_STEPS.length - 1,
                visitedSections: STREAMING_HQ_SECTIONS.map(section => section.id),
                completedAtAbsoluteWeek: absoluteWeek,
            };
        }
        const nextSection = STREAMING_HQ_TOUR_STEPS[nextStep].section;
        return {
            ...state,
            currentStep: nextStep,
            visitedSections: state.visitedSections.includes(nextSection)
                ? state.visitedSections
                : [...state.visitedSections, nextSection],
        };
    },
);

export const skipStreamingHqTour = (player: Player): Player => updateHqOnboarding(
    player,
    (state, absoluteWeek) => ({
        ...state,
        status: 'SKIPPED',
        startedAtAbsoluteWeek: state.startedAtAbsoluteWeek ?? absoluteWeek,
        completedAtAbsoluteWeek: null,
    }),
);

export const replayStreamingHqTour = (player: Player): Player => updateHqOnboarding(
    player,
    (_state, absoluteWeek) => ({
        status: 'IN_PROGRESS',
        currentStep: 0,
        visitedSections: ['HOME'],
        startedAtAbsoluteWeek: absoluteWeek,
        completedAtAbsoluteWeek: null,
    }),
);
