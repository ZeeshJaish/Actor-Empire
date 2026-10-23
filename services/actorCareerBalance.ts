import type { Commitment, Player, RoleType, Genre, PastProject, OutcomeTier } from '../types';
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
const careerRehearsalLearningState = (p: Player, c: Commitment) => {
    const distributed = c.careerRewardPacingVersion === 1;
    const learned = Math.max(0, c.careerLearningActions || 0);
    const week = absoluteWeek(p);
    const weeklyLearning = c.careerLearningWeek === week ? Math.max(0, c.careerLearningActionsThisWeek || 0) : 0;
    const preparation = c.projectPhase === 'PRE_PRODUCTION' || c.projectPhase === 'AUDITION';
    const learningLimit = preparation ? 4 : distributed ? 24 : 8;
    const relevantSkills = preparation ? ['memorization', 'discipline'] as const : ['expression', 'delivery'] as const;
    const canLearn = learned < learningLimit && (!distributed || weeklyLearning < 2
        && relevantSkills.some(skill => clamp(p.stats.skills[skill]) < 100));
    return {distributed, learned, week, weeklyLearning, canLearn};
};

export const hasCareerRehearsalLearning = (p: Player, c: Commitment): boolean => c.careerRewardPacingVersion === 1
    && !c.careerPerformanceFinalized && isPersonalCareerActing(c)
    && ['PRE_PRODUCTION', 'AUDITION', 'PRODUCTION'].includes(c.projectPhase || '')
    && careerRehearsalLearningState(p, c).canLearn;

export const applyCareerRehearsal = (input: Player, projectId: string): { player: Player; changed: boolean; message?: string } => {
    const c = input.commitments.find(row => row.id === projectId);
    if (!c || c.careerBalanceVersion !== 1 || !isPersonalCareerActing(c) || c.careerPerformanceFinalized) return { player: input, changed: false };
    const pre = c.projectPhase === 'PRE_PRODUCTION', audition = c.projectPhase === 'AUDITION';
    if (!pre && !audition && c.projectPhase !== 'PRODUCTION') return { player: input, changed: false };
    const cost = pre ? 10 : 20;
    const key = pre || audition ? 'auditionPerformance' : 'productionPerformance';
    const current = clamp(c[key] || 0);
    const {distributed, learned, week, weeklyLearning, canLearn} = careerRehearsalLearningState(input, c);
    // New projects reserve most learning for filming. Every increment still costs rehearsal energy.
    if (input.energy.current < cost || current >= 100 && (!distributed || !canLearn)) return { player: input, changed: false };
    const p = ensureActorCareerBalance(input);
    const craft = audition ? (p.stats.skills.memorization + p.stats.skills.discipline) / 2
        : (p.stats.skills.expression + p.stats.skills.presence) / 2;
    const rolePreparation = c.roleType === 'MINOR' ? 1.8 : c.roleType === 'CAMEO' ? 1.6 : c.roleType === 'SUPPORTING' ? 1.25 : 1;
    const base = (pre ? 4 : audition ? 6 + craft * .1 : 3 + craft * .08) * rolePreparation;
    const attention = (1 + managerSupport(p)) / (1 + Math.max(0, getCareerProjectLoad(p) - 1) * .25);
    const gain = Math.max(.5, base * Math.max(.12, 1 - current / 110) * attention);
    const skills = { ...p.stats.skills };
    if (canLearn) for (const skill of pre || audition ? ['memorization', 'discipline'] as const : ['expression', 'delivery'] as const)
        skills[skill] = clamp(skills[skill] + getCareerLearningGain(skills[skill], .35));
    const next: Player = { ...p, energy: { ...p.energy }, flags: { ...p.flags }, stats: { ...p.stats, skills },
        commitments: p.commitments.map(row => row.id === c.id ? { ...c, [key]: Math.min(100, current + gain),
            careerLearningActions: Math.min(distributed ? 24 : 8, learned + Number(canLearn)),
            ...(distributed ? {careerLearningWeek: week, careerLearningActionsThisWeek: weeklyLearning + Number(canLearn)} : {}) } : row) };
    spendPlayerEnergy(next, cost, `Project rehearsal: ${c.name}`);
    return { player: next, changed: true, message: `${c.name}: ${Math.round(Math.min(100, current + gain))}% ${pre || audition ? 'preparation' : 'scene preparation'}${distributed && canLearn ? ' · role skills improved' : ''}${getCareerProjectLoad(p) > 1 ? ' · attention shared across current roles' : ''}.` };
};

export const getCareerPublicityGain = (p: Player): number => {
    const tierGain = { ROOKIE: .5, STANDARD: 1, ELITE: 1.5, LEGEND: 1.5 }[p.team.publicist?.tier || ''] || 0;
    const evidence = getCareerEvidence(p, true);
    const ceiling = clamp(15 + Math.min(30, evidence.credits * 3) + evidence.workSignal * 35 + evidence.audience * 18, 15, 98);
    return tierGain * clamp((ceiling - p.stats.fame) / 20, 0, 1) * (.35 + .65 * Math.max(evidence.workSignal, evidence.audience));
};

/** A small earned audience fades gradually; established celebrity keeps the existing decay. */
export const getCareerFameDecay = (fame: number): number => Math.min(.18, clamp(fame) * .01);

/** One small personal credit at premiere, independent of a producer's financial return. */
export const applyCareerReleaseRecognition = (p: Player, c: Commitment): {player: Player; commitment: Commitment} => {
    if (c.careerRewardPacingVersion !== 1 || !c.careerPerformanceFinalized || !isPersonalCareerActing(c)
        || c.projectDetails?.hiddenStats?.careerRecognitionApplied) return {player: p, commitment: c};
    const signal = clamp((Number(c.productionPerformance || 0) - 45) / 25, 0, 1);
    const visibility = c.roleType === 'LEAD' ? 2 : c.roleType === 'SUPPORTING' || c.roleType === 'ENSEMBLE' ? 1.25 : .8;
    return {
        player: signal > 0 ? {...p, stats: {...p.stats, fame: clamp(p.stats.fame + signal * visibility),
            reputation: clamp(p.stats.reputation + signal)}} : p,
        commitment: {...c, projectDetails: c.projectDetails ? {...c.projectDetails, hiddenStats: {
            ...c.projectDetails.hiddenStats, careerRecognitionApplied: true,
        }} : undefined},
    };
};

/** NPC platform originals without a disclosed receipt history have no observable producer ROI.
 * Keep the stored history intact. Ratings still drive critical success/failure in the career arc.
 */
export const getCareerReportedOutcome = (project: Partial<PastProject>, p: Player): OutcomeTier | undefined => {
    const externalPlatform = ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE'].includes(project.studioId || '');
    const owned = p.businesses?.some(b => b.id === project.studioId);
    const unobserved = externalPlatform && !owned && project.streamingPlatform && Number(project.totalViews || 0) > 0
        && !project.streamingContractId && !project.platformProductionFunding
        && Number(project.gross || 0) === 0 && Number(project.streamingRevenue || 0) === 0;
    return unobserved ? undefined : project.outcomeTier;
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
