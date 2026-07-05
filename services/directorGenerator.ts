import { Player, Commitment, ProductionCrisis } from '../types';
import { spendPlayerEnergy } from './premiumLogic';

export interface DirectorDecision extends ProductionCrisis {}

const DECISION_TEMPLATES: DirectorDecision[] = [
    {
        id: 'dir_dec_fx',
        title: '',
        titleKey: 'production.director.bigStunt.title',
        description: '',
        descriptionKey: 'production.director.bigStunt.description',
        options: [
            {
                label: '',
                labelKey: 'production.director.bigStunt.practical.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 10) };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.prestigeBonus = (updatedProject.projectDetails.hiddenStats.prestigeBonus || 0) + 5;
                    }
                    return { updatedPlayer: p, updatedProject, log: '', logKey: 'production.director.bigStunt.practical.log' };
                }
            },
            {
                label: '',
                labelKey: 'production.director.bigStunt.cgi.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 50000 };
                    return { updatedPlayer, updatedProject: c, log: '', logKey: 'production.director.bigStunt.cgi.log' };
                }
            }
        ]
    },
    {
        id: 'dir_dec_improv',
        title: '',
        titleKey: 'production.director.dialogue.title',
        description: '',
        descriptionKey: 'production.director.dialogue.description',
        options: [
            {
                label: '',
                labelKey: 'production.director.dialogue.improv.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, stats: { ...p.stats, talent: p.stats.talent + 2 } };
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 5) };
                    return { updatedPlayer, updatedProject, log: '', logKey: 'production.director.dialogue.improv.log' };
                }
            },
            {
                label: '',
                labelKey: 'production.director.dialogue.script.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 2) };
                    return { updatedPlayer: p, updatedProject, log: '', logKey: 'production.director.dialogue.script.log' };
                }
            }
        ]
    },
    {
        id: 'dir_dec_lighting',
        title: '',
        titleKey: 'production.director.lighting.title',
        description: '',
        descriptionKey: 'production.director.lighting.description',
        options: [
            {
                label: '',
                labelKey: 'production.director.lighting.moody.label',
                impact: (p, c) => {
                    const updatedProject = { ...c };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.prestigeBonus = (updatedProject.projectDetails.hiddenStats.prestigeBonus || 0) + 10;
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.max(0, (updatedProject.projectDetails.hiddenStats.rawHype || 50) - 5);
                    }
                    return { updatedPlayer: p, updatedProject, log: '', logKey: 'production.director.lighting.moody.log' };
                }
            },
            {
                label: '',
                labelKey: 'production.director.lighting.bright.label',
                impact: (p, c) => {
                    const updatedProject = { ...c };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + 10);
                    }
                    return { updatedPlayer: p, updatedProject, log: '', logKey: 'production.director.lighting.bright.log' };
                }
            }
        ]
    },
    {
        id: 'dir_dec_pacing',
        title: '',
        titleKey: 'production.director.longTake.title',
        description: '',
        descriptionKey: 'production.director.longTake.description',
        options: [
            {
                label: '',
                labelKey: 'production.director.longTake.go.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p };
                    spendPlayerEnergy(updatedPlayer, 30);
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 15) };
                    return { updatedPlayer, updatedProject, log: '', logKey: 'production.director.longTake.go.log' };
                }
            },
            {
                label: '',
                labelKey: 'production.director.longTake.traditional.label',
                impact: (p, c) => {
                    return { updatedPlayer: p, updatedProject: c, log: '', logKey: 'production.director.longTake.traditional.log' };
                }
            }
        ]
    }
];

export const generateDirectorDecision = (project: Commitment, player: Player): DirectorDecision => {
    const template = DECISION_TEMPLATES[Math.floor(Math.random() * DECISION_TEMPLATES.length)];
    return {
        ...template,
        id: `${template.id}_${Date.now()}`
    };
};
