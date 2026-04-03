import { Player, LifeEvent, LifeEventOption, LegalCase, ScheduledEvent } from '../types';
import { spendPlayerEnergy } from './premiumLogic';

// --- HELPERS ---
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- EVENT GENERATORS ---

export const generateLifeEvent = (player: Player): LifeEvent | null => {
    const roll = Math.random();
    const fame = player.stats.fame;
    const heat = player.flags.heat || 0;
    const partner = player.relationships.find(r => r.relation === 'Spouse' || r.relation === 'Partner');
    const closeFamily = player.relationships.find(r => r.relation === 'Parent' || r.relation === 'Sibling' || r.relation === 'Child');
    const hasBusiness = (player.businesses?.length || 0) > 0;

    // 1. UNDERWORLD / CRIME (Shady Deals)
    if (roll < 0.15 && fame > 20) {
        // Dynamic reward: scales with player wealth. At least $250k, or 10% of their money if they are rich.
        const baseReward = 250000;
        const wealthScaling = Math.floor(player.money * 0.1);
        const dynamicReward = Math.max(baseReward, wealthScaling);
        const formattedReward = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(dynamicReward);

        return {
            id: `crime_${Date.now()}`,
            type: 'CRIME',
            title: "The 'Private' Performance",
            description: `An unknown sender approaches you at a private club. A wealthy 'businessman' wants you to attend his daughter's birthday in a restricted region. The pay is ${formattedReward} cash, but the optics are... questionable.`,
            options: [
                {
                    label: `Take the Cash (${formattedReward})`,
                    description: "High risk of government audit later.",
                    impact: (p) => {
                        p.money += dynamicReward;
                        p.flags.heat = (p.flags.heat || 0) + 20;
                        // Delayed feedback: 4-12 weeks
                        return { updatedPlayer: p, log: `You took the dirty money (${formattedReward}). You feel a bit paranoid.`, feedbackDelay: 4 + Math.floor(Math.random() * 8), feedbackType: 'GOVT_AUDIT' };
                    }
                },
                {
                    label: "Politely Decline",
                    description: "No risk, no reward.",
                    impact: (p) => ({ updatedPlayer: p, log: "You turned down the shady deal. Better safe than sorry." })
                },
                {
                    label: "The 'Fixer' (Watch Ad)",
                    isGolden: true,
                    description: "Route the money through a shell company. Safest way.",
                    impact: (p) => {
                        p.money += dynamicReward;
                        return { updatedPlayer: p, log: `The money (${formattedReward}) was laundered perfectly. No one will ever know.` };
                    }
                }
            ]
        };
    }

    // 2. POLITICS
    if (roll < 0.30 && fame > 40) {
        return {
            id: `politics_${Date.now()}`,
            type: 'POLITICS',
            title: "The Endorsement",
            description: "A controversial political candidate is offering a massive donation to your favorite charity if you endorse them publicly. Half your fans will love it, the other half will be furious.",
            options: [
                {
                    label: "Endorse Them",
                    impact: (p) => {
                        p.stats.reputation -= 15;
                        p.stats.fame += 10;
                        p.stats.followers += Math.floor(p.stats.followers * 0.1);
                        return { updatedPlayer: p, log: "You endorsed the candidate. The internet is on fire." };
                    }
                },
                {
                    label: "Stay Neutral",
                    impact: (p) => ({ updatedPlayer: p, log: "You stayed out of it. Boring, but safe." })
                },
                {
                    label: "PR Spin (Watch Ad)",
                    isGolden: true,
                    description: "Endorse the 'cause', not the candidate. Everyone wins.",
                    impact: (p) => {
                        p.stats.fame += 15;
                        p.stats.reputation += 5;
                        return { updatedPlayer: p, log: "Your PR team spun the endorsement perfectly. You look like a hero." };
                    }
                }
            ]
        };
    }

    // 3. SCANDAL (Heat-based)
    if (heat > 30 && roll < 0.5) {
        return {
            id: `scandal_${Date.now()}`,
            type: 'SCANDAL',
            title: "TMZ Leak",
            description: "A video of you having a heated argument with a director has leaked. It looks bad. Your reputation is taking a hit.",
            options: [
                {
                    label: "Apologize Publicly",
                    impact: (p) => {
                        p.stats.reputation -= 5;
                        p.money -= 10000; // PR costs
                        return { updatedPlayer: p, log: "You apologized. People are still talking, but the fire is out." };
                    }
                },
                {
                    label: "Ignore It",
                    impact: (p) => {
                        p.stats.reputation -= 20;
                        p.flags.heat = (p.flags.heat || 0) + 10;
                        return { updatedPlayer: p, log: "You ignored the leak. The public thinks you're arrogant." };
                    }
                },
                {
                    label: "The 'Deepfake' Defense (Watch Ad)",
                    isGolden: true,
                    description: "Claim the video was AI-generated. Completely clears you.",
                    impact: (p) => {
                        p.stats.reputation += 5;
                        return { updatedPlayer: p, log: "You claimed it was a deepfake. Your fans believe you!" };
                    }
                }
            ]
        };
    }

    // 4. NETWORKING (Party with Directors)
    if (roll < 0.6 && fame > 30) {
        return {
            id: `network_${Date.now()}`,
            type: 'NETWORKING',
            title: "The VIP Afterparty",
            description: "You're at a high-end party. In the corner, three influential directors are sharing drinks and discussing their next big project. This is your chance.",
            options: [
                {
                    label: "Join Them (Buy a Round)",
                    description: "Costs $5,000. Might lead to a project.",
                    impact: (p) => {
                        p.money -= 5000;
                        const chance = Math.random();
                        if (chance < 0.4) {
                            // High chance of a project offer next week
                            return { updatedPlayer: p, log: "You shared a beer and some laughs. They seemed impressed!", feedbackDelay: 1, feedbackType: 'PROJECT_OFFER' };
                        }
                        return { updatedPlayer: p, log: "You had a good chat, but nothing concrete came of it." };
                    }
                },
                {
                    label: "Observe from Afar",
                    impact: (p) => ({ updatedPlayer: p, log: "You watched them from the bar. You missed a potential connection." })
                },
                {
                    label: "The 'Star' Entrance (Watch Ad)",
                    isGolden: true,
                    description: "Interrupt with a witty remark. Guaranteed to get their attention.",
                    impact: (p) => {
                        p.stats.reputation += 5;
                        return { updatedPlayer: p, log: "You dominated the conversation. They're already talking about casting you!", feedbackDelay: 1, feedbackType: 'PROJECT_OFFER_PREMIUM' };
                    }
                }
            ]
        };
    }

    // 5. CONFLICT (Career vs Personal)
    if (roll < 0.75 && fame > 10) {
        return {
            id: `conflict_${Date.now()}`,
            type: 'CONFLICT',
            title: "The Weekend Dilemma",
            description: "Your best friends are planning a last-minute trip to a cabin. However, your publicist just called: there's a surprise press event that could boost your reputation.",
            options: [
                {
                    label: "Go on the Trip",
                    impact: (p) => {
                        p.stats.happiness += 20;
                        p.stats.reputation -= 5;
                        p.relationships.forEach(r => { if (r.relation === 'Friend') r.closeness += 15; });
                        return { updatedPlayer: p, log: "You had a blast with your friends. Your publicist is annoyed, though." };
                    }
                },
                {
                    label: "Attend the Press Event",
                    impact: (p) => {
                        p.stats.reputation += 15;
                        p.stats.happiness -= 10;
                        p.relationships.forEach(r => { if (r.relation === 'Friend') r.closeness -= 10; });
                        return { updatedPlayer: p, log: "The press event was a success! Your friends are a bit hurt you bailed." };
                    }
                },
                {
                    label: "The 'Influencer' Move (Watch Ad)",
                    isGolden: true,
                    description: "Livestream the trip and mention the press event. Best of both worlds.",
                    impact: (p) => {
                        p.stats.reputation += 10;
                        p.stats.happiness += 10;
                        p.stats.followers += 5000;
                        return { updatedPlayer: p, log: "You managed to have fun AND stay relevant. Your fans loved the behind-the-scenes look!" };
                    }
                }
            ]
        };
    }

    // 5.5 RELATIONSHIP / IMAGE CONFLICT
    if (partner && roll < 0.83 && fame > 18) {
        return {
            id: `relationship_press_${Date.now()}`,
            type: 'CONFLICT',
            title: "Private Life, Public Feed",
            description: `${partner.name} is upset that every dinner, vacation, and minor disagreement somehow becomes content for the internet. They ask for stricter boundaries.`,
            options: [
                {
                    label: "Choose Privacy",
                    impact: (p) => {
                        p.stats.happiness += 8;
                        p.stats.followers = Math.max(0, p.stats.followers - 3000);
                        const rel = p.relationships.find(r => r.id === partner.id);
                        if (rel) rel.closeness += 12;
                        return { updatedPlayer: p, log: "You pulled back from the spotlight and your relationship immediately felt safer." };
                    }
                },
                {
                    label: "Stay Public",
                    impact: (p) => {
                        p.stats.fame += 4;
                        const rel = p.relationships.find(r => r.id === partner.id);
                        if (rel) rel.closeness -= 10;
                        return { updatedPlayer: p, log: "The engagement stayed high, but so did the tension at home." };
                    }
                },
                {
                    label: "Curate It Better (Watch Ad)",
                    isGolden: true,
                    description: "Share less, control more, and make it look effortless.",
                    impact: (p) => {
                        p.stats.fame += 3;
                        p.stats.reputation += 4;
                        const rel = p.relationships.find(r => r.id === partner.id);
                        if (rel) rel.closeness += 6;
                        return { updatedPlayer: p, log: "You found a balance between mystery and visibility. Rare win." };
                    }
                }
            ]
        };
    }

    // 5.6 BUSINESS OWNER DECISION
    if (hasBusiness && roll < 0.88) {
        const business = pick(player.businesses);
        const investment = Math.max(25000, Math.floor((business.stats.valuation || 100000) * 0.03));
        return {
            id: `business_push_${Date.now()}`,
            type: 'LIFE',
            title: "Growth Opportunity",
            description: `${business.name} has an opportunity to upgrade operations and sharpen its image. It will cost ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(investment)}.`,
            options: [
                {
                    label: "Reinvest in the Business",
                    impact: (p) => {
                        p.money -= investment;
                        const target = p.businesses.find(b => b.id === business.id);
                        if (target) {
                            target.stats.brandHealth = Math.min(100, target.stats.brandHealth + 8);
                            target.stats.customerSatisfaction = Math.min(100, target.stats.customerSatisfaction + 6);
                            target.stats.hype = Math.min(100, target.stats.hype + 10);
                            target.balance += Math.floor(investment * 0.5);
                        }
                        return { updatedPlayer: p, log: `You doubled down on ${business.name}. The team feels momentum building.` };
                    }
                },
                {
                    label: "Save the Cash",
                    impact: (p) => ({ updatedPlayer: p, log: `You passed on the upgrade and kept ${business.name} stable for now.` })
                },
                {
                    label: "Find a Sponsor (Watch Ad)",
                    isGolden: true,
                    description: "Bring in outside support and reduce your personal risk.",
                    impact: (p) => {
                        const target = p.businesses.find(b => b.id === business.id);
                        if (target) {
                            target.stats.brandHealth = Math.min(100, target.stats.brandHealth + 10);
                            target.stats.hype = Math.min(100, target.stats.hype + 14);
                            target.balance += Math.floor(investment * 0.75);
                        }
                        p.stats.reputation += 3;
                        return { updatedPlayer: p, log: `A sponsor came in at the perfect time. ${business.name} just got a clean boost.` };
                    }
                }
            ]
        };
    }

    // 5.7 LUXURY / IMAGE TEMPTATION
    if (roll < 0.92 && fame > 22) {
        return {
            id: `luxury_image_${Date.now()}`,
            type: 'LIFE',
            title: "Luxury Temptation",
            description: "A showroom offers you a flashy limited-edition purchase before it goes public. It's expensive, unnecessary, and almost impossible to resist.",
            options: [
                {
                    label: "Buy It",
                    impact: (p) => {
                        p.money -= 75000;
                        p.stats.fame += 3;
                        p.stats.happiness += 5;
                        return { updatedPlayer: p, log: "You bought the ridiculous luxury item and immediately posted a suspiciously casual photo with it." };
                    }
                },
                {
                    label: "Walk Away",
                    impact: (p) => {
                        p.stats.happiness += 1;
                        p.stats.reputation += 2;
                        return { updatedPlayer: p, log: "You resisted the flex. Financial maturity is deeply unglamorous." };
                    }
                },
                {
                    label: "Borrow It for a Shoot (Watch Ad)",
                    isGolden: true,
                    description: "Get the image without eating the full cost.",
                    impact: (p) => {
                        p.stats.fame += 4;
                        p.stats.reputation += 2;
                        return { updatedPlayer: p, log: "You captured the status hit without swallowing the full bill. Elite move." };
                    }
                }
            ]
        };
    }

    // 6. EARLY_LIFE (Starting Out)
    if (fame < 15 && roll < 0.9) {
        const subRoll = Math.random();
        if (subRoll < 0.5) {
            return {
                id: `early_hustle_${Date.now()}`,
                type: 'EARLY_LIFE',
                title: "The Side Hustle",
                description: "You're struggling to pay rent. A local theater needs an usher for a month. It pays $2,000, but it'll take up your evenings.",
                options: [
                    {
                        label: "Take the Job ($2k)",
                        impact: (p) => {
                            p.money += 2000;
                            spendPlayerEnergy(p, 10);
                            return { updatedPlayer: p, log: "You're working as an usher. It's tiring, but the bills are paid." };
                        }
                    },
                    {
                        label: "Focus on Auditions",
                        impact: (p) => {
                            p.stats.experience += 5;
                            return { updatedPlayer: p, log: "You spent your time practicing. You're getting better, but your wallet is light." };
                        }
                    },
                    {
                        label: "The 'Viral' Audition (Watch Ad)",
                        isGolden: true,
                        description: "Post your practice monologue online. Might get you noticed.",
                        impact: (p) => {
                            p.stats.fame += 5;
                            p.stats.followers += 1000;
                            return { updatedPlayer: p, log: "Your monologue went viral! You're starting to get some attention." };
                        }
                    }
                ]
            };
        } else {
            return {
                id: `early_class_${Date.now()}`,
                type: 'EARLY_LIFE',
                title: "Acting Workshop",
                description: "A famous acting coach is in town for a one-day workshop. It costs $1,000, but the knowledge is invaluable.",
                options: [
                    {
                        label: "Attend Workshop ($1k)",
                        impact: (p) => {
                            p.money -= 1000;
                            p.stats.talent += 5;
                            p.stats.skills.delivery += 2;
                            p.stats.skills.expression += 2;
                            return { updatedPlayer: p, log: "The workshop was amazing! You feel much more confident in your craft." };
                        }
                    },
                    {
                        label: "Skip It",
                        impact: (p) => ({ updatedPlayer: p, log: "You decided to save your money. Maybe next time." })
                    },
                    {
                        label: "The 'Scholarship' (Watch Ad)",
                        isGolden: true,
                        description: "Convince the coach to let you in for free. Best of both worlds.",
                        impact: (p) => {
                            p.stats.talent += 8;
                            p.stats.skills.delivery += 3;
                            return { updatedPlayer: p, log: "You charmed the coach into a free spot! You learned even more than expected." };
                        }
                    }
                ]
            };
        }
    }

    // 7. BASIC LIFE CHOICES
    if (roll < 0.95) {
        const subRoll = Math.random();
        if (subRoll < 0.5) {
            return {
                id: `life_family_${Date.now()}`,
                type: 'LIFE',
                title: "Family Emergency?",
                description: "Your cousin is asking for a $50,000 loan to start a 'sure-fire' business. You know he's not great with money.",
                options: [
                    {
                        label: "Give the Money ($50k)",
                        impact: (p) => {
                            p.money -= 50000;
                            const rel = p.relationships.find(r => r.name === 'Family' || r.relation === 'Parent');
                            if (rel) rel.closeness += 20;
                            return { updatedPlayer: p, log: "You gave him the money. He's thrilled, but you're skeptical." };
                        }
                    },
                    {
                        label: "Refuse",
                        impact: (p) => {
                            const rel = p.relationships.find(r => r.name === 'Family' || r.relation === 'Parent');
                            if (rel) rel.closeness -= 15;
                            return { updatedPlayer: p, log: "You said no. Family dinner is going to be awkward." };
                        }
                    },
                    {
                        label: "Hire Him as Assistant (Watch Ad)",
                        isGolden: true,
                        description: "Give him a job instead of a loan. Keeps him busy and safe.",
                        impact: (p) => {
                            p.stats.reputation += 2;
                            return { updatedPlayer: p, log: "You hired him as a junior assistant. He's working hard for once!" };
                        }
                    }
                ]
            };
        } else {
            return {
                id: `life_pet_${Date.now()}`,
                type: 'LIFE',
                title: "A New Companion?",
                description: "You're at a shelter and see a dog that looks just like your childhood pet. Adopting it would be a big responsibility.",
                options: [
                    {
                        label: "Adopt the Dog ($5k)",
                        impact: (p) => {
                            p.money -= 5000;
                            p.stats.happiness += 25;
                            return { updatedPlayer: p, log: "You adopted the dog! Your home feels much warmer now." };
                        }
                    },
                    {
                        label: "Just Donate ($1k)",
                        impact: (p) => {
                            p.money -= 1000;
                            p.stats.reputation += 5;
                            p.stats.happiness += 5;
                            return { updatedPlayer: p, log: "You donated to the shelter. You feel good about helping out." };
                        }
                    },
                    {
                        label: "The 'Rescue' Campaign (Watch Ad)",
                        isGolden: true,
                        description: "Adopt the dog and launch a social media campaign for the shelter.",
                        impact: (p) => {
                            p.stats.happiness += 30;
                            p.stats.reputation += 15;
                            p.stats.followers += 10000;
                            return { updatedPlayer: p, log: "The campaign was a massive hit! You're the face of animal rescue now." };
                        }
                    }
                ]
            };
        }
    }

    // 8. FAMILY / LEGACY PRESSURE
    if (closeFamily) {
        return {
            id: `life_family_pressure_${Date.now()}`,
            type: 'LIFE',
            title: "Family Pressure",
            description: `${closeFamily.name} says you've changed and only show up when cameras or awards are involved. The accusation lands harder than expected.`,
            options: [
                {
                    label: "Make Time Immediately",
                    impact: (p) => {
                        p.stats.happiness += 6;
                        const rel = p.relationships.find(r => r.id === closeFamily.id);
                        if (rel) rel.closeness += 10;
                        return { updatedPlayer: p, log: "You cleared the schedule and showed up in person. It mattered." };
                    }
                },
                {
                    label: "Send Money Instead",
                    impact: (p) => {
                        p.money -= 25000;
                        const rel = p.relationships.find(r => r.id === closeFamily.id);
                        if (rel) rel.closeness += 2;
                        return { updatedPlayer: p, log: "The gesture helped, but everyone knew it wasn't the same as being there." };
                    }
                },
                {
                    label: "Ignore the Guilt",
                    impact: (p) => {
                        p.stats.reputation -= 2;
                        const rel = p.relationships.find(r => r.id === closeFamily.id);
                        if (rel) rel.closeness -= 10;
                        return { updatedPlayer: p, log: "You told yourself they would understand. They did not." };
                    }
                }
            ]
        };
    }

    return null;
};

export const generateLegalHearing = (player: Player, caseId: string): LifeEvent | null => {
    const activeCase = player.flags.activeCases?.find((c: LegalCase) => c.id === caseId);
    if (!activeCase) return null;

    return {
        id: `hearing_${activeCase.id}_${activeCase.currentHearing}`,
        type: 'LEGAL',
        title: `${activeCase.title}: Hearing #${activeCase.currentHearing}`,
        description: `You are in court for the ${activeCase.currentHearing === 1 ? 'first' : 'next'} hearing. The judge asks: "Where were you on the night of the incident?"`,
        options: [
            {
                label: "Tell the Truth",
                impact: (p) => {
                    const c = p.flags.activeCases.find((ac: LegalCase) => ac.id === caseId);
                    c.playerDefense += 10;
                    c.history.push({ hearing: c.currentHearing, choice: 'TRUTH' });
                    return { updatedPlayer: p, log: "You told the truth. The jury seems to believe you." };
                }
            },
            {
                label: "Lie / Alibi",
                impact: (p) => {
                    const c = p.flags.activeCases.find((ac: LegalCase) => ac.id === caseId);
                    c.evidenceStrength += 15;
                    c.history.push({ hearing: c.currentHearing, choice: 'LIE' });
                    return { updatedPlayer: p, log: "You lied. It felt risky, but it might work." };
                }
            },
            {
                label: "The 'Star' Defense (Watch Ad)",
                isGolden: true,
                description: "Use your charisma and fame to charm the judge. Safest path.",
                impact: (p) => {
                    const c = p.flags.activeCases.find((ac: LegalCase) => ac.id === caseId);
                    c.playerDefense += 30;
                    c.history.push({ hearing: c.currentHearing, choice: 'CHARM' });
                    return { updatedPlayer: p, log: "You charmed the courtroom. The judge is smiling at you." };
                }
            }
        ]
    };
};
