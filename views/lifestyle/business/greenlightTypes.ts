export type GreenlightStep =
    | 'SELECT_SCRIPT'
    | 'DIRECTOR'
    | 'CAST'
    | 'CREW'
    | 'EQUIPMENT'
    | 'LOCATION'
    | 'SETUP'
    | 'CONFIRM'
    | 'BUZZ';

export type GreenlightNegotiationFeedbackType = 'SUCCESS' | 'FAILURE' | 'FINAL_FAILURE';
export type GreenlightVisualStyle = 'REALISTIC' | 'STYLISTIC' | 'GRITTY' | 'VIBRANT' | 'MINIMALIST' | 'NOIR';
export type GreenlightPacing = 'SLOW' | 'MODERATE' | 'FAST' | 'FRENETIC';

export interface GreenlightNegotiationState {
    talentId: string;
    roleType: string;
    roleId?: string;
    originalSalary: number;
    currentDemand: number;
    attemptsLeft: number;
    talentName: string;
    talentImage: string;
    talentTier: string;
    feedback?: {
        message: string;
        type: GreenlightNegotiationFeedbackType;
    };
}

export interface GreenlightCastRole {
    id: string;
    role: string;
    roleType: 'LEAD' | 'SUPPORTING' | 'CAMEO' | 'EXTRA';
    actorId: string | null;
    actorName?: string;
    salary?: number;
    characterId?: string;
    characterName?: string;
    sourceUniverseId?: import('../../../types').UniverseId;
    storyFunction?: import('../../../types').CharacterStoryFunction;
    storyRole?: import('../../../types').CharacterStoryRole;
    abilityType?: import('../../../types').CharacterAbilityType;
    nature?: import('../../../types').CharacterNature;
    identitySource?: import('../../../types').CharacterIdentitySource;
}
