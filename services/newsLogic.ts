
import { GameLanguage, Player, NewsItem, NewsCategory, ActiveRelease, Commitment, ProjectType, BudgetTier, RightsDealType } from '../types';
import { NPC_DATABASE } from './npcLogic';
import { STUDIO_CATALOG } from './studioLogic';
import { getAwardGossipTemplate, getAwardSnubTemplate } from './awardLogic';
import { normalizeUniverseMap } from './universeLogic';
import { getPlayerLanguage, t } from './i18n';

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const NEWS_VARIANT_SEPARATOR = ' || ';
const pickNewsVariant = (language: GameLanguage, key: string, vars: Record<string, string | number> = {}) =>
    pick(t(language, key, vars).split(NEWS_VARIANT_SEPARATOR));
const hasPublishedReleaseNews = (rel: ActiveRelease, key: string): boolean =>
    Array.isArray(rel.generatedNewsKeys) && rel.generatedNewsKeys.includes(key);

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
        if (rel.weekNum === 1) {
            const budget = rel.budget;
            const gross = rel.weeklyGross[0];
            
            if (gross > budget * 0.5) {
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
            if (rel.imdbRating >= 8.5) {
                const newsKey = `news_crit_high_${rel.id}`;
                if (hasPublishedReleaseNews(rel, newsKey)) return;
                const isUniverse = rel.projectDetails.universeId != null;
                news.push({
                    id: newsKey,
                    headline: pickNewsVariant(language, isUniverse ? 'services.news.release.criticLoved.universeHeadline' : 'services.news.release.criticLoved.headline', { title: rel.name }),
                    subtext: t(language, 'services.news.release.criticLoved.subtext', { rating: rel.imdbRating }),
                    category: 'TOP_STORY', week, year, impactLevel: 'MEDIUM'
                });
            } else if (rel.imdbRating <= 4.0) {
                const newsKey = `news_crit_low_${rel.id}`;
                if (hasPublishedReleaseNews(rel, newsKey)) return;
                const isUniverse = rel.projectDetails.universeId != null;
                news.push({
                    id: newsKey,
                    headline: pickNewsVariant(language, isUniverse ? 'services.news.release.criticHated.universeHeadline' : 'services.news.release.criticHated.headline', { title: rel.name }),
                    subtext: t(language, 'services.news.release.criticHated.subtext'),
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

    // Find if player has a studio with universes
    const studio = player.businesses?.find(b => b.type === 'PRODUCTION_HOUSE');
    if (studio && player.world?.universes) {
        const universes = Object.values(normalizeUniverseMap(player.world.universes || {})).filter(u => u.studioId === studio.id);
        if (universes.length > 0 && Math.random() < 0.4) { // 40% chance per week if they have a universe
            const randomUniverse = pick(universes);
            const headline = t(language, 'services.news.universe.background.headline', { universeName: randomUniverse.name });
            news.push({
                id: `news_uni_buzz_${Date.now()}`,
                headline,
                category: 'UNIVERSE',
                week, year, impactLevel: 'MEDIUM'
            });
        }
    }

    return news;
};

export const generateWeeklyNews = (player: Player): NewsItem[] => {
    const topStories = generateTopStories(player);
    const industry = generateIndustryNews(player);
    const personal = generatePersonalNews(player);
    const universe = generateUniverseNews(player);

    const all = [...topStories, ...personal, ...industry, ...universe];
    return all;
};
