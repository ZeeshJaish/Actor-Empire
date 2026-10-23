import type { Commitment, Player, RoleType, Genre } from '../types';
import { spendPlayerEnergy } from './premiumLogic';

export const ACTOR_CAREER_BALANCE_VERSION = 1 as const;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
const actingKeys = ['delivery', 'memorization', 'expression', 'improvisation', 'discipline', 'presence', 'charisma'] as const;
const actorCraft = (p: Player) => actingKeys.reduce((sum, key) => sum + clamp(p.stats.skills[key]), 0) / actingKeys.length;
const absoluteWeek = (p: Player) => (Math.max(1, p.age) - 1) * 52 + clamp(p.currentWeek - 1, 0, 51);
const playerCast = (cast: any[]) => cast.some(c => c.isPlayer === true || ['PLAYER_SELF', 'player'].includes(c.actorId || c.npcId));

/** A producer credit or an inherited parent's performance is not the heir's acting work. */
export const isPersonalCareerActing = (c: Commitment): boolean => {
    const cast = c.projectDetails?.castList || [];
    return cast.length ? playerCast(cast) : c.type === 'ACTING_GIG';
};

export const getCareerEvidence = (p: Player, includeCreativeWork = false) => {
    const seen = new Set<string>();
    const now = absoluteWeek(p);
    const credits = [...(p.pastProjects || []), ...(p.activeReleases || [])].flatMap((row: any) => {
        if (!row.id || seen.has(row.id) || row.isQaArchive) return [];
        const cast = row.castList?.length ? row.castList : row.projectDetails?.castList || [];
        const details = row.projectDetails || row;
        const creativeCredit = includeCreativeWork && (['PLAYER_SELF', 'player'].includes(details.directorId)
            || ['PLAYER_SELF', 'player'].includes(details.writerId)
            || (row.type === 'DIRECTOR_GIG' && !details.directorId)
            || (row.type === 'WRITER_GIG' && !details.writerId));
        if (!creativeCredit && (cast.length ? !playerCast(cast) : row.type !== 'ACTING_GIG')) return [];
        seen.add(row.id);
        const year = row.releaseYear ?? row.year ?? p.age;
        const week = row.releaseWeek ?? row.projectDetails?.hiddenStats?.releaseWeek ?? 1;
        const released = Number.isFinite(row.releasedAtAbsoluteWeek) ? row.releasedAtAbsoluteWeek
            : (Math.max(1, year) - 1) * 52 + clamp(week - 1, 0, 51);
        const performance = clamp(Number(row.playerRolePerformance ?? row.productionPerformance
            ?? row.projectQuality ?? Number(row.imdbRating || row.rating || 5) * 10));
        return [{ id: row.id, released, performance, age: Math.max(0, now - released) }];
    });
    const recent = credits.filter(c => c.age <= 104).sort((a, b) => b.released - a.released).slice(0, 6);
    const recentPerformance = recent.length ? recent.reduce((sum, c) => sum + c.performance, 0) / recent.length : 0;
    const fresh = recent.length ? clamp(1 - Math.min(...recent.map(c => c.age)) / 156, 0, 1) : 0;
    const audience = clamp(Math.log10(1 + Math.max(0, p.stats.followers || 0, p.youtube?.subscribers || 0)) / 7, 0, 1);
    const workSignal = clamp((recentPerformance - 35) / 55, 0, 1) * Math.min(1, recent.length / 3) * fresh;
    return { credits: credits.length, recentCredits: recent.length, recentPerformance, workSignal, audience,
        spanWeeks: credits.length ? Math.max(0, now - Math.min(...credits.map(c => c.released))) : 0,
        strongCredits: recent.filter(c => c.performance >= 75).length };
};

/** Optional additive flags only. No financial, skill, project or entitlement repair. */
export const ensureActorCareerBalance = (p: Player): Player => {
    if (p.flags?.careerBalanceVersion === 1) return p;
    const wasLegend = p.stats.fame >= 94 && p.stats.reputation >= 85 && p.stats.experience >= 85
        && ((p.awards || []).filter(a => a.outcome === 'WON').length >= 2
            || (p.pastProjects || []).filter(c => !c.isQaArchive).length >= 18);
    return { ...p, flags: { ...p.flags, careerBalanceVersion: 1, careerBalanceStartedAtAbsoluteWeek: absoluteWeek(p),
        ...(wasLegend ? { careerLegendRecognized: true } : {}) } };
};

export const getCareerLearningGain = (current: number, base: number): number => {
    const v = clamp(current);
    const rate = v < 40 ? 2.4 - v * .025 : v < 70 ? 1.4 - (v - 40) * .02
        : v < 90 ? .8 - (v - 70) * .025 : .3 - (v - 90) * .015;
    return Math.max(0, base) * rate;
};

const phaseWeight = (c: Commitment) => c.projectPhase === 'PRODUCTION' ? 1
    : c.projectPhase === 'PRE_PRODUCTION' ? .7 : c.projectPhase === 'AUDITION' ? .5 : 0;
export const getCareerProjectLoad = (p: Player): number => p.commitments.reduce((sum, c) =>
    sum + (isPersonalCareerActing(c) ? phaseWeight(c) : 0), 0);
const managerSupport = (p: Player) => ({ ROOKIE: .02, STANDARD: .05, ELITE: .08, LEGEND: .1 }[p.team.manager?.tier || ''] || 0);

export const getCareerPassivePreparation = (p: Player, c: Commitment): number => {
    if (c.careerBalanceVersion !== 1) return Math.floor(clamp(p.stats.talent) * .05);
    if (!isPersonalCareerActing(c) || !['AUDITION', 'PRODUCTION'].includes(c.projectPhase || '')) return 0;
    const load = Math.max(1, getCareerProjectLoad(p));
    const budget = (1 + actorCraft(p) * .035) * (1 + managerSupport(p));
    return budget * phaseWeight(c) / load;
};

/** Resolve once at wrap; later classes cannot rewrite a delivered performance. */
export const getCareerFinalPerformance = (p: Player, c: Commitment): number => {
    const prep = clamp(c.productionPerformance || 0);
    if (c.careerBalanceVersion !== 1 || c.careerPerformanceFinalized || !isPersonalCareerActing(c)) return prep;
    const genre = clamp(p.stats.genreXP[c.projectDetails?.genre || 'DRAMA'] || 0);
    const roleEase = c.roleType === 'MINOR' || c.roleType === 'CAMEO' ? 8 : c.roleType === 'SUPPORTING' ? 3 : 0;
    return Math.round(clamp(prep * .45 + actorCraft(p) * .4 + genre * .15 + roleEase));
};

/** Shared by UI and ordinary-career verification: one paid action, one selected project. */
export const applyCareerRehearsal = (input: Player, projectId: string): { player: Player; changed: boolean; message?: string } => {
    const c = input.commitments.find(row => row.id === projectId);
    if (!c || c.careerBalanceVersion !== 1 || !isPersonalCareerActing(c) || c.careerPerformanceFinalized) return { player: input, changed: false };
    const pre = c.projectPhase === 'PRE_PRODUCTION', audition = c.projectPhase === 'AUDITION';
    if (!pre && !audition && c.projectPhase !== 'PRODUCTION') return { player: input, changed: false };
    const cost = pre ? 10 : 20;
    const key = pre || audition ? 'auditionPerformance' : 'productionPerformance';
    const current = clamp(c[key] || 0);
    if (input.energy.current < cost || current >= 100) return { player: input, changed: false };
    const p = ensureActorCareerBalance(input);
    const craft = audition ? (p.stats.skills.memorization + p.stats.skills.discipline) / 2
        : (p.stats.skills.expression + p.stats.skills.presence) / 2;
    const rolePreparation = c.roleType === 'MINOR' ? 1.8 : c.roleType === 'CAMEO' ? 1.6 : c.roleType === 'SUPPORTING' ? 1.25 : 1;
    const base = (pre ? 4 : audition ? 6 + craft * .1 : 3 + craft * .08) * rolePreparation;
    const attention = (1 + managerSupport(p)) / (1 + Math.max(0, getCareerProjectLoad(p) - 1) * .25);
    const gain = Math.max(.5, base * Math.max(.12, 1 - current / 110) * attention);
    const learned = Math.max(0, c.careerLearningActions || 0);
    const skills = { ...p.stats.skills };
    // Reserve half the bounded learning allowance for actually performing the role.
    const learningLimit = pre || audition ? 4 : 8;
    if (learned < learningLimit) for (const skill of pre || audition ? ['memorization', 'discipline'] as const : ['expression', 'delivery'] as const)
        skills[skill] = clamp(skills[skill] + getCareerLearningGain(skills[skill], .35));
    const next: Player = { ...p, energy: { ...p.energy }, flags: { ...p.flags }, stats: { ...p.stats, skills },
        commitments: p.commitments.map(row => row.id === c.id ? { ...c, [key]: Math.min(100, current + gain), careerLearningActions: Math.min(8, learned + Number(learned < learningLimit)) } : row) };
    spendPlayerEnergy(next, cost, `Project rehearsal: ${c.name}`);
    return { player: next, changed: true, message: `${c.name}: ${Math.round(Math.min(100, current + gain))}% ${pre || audition ? 'preparation' : 'scene preparation'}${getCareerProjectLoad(p) > 1 ? ' · attention shared across current roles' : ''}.` };
};

export const getCareerPublicityGain = (p: Player): number => {
    const tierGain = { ROOKIE: .5, STANDARD: 1, ELITE: 1.5, LEGEND: 1.5 }[p.team.publicist?.tier || ''] || 0;
    const evidence = getCareerEvidence(p, true);
    const ceiling = clamp(15 + Math.min(30, evidence.credits * 3) + evidence.workSignal * 35 + evidence.audience * 18, 15, 98);
    return tierGain * clamp((ceiling - p.stats.fame) / 20, 0, 1) * (.35 + .65 * Math.max(evidence.workSignal, evidence.audience));
};

export const getCareerCommercialMultiplier = (p: Player): number => {
    const evidence = getCareerEvidence(p, true);
    return clamp(.15 + evidence.workSignal * .5 + evidence.audience * .5, .15, 1.1);
};

export const resolveCareerOfferRole = (p: Player, requested: RoleType, genre?: Genre): RoleType => {
    const craft = actorCraft(p), bestGenre = genre ? clamp(p.stats.genreXP[genre] || 0) : Math.max(0, ...Object.values(p.stats.genreXP));
    if ((requested === 'LEAD' || requested === 'ENSEMBLE') && (craft < 35 || bestGenre < 20))
        return p.stats.fame >= 50 ? 'CAMEO' : 'MINOR';
    if (requested === 'SUPPORTING' && craft < 20) return 'MINOR';
    return requested;
};

export const hasCareerLegendStanding = (p: Player): boolean => {
    if (p.flags.careerLegendRecognized || p.flags.careerBalanceVersion !== 1) return true;
    const evidence = getCareerEvidence(p);
    return evidence.credits >= 12 && evidence.spanWeeks >= 260 && evidence.strongCredits >= 3;
};

/** A table read prepares the specific role; its benefit survives the phase boundary. */
export const getCareerProductionStartPerformance = (c: Commitment): number => c.careerBalanceVersion === 1 && isPersonalCareerActing(c)
    ? Math.min(25, clamp(c.auditionPerformance || 0) * .25) : 0;
