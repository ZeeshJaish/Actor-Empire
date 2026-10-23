import type { Genre, Player, RecentProjectTitleMemory, WorldState } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { getProjectTitlePalette, PROJECT_TITLE_PLACES, PROJECT_TITLE_SUBTITLES, PROJECT_TITLE_VERBS } from './projectTitleVocabulary';

export const RECENT_PROJECT_TITLE_WEEKS = 104;
export const RECENT_PROJECT_TITLE_LIMIT = 1024;
const MAX_TITLE_LENGTH = 72;
const RANDOM_ATTEMPTS = 6;
const TITLE_STRUCTURES = Array.from({ length: 15 }, (_, i) => i);
export const projectTitleKey = (title: string): string => title.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
const displayTitle = (title: string): string => title.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH);
const validWeek = (week: unknown, now: number): week is number => typeof week === 'number' && Number.isInteger(week) && week >= 0 && week <= now && now - week < RECENT_PROJECT_TITLE_WEEKS;
const memoryCache = new WeakMap<object, { week: number; memory: RecentProjectTitleMemory }>();

/** Only this tiny derived buffer expires. No project, contract or financial record is removed. */
export const normalizeRecentProjectTitles = (raw: unknown, now: number): RecentProjectTitleMemory => {
    if (!raw || typeof raw !== 'object') return { schemaVersion: 1, entries: [] };
    const cached = memoryCache.get(raw);
    if (cached?.week === now) return cached.memory;
    const source = raw as Partial<RecentProjectTitleMemory>;
    const entries: RecentProjectTitleMemory['entries'] = [];
    const seen = new Set<string>();
    if (source.schemaVersion === 1 && Array.isArray(source.entries)) {
        for (const row of source.entries.slice(-RECENT_PROJECT_TITLE_LIMIT)) {
            if (!row || typeof row.title !== 'string' || !validWeek(row.week, now)) continue;
            const title = displayTitle(row.title), key = projectTitleKey(title);
            if (!key || seen.has(key)) continue;
            seen.add(key); entries.push({ title, week: row.week });
        }
    }
    entries.sort((a, b) => a.week - b.week);
    const unchanged = source.schemaVersion === 1 && Array.isArray(source.entries) && source.entries.length === entries.length
        && entries.every((row, i) => row.title === source.entries![i].title && row.week === source.entries![i].week);
    const memory: RecentProjectTitleMemory = unchanged ? source as RecentProjectTitleMemory : { schemaVersion: 1, entries };
    memoryCache.set(raw, { week: now, memory });
    return memory;
};

export const rememberProjectTitles = (world: WorldState, titles: Iterable<string>, now: number): WorldState => {
    const memory = normalizeRecentProjectTitles(world.recentProjectTitles, now);
    const keys = new Set(memory.entries.map(row => projectTitleKey(row.title)));
    const entries = [...memory.entries];
    let added = false;
    for (const raw of titles) {
        const title = displayTitle(raw), key = projectTitleKey(title);
        if (!key || keys.has(key)) continue;
        keys.add(key); entries.push({ title, week: now }); added = true;
    }
    if (!added && memory === world.recentProjectTitles) return world;
    return { ...world, recentProjectTitles: { schemaVersion: 1, entries: entries.slice(-RECENT_PROJECT_TITLE_LIMIT) } };
};

/** One bounded bootstrap for old saves; their actual film archives stay unchanged. */
export const initializeRecentProjectTitles = (player: Player, now: number): RecentProjectTitleMemory => {
    if (player.world.recentProjectTitles) return normalizeRecentProjectTitles(player.world.recentProjectTitles, now);
    const entries: RecentProjectTitleMemory['entries'] = [];
    const projects = player.world.projects.slice(-RECENT_PROJECT_TITLE_LIMIT);
    for (const project of projects) {
        const week = getAbsoluteWeek(project.year, project.weekReleased || 1);
        if (validWeek(week, now)) entries.push({ title: project.title, week });
    }
    for (const project of player.pastProjects.slice(-RECENT_PROJECT_TITLE_LIMIT)) {
        // Older player archives retain only the release year; use its latest plausible week.
        const yearEnd = getAbsoluteWeek(project.year, 52);
        const week = project.year === player.age ? Math.min(now, yearEnd) : yearEnd;
        if (validWeek(week, now)) entries.push({ title: project.name, week });
    }
    entries.sort((a, b) => a.week - b.week);
    return normalizeRecentProjectTitles({ schemaVersion: 1, entries }, now);
};

const productionKeysCache = new WeakMap<object, Set<string>>();
const projectKeysCache = new WeakMap<object, { week: number; keys: Set<string> }>();
const protectedProductionStatuses = new Set(['PLANNED', 'PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION', 'ON_HOLD', 'TURNAROUND', 'DELIVERED', 'AWAITING_RELEASE']);
const terminalPlanStatuses = new Set(['RELEASED', 'CANCELLED']);
const addKey = (keys: Set<string>, title: unknown) => { if (typeof title === 'string' && title.trim()) keys.add(projectTitleKey(title)); };

/** Small live player collections only; never scan pastProjects or the virtual historical catalogue. */
export const getCurrentPlayerProjectTitles = (player: Player): string[] => {
    const names: string[] = [];
    for (const c of player.commitments || []) {
        if (c.type !== 'ACTING_GIG' && !c.projectDetails) continue;
        names.push(c.name, c.projectDetails?.title || '');
    }
    for (const film of player.activeUniverseContract?.films || []) names.push(film.title);
    for (const release of player.activeReleases || []) names.push(release.name, release.projectDetails?.title || '');
    for (const offer of player.weeklyOpportunities?.auditions || []) names.push(offer.projectName, offer.project?.title || '');
    for (const message of player.inbox || []) {
        if (message.type !== 'OFFER_ROLE' && message.type !== 'OFFER_AUDITION') continue;
        const data = message.data;
        if (typeof data?.projectName === 'string') names.push(data.projectName);
        if (typeof data?.project?.title === 'string') names.push(data.project.title);
        for (const film of data?.universeContract?.films || []) if (typeof film.title === 'string') names.push(film.title);
    }
    return names.filter(Boolean);
};

/** Build once per creation batch; immutable world containers reuse their derived indexes. */
export const createProjectTitleReservations = (player: Player, world = player.world, now = getAbsoluteWeek(player.age, player.currentWeek), extraTitles: Iterable<string> = []): Set<string> => {
    const keys = new Set(normalizeRecentProjectTitles(world.recentProjectTitles, now).entries.map(row => projectTitleKey(row.title)));
    let recent = projectKeysCache.get(world.projects);
    if (!recent || recent.week !== now) {
        const recentKeys = new Set<string>();
        for (const project of world.projects) {
            if (validWeek(getAbsoluteWeek(project.year, project.weekReleased || 1), now)) addKey(recentKeys, project.title);
        }
        recent = { week: now, keys: recentKeys }; projectKeysCache.set(world.projects, recent);
    }
    for (const key of recent.keys) keys.add(key);
    if (world.industryProductions) {
        let active = productionKeysCache.get(world.industryProductions);
        if (!active) {
            active = new Set<string>();
            for (const production of Object.values(world.industryProductions)) if (protectedProductionStatuses.has(production.status)) addKey(active, production.title);
            productionKeysCache.set(world.industryProductions, active);
        }
        for (const key of active) keys.add(key);
    }
    for (const platform of Object.values(world.platforms || {})) for (const plan of platform.ai?.slate || []) {
        if (!terminalPlanStatuses.has(plan.status)) addKey(keys, plan.title);
    }
    for (const universe of Object.values(world.universes || {})) for (const project of universe.slate || []) addKey(keys, project.title);
    for (const business of player.businesses || []) {
        for (const script of business.studioState?.scripts || []) addKey(keys, script.title);
        for (const title of business.studioState?.purchasedIPTitles || []) addKey(keys, title);
    }
    for (const title of getCurrentPlayerProjectTitles(player)) addKey(keys, title);
    for (const title of extraTitles) addKey(keys, title);
    return keys;
};

const pick = <T,>(items: readonly T[], rng: () => number): T => {
    const roll = rng();
    const unit = Number.isFinite(roll) ? Math.max(0, Math.min(0.999999999, roll)) : 0.5;
    return items[Math.floor(unit * items.length)];
};

/** Mutates only the temporary batch Set. Preview generation never mutates a save. */
export const allocateProjectTitle = (reserved: Set<string>, rng: () => number = Math.random, genre?: Genre): string => {
    const palette = getProjectTitlePalette(genre);
    let candidate = '';
    for (let attempt = 0; attempt < RANDOM_ATTEMPTS; attempt++) {
        const structure = pick(TITLE_STRUCTURES, rng);
        const noun = pick(palette.nouns, rng);
        const adjective = pick(palette.adjectives, rng);
        const sampledSecond = pick(palette.nouns, rng);
        const second = sampledSecond === noun ? palette.nouns[(palette.nouns.indexOf(noun) + 1) % palette.nouns.length] : sampledSecond;
        switch (structure) {
            case 0: candidate = `The ${noun}`; break;
            case 1: candidate = `${adjective} ${noun}`; break;
            case 2: candidate = `${noun} ${pick(PROJECT_TITLE_VERBS, rng)}`; break;
            case 3: candidate = `The ${noun} of ${pick(PROJECT_TITLE_PLACES, rng)}`; break;
            case 4: candidate = `${noun} at ${pick(PROJECT_TITLE_PLACES, rng)}`; break;
            case 5: candidate = `A ${noun} for ${second}`; break;
            case 6: candidate = `After ${pick(PROJECT_TITLE_PLACES, rng)}`; break;
            case 7: candidate = `${adjective} ${noun}: ${pick(PROJECT_TITLE_SUBTITLES, rng)}`; break;
            case 8: candidate = `${noun} Without ${second}`; break;
            case 9: candidate = `The ${adjective} ${noun} of ${pick(PROJECT_TITLE_PLACES, rng)}`; break;
            case 10: candidate = `${noun} and ${second}`; break;
            case 11: candidate = `${noun}: ${pick(PROJECT_TITLE_SUBTITLES, rng)}`; break;
            case 12: candidate = `${adjective} ${noun} ${pick(PROJECT_TITLE_VERBS, rng)}`; break;
            case 13: candidate = `${noun} ${pick(PROJECT_TITLE_VERBS, rng)} at ${pick(PROJECT_TITLE_PLACES, rng)}`; break;
            default: candidate = `${adjective} ${noun} and ${second}`;
        }
        candidate = displayTitle(candidate);
        if (!reserved.has(projectTitleKey(candidate))) { reserved.add(projectTitleKey(candidate)); return candidate; }
    }
    // A finite, deterministic search also works with a stuck RNG or a crowded title pool.
    const stem = candidate.slice(0, 28);
    const limit = reserved.size + 1;
    for (let i = 0; i < limit; i++) {
        const edition = Math.floor(i / PROJECT_TITLE_SUBTITLES.length);
        const suffix = edition ? ` ${edition + 1}` : '';
        const title = `${stem}: ${PROJECT_TITLE_SUBTITLES[i % PROJECT_TITLE_SUBTITLES.length]}${suffix}`;
        const key = projectTitleKey(title);
        if (!reserved.has(key)) { reserved.add(key); return title; }
    }
    throw new Error('Project title allocation exhausted its bounded fallback.');
};
