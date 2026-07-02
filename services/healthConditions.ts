import { HealthConditionSeverity, HealthConditionSource, HealthConditionState, LogEntry, Message, NewsItem, Player } from '../types';
import { getAbsoluteWeek } from './legacyLogic';

export interface HealthConditionDefinition {
    id: string;
    label: string;
    summary: string;
    severity: HealthConditionSeverity;
    source: HealthConditionSource;
    healthCap: number;
    weeklyHealthDrain: number;
    workPenalty: number;
    baseDurationWeeks: number;
    treatmentTags: string[];
    naturalRecoveryChance: number;
    worsenAfterWeeks: number;
    worsenTo?: string;
    deathRisk?: number;
    publicRisk?: number;
}

interface HealthConditionWeekResult {
    player: Player;
    logs: LogEntry[];
    news: NewsItem[];
}

export type HealthTreatmentPrivacy = 'PRIVATE' | 'STANDARD' | 'PUBLIC_RISK';

interface HealthConditionIncidentOptions {
    sourceLabel?: string;
    detail?: string;
    publicity?: HealthTreatmentPrivacy;
    careDelayWeeks?: number;
    forcePublic?: boolean;
}

interface HealthConditionIncidentResult {
    player: Player;
    condition?: HealthConditionState;
    logs: LogEntry[];
    news: NewsItem[];
    inbox: Message[];
}

export const HEALTH_CONDITION_REGISTRY: Record<string, HealthConditionDefinition> = {
    workload_headache: {
        id: 'workload_headache',
        label: 'Workload Headache',
        summary: 'Too many stressful weeks are causing headaches and poor focus.',
        severity: 'MINOR',
        source: 'WORKLOAD',
        healthCap: 90,
        weeklyHealthDrain: 1,
        workPenalty: 3,
        baseDurationWeeks: 1,
        treatmentTags: ['checkup', 'stress', 'sleep'],
        naturalRecoveryChance: 0.55,
        worsenAfterWeeks: 3,
        worsenTo: 'burnout_spiral',
    },
    flu_bug: {
        id: 'flu_bug',
        label: 'Flu / Minor Illness',
        summary: 'A minor illness is dragging down your energy.',
        severity: 'MINOR',
        source: 'ILLNESS',
        healthCap: 78,
        weeklyHealthDrain: 2,
        workPenalty: 6,
        baseDurationWeeks: 2,
        treatmentTags: ['checkup', 'illness', 'diagnosis'],
        naturalRecoveryChance: 0.35,
        worsenAfterWeeks: 4,
        worsenTo: 'respiratory_complication',
    },
    burnout_spiral: {
        id: 'burnout_spiral',
        label: 'Burnout Spiral',
        summary: 'Work pressure, poor sleep, and public stress are turning into real burnout.',
        severity: 'MODERATE',
        source: 'WORKLOAD',
        healthCap: 70,
        weeklyHealthDrain: 3,
        workPenalty: 12,
        baseDurationWeeks: 4,
        treatmentTags: ['stress', 'sleep', 'mental', 'retreat'],
        naturalRecoveryChance: 0.14,
        worsenAfterWeeks: 5,
        worsenTo: 'exhaustion_collapse',
        publicRisk: 0.08,
    },
    party_accident: {
        id: 'party_accident',
        label: 'Nightlife Accident',
        summary: 'A rough night created an injury and public-image risk.',
        severity: 'MODERATE',
        source: 'NIGHTLIFE',
        healthCap: 72,
        weeklyHealthDrain: 3,
        workPenalty: 10,
        baseDurationWeeks: 3,
        treatmentTags: ['injury', 'diagnosis', 'privacy'],
        naturalRecoveryChance: 0.12,
        worsenAfterWeeks: 3,
        worsenTo: 'stunt_fracture',
        publicRisk: 0.22,
    },
    stunt_fracture: {
        id: 'stunt_fracture',
        label: 'Fracture / Stunt Injury',
        summary: 'A physical injury is limiting roles, stunts, travel, and public energy.',
        severity: 'SEVERE',
        source: 'PRODUCTION',
        healthCap: 62,
        weeklyHealthDrain: 4,
        workPenalty: 20,
        baseDurationWeeks: 6,
        treatmentTags: ['injury', 'specialist', 'advanced', 'aftercare'],
        naturalRecoveryChance: 0.04,
        worsenAfterWeeks: 4,
        worsenTo: 'chronic_pain',
        publicRisk: 0.18,
    },
    respiratory_complication: {
        id: 'respiratory_complication',
        label: 'Respiratory Complication',
        summary: 'An untreated illness has become a serious medical complication.',
        severity: 'SEVERE',
        source: 'ILLNESS',
        healthCap: 55,
        weeklyHealthDrain: 5,
        workPenalty: 24,
        baseDurationWeeks: 5,
        treatmentTags: ['illness', 'specialist', 'advanced', 'aftercare'],
        naturalRecoveryChance: 0.05,
        worsenAfterWeeks: 4,
        deathRisk: 0.012,
        publicRisk: 0.12,
    },
    cancer_scare: {
        id: 'cancer_scare',
        label: 'Cancer Scare',
        summary: 'A serious screening result needs specialist follow-up before it becomes life-threatening.',
        severity: 'CRITICAL',
        source: 'ILLNESS',
        healthCap: 48,
        weeklyHealthDrain: 5,
        workPenalty: 28,
        baseDurationWeeks: 8,
        treatmentTags: ['screening', 'specialist', 'advanced', 'aftercare'],
        naturalRecoveryChance: 0.01,
        worsenAfterWeeks: 3,
        deathRisk: 0.02,
        publicRisk: 0.16,
    },
    chronic_pain: {
        id: 'chronic_pain',
        label: 'Chronic Pain',
        summary: 'A neglected injury is turning into a long-term body issue.',
        severity: 'MODERATE',
        source: 'PRODUCTION',
        healthCap: 74,
        weeklyHealthDrain: 2,
        workPenalty: 14,
        baseDurationWeeks: 10,
        treatmentTags: ['injury', 'aftercare', 'specialist'],
        naturalRecoveryChance: 0.03,
        worsenAfterWeeks: 8,
        publicRisk: 0.05,
    },
    exhaustion_collapse: {
        id: 'exhaustion_collapse',
        label: 'Exhaustion Collapse',
        summary: 'Burnout has become a serious physical crash.',
        severity: 'SEVERE',
        source: 'WORKLOAD',
        healthCap: 52,
        weeklyHealthDrain: 5,
        workPenalty: 26,
        baseDurationWeeks: 4,
        treatmentTags: ['stress', 'sleep', 'mental', 'advanced', 'retreat'],
        naturalRecoveryChance: 0.04,
        worsenAfterWeeks: 3,
        deathRisk: 0.006,
        publicRisk: 0.2,
    },
    old_age_complication: {
        id: 'old_age_complication',
        label: 'Old Age Complication',
        summary: 'Age-related health complications are narrowing the margin for mistakes.',
        severity: 'CRITICAL',
        source: 'OLD_AGE',
        healthCap: 58,
        weeklyHealthDrain: 4,
        workPenalty: 18,
        baseDurationWeeks: 999,
        treatmentTags: ['checkup', 'screening', 'specialist', 'advanced', 'aftercare'],
        naturalRecoveryChance: 0,
        worsenAfterWeeks: 2,
        deathRisk: 0.028,
        publicRisk: 0.06,
    },
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

const conditionSeed = (player: Player, absoluteWeek: number, salt: number) => {
    const idValue = String(player.id || player.name || 'actor')
        .split('')
        .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const raw = Math.sin(idValue * 19.13 + absoluteWeek * 41.7 + salt * 97.3) * 10000;
    return raw - Math.floor(raw);
};

export const getActiveHealthConditions = (player: Pick<Player, 'activeHealthConditions'>): HealthConditionState[] =>
    Array.isArray(player.activeHealthConditions) ? player.activeHealthConditions.filter(Boolean) : [];

export const createHealthCondition = (
    player: Player,
    conditionId: string,
    absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek),
    overrides: Partial<HealthConditionState> = {},
): HealthConditionState | null => {
    const definition = HEALTH_CONDITION_REGISTRY[conditionId];
    if (!definition) return null;
    return {
        id: `${conditionId}_${absoluteWeek}`,
        conditionId,
        label: definition.label,
        severity: definition.severity,
        source: definition.source,
        startedWeekAbsolute: absoluteWeek,
        expectedRecoveryWeekAbsolute: absoluteWeek + definition.baseDurationWeeks,
        healthCap: definition.healthCap,
        weeklyHealthDrain: definition.weeklyHealthDrain,
        workPenalty: definition.workPenalty,
        treatmentTags: [...definition.treatmentTags],
        treatedWeeks: 0,
        ignoredWeeks: 0,
        deathRisk: definition.deathRisk,
        ...overrides,
    };
};

export const getHealthConditionTreatmentTags = (programId?: string, providerId?: string, focusId?: string, supportId?: string): string[] => {
    const tags = new Set<string>();
    if (programId === 'regular_checkup') tags.add('checkup');
    if (programId === 'flu_care') tags.add('illness');
    if (programId === 'injury_rehab') tags.add('injury');
    if (programId === 'stress_burnout') tags.add('stress');
    if (programId === 'sleep_disorder') tags.add('sleep');
    if (programId === 'addiction_rehab') tags.add('mental');
    if (programId === 'cancer_screening') tags.add('screening');
    if (programId === 'camera_ready_care') tags.add('looks');
    if (providerId === 'private_doctor') tags.add('diagnosis');
    if (providerId === 'specialist_hospital' || providerId === 'medical_concierge') tags.add('specialist');
    if (providerId === 'medical_concierge') tags.add('privacy');
    if (focusId === 'full_diagnosis') tags.add('diagnosis');
    if (focusId === 'advanced_treatment') tags.add('advanced');
    if (focusId === 'camera_polish') tags.add('looks');
    if (supportId === 'followup_visit' || supportId === 'private_nurse' || supportId === 'recovery_retreat') tags.add('aftercare');
    if (supportId === 'recovery_retreat') tags.add('retreat');
    return [...tags];
};

export const getHealthTreatmentPrivacy = (providerId?: string, supportId?: string, privacyId?: string): HealthTreatmentPrivacy => {
    if (providerId === 'medical_concierge' || supportId === 'private_nurse' || supportId === 'recovery_retreat') return 'PRIVATE';
    if (privacyId === 'public') return 'PUBLIC_RISK';
    return 'STANDARD';
};

const hasCondition = (conditions: HealthConditionState[], conditionId: string) =>
    conditions.some((condition) => condition.conditionId === conditionId);

const shouldTriggerIncident = (player: Player, absoluteWeek: number, conditionId: string, threshold: number, salt: number) =>
    !hasCondition(getActiveHealthConditions(player), conditionId) && conditionSeed(player, absoluteWeek, salt) < threshold;

export const applyHealthConditionIncident = (
    player: Player,
    conditionId: string,
    options: HealthConditionIncidentOptions = {},
): HealthConditionIncidentResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const active = getActiveHealthConditions(player);
    if (hasCondition(active, conditionId)) {
        return { player, logs: [], news: [], inbox: [] };
    }

    const definition = HEALTH_CONDITION_REGISTRY[conditionId];
    if (!definition) return { player, logs: [], news: [], inbox: [] };
    const condition = createHealthCondition(player, conditionId, absoluteWeek, {
        id: `${conditionId}_${absoluteWeek}_${options.sourceLabel || 'incident'}`,
        isPublic: options.forcePublic || options.publicity === 'PUBLIC_RISK',
        expectedRecoveryWeekAbsolute: absoluteWeek + definition.baseDurationWeeks + Math.max(0, options.careDelayWeeks || 0),
    });
    if (!condition) return { player, logs: [], news: [], inbox: [] };

    const sourceLabel = options.sourceLabel || definition.source.toLowerCase();
    const detail = options.detail || definition.summary;
    const isSerious = condition.severity === 'SEVERE' || condition.severity === 'CRITICAL';
    const shouldCreateInbox = condition.severity !== 'MINOR';
    const shouldCreateNews = options.forcePublic
        || options.publicity === 'PUBLIC_RISK'
        || (options.publicity !== 'PRIVATE' && isSerious && (player.stats.fame || 0) >= 45);

    const logs: LogEntry[] = [{
        week: player.currentWeek,
        year: player.age,
        message: `🩺 ${condition.label} added from ${sourceLabel}. ${detail}`,
        type: condition.severity === 'MINOR' ? 'neutral' : 'negative',
    }];

    const inbox: Message[] = shouldCreateInbox ? [{
        id: `msg_health_${condition.conditionId}_${absoluteWeek}_${Date.now()}`,
        sender: 'Medical Team',
        subject: `${condition.label} needs attention`,
        text: `${detail} Wellness now has treatment routes that match this condition. Stronger care can clear it faster; private care keeps it quieter.`,
        type: 'SYSTEM',
        data: { conditionId: condition.conditionId, condition },
        isRead: false,
        weekSent: player.currentWeek,
        expiresIn: 12,
    }] : [];

    const news: NewsItem[] = shouldCreateNews ? [{
        id: `news_health_incident_${condition.conditionId}_${absoluteWeek}_${Date.now()}`,
        headline: `${player.name || 'Actor'} dealing with ${condition.label.toLowerCase()}`,
        subtext: `${sourceLabel} has created visible health concern around upcoming commitments.`,
        category: 'YOU',
        week: player.currentWeek,
        year: player.age,
        impactLevel: isSerious ? 'HIGH' : 'MEDIUM',
    }] : [];

    return {
        player: {
            ...player,
            activeHealthConditions: [condition, ...active].slice(0, 6),
            flags: {
                ...(player.flags || {}),
                activeHealthConditionCount: Math.min(6, active.length + 1),
                healthConditionCap: Math.min(condition.healthCap, ...(active.map(item => item.healthCap))),
            },
        },
        condition,
        logs,
        news,
        inbox,
    };
};

export const processHealthConditionsWeek = (player: Player): HealthConditionWeekResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const logs: LogEntry[] = [];
    const news: NewsItem[] = [];
    let conditions = getActiveHealthConditions(player);
    const newConditions: HealthConditionState[] = [];
    const health = Number(player.stats.health || 0);
    const happiness = Number(player.stats.happiness || 0);
    const body = Number(player.stats.body || 0);
    const fame = Number(player.stats.fame || 0);
    const burnoutWeeks = Number(player.flags?.burnoutWeeks || 0);

    if ((happiness < 28 || burnoutWeeks >= 2) && shouldTriggerIncident(player, absoluteWeek, 'workload_headache', 0.18, 1)) {
        const condition = createHealthCondition(player, 'workload_headache', absoluteWeek);
        if (condition) newConditions.push(condition);
    }

    if ((happiness < 12 || burnoutWeeks >= 4) && shouldTriggerIncident(player, absoluteWeek, 'burnout_spiral', 0.16, 2)) {
        const condition = createHealthCondition(player, 'burnout_spiral', absoluteWeek);
        if (condition) newConditions.push(condition);
    }

    if (health < 62 && shouldTriggerIncident(player, absoluteWeek, 'flu_bug', 0.1, 3)) {
        const condition = createHealthCondition(player, 'flu_bug', absoluteWeek);
        if (condition) newConditions.push(condition);
    }

    if (body < 22 && shouldTriggerIncident(player, absoluteWeek, 'stunt_fracture', 0.08, 4)) {
        const condition = createHealthCondition(player, 'stunt_fracture', absoluteWeek);
        if (condition) newConditions.push(condition);
    }

    if (player.age >= 68 && shouldTriggerIncident(player, absoluteWeek, 'old_age_complication', 0.08 + Math.min(0.18, (player.age - 68) * 0.01), 5)) {
        const condition = createHealthCondition(player, 'old_age_complication', absoluteWeek);
        if (condition) newConditions.push(condition);
    }

    if (player.age >= 45 && health < 50 && shouldTriggerIncident(player, absoluteWeek, 'cancer_scare', 0.025, 6)) {
        const condition = createHealthCondition(player, 'cancer_scare', absoluteWeek);
        if (condition) newConditions.push(condition);
    }

    conditions = [...newConditions, ...conditions];
    if (newConditions.length) {
        newConditions.forEach((condition) => {
            logs.push({
                week: player.currentWeek,
                year: player.age,
                message: `🩺 ${condition.label}: ${HEALTH_CONDITION_REGISTRY[condition.conditionId]?.summary || 'Medical attention may be needed.'}`,
                type: condition.severity === 'MINOR' ? 'neutral' : 'negative',
            });
        });
    }

    let nextHealth = player.stats.health;
    let nextReputation = player.stats.reputation;
    let deathTriggered = false;
    const progressed = conditions.flatMap((condition) => {
        const definition = HEALTH_CONDITION_REGISTRY[condition.conditionId];
        if (!definition) return [];
        const ignoredWeeks = condition.ignoredWeeks + 1;
        const conditionAge = absoluteWeek - condition.startedWeekAbsolute;
        const naturalRecoveryAllowed = condition.treatedWeeks > 0 || definition.severity === 'MINOR';
        const recoveredNaturally = naturalRecoveryAllowed
            && conditionAge >= definition.baseDurationWeeks
            && conditionSeed(player, absoluteWeek, conditionAge + condition.conditionId.length) < definition.naturalRecoveryChance;

        if (recoveredNaturally) {
            logs.push({
                week: player.currentWeek,
                year: player.age,
                message: `✅ ${condition.label} cleared after recovery time.`,
                type: 'positive',
            });
            return [];
        }

        const shouldWorsen = !!definition.worsenTo && ignoredWeeks >= definition.worsenAfterWeeks;
        if (shouldWorsen) {
            const worsened = createHealthCondition(player, definition.worsenTo!, absoluteWeek, {
                id: `${definition.worsenTo}_${absoluteWeek}_${condition.id}`,
                ignoredWeeks: 0,
            });
            if (worsened) {
                logs.push({
                    week: player.currentWeek,
                    year: player.age,
                    message: `⚠️ ${condition.label} worsened into ${worsened.label}.`,
                    type: 'negative',
                });
                return [worsened];
            }
        }

        nextHealth = clamp(Math.min(nextHealth, condition.healthCap) - condition.weeklyHealthDrain);
        const publicChance = definition.publicRisk || 0;
        if (!condition.isPublic && fame >= 40 && publicChance > 0 && conditionSeed(player, absoluteWeek, condition.id.length) < publicChance) {
            condition.isPublic = true;
            nextReputation = clamp(nextReputation - (condition.severity === 'SEVERE' || condition.severity === 'CRITICAL' ? 1.5 : 0.5));
            news.push({
                id: `news_condition_${condition.conditionId}_${absoluteWeek}`,
                headline: `${player.name} faces ${condition.label.toLowerCase()} concerns`,
                subtext: 'The story is spreading because the health issue is starting to affect public commitments.',
                category: 'YOU',
                week: player.currentWeek,
                year: player.age,
                impactLevel: condition.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
            });
        }

        const deathRisk = (condition.deathRisk || 0) + Math.max(0, ignoredWeeks - definition.worsenAfterWeeks) * 0.004;
        if (deathRisk > 0 && nextHealth < 18 && conditionSeed(player, absoluteWeek, condition.id.length + 31) < deathRisk) {
            deathTriggered = true;
        }

        return [{
            ...condition,
            ignoredWeeks,
            lastProgressWeekAbsolute: absoluteWeek,
        }];
    });

    const strongestCap = progressed.length
        ? Math.min(...progressed.map((condition) => condition.healthCap))
        : undefined;
    if (strongestCap !== undefined) {
        nextHealth = Math.min(nextHealth, strongestCap);
    }

    const nextPlayer: Player = {
        ...player,
        stats: {
            ...player.stats,
            health: clamp(nextHealth),
            reputation: clamp(nextReputation),
        },
        activeHealthConditions: progressed.slice(0, 6),
        flags: {
            ...(player.flags || {}),
            activeHealthConditionCount: progressed.length,
            healthConditionCap: strongestCap,
            isDead: deathTriggered ? true : player.flags?.isDead,
        },
    };

    if (deathTriggered) {
        logs.push({
            week: player.currentWeek,
            year: player.age,
            message: '🕊️ A severe untreated health condition became fatal.',
            type: 'negative',
        });
    }

    return { player: nextPlayer, logs, news };
};

export const resolveHealthConditionTreatment = (
    player: Player,
    treatmentTags: string[],
    carePower: number,
    treatmentPrivacy: HealthTreatmentPrivacy = 'STANDARD',
): { activeHealthConditions: HealthConditionState[]; treatedConditions: HealthConditionState[]; effectSummary?: string } => {
    const active = getActiveHealthConditions(player);
    if (!active.length || !treatmentTags.length) {
        return { activeHealthConditions: active, treatedConditions: [] };
    }
    const tagSet = new Set(treatmentTags);
    const treatedConditions: HealthConditionState[] = [];
    const remaining: HealthConditionState[] = [];
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const oldAgeCareDelayWeeks = treatmentPrivacy === 'PRIVATE' ? 3 : 2;
    let oldAgeStabilized = false;

    active.forEach((condition) => {
        const matches = condition.treatmentTags.filter((tag) => tagSet.has(tag)).length;
        const neededPower = condition.severity === 'CRITICAL' ? 4 : condition.severity === 'SEVERE' ? 3 : condition.severity === 'MODERATE' ? 2 : 1;
        if (matches > 0 && carePower >= neededPower) {
            if (condition.conditionId === 'old_age_complication') {
                oldAgeStabilized = true;
                treatedConditions.push(condition);
                remaining.push({
                    ...condition,
                    healthCap: Math.min(76, condition.healthCap + Math.round(carePower * 4)),
                    weeklyHealthDrain: Math.max(1, condition.weeklyHealthDrain - Math.ceil(carePower / 2)),
                    treatedWeeks: condition.treatedWeeks + 1,
                    ignoredWeeks: 0,
                    isPublic: treatmentPrivacy === 'PRIVATE' ? false : condition.isPublic,
                    expectedRecoveryWeekAbsolute: Math.max(condition.expectedRecoveryWeekAbsolute, absoluteWeek + oldAgeCareDelayWeeks),
                });
                return;
            }
            treatedConditions.push(condition);
            return;
        }
        if (matches > 0) {
            remaining.push({
                ...condition,
                healthCap: Math.min(96, condition.healthCap + Math.round(carePower * 5)),
                weeklyHealthDrain: Math.max(0, condition.weeklyHealthDrain - Math.ceil(carePower / 2)),
                treatedWeeks: condition.treatedWeeks + 1,
                ignoredWeeks: 0,
                isPublic: treatmentPrivacy === 'PRIVATE' ? false : condition.isPublic,
            });
            return;
        }
        remaining.push(condition);
    });

    return {
        activeHealthConditions: remaining,
        treatedConditions,
        effectSummary: oldAgeStabilized
            ? `Old age complication stabilized for ${oldAgeCareDelayWeeks} weeks`
            : treatedConditions.length
            ? `${treatedConditions.map((condition) => condition.label).join(', ')} treated`
            : treatmentTags.length ? 'Condition pressure reduced' : undefined,
    };
};
