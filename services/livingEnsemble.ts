import {
    type BackgroundCastingControl,
    type BackgroundCastingPlan,
    type BackgroundCastingSource,
    type BackgroundEnsembleScale,
    type BackgroundPayStandard,
    type EnsembleCareerRoute,
    type EnsembleCareerStage,
    type EnsembleOriginRole,
    type Genre,
    type Gender,
    type LivingEnsembleCareerSeed,
    type LivingEnsembleState,
    type LivingEnsembleStoryRecord,
    type NPCActor,
    type Player,
    type ProjectDetails,
    type ProjectType,
    type StoryCastShape,
} from '../types';

const STATE_VERSION = 1 as const;
const MAX_DORMANT_SEEDS = 60;
const MAX_STORIES = 40;
const MAX_RECENT_COMBINATIONS = 14;
const QUARTER_WEEKS = 13;

const STAGES: EnsembleCareerStage[] = [
    'UNCREDITED_EXTRA',
    'FEATURED_EXTRA',
    'DAY_PLAYER',
    'MINOR_SPEAKING',
    'SUPPORTING',
    'ESTABLISHED',
];

const FIRST_NAMES: Record<Exclude<Gender, 'ALL'>, string[]> = {
    MALE: ['Aarav', 'Elias', 'Mateo', 'Noah', 'Ravi', 'Theo', 'Jamal', 'Kenji', 'Omar', 'Luca'],
    FEMALE: ['Maya', 'Zara', 'Nina', 'Amara', 'Leila', 'Sofia', 'Iris', 'Mei', 'Tara', 'Alina'],
    NON_BINARY: ['Ari', 'Rowan', 'Sage', 'Remy', 'Kai', 'Noor', 'Alex', 'River', 'Robin', 'Mika'],
};
const LAST_NAMES = ['Shah', 'Bennett', 'Flores', 'Kim', 'Okafor', 'Morgan', 'Reyes', 'Kapoor', 'Diaz', 'Tanaka', 'Cole', 'Haddad'];

const SCALE_BASE: Record<BackgroundEnsembleScale, number> = {
    LEAN: 18,
    STORY_FIT: 56,
    FULL_WORLD: 118,
    EPIC: 230,
};

const PAY_RATE: Record<BackgroundPayStandard, number> = {
    COMPLIANT: 260,
    FAIR_PAY: 430,
    PREMIUM: 760,
    COMMUNITY_SUPPORTED: 145,
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const absoluteWeek = (year: number, week: number) => Math.max(0, (Math.max(1, year) - 1) * 52 + Math.max(1, week));

const hashString = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const seededNumber = (key: string, min: number, max: number): number => {
    if (max <= min) return min;
    return min + (hashString(key) % (max - min + 1));
};

const seededPick = <T,>(items: readonly T[], key: string): T => items[hashString(key) % items.length];

export interface BackgroundCastingContext {
    projectId?: string;
    title?: string;
    genre?: Genre;
    projectType?: ProjectType;
    episodes?: number;
    castShape?: StoryCastShape;
    budget?: number;
    tags?: string[];
}

const getSpecialists = (context: BackgroundCastingContext): string[] => {
    const specialists = new Set<string>();
    const genre = context.genre || 'DRAMA';
    const tags = (context.tags || []).join(' ').toLowerCase();
    if (genre === 'ACTION' || genre === 'SUPERHERO' || genre === 'ADVENTURE') specialists.add('Stunt background');
    if (genre === 'MUSICAL') specialists.add('Dancers');
    if (genre === 'SPORTS') specialists.add('Athletes');
    if (genre === 'CRIME' || genre === 'THRILLER') specialists.add('Drivers');
    if (genre === 'BIOPIC' || genre === 'DOCUMENTARY') specialists.add('Period specialists');
    if (genre === 'SCI_FI' || genre === 'FANTASY') specialists.add('Movement performers');
    if (/hospital|doctor|medical/.test(tags)) specialists.add('Medical workers');
    if (/army|war|soldier/.test(tags)) specialists.add('Military performers');
    if (/dance|club|concert/.test(tags)) specialists.add('Dancers');
    return Array.from(specialists).slice(0, 3);
};

export const buildBackgroundCastingPlan = (
    context: BackgroundCastingContext,
    choices: Partial<Pick<BackgroundCastingPlan, 'scale' | 'source' | 'payStandard' | 'control'>> = {},
): BackgroundCastingPlan => {
    const scale = choices.scale || (
        context.castShape === 'INTIMATE'
            ? 'LEAN'
            : context.castShape === 'ENSEMBLE'
                ? 'FULL_WORLD'
                : context.budget && context.budget >= 100_000_000
                    ? 'EPIC'
                    : 'STORY_FIT'
    );
    const source = choices.source || 'LOCAL';
    const payStandard = choices.payStandard || 'FAIR_PAY';
    const control = choices.control || 'DEPARTMENT';
    const projectType = context.projectType || 'MOVIE';
    const episodes = projectType === 'SERIES' ? Math.max(1, Math.round(context.episodes || 8)) : 1;
    const genreMultiplier = ['ACTION', 'SUPERHERO', 'ADVENTURE', 'MUSICAL', 'SPORTS'].includes(context.genre || 'DRAMA') ? 1.18 : 1;
    const seriesMultiplier = projectType === 'SERIES' ? Math.min(2.25, 0.75 + episodes * 0.11) : 1;
    const performerCount = Math.max(8, Math.round(SCALE_BASE[scale] * genreMultiplier * seriesMultiplier));
    const recurringDayPlayers = projectType === 'SERIES'
        ? Math.max(2, Math.round(performerCount * (scale === 'LEAN' ? 0.08 : 0.12)))
        : Math.max(0, Math.round(performerCount * 0.025));
    const specialistRoles = getSpecialists(context);
    const workDays = projectType === 'SERIES' ? Math.max(3, Math.round(episodes * 0.8)) : scale === 'EPIC' ? 5 : scale === 'FULL_WORLD' ? 4 : 3;
    const sourceCostMultiplier: Record<BackgroundCastingSource, number> = {
        AGENCY: 1.18,
        LOCAL: 0.94,
        OPEN_CALL: 0.82,
        COMMUNITY: 0.72,
        SPECIALIST: 1.35,
    };
    const careOverhead = payStandard === 'PREMIUM' ? 1.22 : payStandard === 'FAIR_PAY' ? 1.12 : payStandard === 'COMMUNITY_SUPPORTED' ? 1.28 : 1.05;
    const specialistCost = specialistRoles.length * Math.max(8_000, performerCount * 110);
    const estimatedCost = Math.round((
        performerCount * PAY_RATE[payStandard] * workDays * sourceCostMultiplier[source] * careOverhead
        + recurringDayPlayers * PAY_RATE[payStandard] * 2
        + specialistCost
    ) / 1_000) * 1_000;

    const sourceEffects: Record<BackgroundCastingSource, { authenticity: number; reliability: number; goodwill: number; discovery: number }> = {
        AGENCY: { authenticity: 4, reliability: 16, goodwill: 0, discovery: 2 },
        LOCAL: { authenticity: 16, reliability: 6, goodwill: 15, discovery: 8 },
        OPEN_CALL: { authenticity: 8, reliability: -5, goodwill: 8, discovery: 18 },
        COMMUNITY: { authenticity: 14, reliability: -10, goodwill: 22, discovery: 10 },
        SPECIALIST: { authenticity: 20, reliability: 12, goodwill: 2, discovery: 6 },
    };
    const payEffects: Record<BackgroundPayStandard, { reliability: number; care: number; goodwill: number; discovery: number }> = {
        COMPLIANT: { reliability: 2, care: 48, goodwill: 0, discovery: 0 },
        FAIR_PAY: { reliability: 10, care: 72, goodwill: 8, discovery: 3 },
        PREMIUM: { reliability: 18, care: 92, goodwill: 12, discovery: 5 },
        COMMUNITY_SUPPORTED: { reliability: -4, care: 62, goodwill: 16, discovery: 4 },
    };
    const sourceEffect = sourceEffects[source];
    const payEffect = payEffects[payStandard];
    const scaleAuthenticity = scale === 'EPIC' ? 16 : scale === 'FULL_WORLD' ? 12 : scale === 'STORY_FIT' ? 8 : 2;

    return {
        version: 1,
        scale,
        source,
        payStandard,
        control,
        performerCount,
        recurringDayPlayers,
        specialistRoles,
        estimatedCost,
        authenticity: clamp(52 + sourceEffect.authenticity + scaleAuthenticity),
        reliability: clamp(54 + sourceEffect.reliability + payEffect.reliability),
        setCare: payEffect.care,
        localGoodwill: clamp(34 + sourceEffect.goodwill + payEffect.goodwill),
        discoveryPotential: clamp(28 + sourceEffect.discovery + payEffect.discovery + (control === 'CUSTOM' ? 5 : control === 'REVIEW' ? 3 : 0)),
    };
};

export const normalizeBackgroundCastingPlan = (
    value: Partial<BackgroundCastingPlan> | null | undefined,
    context: BackgroundCastingContext,
): BackgroundCastingPlan => buildBackgroundCastingPlan(context, {
    scale: ['LEAN', 'STORY_FIT', 'FULL_WORLD', 'EPIC'].includes(String(value?.scale)) ? value?.scale : undefined,
    source: ['AGENCY', 'LOCAL', 'OPEN_CALL', 'COMMUNITY', 'SPECIALIST'].includes(String(value?.source)) ? value?.source : undefined,
    payStandard: ['COMPLIANT', 'FAIR_PAY', 'PREMIUM', 'COMMUNITY_SUPPORTED'].includes(String(value?.payStandard)) ? value?.payStandard : undefined,
    control: ['DEPARTMENT', 'REVIEW', 'CUSTOM'].includes(String(value?.control)) ? value?.control : undefined,
});

export const getBackgroundCastingPlanLabel = (plan: BackgroundCastingPlan): string => {
    const scale = {
        LEAN: 'Lean',
        STORY_FIT: 'Story Fit',
        FULL_WORLD: 'Full World',
        EPIC: 'Epic Scale',
    }[plan.scale];
    const source = {
        AGENCY: 'Agency',
        LOCAL: 'Local casting',
        OPEN_CALL: 'Open call',
        COMMUNITY: 'Community casting',
        SPECIALIST: 'Specialist pool',
    }[plan.source];
    return `${plan.performerCount} performers · ${scale} · ${source}`;
};

const roleFromSpecialist = (label: string): EnsembleOriginRole => {
    if (/stunt|movement/i.test(label)) return 'STUNT_PERFORMER';
    if (/dance/i.test(label)) return 'DANCER';
    if (/driver/i.test(label)) return 'TAXI_DRIVER';
    if (/medical/i.test(label)) return 'MEDICAL_WORKER';
    if (/military/i.test(label)) return 'SOLDIER';
    return 'LOCAL_PERFORMER';
};

const originRoleLabel = (role: EnsembleOriginRole): string => ({
    CROWD_PERFORMER: 'Crowd Performer',
    TAXI_DRIVER: 'Taxi Driver',
    DANCER: 'Background Dancer',
    STUNT_PERFORMER: 'Stunt Performer',
    SOLDIER: 'Background Soldier',
    MEDICAL_WORKER: 'Hospital Worker',
    REPORTER: 'News Reporter',
    CREW_ASSISTANT: 'Set Assistant',
    LOCAL_PERFORMER: 'Local Performer',
}[role]);

const routeForRole = (role: EnsembleOriginRole, key: string): EnsembleCareerRoute => {
    if (role === 'DANCER') return seededPick(['MUSIC_CROSSOVER', 'WORKHORSE', 'BREAKOUT'] as const, key);
    if (role === 'STUNT_PERFORMER' || role === 'SOLDIER') return seededPick(['ACTION', 'WORKHORSE', 'BREAKOUT'] as const, key);
    if (role === 'CREW_ASSISTANT' || role === 'REPORTER') return seededPick(['CREATOR', 'ADVOCATE', 'PRESTIGE'] as const, key);
    return seededPick(['WORKHORSE', 'BREAKOUT', 'PRESTIGE', 'ADVOCATE'] as const, key);
};

export const createLivingEnsembleSeeds = (input: {
    projectId: string;
    projectTitle: string;
    genre: Genre;
    week: number;
    year: number;
    plan: BackgroundCastingPlan;
}): LivingEnsembleCareerSeed[] => {
    const seedCount = input.plan.scale === 'EPIC' ? 3 : input.plan.scale === 'FULL_WORLD' ? 2 : input.plan.discoveryPotential >= 48 ? 2 : 1;
    const originAbsoluteWeek = absoluteWeek(input.year, input.week);
    const generalRoles: EnsembleOriginRole[] = ['CROWD_PERFORMER', 'TAXI_DRIVER', 'REPORTER', 'CREW_ASSISTANT', 'LOCAL_PERFORMER'];
    const roles = [
        ...input.plan.specialistRoles.map(roleFromSpecialist),
        ...generalRoles,
    ];

    return Array.from({ length: seedCount }, (_, index) => {
        const id = `ensemble_${input.projectId}_${index}`;
        const gender = seededPick(['MALE', 'FEMALE', 'NON_BINARY'] as const, `${id}:gender`);
        const name = `${seededPick(FIRST_NAMES[gender], `${id}:first`)} ${seededPick(LAST_NAMES, `${id}:last`)}`;
        const originRole = seededPick(roles, `${id}:origin`);
        const treatmentBase = input.plan.setCare + (input.plan.payStandard === 'PREMIUM' ? 8 : input.plan.payStandard === 'COMMUNITY_SUPPORTED' ? -3 : 0);
        const treatmentScore = clamp(treatmentBase + seededNumber(`${id}:treatment`, -10, 10));
        const potential = seededNumber(`${id}:potential`, 42, 94);
        const discoveryChance = Math.min(9, 2 + Math.round(input.plan.discoveryPotential / 16) + (treatmentScore >= 80 ? 1 : 0));
        return {
            id,
            projectId: input.projectId,
            projectTitle: input.projectTitle,
            projectGenre: input.genre,
            originRole,
            originRoleLabel: originRoleLabel(originRole),
            originWeek: input.week,
            originYear: input.year,
            originAbsoluteWeek,
            name,
            gender,
            talent: seededNumber(`${id}:talent`, 28, 78),
            ambition: seededNumber(`${id}:ambition`, 35, 96),
            professionalism: seededNumber(`${id}:professionalism`, 34, 95),
            potential,
            treatmentScore,
            relationshipWarmth: clamp(treatmentScore - 50 + seededNumber(`${id}:warmth`, -14, 18), -100, 100),
            route: routeForRole(originRole, `${id}:route`),
            currentStage: 'UNCREDITED_EXTRA',
            progress: seededNumber(`${id}:progress`, 0, 14),
            nextReviewAbsoluteWeek: originAbsoluteWeek + QUARTER_WEEKS,
            breakoutEligible: hashString(`${id}:breakout`) % 100 < discoveryChance,
            storyBeatCount: 0,
        };
    });
};

export const normalizeLivingEnsembleState = (value: unknown): LivingEnsembleState => {
    const state = value && typeof value === 'object' ? value as Partial<LivingEnsembleState> : {};
    const seeds = Array.isArray(state.seeds)
        ? state.seeds.flatMap((raw, index) => {
            if (!raw || typeof raw !== 'object') return [];
            const seed = raw as LivingEnsembleCareerSeed;
            const id = String(seed.id || '');
            const projectId = String(seed.projectId || '');
            if (!id || !projectId) return [];
            const currentStage = STAGES.includes(seed.currentStage) ? seed.currentStage : 'UNCREDITED_EXTRA';
            const gender = ['MALE', 'FEMALE', 'NON_BINARY'].includes(String(seed.gender)) ? seed.gender : 'NON_BINARY';
            return [{
                ...seed,
                id,
                projectId,
                projectTitle: String(seed.projectTitle || 'Unknown Project'),
                projectGenre: seed.projectGenre || 'DRAMA',
                originRole: seed.originRole || 'CROWD_PERFORMER',
                originRoleLabel: String(seed.originRoleLabel || 'Crowd Performer'),
                originWeek: Math.max(1, Math.min(52, Math.round(Number(seed.originWeek || 1)))),
                originYear: Math.max(1, Math.round(Number(seed.originYear || 1))),
                originAbsoluteWeek: Math.max(0, Math.round(Number(seed.originAbsoluteWeek || 0))),
                name: String(seed.name || `Project Alumnus ${index + 1}`),
                gender,
                talent: clamp(Number(seed.talent || 40)),
                ambition: clamp(Number(seed.ambition || 50)),
                professionalism: clamp(Number(seed.professionalism || 50)),
                potential: clamp(Number(seed.potential || 50)),
                treatmentScore: clamp(Number(seed.treatmentScore || 50)),
                relationshipWarmth: clamp(Number(seed.relationshipWarmth || 0), -100, 100),
                route: seed.route || 'WORKHORSE',
                currentStage,
                progress: clamp(Number(seed.progress || 0), 0, 140),
                nextReviewAbsoluteWeek: Math.max(0, Math.round(Number(seed.nextReviewAbsoluteWeek || 0))),
                breakoutEligible: Boolean(seed.breakoutEligible),
                storyBeatCount: Math.max(0, Math.min(3, Math.round(Number(seed.storyBeatCount || 0)))),
            }];
        }).slice(-MAX_DORMANT_SEEDS)
        : [];
    const stories = Array.isArray(state.stories)
        ? state.stories.filter(story => (
            story
            && typeof story === 'object'
            && typeof story.id === 'string'
            && typeof story.seedId === 'string'
            && typeof story.projectId === 'string'
        )).slice(-MAX_STORIES)
        : [];
    return {
        version: STATE_VERSION,
        seeds,
        stories,
        registeredProjectIds: Array.isArray(state.registeredProjectIds) ? Array.from(new Set(state.registeredProjectIds.map(String))).slice(-160) : [],
        recentCombinationKeys: Array.isArray(state.recentCombinationKeys) ? state.recentCombinationKeys.map(String).slice(-MAX_RECENT_COMBINATIONS) : [],
        lastProcessedQuarter: Math.max(0, Math.round(Number(state.lastProcessedQuarter || 0))),
    };
};

const contextFromProject = (id: string, title: string, details: ProjectDetails): BackgroundCastingContext => ({
    projectId: id,
    title,
    genre: details.genre,
    projectType: details.type,
    episodes: details.episodes,
    castShape: details.storyCompass?.castShape,
    budget: details.estimatedBudget,
});

const registerCurrentProjects = (player: Player, state: LivingEnsembleState): LivingEnsembleState => {
    const registered = new Set(state.registeredProjectIds);
    const candidates = (player.commitments || []).flatMap(commitment => commitment.projectDetails
        ? [{ id: commitment.id, title: commitment.name, details: commitment.projectDetails }]
        : []
    );
    let seeds = [...state.seeds];
    candidates.forEach(candidate => {
        if (registered.has(candidate.id)) return;
        const context = contextFromProject(candidate.id, candidate.title, candidate.details);
        const plan = normalizeBackgroundCastingPlan(candidate.details.backgroundCastingPlan, context);
        seeds.push(...createLivingEnsembleSeeds({
            projectId: candidate.id,
            projectTitle: candidate.title,
            genre: candidate.details.genre,
            week: player.currentWeek,
            year: player.age,
            plan,
        }));
        registered.add(candidate.id);
    });
    return {
        ...state,
        seeds: seeds.slice(-MAX_DORMANT_SEEDS),
        registeredProjectIds: Array.from(registered).slice(-160),
    };
};

const relationshipLabel = (seed: LivingEnsembleCareerSeed): 'GRATEFUL' | 'PROFESSIONAL' | 'RESENTFUL' => (
    seed.relationshipWarmth >= 24 ? 'GRATEFUL' : seed.relationshipWarmth <= -18 ? 'RESENTFUL' : 'PROFESSIONAL'
);

const buildCombinationKey = (seed: LivingEnsembleCareerSeed, stage: EnsembleCareerStage, frame: string): string => (
    [seed.originRole, seed.route, relationshipLabel(seed), stage, seed.projectGenre, frame].join(':')
);

const selectStoryFrame = (seed: LivingEnsembleCareerSeed, stage: EnsembleCareerStage, recent: string[]): { frame: string; key: string } => {
    const frames = stage === 'MINOR_SPEAKING'
        ? ['FIRST_BREAK', 'REMEMBERED_SET', 'UNEXPECTED_AUDITION']
        : stage === 'SUPPORTING'
            ? ['REUNION_CASTING', 'RIVAL_PROJECT', 'MENTOR_CREDIT', 'FULL_CIRCLE']
            : ['AWARD_SPEECH', 'STAR_RIVAL', 'STUDIO_RETURN', 'INDUSTRY_ADVOCATE'];
    for (let offset = 0; offset < frames.length; offset += 1) {
        const frame = frames[(hashString(`${seed.id}:${stage}`) + offset) % frames.length];
        const key = buildCombinationKey(seed, stage, frame);
        if (!recent.includes(key)) return { frame, key };
    }
    const frame = seededPick(frames, `${seed.id}:${stage}:fallback`);
    return { frame, key: buildCombinationKey(seed, stage, frame) };
};

const stageLabel = (stage: EnsembleCareerStage): string => ({
    UNCREDITED_EXTRA: 'uncredited performer',
    FEATURED_EXTRA: 'featured extra',
    DAY_PLAYER: 'day player',
    MINOR_SPEAKING: 'speaking-role actor',
    SUPPORTING: 'supporting actor',
    ESTABLISHED: 'established star',
}[stage]);

const buildStoryCopy = (
    seed: LivingEnsembleCareerSeed,
    stage: EnsembleCareerStage,
    frame: string,
): { headline: string; subtext: string } => {
    const relationship = relationshipLabel(seed);
    const origin = `${seed.originRoleLabel} in "${seed.projectTitle}"`;
    const warmLine = relationship === 'GRATEFUL'
        ? `They still credit the respectful set experience with giving them confidence to continue.`
        : relationship === 'RESENTFUL'
            ? `They remember the production as a hard lesson—and are not sentimental about returning.`
            : `They remember the job as one early step in a long, professional climb.`;
    const routeLine: Record<EnsembleCareerRoute, string> = {
        WORKHORSE: 'Years of dependable small jobs built the career quietly.',
        BREAKOUT: 'One sharp audition turned steady work into a sudden breakthrough.',
        PRESTIGE: 'A run of demanding independent roles changed how the industry saw them.',
        ACTION: 'Stunt discipline and screen presence opened a route into action roles.',
        MUSIC_CROSSOVER: 'Performance work crossed into music, dance, and then larger screen roles.',
        CREATOR: 'Set experience eventually led them to create and lead their own work.',
        ADVOCATE: 'They became as known for improving working conditions as for performing.',
    };
    const headlines: Record<string, string> = {
        FIRST_BREAK: `${seed.name} lands a first speaking role`,
        REMEMBERED_SET: `A familiar face from "${seed.projectTitle}" moves up`,
        UNEXPECTED_AUDITION: `${seed.name}'s long-shot audition pays off`,
        REUNION_CASTING: `${seed.name} returns to the conversation—this time for a real role`,
        RIVAL_PROJECT: `Former ${seed.originRoleLabel.toLowerCase()} ${seed.name} joins a rival production`,
        MENTOR_CREDIT: `${seed.name} credits an early set for opening the door`,
        FULL_CIRCLE: `From ${seed.originRoleLabel.toLowerCase()} to supporting actor`,
        AWARD_SPEECH: `${seed.name}'s rise traces back to "${seed.projectTitle}"`,
        STAR_RIVAL: `${seed.name} is now competing for the same leading roles`,
        STUDIO_RETURN: `${seed.name} wants a full-circle return to your studio`,
        INDUSTRY_ADVOCATE: `${seed.name} turns early set experience into industry influence`,
    };
    return {
        headline: headlines[frame] || `${seed.name}'s career takes another step`,
        subtext: `First appeared as ${origin}. Now a ${stageLabel(stage)}. ${routeLine[seed.route]} ${warmLine}`,
    };
};

const createPromotedNpc = (seed: LivingEnsembleCareerSeed, stage: EnsembleCareerStage): NPCActor => {
    const npcId = seed.promotedNpcId || `npc_alumni_${seed.id}`;
    const fameByStage: Record<EnsembleCareerStage, number> = {
        UNCREDITED_EXTRA: 1,
        FEATURED_EXTRA: 3,
        DAY_PLAYER: 8,
        MINOR_SPEAKING: 16,
        SUPPORTING: 34,
        ESTABLISHED: 62,
    };
    return {
        id: npcId,
        name: seed.name,
        handle: `@${seed.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
        gender: seed.gender,
        avatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(seed.name)}`,
        tier: stage === 'ESTABLISHED' ? 'ESTABLISHED' : stage === 'SUPPORTING' ? 'RISING' : 'INDIE',
        prestigeBias: seed.route === 'PRESTIGE' ? 'PRESTIGE' : seed.route === 'ACTION' || seed.route === 'MUSIC_CROSSOVER' ? 'COMMERCIAL' : 'MIXED',
        openness: clamp(52 + Math.round(seed.relationshipWarmth / 2)),
        followers: Math.round(12_000 * Math.max(1, fameByStage[stage] / 8)),
        netWorth: Math.round(80_000 + fameByStage[stage] * 42_000),
        occupation: 'ACTOR',
        bio: `Project alumnus. First appeared as ${seed.originRoleLabel} in "${seed.projectTitle}".`,
        age: seededNumber(`${seed.id}:age`, 22, 38) + Math.max(0, Math.floor((seed.nextReviewAbsoluteWeek - seed.originAbsoluteWeek) / 52)),
        stats: {
            talent: clamp(seed.talent + STAGES.indexOf(stage) * 4),
            fame: fameByStage[stage],
        },
        traits: [
            seed.professionalism >= 72 ? 'PROFESSIONAL' : 'EASY_GOING',
            seed.ambition >= 76 ? 'AMBITIOUS' : 'WORKAHOLIC',
        ],
        potential: seed.potential,
        isIndependent: seed.relationshipWarmth < 15,
    };
};

export const processLivingEnsembleWeek = (player: Player): Player => {
    const currentAbsoluteWeek = absoluteWeek(player.age, player.currentWeek);
    let commitmentPlansChanged = false;
    const commitments = (player.commitments || []).map(commitment => {
        if (!commitment.projectDetails || commitment.projectDetails.backgroundCastingPlan) return commitment;
        commitmentPlansChanged = true;
        return {
            ...commitment,
            projectDetails: {
                ...commitment.projectDetails,
                backgroundCastingPlan: buildBackgroundCastingPlan(contextFromProject(commitment.id, commitment.name, commitment.projectDetails)),
            },
        };
    });
    const workingPlayer = commitmentPlansChanged ? { ...player, commitments } : player;
    let state = registerCurrentProjects(workingPlayer, normalizeLivingEnsembleState(workingPlayer.flags?.livingEnsembleState));
    const currentQuarter = Math.floor(currentAbsoluteWeek / QUARTER_WEEKS);
    if (currentQuarter <= state.lastProcessedQuarter) {
        return { ...workingPlayer, flags: { ...workingPlayer.flags, livingEnsembleState: state } };
    }

    const extraNPCs = Array.isArray(workingPlayer.flags?.extraNPCs) ? [...workingPlayer.flags.extraNPCs] : [];
    const stories = [...state.stories];
    const recentCombinationKeys = [...state.recentCombinationKeys];
    const news = [...(workingPlayer.news || [])];
    const inbox = [...(workingPlayer.inbox || [])];

    const seeds = state.seeds.map(seed => {
        if (seed.retired || seed.nextReviewAbsoluteWeek > currentAbsoluteWeek) return seed;
        const quartersDue = Math.max(1, Math.min(4, Math.floor((currentAbsoluteWeek - seed.nextReviewAbsoluteWeek) / QUARTER_WEEKS) + 1));
        const careerAgeWeeks = currentAbsoluteWeek - seed.originAbsoluteWeek;
        const progressGain = seededNumber(`${seed.id}:${currentQuarter}:progress`, 3, 9)
            + Math.round(seed.ambition / 30)
            + Math.round(seed.professionalism / 38);
        let progress = seed.progress + progressGain * quartersDue;
        let stageIndex = STAGES.indexOf(seed.currentStage);
        const advanceChance = clamp(4 + seed.potential * 0.07 + progress * 0.08, 4, 24);
        const advanceRoll = hashString(`${seed.id}:${currentQuarter}:advance`) % 100;
        const canAdvance = progress >= 100 || advanceRoll < advanceChance;
        const maxStage = seed.breakoutEligible ? STAGES.length - 1 : 2;
        if (canAdvance && stageIndex < maxStage) {
            stageIndex += 1;
            progress = Math.max(0, progress - 68);
        }
        const currentStage = STAGES[stageIndex];
        const shouldRetire = !seed.breakoutEligible && careerAgeWeeks >= seededNumber(`${seed.id}:retire`, 260, 520);
        let nextSeed: LivingEnsembleCareerSeed = {
            ...seed,
            currentStage,
            progress: clamp(progress, 0, 140),
            nextReviewAbsoluteWeek: currentAbsoluteWeek + QUARTER_WEEKS,
            retired: shouldRetire || seed.retired,
        };

        const reachedStoryStage = seed.breakoutEligible
            && currentStage !== seed.currentStage
            && stageIndex >= STAGES.indexOf('MINOR_SPEAKING')
            && nextSeed.storyBeatCount < 3
            && currentAbsoluteWeek - (nextSeed.lastStoryAbsoluteWeek || 0) >= 39;
        if (!reachedStoryStage) return nextSeed;

        const selectedFrame = selectStoryFrame(nextSeed, currentStage, recentCombinationKeys);
        const copy = buildStoryCopy(nextSeed, currentStage, selectedFrame.frame);
        const npc = createPromotedNpc(nextSeed, currentStage);
        const existingNpcIndex = extraNPCs.findIndex(candidate => candidate.id === npc.id);
        if (existingNpcIndex >= 0) extraNPCs[existingNpcIndex] = { ...extraNPCs[existingNpcIndex], ...npc };
        else extraNPCs.push(npc);

        const story: LivingEnsembleStoryRecord = {
            id: `alumni_story_${nextSeed.id}_${currentQuarter}_${nextSeed.storyBeatCount}`,
            seedId: nextSeed.id,
            projectId: nextSeed.projectId,
            npcId: npc.id,
            combinationKey: selectedFrame.key,
            headline: copy.headline,
            subtext: copy.subtext,
            absoluteWeek: currentAbsoluteWeek,
            year: player.age,
            week: player.currentWeek,
        };
        stories.push(story);
        recentCombinationKeys.push(selectedFrame.key);
        news.unshift({
            id: story.id,
            headline: story.headline,
            subtext: story.subtext,
            category: 'INDUSTRY',
            week: player.currentWeek,
            year: player.age,
            impactLevel: currentStage === 'ESTABLISHED' ? 'HIGH' : 'MEDIUM',
            projectId: nextSeed.projectId,
        });
        inbox.unshift({
            id: `message_${story.id}`,
            sender: 'Casting Office',
            subject: 'Project Alumni Update',
            text: story.subtext,
            type: 'TEXT',
            data: {
                kind: 'PROJECT_ALUMNI',
                storyId: story.id,
                projectId: nextSeed.projectId,
                npcId: npc.id,
                originRole: nextSeed.originRoleLabel,
                careerStage: currentStage,
                relationshipWarmth: nextSeed.relationshipWarmth,
            },
            isRead: false,
            weekSent: player.currentWeek,
        });
        nextSeed = {
            ...nextSeed,
            promotedNpcId: npc.id,
            storyBeatCount: nextSeed.storyBeatCount + 1,
            lastStoryAbsoluteWeek: currentAbsoluteWeek,
        };
        return nextSeed;
    });

    state = {
        ...state,
        seeds: seeds.filter(seed => !seed.retired || currentAbsoluteWeek - seed.originAbsoluteWeek < 624).slice(-MAX_DORMANT_SEEDS),
        stories: stories.slice(-MAX_STORIES),
        recentCombinationKeys: recentCombinationKeys.slice(-MAX_RECENT_COMBINATIONS),
        lastProcessedQuarter: currentQuarter,
    };
    return {
        ...workingPlayer,
        news: news.slice(0, 80),
        inbox: inbox.slice(0, 120),
        flags: {
            ...workingPlayer.flags,
            extraNPCs: extraNPCs.slice(-240),
            livingEnsembleState: state,
        },
    };
};

export const getProjectAlumniStories = (player: Pick<Player, 'flags'>, projectId: string): LivingEnsembleStoryRecord[] => (
    normalizeLivingEnsembleState(player.flags?.livingEnsembleState).stories
        .filter(story => story.projectId === projectId)
        .sort((left, right) => right.absoluteWeek - left.absoluteWeek)
);
