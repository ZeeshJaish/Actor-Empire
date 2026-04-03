import { Player, Commitment, NPCActor, ProductionCrisis } from '../types';

export const GENERAL_CRISIS_TEMPLATES: ((project: Commitment) => ProductionCrisis)[] = [
    (project) => ({
        id: `crisis_camera_${Date.now()}`,
        title: "Camera in Frame!",
        description: `During the edit of a crucial scene, the director noticed a boom mic and a camera operator clearly visible in the reflection of a window.`,
        options: [
            {
                label: "Reshoot Scene ($50k, Delay)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 50000 };
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 5) };
                    return { updatedPlayer, updatedProject, log: `You spent $50k and delayed production to reshoot. The scene is perfect now.` };
                }
            },
            {
                label: "Fix in Post ($100k)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 100000 };
                    return { updatedPlayer, updatedProject: c, log: `You paid the VFX team $100k to digitally remove the crew. It looks seamless.` };
                }
            },
            {
                label: "Leave It (Free)",
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 10) };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + 10);
                    }
                    const updatedPlayer = { ...p };
                    // Add a social post
                    updatedPlayer.x.feed.unshift({
                        id: `post_${Date.now()}`,
                        authorId: 'npc_rnd_1',
                        authorName: 'MovieNerd99',
                        authorHandle: '@movienerd99',
                        authorAvatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Nerd',
                        content: `LMAO did anyone else see the camera guy in the new ${project.name} trailer? 💀 #MovieMistakes`,
                        likes: 45000,
                        retweets: 12000,
                        replies: 300,
                        timestamp: Date.now(),
                        isLiked: false,
                        isRetweeted: false,
                        isPlayer: false,
                        isVerified: false
                    });
                    return { updatedPlayer, updatedProject, log: `You left the mistake in. It went viral on Twitter as a meme, boosting hype but hurting quality.` };
                }
            }
        ]
    }),
    (project) => ({
        id: `crisis_weather_${Date.now()}`,
        title: "Unexpected Hurricane",
        description: `A massive storm has hit your primary filming location. The set is flooded and unusable for days.`,
        options: [
            {
                label: "Wait it out (Delay)",
                impact: (p, c) => {
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 2 };
                    return { updatedPlayer: p, updatedProject, log: `You waited for the storm to pass. Production is delayed by 2 weeks.` };
                }
            },
            {
                label: "Move to Soundstage ($250k)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 250000 };
                    return { updatedPlayer, updatedProject: c, log: `You spent $250k to rebuild the set indoors. Production continues on schedule.` };
                }
            }
        ]
    }),
    (project) => ({
        id: `crisis_script_leak_${Date.now()}`,
        title: "Script Leaked!",
        description: `The entire script for ${project.name} has been leaked on Reddit. Fans are tearing apart the ending.`,
        options: [
            {
                label: "Rewrite Ending ($150k, Delay)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 150000 };
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 10) };
                    return { updatedPlayer, updatedProject, log: `You hired writers to change the ending. The new version is actually better!` };
                }
            },
            {
                label: "Lean Into It (Hype)",
                impact: (p, c) => {
                    const updatedProject = { ...c };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + 20);
                    }
                    return { updatedPlayer: p, updatedProject, log: `You confirmed the leak. The internet is buzzing with theories, driving up massive hype.` };
                }
            }
        ]
    }),
    (project) => ({
        id: `crisis_stunt_${Date.now()}`,
        title: "Stunt Gone Wrong",
        description: `During a high-speed chase sequence, a stunt driver crashed into the craft services table. No one is hurt, but the equipment is destroyed.`,
        options: [
            {
                label: "Replace Equipment ($80k)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 80000 };
                    return { updatedPlayer, updatedProject: c, log: `You bought new cameras and snacks. Filming resumes.` };
                }
            },
            {
                label: "Use the Footage (Free)",
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 15) };
                    return { updatedPlayer: p, updatedProject, log: `You wrote the crash into the movie! It looks incredibly realistic and visceral.` };
                }
            }
        ]
    }),
    (project) => ({
        id: `crisis_creative_diff_${Date.now()}`,
        title: "Creative Differences",
        description: `The director wants to shoot the climax in black and white for 'artistic integrity'. The studio executives are furious.`,
        options: [
            {
                label: "Back the Director",
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 15) };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.max(0, (updatedProject.projectDetails.hiddenStats.rawHype || 50) - 10);
                    }
                    return { updatedPlayer: p, updatedProject, log: `You backed the director. The film is an artistic triumph, but mainstream audiences might be alienated.` };
                }
            },
            {
                label: "Force Color",
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 10) };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + 10);
                    }
                    return { updatedPlayer: p, updatedProject, log: `You forced them to shoot in color. The director is unhappy, but it's much more marketable.` };
                }
            }
        ]
    }),
    (project) => ({
        id: `crisis_catering_${Date.now()}`,
        title: "Food Poisoning",
        description: `Half the crew got food poisoning from the seafood paella at lunch. Production has ground to a halt.`,
        options: [
            {
                label: "Halt Production (Delay)",
                impact: (p, c) => {
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1 };
                    return { updatedPlayer: p, updatedProject, log: `You sent everyone home to recover. Production delayed by a week.` };
                }
            },
            {
                label: "Hire Scabs ($50k)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 50000 };
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 10) };
                    return { updatedPlayer, updatedProject, log: `You hired temporary crew members. The quality suffered, but you stayed on schedule.` };
                }
            }
        ]
    }),
    (project: Commitment): ProductionCrisis => ({
        id: `crisis_wardrobe_${Date.now()}`,
        title: "Wardrobe Malfunction",
        description: `The lead actor's custom-made superhero suit ripped right down the middle during a key action sequence.`,
        options: [
            {
                label: "Rush Repair ($25k)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 25000 };
                    return { updatedPlayer, updatedProject: c, log: `You paid extra for an overnight rush repair. The suit looks good as new.` };
                }
            },
            {
                label: "Use Duct Tape (Free)",
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 5) };
                    return { updatedPlayer: p, updatedProject, log: `You used duct tape and shot around the tear. It looks a bit cheap, but you saved money.` };
                }
            }
        ]
    }),
    (project: Commitment): ProductionCrisis => ({
        id: `crisis_drone_${Date.now()}`,
        title: "Paparazzi Drone",
        description: `A paparazzi drone is hovering over the set, trying to get unauthorized photos of the production.`,
        options: [
            {
                label: "Shoot it Down ($10k Fine)",
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 10000 };
                    const updatedProject = { ...c };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + 15);
                    }
                    return { updatedPlayer, updatedProject, log: `You shot the drone down. You got fined $10k, but the incident went viral, boosting hype!` };
                }
            },
            {
                label: "Cover the Set (Delay)",
                impact: (p, c) => {
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1 };
                    return { updatedPlayer: p, updatedProject, log: `You halted production to cover the set. The delay cost you a week.` };
                }
            }
        ]
    }),
    (project: Commitment): ProductionCrisis => ({
        id: `crisis_ego_${Date.now()}`,
        title: "Trailer Envy",
        description: "Your co-star is furious that your trailer is 2 feet longer than theirs. They refuse to leave their dressing room.",
        options: [
            {
                label: "Swap Trailers",
                impact: (p, c) => ({
                    updatedPlayer: { ...p, stats: { ...p.stats, happiness: Math.max(0, p.stats.happiness - 5) } },
                    updatedProject: { ...c, productionPerformance: (c.productionPerformance || 50) + 3 },
                    log: "You took the smaller trailer. The co-star is happy, but you're cramped."
                })
            },
            {
                label: "Reason with Them",
                impact: (p, c) => ({
                    updatedPlayer: p,
                    updatedProject: { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 5) },
                    log: "The argument lasted all morning. You finally got them out, but half the day is gone."
                })
            }
        ]
    }),
    (project: Commitment): ProductionCrisis => ({
        id: `crisis_stunt_${Date.now()}`,
        title: "Stunt Gone Wrong",
        description: "A minor explosion went off early. No one is hurt, but the set is a mess and the fire marshal is asking questions.",
        options: [
            {
                label: "Bribe Marshal ($15k)",
                impact: (p, c) => ({
                    updatedPlayer: { ...p, money: p.money - 15000 },
                    updatedProject: { ...c, productionPerformance: (c.productionPerformance || 50) + 1 },
                    log: "A 'donation' to the fire safety fund kept the set open."
                })
            },
            {
                label: "Shut Down for Inspection",
                impact: (p, c) => ({
                    updatedPlayer: p,
                    updatedProject: { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 8) },
                    log: "Safety first. You lost two days of shooting, but the crew feels safe."
                })
            }
        ]
    }),
    (project: Commitment): ProductionCrisis => ({
        id: `crisis_method_${Date.now()}`,
        title: "Method Acting Madness",
        description: "You've been staying in character as a silent monk, but now you need to record ADR (voiceover) for a commercial.",
        options: [
            {
                label: "Break Character",
                impact: (p, c) => ({
                    updatedPlayer: { ...p, stats: { ...p.stats, talent: Math.max(0, p.stats.talent - 2) } },
                    updatedProject: c,
                    log: "You broke the silence. The ADR is done, but you lost your 'edge'."
                })
            },
            {
                label: "Use a Voice Double ($2k)",
                impact: (p, c) => ({
                    updatedPlayer: { ...p, money: p.money - 2000 },
                    updatedProject: { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 1) },
                    log: "The double sounds okay, but fans might notice."
                })
            }
        ]
    }),
    (project: Commitment): ProductionCrisis => ({
        id: `crisis_leak_${Date.now()}`,
        title: "Script Leak!",
        description: "A draft of the script was found in a coffee shop. Fans are already dissecting the plot twists online.",
        options: [
            {
                label: "Rewrite the Ending",
                impact: (p, c) => {
                    const updatedPlayer = { ...p };
                    spendPlayerEnergy(updatedPlayer, 30);
                    return {
                        updatedPlayer,
                        updatedProject: { ...c, productionPerformance: (c.productionPerformance || 50) + 5 },
                        log: "All-nighter to rewrite. The new ending is even better, but you're exhausted."
                    };
                }
            },
            {
                label: "Ignore It",
                impact: (p, c) => ({
                    updatedPlayer: p,
                    updatedProject: { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 10) },
                    log: "The surprise is ruined. Anticipation for the movie has dropped."
                })
            }
        ]
    })
];
import { spendPlayerEnergy } from './premiumLogic';
