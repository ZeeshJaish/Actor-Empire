import { Player, Commitment, NPCActor, ActorTrait, ScheduledEvent, ProductionCrisis } from '../types';
import { NPC_DATABASE } from './npcLogic';
import { spendPlayerEnergy } from './premiumLogic';
import { getPlayerLanguage, t } from './i18n';

const CRISIS_TEMPLATES: Record<ActorTrait, (npc: NPCActor) => ProductionCrisis> = {
    DIVA: (npc) => ({
        id: `crisis_diva_${Date.now()}`,
        title: "Diva Demands",
        titleKey: 'production.crisis.diva.title',
        description: `${npc.name} is refusing to leave their trailer until the catering is replaced with organic, hand-picked berries from the Alps.`,
        descriptionKey: 'production.crisis.diva.description',
        textVars: { name: npc.name },
        options: [
            {
                label: "Give In ($50k)",
                labelKey: 'production.crisis.diva.giveIn.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 50000 };
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 5) };
                    return { updatedPlayer, updatedProject, log: `You spent $50k on berries. ${npc.name} is happy, but the crew is annoyed.`, logKey: 'production.crisis.diva.giveIn.log', logVars: { name: npc.name } };
                }
            },
            {
                label: "Refuse (Delay)",
                labelKey: 'production.crisis.diva.refuse.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1 };
                    return { updatedPlayer: p, updatedProject, log: `You refused. ${npc.name} sulked for 3 days, delaying production by a week.`, logKey: 'production.crisis.diva.refuse.log', logVars: { name: npc.name } };
                }
            },
            {
                label: "The 'Star' Treatment (Watch Ad)",
                labelKey: 'production.crisis.diva.golden.label',
                isGolden: true,
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 15) };
                    return { updatedPlayer: p, updatedProject, log: `You used your star power to settle the dispute. Production is smoother than ever!`, logKey: 'production.crisis.diva.golden.log' };
                }
            }
        ]
    }),
    METHOD: (npc) => ({
        id: `crisis_method_${Date.now()}`,
        title: "Method Madness",
        titleKey: 'production.crisis.method.title',
        description: `${npc.name} has stayed in character for 72 hours and is now refusing to speak to anyone who isn't 'royalty'. It's slowing down the shoot.`,
        descriptionKey: 'production.crisis.method.description',
        textVars: { name: npc.name },
        options: [
            {
                label: "Play Along",
                labelKey: 'production.crisis.method.playAlong.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 10) };
                    return { updatedPlayer: p, updatedProject, log: `You bowed to 'His Majesty'. The performance is incredible, but you feel ridiculous.`, logKey: 'production.crisis.method.playAlong.log' };
                }
            },
            {
                label: "Intervene",
                labelKey: 'production.crisis.method.intervene.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 10) };
                    return { updatedPlayer: p, updatedProject, log: `You told them to snap out of it. They did, but the 'magic' is gone from the scene.`, logKey: 'production.crisis.method.intervene.log' };
                }
            }
        ]
    }),
    UNRELIABLE: (npc) => ({
        id: `crisis_unreliable_${Date.now()}`,
        title: "No-Show",
        titleKey: 'production.crisis.unreliable.title',
        description: `${npc.name} didn't show up for the morning shoot. Rumor has it they were seen at a club in Vegas last night.`,
        descriptionKey: 'production.crisis.unreliable.description',
        textVars: { name: npc.name },
        options: [
            {
                label: "Wait (Delay)",
                labelKey: 'production.crisis.unreliable.wait.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1 };
                    return { updatedPlayer: p, updatedProject, log: `You waited. They showed up 2 days later with a hangover. Production delayed.`, logKey: 'production.crisis.unreliable.wait.log' };
                }
            },
            {
                label: "Shoot Around Them ($20k)",
                labelKey: 'production.crisis.unreliable.shootAround.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 20000 };
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 5) };
                    return { updatedPlayer, updatedProject, log: `You spent $20k to reorganize the schedule. The day wasn't a total loss.`, logKey: 'production.crisis.unreliable.shootAround.log' };
                }
            }
        ]
    }),
    WORKAHOLIC: (npc) => ({
        id: `crisis_workaholic_${Date.now()}`,
        title: "Overtime Request",
        titleKey: 'production.crisis.workaholic.title',
        description: `${npc.name} wants to stay late to perfect the climactic scene. The crew is exhausted, but the footage could be gold.`,
        descriptionKey: 'production.crisis.workaholic.description',
        textVars: { name: npc.name },
        options: [
            {
                label: "Keep Filming (Energy -20)",
                labelKey: 'production.crisis.workaholic.keepFilming.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p };
                    spendPlayerEnergy(updatedPlayer, 20);
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 15) };
                    return { updatedPlayer, updatedProject, log: `You stayed until 4 AM. You're dead tired, but that scene was a masterpiece.`, logKey: 'production.crisis.workaholic.keepFilming.log' };
                }
            },
            {
                label: "Wrap for the Day",
                labelKey: 'production.crisis.workaholic.wrap.label',
                impact: (p, c) => {
                    return { updatedPlayer: p, updatedProject: c, log: `You prioritized the crew's health. ${npc.name} is disappointed but professional.`, logKey: 'production.crisis.workaholic.wrap.log', logVars: { name: npc.name } };
                }
            }
        ]
    }),
    BOX_OFFICE_POISON: (npc) => ({
        id: `crisis_poison_${Date.now()}`,
        title: "Bad Press",
        titleKey: 'production.crisis.poison.title',
        description: `A tabloid leaked a story about ${npc.name}'s past failures, and it's trending. Fans are already calling the movie a 'flop'.`,
        descriptionKey: 'production.crisis.poison.description',
        textVars: { name: npc.name },
        options: [
            {
                label: "PR Blitz ($100k)",
                labelKey: 'production.crisis.poison.pr.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 100000 };
                    return { updatedPlayer, updatedProject: c, log: `You spent $100k on a PR campaign to bury the story. Damage controlled.`, logKey: 'production.crisis.poison.pr.log' };
                }
            },
            {
                label: "Ignore It",
                labelKey: 'production.crisis.poison.ignore.label',
                impact: (p, c) => {
                    if (c.projectDetails) {
                        c.projectDetails.hiddenStats.rawHype = Math.max(0, (c.projectDetails.hiddenStats.rawHype || 50) - 15);
                    }
                    return { updatedPlayer: p, updatedProject: c, log: `You ignored it. The buzz for the movie has taken a significant hit.`, logKey: 'production.crisis.poison.ignore.log' };
                }
            }
        ]
    }),
    PROFESSIONAL: () => null,
    EASY_GOING: () => null,
    AMBITIOUS: () => null
};

import { getProductionCrisisTemplates } from './productionEvents';
import { generateRandomCrisis } from './crisisGenerator';
import { generateDirectorDecision, DirectorDecision } from './directorGenerator';

export const applyCrisisImpact = (player: Player, event: ScheduledEvent, choiceIndex: number): { updatedPlayer: Player, log: string } => {
    const { projectId, crisisId } = event.data;
    const language = getPlayerLanguage(player);
    const project = player.commitments.find(c => c.id === projectId);
    if (!project) return { updatedPlayer: player, log: t(language, 'production.log.projectNotFound') };

    let crisis: ProductionCrisis | null = null;

    if (event.type === 'DIRECTOR_DECISION') {
        // Reconstruct director decision
        crisis = {
            id: crisisId,
            title: event.title,
            description: event.description || '',
            options: event.data.options.map((opt: any) => ({
                label: opt.label,
                labelKey: opt.labelKey,
                textVars: opt.textVars,
                impact: (p: Player, c: Commitment) => {
                    const optionRef = opt.labelKey || opt.label;
                    // Impact mapping for director decisions
                    if (optionRef.includes("Practical") || optionRef === 'production.director.bigStunt.practical.label') {
                        const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 10) };
                        if (updatedProject.projectDetails) {
                            updatedProject.projectDetails.hiddenStats.prestigeBonus = (updatedProject.projectDetails.hiddenStats.prestigeBonus || 0) + 5;
                        }
                        return { updatedPlayer: p, updatedProject, log: "You chose practical effects. The set was dangerous, but the footage is breathtaking.", logKey: 'production.director.bigStunt.practical.log' };
                    } else if (optionRef.includes("CGI") || optionRef === 'production.director.bigStunt.cgi.label') {
                        const updatedPlayer = { ...p, money: p.money - 50000 };
                        return { updatedPlayer, updatedProject: c, log: "You went with CGI. It's safe and efficient.", logKey: 'production.director.bigStunt.cgi.shortLog' };
                    } else if (optionRef.includes("Allow Improv") || optionRef === 'production.director.dialogue.improv.label') {
                        const updatedPlayer = { ...p, stats: { ...p.stats, talent: p.stats.talent + 2 } };
                        const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 5) };
                        return { updatedPlayer, updatedProject, log: "The improv was a hit!", logKey: 'production.director.dialogue.improv.shortLog' };
                    } else if (optionRef.includes("Stick to Script") || optionRef === 'production.director.dialogue.script.label') {
                        const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 2) };
                        return { updatedPlayer: p, updatedProject, log: "You played it safe.", logKey: 'production.director.dialogue.script.shortLog' };
                    } else if (optionRef.includes("Moody") || optionRef === 'production.director.lighting.moody.label') {
                        const updatedProject = { ...c };
                        if (updatedProject.projectDetails) {
                            updatedProject.projectDetails.hiddenStats.prestigeBonus = (updatedProject.projectDetails.hiddenStats.prestigeBonus || 0) + 10;
                            updatedProject.projectDetails.hiddenStats.rawHype = Math.max(0, (updatedProject.projectDetails.hiddenStats.rawHype || 50) - 5);
                        }
                        return { updatedPlayer: p, updatedProject, log: "The film looks like a masterpiece.", logKey: 'production.director.lighting.moody.shortLog' };
                    } else if (optionRef.includes("Bright") || optionRef === 'production.director.lighting.bright.label') {
                        const updatedProject = { ...c };
                        if (updatedProject.projectDetails) {
                            updatedProject.projectDetails.hiddenStats.rawHype = Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + 10);
                        }
                        return { updatedPlayer: p, updatedProject, log: "The movie looks clean and accessible.", logKey: 'production.director.lighting.bright.shortLog' };
                    } else if (optionRef.includes("Go for it") || optionRef === 'production.director.longTake.go.label') {
                        const updatedPlayer = { ...p };
                        spendPlayerEnergy(updatedPlayer, 30);
                        const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 15) };
                        return { updatedPlayer, updatedProject, log: "You got the long take!", logKey: 'production.director.longTake.go.shortLog' };
                    } else {
                        return { updatedPlayer: p, updatedProject: c, log: "You made a creative choice.", logKey: 'production.director.default.log' };
                    }
                }
            }))
        };
    } else if (event.data.isGenerative) {
        // For generative crises, we reconstruct it using the generator logic
        // but we need to ensure the options match what was shown
        // Actually, it's better to just use the data passed in the event
        crisis = {
            id: crisisId,
            title: event.title,
            description: event.description,
            options: event.data.options.map((opt: any) => ({
                label: opt.label,
                labelKey: opt.labelKey,
                textVars: opt.textVars,
                impact: (p: Player, c: Commitment) => {
                    // We need to re-derive the impact based on the label or index
                    // This is tricky without storing functions.
                    // Let's use a standard impact mapper for generative ones.
                    const optionRef = opt.labelKey || opt.label;
                    if (optionRef.includes("Money") || optionRef === 'production.crisis.generated.money.label') {
                        const updatedPlayer = { ...p, money: p.money - 25000 };
                        return { updatedPlayer, updatedProject: c, log: `You resolved the issue with a $25k investment.`, logKey: 'production.crisis.generated.money.resolvedLog' };
                    } else {
                        const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 4) };
                        return { updatedPlayer: p, updatedProject, log: `You pushed through the crisis, but quality suffered.`, logKey: 'production.crisis.generated.push.resolvedLog' };
                    }
                }
            }))
        };
    } else if (event.data.isGeneral) {
        const templateIndex = event.data.templateIndex;
        const templates = getProductionCrisisTemplates(project);
        if (templateIndex !== undefined && templates[templateIndex]) {
            crisis = templates[templateIndex](project);
        }
    } else {
        const trait = event.data.trait as ActorTrait;
        const npcId = event.data.npcId;
        const npc = [...NPC_DATABASE, ...(player.flags.extraNPCs || [])].find(n => n.id === npcId);
        
        if (npc && trait && CRISIS_TEMPLATES[trait]) {
            crisis = CRISIS_TEMPLATES[trait](npc);
        }
    }

    if (!crisis) return { updatedPlayer: player, log: t(language, 'production.log.incomplete') };

    const option = crisis.options[choiceIndex] || crisis.options[0];
    if (!option || typeof option.impact !== 'function') {
        return { updatedPlayer: player, log: t(language, 'production.log.settled') };
    }
    const result = option.impact(player, project);
    const { updatedPlayer, updatedProject } = result;
    const localizedLogInput = { logKey: result.logKey, logVars: result.logVars };
    const log = localizedLogInput.logKey ? t(language, result.logKey, localizedLogInput.logVars) : result.log;
    
    // Update the project in the player object
    updatedPlayer.commitments = updatedPlayer.commitments.map(c => c.id === projectId ? updatedProject : c);
    
    return { updatedPlayer, log };
};

export const checkForProductionCrisis = (player: Player, project: Commitment): ProductionCrisis | null => {
    if (project.projectPhase !== 'PRODUCTION') return null;
    
    const genre = project.projectDetails?.genre;
    const format = project.projectDetails?.format;
    let crisisChance = 0.15;
    if (format === 'ANIMATED' || format === 'ANIME') crisisChance -= 0.03;
    if (genre === 'DOCUMENTARY') crisisChance -= 0.04;
    if (genre === 'MUSICAL') crisisChance += 0.03;
    if (genre === 'ACTION' || genre === 'SUPERHERO') crisisChance += 0.02;

    if (Math.random() > Math.max(0.06, Math.min(0.24, crisisChance))) return null;

    const roll = Math.random();

    // 30% chance for trait-based
    if (roll < 0.3) {
        const cast = project.projectDetails?.castList || [];
        const actorsWithTraits = cast
            .map(member => {
                const npc = [...NPC_DATABASE, ...(player.flags.extraNPCs || [])].find(n => n.id === member.npcId);
                return npc;
            })
            .filter((npc): npc is NPCActor => !!npc && !!npc.traits && npc.traits.length > 0);

        if (actorsWithTraits.length > 0) {
            const randomActor = actorsWithTraits[Math.floor(Math.random() * actorsWithTraits.length)];
            const randomTrait = randomActor.traits![Math.floor(Math.random() * randomActor.traits!.length)];
            const template = CRISIS_TEMPLATES[randomTrait];
            if (template) {
                const crisis = template(randomActor);
                (crisis as any).trait = randomTrait;
                (crisis as any).npcId = randomActor.id;
                return crisis;
            }
        }
    }

    // 30% chance for general static crisis
    if (roll < 0.6) {
        const templates = getProductionCrisisTemplates(project);
        const templateIndex = Math.floor(Math.random() * templates.length);
        const crisis = templates[templateIndex](project);
        (crisis as any).isGeneral = true;
        (crisis as any).templateIndex = templateIndex;
        return crisis;
    }

    // 40% chance for generative crisis
    const genCrisis = generateRandomCrisis(project, player);
    (genCrisis as any).isGenerative = true;
    return genCrisis;
};

export const checkForDirectorDecision = (player: Player, project: Commitment): DirectorDecision | null => {
    if (project.projectPhase !== 'PRODUCTION') return null;
    
    // Only if player is the director
    const isDirector = project.projectDetails?.directorId === 'player';
    if (!isDirector) return null;

    // 20% chance per week for a creative decision
    if (Math.random() > 0.20) return null;

    return generateDirectorDecision(project, player);
};
