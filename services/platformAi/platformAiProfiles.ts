import type {
    Genre,
    PlatformAiCompetence,
    PlatformId,
    StudioId,
} from '../../types';

export {
    PLATFORM_AI_OPERATING_PROFILES,
    clampPlatformAiEfficiencyPolicy,
    getPlatformAiOperatingProfile,
    type PlatformAiOperatingProfile,
} from './platformAiOperatingProfiles';

export interface PlatformAiProfile {
    id: PlatformId;
    overallLevel: number;
    competence: PlatformAiCompetence;
    preferredGenres: Genre[];
    producerStudioPreferences: StudioId[];
    ownedStudioIds: StudioId[];
    riskTolerance: number;
    releaseVolume: number;
    planningCadenceWeeks: number;
    maxConcurrentProductions: number;
    maxActiveRightsPlans: number;
    parentBacking: 'NONE' | 'LIMITED' | 'STRONG';
    monthlyArpu: number;
    paidSubscriberShare: number;
    adSupportedShare: number;
    weeklyAdRevenuePerSubscriber: number;
    weeklyDeliveryCostPerSubscriber: number;
    baseWeeklyOperationsMillions: number;
    regionWeeklyCostMillions: number;
    targetRunwayWeeks: number;
}

export const PLATFORM_AI_PROFILES: Record<PlatformId, PlatformAiProfile> = {
    NETFLIX: {
        id: 'NETFLIX',
        overallLevel: 9.4,
        competence: { strategy: 9.6, creative: 9.1, production: 9.5, commercial: 9.8, prestige: 8.8, finance: 8.3, technology: 9.4, negotiation: 9.5 },
        preferredGenres: ['THRILLER', 'CRIME', 'DRAMA', 'ACTION', 'SCI_FI'],
        producerStudioPreferences: ['UNIVERSAL', 'WARNER_BROS', 'LIONSGATE'],
        ownedStudioIds: [],
        riskTolerance: 0.82,
        releaseVolume: 5,
        planningCadenceWeeks: 4,
        maxConcurrentProductions: 6,
        maxActiveRightsPlans: 14,
        parentBacking: 'NONE',
        monthlyArpu: 13.5,
        paidSubscriberShare: 1,
        adSupportedShare: 0.24,
        weeklyAdRevenuePerSubscriber: 0.34,
        weeklyDeliveryCostPerSubscriber: 0.08,
        baseWeeklyOperationsMillions: 160,
        regionWeeklyCostMillions: 3.2,
        targetRunwayWeeks: 52,
    },
    APPLE_TV: {
        id: 'APPLE_TV',
        overallLevel: 8.8,
        competence: { strategy: 9.0, creative: 9.1, production: 8.5, commercial: 8.2, prestige: 9.7, finance: 8.4, technology: 9.7, negotiation: 9.0 },
        preferredGenres: ['DRAMA', 'SCI_FI', 'THRILLER', 'COMEDY', 'DOCUMENTARY'],
        producerStudioPreferences: ['ARTISAN_PICTURES', 'SEARCHLIGHT', 'HBO'],
        ownedStudioIds: [],
        riskTolerance: 0.58,
        releaseVolume: 2,
        planningCadenceWeeks: 8,
        maxConcurrentProductions: 4,
        maxActiveRightsPlans: 7,
        parentBacking: 'STRONG',
        monthlyArpu: 10,
        paidSubscriberShare: 1,
        adSupportedShare: 0.08,
        weeklyAdRevenuePerSubscriber: 0.22,
        weeklyDeliveryCostPerSubscriber: 0.07,
        baseWeeklyOperationsMillions: 90,
        regionWeeklyCostMillions: 2.5,
        targetRunwayWeeks: 78,
    },
    DISNEY_PLUS: {
        id: 'DISNEY_PLUS',
        overallLevel: 9.1,
        competence: { strategy: 9.4, creative: 8.9, production: 9.2, commercial: 9.4, prestige: 9.2, finance: 8.6, technology: 8.8, negotiation: 9.1 },
        preferredGenres: ['ANIMATION', 'SUPERHERO', 'FANTASY', 'ADVENTURE', 'MUSICAL'],
        producerStudioPreferences: ['PIXAR', 'MARVEL_STUDIOS', 'LUCASFILM'],
        ownedStudioIds: ['PIXAR', 'MARVEL_STUDIOS', 'LUCASFILM'],
        riskTolerance: 0.64,
        releaseVolume: 3,
        planningCadenceWeeks: 6,
        maxConcurrentProductions: 6,
        maxActiveRightsPlans: 10,
        parentBacking: 'LIMITED',
        monthlyArpu: 11,
        paidSubscriberShare: 1,
        adSupportedShare: 0.32,
        weeklyAdRevenuePerSubscriber: 0.30,
        weeklyDeliveryCostPerSubscriber: 0.08,
        baseWeeklyOperationsMillions: 140,
        regionWeeklyCostMillions: 3,
        targetRunwayWeeks: 52,
    },
    HULU: {
        id: 'HULU',
        overallLevel: 7.4,
        competence: { strategy: 7.8, creative: 7.7, production: 7.5, commercial: 8.0, prestige: 7.2, finance: 8.2, technology: 7.4, negotiation: 7.9 },
        preferredGenres: ['COMEDY', 'DRAMA', 'CRIME', 'THRILLER', 'DOCUMENTARY'],
        producerStudioPreferences: ['LIONSGATE', 'MGM', 'ARTISAN_PICTURES'],
        ownedStudioIds: [],
        riskTolerance: 0.68,
        releaseVolume: 3,
        planningCadenceWeeks: 6,
        maxConcurrentProductions: 3,
        maxActiveRightsPlans: 9,
        parentBacking: 'LIMITED',
        monthlyArpu: 12,
        paidSubscriberShare: 1,
        adSupportedShare: 0.58,
        weeklyAdRevenuePerSubscriber: 0.40,
        weeklyDeliveryCostPerSubscriber: 0.09,
        baseWeeklyOperationsMillions: 70,
        regionWeeklyCostMillions: 1.8,
        targetRunwayWeeks: 39,
    },
    YOUTUBE: {
        id: 'YOUTUBE',
        overallLevel: 8.2,
        competence: { strategy: 8.5, creative: 7.4, production: 8.0, commercial: 9.1, prestige: 7.0, finance: 8.7, technology: 9.8, negotiation: 8.2 },
        preferredGenres: ['DOCUMENTARY', 'COMEDY', 'MUSICAL', 'SPORTS', 'ANIMATION'],
        producerStudioPreferences: ['DREAMWORKS', 'SONY_PICTURES', 'ARTISAN_PICTURES'],
        ownedStudioIds: [],
        riskTolerance: 0.76,
        releaseVolume: 4,
        planningCadenceWeeks: 13,
        maxConcurrentProductions: 5,
        maxActiveRightsPlans: 12,
        parentBacking: 'STRONG',
        monthlyArpu: 9,
        paidSubscriberShare: 0.04,
        adSupportedShare: 0.88,
        weeklyAdRevenuePerSubscriber: 0.52,
        weeklyDeliveryCostPerSubscriber: 0.06,
        baseWeeklyOperationsMillions: 200,
        regionWeeklyCostMillions: 4,
        targetRunwayWeeks: 65,
    },
};
