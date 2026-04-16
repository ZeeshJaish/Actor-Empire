import { FamilyObligation, NewsItem, Player, Relationship } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { getGenderedAvatar } from './npcLogic';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const sample = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const BREAKUP_HEADLINES = [
    '{Name} and {Partner} quietly call it quits.',
    'Relationship over: {Name} splits from {Partner}.',
    'Sources say {Name} and {Partner} have ended things for good.',
    '{Name} is suddenly single after a breakup with {Partner}.'
];

const DIVORCE_HEADLINES = [
    '{Name} and {Partner} are headed for divorce court.',
    'Divorce drama explodes as {Name} battles {Partner}.',
    '{Name} faces a brutal split from {Partner}.',
    'A marriage collapse sends {Name} into legal and financial chaos.'
];

const DIVORCE_SUBTEXTS = [
    'Insiders say the split has become one of the ugliest celebrity breakups of the year.',
    'Public sympathy is shifting fast as legal filings and money rumors spread.',
    'Fans are dissecting every court update while both sides leak their version of events.',
    'Behind closed doors, the settlement fight is said to be vicious.'
];

const COURTROOM_FLAVOR = {
    SETTLE: [
        'Your lawyers kept the room ice cold and clinical. No one smiled when the papers were signed.',
        'The settlement table felt quieter than any red carpet you have ever walked.',
    ],
    BUDGET: [
        'Your bargain lawyer tried to bluff the room, but the cracks showed fast.',
        'The courtroom felt cheap, tense, and one step away from disaster.',
    ],
    ESTABLISHED: [
        'Your counsel controlled the pace, trading calm pressure for every inch of leverage.',
        'The hearing stayed composed, but every sentence carried the threat of financial pain.',
    ],
    ELITE: [
        'Your elite counsel walked in like they already owned the room.',
        'The judge barely interrupted as your high-powered team carved through the case.',
    ],
};

const SOCIAL_REACTION_POSTS = [
    'celebs always preach values until the divorce paperwork drops',
    'this breakup is turning into pure tabloid fuel',
    'not the family-man image collapsing in real time',
    'courtroom season just started and the mess is already legendary',
];

const getSurname = (fullName: string) => {
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'Legacy';
    return parts[parts.length - 1];
};

const ensureFamilyFlags = (player: Player) => {
    if (!player.flags) player.flags = {};
    if (!Array.isArray(player.flags.familyObligations)) player.flags.familyObligations = [] as FamilyObligation[];
    if (!Array.isArray(player.flags.abandonedChildIds)) player.flags.abandonedChildIds = [] as string[];
};

export const isChildAbandoned = (player: Player, childId: string) =>
    Array.isArray(player.flags?.abandonedChildIds) && player.flags.abandonedChildIds.includes(childId);

export const estimateChildSupport = (player: Player) =>
    Math.round(clamp(
        2500 + (player.stats.fame * 750) + (player.stats.reputation * 350) + Math.max(0, player.money) * 0.0012,
        2500,
        250000
    ));

export const estimateAlimony = (player: Player, childSupport: number) =>
    Math.round(clamp(
        1500 + (childSupport * 0.65) + Math.max(0, player.money) * 0.0008,
        1500,
        175000
    ));

const createFamilyBacklashNews = (player: Player, headline: string, subtext: string): NewsItem => ({
    id: `news_family_${Date.now()}_${Math.random()}`,
    headline,
    subtext,
    category: 'TOP_STORY',
    week: player.currentWeek,
    year: player.age,
    impactLevel: player.stats.fame > 60 ? 'HIGH' : 'MEDIUM',
});

const createTemplatedNews = (player: Player, templates: string[], subtext: string, partnerName: string): NewsItem =>
    createFamilyBacklashNews(
        player,
        sample(templates).replace('{Name}', player.name).replace('{Partner}', partnerName),
        subtext
    );

const pushFamilyReactionPosts = (player: Player, topic: 'BREAKUP' | 'DIVORCE', partnerName: string) => {
    const xContent = topic === 'DIVORCE'
        ? `${sample(SOCIAL_REACTION_POSTS)} ${player.name} vs ${partnerName} is all over my feed.`
        : `${player.name} and ${partnerName} splitting was not on my bingo card this week.`;

    player.x.feed.unshift({
        id: `x_family_${Date.now()}_${Math.random()}`,
        authorId: `npc_family_x_${Math.random()}`,
        authorName: topic === 'DIVORCE' ? 'CourtWatchLive' : 'PopDramaNow',
        authorHandle: topic === 'DIVORCE' ? '@courtwatchlive' : '@popdramanow',
        authorAvatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${topic === 'DIVORCE' ? 'Court' : 'Drama'}`,
        content: xContent,
        timestamp: Date.now(),
        likes: topic === 'DIVORCE' ? 54000 : 18000,
        retweets: topic === 'DIVORCE' ? 17000 : 4200,
        replies: topic === 'DIVORCE' ? 3200 : 900,
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: topic === 'DIVORCE',
    });
    player.x.feed = player.x.feed.slice(0, 50);

    player.instagram.feed.unshift({
        id: `ig_family_${Date.now()}_${Math.random()}`,
        authorId: `npc_family_ig_${Math.random()}`,
        authorName: topic === 'DIVORCE' ? 'CelebScope' : 'StarPulse',
        authorHandle: topic === 'DIVORCE' ? '@celebscope' : '@starpulse',
        authorAvatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${topic === 'DIVORCE' ? 'CelebScope' : 'StarPulse'}`,
        type: 'INDUSTRY_NEWS',
        caption: topic === 'DIVORCE'
            ? `${player.name}'s divorce battle with ${partnerName} is dominating entertainment media right now.`
            : `${player.name} and ${partnerName} have split, and fans are already choosing sides.`,
        week: player.currentWeek,
        year: player.age,
        likes: topic === 'DIVORCE' ? 88000 : 26000,
        comments: topic === 'DIVORCE' ? 6400 : 1800,
        isPlayer: false,
    });
    player.instagram.feed = player.instagram.feed.slice(0, 50);
};

const addObligation = (player: Player, obligation: FamilyObligation) => {
    ensureFamilyFlags(player);
    const existing = (player.flags.familyObligations as FamilyObligation[]).find(item => item.active && item.type === obligation.type && item.targetId === obligation.targetId);
    if (existing) return;
    (player.flags.familyObligations as FamilyObligation[]).push(obligation);
};

export const applyParenthoodAbandonment = (
    player: Player,
    config: {
        childId?: string;
        childName?: string;
        childImage?: string;
        babyGender?: 'MALE' | 'FEMALE';
        partnerId?: string;
        partnerName?: string;
        birthWeekAbsolute?: number;
    }
): Player => {
    const nextPlayer = JSON.parse(JSON.stringify(player)) as Player;
    ensureFamilyFlags(nextPlayer);

    const partner = config.partnerId
        ? nextPlayer.relationships.find(rel => rel.id === config.partnerId)
        : nextPlayer.relationships.find(rel => rel.relation === 'Spouse' || rel.relation === 'Partner');

    const childSupport = estimateChildSupport(nextPlayer);
    const alimony = partner?.relation === 'Spouse' ? estimateAlimony(nextPlayer, childSupport) : 0;
    const absoluteWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);

    let child = config.childId ? nextPlayer.relationships.find(rel => rel.id === config.childId) : undefined;
    if (!child) {
        const fallbackName = config.childName || `${config.babyGender === 'FEMALE' ? 'Mia' : 'Leo'} ${getSurname(config.partnerName || nextPlayer.name)}`;
        child = {
            id: `child_${Date.now()}`,
            name: fallbackName,
            relation: 'Child',
            closeness: 0,
            image: config.childImage || getGenderedAvatar(config.babyGender || 'MALE', fallbackName),
            lastInteractionWeek: nextPlayer.currentWeek,
            lastInteractionAbsolute: config.birthWeekAbsolute ?? absoluteWeek,
            age: 0,
            gender: config.babyGender,
            birthWeekAbsolute: config.birthWeekAbsolute ?? absoluteWeek,
        };
        nextPlayer.relationships.push(child);
    } else {
        child.closeness = Math.min(child.closeness, 5);
        child.lastInteractionWeek = nextPlayer.currentWeek;
        child.lastInteractionAbsolute = absoluteWeek;
    }

    if (!(nextPlayer.flags.abandonedChildIds as string[]).includes(child.id)) {
        (nextPlayer.flags.abandonedChildIds as string[]).push(child.id);
    }

    addObligation(nextPlayer, {
        id: `support_child_${child.id}`,
        type: 'CHILD_SUPPORT',
        targetId: child.id,
        targetName: child.name,
        weeklyAmount: childSupport,
        active: true,
        startedWeek: nextPlayer.currentWeek,
        startedYear: nextPlayer.age,
        startedAbsoluteWeek: absoluteWeek,
        reason: 'ABANDONMENT',
    });

    if (partner) {
        partner.closeness = Math.max(0, partner.closeness - 70);
        partner.lastInteractionWeek = nextPlayer.currentWeek;
        partner.lastInteractionAbsolute = absoluteWeek;
        if (partner.relation === 'Spouse') {
            partner.relation = 'Ex-Spouse';
            addObligation(nextPlayer, {
                id: `support_spouse_${partner.id}`,
                type: 'ALIMONY',
                targetId: partner.id,
                targetName: partner.name,
                weeklyAmount: alimony,
                active: true,
                startedWeek: nextPlayer.currentWeek,
                startedYear: nextPlayer.age,
                startedAbsoluteWeek: absoluteWeek,
                reason: 'DIVORCE',
            });
        } else if (partner.relation === 'Partner') {
            partner.relation = 'Ex-Partner';
        }
    }

    nextPlayer.stats.happiness = Math.max(0, nextPlayer.stats.happiness - 14);
    nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - (nextPlayer.stats.fame > 50 ? 16 : 10));
    nextPlayer.stats.followers = Math.max(0, nextPlayer.stats.followers - Math.floor(nextPlayer.stats.followers * (nextPlayer.stats.fame > 40 ? 0.06 : 0.02)));

    if (nextPlayer.stats.fame > 15) {
        nextPlayer.news.unshift(createFamilyBacklashNews(
            nextPlayer,
            `${nextPlayer.name} faces backlash after walking away from family responsibilities`,
            partner
                ? `${partner.name} now has custody of ${child.name}, while industry chatter turns vicious.`
                : `${child.name}'s situation sparks a fresh wave of gossip and criticism online.`
        ));
        pushFamilyReactionPosts(nextPlayer, 'DIVORCE', partner?.name || child.name);
        nextPlayer.news = nextPlayer.news.slice(0, 50);
    }

    nextPlayer.logs = [
        {
            week: nextPlayer.currentWeek,
            year: nextPlayer.age,
            message: `💔 You walked away from parenting responsibilities for ${child.name}. Support obligations now hit your finances every week.`,
            type: 'negative' as const,
        },
        ...nextPlayer.logs,
    ].slice(0, 50);

    return nextPlayer;
};

export const reconnectWithChild = (player: Player, childId: string): Player => {
    const nextPlayer = JSON.parse(JSON.stringify(player)) as Player;
    ensureFamilyFlags(nextPlayer);
    nextPlayer.relationships = nextPlayer.relationships.map(rel => {
        if (rel.id !== childId) return rel;
        return {
            ...rel,
            closeness: Math.max(rel.closeness, 35),
            lastInteractionWeek: nextPlayer.currentWeek,
            lastInteractionAbsolute: getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek),
        };
    });

    nextPlayer.flags.abandonedChildIds = (nextPlayer.flags.abandonedChildIds as string[]).filter((id: string) => id !== childId);
    nextPlayer.stats.happiness = Math.min(100, nextPlayer.stats.happiness + 4);
    nextPlayer.stats.reputation = Math.min(100, nextPlayer.stats.reputation + 2);
    nextPlayer.logs = [
        {
            week: nextPlayer.currentWeek,
            year: nextPlayer.age,
            message: `🫶 You tried to reconnect with your child and slowly repair the damage.`,
            type: 'neutral' as const,
        },
        ...nextPlayer.logs,
    ].slice(0, 50);

    return nextPlayer;
};

const getChildren = (player: Player) => player.relationships.filter(rel => rel.relation === 'Child');

export const applyPartnerBreakup = (player: Player, partnerId: string): Player => {
    const nextPlayer = JSON.parse(JSON.stringify(player)) as Player;
    const absoluteWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
    const partner = nextPlayer.relationships.find(rel => rel.id === partnerId);
    if (!partner || (partner.relation !== 'Partner' && partner.relation !== 'Spouse')) return player;

    const hasChildren = getChildren(nextPlayer).length > 0;
    const childSupportPerChild = hasChildren ? Math.round(estimateChildSupport(nextPlayer) * 0.6) : 0;

    if (partner.relation === 'Spouse') {
        partner.relation = 'Ex-Spouse';
    } else {
        partner.relation = 'Ex-Partner';
    }
    partner.closeness = Math.max(0, partner.closeness - 55);
    partner.lastInteractionWeek = nextPlayer.currentWeek;
    partner.lastInteractionAbsolute = absoluteWeek;

    if (hasChildren) {
        getChildren(nextPlayer).forEach(child => {
            addObligation(nextPlayer, {
                id: `support_child_breakup_${child.id}_${partner.id}`,
                type: 'CHILD_SUPPORT',
                targetId: child.id,
                targetName: child.name,
                weeklyAmount: childSupportPerChild,
                active: true,
                startedWeek: nextPlayer.currentWeek,
                startedYear: nextPlayer.age,
                startedAbsoluteWeek: absoluteWeek,
                reason: 'DIVORCE',
            });
        });
    }

    nextPlayer.stats.happiness = Math.max(0, nextPlayer.stats.happiness - 10);
    nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - 4);
    nextPlayer.logs = [{
        week: nextPlayer.currentWeek,
        year: nextPlayer.age,
        message: `💔 You and ${partner.name} split. ${hasChildren ? 'Support obligations now follow the breakup.' : 'It ends without formal settlement.'}`,
        type: 'negative' as const,
    }, ...nextPlayer.logs].slice(0, 50);

    if (nextPlayer.stats.fame > 25) {
        nextPlayer.news.unshift(createTemplatedNews(
            nextPlayer,
            BREAKUP_HEADLINES,
            hasChildren
                ? `Insiders say the breakup is messy, with child support now in play.`
                : `Fans are already speculating on what caused the breakup.`,
            partner.name
        ));
        pushFamilyReactionPosts(nextPlayer, 'BREAKUP', partner.name);
        nextPlayer.news = nextPlayer.news.slice(0, 50);
    }

    return nextPlayer;
};

type DivorceLawyerTier = 'BUDGET' | 'ESTABLISHED' | 'ELITE';

const LAWYER_COSTS: Record<DivorceLawyerTier, number> = {
    BUDGET: 25000,
    ESTABLISHED: 100000,
    ELITE: 350000,
};

const LAWYER_DEFENSE: Record<DivorceLawyerTier, number> = {
    BUDGET: 8,
    ESTABLISHED: 18,
    ELITE: 32,
};

export const getDivorceLawyerCost = (tier: DivorceLawyerTier) => LAWYER_COSTS[tier];

export const applyDivorceOutcome = (
    player: Player,
    spouseId: string,
    strategy: 'SETTLE' | 'FIGHT',
    lawyerTier?: DivorceLawyerTier
): Player => {
    const nextPlayer = JSON.parse(JSON.stringify(player)) as Player;
    ensureFamilyFlags(nextPlayer);
    const absoluteWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
    const spouse = nextPlayer.relationships.find(rel => rel.id === spouseId && rel.relation === 'Spouse');
    if (!spouse) return player;

    const children = getChildren(nextPlayer);
    const hadChildren = children.length > 0;
    const currentMoney = Math.max(0, nextPlayer.money);
    const supportBase = estimateChildSupport(nextPlayer);
    const alimonyBase = estimateAlimony(nextPlayer, supportBase);
    let settlementShare = 0.22;
    let alimonyMultiplier = 0.5;
    let reputationHit = 6;
    let happinessHit = 12;
    let legalCost = 0;

    if (strategy === 'SETTLE') {
        settlementShare = hadChildren ? 0.28 : 0.18;
        alimonyMultiplier = hadChildren ? 0.65 : 0.35;
    } else {
        const tier = lawyerTier || 'BUDGET';
        legalCost = LAWYER_COSTS[tier];
        const defense = LAWYER_DEFENSE[tier];
        const riskRoll = Math.random() * 100;
        const standing = nextPlayer.stats.reputation + (nextPlayer.stats.fame * 0.35) + defense - spouse.closeness;

        if (riskRoll + standing > 105) {
            settlementShare = hadChildren ? 0.18 : 0.1;
            alimonyMultiplier = hadChildren ? 0.45 : 0.2;
        } else if (riskRoll + standing > 75) {
            settlementShare = hadChildren ? 0.34 : 0.22;
            alimonyMultiplier = hadChildren ? 0.75 : 0.45;
        } else if (riskRoll + standing > 45) {
            settlementShare = hadChildren ? 0.52 : 0.38;
            alimonyMultiplier = hadChildren ? 0.95 : 0.65;
            reputationHit = 9;
        } else {
            settlementShare = hadChildren ? 0.9 : 0.72;
            alimonyMultiplier = hadChildren ? 1.15 : 0.85;
            reputationHit = 14;
            happinessHit = 18;
        }
    }

    const settlementAmount = Math.round(currentMoney * settlementShare);
    nextPlayer.money = Math.max(0, nextPlayer.money - settlementAmount - legalCost);

    spouse.relation = 'Ex-Spouse';
    spouse.closeness = Math.max(0, spouse.closeness - 75);
    spouse.lastInteractionWeek = nextPlayer.currentWeek;
    spouse.lastInteractionAbsolute = absoluteWeek;

    if (settlementAmount > 0) {
        addObligation(nextPlayer, {
            id: `alimony_${spouse.id}_${absoluteWeek}`,
            type: 'ALIMONY',
            targetId: spouse.id,
            targetName: spouse.name,
            weeklyAmount: Math.max(1500, Math.round(alimonyBase * alimonyMultiplier)),
            active: true,
            startedWeek: nextPlayer.currentWeek,
            startedYear: nextPlayer.age,
            startedAbsoluteWeek: absoluteWeek,
            reason: 'DIVORCE',
        });
    }

    if (hadChildren) {
        children.forEach(child => {
            addObligation(nextPlayer, {
                id: `support_child_divorce_${child.id}_${spouse.id}`,
                type: 'CHILD_SUPPORT',
                targetId: child.id,
                targetName: child.name,
                weeklyAmount: Math.max(2500, Math.round(supportBase * (strategy === 'FIGHT' ? 1.05 : 0.85))),
                active: true,
                startedWeek: nextPlayer.currentWeek,
                startedYear: nextPlayer.age,
                startedAbsoluteWeek: absoluteWeek,
                reason: 'DIVORCE',
            });
        });
    }

    nextPlayer.stats.happiness = Math.max(0, nextPlayer.stats.happiness - happinessHit);
    nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - reputationHit);
    nextPlayer.stats.followers = Math.max(0, nextPlayer.stats.followers - Math.floor(nextPlayer.stats.followers * (strategy === 'FIGHT' ? 0.08 : 0.04)));

    const headline = strategy === 'FIGHT'
        ? sample(DIVORCE_HEADLINES).replace('{Name}', nextPlayer.name).replace('{Partner}', spouse.name)
        : `${nextPlayer.name} quietly settles a high-profile divorce`;
    const subtext = strategy === 'FIGHT'
        ? `${spouse.name} walks away with ${Math.round(settlementShare * 100)}% of liquid cash after an ugly courtroom fight. ${sample(DIVORCE_SUBTEXTS)}`
        : `${spouse.name} leaves the marriage with a negotiated settlement and ongoing support. ${sample(DIVORCE_SUBTEXTS)}`;

    if (nextPlayer.stats.fame > 20) {
        nextPlayer.news.unshift(createFamilyBacklashNews(nextPlayer, headline, subtext));
        pushFamilyReactionPosts(nextPlayer, 'DIVORCE', spouse.name);
        nextPlayer.news = nextPlayer.news.slice(0, 50);
    }

    const courtroomFlavor = strategy === 'SETTLE'
        ? sample(COURTROOM_FLAVOR.SETTLE)
        : sample(COURTROOM_FLAVOR[lawyerTier || 'BUDGET']);

    nextPlayer.logs = [{
        week: nextPlayer.currentWeek,
        year: nextPlayer.age,
        message: `⚖️ Divorce finalized with ${spouse.name}. Settlement: ${settlementAmount.toLocaleString()} cash${legalCost > 0 ? ` + ${legalCost.toLocaleString()} legal fees` : ''}. ${courtroomFlavor}`,
        type: 'negative' as const,
    }, ...nextPlayer.logs].slice(0, 50);

    return nextPlayer;
};
