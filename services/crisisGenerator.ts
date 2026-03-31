import { Player, Commitment, ActorTrait, ProductionCrisis } from '../types';
import { NPC_DATABASE } from './npcLogic';

type CrisisCategory = 'TECHNICAL' | 'INTERPERSONAL' | 'ENVIRONMENTAL' | 'FINANCIAL' | 'CREATIVE' | 'LEGAL';

interface CrisisTemplate {
    title: string;
    description: string;
    options: {
        label: string;
        impact: (p: Player, c: Commitment) => { updatedPlayer: Player, updatedProject: Commitment, log: string };
    }[];
}

const TECHNICAL_TEMPLATES: CrisisTemplate[] = [
    {
        title: "Corrupted Footage",
        description: "A digital error has corrupted several key scenes from yesterday's shoot.",
        options: [
            {
                label: "Reshoot ($50k)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 50000 };
                    return { updatedPlayer, updatedProject: c, log: "You paid for a quick reshoot. The schedule holds, but the budget takes a hit." };
                }
            },
            {
                label: "Fix in Post (Quality -5)",
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 5) };
                    return { updatedPlayer: p, updatedProject, log: "The VFX team will try to patch it. It won't be perfect, but it's cheaper than a reshoot." };
                }
            }
        ]
    },
    {
        title: "Equipment Failure",
        description: "The high-end anamorphic lenses have been damaged during an action sequence.",
        options: [
            {
                label: "Rent Replacements ($30k)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 30000 };
                    return { updatedPlayer, updatedProject: c, log: "You rented replacements immediately. Production continues." };
                }
            },
            {
                label: "Use Backup Lenses (Quality -3)",
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 3) };
                    return { updatedPlayer: p, updatedProject, log: "The backup glass isn't as sharp, but the show must go on." };
                }
            }
        ]
    }
];

const INTERPERSONAL_TEMPLATES: CrisisTemplate[] = [
    {
        title: "Director vs Star",
        description: "The Director and the Lead Actor are having a heated argument over a creative choice.",
        options: [
            {
                label: "Side with Director",
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 5) };
                    return { updatedPlayer: p, updatedProject, log: "The director's vision is preserved, boosting quality, but the actor is fuming." };
                }
            },
            {
                label: "Side with Actor",
                impact: (p, c) => {
                    const updatedProject = { ...c };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + 5);
                    }
                    return { updatedPlayer: p, updatedProject, log: "The actor is happy and promotes the film more, but the director feels undermined." };
                }
            }
        ]
    }
];

const ENVIRONMENTAL_TEMPLATES: CrisisTemplate[] = [
    {
        title: "Sudden Storm",
        description: "An unpredicted storm has washed out the exterior location.",
        options: [
            {
                label: "Wait it Out (Delay 1w)",
                impact: (p, c) => {
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1 };
                    return { updatedPlayer: p, updatedProject, log: "You waited for the sun. One week added to production." };
                }
            },
            {
                label: "Move to Studio ($40k)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 40000 };
                    return { updatedPlayer, updatedProject: c, log: "You moved the shoot to a soundstage. Expensive, but on schedule." };
                }
            }
        ]
    }
];

const FINANCIAL_TEMPLATES: CrisisTemplate[] = [
    {
        title: "Budget Overrun",
        description: "The production is running over budget due to unexpected logistics costs.",
        options: [
            {
                label: "Inject Cash ($100k)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 100000 };
                    return { updatedPlayer, updatedProject: c, log: "You covered the costs out of pocket to keep things moving." };
                }
            },
            {
                label: "Cut Corners (Quality -10)",
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 10) };
                    return { updatedPlayer: p, updatedProject, log: "You slashed the catering and background actor budget. Morale and quality dropped." };
                }
            }
        ]
    }
];

const CREATIVE_TEMPLATES: CrisisTemplate[] = [
    {
        title: "Script Leak",
        description: "A major plot twist has been leaked online by a disgruntled extra.",
        options: [
            {
                label: "Rewrite Twist (Delay 1w)",
                impact: (p, c) => {
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1 };
                    return { updatedPlayer: p, updatedProject, log: "The writers scrambled to change the ending. One week delay." };
                }
            },
            {
                label: "Lean Into It (Hype +10)",
                impact: (p, c) => {
                    const updatedProject = { ...c };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + 10);
                    }
                    return { updatedPlayer: p, updatedProject, log: "You confirmed the leak and used it for marketing. Hype is through the roof!" };
                }
            }
        ]
    }
];

const LEGAL_TEMPLATES: CrisisTemplate[] = [
    {
        title: "Copyright Claim",
        description: "A local artist claims a mural in the background of a key scene is copyrighted.",
        options: [
            {
                label: "Pay Settlement ($20k)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 20000 };
                    return { updatedPlayer, updatedProject: c, log: "You paid the artist to avoid a lawsuit." };
                }
            },
            {
                label: "Blur it Out (Quality -2)",
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 2) };
                    return { updatedPlayer: p, updatedProject, log: "The VFX team blurred the mural. It looks a bit distracting." };
                }
            }
        ]
    }
];

// GENERATIVE COMPONENTS
const ADJECTIVES = ["Unexpected", "Catastrophic", "Bizarre", "Sudden", "Total", "Minor", "Critical", "Shocking"];
const NOUNS = ["Failure", "Crisis", "Disaster", "Incident", "Drama", "Breakdown", "Mishap", "Scandal"];
const SUBJECTS = ["Catering", "Transportation", "Lighting", "Sound", "Security", "Publicity", "Logistics", "Scheduling"];

export const generateRandomCrisis = (project: Commitment, player: Player): ProductionCrisis => {
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
            description: template.description,
            options: template.options
        };
    } else {
        // GENERATIVE LOGIC
        const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
        const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
        const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
        
        const title = `${adj} ${subject} ${noun}`;
        const description = `A ${adj.toLowerCase()} issue with the ${subject.toLowerCase()} team has caused a ${noun.toLowerCase()} on the set of ${project.name}.`;
        
        return {
            id: `crisis_gen_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            title,
            description,
            options: [
                {
                    label: "Fix with Money ($25k)",
                    impact: (p, c) => {
                        const updatedPlayer = { ...p, money: p.money - 25000 };
                        return { updatedPlayer, updatedProject: c, log: `You threw money at the ${subject.toLowerCase()} problem. It's fixed.` };
                    }
                },
                {
                    label: "Push Through (Quality -4)",
                    impact: (p, c) => {
                        const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 4) };
                        return { updatedPlayer: p, updatedProject, log: `You ignored the ${subject.toLowerCase()} issue. Production continued, but quality took a hit.` };
                    }
                }
            ]
        };
    }
};
