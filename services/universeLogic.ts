
import { Universe, UniverseId, UniverseContract, Player, ProjectDetails, NewsItem, StudioId, Genre, IndustryProject, NPCActor, UniversePhase, RoleType, ProjectSubtype, ContractFilm, AuditionOpportunity, Gender } from '../types';
import { STUDIO_CATALOG } from './studioLogic';
import { NPC_DATABASE } from './npcLogic';
import { generateProjectTitle, getEstimatedBudget, generateProjectDetails } from './roleLogic';

// --- CONFIGURATION ---

interface CharacterArc {
    name: string;
    gender: Gender | 'ALL'; // NEW: Gender restriction
    roadmap: {
        title: string;
        role: RoleType;
        type: ProjectSubtype;
        offset: number; // Week offset
    }[];
}

// --- MARVEL CINEMATIC UNIVERSE (MCU) ---
const MCU_ARCS: CharacterArc[] = [
    {
        name: "Iron Man",
        gender: 'MALE',
        roadmap: [
            { title: "Iron Man", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "The Incredible Hulk", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 20 }, // Post-Credit Scene
            { title: "Iron Man 2", role: "LEAD", type: "SEQUEL", offset: 60 },
            { title: "The Avengers", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 120 },
            { title: "Iron Man 3", role: "LEAD", type: "SEQUEL", offset: 180 },
            { title: "Avengers: Age of Ultron", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 240 },
            { title: "Captain America: Civil War", role: "SUPPORTING", type: "UNIVERSE_CROSSOVER", offset: 300 },
            { title: "Spider-Man: Homecoming", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 330 }, // Mentor Cameo
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 360 },
            { title: "Avengers: Endgame", role: "LEAD", type: "UNIVERSE_EVENT", offset: 420 }
        ]
    },
    {
        name: "Captain America",
        gender: 'MALE',
        roadmap: [
            { title: "Captain America: The First Avenger", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "The Avengers", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 60 },
            { title: "Thor: The Dark World", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 90 }, // Loki Illusion
            { title: "Captain America: The Winter Soldier", role: "LEAD", type: "SEQUEL", offset: 120 },
            { title: "Avengers: Age of Ultron", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 180 },
            { title: "Captain America: Civil War", role: "LEAD", type: "UNIVERSE_CROSSOVER", offset: 240 },
            { title: "Spider-Man: Homecoming", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 270 }, // PSA Videos
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 300 },
            { title: "Avengers: Endgame", role: "LEAD", type: "UNIVERSE_EVENT", offset: 360 }
        ]
    },
    {
        name: "Thor",
        gender: 'MALE',
        roadmap: [
            { title: "Thor", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "The Avengers", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 60 },
            { title: "Thor: The Dark World", role: "LEAD", type: "SEQUEL", offset: 120 },
            { title: "Doctor Strange", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 150 }, // Post-Credit
            { title: "Avengers: Age of Ultron", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 180 },
            { title: "Thor: Ragnarok", role: "LEAD", type: "SEQUEL", offset: 240 },
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 300 },
            { title: "Thor: Love and Thunder", role: "LEAD", type: "SEQUEL", offset: 380 }
        ]
    },
    {
        name: "Black Widow",
        gender: 'FEMALE',
        roadmap: [
            { title: "Iron Man 2", role: "SUPPORTING", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "The Avengers", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 60 },
            { title: "Captain America: The Winter Soldier", role: "SUPPORTING", type: "UNIVERSE_CROSSOVER", offset: 120 },
            { title: "Avengers: Age of Ultron", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 180 },
            { title: "Captain America: Civil War", role: "SUPPORTING", type: "UNIVERSE_CROSSOVER", offset: 240 },
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 300 },
            { title: "Avengers: Endgame", role: "LEAD", type: "UNIVERSE_EVENT", offset: 360 },
            { title: "Black Widow", role: "LEAD", type: "SPINOFF", offset: 400 }
        ]
    },
    {
        name: "Black Panther",
        gender: 'MALE',
        roadmap: [
            { title: "Captain America: Civil War", role: "SUPPORTING", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Black Panther", role: "LEAD", type: "SPINOFF", offset: 50 },
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 100 },
            { title: "Avengers: Endgame", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 160 },
            { title: "Black Panther: Wakanda Forever", role: "LEAD", type: "SEQUEL", offset: 240 }
        ]
    },
    {
        name: "Spider-Man",
        gender: 'MALE',
        roadmap: [
            { title: "Captain America: Civil War", role: "CAMEO", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Spider-Man: Homecoming", role: "LEAD", type: "SPINOFF", offset: 40 },
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 90 },
            { title: "Avengers: Endgame", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 140 },
            { title: "Spider-Man: Far From Home", role: "LEAD", type: "SEQUEL", offset: 160 },
            { title: "Spider-Man: No Way Home", role: "LEAD", type: "UNIVERSE_EVENT", offset: 220 }
        ]
    },
    {
        name: "Doctor Strange",
        gender: 'MALE',
        roadmap: [
            { title: "Doctor Strange", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Thor: Ragnarok", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 40 },
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 80 },
            { title: "Avengers: Endgame", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 130 },
            { title: "Spider-Man: No Way Home", role: "SUPPORTING", type: "UNIVERSE_CROSSOVER", offset: 180 },
            { title: "Doctor Strange in the Multiverse of Madness", role: "LEAD", type: "SEQUEL", offset: 220 }
        ]
    },
    {
        name: "Scarlet Witch",
        gender: 'FEMALE',
        roadmap: [
            { title: "Captain America: The Winter Soldier", role: "CAMEO", type: "UNIVERSE_ENTRY", offset: 0 }, // Post-Credit
            { title: "Avengers: Age of Ultron", role: "SUPPORTING", type: "UNIVERSE_CROSSOVER", offset: 40 },
            { title: "Captain America: Civil War", role: "ENSEMBLE", type: "UNIVERSE_CROSSOVER", offset: 100 },
            { title: "Avengers: Infinity War", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 160 },
            { title: "Avengers: Endgame", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 220 },
            { title: "WandaVision (Series)", role: "LEAD", type: "SPINOFF", offset: 260 },
            { title: "Doctor Strange in the Multiverse of Madness", role: "LEAD", type: "UNIVERSE_CROSSOVER", offset: 320 }
        ]
    }
];

// --- DC UNIVERSE (DCU) ---
const DCU_ARCS: CharacterArc[] = [
    {
        name: "Superman",
        gender: 'MALE',
        roadmap: [
            { title: "Man of Steel", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Batman v Superman: Dawn of Justice", role: "LEAD", type: "UNIVERSE_CROSSOVER", offset: 80 },
            { title: "Justice League", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 140 },
            { title: "Shazam!", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 180 },
            { title: "Man of Steel 2", role: "LEAD", type: "SEQUEL", offset: 240 },
            { title: "Black Adam", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 270 },
            { title: "Justice League: Darkseid War", role: "LEAD", type: "UNIVERSE_EVENT", offset: 320 }
        ]
    },
    {
        name: "Batman",
        gender: 'MALE',
        roadmap: [
            { title: "Batman v Superman: Dawn of Justice", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Suicide Squad", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 40 },
            { title: "Justice League", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 80 },
            { title: "The Batman", role: "LEAD", type: "STANDALONE", offset: 140 },
            { title: "The Flash", role: "SUPPORTING", type: "UNIVERSE_CROSSOVER", offset: 200 },
            { title: "Aquaman and the Lost Kingdom", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 240 }, // Post-Credit
            { title: "Justice League: Kingdom Come", role: "LEAD", type: "UNIVERSE_EVENT", offset: 300 }
        ]
    },
    {
        name: "Wonder Woman",
        gender: 'FEMALE',
        roadmap: [
            { title: "Batman v Superman", role: "SUPPORTING", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Wonder Woman", role: "LEAD", type: "SPINOFF", offset: 50 },
            { title: "Justice League", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 100 },
            { title: "Wonder Woman 1984", role: "LEAD", type: "SEQUEL", offset: 160 },
            { title: "Shazam! Fury of the Gods", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 200 },
            { title: "Justice League 2", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 260 }
        ]
    },
    {
        name: "Harley Quinn",
        gender: 'FEMALE',
        roadmap: [
            { title: "Suicide Squad", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Birds of Prey", role: "LEAD", type: "SPINOFF", offset: 60 },
            { title: "The Suicide Squad", role: "LEAD", type: "SEQUEL", offset: 120 },
            { title: "Joker: Folie à Deux", role: "LEAD", type: "STANDALONE", offset: 180 }
        ]
    },
    {
        name: "The Flash",
        gender: 'MALE',
        roadmap: [
            { title: "Batman v Superman", role: "CAMEO", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Suicide Squad", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 20 },
            { title: "Justice League", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 60 },
            { title: "The Flash", role: "LEAD", type: "SPINOFF", offset: 140 },
            { title: "Justice League: Crisis", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 200 }
        ]
    },
    {
        name: "Aquaman",
        gender: 'MALE',
        roadmap: [
            { title: "Batman v Superman", role: "CAMEO", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Justice League", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 40 },
            { title: "Aquaman", role: "LEAD", type: "SPINOFF", offset: 80 },
            { title: "The Flash", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 120 }, // Post-Credit
            { title: "Aquaman and the Lost Kingdom", role: "LEAD", type: "SEQUEL", offset: 160 },
            { title: "Justice League: Atlantis Attacks", role: "LEAD", type: "UNIVERSE_EVENT", offset: 220 }
        ]
    }
];

// --- STAR WARS GALAXY (SW) ---
const SW_ARCS: CharacterArc[] = [
    { 
        name: "Jedi Prodigy", 
        gender: 'ALL', // Can be any gender
        roadmap: [
            { title: "Star Wars: The Awakening", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Star Wars: Shadow of the Sith", role: "LEAD", type: "SEQUEL", offset: 100 },
            { title: "Star Wars: The Final Order", role: "LEAD", type: "SEQUEL", offset: 200 }
        ] 
    },
    {
        name: "Rogue Smuggler",
        gender: 'ALL',
        roadmap: [
            { title: "Smuggler's Run", role: "LEAD", type: "SPINOFF", offset: 0 },
            { title: "Star Wars: The Underworld", role: "ENSEMBLE", type: "UNIVERSE_CROSSOVER", offset: 80 },
            { title: "Kessel Run", role: "LEAD", type: "SEQUEL", offset: 160 }
        ]
    },
    {
        name: "Mandalorian Warrior",
        gender: 'MALE', // Typically male archetype in canon, but flexible
        roadmap: [
            { title: "The Bounty Hunter", role: "LEAD", type: "UNIVERSE_ENTRY", offset: 0 },
            { title: "Book of Boba Fett", role: "CAMEO", type: "UNIVERSE_CROSSOVER", offset: 40 },
            { title: "War for Mandalore", role: "LEAD", type: "SEQUEL", offset: 100 },
            { title: "Star Wars: Galaxy's Edge", role: "ENSEMBLE", type: "UNIVERSE_EVENT", offset: 160 }
        ]
    }
];

const UNIVERSE_TEMPLATES: Record<UniverseId, { name: string, studioId: StudioId, genre: Genre, arcs: CharacterArc[] }> = {
    MCU: {
        name: "Marvel Cinematic Universe",
        studioId: 'MARVEL_STUDIOS',
        genre: 'SUPERHERO',
        arcs: MCU_ARCS
    },
    DCU: {
        name: "DC Universe",
        studioId: 'DC_STUDIOS',
        genre: 'SUPERHERO',
        arcs: DCU_ARCS
    },
    SW: {
        name: "Star Wars Galaxy",
        studioId: 'LUCASFILM',
        genre: 'SCI_FI',
        arcs: SW_ARCS
    }
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- FACTORY ---

export const initUniverses = (): Record<UniverseId, Universe> => {
    const universes: Record<UniverseId, Universe> = {} as any;
    
    (Object.keys(UNIVERSE_TEMPLATES) as UniverseId[]).forEach(id => {
        const tmpl = UNIVERSE_TEMPLATES[id];
        
        // Initial Roster - Pick one actor per arc
        const roster = tmpl.arcs.map(arc => ({
            name: arc.name,
            actorId: pick(NPC_DATABASE.filter(n => n.occupation === 'ACTOR')).id, 
            actorName: "", 
            status: 'ACTIVE' as const,
            fanApproval: 50 + Math.floor(Math.random() * 40)
        }));

        // Fill actor names
        roster.forEach(r => {
            const npc = NPC_DATABASE.find(n => n.id === r.actorId);
            r.actorName = npc ? npc.name : "Unknown";
        });

        universes[id] = {
            id,
            name: tmpl.name,
            studioId: tmpl.studioId,
            currentPhase: 'PHASE_1_ORIGINS',
            saga: 1, // Start at Saga 1
            momentum: 0,
            brandPower: 0,
            marketShare: 0, // Will be calculated dynamically
            color: tmpl.studioId === 'MARVEL' ? '#E23636' : tmpl.studioId === 'DC' ? '#0476F2' : '#FFE81F',
            roster,
            slate: [],
            weeksUntilNextPhase: 100 + Math.floor(Math.random() * 52)
        };
    });

    return universes;
};

// --- HELPER: CHECK IF TITLE IS RELEASED ---
const isTitleReleased = (player: Player, title: string): boolean => {
    // Check World Projects (NPC Releases)
    if (player.world.projects.some(p => p.title === title)) return true;
    // Check Player's Active Releases
    if (player.activeReleases.some(r => r.name === title)) return true;
    // Check Player's Past Projects
    if (player.pastProjects.some(p => p.name === title)) return true;
    // Check Player's Current Commitments
    if (player.commitments.some(c => c.name === title)) return true;
    
    return false;
};

// --- LOGIC ---

// Used for Cheat Menu mainly now, or rare random event
export const generateDirectEntryOffer = (player: Player, universeId: UniverseId): UniverseContract => {
    const tmpl = UNIVERSE_TEMPLATES[universeId];
    
    // Filter arcs by gender
    const validArcs = tmpl.arcs.filter(arc => {
        if (arc.gender === 'ALL') return true;
        return arc.gender === player.gender;
    });

    // Fallback if no valid arcs (unlikely unless non-binary without ALL options)
    const arc = validArcs.length > 0 ? pick(validArcs) : pick(tmpl.arcs); 

    const films: ContractFilm[] = arc.roadmap.map(step => ({
        title: step.title,
        role: step.role,
        type: step.type,
        weeksOffset: step.offset + 10 // +10 planning buffer
    }));

    return {
        universeId: universeId,
        characterName: arc.name, 
        films: films,
        salaryTotal: 30000000 + (player.stats.fame * 100000),
        fanTrust: 50,
        startWeek: player.currentWeek
    };
};

export const generateRandomUniverseOpportunity = (player: Player, source: 'AGENT'|'DIRECT'): AuditionOpportunity | null => {
    // Only fetch if player isn't already tied to a contract (simulated exclusivity)
    if (player.activeUniverseContract) return null;

    // Pick a random universe
    const uniIds = Object.keys(UNIVERSE_TEMPLATES) as UniverseId[];
    const uniId = pick(uniIds);
    const tmpl = UNIVERSE_TEMPLATES[uniId];

    // FIND VALID ARC ENTRY POINT
    // We want to find an arc where the *next* movie hasn't been released yet.
    // If all movies in an arc are released, that arc is closed for new offers.
    
    // FILTER BY GENDER FIRST
    const validArcs = tmpl.arcs.filter(arc => {
        if (arc.gender === 'ALL') return true;
        return arc.gender === player.gender;
    });

    const validArcOptions: { arcName: string, nextFilm: typeof tmpl.arcs[0]['roadmap'][0] }[] = [];

    validArcs.forEach(arc => {
        // Find first unreleased film in roadmap
        const nextFilm = arc.roadmap.find(film => !isTitleReleased(player, film.title));
        if (nextFilm) {
            validArcOptions.push({ arcName: arc.name, nextFilm });
        }
    });

    if (validArcOptions.length === 0) return null;

    // Pick one valid option
    const selection = pick(validArcOptions);
    const filmDef = selection.nextFilm;

    // Construct Universe Contract starting from this film
    // We need to find the index of this film in the roadmap to get subsequent films
    const fullArc = tmpl.arcs.find(a => a.name === selection.arcName);
    if (!fullArc) return null;

    const startIndex = fullArc.roadmap.findIndex(f => f.title === filmDef.title);
    const remainingRoadmap = fullArc.roadmap.slice(startIndex);

    const films: ContractFilm[] = remainingRoadmap.map(step => ({
        title: step.title,
        role: step.role,
        type: step.type,
        // Recalculate offset relative to now, preserving gaps
        weeksOffset: Math.max(10, step.offset - remainingRoadmap[0].offset + 10) 
    }));

    const contract: UniverseContract = {
        universeId: uniId,
        characterName: selection.arcName,
        films: films,
        salaryTotal: 30000000 + (player.stats.fame * 100000), // Base pay for deal
        fanTrust: 50,
        startWeek: player.currentWeek
    };
    
    // Construct fake project for the opportunity card
    const project = generateProjectDetails('HIGH', 'MOVIE', [], player);
    project.title = filmDef.title;
    project.universeId = uniId;
    project.genre = tmpl.genre;
    project.visibleHype = 'HIGH';
    project.isFamous = true; // Treats as famous for prestige
    
    // Adjust visual label if it's a cameo
    const label = filmDef.role === 'CAMEO' ? 'Universe Cameo' : 'Franchise Lead';
    const energyCost = filmDef.role === 'CAMEO' ? 15 : 40;

    return {
        id: `uni_offer_${Date.now()}`,
        roleType: filmDef.role,
        projectName: project.title,
        genre: project.genre,
        config: { label, difficulty: 70, energyCost, baseIncome: contract.salaryTotal, expGain: 15 },
        project: project,
        estimatedIncome: contract.salaryTotal,
        source: source,
        universeContract: contract,
        royaltyPercentage: 2.0
    };
};

// Main processing loop
export const processUniverseTurn = (player: Player, universe: Universe): { universe: Universe, news: NewsItem[], project?: IndustryProject } => {
    const updated = { ...universe };
    const news: NewsItem[] = [];
    let generatedProject: IndustryProject | undefined;

    // 1. Advance Phase Timer
    updated.weeksUntilNextPhase--;
    
    // 2. Phase Shift Logic (Iterative Loop)
    if (updated.weeksUntilNextPhase <= 0) {
        if (updated.currentPhase === 'PHASE_1_ORIGINS') updated.currentPhase = 'PHASE_2_EXPANSION';
        else if (updated.currentPhase === 'PHASE_2_EXPANSION') updated.currentPhase = 'PHASE_3_WAR';
        else if (updated.currentPhase === 'PHASE_3_WAR') updated.currentPhase = 'PHASE_4_MULTIVERSE';
        else {
            // Loop back to Phase 1 but increment Saga
            updated.currentPhase = 'PHASE_1_ORIGINS';
            updated.saga = Number(updated.saga) + 1;
        }
        
        updated.weeksUntilNextPhase = 150 + Math.floor(Math.random() * 50); // Reset timer

        // Generate Slate Announcement
        const phaseTitle = updated.currentPhase.replace(/_/g, ' ').replace('PHASE', `SAGA ${updated.saga} - PHASE`);
        
        news.push({
            id: `uni_news_phase_${Date.now()}`,
            headline: `${updated.name} Unveils ${phaseTitle}!`,
            subtext: `The studio announces the next chapter of the universe at Comic-Con.`,
            category: 'UNIVERSE',
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'HIGH'
        });

        // Chance for Fan Casting Demand if player is famous
        if (player.stats.fame > 50) {
            const char = pick(UNIVERSE_TEMPLATES[updated.id].arcs).name;
            news.push({
                id: `uni_news_fan_${Date.now()}`,
                headline: `Fans Demand ${player.name} as ${char}!`,
                subtext: `#Cast${player.name.replace(/\s+/g,'')} is trending worldwide.`,
                category: 'UNIVERSE',
                week: player.currentWeek,
                year: player.age,
                impactLevel: 'MEDIUM'
            });
        }
    }

    // 3. Random Project Release (Simulated NPC Films for background flavor)
    // Ensures the universe feels alive even if player isn't in it
    // REDUCED FREQUENCY: ~1.5% chance per week (~0.7 films/yr per universe)
    if (Math.random() < 0.015) {
        const tmpl = UNIVERSE_TEMPLATES[updated.id];
        
        // Find an arc that has an unreleased film
        // Exclude player's character if they have a contract
        const validArcs = tmpl.arcs.filter(arc => 
            !player.activeUniverseContract || player.activeUniverseContract.characterName !== arc.name
        );

        // Check roadmap for available films
        const releaseCandidates: { title: string, arcName: string }[] = [];
        
        validArcs.forEach(arc => {
            // Find first unreleased
            const nextUp = arc.roadmap.find(f => !isTitleReleased(player, f.title));
            if (nextUp) {
                releaseCandidates.push({ title: nextUp.title, arcName: arc.name });
            }
        });

        if (releaseCandidates.length > 0) {
            const selected = pick(releaseCandidates);
            
            // NEW: CHECK IF TITLE IS CURRENTLY OFFERED TO PLAYER
            // Prevents race condition where movie releases while sitting in inbox
            const isOffered = player.weeklyOpportunities.auditions.some(a => a.projectName === selected.title) || 
                              player.inbox.some(m => {
                                  const d = m.data as any;
                                  return (d?.opportunity?.projectName === selected.title) || (d?.projectName === selected.title);
                              });

            if (isOffered) {
                // Skip release to avoid conflict
                return { universe: updated, news, project: undefined };
            }

            // Dynamic Title Logic for later sagas to avoid duplicates if roadmap exhausted or reused
            let title = selected.title;
            if (Number(updated.saga) > 1) {
                // If title already exists (from Saga 1), append suffix
                if (isTitleReleased(player, title)) {
                    title = `${title} (Reboot)`;
                }
            }

             generatedProject = {
                id: `uni_proj_${Date.now()}`,
                title: title,
                genre: tmpl.genre,
                studioId: tmpl.studioId,
                budgetTier: 'HIGH',
                quality: 70 + Math.floor(Math.random() * 30),
                boxOffice: 600000000 + Math.floor(Math.random() * 1000000000),
                year: player.age,
                weekReleased: player.currentWeek,
                leadActorId: "NPC", 
                leadActorName: "Famous Star", 
                directorName: "Russo Brothers",
                reviews: "HIT",
                universeId: updated.id
            };
        }
    }

    return { universe: updated, news, project: generatedProject };
};
