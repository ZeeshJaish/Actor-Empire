
// ... existing imports
import React, { useState } from 'react';
import { Player, PastProject, ActiveRelease, CastMember, Review, Award, AwardType, Universe, UniverseId, IndustryProject, CustomPoster, CampaignRealitySnapshot, ProjectDetails, ProjectMusicPlan, BudgetTier, SeasonEpisodeRatings, AudienceReception } from '../../types';
import { formatMoney } from '../../services/formatUtils';
import { getProjectIdentityLabel } from '../../services/genreCatalog';
import { getProjectReleaseLabel, getProjectReleaseTiming } from '../../services/releaseTiming';
import { AWARD_CALENDAR, AwardShowLore, AwardDefinition, Nomination, sanitizeAwardRecords, getAwardCeremonyYear, getAwardShowLore } from '../../services/awardLogic';
import { ArrowLeft, Star, Film, ChevronRight, User, TrendingUp, DollarSign, Eye, Award as AwardIcon, Calendar, BookOpen, Clock, List, MessageSquare, Users, Globe, Zap, LayoutGrid, Shield, ArrowRight, Tv, Music2, Handshake, Mountain, Car, Sparkles } from 'lucide-react';
import { buildUniverseRoster, calculateUniverseProductWeeklyRevenue, getFallbackCharacterName, getUniverseDashboardProjects, getUniverseReleaseActivity, normalizeUniverseForSave, normalizeUniverseMap } from '../../services/universeLogic';
import { calculateProjectMusicImpact, getMusicCreditRoleLabel, getMusicStrategyLabel, getProjectMusicPlan } from '../../services/musicIndustry';
import { getPlayerLanguage, t } from '../../services/i18n';
import { inferSeasonNumber } from '../../services/episodeRatings';
import { CustomPosterImage } from '../../components/CustomPosterImage';
import { resolveProjectType } from '../../services/businessLogic';

interface ImdbAppProps {
  player: Player;
  onBack: () => void;
}

// Unified interface for UI display
interface DisplayProject {
    id: string;
    name: string;
    year: number; // or Release Year
    role: string;
    rating: number; // IMDb
    status: 'ACTIVE' | 'ARCHIVED';
    gross?: number;
    budget?: number;
    description?: string;
    cast?: CastMember[];
    reviews?: Review[];
    audienceReception?: AudienceReception;
    streamingViews?: number; // New
    awards?: any[]; // New
    originalObject: PastProject | ActiveRelease;
    mediaType: 'MOVIE' | 'SERIES';
    customPoster?: CustomPoster;
    campaignRealitySnapshot?: CampaignRealitySnapshot;
    identityLabel: string;
    releaseLabel: string;
    releaseDetailLabel: string;
    musicPlan?: ProjectMusicPlan;
    franchiseId?: string;
    sourceScriptId?: string;
    seasonNumber?: number;
    episodeRatings?: SeasonEpisodeRatings[];
}

type Tab = 'PROFILE' | 'FILMOGRAPHY' | 'AWARDS' | 'FRANCHISES' | 'SEASON'; // Added SEASON
type AwardView = 'HOME' | 'CURRENT' | 'MY_AWARDS' | 'SHOW_DETAIL';

interface SelectedShow extends AwardDefinition {
    year: number;
    isCurrent: boolean;
    hasPassed: boolean; // NEW: Explicit flag passed from list
}

const UNIVERSE_THEMES: Record<string, { color: string, bg: string, border: string, icon: any }> = {
    MCU: { color: 'text-red-500', bg: 'bg-red-600', border: 'border-red-500/35', icon: Zap },
    DCU: { color: 'text-blue-500', bg: 'bg-blue-600', border: 'border-blue-500/35', icon: Shield },
    SW: { color: 'text-yellow-400', bg: 'bg-yellow-500', border: 'border-yellow-400/35', icon: Globe },
    AVATAR: { color: 'text-cyan-300', bg: 'bg-cyan-500', border: 'border-cyan-300/35', icon: Globe },
    MONSTERVERSE: { color: 'text-emerald-300', bg: 'bg-emerald-600', border: 'border-emerald-300/35', icon: Mountain },
    JURASSIC: { color: 'text-lime-300', bg: 'bg-lime-600', border: 'border-lime-300/35', icon: Mountain },
    SPIDER_VERSE: { color: 'text-fuchsia-300', bg: 'bg-fuchsia-600', border: 'border-fuchsia-300/35', icon: Sparkles },
    FAST_SAGA: { color: 'text-orange-300', bg: 'bg-orange-600', border: 'border-orange-300/35', icon: Car },
};

const getPosterBg = (title: string = '') => {
    const colors = [
        'from-red-950 via-red-900 to-black',
        'from-blue-950 via-blue-900 to-black',
        'from-emerald-950 via-emerald-900 to-black',
        'from-purple-950 via-purple-900 to-black',
        'from-amber-950 via-amber-900 to-black',
        'from-rose-950 via-rose-900 to-black',
        'from-cyan-950 via-cyan-900 to-black',
        'from-indigo-950 via-indigo-900 to-black',
    ];
    const charCode = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[charCode % colors.length];
};

const hasCustomPosterMedia = (customPoster?: CustomPoster): boolean => (
    Boolean(
        (customPoster?.type === 'IMAGE' || customPoster?.type === 'CANVA') &&
        (customPoster.imageData || customPoster.posterMediaId)
    )
);

const getSafeUniversePhaseLabel = (phase: Universe['currentPhase']) => {
    if (typeof phase === 'number') return `Phase ${phase}`;
    if (typeof phase === 'string') {
        const normalized = phase.replace(/_/g, ' ');
        return normalized.replace('PHASE', 'Phase').replace(/\bORIGINS\b/g, 'Origins').replace(/\bEXPANSION\b/g, 'Expansion').replace(/\bWAR\b/g, 'War').replace(/\bMULTIVERSE\b/g, 'Multiverse');
    }
    return 'Phase 1';
};

const getCharacterTimelineText = (char: any) => {
    const first = typeof char?.firstAppearanceTitle === 'string' && char.firstAppearanceTitle.trim()
        ? char.firstAppearanceTitle.trim()
        : '';
    const latest = typeof char?.latestAppearanceTitle === 'string' && char.latestAppearanceTitle.trim()
        ? char.latestAppearanceTitle.trim()
        : '';
    if (first && latest) return `First: ${first} • Latest: ${latest}`;
    if (first) return `Introduced in ${first}`;
    return 'Not introduced on-screen yet';
};

const getCharacterTimelineParts = (char: any) => {
    const first = typeof char?.firstAppearanceTitle === 'string' && char.firstAppearanceTitle.trim()
        ? char.firstAppearanceTitle.trim()
        : '';
    const latest = typeof char?.latestAppearanceTitle === 'string' && char.latestAppearanceTitle.trim()
        ? char.latestAppearanceTitle.trim()
        : '';
    return {
        first: first && !/^unknown$/i.test(first) ? first : '',
        latest: latest && !/^unknown$/i.test(latest) ? latest : ''
    };
};

const getReturnStatusMeta = (status?: 'RETURNING' | 'WRITTEN_OFF' | 'KILLED_OFF') => {
    switch (status) {
        case 'RETURNING':
            return {
                labelKey: 'imdb.project.returnStatus.returning',
                tone: 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300',
                chip: 'bg-emerald-500/15 text-emerald-300'
            };
        case 'WRITTEN_OFF':
            return {
                labelKey: 'imdb.project.returnStatus.writtenOff',
                tone: 'border-amber-500/30 bg-amber-950/30 text-amber-200',
                chip: 'bg-amber-500/15 text-amber-200'
            };
        case 'KILLED_OFF':
            return {
                labelKey: 'imdb.project.returnStatus.killedOff',
                tone: 'border-rose-500/30 bg-rose-950/30 text-rose-200',
                chip: 'bg-rose-500/15 text-rose-200'
            };
        default:
            return null;
    }
};

const inferBudgetTierFromBudget = (budget = 0): BudgetTier => {
    if (budget > 50_000_000) return 'BLOCKBUSTER';
    if (budget > 10_000_000) return 'HIGH';
    if (budget > 2_000_000) return 'MID';
    return 'LOW';
};

const normalizeSeriesTitleKey = (title = '') => title
    .replace(/\bseason\s+\d+\b/gi, '')
    .replace(/\bs\d+\b/gi, '')
    .replace(/[:\-–]+$/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();

const getDisplayProjectSeriesKey = (project: DisplayProject) => {
    const original = project.originalObject as any;
    const details = original.projectDetails || original;
    const franchiseId = details.franchiseId || original.franchiseId;
    const titleKey = normalizeSeriesTitleKey(project.name || details.title || original.name || original.title);
    const sourceScriptId = details.sourceScriptId || original.sourceScriptId;
    return franchiseId
        ? `franchise:${franchiseId}`
        : titleKey
            ? `title:${titleKey}`
            : sourceScriptId
                ? `script:${sourceScriptId}`
                : `project:${project.id}`;
};

const getEpisodeRatingCellTone = (rating: number) => {
    if (rating >= 9.2) return 'bg-emerald-400 text-emerald-950 shadow-[0_0_14px_rgba(52,211,153,0.22)]';
    if (rating >= 8.2) return 'bg-green-500 text-green-950';
    if (rating >= 7.0) return 'bg-lime-400 text-lime-950';
    if (rating >= 5.8) return 'bg-amber-400 text-amber-950';
    if (rating >= 4.5) return 'bg-rose-500 text-white';
    return 'bg-fuchsia-700 text-white';
};

const EpisodeRatingsHeatmap: React.FC<{
    ratings: SeasonEpisodeRatings[];
    tr: (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => string;
}> = ({ ratings, tr }) => {
    const sortedRatings = [...ratings].sort((a, b) => a.season - b.season);
    const maxEpisodes = Math.max(...sortedRatings.map(season => season.episodes.length), 0);
    if (!sortedRatings.length || maxEpisodes === 0) return null;
    const episodeRatingSeasonColumnWidth = '48px';
    const episodeRatingGridMinWidth = `calc(30px + (${sortedRatings.length} * ${episodeRatingSeasonColumnWidth}) + (${sortedRatings.length} * 0.25rem))`;

    const legend = [
        { label: tr('imdb.project.rating.awesome'), className: 'bg-emerald-400' },
        { label: tr('imdb.project.rating.great'), className: 'bg-green-500' },
        { label: tr('imdb.project.rating.good'), className: 'bg-lime-400' },
        { label: tr('imdb.project.rating.regular'), className: 'bg-amber-400' },
        { label: tr('imdb.project.rating.bad'), className: 'bg-rose-500' },
        { label: tr('imdb.project.rating.garbage'), className: 'bg-fuchsia-700' },
    ];

    return (
        <div className="px-3 py-2.5 border-b border-zinc-800 bg-zinc-950">
            <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                    <h3 className="text-white font-bold text-[11px] flex items-center gap-1.5">
                        <LayoutGrid size={12} className="text-emerald-400"/> {tr('imdb.project.episodeRatings')}
                    </h3>
                    <div className="mt-0.5 text-[7px] uppercase tracking-[0.18em] text-zinc-500">
                        {tr('imdb.project.seasonAverage')}
                    </div>
                </div>
                <div className="flex flex-wrap justify-end gap-x-1.5 gap-y-0.5 max-w-[180px]">
                    {legend.map(item => (
                        <div key={item.label} className="flex items-center gap-1 text-[6px] font-bold uppercase tracking-wider text-zinc-500">
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${item.className}`} />
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="episode-rating-season-scroll max-h-[420px] overflow-auto no-scrollbar pb-1 pr-1">
                <div
                    className="grid gap-1 min-w-max"
                    style={{
                        gridTemplateColumns: `30px repeat(${sortedRatings.length}, minmax(42px, ${episodeRatingSeasonColumnWidth}))`,
                        minWidth: episodeRatingGridMinWidth,
                    }}
                >
                    <div />
                    {sortedRatings.map(season => (
                        <div key={`season_head_${season.season}`} className="text-center">
                            <div className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">
                                {tr('imdb.project.seasonShort', { season: season.season })}
                            </div>
                            <div className="mt-0.5 text-[8px] font-mono font-black text-emerald-300">
                                {season.averageRating.toFixed(1)}
                            </div>
                        </div>
                    ))}

                    {Array.from({ length: maxEpisodes }, (_, index) => {
                        const episodeNumber = index + 1;
                        return (
                            <React.Fragment key={`episode_row_${episodeNumber}`}>
                                <div className="h-7 flex items-center justify-end pr-1 text-[9px] font-bold text-zinc-400">
                                    {tr('imdb.project.episodeShort', { episode: episodeNumber })}
                                </div>
                                {sortedRatings.map(season => {
                                    const episode = season.episodes.find(item => item.episode === episodeNumber);
                                    return episode ? (
                                        <div
                                            key={`s${season.season}_e${episodeNumber}`}
                                            className={`h-7 rounded flex items-center justify-center text-xs font-black ${getEpisodeRatingCellTone(episode.rating)}`}
                                        >
                                            {episode.rating.toFixed(1)}
                                        </div>
                                    ) : (
                                        <div key={`s${season.season}_e${episodeNumber}_empty`} className="h-7 rounded border border-zinc-800 bg-zinc-900/40" />
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const getArchivedProjectMusicPlan = (project: PastProject): ProjectMusicPlan | undefined => {
    if (project.musicPlan?.credits?.length) return project.musicPlan;
    const inferredProject: ProjectDetails = {
        title: project.name,
        type: resolveProjectType(project.projectType, (project as any).type, (project as any).projectDetails?.type),
        description: project.description || '',
        studioId: project.studioId || 'ARTISAN_PICTURES',
        subtype: project.subtype || 'STANDALONE',
        genre: project.genre || 'DRAMA',
        budgetTier: inferBudgetTierFromBudget(project.budget),
        estimatedBudget: project.budget || 0,
        visibleHype: 'MID',
        hiddenStats: {
            scriptQuality: project.projectQuality || 50,
            directorQuality: project.projectQuality || 50,
            castingStrength: 50,
            distributionPower: 50,
            rawHype: 50,
            qualityScore: project.projectQuality || 50,
            prestigeBonus: 0
        },
        directorName: 'Unknown Director',
        visibleDirectorTier: 'Unknown',
        visibleScriptBuzz: 'Unknown',
        visibleCastStrength: 'Unknown',
        targetAudience: 'PG-13'
    };
    return getProjectMusicPlan(inferredProject);
};

export const ImdbApp: React.FC<ImdbAppProps> = ({ player, onBack }) => {
  const [activeTab, setActiveTab] = useState<Tab>('PROFILE');
  const [awardView, setAwardView] = useState<AwardView>('HOME');
  const [creditFilter, setCreditFilter] = useState<'ALL' | 'MOVIE' | 'TV'>('ALL');
  const [selectedProject, setSelectedProject] = useState<DisplayProject | null>(null);
  const [selectedShow, setSelectedShow] = useState<SelectedShow | null>(null);
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null);
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  const awardCategoryKey = (category: string) => category.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const getAwardShowName = (type: AwardDefinition['type']) => tr(`imdb.awards.show.${type}.name`);
  const getAwardShowFocus = (type: AwardDefinition['type']) => tr(`imdb.awards.show.${type}.focus`);
  const getAwardCategoryLabel = (category: string) => tr(`imdb.awards.category.${awardCategoryKey(category)}`);
  const getUniverseSagaLabel = (saga: Universe['saga']) => tr('imdb.franchise.sagaNumber', { saga: Number.isFinite(Number(saga)) ? Number(saga) : 1 });
  const getUniversePhaseLabel = (phase: Universe['currentPhase'] | number) => {
      if (typeof phase === 'number') return tr('imdb.franchise.phaseNumber', { phase });
      if (typeof phase === 'string') {
          const normalized = phase.replace(/_/g, ' ');
          const fallback = normalized.replace('PHASE', 'Phase').replace(/\bORIGINS\b/g, 'Origins').replace(/\bEXPANSION\b/g, 'Expansion').replace(/\bWAR\b/g, 'War').replace(/\bMULTIVERSE\b/g, 'Multiverse');
          const phaseKey = `imdb.franchise.phase.${phase.toLowerCase()}`;
          const localized = tr(phaseKey, { fallback });
          return localized === phaseKey ? fallback : localized;
      }
      return tr('imdb.franchise.phaseNumber', { phase: 1 });
  };
  const getTimelineProjectTypeLabel = (type: string) => {
      if (type === 'MOVIE') return tr('imdb.franchise.projectType.movie');
      if (type === 'SERIES') return tr('imdb.franchise.projectType.series');
      return type;
  };
  const getCharacterStatusLabel = (status: string) => {
      if (status === 'ACTIVE') return tr('imdb.franchise.characterStatus.active');
      if (status === 'RECAST') return tr('imdb.franchise.characterStatus.recast');
      if (status === 'RETIRED') return tr('imdb.franchise.characterStatus.retired');
      return status;
  };
  const getProjectMediaTypeLabel = (mediaType: DisplayProject['mediaType'], mode: 'short' | 'long' = 'long') => {
      if (mediaType === 'SERIES') return tr(mode === 'short' ? 'imdb.project.mediaType.tv' : 'imdb.project.mediaType.series');
      return tr('imdb.project.mediaType.movie');
  };
  const getDisplayProjectDescription = (project: DisplayProject) => {
      const description = (project.description || '').trim();
      if (
          description.includes('Episode Ratings IMDb QA season') ||
          description.includes('Cheat QA prestige series for IMDb episode rating heatmap testing.')
      ) {
          return 'Audience response shifted across the season. Open this credit to see the S1-S3 heatmap.';
      }
      return description || tr('imdb.project.defaultDescription');
  };
  const getCreditFilterLabel = (type: typeof creditFilter) => {
      if (type === 'ALL') return tr('imdb.profile.filter.all');
      if (type === 'MOVIE') return tr('imdb.profile.filter.movies');
      return tr('imdb.profile.filter.tv');
  };
  const getReturnStatusLabel = (labelKey?: string) => labelKey ? tr(labelKey) : '';

  // Check for Active Season (Pending Ceremony)
  const pendingCeremony = player.scheduledEvents.find(e => e.type === 'AWARD_CEREMONY');

  // Helper to calculate weeks until event handling year wrap
  const getWeeksUntil = (targetWeek: number, currentWeek: number) => {
      if (targetWeek >= currentWeek) return targetWeek - currentWeek;
      return (52 - currentWeek) + targetWeek;
  };

  // --- DATA TRANSFORMATION ---
  const releaseFallback = { currentAge: player.age, currentWeek: player.currentWeek };
  const activeList: DisplayProject[] = player.activeReleases.map(r => {
      const timing = getProjectReleaseTiming(r, releaseFallback);
      return {
	          id: r.id, name: r.name, year: timing.releaseYear || player.age, role: r.roleType, rating: r.imdbRating || 0, status: 'ACTIVE' as const,
	          gross: r.totalGross, budget: r.budget, description: r.projectDetails.description, cast: r.projectDetails.castList,
	          reviews: r.projectDetails.reviews, audienceReception: r.audienceReception || r.projectDetails.audienceReception,
              streamingViews: r.streaming?.totalViews, originalObject: r,
		          mediaType: resolveProjectType(r.type, r.projectDetails?.type, (r as any).projectType), customPoster: r.projectDetails.customPoster, identityLabel: getProjectIdentityLabel(r.projectDetails),
	          musicPlan: getProjectMusicPlan(r.projectDetails),
	          franchiseId: r.projectDetails.franchiseId,
	          sourceScriptId: r.projectDetails.sourceScriptId,
	          seasonNumber: inferSeasonNumber(r.projectDetails),
	          episodeRatings: r.projectDetails.episodeRatings,
	          campaignRealitySnapshot: r.projectDetails.campaignRealitySnapshot,
	          releaseLabel: getProjectReleaseLabel(r, releaseFallback),
	          releaseDetailLabel: getProjectReleaseLabel(r, releaseFallback, { includeWeek: true })
	      };
  });

  const pastList: DisplayProject[] = player.pastProjects.map(p => {
      const timing = getProjectReleaseTiming(p, releaseFallback);
      return {
          id: p.id, name: p.name, year: timing.releaseYear || p.year, role: p.roleType || 'Role', rating: p.imdbRating || 0, status: 'ARCHIVED' as const,
	          gross: p.gross, budget: p.budget, description: p.description, cast: p.castList, reviews: p.reviews, audienceReception: p.audienceReception,
              streamingViews: p.totalViews, awards: p.awards, originalObject: p,
		          mediaType: resolveProjectType(p.projectType, (p as any).type, (p as any).projectDetails?.type), customPoster: p.customPoster, identityLabel: getProjectIdentityLabel(p),
	          musicPlan: getArchivedProjectMusicPlan(p),
	          franchiseId: p.franchiseId,
	          sourceScriptId: p.sourceScriptId,
	          seasonNumber: inferSeasonNumber(p),
	          episodeRatings: p.episodeRatings,
	          campaignRealitySnapshot: p.campaignRealitySnapshot,
	          releaseLabel: getProjectReleaseLabel(p, releaseFallback),
	          releaseDetailLabel: getProjectReleaseLabel(p, releaseFallback, { includeWeek: true })
	      };
  }).reverse();

  const fullList = [...activeList, ...pastList];
  
  // Calculate Average Rating
  const ratedProjects = fullList.filter(p => p.rating > 0);
  const avgRating = ratedProjects.length > 0 ? ratedProjects.reduce((acc, p) => acc + p.rating, 0) / ratedProjects.length : 0;

  const knownFor = [...fullList].filter(p => p.role === 'LEAD' || p.role === 'SUPPORTING').sort((a, b) => b.rating - a.rating)[0] || fullList[0];
  const totalBoxOffice = fullList.reduce((acc, p) => acc + (p.gross || 0), 0);
  const imdbRank = Math.max(1, Math.round(101 - Math.min(100, Math.max(0, player.stats.fame || 0))));
  const cleanedAwards: Award[] = sanitizeAwardRecords(player.awards || []);
  const awardsWon = cleanedAwards.filter(a => a.outcome === 'WON');
  const awardsNom = cleanedAwards.filter(a => a.outcome === 'NOMINATED');
  const careerNominations = awardsWon.length + awardsNom.length;
  const awardWinRate = careerNominations > 0 ? Math.round((awardsWon.length / careerNominations) * 100) : 0;
  const musicHeavyProjects = fullList.filter(project => project.musicPlan?.credits?.length);
  const totalSoundtrackRevenue = fullList.reduce((sum, project) => {
      const original = project.originalObject as PastProject | ActiveRelease;
      return sum + ((original as any).soundtrackRevenue || 0);
  }, 0);
  const musicAwardWins = awardsWon.filter(award => /song|score|soundtrack|music video|trailer/i.test(`${award.category || ''} ${award.name || ''}`));

  const filteredCredits = fullList.filter(p => {
      if (creditFilter === 'ALL') return true;
      if (creditFilter === 'MOVIE') return p.mediaType === 'MOVIE';
      if (creditFilter === 'TV') return p.mediaType === 'SERIES';
      return true;
  });


  const formatViews = (val?: number) => {
      if (!val) return '0';
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      return `${(val / 1000).toFixed(0)}k`;
  }

  const buildDisplayAudienceReception = (project: DisplayProject): AudienceReception | undefined => {
      if (!project.rating) return undefined;
      const budget = Math.max(1, Number(project.budget || 1));
      const gross = Math.max(0, Number(project.gross || 0));
      const grossPressure = Math.max(-10, Math.min(18, (gross / budget) * 12));
      const score = Math.round(Math.max(18, Math.min(96, (project.rating * 8.2) + grossPressure + (project.status === 'ACTIVE' ? 3 : 0))));
      const trend: AudienceReception['trend'] = project.status === 'ACTIVE' && gross > budget ? 'RISING' : 'STEADY';
      const label = score >= 82 ? 'Crowd Favorite' : score >= 68 ? 'Strong Word of Mouth' : score >= 50 ? 'Divided Audience' : 'Soft Reaction';
      return {
          openingScore: score,
          currentScore: score,
          trend,
          label,
          summary: project.status === 'ACTIVE'
              ? 'Early viewer reaction is still moving as the release finds its wider audience.'
              : 'Final audience read is locked after the run.',
          sampleSize: Math.max(650, Math.round(Math.max(gross, budget * 0.08) / 3200)),
          updatedWeek: player.currentWeek,
          updatedYear: player.age,
          isFinal: project.status !== 'ACTIVE',
          quotes: [
              {
                  id: `${project.id}_display_quote_1`,
                  author: 'Weekend Crowd',
                  text: score >= 68 ? 'People are recommending this one after the first wave.' : 'The audience is split, but the conversation is active.',
                  sentiment: score >= 68 ? 'POSITIVE' : 'MIXED',
                  rating: Math.max(1, Math.min(5, score / 20)),
                  week: player.currentWeek,
                  year: player.age
              },
              {
                  id: `${project.id}_display_quote_2`,
                  author: 'Film Fan',
                  text: trend === 'RISING' ? 'The later crowd is helping the score climb.' : 'The score is holding close to the opening reaction.',
                  sentiment: trend === 'RISING' ? 'POSITIVE' : 'MIXED',
                  rating: Math.max(1, Math.min(5, score / 21)),
                  week: player.currentWeek,
                  year: player.age
              }
          ]
      };
  };

  const getDisplayCriticReviews = (project: DisplayProject, reviews: Review[]): Review[] => {
      const existing = reviews.filter(Boolean).slice(0, 6);
      if (existing.length >= 5) return existing;

      const rating = Number(project.rating || 0);
      const strong = rating >= 7.8;
      const soft = rating < 6.1;
      const publications = ['Screen Ledger', 'Cinema Wire', 'Frame Journal', 'Box Office Weekly', 'Daily Review', 'The Backlot'];
      const authors = ['Leena Cross', 'Mira Vale', 'Omar Reed', 'Anika Stone', 'Theo Mercer', 'Dev Rao'];
      const positiveLines = [
          `${project.name} understands its audience and lands the big emotional beats.`,
          `A confident ${project.identityLabel.toLowerCase()} release with real crowd energy.`,
          `The package is polished enough to keep viewers talking after the credits.`,
          `It has the kind of momentum that can survive past opening weekend.`
      ];
      const mixedLines = [
          `${project.name} has strong moments, even when the pacing gets uneven.`,
          `A sturdy release with a few rough edges around the middle act.`,
          `The audience hook is clear, though the execution is not always clean.`,
          `It plays well enough, but it leaves some bigger ideas on the table.`
      ];
      const negativeLines = [
          `${project.name} struggles to turn its promise into a full theatrical experience.`,
          `The concept is readable, but the final result feels thin in too many places.`,
          `A few bright pieces cannot fully cover a soft overall package.`,
          `It may find loyal defenders, but the wider response looks limited.`
      ];
      const sentimentPattern: Array<Review['sentiment']> = strong
          ? ['POSITIVE', 'POSITIVE', 'POSITIVE', 'MIXED', 'POSITIVE', 'POSITIVE']
          : soft
              ? ['NEGATIVE', 'MIXED', 'NEGATIVE', 'MIXED', 'NEGATIVE', 'MIXED']
              : ['MIXED', 'POSITIVE', 'MIXED', 'MIXED', 'POSITIVE', 'NEGATIVE'];
      const ratingFor = (sentiment: Review['sentiment'], index: number) => {
          if (sentiment === 'POSITIVE') return Number((4.1 + ((index % 3) * 0.25)).toFixed(1));
          if (sentiment === 'NEGATIVE') return Number((1.7 + ((index % 2) * 0.35)).toFixed(1));
          return Number((2.8 + ((index % 3) * 0.2)).toFixed(1));
      };
      const lineFor = (sentiment: Review['sentiment'], index: number) => {
          if (sentiment === 'POSITIVE') return positiveLines[index % positiveLines.length];
          if (sentiment === 'NEGATIVE') return negativeLines[index % negativeLines.length];
          return mixedLines[index % mixedLines.length];
      };

      const generated = Array.from({ length: 6 - existing.length }, (_, offset) => {
          const index = existing.length + offset;
          const sentiment = sentimentPattern[index % sentimentPattern.length];
          return {
              id: `${project.id}_critic_fallback_${index}`,
              author: authors[index % authors.length],
              publication: publications[index % publications.length],
              text: lineFor(sentiment, index),
              sentiment,
              type: 'CRITIC' as const,
              rating: ratingFor(sentiment, index)
          };
      });

      return [...existing, ...generated].slice(0, 6);
  };

  const getCriticLabel = (score: number) => {
      if (score >= 9.0) return { label: tr('imdb.profile.criticLabel.legend'), color: "text-amber-400" };
      if (score >= 8.0) return { label: tr('imdb.profile.criticLabel.darling'), color: "text-emerald-400" };
      if (score >= 6.0) return { label: tr('imdb.profile.criticLabel.reliable'), color: "text-blue-400" };
      if (score >= 4.0) return { label: tr('imdb.profile.criticLabel.hitOrMiss'), color: "text-zinc-400" };
      return { label: tr('imdb.profile.criticLabel.poison'), color: "text-rose-500" };
  };

  const criticStatus = getCriticLabel(avgRating);

  // --- RENDERERS ---

  const renderCurrentSeason = () => {
      if (!pendingCeremony || !pendingCeremony.data || !pendingCeremony.data.fullBallot) {
          return (
              <div className="text-center py-12 text-zinc-500">
                  <div className="text-4xl mb-2">🏆</div>
                  <div className="font-bold">{tr('imdb.awards.noActiveSeason')}</div>
                  <div className="text-xs mt-1">{tr('imdb.awards.waitForNominations')}</div>
                  <button onClick={() => setActiveTab('AWARDS')} className="mt-4 text-amber-400 text-xs font-bold">{tr('imdb.awards.viewHistory')}</button>
              </div>
          );
      }

      const ballot = pendingCeremony.data.fullBallot as Record<string, Nomination[]>;
      const weeksAway = getWeeksUntil(pendingCeremony.week, player.currentWeek);

      return (
          <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setActiveTab('AWARDS')}><ArrowLeft size={16} className="text-zinc-500"/></button>
                  <h2 className="text-xl font-bold text-white">{tr('imdb.awards.currentNominations')}</h2>
              </div>
              
              <div className="bg-gradient-to-br from-zinc-900 to-black p-4 rounded-xl border border-zinc-800 mb-6 text-center">
                  <h3 className="font-serif font-black text-2xl text-amber-400 mb-1">{pendingCeremony.title}</h3>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-widest">
                      {weeksAway === 0 ? tr('imdb.awards.liveToday') : tr('imdb.awards.liveInWeeks', { weeks: weeksAway })}
                  </div>
              </div>

              {Object.entries(ballot).map(([category, nominees]) => {
                  const isProjectAward = category.includes('Picture') || category.includes('Series') || category.includes('Musical') || category.includes('Film');
                  // Project awards are when the PROJECT ITSELF is the nominee (e.g. Best Picture)
                  // Actor awards are when a PERSON is the nominee
                  const reallyProjectAward = isProjectAward && !category.includes('Actor') && !category.includes('Actress') && !category.includes('Director');

                  return (
                    <div key={category} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="bg-zinc-800/50 p-3 border-b border-zinc-800">
                            <div className="font-bold text-sm text-zinc-200">{getAwardCategoryLabel(category)}</div>
                        </div>
                        <div className="divide-y divide-zinc-800">
                            {nominees.map((nom) => (
                                <div key={`${nom.project.id}-${nom.nomineeName || 'player'}`} className={`p-3 flex justify-between items-center ${nom.isPlayer ? 'bg-amber-900/20' : ''}`}>
                                    <div>
                                        {/* TOP LINE: The "Winner" Name (Project Title OR Person Name) */}
                                        <div className={`text-sm ${reallyProjectAward ? 'font-bold italic text-zinc-200' : (nom.isPlayer ? 'font-bold text-amber-400' : 'font-bold text-zinc-300')}`}>
                                            {reallyProjectAward ? nom.project.name : (nom.isPlayer ? player.name : nom.nomineeName)}
                                        </div>
                                        {/* BOTTOM LINE: Context (Producers OR Project Title) */}
                                        <div className="text-[10px] text-zinc-500">
                                            {reallyProjectAward ? tr('imdb.awards.producers') : nom.project.name}
                                        </div>
                                    </div>
                                    {nom.isPlayer && <div className="text-[9px] bg-amber-500 text-black px-2 py-0.5 rounded font-bold uppercase">{tr('imdb.awards.you')}</div>}
                                </div>
                            ))}
                        </div>
                        {(musicHeavyProjects.length > 0 || totalSoundtrackRevenue > 0 || musicAwardWins.length > 0) && (
                            <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-950/20 p-3">
                                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                                    <Music2 size={13}/> {tr('imdb.awards.music.legacy')}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="rounded-xl bg-black/35 p-2 text-center">
                                        <div className="text-lg font-black text-white">{musicHeavyProjects.length}</div>
                                        <div className="text-[8px] uppercase tracking-widest text-zinc-500">{tr('imdb.awards.music.credits')}</div>
                                    </div>
                                    <div className="rounded-xl bg-black/35 p-2 text-center">
                                        <div className="text-sm font-black text-emerald-300 truncate">{formatMoney(totalSoundtrackRevenue)}</div>
                                        <div className="text-[8px] uppercase tracking-widest text-zinc-500">{tr('imdb.awards.music.soundtrack')}</div>
                                    </div>
                                    <div className="rounded-xl bg-black/35 p-2 text-center">
                                        <div className="text-lg font-black text-amber-300">{musicAwardWins.length}</div>
                                        <div className="text-[8px] uppercase tracking-widest text-zinc-500">{tr('imdb.awards.music.wins')}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                  );
              })}
          </div>
      );
  };

  const renderShowDetail = () => {
      if (!selectedShow) return null;
      
      const lore = getAwardShowLore(language, selectedShow.type as AwardType);
      const playerResults = player.awards.filter(a => a.type === selectedShow.type && a.year === selectedShow.year);
      // Use the passed flag or fallback to history presence
      const historyEntry = player.world.awardHistory?.find(h => h.year === selectedShow.year && h.type === selectedShow.type);
      
      const isCompleted = selectedShow.hasPassed || !!historyEntry;
      const selectedShowName = getAwardShowName(selectedShow.type);
      
      const pendingEvent = player.scheduledEvents.find(e => e.type === 'AWARD_CEREMONY' && e.title === selectedShow.name && e.data?.awardYear === selectedShow.year);
      const ballot = (pendingEvent && pendingEvent.data && pendingEvent.data.fullBallot) ? (pendingEvent.data.fullBallot as Record<string, Nomination[]>) : null;

      return (
          <div className="space-y-6">
              <button onClick={() => setAwardView('HOME')} className="flex items-center gap-1 text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 hover:text-white">
                  <ArrowLeft size={12}/> {tr('imdb.awards.backToAwards')}
              </button>

              <div className="text-center pb-6 border-b border-zinc-800">
                  <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase mb-3 ${lore.color} bg-white/5`}>
                      {tr('imdb.awards.focusEvent', { focus: getAwardShowFocus(lore.id) })}
                  </div>
                  <h2 className="text-3xl font-serif font-bold text-white mb-1">{selectedShowName}</h2>
                  <div className="text-sm text-zinc-500 font-mono">{tr('imdb.awards.edition', { year: selectedShow.year })}</div>
                  {!isCompleted && ballot && <div className="text-[10px] text-amber-500 mt-2 animate-pulse font-bold uppercase tracking-widest">{tr('imdb.awards.nominationsRevealed')}</div>}
              </div>

              <div className="space-y-4">
                  {lore.categories.map((cat) => {
                      const playerResult = playerResults.find(r => r.category === cat);
                      const actualWinner = historyEntry?.winners.find(w => w.category === cat);
                      const pendingNominees = ballot ? ballot[cat] : [];
                      
                      const isProjectAward = cat.includes('Picture') || cat.includes('Series') || cat.includes('Musical') || cat.includes('Film');
                      const reallyProjectAward = isProjectAward && !cat.includes('Actor') && !cat.includes('Actress') && !cat.includes('Director');

                      return (
                          <div key={cat} className={`rounded-xl border overflow-hidden ${playerResult ? (playerResult.outcome === 'WON' ? 'bg-amber-900/10 border-amber-500/50' : 'bg-zinc-800 border-zinc-700') : 'bg-zinc-900 border-zinc-800'}`}>
                              <div className="p-4 border-b border-zinc-800/50">
                                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{getAwardCategoryLabel(cat)}</div>
                              </div>
                              
                              {isCompleted ? (
                                  <div className="p-4 flex items-center gap-3">
                                      {actualWinner ? (
                                          <>
                                              <AwardIcon size={20} className={actualWinner.isPlayer ? "text-amber-400 fill-amber-400" : "text-zinc-600"}/>
                                              <div>
                                                  <div className={`font-bold text-sm ${actualWinner.isPlayer ? 'text-white' : 'text-zinc-300'}`}>
                                                      {reallyProjectAward ? actualWinner.projectName : actualWinner.winnerName}
                                                      {!reallyProjectAward && <span className="text-zinc-500 font-normal"> - {actualWinner.projectName}</span>}
                                                  </div>
                                                  <div className="text-[10px] text-zinc-500">{tr('imdb.awards.result.winner')}</div>
                                              </div>
                                          </>
                                      ) : (
                                          <div className="text-xs text-zinc-600 italic">{tr('imdb.awards.winnersArchived')}</div>
                                      )}
                                  </div>
                              ) : (
                                  <div>
                                      {pendingNominees && pendingNominees.length > 0 ? (
                                          <div className="divide-y divide-zinc-800/50">
                                              {pendingNominees.map((nom) => (
                                                  <div key={`${nom.project.id}-${nom.nomineeName || 'player'}`} className={`p-3 flex justify-between items-center ${nom.isPlayer ? 'bg-amber-500/10' : ''}`}>
                                                      <div className="text-xs">
                                                          <span className={reallyProjectAward ? 'font-bold italic text-zinc-200' : (nom.isPlayer ? 'text-amber-200 font-bold' : 'text-zinc-300')}>
                                                              {reallyProjectAward ? nom.project.name : (nom.isPlayer ? player.name : nom.nomineeName)}
                                                          </span>
                                                          <span className="text-zinc-500 ml-2 italic">{reallyProjectAward ? tr('imdb.awards.producers') : nom.project.name}</span>
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      ) : (
                                          <div className="p-4 text-xs text-zinc-600 italic">{tr('imdb.awards.nominationsPending')}</div>
                                      )}
                                  </div>
                              )}

                              {playerResult && playerResult.outcome === 'NOMINATED' && !playerResult.outcome.includes('WON') && isCompleted && (
                                  <div className="p-3 bg-white/5 text-xs text-zinc-400 flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div> {tr('imdb.awards.youWereNominated')}
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  const renderAwardsHome = () => (
      <div className="space-y-6">
          <div className="space-y-2">
              <h3 className="text-yellow-400 font-bold uppercase tracking-widest text-xs border-l-2 border-yellow-400 pl-2">{tr('imdb.awards.currentSeason')}</h3>
              
              {pendingCeremony && (
                  <div onClick={() => setActiveTab('SEASON')} className="bg-gradient-to-r from-amber-900/40 to-black p-4 rounded-xl border border-amber-500/30 flex items-center justify-between cursor-pointer mb-4">
                      <div>
                          <div className="font-bold text-amber-400 text-sm flex items-center gap-2"><AwardIcon size={14} fill="currentColor"/> {pendingCeremony.data?.awardDef?.type ? getAwardShowName(pendingCeremony.data.awardDef.type) : pendingCeremony.title}</div>
                          <div className="text-[10px] text-zinc-400">
                              {tr('imdb.awards.nominationsAnnounced', { weeks: getWeeksUntil(pendingCeremony.week, player.currentWeek) })}
                          </div>
                      </div>
                      <ChevronRight size={16} className="text-amber-400"/>
                  </div>
              )}

              <div className="space-y-2">
                  {Object.entries(AWARD_CALENDAR).map(([weekStr, def]) => {
                      const ceremonyWeek = parseInt(weekStr);
                      const isPending = pendingCeremony && pendingCeremony.title === def.name;
                      const displayYear = isPending && pendingCeremony?.data?.awardYear
                          ? pendingCeremony.data.awardYear
                          : getAwardCeremonyYear(def, ceremonyWeek, player.age, player.currentWeek);
                      
                      // Robust check for passed events, handling year wrap
                      const isWrapAround = def.inviteWeek > ceremonyWeek; 
                      let hasPassed = false;
                      
                      if (isWrapAround) {
                          // e.g. GG (Invite 50, Ceremony 2)
                          // Passed if we are between Wk 3 and Wk 49 (inclusive-ish)
                          if (player.currentWeek > ceremonyWeek && player.currentWeek <= def.inviteWeek) {
                              hasPassed = true;
                          }
                      } else {
                          // e.g. Oscars (Invite 6, Ceremony 10)
                          // Passed if we are > 10 (until reset at year end)
                          if (player.currentWeek > ceremonyWeek) {
                              hasPassed = true;
                          }
                      }
                      
                      return (
                          <div key={def.type} onClick={() => { setSelectedShow({ ...def, year: displayYear, isCurrent: true, hasPassed }); setAwardView('SHOW_DETAIL'); }} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center justify-between active:bg-zinc-800 transition-colors">
                              <div>
                                  <div className="font-bold text-white text-sm">{getAwardShowName(def.type)}</div>
                                  <div className={`text-[10px] uppercase font-bold tracking-wider mt-1 ${isPending ? 'text-amber-400' : hasPassed ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                      {isPending ? tr('imdb.awards.status.pending') : hasPassed ? tr('imdb.awards.status.completed') : tr('imdb.awards.status.upcoming', { week: ceremonyWeek })}
                                  </div>
                              </div>
                              <ChevronRight size={16} className="text-zinc-600"/>
                          </div>
                      );
                  })}
              </div>
          </div>

          <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-white text-lg">{tr('imdb.awards.myAwards')}</h3>
                  <button onClick={() => setAwardView('MY_AWARDS')} className="text-xs text-blue-400 font-bold">{tr('imdb.awards.viewAll')}</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-3 rounded-xl border border-zinc-800 text-center">
                      <div className="text-2xl font-mono font-bold text-amber-400">{awardsWon.length}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{tr('imdb.awards.wins')}</div>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-zinc-800 text-center">
                      <div className="text-2xl font-mono font-bold text-zinc-400">{careerNominations}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{tr('imdb.awards.totalNominations')}</div>
                      <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-zinc-600">{tr('imdb.awards.nominationsIncludesWins')}</div>
                  </div>
              </div>
              {careerNominations > 0 && (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-white/5 bg-black/25 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      <span>{tr('imdb.awards.winRate')}</span>
                      <span className="font-mono text-amber-300">{awardWinRate}%</span>
                  </div>
              )}
          </div>
      </div>
  );

  const renderMyAwards = () => {
      const grouped: Partial<Record<AwardType, Award[]>> = {};
      cleanedAwards.forEach(a => {
          if (!grouped[a.type]) grouped[a.type] = [];
          grouped[a.type]!.push(a);
      });

      return (
          <div className="space-y-6">
              <button onClick={() => setAwardView('HOME')} className="flex items-center gap-1 text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 hover:text-white">
                  <ArrowLeft size={12}/> {tr('imdb.awards.back')}
              </button>
              <h2 className="text-2xl font-bold text-white mb-4">{tr('imdb.awards.careerAchievements')}</h2>
              
              {Object.keys(grouped).length === 0 ? (
                  <div className="text-center py-12 text-zinc-600">{tr('imdb.awards.empty')}</div>
              ) : (
                  Object.entries(grouped).map(([showType, awards]) => (
                      <div key={showType} className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
                          <h3 className="font-bold text-white border-b border-zinc-800 pb-2 mb-3">{getAwardShowName(showType as AwardType)}</h3>
                          <div className="space-y-3">
                              {awards.map(award => (
                                  <div key={award.id} className="flex items-start gap-3">
                                      <div className={`mt-0.5 ${award.outcome === 'WON' ? 'text-amber-400' : 'text-zinc-500'}`}>
                                          <AwardIcon size={16} fill={award.outcome === 'WON' ? 'currentColor' : 'none'}/>
                                      </div>
                                      <div>
                                          <div className={`text-sm font-bold ${award.outcome === 'WON' ? 'text-white' : 'text-zinc-400'}`}>
                                              {getAwardCategoryLabel(award.category)}
                                          </div>
                                          <div className="text-xs text-zinc-500">
                                              {award.projectName} • {tr('imdb.awards.year', { year: award.year })}
                                          </div>
                                      </div>
                                      {award.outcome === 'WON' && <div className="ml-auto text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded uppercase">{tr('imdb.awards.result.won')}</div>}
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))
              )}
          </div>
      );
  };

  const renderFranchiseList = () => {
      const universes = Object.values(normalizeUniverseMap(player.world?.universes || {})) as Universe[];
      
      const allUniverses = [...universes].sort((a, b) => (b.brandPower || 0) - (a.brandPower || 0));

      return (
          <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4 px-1">{tr('imdb.franchise.title')}</h2>
              {allUniverses.map(uni => {
                  const theme = UNIVERSE_THEMES[uni.id] || { color: 'text-zinc-400', bg: 'bg-zinc-700', border: 'border-zinc-700', icon: Film };
                  const Icon = theme.icon;
                  const rosterCount = buildUniverseRoster(
                      uni,
                      getUniverseDashboardProjects(player, uni.id, player.activeReleases),
                      player.name
                  ).filter(character => character.status !== 'RETIRED').length;
                  return (
                      <div key={uni.id} onClick={() => setSelectedUniverse(normalizeUniverseForSave(uni, uni.id))} className={`bg-zinc-900 rounded-2xl overflow-hidden border ${theme.border} relative group cursor-pointer`}>
                          <div className={`h-24 ${theme.bg} opacity-20 relative`}><div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent"></div></div>
                          <div className="p-5 relative -mt-10">
                              <div className={`w-14 h-14 rounded-xl ${theme.bg} flex items-center justify-center shadow-lg mb-3 text-white`}><Icon size={28} /></div>
                              <div className="flex justify-between items-start">
                                  <div>
                                      <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-1">{uni.name}</h3>
                                      <div className={`text-[10px] font-bold uppercase tracking-widest ${theme.color}`}>
                                          {uni.currentPhaseName || tr('imdb.franchise.na')}
                                      </div>
                                  </div>
                                  <div className="bg-zinc-800 px-2 py-1 rounded text-[10px] text-zinc-400 border border-zinc-700">
                                      {uni.currentSagaName || tr('imdb.franchise.na')}
                                  </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center"><div className="text-xs text-zinc-500"><span className="text-white font-bold">{rosterCount}</span> {tr('imdb.franchise.activeHeroes', { count: rosterCount })}</div><div className="flex items-center gap-1 text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">{tr('imdb.franchise.viewDossier')} <ArrowRight size={14}/></div></div>
                          </div>
                      </div>
                  );
              })}
          </div>
      );
  };

  const renderUniverseDetail = () => {
      if (!selectedUniverse) return null;
      const currentUniverse = normalizeUniverseForSave(player.world?.universes?.[selectedUniverse.id] || selectedUniverse, selectedUniverse.id);
      const theme = UNIVERSE_THEMES[currentUniverse.id] || { color: 'text-white', bg: 'bg-zinc-700', border: 'border-zinc-700', icon: Globe };
      const worldMovies = (Array.isArray(player.world?.projects) ? player.world.projects : []).filter(p => p?.universeId === currentUniverse.id);
      const playerPastMovies = (Array.isArray(player.pastProjects) ? player.pastProjects : []).filter(p => p?.universeId === currentUniverse.id);
      const playerActiveMovies = (Array.isArray(player.activeReleases) ? player.activeReleases : []).filter(p => p?.projectDetails?.universeId === currentUniverse.id);
      const playerUniverseProjects = getUniverseDashboardProjects(player, currentUniverse.id, player.activeReleases || []);
      const normalizedRoster = buildUniverseRoster(currentUniverse, playerUniverseProjects, player.name);

      const canonProjects = [
          ...worldMovies.map(m => ({
              id: m.id,
              title: m.title || tr('imdb.franchise.untitledRelease'),
              year: Number.isFinite(Number(m.year)) ? Number(m.year) : player.age,
              genre: m.genre || 'UNKNOWN',
              boxOffice: Number.isFinite(Number(m.boxOffice)) ? Number(m.boxOffice) : 0,
              rating: Number.isFinite(Number((m as any).imdbRating)) ? Number((m as any).imdbRating) : Number.isFinite(Number(m.quality)) ? Math.max(1, Math.min(10, Number(m.quality) / 10)) : 0,
              isPlayer: false,
              isReleased: true
          })),
          ...playerPastMovies.map(m => ({
              id: m.id,
              title: m.name || tr('imdb.franchise.untitledRelease'),
              year: Number.isFinite(Number(m.year)) ? Number(m.year) : player.age,
              genre: m.genre || 'UNKNOWN',
              boxOffice: Number.isFinite(Number(m.gross)) ? Number(m.gross) : 0,
              rating: Number.isFinite(Number(m.imdbRating)) ? Number(m.imdbRating) : 0,
              isPlayer: true,
              isReleased: true
          })),
          ...playerActiveMovies.map(m => ({
              id: m.id,
              title: m.name || tr('imdb.franchise.untitledRelease'),
              year: player.age,
              genre: m.projectDetails?.genre || 'UNKNOWN',
              boxOffice: Number.isFinite(Number(m.totalGross)) ? Number(m.totalGross) : 0,
              rating: Number.isFinite(Number(m.imdbRating)) ? Number(m.imdbRating) : 0,
              isPlayer: true,
              isReleased: false
          }))
      ].sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
      const recentMovies = canonProjects.slice(0, 10);
      const totalGross = canonProjects.reduce((sum, movie) => sum + (movie.boxOffice || 0), 0);
      const ratedCanonProjects = canonProjects.filter(project => project.isReleased && project.rating > 0);
      const averageRating = ratedCanonProjects.length > 0
          ? ratedCanonProjects.reduce((sum, project) => sum + (project.rating || 0), 0) / ratedCanonProjects.length
          : 0;
      const lifetimeLicensing = currentUniverse.stats?.lifetimeRevenue || 0;
      const licensingActivity = getUniverseReleaseActivity(player, currentUniverse, player.activeReleases || []);
      const projectedLicensing = (currentUniverse.products || [])
          .filter((product: any) => product?.active !== false)
          .reduce((sum: number, product: any) => sum + Math.floor(calculateUniverseProductWeeklyRevenue(currentUniverse, product) * licensingActivity.multiplier), 0);
      const hasLicenses = (currentUniverse.products || []).some((product: any) => product?.active !== false);
      const licensingValue = lifetimeLicensing > 0
          ? formatMoney(lifetimeLicensing)
          : projectedLicensing > 0
              ? tr('imdb.franchise.perWeek', { amount: formatMoney(projectedLicensing) })
              : hasLicenses
                  ? tr('imdb.franchise.dormant')
                  : tr('imdb.franchise.noLicense');
      const fanApproval = normalizedRoster.length > 0
          ? normalizedRoster.reduce((sum, character) => sum + (character.fanApproval || 0), 0) / normalizedRoster.length
          : 0;
      const topCharacter = [...normalizedRoster].sort((a, b) => (b.fanApproval || 0) - (a.fanApproval || 0))[0];
      const recastCount = normalizedRoster.filter(character => character.status === 'RECAST').length;
      const timelineProjects = [
          ...worldMovies.map(movie => ({
              id: movie.id,
              title: movie.title || tr('imdb.franchise.untitledRelease'),
              year: Number.isFinite(Number(movie.year)) ? Number(movie.year) : player.age,
              type: 'MOVIE' as const,
              source: 'WORLD' as const,
              universeSagaName: currentUniverse.currentSagaName || getUniverseSagaLabel(currentUniverse.saga),
              universePhaseName: currentUniverse.currentPhaseName || getUniversePhaseLabel(currentUniverse.currentPhase)
          })),
          ...playerUniverseProjects
      ].sort((a, b) => Number(a.year || 0) - Number(b.year || 0));
      const timeline = timelineProjects.reduce((acc, project) => {
          const sagaName = project.universeSagaName || currentUniverse.currentSagaName || getUniverseSagaLabel(1);
          const phaseName = project.universePhaseName || currentUniverse.currentPhaseName || getUniversePhaseLabel(1);
          if (!acc[sagaName]) acc[sagaName] = {};
          if (!acc[sagaName][phaseName]) acc[sagaName][phaseName] = [];
          acc[sagaName][phaseName].push(project);
          return acc;
      }, {} as Record<string, Record<string, typeof timelineProjects>>);

      return (
          <div className="space-y-6 pb-20">
              <div className="flex items-center justify-between mb-2"><button onClick={() => setSelectedUniverse(null)} className="flex items-center gap-1 text-xs text-zinc-500 font-bold uppercase tracking-wider hover:text-white"><ArrowLeft size={12}/> {tr('imdb.franchise.allFranchises')}</button></div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 ${theme.bg}`}></div>
                  <div className="text-center">
                      <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-1">{currentUniverse.name}</h2>
                      <div className={`text-xs font-bold uppercase tracking-widest ${theme.color} mb-2`}>{currentUniverse.currentSagaName || getUniverseSagaLabel(currentUniverse.saga)}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6">{currentUniverse.currentPhaseName || getUniversePhaseLabel(currentUniverse.currentPhase)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      {[
                          [tr('imdb.franchise.metric.totalGross'), formatMoney(totalGross)],
                          [tr('imdb.franchise.metric.avgImdb'), averageRating > 0 ? averageRating.toFixed(1) : '-'],
                          [tr('imdb.franchise.metric.characters'), `${normalizedRoster.length}`],
                          [tr('imdb.franchise.metric.licensing'), licensingValue]
                      ].map(([label, value]) => (
                          <div key={label} className="bg-black/40 p-3 rounded-xl border border-zinc-800">
                              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{label}</div>
                              <div className="text-xl font-mono font-bold text-white">{value}</div>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">{tr('imdb.franchise.fanScore')}</p>
                      <p className="text-lg font-black text-white">{fanApproval > 0 ? `${Math.round(fanApproval)}%` : '-'}</p>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">{tr('imdb.franchise.fanFavorite')}</p>
                      <p className="text-sm font-black text-white truncate">{topCharacter?.name || '-'}</p>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">{tr('imdb.franchise.recasts')}</p>
                      <p className={`text-lg font-black ${recastCount > 0 ? 'text-amber-400' : 'text-white'}`}>{recastCount}</p>
                  </div>
              </div>

              <div>
                  <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3 pl-2">{tr('imdb.franchise.canonTimeline')}</h3>
                  {Object.keys(timeline).length === 0 ? (
                      <div className="text-center py-8 text-zinc-600 text-xs italic">{tr('imdb.franchise.noCanonTimeline')}</div>
                  ) : (
                      <div className="space-y-4">
                          {Object.entries(timeline).map(([sagaName, phases]) => (
                              <div key={sagaName} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                  <h4 className="text-sm font-black text-yellow-400 uppercase tracking-widest mb-3">{sagaName}</h4>
                                  <div className="space-y-4">
                                      {Object.entries(phases).map(([phaseName, projects]) => (
                                          <div key={phaseName} className="border-l border-zinc-800 pl-3">
                                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{phaseName}</p>
                                              <div className="space-y-2">
                                                  {projects.map(project => (
                                                      <div key={project.id} className="flex justify-between items-center bg-black/30 rounded-xl p-3">
                                                          <div className="min-w-0">
                                                              <p className="text-sm font-bold text-white truncate">{project.title}</p>
                                                              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{project.year} • {getTimelineProjectTypeLabel(project.type)}</p>
                                                          </div>
                                                          {project.source === 'ACTIVE' && <span className="text-[8px] font-black bg-blue-500/15 text-blue-300 px-2 py-1 rounded uppercase">{tr('imdb.franchise.filming')}</span>}
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              <div>
                  <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3 pl-2">{tr('imdb.franchise.characterDossiers')}</h3>
                  <div className="grid grid-cols-1 gap-3">
                      {normalizedRoster.map((char) => {
                          const timeline = getCharacterTimelineParts(char);
                          return (
                              <div key={char.id || char.name} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                  <div className="flex justify-between items-start gap-3">
                                      <div className="min-w-0 flex-1">
                                          <div className="font-bold text-white text-sm truncate">{char.name}</div>
                                          <div className="text-xs text-zinc-500 truncate">
                                              {tr('imdb.franchise.playedBy', { actor: '' })}<span className={char.actorId === player.id || char.actorId === 'PLAYER_SELF' ? 'text-amber-400 font-bold' : 'text-zinc-300'}>{char.actorId === player.id || char.actorId === 'PLAYER_SELF' ? tr('imdb.franchise.you') : char.actorName}</span>
                                          </div>
                                      </div>
                                      <div className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded uppercase ${char.status === 'ACTIVE' ? 'bg-emerald-900/30 text-emerald-500' : char.status === 'RECAST' ? 'bg-amber-500/15 text-amber-300' : 'bg-zinc-800 text-zinc-500'}`}>{getCharacterStatusLabel(char.status)}</div>
                                  </div>
                                  <div className="mt-3 grid grid-cols-1 gap-1.5 text-[10px] uppercase tracking-widest">
                                      <div className="flex gap-2 min-w-0">
                                          <span className="text-zinc-600 shrink-0">{tr('imdb.franchise.first')}</span>
                                          <span className="text-zinc-400 truncate">{timeline.first || tr('imdb.franchise.notIntroduced')}</span>
                                      </div>
                                      <div className="flex gap-2 min-w-0">
                                          <span className="text-zinc-600 shrink-0">{tr('imdb.franchise.latest')}</span>
                                          <span className="text-zinc-400 truncate">{timeline.latest || timeline.first || tr('imdb.franchise.noRelease')}</span>
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 mt-3">
                                      <div className="bg-black/30 rounded-xl p-2">
                                          <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{tr('imdb.franchise.approval')}</p>
                                          <p className="text-sm font-black text-white">{Math.round(char.fanApproval || 0)}%</p>
                                      </div>
                                      <div className="bg-black/30 rounded-xl p-2">
                                          <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{tr('imdb.franchise.appearances')}</p>
                                          <p className="text-sm font-black text-white">{Math.max(0, char.appearances || 0)}</p>
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
              <div><h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3 pl-2">{tr('imdb.franchise.recentReleases')}</h3><div className="space-y-3">{recentMovies.length === 0 ? (<div className="text-center py-8 text-zinc-600 text-xs italic">{tr('imdb.franchise.noRecentReleases')}</div>) : (recentMovies.map(movie => (<div key={movie.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center"><div><div className="font-bold text-white text-sm flex items-center gap-2">{movie.title} {movie.isPlayer && <span className="bg-amber-500/20 text-amber-500 text-[8px] px-1 rounded">{tr('imdb.franchise.you')}</span>}</div><div className="text-xs text-zinc-500">{movie.year} • {movie.genre}</div></div><div className={`font-mono text-xs font-bold ${movie.boxOffice > 500000000 ? 'text-emerald-400' : 'text-zinc-400'}`}>${(Math.max(0, movie.boxOffice) / 1000000).toFixed(0)}M</div></div>)))}</div></div>
          </div>
      );
  };

  // --- MAIN APP STRUCTURE ---
  if (selectedProject) {
    const futurePotential = (selectedProject.originalObject as ActiveRelease | PastProject).futurePotential;
    const selectedProjectMusicDetails = ((selectedProject.originalObject as ActiveRelease).projectDetails || selectedProject.originalObject) as ProjectDetails;
    const selectedProjectMusicImpact = selectedProject.musicPlan?.credits?.length
        ? calculateProjectMusicImpact({ ...selectedProjectMusicDetails, musicPlan: selectedProject.musicPlan }, selectedProject.musicPlan)
        : undefined;
    const selectedProjectSoundtrackRevenue = Math.max(0, Number((selectedProject.originalObject as any).soundtrackRevenue || 0));
    const selectedInvestorPlan = selectedProjectMusicDetails.investorPlan || (selectedProject.originalObject as any).investorPlan;
    const selectedInvestorPayouts = selectedProjectMusicDetails.investorPayouts || (selectedProject.originalObject as any).investorPayouts;
    const selectedInvestorNames = selectedInvestorPlan?.commitments?.map((item: any) => item.investorName).slice(0, 2).join(', ') || '';
    const selectedInvestorExtra = Math.max(0, (selectedInvestorPlan?.commitments?.length || 0) - 2);
    const selectedInvestorOwnerNames = selectedInvestorPlan?.commitments
        ?.map((item: any) => item.ownerName)
        .filter((name: unknown): name is string => typeof name === 'string' && Boolean(name))
        .slice(0, 2)
        .join(', ') || '';
    const selectedInvestorOwnerExtra = Math.max(0, (selectedInvestorPlan?.commitments?.filter((item: any) => item.ownerName).length || 0) - 2);
    const selectedInvestorScopeLabel = selectedProject.mediaType === 'SERIES' ? tr('imdb.project.investor.scopeSeason') : tr('imdb.project.investor.scopeProject');
    const selectedInvestorPayoutTotal = Math.max(0, Number(selectedInvestorPayouts?.lifetimeInvestorPayout || 0));
    const selectedProjectMusicMoments = (player.world.musicIndustry?.cultureMoments || [])
        .filter(moment => moment.projectTitle === selectedProject.name)
        .slice(0, 2);
	    const selectedProjectMusicRisk = selectedProjectMusicImpact
	        ? Math.max(selectedProjectMusicImpact.controversyRisk, selectedProjectMusicImpact.mismatchBacklashRisk)
	        : 0;
	    const returnStatusMeta = getReturnStatusMeta(futurePotential?.playerReturnStatus);
	    const selectedProjectSeriesKey = selectedProject.mediaType === 'SERIES' ? getDisplayProjectSeriesKey(selectedProject) : '';
	    const selectedProjectEpisodeRatings = selectedProject.mediaType === 'SERIES'
	        ? fullList
	            .filter(project => project.mediaType === 'SERIES' && getDisplayProjectSeriesKey(project) === selectedProjectSeriesKey)
	            .flatMap(project => project.episodeRatings || [])
	            .filter((season, index, seasons) => seasons.findIndex(item => item.season === season.season) === index)
	            .sort((a, b) => a.season - b.season)
	        : [];
        const selectedAudienceReception = selectedProject.audienceReception || buildDisplayAudienceReception(selectedProject);
        const selectedCriticReviews = getDisplayCriticReviews(
            selectedProject,
            (selectedProject.reviews || []).filter(review => review.type !== 'AUDIENCE' && review.publication !== 'IMDb Audience Pulse')
        );
	     return (
        <div className="absolute inset-0 bg-zinc-950 flex flex-col z-50 text-white animate-in slide-in-from-right duration-300">
            <div className="bg-zinc-900 p-4 pt-12 pb-3 shadow-lg flex items-center gap-3 border-b border-zinc-800">
                <button onClick={() => setSelectedProject(null)} className="p-1 rounded-full hover:bg-white/10"><ArrowLeft size={20}/></button>
                <div className="flex-1 truncate font-bold text-lg">{selectedProject.name}</div>
                <div className="bg-yellow-400 text-black px-2 py-1 rounded font-black text-xs">IMDb</div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Hero Section */}
                {(() => {
                    const customPoster = selectedProject.customPoster;
                    if (hasCustomPosterMedia(customPoster)) {
                        return (
                            <div className="relative min-h-[230px] bg-zinc-900 overflow-hidden">
                                <CustomPosterImage poster={customPoster} alt={selectedProject.name} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute bottom-0 left-0 p-4 w-full bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-transparent z-10">
                                    <h1 className="text-[26px] font-black leading-[1.02] mb-2">{selectedProject.name}</h1>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 mb-2">
                                        <span>{selectedProject.releaseDetailLabel}</span>
                                        <span>•</span>
                                        <span className="bg-zinc-800 border border-zinc-700 px-1.5 rounded text-[10px]">PG-13</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            {selectedProject.mediaType === 'SERIES' ? <Tv size={10}/> : <Film size={10}/>}
                                            {getProjectMediaTypeLabel(selectedProject.mediaType)}
                                        </span>
                                        <span>{selectedProject.identityLabel}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <Star size={20} className="text-yellow-400 fill-yellow-400" />
                                            <span className="text-xl font-bold text-white">{selectedProject.rating > 0 ? selectedProject.rating.toFixed(1) : tr('imdb.project.ratingTbd')}</span>
                                            <span className="text-xs text-zinc-500">/10</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    
                    const bgClass = customPoster?.type === 'CONFIG' && customPoster.bgGradient ? customPoster.bgGradient : getPosterBg(selectedProject.name);
                    const textColor = customPoster?.type === 'CONFIG' && customPoster.textColor ? customPoster.textColor : 'text-white';
                    
                    return (
                        <div className={`relative min-h-[230px] bg-gradient-to-br ${bgClass} overflow-hidden`}>
                            <div className="absolute inset-0 flex items-center justify-center p-4">
                                <div className={`text-center font-serif font-black ${textColor} opacity-20 text-5xl leading-none uppercase tracking-tighter transform -rotate-6 scale-125 mix-blend-overlay`}>
                                    {selectedProject.name}
                                </div>
                            </div>
                            <div className="absolute bottom-0 left-0 p-4 w-full bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-transparent z-10">
                                <h1 className="text-[26px] font-black leading-[1.02] mb-2">{selectedProject.name}</h1>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 mb-2">
                                    <span>{selectedProject.releaseDetailLabel}</span>
                                    <span>•</span>
                                    <span className="bg-zinc-800 border border-zinc-700 px-1.5 rounded text-[10px]">PG-13</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        {selectedProject.mediaType === 'SERIES' ? <Tv size={10}/> : <Film size={10}/>}
                                        {getProjectMediaTypeLabel(selectedProject.mediaType)}
                                    </span>
                                    <span>{selectedProject.identityLabel}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <Star size={20} className="text-yellow-400 fill-yellow-400" />
                                        <span className="text-xl font-bold text-white">{selectedProject.rating > 0 ? selectedProject.rating.toFixed(1) : tr('imdb.project.ratingTbd')}</span>
                                        <span className="text-xs text-zinc-500">/10</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Awards Banner */}
                {selectedProject.awards && selectedProject.awards.length > 0 && (
                    <div className="bg-amber-900/20 border-y border-amber-500/20 p-3 flex items-center gap-3 overflow-x-auto no-scrollbar">
                        {selectedProject.awards.map((award: any) => (
                            <div key={award.id} className="flex items-center gap-1.5 shrink-0 bg-black/40 px-2 py-1 rounded-lg border border-amber-500/30">
                                <AwardIcon size={12} className="text-amber-400"/>
                                <div className="text-xs">
                                    <span className="text-amber-200 font-bold">{award.outcome === 'WON' ? tr('imdb.awards.result.winner') : tr('imdb.awards.result.nominee')}</span>
                                    <span className="text-amber-500/50 mx-1">•</span>
                                    <span className="text-zinc-300">{award.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Plot */}
	                <div className="p-4 border-b border-zinc-800">
	                    <p className="text-sm text-zinc-300 leading-relaxed">
	                        {getDisplayProjectDescription(selectedProject)}
	                    </p>
	                </div>

                {selectedAudienceReception && (
                    <div className="px-3 py-2 border-b border-zinc-800 bg-gradient-to-br from-yellow-950/10 via-zinc-950 to-zinc-950">
                        <div className="rounded-2xl border border-yellow-400/20 bg-black/35 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-yellow-300">
                                        <MessageSquare size={12} className="shrink-0"/> Audience Score
                                    </div>
                                    <div className="mt-0.5 truncate text-lg font-black text-white">{selectedAudienceReception.label}</div>
                                </div>
                                <div className="shrink-0 rounded-xl border border-white/10 bg-white text-black px-3 py-1.5 text-center">
                                    <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{selectedAudienceReception.isFinal ? 'Final' : 'Live'}</div>
                                    <div className="text-lg font-black leading-none">{selectedAudienceReception.currentScore}</div>
                                </div>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-1.5">
                                <div className="rounded-lg bg-zinc-950/80 p-2">
                                    <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Opening</div>
                                    <div className="text-sm font-black text-zinc-100">{selectedAudienceReception.openingScore}/100</div>
                                </div>
                                <div className="rounded-lg bg-zinc-950/80 p-2">
                                    <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Trend</div>
                                    <div className={`text-sm font-black ${
                                        selectedAudienceReception.trend === 'RISING'
                                            ? 'text-emerald-300'
                                            : selectedAudienceReception.trend === 'FALLING'
                                                ? 'text-rose-300'
                                                : 'text-cyan-200'
                                    }`}>
                                        {selectedAudienceReception.trend}
                                    </div>
                                </div>
                                <div className="rounded-lg bg-zinc-950/80 p-2">
                                    <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Votes</div>
                                    <div className="text-sm font-black text-zinc-100">{formatViews(selectedAudienceReception.sampleSize)}</div>
                                </div>
                            </div>
                            <p className="mt-2 text-[11px] font-semibold leading-relaxed text-zinc-400">
                                {selectedAudienceReception.summary}
                            </p>
                        </div>
                    </div>
                )}

	                {selectedProject.mediaType === 'SERIES' && (
	                    selectedProjectEpisodeRatings.length > 0 ? (
	                        <EpisodeRatingsHeatmap ratings={selectedProjectEpisodeRatings} tr={tr} />
	                    ) : (
	                        <div className="p-4 border-b border-zinc-800 bg-zinc-950">
	                            <h3 className="text-white font-bold text-sm flex items-center gap-2">
	                                <LayoutGrid size={16} className="text-emerald-400"/> {tr('imdb.project.episodeRatings')}
	                            </h3>
	                            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs font-semibold text-zinc-500">
	                                {tr('imdb.project.noEpisodeRatings')}
	                            </div>
	                        </div>
	                    )
	                )}

	                {selectedProject.musicPlan?.credits?.length ? (
                    <div className="px-4 py-3 border-b border-zinc-800 bg-gradient-to-br from-cyan-950/20 via-zinc-950 to-zinc-950">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                                    <Music2 size={13} className="shrink-0"/> {tr('imdb.project.soundtrackDesk')}
                                </div>
                                <div className="mt-1 truncate text-sm font-black text-white">
                                    {getMusicStrategyLabel(selectedProject.musicPlan.strategy)}
                                </div>
                            </div>
                            <div className="shrink-0 rounded-2xl border border-cyan-300/20 bg-black/35 px-3 py-2 text-right">
                                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{tr('imdb.project.revenue')}</div>
                                <div className="text-xs font-black text-emerald-300">{formatMoney(selectedProjectSoundtrackRevenue)}</div>
                            </div>
                        </div>

                        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {selectedProject.musicPlan.credits.map((credit, index) => (
                                <div key={`${credit.artistId}_${credit.role}_${index}`} className="min-w-[168px] max-w-[190px] rounded-2xl border border-white/10 bg-black/35 p-3">
                                    <div className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">
                                        {getMusicCreditRoleLabel(credit.role)}
                                    </div>
                                    <div className="mt-1 truncate text-sm font-black text-white">{credit.artistName}</div>
                                    <div className="mt-0.5 truncate text-[11px] text-zinc-400">{credit.songTitle}</div>
                                </div>
                            ))}
                        </div>

                        {selectedProjectMusicImpact && selectedProjectMusicImpact.score > 0 && (
                            <div className="mt-3 grid grid-cols-4 gap-2">
                                <div className="rounded-xl bg-black/35 p-2 text-center">
                                    <div className="text-[8px] uppercase tracking-widest text-zinc-500">{tr('imdb.project.music.open')}</div>
                                    <div className="text-xs font-black text-emerald-300">+{selectedProjectMusicImpact.openingWeekendLiftPct}%</div>
                                </div>
                                <div className="rounded-xl bg-black/35 p-2 text-center">
                                    <div className="text-[8px] uppercase tracking-widest text-zinc-500">{tr('imdb.project.music.reach')}</div>
                                    <div className="text-xs font-black text-cyan-200">+{selectedProjectMusicImpact.audienceReachLiftPct}%</div>
                                </div>
                                <div className="rounded-xl bg-black/35 p-2 text-center">
                                    <div className="text-[8px] uppercase tracking-widest text-zinc-500">{tr('imdb.project.music.awards')}</div>
                                    <div className="text-xs font-black text-violet-200">+{selectedProjectMusicImpact.awardChanceLift}</div>
                                </div>
                                <div className="rounded-xl bg-black/35 p-2 text-center">
                                    <div className="text-[8px] uppercase tracking-widest text-zinc-500">{tr('imdb.project.music.risk')}</div>
                                    <div className={`text-xs font-black ${selectedProjectMusicRisk >= 38 ? 'text-amber-300' : 'text-zinc-300'}`}>{selectedProjectMusicRisk}</div>
                                </div>
                            </div>
                        )}

                        {selectedProjectMusicMoments.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {selectedProjectMusicMoments.map(moment => (
                                    <div key={moment.id} className="rounded-2xl border border-cyan-300/15 bg-cyan-300/5 px-3 py-2">
                                        <div className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">{moment.type.replace(/_/g, ' ')}</div>
                                        <div className="mt-0.5 line-clamp-2 text-xs font-bold text-zinc-200">{moment.headline}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : null}

                {selectedInvestorPlan && selectedInvestorPlan.totalRaised > 0 && (
                    <div className="px-4 py-3 border-b border-zinc-800 bg-gradient-to-br from-emerald-950/20 via-zinc-950 to-zinc-950">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
                                    <Handshake size={13} className="shrink-0"/> {tr('imdb.project.investorFunding')}
                                </div>
                                <div className="mt-1 truncate text-sm font-black text-white">
                                    {selectedInvestorNames}{selectedInvestorExtra > 0 ? ` +${selectedInvestorExtra}` : ''}
                                </div>
                                {selectedInvestorOwnerNames && (
                                    <div className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-emerald-100/55">
                                        {tr('imdb.project.investor.owners', { owners: selectedInvestorOwnerNames })}{selectedInvestorOwnerExtra > 0 ? ` +${selectedInvestorOwnerExtra}` : ''}
                                    </div>
                                )}
                            </div>
                            <div className="shrink-0 rounded-2xl border border-emerald-300/20 bg-black/35 px-3 py-2 text-right">
                                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{tr('imdb.project.investor.studioKeeps')}</div>
                                <div className="text-xs font-black text-emerald-300">{selectedInvestorPlan.studioEquityPercent}%</div>
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-xl bg-black/35 p-2 text-center">
                                <div className="text-[8px] uppercase tracking-widest text-zinc-500">{tr('imdb.project.investor.raised')}</div>
                                <div className="text-xs font-black text-emerald-300">{formatMoney(selectedInvestorPlan.totalRaised)}</div>
                            </div>
                            <div className="rounded-xl bg-black/35 p-2 text-center">
                                <div className="text-[8px] uppercase tracking-widest text-zinc-500">{tr('imdb.project.investor.cut')}</div>
                                <div className="text-xs font-black text-cyan-200">{selectedInvestorPlan.investorEquityPercent}%</div>
                            </div>
                            <div className="rounded-xl bg-black/35 p-2 text-center">
                                <div className="text-[8px] uppercase tracking-widest text-zinc-500">{tr('imdb.project.investor.paidOut')}</div>
                                <div className="text-xs font-black text-zinc-200">{formatMoney(selectedInvestorPayoutTotal)}</div>
                            </div>
                        </div>
                        <div className="mt-3 text-xs font-bold text-zinc-400">
                            {tr('imdb.project.investor.freshFinancing', { scope: selectedInvestorScopeLabel })}
                        </div>
                    </div>
                )}

                {returnStatusMeta && (
                    <div className="p-4 border-b border-zinc-800 bg-zinc-900/40">
                        <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                            <Clock size={16} className="text-zinc-400"/> {tr('imdb.project.franchiseStatus')}
                        </h3>
                        <div className={`rounded-2xl border p-4 ${returnStatusMeta.tone}`}>
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-400">
                                    {selectedProject.mediaType === 'SERIES' ? tr('imdb.project.seasonOutcome') : tr('imdb.project.sequelOutcome')}
                                </div>
                                <div className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${returnStatusMeta.chip}`}>
                                    {getReturnStatusLabel(returnStatusMeta.labelKey)}
                                </div>
                            </div>
                            <div className="text-sm leading-relaxed">
                                {futurePotential?.returnStatusNote || (
                                    futurePotential?.playerReturnStatus === 'RETURNING'
                                        ? tr('imdb.project.returnNote.returning')
                                        : futurePotential?.playerReturnStatus === 'KILLED_OFF'
                                            ? tr('imdb.project.returnNote.killedOff')
                                            : tr('imdb.project.returnNote.writtenOff')
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Cast */}
                {selectedProject.cast && selectedProject.cast.length > 0 && (
                    <div className="p-4 border-b border-zinc-800">
                        <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                            <Users size={16} className="text-zinc-400"/> {tr('imdb.project.topCast')}
                        </h3>
                        <div className="space-y-3">
                            {selectedProject.cast.slice(0, 5).map((member, index) => {
                                const actorName = member.name || member.actorName || tr('imdb.project.unknownActor');
                                const characterLabel = tr('imdb.project.asCharacter', { character: member.characterName || getFallbackCharacterName(member, selectedProject.name, index) });
                                const actorImage = member.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(actorName)}&background=27272a&color=ffffff`;
                                const isPlayerCast = member.isPlayer || member.actorId === 'PLAYER_SELF';

                                return (
                                <div key={member.id || member.roleId || `${actorName}_${index}`} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img src={actorImage} className="w-10 h-10 rounded-full object-cover border border-zinc-700 bg-zinc-800"/>
                                        <div>
                                            <div className="text-sm font-bold text-zinc-200">{actorName}</div>
                                            <div className="text-xs text-zinc-500">{characterLabel}</div>
                                        </div>
                                    </div>
                                    {isPlayerCast && <div className="text-[9px] font-bold bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{tr('imdb.franchise.you')}</div>}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Box Office / Stats */}
                <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                    <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-500"/> {tr('imdb.project.techSpecs')}</h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                        <div><div className="text-zinc-500 text-xs">{tr('imdb.project.budget')}</div><div className="text-zinc-300 font-mono">{formatMoney(selectedProject.budget)}</div></div>
                        <div><div className="text-zinc-500 text-xs">{tr('imdb.project.grossWorldwide')}</div><div className={`font-mono font-bold ${(selectedProject.gross || 0) > (selectedProject.budget || 0) ? 'text-emerald-400' : 'text-zinc-300'}`}>{formatMoney(selectedProject.gross)}</div></div>
                        {(selectedProject.streamingViews || 0) > 0 && (<div><div className="text-zinc-500 text-xs">{tr('imdb.project.streamingViews')}</div><div className="text-indigo-400 font-mono font-bold">{formatViews(selectedProject.streamingViews)}</div></div>)}
                    </div>
                </div>

                {selectedProject.campaignRealitySnapshot && (() => {
                    const reality = selectedProject.campaignRealitySnapshot;
                    const realityTone = reality.tone === 'POSITIVE'
                        ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
                        : reality.tone === 'NEGATIVE'
                            ? 'border-rose-500/30 bg-rose-950/20 text-rose-200'
                            : 'border-amber-500/30 bg-amber-950/20 text-amber-200';
                    return (
                        <div className="p-4 border-b border-zinc-800 bg-zinc-950/70">
                            <div className={`reality-tone rounded-2xl border p-4 ${realityTone}`}>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500 font-black mb-1">{tr('imdb.project.campaignReality')}</div>
                                        <div className="text-xl font-black text-white">{reality.label}</div>
                                    </div>
                                    <div className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
                                        {reality.tone}
                                    </div>
                                </div>
                                <p className="text-sm leading-relaxed text-zinc-300 mb-4">{reality.summary}</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                                        <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-black mb-1">{tr('imdb.project.promise')}</div>
                                        <div className="font-bold text-white">{reality.promised}</div>
                                    </div>
                                    <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                                        <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-black mb-1">{tr('imdb.project.audienceRead')}</div>
                                        <div className="font-bold text-white">{reality.audienceScore}/100</div>
                                    </div>
                                    <div className="col-span-2 rounded-xl bg-black/30 border border-white/10 p-3">
                                        <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-black mb-1">{tr('imdb.project.forecastShift')}</div>
                                        <div className="text-zinc-300 leading-relaxed">{reality.forecastShift}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Reviews */}
                {selectedCriticReviews.length > 0 && (
                    <div className="px-3 py-4 space-y-3 pb-20 border-t border-zinc-800 bg-zinc-950">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-white font-black text-sm flex items-center gap-2">
                                <MessageSquare size={15} className="text-blue-400"/> {tr('imdb.project.criticReviews')}
                            </h3>
                            <div className="rounded-full border border-zinc-700 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                                {selectedCriticReviews.length} Critics
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {selectedCriticReviews.map((review) => (
                                <div key={review.id} className="bg-zinc-900/80 px-3 py-2.5 rounded-xl border border-zinc-800">
                                    <div className="flex justify-between items-center gap-2 mb-1.5">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                                review.sentiment === 'POSITIVE' ? 'bg-emerald-900/30 text-emerald-400' : 
                                                review.sentiment === 'NEGATIVE' ? 'bg-rose-900/30 text-rose-400' : 'bg-yellow-900/30 text-yellow-400'
                                            }`}>
                                                {review.sentiment}
                                            </span>
                                            <span className="truncate text-[9px] text-zinc-500 uppercase font-black tracking-wider">{review.publication}</span>
                                        </div>
                                        {review.rating && <div className="shrink-0 text-[10px] font-bold text-zinc-400 flex items-center gap-1"><Star size={9} className="fill-zinc-400"/> {review.rating}/5</div>}
                                    </div>
                                    <p className="line-clamp-2 text-[12px] text-zinc-300 italic leading-snug">"{review.text}"</p>
                                    <div className="mt-1 text-[9px] text-zinc-600 text-right font-bold">- {review.author}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
     );
  }

  return (
    <div className="absolute inset-0 bg-zinc-950 flex flex-col z-40 text-white animate-in slide-in-from-right duration-300">
        <div className="bg-yellow-400 p-4 pt-12 pb-3 shadow-lg flex items-center justify-between shrink-0 text-black">
            <button onClick={onBack} className="p-1 rounded-full hover:bg-black/10"><ArrowLeft size={20}/></button>
            <div className="font-black tracking-tighter text-xl bg-black text-yellow-400 px-2 rounded">IMDb</div>
            <div className="w-8"></div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
             
             {/* PROFILE TAB */}
             {activeTab === 'PROFILE' && (
                 <div className="p-4 space-y-4 pb-6">
                    <div className="relative overflow-hidden rounded-3xl border border-yellow-400/25 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-4 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
                        <div className="pointer-events-none absolute -right-8 -top-10 text-[82px] font-black tracking-tighter text-yellow-400/5">IMDb</div>
                        <div className="flex items-center gap-3.5">
                            <div className="relative shrink-0">
                                <img src={player.avatar} className="h-[74px] w-[74px] rounded-2xl object-cover border-2 border-yellow-400 bg-zinc-900 shadow-[0_0_24px_rgba(250,204,21,0.18)]" />
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-zinc-800 bg-black px-2.5 py-1 text-[10px] font-black text-white">#{imdbRank}</div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[9px] font-black uppercase tracking-[0.22em] text-yellow-300">IMDb {tr('imdb.tabs.profile')}</div>
                                <h2 className="mt-1 break-words text-[30px] font-black leading-none text-white">{player.name}</h2>
                                <div className="mt-2 text-sm font-semibold text-zinc-400">{tr('imdb.profile.actorProducer')}</div>
                            </div>
                        </div>
                        {knownFor && (
                            <button
                                onClick={() => setSelectedProject(knownFor)}
                                className="mt-4 w-full rounded-2xl border border-yellow-400/15 bg-black/55 p-3.5 text-left transition-colors hover:bg-black/70"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">{tr('imdb.profile.knownFor')}</div>
                                        <div className="mt-1 text-[18px] font-black leading-tight text-white">{knownFor.name}</div>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                            <span>{knownFor.releaseLabel}</span>
                                            <span className="text-zinc-700">•</span>
                                            <span>{knownFor.identityLabel}</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-1 rounded-full bg-yellow-400 px-2.5 py-1.5 text-sm font-black text-black">
                                        <Star size={11} className="fill-black" />
                                        {knownFor.rating > 0 ? knownFor.rating.toFixed(1) : '-'}
                                    </div>
                                </div>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2 rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-zinc-900 to-black p-3.5">
                            <div className="text-[9px] text-zinc-500 uppercase font-black tracking-wider">{tr('imdb.franchise.metric.totalGross')}</div>
                            <div className="mt-1 font-mono text-[26px] font-black leading-none text-emerald-400">{formatMoney(totalBoxOffice)}</div>
                        </div>
                        <div className="min-h-[86px] rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                            <div className="text-[9px] text-zinc-500 uppercase font-black tracking-wider">{tr('imdb.profile.criticScore')}</div>
                            <div className={`mt-2 font-mono text-lg font-black ${avgRating > 0 ? criticStatus.color : 'text-zinc-500'}`}>
                                {avgRating > 0 ? avgRating.toFixed(1) : '-'}
                            </div>
                            {avgRating > 0 && <div className={`mt-0.5 text-[8px] font-black uppercase leading-tight tracking-wide ${criticStatus.color}`}>{criticStatus.label}</div>}
                        </div>
                        <button
                            onClick={() => setActiveTab('AWARDS')}
                            className="min-h-[86px] rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3 text-left transition-colors hover:border-yellow-400/30"
                        >
                            <div className="text-[9px] text-zinc-500 uppercase font-black tracking-wider">{tr('imdb.awards.myAwards')}</div>
                            <div className="mt-2 flex items-center gap-1 font-black text-lg text-amber-400">
                                <AwardIcon size={15} fill="currentColor"/> {awardsWon.length}
                            </div>
                        </button>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                        <h3 className="text-yellow-400 font-black uppercase tracking-widest text-xs mb-3">{tr('imdb.profile.bio')}</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">{tr('imdb.profile.bioText')}</p>
                    </div>
                 </div>
             )}

             {/* FILMOGRAPHY TAB */}
             {activeTab === 'FILMOGRAPHY' && (
                 <div className="p-4">
                     <div className="flex items-center justify-between mb-4">
                         <h3 className="text-yellow-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                            {tr('imdb.profile.filmography')} <span className="bg-zinc-700 text-white px-1.5 py-0.5 rounded-full text-[10px]">{filteredCredits.length}</span>
                         </h3>
                         {/* FILTER PILLS */}
                         <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-700">
                             {(['ALL', 'MOVIE', 'TV'] as const).map(type => (
                                 <button 
                                    key={type}
                                    onClick={() => setCreditFilter(type)}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${creditFilter === type ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                 >
                                     {getCreditFilterLabel(type)}
                                 </button>
                             ))}
                         </div>
                     </div>

                     <div className="divide-y divide-zinc-800 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
                         {filteredCredits.length === 0 ? <div className="text-zinc-600 text-center py-8 text-sm">{tr('imdb.profile.noCredits')}</div> : filteredCredits.map((project) => (
                             <div key={project.id} onClick={() => setSelectedProject(project)} className="flex gap-4 p-4 hover:bg-zinc-800 transition-colors cursor-pointer group">
                                 {hasCustomPosterMedia(project.customPoster) ? (
                                     <div className={`w-12 h-16 rounded shrink-0 flex items-center justify-center border-2 relative overflow-hidden ${project.mediaType === 'MOVIE' ? 'border-blue-500/60' : project.mediaType === 'SERIES' ? 'border-red-500/60' : 'border-zinc-700'}`}>
                                         <CustomPosterImage poster={project.customPoster} alt={project.name} className="absolute inset-0 w-full h-full object-cover" />
                                     </div>
                                 ) : (
                                     <div className={`w-12 h-16 rounded shrink-0 flex items-center justify-center border-2 relative overflow-hidden bg-gradient-to-br ${project.customPoster?.type === 'CONFIG' && project.customPoster.bgGradient ? project.customPoster.bgGradient : getPosterBg(project.name)} ${project.mediaType === 'MOVIE' ? 'border-blue-500/60' : project.mediaType === 'SERIES' ? 'border-red-500/60' : 'border-zinc-700'}`}>
                                         <div className="absolute inset-0 flex items-center justify-center p-1">
                                             {project.customPoster?.type === 'CONFIG' && project.customPoster.icon === 'Film' && <Film size={12} className="absolute text-white/10" />}
                                             {project.customPoster?.type === 'CONFIG' && project.customPoster.icon === 'Tv' && <Tv size={12} className="absolute text-white/10" />}
                                             {project.customPoster?.type === 'CONFIG' && project.customPoster.icon === 'Star' && <Star size={12} className="absolute text-white/10" />}
                                             <div className={`text-center font-serif font-black ${project.customPoster?.type === 'CONFIG' && project.customPoster.textColor ? project.customPoster.textColor : 'text-white/30'} text-[8px] leading-none uppercase tracking-tighter transform -rotate-6 scale-125 mix-blend-overlay relative z-10`}>
                                                 {project.name}
                                             </div>
                                         </div>
                                     </div>
                                 )}
                                 <div className="flex-1 min-w-0">
                                     <div className="font-bold text-base text-zinc-100 truncate">{project.name}</div>
                                     <div className="text-xs text-zinc-500 mb-1 truncate">{project.releaseLabel} • {project.role} • {project.identityLabel}</div>
                                     <div className="flex items-center gap-3 mt-1.5">
                                         {project.rating > 0 && <span className="flex items-center gap-1 text-zinc-200 text-xs font-bold"><Star size={10} className="text-yellow-400 fill-yellow-400"/> {project.rating.toFixed(1)}</span>}
                                         <span className="text-[10px] text-zinc-600 font-bold uppercase border border-zinc-700 px-1.5 rounded">{getProjectMediaTypeLabel(project.mediaType, 'short')}</span>
                                     </div>
                                 </div>
                                 <ChevronRight size={16} className="text-zinc-600"/>
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             {/* AWARDS TAB (NEW) */}
             {activeTab === 'AWARDS' && (
                 <div className="p-4">
                     {awardView === 'HOME' && renderAwardsHome()}
                     {awardView === 'SHOW_DETAIL' && renderShowDetail()}
                     {awardView === 'MY_AWARDS' && renderMyAwards()}
                 </div>
             )}
            
            {/* SEASON TAB (NEW) */}
            {activeTab === 'SEASON' && (
                 <div className="p-4">
                     {renderCurrentSeason()}
                 </div>
             )}

             {/* FRANCHISES TAB */}
             {activeTab === 'FRANCHISES' && (
                 <div className="p-4">
                     {!selectedUniverse ? renderFranchiseList() : renderUniverseDetail()}
                 </div>
             )}

        </div>

        {/* --- BOTTOM TAB BAR --- */}
        <div className="flex border-t border-zinc-800 bg-zinc-950 pb-safe">
            <button onClick={() => setActiveTab('PROFILE')} className={`flex-1 py-4 flex flex-col items-center gap-1 ${activeTab === 'PROFILE' ? 'text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <User size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wide">{tr('imdb.tabs.profile')}</span>
            </button>
            <button onClick={() => setActiveTab('FILMOGRAPHY')} className={`flex-1 py-4 flex flex-col items-center gap-1 ${activeTab === 'FILMOGRAPHY' ? 'text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <Film size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wide">{tr('imdb.tabs.credits')}</span>
            </button>
            <button onClick={() => setActiveTab('AWARDS')} className={`flex-1 py-4 flex flex-col items-center gap-1 ${activeTab === 'AWARDS' || activeTab === 'SEASON' ? 'text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <AwardIcon size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wide">{tr('imdb.tabs.awards')}</span>
            </button>
            <button onClick={() => setActiveTab('FRANCHISES')} className={`flex-1 py-4 flex flex-col items-center gap-1 ${activeTab === 'FRANCHISES' ? 'text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <Globe size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wide">{tr('imdb.tabs.universe')}</span>
            </button>
        </div>
    </div>
  );
};
