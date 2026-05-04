
import { Player, AwardType, PastProject, Award, PendingEvent, PressInteraction, IndustryProject, AwardHistoryEntry } from '../types';
import { NPC_DATABASE } from './npcLogic';
import { generateProjectTitle } from './roleLogic';

export interface AwardDefinition {
    type: AwardType;
    name: string;
    prestige: number; // Multiplier for fame/rep
    inviteWeek: number; // Week to send invite/announce nominations
}

// --- CALENDAR CONFIG ---
// BAFTA replaces Tony and acts as a precursor (Week 4, before Oscars)
export const AWARD_CALENDAR: Record<number, AwardDefinition> = {
    2: { type: 'GOLDEN_GLOBE', name: 'Golden Globe Awards', prestige: 1.5, inviteWeek: 50 }, // Previous year week 50
    4: { type: 'BAFTA', name: 'BAFTA Film Awards', prestige: 2.5, inviteWeek: 1 },
    10: { type: 'OSCAR', name: 'The Oscars', prestige: 3.0, inviteWeek: 6 },
    38: { type: 'EMMY', name: 'Primetime Emmy Awards', prestige: 2.0, inviteWeek: 34 }, 
};

export const getAwardCeremonyYear = (
    definition: AwardDefinition,
    ceremonyWeek: number,
    currentAge: number,
    currentWeek: number
): number => {
    const crossesBirthday = definition.inviteWeek > ceremonyWeek;
    return crossesBirthday && currentWeek >= definition.inviteWeek ? currentAge + 1 : currentAge;
};

// --- LORE DATABASE (IMDb Encyclopedia) ---
export interface AwardShowLore {
    id: AwardType;
    name: string;
    shortName: string;
    description: string;
    categories: string[];
    focus: 'Artistic' | 'Commercial' | 'Industry' | 'Prestige';
    color: string;
}

export const AWARD_SHOW_DB: Record<AwardType, AwardShowLore> = {
    BAFTA: {
        id: 'BAFTA',
        name: 'BAFTA Film Awards',
        shortName: 'The BAFTAs',
        description: "The British Academy Film Awards. Often seen as a key predictor for the Oscars, focused on artistic merit and British excellence.",
        categories: ["Best Film", "Best Director", "Best Actor", "Best Actress", "Best Supporting Actor", "Best Supporting Actress"],
        focus: 'Artistic',
        color: 'text-blue-400'
    },
    GOLDEN_GLOBE: {
        id: 'GOLDEN_GLOBE',
        name: 'Golden Globe Awards',
        shortName: 'Golden Globes',
        description: "Accolades bestowed by the Hollywood Foreign Press Association. A glamorous dinner party that honors both Film and Television.",
        categories: [
            "Best Motion Picture - Drama", "Best TV Series - Drama", 
            "Best Actor - Motion Picture", "Best Actress - Motion Picture",
            "Best Actor - TV Series", "Best Actress - TV Series"
        ],
        focus: 'Commercial',
        color: 'text-rose-400'
    },
    EMMY: {
        id: 'EMMY',
        name: 'Primetime Emmy Awards',
        shortName: 'The Emmys',
        description: "The premier award for the television industry. Dominating the Emmys signals you have conquered the small screen.",
        categories: [
            "Outstanding Drama Series", "Outstanding Comedy Series", 
            "Outstanding Lead Actor", "Outstanding Lead Actress",
            "Outstanding Supporting Actor", "Outstanding Supporting Actress"
        ],
        focus: 'Industry',
        color: 'text-emerald-400'
    },
    OSCAR: {
        id: 'OSCAR',
        name: 'The Oscars',
        shortName: 'Academy Awards',
        description: "The Academy Awards. The most prestigious honor in cinema. A win here immortalizes you in film history.",
        categories: [
            "Best Picture", "Best Director", 
            "Best Actor", "Best Actress",
            "Best Supporting Actor", "Best Supporting Actress", 
            "Best Original Screenplay", "Best Cinematography"
        ],
        focus: 'Prestige',
        color: 'text-amber-400'
    }
};

// --- GOSSIP STRINGS ---
export const AWARD_GOSSIP_TEMPLATES = [
    "Insider rumors suggest {Player} is a lock for the {Award} win.",
    "Controversy brewing: Did {Player} deserve the nomination over {Rival}?",
    "Las Vegas odds shift in favor of {Player} for {Award}.",
    "Critics are split: Is {Player}'s performance award-worthy?",
    "Anonymous voter reveals: 'I voted for {Player}, they carried the film.'",
    "Social media erupts over {Player}'s {Award} nomination.",
    "The race for {Award} tightens as the ceremony approaches."
];

export const SNUB_TEMPLATES = [
    "Biggest Snub? Why {Rival} wasn't nominated for {Award}.",
    "{Player} makes the cut, but critics mourn the exclusion of {Rival}.",
    "Fans start petition after {Rival} is ignored by the Academy."
];

// --- NOMINATION LOGIC ---

export interface Nomination {
    project: { id: string; name: string };
    score: number;
    category: string;
    isPlayer: boolean;
    nomineeName?: string; // For NPCs
}

type AwardLike = {
    type: string;
    year: number;
    category: string;
    projectId: string;
    outcome: 'WON' | 'NOMINATED';
};

export const sanitizeAwardRecords = <T extends AwardLike>(awards: T[] = []): T[] => {
    const byProject = new Map<string, T>();

    awards.forEach(award => {
        const projectKey = `${award.type}::${award.year}::${award.category}::${award.projectId}`;
        const existing = byProject.get(projectKey);
        if (!existing || (existing.outcome !== 'WON' && award.outcome === 'WON')) {
            byProject.set(projectKey, award);
        }
    });

    const byCategory = new Map<string, T[]>();
    Array.from(byProject.values()).forEach(award => {
        const categoryKey = `${award.type}::${award.year}::${award.category}`;
        if (!byCategory.has(categoryKey)) byCategory.set(categoryKey, []);
        byCategory.get(categoryKey)!.push(award);
    });

    return Array.from(byCategory.values()).flatMap(categoryAwards => {
        const wins = categoryAwards.filter(award => award.outcome === 'WON');
        if (wins.length <= 1) return categoryAwards;

        let keepWon = wins[0];
        categoryAwards.forEach(award => {
            if (award.outcome === 'WON' && award.projectId < keepWon.projectId) {
                keepWon = award;
            }
        });

        return categoryAwards.map(award =>
            award.projectId === keepWon.projectId
                ? award
                : { ...award, outcome: 'NOMINATED' as const }
        );
    });
};

const getAwardTypeForInviteWeek = (week: number): AwardType | null => {
    const match = Object.values(AWARD_CALENDAR).find(def => def.inviteWeek === week);
    return match?.type || null;
};

export const checkAwardEligibility = (player: Player, week: number, awardYear = player.age): Nomination[] => {
    // 1. GATHER ALL CANDIDATES (Player + World)
    const candidates: any[] = [];
    const processedIds = new Set<string>(); // Prevent duplicates between past/active/same-project

    // Helper
    const addCandidate = (p: any, fromActive: boolean) => {
        if (processedIds.has(p.id)) return;
        processedIds.add(p.id);
        
        candidates.push({
            id: p.id,
            name: p.name,
            roleType: p.roleType,
            quality: fromActive ? p.projectDetails.hiddenStats.qualityScore : p.projectQuality,
            rating: fromActive ? p.imdbRating : p.rating,
            isPlayer: true,
            genre: fromActive ? p.projectDetails.genre : p.genre,
            mediaType: fromActive ? p.projectDetails.type : (p.projectType || 'MOVIE')
        });
    };

    // Player Past Projects (Released in last 52 weeks)
    player.pastProjects.forEach(p => {
        if (p.year >= player.age - 1) { 
            addCandidate(p, false);
        }
    });
    
    // Player Active Releases (Currently running or just finished)
    player.activeReleases.forEach(r => {
        if (r.weekNum > 2) {
            addCandidate(r, true);
        }
    });

    const nominations: Nomination[] = [];
    const isFemale = player.gender === 'FEMALE';
    const actorTerm = isFemale ? 'Actress' : 'Actor';
    const awardType = getAwardTypeForInviteWeek(week);

    // 2. EVALUATE CANDIDATES
    candidates.forEach(project => {
        if ((project.rating || 0) < 7.0) return; // Minimum 7.0 to be considered

        const normalizedRole = project.roleType || 'MINOR';
        const isLeadRole = normalizedRole === 'LEAD';
        const isSupportingRole = normalizedRole === 'SUPPORTING';

        // Minor, cameo, and ensemble roles should not be treated as supporting award contenders.
        if (!isLeadRole && !isSupportingRole) return;

        // REVISED SCORE FORMULA
        // 50% Quality (Hidden) + 50% Rating (Visible)
        const perfScore = project.quality || 50; 
        const imdbScore = (project.rating || 5) * 10;
        
        let nomScore = (perfScore * 0.5) + (imdbScore * 0.5);

        // Oscar Bias: Drama/Prestige
        if (week === 10) {
            if (project.genre === 'DRAMA' || project.genre === 'THRILLER') nomScore += 10;
            if (perfScore > 90) nomScore += 5; 
        }
        
        // Add random variance (Luck factor)
        nomScore += Math.random() * 15;

        // LOWERED THRESHOLDS for accessibility
        const threshold = week === 10 ? 85 : week === 38 ? 80 : 75; // Oscars 85, Emmys 80, Others 75

        if (nomScore >= threshold) {
            let cat = '';
            
            // Map to specific award show categories with gender
            if (week === 38) { // EMMY
                if (project.mediaType !== 'SERIES') return; // Emmys are strictly TV
                cat = isLeadRole ? `Outstanding Lead ${actorTerm}` : `Outstanding Supporting ${actorTerm}`; 
            }
            else if (week === 4) { // BAFTA
               if (project.mediaType !== 'MOVIE') return; // BAFTA Film Awards
               cat = isLeadRole ? `Best ${actorTerm}` : `Best Supporting ${actorTerm}`;
            }
            else if (week === 2) { // GOLDEN GLOBES
                // Globes split Movie and TV
                if (project.mediaType === 'SERIES') {
                    cat = `Best ${actorTerm} - TV Series`;
                } else {
                    cat = `Best ${actorTerm} - Motion Picture`;
                }
            } else { // OSCARS (Week 10)
                if (project.mediaType !== 'MOVIE') return; // Oscars are strictly Movie
                cat = isLeadRole ? `Best ${actorTerm}` : `Best Supporting ${actorTerm}`;
            }

            if (project.isPlayer) {
                // Check if already nominated for this project/category to avoid duplicates
                const exists = player.awards.some(a =>
                    a.projectId === project.id &&
                    a.category === cat &&
                    (!awardType || a.type === awardType) &&
                    a.year === awardYear
                );
                const alreadyQueued = nominations.some(n => n.project.id === project.id && n.category === cat);

                if (!exists && !alreadyQueued) {
                    nominations.push({
                        project: { id: project.id, name: project.name },
                        score: nomScore,
                        category: cat,
                        isPlayer: true
                    });
                }
            }
        }
    });

    return nominations;
};

// NEW: Generates the full ballot (NPCs included) for the "Season View"
export const generateFullBallot = (player: Player, awardType: AwardType, playerNoms: Nomination[]): Record<string, Nomination[]> => {
    const lore = AWARD_SHOW_DB[awardType];
    const ballot: Record<string, Nomination[]> = {};
    const worldProjects = player.world.projects || [];
    
    lore.categories.forEach(cat => {
        const categoryNoms: Nomination[] = [];
        
        // 1. Add Player if they are nominated in this category
        const pNom = playerNoms
            .filter(n => n.category === cat)
            .sort((a, b) => b.score - a.score)[0];
        if (pNom) {
            categoryNoms.push(pNom);
        }

        // 2. Fill the rest with NPCs (Total 4-5 nominees)
        const spotsLeft = 5 - categoryNoms.length;
        if (spotsLeft > 0) {
            
            // Gender check
            const isActress = cat.includes('Actress');
            const isActor = cat.includes('Actor') && !cat.includes('Actress'); // Strict check
            const isDirector = cat.includes('Director');
            const isProjectAward = cat.includes('Picture') || cat.includes('Series') || cat.includes('Musical') || cat.includes('Play') || cat.includes('Film');
            const reallyIsProjectAward = isProjectAward && !isActor && !isActress && !isDirector;
            
            // Type check based on award show
            const isTVOnly = awardType === 'EMMY' || cat.includes('TV Series');

            // Find eligible world projects
            // Filter by quality
            let candidates = worldProjects.filter(p => {
                if (p.quality < 50) return false; // Lowered threshold slightly to ensure pool isn't empty
                return true;
            });
            
            // Filter candidates by Actor Gender if applicable
            // IMPORTANT: Don't fail if NPC_DATABASE lookup misses (due to save/load cycle ID mismatch)
            if (isActress) {
                candidates = candidates.filter(p => {
                    const actor = NPC_DATABASE.find(n => n.id === p.leadActorId);
                    // If actor found, check gender. If not found, assume 50/50 chance for random fill or allow it
                    return actor ? actor.gender === 'FEMALE' : Math.random() > 0.5;
                });
            } else if (isActor) {
                candidates = candidates.filter(p => {
                    const actor = NPC_DATABASE.find(n => n.id === p.leadActorId);
                    return actor ? actor.gender === 'MALE' : Math.random() > 0.5;
                });
            }

            candidates = candidates.sort(() => 0.5 - Math.random()).slice(0, spotsLeft);
            
            candidates.forEach(p => {
                // Determine nominee name based on category
                const linkedActor = p.leadActorId ? NPC_DATABASE.find(n => n.id === p.leadActorId) : null;
                let nomineeName = p.leadActorName || linkedActor?.name || p.directorName || p.title;
                if (isActor || isActress) nomineeName = p.leadActorName || linkedActor?.name || "Industry Nominee";
                else if (isDirector) nomineeName = p.directorName || "Guest Director";
                else if (reallyIsProjectAward) nomineeName = "Producers";

                categoryNoms.push({
                    project: { id: p.id, name: p.title },
                    score: p.quality + (Math.random() * 20), // Simulated score
                    category: cat,
                    isPlayer: false,
                    nomineeName: nomineeName
                });
            });

            // Fallback if world DB is empty or filtered out
            while (categoryNoms.length < 5) {
                const randomSalt = Math.floor(Math.random() * 10000);
                const fakeTitle = generateProjectTitle([`Fake_${randomSalt}`]);
                
                // Pick random NPC of correct gender
                const pool = NPC_DATABASE.filter(n => {
                    if (isActress) return n.gender === 'FEMALE';
                    if (isActor) return n.gender === 'MALE';
                    return true;
                });
                
                const randomNPC = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
                const randomName = randomNPC ? randomNPC.name : (isActress ? "Emma Stone" : "Timothée Chalamet");

                categoryNoms.push({
                    project: { id: `fake_${Math.random()}`, name: fakeTitle },
                    score: 70 + (Math.random() * 30),
                    category: cat,
                    isPlayer: false,
                    nomineeName: reallyIsProjectAward ? "Producers" : randomName
                });
            }
        }
        
        ballot[cat] = categoryNoms.sort((a,b) => b.score - a.score); // Sorted internally for now
    });

    return ballot;
};

export const determineWinners = (
    nominations: Nomination[],
    fullBallot?: Record<string, Nomination[]>
): { won: boolean, nomination: Nomination }[] => {
    const playerBestByCategory = new Map<string, Nomination>();

    nominations.forEach(nom => {
        const existing = playerBestByCategory.get(nom.category);
        if (!existing || nom.score > existing.score) {
            playerBestByCategory.set(nom.category, nom);
        }
    });

    return nominations.map(nom => {
        const playerContender = playerBestByCategory.get(nom.category);
        if (!playerContender || playerContender.project.id !== nom.project.id) {
            return { won: false, nomination: nom };
        }

        if (fullBallot && fullBallot[nom.category]?.length) {
            const sortedBallot = [...fullBallot[nom.category]].sort((a, b) => b.score - a.score);
            const topNominee = sortedBallot[0];
            const playerWins = topNominee.isPlayer && topNominee.project.id === nom.project.id;
            return { won: playerWins, nomination: nom };
        }

        const worldWinnerScore = 90 + Math.random() * 15;
        return {
            won: nom.score > worldWinnerScore,
            nomination: nom
        };
    });
};

export const generateSeasonWinners = (player: Player, awardType: AwardType, awardYear = player.age): AwardHistoryEntry => {
    // This function creates the historical record AFTER the ceremony
    const lore = AWARD_SHOW_DB[awardType];
    const year = awardYear;
    const historyEntry: AwardHistoryEntry = {
        year,
        type: awardType,
        winners: []
    };

    const targetYear = year - 1; 
    const worldCandidates = player.world.projects.filter(p => {
        return (p.year === targetYear || p.year === year) && p.quality > 60;
    });
    
    const usedNames = new Set<string>();

    lore.categories.forEach(cat => {
        const playerWin = player.awards.find(a => 
            a.type === awardType && 
            a.category === cat && 
            a.outcome === 'WON' &&
            a.year === year
        );

        if (playerWin) {
            historyEntry.winners.push({
                category: cat,
                winnerName: player.name,
                projectName: playerWin.projectName,
                isPlayer: true
            });
        } else {
            // Determine filter based on category gender
            const isActress = cat.includes('Actress');
            const isActor = cat.includes('Actor') && !cat.includes('Actress'); // Strict
            const isDirector = cat.includes('Director');
            const isProjectAward = cat.includes('Picture') || cat.includes('Series') || cat.includes('Musical') || cat.includes('Play') || cat.includes('Film');

            let possibleWinners = [...worldCandidates].filter(p => !usedNames.has(p.title));
            
            // Filter by gender if needed
            if (isActress) {
                possibleWinners = possibleWinners.filter(p => {
                    const actor = NPC_DATABASE.find(n => n.id === p.leadActorId);
                    return actor ? actor.gender === 'FEMALE' : true;
                });
            } else if (isActor) {
                possibleWinners = possibleWinners.filter(p => {
                    const actor = NPC_DATABASE.find(n => n.id === p.leadActorId);
                    return actor ? actor.gender === 'MALE' : true;
                });
            }
            
            possibleWinners.sort((a,b) => b.quality - a.quality);
            const top3 = possibleWinners.slice(0, 3);
            let winnerProj = top3.length > 0 ? top3[Math.floor(Math.random() * top3.length)] : null;

            let winnerName = "Unknown";
            let projName = "Untitled Project";

            if (winnerProj) {
                projName = winnerProj.title;
                usedNames.add(projName);

                if (isActor || isActress) winnerName = winnerProj.leadActorName;
                else if (isDirector) winnerName = winnerProj.directorName;
                else if (isProjectAward) winnerName = "Producers";
                else winnerName = winnerProj.leadActorName; 
            } else {
                // FALLBACK GENERATION (Correct Gender)
                const randomSalt = Math.floor(Math.random() * 1000);
                projName = generateProjectTitle([`Fake_${randomSalt}`]); 
                
                // Fallback random actor of CORRECT gender
                const pool = NPC_DATABASE.filter(n => {
                    if (isActress) return n.gender === 'FEMALE';
                    if (isActor) return n.gender === 'MALE';
                    return true;
                });
                
                // Ensure pool isn't empty (safety check)
                const randomActor = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
                
                if (randomActor) {
                    winnerName = randomActor.name;
                } else {
                    // Ultimate fallback if DB is somehow empty of a gender (unlikely)
                    winnerName = isActress ? "Meryl Streep" : "Robert De Niro";
                }
                
                if (isDirector) winnerName = "Christopher Nolan"; // Placeholder director
                if (isProjectAward) winnerName = "Producers";
            }

            historyEntry.winners.push({
                category: cat,
                winnerName: winnerName,
                projectName: projName,
                isPlayer: false
            });
        }
    });

    return historyEntry;
};

export const generatePressInteractions = (count: number): PressInteraction[] => {
    // Basic placeholder generator if needed by RedCarpetEvent, typically populated via roleLogic in gameLoop
    const QUESTIONS_POOL = [
        {
            q: "Who are you wearing tonight?",
            opts: [
                { text: "It's vintage.", style: 'HUMBLE', consequences: { buzz: 2 } },
                { text: "Custom designer piece.", style: 'BOLD', consequences: { fame: 2, buzz: 5 } },
                { text: "Something comfortable.", style: 'SAFE', consequences: { buzz: 1 } }
            ]
        },
        {
            q: "How does it feel to be here?",
            opts: [
                { text: "Overwhelming but exciting.", style: 'HUMBLE', consequences: { reputation: 2 } },
                { text: "I was born for this.", style: 'BOLD', consequences: { fame: 3, buzz: 5 } },
                { text: "Just happy to see friends.", style: 'SAFE', consequences: { buzz: 1 } }
            ]
        }
    ];
    
    const shuffled = [...QUESTIONS_POOL].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);
    
    return selected.map((q, i) => ({
        id: `carpet_qn_${Date.now()}_${i}`,
        question: q.q,
        options: q.opts as any
    }));
};
