import type {
    BudgetTier,
    Business,
    Genre,
    LogEntry,
    Message,
    NewsItem,
    Player,
    ProjectConcept,
    ProjectType,
    Script,
    StudioOperatingMandate,
    SubsidiaryProjectProposal,
    SubsidiaryProjectSource,
    Universe,
    XPost,
} from '../types';
import { normalizeStudioState } from './businessLogic';
import {
    getStudioOperatingMandate,
    getSubsidiaryControlProfile,
    isAcquiredStudio,
} from './studioGroup';

const COMMERCIAL_GENRES: Genre[] = ['ACTION', 'COMEDY', 'SCI_FI', 'ADVENTURE', 'SUPERHERO', 'THRILLER'];
const PRESTIGE_GENRES: Genre[] = ['DRAMA', 'BIOPIC', 'DOCUMENTARY', 'CRIME', 'MUSICAL'];
const SAFE_GENRES: Genre[] = ['COMEDY', 'DRAMA', 'ROMANCE', 'SPORTS'];
const BOLD_GENRES: Genre[] = ['SCI_FI', 'HORROR', 'FANTASY', 'SUPERHERO', 'MYSTERY'];

const formatMoneyShort = (value: number) => {
    const safe = Math.max(0, Math.floor(Number(value) || 0));
    if (safe >= 1_000_000_000) return `$${(safe / 1_000_000_000).toFixed(1)}B`;
    if (safe >= 1_000_000) return `$${(safe / 1_000_000).toFixed(1)}M`;
    if (safe >= 1_000) return `$${(safe / 1_000).toFixed(0)}K`;
    return `$${safe}`;
};

const absoluteWeek = (year: number, week: number) => (year * 52) + week;

const getSeedIndex = (seed: string, count: number) => {
    if (count <= 0) return 0;
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash) % count;
};

const pickSeeded = <T,>(items: T[], seed: string): T => items[getSeedIndex(seed, items.length)];

const getCadenceWeeks = (mandate: StudioOperatingMandate) => {
    if (mandate.releasePace === 'AGGRESSIVE') return 10;
    if (mandate.releasePace === 'CAREFUL') return 24;
    return 16;
};

const budgetValueByTier: Record<BudgetTier, number> = {
    LOW: 25_000_000,
    MID: 75_000_000,
    HIGH: 160_000_000,
    BLOCKBUSTER: 260_000_000,
};

const getBudgetTier = (mandate: StudioOperatingMandate, source: SubsidiaryProjectSource, studio: Business): BudgetTier => {
    let tier: BudgetTier = mandate.budgetAppetite === 'PREMIUM'
        ? 'HIGH'
        : mandate.budgetAppetite === 'LEAN'
            ? 'LOW'
            : 'MID';

    if (
        mandate.budgetAppetite === 'PREMIUM'
        && mandate.objective === 'COMMERCIAL_FIRST'
        && (source === 'FRANCHISE' || source === 'UNIVERSE' || mandate.focus === 'COMMERCIAL_HITS')
    ) {
        tier = 'BLOCKBUSTER';
    }

    const studioCapitalLimit = Math.max(18_000_000, studio.balance * 0.48);
    if (budgetValueByTier[tier] <= studioCapitalLimit) return tier;
    if (budgetValueByTier.HIGH <= studioCapitalLimit) return 'HIGH';
    if (budgetValueByTier.MID <= studioCapitalLimit) return 'MID';
    return 'LOW';
};

const getBudgetValue = (tier: BudgetTier, projectType: ProjectType, mandate: StudioOperatingMandate) => {
    const base = budgetValueByTier[tier];
    const seriesMultiplier = projectType === 'SERIES' ? 0.72 : 1;
    const prestigeTrim = mandate.objective === 'PRESTIGE_FIRST' ? 0.82 : 1;
    const boldLift = mandate.creativeAppetite === 'BOLD' ? 1.12 : mandate.creativeAppetite === 'SAFE' ? 0.88 : 1;
    return Math.round(base * seriesMultiplier * prestigeTrim * boldLift);
};

const chooseProjectType = (mandate: StudioOperatingMandate, seed: string): ProjectType => {
    if (mandate.focus === 'SERIES_FIRST') return 'SERIES';
    if (mandate.focus === 'MOVIES_FIRST' || mandate.focus === 'PRESTIGE_AWARDS') return 'MOVIE';
    if (mandate.focus === 'FRANCHISE_EXPANSION') return pickSeeded<ProjectType>(['MOVIE', 'SERIES', 'MOVIE'], seed);
    return pickSeeded<ProjectType>(['MOVIE', 'SERIES'], seed);
};

const chooseGenre = (mandate: StudioOperatingMandate, studio: Business, seed: string): Genre => {
    const ownedGenre = studio.studioState?.ownedRights?.find(right => right.status === 'ACTIVE')?.primaryGenre;
    if ((mandate.ipStrategy === 'OWNED_IP' || mandate.focus === 'FRANCHISE_EXPANSION') && ownedGenre) return ownedGenre;
    if (mandate.focus === 'PRESTIGE_AWARDS' || mandate.objective === 'PRESTIGE_FIRST') return pickSeeded(PRESTIGE_GENRES, seed);
    if (mandate.focus === 'COMMERCIAL_HITS' || mandate.objective === 'COMMERCIAL_FIRST') return pickSeeded(COMMERCIAL_GENRES, seed);
    if (mandate.creativeAppetite === 'SAFE') return pickSeeded(SAFE_GENRES, seed);
    if (mandate.creativeAppetite === 'BOLD') return pickSeeded(BOLD_GENRES, seed);
    return pickSeeded([...COMMERCIAL_GENRES, ...PRESTIGE_GENRES], seed);
};

const getExistingUniverse = (player: Player, studio: Business, seed: string): Universe | undefined => {
    const universes = Object.values(player.world?.universes || {}).filter((universe): universe is Universe => (
        !!universe
        && universe.studioId === studio.id
        && universe.status !== 'RETIRED'
    ));
    return universes.length ? pickSeeded(universes, seed) : undefined;
};

const chooseSource = (
    player: Player,
    studio: Business,
    mandate: StudioOperatingMandate,
    seed: string,
): {
    source: SubsidiaryProjectSource;
    sourceLabel?: string;
    franchiseId?: string;
    universeId?: string;
    installmentNumber?: number;
    logic: string[];
} => {
    const logic: string[] = [];
    const activeRights = (studio.studioState?.ownedRights || []).filter(right => right.status === 'ACTIVE');
    const studioProjects = player.pastProjects.filter(project => project.studioId === studio.id);
    const franchiseProjects = studioProjects.filter(project => project.franchiseId);
    const universe = getExistingUniverse(player, studio, `${seed}:universe`);

    if ((mandate.focus === 'FRANCHISE_EXPANSION' || mandate.ipStrategy === 'SEQUELS_REBOOTS') && universe) {
        logic.push('Universe lane selected because this mandate favors connected franchise expansion.');
        return {
            source: 'UNIVERSE',
            sourceLabel: universe.name,
            universeId: universe.id,
            installmentNumber: (universe.slate?.length || 0) + 1,
            logic,
        };
    }

    if ((mandate.ipStrategy === 'SEQUELS_REBOOTS' || mandate.focus === 'FRANCHISE_EXPANSION') && franchiseProjects.length) {
        const project = pickSeeded(franchiseProjects, `${seed}:franchise`);
        logic.push('Franchise continuation selected from the studio’s own release history.');
        return {
            source: 'FRANCHISE',
            sourceLabel: project.name,
            franchiseId: project.franchiseId,
            universeId: project.universeId,
            installmentNumber: (project.installmentNumber || 1) + 1,
            logic,
        };
    }

    if ((mandate.ipStrategy === 'OWNED_IP' || mandate.ipStrategy === 'MIXED') && activeRights.length) {
        const right = pickSeeded(activeRights, `${seed}:rights`);
        logic.push('Owned IP selected because the mandate asks this studio to exploit controlled rights.');
        return {
            source: 'OWNED_IP',
            sourceLabel: right.title,
            franchiseId: right.franchiseId,
            universeId: right.universeId,
            installmentNumber: right.projectsUsed + 1,
            logic,
        };
    }

    logic.push('Original concept selected because no stronger owned-IP lane matched the mandate.');
    return { source: 'ORIGINAL', logic };
};

const titlePrefixes: Record<Genre, string[]> = {
    ACTION: ['Strike', 'Final', 'Shadow', 'Steel'],
    DRAMA: ['After', 'Still', 'Silent', 'The Last'],
    COMEDY: ['Big', 'Weekend', 'Chaos', 'Lucky'],
    ROMANCE: ['Always', 'Midnight', 'Second', 'Golden'],
    THRILLER: ['Cold', 'False', 'Broken', 'Night'],
    MYSTERY: ['Hidden', 'Case', 'Missing', 'Whisper'],
    HORROR: ['Dark', 'Grave', 'Hollow', 'Blood'],
    SCI_FI: ['Nova', 'Orbit', 'Signal', 'Quantum'],
    ADVENTURE: ['Lost', 'Wild', 'Treasure', 'Storm'],
    SUPERHERO: ['Sentinel', 'Titan', 'Vow', 'Omega'],
    MUSICAL: ['Stage', 'Encore', 'Harmony', 'Spotlight'],
    BIOPIC: ['The Life of', 'Rise of', 'Becoming', 'The Ballad of'],
    SPORTS: ['Rookie', 'Final Whistle', 'Champions', 'The Comeback'],
    ANIMATION: ['Moonlit', 'Tiny', 'Cloud', 'Wonder'],
    FANTASY: ['Crown', 'Dragon', 'Realm', 'Oath'],
    CRIME: ['Badge', 'Syndicate', 'The Heist', 'No Witness'],
    DOCUMENTARY: ['Inside', 'Truth of', 'The Last Days of', 'Uncovered'],
};

const titleSuffixes: Record<Genre, string[]> = {
    ACTION: ['Protocol', 'Run', 'City', 'Impact'],
    DRAMA: ['Summer', 'Promise', 'Room', 'Letter'],
    COMEDY: ['Deal', 'Friends', 'Vacation', 'Problem'],
    ROMANCE: ['Hearts', 'Season', 'Letters', 'Afterglow'],
    THRILLER: ['Witness', 'Signal', 'Debt', 'Hour'],
    MYSTERY: ['File', 'Door', 'Lake', 'Question'],
    HORROR: ['House', 'Ritual', 'Harvest', 'Guests'],
    SCI_FI: ['World', 'Code', 'Drift', 'Horizon'],
    ADVENTURE: ['Expedition', 'Map', 'Island', 'Trail'],
    SUPERHERO: ['Guard', 'Legacy', 'Zero', 'Rising'],
    MUSICAL: ['Revue', 'Dream', 'Finale', 'Melody'],
    BIOPIC: ['a Legend', 'an Empire', 'a Fighter', 'the Icon'],
    SPORTS: ['Season', 'Ring', 'Finals', 'Club'],
    ANIMATION: ['Kingdom', 'Garden', 'Friends', 'Quest'],
    FANTASY: ['Throne', 'Gate', 'Covenant', 'Kingdom'],
    CRIME: ['Crew', 'Ledger', 'District', 'Informant'],
    DOCUMENTARY: ['the Machine', 'the Dream', 'the Scandal', 'the Moment'],
};

const createTitle = (proposalSeed: string, genre: Genre, sourceLabel?: string) => {
    if (sourceLabel) {
        const lanes = ['Legacy', 'Reborn', 'Protocol', 'Aftermath', 'Genesis'];
        return `${sourceLabel}: ${pickSeeded(lanes, proposalSeed)}`;
    }
    return `${pickSeeded(titlePrefixes[genre], `${proposalSeed}:prefix`)} ${pickSeeded(titleSuffixes[genre], `${proposalSeed}:suffix`)}`;
};

const createLogline = (
    studio: Business,
    proposal: Pick<SubsidiaryProjectProposal, 'source' | 'sourceLabel' | 'genre' | 'projectType'>,
    mandate: StudioOperatingMandate,
) => {
    if (proposal.source === 'UNIVERSE') return `${studio.name} expands ${proposal.sourceLabel} with a ${proposal.genre.toLowerCase()} ${proposal.projectType.toLowerCase()} built for connected-universe momentum.`;
    if (proposal.source === 'FRANCHISE') return `${studio.name} returns to ${proposal.sourceLabel} with a mandate-backed continuation aimed at retained audience power.`;
    if (proposal.source === 'OWNED_IP') return `${studio.name} adapts ${proposal.sourceLabel} into a ${proposal.genre.toLowerCase()} ${proposal.projectType.toLowerCase()} under the current rights strategy.`;
    if (mandate.objective === 'PRESTIGE_FIRST') return `${studio.name} develops an original ${proposal.genre.toLowerCase()} with awards positioning and controlled commercial exposure.`;
    if (mandate.objective === 'COMMERCIAL_FIRST') return `${studio.name} develops an original ${proposal.genre.toLowerCase()} built for broad audience reach.`;
    return `${studio.name} develops an original ${proposal.genre.toLowerCase()} project shaped by the current operating mandate.`;
};

export const planSubsidiaryProject = (player: Player, studio: Business): SubsidiaryProjectProposal | null => {
    if (!isAcquiredStudio(studio) || studio.studioState?.operatingModel === 'FULL_MERGER') return null;
    const mandate = getStudioOperatingMandate(studio);
    if (mandate.autoProduction === 'PAUSED') return null;

    const seed = `${studio.id}:${player.age}:${player.currentWeek}:${studio.studioState?.subsidiaryProjectProposals?.length || 0}`;
    const projectType = chooseProjectType(mandate, seed);
    const sourceDecision = chooseSource(player, studio, mandate, seed);
    const genre = chooseGenre(mandate, studio, `${seed}:genre`);
    const budgetTier = getBudgetTier(mandate, sourceDecision.source, studio);
    const estimatedBudget = getBudgetValue(budgetTier, projectType, mandate);
    const title = createTitle(seed, genre, sourceDecision.sourceLabel);
    const logic = [
        ...sourceDecision.logic,
        `${projectType === 'SERIES' ? 'Series' : 'Movie'} format chosen from the ${mandate.focus.replaceAll('_', ' ').toLowerCase()} focus.`,
        `${budgetTier.toLowerCase()} budget chosen from ${mandate.budgetAppetite.toLowerCase()} appetite and ${formatMoneyShort(studio.balance)} studio capital.`,
        `${genre.replaceAll('_', ' ').toLowerCase()} genre selected from objective, creative appetite and rights fit.`,
    ];

    const partialProposal = {
        source: sourceDecision.source,
        sourceLabel: sourceDecision.sourceLabel,
        genre,
        projectType,
    };

    return {
        id: `sub_proposal_${studio.id}_${player.age}_${player.currentWeek}_${Math.abs(getSeedIndex(seed, 1_000_000))}`,
        studioId: studio.id,
        studioName: studio.name,
        title,
        projectType,
        genre,
        budgetTier,
        estimatedBudget,
        source: sourceDecision.source,
        sourceLabel: sourceDecision.sourceLabel,
        franchiseId: sourceDecision.franchiseId,
        universeId: sourceDecision.universeId,
        installmentNumber: sourceDecision.installmentNumber,
        logline: createLogline(studio, partialProposal, mandate),
        mandateSnapshot: mandate,
        logic,
        status: 'PENDING',
        createdWeek: player.currentWeek,
        createdYear: player.age,
    };
};

const createProjectAssetsFromProposal = (
    proposal: SubsidiaryProjectProposal,
    status: 'APPROVED' | 'AUTO_STARTED',
): {
    script: Script;
    concept: ProjectConcept;
    proposal: SubsidiaryProjectProposal;
} => {
    const scriptId = `script_${proposal.id}`;
    const conceptId = `concept_${proposal.id}`;
    const script: Script = {
        id: scriptId,
        title: proposal.title,
        genres: [proposal.genre],
        status: 'CONCEPT',
        quality: proposal.mandateSnapshot.objective === 'PRESTIGE_FIRST' ? 74 : proposal.mandateSnapshot.objective === 'COMMERCIAL_FIRST' ? 70 : 68,
        options: [],
        writerId: null,
        weeksInDevelopment: 0,
        totalDevelopmentWeeks: 0,
        isOriginal: proposal.source === 'ORIGINAL',
        projectType: proposal.projectType,
        targetAudience: proposal.genre === 'HORROR' || proposal.genre === 'CRIME' ? 'R' : 'PG-13',
        episodes: proposal.projectType === 'SERIES' ? 8 : undefined,
        logline: proposal.logline,
        baseQuality: proposal.mandateSnapshot.objective === 'PRESTIGE_FIRST' ? 74 : 68,
        sourceMaterial: proposal.source === 'ORIGINAL' ? 'ORIGINAL' : proposal.source === 'OWNED_IP' ? 'ADAPTATION' : 'SEQUEL',
        sourceMaterialType: proposal.source === 'OWNED_IP' ? 'GRAPHIC_NOVEL' : undefined,
        subjectName: proposal.sourceLabel,
        tags: [
            'subsidiary-generated',
            proposal.source.toLowerCase(),
            proposal.budgetTier.toLowerCase(),
            proposal.mandateSnapshot.objective.toLowerCase(),
        ],
        franchiseId: proposal.franchiseId,
        universeId: proposal.universeId,
        installmentNumber: proposal.installmentNumber,
        developmentCost: 0,
        createdAtWeek: proposal.createdWeek,
    };

    const concept: ProjectConcept = {
        id: conceptId,
        scriptId,
        lastUpdated: proposal.createdWeek,
        crewModes: {},
        selectedCrew: {},
        castList: [],
        selectedLocations: [],
        tone: proposal.mandateSnapshot.creativeAppetite === 'BOLD' ? 72 : proposal.mandateSnapshot.creativeAppetite === 'SAFE' ? 36 : 54,
        lastStep: 'SELECT_SCRIPT',
        franchiseId: proposal.franchiseId,
        universeId: proposal.universeId,
        installmentNumber: proposal.installmentNumber,
    };

    return {
        script,
        concept,
        proposal: {
            ...proposal,
            status,
            startedScriptId: scriptId,
            startedConceptId: conceptId,
        },
    };
};

const addStudioOperationMedia = (
    player: Player,
    proposal: SubsidiaryProjectProposal,
    action: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'AUTO_STARTED',
) => {
    const newsVerb = action === 'REJECTED'
        ? 'shelves'
        : action === 'APPROVED'
            ? 'approves'
            : action === 'AUTO_STARTED'
                ? 'starts'
                : 'reviews';
    const newsItem: NewsItem = {
        id: `news_subsidiary_${proposal.id}_${action}`,
        headline: `${proposal.studioName} ${newsVerb} ${proposal.title}`,
        subtext: `${proposal.projectType === 'SERIES' ? 'Series' : 'Film'} mandate: ${proposal.genre.replaceAll('_', ' ')} · ${proposal.budgetTier} · ${formatMoneyShort(proposal.estimatedBudget)}.`,
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: action === 'REJECTED' ? 'LOW' : 'MEDIUM',
    };
    player.news = [newsItem, ...(player.news || [])].slice(0, 80);

    if (player.x?.feed) {
        const xPost: XPost = {
            id: `x_subsidiary_${proposal.id}_${action}`,
            authorId: 'trade_wire',
            authorName: 'Trade Wire',
            authorHandle: '@tradewire',
            authorAvatar: '📰',
            content: action === 'REJECTED'
                ? `${proposal.studioName} passed on ${proposal.title}. Board discipline or missed swing?`
                : `${proposal.studioName} is lining up ${proposal.title}. ${proposal.source === 'ORIGINAL' ? 'Original slate play.' : `${proposal.sourceLabel} rights play.`}`,
            timestamp: player.currentWeek,
            likes: 800 + (proposal.budgetTier === 'BLOCKBUSTER' ? 4200 : 1400),
            retweets: 80 + (proposal.budgetTier === 'BLOCKBUSTER' ? 520 : 130),
            replies: 35 + proposal.logic.length * 12,
            isPlayer: false,
            isLiked: false,
            isRetweeted: false,
            isVerified: true,
            postType: 'FILM_OPINION',
            sentiment: action === 'REJECTED' ? 'NEUTRAL' : 'INDUSTRY',
        };
        player.x.feed = [xPost, ...player.x.feed].slice(0, 80);
    }
};

const updateStudioOnPlayer = (player: Player, studio: Business): Player => ({
    ...player,
    businesses: player.businesses.map(candidate => candidate.id === studio.id ? studio : candidate),
});

export const approveSubsidiaryProjectProposal = (
    player: Player,
    studioId: string,
    proposalId: string,
): {
    success: boolean;
    player: Player;
    reason?: 'STUDIO_NOT_FOUND' | 'PROPOSAL_NOT_FOUND' | 'PROPOSAL_CLOSED';
} => {
    const studio = player.businesses.find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE');
    if (!studio?.studioState) return { success: false, player, reason: 'STUDIO_NOT_FOUND' };
    const studioState = normalizeStudioState(studio.studioState, player.currentWeek);
    const proposal = studioState.subsidiaryProjectProposals?.find(candidate => candidate.id === proposalId);
    if (!proposal) return { success: false, player, reason: 'PROPOSAL_NOT_FOUND' };
    if (proposal.status !== 'PENDING') return { success: false, player, reason: 'PROPOSAL_CLOSED' };

    const assets = createProjectAssetsFromProposal({
        ...proposal,
        decidedWeek: player.currentWeek,
        decidedYear: player.age,
    }, 'APPROVED');
    const updatedProposal: SubsidiaryProjectProposal = {
        ...assets.proposal,
        decidedWeek: player.currentWeek,
        decidedYear: player.age,
    };
    const updatedStudio: Business = {
        ...studio,
        studioState: {
            ...studioState,
            scripts: [...studioState.scripts, assets.script],
            concepts: [...studioState.concepts, assets.concept],
            subsidiaryProjectProposals: (studioState.subsidiaryProjectProposals || []).map(candidate => (
                candidate.id === proposalId ? updatedProposal : candidate
            )),
            lastSubsidiaryOperationWeek: player.currentWeek,
            lastSubsidiaryOperationYear: player.age,
        },
    };
    const updatedPlayer = updateStudioOnPlayer({ ...player }, updatedStudio);
    addStudioOperationMedia(updatedPlayer, updatedProposal, 'APPROVED');
    const logEntry: LogEntry = {
        week: player.currentWeek,
        year: player.age,
        message: `🎬 ${studio.name} board approved ${proposal.title}. It is now in the studio development slate.`,
        type: 'positive',
    };
    updatedPlayer.logs = [logEntry, ...(updatedPlayer.logs || [])].slice(0, 50);
    return { success: true, player: updatedPlayer };
};

export const rejectSubsidiaryProjectProposal = (
    player: Player,
    studioId: string,
    proposalId: string,
): {
    success: boolean;
    player: Player;
    reason?: 'STUDIO_NOT_FOUND' | 'PROPOSAL_NOT_FOUND' | 'PROPOSAL_CLOSED';
} => {
    const studio = player.businesses.find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE');
    if (!studio?.studioState) return { success: false, player, reason: 'STUDIO_NOT_FOUND' };
    const studioState = normalizeStudioState(studio.studioState, player.currentWeek);
    const proposal = studioState.subsidiaryProjectProposals?.find(candidate => candidate.id === proposalId);
    if (!proposal) return { success: false, player, reason: 'PROPOSAL_NOT_FOUND' };
    if (proposal.status !== 'PENDING') return { success: false, player, reason: 'PROPOSAL_CLOSED' };
    const updatedProposal: SubsidiaryProjectProposal = {
        ...proposal,
        status: 'REJECTED',
        decidedWeek: player.currentWeek,
        decidedYear: player.age,
    };
    const updatedStudio: Business = {
        ...studio,
        studioState: {
            ...studioState,
            subsidiaryProjectProposals: (studioState.subsidiaryProjectProposals || []).map(candidate => (
                candidate.id === proposalId ? updatedProposal : candidate
            )),
            lastSubsidiaryOperationWeek: player.currentWeek,
            lastSubsidiaryOperationYear: player.age,
        },
    };
    const updatedPlayer = updateStudioOnPlayer({ ...player }, updatedStudio);
    addStudioOperationMedia(updatedPlayer, updatedProposal, 'REJECTED');
    const logEntry: LogEntry = {
        week: player.currentWeek,
        year: player.age,
        message: `🧾 ${studio.name} board rejected ${proposal.title}. The studio will wait for a stronger mandate fit.`,
        type: 'neutral',
    };
    updatedPlayer.logs = [logEntry, ...(updatedPlayer.logs || [])].slice(0, 50);
    return { success: true, player: updatedPlayer };
};

export const processSubsidiaryAutonomousOperations = (player: Player): Player => {
    let nextPlayer = player;
    const currentAbsolute = absoluteWeek(player.age, player.currentWeek);

    nextPlayer.businesses.forEach(studio => {
        if (!studio.studioState || !isAcquiredStudio(studio) || studio.studioState.operatingModel === 'FULL_MERGER') return;
        const mandate = getStudioOperatingMandate(studio);
        if (mandate.autoProduction === 'PAUSED') return;
        const studioState = normalizeStudioState(studio.studioState, player.currentWeek);
        const hasPendingProposal = (studioState.subsidiaryProjectProposals || []).some(proposal => proposal.status === 'PENDING');
        if (hasPendingProposal) return;

        const lastAbsolute = typeof studioState.lastSubsidiaryOperationWeek === 'number' && typeof studioState.lastSubsidiaryOperationYear === 'number'
            ? absoluteWeek(studioState.lastSubsidiaryOperationYear, studioState.lastSubsidiaryOperationWeek)
            : absoluteWeek(studio.studioState.acquiredYear || player.age, studio.studioState.acquiredWeek || Math.max(1, player.currentWeek - getCadenceWeeks(mandate)));
        if (currentAbsolute - lastAbsolute < getCadenceWeeks(mandate)) return;

        const proposal = planSubsidiaryProject(nextPlayer, { ...studio, studioState });
        if (!proposal) return;

        const profile = getSubsidiaryControlProfile(studio);
        const shouldAutoStart = studio.studioState?.operatingModel === 'INDEPENDENT_LABEL'
            || (profile.canAutoProduce && mandate.autoProduction === 'APPROVED');

        if (shouldAutoStart) {
            const assets = createProjectAssetsFromProposal(proposal, 'AUTO_STARTED');
            const updatedProposal: SubsidiaryProjectProposal = {
                ...assets.proposal,
                decidedWeek: player.currentWeek,
                decidedYear: player.age,
            };
            const updatedStudio: Business = {
                ...studio,
                studioState: {
                    ...studioState,
                    scripts: [...studioState.scripts, assets.script],
                    concepts: [...studioState.concepts, assets.concept],
                    subsidiaryProjectProposals: [
                        updatedProposal,
                        ...(studioState.subsidiaryProjectProposals || []),
                    ].slice(0, 12),
                    lastSubsidiaryOperationWeek: player.currentWeek,
                    lastSubsidiaryOperationYear: player.age,
                },
            };
            nextPlayer = updateStudioOnPlayer({ ...nextPlayer }, updatedStudio);
            addStudioOperationMedia(nextPlayer, updatedProposal, 'AUTO_STARTED');
            const logEntry: LogEntry = {
                week: player.currentWeek,
                year: player.age,
                message: `🏛️ ${studio.name} autonomously started ${proposal.title} from its current mandate.`,
                type: 'positive',
            };
            nextPlayer.logs = [logEntry, ...(nextPlayer.logs || [])].slice(0, 50);
            return;
        }

        const updatedStudio: Business = {
            ...studio,
            studioState: {
                ...studioState,
                subsidiaryProjectProposals: [
                    proposal,
                    ...(studioState.subsidiaryProjectProposals || []),
                ].slice(0, 12),
                lastSubsidiaryOperationWeek: player.currentWeek,
                lastSubsidiaryOperationYear: player.age,
            },
        };
        nextPlayer = updateStudioOnPlayer({ ...nextPlayer }, updatedStudio);
        addStudioOperationMedia(nextPlayer, proposal, 'PROPOSED');
        const inboxMessage: Message = {
            id: `msg_subsidiary_proposal_${proposal.id}`,
            sender: `${studio.name} Board`,
            subject: `Project Proposal: ${proposal.title}`,
            text: `${studio.name} wants to develop ${proposal.title} as a ${proposal.genre.replaceAll('_', ' ')} ${proposal.projectType.toLowerCase()} with a ${formatMoneyShort(proposal.estimatedBudget)} mandate budget. Review it inside Studio Group.`,
            type: 'SYSTEM',
            data: {
                studioId: studio.id,
                proposalId: proposal.id,
                route: 'STUDIO_GROUP',
            },
            isRead: false,
            weekSent: player.currentWeek,
            expiresIn: 26,
        };
        nextPlayer.inbox = [inboxMessage, ...(nextPlayer.inbox || [])].slice(0, 120);
        const logEntry: LogEntry = {
            week: player.currentWeek,
            year: player.age,
            message: `📋 ${studio.name} submitted ${proposal.title} for board approval.`,
            type: 'neutral',
        };
        nextPlayer.logs = [logEntry, ...(nextPlayer.logs || [])].slice(0, 50);
    });

    return nextPlayer;
};
