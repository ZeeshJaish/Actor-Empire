import type { Player, PregnancyCarrier } from '../../types';
import { getAbsoluteWeek } from '../legacyLogic';
import { getPlayerLanguage } from '../i18n';
import { getHealthConditionLabel } from '../healthConditions';

/* Week Ahead (2026-11-12): the small step App.tsx ran right after processGameWeek (baby due, a new medical
   condition, the QA baby flag), moved here unchanged so the week can be finished in the background worker
   and on the main thread by the same code. The screen parts (the naming sheet, the medical prompt) are
   returned as data; App shows them when the week is committed. */

export type WeekPendingBabyNaming = {
    partnerId: string;
    partnerName: string;
    pregnancyCarrier?: PregnancyCarrier;
    babyGender: 'MALE' | 'FEMALE';
    suggestedFirstName: string;
    birthWeekAbsolute: number;
    eventWeek: number;
    eventYear: number;
    shouldCreateScandalNews: boolean;
};

export type WeekMedicalPrompt = {
    conditionName: string;
    severity?: string;
    healthCap?: number;
};

export interface PostWeekSync {
    player: Player;
    shouldTriggerBabyQa: boolean;
    babyNamingDue: WeekPendingBabyNaming | null;
    medicalPromptToShow: WeekMedicalPrompt | null;
}

export const getMedicalPromptCooldownWeeks = (severity?: string) => {
    if (severity === 'MINOR') return 2;
    if (severity === 'MODERATE') return 4;
    return 0;
};

export const getMedicalPromptSeverityRank = (severity?: string) => {
    if (severity === 'CRITICAL') return 4;
    if (severity === 'SEVERE') return 3;
    if (severity === 'MODERATE') return 2;
    if (severity === 'MINOR') return 1;
    return 0;
};

/** Health conditions the player had before the week, so a new one can be told apart. */
export const collectHealthConditionIds = (player: Player): Set<string> => new Set(
    (Array.isArray(player.activeHealthConditions) ? player.activeHealthConditions : [])
        .map(condition => condition?.id)
        .filter(Boolean),
);

export const syncPlayerAfterWeek = (newPlayerState: Player, previousHealthConditionIds: ReadonlySet<unknown>): PostWeekSync => {
    const shouldTriggerBabyQa = !!newPlayerState.flags?.qaBabyNamingNextWeek;
    let syncedPlayerState = shouldTriggerBabyQa
        ? {
            ...newPlayerState,
            flags: {
                ...newPlayerState.flags,
                qaBabyNamingNextWeek: false,
            }
        }
        : newPlayerState;
    let babyNamingDue: WeekPendingBabyNaming | null = null;

    if (syncedPlayerState.activePregnancy) {
        const pregnancy = syncedPlayerState.activePregnancy;
        const currentAbsoluteWeek = getAbsoluteWeek(syncedPlayerState.age, syncedPlayerState.currentWeek);
        const weeksLeft = typeof pregnancy.birthWeekAbsolute === 'number'
            ? pregnancy.birthWeekAbsolute - currentAbsoluteWeek
            : (pregnancy.weeksLeft || 1) - 1;

        if (weeksLeft <= 0) {
            const partnerName = pregnancy.partnerName
                || syncedPlayerState.relationships.find(rel => rel.id === pregnancy.partnerId)?.name
                || 'Your partner';
            babyNamingDue = {
                partnerId: pregnancy.partnerId,
                partnerName,
                pregnancyCarrier: pregnancy.pregnancyCarrier || 'PARTNER',
                babyGender: pregnancy.babyGender || (Math.random() > 0.5 ? 'MALE' : 'FEMALE'),
                suggestedFirstName: pregnancy.suggestedFirstName || (Math.random() > 0.5 ? 'Leo' : 'Mia'),
                birthWeekAbsolute: currentAbsoluteWeek,
                eventWeek: syncedPlayerState.currentWeek,
                eventYear: syncedPlayerState.age,
                shouldCreateScandalNews: !!pregnancy.shouldCreateScandalNews,
            };
            syncedPlayerState = {
                ...syncedPlayerState,
                activePregnancy: undefined,
                logs: [
                    { week: syncedPlayerState.currentWeek, year: syncedPlayerState.age, message: `🍼 The baby with ${partnerName} is here. Time to choose a name.`, type: 'positive' as const },
                    ...syncedPlayerState.logs,
                ].slice(0, 50),
            };
        } else {
            syncedPlayerState = {
                ...syncedPlayerState,
                activePregnancy: {
                    ...pregnancy,
                    weeksLeft,
                    birthWeekAbsolute: pregnancy.birthWeekAbsolute || currentAbsoluteWeek + weeksLeft,
                },
            };
        }
    }
    const newMedicalCondition = (Array.isArray(syncedPlayerState.activeHealthConditions) ? syncedPlayerState.activeHealthConditions : [])
        .filter(condition => condition?.id && !previousHealthConditionIds.has(condition.id))
        .sort((a, b) => getMedicalPromptSeverityRank(b.severity) - getMedicalPromptSeverityRank(a.severity))[0];
    let medicalPromptToShow: WeekMedicalPrompt | null = null;

    if (newMedicalCondition) {
        const currentMedicalPromptWeek = getAbsoluteWeek(syncedPlayerState.age, syncedPlayerState.currentWeek);
        const lastMedicalPromptWeek = Number(syncedPlayerState.flags?.lastMedicalPromptAbsoluteWeek ?? -999);
        const promptCooldownWeeks = getMedicalPromptCooldownWeeks(newMedicalCondition.severity);
        const shouldShowMedicalPrompt = promptCooldownWeeks === 0 || currentMedicalPromptWeek - lastMedicalPromptWeek >= promptCooldownWeeks;

        if (shouldShowMedicalPrompt) {
            const conditionName = getHealthConditionLabel(newMedicalCondition, getPlayerLanguage(syncedPlayerState));
            syncedPlayerState = {
                ...syncedPlayerState,
                flags: {
                    ...(syncedPlayerState.flags || {}),
                    lastMedicalPromptAbsoluteWeek: currentMedicalPromptWeek,
                },
            };
            medicalPromptToShow = {
                conditionName,
                severity: newMedicalCondition.severity,
                healthCap: newMedicalCondition.healthCap,
            };
        }
    }
    return { player: syncedPlayerState, shouldTriggerBabyQa, babyNamingDue, medicalPromptToShow };
};
