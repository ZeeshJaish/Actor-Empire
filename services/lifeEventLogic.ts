import { Player, LifeEvent, LifeEventOption, LegalCase, ScheduledEvent, DatingMatch, NewsItem } from '../types';
import { spendPlayerEnergy } from './premiumLogic';
import { NPC_DATABASE } from './npcLogic';
import { applyDivorceOutcome, applyPartnerBreakup } from './familyLogic';
import { getPlayerLanguage, t } from './i18n';

// --- HELPERS ---
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const isEliteNpc = (npcId?: string) => {
    if (!npcId) return false;
    const npc = NPC_DATABASE.find(entry => entry.id === npcId);
    if (!npc) return false;
    return npc.netWorth > 1000000 || npc.tier === 'A_LIST' || npc.tier === 'ESTABLISHED';
};

const pushRomanceCoverage = (
    player: Player,
    headlineKey: string,
    subtextKey: string,
    textVars: Record<string, string | number>,
    tone: 'MESS' | 'SCANDAL' | 'BREAKUP' = 'MESS'
) => {
    const language = getPlayerLanguage(player);
    const impactLevel: NewsItem['impactLevel'] = tone === 'SCANDAL' ? 'HIGH' : 'MEDIUM';
    player.news.unshift({
        id: `news_relationship_${Date.now()}_${Math.random()}`,
        headline: t(language, headlineKey, textVars),
        subtext: t(language, subtextKey, textVars),
        category: 'TOP_STORY',
        week: player.currentWeek,
        year: player.age,
        impactLevel,
    });
    player.news = player.news.slice(0, 50);

    player.x.feed.unshift({
        id: `x_relationship_${Date.now()}_${Math.random()}`,
        authorId: `x_relationship_author_${Math.random()}`,
        authorName: tone === 'BREAKUP' ? 'SplitWatch' : tone === 'SCANDAL' ? 'TabloidWire' : 'PopPulse',
        authorHandle: tone === 'BREAKUP' ? '@splitwatch' : tone === 'SCANDAL' ? '@tabloidwire' : '@poppulse',
        authorAvatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${tone}`,
        content: t(language, `services.lifeEvent.relationship.coverage.x.${tone}`, { playerName: player.name }),
        timestamp: Date.now(),
        likes: tone === 'SCANDAL' ? 38000 : 14000,
        retweets: tone === 'SCANDAL' ? 9500 : 2600,
        replies: tone === 'SCANDAL' ? 2100 : 650,
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: tone !== 'MESS',
    });
    player.x.feed = player.x.feed.slice(0, 50);
};

const getCurrentPartner = (player: Player) =>
    player.relationships.find(rel => rel.relation === 'Spouse' || rel.relation === 'Partner');

const getFormerPartners = (player: Player) =>
    player.relationships.filter(rel => rel.relation === 'Ex-Partner' || rel.relation === 'Ex-Spouse');

const getLuxeEventTargets = (player: Player) => {
    const activePremiumMatches = player.dating.matches.filter(match => match.isPremium);
    const eliteRelationships = player.relationships.filter(rel =>
        (rel.relation === 'Partner' || rel.relation === 'Spouse') && isEliteNpc(rel.npcId)
    );
    return {
        activePremiumMatches,
        eliteRelationships,
    };
};

export const hasEligibleLuxeEventTarget = (player: Player) => {
    const { activePremiumMatches, eliteRelationships } = getLuxeEventTargets(player);
    return activePremiumMatches.length > 0 || eliteRelationships.length > 0;
};

export const generateLuxeLifeEvent = (player: Player): LifeEvent | null => {
    const { activePremiumMatches, eliteRelationships } = getLuxeEventTargets(player);
    if (activePremiumMatches.length === 0 && eliteRelationships.length === 0) return null;

    const focusMatch = activePremiumMatches.length > 0 ? pick(activePremiumMatches) : null;
    const focusPartner = eliteRelationships.length > 0 ? pick(eliteRelationships) : null;
    const roll = Math.random();

    if (focusMatch && roll < 0.4) {
        return {
            id: `luxe_private_invite_${Date.now()}`,
            type: 'LIFE',
            title: 'Luxe After Hours',
            titleKey: 'life.event.luxe.privateInvite.title',
            description: `${focusMatch.name} sends a late-night message asking for an off-grid meetup. No cameras, no entourage, no explanation.`,
            descriptionKey: 'life.event.luxe.privateInvite.description',
            textVars: { name: focusMatch.name },
            options: [
                {
                    label: 'Say yes and disappear for the night',
                    labelKey: 'life.event.luxe.privateInvite.accept.label',
                    description: 'Costs energy. Good for chemistry, risky for gossip if this connection is already hot.',
                    descriptionKey: 'life.event.luxe.privateInvite.accept.description',
                    impact: (p) => {
                        spendPlayerEnergy(p, 8, 'Life event: Private invite');
                        p.dating.matches = p.dating.matches.map(match =>
                            match.id === focusMatch.id
                                ? {
                                      ...match,
                                      chemistry: Math.min(100, match.chemistry + 7),
                                      officialStatus: match.officialStatus === 'MATCHED' ? 'SEEING' : match.officialStatus,
                                      scandalHeat: Math.max(0, (match.scandalHeat || 0) + 8),
                                  }
                                : match
                        );
                        return {
                            updatedPlayer: p,
                            log: `${focusMatch.name} pulled you deeper into the Luxe orbit. The chemistry got louder.`,
                            logKey: 'life.event.luxe.privateInvite.accept.log',
                            logVars: { name: focusMatch.name },
                        };
                    }
                },
                {
                    label: 'Keep it warm, but decline',
                    labelKey: 'life.event.luxe.privateInvite.decline.label',
                    description: 'Protects your schedule, but risks cooling things off.',
                    descriptionKey: 'life.event.luxe.privateInvite.decline.description',
                    impact: (p) => {
                        p.dating.matches = p.dating.matches.map(match =>
                            match.id === focusMatch.id
                                ? {
                                      ...match,
                                      chemistry: Math.max(10, match.chemistry - 3),
                                      officialStatus: match.officialStatus === 'SEEING' ? 'COOLDOWN' : match.officialStatus,
                                  }
                                : match
                        );
                        return {
                            updatedPlayer: p,
                            log: `You kept boundaries with ${focusMatch.name}, but the connection cooled a little.`,
                            logKey: 'life.event.luxe.privateInvite.decline.log',
                            logVars: { name: focusMatch.name },
                        };
                    }
                }
            ]
        };
    }

    if (focusMatch && roll < 0.72) {
        return {
            id: `luxe_public_pressure_${Date.now()}`,
            type: 'CONFLICT',
            title: 'Public or Nothing',
            titleKey: 'life.event.luxe.publicPressure.title',
            description: `${focusMatch.name} is tired of the ambiguity and wants to know whether this stays quiet or gets seen properly.`,
            descriptionKey: 'life.event.luxe.publicPressure.description',
            textVars: { name: focusMatch.name },
            options: [
                {
                    label: 'Go public together',
                    labelKey: 'life.event.luxe.publicPressure.public.label',
                    description: 'Raises buzz and followers, but also raises rumor risk.',
                    descriptionKey: 'life.event.luxe.publicPressure.public.description',
                    impact: (p) => {
                        p.stats.followers += 6000;
                        p.stats.reputation = Math.max(0, Math.min(100, p.stats.reputation + 1));
                        p.dating.matches = p.dating.matches.map(match =>
                            match.id === focusMatch.id
                                ? { ...match, chemistry: Math.min(100, match.chemistry + 4), scandalHeat: Math.max(0, (match.scandalHeat || 0) + 18), officialStatus: 'SEEING' }
                                : match
                        );
                        return {
                            updatedPlayer: p,
                            log: `You stepped into the light with ${focusMatch.name}. People noticed immediately.`,
                            logKey: 'life.event.luxe.publicPressure.public.log',
                            logVars: { name: focusMatch.name },
                        };
                    }
                },
                {
                    label: 'Keep the walls up',
                    labelKey: 'life.event.luxe.publicPressure.private.label',
                    description: 'Safer, but they may resent the secrecy.',
                    descriptionKey: 'life.event.luxe.publicPressure.private.description',
                    impact: (p) => {
                        p.dating.matches = p.dating.matches.map(match =>
                            match.id === focusMatch.id
                                ? { ...match, chemistry: Math.max(10, match.chemistry - 4), officialStatus: 'COOLDOWN' }
                                : match
                        );
                        return {
                            updatedPlayer: p,
                            log: `${focusMatch.name} did not love being kept in the shadows.`,
                            logKey: 'life.event.luxe.publicPressure.private.log',
                            logVars: { name: focusMatch.name },
                        };
                    }
                }
            ]
        };
    }

    if (focusMatch && roll < 0.9) {
        const existingPartner = player.relationships.find(rel => rel.relation === 'Partner' || rel.relation === 'Spouse');
        return {
            id: `luxe_overlap_${Date.now()}`,
            type: 'SCANDAL',
            title: 'Crossed Signals',
            titleKey: 'life.event.luxe.overlap.title',
            description: existingPartner
                ? `${focusMatch.name} notices you are emotionally split and wants clarity before this turns into public mess.`
                : `${focusMatch.name} caught wind of another Luxe connection and is suddenly less patient with being one option among many.`,
            descriptionKey: existingPartner
                ? 'life.event.luxe.overlap.descriptionPartner'
                : 'life.event.luxe.overlap.descriptionNoPartner',
            textVars: { name: focusMatch.name },
            options: [
                {
                    label: 'Prioritize this connection',
                    labelKey: 'life.event.luxe.overlap.prioritize.label',
                    description: 'Good for this match, risky for your wider life if you are already committed.',
                    descriptionKey: 'life.event.luxe.overlap.prioritize.description',
                    impact: (p) => {
                        p.dating.matches = p.dating.matches.map(match =>
                            match.id === focusMatch.id
                                ? { ...match, chemistry: Math.min(100, match.chemistry + 5), scandalHeat: Math.max(0, (match.scandalHeat || 0) + 14), officialStatus: 'SEEING' }
                                : match
                        );
                        if (existingPartner) {
                            const rel = p.relationships.find(r => r.id === existingPartner.id);
                            if (rel) rel.closeness = Math.max(0, rel.closeness - 8);
                        }
                        return {
                            updatedPlayer: p,
                            log: `You leaned toward ${focusMatch.name}. The chemistry sharpened, but so did the danger.`,
                            logKey: 'life.event.luxe.overlap.prioritize.log',
                            logVars: { name: focusMatch.name },
                        };
                    }
                },
                {
                    label: 'Back off and reduce the heat',
                    labelKey: 'life.event.luxe.overlap.backOff.label',
                    description: 'Safer, but this connection loses some momentum.',
                    descriptionKey: 'life.event.luxe.overlap.backOff.description',
                    impact: (p) => {
                        p.dating.matches = p.dating.matches.map(match =>
                            match.id === focusMatch.id
                                ? { ...match, chemistry: Math.max(10, match.chemistry - 5), scandalHeat: Math.max(0, (match.scandalHeat || 0) - 8), officialStatus: 'COOLDOWN' }
                                : match
                        );
                        return {
                            updatedPlayer: p,
                            log: `You created distance before this got uglier. ${focusMatch.name} felt it.`,
                            logKey: 'life.event.luxe.overlap.backOff.log',
                            logVars: { name: focusMatch.name },
                        };
                    }
                }
            ]
        };
    }

    if (focusPartner) {
        return {
            id: `luxe_partner_access_${Date.now()}`,
            type: 'NETWORKING',
            title: 'Elite Plus-One',
            titleKey: 'life.event.luxe.partnerAccess.title',
            description: `${focusPartner.name} offers to bring you into a private room full of producers, financiers, and prestige players. It could be powerful, or it could look transactional.`,
            descriptionKey: 'life.event.luxe.partnerAccess.description',
            textVars: { name: focusPartner.name },
            options: [
                {
                    label: 'Take the room',
                    labelKey: 'life.event.luxe.partnerAccess.take.label',
                    description: 'Boosts reputation and opens status optics.',
                    descriptionKey: 'life.event.luxe.partnerAccess.take.description',
                    impact: (p) => {
                        p.stats.reputation = Math.min(100, p.stats.reputation + 4);
                        p.stats.fame = Math.min(100, p.stats.fame + 2);
                        return {
                            updatedPlayer: p,
                            log: `${focusPartner.name} opened a serious door for you. The room now sees you differently.`,
                            logKey: 'life.event.luxe.partnerAccess.take.log',
                            logVars: { name: focusPartner.name },
                        };
                    }
                },
                {
                    label: 'Keep the relationship separate',
                    labelKey: 'life.event.luxe.partnerAccess.separate.label',
                    description: 'Protects the vibe, but leaves opportunity on the table.',
                    descriptionKey: 'life.event.luxe.partnerAccess.separate.description',
                    impact: (p) => {
                        const rel = p.relationships.find(r => r.id === focusPartner.id);
                        if (rel) rel.closeness = Math.min(100, rel.closeness + 4);
                        return {
                            updatedPlayer: p,
                            log: `You kept the relationship clean instead of turning it into leverage. ${focusPartner.name} respected that.`,
                            logKey: 'life.event.luxe.partnerAccess.separate.log',
                            logVars: { name: focusPartner.name },
                        };
                    }
                }
            ]
        };
    }

    return null;
};

// --- EVENT GENERATORS ---

export const generateLifeEvent = (player: Player): LifeEvent | null => {
    const roll = Math.random();
    const fame = player.stats.fame;
    const heat = player.flags.heat || 0;
    const partner = getCurrentPartner(player);
    const closeFamily = player.relationships.find(r => r.relation === 'Parent' || r.relation === 'Sibling' || r.relation === 'Child');
    const exPartner = getFormerPartners(player).length > 0 ? pick(getFormerPartners(player)) : null;
    const activeDatingMatches = player.dating.matches.filter(match => {
        if (match.isPremium) return (match.officialStatus || 'MATCHED') !== 'GHOSTED' && match.chemistry >= 28;
        return (match.tinderStage || 'MATCHED') !== 'GHOSTED' && match.chemistry >= 25;
    });
    const hottestSideConnection = activeDatingMatches.length > 0
        ? [...activeDatingMatches].sort((a, b) => (b.chemistry + (b.scandalHeat || 0)) - (a.chemistry + (a.scandalHeat || 0)))[0]
        : null;
    const multipleHotConnections = activeDatingMatches.filter(match => match.chemistry >= 45).length >= 2;
    const hasBusiness = (player.businesses?.length || 0) > 0;

    // 0. ROMANCE CHAOS / JEALOUSY / BREAKUP EDGE CASES
    if (partner && hottestSideConnection && roll < 0.11) {
        return {
            id: `relationship_jealousy_${Date.now()}`,
            type: 'CONFLICT',
            title: 'Read Receipts and Red Flags',
            titleKey: 'life.event.relationship.jealousy.title',
            description: `${partner.name} catches enough of your phone to realize ${hottestSideConnection.name} is not just casual background noise. They want the truth right now.`,
            descriptionKey: 'life.event.relationship.jealousy.description',
            textVars: { partner: partner.name, connection: hottestSideConnection.name },
            options: [
                {
                    label: 'Cut off the side connection',
                    labelKey: 'life.event.relationship.jealousy.cutOff.label',
                    description: 'Protect the real relationship and take the short-term hit.',
                    descriptionKey: 'life.event.relationship.jealousy.cutOff.description',
                    impact: (p) => {
                        const rel = p.relationships.find(r => r.id === partner.id);
                        if (rel) rel.closeness = Math.min(100, rel.closeness + 8);
                        p.dating.matches = p.dating.matches.map(match =>
                            match.id === hottestSideConnection.id
                                ? {
                                      ...match,
                                      chemistry: Math.max(8, match.chemistry - 20),
                                      officialStatus: match.isPremium ? 'COOLDOWN' : match.officialStatus,
                                      tinderStage: !match.isPremium ? 'GHOSTED' : match.tinderStage,
                                      scandalHeat: Math.max(0, (match.scandalHeat || 0) - 8),
                                  }
                                : match
                        );
                        p.stats.happiness = Math.max(0, p.stats.happiness - 4);
                        return {
                            updatedPlayer: p,
                            log: `You chose ${partner.name} over the chaos. ${hottestSideConnection.name} felt the door slam shut.`,
                            logKey: 'life.event.relationship.jealousy.cutOff.log',
                            logVars: { partner: partner.name, connection: hottestSideConnection.name },
                        };
                    }
                },
                {
                    label: 'Admit it, but ask for time',
                    labelKey: 'life.event.relationship.jealousy.admit.label',
                    description: 'Honest, messy, and not guaranteed to work.',
                    descriptionKey: 'life.event.relationship.jealousy.admit.description',
                    impact: (p) => {
                        const rel = p.relationships.find(r => r.id === partner.id);
                        if (rel) rel.closeness = Math.max(0, rel.closeness - 6);
                        p.dating.matches = p.dating.matches.map(match =>
                            match.id === hottestSideConnection.id
                                ? { ...match, chemistry: Math.min(100, match.chemistry + 4), scandalHeat: Math.max(0, (match.scandalHeat || 0) + 10) }
                                : match
                        );
                        p.stats.reputation = Math.max(0, p.stats.reputation - 3);
                        if (p.stats.fame > 35) {
                            pushRomanceCoverage(
                                p,
                                'services.lifeEvent.relationship.coverage.jealousyAdmit.headline',
                                'services.lifeEvent.relationship.coverage.jealousyAdmit.subtext',
                                { playerName: p.name, partner: partner.name, connection: hottestSideConnection.name },
                                'MESS'
                            );
                        }
                        return {
                            updatedPlayer: p,
                            log: `You asked for more time, which was honest... but did not make anything cleaner.`,
                            logKey: 'life.event.relationship.jealousy.admit.log',
                        };
                    }
                },
                {
                    label: 'Lie and keep juggling',
                    labelKey: 'life.event.relationship.jealousy.lie.label',
                    description: 'Highest drama. Highest fallout risk.',
                    descriptionKey: 'life.event.relationship.jealousy.lie.description',
                    impact: (p) => {
                        const rel = p.relationships.find(r => r.id === partner.id);
                        if (rel) rel.closeness = Math.max(0, rel.closeness - 16);
                        p.stats.reputation = Math.max(0, p.stats.reputation - 6);
                        p.flags.heat = (p.flags.heat || 0) + 12;
                        p.dating.matches = p.dating.matches.map(match =>
                            match.id === hottestSideConnection.id
                                ? { ...match, chemistry: Math.min(100, match.chemistry + 6), scandalHeat: Math.max(0, (match.scandalHeat || 0) + 16) }
                                : match
                        );
                        pushRomanceCoverage(
                            p,
                            'services.lifeEvent.relationship.coverage.jealousyLie.headline',
                            'services.lifeEvent.relationship.coverage.jealousyLie.subtext',
                            { playerName: p.name, partner: partner.name, connection: hottestSideConnection.name },
                            'SCANDAL'
                        );
                        return {
                            updatedPlayer: p,
                            log: `You kept every thread alive. The mess got more exciting and much more dangerous.`,
                            logKey: 'life.event.relationship.jealousy.lie.log',
                        };
                    }
                }
            ]
        };
    }

    if (partner && (heat > 20 || multipleHotConnections || (partner.closeness < 46 && fame > 20)) && roll < 0.18) {
        const isMarriage = partner.relation === 'Spouse';
        return {
            id: `relationship_breaking_point_${Date.now()}`,
            type: 'SCANDAL',
            title: isMarriage ? 'The Marriage Is Cracking' : 'One Fight Too Many',
            titleKey: isMarriage ? 'life.event.relationship.breakingPoint.marriage.title' : 'life.event.relationship.breakingPoint.partner.title',
            description: isMarriage
                ? `${partner.name} is done pretending the relationship can survive endless stress, public heat, and half-truths. Lawyers are now a real possibility.`
                : `${partner.name} says the relationship feels unstable, reactive, and embarrassing. They want one clear reason to stay.`,
            descriptionKey: isMarriage ? 'life.event.relationship.breakingPoint.marriage.description' : 'life.event.relationship.breakingPoint.partner.description',
            textVars: { partner: partner.name },
            options: [
                {
                    label: 'Fight hard for the relationship',
                    labelKey: 'life.event.relationship.breakingPoint.fight.label',
                    description: 'Costs energy and money, but gives you one real shot to stabilize it.',
                    descriptionKey: 'life.event.relationship.breakingPoint.fight.description',
                    impact: (p) => {
                        spendPlayerEnergy(p, 18, 'Life event: Fight for relationship');
                        p.money = Math.max(0, p.money - 15000);
                        const rel = p.relationships.find(r => r.id === partner.id);
                        if (rel) rel.closeness = Math.min(100, rel.closeness + 10);
                        p.stats.happiness = Math.max(0, p.stats.happiness - 2);
                        p.flags.heat = Math.max(0, (p.flags.heat || 0) - 6);
                        return {
                            updatedPlayer: p,
                            log: `You showed up with effort, time, and money. ${partner.name} did not fully melt, but they stayed.`,
                            logKey: 'life.event.relationship.breakingPoint.fight.log',
                            logVars: { partner: partner.name },
                        };
                    }
                },
                {
                    label: isMarriage ? 'Let it collapse into a settlement' : 'End it cleanly now',
                    labelKey: isMarriage ? 'life.event.relationship.breakingPoint.settle.label' : 'life.event.relationship.breakingPoint.end.label',
                    description: isMarriage ? 'This can trigger real divorce fallout.' : 'Painful, but cleaner than dragging it out.',
                    descriptionKey: isMarriage ? 'life.event.relationship.breakingPoint.settle.description' : 'life.event.relationship.breakingPoint.end.description',
                    impact: (p) => {
                        const nextPlayer = isMarriage
                            ? applyDivorceOutcome(p, partner.id, 'SETTLE')
                            : applyPartnerBreakup(p, partner.id);
                        return {
                            updatedPlayer: nextPlayer,
                            log: isMarriage
                                ? `You stopped fighting the collapse. The marriage is over, and the settlement fallout begins immediately.`
                                : `You ended it before it could turn uglier. The silence afterward still hurts.`,
                            logKey: isMarriage ? 'life.event.relationship.breakingPoint.settle.log' : 'life.event.relationship.breakingPoint.end.log',
                        };
                    }
                },
                {
                    label: 'Turn it into a public war',
                    labelKey: 'life.event.relationship.breakingPoint.publicWar.label',
                    description: 'Short-term buzz, long-term damage.',
                    descriptionKey: 'life.event.relationship.breakingPoint.publicWar.description',
                    impact: (p) => {
                        const nextPlayer = isMarriage
                            ? applyDivorceOutcome(p, partner.id, 'FIGHT', 'BUDGET')
                            : applyPartnerBreakup(p, partner.id);
                        nextPlayer.stats.fame = Math.min(100, nextPlayer.stats.fame + 4);
                        nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - 8);
                        pushRomanceCoverage(
                            nextPlayer,
                            'services.lifeEvent.relationship.coverage.breakingPointPublicWar.headline',
                            'services.lifeEvent.relationship.coverage.breakingPointPublicWar.subtext',
                            { playerName: nextPlayer.name, partner: partner.name },
                            'BREAKUP'
                        );
                        return {
                            updatedPlayer: nextPlayer,
                            log: `You chose spectacle over peace. The internet is entertained. Your life is not.`,
                            logKey: 'life.event.relationship.breakingPoint.publicWar.log',
                        };
                    }
                }
            ]
        };
    }

    if (partner && exPartner && roll < 0.23) {
        return {
            id: `relationship_ex_return_${Date.now()}`,
            type: 'CONFLICT',
            title: 'The Ex Resurfaces',
            titleKey: 'life.event.relationship.exReturn.title',
            description: `${exPartner.name} reappears with one perfectly timed message just as things with ${partner.name} were finally steady. They want to "clear the air."`,
            descriptionKey: 'life.event.relationship.exReturn.description',
            textVars: { ex: exPartner.name, partner: partner.name },
            options: [
                {
                    label: 'Tell your current partner first',
                    labelKey: 'life.event.relationship.exReturn.tellPartner.label',
                    description: 'Cleaner optics, harder conversation.',
                    descriptionKey: 'life.event.relationship.exReturn.tellPartner.description',
                    impact: (p) => {
                        const currentRel = p.relationships.find(r => r.id === partner.id);
                        const exRel = p.relationships.find(r => r.id === exPartner.id);
                        if (currentRel) currentRel.closeness = Math.min(100, currentRel.closeness + 5);
                        if (exRel) exRel.closeness = Math.min(100, exRel.closeness + 2);
                        p.stats.happiness = Math.max(0, p.stats.happiness - 1);
                        return {
                            updatedPlayer: p,
                            log: `You got ahead of the story. ${partner.name} appreciated the honesty, even if it made the week awkward.`,
                            logKey: 'life.event.relationship.exReturn.tellPartner.log',
                            logVars: { partner: partner.name },
                        };
                    }
                },
                {
                    label: 'Meet the ex quietly',
                    labelKey: 'life.event.relationship.exReturn.meet.label',
                    description: 'Could bring closure. Could blow up.',
                    descriptionKey: 'life.event.relationship.exReturn.meet.description',
                    impact: (p) => {
                        spendPlayerEnergy(p, 8, 'Life event: Meet the ex');
                        const currentRel = p.relationships.find(r => r.id === partner.id);
                        const exRel = p.relationships.find(r => r.id === exPartner.id);
                        if (currentRel) currentRel.closeness = Math.max(0, currentRel.closeness - 7);
                        if (exRel) exRel.closeness = Math.min(100, exRel.closeness + 6);
                        p.flags.heat = (p.flags.heat || 0) + 6;
                        if (p.stats.fame > 28) {
                            pushRomanceCoverage(
                                p,
                                'services.lifeEvent.relationship.coverage.exReturnMeet.headline',
                                'services.lifeEvent.relationship.coverage.exReturnMeet.subtext',
                                { playerName: p.name, partner: partner.name, ex: exPartner.name },
                                'MESS'
                            );
                        }
                        return {
                            updatedPlayer: p,
                            log: `You met ${exPartner.name} in secret. Even if it meant nothing, it does not look like nothing.`,
                            logKey: 'life.event.relationship.exReturn.meet.log',
                            logVars: { ex: exPartner.name },
                        };
                    }
                },
                {
                    label: 'Block the number and move on',
                    labelKey: 'life.event.relationship.exReturn.block.label',
                    description: 'Least dramatic. Also least unresolved.',
                    descriptionKey: 'life.event.relationship.exReturn.block.description',
                    impact: (p) => {
                        const exRel = p.relationships.find(r => r.id === exPartner.id);
                        if (exRel) exRel.closeness = Math.max(0, exRel.closeness - 10);
                        const currentRel = p.relationships.find(r => r.id === partner.id);
                        if (currentRel) currentRel.closeness = Math.min(100, currentRel.closeness + 3);
                        return {
                            updatedPlayer: p,
                            log: `You closed the old door instead of reopening it for nostalgia and damage.`,
                            logKey: 'life.event.relationship.exReturn.block.log',
                        };
                    }
                }
            ]
        };
    }

    if (activeDatingMatches.length > 0 && fame > 20 && roll < 0.28) {
        const leakedMatch = hottestSideConnection || pick(activeDatingMatches);
        return {
            id: `relationship_screenshot_leak_${Date.now()}`,
            type: 'SCANDAL',
            title: 'Screenshot Culture',
            titleKey: 'life.event.relationship.screenshotLeak.title',
            description: `A private exchange connected to ${leakedMatch.name} starts bouncing through group chats. No one has hard proof yet, but the wording is specific enough to be dangerous.`,
            descriptionKey: 'life.event.relationship.screenshotLeak.description',
            textVars: { name: leakedMatch.name },
            options: [
                {
                    label: 'Own the flirtation',
                    labelKey: 'life.event.relationship.screenshotLeak.own.label',
                    description: 'Can boost mystique, but it heats everything up.',
                    descriptionKey: 'life.event.relationship.screenshotLeak.own.description',
                    impact: (p) => {
                        p.stats.fame = Math.min(100, p.stats.fame + 3);
                        p.stats.followers += 9000;
                        p.flags.heat = (p.flags.heat || 0) + 8;
                        p.dating.matches = p.dating.matches.map(match =>
                            match.id === leakedMatch.id
                                ? { ...match, scandalHeat: Math.max(0, (match.scandalHeat || 0) + 14), chemistry: Math.min(100, match.chemistry + 3) }
                                : match
                        );
                        pushRomanceCoverage(
                            p,
                            'services.lifeEvent.relationship.coverage.screenshotOwn.headline',
                            'services.lifeEvent.relationship.coverage.screenshotOwn.subtext',
                            { playerName: p.name, match: leakedMatch.name },
                            'SCANDAL'
                        );
                        return {
                            updatedPlayer: p,
                            log: `You refused to act ashamed. The buzz went up. So did the risk.`,
                            logKey: 'life.event.relationship.screenshotLeak.own.log',
                        };
                    }
                },
                {
                    label: 'Lock everything down',
                    labelKey: 'life.event.relationship.screenshotLeak.lock.label',
                    description: 'Hurts momentum, protects your image.',
                    descriptionKey: 'life.event.relationship.screenshotLeak.lock.description',
                    impact: (p) => {
                        p.stats.reputation = Math.min(100, p.stats.reputation + 2);
                        p.flags.heat = Math.max(0, (p.flags.heat || 0) - 4);
                        p.dating.matches = p.dating.matches.map(match =>
                            match.id === leakedMatch.id
                                ? {
                                      ...match,
                                      chemistry: Math.max(8, match.chemistry - 4),
                                      scandalHeat: Math.max(0, (match.scandalHeat || 0) - 10),
                                      officialStatus: match.isPremium ? 'COOLDOWN' : match.officialStatus,
                                  }
                                : match
                        );
                        return {
                            updatedPlayer: p,
                            log: `You locked the whole situation down. Cleaner optics, colder energy.`,
                            logKey: 'life.event.relationship.screenshotLeak.lock.log',
                        };
                    }
                },
                {
                    label: 'Blame clout-chasing accounts',
                    labelKey: 'life.event.relationship.screenshotLeak.blame.label',
                    description: 'Might work, might make you look defensive.',
                    descriptionKey: 'life.event.relationship.screenshotLeak.blame.description',
                    impact: (p) => {
                        p.stats.reputation = Math.max(0, p.stats.reputation - 2);
                        p.flags.heat = (p.flags.heat || 0) + 5;
                        if (Math.random() < 0.45) {
                            p.stats.followers += 6000;
                            return {
                                updatedPlayer: p,
                                log: `The denial bought you enough confusion to keep moving. Not clean, but effective.`,
                                logKey: 'life.event.relationship.screenshotLeak.blame.successLog',
                            };
                        }
                        pushRomanceCoverage(
                            p,
                            'services.lifeEvent.relationship.coverage.screenshotBlame.headline',
                            'services.lifeEvent.relationship.coverage.screenshotBlame.subtext',
                            { playerName: p.name },
                            'SCANDAL'
                        );
                        return {
                            updatedPlayer: p,
                            log: `The denial backfired. Now people are looking harder, not less.`,
                            logKey: 'life.event.relationship.screenshotLeak.blame.failLog',
                        };
                    }
                }
            ]
        };
    }

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
            titleKey: 'life.event.crime.privatePerformance.title',
            description: `An unknown sender approaches you at a private club. A wealthy 'businessman' wants you to attend his daughter's birthday in a restricted region. The pay is ${formattedReward} cash, but the optics are... questionable.`,
            descriptionKey: 'life.event.crime.privatePerformance.description',
            textVars: { reward: formattedReward },
            options: [
                {
                    label: `Take the Cash (${formattedReward})`,
                    labelKey: 'life.event.crime.privatePerformance.takeCash.label',
                    textVars: { reward: formattedReward },
                    description: "High risk of government audit later.",
                    descriptionKey: 'life.event.crime.privatePerformance.takeCash.description',
                    impact: (p) => {
                        p.money += dynamicReward;
                        p.flags.heat = (p.flags.heat || 0) + 20;
                        // Delayed feedback: 4-12 weeks
                        return {
                            updatedPlayer: p,
                            log: `You took the dirty money (${formattedReward}). You feel a bit paranoid.`,
                            logKey: 'life.event.crime.privatePerformance.takeCash.log',
                            logVars: { reward: formattedReward },
                            feedbackDelay: 4 + Math.floor(Math.random() * 8),
                            feedbackType: 'GOVT_AUDIT'
                        };
                    }
                },
                {
                    label: "Politely Decline",
                    labelKey: 'life.event.crime.privatePerformance.decline.label',
                    description: "No risk, no reward.",
                    descriptionKey: 'life.event.crime.privatePerformance.decline.description',
                    impact: (p) => ({
                        updatedPlayer: p,
                        log: "You turned down the shady deal. Better safe than sorry.",
                        logKey: 'life.event.crime.privatePerformance.decline.log',
                    })
                },
                {
                    label: "The 'Fixer' (Watch Ad)",
                    labelKey: 'life.event.crime.privatePerformance.fixer.label',
                    isGolden: true,
                    description: "Route the money through a shell company. Safest way.",
                    descriptionKey: 'life.event.crime.privatePerformance.fixer.description',
                    impact: (p) => {
                        p.money += dynamicReward;
                        return {
                            updatedPlayer: p,
                            log: `The money (${formattedReward}) was laundered perfectly. No one will ever know.`,
                            logKey: 'life.event.crime.privatePerformance.fixer.log',
                            logVars: { reward: formattedReward },
                        };
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
            titleKey: 'life.event.politics.endorsement.title',
            description: "A controversial political candidate is offering a massive donation to your favorite charity if you endorse them publicly. Half your fans will love it, the other half will be furious.",
            descriptionKey: 'life.event.politics.endorsement.description',
            options: [
                {
                    label: "Endorse Them",
                    labelKey: 'life.event.politics.endorsement.endorse.label',
                    impact: (p) => {
                        p.stats.reputation -= 15;
                        p.stats.fame += 10;
                        p.stats.followers += Math.floor(p.stats.followers * 0.1);
                        return {
                            updatedPlayer: p,
                            log: "You endorsed the candidate. The internet is on fire.",
                            logKey: 'life.event.politics.endorsement.endorse.log',
                        };
                    }
                },
                {
                    label: "Stay Neutral",
                    labelKey: 'life.event.politics.endorsement.neutral.label',
                    impact: (p) => ({
                        updatedPlayer: p,
                        log: "You stayed out of it. Boring, but safe.",
                        logKey: 'life.event.politics.endorsement.neutral.log',
                    })
                },
                {
                    label: "PR Spin (Watch Ad)",
                    labelKey: 'life.event.politics.endorsement.prSpin.label',
                    isGolden: true,
                    description: "Endorse the 'cause', not the candidate. Everyone wins.",
                    descriptionKey: 'life.event.politics.endorsement.prSpin.description',
                    impact: (p) => {
                        p.stats.fame += 15;
                        p.stats.reputation += 5;
                        return {
                            updatedPlayer: p,
                            log: "Your PR team spun the endorsement perfectly. You look like a hero.",
                            logKey: 'life.event.politics.endorsement.prSpin.log',
                        };
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
            titleKey: 'life.event.scandal.tmzLeak.title',
            description: "A video of you having a heated argument with a director has leaked. It looks bad. Your reputation is taking a hit.",
            descriptionKey: 'life.event.scandal.tmzLeak.description',
            options: [
                {
                    label: "Apologize Publicly",
                    labelKey: 'life.event.scandal.tmzLeak.apologize.label',
                    impact: (p) => {
                        p.stats.reputation -= 5;
                        p.money -= 10000; // PR costs
                        return {
                            updatedPlayer: p,
                            log: "You apologized. People are still talking, but the fire is out.",
                            logKey: 'life.event.scandal.tmzLeak.apologize.log',
                        };
                    }
                },
                {
                    label: "Ignore It",
                    labelKey: 'life.event.scandal.tmzLeak.ignore.label',
                    impact: (p) => {
                        p.stats.reputation -= 20;
                        p.flags.heat = (p.flags.heat || 0) + 10;
                        return {
                            updatedPlayer: p,
                            log: "You ignored the leak. The public thinks you're arrogant.",
                            logKey: 'life.event.scandal.tmzLeak.ignore.log',
                        };
                    }
                },
                {
                    label: "The 'Deepfake' Defense (Watch Ad)",
                    labelKey: 'life.event.scandal.tmzLeak.deepfake.label',
                    isGolden: true,
                    description: "Claim the video was AI-generated. Completely clears you.",
                    descriptionKey: 'life.event.scandal.tmzLeak.deepfake.description',
                    impact: (p) => {
                        p.stats.reputation += 5;
                        return {
                            updatedPlayer: p,
                            log: "You claimed it was a deepfake. Your fans believe you!",
                            logKey: 'life.event.scandal.tmzLeak.deepfake.log',
                        };
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
            titleKey: 'life.event.networking.vipAfterparty.title',
            description: "You're at a high-end party. In the corner, three influential directors are sharing drinks and discussing their next big project. This is your chance.",
            descriptionKey: 'life.event.networking.vipAfterparty.description',
            options: [
                {
                    label: "Join Them (Buy a Round)",
                    labelKey: 'life.event.networking.vipAfterparty.join.label',
                    description: "Costs $5,000. Might lead to a project.",
                    descriptionKey: 'life.event.networking.vipAfterparty.join.description',
                    impact: (p) => {
                        p.money -= 5000;
                        const chance = Math.random();
                        if (chance < 0.4) {
                            // High chance of a project offer next week
                            return {
                                updatedPlayer: p,
                                log: "You shared a beer and some laughs. They seemed impressed!",
                                logKey: 'life.event.networking.vipAfterparty.join.successLog',
                                feedbackDelay: 1,
                                feedbackType: 'PROJECT_OFFER'
                            };
                        }
                        return {
                            updatedPlayer: p,
                            log: "You had a good chat, but nothing concrete came of it.",
                            logKey: 'life.event.networking.vipAfterparty.join.neutralLog',
                        };
                    }
                },
                {
                    label: "Observe from Afar",
                    labelKey: 'life.event.networking.vipAfterparty.observe.label',
                    impact: (p) => ({
                        updatedPlayer: p,
                        log: "You watched them from the bar. You missed a potential connection.",
                        logKey: 'life.event.networking.vipAfterparty.observe.log',
                    })
                },
                {
                    label: "The 'Star' Entrance (Watch Ad)",
                    labelKey: 'life.event.networking.vipAfterparty.star.label',
                    isGolden: true,
                    description: "Interrupt with a witty remark. Guaranteed to get their attention.",
                    descriptionKey: 'life.event.networking.vipAfterparty.star.description',
                    impact: (p) => {
                        p.stats.reputation += 5;
                        return {
                            updatedPlayer: p,
                            log: "You dominated the conversation. They're already talking about casting you!",
                            logKey: 'life.event.networking.vipAfterparty.star.log',
                            feedbackDelay: 1,
                            feedbackType: 'PROJECT_OFFER_PREMIUM'
                        };
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
            titleKey: 'life.event.conflict.weekendDilemma.title',
            description: "Your best friends are planning a last-minute trip to a cabin. However, your publicist just called: there's a surprise press event that could boost your reputation.",
            descriptionKey: 'life.event.conflict.weekendDilemma.description',
            options: [
                {
                    label: "Go on the Trip",
                    labelKey: 'life.event.conflict.weekendDilemma.trip.label',
                    impact: (p) => {
                        p.stats.happiness += 20;
                        p.stats.reputation -= 5;
                        p.relationships.forEach(r => { if (r.relation === 'Friend') r.closeness += 15; });
                        return {
                            updatedPlayer: p,
                            log: "You had a blast with your friends. Your publicist is annoyed, though.",
                            logKey: 'life.event.conflict.weekendDilemma.trip.log',
                        };
                    }
                },
                {
                    label: "Attend the Press Event",
                    labelKey: 'life.event.conflict.weekendDilemma.press.label',
                    impact: (p) => {
                        p.stats.reputation += 15;
                        p.stats.happiness -= 10;
                        p.relationships.forEach(r => { if (r.relation === 'Friend') r.closeness -= 10; });
                        return {
                            updatedPlayer: p,
                            log: "The press event was a success! Your friends are a bit hurt you bailed.",
                            logKey: 'life.event.conflict.weekendDilemma.press.log',
                        };
                    }
                },
                {
                    label: "The 'Influencer' Move (Watch Ad)",
                    labelKey: 'life.event.conflict.weekendDilemma.influencer.label',
                    isGolden: true,
                    description: "Livestream the trip and mention the press event. Best of both worlds.",
                    descriptionKey: 'life.event.conflict.weekendDilemma.influencer.description',
                    impact: (p) => {
                        p.stats.reputation += 10;
                        p.stats.happiness += 10;
                        p.stats.followers += 5000;
                        return {
                            updatedPlayer: p,
                            log: "You managed to have fun AND stay relevant. Your fans loved the behind-the-scenes look!",
                            logKey: 'life.event.conflict.weekendDilemma.influencer.log',
                        };
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
            titleKey: 'life.event.relationship.publicFeed.title',
            description: `${partner.name} is upset that every dinner, vacation, and minor disagreement somehow becomes content for the internet. They ask for stricter boundaries.`,
            descriptionKey: 'life.event.relationship.publicFeed.description',
            textVars: { partner: partner.name },
            options: [
                {
                    label: "Choose Privacy",
                    labelKey: 'life.event.relationship.publicFeed.privacy.label',
                    impact: (p) => {
                        p.stats.happiness += 8;
                        p.stats.followers = Math.max(0, p.stats.followers - 3000);
                        const rel = p.relationships.find(r => r.id === partner.id);
                        if (rel) rel.closeness += 12;
                        return {
                            updatedPlayer: p,
                            log: "You pulled back from the spotlight and your relationship immediately felt safer.",
                            logKey: 'life.event.relationship.publicFeed.privacy.log',
                        };
                    }
                },
                {
                    label: "Stay Public",
                    labelKey: 'life.event.relationship.publicFeed.public.label',
                    impact: (p) => {
                        p.stats.fame += 4;
                        const rel = p.relationships.find(r => r.id === partner.id);
                        if (rel) rel.closeness -= 10;
                        return {
                            updatedPlayer: p,
                            log: "The engagement stayed high, but so did the tension at home.",
                            logKey: 'life.event.relationship.publicFeed.public.log',
                        };
                    }
                },
                {
                    label: "Curate It Better (Watch Ad)",
                    labelKey: 'life.event.relationship.publicFeed.curate.label',
                    isGolden: true,
                    description: "Share less, control more, and make it look effortless.",
                    descriptionKey: 'life.event.relationship.publicFeed.curate.description',
                    impact: (p) => {
                        p.stats.fame += 3;
                        p.stats.reputation += 4;
                        const rel = p.relationships.find(r => r.id === partner.id);
                        if (rel) rel.closeness += 6;
                        return {
                            updatedPlayer: p,
                            log: "You found a balance between mystery and visibility. Rare win.",
                            logKey: 'life.event.relationship.publicFeed.curate.log',
                        };
                    }
                }
            ]
        };
    }

    // 5.6 BUSINESS OWNER DECISION
    if (hasBusiness && roll < 0.88) {
        const business = pick(player.businesses);
        const investment = Math.max(25000, Math.floor((business.stats.valuation || 100000) * 0.03));
        const formattedInvestment = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(investment);
        return {
            id: `business_push_${Date.now()}`,
            type: 'LIFE',
            title: "Growth Opportunity",
            titleKey: 'life.event.business.growth.title',
            description: `${business.name} has an opportunity to upgrade operations and sharpen its image. It will cost ${formattedInvestment}.`,
            descriptionKey: 'life.event.business.growth.description',
            textVars: { business: business.name, investment: formattedInvestment },
            options: [
                {
                    label: "Reinvest in the Business",
                    labelKey: 'life.event.business.growth.reinvest.label',
                    impact: (p) => {
                        p.money -= investment;
                        const target = p.businesses.find(b => b.id === business.id);
                        if (target) {
                            target.stats.brandHealth = Math.min(100, target.stats.brandHealth + 8);
                            target.stats.customerSatisfaction = Math.min(100, target.stats.customerSatisfaction + 6);
                            target.stats.hype = Math.min(100, target.stats.hype + 10);
                            target.balance += Math.floor(investment * 0.5);
                        }
                        return {
                            updatedPlayer: p,
                            log: `You doubled down on ${business.name}. The team feels momentum building.`,
                            logKey: 'life.event.business.growth.reinvest.log',
                            logVars: { business: business.name },
                        };
                    }
                },
                {
                    label: "Save the Cash",
                    labelKey: 'life.event.business.growth.save.label',
                    impact: (p) => ({
                        updatedPlayer: p,
                        log: `You passed on the upgrade and kept ${business.name} stable for now.`,
                        logKey: 'life.event.business.growth.save.log',
                        logVars: { business: business.name },
                    })
                },
                {
                    label: "Find a Sponsor (Watch Ad)",
                    labelKey: 'life.event.business.growth.sponsor.label',
                    isGolden: true,
                    description: "Bring in outside support and reduce your personal risk.",
                    descriptionKey: 'life.event.business.growth.sponsor.description',
                    impact: (p) => {
                        const target = p.businesses.find(b => b.id === business.id);
                        if (target) {
                            target.stats.brandHealth = Math.min(100, target.stats.brandHealth + 10);
                            target.stats.hype = Math.min(100, target.stats.hype + 14);
                            target.balance += Math.floor(investment * 0.75);
                        }
                        p.stats.reputation += 3;
                        return {
                            updatedPlayer: p,
                            log: `A sponsor came in at the perfect time. ${business.name} just got a clean boost.`,
                            logKey: 'life.event.business.growth.sponsor.log',
                            logVars: { business: business.name },
                        };
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
            titleKey: 'life.event.luxury.temptation.title',
            description: "A showroom offers you a flashy limited-edition purchase before it goes public. It's expensive, unnecessary, and almost impossible to resist.",
            descriptionKey: 'life.event.luxury.temptation.description',
            options: [
                {
                    label: "Buy It",
                    labelKey: 'life.event.luxury.temptation.buy.label',
                    impact: (p) => {
                        p.money -= 75000;
                        p.stats.fame += 3;
                        p.stats.happiness += 5;
                        return {
                            updatedPlayer: p,
                            log: "You bought the ridiculous luxury item and immediately posted a suspiciously casual photo with it.",
                            logKey: 'life.event.luxury.temptation.buy.log',
                        };
                    }
                },
                {
                    label: "Walk Away",
                    labelKey: 'life.event.luxury.temptation.walk.label',
                    impact: (p) => {
                        p.stats.happiness += 1;
                        p.stats.reputation += 2;
                        return {
                            updatedPlayer: p,
                            log: "You resisted the flex. Financial maturity is deeply unglamorous.",
                            logKey: 'life.event.luxury.temptation.walk.log',
                        };
                    }
                },
                {
                    label: "Borrow It for a Shoot (Watch Ad)",
                    labelKey: 'life.event.luxury.temptation.borrow.label',
                    isGolden: true,
                    description: "Get the image without eating the full cost.",
                    descriptionKey: 'life.event.luxury.temptation.borrow.description',
                    impact: (p) => {
                        p.stats.fame += 4;
                        p.stats.reputation += 2;
                        return {
                            updatedPlayer: p,
                            log: "You captured the status hit without swallowing the full bill. Elite move.",
                            logKey: 'life.event.luxury.temptation.borrow.log',
                        };
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
                titleKey: 'life.event.early.sideHustle.title',
                description: "You're struggling to pay rent. A local theater needs an usher for a month. It pays $2,000, but it'll take up your evenings.",
                descriptionKey: 'life.event.early.sideHustle.description',
                options: [
                    {
                        label: "Take the Job ($2k)",
                        labelKey: 'life.event.early.sideHustle.job.label',
                        impact: (p) => {
                            p.money += 2000;
                            spendPlayerEnergy(p, 10, 'Life event: Side hustle');
                            return {
                                updatedPlayer: p,
                                log: "You're working as an usher. It's tiring, but the bills are paid.",
                                logKey: 'life.event.early.sideHustle.job.log',
                            };
                        }
                    },
                    {
                        label: "Focus on Auditions",
                        labelKey: 'life.event.early.sideHustle.auditions.label',
                        impact: (p) => {
                            p.stats.experience += 5;
                            return {
                                updatedPlayer: p,
                                log: "You spent your time practicing. You're getting better, but your wallet is light.",
                                logKey: 'life.event.early.sideHustle.auditions.log',
                            };
                        }
                    },
                    {
                        label: "The 'Viral' Audition (Watch Ad)",
                        labelKey: 'life.event.early.sideHustle.viral.label',
                        isGolden: true,
                        description: "Post your practice monologue online. Might get you noticed.",
                        descriptionKey: 'life.event.early.sideHustle.viral.description',
                        impact: (p) => {
                            p.stats.fame += 5;
                            p.stats.followers += 1000;
                            return {
                                updatedPlayer: p,
                                log: "Your monologue went viral! You're starting to get some attention.",
                                logKey: 'life.event.early.sideHustle.viral.log',
                            };
                        }
                    }
                ]
            };
        } else {
            return {
                id: `early_class_${Date.now()}`,
                type: 'EARLY_LIFE',
                title: "Acting Workshop",
                titleKey: 'life.event.early.workshop.title',
                description: "A famous acting coach is in town for a one-day workshop. It costs $1,000, but the knowledge is invaluable.",
                descriptionKey: 'life.event.early.workshop.description',
                options: [
                    {
                        label: "Attend Workshop ($1k)",
                        labelKey: 'life.event.early.workshop.attend.label',
                        impact: (p) => {
                            p.money -= 1000;
                            p.stats.talent += 5;
                            p.stats.skills.delivery += 2;
                            p.stats.skills.expression += 2;
                            return {
                                updatedPlayer: p,
                                log: "The workshop was amazing! You feel much more confident in your craft.",
                                logKey: 'life.event.early.workshop.attend.log',
                            };
                        }
                    },
                    {
                        label: "Skip It",
                        labelKey: 'life.event.early.workshop.skip.label',
                        impact: (p) => ({
                            updatedPlayer: p,
                            log: "You decided to save your money. Maybe next time.",
                            logKey: 'life.event.early.workshop.skip.log',
                        })
                    },
                    {
                        label: "The 'Scholarship' (Watch Ad)",
                        labelKey: 'life.event.early.workshop.scholarship.label',
                        isGolden: true,
                        description: "Convince the coach to let you in for free. Best of both worlds.",
                        descriptionKey: 'life.event.early.workshop.scholarship.description',
                        impact: (p) => {
                            p.stats.talent += 8;
                            p.stats.skills.delivery += 3;
                            return {
                                updatedPlayer: p,
                                log: "You charmed the coach into a free spot! You learned even more than expected.",
                                logKey: 'life.event.early.workshop.scholarship.log',
                            };
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
                titleKey: 'life.event.family.emergency.title',
                description: "Your cousin is asking for a $50,000 loan to start a 'sure-fire' business. You know he's not great with money.",
                descriptionKey: 'life.event.family.emergency.description',
                options: [
                    {
                        label: "Give the Money ($50k)",
                        labelKey: 'life.event.family.emergency.give.label',
                        impact: (p) => {
                            p.money -= 50000;
                            const rel = p.relationships.find(r => r.relation !== 'Deceased Parent' && (r.name === 'Family' || r.relation === 'Parent'));
                            if (rel) rel.closeness += 20;
                            return {
                                updatedPlayer: p,
                                log: "You gave him the money. He's thrilled, but you're skeptical.",
                                logKey: 'life.event.family.emergency.give.log',
                            };
                        }
                    },
                    {
                        label: "Refuse",
                        labelKey: 'life.event.family.emergency.refuse.label',
                        impact: (p) => {
                            const rel = p.relationships.find(r => r.relation !== 'Deceased Parent' && (r.name === 'Family' || r.relation === 'Parent'));
                            if (rel) rel.closeness -= 15;
                            return {
                                updatedPlayer: p,
                                log: "You said no. Family dinner is going to be awkward.",
                                logKey: 'life.event.family.emergency.refuse.log',
                            };
                        }
                    },
                    {
                        label: "Hire Him as Assistant (Watch Ad)",
                        labelKey: 'life.event.family.emergency.hire.label',
                        isGolden: true,
                        description: "Give him a job instead of a loan. Keeps him busy and safe.",
                        descriptionKey: 'life.event.family.emergency.hire.description',
                        impact: (p) => {
                            p.stats.reputation += 2;
                            return {
                                updatedPlayer: p,
                                log: "You hired him as a junior assistant. He's working hard for once!",
                                logKey: 'life.event.family.emergency.hire.log',
                            };
                        }
                    }
                ]
            };
        } else {
            return {
                id: `life_pet_${Date.now()}`,
                type: 'LIFE',
                title: "A New Companion?",
                titleKey: 'life.event.family.pet.title',
                description: "You're at a shelter and see a dog that looks just like your childhood pet. Adopting it would be a big responsibility.",
                descriptionKey: 'life.event.family.pet.description',
                options: [
                    {
                        label: "Adopt the Dog ($5k)",
                        labelKey: 'life.event.family.pet.adopt.label',
                        impact: (p) => {
                            p.money -= 5000;
                            p.stats.happiness += 25;
                            return {
                                updatedPlayer: p,
                                log: "You adopted the dog! Your home feels much warmer now.",
                                logKey: 'life.event.family.pet.adopt.log',
                            };
                        }
                    },
                    {
                        label: "Just Donate ($1k)",
                        labelKey: 'life.event.family.pet.donate.label',
                        impact: (p) => {
                            p.money -= 1000;
                            p.stats.reputation += 5;
                            p.stats.happiness += 5;
                            return {
                                updatedPlayer: p,
                                log: "You donated to the shelter. You feel good about helping out.",
                                logKey: 'life.event.family.pet.donate.log',
                            };
                        }
                    },
                    {
                        label: "The 'Rescue' Campaign (Watch Ad)",
                        labelKey: 'life.event.family.pet.rescue.label',
                        isGolden: true,
                        description: "Adopt the dog and launch a social media campaign for the shelter.",
                        descriptionKey: 'life.event.family.pet.rescue.description',
                        impact: (p) => {
                            p.stats.happiness += 30;
                            p.stats.reputation += 15;
                            p.stats.followers += 10000;
                            return {
                                updatedPlayer: p,
                                log: "The campaign was a massive hit! You're the face of animal rescue now.",
                                logKey: 'life.event.family.pet.rescue.log',
                            };
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
            titleKey: 'life.event.family.pressure.title',
            description: `${closeFamily.name} says you've changed and only show up when cameras or awards are involved. The accusation lands harder than expected.`,
            descriptionKey: 'life.event.family.pressure.description',
            textVars: { name: closeFamily.name },
            options: [
                {
                    label: "Make Time Immediately",
                    labelKey: 'life.event.family.pressure.time.label',
                    impact: (p) => {
                        p.stats.happiness += 6;
                        const rel = p.relationships.find(r => r.id === closeFamily.id && r.relation !== 'Deceased Parent');
                        if (rel) rel.closeness += 10;
                        return {
                            updatedPlayer: p,
                            log: "You cleared the schedule and showed up in person. It mattered.",
                            logKey: 'life.event.family.pressure.time.log',
                        };
                    }
                },
                {
                    label: "Send Money Instead",
                    labelKey: 'life.event.family.pressure.money.label',
                    impact: (p) => {
                        p.money -= 25000;
                        const rel = p.relationships.find(r => r.id === closeFamily.id && r.relation !== 'Deceased Parent');
                        if (rel) rel.closeness += 2;
                        return {
                            updatedPlayer: p,
                            log: "The gesture helped, but everyone knew it wasn't the same as being there.",
                            logKey: 'life.event.family.pressure.money.log',
                        };
                    }
                },
                {
                    label: "Ignore the Guilt",
                    labelKey: 'life.event.family.pressure.ignore.label',
                    impact: (p) => {
                        p.stats.reputation -= 2;
                        const rel = p.relationships.find(r => r.id === closeFamily.id && r.relation !== 'Deceased Parent');
                        if (rel) rel.closeness -= 10;
                        return {
                            updatedPlayer: p,
                            log: "You told yourself they would understand. They did not.",
                            logKey: 'life.event.family.pressure.ignore.log',
                        };
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

    const advanceCase = (p: Player, c: LegalCase) => {
        const language = getPlayerLanguage(p);
        if (c.currentHearing >= c.totalHearings) {
            const won = c.playerDefense >= c.evidenceStrength;
            c.status = won ? 'WON' : 'LOST';
            if (won) {
                p.stats.reputation = Math.min(100, p.stats.reputation + 3);
                p.news.unshift({
                    id: `news_case_won_${Date.now()}`,
                    headline: t(language, 'services.lifeEvent.legal.news.wonHeadline', { playerName: p.name, caseTitle: c.title }),
                    subtext: t(language, 'services.lifeEvent.legal.news.wonSubtext'),
                    category: 'YOU',
                    week: p.currentWeek,
                    year: p.age,
                    impactLevel: 'MEDIUM'
                });
            } else {
                const penalty = Math.max(5000, Math.floor((c.evidenceStrength - c.playerDefense + 20) * 900));
                p.money -= penalty;
                p.stats.reputation = Math.max(0, p.stats.reputation - 8);
                p.news.unshift({
                    id: `news_case_lost_${Date.now()}`,
                    headline: t(language, 'services.lifeEvent.legal.news.lostHeadline', { playerName: p.name, caseTitle: c.title }),
                    subtext: t(language, 'services.lifeEvent.legal.news.lostSubtext', { penalty: `$${penalty.toLocaleString()}` }),
                    category: 'YOU',
                    week: p.currentWeek,
                    year: p.age,
                    impactLevel: 'HIGH'
                });
            }
            p.news = p.news.slice(0, 50);
        } else {
            c.currentHearing += 1;
            c.nextHearingWeek = p.currentWeek >= 52 ? 1 : p.currentWeek + 1;
        }
    };

    return {
        id: `hearing_${activeCase.id}_${activeCase.currentHearing}`,
        type: 'LEGAL',
        title: `${activeCase.title}: Hearing #${activeCase.currentHearing}`,
        titleKey: 'life.event.legal.hearing.title',
        description: `You are in court for the ${activeCase.currentHearing === 1 ? 'first' : 'next'} hearing. The judge asks: "Where were you on the night of the incident?"`,
        descriptionKey: activeCase.currentHearing === 1 ? 'life.event.legal.hearing.firstDescription' : 'life.event.legal.hearing.nextDescription',
        textVars: { caseTitle: activeCase.title, hearing: activeCase.currentHearing },
        options: [
            {
                label: "Tell the Truth",
                labelKey: 'life.event.legal.hearing.truth.label',
                impact: (p) => {
                    const c = p.flags.activeCases.find((ac: LegalCase) => ac.id === caseId);
                    c.playerDefense += 10;
                    c.history.push({ hearing: c.currentHearing, choice: 'TRUTH' });
                    advanceCase(p, c);
                    return {
                        updatedPlayer: p,
                        log: "You told the truth. The jury seems to believe you.",
                        logKey: 'life.event.legal.hearing.truth.log',
                    };
                }
            },
            {
                label: "Lie / Alibi",
                labelKey: 'life.event.legal.hearing.lie.label',
                impact: (p) => {
                    const c = p.flags.activeCases.find((ac: LegalCase) => ac.id === caseId);
                    c.evidenceStrength += 15;
                    c.history.push({ hearing: c.currentHearing, choice: 'LIE' });
                    advanceCase(p, c);
                    return {
                        updatedPlayer: p,
                        log: "You lied. It felt risky, but it might work.",
                        logKey: 'life.event.legal.hearing.lie.log',
                    };
                }
            },
            {
                label: "The 'Star' Defense (Watch Ad)",
                labelKey: 'life.event.legal.hearing.star.label',
                isGolden: true,
                description: "Use your charisma and fame to charm the judge. Safest path.",
                descriptionKey: 'life.event.legal.hearing.star.description',
                impact: (p) => {
                    const c = p.flags.activeCases.find((ac: LegalCase) => ac.id === caseId);
                    c.playerDefense += 30;
                    c.history.push({ hearing: c.currentHearing, choice: 'CHARM' });
                    advanceCase(p, c);
                    return {
                        updatedPlayer: p,
                        log: "You charmed the courtroom. The judge is smiling at you.",
                        logKey: 'life.event.legal.hearing.star.log',
                    };
                }
            }
        ]
    };
};
