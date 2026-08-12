
import { GameLanguage, Player, NewsItem, NewsCategory, ActiveRelease, Commitment, ProjectType, BudgetTier, RightsDealType, XPost, CastStoryArchetype } from '../types';
import { NPC_DATABASE } from './npcLogic';
import { STUDIO_CATALOG } from './studioLogic';
import { getAwardGossipTemplate, getAwardSnubTemplate } from './awardLogic';
import { buildUniverseRoster, getUniverseDashboardProjects, normalizeUniverseMap } from './universeLogic';
import { getPlayerLanguage, t } from './i18n';
import { getCriticTradeNarrative, getOpeningTradeNarrative } from './releaseMediaNarrative';
import { inferStoryCompass } from './characterIdentityLogic';
import { getCastStoryRead } from './characterStoryFit';

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const NEWS_VARIANT_SEPARATOR = ' || ';
const pickNewsVariant = (language: GameLanguage, key: string, vars: Record<string, string | number> = {}) =>
    pick(t(language, key, vars).split(NEWS_VARIANT_SEPARATOR));
const hasPublishedReleaseNews = (rel: ActiveRelease, key: string): boolean =>
    Array.isArray(rel.generatedNewsKeys) && rel.generatedNewsKeys.includes(key);
const stableRoll = (seed: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
        hash ^= seed.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
};

// ... (Generate Personal News, Top Stories, Industry News functions remain same)

const generatePersonalNews = (player: Player): NewsItem[] => {
    const news: NewsItem[] = [];
    const week = player.currentWeek;
    const year = player.age;
    const language = getPlayerLanguage(player);

    player.commitments.forEach(c => {
        if (c.type === 'ACTING_GIG' && c.projectDetails) {
            if (c.projectPhase === 'PRODUCTION' && c.phaseWeeksLeft === c.totalPhaseDuration) {
                const headline = t(language, 'services.news.personal.signing.headline', { title: c.name });
                const subtext = c.roleType === 'LEAD'
                    ? t(language, 'services.news.personal.signing.subtext.lead')
                    : t(language, 'services.news.personal.signing.subtext.supporting');
                news.push({
                    id: `news_you_sign_${c.id}`, headline, subtext, category: 'YOU', week, year, impactLevel: 'MEDIUM'
                });
            }
        }
    });

    return news;
};

const generateTopStories = (player: Player): NewsItem[] => {
    const news: NewsItem[] = [];
    const week = player.currentWeek;
    const year = player.age;
    const language = getPlayerLanguage(player);

    player.activeReleases.forEach(rel => {
        // A release is created at week 1 and its first theatrical accounting
        // pass advances it to week 2 before news is generated. Support both
        // values so the opening story is never silently skipped.
        if (rel.weekNum === 1 || rel.weekNum === 2) {
            const budget = rel.budget;
            const gross = rel.weeklyGross[0];

            const contextualOpeningStory = getOpeningTradeNarrative(player, rel);
            if (contextualOpeningStory) {
                const newsKey = `news_bo_context_${rel.id}`;
                if (hasPublishedReleaseNews(rel, newsKey)) return;
                news.push({
                    id: newsKey,
                    headline: contextualOpeningStory.headline,
                    subtext: contextualOpeningStory.subtext,
                    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
                });
            } else if (gross > budget * 0.5) {
                const newsKey = `news_bo_hit_${rel.id}`;
                if (hasPublishedReleaseNews(rel, newsKey)) return;
                const isUniverse = rel.projectDetails.universeId != null;
                news.push({
                    id: newsKey,
                    headline: pickNewsVariant(language, isUniverse ? 'services.news.release.hit.universeHeadline' : 'services.news.release.hit.headline', { title: rel.name }),
                    subtext: t(language, 'services.news.release.hit.subtext', { gross: (gross / 1000000).toFixed(1) }),
                    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
                });
            } else if (gross < budget * 0.15 && rel.projectDetails.budgetTier !== 'LOW') {
                const newsKey = `news_bo_flop_${rel.id}`;
                if (hasPublishedReleaseNews(rel, newsKey)) return;
                const isUniverse = rel.projectDetails.universeId != null;
                news.push({
                    id: newsKey,
                    headline: pickNewsVariant(language, isUniverse ? 'services.news.release.flop.universeHeadline' : 'services.news.release.flop.headline', { title: rel.name }),
                    subtext: t(language, 'services.news.release.flop.subtext', { gross: (gross / 1000000).toFixed(1) }),
                    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
                });
            } else if (rel.projectDetails.budgetTier === 'HIGH') {
                const newsKey = `news_bo_open_${rel.id}`;
                if (hasPublishedReleaseNews(rel, newsKey)) return;
                news.push({
                    id: newsKey,
                    headline: t(language, 'services.news.release.open.headline', { title: rel.name }),
                    subtext: t(language, 'services.news.release.open.subtext', { genre: rel.projectDetails.genre }),
                    category: 'TOP_STORY', week, year, impactLevel: 'MEDIUM'
                });
            }
        }
        if (rel.weekNum === 2 && rel.imdbRating) {
            const contextualCriticStory = getCriticTradeNarrative(player, rel);
            if (rel.imdbRating >= 8.5) {
                const newsKey = `news_crit_high_${rel.id}`;
                if (hasPublishedReleaseNews(rel, newsKey)) return;
                const isUniverse = rel.projectDetails.universeId != null;
                news.push({
                    id: newsKey,
                    headline: contextualCriticStory?.headline || pickNewsVariant(language, isUniverse ? 'services.news.release.criticLoved.universeHeadline' : 'services.news.release.criticLoved.headline', { title: rel.name }),
                    subtext: contextualCriticStory?.subtext || t(language, 'services.news.release.criticLoved.subtext', { rating: rel.imdbRating }),
                    category: 'TOP_STORY', week, year, impactLevel: 'MEDIUM'
                });
            } else if (rel.imdbRating <= 4.0) {
                const newsKey = `news_crit_low_${rel.id}`;
                if (hasPublishedReleaseNews(rel, newsKey)) return;
                const isUniverse = rel.projectDetails.universeId != null;
                news.push({
                    id: newsKey,
                    headline: contextualCriticStory?.headline || pickNewsVariant(language, isUniverse ? 'services.news.release.criticHated.universeHeadline' : 'services.news.release.criticHated.headline', { title: rel.name }),
                    subtext: contextualCriticStory?.subtext || t(language, 'services.news.release.criticHated.subtext'),
                    category: 'TOP_STORY', week, year, impactLevel: 'MEDIUM'
                });
            }
        }
    });

    return news;
};

const generateIndustryNews = (player: Player): NewsItem[] => {
    const news: NewsItem[] = [];
    const week = player.currentWeek;
    const year = player.age;
    const language = getPlayerLanguage(player);

    if (Math.random() < 0.2) {
        news.push({
            id: `news_ind_trend_${Date.now()}`,
            headline: pickNewsVariant(language, 'services.news.industry.trend'),
            category: 'INDUSTRY', week, year, impactLevel: 'LOW'
        });
    }

    if (Math.random() < 0.3) {
        const npc = pick(NPC_DATABASE);
        const headline = pickNewsVariant(language, 'services.news.industry.npc', { name: npc.name });
        news.push({
            id: `news_ind_npc_${Date.now()}`,
            headline: headline,
            category: 'INDUSTRY', week, year, impactLevel: 'LOW'
        });
    }

    // --- NEW: AWARD GOSSIP INJECTION ---
    const pendingCeremony = player.scheduledEvents.find(e => e.type === 'AWARD_CEREMONY');
    if (pendingCeremony) {
        if (Math.random() < 0.6) { // High chance during season
            const template = Math.random() > 0.3 ? getAwardGossipTemplate(language) : getAwardSnubTemplate(language);
            // Replace placeholders
            const rival = pick(NPC_DATABASE);
            const awardName = pendingCeremony.title;
            const headline = template
                .replace('{Player}', player.name)
                .replace('{Rival}', rival.name)
                .replace('{Award}', awardName);
            
            news.push({
                id: `news_gossip_${Date.now()}`,
                headline: headline,
                category: 'INDUSTRY',
                week, year,
                impactLevel: 'MEDIUM',
                subtext: t(language, 'award.gossip.subtext')
            });
        }
    }

    if (Math.random() < 0.1) {
        const studio = pick(Object.values(STUDIO_CATALOG));
        news.push({
            id: `news_ind_studio_${Date.now()}`,
            headline: t(language, 'services.news.industry.studioReshuffle.headline', { studioName: studio.name }),
            category: 'INDUSTRY', week, year, impactLevel: 'MEDIUM'
        });
    }

    // --- NEW: SCANDAL & LEGAL NEWS ---
    if (player.activeCases && player.activeCases.length > 0) {
        if (Math.random() < 0.7) {
            news.push({
                id: `news_legal_active_${Date.now()}`,
                headline: pickNewsVariant(language, 'services.news.legal.headline', { name: player.name }),
                category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
            });
        }
    }

    if (player.heat > 30 && Math.random() < (player.heat / 100)) {
        news.push({
            id: `news_scandal_active_${Date.now()}`,
            headline: pickNewsVariant(language, 'services.news.scandal.headline', { name: player.name }),
            category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
        });
    }

    return news;
};

// ... (Exported Helpers)
export const generateSequelHypeNews = (title: string, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_hype_${Date.now()}`,
    headline: pickNewsVariant(language, 'services.news.sequel.hype.headline', { title }),
    category: 'TOP_STORY', week, year, impactLevel: 'MEDIUM'
});
export const generateSequelConfirmedNews = (title: string, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_sequel_yes_${Date.now()}`,
    headline: pickNewsVariant(language, 'services.news.sequel.confirmed.headline', { title }),
    subtext: t(language, 'services.news.sequel.confirmed.subtext'),
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});
export const generateSequelCancelledNews = (title: string, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_sequel_no_${Date.now()}`,
    headline: t(language, 'services.news.sequel.cancelled.headline', { title }),
    category: 'INDUSTRY', week, year, impactLevel: 'MEDIUM'
});
export const generateNegotiationFailNews = (title: string, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_negot_fail_${Date.now()}`,
    headline: t(language, 'services.news.sequel.negotiationFail.headline', { title }),
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});
export const generateFanBacklashNews = (title: string, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_backlash_${Date.now()}`,
    headline: t(language, 'services.news.sequel.fanBacklash.headline', { title }),
    subtext: t(language, 'services.news.sequel.fanBacklash.subtext'),
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});

export const generateRightsAcquisitionNews = (
    studioName: string,
    title: string,
    dealType: RightsDealType,
    week: number,
    year: number,
    language: GameLanguage = 'en',
): NewsItem => {
    const dealLabel = dealType === 'OPTION'
        ? t(language, 'services.news.rightsAcquisition.deal.option')
        : dealType === 'LICENSE'
            ? t(language, 'services.news.rightsAcquisition.deal.license')
            : dealType === 'CATALOG_PURCHASE'
                ? t(language, 'services.news.rightsAcquisition.deal.catalogPurchase')
                : t(language, 'services.news.rightsAcquisition.deal.buyout');
    return {
        id: `news_rights_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${week}`,
        headline: t(language, 'services.news.rightsAcquisition.headline', { studioName, title, dealLabel }),
        subtext: t(language, 'services.news.rightsAcquisition.subtext'),
        category: 'INDUSTRY',
        week,
        year,
        impactLevel: dealType === 'BUYOUT' || dealType === 'CATALOG_PURCHASE' ? 'HIGH' : 'MEDIUM',
    };
};

// NEW EXPORTS FOR TV
export const generateRenewalNews = (title: string, season: number, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_renew_${Date.now()}`,
    headline: t(language, 'services.news.tv.renewal.headline', { title, season }),
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});

export const generateCancellationNews = (title: string, season: number, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_cancel_${Date.now()}`,
    headline: t(language, 'services.news.tv.cancellation.headline', { title, season }),
    category: 'INDUSTRY', week, year, impactLevel: 'MEDIUM'
});

export const generateForbesNews = (player: Player, currentRank: number, prevRank: number | undefined): NewsItem[] => {
    const news: NewsItem[] = [];
    const week = player.currentWeek;
    const year = player.age;
    const language = getPlayerLanguage(player);

    if (prevRank === undefined) {
        if (currentRank <= 100) {
             news.push({
                id: `news_forbes_entry_${Date.now()}`,
                headline: t(language, 'services.news.forbes.entry.headline', { name: player.name, rank: currentRank }),
                subtext: t(language, 'services.news.forbes.entry.subtext'),
                category: 'YOU', week, year, impactLevel: 'HIGH'
            });
        }
        return news;
    }

    const diff = prevRank - currentRank;

    if (currentRank === 1 && prevRank !== 1) {
        news.push({
            id: `news_forbes_one_${Date.now()}`,
            headline: t(language, 'services.news.forbes.numberOne.headline', { name: player.name }),
            category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
        });
        return news;
    }

    if (currentRank <= 10 && prevRank > 10) {
        news.push({
            id: `news_forbes_top10_${Date.now()}`,
            headline: t(language, 'services.news.forbes.top10.headline', { name: player.name }),
            category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
        });
        return news;
    }

    if (diff >= 5) {
        news.push({
            id: `news_forbes_rise_${Date.now()}`,
            headline: t(language, 'services.news.forbes.rise.headline', { name: player.name, rank: currentRank }),
            category: 'YOU', week, year, impactLevel: 'MEDIUM'
        });
    }
    
    if (diff <= -5) {
        news.push({
            id: `news_forbes_drop_${Date.now()}`,
            headline: t(language, 'services.news.forbes.drop.headline', { name: player.name, rank: currentRank }),
            category: 'YOU', week, year, impactLevel: 'LOW'
        });
    }

    return news;
};

export const generateForbesIndustryNews = (week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_forbes_ind_${Date.now()}`,
    headline: t(language, 'services.news.forbes.industry.headline'),
    category: 'INDUSTRY', week, year, impactLevel: 'LOW'
});

export const generateScandalNews = (name: string, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_scandal_${Date.now()}`,
    headline: pickNewsVariant(language, 'services.news.scandal.headline', { name }),
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});

export const generateLegalNews = (name: string, week: number, year: number, language: GameLanguage = 'en'): NewsItem => ({
    id: `news_legal_${Date.now()}`,
    headline: pickNewsVariant(language, 'services.news.legal.headline', { name }),
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});

const generateUniverseNews = (player: Player): NewsItem[] => {
    const news: NewsItem[] = [];
    const week = player.currentWeek;
    const year = player.age;
    const language = getPlayerLanguage(player);

    if (!player.world?.universes) return news;

    const ownedStudioIds = new Set(
        (player.businesses || [])
            .filter(business => business.type === 'PRODUCTION_HOUSE')
            .map(business => business.id)
    );
    const universes = Object.values(normalizeUniverseMap(player.world.universes || {}))
        .filter(universe => ownedStudioIds.has(universe.studioId));

    player.activeReleases
        .filter(release => release.projectDetails?.universeId && (release.weekNum === 1 || release.weekNum === 2))
        .forEach(release => {
            const universe = universes.find(candidate => candidate.id === release.projectDetails.universeId);
            if (!universe) return;
            const newsKey = `news_uni_cast_${release.id}`;
            if (hasPublishedReleaseNews(release, newsKey)) return;
            const compass = release.projectDetails.storyCompass || inferStoryCompass(release.projectDetails, 'CANON');
            const castRead = getCastStoryRead(compass, release.projectDetails.castList || []);
            news.push({
                id: newsKey,
                headline: t(language, `services.news.universe.cast.${castRead.archetype}.headline`, {
                    title: release.name,
                    universeName: universe.name,
                }),
                subtext: t(language, `services.news.universe.cast.${castRead.archetype}.subtext`, {
                    title: release.name,
                    universeName: universe.name,
                    read: castRead.summary,
                }),
                category: 'UNIVERSE',
                week,
                year,
                impactLevel: castRead.balanceScore >= 78 || castRead.balanceScore < 52 ? 'HIGH' : 'MEDIUM',
                projectId: release.id,
                universeId: universe.id,
            });
        });

    if (universes.length > 0 && stableRoll(`${year}:${week}:universe-background`) < 0.34) {
        const universeIndex = Math.floor(stableRoll(`${year}:${week}:universe-choice`) * universes.length);
        const selectedUniverse = universes[Math.min(universes.length - 1, universeIndex)];
        const projects = getUniverseDashboardProjects(player, selectedUniverse.id, player.activeReleases || []);
        const roster = buildUniverseRoster(selectedUniverse, projects, player.name, language);
        const recastCount = roster.filter(character => character.status === 'RECAST').length;
        const villainCount = roster.filter(character => character.storyRole === 'VILLAIN').length;
        const angle = recastCount > 0
            ? 'RECAST'
            : selectedUniverse.momentum >= 72
                ? 'MOMENTUM'
                : selectedUniverse.momentum <= 35
                    ? 'DIRECTION'
                    : villainCount === 0 && projects.length >= 2
                        ? 'THREAT'
                        : 'NEXT_CHAPTER';
        news.push({
            id: `news_uni_buzz_${selectedUniverse.id}_${year}_${week}`,
            headline: t(language, `services.news.universe.background.${angle}.headline`, {
                universeName: selectedUniverse.name,
            }),
            subtext: t(language, `services.news.universe.background.${angle}.subtext`, {
                universeName: selectedUniverse.name,
                recasts: recastCount,
            }),
            category: 'UNIVERSE',
            week,
            year,
            impactLevel: angle === 'DIRECTION' || angle === 'RECAST' ? 'MEDIUM' : 'LOW',
            universeId: selectedUniverse.id,
        });
    }

    return news;
};

const universeSocialCopy = (
    archetype: CastStoryArchetype | undefined,
    title: string,
    headline: string | undefined,
) => {
    if (archetype === 'HERO_TEAM_VS_VILLAIN') return `${title} really said assemble everybody and give them ONE threat to fear. That matchup has event-movie energy. #UniverseWatch`;
    if (archetype === 'VILLAIN_LED') return `${title} letting the villain own the point of view? Risky, messy, and exactly why everyone is talking. #VillainEra`;
    if (archetype === 'RIVALS') return `${title} understands that a great universe needs rivals who make each other better. #ChooseYourSide`;
    if (archetype === 'ENSEMBLE') return `${title} is treating the whole team like the main character. The lineup discourse has begun. #UniverseWatch`;
    if (archetype === 'HERO_VS_VILLAIN') return `${title} keeps the pitch clean: one hero, one villain, nowhere to hide. #FinalShowdown`;
    return `${headline || title} The next chapter already has fans mapping every connection. #UniverseWatch`;
};

export const generateUniverseSocialReactions = (player: Player): XPost[] => (
    (player.activeReleases || [])
        .filter(release => release.projectDetails?.universeId && (release.weekNum === 1 || release.weekNum === 2))
        .slice(0, 2)
        .map((release, index) => ({
            id: `x_uni_cast_${release.id}`,
            authorId: `universe_watch_${index}`,
            authorName: index === 0 ? 'Universe Watch' : 'Canon Central',
            authorHandle: index === 0 ? '@UniverseWatch' : '@CanonCentral',
            authorAvatar: '',
            content: universeSocialCopy(
                release.projectDetails?.hiddenStats?.castStoryArchetype,
                release.name,
                release.projectDetails?.hiddenStats?.castStoryHeadline,
            ),
            timestamp: player.currentWeek,
            likes: 900 + Math.round((release.projectDetails?.hiddenStats?.rawHype || 30) * 47),
            retweets: 120 + Math.round((release.projectDetails?.hiddenStats?.rawHype || 30) * 8),
            replies: 80 + Math.round((release.projectDetails?.hiddenStats?.rawHype || 30) * 5),
            isPlayer: false,
            isLiked: false,
            isRetweeted: false,
            isVerified: true,
            postType: 'FILM_OPINION',
            sentiment: 'INDUSTRY',
        }))
);

export const generateWeeklyNews = (player: Player): NewsItem[] => {
    const topStories = generateTopStories(player);
    const industry = generateIndustryNews(player);
    const personal = generatePersonalNews(player);
    const universe = generateUniverseNews(player);

    const all = [...topStories, ...personal, ...industry, ...universe];
    return all;
};
