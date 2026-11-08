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
import { getStreamingLaunchProgramView } from './streamingLaunchProgram';

export const STREAMING_HQ_SECTIONS: Array<{
    id: StreamingHqSection;
    label: string;
    title: string;
}> = [
    /* the rooms by the names the headquarters shows (Audience and Boardroom replaced Market and Company) */
    { id: 'HOME', label: 'Headquarters', title: 'Headquarters' },
    { id: 'CONTENT', label: 'Content', title: 'Content' },
    { id: 'TECH', label: 'Platform', title: 'Platform' },
    { id: 'MARKET', label: 'Audience', title: 'Audience' },
    { id: 'COMPANY', label: 'Boardroom', title: 'Boardroom' },
];

/* ============================================================================
   THE STREAMING HALL TOUR
   ----------------------------------------------------------------------------
   Zeesh, 2026-11-08: the old tour walked five rooms (Home, Content, Platform,
   Market, Company) that the cinematic desks replaced, and its coach card was
   never mounted after the transplant, so "Take the tour" showed nothing and left
   the tour stuck IN_PROGRESS. The tour now stays on the headquarters and points
   at what is really there: readiness, the treasury, the two commands (or the
   Slate once live), the four rooms, then a close. Each step speaks to the state
   the company is in: pre-launch, the opening build, or live.
   ========================================================================== */

/** What the tour's spotlight lands on: the Command Deck marks each with data-hq-tour. */
export type StreamingHqTourAnchor = 'readiness' | 'treasury' | 'commands' | 'slate' | 'operations' | 'rooms';
export type StreamingHqTourMode = 'prelaunch' | 'building' | 'live';

export interface StreamingHqTourCopy {
    anchor: StreamingHqTourAnchor | null;
    title: string;
    description: string;
    focus: string;
}

export interface StreamingHqTourStep {
    /** every step lives on the headquarters; kept so saves and the section logic stay compatible */
    section: StreamingHqSection;
    id: 'READINESS' | 'TREASURY' | 'COMMANDS' | 'ROOMS' | 'FINISH';
    prelaunch: StreamingHqTourCopy;
    building?: Partial<StreamingHqTourCopy>;
    live: StreamingHqTourCopy;
}

const TOUR_REPLAY_NOTE = 'Replay this tour any time from the ? at the top.';

export const STREAMING_HQ_TOUR_STEPS: StreamingHqTourStep[] = [
    {
        section: 'HOME',
        id: 'READINESS',
        prelaunch: {
            anchor: 'readiness',
            title: 'Your road to opening night.',
            description: 'Launch readiness counts the checks your service must clear before it can go live. Every one you finish fills this number.',
            focus: 'Clear every check and opening night unlocks.',
        },
        building: {
            title: 'Your network is going up.',
            description: 'Cities online counts the places your network already reaches. The crews keep building every week until opening night.',
            focus: 'What you approved stays locked until you launch.',
        },
        live: {
            anchor: 'readiness',
            title: 'Your audience, every week.',
            description: 'Subscribers, and how many joined or left this week. Almost every decision you make moves this number.',
            focus: 'It updates when each week closes.',
        },
    },
    {
        section: 'HOME',
        id: 'TREASURY',
        prelaunch: {
            anchor: 'treasury',
            title: 'The treasury starts empty.',
            description: 'Incorporation paid for the company, not for running it. Tap Treasury to move your own money in or raise from investors.',
            focus: 'No money moves until you choose.',
        },
        live: {
            anchor: 'treasury',
            title: "The company's money.",
            description: 'What the service earns lands here every week, and every cost leaves from here. Tap Treasury to put money in or raise.',
            focus: 'Studio Finance shows where every dollar went.',
        },
    },
    {
        section: 'HOME',
        id: 'COMMANDS',
        prelaunch: {
            anchor: 'commands',
            title: 'Two commands get you live.',
            description: 'Define the Launch picks your markets, plans and prices. Build the Platform sets up the network and the app. Each row shows its next step.',
            focus: 'Once both are approved, this spot counts down the build.',
        },
        building: {
            title: 'The build card.',
            description: 'It shows what is being built, the weeks left, and when the build needs a decision from you.',
            focus: 'Tap it to open the build.',
        },
        live: {
            anchor: 'slate',
            title: 'Your slate.',
            description: 'Commission Originals and follow every title on its way to the service.',
            focus: 'What is already streaming sits just below, in On the Service.',
        },
    },
    {
        section: 'HOME',
        id: 'ROOMS',
        prelaunch: {
            anchor: 'rooms',
            title: 'Four rooms run the company.',
            description: 'Audience, Content, Platform and Boardroom each own one part of the opening. A lit dot means a room needs you.',
            focus: 'Tap a room, or one of its chips, to go straight in.',
        },
        live: {
            anchor: 'rooms',
            title: 'Four rooms run the company.',
            description: 'Audience, Content, Platform and Boardroom. A lit dot means a room needs you; See it as they do, just above, opens the app your viewers use.',
            focus: 'Tap a room, or one of its chips, to go straight in.',
        },
    },
    {
        section: 'HOME',
        id: 'FINISH',
        prelaunch: {
            anchor: null,
            title: "That's your headquarters.",
            description: 'Fund the treasury, work through both commands, then follow the lights. Opening night comes when every check clears.',
            focus: TOUR_REPLAY_NOTE,
        },
        live: {
            anchor: null,
            title: "That's your control room.",
            description: 'Watch the audience, keep the treasury healthy, and follow the lights into the rooms.',
            focus: TOUR_REPLAY_NOTE,
        },
    },
];

/** One step as the coach shows it, for the state the company is in. */
export const resolveStreamingHqTourStep = (
    index: number,
    mode: StreamingHqTourMode,
): StreamingHqTourCopy & { kicker: string; index: number; total: number } => {
    const total = STREAMING_HQ_TOUR_STEPS.length;
    const safeIndex = Math.min(total - 1, Math.max(0, Math.round(Number(index) || 0)));
    const step = STREAMING_HQ_TOUR_STEPS[safeIndex];
    const copy: StreamingHqTourCopy = mode === 'live'
        ? step.live
        : mode === 'building'
            ? { ...step.prelaunch, ...(step.building ?? {}) }
            : step.prelaunch;
    return { ...copy, kicker: `TOUR ${safeIndex + 1} OF ${total}`, index: safeIndex, total };
};

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
            title: 'Commission an Original (optional)',
            description: 'You can open without one. A finished Original makes a bigger opening.',
            complete: platform.milestoneKeys.includes('first-original-greenlit') || platform.milestoneKeys.includes('launch-slate-programmed'),
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
        capitalModelLabel: founding?.incorporationModel === 'FIXED_V8_ZERO_TREASURY'
            || founding?.incorporationModel === 'FIXED_V7'
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
    const current = platform.hqOnboarding;
    const next = update(current, absoluteWeek);
    if (next.status === current.status && next.currentStep === current.currentStep
        && next.startedAtAbsoluteWeek === current.startedAtAbsoluteWeek
        && next.completedAtAbsoluteWeek === current.completedAtAbsoluteWeek
        && next.visitedSections.length === current.visitedSections.length
        && next.visitedSections.every((section, index) => section === current.visitedSections[index])) return player;
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            hqOnboarding: next,
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
    /* the tour lives on the headquarters now: walking into a room records the visit but never moves the tour */
    return {
        ...state,
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

/** One step back; the first step stays the first. */
export const rewindStreamingHqTour = (player: Player): Player => updateHqOnboarding(
    player,
    (state) => (state.status !== 'IN_PROGRESS' || state.currentStep <= 0
        ? state
        : { ...state, currentStep: state.currentStep - 1 }),
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

/* ============================================================================
   THE DASHBOARD CARD
   ----------------------------------------------------------------------------
   The streaming platform had no presence at all on the main Empire dashboard.
   It lived four taps deep behind Lifestyle, so a player could run out of money
   inside a company they never saw on the screen they actually live on.

   This derives the one-glance summary that surface needs. It is a projection of
   canonical state — it creates no money, no subscribers and no outcomes — and
   it deliberately answers only three questions: what is it, how is it doing,
   and is there something I have to deal with.
   ========================================================================== */

export type StreamingDashboardTone = 'calm' | 'watch' | 'urgent';

export interface StreamingDashboardCard {
    /** false when the player has not incorporated; the card is not rendered */
    owned: boolean;
    platformName: string;
    statusLabel: StreamingHqSnapshot['statusLabel'];
    live: boolean;
    treasuryCash: number;
    /** null before launch, when a runway figure would be invented rather than measured */
    runwayWeeks: number | null;
    subscribers: number;
    subscriberDelta: number;
    /** pre-launch progress toward opening night */
    readiness: { done: number; total: number } | null;
    tone: StreamingDashboardTone;
    /** the single thing worth saying, or null on a quiet week */
    headline: string | null;
    /** what tapping the card should be understood to do */
    actionLabel: string;
}

/** Below this the company cannot absorb another bad quarter without raising. */
const RUNWAY_URGENT_WEEKS = 12;
const RUNWAY_WATCH_WEEKS = 26;

export const getStreamingDashboardCard = (player: Player): StreamingDashboardCard => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const empty: StreamingDashboardCard = {
        owned: false, platformName: '', statusLabel: 'PRE-LAUNCH', live: false,
        treasuryCash: 0, runwayWeeks: null, subscribers: 0, subscriberDelta: 0,
        readiness: null, tone: 'calm', headline: null, actionLabel: '',
    };
    if (!platform.identity || !platform.foundingProfile) return empty;

    const snapshot = getStreamingHqSnapshot(player);
    const live = Boolean(platform.launchCommit);
    const launchProgram = live ? null : getStreamingLaunchProgramView(player);
    const readiness = live
        ? null
        : { done: launchProgram!.completedCount, total: launchProgram!.totalCount };

    /* Runway is only honest once the service is trading. Before launch there is
       no revenue to divide into, so the number would be a guess wearing a
       decimal point. */
    const runwayWeeks = live && platform.metrics.cashRunwayWeeks > 0
        ? Math.round(platform.metrics.cashRunwayWeeks)
        : null;

    let tone: StreamingDashboardTone = 'calm';
    let headline: string | null = null;

    if (live && runwayWeeks !== null && runwayWeeks <= RUNWAY_URGENT_WEEKS) {
        tone = 'urgent';
        headline = `${runwayWeeks} weeks of cash left. Raise or cut a cost line.`;
    } else if (!live && launchProgram!.budget.shortfall > 0) {
        tone = 'urgent';
        headline = `The launch plan is $${launchProgram!.budget.shortfall.toLocaleString()} short. Adjust it or fund the company.`;
    } else if (!live && platform.treasuryCash <= 0) {
        tone = 'urgent';
        headline = 'The company is ready to plan, but spending remains locked until it is funded.';
    } else if (!live && launchProgram!.recommendedNextAction) {
        tone = 'watch';
        headline = launchProgram!.recommendedNextAction!.description;
    } else if (live && runwayWeeks !== null && runwayWeeks <= RUNWAY_WATCH_WEEKS) {
        tone = 'watch';
        headline = `${runwayWeeks} weeks of runway at this burn.`;
    } else if (!live && readiness && readiness.done >= readiness.total && readiness.total > 0) {
        tone = 'watch';
        headline = 'Every gate is clear. Opening night is waiting on you.';
    }

    return {
        owned: true,
        platformName: platform.identity.name || snapshot.platformName,
        statusLabel: snapshot.statusLabel,
        live,
        treasuryCash: platform.treasuryCash,
        runwayWeeks,
        subscribers: platform.metrics.subscribers,
        subscriberDelta: platform.metrics.netSubscriberMovement,
        readiness,
        tone,
        headline,
        actionLabel: live
            ? 'Open the platform'
            : launchProgram?.recommendedNextAction
                ? `Continue: ${launchProgram.recommendedNextAction.label}`
                : 'Open launch command',
    };
};
