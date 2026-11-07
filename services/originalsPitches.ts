import type {
    Genre,
    NPCActor,
    OwnedStreamingOriginalPitch,
    OwnedStreamingOriginalPitchState,
    Player,
    ProjectConcept,
    RoleType,
    Script,
} from '../types';
import { getRotatingCrewCandidates } from './crewMarket';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getBestEffectsMix, getVisualStyleQuality } from './greenlightSetupEffects';
import { getAbsoluteWeek } from './legacyLogic';
import { getBuiltinUnknownId, isCastableActor, NPC_DATABASE } from './npcLogic';
import { isKnownDeceasedNpc } from './npcRetention';
import { getNextPaidScoutPrice } from './paidMarketScouting';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { fillPitchStory, getPitchLeadGender, getPitchStoryFrame, PITCH_STORY_FRAMES, type PitchStoryFrame } from './originalsPitchStories';
import { getOriginalsStudios, type OriginalsStudioCard } from './originalsStudios';
import { PRODUCTION_LOCATION_CATALOG } from './productionLocations';
import { allocateProjectTitle, createProjectTitleReservations } from './projectTitleGeneration';
import { getStreamingMarketCycle } from './streamingMarketSupply';
import { calculateActorRoleSalary, calculateDirectorProjectSalary } from './talentService';
import { suggestCharacterIdentity } from './characterIdentityLogic';
import { WRITER_NPC_LIBRARY } from './writerNpcLibrary';
import { passedRecordOf } from './originalsRivals';

/**
 * #279: studios come to the platform with something to make. A pitch is a Script and a ProjectConcept, the objects the Greenlight wizard
 * already reads, so a pitched title goes through the same wizard and engine as anything else. A new set every 3 weeks, like the Script Market.
 * They are built at the weekly close, never on a tap, and at most 5 are alive in a save.
 */

export const ORIGINAL_PITCHES_LIVE_MAX = 5;

const FIRST_NAMES = ['Nadia', 'Marcus', 'Elena', 'Jonah', 'Priya', 'Tomas', 'Sana', 'Owen', 'Lena', 'Ezra', 'Mina', 'Paul', 'Ari', 'Natalie', 'Theo', 'Ruth', 'Kofi', 'Ines', 'Dara', 'Luca', 'Yuki', 'Amara', 'Rafael', 'Hana', 'Simon', 'Clara', 'Dev', 'Ivy', 'Omar', 'Greta'];
const FEMALE_NAMES = new Set(['Nadia', 'Elena', 'Priya', 'Sana', 'Lena', 'Mina', 'Natalie', 'Ruth', 'Ines', 'Dara', 'Yuki', 'Amara', 'Hana', 'Clara', 'Ivy', 'Greta']);
const SURNAMES = ['Bell', 'Voss', 'Khan', 'Ortiz', 'Hart', 'Drake', 'Holtz', 'Renner', 'Cho', 'Wegner', 'Okafor', 'Silva', 'Marsh', 'Novak', 'Rao', 'Adler', 'Fenn', 'Ito', 'Lindqvist', 'Mercer', 'Hale', 'Costa', 'Vale', 'Reyes', 'Blake'];

const pick = <T,>(list: readonly T[], rng: () => number): T => list[Math.floor(rng() * list.length) % list.length];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const characterName = (rng: () => number, gender: string | undefined): string => {
    const firsts = FIRST_NAMES.filter(name => (gender === 'FEMALE' ? FEMALE_NAMES.has(name) : gender === 'MALE' ? !FEMALE_NAMES.has(name) : true));
    return `${pick(firsts, rng)} ${pick(SURNAMES, rng)}`;
};

/** A company's size decides who comes to it, and how big they pitch: a small service gets the smaller studios */
const getPitchScale = (player: Player): { subscribers: number; treasury: number; budgetCeilingMillions: number; canAttractMajors: boolean } => {
    const platform = player.ownedStreamingPlatform;
    const subscribers = Number(platform?.metrics?.subscribers || 0);
    const treasury = Number(platform?.treasuryCash || 0);
    const big = subscribers >= 2_000_000 || treasury >= 400_000_000;
    return {
        subscribers,
        treasury,
        canAttractMajors: big || treasury >= 120_000_000,
        budgetCeilingMillions: clamp((treasury / 1_000_000) * 0.45, 8, big ? 220 : 90),
    };
};


/**
 * #313: what a film of this kind usually costs, against the studio's normal size. A documentary is not a superhero film.
 */
const GENRE_BUDGET: Record<string, number> = {
    DOCUMENTARY: 0.2, HORROR: 0.4, ROMANCE: 0.45, COMEDY: 0.5, DRAMA: 0.5, BIOPIC: 0.55, MYSTERY: 0.6,
    THRILLER: 0.65, CRIME: 0.65, SPORTS: 0.65, WESTERN: 0.7, MUSICAL: 0.8, WAR: 0.9, HISTORICAL: 0.85, ANIMATION: 0.9,
    ACTION: 1.1, ADVENTURE: 1.1, FANTASY: 1.2, SCI_FI: 1.2, SUPERHERO: 1.4,
};

/** A studio's usual big project, $M, from the money it really has: $18M of cash makes about $9M, $700M about $60M, $6.5B about $180M */
export const getStudioUsualBudget = (cashMillions: number): number => Math.max(8, Math.min(190, 2.2 * Math.sqrt(Math.max(0, cashMillions))));

/** The person whose price is nearest what this part can pay, with some luck among the nearest few. Everyone comes from the NPC world. */
const pickByPrice = <T extends { id: string; gender?: string },>(
    people: T[],
    priceOf: (person: T) => number,
    target: number,
    rng: () => number,
    used: Set<string>,
    gender?: string | null,
    weight?: (person: T) => number,
    nearestFew = 5,
): T | null => {
    const free = people.filter(person => !used.has(person.id));
    const open = gender ? free.filter(person => person.gender === gender) : free;
    const pool = open.length ? open : free;
    if (!pool.length) return null;
    const distance = (person: T) => Math.abs(Math.log((priceOf(person) + 50_000) / (target + 50_000))) - (weight ? weight(person) : 0);
    const nearest = pool.map(person => ({ person, score: distance(person) })).sort((a, b) => a.score - b.score || a.person.id.localeCompare(b.person.id));
    return nearest[Math.min(nearest.length - 1, Math.floor(rng() * Math.min(nearestFew, nearest.length)))].person;
};

const CREW_ROLES = [
    { key: 'cinematographer', role: 'CINEMATOGRAPHER' },
    { key: 'composer', role: 'COMPOSER' },
    { key: 'lineProducer', role: 'LINE_PRODUCER' },
    { key: 'vfx', role: 'VFX_SUPERVISOR' },
] as const;

const VISUAL_STYLES = ['REALISTIC', 'STYLISTIC', 'GRITTY', 'VIBRANT', 'MINIMALIST', 'NOIR'];

const buildPitch = (
    player: Player,
    studio: OriginalsStudioCard,
    index: number,
    cycle: number,
    ordinal: number,
    absoluteWeek: number,
    budgetCeilingMillions: number,
    reservedTitles: Set<string>,
    busyPeople: Set<string> = new Set<string>(),
): OwnedStreamingOriginalPitch => {
    const seed = `${player.id}:original-pitch:v1:${cycle}:${ordinal}:${index}:${studio.id}`;
    const rng = createDeterministicRng(seed);
    const raw: any = player.world.studios?.[studio.id] || {};
    const ai = raw.ai || {};

    /* what it wants to make: mostly what it knows */
    const known = studio.record.genres.length ? studio.record.genres : [];
    const allGenres = Object.keys(PITCH_STORY_FRAMES) as Genre[];
    const fromRecord = allGenres.filter(genre => known.some(label => label.toLowerCase().replace(/[^a-z]/g, '') === genre.toLowerCase().replace(/[^a-z]/g, '')));
    const genre = fromRecord.length && rng() < 0.6 ? pick(fromRecord, rng) : pick(allGenres, rng);
    const frameIndex = Math.floor(rng() * 1000);
    const frame: PitchStoryFrame = getPitchStoryFrame(genre, frameIndex);
    const projectType: 'SERIES' | 'MOVIE' = rng() < 0.72 ? 'SERIES' : 'MOVIE';
    const episodes = projectType === 'SERIES' ? pick([6, 8, 8, 8, 10, 10, 12], rng) : undefined;
    const format = genre === 'ANIMATION' ? 'ANIMATED' as const : 'LIVE_ACTION' as const;
    const title = allocateProjectTitle(reservedTitles, rng, genre);
    reservedTitles.add(title.toLowerCase());

    /* the script */
    const development = Number(ai.competence?.development ?? studio.creative);
    /* #301: pitches differ, whoever brings them. About one in four is shaky, about one in seven is a real find, and it shows in the script and the whole team */
    const fortuneRoll = rng();
    const fortune = fortuneRoll < 0.26 ? -1 : fortuneRoll > 0.86 ? 1 : 0;
    const quality = Math.round(clamp(studio.creative * 0.3 + development * 0.12 + rng() * 30 + fortune * 14, 22, 92));

    /* #313: the brain. The studio looks at its money, its appetite and the kind of story, and budgets the project first. Everything after is filled to fit that budget. */
    const appetite = Number(ai.profile?.budgetAppetite ?? 50);
    const usualBudget = getStudioUsualBudget(Number(raw.cashReserve || 0));
    const budgetAim = Math.round(clamp(
        usualBudget * (GENRE_BUDGET[genre] ?? 0.7) * (0.8 + appetite / 250) * (0.6 + rng() * 0.65) * (projectType === 'SERIES' ? 0.9 : 1),
        10,
        Math.max(10, budgetCeilingMillions),
    ));
    const budget = budgetAim * 1_000_000;
    /* the people who can write this kind of story, at about the level of this script */
    const genreWriters = WRITER_NPC_LIBRARY.filter(item => item.genres.includes(genre));
    const writer = pickByPrice(genreWriters.length ? genreWriters : WRITER_NPC_LIBRARY, item => Number(item.writerSkill || 50) * 100_000, quality * 100_000, rng, new Set<string>())!;

    /* the team, from the people of the NPC world */
    const extras = (player.flags?.extraNPCs || []) as NPCActor[];
    const everyone: NPCActor[] = [...new Map<string, NPCActor>([...(NPC_DATABASE as NPCActor[]), ...extras].map(person => [person.id, person])).values()];
    const actors = everyone.filter(isCastableActor).filter(actor => !isKnownDeceasedNpc(player, actor.id));
    const directors = everyone.filter(person => person.occupation === 'DIRECTOR' && !isKnownDeceasedNpc(player, person.id));
    const used = new Set<string>(busyPeople);
    /* a good name wants a project it knows, and a studio with pull can get better people for the money */
    const pull = 0.75 + (studio.starPull / 100) * 0.5;
    const knowsGenre = (person: NPCActor) => ((person.stats?.genreXP as any)?.[genre] || 0) >= 60 ? 0.35 : 0;
    const director = pickByPrice<NPCActor>(directors, calculateDirectorProjectSalary, budget * 0.045 * pull, rng, used, null, person => knowsGenre(person) + fortune * (Number(person.stats?.talent || 50) - 60) * 0.012);
    if (director) used.add(director.id);
    const leadGender = getPitchLeadGender(frame);
    const castBudget = budget * (0.17 + rng() * 0.1) * pull;
    const leadPrice = (actor: NPCActor) => calculateActorRoleSalary(actor, 'LEAD', 0);
    const lead = pickByPrice<NPCActor>(actors, leadPrice, castBudget * 0.5, rng, used, leadGender, knowsGenre);
    if (lead) used.add(lead.id);
    const heroName = characterName(rng, lead?.gender);
    const compass = {
        ...frame.compass,
        flexibility: 'ADAPTABLE' as const,
        source: 'SCRIPT_DNA' as const,
        confidence: 80,
    };
    /* how many named parts this story and this money carry. A documentary has few. Nothing else is two people. */
    const shapeRoles = frame.compass.castShape === 'INTIMATE' ? 3 : frame.compass.castShape === 'ENSEMBLE' ? 5 : 4;
    const roleCount = genre === 'DOCUMENTARY' ? 2 : Math.min(7, shapeRoles + (budgetAim >= 60 ? 1 : 0) + (budgetAim >= 120 ? 1 : 0) + (projectType === 'SERIES' ? 1 : 0));
    const castList: ProjectConcept['castList'] = [];
    const addRole = (actor: NPCActor | null, roleType: RoleType, roleName: string, name: string, castIndex: number) => {
        const identity = suggestCharacterIdentity(compass, roleType, castIndex, { genres: [genre], logline: frame.logline } as any);
        castList.push({
            id: castIndex === 0 ? 'lead_1' : `supp_${castIndex}`,
            role: roleName,
            roleType,
            actorId: actor?.id || null,
            actorName: actor?.name,
            salary: actor ? calculateActorRoleSalary(actor, roleType, 0) : 0,
            characterName: name,
            storyFunction: identity.storyFunction,
            storyRole: identity.storyRole,
            abilityType: identity.abilityType,
            nature: identity.nature,
            identitySource: 'AUTHOR_INTENT',
        });
    };
    addRole(lead, 'LEAD', 'Lead Actor', heroName, 0);
    const supportPrice = (actor: NPCActor) => calculateActorRoleSalary(actor, 'SUPPORTING', 0);
    for (let castIndex = 1; castIndex < roleCount; castIndex += 1) {
        const spent = castList.reduce((sum, role) => sum + Number(role.salary || 0), 0);
        const left = Math.max(100_000, castBudget - spent);
        const actor = pickByPrice<NPCActor>(actors, supportPrice, left / (roleCount - castIndex), rng, used, null, knowsGenre);
        if (actor) used.add(actor.id);
        addRole(actor, 'SUPPORTING', 'Supporting Actor', characterName(rng, actor?.gender), castIndex);
    }

    /* the crew: about a tenth of the budget, the best of them on a good studio's sets */
    const selectedCrew: Record<string, string | null> = { director: director?.id || null };
    for (const { key, role } of CREW_ROLES) {
        /* the whole trade, not the six free this season: a documentary should not be stuck with a $4M effects chief */
        const candidates = getRotatingCrewCandidates(role, player.age, player.currentWeek, [], 99);
        const target = budget * (role === 'VFX_SUPERVISOR' ? ((GENRE_BUDGET[genre] ?? 0.7) >= 1 ? 0.04 : 0.008) : 0.016) * (0.7 + (studio.onSet / 100) * 0.5) * (1 + fortune * 0.25);
        const picked = pickByPrice(candidates as any[], (candidate: any) => Number(candidate.marketSalary || 0), target, rng, new Set<string>(), null, undefined, 2);
        selectedCrew[key] = (picked as any)?.id || null;
    }

    /* gear: what this budget would really hire */
    const gearTier = budgetAim >= 120 ? 4 : budgetAim >= 35 ? 3 : budgetAim >= 12 ? 2 : 1;
    const gear = (lift: number) => `TIER_${clamp(gearTier + lift + fortune * (rng() < 0.4 ? 1 : 0), 1, 5)}`;
    const equipmentChoices = {
        cameras: gear(budgetAim >= 70 ? 1 : 0),
        lighting: gear(0),
        sound: gear(0),
        practicalEffects: gear(frame.compass.worldRule === 'GROUNDED' ? 0 : budgetAim >= 70 ? 1 : 0),
    };
    /* places: at most about a sixth of the budget. An intimate story stays in one, a big one travels */
    const placeAllowance = budget * (0.12 + rng() * 0.08);
    const locationCount = frame.compass.castShape === 'INTIMATE' ? 1 : budgetAim >= 150 ? 4 : budgetAim >= 70 ? 3 : 2;
    const selectedLocations: string[] = [];
    const cheapestFirst = [...PRODUCTION_LOCATION_CATALOG].sort((a, b) => a.cost - b.cost);
    let placeLeft = placeAllowance;
    for (let index = 0; index < locationCount; index += 1) {
        const share = placeLeft / (locationCount - index);
        const free = cheapestFirst.filter(place => !selectedLocations.includes(place.id));
        const fits = free.filter(place => place.cost <= share * 1.4);
        const place = fits.length ? fits[Math.floor(rng() * fits.length)] : free[0];
        if (!fits.length && selectedLocations.length) break;
        selectedLocations.push(place.id);
        placeLeft -= place.cost;
    }
    const bestStyles = VISUAL_STYLES.filter(style => getVisualStyleQuality(genre, style) >= 1);
    const visualStyle = bestStyles.length && studio.creative + rng() * 30 > 60 ? pick(bestStyles, rng) : pick(VISUAL_STYLES, rng);
    const pacing = studio.style === 'SLOW_BURN' ? 'SLOW' : studio.style === 'BIG_OPENING' ? (rng() < 0.4 ? 'FAST' : 'MODERATE') : 'MODERATE';
    const tone = Math.round(clamp(getBestEffectsMix(genre) + (rng() - 0.5) * 30, 0, 100));

    const scriptId = createDeterministicId('original_pitch_script', seed);
    const script: Script = {
        id: scriptId,
        title,
        genres: [genre],
        status: 'READY',
        quality,
        baseQuality: quality,
        options: [],
        writerId: writer.id,
        weeksInDevelopment: 0,
        totalDevelopmentWeeks: 0,
        isOriginal: true,
        projectType,
        format,
        targetAudience: genre === 'ANIMATION' ? 'G' : genre === 'HORROR' || genre === 'CRIME' ? 'R' : 'PG-13',
        episodes,
        logline: fillPitchStory(frame.logline, heroName, lead?.gender),
        storyCompass: compass,
        sourceMaterial: 'ORIGINAL',
        author: writer.name,
        hype: Math.round(clamp(studio.reputation * 0.4 + rng() * 40, 10, 90)),
        developmentCost: Math.round((150_000 + quality * 18_000 + rng() * 500_000) / 50_000) * 50_000,
        tags: ['STREAMING_ORIGINAL', 'NPC_PITCH'],
        createdAtWeek: player.currentWeek,
        attributes: {
            plot: Math.round(clamp(quality - 8 + rng() * 16, 10, 100)),
            characters: Math.round(clamp(quality - 8 + rng() * 16, 10, 100)),
            pacing: Math.round(clamp(quality - 8 + rng() * 16, 10, 100)),
            dialogue: Math.round(clamp(quality - 8 + rng() * 16, 10, 100)),
            originality: Math.round(clamp(40 + rng() * 50, 10, 100)),
        },
    };
    const concept: ProjectConcept & { visualStyle?: string; pacing?: string } = {
        id: createDeterministicId('original_pitch_concept', seed),
        scriptId,
        lastUpdated: absoluteWeek,
        crewModes: { director: 'HIRE', cinematographer: 'HIRE', composer: 'HIRE', lineProducer: 'HIRE', vfx: 'HIRE' },
        selectedCrew,
        castList,
        selectedLocations,
        tone,
        visualStyle,
        pacing,
        equipmentChoices,
        reservedMarketingBudget: 0,
        marketingBudgetSpent: 0,
        marketingBudgetRemaining: 0,
        musicStrategy: budgetAim >= 40 ? 'LEAD_SINGLE' : 'COMPOSER_ONLY',
        lastStep: 'DIRECTOR',
        storyCompass: compass,
    };
    return {
        id: createDeterministicId('original_pitch', seed),
        seed,
        studioId: studio.id,
        studioName: studio.name,
        frameIndex,
        heroName,
        script,
        concept,
        createdAtAbsoluteWeek: absoluteWeek,
        answerByAbsoluteWeek: absoluteWeek + 2 + Math.floor(rng() * 3),
    };
};

/** A new set of pitches, leaving out the studios already in the room */
const buildPitchSet = (player: Player, count: number, cycle: number, ordinal: number, absoluteWeek: number, keep: OwnedStreamingOriginalPitch[]): OwnedStreamingOriginalPitch[] => {
    const scale = getPitchScale(player);
    const everyStudio = getOriginalsStudios(player);
    const inReach = everyStudio.filter(studio => scale.canAttractMajors || studio.isVenture || studio.typeLabel !== 'Major studio');
    const busy = new Set(keep.map(pitch => pitch.studioId));
    const pool = (inReach.length >= 3 ? inReach : everyStudio).filter(studio => !busy.has(studio.id));
    const rng = createDeterministicRng(`${player.id}:original-pitch-order:v1:${cycle}:${ordinal}`);
    const order = pool
        .map(studio => ({ studio, score: studio.reputation / 100 + rng() * 1.2 + (studio.openSlots > 0 ? 0.2 : 0) }))
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.studio);
    const titles = createProjectTitleReservations(player);
    keep.forEach(pitch => titles.add(pitch.script.title.toLowerCase()));
    /* #313: nobody is attached to two pitches at once */
    const busyPeople = new Set<string>(keep.flatMap(pitch => pitch.concept.castList.map(role => String(role.actorId))));
    return order.slice(0, count).map((studio, index) => {
        const pitch = buildPitch(player, studio, index, cycle, ordinal, absoluteWeek, scale.budgetCeilingMillions, titles, busyPeople);
        pitch.concept.castList.forEach(role => { if (role.actorId) busyPeople.add(role.actorId); });
        return pitch;
    });
};

const platformCanHearPitches = (player: Player): boolean => ['FOUNDING', 'ACTIVE'].includes(player.ownedStreamingPlatform?.lifecycle);

const emptyState = (): OwnedStreamingOriginalPitchState => ({ cycle: -1, scoutCycle: -1, scoutCount: 0, pitches: [], passed: [] });

/**
 * #311: a pitch saved before the built-in unknowns were fixed holds an id from an old session, and that person no longer exists.
 * Nobody has signed anything yet, so the studio has simply recast the part: the same slot's unknown, of the gender the story needs for the lead.
 */
const OLD_SESSION_UNKNOWN = /^npc_rnd_(\d+)_(\d{10,})$/;
const isOldSessionUnknown = (id: unknown): boolean => {
    const match = OLD_SESSION_UNKNOWN.exec(String(id));
    return Boolean(match) && String(id) !== getBuiltinUnknownId(match![1]);
};
const recastOldSessionUnknowns = (pitch: OwnedStreamingOriginalPitch): OwnedStreamingOriginalPitch => {
    const castList = pitch.concept.castList;
    if (!castList.some(role => isOldSessionUnknown(role.actorId))) return pitch;
    const taken = new Set(castList.map(role => String(role.actorId)));
    const leadGender = getPitchLeadGender(getPitchStoryFrame(pitch.script.genres[0], pitch.frameIndex));
    return {
        ...pitch,
        concept: {
            ...pitch.concept,
            castList: castList.map(role => {
                if (!isOldSessionUnknown(role.actorId)) return role;
                const slot = Number(OLD_SESSION_UNKNOWN.exec(String(role.actorId))![1]);
                const wanted = role.roleType === 'LEAD' ? leadGender : undefined;
                let actor: NPCActor | undefined;
                for (let step = 0; step < 50 && !actor; step += 1) {
                    const candidate = NPC_DATABASE.find(npc => npc.id === getBuiltinUnknownId((slot + step) % 50));
                    if (candidate && !taken.has(candidate.id) && (!wanted || candidate.gender === wanted)) actor = candidate;
                }
                if (!actor) return role;
                taken.add(actor.id);
                return { ...role, actorId: actor.id, actorName: actor.name, salary: calculateActorRoleSalary(actor, role.roleType, 0) };
            }),
        },
    };
};

export const getOriginalPitchState = (player: Player): OwnedStreamingOriginalPitchState => {
    const state = player.ownedStreamingPlatform?.originalPitches || emptyState();
    return state.pitches.some(pitch => pitch.concept.castList.some(role => isOldSessionUnknown(role.actorId)))
        ? { ...state, pitches: state.pitches.map(recastOldSessionUnknowns) }
        : state;
};

/** The pitches still open this week */
export const getLiveOriginalPitches = (player: Player): OwnedStreamingOriginalPitch[] => {
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    return getOriginalPitchState(player).pitches.filter(pitch => pitch.answerByAbsoluteWeek >= now);
};

/** Weeks until the next new set */
export const getOriginalPitchRefreshInWeeks = (player: Player): number => {
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    return (getStreamingMarketCycle(now) + 1) * 3 - now;
};

const withPitches = (player: Player, change: (state: OwnedStreamingOriginalPitchState) => OwnedStreamingOriginalPitchState, extra: Record<string, unknown> = {}): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            ...extra,
            originalPitches: change(platform.originalPitches || emptyState()),
        }, player.id),
    };
};

/** At the weekly close: drop what has run out; on a new cycle a new set of 3 to 5. Does nothing the rest of the time. */
export const advanceOriginalPitches = (player: Player): Player => {
    if (!platformCanHearPitches(player)) return player;
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const cycle = getStreamingMarketCycle(now);
    const state = getOriginalPitchState(player);
    const live = state.pitches.filter(pitch => pitch.answerByAbsoluteWeek >= now);
    if (state.cycle === cycle && live.length === state.pitches.length) return player;
    if (state.cycle === cycle) return withPitches(player, current => ({ ...current, pitches: live }));
    const rng = createDeterministicRng(`${player.id}:original-pitch-count:v1:${cycle}`);
    const wanted = 3 + Math.floor(rng() * 3);
    const room = Math.max(0, Math.min(wanted, ORIGINAL_PITCHES_LIVE_MAX - live.length));
    const fresh = buildPitchSet(player, room, cycle, 0, now, live);
    return withPitches(player, current => ({ ...current, cycle, scoutCycle: cycle, scoutCount: 0, pitches: [...live, ...fresh] }));
};

export interface OriginalScoutQuote { price: number; canAfford: boolean; shortfall: number }

export const getOriginalScoutQuote = (player: Player): OriginalScoutQuote => {
    const state = getOriginalPitchState(player);
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const cycle = getStreamingMarketCycle(now);
    const price = getNextPaidScoutPrice(state.scoutCycle === cycle ? state.scoutCount : 0);
    const treasury = Math.max(0, Number(player.ownedStreamingPlatform?.treasuryCash || 0));
    return { price, canAfford: treasury >= price, shortfall: Math.max(0, price - treasury) };
};

/** Money brings new pitches at once. The oldest make way if the room is full. */
export const scoutOriginalPitches = (player: Player): { player: Player; changed: boolean; detail: string } => {
    if (!platformCanHearPitches(player)) return { player, changed: false, detail: 'Open your streaming platform first.' };
    const quote = getOriginalScoutQuote(player);
    if (!quote.canAfford) return { player, changed: false, detail: `Platform funds are short by $${quote.shortfall.toLocaleString()}.` };
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const cycle = getStreamingMarketCycle(now);
    const state = getOriginalPitchState(player);
    const ordinal = (state.scoutCycle === cycle ? state.scoutCount : 0) + 1;
    const live = getLiveOriginalPitches(player);
    const fresh = buildPitchSet(player, 3, cycle, ordinal, now, []).filter(pitch => !live.some(item => item.studioId === pitch.studioId));
    const others = fresh.length ? fresh : buildPitchSet(player, 3, cycle, ordinal, now, []);
    if (!others.length) return { player, changed: false, detail: 'No studio has anything new. No scouting fee was charged.' };
    const keep = [...live].sort((a, b) => b.answerByAbsoluteWeek - a.answerByAbsoluteWeek).slice(0, Math.max(0, ORIGINAL_PITCHES_LIVE_MAX - others.length));
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    return {
        player: withPitches(player, current => ({
            ...current,
            scoutCycle: cycle,
            scoutCount: ordinal,
            pitches: [...keep, ...others],
        }), { treasuryCash: platform.treasuryCash - quote.price }),
        changed: true,
        detail: `${others.length} new ${others.length === 1 ? 'pitch' : 'pitches'} came in.`,
    };
};

/** Saying no. It leaves the room and is remembered: a rival may pick it up (#294). */
export const passOriginalPitch = (player: Player, pitchId: string): Player => {
    const pitch = getLiveOriginalPitches(player).find(item => item.id === pitchId);
    if (!pitch) return player;
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    return withPitches(player, current => ({
        ...current,
        pitches: current.pitches.filter(item => item.id !== pitchId),
        passed: [...current.passed, passedRecordOf(pitch, now)],
    }));
};

/** The Head of Content's choice, marked on the Desk */
export const markRecommendedOriginalPitch = (player: Player, pitchId: string): Player => withPitches(player, current => ({ ...current, recommendedPitchId: pitchId }));

export const getPitchLeadName = (pitch: OwnedStreamingOriginalPitch): string => pitch.heroName;

/** The story, built from the seed when opened */
export const getPitchStory = (pitch: OwnedStreamingOriginalPitch, leadGender: string | undefined) => {
    const frame = getPitchStoryFrame(pitch.script.genres[0], pitch.frameIndex);
    const end = pitch.script.projectType === 'SERIES' ? frame.seriesEnd : frame.movieEnd;
    return {
        story: fillPitchStory(`${frame.story} ${end}`, pitch.heroName, leadGender),
        tone: frame.tone,
        world: frame.world,
        focus: frame.focus,
        roles: frame.roles,
    };
};

