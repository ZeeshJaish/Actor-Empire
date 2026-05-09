
import { Universe, UniverseId, UniverseContract, Player, ProjectDetails, NewsItem, StudioId, Genre, IndustryProject, NPCActor, UniversePhase, RoleType, ProjectSubtype, ContractFilm, AuditionOpportunity, Gender, ActiveRelease, CastMember, UniverseCharacter } from '../types';
import { STUDIO_CATALOG } from './studioLogic';
import { NPC_DATABASE } from './npcLogic';
import { generateProjectTitle, getEstimatedBudget, generateProjectDetails } from './roleLogic';

// --- CONFIGURATION ---

interface CharacterArc {
    name: string;
    gender: Gender | 'ALL'; // NEW: Gender restriction
    roadmap: {
        title: string;
        role: RoleType;
        type: ProjectSubtype;
        offset: number; // Week offset
    }[];
}

// --- MARVEL CINEMATIC UNIVERSE (MCU) ---
const MCU_ARCS: CharacterArc[] = [
    {
        name: "Iron Man",
        gender: 'MALE',
        roadmap: [
            { title: "Iron Man", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "The Incredible Hulk", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 20 }, // Post-Credit Scene
            { title: "Iron Man 2", role: "LEAD", type: "SEQUEL", offset: 60 },
            { title: "The Avengers", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 120 },
            { title: "Iron Man 3", role: "LEAD", type: "SEQUEL", offset: 180 },
            { title: "Avengers: Age of Ultron", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 240 },
            { title: "Captain America: Civil War", role: "SUPPORTING", type: "UNIVERSE_CROSSOVER", offset: 300 },
            { title: "Spider-Man: Homecoming", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 330 }, // Mentor Cameo
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 360 },
            { title: "Avengers: Endgame", role: "LEAD", type: "UNIVERSE_EVENT", offset: 420 }
        ]
    },
    {
        name: "Captain America",
        gender: 'MALE',
        roadmap: [
            { title: "Captain America: The First Avenger", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "The Avengers", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 60 },
            { title: "Thor: The Dark World", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 90 }, // Loki Illusion
            { title: "Captain America: The Winter Soldier", role: "LEAD", type: "SEQUEL", offset: 120 },
            { title: "Avengers: Age of Ultron", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 180 },
            { title: "Captain America: Civil War", role: "LEAD", type: "UNIVERSE_CROSSOVER", offset: 240 },
            { title: "Spider-Man: Homecoming", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 270 }, // PSA Videos
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 300 },
            { title: "Avengers: Endgame", role: "LEAD", type: "UNIVERSE_EVENT", offset: 360 }
        ]
    },
    {
        name: "Thor",
        gender: 'MALE',
        roadmap: [
            { title: "Thor", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "The Avengers", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 60 },
            { title: "Thor: The Dark World", role: "LEAD", type: "SEQUEL", offset: 120 },
            { title: "Doctor Strange", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 150 }, // Post-Credit
            { title: "Avengers: Age of Ultron", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 180 },
            { title: "Thor: Ragnarok", role: "LEAD", type: "SEQUEL", offset: 240 },
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 300 },
            { title: "Thor: Love and Thunder", role: "LEAD", type: "SEQUEL", offset: 380 }
        ]
    },
    {
        name: "Black Widow",
        gender: 'FEMALE',
        roadmap: [
            { title: "Iron Man 2", role: "SUPPORTING", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "The Avengers", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 60 },
            { title: "Captain America: The Winter Soldier", role: "SUPPORTING", type: "UNIVERSE_CROSSOVER", offset: 120 },
            { title: "Avengers: Age of Ultron", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 180 },
            { title: "Captain America: Civil War", role: "SUPPORTING", type: "UNIVERSE_CROSSOVER", offset: 240 },
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 300 },
            { title: "Avengers: Endgame", role: "LEAD", type: "UNIVERSE_EVENT", offset: 360 },
            { title: "Black Widow", role: "LEAD", type: "SPINOFF", offset: 400 }
        ]
    },
    {
        name: "Black Panther",
        gender: 'MALE',
        roadmap: [
            { title: "Captain America: Civil War", role: "SUPPORTING", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Black Panther", role: "LEAD", type: "SPINOFF", offset: 50 },
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 100 },
            { title: "Avengers: Endgame", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 160 },
            { title: "Black Panther: Wakanda Forever", role: "LEAD", type: "SEQUEL", offset: 240 }
        ]
    },
    {
        name: "Spider-Man",
        gender: 'MALE',
        roadmap: [
            { title: "Captain America: Civil War", role: "CAMEO", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Spider-Man: Homecoming", role: "LEAD", type: "SPINOFF", offset: 40 },
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 90 },
            { title: "Avengers: Endgame", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 140 },
            { title: "Spider-Man: Far From Home", role: "LEAD", type: "SEQUEL", offset: 160 },
            { title: "Spider-Man: No Way Home", role: "LEAD", type: "UNIVERSE_EVENT", offset: 220 }
        ]
    },
    {
        name: "Doctor Strange",
        gender: 'MALE',
        roadmap: [
            { title: "Doctor Strange", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Thor: Ragnarok", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 40 },
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 80 },
            { title: "Avengers: Endgame", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 130 },
            { title: "Spider-Man: No Way Home", role: "SUPPORTING", type: "UNIVERSE_CROSSOVER", offset: 180 },
            { title: "Doctor Strange in the Multiverse of Madness", role: "LEAD", type: "SEQUEL", offset: 220 }
        ]
    },
    {
        name: "Scarlet Witch",
        gender: 'FEMALE',
        roadmap: [
            { title: "Captain America: The Winter Soldier", role: "CAMEO", type: "UNIVERSE_ENTRY", offset: 0 }, // Post-Credit
            { title: "Avengers: Age of Ultron", role: "SUPPORTING", type: "UNIVERSE_CROSSOVER", offset: 40 },
            { title: "Captain America: Civil War", role: "ENSEMBLE", type: "UNIVERSE_CROSSOVER", offset: 100 },
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 160 },
            { title: "Avengers: Endgame", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 220 },
            { title: "WandaVision (Series)", role: "LEAD", type: "SPINOFF", offset: 260 },
            { title: "Doctor Strange in the Multiverse of Madness", role: "LEAD", type: "UNIVERSE_CROSSOVER", offset: 320 }
        ]
    }
];

// --- DC UNIVERSE (DCU) ---
const DCU_ARCS: CharacterArc[] = [
    {
        name: "Superman",
        gender: 'MALE',
        roadmap: [
            { title: "Man of Steel", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Batman v Superman: Dawn of Justice", role: "LEAD", type: "UNIVERSE_CROSSOVER", offset: 80 },
            { title: "Justice League", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 140 },
            { title: "Shazam!", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 180 },
            { title: "Man of Steel 2", role: "LEAD", type: "SEQUEL", offset: 240 },
            { title: "Black Adam", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 270 },
            { title: "Justice League: Darkseid War", role: "LEAD", type: "UNIVERSE_EVENT", offset: 320 }
        ]
    },
    {
        name: "Batman",
        gender: 'MALE',
        roadmap: [
            { title: "Batman v Superman: Dawn of Justice", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Suicide Squad", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 40 },
            { title: "Justice League", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 80 },
            { title: "The Batman", role: "LEAD", type: "STANDALONE", offset: 140 },
            { title: "The Flash", role: "SUPPORTING", type: "UNIVERSE_CROSSOVER", offset: 200 },
            { title: "Aquaman and the Lost Kingdom", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 240 }, // Post-Credit
            { title: "Justice League: Kingdom Come", role: "LEAD", type: "UNIVERSE_EVENT", offset: 300 }
        ]
    },
    {
        name: "Wonder Woman",
        gender: 'FEMALE',
        roadmap: [
            { title: "Batman v Superman", role: "SUPPORTING", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Wonder Woman", role: "LEAD", type: "SPINOFF", offset: 50 },
            { title: "Justice League", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 100 },
            { title: "Wonder Woman 1984", role: "LEAD", type: "SEQUEL", offset: 160 },
            { title: "Shazam! Fury of the Gods", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 200 },
            { title: "Justice League 2", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 260 }
        ]
    },
    {
        name: "Harley Quinn",
        gender: 'FEMALE',
        roadmap: [
            { title: "Suicide Squad", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Birds of Prey", role: "LEAD", type: "SPINOFF", offset: 60 },
            { title: "The Suicide Squad", role: "LEAD", type: "SEQUEL", offset: 120 },
            { title: "Joker: Folie à Deux", role: "LEAD", type: "STANDALONE", offset: 180 }
        ]
    },
    {
        name: "The Flash",
        gender: 'MALE',
        roadmap: [
            { title: "Batman v Superman", role: "CAMEO", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Suicide Squad", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 20 },
            { title: "Justice League", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 60 },
            { title: "The Flash", role: "LEAD", type: "SPINOFF", offset: 140 },
            { title: "Justice League: Crisis", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 200 }
        ]
    },
    {
        name: "Aquaman",
        gender: 'MALE',
        roadmap: [
            { title: "Batman v Superman", role: "CAMEO", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Justice League", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 40 },
            { title: "Aquaman", role: "LEAD", type: "SPINOFF", offset: 80 },
            { title: "The Flash", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 120 }, // Post-Credit
            { title: "Aquaman and the Lost Kingdom", role: "LEAD", type: "SEQUEL", offset: 160 },
            { title: "Justice League: Atlantis Attacks", role: "LEAD", type: "UNIVERSE_EVENT", offset: 220 }
        ]
    }
];

// --- STAR WARS GALAXY (SW) ---
const SW_ARCS: CharacterArc[] = [
    { 
        name: "Jedi Prodigy", 
        gender: 'ALL', // Can be any gender
        roadmap: [
            { title: "Star Wars: The Awakening", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Star Wars: Shadow of the Sith", role: "LEAD", type: "SEQUEL", offset: 100 },
            { title: "Star Wars: The Final Order", role: "LEAD", type: "SEQUEL", offset: 200 }
        ] 
    },
    {
        name: "Rogue Smuggler",
        gender: 'ALL',
        roadmap: [
            { title: "Smuggler's Run", role: "LEAD", type: "SPINOFF", offset: 0 },
            { title: "Star Wars: The Underworld", role: "ENSEMBLE", type: "UNIVERSE_CROSSOVER", offset: 80 },
            { title: "Kessel Run", role: "LEAD", type: "SEQUEL", offset: 160 }
        ]
    },
    {
        name: "Mandalorian Warrior",
        gender: 'MALE', // Typically male archetype in canon, but flexible
        roadmap: [
            { title: "The Bounty Hunter", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Book of Boba Fett", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 40 },
            { title: "War for Mandalore", role: "LEAD", type: "SEQUEL", offset: 100 },
            { title: "Star Wars: Galaxy's Edge", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 160 }
        ]
    }
];

const UNIVERSE_TEMPLATES: Record<UniverseId, { name: string, studioId: StudioId, genre: Genre, arcs: CharacterArc[] }> = {
    MCU: {
        name: "Marvel Cinematic Universe",
        studioId: 'MARVEL_STUDIOS',
        genre: 'SUPERHERO',
        arcs: MCU_ARCS
    },
    DCU: {
        name: "DC Universe",
        studioId: 'DC_STUDIOS',
        genre: 'SUPERHERO',
        arcs: DCU_ARCS
    },
    SW: {
        name: "Star Wars Galaxy",
        studioId: 'LUCASFILM',
        genre: 'SCI_FI',
        arcs: SW_ARCS
    }
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const KNOWN_UNIVERSE_COLORS: Record<string, string> = {
    MCU: '#e23636',
    DCU: '#0476f2',
    SW: '#ffe81f'
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const clampNumber = (value: unknown, fallback = 0, min = 0, max = 100): number => {
    const parsed = toFiniteNumber(value, fallback);
    return Math.max(min, Math.min(max, parsed));
};

const isMeaningfulTitle = (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return !!trimmed && !/^unknown$/i.test(trimmed) && !/^untitled$/i.test(trimmed);
};

const normalizeUniversePhase = (phase: unknown): UniversePhase | string => {
    if (typeof phase === 'string' && phase.trim()) return phase;
    const numericPhase = Math.max(1, Math.min(4, Math.round(toFiniteNumber(phase, 1))));
    const phases: UniversePhase[] = ['PHASE_1_ORIGINS', 'PHASE_2_EXPANSION', 'PHASE_3_WAR', 'PHASE_4_MULTIVERSE'];
    return phases[numericPhase - 1] || 'PHASE_1_ORIGINS';
};

const getSafeUniverseId = (raw: any, fallbackId?: UniverseId): UniverseId => {
    const rawId = typeof raw?.id === 'string' && raw.id.trim() ? raw.id.trim() : '';
    const fallback = typeof fallbackId === 'string' && fallbackId.trim() ? fallbackId.trim() : '';
    return (rawId || fallback || 'CUSTOM_UNIVERSE') as UniverseId;
};

export const normalizeUniverseCharacterKey = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'character';

export const getDefaultUniverseRoster = (universeId: UniverseId): UniverseCharacter[] => {
    const template = UNIVERSE_TEMPLATES[universeId];
    if (!template) return [];

    const actors = NPC_DATABASE.filter(npc => npc.occupation === 'ACTOR');
    return template.arcs.map((arc, index) => {
        const actor = actors[index % Math.max(actors.length, 1)];
        const characterId = normalizeUniverseCharacterKey(arc.name);
        const firstRoadmapEntry = arc.roadmap[0];
        const latestRoadmapEntry = arc.roadmap[arc.roadmap.length - 1];
        return {
            id: characterId,
            characterId,
            name: arc.name,
            actorId: actor?.id || 'UNKNOWN',
            actorName: actor?.name || 'Unknown Actor',
            status: 'ACTIVE' as const,
            fanApproval: 65 + ((index * 7) % 25),
            appearances: arc.roadmap.length,
            firstAppearanceTitle: firstRoadmapEntry?.title,
            latestAppearanceTitle: latestRoadmapEntry?.title,
            description: `${arc.name} is part of the ${template.name} canon.`
        };
    });
};

const createDefaultUniverseFromTemplate = (id: UniverseId): Universe | null => {
    const template = UNIVERSE_TEMPLATES[id];
    if (!template) return null;
    const merchScale = id === 'MCU' ? 1 : id === 'SW' ? 0.78 : 0.58;
    const defaultProducts = [
        {
            id: `${id.toLowerCase()}_legacy_apparel`,
            catalogId: 'merch_apparel',
            name: 'Apparel & Fashion',
            quality: id === 'MCU' ? 92 : id === 'SW' ? 88 : 82,
            productionCost: 0,
            sellingPrice: Math.floor(50_000 * merchScale),
            appeal: id === 'MCU' ? 96 : id === 'SW' ? 91 : 82,
            unitsSold: 0,
            inventory: 0,
            active: true
        },
        {
            id: `${id.toLowerCase()}_legacy_collectibles`,
            catalogId: 'merch_collectibles',
            name: 'Premium Collectibles',
            quality: id === 'MCU' ? 94 : id === 'SW' ? 90 : 84,
            productionCost: 0,
            sellingPrice: Math.floor(350_000 * merchScale),
            appeal: id === 'MCU' ? 97 : id === 'SW' ? 94 : 86,
            unitsSold: 0,
            inventory: 0,
            active: true
        },
        {
            id: `${id.toLowerCase()}_legacy_attraction`,
            catalogId: 'park_ride',
            name: 'Signature Attraction',
            quality: id === 'MCU' ? 93 : id === 'SW' ? 92 : 80,
            productionCost: 0,
            sellingPrice: Math.floor(1_800_000 * merchScale),
            appeal: id === 'MCU' ? 96 : id === 'SW' ? 95 : 82,
            unitsSold: 0,
            inventory: 0,
            active: true
        }
    ];

    return {
        id,
        name: template.name,
        description: `${template.name} canon is active in the global industry.`,
        studioId: template.studioId,
        currentPhase: id === 'MCU' ? 'PHASE_4_MULTIVERSE' : id === 'SW' ? 'PHASE_3_WAR' : 'PHASE_1_ORIGINS',
        saga: id === 'MCU' ? 2 : id === 'SW' ? 3 : 1,
        currentSagaName: id === 'MCU' ? 'Saga 2' : id === 'SW' ? 'Saga 3' : 'Saga 1',
        currentPhaseName: id === 'MCU' ? 'Phase 4 Multiverse' : id === 'SW' ? 'Phase 3 War' : 'Phase 1 Origins',
        momentum: id === 'MCU' ? 85 : id === 'SW' ? 70 : 60,
        brandPower: id === 'MCU' ? 95 : id === 'SW' ? 88 : 75,
        marketShare: id === 'MCU' ? 45 : id === 'SW' ? 30 : 25,
        color: KNOWN_UNIVERSE_COLORS[id] || '#f59e0b',
        roster: getDefaultUniverseRoster(id),
        slate: [],
        products: defaultProducts,
        stats: {
            weeklyRevenue: 0,
            lifetimeRevenue: 0
        },
        weeksUntilNextPhase: id === 'MCU' ? 52 : id === 'SW' ? 156 : 104
    };
};

export const getDefaultUniverseMap = (): Record<UniverseId, Universe> => {
    const universes: Record<UniverseId, Universe> = {} as Record<UniverseId, Universe>;
    (Object.keys(UNIVERSE_TEMPLATES) as UniverseId[]).forEach(id => {
        const universe = createDefaultUniverseFromTemplate(id);
        if (universe) universes[id] = universe;
    });
    return universes;
};

const normalizeUniverseCharacter = (entry: any, universeId: UniverseId, index = 0): UniverseCharacter | null => {
    if (!entry || typeof entry !== 'object') return null;
    const fallbackName = `Character ${index + 1}`;
    const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : fallbackName;
    const characterId = typeof entry.characterId === 'string' && entry.characterId.trim()
        ? entry.characterId.trim()
        : typeof entry.id === 'string' && entry.id.trim()
            ? entry.id.trim()
            : normalizeUniverseCharacterKey(name);
    const actorId = typeof entry.actorId === 'string' && entry.actorId.trim() ? entry.actorId.trim() : 'UNKNOWN';
    const actorName = typeof entry.actorName === 'string' && entry.actorName.trim()
        ? entry.actorName.trim()
        : actorId === 'PLAYER_SELF'
            ? 'Player'
            : 'Unknown Actor';
    const safeStatus = ['ACTIVE', 'RECAST', 'RETIRED'].includes(entry.status) ? entry.status : 'ACTIVE';
    const templateArc = UNIVERSE_TEMPLATES[universeId]?.arcs.find(arc => normalizeUniverseCharacterKey(arc.name) === normalizeUniverseCharacterKey(name));
    const firstRoadmapEntry = templateArc?.roadmap[0];
    const latestRoadmapEntry = templateArc?.roadmap[(templateArc?.roadmap.length || 1) - 1];
    const templateCharacter = getDefaultUniverseRoster(universeId).find(character => normalizeUniverseCharacterKey(character.name) === normalizeUniverseCharacterKey(name));
    const rawAppearances = toFiniteNumber(entry.appearances, NaN);
    const fallbackAppearances = templateArc?.roadmap.length ?? templateCharacter?.appearances ?? (UNIVERSE_TEMPLATES[universeId] ? 1 : 0);
    const appearances = Math.max(
        UNIVERSE_TEMPLATES[universeId] ? 1 : 0,
        Math.round(Number.isFinite(rawAppearances) && rawAppearances > 0 ? rawAppearances : fallbackAppearances)
    );

    return {
        id: typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : characterId,
        characterId,
        name,
        actorId: actorId === 'UNKNOWN' && templateCharacter?.actorId ? templateCharacter.actorId : actorId,
        actorName: /^unknown actor$/i.test(actorName) && templateCharacter?.actorName ? templateCharacter.actorName : actorName,
        status: safeStatus,
        fanApproval: clampNumber(entry.fanApproval ?? entry.appeal, 55, 0, 100),
        roleType: entry.roleType,
        firstAppearanceTitle: isMeaningfulTitle(entry.firstAppearanceTitle) ? entry.firstAppearanceTitle.trim() : firstRoadmapEntry?.title,
        latestAppearanceTitle: isMeaningfulTitle(entry.latestAppearanceTitle) ? entry.latestAppearanceTitle.trim() : latestRoadmapEntry?.title,
        appearances,
        description: typeof entry.description === 'string' ? entry.description : undefined,
        fame: typeof entry.fame === 'number' ? entry.fame : undefined,
        appeal: typeof entry.appeal === 'number' ? entry.appeal : undefined,
        type: typeof entry.type === 'string' ? entry.type : undefined
    };
};

const normalizeUniverseProduct = (product: any, index = 0): any | null => {
    if (!product || typeof product !== 'object') return null;
    const name = typeof product.name === 'string' && product.name.trim() ? product.name.trim() : `License Product ${index + 1}`;
    return {
        ...product,
        id: typeof product.id === 'string' && product.id.trim() ? product.id : `legacy_product_${normalizeUniverseCharacterKey(name)}_${index}`,
        name,
        quality: clampNumber(product.quality, 60, 0, 100),
        productionCost: Math.max(0, toFiniteNumber(product.productionCost, 0)),
        sellingPrice: Math.max(0, toFiniteNumber(product.sellingPrice ?? product.baseRevenue, 0)),
        appeal: clampNumber(product.appeal ?? product.baseAppeal, 50, 0, 100),
        unitsSold: Math.max(0, Math.round(toFiniteNumber(product.unitsSold, 0))),
        inventory: Math.max(0, Math.round(toFiniteNumber(product.inventory, 0))),
        active: product.active !== false
    };
};

export const normalizeUniverseForSave = (raw: any, fallbackId?: UniverseId): Universe => {
    const id = getSafeUniverseId(raw, fallbackId);
    const defaults = createDefaultUniverseFromTemplate(id);
    const template = UNIVERSE_TEMPLATES[id];
    const base = defaults || {
        id,
        name: 'Untitled Universe',
        description: 'A player-created cinematic universe.',
        studioId: 'PLAYER_STUDIO' as StudioId,
        currentPhase: 'PHASE_1_ORIGINS',
        saga: 1,
        currentSagaName: 'Saga 1',
        currentPhaseName: 'Phase 1',
        momentum: 0,
        brandPower: 0,
        marketShare: 0,
        color: '#f59e0b',
        roster: [],
        slate: [],
        products: [],
        stats: { weeklyRevenue: 0, lifetimeRevenue: 0 },
        weeksUntilNextPhase: 104
    };

    const rawRoster = Array.isArray(raw?.roster) ? raw.roster : [];
    const rosterSource = rawRoster.length > 0 ? rawRoster : base.roster;
    const roster = rosterSource
        .map((entry: any, index: number) => normalizeUniverseCharacter(entry, id, index))
        .filter(Boolean) as UniverseCharacter[];

    const rawProducts = Array.isArray(raw?.products) ? raw.products : [];
    const productsSource = rawProducts.length > 0 ? rawProducts : (base.products || []);
    const products = productsSource
        .map((product: any, index: number) => normalizeUniverseProduct(product, index))
        .filter(Boolean) as any[];

    const currentPhase = normalizeUniversePhase(raw?.currentPhase ?? raw?.currentPhaseName ?? base.currentPhase);
    const saga = toFiniteNumber(raw?.saga, toFiniteNumber(base.saga, 1));
    const safeSaga = Number.isFinite(saga) && saga > 0 ? saga : 1;

    return {
        ...base,
        ...raw,
        id,
        name: typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : base.name,
        description: typeof raw?.description === 'string' ? raw.description : base.description,
        studioId: (raw?.studioId || base.studioId || template?.studioId || 'PLAYER_STUDIO') as StudioId,
        currentPhase,
        saga: safeSaga,
        currentSagaName: typeof raw?.currentSagaName === 'string' && raw.currentSagaName.trim() ? raw.currentSagaName : `Saga ${safeSaga}`,
        currentPhaseName: typeof raw?.currentPhaseName === 'string' && raw.currentPhaseName.trim()
            ? raw.currentPhaseName
            : String(currentPhase).replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
        momentum: clampNumber(raw?.momentum, base.momentum, 0, 100),
        brandPower: clampNumber(raw?.brandPower, base.brandPower, 0, 100),
        marketShare: Math.max(0, toFiniteNumber(raw?.marketShare, base.marketShare)),
        color: typeof raw?.color === 'string' && raw.color.trim() ? raw.color : base.color,
        roster,
        slate: Array.isArray(raw?.slate) ? raw.slate.filter((project: any) => project && typeof project === 'object') : [],
        products,
        stats: {
            weeklyRevenue: Math.max(0, toFiniteNumber(raw?.stats?.weeklyRevenue, base.stats?.weeklyRevenue || 0)),
            lifetimeRevenue: Math.max(0, toFiniteNumber(raw?.stats?.lifetimeRevenue, base.stats?.lifetimeRevenue || 0))
        },
        weeksUntilNextPhase: Math.max(1, Math.round(toFiniteNumber(raw?.weeksUntilNextPhase, base.weeksUntilNextPhase || 104)))
    };
};

export const normalizeUniverseMap = (rawUniverses: any): Record<UniverseId, Universe> => {
    const normalized = getDefaultUniverseMap();
    const incoming = rawUniverses && typeof rawUniverses === 'object' && !Array.isArray(rawUniverses) ? rawUniverses : {};

    Object.entries(incoming).forEach(([id, universe]) => {
        const normalizedUniverse = normalizeUniverseForSave(universe, id as UniverseId);
        normalized[normalizedUniverse.id] = normalizedUniverse;
    });

    return normalized;
};

const GENERIC_CAST_ROLE_NAMES = new Set([
    'lead',
    'lead actor',
    'supporting',
    'supporting actor',
    'cast',
    'co-star',
    'costar',
    'cameo',
    'cameo appearance',
    'extra'
]);

export const getFallbackCharacterName = (
    member: Partial<CastMember> | any,
    projectTitle: string,
    index = 0
) => {
    const explicitName = typeof member?.characterName === 'string' ? member.characterName.trim() : '';
    if (explicitName) return explicitName;

    const roleName = typeof member?.roleName === 'string' ? member.roleName.trim() : typeof member?.role === 'string' ? member.role.trim() : '';
    const normalizedRoleName = roleName.toLowerCase();
    if (roleName && !GENERIC_CAST_ROLE_NAMES.has(normalizedRoleName)) return roleName;

    const roleType = String(member?.roleType || '').toUpperCase();
    if (roleType === 'LEAD') return projectTitle || 'Lead Character';
    if (roleType === 'CAMEO') return `${projectTitle || 'Project'} Cameo`;
    if (roleType === 'EXTRA') return `${projectTitle || 'Project'} Extra ${index + 1}`;
    if (roleType === 'SUPPORTING') return `${projectTitle || 'Project'} Supporting ${index + 1}`;

    return projectTitle ? `${projectTitle} Character ${index + 1}` : `Character ${index + 1}`;
};

const normalizeUniverseCastEntries = (castList: CastMember[] | undefined, projectTitle: string, playerName: string): UniverseCharacter[] => {
    if (!Array.isArray(castList)) return [];

    return castList
        .filter(member => member && typeof member === 'object')
        .filter(member => (member.actorId || member.npcId) && member.actorId !== 'UNKNOWN')
        .filter(member => String(member.roleType || 'SUPPORTING') !== 'EXTRA')
        .map((member, index) => {
            const actorId = member.actorId || member.npcId || 'UNKNOWN';
            const actorName = actorId === 'PLAYER_SELF'
                ? playerName
                : (member.name || member.actorName || 'Unknown Actor');
            const name = getFallbackCharacterName(member, projectTitle, index);
            const characterId = member.characterId || `${normalizeUniverseCharacterKey(name)}`;

            return {
                id: characterId,
                characterId,
                name,
                actorId,
                actorName,
                status: 'ACTIVE' as const,
                fanApproval: 50,
                roleType: member.roleType,
                appearances: 1,
                firstAppearanceTitle: projectTitle,
                latestAppearanceTitle: projectTitle,
                description: `Played by ${actorId === 'PLAYER_SELF' ? 'you' : actorName}.`
            };
        });
};

export interface UniverseDashboardProject {
    id: string;
    title: string;
    type: 'MOVIE' | 'SERIES';
    genre?: string;
    budgetTier?: string;
    year: number;
    gross?: number;
    rating?: number;
    subtype?: ProjectSubtype;
    isActive?: boolean;
    universeSagaName?: string;
    universePhaseName?: string;
    castList: CastMember[];
    source: 'PAST' | 'ACTIVE';
}

export const getUniverseDashboardProjects = (
    player: Player,
    universeId: UniverseId,
    activeReleases: ActiveRelease[] = []
): UniverseDashboardProject[] => {
    const pastProjects = (player.pastProjects || [])
        .filter(project => project && ((project.universeId === universeId) || ((project as any).projectDetails?.universeId === universeId)))
        .map(project => ({
            id: project.id,
            title: project.name,
            type: project.projectType,
            genre: project.genre,
            budgetTier: project.budget >= 50_000_000 ? 'BLOCKBUSTER' : project.budget >= 10_000_000 ? 'HIGH' : project.budget >= 3_000_000 ? 'MID' : 'LOW',
            year: project.year || player.age,
            gross: project.gross || 0,
            rating: project.imdbRating || 0,
            subtype: project.subtype || (project as any).projectDetails?.subtype,
            isActive: false,
            universeSagaName: (project as any).universeSagaName || (project as any).projectDetails?.universeSagaName,
            universePhaseName: (project as any).universePhaseName || (project as any).projectDetails?.universePhaseName,
            castList: Array.isArray(project.castList) ? project.castList : [],
            source: 'PAST' as const
        }));

    const activeUniverseProjects = (activeReleases || [])
        .filter(project => project?.projectDetails?.universeId === universeId)
        .map(project => ({
            id: project.id,
            title: project.name,
            type: project.type,
            genre: project.projectDetails?.genre,
            budgetTier: project.projectDetails?.budgetTier,
            year: player.age,
            gross: project.totalGross || 0,
            rating: project.imdbRating || 0,
            subtype: project.projectDetails?.subtype,
            isActive: true,
            universeSagaName: project.projectDetails?.universeSagaName,
            universePhaseName: project.projectDetails?.universePhaseName,
            castList: Array.isArray(project.projectDetails?.castList) ? project.projectDetails.castList : [],
            source: 'ACTIVE' as const
        }));

    return [...pastProjects, ...activeUniverseProjects].sort((a, b) => a.year - b.year);
};

export const buildUniverseRoster = (
    universe: Universe,
    projects: UniverseDashboardProject[],
    playerName: string
): UniverseCharacter[] => {
    const rosterMap = new Map<string, UniverseCharacter>();

    const existingRoster = Array.isArray(universe.roster) && universe.roster.length > 0
        ? universe.roster
        : getDefaultUniverseRoster(universe.id);
    existingRoster.forEach(entry => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
        if (typeof entry.name !== 'string' || typeof entry.actorId !== 'string') return;

        const characterId = entry.characterId || entry.id || normalizeUniverseCharacterKey(entry.name);
        const templateArc = UNIVERSE_TEMPLATES[universe.id]?.arcs.find(arc => normalizeUniverseCharacterKey(arc.name) === normalizeUniverseCharacterKey(entry.name));
        const templateCharacter = getDefaultUniverseRoster(universe.id).find(character => normalizeUniverseCharacterKey(character.name) === normalizeUniverseCharacterKey(entry.name));
        const fallbackAppearances = templateArc?.roadmap.length ?? templateCharacter?.appearances ?? 0;
        const safeAppearances = typeof entry.appearances === 'number' && entry.appearances > 0
            ? entry.appearances
            : fallbackAppearances;
        rosterMap.set(characterId, {
            id: entry.id || characterId,
            characterId,
            name: entry.name,
            actorId: entry.actorId === 'UNKNOWN' && templateCharacter?.actorId ? templateCharacter.actorId : entry.actorId,
            actorName: entry.actorName && !/^unknown actor$/i.test(entry.actorName)
                ? entry.actorName
                : entry.actorId === 'PLAYER_SELF'
                    ? playerName
                    : templateCharacter?.actorName || 'Unknown Actor',
            status: entry.status || 'ACTIVE',
            fanApproval: typeof entry.fanApproval === 'number' ? entry.fanApproval : typeof entry.appeal === 'number' ? entry.appeal : 50,
            roleType: entry.roleType,
            firstAppearanceTitle: isMeaningfulTitle(entry.firstAppearanceTitle) ? entry.firstAppearanceTitle : templateArc?.roadmap[0]?.title,
            latestAppearanceTitle: isMeaningfulTitle(entry.latestAppearanceTitle) ? entry.latestAppearanceTitle : templateArc?.roadmap[(templateArc?.roadmap.length || 1) - 1]?.title,
            appearances: safeAppearances,
            description: entry.description,
            fame: entry.fame,
            appeal: entry.appeal,
            type: entry.type
        });
    });

    projects.forEach(project => {
        normalizeUniverseCastEntries(project.castList, project.title, playerName).forEach(character => {
            const characterKey = character.characterId || character.name;
            const legacyCharacterKey = normalizeUniverseCharacterKey(character.name);
            const existing = rosterMap.get(characterKey) || rosterMap.get(legacyCharacterKey);
            if (existing && characterKey !== legacyCharacterKey) {
                rosterMap.delete(legacyCharacterKey);
            }
            const wasRecast = !!existing && existing.actorId !== character.actorId;
            rosterMap.set(characterKey, {
                ...(existing || {}),
                ...character,
                id: character.id || existing?.id || character.characterId,
                characterId: character.characterId || existing?.characterId,
                status: wasRecast ? 'RECAST' : (existing?.status || character.status),
                fanApproval: Math.max(existing?.fanApproval || 50, character.fanApproval || 50),
                appearances: (existing?.appearances || 0) + 1,
                firstAppearanceTitle: existing?.firstAppearanceTitle || project.title,
                latestAppearanceTitle: project.title,
                description: `Played by ${character.actorId === 'PLAYER_SELF' ? 'you' : character.actorName}.`
            });
        });
    });

    return Array.from(rosterMap.values()).sort((a, b) => {
        const appearanceDelta = (b.appearances || 0) - (a.appearances || 0);
        if (appearanceDelta !== 0) return appearanceDelta;
        return a.name.localeCompare(b.name);
    });
};

export const mergeUniverseRosterWithProject = (
    universe: Universe,
    projectTitle: string,
    castList: CastMember[] | undefined,
    playerName: string
): Universe => {
    const mergedRoster = buildUniverseRoster(
        universe,
        [{
            id: `pending_${projectTitle}`,
            title: projectTitle,
            type: 'MOVIE',
            year: 0,
            castList: Array.isArray(castList) ? castList : [],
            source: 'ACTIVE'
        }],
        playerName
    );

    return {
        ...universe,
        roster: mergedRoster
    };
};

// --- FACTORY ---

export const initUniverses = (): Record<UniverseId, Universe> => {
    return getDefaultUniverseMap();
};

// --- HELPER: CHECK IF TITLE IS RELEASED ---
const isTitleReleased = (player: Player, title: string): boolean => {
    // Check World Projects (NPC Releases)
    if (player.world.projects.some(p => p.title === title)) return true;
    // Check Player's Active Releases
    if (player.activeReleases.some(r => r.name === title)) return true;
    // Check Player's Past Projects
    if (player.pastProjects.some(p => p.name === title)) return true;
    // Check Player's Current Commitments
    if (player.commitments.some(c => c.name === title)) return true;
    
    return false;
};

// --- LOGIC ---

// Used for Cheat Menu mainly now, or rare random event
export const generateDirectEntryOffer = (player: Player, universeId: UniverseId): UniverseContract => {
    const tmpl = UNIVERSE_TEMPLATES[universeId];
    
    // Filter arcs by gender
    const validArcs = tmpl.arcs.filter(arc => {
        if (arc.gender === 'ALL') return true;
        return arc.gender === player.gender;
    });

    // Fallback if no valid arcs (unlikely unless non-binary without ALL options)
    const arc = validArcs.length > 0 ? pick(validArcs) : pick(tmpl.arcs); 

    const films: ContractFilm[] = arc.roadmap.map(step => ({
        title: step.title,
        role: step.role,
        type: step.type,
        weeksOffset: step.offset + 10 // +10 planning buffer
    }));

    return {
        universeId: universeId,
        characterName: arc.name, 
        films: films,
        salaryTotal: 30000000 + (player.stats.fame * 100000),
        fanTrust: 50,
        startWeek: player.currentWeek
    };
};

export const generateRandomUniverseOpportunity = (player: Player, source: 'AGENT'|'DIRECT'): AuditionOpportunity | null => {
    // Only fetch if player isn't already tied to a contract (simulated exclusivity)
    if (player.activeUniverseContract) return null;

    // Pick a random universe
    const uniIds = Object.keys(UNIVERSE_TEMPLATES) as UniverseId[];
    const uniId = pick(uniIds);
    const tmpl = UNIVERSE_TEMPLATES[uniId];

    // FIND VALID ARC ENTRY POINT
    // We want to find an arc where the *next* movie hasn't been released yet.
    // If all movies in an arc are released, that arc is closed for new offers.
    
    // FILTER BY GENDER FIRST
    const validArcs = tmpl.arcs.filter(arc => {
        if (arc.gender === 'ALL') return true;
        return arc.gender === player.gender;
    });

    const validArcOptions: { arcName: string, nextFilm: typeof tmpl.arcs[0]['roadmap'][0] }[] = [];

    validArcs.forEach(arc => {
        // Find first unreleased film in roadmap
        const nextFilm = arc.roadmap.find(film => !isTitleReleased(player, film.title));
        if (nextFilm) {
            validArcOptions.push({ arcName: arc.name, nextFilm });
        }
    });

    if (validArcOptions.length === 0) return null;

    // Pick one valid option
    const selection = pick(validArcOptions);
    const filmDef = selection.nextFilm;

    // Construct Universe Contract starting from this film
    // We need to find the index of this film in the roadmap to get subsequent films
    const fullArc = tmpl.arcs.find(a => a.name === selection.arcName);
    if (!fullArc) return null;

    const startIndex = fullArc.roadmap.findIndex(f => f.title === filmDef.title);
    const remainingRoadmap = fullArc.roadmap.slice(startIndex);

    const films: ContractFilm[] = remainingRoadmap.map(step => ({
        title: step.title,
        role: step.role,
        type: step.type,
        // Recalculate offset relative to now, preserving gaps
        weeksOffset: Math.max(10, step.offset - remainingRoadmap[0].offset + 10) 
    }));

    const contract: UniverseContract = {
        universeId: uniId,
        characterName: selection.arcName,
        films: films,
        salaryTotal: 30000000 + (player.stats.fame * 100000), // Base pay for deal
        fanTrust: 50,
        startWeek: player.currentWeek
    };
    
    // Construct fake project for the opportunity card
    const project = generateProjectDetails('HIGH', 'MOVIE', [], player);
    project.title = filmDef.title;
    project.universeId = uniId;
    project.genre = tmpl.genre;
    project.visibleHype = 'HIGH';
    project.isFamous = true; // Treats as famous for prestige
    
    // Adjust visual label if it's a cameo
    const label = filmDef.role === 'CAMEO' ? 'Universe Cameo' : 'Franchise Lead';
    const energyCost = filmDef.role === 'CAMEO' ? 15 : 40;

    return {
        id: `uni_offer_${Date.now()}`,
        roleType: filmDef.role,
        projectName: project.title,
        genre: project.genre,
        config: { label, difficulty: 70, energyCost, baseIncome: contract.salaryTotal, expGain: 15 },
        project: project,
        estimatedIncome: contract.salaryTotal,
        source: source,
        universeContract: contract,
        royaltyPercentage: 2.0
    };
};

export const calculateUniverseProductWeeklyRevenue = (
    universe: Pick<Universe, 'brandPower' | 'momentum'>,
    product: any
): number => {
    const baseRevenue = typeof product?.sellingPrice === 'number' ? product.sellingPrice : 0;
    if (baseRevenue <= 0) return 0;

    const appeal = typeof product?.appeal === 'number' ? product.appeal : 0;
    const brandBonus = Math.min(0.35, Math.max(0, ((universe.brandPower || 0) - 50) / 250));
    const appealBonus = Math.min(0.25, Math.max(0, (appeal - 50) / 250));
    const momentumBonus = Math.min(0.20, Math.max(0, ((universe.momentum || 0) - 50) / 250));

    // The license card's base revenue is guaranteed. Brand power and momentum only add upside.
    return Math.max(baseRevenue, Math.floor(baseRevenue * (1 + brandBonus + appealBonus + momentumBonus)));
};

// Main processing loop
export const processUniverseTurn = (player: Player, universe: Universe): { universe: Universe, news: NewsItem[], project?: IndustryProject } => {
    const updated = normalizeUniverseForSave(universe, universe?.id);
    const news: NewsItem[] = [];
    let generatedProject: IndustryProject | undefined;

    if (!Array.isArray(updated.products)) updated.products = [];
    if (!updated.stats) {
        updated.stats = {
            weeklyRevenue: 0,
            lifetimeRevenue: 0
        };
    }

    const activeProducts = updated.products.filter((product: any) => product?.active !== false);
    const weeklyLicensingRevenue = activeProducts.reduce((sum, product: any) => {
        const baseRevenue = typeof product?.sellingPrice === 'number' ? product.sellingPrice : 0;
        const productRevenue = calculateUniverseProductWeeklyRevenue(updated, product);

        product.unitsSold = (typeof product.unitsSold === 'number' ? product.unitsSold : 0) + Math.max(1, Math.floor(productRevenue / Math.max(baseRevenue, 1)));
        return sum + Math.max(0, productRevenue);
    }, 0);

    updated.stats.weeklyRevenue = weeklyLicensingRevenue;
    updated.stats.lifetimeRevenue = (updated.stats.lifetimeRevenue || 0) + weeklyLicensingRevenue;

    // 1. Advance Phase Timer
    updated.weeksUntilNextPhase--;
    
    // 2. Phase Shift Logic (Iterative Loop)
    if (updated.weeksUntilNextPhase <= 0) {
        if (updated.currentPhase === 'PHASE_1_ORIGINS') updated.currentPhase = 'PHASE_2_EXPANSION';
        else if (updated.currentPhase === 'PHASE_2_EXPANSION') updated.currentPhase = 'PHASE_3_WAR';
        else if (updated.currentPhase === 'PHASE_3_WAR') updated.currentPhase = 'PHASE_4_MULTIVERSE';
        else {
            // Loop back to Phase 1 but increment Saga
            updated.currentPhase = 'PHASE_1_ORIGINS';
            updated.saga = Number(updated.saga) + 1;
        }
        
        updated.weeksUntilNextPhase = 150 + Math.floor(Math.random() * 50); // Reset timer

        // Generate Slate Announcement
        const phaseTitle = updated.currentPhase.replace(/_/g, ' ').replace('PHASE', `SAGA ${updated.saga} - PHASE`);
        
        news.push({
            id: `uni_news_phase_${Date.now()}`,
            headline: `${updated.name} Unveils ${phaseTitle}!`,
            subtext: `The studio announces the next chapter of the universe at Comic-Con.`,
            category: 'UNIVERSE',
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'HIGH'
        });

        // Chance for Fan Casting Demand if player is famous
        if (player.stats.fame > 50) {
            const char = pick(UNIVERSE_TEMPLATES[updated.id].arcs).name;
            news.push({
                id: `uni_news_fan_${Date.now()}`,
                headline: `Fans Demand ${player.name} as ${char}!`,
                subtext: `#Cast${player.name.replace(/\s+/g,'')} is trending worldwide.`,
                category: 'UNIVERSE',
                week: player.currentWeek,
                year: player.age,
                impactLevel: 'MEDIUM'
            });
        }
    }

    // 3. Random Project Release (Simulated NPC Films for background flavor)
    // Ensures the universe feels alive even if player isn't in it
    // REDUCED FREQUENCY: ~1.5% chance per week (~0.7 films/yr per universe)
    if (Math.random() < 0.015) {
        const tmpl = UNIVERSE_TEMPLATES[updated.id];
        
        // Find an arc that has an unreleased film
        // Exclude player's character if they have a contract
        const validArcs = tmpl.arcs.filter(arc => 
            !player.activeUniverseContract || player.activeUniverseContract.characterName !== arc.name
        );

        // Check roadmap for available films
        const releaseCandidates: { title: string, arcName: string }[] = [];
        
        validArcs.forEach(arc => {
            // Find first unreleased
            const nextUp = arc.roadmap.find(f => !isTitleReleased(player, f.title));
            if (nextUp) {
                releaseCandidates.push({ title: nextUp.title, arcName: arc.name });
            }
        });

        if (releaseCandidates.length > 0) {
            const selected = pick(releaseCandidates);
            
            // NEW: CHECK IF TITLE IS CURRENTLY OFFERED TO PLAYER
            // Prevents race condition where movie releases while sitting in inbox
            const isOffered = player.weeklyOpportunities.auditions.some(a => a.projectName === selected.title) || 
                              player.inbox.some(m => {
                                  const d = m.data as any;
                                  return (d?.opportunity?.projectName === selected.title) || (d?.projectName === selected.title);
                              });

            if (isOffered) {
                // Skip release to avoid conflict
                return { universe: updated, news, project: undefined };
            }

            // Dynamic Title Logic for later sagas to avoid duplicates if roadmap exhausted or reused
            let title = selected.title;
            if (Number(updated.saga) > 1) {
                // If title already exists (from Saga 1), append suffix
                if (isTitleReleased(player, title)) {
                    title = `${title} (Reboot)`;
                }
            }

             generatedProject = {
                id: `uni_proj_${Date.now()}`,
                title: title,
                genre: tmpl.genre,
                studioId: tmpl.studioId,
                budgetTier: 'HIGH',
                quality: 70 + Math.floor(Math.random() * 30),
                boxOffice: 600000000 + Math.floor(Math.random() * 1000000000),
                year: player.age,
                weekReleased: player.currentWeek,
                leadActorId: "NPC", 
                leadActorName: "Famous Star", 
                directorName: "Russo Brothers",
                reviews: "HIT",
                universeId: updated.id
            };
        }
    }

    return { universe: updated, news, project: generatedProject };
};
