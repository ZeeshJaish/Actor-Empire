import type { Genre, ProjectType, RoleType } from '../../types';

export interface CinemaOwnerRef {
    id: string;
    route: 'PLAYER_STUDIO' | 'ACCEPTED_ROLE' | 'NPC_STUDIO';
}

export interface CinemaCreditedPerson {
    personId: string;
    name: string;
    roleType: RoleType;
    roleWeight: number;
    fame: number;
    isPlayer: boolean;
    characterIds: string[];
}

/** Normalized production facts. Audience/market contracts are added with their consumers. */
export interface CinemaTitleInput {
    id: string;
    owner: CinemaOwnerRef;
    projectType: ProjectType;
    genre: Genre;
    budgetCents: number;
    cast: CinemaCreditedPerson[];
    directorId?: string;
    playerCredited: boolean;
}
