import type {
    Business,
    LogEntry,
    NewsItem,
    Player,
    StudioFinanceEntry,
    StudioMandateAutoProduction,
    StudioMandateBudgetAppetite,
    StudioMandateCreativeAppetite,
    StudioMandateFocus,
    StudioMandateIpStrategy,
    StudioMandateObjective,
    StudioMandateReleasePace,
    StudioMandateTalentPolicy,
    StudioOperatingMandate,
    SubsidiaryOperatingModel,
    Transaction,
    GameLanguage,
} from '../types';
import { normalizeStudioState } from './businessLogic';
import { t } from './i18n';

export interface OperatingModelDefinition {
    id: SubsidiaryOperatingModel;
    label: string;
    shortLabel: string;
    control: string;
    description: string;
    benefits: string[];
    tradeoffs: string[];
    accent: 'EMERALD' | 'SKY' | 'AMBER';
}

export interface StudioMandateOption<T extends string> {
    id: T;
    label: string;
    shortLabel: string;
    description: string;
}

export interface StudioMandateOptionGroup<T extends string> {
    key: keyof StudioOperatingMandate;
    label: string;
    commandLabel: string;
    options: StudioMandateOption<T>[];
}

export interface SubsidiaryControlProfile {
    canSetMandate: boolean;
    canDirectProduce: boolean;
    canAutoProduce: boolean;
    controlCopy: string;
    productionCopy: string;
}

export type StudioTreasuryAction = 'INJECT' | 'WITHDRAW';
export type StudioTreasuryCounterparty = 'PERSONAL' | 'HQ';

const uniqueById = <T extends { id: string }>(items: T[]): T[] => {
    const seen = new Set<string>();
    return items.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
};

const uniqueStrings = (items: string[]): string[] => Array.from(new Set(items.filter(Boolean)));

const getParentStudio = (player: Pick<Player, 'businesses'>, excludeStudioId?: string): Business | undefined => {
    const group = getStudioGroup(player);
    if (group.parentStudio && group.parentStudio.id !== excludeStudioId) return group.parentStudio;
    return group.allStudios.find(studio => studio.id !== excludeStudioId && !isAcquiredStudio(studio));
};

const getMergerIntegrationCost = (studio: Business): number => Math.max(5_000_000, Math.round((studio.stats.valuation || 0) * 0.04));

const createStudioFinanceEntry = ({
    id,
    player,
    amount,
    type,
    label,
}: {
    id: string;
    player: Player;
    amount: number;
    type: StudioFinanceEntry['type'];
    label: string;
}): StudioFinanceEntry => ({
    id,
    week: player.currentWeek,
    year: player.age,
    amount,
    type,
    label,
});

const createPersonalTransaction = ({
    player,
    amount,
    label,
}: {
    player: Player;
    amount: number;
    label: string;
}): Transaction => ({
    id: `studio_treasury_tx_${player.age}_${player.currentWeek}_${Date.now()}`,
    week: player.currentWeek,
    year: player.age,
    amount,
    category: amount >= 0 ? 'BUSINESS' : 'ASSET',
    description: label,
});

const OPERATING_MODEL_TEMPLATES: Array<Pick<OperatingModelDefinition, 'id' | 'accent'>> = [
    { id: 'INDEPENDENT_LABEL', accent: 'EMERALD' },
    { id: 'CONTROLLED_SUBSIDIARY', accent: 'SKY' },
    { id: 'FULL_MERGER', accent: 'AMBER' },
];

const createMandateOption = <T extends string>(language: GameLanguage, group: string, id: T): StudioMandateOption<T> => ({
    id,
    label: t(language, `services.studioGroup.mandate.${group}.${id}.label`),
    shortLabel: t(language, `services.studioGroup.mandate.${group}.${id}.shortLabel`),
    description: t(language, `services.studioGroup.mandate.${group}.${id}.description`),
});

export const getOperatingModels = (language: GameLanguage = 'en'): OperatingModelDefinition[] => (
    OPERATING_MODEL_TEMPLATES.map(template => ({
        ...template,
        label: t(language, `services.studioGroup.operatingModel.${template.id}.label`),
        shortLabel: t(language, `services.studioGroup.operatingModel.${template.id}.shortLabel`),
        control: t(language, `services.studioGroup.operatingModel.${template.id}.control`),
        description: t(language, `services.studioGroup.operatingModel.${template.id}.description`),
        benefits: [1, 2, 3].map(index => t(language, `services.studioGroup.operatingModel.${template.id}.benefit.${index}`)),
        tradeoffs: [1, 2].map(index => t(language, `services.studioGroup.operatingModel.${template.id}.tradeoff.${index}`)),
    }))
);

export const getMandateFocusOptions = (language: GameLanguage = 'en'): StudioMandateOption<StudioMandateFocus>[] => [
    createMandateOption(language, 'focus', 'MOVIES_FIRST'),
    createMandateOption(language, 'focus', 'SERIES_FIRST'),
    createMandateOption(language, 'focus', 'BALANCED_SLATE'),
    createMandateOption(language, 'focus', 'FRANCHISE_EXPANSION'),
    createMandateOption(language, 'focus', 'PRESTIGE_AWARDS'),
    createMandateOption(language, 'focus', 'COMMERCIAL_HITS'),
];

export const getMandateBudgetOptions = (language: GameLanguage = 'en'): StudioMandateOption<StudioMandateBudgetAppetite>[] => [
    createMandateOption(language, 'budget', 'LEAN'),
    createMandateOption(language, 'budget', 'STANDARD'),
    createMandateOption(language, 'budget', 'PREMIUM'),
];

export const getMandateReleasePaceOptions = (language: GameLanguage = 'en'): StudioMandateOption<StudioMandateReleasePace>[] => [
    createMandateOption(language, 'releasePace', 'CAREFUL'),
    createMandateOption(language, 'releasePace', 'STEADY'),
    createMandateOption(language, 'releasePace', 'AGGRESSIVE'),
];

export const getMandateIpOptions = (language: GameLanguage = 'en'): StudioMandateOption<StudioMandateIpStrategy>[] => [
    createMandateOption(language, 'ipStrategy', 'ORIGINALS'),
    createMandateOption(language, 'ipStrategy', 'OWNED_IP'),
    createMandateOption(language, 'ipStrategy', 'SEQUELS_REBOOTS'),
    createMandateOption(language, 'ipStrategy', 'MIXED'),
];

export const getMandateTalentOptions = (language: GameLanguage = 'en'): StudioMandateOption<StudioMandateTalentPolicy>[] => [
    createMandateOption(language, 'talentPolicy', 'IN_HOUSE'),
    createMandateOption(language, 'talentPolicy', 'RISING_STARS'),
    createMandateOption(language, 'talentPolicy', 'STAR_POWER'),
    createMandateOption(language, 'talentPolicy', 'MIXED'),
];

export const getMandateObjectiveOptions = (language: GameLanguage = 'en'): StudioMandateOption<StudioMandateObjective>[] => [
    createMandateOption(language, 'objective', 'PROFIT_FIRST'),
    createMandateOption(language, 'objective', 'PRESTIGE_FIRST'),
    createMandateOption(language, 'objective', 'COMMERCIAL_FIRST'),
    createMandateOption(language, 'objective', 'BALANCED'),
];

export const getMandateCreativeAppetiteOptions = (language: GameLanguage = 'en'): StudioMandateOption<StudioMandateCreativeAppetite>[] => [
    createMandateOption(language, 'creativeAppetite', 'SAFE'),
    createMandateOption(language, 'creativeAppetite', 'CALCULATED'),
    createMandateOption(language, 'creativeAppetite', 'BOLD'),
];

export const getMandateAutoProductionOptions = (language: GameLanguage = 'en'): StudioMandateOption<StudioMandateAutoProduction>[] => [
    createMandateOption(language, 'autoProduction', 'PAUSED'),
    createMandateOption(language, 'autoProduction', 'BOARD_REVIEW'),
    createMandateOption(language, 'autoProduction', 'APPROVED'),
];

const createMandateGroup = <T extends string>(
    language: GameLanguage,
    key: keyof StudioOperatingMandate,
    options: StudioMandateOption<T>[],
): StudioMandateOptionGroup<T> => ({
    key,
    label: t(language, `services.studioGroup.mandateGroup.${key}.label`),
    commandLabel: t(language, `services.studioGroup.mandateGroup.${key}.commandLabel`),
    options,
});

export const getStudioMandateGroups = (language: GameLanguage = 'en'): StudioMandateOptionGroup<string>[] => [
    createMandateGroup(language, 'focus', getMandateFocusOptions(language)),
    createMandateGroup(language, 'budgetAppetite', getMandateBudgetOptions(language)),
    createMandateGroup(language, 'releasePace', getMandateReleasePaceOptions(language)),
    createMandateGroup(language, 'ipStrategy', getMandateIpOptions(language)),
    createMandateGroup(language, 'talentPolicy', getMandateTalentOptions(language)),
    createMandateGroup(language, 'objective', getMandateObjectiveOptions(language)),
    createMandateGroup(language, 'creativeAppetite', getMandateCreativeAppetiteOptions(language)),
    createMandateGroup(language, 'autoProduction', getMandateAutoProductionOptions(language)),
];

export const OPERATING_MODELS = getOperatingModels('en');
export const MANDATE_FOCUS_OPTIONS = getMandateFocusOptions('en');
export const MANDATE_BUDGET_OPTIONS = getMandateBudgetOptions('en');
export const MANDATE_RELEASE_PACE_OPTIONS = getMandateReleasePaceOptions('en');
export const MANDATE_IP_OPTIONS = getMandateIpOptions('en');
export const MANDATE_TALENT_OPTIONS = getMandateTalentOptions('en');
export const MANDATE_OBJECTIVE_OPTIONS = getMandateObjectiveOptions('en');
export const MANDATE_CREATIVE_APPETITE_OPTIONS = getMandateCreativeAppetiteOptions('en');
export const MANDATE_AUTO_PRODUCTION_OPTIONS = getMandateAutoProductionOptions('en');
export const STUDIO_MANDATE_GROUPS = getStudioMandateGroups('en');

export const DEFAULT_STUDIO_OPERATING_MANDATE: StudioOperatingMandate = {
    focus: 'BALANCED_SLATE',
    budgetAppetite: 'STANDARD',
    releasePace: 'STEADY',
    ipStrategy: 'MIXED',
    talentPolicy: 'MIXED',
    objective: 'BALANCED',
    creativeAppetite: 'CALCULATED',
    autoProduction: 'BOARD_REVIEW',
};

export const isAcquiredStudio = (business: Business): boolean => (
    business.type === 'PRODUCTION_HOUSE'
    && (
        business.studioState?.acquisitionOrigin === 'STUDIO_ACQUISITION'
        || business.config.productionType === 'Acquired Studio'
    )
);

export const getStudioGroup = (player: Pick<Player, 'businesses'>): {
    parentStudio?: Business;
    subsidiaries: Business[];
    mergedStudios: Business[];
    allStudios: Business[];
} => {
    const allStudios = player.businesses.filter(business => business.type === 'PRODUCTION_HOUSE');
    const acquiredStudios = allStudios.filter(isAcquiredStudio);
    return {
        parentStudio: allStudios.find(business => !isAcquiredStudio(business)) || allStudios[0],
        subsidiaries: acquiredStudios.filter(studio => studio.studioState?.operatingModel !== 'FULL_MERGER'),
        mergedStudios: acquiredStudios.filter(studio => studio.studioState?.operatingModel === 'FULL_MERGER'),
        allStudios,
    };
};

export const getOperatingModelDefinition = (
    model?: SubsidiaryOperatingModel,
    language: GameLanguage = 'en',
): OperatingModelDefinition | undefined => getOperatingModels(language).find(definition => definition.id === model);

export const getStudioOperatingMandate = (studio: Business): StudioOperatingMandate => ({
    ...DEFAULT_STUDIO_OPERATING_MANDATE,
    ...(studio.studioState?.operatingMandate || {}),
});

export const getMandateOptionLabel = (
    key: keyof StudioOperatingMandate,
    value: string | undefined,
    language: GameLanguage = 'en',
): string => {
    const group = getStudioMandateGroups(language).find(optionGroup => optionGroup.key === key);
    return group?.options.find(option => option.id === value)?.shortLabel || value || t(language, 'services.studioGroup.mandate.unset');
};

const getControlProfileCopy = (language: GameLanguage, copyKey: SubsidiaryOperatingModel | 'UNSET') => ({
    controlCopy: t(language, `services.studioGroup.controlProfile.${copyKey}.controlCopy`),
    productionCopy: t(language, `services.studioGroup.controlProfile.${copyKey}.productionCopy`),
});

export const getSubsidiaryControlProfile = (
    studio: Business,
    language: GameLanguage = 'en',
): SubsidiaryControlProfile => {
    const model = studio.studioState?.operatingModel;
    if (model === 'INDEPENDENT_LABEL') {
        return {
            canSetMandate: true,
            canDirectProduce: false,
            canAutoProduce: true,
            ...getControlProfileCopy(language, model),
        };
    }
    if (model === 'CONTROLLED_SUBSIDIARY') {
        return {
            canSetMandate: true,
            canDirectProduce: true,
            canAutoProduce: true,
            ...getControlProfileCopy(language, model),
        };
    }
    if (model === 'FULL_MERGER') {
        return {
            canSetMandate: false,
            canDirectProduce: false,
            canAutoProduce: false,
            ...getControlProfileCopy(language, model),
        };
    }
    return {
        canSetMandate: false,
        canDirectProduce: false,
        canAutoProduce: false,
        ...getControlProfileCopy(language, 'UNSET'),
    };
};

export const setSubsidiaryOperatingModel = ({
    player,
    studioId,
    model,
}: {
    player: Player;
    studioId: string;
    model: SubsidiaryOperatingModel;
}): {
    success: boolean;
    player: Player;
    studio?: Business;
    reason?: 'STUDIO_NOT_FOUND' | 'NOT_ACQUIRED_STUDIO';
} => {
    const studio = player.businesses.find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE');
    if (!studio) return { success: false, player, reason: 'STUDIO_NOT_FOUND' };
    if (!isAcquiredStudio(studio)) return { success: false, player, studio, reason: 'NOT_ACQUIRED_STUDIO' };

    const updatedStudio: Business = {
        ...studio,
        studioState: {
            ...studio.studioState!,
            acquisitionOrigin: 'STUDIO_ACQUISITION',
            operatingModel: model,
            operatingModelChangedWeek: player.currentWeek,
            operatingModelChangedYear: player.age,
        },
    };
    return {
        success: true,
        studio: updatedStudio,
        player: {
            ...player,
            businesses: player.businesses.map(business => business.id === studioId ? updatedStudio : business),
        },
    };
};

export const setStudioOperatingMandate = ({
    player,
    studioId,
    mandate,
}: {
    player: Player;
    studioId: string;
    mandate: StudioOperatingMandate;
}): {
    success: boolean;
    player: Player;
    studio?: Business;
    reason?: 'STUDIO_NOT_FOUND' | 'NOT_ACQUIRED_STUDIO' | 'MERGED_STUDIO';
} => {
    const studio = player.businesses.find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE');
    if (!studio) return { success: false, player, reason: 'STUDIO_NOT_FOUND' };
    if (!isAcquiredStudio(studio)) return { success: false, player, studio, reason: 'NOT_ACQUIRED_STUDIO' };
    if (studio.studioState?.operatingModel === 'FULL_MERGER') {
        return { success: false, player, studio, reason: 'MERGED_STUDIO' };
    }

    const updatedMandate: StudioOperatingMandate = {
        ...DEFAULT_STUDIO_OPERATING_MANDATE,
        ...mandate,
        updatedWeek: player.currentWeek,
        updatedYear: player.age,
    };

    const updatedStudio: Business = {
        ...studio,
        studioState: {
            ...studio.studioState!,
            acquisitionOrigin: 'STUDIO_ACQUISITION',
            operatingMandate: updatedMandate,
        },
    };

    return {
        success: true,
        studio: updatedStudio,
        player: {
            ...player,
            businesses: player.businesses.map(business => business.id === studioId ? updatedStudio : business),
        },
    };
};

export const performStudioTreasuryTransfer = ({
    player,
    studioId,
    action,
    counterparty,
    amount,
}: {
    player: Player;
    studioId: string;
    action: StudioTreasuryAction;
    counterparty: StudioTreasuryCounterparty;
    amount: number;
}): {
    success: boolean;
    player: Player;
    studio?: Business;
    parentStudio?: Business;
    reason?:
        | 'INVALID_AMOUNT'
        | 'STUDIO_NOT_FOUND'
        | 'NOT_ACQUIRED_STUDIO'
        | 'MERGED_STUDIO'
        | 'HQ_NOT_FOUND'
        | 'INSUFFICIENT_PERSONAL_CASH'
        | 'INSUFFICIENT_HQ_CAPITAL'
        | 'INSUFFICIENT_STUDIO_CAPITAL';
} => {
    const safeAmount = Math.floor(Number(amount) || 0);
    if (safeAmount <= 0) return { success: false, player, reason: 'INVALID_AMOUNT' };

    const studio = player.businesses.find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE');
    if (!studio?.studioState) return { success: false, player, reason: 'STUDIO_NOT_FOUND' };
    if (!isAcquiredStudio(studio)) return { success: false, player, studio, reason: 'NOT_ACQUIRED_STUDIO' };
    if (studio.studioState.operatingModel === 'FULL_MERGER') return { success: false, player, studio, reason: 'MERGED_STUDIO' };

    const parentStudio = counterparty === 'HQ' ? getParentStudio(player, studioId) : undefined;
    if (counterparty === 'HQ' && !parentStudio?.studioState) {
        return { success: false, player, studio, reason: 'HQ_NOT_FOUND' };
    }
    if (action === 'INJECT' && counterparty === 'PERSONAL' && player.money < safeAmount) {
        return { success: false, player, studio, reason: 'INSUFFICIENT_PERSONAL_CASH' };
    }
    if (action === 'INJECT' && counterparty === 'HQ' && (parentStudio?.balance || 0) < safeAmount) {
        return { success: false, player, studio, parentStudio, reason: 'INSUFFICIENT_HQ_CAPITAL' };
    }
    if (action === 'WITHDRAW' && studio.balance < safeAmount) {
        return { success: false, player, studio, parentStudio, reason: 'INSUFFICIENT_STUDIO_CAPITAL' };
    }

    const counterpartyLabel = counterparty === 'HQ' ? 'Headquarters' : 'Personal balance';
    const studioLedgerEntry = createStudioFinanceEntry({
        id: `studio_treasury_${action.toLowerCase()}_${counterparty.toLowerCase()}_${studio.id}_${player.age}_${player.currentWeek}_${Date.now()}`,
        player,
        amount: action === 'INJECT' ? safeAmount : -safeAmount,
        type: action === 'INJECT' ? 'CAPITAL_INJECTION' : 'CAPITAL_WITHDRAWAL',
        label: action === 'INJECT'
            ? `${counterpartyLabel} capital injection`
            : `Withdrawal to ${counterpartyLabel}`,
    });

    const updatedStudio: Business = {
        ...studio,
        balance: action === 'INJECT' ? studio.balance + safeAmount : studio.balance - safeAmount,
        studioState: {
            ...studio.studioState,
            financeLedger: [
                studioLedgerEntry,
                ...((studio.studioState.financeLedger || [])),
            ].slice(0, 200),
        },
    };

    let nextMoney = player.money;
    let updatedParentStudio = parentStudio;
    const financeHistory = [...(player.finance?.history || [])];

    if (counterparty === 'PERSONAL') {
        nextMoney = action === 'INJECT' ? player.money - safeAmount : player.money + safeAmount;
        financeHistory.unshift(createPersonalTransaction({
            player,
            amount: action === 'INJECT' ? -safeAmount : safeAmount,
            label: action === 'INJECT'
                ? `${studio.name} capital injection`
                : `${studio.name} owner withdrawal`,
        }));
    }

    if (counterparty === 'HQ' && parentStudio?.studioState) {
        const hqLedgerEntry = createStudioFinanceEntry({
            id: `studio_treasury_hq_${action.toLowerCase()}_${studio.id}_${player.age}_${player.currentWeek}_${Date.now()}`,
            player,
            amount: action === 'INJECT' ? -safeAmount : safeAmount,
            type: action === 'INJECT' ? 'CAPITAL_WITHDRAWAL' : 'CAPITAL_INJECTION',
            label: action === 'INJECT'
                ? `${studio.name} subsidiary funding`
                : `${studio.name} remitted earnings`,
        });
        updatedParentStudio = {
            ...parentStudio,
            balance: action === 'INJECT' ? parentStudio.balance - safeAmount : parentStudio.balance + safeAmount,
            studioState: {
                ...parentStudio.studioState,
                financeLedger: [
                    hqLedgerEntry,
                    ...((parentStudio.studioState.financeLedger || [])),
                ].slice(0, 200),
            },
        };
    }

    const updatedBusinesses = player.businesses.map(business => {
        if (business.id === updatedStudio.id) return updatedStudio;
        if (updatedParentStudio && business.id === updatedParentStudio.id) return updatedParentStudio;
        return business;
    });

    const logEntry: LogEntry = {
        week: player.currentWeek,
        year: player.age,
        message: action === 'INJECT'
            ? `💸 ${counterpartyLabel} injected ${safeAmount.toLocaleString()} into ${studio.name}.`
            : `🏦 ${studio.name} withdrew ${safeAmount.toLocaleString()} to ${counterpartyLabel}.`,
        type: 'neutral',
    };

    const nextPlayer: Player = {
        ...player,
        money: nextMoney,
        businesses: updatedBusinesses,
        finance: player.finance ? {
            ...player.finance,
            history: financeHistory.slice(0, 200),
        } : player.finance,
        logs: [logEntry, ...(player.logs || [])].slice(0, 50),
    };

    return {
        success: true,
        player: nextPlayer,
        studio: updatedStudio,
        parentStudio: updatedParentStudio,
    };
};

export const executeFullStudioMerger = ({
    player,
    studioId,
}: {
    player: Player;
    studioId: string;
}): {
    success: boolean;
    player: Player;
    parentStudio?: Business;
    mergedStudio?: Business;
    integrationCost?: number;
    reason?: 'STUDIO_NOT_FOUND' | 'NOT_ACQUIRED_STUDIO' | 'ALREADY_MERGED' | 'HQ_NOT_FOUND';
} => {
    const studio = player.businesses.find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE');
    if (!studio?.studioState) return { success: false, player, reason: 'STUDIO_NOT_FOUND' };
    if (!isAcquiredStudio(studio)) return { success: false, player, mergedStudio: studio, reason: 'NOT_ACQUIRED_STUDIO' };
    if (studio.studioState.operatingModel === 'FULL_MERGER') return { success: false, player, mergedStudio: studio, reason: 'ALREADY_MERGED' };
    const parentStudio = getParentStudio(player, studioId);
    if (!parentStudio?.studioState) return { success: false, player, mergedStudio: studio, reason: 'HQ_NOT_FOUND' };

    const parentState = normalizeStudioState(parentStudio.studioState, player.currentWeek);
    const acquiredState = normalizeStudioState(studio.studioState, player.currentWeek);
    const integrationCost = getMergerIntegrationCost(studio);
    const transferredCapital = Math.max(0, studio.balance - integrationCost);
    const netParentBalance = parentStudio.balance + studio.balance - integrationCost;
    const parentValuation = Math.max(0, parentStudio.stats.valuation || 0);
    const acquiredValuation = Math.max(0, studio.stats.valuation || 0);
    const mergedValuationContribution = Math.round(acquiredValuation * 0.9);

    const updatedParentStudio: Business = {
        ...parentStudio,
        balance: netParentBalance,
        staff: uniqueById([...parentStudio.staff, ...studio.staff]),
        stats: {
            ...parentStudio.stats,
            weeklyRevenue: (parentStudio.stats.weeklyRevenue || 0) + Math.round((studio.stats.weeklyRevenue || 0) * 0.85),
            weeklyExpenses: (parentStudio.stats.weeklyExpenses || 0) + Math.round((studio.stats.weeklyExpenses || 0) * 0.82),
            weeklyProfit: (parentStudio.stats.weeklyProfit || 0) + Math.round((studio.stats.weeklyProfit || 0) * 0.8),
            lifetimeRevenue: (parentStudio.stats.lifetimeRevenue || 0) + (studio.stats.lifetimeRevenue || 0),
            valuation: Math.max(parentValuation, parentValuation + mergedValuationContribution),
            brandHealth: Math.max(0, Math.min(100, Math.round(((parentStudio.stats.brandHealth || 50) * 0.85) + ((studio.stats.brandHealth || 50) * 0.15)))),
            studioMomentum: Math.max(parentStudio.stats.studioMomentum || 0, studio.stats.studioMomentum || 0),
            investorConfidence: Math.max(0, Math.min(100, (parentStudio.stats.investorConfidence || 50) + 3)),
        },
        studioState: {
            ...parentState,
            scripts: uniqueById([...parentState.scripts, ...acquiredState.scripts]),
            concepts: uniqueById([...parentState.concepts, ...acquiredState.concepts]),
            writers: uniqueById([...parentState.writers, ...acquiredState.writers]),
            talentRoster: uniqueById([...(parentState.talentRoster || []), ...(acquiredState.talentRoster || [])]),
            purchasedIPTitles: uniqueStrings([...(parentState.purchasedIPTitles || []), ...(acquiredState.purchasedIPTitles || [])]),
            ownedRights: uniqueById([...(parentState.ownedRights || []), ...(acquiredState.ownedRights || [])]),
            departments: {
                writing: Math.max(parentState.departments?.writing || 1, acquiredState.departments?.writing || 1),
                directing: Math.max(parentState.departments?.directing || 1, acquiredState.departments?.directing || 1),
                casting: Math.max(parentState.departments?.casting || 1, acquiredState.departments?.casting || 1),
                production: Math.max(parentState.departments?.production || 1, acquiredState.departments?.production || 1),
                postProduction: Math.max(parentState.departments?.postProduction || 1, acquiredState.departments?.postProduction || 1),
            },
            equipment: {
                cameras: Math.max(parentState.equipment?.cameras || 1, acquiredState.equipment?.cameras || 1),
                lighting: Math.max(parentState.equipment?.lighting || 1, acquiredState.equipment?.lighting || 1),
                sound: Math.max(parentState.equipment?.sound || 1, acquiredState.equipment?.sound || 1),
                practicalEffects: Math.max(parentState.equipment?.practicalEffects || 0, acquiredState.equipment?.practicalEffects || 0),
            },
            financeLedger: [
                createStudioFinanceEntry({
                    id: `studio_merger_${studio.id}_${player.age}_${player.currentWeek}_${Date.now()}`,
                    player,
                    amount: transferredCapital - integrationCost,
                    type: 'ACQUISITION_MERGER',
                    label: `${studio.name} full merger integration`,
                }),
                ...((parentState.financeLedger || [])),
                ...((acquiredState.financeLedger || []).map(entry => ({
                    ...entry,
                    id: `${studio.id}_${entry.id}`,
                    label: `${studio.name}: ${entry.label}`,
                }))),
            ].slice(0, 200),
        },
    };

    const mergedStudio: Business = {
        ...studio,
        balance: 0,
        isActive: false,
        stats: {
            ...studio.stats,
            weeklyRevenue: 0,
            weeklyExpenses: 0,
            weeklyProfit: 0,
            valuation: 0,
        },
        studioState: {
            ...acquiredState,
            acquisitionOrigin: 'STUDIO_ACQUISITION',
            operatingModel: 'FULL_MERGER',
            operatingModelChangedWeek: player.currentWeek,
            operatingModelChangedYear: player.age,
            mergedIntoStudioId: parentStudio.id,
            mergerIntegratedWeek: player.currentWeek,
            mergerIntegratedYear: player.age,
            mergerIntegrationCost: integrationCost,
            subsidiaryProjectProposals: (acquiredState.subsidiaryProjectProposals || []).filter(proposal => proposal.status !== 'PENDING'),
        },
    };

    const newsItem: NewsItem = {
        id: `news_full_merger_${studio.id}_${player.age}_${player.currentWeek}_${Date.now()}`,
        headline: `${parentStudio.name} absorbs ${studio.name}`,
        subtext: `${studio.name}'s catalog, production assets and liabilities are being integrated into headquarters after a full merger.`,
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: 'HIGH',
    };
    const logEntry: LogEntry = {
        week: player.currentWeek,
        year: player.age,
        message: `🏛️ ${studio.name} fully merged into ${parentStudio.name}. Integration cost: ${integrationCost.toLocaleString()}.`,
        type: 'positive',
    };

    const nextPlayer: Player = {
        ...player,
        businesses: player.businesses.map(business => {
            if (business.id === updatedParentStudio.id) return updatedParentStudio;
            if (business.id === mergedStudio.id) return mergedStudio;
            return business;
        }),
        commitments: player.commitments.map(commitment => commitment.projectDetails?.studioId === studio.id
            ? {
                ...commitment,
                projectDetails: {
                    ...commitment.projectDetails,
                    studioId: parentStudio.id,
                },
            }
            : commitment),
        activeReleases: player.activeReleases.map(release => release.projectDetails?.studioId === studio.id
            ? {
                ...release,
                projectDetails: {
                    ...release.projectDetails,
                    studioId: parentStudio.id,
                },
            }
            : release),
        pastProjects: player.pastProjects.map(project => project.studioId === studio.id
            ? {
                ...project,
                studioId: parentStudio.id,
            }
            : project),
        world: {
            ...player.world,
            universes: Object.fromEntries(Object.entries(player.world?.universes || {}).map(([universeId, universe]) => [
                universeId,
                universe?.studioId === studio.id ? { ...universe, studioId: parentStudio.id } : universe,
            ])),
        },
        news: [newsItem, ...(player.news || [])].slice(0, 80),
        logs: [logEntry, ...(player.logs || [])].slice(0, 50),
    };

    return {
        success: true,
        player: nextPlayer,
        parentStudio: updatedParentStudio,
        mergedStudio,
        integrationCost,
    };
};
