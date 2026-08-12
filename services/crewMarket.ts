import {
    type CrewMarketTier,
    type CrewOccupation,
    type Gender,
    type NPCActor,
    type NPCTier,
    type NPCPrestige,
} from '../types';
import { getGenderedAvatar } from './npcAvatar';

export interface CrewMarketCandidate extends Omit<NPCActor, 'tier'> {
    tier: CrewMarketTier;
    npcTier: NPCTier;
    marketSalary: number;
    baseSalary: number;
    isHeldForProject?: boolean;
}

interface CrewProfile {
    id: string;
    name: string;
    gender: Exclude<Gender, 'ALL'>;
    role: CrewOccupation;
    tier: CrewMarketTier;
    npcTier: NPCTier;
    prestige: NPCPrestige;
    talent: number;
    fame: number;
    salary: number;
    specialties: string[];
    bio: string;
}

const PROFILES: CrewProfile[] = [
    { id: 'crew_dp_deakins', name: 'Roger Deakins', gender: 'MALE', role: 'CINEMATOGRAPHER', tier: 'LEGEND', npcTier: 'ICON', prestige: 'PRESTIGE', talent: 99, fame: 95, salary: 5_200_000, specialties: ['Natural light', 'Visual restraint'], bio: 'A master cinematographer known for precise, story-first images.' },
    { id: 'crew_dp_hoytema', name: 'Hoyte van Hoytema', gender: 'MALE', role: 'CINEMATOGRAPHER', tier: 'LEGEND', npcTier: 'A_LIST', prestige: 'MIXED', talent: 96, fame: 88, salary: 4_600_000, specialties: ['Large format', 'Practical photography'], bio: 'Large-format specialist with a taste for immersive practical images.' },
    { id: 'crew_dp_fraser', name: 'Greig Fraser', gender: 'MALE', role: 'CINEMATOGRAPHER', tier: 'LEGEND', npcTier: 'A_LIST', prestige: 'MIXED', talent: 96, fame: 87, salary: 4_400_000, specialties: ['Epic scale', 'Low light'], bio: 'Builds tactile blockbuster worlds without losing character detail.' },
    { id: 'crew_dp_morrison', name: 'Rachel Morrison', gender: 'FEMALE', role: 'CINEMATOGRAPHER', tier: 'PROFESSIONAL', npcTier: 'ESTABLISHED', prestige: 'PRESTIGE', talent: 92, fame: 72, salary: 2_600_000, specialties: ['Intimate drama', 'Naturalism'], bio: 'Character-focused cinematographer with an intimate visual language.' },
    { id: 'crew_dp_durald', name: 'Autumn Durald Arkapaw', gender: 'FEMALE', role: 'CINEMATOGRAPHER', tier: 'PROFESSIONAL', npcTier: 'ESTABLISHED', prestige: 'MIXED', talent: 91, fame: 73, salary: 2_500_000, specialties: ['Color', 'Genre worlds'], bio: 'Known for bold color, texture, and expressive genre photography.' },
    { id: 'crew_dp_wegner', name: 'Ari Wegner', gender: 'FEMALE', role: 'CINEMATOGRAPHER', tier: 'PROFESSIONAL', npcTier: 'ESTABLISHED', prestige: 'PRESTIGE', talent: 93, fame: 68, salary: 2_350_000, specialties: ['Landscape', 'Psychological drama'], bio: 'Creates patient, psychologically rich frames and striking landscapes.' },
    { id: 'crew_dp_braier', name: 'Natasha Braier', gender: 'FEMALE', role: 'CINEMATOGRAPHER', tier: 'PROFESSIONAL', npcTier: 'ESTABLISHED', prestige: 'PRESTIGE', talent: 90, fame: 64, salary: 2_100_000, specialties: ['Neon', 'Experimental looks'], bio: 'A distinctive visual stylist for nocturnal and unconventional stories.' },
    { id: 'crew_dp_young', name: 'Bradford Young', gender: 'MALE', role: 'CINEMATOGRAPHER', tier: 'PROFESSIONAL', npcTier: 'ESTABLISHED', prestige: 'PRESTIGE', talent: 92, fame: 66, salary: 2_250_000, specialties: ['Shadow', 'Humanist drama'], bio: 'A humanist cinematographer recognized for expressive shadow and intimacy.' },
    { id: 'crew_dp_sen', name: 'Anika Sen', gender: 'FEMALE', role: 'CINEMATOGRAPHER', tier: 'INDIE', npcTier: 'RISING', prestige: 'MIXED', talent: 79, fame: 24, salary: 480_000, specialties: ['Street photography', 'Fast setups'], bio: 'A rising Mumbai-born DP who finds cinematic texture in real locations.' },
    { id: 'crew_dp_okafor', name: 'Nnamdi Okafor', gender: 'MALE', role: 'CINEMATOGRAPHER', tier: 'INDIE', npcTier: 'RISING', prestige: 'PRESTIGE', talent: 76, fame: 18, salary: 390_000, specialties: ['Documentary realism', 'Available light'], bio: 'Documentary-trained cinematographer with a sharp eye for lived-in detail.' },

    { id: 'crew_comp_zimmer', name: 'Hans Zimmer', gender: 'MALE', role: 'COMPOSER', tier: 'LEGEND', npcTier: 'ICON', prestige: 'COMMERCIAL', talent: 98, fame: 99, salary: 4_800_000, specialties: ['Blockbuster themes', 'Hybrid orchestra'], bio: 'Global film composer known for massive themes and hybrid orchestration.' },
    { id: 'crew_comp_goransson', name: 'Ludwig Göransson', gender: 'MALE', role: 'COMPOSER', tier: 'LEGEND', npcTier: 'A_LIST', prestige: 'MIXED', talent: 96, fame: 91, salary: 3_900_000, specialties: ['Genre fusion', 'Rhythmic scores'], bio: 'Genre-fluid composer blending orchestral, electronic, and global sounds.' },
    { id: 'crew_comp_hildur', name: 'Hildur Guðnadóttir', gender: 'FEMALE', role: 'COMPOSER', tier: 'LEGEND', npcTier: 'A_LIST', prestige: 'PRESTIGE', talent: 97, fame: 86, salary: 3_600_000, specialties: ['Psychological tension', 'Cello'], bio: 'Creates deeply physical, psychologically charged scores.' },
    { id: 'crew_comp_rahman', name: 'A.R. Rahman', gender: 'MALE', role: 'COMPOSER', tier: 'LEGEND', npcTier: 'ICON', prestige: 'MIXED', talent: 98, fame: 96, salary: 4_300_000, specialties: ['Melody', 'Global crossover'], bio: 'A celebrated composer whose melodic language crosses cultures and genres.' },
    { id: 'crew_comp_britell', name: 'Nicholas Britell', gender: 'MALE', role: 'COMPOSER', tier: 'PROFESSIONAL', npcTier: 'ESTABLISHED', prestige: 'PRESTIGE', talent: 93, fame: 78, salary: 2_500_000, specialties: ['Prestige drama', 'Elegant themes'], bio: 'A prestige specialist known for elegant, emotionally layered themes.' },
    { id: 'crew_comp_holt', name: 'Natalie Holt', gender: 'FEMALE', role: 'COMPOSER', tier: 'PROFESSIONAL', npcTier: 'ESTABLISHED', prestige: 'MIXED', talent: 89, fame: 67, salary: 1_900_000, specialties: ['Fantasy', 'Electronic orchestra'], bio: 'Combines orchestral storytelling with unusual electronic textures.' },
    { id: 'crew_comp_karpman', name: 'Laura Karpman', gender: 'FEMALE', role: 'COMPOSER', tier: 'PROFESSIONAL', npcTier: 'ESTABLISHED', prestige: 'MIXED', talent: 90, fame: 64, salary: 1_850_000, specialties: ['Superhero', 'Jazz harmony'], bio: 'A versatile composer moving comfortably between spectacle and character.' },
    { id: 'crew_comp_levi', name: 'Mica Levi', gender: 'NON_BINARY', role: 'COMPOSER', tier: 'PROFESSIONAL', npcTier: 'ESTABLISHED', prestige: 'PRESTIGE', talent: 94, fame: 62, salary: 1_750_000, specialties: ['Experimental', 'Unease'], bio: 'An uncompromising composer for daring, unsettling, and intimate films.' },
    { id: 'crew_comp_nair', name: 'Ishaan Nair', gender: 'MALE', role: 'COMPOSER', tier: 'INDIE', npcTier: 'RISING', prestige: 'COMMERCIAL', talent: 78, fame: 26, salary: 420_000, specialties: ['Youth drama', 'Electronic pop'], bio: 'A fast-rising composer with a modern melodic and electronic sound.' },
    { id: 'crew_comp_mori', name: 'Emi Mori', gender: 'FEMALE', role: 'COMPOSER', tier: 'INDIE', npcTier: 'RISING', prestige: 'PRESTIGE', talent: 81, fame: 21, salary: 460_000, specialties: ['Minimalism', 'Animation'], bio: 'A Tokyo-based composer known for delicate themes and unusual instrumentation.' },

    { id: 'crew_lp_chen', name: 'Maya Chen', gender: 'FEMALE', role: 'LINE_PRODUCER', tier: 'LEGEND', npcTier: 'A_LIST', prestige: 'MIXED', talent: 96, fame: 72, salary: 3_800_000, specialties: ['Global shoots', 'Schedule recovery'], bio: 'A veteran line producer trusted with complex international productions.' },
    { id: 'crew_lp_bell', name: 'Marcus Bell', gender: 'MALE', role: 'LINE_PRODUCER', tier: 'LEGEND', npcTier: 'A_LIST', prestige: 'COMMERCIAL', talent: 94, fame: 69, salary: 3_500_000, specialties: ['Tentpoles', 'Vendor control'], bio: 'Keeps large productions moving through disciplined vendor and schedule control.' },
    { id: 'crew_lp_nair', name: 'Priya Nair', gender: 'FEMALE', role: 'LINE_PRODUCER', tier: 'PROFESSIONAL', npcTier: 'ESTABLISHED', prestige: 'MIXED', talent: 91, fame: 48, salary: 1_750_000, specialties: ['Location logistics', 'Crew welfare'], bio: 'Known for calm logistics, fair sets, and difficult location work.' },
    { id: 'crew_lp_alvarez', name: 'Sofia Alvarez', gender: 'FEMALE', role: 'LINE_PRODUCER', tier: 'PROFESSIONAL', npcTier: 'ESTABLISHED', prestige: 'PRESTIGE', talent: 89, fame: 44, salary: 1_500_000, specialties: ['Prestige films', 'Lean budgeting'], bio: 'A resourceful producer who protects ambitious independent filmmaking.' },
    { id: 'crew_lp_okoye', name: 'Chidi Okoye', gender: 'MALE', role: 'LINE_PRODUCER', tier: 'PROFESSIONAL', npcTier: 'ESTABLISHED', prestige: 'COMMERCIAL', talent: 88, fame: 42, salary: 1_450_000, specialties: ['Action units', 'Safety'], bio: 'Action-unit specialist with a reputation for safe, efficient sets.' },
    { id: 'crew_lp_kim', name: 'Daniel Kim', gender: 'MALE', role: 'LINE_PRODUCER', tier: 'PROFESSIONAL', npcTier: 'RISING', prestige: 'MIXED', talent: 84, fame: 31, salary: 1_050_000, specialties: ['Series production', 'Fast turnaround'], bio: 'An organized series producer who excels under tight delivery calendars.' },
    { id: 'crew_lp_haddad', name: 'Leila Haddad', gender: 'FEMALE', role: 'LINE_PRODUCER', tier: 'PROFESSIONAL', npcTier: 'RISING', prestige: 'PRESTIGE', talent: 85, fame: 29, salary: 980_000, specialties: ['Period drama', 'International crews'], bio: 'Balances period detail with multilingual, international production teams.' },
    { id: 'crew_lp_cole', name: 'Jordan Cole', gender: 'NON_BINARY', role: 'LINE_PRODUCER', tier: 'INDIE', npcTier: 'RISING', prestige: 'MIXED', talent: 75, fame: 16, salary: 340_000, specialties: ['Microbudget', 'Local hires'], bio: 'A hands-on indie producer who stretches small budgets without cutting care.' },
    { id: 'crew_lp_reyes', name: 'Mateo Reyes', gender: 'MALE', role: 'LINE_PRODUCER', tier: 'INDIE', npcTier: 'UNKNOWN', prestige: 'COMMERCIAL', talent: 70, fame: 10, salary: 260_000, specialties: ['Commercials', 'Night shoots'], bio: 'A hungry production manager stepping up from commercials and second units.' },
    { id: 'crew_lp_morgan', name: 'Avery Morgan', gender: 'NON_BINARY', role: 'LINE_PRODUCER', tier: 'INDIE', npcTier: 'RISING', prestige: 'PRESTIGE', talent: 78, fame: 19, salary: 390_000, specialties: ['Documentary', 'Remote locations'], bio: 'Documentary-tested producer comfortable with remote and unpredictable shoots.' },

    { id: 'crew_vfx_letteri', name: 'Joe Letteri', gender: 'MALE', role: 'VFX_SUPERVISOR', tier: 'LEGEND', npcTier: 'ICON', prestige: 'COMMERCIAL', talent: 99, fame: 91, salary: 6_500_000, specialties: ['Digital creatures', 'World building'], bio: 'A visual-effects pioneer associated with landmark digital characters and worlds.' },
    { id: 'crew_vfx_muren', name: 'Dennis Muren', gender: 'MALE', role: 'VFX_SUPERVISOR', tier: 'LEGEND', npcTier: 'ICON', prestige: 'COMMERCIAL', talent: 99, fame: 90, salary: 6_200_000, specialties: ['Practical-digital integration', 'Innovation'], bio: 'A foundational effects artist with decades of technical invention.' },
    { id: 'crew_vfx_bennett', name: 'Sara Bennett', gender: 'FEMALE', role: 'VFX_SUPERVISOR', tier: 'LEGEND', npcTier: 'A_LIST', prestige: 'PRESTIGE', talent: 96, fame: 78, salary: 4_800_000, specialties: ['Invisible effects', 'Character work'], bio: 'Specializes in seamless effects that protect performance and story.' },
    { id: 'crew_vfx_franklin', name: 'Paul Franklin', gender: 'MALE', role: 'VFX_SUPERVISOR', tier: 'LEGEND', npcTier: 'A_LIST', prestige: 'MIXED', talent: 97, fame: 82, salary: 5_000_000, specialties: ['Large format', 'Reality bending'], bio: 'Builds complex visual concepts with a strong grounding in photographed reality.' },
    { id: 'crew_vfx_webber', name: 'Tim Webber', gender: 'MALE', role: 'VFX_SUPERVISOR', tier: 'PROFESSIONAL', npcTier: 'ESTABLISHED', prestige: 'MIXED', talent: 94, fame: 76, salary: 3_700_000, specialties: ['Simulation', 'Space'], bio: 'A technical storyteller known for physically convincing simulations.' },
    { id: 'crew_vfx_ceretti', name: 'Stephane Ceretti', gender: 'MALE', role: 'VFX_SUPERVISOR', tier: 'PROFESSIONAL', npcTier: 'ESTABLISHED', prestige: 'COMMERCIAL', talent: 92, fame: 70, salary: 3_300_000, specialties: ['Superhero', 'Creature action'], bio: 'Experienced in effects-heavy action and complex character animation.' },
    { id: 'crew_vfx_rocheron', name: 'Guillaume Rocheron', gender: 'MALE', role: 'VFX_SUPERVISOR', tier: 'PROFESSIONAL', npcTier: 'ESTABLISHED', prestige: 'MIXED', talent: 93, fame: 69, salary: 3_400_000, specialties: ['Destruction', 'Photoreal worlds'], bio: 'Combines large-scale spectacle with careful photographic integration.' },
    { id: 'crew_vfx_iyer', name: 'Kavya Iyer', gender: 'FEMALE', role: 'VFX_SUPERVISOR', tier: 'PROFESSIONAL', npcTier: 'RISING', prestige: 'MIXED', talent: 84, fame: 28, salary: 1_100_000, specialties: ['Virtual production', 'Environment work'], bio: 'A rising virtual-production supervisor focused on efficient environment work.' },
    { id: 'crew_vfx_park', name: 'Min-jun Park', gender: 'MALE', role: 'VFX_SUPERVISOR', tier: 'INDIE', npcTier: 'RISING', prestige: 'PRESTIGE', talent: 79, fame: 20, salary: 620_000, specialties: ['Horror effects', 'Compositing'], bio: 'A resourceful supervisor who makes restrained genre effects feel expensive.' },
    { id: 'crew_vfx_santos', name: 'Camila Santos', gender: 'FEMALE', role: 'VFX_SUPERVISOR', tier: 'INDIE', npcTier: 'RISING', prestige: 'COMMERCIAL', talent: 77, fame: 18, salary: 550_000, specialties: ['Music visuals', 'Stylized effects'], bio: 'A bold young supervisor crossing music visuals into feature filmmaking.' },
];

const LEGACY_CREW_ID_MAP: Record<string, string> = {
    dp_1: 'crew_dp_deakins',
    dp_2: 'crew_dp_hoytema',
    dp_3: 'crew_dp_fraser',
    dp_4: 'crew_dp_sen',
    mus_1: 'crew_comp_zimmer',
    mus_2: 'crew_comp_goransson',
    mus_3: 'crew_comp_hildur',
    mus_4: 'crew_comp_nair',
    lp_1: 'crew_lp_chen',
    lp_2: 'crew_lp_nair',
    lp_3: 'crew_lp_cole',
    vfx_1: 'crew_vfx_muren',
    vfx_2: 'crew_vfx_letteri',
    vfx_3: 'crew_vfx_webber',
    vfx_4: 'crew_vfx_park',
};

export const normalizeCrewSelectionId = (id?: string | null): string | null => {
    if (!id) return null;
    return LEGACY_CREW_ID_MAP[id] || id;
};

const hash = (value: string): number => {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        result ^= value.charCodeAt(index);
        result = Math.imul(result, 16777619);
    }
    return result >>> 0;
};

const avatarFor = (profile: CrewProfile) => getGenderedAvatar(profile.gender, profile.name);

const crewForbesCategory = (role: CrewOccupation): string => ({
    CINEMATOGRAPHER: 'Cinematographer',
    COMPOSER: 'Film Composer',
    LINE_PRODUCER: 'Film Producer',
    VFX_SUPERVISOR: 'VFX Supervisor',
}[role]);

export const CREW_PROFESSIONALS: NPCActor[] = PROFILES.map(profile => ({
    id: profile.id,
    name: profile.name,
    handle: `@${profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
    gender: profile.gender,
    avatar: avatarFor(profile),
    tier: profile.npcTier,
    prestigeBias: profile.prestige,
    openness: profile.tier === 'LEGEND' ? 28 : profile.tier === 'PROFESSIONAL' ? 54 : 78,
    followers: Math.round(Math.max(8_000, profile.fame * profile.fame * 1_250)),
    netWorth: Math.round(profile.salary * (profile.tier === 'LEGEND' ? 18 : profile.tier === 'PROFESSIONAL' ? 9 : 3)),
    occupation: profile.role,
    forbesCategory: crewForbesCategory(profile.role),
    crewRole: profile.role,
    crewTier: profile.tier,
    salary: profile.salary,
    specialties: profile.specialties,
    bio: profile.bio,
    stats: {
        talent: profile.talent,
        fame: profile.fame,
    },
    traits: profile.tier === 'INDIE' ? ['AMBITIOUS', 'WORKAHOLIC'] : ['PROFESSIONAL', 'WORKAHOLIC'],
    potential: Math.max(profile.talent, profile.tier === 'INDIE' ? 88 : profile.talent),
    isIndependent: profile.tier !== 'LEGEND',
}));

export const getCrewMarketAbsoluteWeek = (age: number, week: number): number => (
    (Math.max(1, Math.round(age)) - 1) * 52 + Math.max(1, Math.min(52, Math.round(week)))
);

export const getCrewMarketCycle = (age: number, week: number): number => (
    Math.floor((getCrewMarketAbsoluteWeek(age, week) - 1) / 3)
);

export const getCrewMarketRefreshInWeeks = (age: number, week: number): number => {
    const absoluteWeek = getCrewMarketAbsoluteWeek(age, week);
    return 3 - ((absoluteWeek - 1) % 3);
};

export const getRotatingCrewCandidates = (
    role: CrewOccupation,
    age: number,
    week: number,
    pinnedIds: string[] = [],
    count = 4,
): CrewMarketCandidate[] => {
    const cycle = getCrewMarketCycle(age, week);
    const rolePool = CREW_PROFESSIONALS.filter(npc => npc.crewRole === role);
    const available = rolePool
        .map(npc => ({ npc, score: hash(`${role}:${cycle}:${npc.id}`) }))
        .sort((left, right) => left.score - right.score)
        .slice(0, Math.max(1, count))
        .map(entry => entry.npc);
    const normalizedPinnedIds = pinnedIds
        .map(normalizeCrewSelectionId)
        .filter(Boolean) as string[];
    const pinned = normalizedPinnedIds
        .map(id => rolePool.find(npc => npc.id === id))
        .filter(Boolean) as NPCActor[];
    const combined = [...available, ...pinned].filter((npc, index, entries) => (
        entries.findIndex(candidate => candidate.id === npc.id) === index
    ));

    return combined.map(npc => {
        const baseSalary = Math.max(0, Number(npc.salary || 0));
        const feeShift = ((hash(`${npc.id}:${cycle}:fee`) % 17) - 8) / 100;
        const talentShift = (hash(`${npc.id}:${cycle}:form`) % 7) - 3;
        return {
            ...npc,
            tier: npc.crewTier || 'PROFESSIONAL',
            npcTier: npc.tier,
            baseSalary,
            marketSalary: Math.round(baseSalary * (1 + feeShift) / 10_000) * 10_000,
            salary: Math.round(baseSalary * (1 + feeShift) / 10_000) * 10_000,
            stats: {
                ...npc.stats,
                talent: Math.max(10, Math.min(100, Number(npc.stats?.talent || 50) + talentShift)),
            },
            isHeldForProject: normalizedPinnedIds.includes(npc.id) && !available.some(candidate => candidate.id === npc.id),
        };
    });
};
