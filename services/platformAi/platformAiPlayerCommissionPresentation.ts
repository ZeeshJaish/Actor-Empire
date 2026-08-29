import type { PlatformAiPlayerCommissionOffer } from '../../types';

const getCommissionSourceLabel = (offer: PlatformAiPlayerCommissionOffer): string => (
    `${offer.platformName.toUpperCase()} COMMISSION`
);

export const createPlatformCommissionBriefReference = (platformName: string, offerId: string): string => {
    const hash = Array.from(offerId).reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 2166136261);
    return `${platformName} Commission #${String(100 + (hash % 900)).padStart(3, '0')}`;
};

export const buildPlatformCommissionActiveCardPresentation = (
    offer: PlatformAiPlayerCommissionOffer,
): {
    title: string;
    phase: string;
    sourceLabel: string;
    productionBudget: number;
} => ({
    title: offer.status === 'ACCEPTED' && !offer.scriptId ? offer.briefReference : offer.title,
    phase: offer.status === 'ACCEPTED' && !offer.scriptId ? 'SCRIPT REQUIRED' : offer.status.replaceAll('_', ' '),
    sourceLabel: getCommissionSourceLabel(offer),
    productionBudget: offer.productionBudget,
});

export const buildPlatformCommissionBudgetPresentation = (
    packageBudget: number,
    offer: PlatformAiPlayerCommissionOffer,
): {
    packageBudget: number;
    productionCap: number;
    remainingBudget: number;
    producerFee: number;
    overBudget: boolean;
} => {
    const safePackageBudget = Math.max(0, Math.round(Number(packageBudget) || 0));
    const productionCap = Math.max(0, Math.round(Number(offer.productionBudget) || 0));
    return {
        packageBudget: safePackageBudget,
        productionCap,
        remainingBudget: Math.max(0, productionCap - safePackageBudget),
        producerFee: Math.max(0, Math.round(Number(offer.producerFee) || 0)),
        overBudget: safePackageBudget > productionCap,
    };
};

export interface PlatformCommissionFilmographyCredit {
    id: string;
    name: string;
    phase: 'DELIVERED';
    distributionPhase: 'STREAMING';
    rating: number;
    imdbRating: number;
    gross: 0;
    budget: number;
    type: PlatformAiPlayerCommissionOffer['projectType'];
    projectType: PlatformAiPlayerCommissionOffer['projectType'];
    genre: PlatformAiPlayerCommissionOffer['genre'];
    awards: [];
    streamingRevenue: 0;
    sourceLabel: string;
    isPlatformCommissionCredit: true;
    countsTowardOwnedStudioEvaluation: false;
    producerFee: number;
    releasedAtAbsoluteWeek: number | null;
    releaseYear: number;
    releaseWeek: number;
    projectDetails: {
        studioId: string;
        genre: PlatformAiPlayerCommissionOffer['genre'];
        type: PlatformAiPlayerCommissionOffer['projectType'];
        budget: number;
        hiddenStats: {
            playerPlatformCommissionOfferId: string;
            platformId: PlatformAiPlayerCommissionOffer['platformId'];
        };
    };
}

export const buildPlatformCommissionFilmography = <T>(input: {
    ownedProjects: T[];
    offers: Record<string, PlatformAiPlayerCommissionOffer> | undefined;
    studioId: string;
}): {
    evaluationProjects: T[];
    displayProjects: Array<T | PlatformCommissionFilmographyCredit>;
    commissionCredits: PlatformCommissionFilmographyCredit[];
} => {
    const commissionCredits = Object.values(input.offers || {})
        .filter(offer => offer.studioId === input.studioId && offer.status === 'DELIVERED')
        .sort((left, right) => (right.deliveredAtAbsoluteWeek || 0) - (left.deliveredAtAbsoluteWeek || 0))
        .map(offer => {
            const absoluteWeek = Math.max(0, Math.round(offer.deliveredAtAbsoluteWeek || 0));
            return {
                id: offer.canonicalProductionId || offer.id,
                name: offer.title,
                phase: 'DELIVERED' as const,
                distributionPhase: 'STREAMING' as const,
                rating: offer.deliveredImdbRating || 0,
                imdbRating: offer.deliveredImdbRating || 0,
                gross: 0 as const,
                budget: offer.productionBudget,
                type: offer.projectType,
                projectType: offer.projectType,
                genre: offer.genre,
                awards: [] as [],
                streamingRevenue: 0 as const,
                sourceLabel: getCommissionSourceLabel(offer),
                isPlatformCommissionCredit: true as const,
                countsTowardOwnedStudioEvaluation: false as const,
                producerFee: offer.producerFee,
                releasedAtAbsoluteWeek: offer.deliveredAtAbsoluteWeek,
                releaseYear: Math.max(0, Math.floor(absoluteWeek / 52)),
                releaseWeek: Math.max(1, absoluteWeek % 52 || 52),
                projectDetails: {
                    studioId: input.studioId,
                    genre: offer.genre,
                    type: offer.projectType,
                    budget: offer.productionBudget,
                    hiddenStats: {
                        playerPlatformCommissionOfferId: offer.id,
                        platformId: offer.platformId,
                    },
                },
            };
        });
    const evaluationProjects = input.ownedProjects.slice();
    return {
        evaluationProjects,
        displayProjects: [...evaluationProjects, ...commissionCredits],
        commissionCredits,
    };
};
