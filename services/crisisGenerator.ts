import { Player, Commitment, GameLanguage, ProductionCrisis, ProductionCrisisOption } from '../types';
import { getPlayerLanguage, t } from './i18n';

type CrisisCategory = 'TECHNICAL' | 'INTERPERSONAL' | 'ENVIRONMENTAL' | 'FINANCIAL' | 'CREATIVE' | 'LEGAL';

interface CrisisTemplate {
    title: string;
    titleKey?: string;
    description: string;
    descriptionKey?: string;
    textVars?: Record<string, string | number>;
    options: ProductionCrisisOption[];
}

const TECHNICAL_TEMPLATES: CrisisTemplate[] = [
    {
        title: '',
        titleKey: 'production.crisis.corruptedFootage.title',
        description: '',
        descriptionKey: 'production.crisis.corruptedFootage.description',
        options: [
            {
                label: '',
                labelKey: 'production.crisis.corruptedFootage.reshoot.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 50000 };
                    return { updatedPlayer, updatedProject: c, log: '', logKey: 'production.crisis.corruptedFootage.reshoot.log' };
                }
            },
            {
                label: '',
                labelKey: 'production.crisis.corruptedFootage.fix.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 5) };
                    return { updatedPlayer: p, updatedProject, log: '', logKey: 'production.crisis.corruptedFootage.fix.log' };
                }
            }
        ]
    },
    {
        title: '',
        titleKey: 'production.crisis.equipmentFailure.title',
        description: '',
        descriptionKey: 'production.crisis.equipmentFailure.description',
        options: [
            {
                label: '',
                labelKey: 'production.crisis.equipmentFailure.rent.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 30000 };
                    return { updatedPlayer, updatedProject: c, log: '', logKey: 'production.crisis.equipmentFailure.rent.log' };
                }
            },
            {
                label: '',
                labelKey: 'production.crisis.equipmentFailure.backup.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 3) };
                    return { updatedPlayer: p, updatedProject, log: '', logKey: 'production.crisis.equipmentFailure.backup.log' };
                }
            }
        ]
    }
];

const INTERPERSONAL_TEMPLATES: CrisisTemplate[] = [
    {
        title: '',
        titleKey: 'production.crisis.directorVsStar.title',
        description: '',
        descriptionKey: 'production.crisis.directorVsStar.description',
        options: [
            {
                label: '',
                labelKey: 'production.crisis.directorVsStar.director.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 5) };
                    return { updatedPlayer: p, updatedProject, log: '', logKey: 'production.crisis.directorVsStar.director.log' };
                }
            },
            {
                label: '',
                labelKey: 'production.crisis.directorVsStar.actor.label',
                impact: (p, c) => {
                    const updatedProject = { ...c };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + 5);
                    }
                    return { updatedPlayer: p, updatedProject, log: '', logKey: 'production.crisis.directorVsStar.actor.log' };
                }
            }
        ]
    }
];

const ENVIRONMENTAL_TEMPLATES: CrisisTemplate[] = [
    {
        title: '',
        titleKey: 'production.crisis.suddenStorm.title',
        description: '',
        descriptionKey: 'production.crisis.suddenStorm.description',
        options: [
            {
                label: '',
                labelKey: 'production.crisis.suddenStorm.wait.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1 };
                    return { updatedPlayer: p, updatedProject, log: '', logKey: 'production.crisis.suddenStorm.wait.log' };
                }
            },
            {
                label: '',
                labelKey: 'production.crisis.suddenStorm.studio.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 40000 };
                    return { updatedPlayer, updatedProject: c, log: '', logKey: 'production.crisis.suddenStorm.studio.log' };
                }
            }
        ]
    }
];

const FINANCIAL_TEMPLATES: CrisisTemplate[] = [
    {
        title: '',
        titleKey: 'production.crisis.budgetOverrun.title',
        description: '',
        descriptionKey: 'production.crisis.budgetOverrun.description',
        options: [
            {
                label: '',
                labelKey: 'production.crisis.budgetOverrun.cash.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 100000 };
                    return { updatedPlayer, updatedProject: c, log: '', logKey: 'production.crisis.budgetOverrun.cash.log' };
                }
            },
            {
                label: '',
                labelKey: 'production.crisis.budgetOverrun.cut.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 10) };
                    return { updatedPlayer: p, updatedProject, log: '', logKey: 'production.crisis.budgetOverrun.cut.log' };
                }
            }
        ]
    }
];

const CREATIVE_TEMPLATES: CrisisTemplate[] = [
    {
        title: '',
        titleKey: 'production.crisis.scriptLeak.title',
        description: '',
        descriptionKey: 'production.crisis.scriptLeak.description',
        options: [
            {
                label: '',
                labelKey: 'production.crisis.scriptLeak.rewrite.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1 };
                    return { updatedPlayer: p, updatedProject, log: '', logKey: 'production.crisis.scriptLeak.rewrite.log' };
                }
            },
            {
                label: '',
                labelKey: 'production.crisis.scriptLeak.lean.label',
                impact: (p, c) => {
                    const updatedProject = { ...c };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + 10);
                    }
                    return { updatedPlayer: p, updatedProject, log: '', logKey: 'production.crisis.scriptLeak.lean.log' };
                }
            }
        ]
    }
];

const LEGAL_TEMPLATES: CrisisTemplate[] = [
    {
        title: '',
        titleKey: 'production.crisis.copyrightClaim.title',
        description: '',
        descriptionKey: 'production.crisis.copyrightClaim.description',
        options: [
            {
                label: '',
                labelKey: 'production.crisis.copyrightClaim.pay.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 20000 };
                    return { updatedPlayer, updatedProject: c, log: '', logKey: 'production.crisis.copyrightClaim.pay.log' };
                }
            },
            {
                label: '',
                labelKey: 'production.crisis.copyrightClaim.blur.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 2) };
                    return { updatedPlayer: p, updatedProject, log: '', logKey: 'production.crisis.copyrightClaim.blur.log' };
                }
            }
        ]
    }
];

type GeneratedAdjectiveId = 'UNEXPECTED' | 'CATASTROPHIC' | 'BIZARRE' | 'SUDDEN' | 'TOTAL' | 'MINOR' | 'CRITICAL' | 'SHOCKING';
type GeneratedNounId = 'FAILURE' | 'CRISIS' | 'DISASTER' | 'INCIDENT' | 'DRAMA' | 'BREAKDOWN' | 'MISHAP' | 'SCANDAL';
type GeneratedSubjectId = 'CATERING' | 'TRANSPORTATION' | 'LIGHTING' | 'SOUND' | 'SECURITY' | 'PUBLICITY' | 'LOGISTICS' | 'SCHEDULING';

const ADJECTIVE_IDS: GeneratedAdjectiveId[] = ['UNEXPECTED', 'CATASTROPHIC', 'BIZARRE', 'SUDDEN', 'TOTAL', 'MINOR', 'CRITICAL', 'SHOCKING'];
const NOUN_IDS: GeneratedNounId[] = ['FAILURE', 'CRISIS', 'DISASTER', 'INCIDENT', 'DRAMA', 'BREAKDOWN', 'MISHAP', 'SCANDAL'];
const SUBJECT_IDS: GeneratedSubjectId[] = ['CATERING', 'TRANSPORTATION', 'LIGHTING', 'SOUND', 'SECURITY', 'PUBLICITY', 'LOGISTICS', 'SCHEDULING'];

const pickRandom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const getGeneratedCrisisText = (
    language: GameLanguage,
    group: 'adjective' | 'noun' | 'subject',
    id: string,
    form: 'label' | 'lower' = 'label'
) => t(language, `production.crisis.generated.${group}.${id}.${form}`);

export const generateRandomCrisis = (project: Commitment, player: Player): ProductionCrisis => {
    const language = getPlayerLanguage(player);
    const categories: CrisisCategory[] = ['TECHNICAL', 'INTERPERSONAL', 'ENVIRONMENTAL', 'FINANCIAL', 'CREATIVE', 'LEGAL'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    let templates: CrisisTemplate[] = [];
    switch(category) {
        case 'TECHNICAL': templates = TECHNICAL_TEMPLATES; break;
        case 'INTERPERSONAL': templates = INTERPERSONAL_TEMPLATES; break;
        case 'ENVIRONMENTAL': templates = ENVIRONMENTAL_TEMPLATES; break;
        case 'FINANCIAL': templates = FINANCIAL_TEMPLATES; break;
        case 'CREATIVE': templates = CREATIVE_TEMPLATES; break;
        case 'LEGAL': templates = LEGAL_TEMPLATES; break;
    }

    // 50% chance to use a pre-defined template, 50% chance to generate one
    if (Math.random() > 0.5 && templates.length > 0) {
        const template = templates[Math.floor(Math.random() * templates.length)];
        return {
            id: `crisis_gen_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            title: template.title,
            titleKey: template.titleKey,
            description: template.description,
            descriptionKey: template.descriptionKey,
            textVars: template.textVars,
            options: template.options
        };
    } else {
        const adjectiveId = pickRandom(ADJECTIVE_IDS);
        const nounId = pickRandom(NOUN_IDS);
        const subjectId = pickRandom(SUBJECT_IDS);
        const adj = getGeneratedCrisisText(language, 'adjective', adjectiveId);
        const adjLower = getGeneratedCrisisText(language, 'adjective', adjectiveId, 'lower');
        const noun = getGeneratedCrisisText(language, 'noun', nounId);
        const nounLower = getGeneratedCrisisText(language, 'noun', nounId, 'lower');
        const subject = getGeneratedCrisisText(language, 'subject', subjectId);
        const subjectLower = getGeneratedCrisisText(language, 'subject', subjectId, 'lower');
        
        const textVars = {
            adjective: adj,
            adjectiveLower: adjLower,
            noun,
            nounLower,
            subject,
            subjectLower,
            project: project.name
        };
        
        return {
            id: `crisis_gen_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            title: '',
            titleKey: 'production.crisis.generated.title',
            description: '',
            descriptionKey: 'production.crisis.generated.description',
            textVars,
            options: [
                {
                    label: '',
                    labelKey: 'production.crisis.generated.money.label',
                    textVars: { subject, subjectLower },
                    impact: (p, c) => {
                        const updatedPlayer = { ...p, money: p.money - 25000 };
                        return { updatedPlayer, updatedProject: c, log: '', logKey: 'production.crisis.generated.money.log', logVars: { subject, subjectLower } };
                    }
                },
                {
                    label: '',
                    labelKey: 'production.crisis.generated.push.label',
                    textVars: { subject, subjectLower },
                    impact: (p, c) => {
                        const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 4) };
                        return { updatedPlayer: p, updatedProject, log: '', logKey: 'production.crisis.generated.push.log', logVars: { subject, subjectLower } };
                    }
                }
            ]
        };
    }
};
