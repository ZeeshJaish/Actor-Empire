import {
    type MusicArtist,
    type MusicCreditRole,
    type ProjectMusicStrategy,
    type Universe,
    type UniverseId,
} from '../../../types';
import { NPC_DATABASE, isCastableActor } from '../../../services/npcLogic';
import { getDefaultMusicArtistCount, getMusicArtistCountBounds } from '../../../services/musicIndustry';
import { normalizeUniverseCharacterKey } from '../../../services/universeLogic';
import { normalizeCrewSelectionId } from '../../../services/crewMarket';

export type ConnectedProjectIntent = 'AUTO' | 'SOLO' | 'CROSSOVER' | 'EVENT' | 'REBOOT';
export type MarketingBudgetPreset = 'LEAN' | 'STANDARD' | 'HEAVY' | 'EVENT' | 'CUSTOM';
export type MusicArtistSortOption = 'RECOMMENDED' | 'RATING' | 'COST_LOW' | 'COST_HIGH' | 'FAME' | 'FOLLOWERS' | 'AVAILABILITY';

export const formatMoney = (value: number) => {
    if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}T`;
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return `${value}`;
};

export const clampStat = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export const MARKETING_BUDGET_PRESETS: Array<{ id: MarketingBudgetPreset; percent: number }> = [
    { id: 'LEAN', percent: 0.08 },
    { id: 'STANDARD', percent: 0.15 },
    { id: 'HEAVY', percent: 0.25 },
    { id: 'EVENT', percent: 0.40 },
];

export const getMarketingBudgetForPreset = (preset: MarketingBudgetPreset, productionBudget: number) => {
    if (preset === 'CUSTOM') return 0;
    const option = MARKETING_BUDGET_PRESETS.find(item => item.id === preset) || MARKETING_BUDGET_PRESETS[1];
    const floor = preset === 'LEAN' ? 250_000 : preset === 'STANDARD' ? 750_000 : preset === 'HEAVY' ? 1_500_000 : 3_000_000;
    return Math.round(Math.max(floor, productionBudget * option.percent) / 50_000) * 50_000;
};

export const MUSIC_DELIVERABLE_ROLES: MusicCreditRole[] = [
    'LEAD_SINGLE',
    'MUSIC_VIDEO_TIE_IN',
    'PROMO_ALBUM',
    'SOUNDTRACK_EP',
    'TRAILER_ANTHEM',
    'END_CREDIT_SONG',
];

export const MUSIC_ARTIST_SORT_OPTIONS: Array<{ id: MusicArtistSortOption }> = [
    { id: 'RECOMMENDED' },
    { id: 'RATING' },
    { id: 'COST_LOW' },
    { id: 'COST_HIGH' },
    { id: 'FAME' },
    { id: 'FOLLOWERS' },
    { id: 'AVAILABILITY' },
];

export const MUSIC_FAME_SORT_SCORE: Record<MusicArtist['fameTier'], number> = {
    EMERGING: 1,
    KNOWN: 2,
    STAR: 3,
    SUPERSTAR: 4,
    LEGEND: 5,
};

export const MUSIC_AVAILABILITY_SORT_SCORE: Record<MusicArtist['availability'], number> = {
    COMMON: 3,
    SELECTIVE: 2,
    RARE: 1,
};

export const getCastableNpcById = (id?: string | null, extraNPCs: any[] = []) => (
    id ? [...NPC_DATABASE, ...extraNPCs].find(npc => npc.id === id && isCastableActor(npc)) : undefined
);

export const isCastableMovieRoleId = (id?: string | null, extraNPCs: any[] = []) => (
    !id || id === 'UNKNOWN' || id === 'PLAYER_SELF' || id === 'STUDIO_STAFF' || Boolean(getCastableNpcById(id, extraNPCs))
);

export const getInitialMusicArtistTargetCount = (concept?: any): number => {
    const strategy = (concept?.musicStrategy || concept?.musicPlan?.strategy || 'LEAD_SINGLE') as ProjectMusicStrategy;
    const savedCount = Number(concept?.selectedMusicArtistTargetCount ?? concept?.musicPlan?.artistTargetCount);
    if (Number.isFinite(savedCount)) {
        const bounds = getMusicArtistCountBounds(strategy);
        return Math.min(bounds.max, Math.max(bounds.min, Math.round(savedCount)));
    }
    return getDefaultMusicArtistCount(strategy);
};

export const getInitialSelectedMusicCreditRoles = (concept?: any): MusicCreditRole[] | null => {
    if (Array.isArray(concept?.selectedMusicCreditRoles)) {
        return Array.from(new Set(concept.selectedMusicCreditRoles.filter(Boolean))) as MusicCreditRole[];
    }
    const roles = Array.isArray(concept?.musicPlan?.selectedCreditRoles) ? concept.musicPlan.selectedCreditRoles : [];
    const cleanRoles = Array.from(new Set(roles.filter(Boolean))) as MusicCreditRole[];
    return cleanRoles.length ? cleanRoles : [];
};

export const getMusicStrategyForSelectedRoles = (roles: MusicCreditRole[], fallback: ProjectMusicStrategy): ProjectMusicStrategy => {
    if (roles.length === 0) return 'COMPOSER_ONLY';
    if (roles.includes('PROMO_ALBUM')) return 'PROMO_ALBUM';
    if (roles.includes('MUSIC_VIDEO_TIE_IN')) return 'MUSIC_VIDEO_TIE_IN';
    if (roles.includes('SOUNDTRACK_EP')) return 'SOUNDTRACK_EP';
    if (roles.includes('LEAD_SINGLE') || roles.includes('TRAILER_ANTHEM') || roles.includes('END_CREDIT_SONG')) return 'LEAD_SINGLE';
    return fallback;
};

export const returningCrewRoleToStateKey = (role?: string): 'director' | 'cinematographer' | 'composer' | 'lineProducer' | 'vfx' | null => {
    if (role === 'DIRECTOR') return 'director';
    if (role === 'CINEMATOGRAPHER') return 'cinematographer';
    if (role === 'COMPOSER') return 'composer';
    if (role === 'LINE_PRODUCER') return 'lineProducer';
    if (role === 'VFX_SUPERVISOR') return 'vfx';
    return null;
};

export const normalizeCrewReturningRole = (role?: string) => role === 'VFX' ? 'VFX_SUPERVISOR' : role;

export const normalizeSelectedCrewState = (selected?: Record<string, string | null>) => ({
    director: selected?.director || null,
    cinematographer: normalizeCrewSelectionId(selected?.cinematographer),
    composer: normalizeCrewSelectionId(selected?.composer),
    lineProducer: normalizeCrewSelectionId(selected?.lineProducer),
    vfx: normalizeCrewSelectionId(selected?.vfx),
});

export const formatReturningRoleLabel = (role?: string) => {
    if (!role) return 'Talent';
    const labels: Record<string, string> = {
        DIRECTOR: 'Director',
        CINEMATOGRAPHER: 'Cinematographer',
        COMPOSER: 'Composer',
        LINE_PRODUCER: 'Line Producer',
        VFX_SUPERVISOR: 'VFX Supervisor',
        LEAD_ACTOR: 'Lead Actor',
        SUPPORTING_ACTOR: 'Supporting Actor',
    };
    return labels[role] || role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, character => character.toUpperCase());
};

export const VALID_RETURNING_TALENT_ROLES = new Set([
    'DIRECTOR',
    'CINEMATOGRAPHER',
    'COMPOSER',
    'LINE_PRODUCER',
    'VFX_SUPERVISOR',
    'LEAD_ACTOR',
    'SUPPORTING_ACTOR',
]);

export const getUniversePhaseLabel = (phase?: Universe['currentPhase']) => {
    if (typeof phase === 'number') return `Phase ${phase}`;
    if (typeof phase === 'string') {
        const phaseNumber = phase.match(/(\d+)/)?.[1];
        if (phaseNumber) return `Phase ${phaseNumber}`;
        return phase.replace(/_/g, ' ');
    }
    return 'Phase 1';
};

export const toUniverseCharacterId = (universeId: UniverseId | 'NEW' | null, characterName?: string) => {
    const trimmed = characterName?.trim();
    if (!trimmed || !universeId || universeId === 'NEW') return undefined;
    return normalizeUniverseCharacterKey(trimmed);
};
