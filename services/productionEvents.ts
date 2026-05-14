import { Player, Commitment, NPCActor, ProductionCrisis, Genre } from '../types';

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

const GENRE_CRISIS_TEMPLATES: Partial<Record<Genre | 'ANIME_FORMAT', ((project: Commitment) => ProductionCrisis)[]>> = {
    MUSICAL: [
        project => ({
            id: `crisis_musical_choreo_${Date.now()}`,
            title: 'Choreography Collapse',
            description: `The big ensemble number in ${project.name} is not landing. The dancers look out of sync, and the director wants another rehearsal block.`,
            options: [
                {
                    label: 'Hire Choreography Coach ($75k)',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 75000 },
                        updatedProject: tuneProject(c, 9, 4),
                        log: 'The new coach tightened the number. The scene now has real stage energy.',
                    }),
                },
                {
                    label: 'Simplify the Number',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -4, -2),
                        log: 'You simplified the choreography. It works, but the musical feels less spectacular.',
                    }),
                },
            ],
        }),
        project => ({
            id: `crisis_musical_soundtrack_${Date.now()}`,
            title: 'Soundtrack Buzz',
            description: `A rough demo from ${project.name} has leaked online, and fans are already looping the chorus.`,
            options: [
                {
                    label: 'Release Official Single ($40k)',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 40000 },
                        updatedProject: tuneProject(c, 3, 16),
                        log: 'The official single turned the leak into a marketing win.',
                    }),
                },
                {
                    label: 'Keep It Under Wraps',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, 1, -4),
                        log: 'You protected the surprise, but the online momentum cooled.',
                    }),
                },
            ],
        }),
    ],
    BIOPIC: [
        project => ({
            id: `crisis_biopic_family_${Date.now()}`,
            title: 'Family Approval',
            description: `People close to ${project.projectDetails?.subjectName || 'the subject'} are objecting to a sensitive scene in ${project.name}.`,
            options: [
                {
                    label: 'Consult the Family ($60k)',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 60000 },
                        updatedProject: tuneProject(c, 7, 3),
                        log: 'The consultation softened the controversy and made the portrayal feel more humane.',
                    }),
                },
                {
                    label: 'Protect the Truth',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, 4, -8),
                        log: 'You kept the scene. Critics may respect the honesty, but public backlash is building.',
                    }),
                },
            ],
        }),
        project => ({
            id: `crisis_biopic_transformation_${Date.now()}`,
            title: 'Transformation Pressure',
            description: `The makeup and dialect work for ${project.name} is close, but not convincing enough for the camera tests.`,
            options: [
                {
                    label: 'Extend Prep (Delay)',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: delayProject(c, 1, 10, 0),
                        log: 'Extra prep paid off. The transformation now anchors the performance.',
                    }),
                },
                {
                    label: 'Trust the Performance',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -3, 0),
                        log: 'You trusted the acting. The performance is intact, but the resemblance may divide viewers.',
                    }),
                },
            ],
        }),
    ],
    SPORTS: [
        project => ({
            id: `crisis_sports_training_${Date.now()}`,
            title: 'Training Injury',
            description: `A realistic training sequence for ${project.name} caused a minor injury. The stunt coordinator wants to reduce contact.`,
            options: [
                {
                    label: 'Hire Athletic Doubles ($45k)',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 45000 },
                        updatedProject: tuneProject(c, 6, 2),
                        log: 'The doubles made the sports action look real without risking the cast.',
                    }),
                },
                {
                    label: 'Tone Down Contact',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -5, -1),
                        log: 'The shoot is safer, but the game scenes lost some physical bite.',
                    }),
                },
            ],
        }),
        project => ({
            id: `crisis_sports_consultant_${Date.now()}`,
            title: 'Authenticity Consultant',
            description: `Former pros are calling the locker-room scenes in ${project.name} fake. A consultant is available this week.`,
            options: [
                {
                    label: 'Bring Consultant In ($35k)',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 35000 },
                        updatedProject: tuneProject(c, 7, 5),
                        log: 'The consultant added texture. Sports fans are going to notice the details.',
                    }),
                },
                {
                    label: 'Ignore the Noise',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -4, -3),
                        log: 'You ignored the feedback. The scenes still play, but sports fans may be harsh.',
                    }),
                },
            ],
        }),
    ],
    DOCUMENTARY: [
        project => ({
            id: `crisis_doc_subject_${Date.now()}`,
            title: 'Subject Backs Out',
            description: `${project.projectDetails?.subjectName || 'The documentary subject'} is threatening to pull access from ${project.name}.`,
            options: [
                {
                    label: 'Renegotiate Access ($80k)',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 80000 },
                        updatedProject: tuneProject(c, 8, 4),
                        log: 'The access deal is repaired. The documentary keeps its strongest material.',
                    }),
                },
                {
                    label: 'Go Investigative',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, 3, 8),
                        log: 'You pivoted to a tougher investigation. Riskier, but the hook is stronger.',
                    }),
                },
            ],
        }),
        project => ({
            id: `crisis_doc_footage_${Date.now()}`,
            title: 'Footage Leak',
            description: `A key clip from ${project.name} leaked before the edit is ready, changing the public conversation overnight.`,
            options: [
                {
                    label: 'Release Context Clip',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, 4, 12),
                        log: 'The added context turned the leak into a serious conversation.',
                    }),
                },
                {
                    label: 'Threaten Legal Action ($25k)',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 25000 },
                        updatedProject: tuneProject(c, 1, -5),
                        log: 'The leak slowed down, but the legal tone made the project feel defensive.',
                    }),
                },
            ],
        }),
    ],
    ANIMATION: [
        project => ({
            id: `crisis_animation_delay_${Date.now()}`,
            title: 'Animation Delay',
            description: `The animation team on ${project.name} says the current style will miss deadline unless you simplify or expand the team.`,
            options: [
                {
                    label: 'Expand Animation Team ($120k)',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 120000 },
                        updatedProject: tuneProject(c, 8, 3),
                        log: 'The larger team protected the visual ambition.',
                    }),
                },
                {
                    label: 'Simplify Visual Style',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -5, 0),
                        log: 'The schedule is safe, but the film lost some visual richness.',
                    }),
                },
            ],
        }),
        project => ({
            id: `crisis_animation_voice_${Date.now()}`,
            title: 'Voice Cast Controversy',
            description: `Fans are questioning one of the voice-casting choices for ${project.name}.`,
            options: [
                {
                    label: 'Release Voice Test',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, 4, 10),
                        log: 'The voice test won fans over and boosted online buzz.',
                    }),
                },
                {
                    label: 'Stay Silent',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -3, -5),
                        log: 'Silence kept the controversy alive longer than it needed to.',
                    }),
                },
            ],
        }),
    ],
    ANIME_FORMAT: [
        project => ({
            id: `crisis_anime_fandom_${Date.now()}`,
            title: 'Anime Fandom Scrutiny',
            description: `Early stills from ${project.name} are being dissected frame by frame by anime fans.`,
            options: [
                {
                    label: 'Polish Key Frames ($70k)',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 70000 },
                        updatedProject: tuneProject(c, 7, 8),
                        log: 'The polish pass turned skeptical fans into loud supporters.',
                    }),
                },
                {
                    label: 'Defend the Style',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, 2, -4),
                        log: 'You defended the style. Some fans respect it, others are still not convinced.',
                    }),
                },
            ],
        }),
    ],
    CRIME: [
        project => ({
            id: `crisis_crime_legal_${Date.now()}`,
            title: 'Legal Sensitivity',
            description: `A real person connected to ${project.name} claims the crime story is too close to their case.`,
            options: [
                {
                    label: 'Legal Review ($55k)',
                    impact: (p, c) => ({
                        updatedPlayer: { ...p, money: p.money - 55000 },
                        updatedProject: tuneProject(c, 3, 0),
                        log: 'The legal review protected the movie without dulling the tension.',
                    }),
                },
                {
                    label: 'Change Names and Push',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -4, 6),
                        log: 'You pushed forward. The controversy is generating attention, but the risk is real.',
                    }),
                },
            ],
        }),
    ],
    FANTASY: [
        project => ({
            id: `crisis_fantasy_lore_${Date.now()}`,
            title: 'Worldbuilding Confusion',
            description: `Test viewers are confused by the lore rules in ${project.name}. The world is rich, but hard to follow.`,
            options: [
                {
                    label: 'Add Clarifying Scene (Delay)',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: delayProject(c, 1, 8, 0),
                        log: 'The new scene clarified the lore and made the fantasy world easier to enter.',
                    }),
                },
                {
                    label: 'Trust the Fans',
                    impact: (p, c) => ({
                        updatedPlayer: p,
                        updatedProject: tuneProject(c, -2, 7),
                        log: 'You kept the dense mythology. Hardcore fans are intrigued, casual viewers may struggle.',
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
