import {
    Business,
    Genre,
    Player,
    ProjectDetails,
    ProjectInvestor,
    ProjectInvestorCommitment,
    ProjectInvestorFundingMode,
    ProjectInvestorLeadershipChange,
    ProjectInvestorOffer,
    ProjectInvestorPlan,
    ProjectInvestorRelationship
} from '../types';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export const INVESTOR_LEADERSHIP_POOL = [
    'Avery Stone',
    'Mina Laurent',
    'Caleb Rios',
    'Sana Verma',
    'Theo Mercer',
    'Iris Chen',
    'Omar Bell',
    'Valerie Knox',
    'Julian Cross',
    'Nadia Vale'
];

const INVESTOR_LEADERSHIP_REASONS = [
    'board reshuffle after a slate review',
    'new capital partner taking control',
    'strategy reset toward film finance',
    'founder stepping back from daily decisions',
    'aggressive expansion into entertainment'
];

export const PROJECT_INVESTORS: ProjectInvestor[] = [
    {
        id: 'investor_marlowe_pictures',
        name: 'Marlowe Pictures',
        kind: 'PRODUCER',
        source: 'COMPANY',
        reputation: 82,
        cashCapacity: 45_000_000,
        minInvestment: 2_000_000,
        maxInvestment: 28_000_000,
        preferredGenres: ['DRAMA', 'THRILLER', 'BIOPIC'],
        riskTolerance: 52,
        ownerName: 'Elena Marlowe',
        headquarters: 'Los Angeles',
        investorTags: ['prestige', 'producer-led', 'adult-drama'],
        personality: 'Patient, taste-driven, protective of filmmaker reputation.',
        profile: 'A producer house that likes credible cast packages and serious commercial stories.',
        preferredFundingModes: ['LEAD'],
        description: 'Producer-led money for serious commercial films.'
    },
    {
        id: 'investor_horizon_film_fund',
        name: 'Horizon Film Fund',
        kind: 'FILM_FUND',
        source: 'FUND',
        reputation: 76,
        cashCapacity: 120_000_000,
        minInvestment: 5_000_000,
        maxInvestment: 70_000_000,
        preferredGenres: ['ACTION', 'SCI_FI', 'ADVENTURE', 'SUPERHERO'],
        riskTolerance: 64,
        ownerName: 'Mara Voss',
        ownerTitle: 'Managing Partner',
        headquarters: 'New York',
        investorTags: ['institutional', 'tentpole', 'global'],
        personality: 'Numbers-first, scalable, impatient with weak launch plans.',
        profile: 'Institutional film finance that can write large checks for broad-market packages.',
        preferredFundingModes: ['LEAD', 'SYNDICATE'],
        description: 'Institutional film finance that likes bigger packages.'
    },
    {
        id: 'investor_olive_gate',
        name: 'Olive Gate Capital',
        kind: 'PRIVATE_INVESTOR',
        source: 'FUND',
        reputation: 58,
        cashCapacity: 22_000_000,
        minInvestment: 1_000_000,
        maxInvestment: 12_000_000,
        preferredGenres: ['ROMANCE', 'COMEDY', 'DRAMA'],
        riskTolerance: 42,
        ownerName: 'Rhea Kapoor Vale',
        headquarters: 'London',
        investorTags: ['private-money', 'clean-image', 'audience-friendly'],
        personality: 'Conservative, reputation-aware, prefers tidy budgets.',
        profile: 'Private money that backs clean, emotionally accessible projects.',
        preferredFundingModes: ['SYNDICATE'],
        description: 'Private money for cleaner, audience-friendly projects.'
    },
    {
        id: 'investor_kismet_global',
        name: 'Kismet Global Media',
        kind: 'COPRODUCTION_COMPANY',
        source: 'COMPANY',
        reputation: 70,
        cashCapacity: 80_000_000,
        minInvestment: 4_000_000,
        maxInvestment: 45_000_000,
        preferredGenres: ['ACTION', 'CRIME', 'THRILLER', 'ROMANCE'],
        riskTolerance: 58,
        ownerName: 'Dev Rao',
        ownerTitle: 'Global Co-Production Chief',
        headquarters: 'Singapore',
        investorTags: ['co-production', 'international', 'sales'],
        personality: 'Strategic, market-aware, likes cross-border upside.',
        profile: 'Co-production capital with international distribution appetite.',
        preferredFundingModes: ['LEAD', 'SYNDICATE'],
        description: 'Co-production company with international appetite.'
    },
    {
        id: 'investor_maple_soundstage',
        name: 'Maple Soundstage Group',
        kind: 'REGIONAL_COMPANY',
        source: 'COMPANY',
        reputation: 64,
        cashCapacity: 30_000_000,
        minInvestment: 1_500_000,
        maxInvestment: 18_000_000,
        preferredGenres: ['HORROR', 'COMEDY', 'DRAMA', 'MYSTERY'],
        riskTolerance: 50,
        ownerName: 'Graham Pike',
        headquarters: 'Toronto',
        investorTags: ['regional', 'contained-budget', 'tax-credit'],
        personality: 'Practical, location-minded, likes disciplined shoots.',
        profile: 'Regional production money that favors contained budgets and clear schedules.',
        preferredFundingModes: ['SYNDICATE'],
        description: 'Regional production money for contained budgets.'
    },
    {
        id: 'investor_streambridge',
        name: 'StreamBridge Finance',
        kind: 'STREAMING_FINANCE',
        source: 'COMPANY',
        reputation: 73,
        cashCapacity: 95_000_000,
        minInvestment: 6_000_000,
        maxInvestment: 55_000_000,
        preferredGenres: ['SCI_FI', 'THRILLER', 'DOCUMENTARY', 'ANIMATION'],
        riskTolerance: 61,
        ownerName: 'Lena Brooks',
        ownerTitle: 'Streaming Finance CEO',
        headquarters: 'Seattle',
        investorTags: ['streaming-adjacent', 'audience-data', 'genre-lane'],
        personality: 'Data-led, platform-savvy, asks hard questions about audience fit.',
        profile: 'Streaming-adjacent finance that likes projects with obvious platform demand.',
        preferredFundingModes: ['LEAD'],
        description: 'Streaming-adjacent finance that likes clear audience lanes.'
    },
    {
        id: 'investor_aurum_brands',
        name: 'Aurum Brands Media',
        kind: 'BRAND_MEDIA',
        source: 'COMPANY',
        reputation: 68,
        cashCapacity: 35_000_000,
        minInvestment: 2_000_000,
        maxInvestment: 20_000_000,
        preferredGenres: ['SPORTS', 'COMEDY', 'ROMANCE', 'ANIMATION'],
        riskTolerance: 46,
        ownerName: 'Priya Calder',
        ownerTitle: 'Brand Media President',
        headquarters: 'Chicago',
        investorTags: ['brand-backed', 'mainstream', 'polished'],
        personality: 'Image-conscious, commercial, wary of messy controversy.',
        profile: 'Brand-backed media capital for shiny mainstream releases.',
        preferredFundingModes: ['SYNDICATE'],
        description: 'Brand-backed media capital for polished mainstream work.'
    },
    {
        id: 'investor_velvet_lion',
        name: 'Velvet Lion Ventures',
        kind: 'PRIVATE_INVESTOR',
        source: 'FUND',
        reputation: 44,
        cashCapacity: 18_000_000,
        minInvestment: 750_000,
        maxInvestment: 9_000_000,
        preferredGenres: ['HORROR', 'CRIME', 'THRILLER'],
        riskTolerance: 72,
        ownerName: 'Cass Vale',
        headquarters: 'Miami',
        investorTags: ['aggressive', 'gap-money', 'high-risk'],
        personality: 'Fast, opportunistic, expensive when safer capital walks away.',
        profile: 'Small aggressive money for risky projects with enough heat to gamble.',
        preferredFundingModes: ['SYNDICATE'],
        description: 'Small aggressive money that appears when cleaner capital hesitates.'
    },
    {
        id: 'investor_clooney_house',
        name: 'Clooney House Pictures',
        kind: 'PRODUCER',
        source: 'NPC',
        sourceNpcId: 'npc_george_clooney',
        reputation: 86,
        cashCapacity: 70_000_000,
        minInvestment: 3_000_000,
        maxInvestment: 32_000_000,
        preferredGenres: ['DRAMA', 'THRILLER', 'COMEDY'],
        riskTolerance: 49,
        relationshipBias: 2,
        ownerName: 'George Clooney',
        headquarters: 'Los Angeles',
        investorTags: ['actor-producer', 'prestige', 'adult-commercial'],
        personality: 'Classy, selective, values taste and industry goodwill.',
        profile: 'Actor-producer money that joins tasteful adult packages with strong creative control.',
        preferredFundingModes: ['LEAD'],
        description: 'Actor-producer money that likes classy adult packages.'
    },
    {
        id: 'investor_witherspoon_banner',
        name: 'Sunlit Story Fund',
        kind: 'PRODUCER',
        source: 'NPC',
        sourceNpcId: 'npc_reese_witherspoon',
        reputation: 80,
        cashCapacity: 60_000_000,
        minInvestment: 2_500_000,
        maxInvestment: 26_000_000,
        preferredGenres: ['DRAMA', 'COMEDY', 'ROMANCE'],
        riskTolerance: 45,
        ownerName: 'Reese Witherspoon',
        headquarters: 'Nashville',
        investorTags: ['star-producer', 'character-led', 'female-audience'],
        personality: 'Brand-safe, story-led, loyal when the audience lane is clear.',
        profile: 'Star-producer capital for character-led commercial stories.',
        preferredFundingModes: ['LEAD'],
        description: 'Star-producer capital for character-led commercial stories.'
    },
    {
        id: 'investor_amblin_private',
        name: 'Amblin Legacy Capital',
        kind: 'PRODUCER',
        source: 'NPC',
        sourceNpcId: 'npc_steven_spielberg',
        reputation: 94,
        cashCapacity: 220_000_000,
        minInvestment: 12_000_000,
        maxInvestment: 95_000_000,
        preferredGenres: ['ADVENTURE', 'SCI_FI', 'DRAMA', 'ANIMATION'],
        riskTolerance: 55,
        ownerName: 'Steven Spielberg',
        headquarters: 'Universal City',
        investorTags: ['legacy', 'premium', 'family-event'],
        personality: 'Extremely selective, reputation-heavy, rewards proven trust.',
        profile: 'Premium legacy producer capital that appears only for trusted packages.',
        preferredFundingModes: ['LEAD'],
        description: 'Premium producer capital that only joins trusted packages.'
    },
    {
        id: 'investor_banyan_regional',
        name: 'Banyan Regional Pictures',
        kind: 'REGIONAL_COMPANY',
        source: 'COMPANY',
        reputation: 59,
        cashCapacity: 24_000_000,
        minInvestment: 1_000_000,
        maxInvestment: 14_000_000,
        preferredGenres: ['ACTION', 'ROMANCE', 'COMEDY', 'CRIME'],
        riskTolerance: 63,
        ownerName: 'Arjun Mehta',
        ownerTitle: 'Regional Finance Chair',
        headquarters: 'Mumbai',
        investorTags: ['regional', 'genre', 'growth-market'],
        personality: 'Ambitious, market-expansion focused, flexible on mid-size checks.',
        profile: 'Regional co-finance looking for genre clarity and growth-market upside.',
        preferredFundingModes: ['SYNDICATE'],
        description: 'Regional co-finance that wants genre clarity and contained downside.'
    },
    {
        id: 'investor_black_label_gap',
        name: 'Black Label Gap Finance',
        kind: 'FILM_FUND',
        source: 'FUND',
        reputation: 52,
        cashCapacity: 42_000_000,
        minInvestment: 2_000_000,
        maxInvestment: 24_000_000,
        preferredGenres: ['HORROR', 'CRIME', 'ACTION', 'THRILLER'],
        riskTolerance: 78,
        ownerName: 'Nico Slade',
        ownerTitle: 'Gap Finance Partner',
        headquarters: 'Las Vegas',
        investorTags: ['gap-finance', 'high-risk', 'expensive'],
        personality: 'Aggressive, opportunistic, willing to fill holes at a price.',
        profile: 'Expensive gap money that appears when top-tier investors hesitate.',
        preferredFundingModes: ['SYNDICATE'],
        description: 'Expensive gap money that appears when top-tier investors hesitate.'
    }
];

const genreFit = (investor: ProjectInvestor, genre: Genre) => (
    investor.preferredGenres.includes(genre) ? 18 : -8
);

const getInvestorTermMultiplier = (
    confidence: number,
    investor: ProjectInvestor,
    studioScore: number
): number => {
    let multiplier = 1;
    if (confidence >= 82) multiplier -= 0.08;
    else if (confidence >= 68) multiplier -= 0.03;
    else if (confidence < 45) multiplier += 0.16;
    else if (confidence < 56) multiplier += 0.08;

    if (investor.kind === 'PRIVATE_INVESTOR') multiplier += 0.08;
    if (investor.kind === 'FILM_FUND') multiplier += 0.04;
    if (investor.kind === 'PRODUCER' && confidence >= 68) multiplier -= 0.04;
    if (investor.kind === 'STREAMING_FINANCE' && confidence >= 62) multiplier -= 0.02;
    if (investor.reputation < 52) multiplier += 0.05;
    if (investor.reputation > 82 && confidence >= 62) multiplier -= 0.02;
    if (studioScore < 45) multiplier += 0.1;
    if (studioScore > 74) multiplier -= 0.06;

    return clamp(multiplier, 0.82, 1.38);
};

const getCommitmentEquity = (offer: ProjectInvestorOffer, amount: number): number => {
    if (amount <= 0 || offer.amount <= 0) return 0;
    return Math.round((offer.equityPercent * (amount / offer.amount)) * 10) / 10;
};

const getCommitmentCleanEquity = (offer: ProjectInvestorOffer, amount: number, packageBudget: number): number => {
    if (amount <= 0 || packageBudget <= 0) return 0;
    if (offer.cleanEquityPercent && offer.amount > 0) {
        return Math.round((offer.cleanEquityPercent * (amount / offer.amount)) * 10) / 10;
    }
    return Math.round((amount / Math.max(1, packageBudget)) * 1000) / 10;
};

const hashString = (value: string): number => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) - hash) + value.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash);
};

export const investorOwnerNpcId = (investor: ProjectInvestor): string | undefined => {
    if (!investor.ownerName) return undefined;
    return `investor_owner_${investor.ownerName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
};

export const investorOwnerNpcIdFromName = (ownerName: string): string => (
    `investor_owner_${ownerName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`
);

const getInvestorLeadershipOverride = (
    studio: Business | undefined,
    investorId: string
): ProjectInvestorLeadershipChange | undefined => {
    const changes = studio?.studioState?.investorLeadershipChanges;
    if (!Array.isArray(changes)) return undefined;
    return [...changes].reverse().find(change => change.investorId === investorId);
};

const getInvestorModeFit = (investor: ProjectInvestor, fundingMode: ProjectInvestorFundingMode): number => {
    if (fundingMode === 'LEAD') {
        if (investor.kind === 'PRODUCER') return 24;
        if (investor.kind === 'COPRODUCTION_COMPANY') return 18;
        if (investor.kind === 'STREAMING_FINANCE') return 14;
        if (investor.kind === 'FILM_FUND') return 6;
        return -14;
    }
    if (investor.kind === 'FILM_FUND') return 22;
    if (investor.kind === 'PRIVATE_INVESTOR') return 18;
    if (investor.kind === 'REGIONAL_COMPANY') return 16;
    if (investor.kind === 'BRAND_MEDIA') return 14;
    if (investor.kind === 'COPRODUCTION_COMPANY') return 4;
    return -18;
};

export const getInvestorRelationship = (
    studio: Business | undefined,
    investorId: string
): ProjectInvestorRelationship | undefined => (
    studio?.studioState?.investorRelationships?.find(item => item.investorId === investorId)
);

const getInvestorRelationshipLabel = (relationship: ProjectInvestorRelationship | undefined): string => {
    if (!relationship) return 'New money';
    if (relationship.trustScore >= 78) return 'Trusted backer';
    if (relationship.trustScore >= 58) return 'Warm history';
    if (relationship.trustScore <= 28) return 'Burned before';
    return 'Known backer';
};

const getInvestorRelationshipBias = (relationship: ProjectInvestorRelationship | undefined): number => {
    if (!relationship) return 0;
    return clamp((relationship.trustScore - 50) * 0.32, -12, 14);
};

const cloneInvestorRelationships = (studio: Business | undefined): ProjectInvestorRelationship[] => (
    Array.isArray(studio?.studioState?.investorRelationships)
        ? studio!.studioState!.investorRelationships!.map(item => ({ ...item }))
        : []
);

export const getStudioInvestorScore = (studio: Business | undefined, player?: Player): number => {
    if (!studio) return 42;
    const stats = (studio.stats || {}) as Business['stats'];
    const recentOutcomes = Array.isArray(stats.recentReleaseOutcomes) ? stats.recentReleaseOutcomes : [];
    const hits = Number(stats.recentHitStreak || 0);
    const flops = Number(stats.recentFlopStreak || 0);
    const profitSignal = Math.max(-18, Math.min(18, Number(stats.weeklyProfit || 0) / 1_000_000));
    const reputation = Number(stats.investorConfidence || 0);
    const recentHitBoost = recentOutcomes.filter(outcome => /hit|blockbuster|strong/i.test(outcome)).length * 4;
    const recentFlopPenalty = recentOutcomes.filter(outcome => /flop|loss|weak/i.test(outcome)).length * 5;
    const studioAge = Math.max(0, (player?.age || 0) - (studio.foundedWeek || 0) / 52);

    return clamp(
        48
        + Math.min(16, hits * 5)
        - Math.min(24, flops * 7)
        + profitSignal
        + recentHitBoost
        - recentFlopPenalty
        + Math.min(8, studioAge * 0.6)
        + Math.min(8, reputation / 12),
        5,
        98
    );
};

export const getMaxInvestorRaise = (
    packageBudget: number,
    lockedExternalFunding = 0
): number => {
    const remainingGap = Math.max(0, Math.round(packageBudget - Math.max(0, lockedExternalFunding)));
    const equityCap = Math.round(packageBudget * 0.8);
    return Math.max(0, Math.min(remainingGap, equityCap));
};

export const normalizeInvestorRaiseAmount = (
    amount: number,
    packageBudget: number,
    lockedExternalFunding = 0
): number => {
    const maxRaise = getMaxInvestorRaise(packageBudget, lockedExternalFunding);
    return Math.min(maxRaise, Math.max(0, Math.round((Number(amount) || 0) / 100_000) * 100_000));
};

export const generateProjectInvestorOffers = ({
    project,
    studio,
    player,
    targetRaise,
    packageBudget,
    lockedExternalFunding = 0,
    fundingMode = 'SYNDICATE'
}: {
    project?: ProjectDetails;
    studio?: Business;
    player?: Player;
    targetRaise: number;
    packageBudget: number;
    lockedExternalFunding?: number;
    fundingMode?: ProjectInvestorFundingMode;
}): ProjectInvestorOffer[] => {
    const raise = normalizeInvestorRaiseAmount(targetRaise, packageBudget, lockedExternalFunding);
    if (!project || raise <= 0 || packageBudget <= 0) return [];

    const score = getStudioInvestorScore(studio, player);
    const budgetPressure = clamp((packageBudget / 100_000_000) * 12, 0, 16);
    const maxRaise = getMaxInvestorRaise(packageBudget, lockedExternalFunding);
    const availabilitySeed = `${project.sourceScriptId || project.title}:${player?.currentWeek || 0}:${player?.age || 0}:${fundingMode}`;
    return PROJECT_INVESTORS
        .map(investor => {
            const modeFit = getInvestorModeFit(investor, fundingMode);
            if (modeFit < -12) return null;
            const availabilityScore = hashString(`${availabilitySeed}:${investor.id}`) % 100;
            const relationship = getInvestorRelationship(studio, investor.id);
            const leadership = getInvestorLeadershipOverride(studio, investor.id);
            const currentOwnerName = leadership?.newOwnerName || investor.ownerName;
            const currentOwnerNpcId = leadership?.newOwnerNpcId || investorOwnerNpcId(investor);
            const relationshipScore = Math.max(0, Math.min(100, Math.round(relationship?.trustScore ?? 50)));
            const confidence = clamp(
                score
                + genreFit(investor, project.genre)
                + modeFit
                + getInvestorRelationshipBias(relationship)
                + ((investor.riskTolerance - 50) * 0.18)
                + ((investor.reputation - 60) * 0.12)
                - budgetPressure
                + (availabilityScore >= 72 ? 5 : availabilityScore <= 18 ? -8 : 0)
                + (investor.relationshipBias || 0),
                0,
                100
            );
            if (confidence < 26 && investor.reputation >= 60) return null;
            const confidenceCapacity = confidence < 40 ? 0.32 : confidence < 58 ? 0.56 : confidence < 75 ? 0.84 : 1;
            const strategicMultiplier =
                investor.kind === 'FILM_FUND' || investor.kind === 'STREAMING_FINANCE' ? 1.25
                    : investor.kind === 'PRIVATE_INVESTOR' ? 0.62
                        : investor.kind === 'REGIONAL_COMPANY' ? 0.74
                            : investor.kind === 'PRODUCER' ? 0.96
                                : 0.88;
            const riskMoneyBoost = confidence < 48 && investor.riskTolerance >= 70 ? 1.25 : 1;
            const desiredAmount = raise * strategicMultiplier * riskMoneyBoost * (confidence >= 76 ? 1.12 : confidence >= 58 ? 0.86 : 0.55);
            const amount = Math.min(
                maxRaise,
                investor.maxInvestment,
                Math.max(investor.minInvestment, Math.round(Math.min(desiredAmount, investor.cashCapacity * 0.55) * confidenceCapacity / 100_000) * 100_000)
            );
            if (amount < investor.minInvestment || amount <= 0) return null;
            const cleanEquityPercent = Math.round((amount / Math.max(1, packageBudget)) * 1000) / 10;
            const termMultiplier = getInvestorTermMultiplier(confidence, investor, score);
            const equityPercent = Math.min(85, Math.round(cleanEquityPercent * termMultiplier * 10) / 10);
            const equityPremiumPercent = Math.round((equityPercent - cleanEquityPercent) * 10) / 10;
            const fitLabel: ProjectInvestorOffer['fitLabel'] = amount >= raise
                ? 'Lead Investor'
                : confidence < 48 && investor.riskTolerance >= 68
                    ? 'Risk Money'
                    : ['COPRODUCTION_COMPANY', 'STREAMING_FINANCE', 'BRAND_MEDIA'].includes(investor.kind)
                        ? 'Strategic Partner'
                        : 'Partial Investor';
            return {
                investorId: investor.id,
                investorName: investor.name,
                kind: investor.kind,
                fundingMode,
                ownerNpcId: currentOwnerNpcId,
                ownerName: currentOwnerName,
                ownerTitle: leadership?.title || investor.ownerTitle,
                headquarters: investor.headquarters,
                investorTags: investor.investorTags,
                personality: investor.personality,
                relationshipScore,
                relationshipLabel: getInvestorRelationshipLabel(relationship),
                amount,
                cleanEquityPercent,
                equityPercent,
                equityPremiumPercent,
                confidence: Math.round(confidence),
                reputation: investor.reputation,
                fitLabel,
                note: confidence >= 72
                    ? amount >= raise ? 'Can lead this raise alone.' : 'Strong fit for this package.'
                    : confidence >= 54
                        ? amount >= raise ? 'Can cover the target, but will watch execution.' : 'Interested, but staying disciplined.'
                        : investor.riskTolerance >= 68
                            ? 'Risk-tolerant capital, but the reputation hit is real.'
                            : 'Limited appetite because the package looks risky.'
            } as ProjectInvestorOffer;
        })
        .filter((offer): offer is ProjectInvestorOffer => Boolean(offer))
        .sort((left, right) => {
            const leftAvailability = hashString(`${availabilitySeed}:${left.investorId}`) % 100;
            const rightAvailability = hashString(`${availabilitySeed}:${right.investorId}`) % 100;
            return ((right.confidence + rightAvailability * 0.35) - (left.confidence + leftAvailability * 0.35))
                || (right.amount - left.amount);
        })
        .slice(0, 6);
};

export const buildProjectInvestorPlan = ({
    offers,
    selectedInvestorIds,
    targetRaise,
    packageBudget,
    lockedExternalFunding = 0,
    fundingMode = 'SYNDICATE',
    sourceProjectId,
    sourceTitle,
    week,
    year
}: {
    offers: ProjectInvestorOffer[];
    selectedInvestorIds: string[];
    targetRaise: number;
    packageBudget: number;
    lockedExternalFunding?: number;
    fundingMode?: ProjectInvestorFundingMode;
    sourceProjectId?: string;
    sourceTitle?: string;
    week?: number;
    year?: number;
}): ProjectInvestorPlan | undefined => {
    const selected = selectedInvestorIds
        .map(id => offers.find(offer => offer.investorId === id))
        .filter((offer): offer is ProjectInvestorOffer => Boolean(offer));
    if (!selected.length || targetRaise <= 0 || packageBudget <= 0) return undefined;
    const selectedOffers = fundingMode === 'LEAD' ? selected.slice(0, 1) : selected;
    const maxCommitment = getMaxInvestorRaise(packageBudget, lockedExternalFunding);
    let remainingCap = Math.max(0, maxCommitment);
    let runningTotal = 0;
    const commitments: ProjectInvestorCommitment[] = [];
    selectedOffers.forEach(offer => {
        if (remainingCap <= 0) return;
        const remainingTarget = Math.max(0, targetRaise - runningTotal);
        const amount = fundingMode === 'LEAD'
            ? Math.min(offer.amount, targetRaise, remainingCap)
            : remainingTarget > 0
                ? Math.min(offer.amount, remainingTarget, remainingCap)
                : Math.min(offer.amount, remainingCap);
        if (amount <= 0) return;
        const targetRole: ProjectInvestorCommitment['targetRole'] =
            fundingMode === 'LEAD' ? 'LEAD'
                : runningTotal >= targetRaise ? 'EXCESS'
                    : 'SYNDICATE';
        commitments.push({
            investorId: offer.investorId,
            investorName: offer.investorName,
            kind: offer.kind,
            ownerNpcId: offer.ownerNpcId,
            ownerName: offer.ownerName,
            ownerTitle: offer.ownerTitle,
            investorTags: offer.investorTags,
            amount,
            equityPercent: getCommitmentEquity(offer, amount),
            cleanEquityPercent: getCommitmentCleanEquity(offer, amount, packageBudget),
            offeredAmount: offer.amount,
            targetRole
        });
        runningTotal += amount;
        remainingCap -= amount;
    });
    const totalRaised = commitments.reduce((sum, item) => sum + item.amount, 0);
    if (totalRaised <= 0) return undefined;
    const investorEquityPercent = Math.min(85, Math.round(commitments.reduce((sum, item) => sum + item.equityPercent, 0) * 10) / 10);
    return {
        fundingMode,
        sourceProjectId,
        sourceTitle,
        targetRaise,
        totalRaised,
        investorEquityPercent,
        studioEquityPercent: Math.max(0, Math.round((100 - investorEquityPercent) * 10) / 10),
        commitments,
        createdWeek: week,
        createdYear: year
    };
};

export const updateInvestorRelationshipsForPlan = ({
    studio,
    plan,
    projectId,
    projectTitle,
    week,
    year
}: {
    studio: Business;
    plan: ProjectInvestorPlan | undefined;
    projectId?: string;
    projectTitle?: string;
    week?: number;
    year?: number;
}): Business => {
    if (!plan || !plan.commitments.length) return studio;
    const nextStudio: Business = {
        ...studio,
        studioState: {
            ...(studio.studioState || { scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0 })
        }
    };
    const relationships = cloneInvestorRelationships(nextStudio);
    plan.commitments.forEach(commitment => {
        const existingIndex = relationships.findIndex(item => item.investorId === commitment.investorId);
        const existing = existingIndex >= 0 ? relationships[existingIndex] : undefined;
        const nextRelationship: ProjectInvestorRelationship = {
            investorId: commitment.investorId,
            trustScore: Math.max(0, Math.min(100, Math.round((existing?.trustScore ?? 50) + 2))),
            totalFunded: Math.max(0, Math.round((existing?.totalFunded || 0) + commitment.amount)),
            totalPayout: Math.max(0, Math.round(existing?.totalPayout || 0)),
            projectsBacked: Math.max(0, Math.round((existing?.projectsBacked || 0) + 1)),
            profitableProjects: Math.max(0, Math.round(existing?.profitableProjects || 0)),
            failedProjects: Math.max(0, Math.round(existing?.failedProjects || 0)),
            lastProjectTitle: projectTitle || existing?.lastProjectTitle,
            lastProjectId: projectId || existing?.lastProjectId,
            lastInteractionWeek: week,
            lastInteractionYear: year
        };
        if (existingIndex >= 0) relationships[existingIndex] = nextRelationship;
        else relationships.push(nextRelationship);
    });
    nextStudio.studioState!.investorRelationships = relationships;
    return nextStudio;
};

export const applyInvestorPayoutMemory = ({
    studio,
    plan,
    payout,
    projectId,
    projectTitle,
    week,
    year
}: {
    studio: Business | undefined;
    plan: ProjectInvestorPlan | undefined;
    payout: number;
    projectId?: string;
    projectTitle?: string;
    week?: number;
    year?: number;
}): Business | undefined => {
    if (!studio || !plan || !plan.commitments.length || payout <= 0) return studio;
    const nextStudio: Business = {
        ...studio,
        studioState: {
            ...(studio.studioState || { scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0 })
        }
    };
    const relationships = cloneInvestorRelationships(nextStudio);
    const totalEquity = Math.max(1, plan.commitments.reduce((sum, item) => sum + Math.max(0, item.equityPercent || 0), 0));
    plan.commitments.forEach(commitment => {
        const existingIndex = relationships.findIndex(item => item.investorId === commitment.investorId);
        const existing = existingIndex >= 0 ? relationships[existingIndex] : undefined;
        const commitmentShare = Math.max(0, commitment.equityPercent || 0) / totalEquity;
        const investorPayout = Math.round(payout * commitmentShare);
        const funded = Math.max(1, commitment.amount || 1);
        const payoutRatio = investorPayout / funded;
        const trustDelta = payoutRatio >= 0.18 ? 3 : payoutRatio >= 0.08 ? 1 : investorPayout > 0 ? 0 : -1;
        const nextRelationship: ProjectInvestorRelationship = {
            investorId: commitment.investorId,
            trustScore: Math.max(0, Math.min(100, Math.round((existing?.trustScore ?? 50) + trustDelta))),
            totalFunded: Math.max(0, Math.round(existing?.totalFunded || commitment.amount || 0)),
            totalPayout: Math.max(0, Math.round((existing?.totalPayout || 0) + investorPayout)),
            projectsBacked: Math.max(1, Math.round(existing?.projectsBacked || 1)),
            profitableProjects: Math.max(0, Math.round((existing?.profitableProjects || 0) + (payoutRatio >= 0.18 ? 1 : 0))),
            failedProjects: Math.max(0, Math.round((existing?.failedProjects || 0) + (payoutRatio <= 0.01 ? 1 : 0))),
            lastProjectTitle: projectTitle || existing?.lastProjectTitle,
            lastProjectId: projectId || existing?.lastProjectId,
            lastInteractionWeek: week,
            lastInteractionYear: year
        };
        if (existingIndex >= 0) relationships[existingIndex] = nextRelationship;
        else relationships.push(nextRelationship);
    });
    nextStudio.studioState!.investorRelationships = relationships;
    return nextStudio;
};

export const processInvestorLeadershipChanges = ({
    studio,
    week,
    year
}: {
    studio: Business;
    week: number;
    year: number;
}): { studio: Business; changes: ProjectInvestorLeadershipChange[] } => {
    if (!studio.studioState) return { studio, changes: [] };
    const existing = Array.isArray(studio.studioState.investorLeadershipChanges)
        ? studio.studioState.investorLeadershipChanges
        : [];
    const absoluteWeek = Math.max(0, Math.round((year || 0) * 52 + (week || 0)));
    const changedThisWeek: ProjectInvestorLeadershipChange[] = [];
    const nextChanges = [...existing];

    PROJECT_INVESTORS.forEach(investor => {
        const seed = hashString(`${studio.id}:${investor.id}:${absoluteWeek}`);
        if (seed % 97 > 2) return;
        const lastChange = [...nextChanges].reverse().find(change => change.investorId === investor.id);
        const lastAbsolute = lastChange ? (lastChange.year * 52 + lastChange.week) : -9999;
        if (absoluteWeek - lastAbsolute < 78) return;

        const newOwnerName = INVESTOR_LEADERSHIP_POOL[seed % INVESTOR_LEADERSHIP_POOL.length];
        const reason = INVESTOR_LEADERSHIP_REASONS[Math.floor(seed / 7) % INVESTOR_LEADERSHIP_REASONS.length];
        const change: ProjectInvestorLeadershipChange = {
            investorId: investor.id,
            previousOwnerName: lastChange?.newOwnerName || investor.ownerName,
            newOwnerName,
            newOwnerNpcId: investorOwnerNpcIdFromName(newOwnerName),
            title: investor.kind === 'FILM_FUND' ? 'Managing Partner'
                : investor.kind === 'STREAMING_FINANCE' ? 'Finance CEO'
                    : investor.kind === 'BRAND_MEDIA' ? 'Media President'
                        : investor.kind === 'REGIONAL_COMPANY' ? 'Regional Chair'
                            : 'Investor CEO',
            reason,
            week,
            year
        };
        nextChanges.push(change);
        changedThisWeek.push(change);
    });

    if (!changedThisWeek.length) return { studio, changes: [] };
    return {
        studio: {
            ...studio,
            studioState: {
                ...studio.studioState,
                investorLeadershipChanges: nextChanges.slice(-40)
            }
        },
        changes: changedThisWeek
    };
};

export const calculateInvestorPayout = (
    plan: ProjectInvestorPlan | undefined,
    receiptAmount: number
): number => {
    if (!plan || plan.investorEquityPercent <= 0 || receiptAmount <= 0) return 0;
    return Math.round(receiptAmount * (plan.investorEquityPercent / 100));
};

export const describeInvestorKind = (kind: ProjectInvestor['kind']): string => {
    if (kind === 'FILM_FUND') return 'Film Fund';
    if (kind === 'PRIVATE_INVESTOR') return 'Private Investor';
    if (kind === 'COPRODUCTION_COMPANY') return 'Co-Production';
    if (kind === 'REGIONAL_COMPANY') return 'Regional Company';
    if (kind === 'STREAMING_FINANCE') return 'Streaming Finance';
    if (kind === 'BRAND_MEDIA') return 'Brand Media';
    return 'Producer';
};
