import type { ConnectedProjectIntent } from './greenlightUtils';

type GreenlightCrewRole = 'director' | 'cinematographer' | 'composer' | 'lineProducer' | 'vfx';
type GreenlightCrewMode = 'HIRE' | 'SELF' | 'IN_HOUSE';

const REQUIRED_CREW_ROLES: GreenlightCrewRole[] = [
    'director',
    'cinematographer',
    'composer',
    'lineProducer',
    'vfx',
];

const CREW_ROLE_LABELS: Record<GreenlightCrewRole, string> = {
    director: 'Director',
    cinematographer: 'Cinematographer',
    composer: 'Composer',
    lineProducer: 'Line Producer',
    vfx: 'VFX Supervisor',
};

export interface ResolveGreenlightConnectedIntentInput {
    requestedIntent: ConnectedProjectIntent;
    scriptIntent?: ConnectedProjectIntent;
    scriptTags?: readonly string[];
    linkedKnownCastCount: number;
    sourceMaterial?: string;
    hasSelectedFranchise: boolean;
}

export const resolveGreenlightConnectedIntent = ({
    requestedIntent,
    scriptIntent,
    scriptTags,
    linkedKnownCastCount,
    sourceMaterial,
    hasSelectedFranchise,
}: ResolveGreenlightConnectedIntentInput): ConnectedProjectIntent => {
    if (requestedIntent !== 'AUTO') return requestedIntent;
    if (scriptIntent && scriptIntent !== 'AUTO') return scriptIntent;
    if (scriptTags?.includes('UNIVERSE_EVENT')) return 'EVENT';
    if (scriptTags?.includes('REBOOT')) return 'REBOOT';
    if (linkedKnownCastCount >= 3) return 'EVENT';
    if (linkedKnownCastCount >= 1) return 'CROSSOVER';
    if (sourceMaterial === 'SEQUEL' || hasSelectedFranchise) return 'SOLO';
    return 'SOLO';
};

export interface GreenlightValidationCastRole {
    roleType: string;
    actorId?: string | null;
}

export interface GreenlightValidationInput {
    hasSelectedScript: boolean;
    scriptStatus?: string;
    selectedLocationCount: number;
    playerEnergy: number;
    energyCost: number;
    crewModes: Record<string, GreenlightCrewMode>;
    selectedCrew: Record<string, string | null>;
    castRoles: readonly GreenlightValidationCastRole[];
    effectiveConnectedIntent: ConnectedProjectIntent;
    linkedKnownCastCount: number;
    hasUniverseConnection: boolean;
    hasFranchiseConnection: boolean;
    unresolvedReturningTalentNames: readonly string[];
    unresolvedReturningTalentCount: number;
    effectiveStudioFundingPool: number;
    netGreenlightCashRequirement: number;
}

export interface GreenlightValidationResult {
    can: boolean;
    errors: string[];
}

export const validateGreenlightProject = ({
    hasSelectedScript,
    scriptStatus,
    selectedLocationCount,
    playerEnergy,
    energyCost,
    crewModes,
    selectedCrew,
    castRoles,
    effectiveConnectedIntent,
    linkedKnownCastCount,
    hasUniverseConnection,
    hasFranchiseConnection,
    unresolvedReturningTalentNames,
    unresolvedReturningTalentCount,
    effectiveStudioFundingPool,
    netGreenlightCashRequirement,
}: GreenlightValidationInput): GreenlightValidationResult => {
    if (!hasSelectedScript) return { can: false, errors: ['No script selected'] };

    const errors: string[] = [];
    if (scriptStatus === 'IN_DEVELOPMENT') errors.push('Scripting is still in progress');
    if (selectedLocationCount === 0) errors.push('No filming locations selected');
    if (playerEnergy < energyCost) errors.push(`Greenlight needs ${energyCost} energy`);

    for (const role of REQUIRED_CREW_ROLES) {
        if (crewModes[role] === 'HIRE' && !selectedCrew[role]) {
            errors.push(`${CREW_ROLE_LABELS[role]} is required`);
        }
    }

    if (!castRoles.some(role => role.roleType === 'LEAD' && (role.actorId || role.actorId === 'PLAYER_SELF' || role.actorId === 'STUDIO_STAFF'))) {
        errors.push('At least one lead actor is required');
    }

    if (effectiveConnectedIntent === 'CROSSOVER' && linkedKnownCastCount < 1) {
        errors.push('Crossover needs at least one known character');
    }

    if (effectiveConnectedIntent === 'EVENT' && linkedKnownCastCount < 3) {
        errors.push('Event film needs at least three known characters');
    }

    if (effectiveConnectedIntent === 'REBOOT' && !hasUniverseConnection && !hasFranchiseConnection) {
        errors.push('Reboot needs a universe or franchise connection');
    }

    if (unresolvedReturningTalentCount > 0) {
        const names = unresolvedReturningTalentNames.slice(0, 3);
        const suffix = unresolvedReturningTalentCount > 3 ? ` +${unresolvedReturningTalentCount - 3} more` : '';
        errors.push(`Returning talent negotiations pending: ${names.join(', ')}${suffix}`);
    }

    if (effectiveStudioFundingPool < netGreenlightCashRequirement) {
        errors.push('Insufficient studio funds for this project plan');
    }

    return { can: errors.length === 0, errors };
};
