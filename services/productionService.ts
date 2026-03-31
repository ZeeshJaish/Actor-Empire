import { Player, Commitment, NPCActor, ActorTrait, ScheduledEvent, ProductionCrisis } from '../types';
import { NPC_DATABASE } from './npcLogic';

const CRISIS_TEMPLATES: Record<ActorTrait, (npc: NPCActor) => ProductionCrisis> = {
    DIVA: (npc) => ({
        id: `crisis_diva_${Date.now()}`,
        title: "Diva Demands",
        description: `${npc.name} is refusing to leave their trailer until the catering is replaced with organic, hand-picked berries from the Alps.`,
        options: [
            {
                label: "Give In ($50k)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 50000 };
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 5) };
                    return { updatedPlayer, updatedProject, log: `You spent $50k on berries. ${npc.name} is happy, but the crew is annoyed.` };
                }
            },
            {
                label: "Refuse (Delay)",
                impact: (p, c) => {
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1 };
                    return { updatedPlayer: p, updatedProject, log: `You refused. ${npc.name} sulked for 3 days, delaying production by a week.` };
                }
            },
            {
                label: "The 'Star' Treatment (Watch Ad)",
                isGolden: true,
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 15) };
                    return { updatedPlayer: p, updatedProject, log: `You used your star power to settle the dispute. Production is smoother than ever!` };
                }
            }
        ]
    }),
    METHOD: (npc) => ({
        id: `crisis_method_${Date.now()}`,
        title: "Method Madness",
        description: `${npc.name} has stayed in character for 72 hours and is now refusing to speak to anyone who isn't 'royalty'. It's slowing down the shoot.`,
        options: [
            {
                label: "Play Along",
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 10) };
                    return { updatedPlayer: p, updatedProject, log: `You bowed to 'His Majesty'. The performance is incredible, but you feel ridiculous.` };
                }
            },
            {
                label: "Intervene",
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 10) };
                    return { updatedPlayer: p, updatedProject, log: `You told them to snap out of it. They did, but the 'magic' is gone from the scene.` };
                }
            }
        ]
    }),
    UNRELIABLE: (npc) => ({
        id: `crisis_unreliable_${Date.now()}`,
        title: "No-Show",
        description: `${npc.name} didn't show up for the morning shoot. Rumor has it they were seen at a club in Vegas last night.`,
        options: [
            {
                label: "Wait (Delay)",
                impact: (p, c) => {
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1 };
                    return { updatedPlayer: p, updatedProject, log: `You waited. They showed up 2 days later with a hangover. Production delayed.` };
                }
            },
            {
                label: "Shoot Around Them ($20k)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 20000 };
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 5) };
                    return { updatedPlayer, updatedProject, log: `You spent $20k to reorganize the schedule. The day wasn't a total loss.` };
                }
            }
        ]
    }),
    WORKAHOLIC: (npc) => ({
        id: `crisis_workaholic_${Date.now()}`,
        title: "Overtime Request",
        description: `${npc.name} wants to stay late to perfect the climactic scene. The crew is exhausted, but the footage could be gold.`,
        options: [
            {
                label: "Keep Filming (Energy -20)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, energy: { ...p.energy, current: Math.max(0, p.energy.current - 20) } };
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 15) };
                    return { updatedPlayer, updatedProject, log: `You stayed until 4 AM. You're dead tired, but that scene was a masterpiece.` };
                }
            },
            {
                label: "Wrap for the Day",
                impact: (p, c) => {
                    return { updatedPlayer: p, updatedProject: c, log: `You prioritized the crew's health. ${npc.name} is disappointed but professional.` };
                }
            }
        ]
    }),
    BOX_OFFICE_POISON: (npc) => ({
        id: `crisis_poison_${Date.now()}`,
        title: "Bad Press",
        description: `A tabloid leaked a story about ${npc.name}'s past failures, and it's trending. Fans are already calling the movie a 'flop'.`,
        options: [
            {
                label: "PR Blitz ($100k)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 100000 };
                    return { updatedPlayer, updatedProject: c, log: `You spent $100k on a PR campaign to bury the story. Damage controlled.` };
                }
            },
            {
                label: "Ignore It",
                impact: (p, c) => {
                    if (c.projectDetails) {
                        c.projectDetails.hiddenStats.rawHype = Math.max(0, (c.projectDetails.hiddenStats.rawHype || 50) - 15);
                    }
                    return { updatedPlayer: p, updatedProject: c, log: `You ignored it. The buzz for the movie has taken a significant hit.` };
                }
            }
        ]
    }),
    PROFESSIONAL: () => null,
    EASY_GOING: () => null,
    AMBITIOUS: () => null
};

import { GENERAL_CRISIS_TEMPLATES } from './productionEvents';
import { generateRandomCrisis } from './crisisGenerator';
import { generateDirectorDecision, DirectorDecision } from './directorGenerator';

export const applyCrisisImpact = (player: Player, event: ScheduledEvent, choiceIndex: number): { updatedPlayer: Player, log: string } => {
    const { projectId, crisisId } = event.data;
    const project = player.commitments.find(c => c.id === projectId);
    if (!project) return { updatedPlayer: player, log: "Project not found." };

    let crisis: ProductionCrisis | null = null;

    if (event.type === 'DIRECTOR_DECISION') {
        // Reconstruct director decision
        crisis = {
            id: crisisId,
            title: event.title,
            description: event.description || '',
            options: event.data.options.map((opt: any) => ({
                label: opt.label,
                impact: (p: Player, c: Commitment) => {
                    // Impact mapping for director decisions
                    if (opt.label.includes("Practical")) {
                        const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 10) };
                        if (updatedProject.projectDetails) {
                            updatedProject.projectDetails.hiddenStats.prestigeBonus = (updatedProject.projectDetails.hiddenStats.prestigeBonus || 0) + 5;
                        }
                        return { updatedPlayer: p, updatedProject, log: "You chose practical effects. The set was dangerous, but the footage is breathtaking." };
                    } else if (opt.label.includes("CGI")) {
                        const updatedPlayer = { ...p, money: p.money - 50000 };
                        return { updatedPlayer, updatedProject: c, log: "You went with CGI. It's safe and efficient." };
                    } else if (opt.label.includes("Allow Improv")) {
                        const updatedPlayer = { ...p, stats: { ...p.stats, talent: p.stats.talent + 2 } };
                        const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 5) };
                        return { updatedPlayer, updatedProject, log: "The improv was a hit!" };
                    } else if (opt.label.includes("Stick to Script")) {
                        const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 2) };
                        return { updatedPlayer: p, updatedProject, log: "You played it safe." };
                    } else if (opt.label.includes("Moody")) {
                        const updatedProject = { ...c };
                        if (updatedProject.projectDetails) {
                            updatedProject.projectDetails.hiddenStats.prestigeBonus = (updatedProject.projectDetails.hiddenStats.prestigeBonus || 0) + 10;
                            updatedProject.projectDetails.hiddenStats.rawHype = Math.max(0, (updatedProject.projectDetails.hiddenStats.rawHype || 50) - 5);
                        }
                        return { updatedPlayer: p, updatedProject, log: "The film looks like a masterpiece." };
                    } else if (opt.label.includes("Bright")) {
                        const updatedProject = { ...c };
                        if (updatedProject.projectDetails) {
                            updatedProject.projectDetails.hiddenStats.rawHype = Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + 10);
                        }
                        return { updatedPlayer: p, updatedProject, log: "The movie looks clean and accessible." };
                    } else if (opt.label.includes("Go for it")) {
                        const updatedPlayer = { ...p, energy: { ...p.energy, current: Math.max(0, p.energy.current - 30) } };
                        const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 15) };
                        return { updatedPlayer, updatedProject, log: "You got the long take!" };
                    } else {
                        return { updatedPlayer: p, updatedProject: c, log: "You made a creative choice." };
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
                impact: (p: Player, c: Commitment) => {
                    // We need to re-derive the impact based on the label or index
                    // This is tricky without storing functions.
                    // Let's use a standard impact mapper for generative ones.
                    if (opt.label.includes("Money")) {
                        const updatedPlayer = { ...p, money: p.money - 25000 };
                        return { updatedPlayer, updatedProject: c, log: `You resolved the issue with a $25k investment.` };
                    } else {
                        const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 4) };
                        return { updatedPlayer: p, updatedProject, log: `You pushed through the crisis, but quality suffered.` };
                    }
                }
            }))
        };
    } else if (event.data.isGeneral) {
        const templateIndex = event.data.templateIndex;
        if (templateIndex !== undefined && GENERAL_CRISIS_TEMPLATES[templateIndex]) {
            crisis = GENERAL_CRISIS_TEMPLATES[templateIndex](project);
        }
    } else {
        const trait = event.data.trait as ActorTrait;
        const npcId = event.data.npcId;
        const npc = [...NPC_DATABASE, ...(player.flags.extraNPCs || [])].find(n => n.id === npcId);
        
        if (npc && trait && CRISIS_TEMPLATES[trait]) {
            crisis = CRISIS_TEMPLATES[trait](npc);
        }
    }

    if (!crisis) return { updatedPlayer: player, log: "Crisis data incomplete." };

    const option = crisis.options[choiceIndex];
    const { updatedPlayer, updatedProject, log } = option.impact(player, project);
    
    // Update the project in the player object
    updatedPlayer.commitments = updatedPlayer.commitments.map(c => c.id === projectId ? updatedProject : c);
    
    return { updatedPlayer, log };
};

export const checkForProductionCrisis = (player: Player, project: Commitment): ProductionCrisis | null => {
    if (project.projectPhase !== 'PRODUCTION') return null;
    
    // 15% chance per week of a crisis
    if (Math.random() > 0.15) return null;

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
        const templateIndex = Math.floor(Math.random() * GENERAL_CRISIS_TEMPLATES.length);
        const crisis = GENERAL_CRISIS_TEMPLATES[templateIndex](project);
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
