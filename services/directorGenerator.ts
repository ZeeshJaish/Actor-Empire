import { Player, Commitment, ProductionCrisis } from '../types';
import { spendPlayerEnergy } from './premiumLogic';

export interface DirectorDecision extends ProductionCrisis {}

const DECISION_TEMPLATES: DirectorDecision[] = [
    {
        id: 'dir_dec_fx',
        title: "Visual Style: The Big Stunt",
        titleKey: 'production.director.bigStunt.title',
        description: "A major action sequence is coming up. The studio wants CGI to save money, but you feel practical effects would add 'soul'.",
        descriptionKey: 'production.director.bigStunt.description',
        options: [
            {
                label: "Practical Effects (Prestige +10, Risk)",
                labelKey: 'production.director.bigStunt.practical.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 10) };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.prestigeBonus = (updatedProject.projectDetails.hiddenStats.prestigeBonus || 0) + 5;
                    }
                    return { updatedPlayer: p, updatedProject, log: "You chose practical effects. The set was dangerous, but the footage is breathtaking.", logKey: 'production.director.bigStunt.practical.log' };
                }
            },
            {
                label: "CGI (Budget +$50k)",
                labelKey: 'production.director.bigStunt.cgi.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 50000 };
                    return { updatedPlayer, updatedProject: c, log: "You went with CGI. It's safe and efficient, but the crew feels a bit disconnected.", logKey: 'production.director.bigStunt.cgi.log' };
                }
            }
        ]
    },
    {
        id: 'dir_dec_improv',
        title: "Creative Freedom: Dialogue",
        titleKey: 'production.director.dialogue.title',
        description: "The lead actor wants to improvise a key emotional scene. The script is solid, but their idea is bold.",
        descriptionKey: 'production.director.dialogue.description',
        options: [
            {
                label: "Allow Improv (Talent +2)",
                labelKey: 'production.director.dialogue.improv.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, stats: { ...p.stats, talent: p.stats.talent + 2 } };
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 5) };
                    return { updatedPlayer, updatedProject, log: "The improv was a hit! The scene feels raw and authentic.", logKey: 'production.director.dialogue.improv.log' };
                }
            },
            {
                label: "Stick to Script",
                labelKey: 'production.director.dialogue.script.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 2) };
                    return { updatedPlayer: p, updatedProject, log: "You played it safe. The scene is technically perfect, if a bit predictable.", logKey: 'production.director.dialogue.script.log' };
                }
            }
        ]
    },
    {
        id: 'dir_dec_lighting',
        title: "Cinematography: Lighting",
        titleKey: 'production.director.lighting.title',
        description: "The DP suggests a very dark, moody lighting setup. It looks great but might make the movie less 'commercial'.",
        descriptionKey: 'production.director.lighting.description',
        options: [
            {
                label: "Moody & Dark (Prestige +5)",
                labelKey: 'production.director.lighting.moody.label',
                impact: (p, c) => {
                    const updatedProject = { ...c };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.prestigeBonus = (updatedProject.projectDetails.hiddenStats.prestigeBonus || 0) + 10;
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.max(0, (updatedProject.projectDetails.hiddenStats.rawHype || 50) - 5);
                    }
                    return { updatedPlayer: p, updatedProject, log: "The film looks like a masterpiece, though the studio is worried about visibility.", logKey: 'production.director.lighting.moody.log' };
                }
            },
            {
                label: "Bright & Clear (Hype +5)",
                labelKey: 'production.director.lighting.bright.label',
                impact: (p, c) => {
                    const updatedProject = { ...c };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + 10);
                    }
                    return { updatedPlayer: p, updatedProject, log: "The movie looks clean and accessible. Perfect for a summer blockbuster.", logKey: 'production.director.lighting.bright.log' };
                }
            }
        ]
    },
    {
        id: 'dir_dec_pacing',
        title: "Pacing: The Long Take",
        titleKey: 'production.director.longTake.title',
        description: "You want to shoot a 5-minute continuous take. It's technically difficult and will take all day to get right.",
        descriptionKey: 'production.director.longTake.description',
        options: [
            {
                label: "Go for it (Energy -30)",
                labelKey: 'production.director.longTake.go.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p };
                    spendPlayerEnergy(updatedPlayer, 30);
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 15) };
                    return { updatedPlayer, updatedProject, log: "It took 24 tries, but you got it. It's going to be the talk of the industry.", logKey: 'production.director.longTake.go.log' };
                }
            },
            {
                label: "Traditional Coverage",
                labelKey: 'production.director.longTake.traditional.label',
                impact: (p, c) => {
                    return { updatedPlayer: p, updatedProject: c, log: "You used standard angles. Efficient and safe.", logKey: 'production.director.longTake.traditional.log' };
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
