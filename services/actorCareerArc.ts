import { PastProject, Player } from '../types';

export type ActorCareerArcId =
    | 'NEWCOMER'
    | 'RISING_NAME'
    | 'BREAKOUT'
    | 'HIT_STREAK'
    | 'FLOP_ERA'
    | 'COMEBACK'
    | 'CRITIC_DARLING'
    | 'BOX_OFFICE_DRAW'
    | 'AWARD_SEASON'
    | 'INDUSTRY_LEGEND'
    | 'CULT_FAVORITE'
    | 'STEADY_WORKER'
    | 'REINVENTION'
    | 'UNDER_PRESSURE';

export interface ActorCareerArc {
    id: ActorCareerArcId;
    label: string;
    summary: string;
    toneClass: string;
    labelKey: string;
    summaryKey: string;
    detailKey: string;
    changeLogKey: string;
    signals: ActorCareerArcSignal[];
}

export interface ActorCareerArcSignal {
    key: string;
    vars?: Record<string, string | number>;
}

export interface ActorCareerArcTransition {
    previous: ActorCareerArc;
    current: ActorCareerArc;
    logKey: string;
    tone: 'positive' | 'negative' | 'neutral';
}

type ActorCareerArcMeta = Pick<ActorCareerArc, 'id' | 'toneClass'>;

const ARC_META: Record<ActorCareerArcId, ActorCareerArcMeta> = {
    NEWCOMER: {
        id: 'NEWCOMER',
        toneClass: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
    },
    RISING_NAME: {
        id: 'RISING_NAME',
        toneClass: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
    },
    BREAKOUT: {
        id: 'BREAKOUT',
        toneClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    },
    HIT_STREAK: {
        id: 'HIT_STREAK',
        toneClass: 'border-lime-400/40 bg-lime-400/10 text-lime-200',
    },
    FLOP_ERA: {
        id: 'FLOP_ERA',
        toneClass: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
    },
    COMEBACK: {
        id: 'COMEBACK',
        toneClass: 'border-orange-400/40 bg-orange-400/10 text-orange-200',
    },
    CRITIC_DARLING: {
        id: 'CRITIC_DARLING',
        toneClass: 'border-violet-400/40 bg-violet-400/10 text-violet-200',
    },
    BOX_OFFICE_DRAW: {
        id: 'BOX_OFFICE_DRAW',
        toneClass: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-200',
    },
    AWARD_SEASON: {
        id: 'AWARD_SEASON',
        toneClass: 'border-amber-300/40 bg-amber-300/10 text-amber-100',
    },
    INDUSTRY_LEGEND: {
        id: 'INDUSTRY_LEGEND',
        toneClass: 'border-fuchsia-300/40 bg-fuchsia-300/10 text-fuchsia-100',
    },
    CULT_FAVORITE: {
        id: 'CULT_FAVORITE',
        toneClass: 'border-teal-300/40 bg-teal-300/10 text-teal-100',
    },
    STEADY_WORKER: {
        id: 'STEADY_WORKER',
        toneClass: 'border-zinc-400/40 bg-zinc-400/10 text-zinc-200',
    },
    REINVENTION: {
        id: 'REINVENTION',
        toneClass: 'border-blue-400/40 bg-blue-400/10 text-blue-200',
    },
    UNDER_PRESSURE: {
        id: 'UNDER_PRESSURE',
        toneClass: 'border-red-400/40 bg-red-400/10 text-red-200',
    },
};

const getArcTranslationKey = (id: ActorCareerArcId, suffix: 'label' | 'summary' | 'detail' | 'changeLog') => (
    `home.actorArc.${id}.${suffix}`
);

const buildActorCareerArc = (id: ActorCareerArcId, signals: ActorCareerArcSignal[]): ActorCareerArc => ({
    ...ARC_META[id],
    label: id,
    summary: '',
    labelKey: getArcTranslationKey(id, 'label'),
    summaryKey: getArcTranslationKey(id, 'summary'),
    detailKey: getArcTranslationKey(id, 'detail'),
    changeLogKey: getArcTranslationKey(id, 'changeLog'),
    signals,
});

const uniqueSignals = (signals: ActorCareerArcSignal[]): ActorCareerArcSignal[] => {
    const seen = new Set<string>();
    return signals.filter(signal => {
        const id = `${signal.key}:${JSON.stringify(signal.vars || {})}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    }).slice(0, 4);
};

const getTransitionTone = (id: ActorCareerArcId): ActorCareerArcTransition['tone'] => {
    if (id === 'FLOP_ERA' || id === 'UNDER_PRESSURE') return 'negative';
    if (id === 'STEADY_WORKER' || id === 'NEWCOMER') return 'neutral';
    return 'positive';
};

const getProjectSortWeek = (project: PastProject): number => {
    if (Number.isFinite(project.releasedAtAbsoluteWeek)) return Number(project.releasedAtAbsoluteWeek);
    if (Number.isFinite(project.releaseYear) || Number.isFinite(project.releaseWeek)) {
        return Number(project.releaseYear || project.year || 0) * 52 + Number(project.releaseWeek || 0);
    }
    return Number(project.year || 0) * 52;
};

const getProjectRating = (project: PastProject): number => Number(project.imdbRating || project.rating || 0);

const isHitProject = (project: PastProject): boolean => {
    const rating = getProjectRating(project);
    const budget = Number(project.budget || 0);
    const gross = Number(project.gross || 0) + Number(project.streamingRevenue || 0);
    return (
        project.outcomeTier === 'MASSIVE_SUCCESS' ||
        project.outcomeTier === 'SUCCESS' ||
        rating >= 7.4 ||
        (budget > 0 && gross >= budget * 2)
    );
};

const isFlopProject = (project: PastProject): boolean => {
    const rating = getProjectRating(project);
    const budget = Number(project.budget || 0);
    const gross = Number(project.gross || 0) + Number(project.streamingRevenue || 0);
    return (
        project.outcomeTier === 'MAJOR_FAILURE' ||
        project.outcomeTier === 'FAILURE' ||
        rating <= 5.2 ||
        (budget > 0 && gross > 0 && gross <= budget * 0.55)
    );
};

const isPrestigeProject = (project: PastProject): boolean => (
    getProjectRating(project) >= 8.2 ||
    (project.awards || []).some(award => award.outcome === 'WON' || award.outcome === 'NOMINATED')
);

export const getActorCareerArc = (player: Player): ActorCareerArc => {
    const fame = Number(player.stats?.fame || 0);
    const reputation = Number(player.stats?.reputation || 0);
    const experience = Number(player.stats?.experience || 0);
    const projects = [...(player.pastProjects || [])].sort((a, b) => getProjectSortWeek(b) - getProjectSortWeek(a));
    const recentProjects = projects.slice(0, 5);
    const recentThree = recentProjects.slice(0, 3);
    const latest = recentProjects[0];
    const awardsWon = (player.awards || []).filter(award => award.outcome === 'WON').length;
    const awardsTotal = (player.awards || []).length;
    const recentHits = recentProjects.filter(isHitProject).length;
    const recentFlops = recentProjects.filter(isFlopProject).length;
    const recentPrestige = recentProjects.filter(isPrestigeProject).length;
    const recentGross = recentProjects.reduce((sum, project) => sum + Number(project.gross || 0) + Number(project.streamingRevenue || 0), 0);
    const latestIsHit = latest ? isHitProject(latest) : false;
    const latestIsFlop = latest ? isFlopProject(latest) : false;
    const hadRecentFlopBeforeLatest = recentProjects.slice(1, 4).some(isFlopProject);
    const baseSignals = ([
        projects.length === 0 ? { key: 'home.actorArc.signal.noCredits' } : { key: 'home.actorArc.signal.creditCount', vars: { count: projects.length } },
        latestIsHit && latest ? { key: 'home.actorArc.signal.latestHit', vars: { title: latest.name } } : null,
        latestIsFlop && latest ? { key: 'home.actorArc.signal.latestFlop', vars: { title: latest.name } } : null,
        recentHits > 0 ? { key: 'home.actorArc.signal.recentHits', vars: { count: recentHits } } : null,
        recentFlops > 0 ? { key: 'home.actorArc.signal.recentFlops', vars: { count: recentFlops } } : null,
        recentPrestige > 0 ? { key: 'home.actorArc.signal.prestigeProjects', vars: { count: recentPrestige } } : null,
        awardsTotal > 0 ? { key: 'home.actorArc.signal.awardMomentum', vars: { count: awardsTotal } } : null,
        recentGross >= 100_000_000 ? { key: 'home.actorArc.signal.recentGross', vars: { amount: `$${Math.round(recentGross / 1_000_000)}M` } } : null,
        fame >= 70 ? { key: 'home.actorArc.signal.highFame', vars: { fame } } : null,
        reputation >= 70 ? { key: 'home.actorArc.signal.highReputation', vars: { reputation } } : null,
        experience >= 70 ? { key: 'home.actorArc.signal.deepExperience', vars: { experience } } : null,
    ] as Array<ActorCareerArcSignal | null>).filter((signal): signal is ActorCareerArcSignal => Boolean(signal));
    const arc = (id: ActorCareerArcId, prioritySignals: ActorCareerArcSignal[] = []) => (
        buildActorCareerArc(id, uniqueSignals([...prioritySignals, ...baseSignals]))
    );

    if (fame >= 94 && reputation >= 85 && experience >= 85 && (awardsWon >= 2 || projects.length >= 18)) {
        return arc('INDUSTRY_LEGEND', [
            { key: 'home.actorArc.signal.legendProfile' },
            { key: 'home.actorArc.signal.awardsWon', vars: { count: awardsWon } },
        ]);
    }

    if (latestIsHit && hadRecentFlopBeforeLatest && (fame >= 35 || experience >= 35)) {
        return arc('COMEBACK', [
            { key: 'home.actorArc.signal.comebackPattern' },
        ]);
    }

    if (recentThree.length >= 2 && recentThree.filter(isFlopProject).length >= 2) {
        return arc('FLOP_ERA', [
            { key: 'home.actorArc.signal.flopCluster', vars: { count: recentThree.filter(isFlopProject).length } },
        ]);
    }

    if (fame >= 82 && recentHits >= 2 && recentGross >= 500_000_000) {
        return arc('BOX_OFFICE_DRAW', [
            { key: 'home.actorArc.signal.commercialPull' },
        ]);
    }

    if (recentThree.length >= 3 && recentThree.every(isHitProject)) {
        return arc('HIT_STREAK', [
            { key: 'home.actorArc.signal.hitStreak', vars: { count: recentThree.length } },
        ]);
    }

    if (reputation >= 80 && recentPrestige >= 2) {
        return arc('CRITIC_DARLING', [
            { key: 'home.actorArc.signal.criticsTrust' },
        ]);
    }

    if (awardsTotal >= 2 && reputation >= 55) {
        return arc('AWARD_SEASON', [
            { key: 'home.actorArc.signal.awardTrail', vars: { count: awardsTotal } },
        ]);
    }

    if (player.age >= 35 && latestIsHit && projects.length >= 8 && fame >= 45) {
        return arc('REINVENTION', [
            { key: 'home.actorArc.signal.newChapter' },
        ]);
    }

    if (latestIsHit && fame < 70) {
        return arc('BREAKOUT', [
            { key: 'home.actorArc.signal.attentionSpike' },
        ]);
    }

    if (fame >= 65 && (latestIsFlop || reputation < 45 || recentFlops >= 1)) {
        return arc('UNDER_PRESSURE', [
            { key: 'home.actorArc.signal.pressurePoint' },
        ]);
    }

    if (reputation >= 68 && fame < 58 && projects.length >= 3) {
        return arc('CULT_FAVORITE', [
            { key: 'home.actorArc.signal.loyalAudience' },
        ]);
    }

    if (projects.length >= 5 || experience >= 45) {
        return arc('STEADY_WORKER', [
            { key: 'home.actorArc.signal.consistentCredits' },
        ]);
    }

    if (fame >= 18 || reputation >= 25 || experience >= 18) {
        return arc('RISING_NAME', [
            { key: 'home.actorArc.signal.earlyMomentum' },
        ]);
    }

    return arc('NEWCOMER', [
        { key: 'home.actorArc.signal.earlyCareer' },
    ]);
};

export const getActorCareerArcTransition = (previousPlayer: Player, currentPlayer: Player): ActorCareerArcTransition | null => {
    const previous = getActorCareerArc(previousPlayer);
    const current = getActorCareerArc(currentPlayer);
    if (previous.id === current.id) return null;
    return {
        previous,
        current,
        logKey: current.changeLogKey,
        tone: getTransitionTone(current.id),
    };
};
