import type { NPCActor, WriterStats, WriterTier } from '../types';

export interface WriterNpcProfile extends NPCActor {
    writerSkill: number;
    writerSpeed: number;
    writerStats: WriterStats;
    writerTier: WriterTier;
    languages: string[];
    genres: string[];
}

const profiles = [
    ['mira_sen', 'Mira Sen', 'FEMALE', 'A_LIST', 92, 'PRESTIGE', ['hi', 'en'], ['DRAMA', 'THRILLER']],
    ['elio_varen', 'Elio Varen', 'MALE', 'A_LIST', 90, 'MIXED', ['en', 'it'], ['SCI_FI', 'MYSTERY']],
    ['zara_qadri', 'Zara Qadri', 'FEMALE', 'ESTABLISHED', 84, 'COMMERCIAL', ['en', 'hi'], ['COMEDY', 'ROMANCE']],
    ['ren_ikeda', 'Ren Ikeda', 'NON_BINARY', 'ESTABLISHED', 87, 'PRESTIGE', ['ja', 'en'], ['ANIMATION', 'FANTASY']],
    ['celeste_marceau', 'Celeste Marceau', 'FEMALE', 'A_LIST', 91, 'PRESTIGE', ['fr', 'en'], ['DRAMA', 'CRIME']],
    ['mateo_solis', 'Mateo Solis', 'MALE', 'ESTABLISHED', 82, 'COMMERCIAL', ['es', 'en'], ['ACTION', 'SPORTS']],
    ['amara_ekong', 'Amara Ekong', 'FEMALE', 'ESTABLISHED', 86, 'MIXED', ['en'], ['DOCUMENTARY', 'BIOPIC']],
    ['noor_rahman', 'Noor Rahman', 'NON_BINARY', 'RISING', 78, 'PRESTIGE', ['ur', 'en'], ['MYSTERY', 'THRILLER']],
    ['luca_bellini', 'Luca Bellini', 'MALE', 'ESTABLISHED', 85, 'COMMERCIAL', ['it', 'en'], ['HORROR', 'CRIME']],
    ['anika_bose', 'Anika Bose', 'FEMALE', 'RISING', 79, 'MIXED', ['bn', 'en'], ['ROMANCE', 'MUSICAL']],
    ['ivana_petrov', 'Ivana Petrov', 'FEMALE', 'ESTABLISHED', 83, 'PRESTIGE', ['en'], ['SCI_FI', 'DRAMA']],
    ['tomas_reyes', 'Tomas Reyes', 'MALE', 'RISING', 76, 'COMMERCIAL', ['es', 'en'], ['ADVENTURE', 'SUPERHERO']],
] as const;

export const WRITER_NPC_LIBRARY: WriterNpcProfile[] = profiles.map(([slug, name, gender, tier, skill, prestigeBias, languages, genres]) => ({
    id: `writer_npc_${slug}`,
    name,
    handle: `@${slug}`,
    gender,
    avatar: `https://api.dicebear.com/9.x/adventurer/svg?seed=${slug}`,
    tier,
    prestigeBias,
    openness: 55,
    followers: Math.round(skill * 12_000),
    netWorth: Math.round(skill * 175_000),
    occupation: 'WRITER',
    bio: `Screenwriter working across ${genres.join(' and ').toLowerCase()} stories.`,
    writerSkill: skill,
    writerSpeed: Math.max(0.55, Math.min(1.05, 1.3 - skill / 150)),
    writerStats: { creativity: skill, dialogue: Math.min(100, skill + 2), structure: Math.max(1, skill - 2), pacing: skill },
    writerTier: tier === 'A_LIST' ? 'A_LIST' : 'COMMON',
    languages: [...languages],
    genres: [...genres],
}));

const writerById = new Map(WRITER_NPC_LIBRARY.map(writer => [writer.id, writer]));

export const getWriterNpcById = (id: string): WriterNpcProfile | undefined => writerById.get(id);
