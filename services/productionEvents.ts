import { Player, Commitment, NPCActor, ProductionCrisis, Genre } from '../types';
import { getPlayerLanguage, t } from './i18n';

const tuneProject = (project: Commitment, performanceDelta = 0, hypeDelta = 0): Commitment => {
    const updatedProject = {
        ...project,
        productionPerformance: Math.max(0, Math.min(100, (project.productionPerformance || 50) + performanceDelta)),
    };
    if (updatedProject.projectDetails && hypeDelta !== 0) {
        updatedProject.projectDetails = {
            ...updatedProject.projectDetails,
            hiddenStats: {
                ...updatedProject.projectDetails.hiddenStats,
                rawHype: Math.max(0, Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + hypeDelta)),
            },
        };
    }
    return updatedProject;
};

const delayProject = (project: Commitment, weeks = 1, performanceDelta = 0, hypeDelta = 0): Commitment => ({
    ...tuneProject(project, performanceDelta, hypeDelta),
    phaseWeeksLeft: (project.phaseWeeksLeft || 1) + weeks,
});

export const GENERAL_CRISIS_TEMPLATES: ((project: Commitment) => ProductionCrisis)[] = [
    (project) => ({
        id: `crisis_camera_${Date.now()}`,
        title: "Camera in Frame!",
        titleKey: 'production.event.camera.title',
        description: `During the edit of a crucial scene, the director noticed a boom mic and a camera operator clearly visible in the reflection of a window.`,
        descriptionKey: 'production.event.camera.description',
        options: [
            {
                label: "Reshoot Scene ($50k, Delay)",
                labelKey: 'production.event.camera.reshoot.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 50000 };
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 5) };
                    return { updatedPlayer, updatedProject, log: `You spent $50k and delayed production to reshoot. The scene is perfect now.`, logKey: 'production.event.camera.reshoot.log' };
                }
            },
            {
                label: "Fix in Post ($100k)",
                labelKey: 'production.event.camera.fix.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 100000 };
                    return { updatedPlayer, updatedProject: c, log: `You paid the VFX team $100k to digitally remove the crew. It looks seamless.`, logKey: 'production.event.camera.fix.log' };
                }
            },
            {
                label: "Leave It (Free)",
                labelKey: 'production.event.camera.leave.label',
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
                        content: t(getPlayerLanguage(p), 'production.event.camera.leave.socialPost', { project: project.name }),
                        likes: 45000,
                        retweets: 12000,
                        replies: 300,
                        timestamp: Date.now(),
                        isLiked: false,
                        isRetweeted: false,
                        isPlayer: false,
                        isVerified: false
                    });
                    return { updatedPlayer, updatedProject, log: `You left the mistake in. It went viral on Twitter as a meme, boosting hype but hurting quality.`, logKey: 'production.event.camera.leave.log' };
                }
            }
        ]
    }),
    (project) => ({
        id: `crisis_weather_${Date.now()}`,
        title: "Unexpected Hurricane",
        titleKey: 'production.event.hurricane.title',
        description: `A massive storm has hit your primary filming location. The set is flooded and unusable for days.`,
        descriptionKey: 'production.event.hurricane.description',
        options: [
            {
                label: "Wait it out (Delay)",
                labelKey: 'production.event.hurricane.wait.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 2 };
                    return { updatedPlayer: p, updatedProject, log: `You waited for the storm to pass. Production is delayed by 2 weeks.`, logKey: 'production.event.hurricane.wait.log' };
                }
            },
            {
                label: "Move to Soundstage ($250k)",
                labelKey: 'production.event.hurricane.soundstage.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 250000 };
                    return { updatedPlayer, updatedProject: c, log: `You spent $250k to rebuild the set indoors. Production continues on schedule.`, logKey: 'production.event.hurricane.soundstage.log' };
                }
            }
        ]
    }),
    (project) => ({
        id: `crisis_script_leak_${Date.now()}`,
        title: "Script Leaked!",
        titleKey: 'production.event.scriptLeaked.title',
        description: `The entire script for ${project.name} has been leaked on Reddit. Fans are tearing apart the ending.`,
        descriptionKey: 'production.event.scriptLeaked.description',
        textVars: { project: project.name },
        options: [
            {
                label: "Rewrite Ending ($150k, Delay)",
                labelKey: 'production.event.scriptLeaked.rewrite.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 150000 };
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 10) };
                    return { updatedPlayer, updatedProject, log: `You hired writers to change the ending. The new version is actually better!`, logKey: 'production.event.scriptLeaked.rewrite.log' };
                }
            },
            {
                label: "Lean Into It (Hype)",
                labelKey: 'production.event.scriptLeaked.lean.label',
                impact: (p, c) => {
                    const updatedProject = { ...c };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + 20);
                    }
                    return { updatedPlayer: p, updatedProject, log: `You confirmed the leak. The internet is buzzing with theories, driving up massive hype.`, logKey: 'production.event.scriptLeaked.lean.log' };
                }
            }
        ]
    }),
    (project) => ({
        id: `crisis_stunt_${Date.now()}`,
        title: "Stunt Gone Wrong",
        titleKey: 'production.event.stuntCraft.title',
        description: `During a high-speed chase sequence, a stunt driver crashed into the craft services table. No one is hurt, but the equipment is destroyed.`,
        descriptionKey: 'production.event.stuntCraft.description',
        options: [
            {
                label: "Replace Equipment ($80k)",
                labelKey: 'production.event.stuntCraft.replace.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 80000 };
                    return { updatedPlayer, updatedProject: c, log: `You bought new cameras and snacks. Filming resumes.`, logKey: 'production.event.stuntCraft.replace.log' };
                }
            },
            {
                label: "Use the Footage (Free)",
                labelKey: 'production.event.stuntCraft.use.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 15) };
                    return { updatedPlayer: p, updatedProject, log: `You wrote the crash into the movie! It looks incredibly realistic and visceral.`, logKey: 'production.event.stuntCraft.use.log' };
                }
            }
        ]
    }),
    (project) => ({
        id: `crisis_creative_diff_${Date.now()}`,
        title: "Creative Differences",
        titleKey: 'production.event.creativeDiff.title',
        description: `The director wants to shoot the climax in black and white for 'artistic integrity'. The studio executives are furious.`,
        descriptionKey: 'production.event.creativeDiff.description',
        options: [
            {
                label: "Back the Director",
                labelKey: 'production.event.creativeDiff.back.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.min(100, (c.productionPerformance || 50) + 15) };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.max(0, (updatedProject.projectDetails.hiddenStats.rawHype || 50) - 10);
                    }
                    return { updatedPlayer: p, updatedProject, log: `You backed the director. The film is an artistic triumph, but mainstream audiences might be alienated.`, logKey: 'production.event.creativeDiff.back.log' };
                }
            },
            {
                label: "Force Color",
                labelKey: 'production.event.creativeDiff.force.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 10) };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + 10);
                    }
                    return { updatedPlayer: p, updatedProject, log: `You forced them to shoot in color. The director is unhappy, but it's much more marketable.`, logKey: 'production.event.creativeDiff.force.log' };
                }
            }
        ]
    }),
    (project) => ({
        id: `crisis_catering_${Date.now()}`,
        title: "Food Poisoning",
        titleKey: 'production.event.catering.title',
        description: `Half the crew got food poisoning from the seafood paella at lunch. Production has ground to a halt.`,
        descriptionKey: 'production.event.catering.description',
        options: [
            {
                label: "Halt Production (Delay)",
                labelKey: 'production.event.catering.halt.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1 };
                    return { updatedPlayer: p, updatedProject, log: `You sent everyone home to recover. Production delayed by a week.`, logKey: 'production.event.catering.halt.log' };
                }
            },
            {
                label: "Hire Scabs ($50k)",
                labelKey: 'production.event.catering.hire.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 50000 };
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 10) };
                    return { updatedPlayer, updatedProject, log: `You hired temporary crew members. The quality suffered, but you stayed on schedule.`, logKey: 'production.event.catering.hire.log' };
                }
            }
        ]
    }),
    (project: Commitment): ProductionCrisis => ({
        id: `crisis_wardrobe_${Date.now()}`,
        title: "Wardrobe Malfunction",
        titleKey: 'production.event.wardrobe.title',
        description: `The lead actor's custom-made superhero suit ripped right down the middle during a key action sequence.`,
        descriptionKey: 'production.event.wardrobe.description',
        options: [
            {
                label: "Rush Repair ($25k)",
                labelKey: 'production.event.wardrobe.repair.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 25000 };
                    return { updatedPlayer, updatedProject: c, log: `You paid extra for an overnight rush repair. The suit looks good as new.`, logKey: 'production.event.wardrobe.repair.log' };
                }
            },
            {
                label: "Use Duct Tape (Free)",
                labelKey: 'production.event.wardrobe.tape.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 5) };
                    return { updatedPlayer: p, updatedProject, log: `You used duct tape and shot around the tear. It looks a bit cheap, but you saved money.`, logKey: 'production.event.wardrobe.tape.log' };
                }
            }
        ]
    }),
    (project: Commitment): ProductionCrisis => ({
        id: `crisis_drone_${Date.now()}`,
        title: "Paparazzi Drone",
        titleKey: 'production.event.drone.title',
        description: `A paparazzi drone is hovering over the set, trying to get unauthorized photos of the production.`,
        descriptionKey: 'production.event.drone.description',
        options: [
            {
                label: "Shoot it Down ($10k Fine)",
                labelKey: 'production.event.drone.shoot.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p, money: p.money - 10000 };
                    const updatedProject = { ...c };
                    if (updatedProject.projectDetails) {
                        updatedProject.projectDetails.hiddenStats.rawHype = Math.min(100, (updatedProject.projectDetails.hiddenStats.rawHype || 50) + 15);
                    }
                    return { updatedPlayer, updatedProject, log: `You shot the drone down. You got fined $10k, but the incident went viral, boosting hype!`, logKey: 'production.event.drone.shoot.log' };
                }
            },
            {
                label: "Cover the Set (Delay)",
                labelKey: 'production.event.drone.cover.label',
                impact: (p, c) => {
                    const updatedProject = { ...c, phaseWeeksLeft: (c.phaseWeeksLeft || 1) + 1 };
                    return { updatedPlayer: p, updatedProject, log: `You halted production to cover the set. The delay cost you a week.`, logKey: 'production.event.drone.cover.log' };
                }
            }
        ]
    }),
    (project: Commitment): ProductionCrisis => ({
        id: `crisis_ego_${Date.now()}`,
        title: "Trailer Envy",
        titleKey: 'production.event.trailerEnvy.title',
        description: "Your co-star is furious that your trailer is 2 feet longer than theirs. They refuse to leave their dressing room.",
        descriptionKey: 'production.event.trailerEnvy.description',
        options: [
            {
                label: "Swap Trailers",
                labelKey: 'production.event.trailerEnvy.swap.label',
                impact: (p, c) => ({
                    updatedPlayer: { ...p, stats: { ...p.stats, happiness: Math.max(0, p.stats.happiness - 5) } },
                    updatedProject: { ...c, productionPerformance: (c.productionPerformance || 50) + 3 },
                    log: "You took the smaller trailer. The co-star is happy, but you're cramped.",
                    logKey: 'production.event.trailerEnvy.swap.log'
                })
            },
            {
                label: "Reason with Them",
                labelKey: 'production.event.trailerEnvy.reason.label',
                impact: (p, c) => ({
                    updatedPlayer: p,
                    updatedProject: { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 5) },
                    log: "The argument lasted all morning. You finally got them out, but half the day is gone.",
                    logKey: 'production.event.trailerEnvy.reason.log'
                })
            }
        ]
    }),
    (project: Commitment): ProductionCrisis => ({
        id: `crisis_stunt_${Date.now()}`,
        title: "Stunt Gone Wrong",
        titleKey: 'production.event.marshalStunt.title',
        description: "A minor explosion went off early. No one is hurt, but the set is a mess and the fire marshal is asking questions.",
        descriptionKey: 'production.event.marshalStunt.description',
        options: [
            {
                label: "Bribe Marshal ($15k)",
                labelKey: 'production.event.marshalStunt.bribe.label',
                impact: (p, c) => ({
                    updatedPlayer: { ...p, money: p.money - 15000 },
                    updatedProject: { ...c, productionPerformance: (c.productionPerformance || 50) + 1 },
                    log: "A 'donation' to the fire safety fund kept the set open.",
                    logKey: 'production.event.marshalStunt.bribe.log'
                })
            },
            {
                label: "Shut Down for Inspection",
                labelKey: 'production.event.marshalStunt.inspect.label',
                impact: (p, c) => ({
                    updatedPlayer: p,
                    updatedProject: { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 8) },
                    log: "Safety first. You lost two days of shooting, but the crew feels safe.",
                    logKey: 'production.event.marshalStunt.inspect.log'
                })
            }
        ]
    }),
    (project: Commitment): ProductionCrisis => ({
        id: `crisis_method_${Date.now()}`,
        title: "Method Acting Madness",
        titleKey: 'production.event.methodAdr.title',
        description: "You've been staying in character as a silent monk, but now you need to record ADR (voiceover) for a commercial.",
        descriptionKey: 'production.event.methodAdr.description',
        options: [
            {
                label: "Break Character",
                labelKey: 'production.event.methodAdr.break.label',
                impact: (p, c) => ({
                    updatedPlayer: { ...p, stats: { ...p.stats, talent: Math.max(0, p.stats.talent - 2) } },
                    updatedProject: c,
                    log: "You broke the silence. The ADR is done, but you lost your 'edge'.",
                    logKey: 'production.event.methodAdr.break.log'
                })
            },
            {
                label: "Use a Voice Double ($2k)",
                labelKey: 'production.event.methodAdr.double.label',
                impact: (p, c) => ({
                    updatedPlayer: { ...p, money: p.money - 2000 },
                    updatedProject: { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 1) },
                    log: "The double sounds okay, but fans might notice.",
                    logKey: 'production.event.methodAdr.double.log'
                })
            }
        ]
    }),
    (project: Commitment): ProductionCrisis => ({
        id: `crisis_leak_${Date.now()}`,
        title: "Script Leak!",
        titleKey: 'production.event.scriptCafe.title',
        description: "A draft of the script was found in a coffee shop. Fans are already dissecting the plot twists online.",
        descriptionKey: 'production.event.scriptCafe.description',
        options: [
            {
                label: "Rewrite the Ending",
                labelKey: 'production.event.scriptCafe.rewrite.label',
                impact: (p, c) => {
                    const updatedPlayer = { ...p };
                    spendPlayerEnergy(updatedPlayer, 30);
                    return {
                        updatedPlayer,
                        updatedProject: { ...c, productionPerformance: (c.productionPerformance || 50) + 5 },
                        log: "All-nighter to rewrite. The new ending is even better, but you're exhausted.",
                        logKey: 'production.event.scriptCafe.rewrite.log'
                    };
                }
            },
            {
                label: "Ignore It",
                labelKey: 'production.event.scriptCafe.ignore.label',
                impact: (p, c) => ({
                    updatedPlayer: p,
                    updatedProject: { ...c, productionPerformance: Math.max(0, (c.productionPerformance || 50) - 10) },
                    log: "The surprise is ruined. Anticipation for the movie has dropped.",
                    logKey: 'production.event.scriptCafe.ignore.log'
                })
            }
        ]
    })
];
import { spendPlayerEnergy } from './premiumLogic';

const GENRE_CRISIS_TEMPLATES: Partial<Record<Genre | 'ANIME_FORMAT', ((project: Commitment) => ProductionCrisis)[]>> = {
    MUSICAL: [
        project => ({
            id: `crisis_musical_choreo_${Date.now()}`,
            title: 'Choreography Collapse',
            titleKey: 'production.event.musicalChoreo.title',
            description: `The big ensemble number in ${project.name} is not landing. The dancers look out of sync, and the director wants another rehearsal block.`,
            descriptionKey: 'production.event.musicalChoreo.description',
            textVars: { project: project.name },
            options: [
                {
                    label: 'Hire Choreography Coach ($75k)',
                    labelKey: 'production.event.musicalChoreo.coach.label',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 75000 },
                        updatedProject: tuneProject(c, 9, 4),
                        log: 'The new coach tightened the number. The scene now has real stage energy.',
                        logKey: 'production.event.musicalChoreo.coach.log',
                    }),
                },
                {
                    label: 'Simplify the Number',
                    labelKey: 'production.event.musicalChoreo.simplify.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -4, -2),
                        log: 'You simplified the choreography. It works, but the musical feels less spectacular.',
                        logKey: 'production.event.musicalChoreo.simplify.log',
                    }),
                },
            ],
        }),
        project => ({
            id: `crisis_musical_soundtrack_${Date.now()}`,
            title: 'Soundtrack Buzz',
            titleKey: 'production.event.musicalSoundtrack.title',
            description: `A rough demo from ${project.name} has leaked online, and fans are already looping the chorus.`,
            descriptionKey: 'production.event.musicalSoundtrack.description',
            textVars: { project: project.name },
            options: [
                {
                    label: 'Release Official Single ($40k)',
                    labelKey: 'production.event.musicalSoundtrack.single.label',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 40000 },
                        updatedProject: tuneProject(c, 3, 16),
                        log: 'The official single turned the leak into a marketing win.',
                        logKey: 'production.event.musicalSoundtrack.single.log',
                    }),
                },
                {
                    label: 'Keep It Under Wraps',
                    labelKey: 'production.event.musicalSoundtrack.wraps.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, 1, -4),
                        log: 'You protected the surprise, but the online momentum cooled.',
                        logKey: 'production.event.musicalSoundtrack.wraps.log',
                    }),
                },
            ],
        }),
    ],
    BIOPIC: [
        project => ({
            id: `crisis_biopic_family_${Date.now()}`,
            title: 'Family Approval',
            titleKey: 'production.event.biopicFamily.title',
            description: `People close to ${project.projectDetails?.subjectName || 'the subject'} are objecting to a sensitive scene in ${project.name}.`,
            descriptionKey: 'production.event.biopicFamily.description',
            textVars: { project: project.name, subject: project.projectDetails?.subjectName || 'the subject' },
            options: [
                {
                    label: 'Consult the Family ($60k)',
                    labelKey: 'production.event.biopicFamily.consult.label',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 60000 },
                        updatedProject: tuneProject(c, 7, 3),
                        log: 'The consultation softened the controversy and made the portrayal feel more humane.',
                        logKey: 'production.event.biopicFamily.consult.log',
                    }),
                },
                {
                    label: 'Protect the Truth',
                    labelKey: 'production.event.biopicFamily.truth.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, 4, -8),
                        log: 'You kept the scene. Critics may respect the honesty, but public backlash is building.',
                        logKey: 'production.event.biopicFamily.truth.log',
                    }),
                },
            ],
        }),
        project => ({
            id: `crisis_biopic_transformation_${Date.now()}`,
            title: 'Transformation Pressure',
            titleKey: 'production.event.biopicTransformation.title',
            description: `The makeup and dialect work for ${project.name} is close, but not convincing enough for the camera tests.`,
            descriptionKey: 'production.event.biopicTransformation.description',
            textVars: { project: project.name },
            options: [
                {
                    label: 'Extend Prep (Delay)',
                    labelKey: 'production.event.biopicTransformation.prep.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: delayProject(c, 1, 10, 0),
                        log: 'Extra prep paid off. The transformation now anchors the performance.',
                        logKey: 'production.event.biopicTransformation.prep.log',
                    }),
                },
                {
                    label: 'Trust the Performance',
                    labelKey: 'production.event.biopicTransformation.trust.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -3, 0),
                        log: 'You trusted the acting. The performance is intact, but the resemblance may divide viewers.',
                        logKey: 'production.event.biopicTransformation.trust.log',
                    }),
                },
            ],
        }),
    ],
    SPORTS: [
        project => ({
            id: `crisis_sports_training_${Date.now()}`,
            title: 'Training Injury',
            titleKey: 'production.event.sportsTraining.title',
            description: `A realistic training sequence for ${project.name} caused a minor injury. The stunt coordinator wants to reduce contact.`,
            descriptionKey: 'production.event.sportsTraining.description',
            textVars: { project: project.name },
            options: [
                {
                    label: 'Hire Athletic Doubles ($45k)',
                    labelKey: 'production.event.sportsTraining.doubles.label',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 45000 },
                        updatedProject: tuneProject(c, 6, 2),
                        log: 'The doubles made the sports action look real without risking the cast.',
                        logKey: 'production.event.sportsTraining.doubles.log',
                    }),
                },
                {
                    label: 'Tone Down Contact',
                    labelKey: 'production.event.sportsTraining.tone.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -5, -1),
                        log: 'The shoot is safer, but the game scenes lost some physical bite.',
                        logKey: 'production.event.sportsTraining.tone.log',
                    }),
                },
            ],
        }),
        project => ({
            id: `crisis_sports_consultant_${Date.now()}`,
            title: 'Authenticity Consultant',
            titleKey: 'production.event.sportsConsultant.title',
            description: `Former pros are calling the locker-room scenes in ${project.name} fake. A consultant is available this week.`,
            descriptionKey: 'production.event.sportsConsultant.description',
            textVars: { project: project.name },
            options: [
                {
                    label: 'Bring Consultant In ($35k)',
                    labelKey: 'production.event.sportsConsultant.bring.label',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 35000 },
                        updatedProject: tuneProject(c, 7, 5),
                        log: 'The consultant added texture. Sports fans are going to notice the details.',
                        logKey: 'production.event.sportsConsultant.bring.log',
                    }),
                },
                {
                    label: 'Ignore the Noise',
                    labelKey: 'production.event.sportsConsultant.ignore.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -4, -3),
                        log: 'You ignored the feedback. The scenes still play, but sports fans may be harsh.',
                        logKey: 'production.event.sportsConsultant.ignore.log',
                    }),
                },
            ],
        }),
    ],
    DOCUMENTARY: [
        project => ({
            id: `crisis_doc_subject_${Date.now()}`,
            title: 'Subject Backs Out',
            titleKey: 'production.event.docSubject.title',
            description: `${project.projectDetails?.subjectName || 'The documentary subject'} is threatening to pull access from ${project.name}.`,
            descriptionKey: 'production.event.docSubject.description',
            textVars: { project: project.name, subject: project.projectDetails?.subjectName || 'The documentary subject' },
            options: [
                {
                    label: 'Renegotiate Access ($80k)',
                    labelKey: 'production.event.docSubject.renegotiate.label',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 80000 },
                        updatedProject: tuneProject(c, 8, 4),
                        log: 'The access deal is repaired. The documentary keeps its strongest material.',
                        logKey: 'production.event.docSubject.renegotiate.log',
                    }),
                },
                {
                    label: 'Go Investigative',
                    labelKey: 'production.event.docSubject.investigative.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, 3, 8),
                        log: 'You pivoted to a tougher investigation. Riskier, but the hook is stronger.',
                        logKey: 'production.event.docSubject.investigative.log',
                    }),
                },
            ],
        }),
        project => ({
            id: `crisis_doc_footage_${Date.now()}`,
            title: 'Footage Leak',
            titleKey: 'production.event.docFootage.title',
            description: `A key clip from ${project.name} leaked before the edit is ready, changing the public conversation overnight.`,
            descriptionKey: 'production.event.docFootage.description',
            textVars: { project: project.name },
            options: [
                {
                    label: 'Release Context Clip',
                    labelKey: 'production.event.docFootage.context.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, 4, 12),
                        log: 'The added context turned the leak into a serious conversation.',
                        logKey: 'production.event.docFootage.context.log',
                    }),
                },
                {
                    label: 'Threaten Legal Action ($25k)',
                    labelKey: 'production.event.docFootage.legal.label',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 25000 },
                        updatedProject: tuneProject(c, 1, -5),
                        log: 'The leak slowed down, but the legal tone made the project feel defensive.',
                        logKey: 'production.event.docFootage.legal.log',
                    }),
                },
            ],
        }),
    ],
    ANIMATION: [
        project => ({
            id: `crisis_animation_delay_${Date.now()}`,
            title: 'Animation Delay',
            titleKey: 'production.event.animationDelay.title',
            description: `The animation team on ${project.name} says the current style will miss deadline unless you simplify or expand the team.`,
            descriptionKey: 'production.event.animationDelay.description',
            textVars: { project: project.name },
            options: [
                {
                    label: 'Expand Animation Team ($120k)',
                    labelKey: 'production.event.animationDelay.expand.label',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 120000 },
                        updatedProject: tuneProject(c, 8, 3),
                        log: 'The larger team protected the visual ambition.',
                        logKey: 'production.event.animationDelay.expand.log',
                    }),
                },
                {
                    label: 'Simplify Visual Style',
                    labelKey: 'production.event.animationDelay.simplify.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -5, 0),
                        log: 'The schedule is safe, but the film lost some visual richness.',
                        logKey: 'production.event.animationDelay.simplify.log',
                    }),
                },
            ],
        }),
        project => ({
            id: `crisis_animation_voice_${Date.now()}`,
            title: 'Voice Cast Controversy',
            titleKey: 'production.event.animationVoice.title',
            description: `Fans are questioning one of the voice-casting choices for ${project.name}.`,
            descriptionKey: 'production.event.animationVoice.description',
            textVars: { project: project.name },
            options: [
                {
                    label: 'Release Voice Test',
                    labelKey: 'production.event.animationVoice.test.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, 4, 10),
                        log: 'The voice test won fans over and boosted online buzz.',
                        logKey: 'production.event.animationVoice.test.log',
                    }),
                },
                {
                    label: 'Stay Silent',
                    labelKey: 'production.event.animationVoice.silent.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -3, -5),
                        log: 'Silence kept the controversy alive longer than it needed to.',
                        logKey: 'production.event.animationVoice.silent.log',
                    }),
                },
            ],
        }),
    ],
    ANIME_FORMAT: [
        project => ({
            id: `crisis_anime_fandom_${Date.now()}`,
            title: 'Anime Fandom Scrutiny',
            titleKey: 'production.event.animeFandom.title',
            description: `Early stills from ${project.name} are being dissected frame by frame by anime fans.`,
            descriptionKey: 'production.event.animeFandom.description',
            textVars: { project: project.name },
            options: [
                {
                    label: 'Polish Key Frames ($70k)',
                    labelKey: 'production.event.animeFandom.polish.label',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 70000 },
                        updatedProject: tuneProject(c, 7, 8),
                        log: 'The polish pass turned skeptical fans into loud supporters.',
                        logKey: 'production.event.animeFandom.polish.log',
                    }),
                },
                {
                    label: 'Defend the Style',
                    labelKey: 'production.event.animeFandom.defend.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, 2, -4),
                        log: 'You defended the style. Some fans respect it, others are still not convinced.',
                        logKey: 'production.event.animeFandom.defend.log',
                    }),
                },
            ],
        }),
    ],
    CRIME: [
        project => ({
            id: `crisis_crime_legal_${Date.now()}`,
            title: 'Legal Sensitivity',
            titleKey: 'production.event.crimeLegal.title',
            description: `A real person connected to ${project.name} claims the crime story is too close to their case.`,
            descriptionKey: 'production.event.crimeLegal.description',
            textVars: { project: project.name },
            options: [
                {
                    label: 'Legal Review ($55k)',
                    labelKey: 'production.event.crimeLegal.review.label',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 55000 },
                        updatedProject: tuneProject(c, 3, 0),
                        log: 'The legal review protected the movie without dulling the tension.',
                        logKey: 'production.event.crimeLegal.review.log',
                    }),
                },
                {
                    label: 'Change Names and Push',
                    labelKey: 'production.event.crimeLegal.push.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -4, 6),
                        log: 'You pushed forward. The controversy is generating attention, but the risk is real.',
                        logKey: 'production.event.crimeLegal.push.log',
                    }),
                },
            ],
        }),
    ],
    MYSTERY: [
        project => ({
            id: `crisis_mystery_clues_${Date.now()}`,
            title: 'Clue Logic Problem',
            titleKey: 'production.event.mysteryClues.title',
            description: `Test viewers for ${project.name} spotted a clue that makes the final reveal feel unfair.`,
            descriptionKey: 'production.event.mysteryClues.description',
            textVars: { project: project.name },
            options: [
                {
                    label: 'Rewrite Clue Trail',
                    labelKey: 'production.event.mysteryClues.rewrite.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: delayProject(c, 1, 7, 0),
                        log: 'The revised clue trail made the mystery feel earned instead of random.',
                        logKey: 'production.event.mysteryClues.rewrite.log',
                    }),
                },
                {
                    label: 'Protect the Twist',
                    labelKey: 'production.event.mysteryClues.protect.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -4, 5),
                        log: 'You protected the twist, but some viewers may call the reveal a cheat.',
                        logKey: 'production.event.mysteryClues.protect.log',
                    }),
                },
            ],
        }),
        project => ({
            id: `crisis_mystery_theory_${Date.now()}`,
            title: 'Ending Theory Goes Viral',
            titleKey: 'production.event.mysteryTheory.title',
            description: `A fan theory about ${project.name} is dangerously close to the real culprit.`,
            descriptionKey: 'production.event.mysteryTheory.description',
            textVars: { project: project.name },
            options: [
                {
                    label: 'Plant Misdirection',
                    labelKey: 'production.event.mysteryTheory.plant.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: delayProject(tuneProject(c, 4, 6), 1, 0, 0),
                        log: 'You planted smarter misdirection and protected the reveal.',
                        logKey: 'production.event.mysteryTheory.plant.log',
                    }),
                },
                {
                    label: 'Let Fans Cook',
                    labelKey: 'production.event.mysteryTheory.fans.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, 1, 4),
                        log: 'Fan theories kept the mystery hot, but expectations rose.',
                        logKey: 'production.event.mysteryTheory.fans.log',
                    }),
                },
            ],
        }),
    ],
    FANTASY: [
        project => ({
            id: `crisis_fantasy_lore_${Date.now()}`,
            title: 'Worldbuilding Confusion',
            titleKey: 'production.event.fantasyLore.title',
            description: `Test viewers are confused by the lore rules in ${project.name}. The world is rich, but hard to follow.`,
            descriptionKey: 'production.event.fantasyLore.description',
            textVars: { project: project.name },
            options: [
                {
                    label: 'Add Clarifying Scene (Delay)',
                    labelKey: 'production.event.fantasyLore.clarify.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: delayProject(c, 1, 8, 0),
                        log: 'The new scene clarified the lore and made the fantasy world easier to enter.',
                        logKey: 'production.event.fantasyLore.clarify.log',
                    }),
                },
                {
                    label: 'Trust the Fans',
                    labelKey: 'production.event.fantasyLore.trust.label',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -2, 7),
                        log: 'You kept the dense mythology. Hardcore fans are intrigued, casual viewers may struggle.',
                        logKey: 'production.event.fantasyLore.trust.log',
                    }),
                },
            ],
        }),
    ],
};

export const getProductionCrisisTemplates = (project: Commitment): ((project: Commitment) => ProductionCrisis)[] => {
    const genre = project.projectDetails?.genre;
    const templates = [...GENERAL_CRISIS_TEMPLATES];
    if (genre && GENRE_CRISIS_TEMPLATES[genre]) {
        templates.push(...GENRE_CRISIS_TEMPLATES[genre]!);
    }
    if (project.projectDetails?.format === 'ANIME') {
        templates.push(...(GENRE_CRISIS_TEMPLATES.ANIME_FORMAT || []));
    }
    return templates;
};
