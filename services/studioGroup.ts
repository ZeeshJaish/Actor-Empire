import type { Business, Player, SubsidiaryOperatingModel } from '../types';

export interface OperatingModelDefinition {
    id: SubsidiaryOperatingModel;
    label: string;
    shortLabel: string;
    control: string;
    description: string;
    benefits: string[];
    tradeoffs: string[];
    accent: 'EMERALD' | 'SKY' | 'AMBER';
}

export const OPERATING_MODELS: OperatingModelDefinition[] = [
    {
        id: 'INDEPENDENT_LABEL',
        label: 'Independent Label',
        shortLabel: 'Independent',
        control: 'Board oversight',
        description: 'The studio keeps its identity and management while operating on its own.',
        benefits: ['Automatic operations', 'Brand and leadership retained', 'Profits flow to the group'],
        tradeoffs: ['Limited direct control', 'Group absorbs losses'],
        accent: 'EMERALD',
    },
    {
        id: 'CONTROLLED_SUBSIDIARY',
        label: 'Controlled Subsidiary',
        shortLabel: 'Controlled',
        control: 'Strategic command',
        description: 'The studio keeps its banner, while you control budgets, leadership and major productions.',
        benefits: ['Direct production control', 'Separate brand and finances', 'Routine work can stay automatic'],
        tradeoffs: ['Higher management load', 'Leadership changes may create friction'],
        accent: 'SKY',
    },
    {
        id: 'FULL_MERGER',
        label: 'Full Merger',
        shortLabel: 'Merger',
        control: 'Total integration',
        description: 'Assets and liabilities move into the parent studio as the acquired identity is retired.',
        benefits: ['Unified catalog and facilities', 'Total operating control', 'Consolidated production power'],
        tradeoffs: ['Integration costs and backlash', 'Difficult to reverse'],
        accent: 'AMBER',
    },
];

export const isAcquiredStudio = (business: Business): boolean => (
    business.type === 'PRODUCTION_HOUSE'
    && (
        business.studioState?.acquisitionOrigin === 'STUDIO_ACQUISITION'
        || business.config.productionType === 'Acquired Studio'
    )
);

export const getStudioGroup = (player: Pick<Player, 'businesses'>): {
    parentStudio?: Business;
    subsidiaries: Business[];
    allStudios: Business[];
} => {
    const allStudios = player.businesses.filter(business => business.type === 'PRODUCTION_HOUSE');
    return {
        parentStudio: allStudios.find(business => !isAcquiredStudio(business)) || allStudios[0],
        subsidiaries: allStudios.filter(isAcquiredStudio),
        allStudios,
    };
};

export const getOperatingModelDefinition = (
    model?: SubsidiaryOperatingModel,
): OperatingModelDefinition | undefined => OPERATING_MODELS.find(definition => definition.id === model);

export const setSubsidiaryOperatingModel = ({
    player,
    studioId,
    model,
}: {
    player: Player;
    studioId: string;
    model: SubsidiaryOperatingModel;
}): {
    success: boolean;
    player: Player;
    studio?: Business;
    reason?: 'STUDIO_NOT_FOUND' | 'NOT_ACQUIRED_STUDIO';
} => {
    const studio = player.businesses.find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE');
    if (!studio) return { success: false, player, reason: 'STUDIO_NOT_FOUND' };
    if (!isAcquiredStudio(studio)) return { success: false, player, studio, reason: 'NOT_ACQUIRED_STUDIO' };

    const updatedStudio: Business = {
        ...studio,
        studioState: {
            ...studio.studioState!,
            acquisitionOrigin: 'STUDIO_ACQUISITION',
            operatingModel: model,
            operatingModelChangedWeek: player.currentWeek,
            operatingModelChangedYear: player.age,
        },
    };
    return {
        success: true,
        studio: updatedStudio,
        player: {
            ...player,
            businesses: player.businesses.map(business => business.id === studioId ? updatedStudio : business),
        },
    };
};
