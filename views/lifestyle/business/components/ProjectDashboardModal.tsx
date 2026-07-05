import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Film, Tv, Users, DollarSign, Star, TrendingUp, Calendar, Check, Activity, Layers, Zap, Info, ChevronRight, Play, Settings, Camera, Award, BarChart3, Globe, BookOpen, Edit3, Sparkles } from 'lucide-react';
import { Player, Studio, CustomPoster, PlatformId, SeasonEpisodeRatings } from '../../../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { getAbsoluteWeek } from '../../../../services/legacyLogic';
import { canRenameProjectTitle } from '../../../../services/projectNaming';
import { WorkingTitleDialog } from './WorkingTitleDialog';
import { getContinuationEligibility } from '../../../../services/sequelFlow';
import { getProjectReleaseLabel, getProjectReleaseTiming } from '../../../../services/releaseTiming';
import { getPlayerLanguage, t } from '../../../../services/i18n';
import { createCustomPosterBlobFromFile, saveCustomPosterMedia } from '../../../../services/customPosterMedia';
import { CustomPosterImage } from '../../../../components/CustomPosterImage';

const formatMoney = (val: number) => {
    if (val >= 1_000_000_000_000) return `$${(val/1_000_000_000_000).toFixed(2)}T`;
    if (val >= 1_000_000_000) return `$${(val/1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `$${(val/1_000_000).toFixed(1)}M`;
    return `$${(val/1_000).toFixed(0)}k`;
};

const PHASES = [
    { id: 'CONCEPT', icon: <Zap size={14} /> },
    { id: 'DEVELOPMENT', icon: <BookOpen size={14} /> },
    { id: 'PLANNING', icon: <Layers size={14} /> },
    { id: 'PRE-PRODUCTION', icon: <Settings size={14} /> },
    { id: 'PRODUCTION', icon: <Camera size={14} /> },
    { id: 'POST-PRODUCTION', icon: <Activity size={14} /> },
    { id: 'AWAITING RELEASE', icon: <Play size={14} /> },
    { id: 'PLANNED RELEASE', icon: <Calendar size={14} /> },
    { id: 'RELEASED', icon: <Award size={14} /> },
    { id: 'IN THEATERS', icon: <Globe size={14} /> },
    { id: 'STREAMING', icon: <Tv size={14} /> }
];

const PLATFORMS = [
    { id: 'NETFLIX', name: 'Netflix', baseBid: 15000000, qualityReq: 75, color: '#E50914', maxBudget: 150000000 },
    { id: 'APPLE_TV', name: 'Apple TV+', baseBid: 20000000, qualityReq: 85, color: '#FFFFFF', maxBudget: 200000000 },
    { id: 'DISNEY_PLUS', name: 'Disney+', baseBid: 12000000, qualityReq: 70, color: '#113CCF', maxBudget: 120000000 },
    { id: 'HULU', name: 'Hulu', baseBid: 8000000, qualityReq: 60, color: '#1CE783', maxBudget: 80000000 },
    { id: 'YOUTUBE', name: 'YouTube Premium', baseBid: 3000000, qualityReq: 40, color: '#FF0000', maxBudget: 30000000 }
];

const getSeriesScorecardTone = (rating: number) => {
    if (rating >= 9.2) return 'bg-emerald-400 text-emerald-950';
    if (rating >= 8.2) return 'bg-green-500 text-green-950';
    if (rating >= 7.0) return 'bg-lime-400 text-lime-950';
    if (rating >= 5.8) return 'bg-amber-400 text-amber-950';
    if (rating >= 4.5) return 'bg-rose-500 text-white';
    return 'bg-fuchsia-700 text-white';
};

const normalizeScorecardSeriesTitle = (value: string = '') => value
    .replace(/\s*[:\-]?\s*season\s+\d+\b/ig, '')
    .replace(/\s+s\d+\b/ig, '')
    .trim()
    .toLowerCase();

const getScorecardSeriesKey = (project: any) => {
    const details = project?.projectDetails || project || {};
    return details.franchiseId
        || details.sourceScriptId
        || project?.franchiseId
        || project?.sourceScriptId
        || normalizeScorecardSeriesTitle(project?.name || project?.title || details.title || '');
};

const SeriesScorecardPanel: React.FC<{
    ratings: SeasonEpisodeRatings[];
    tr: (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => string;
}> = ({ ratings, tr }) => {
    const sortedRatings = [...ratings].sort((a, b) => a.season - b.season);
    const maxEpisodes = Math.max(...sortedRatings.map(season => season.episodes.length), 0);
    const allEpisodes = sortedRatings.flatMap(season =>
        season.episodes.map(episode => ({ ...episode, season: season.season }))
    );

    if (!sortedRatings.length || maxEpisodes === 0 || !allEpisodes.length) return null;

    const averageRating = allEpisodes.reduce((sum, episode) => sum + episode.rating, 0) / allEpisodes.length;
    const bestEpisode = allEpisodes.reduce((best, episode) => episode.rating > best.rating ? episode : best, allEpisodes[0]);
    const weakestEpisode = allEpisodes.reduce((weakest, episode) => episode.rating < weakest.rating ? episode : weakest, allEpisodes[0]);
    const scorecardSeasonColumnWidth = '44px';
    const scorecardGridMinWidth = `calc(28px + (${sortedRatings.length} * ${scorecardSeasonColumnWidth}) + (${sortedRatings.length} * 0.25rem))`;
    const renewalSignalKey = averageRating >= 8.4
        ? 'services.business.productionDashboard.scorecard.signal.strong'
        : averageRating >= 7.2
            ? 'services.business.productionDashboard.scorecard.signal.viable'
            : averageRating >= 6
                ? 'services.business.productionDashboard.scorecard.signal.risky'
                : 'services.business.productionDashboard.scorecard.signal.weak';
    const renewalTone = averageRating >= 8.4 ? 'text-emerald-300' : averageRating >= 7.2 ? 'text-lime-300' : averageRating >= 6 ? 'text-amber-300' : 'text-rose-300';

    return (
        <div className="md:col-span-2 rounded-[28px] border border-emerald-500/10 bg-emerald-500/[0.035] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-[1px] bg-emerald-400"></div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">{tr('services.business.productionDashboard.scorecard.title')}</h3>
                    </div>
                    <p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-zinc-400">
                        {tr('services.business.productionDashboard.scorecard.description')}
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-2">
                        <div className="text-[7px] font-black uppercase tracking-widest text-zinc-500">{tr('services.business.productionDashboard.scorecard.renewalSignal')}</div>
                        <div className={`mt-1 text-sm font-black ${renewalTone}`}>{tr(renewalSignalKey)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-2">
                        <div className="text-[7px] font-black uppercase tracking-widest text-zinc-500">{tr('services.business.productionDashboard.scorecard.bestEpisode')}</div>
                        <div className="mt-1 text-sm font-black text-white">
                            {tr('services.business.productionDashboard.scorecard.episodeRef', { season: bestEpisode.season, episode: bestEpisode.episode })}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-2">
                        <div className="text-[7px] font-black uppercase tracking-widest text-zinc-500">{tr('services.business.productionDashboard.scorecard.weakestEpisode')}</div>
                        <div className="mt-1 text-sm font-black text-white">
                            {tr('services.business.productionDashboard.scorecard.episodeRef', { season: weakestEpisode.season, episode: weakestEpisode.episode })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="scorecard-season-scroll mt-4 overflow-x-auto no-scrollbar pb-1">
                <div
                    className="grid gap-1 min-w-max"
                    style={{
                        gridTemplateColumns: `28px repeat(${sortedRatings.length}, minmax(38px, ${scorecardSeasonColumnWidth}))`,
                        minWidth: scorecardGridMinWidth,
                    }}
                >
                    <div />
                    {sortedRatings.map(season => (
                        <div key={`scorecard_head_${season.season}`} className="text-center">
                            <div className="text-[8px] font-black uppercase tracking-widest text-zinc-300">
                                {tr('services.business.productionDashboard.scorecard.seasonShort', { season: season.season })}
                            </div>
                            <div className="mt-0.5 text-[8px] font-mono font-black text-emerald-300">{season.averageRating.toFixed(1)}</div>
                        </div>
                    ))}

                    {Array.from({ length: maxEpisodes }, (_, index) => {
                        const episodeNumber = index + 1;
                        return (
                            <React.Fragment key={`scorecard_episode_${episodeNumber}`}>
                                <div className="h-6 flex items-center justify-end pr-1 text-[8px] font-black text-zinc-500">
                                    {tr('services.business.productionDashboard.scorecard.episodeShort', { episode: episodeNumber })}
                                </div>
                                {sortedRatings.map(season => {
                                    const episode = season.episodes.find(item => item.episode === episodeNumber);
                                    return episode ? (
                                        <div
                                            key={`scorecard_s${season.season}_e${episodeNumber}`}
                                            className={`h-6 rounded flex items-center justify-center text-[10px] font-black ${getSeriesScorecardTone(episode.rating)}`}
                                        >
                                            {episode.rating.toFixed(1)}
                                        </div>
                                    ) : (
                                        <div key={`scorecard_s${season.season}_e${episodeNumber}_empty`} className="h-6 rounded border border-zinc-800 bg-zinc-900/50" />
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            <div className="mt-3 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">
                {tr('services.business.productionDashboard.scorecard.average', { rating: averageRating.toFixed(1) })}
            </div>
        </div>
    );
};

interface ProjectDashboardModalProps {
    project: any;
    player: Player;
    studio: Studio;
    onClose: () => void;
    onUpdatePlayer: (player: Player) => void;
    onMakeSequel?: (project: any) => void;
    onMakeSpinoff?: (project: any) => void;
    onStartStreamingBidding?: (project: any) => void;
    onRenameProject?: (title: string) => void;
}

export const ProjectDashboardModal: React.FC<ProjectDashboardModalProps> = ({ project, player, studio, onClose, onUpdatePlayer, onMakeSequel, onMakeSpinoff, onStartStreamingBidding, onRenameProject }) => {
    const [view, setView] = useState<'DETAILS'>('DETAILS');
    const [isRenamingTitle, setIsRenamingTitle] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const displayTitle = project.name || project.title || project.projectDetails?.title || tr('projectDashboard.untitledProject');
    const canRenameTitle = !!onRenameProject && canRenameProjectTitle(project.phase);
    const isReleaseHistoryPhase = ['RELEASED', 'STREAMING', 'IN THEATERS', 'BIDDING'].includes(project.phase) || Boolean(project.gross || project.totalGross || project.streamingRevenue);
    const releaseFallback = isReleaseHistoryPhase ? { currentAge: player.age, currentWeek: player.currentWeek } : {};
    const releaseTiming = getProjectReleaseTiming(project, releaseFallback);
    const releaseSummaryLabel = getProjectReleaseLabel(project, releaseFallback, { emptyLabel: tr('projectDashboard.tba') });
    const runWeek = Number(project.weekNum || project.projectDetails?.weekNum || 0);
    const phaseKey = PHASES.find(p => p.id === project.phase)?.id;
    const currentPhaseLabel = phaseKey ? tr(`projectDashboard.phase.${phaseKey}`) : String(project.phase || tr('projectDashboard.phase.PLANNING')).replace(/[_-]/g, ' ');
    const timelineValue = runWeek > 0 ? tr('projectDashboard.timeline.runWeek', { week: runWeek }) : releaseTiming.releaseWeek ? tr('projectDashboard.timeline.week', { week: releaseTiming.releaseWeek }) : currentPhaseLabel;
    const timelineCaption = runWeek > 0 ? currentPhaseLabel : releaseTiming.releaseWeek ? releaseSummaryLabel : tr('projectDashboard.timeline.currentStage');
    const isSeriesProject = project.type === 'SERIES' || project.projectDetails?.type === 'SERIES' || project.projectType === 'SERIES' || project.projectDetails?.mediaType === 'SERIES';
    const selectedScorecardKey = getScorecardSeriesKey(project);
    const scorecardRatingMap = new Map<number, SeasonEpisodeRatings>();
    if (isSeriesProject) {
        [project, ...player.pastProjects, ...player.activeReleases]
            .filter(item => item && getScorecardSeriesKey(item) === selectedScorecardKey)
            .flatMap(item => item.projectDetails?.episodeRatings || item.episodeRatings || [])
            .forEach(rating => {
                if (!scorecardRatingMap.has(rating.season)) {
                    scorecardRatingMap.set(rating.season, rating);
                }
            });
    }
    const scorecardRatings = [...scorecardRatingMap.values()].sort((a, b) => a.season - b.season);

    const sequelEligibility = React.useMemo(() => getContinuationEligibility({
        player,
        studioScripts: studio.studioState?.scripts || [],
        project,
        mode: 'SEQUEL',
    }), [player, project, studio.studioState?.scripts]);
    const spinoffEligibility = React.useMemo(() => getContinuationEligibility({
        player,
        studioScripts: studio.studioState?.scripts || [],
        project,
        mode: 'SPINOFF',
    }), [player, project, studio.studioState?.scripts]);

    const [isPosterUploading, setIsPosterUploading] = useState(false);
    const [posterUploadError, setPosterUploadError] = useState('');

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsPosterUploading(true);
            setPosterUploadError('');
            try {
                const posterBlob = await createCustomPosterBlobFromFile(file);
                const media = await saveCustomPosterMedia(project.id || project.name || 'project', posterBlob.blob, {
                    width: posterBlob.width,
                    height: posterBlob.height,
                });
                savePoster({
                    type: 'IMAGE',
                    posterMediaId: media.id,
                });
            } catch (error) {
                setPosterUploadError(error instanceof Error ? error.message : tr('projectDashboard.poster.saveError'));
            } finally {
                setIsPosterUploading(false);
            }
        }
        e.target.value = '';
    };

    const getCustomPoster = () => {
        return project.customPoster || project.projectDetails?.customPoster || project.concept?.customPoster;
    };

    const [localPoster, setLocalPoster] = useState<CustomPoster | undefined>(() => getCustomPoster());

    useEffect(() => {
        setLocalPoster(getCustomPoster());
    }, [project.id]);

    const getPosterBg = (title: string = '') => {
        const colors = [
            'from-rose-950 via-rose-900 to-black',
            'from-indigo-950 via-indigo-900 to-black',
            'from-emerald-950 via-emerald-900 to-black',
            'from-violet-950 via-violet-900 to-black',
            'from-amber-950 via-amber-900 to-black',
            'from-zinc-900 via-zinc-800 to-black',
            'from-cyan-950 via-cyan-900 to-black',
        ];
        let hash = 0;
        for (let i = 0; i < title.length; i++) {
            hash = title.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const activePoster = localPoster || getCustomPoster();

    const relatedNews = player.news?.filter(n => {
        const title = project.name || project.title;
        if (!title) return false;
        
        // If the news item has a projectId, use that for perfect matching
        if (n.projectId && n.projectId === project.id) return true;

        // Otherwise, use a very strict regex to avoid matching sequels/prequels
        // We look for the title with word boundaries, and ensure it's not followed by a number or common sequel indicators
        const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Negative lookahead for: space+digit, space+RomanNumeral, space+"Sequel", space+"Part", space+"Chapter"
        const sequelIndicators = '(?:\\s*(?:\\d+|II|III|IV|V|VI|VII|VIII|IX|X|Sequel|Part|Chapter|Prequel|Spin-off))';
        const regex = new RegExp(`^${escapedTitle}$|^${escapedTitle}${sequelIndicators}|\\b${escapedTitle}\\b(?!${sequelIndicators})`, 'i');
        
        return regex.test(n.headline) || (n.subtext && regex.test(n.subtext));
    }) || [];

    // Generate dynamic buzz based on phase if no real news exists
    const budget = project.budget || project.projectDetails?.estimatedBudget || 0;
    const actualGross = project.gross || project.totalGross || 0;
    const streamingRevenue = project.streamingRevenue || project.projectDetails?.streamingRevenue || 0;
    const soundtrackRevenue = project.soundtrackRevenue || 0;
    const projectRevenue = actualGross + streamingRevenue + soundtrackRevenue;
    const studioReceipts = Math.floor(actualGross * 0.5) + streamingRevenue + soundtrackRevenue;
    const investorPlan = project.investorPlan || project.projectDetails?.investorPlan;
    const investorPayouts = project.investorPayouts || project.projectDetails?.investorPayouts;
    const investorPayoutTotal = Math.max(0, Number(investorPayouts?.lifetimeInvestorPayout || 0));
    const studioNetAfterInvestors = Math.max(0, studioReceipts - investorPayoutTotal);
    const investorOwnerNames = investorPlan?.commitments
        ?.map(item => item.ownerName)
        .filter((name): name is string => Boolean(name))
        .slice(0, 2)
        .join(', ') || '';
    const investorOwnerExtraCount = Math.max(0, (investorPlan?.commitments?.filter(item => item.ownerName).length || 0) - 2);
    const investorScopeLabel = project.projectDetails?.mediaType === 'SERIES' ? tr('projectDashboard.revenue.seasonOnly') : tr('projectDashboard.revenue.projectOnly');

    const getDynamicBuzz = () => {
        if (relatedNews.length > 0) return relatedNews;

        const title = project.name || project.title || tr('projectDashboard.untitledProject');
        const genre = (project.genre || tr('projectDashboard.genre.drama')).toLowerCase();
        const phase = project.phase;
        const quality = project.projectDetails?.hiddenStats?.qualityScore || 50;
        const hype = project.promotionalBuzz || 50;
        const roi = budget > 0 ? (actualGross - budget) / budget : 0;

        const buzzItems: any[] = [];

        if (phase === 'CONCEPT' || phase === 'DEVELOPMENT' || phase === 'PLANNING') {
            buzzItems.push({
                week: tr('projectDashboard.news.week.current'),
                headline: tr('projectDashboard.news.earlyDevelopment.headline', { title }),
                subtext: tr('projectDashboard.news.earlyDevelopment.subtext', { title, genre }),
                impactLevel: 'LOW'
            });
            if (hype > 40) {
                buzzItems.push({
                    week: tr('projectDashboard.news.week.current'),
                    headline: tr('projectDashboard.news.highInterest.headline', { title }),
                    subtext: tr('projectDashboard.news.highInterest.subtext', { genre }),
                    impactLevel: 'MEDIUM'
                });
            }
        } else if (phase === 'PRE-PRODUCTION') {
            buzzItems.push({
                week: tr('projectDashboard.news.week.current'),
                headline: tr('projectDashboard.news.preProduction.headline', { title }),
                subtext: tr('projectDashboard.news.preProduction.subtext', { genre }),
                impactLevel: 'MEDIUM'
            });
            buzzItems.push({
                week: tr('projectDashboard.news.week.current'),
                headline: tr('projectDashboard.news.castingRumors.headline', { title }),
                subtext: tr('projectDashboard.news.castingRumors.subtext', { title }),
                impactLevel: 'LOW'
            });
            if (hype > 60) {
                buzzItems.push({
                    week: tr('projectDashboard.news.week.current'),
                    headline: tr('projectDashboard.news.socialHype.headline', { title }),
                    subtext: tr('projectDashboard.news.socialHype.subtext', { title }),
                    impactLevel: 'HIGH'
                });
            }
        } else if (phase === 'PRODUCTION') {
            buzzItems.push({
                week: tr('projectDashboard.news.week.current'),
                headline: tr('projectDashboard.news.firstLook.headline', { title }),
                subtext: tr('projectDashboard.news.firstLook.subtext', { title }),
                impactLevel: 'MEDIUM'
            });
            if (quality > 70) {
                buzzItems.push({
                    week: tr('projectDashboard.news.week.current'),
                    headline: tr('projectDashboard.news.productionSmooth.headline', { title }),
                    subtext: tr('projectDashboard.news.productionSmooth.subtext', { title }),
                    impactLevel: 'HIGH'
                });
            }
            buzzItems.push({
                week: tr('projectDashboard.news.week.current'),
                headline: tr('projectDashboard.news.directorUpdate.headline', { title }),
                subtext: tr('projectDashboard.news.directorUpdate.subtext', { title }),
                impactLevel: 'LOW'
            });
        } else if (phase === 'POST-PRODUCTION') {
            buzzItems.push({
                week: tr('projectDashboard.news.week.current'),
                headline: tr('projectDashboard.news.postProduction.headline', { title }),
                subtext: tr('projectDashboard.news.postProduction.subtext', { title }),
                impactLevel: 'MEDIUM'
            });
            buzzItems.push({
                week: tr('projectDashboard.news.week.current'),
                headline: tr('projectDashboard.news.testScreenings.headline', { title }),
                subtext: tr('projectDashboard.news.testScreenings.subtext', { title }),
                impactLevel: 'HIGH'
            });
            if (quality > 80) {
                buzzItems.push({
                    week: tr('projectDashboard.news.week.current'),
                    headline: tr('projectDashboard.news.awardsBuzz.headline', { title }),
                    subtext: tr('projectDashboard.news.awardsBuzz.subtext', { title }),
                    impactLevel: 'HIGH'
                });
            }
        } else if (phase === 'AWAITING RELEASE' || phase === 'PLANNED RELEASE') {
            buzzItems.push({
                week: tr('projectDashboard.news.week.current'),
                headline: tr('projectDashboard.news.marketingBlitz.headline', { title }),
                subtext: tr('projectDashboard.news.marketingBlitz.subtext', { title }),
                impactLevel: 'HIGH'
            });
            buzzItems.push({
                week: tr('projectDashboard.news.week.current'),
                headline: tr('projectDashboard.news.countdown.headline', { title }),
                subtext: tr('projectDashboard.news.countdown.subtext', { genre }),
                impactLevel: 'MEDIUM'
            });
            buzzItems.push({
                week: tr('projectDashboard.news.week.current'),
                headline: tr('projectDashboard.news.worldPremiere.headline', { title }),
                subtext: tr('projectDashboard.news.worldPremiere.subtext', { title }),
                impactLevel: 'HIGH'
            });
        } else if (phase === 'IN THEATERS' || phase === 'STREAMING' || phase === 'RELEASED') {
            if (quality > 80) {
                buzzItems.push({
                    week: tr('projectDashboard.news.week.release'),
                    headline: tr('projectDashboard.news.masterpiece.headline', { title }),
                    subtext: tr('projectDashboard.news.masterpiece.subtext', { title }),
                    impactLevel: 'HIGH'
                });
            } else if (quality < 40) {
                buzzItems.push({
                    week: tr('projectDashboard.news.week.release'),
                    headline: tr('projectDashboard.news.criticalMiss.headline', { title }),
                    subtext: tr('projectDashboard.news.criticalMiss.subtext', { title }),
                    impactLevel: 'MEDIUM'
                });
            } else {
                buzzItems.push({
                    week: tr('projectDashboard.news.week.release'),
                    headline: tr('projectDashboard.news.mixedReviews.headline', { title }),
                    subtext: tr('projectDashboard.news.mixedReviews.subtext', { title }),
                    impactLevel: 'LOW'
                });
            }

            if (roi > 2 && sequelEligibility.weeksElapsed >= 2) {
                buzzItems.push({
                    week: tr('projectDashboard.news.week.current'),
                    headline: tr('projectDashboard.news.juggernaut.headline', { title }),
                    subtext: tr('projectDashboard.news.juggernaut.subtext'),
                    impactLevel: 'HIGH'
                });
                buzzItems.push({
                    week: tr('projectDashboard.news.week.current'),
                    headline: tr('projectDashboard.news.sequelDemand.headline', { title }),
                    subtext: tr('projectDashboard.news.sequelDemand.subtext', { genre }),
                    impactLevel: 'MEDIUM'
                });
                buzzItems.push({
                    week: tr('projectDashboard.news.week.current'),
                    headline: tr('projectDashboard.news.sequelRumors.headline', { title }),
                    subtext: tr('projectDashboard.news.sequelRumors.subtext', { title }),
                    impactLevel: 'HIGH'
                });
            } else if (roi < -0.5) {
                buzzItems.push({
                    week: tr('projectDashboard.news.week.current'),
                    headline: tr('projectDashboard.news.boxOfficeStruggle.headline', { title }),
                    subtext: tr('projectDashboard.news.boxOfficeStruggle.subtext', { title }),
                    impactLevel: 'MEDIUM'
                });
            } else if (roi > 0.5) {
                buzzItems.push({
                    week: tr('projectDashboard.news.week.current'),
                    headline: tr('projectDashboard.news.solidPerformer.headline', { title }),
                    subtext: tr('projectDashboard.news.solidPerformer.subtext'),
                    impactLevel: 'LOW'
                });
                buzzItems.push({
                    week: tr('projectDashboard.news.week.current'),
                    headline: tr('projectDashboard.news.audienceMore.headline', { title }),
                    subtext: tr('projectDashboard.news.audienceMore.subtext', { title }),
                    impactLevel: 'MEDIUM'
                });
            }
        }

        return buzzItems;
    };

    const dynamicBuzz = getDynamicBuzz();

    const savePoster = (customPoster: CustomPoster) => {
        setLocalPoster(customPoster);
        const updatedPlayer = { ...player };
        const updatedStudio = { ...studio };
        let updated = false;

        const activeReleaseIndex = updatedPlayer.activeReleases.findIndex(r => r.id === project.id);
        if (activeReleaseIndex !== -1) {
            if (updatedPlayer.activeReleases[activeReleaseIndex].projectDetails) {
                updatedPlayer.activeReleases[activeReleaseIndex].projectDetails!.customPoster = customPoster;
                updated = true;
            }
        }

        if (!updated) {
            const pastProjectIndex = updatedPlayer.pastProjects.findIndex(p => p.id === project.id);
            if (pastProjectIndex !== -1) {
                updatedPlayer.pastProjects[pastProjectIndex].customPoster = customPoster;
                updated = true;
            }
        }

        if (!updated) {
            const commitmentIndex = updatedPlayer.commitments.findIndex(c => c.id === project.id);
            if (commitmentIndex !== -1) {
                if (updatedPlayer.commitments[commitmentIndex].projectDetails) {
                    updatedPlayer.commitments[commitmentIndex].projectDetails!.customPoster = customPoster;
                    updated = true;
                }
            }
        }

        if (!updated && Array.isArray((updatedStudio as any).library)) {
            const libraryIndex = (updatedStudio as any).library.findIndex((p: any) => p.id === project.id);
            if (libraryIndex !== -1) {
                (updatedStudio as any).library[libraryIndex].customPoster = customPoster;
                updated = true;
            }
        }

        if (!updated && updatedStudio.studioState?.concepts) {
            const conceptIndex = updatedStudio.studioState.concepts.findIndex(c => c.id === project.id);
            if (conceptIndex !== -1) {
                updatedStudio.studioState.concepts[conceptIndex].customPoster = customPoster;
                updated = true;
            }
        }

        if (!updated && updatedStudio.studioState?.scripts) {
            const scriptIndex = updatedStudio.studioState.scripts.findIndex(s => s.id === project.id);
            if (scriptIndex !== -1) {
                updatedStudio.studioState.scripts[scriptIndex].customPoster = customPoster;
                updated = true;
            }
        }

        if (updated) {
            updatedPlayer.businesses = updatedPlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b);
            onUpdatePlayer(updatedPlayer);
        }

        setView('DETAILS');
    };

    const renderPosterPreview = () => {
        if ((activePoster?.type === 'IMAGE' || activePoster?.type === 'CANVA') && (activePoster.imageData || activePoster.posterMediaId)) {
            return (
                <div className="w-full aspect-[2/3] bg-zinc-900 rounded-2xl overflow-hidden relative group shadow-2xl border border-white/10">
                    <CustomPosterImage poster={activePoster} alt={tr('projectDashboard.poster.alt')} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                </div>
            );
        }

        const bgGradient = activePoster?.bgGradient || getPosterBg(displayTitle);
        return (
            <div className={`w-full aspect-[2/3] rounded-2xl overflow-hidden relative bg-gradient-to-br ${bgGradient} flex flex-col items-center justify-center p-6 text-center border border-white/10 shadow-2xl group`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10"></div>
                <div className="relative z-10 w-full h-full flex flex-col justify-center gap-4">
                    <h3 className="text-3xl font-black uppercase tracking-tighter text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] leading-none mb-2">
                        {displayTitle}
                    </h3>
                </div>
                <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] pointer-events-none"></div>
            </div>
        );
    };

    // Mock Data for Charts
    const hypeData = [
        { name: 'Wk 1', hype: 20 },
        { name: 'Wk 2', hype: 35 },
        { name: 'Wk 3', hype: 45 },
        { name: 'Wk 4', hype: project.visibleHype === 'HIGH' ? 90 : project.visibleHype === 'MID' ? 60 : 30 },
    ];

    const radarData = [
        { subject: tr('projectDashboard.radar.script'), A: project.projectDetails?.hiddenStats?.scriptQuality || project.hiddenStats?.scriptQuality || 70, fullMark: 100 },
        { subject: tr('projectDashboard.radar.direction'), A: project.projectDetails?.hiddenStats?.directionQuality || 85, fullMark: 100 },
        { subject: tr('projectDashboard.radar.acting'), A: project.projectDetails?.hiddenStats?.actingQuality || 80, fullMark: 100 },
        { subject: tr('projectDashboard.radar.visuals'), A: project.projectDetails?.hiddenStats?.visualQuality || 75, fullMark: 100 },
        { subject: tr('projectDashboard.radar.buzz'), A: project.promotionalBuzz || 50, fullMark: 100 },
    ];

    // Get all staff
    const director = project.projectDetails?.director;
    const cast = project.projectDetails?.castList || project.projectDetails?.cast || [];
    const crew = project.projectDetails?.crewList || project.projectDetails?.crew || [];
    const allStaff = [
        ...(director ? [{ 
            ...director, 
            role: tr('projectDashboard.talent.director'), 
            isDirector: true, 
            isInHouse: director.id === 'STUDIO_STAFF',
            isPlayer: director.id === 'PLAYER_SELF'
        }] : []),
        ...cast.map((c: any) => ({ 
            ...c, 
            name: c.name || c.actorName || tr('projectDashboard.talent.unknown'),
            role: c.role || c.roleName || tr('projectDashboard.talent.cast'),
            isContracted: (studio.studioState?.talentRoster?.some(t => t.npcId === c.actorId) || 
                           player.studio?.talentRoster?.some(t => t.npcId === c.actorId)),
            isPlayer: c.actorId === 'PLAYER_SELF'
        })),
        ...crew.map((c: any) => ({ 
            ...c, 
            role: c.role || tr('projectDashboard.talent.crew'),
            isInHouse: c.id === 'STUDIO_STAFF',
            isPlayer: c.id === 'PLAYER_SELF'
        }))
    ];

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-2xl overflow-hidden">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleImageUpload}
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
            />

            {/* Atmospheric Background Layer */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                {(activePoster?.type === 'IMAGE' || activePoster?.type === 'CANVA') && (activePoster.imageData || activePoster.posterMediaId) ? (
                    <CustomPosterImage poster={activePoster} alt="" className="w-full h-full object-cover blur-[100px] scale-150" />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getPosterBg(project.name)} blur-[100px] scale-150`}></div>
                )}
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.98, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 30 }}
                className="relative z-10 w-full h-full lg:h-[90vh] lg:max-w-6xl lg:rounded-[40px] bg-zinc-950/40 border-0 lg:border lg:border-white/10 flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
                {/* Header / Close Button */}
                <div className="absolute top-6 right-6 z-50">
                    <button 
                        onClick={onClose} 
                        className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-all border border-white/10 active:scale-90"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 lg:pb-0">
                    <div className="flex flex-col lg:flex-row min-h-full">
                        
                        {/* Hero Section (Left on Desktop, Top on Mobile) */}
                        <div className="w-full lg:w-[400px] lg:h-full lg:sticky lg:top-0 shrink-0">
                            <div className="relative aspect-[3/4] lg:aspect-auto lg:h-full overflow-hidden">
                                {renderPosterPreview()}
                                
                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent lg:hidden"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-zinc-950 hidden lg:block"></div>

                                {/* Floating Badge */}
                                <div className="absolute top-6 left-6 flex flex-col gap-2">
                                    <div className="px-4 py-1.5 bg-amber-500 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">
                                        {phaseKey ? tr(`projectDashboard.phase.${phaseKey}`) : project.phase}
                                    </div>
                                    {project.phase === 'RELEASED' && (
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg backdrop-blur-md border ${
                                            actualGross > (project.budget || 0) * 5 ? 'bg-purple-500/80 text-white border-purple-400/50' :
                                            actualGross > (project.budget || 0) * 2 ? 'bg-emerald-500/80 text-white border-emerald-400/50' :
                                            actualGross < (project.budget || 0) ? 'bg-rose-500/80 text-white border-rose-400/50' :
                                            'bg-zinc-500/80 text-white border-zinc-400/50'
                                        }`}>
                                            {actualGross > (project.budget || 0) * 5 ? tr('projectDashboard.performance.blockbuster') :
                                             actualGross > (project.budget || 0) * 2 ? tr('projectDashboard.performance.boxOfficeHit') :
                                             actualGross < (project.budget || 0) ? tr('projectDashboard.performance.boxOfficeFlop') : tr('projectDashboard.performance.averagePerformer')}
                                        </div>
                                    )}
                                    {project.imdbRating && (
                                        <div className="px-4 py-1.5 bg-yellow-500 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-1 w-fit">
                                            <Star size={10} className="fill-black" />
                                            {project.imdbRating.toFixed(1)}/10
                                        </div>
                                    )}
                                </div>

                                {/* Title Overlay for Mobile */}
                                <div className="absolute bottom-10 left-8 right-8 z-20 lg:hidden">
                                    <h1 className="text-5xl font-serif italic text-white leading-none tracking-tight drop-shadow-2xl mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                                        {displayTitle}
                                    </h1>
                                    <div className="flex items-center gap-3 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                        <span>{project.type === 'SERIES' ? tr('projectDashboard.type.originalSeries') : tr('projectDashboard.type.featureFilm')}</span>
                                        <span className="w-1 h-1 bg-zinc-600 rounded-full"></span>
                                        <span>{project.genre || tr('projectDashboard.genre.drama')}</span>
                                    </div>
                                    {canRenameTitle && (
                                        <button
                                            type="button"
                                            onClick={() => setIsRenamingTitle(true)}
                                            className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-md transition-colors hover:border-amber-400/60 hover:text-amber-300"
                                        >
                                            <Edit3 size={13} />
                                            {tr('projectDashboard.action.editWorkingTitle')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="flex-1 p-8 lg:p-12 lg:pt-20">
                            {/* Desktop Title */}
                            <div className="hidden lg:block mb-12">
                                <motion.h1 
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-7xl font-serif italic text-white leading-none tracking-tight mb-4"
                                    style={{ fontFamily: "'Playfair Display', serif" }}
                                >
                                    {displayTitle}
                                </motion.h1>
                                <div className="flex items-center gap-4 text-sm font-bold text-zinc-500 uppercase tracking-[0.3em]">
                                    <span>{project.type === 'SERIES' ? tr('projectDashboard.type.originalSeries') : tr('projectDashboard.type.featureFilm')}</span>
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                    <span>{project.genre || tr('projectDashboard.genre.drama')}</span>
                                    {(project.rating || project.imdbRating) && (
                                        <>
                                            <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full"></span>
                                            <span className="flex items-center gap-1 text-white"><Star size={14} className="text-amber-500 fill-amber-500" /> {(project.rating || project.imdbRating).toFixed(1)}</span>
                                        </>
                                    )}
                                </div>
                                {canRenameTitle && (
                                    <button
                                        type="button"
                                        onClick={() => setIsRenamingTitle(true)}
                                        className="mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300"
                                    >
                                        <Edit3 size={14} />
                                        {tr('projectDashboard.action.editWorkingTitle')}
                                    </button>
                                )}
                            </div>

                            {/* Main Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                
                                {/* Summary */}
                                <div className="md:col-span-2">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-[1px] bg-amber-500"></div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{tr('projectDashboard.summary.title')}</h3>
                                    </div>
                                    <p className="text-xl lg:text-2xl font-light text-zinc-300 leading-relaxed font-serif italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                                        {project.description || project.concept?.description || tr('projectDashboard.summary.fallback')}
                                    </p>
                                </div>

                                 {/* Quick Stats */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:col-span-2">
                                    <div className="p-5 sm:p-6 bg-white/[0.03] rounded-3xl border border-white/5 backdrop-blur-sm flex flex-col justify-center h-[120px]">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{tr('projectDashboard.metric.productionCost')}</div>
                                        <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">
                                            {formatMoney(project.projectDetails?.estimatedBudget || project.budget || 0)}
                                        </div>
                                    </div>
                                    <div className="p-5 sm:p-6 bg-white/[0.03] rounded-3xl border border-white/5 backdrop-blur-sm flex flex-col justify-center h-[120px]">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{tr('projectDashboard.metric.buzzLevel')}</div>
                                        <div className="flex items-baseline gap-1 overflow-hidden">
                                            <div className="text-2xl sm:text-3xl font-bold text-amber-500 tracking-tight">
                                                {Math.round(project.promotionalBuzz || project.projectDetails?.hiddenStats?.qualityScore || 50)}
                                            </div>
                                            <div className="text-[10px] sm:text-sm font-bold text-zinc-600">/ 100</div>
                                        </div>
                                    </div>
                                    <div className="p-5 sm:p-6 bg-white/[0.03] rounded-3xl border border-white/5 backdrop-blur-sm flex flex-col justify-center h-[120px]">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{tr('projectDashboard.metric.release')}</div>
                                        <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">
                                            {releaseSummaryLabel}
                                        </div>
                                        <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                                            {releaseTiming.releaseWeek ? tr('projectDashboard.timeline.week', { week: releaseTiming.releaseWeek }) : tr('projectDashboard.timeline.history')}
                                        </div>
                                    </div>
                                    <div className="p-5 sm:p-6 bg-white/[0.03] rounded-3xl border border-white/5 backdrop-blur-sm flex flex-col justify-center h-[120px]">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{tr('projectDashboard.metric.timeline')}</div>
                                        <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">
                                            {timelineValue}
                                        </div>
                                        <div className="mt-1 truncate text-[10px] font-black uppercase tracking-widest text-zinc-600">
                                            {timelineCaption}
                                        </div>
                                    </div>

                                    {/* Financial Performance (Moved Up) */}
                                    {['RELEASED', 'STREAMING', 'IN THEATERS', 'BIDDING'].includes(project.phase) && (
                                        <>
                                            <div className="p-5 sm:p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 backdrop-blur-sm flex flex-col justify-center h-[120px] relative overflow-hidden group">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 mb-2 relative z-10">{tr('projectDashboard.revenue.projectRevenue')}</div>
                                                <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate relative z-10">
                                                    {formatMoney(projectRevenue)}
                                                </div>
                                                
                                                {/* Revenue Breakdown on Hover */}
                                                <div className="absolute inset-0 bg-zinc-900 p-4 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                    <div className="flex justify-between items-center text-xs mb-1">
                                                        <span className="text-zinc-400">{tr('projectDashboard.revenue.theatrical')}:</span>
                                                        <span className="text-white font-mono">{formatMoney(actualGross)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-zinc-400">{tr('projectDashboard.revenue.streaming')}:</span>
                                                        <span className="text-white font-mono">{formatMoney(streamingRevenue)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs mt-1">
                                                        <span className="text-zinc-400">{tr('projectDashboard.revenue.soundtrack')}:</span>
                                                        <span className="text-cyan-300 font-mono">{formatMoney(soundtrackRevenue)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-5 sm:p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 backdrop-blur-sm flex flex-col justify-center h-[120px]">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-blue-400/70 mb-2">{tr('projectDashboard.revenue.studioReceipts')}</div>
                                                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-blue-300">
                                                    {formatMoney(studioReceipts)}
                                                </div>
                                            </div>
                                            {investorPlan && investorPlan.totalRaised > 0 && (
                                                <div className="p-5 sm:p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 backdrop-blur-sm flex flex-col justify-center h-[120px]">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400/70 mb-2">{tr('projectDashboard.revenue.investorSplit')}</div>
                                                    <div className="flex items-baseline gap-2">
                                                        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-300">
                                                            {formatMoney(studioNetAfterInvestors)}
                                                        </div>
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{tr('projectDashboard.revenue.net')}</div>
                                                    </div>
                                                    <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                                                        {tr('projectDashboard.revenue.investorPaidKeeps', { paid: formatMoney(investorPayoutTotal), percent: investorPlan.studioEquityPercent })}
                                                    </div>
                                                    <div className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-emerald-300/50">
                                                        {investorScopeLabel}{investorOwnerNames ? ` • ${investorOwnerNames}${investorOwnerExtraCount > 0 ? ` +${investorOwnerExtraCount}` : ''}` : ''}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="p-5 sm:p-6 bg-amber-500/5 rounded-3xl border border-amber-500/10 backdrop-blur-sm flex flex-col justify-center h-[120px]">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-amber-500/60 mb-2">ROI</div>
                                                <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${(projectRevenue - budget) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {budget ? (((projectRevenue - budget) / budget) * 100).toFixed(0) : 0}%
                                                </div>
                                            </div>
                                            <div className="p-5 sm:p-6 bg-white/[0.03] rounded-3xl border border-white/5 backdrop-blur-sm flex flex-col justify-center h-[120px]">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{tr('projectDashboard.revenue.sources')}</div>
                                                <div className="flex items-center justify-between gap-3 text-xs font-bold text-zinc-300">
                                                    <span>{tr('projectDashboard.revenue.theaters')}</span>
                                                    <span className="font-mono text-white">{formatMoney(actualGross)}</span>
                                                </div>
                                                <div className="mt-1 flex items-center justify-between gap-3 text-xs font-bold text-zinc-300">
                                                    <span>{tr('projectDashboard.revenue.streaming')}</span>
                                                    <span className="font-mono text-white">{formatMoney(streamingRevenue)}</span>
                                                </div>
                                                {soundtrackRevenue > 0 && (
                                                    <div className="mt-1 flex items-center justify-between gap-3 text-xs font-bold text-zinc-300">
                                                        <span>{tr('projectDashboard.revenue.soundtrack')}</span>
                                                        <span className="font-mono text-cyan-300">{formatMoney(soundtrackRevenue)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* Release rollout section */}
                                    {(project.projectDetails?.releaseStrategy || project.releaseStrategy) && (
                                        <div className="col-span-2 md:col-span-2 lg:col-span-4 p-4 sm:p-8 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-[28px] sm:rounded-[40px] border border-amber-500/20 shadow-2xl shadow-amber-500/5 overflow-hidden relative group">
                                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity hidden sm:block">
                                                <Globe size={160} className="text-amber-500" />
                                            </div>
                                            
                                            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-8">
                                                <div className="flex items-center gap-3 sm:gap-6 w-full lg:w-auto">
                                                    <div className="w-10 h-10 sm:w-20 sm:h-20 bg-amber-500 rounded-xl sm:rounded-3xl flex items-center justify-center text-black shadow-xl shadow-amber-500/20 shrink-0">
                                                        <Globe size={18} className="sm:hidden" />
                                                        <Globe size={40} className="hidden sm:block" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[7px] sm:text-[12px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-amber-500/80 mb-0.5 sm:mb-2">{tr('projectDashboard.releaseStrategy.title')}</div>
                                                        <div className="text-lg sm:text-4xl font-serif italic text-white leading-tight sm:leading-tight tracking-tight truncate" style={{ fontFamily: "'Playfair Display', serif" }}>
                                                            {project.projectDetails?.releaseStrategy === 'THEATRICAL' ? tr('projectDashboard.releaseStrategy.theatrical') : 
                                                             project.projectDetails?.releaseStrategy === 'STREAMING_ONLY' ? tr('projectDashboard.releaseStrategy.streaming') : 
                                                             project.projectDetails?.releaseStrategy === 'HYBRID' ? tr('projectDashboard.releaseStrategy.hybrid') : tr('projectDashboard.releaseStrategy.standard')}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Stats Grid */}
                                                <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-start lg:justify-end gap-y-4 gap-x-4 sm:gap-16 w-full lg:w-auto border-t border-white/5 pt-4 sm:pt-8 lg:border-0 lg:pt-0">
                                                    <div className="flex flex-col items-start lg:items-end">
                                                        <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-0.5 sm:mb-2">{tr('projectDashboard.releaseStrategy.plannedWeek')}</div>
                                                        <div className="text-sm sm:text-3xl font-bold text-white tracking-tighter">{tr('projectDashboard.timeline.week', { week: project.projectDetails?.releaseDate || project.releaseDate || tr('projectDashboard.tba') })}</div>
                                                    </div>
                                                    
                                                    {project.projectDetails?.screeningStrategy && (
                                                        <div className="flex flex-col items-start lg:items-end">
                                                            <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-0.5 sm:mb-2">{tr('projectDashboard.releaseStrategy.scale')}</div>
                                                            <div className="text-sm sm:text-3xl font-bold text-white tracking-tighter">{project.projectDetails.screeningStrategy.replace('_', ' ')}</div>
                                                        </div>
                                                    )}

                                                    {project.projectDetails?.hiddenStats?.platformId && (
                                                        <div className="flex flex-col items-start lg:items-end col-span-2 sm:col-span-1">
                                                            <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-0.5 sm:mb-2">{tr('projectDashboard.releaseStrategy.platform')}</div>
                                                            <div className="text-sm sm:text-3xl font-bold text-amber-500 tracking-tighter">{PLATFORMS.find(p => p.id === project.projectDetails?.hiddenStats?.platformId)?.name || project.projectDetails?.hiddenStats?.platformId}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {isSeriesProject && scorecardRatings.length > 0 && (
                                    <SeriesScorecardPanel ratings={scorecardRatings} tr={tr} />
                                )}

                                {/* Timeline */}
                                <div className="md:col-span-2 bg-white/[0.02] rounded-[32px] p-6 sm:p-8 border border-white/5">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{tr('projectDashboard.timeline.productionJourney')}</h3>
                                        <div className="px-3 py-1 bg-zinc-800 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                            {PHASES.findIndex(p => p.id === project.phase) + 1} / {PHASES.length}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="flex items-center justify-between relative px-1 overflow-x-auto no-scrollbar gap-2 sm:gap-0">
                                            <div className="absolute left-4 right-4 top-4 sm:top-5 h-[1px] bg-zinc-800 z-0 hidden sm:block"></div>
                                            {PHASES.map((p, index) => {
                                                const isActive = project.phase === p.id;
                                                const isPast = PHASES.findIndex(phase => phase.id === project.phase) > index;
                                                return (
                                                    <div key={p.id} className="relative z-10 flex flex-col items-center shrink-0 sm:shrink">
                                                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-700 ${
                                                            isActive ? 'bg-amber-500 text-black shadow-[0_0_30px_rgba(245,158,11,0.4)] scale-110 sm:scale-125' : 
                                                            isPast ? 'bg-zinc-800 text-zinc-400' : 
                                                            'bg-zinc-900 text-zinc-700'
                                                        }`}>
                                                            {isActive ? <div className="animate-pulse">{p.icon}</div> : p.icon}
                                                        </div>
                                                        <span className={`hidden md:block text-[8px] font-black uppercase tracking-widest absolute -bottom-8 whitespace-nowrap ${isActive ? 'text-amber-500' : isPast ? 'text-zinc-500' : 'text-zinc-700'}`}>
                                                            {tr(`projectDashboard.phase.${p.id}`)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Production Team */}
                                <div className="bg-white/[0.02] rounded-[32px] p-8 border border-white/5">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-[1px] bg-amber-500"></div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{tr('projectDashboard.talent.productionTeam')}</h3>
                                        </div>
                                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                            {tr('projectDashboard.talent.members', { count: allStaff.length })}
                                        </div>
                                    </div>
                                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                        {allStaff.length > 0 ? allStaff.map((staff: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-2xl border border-white/5 group hover:bg-white/[0.06] transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                                        staff.isDirector ? 'bg-purple-500/20 text-purple-400' : 
                                                        staff.isPlayer ? 'bg-amber-500/20 text-amber-400' :
                                                        staff.isInHouse ? 'bg-emerald-500/20 text-emerald-400' :
                                                        'bg-zinc-800 text-zinc-400'
                                                    }`}>
                                                        {staff.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-white flex items-center gap-2">
                                                            {staff.name}
                                                            {staff.isPlayer && <span className="text-[7px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full font-black uppercase tracking-widest">{tr('projectDashboard.talent.you')}</span>}
                                                            {staff.isContracted && <span className="text-[7px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-black uppercase tracking-widest">{tr('projectDashboard.talent.contract')}</span>}
                                                            {staff.isInHouse && <span className="text-[7px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full font-black uppercase tracking-widest">{tr('projectDashboard.talent.inHouse')}</span>}
                                                        </div>
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{staff.role}</div>
                                                    </div>
                                                </div>
                                                {staff.isDirector && <Star size={12} className="text-amber-500 fill-amber-500" />}
                                            </div>
                                        )) : (
                                            <div className="text-center py-8 text-zinc-600 text-xs italic">{tr('projectDashboard.talent.noStaff')}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Project DNA Radar Chart */}
                                <div className="bg-white/[0.02] rounded-[32px] p-8 border border-white/5">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-[1px] bg-purple-500"></div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{tr('projectDashboard.radar.title')}</h3>
                                        </div>
                                    </div>
                                    <div className="h-[200px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                                <PolarGrid stroke="#27272a" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#52525b', fontSize: 10, fontWeight: 'bold' }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                                <Radar
                                                    name={tr('projectDashboard.radar.project')}
                                                    dataKey="A"
                                                    stroke="#8b5cf6"
                                                    fill="#8b5cf6"
                                                    fillOpacity={0.4}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Cast & Crew */}
                                <div className="md:col-span-2">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-[1px] bg-purple-500"></div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{tr('projectDashboard.talent.keyTalent')}</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* Director */}
                                        {project.projectDetails?.director && (
                                            <div className="p-5 bg-white/[0.03] rounded-3xl border border-white/5 flex items-center gap-4 group hover:bg-white/[0.05] transition-all">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-serif italic shadow-lg group-hover:scale-110 transition-transform">
                                                    {project.projectDetails.director.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-lg font-bold text-white leading-tight">{project.projectDetails.director.name}</div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-purple-400">{tr('projectDashboard.talent.director')}</div>
                                                </div>
                                            </div>
                                        )}
                                        {/* Cast */}
                                        {(project.projectDetails?.castList || project.projectDetails?.cast || []).map((actor: any, idx: number) => (
                                            <div key={idx} className="p-5 bg-white/[0.03] rounded-3xl border border-white/5 flex items-center gap-4 group hover:bg-white/[0.05] transition-all">
                                                <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 text-xl font-serif italic shadow-lg group-hover:scale-110 transition-transform overflow-hidden">
                                                    {actor.image ? <img src={actor.image} className="w-full h-full object-cover" alt="" /> : (actor.name || actor.actorName || '?').charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-lg font-bold text-white leading-tight flex items-center gap-2">
                                                        {actor.name || actor.actorName}
                                                        {actor.isReturning && <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">{tr('projectDashboard.talent.returning')}</span>}
                                                    </div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{actor.role || actor.roleName || tr('projectDashboard.talent.leadCast')}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>


                                 {/* Actions */}
                                <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 mt-8">
                                    {project.phase === 'BIDDING' && onStartStreamingBidding && (
                                        <button 
                                            onClick={() => onStartStreamingBidding(project)}
                                            className="flex-1 py-5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl hover:shadow-amber-500/20 flex items-center justify-center gap-3 active:scale-95 animate-pulse"
                                        >
                                            <TrendingUp size={20} /> {tr('projectDashboard.action.continueBiddingWar')}
                                        </button>
                                    )}
                                    {['RELEASED', 'IN THEATERS'].includes(project.phase) && !project.streaming && !project.streamingPlatform && onStartStreamingBidding && (
                                        <button 
                                            onClick={() => onStartStreamingBidding(project)}
                                            className="flex-1 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl hover:shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95"
                                        >
                                            <Tv size={20} /> {tr('projectDashboard.action.bidToPlatforms')}
                                        </button>
                                    )}
                                    {project.streaming && (() => {
                                        const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
                                        const weeksUntilStreaming =
                                            typeof project.streaming.startWeekAbsolute === 'number'
                                                ? project.streaming.startWeekAbsolute - currentAbsoluteWeek
                                                : (project.streaming.startWeek && player.currentWeek < project.streaming.startWeek
                                                    ? project.streaming.startWeek - player.currentWeek
                                                    : 0);

                                        if (weeksUntilStreaming <= 0) return null;

                                        return (
                                        <div className="flex-1 p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col justify-center items-center text-center">
                                            <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest mb-1">
                                                <Tv size={14} /> {tr('projectDashboard.action.streamingDealSecured')}
                                            </div>
                                            <div className="text-white font-bold text-sm">
                                                {tr('projectDashboard.action.liveOnPlatformInWeeks', { platform: PLATFORMS.find(p => p.id === project.streaming.platformId)?.name || tr('projectDashboard.releaseStrategy.platform'), weeks: weeksUntilStreaming })}
                                            </div>
                                        </div>
                                        );
                                    })()}
                                    {['RELEASED', 'IN THEATERS', 'STREAMING'].includes(project.phase) && onMakeSequel && (
                                        <div className="flex-1 flex flex-col gap-1">
                                            <button 
                                                onClick={() => onMakeSequel(project)}
                                                disabled={!sequelEligibility.eligible}
                                                className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl hover:shadow-amber-500/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                                            >
                                                <Sparkles size={20} /> {sequelEligibility.reason === 'ALREADY_IN_DEVELOPMENT' ? tr('projectDashboard.action.sequelInDev') : tr('projectDashboard.action.developSequel')}
                                            </button>
                                            {!sequelEligibility.eligible && (
                                                <p className="text-[8px] text-amber-500/60 font-black uppercase tracking-widest text-center">{sequelEligibility.message}</p>
                                            )}
                                        </div>
                                    )}
                                    {['RELEASED', 'IN THEATERS', 'STREAMING'].includes(project.phase) && onMakeSpinoff && (
                                        <div className="flex-1 flex flex-col gap-1">
                                            <button 
                                                onClick={() => onMakeSpinoff(project)}
                                                disabled={!spinoffEligibility.eligible}
                                                className="w-full py-5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all border border-white/10 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <Layers size={20} /> {spinoffEligibility.reason === 'ALREADY_IN_DEVELOPMENT' ? tr('projectDashboard.action.spinoffInDev') : tr('projectDashboard.action.developSpinoff')}
                                            </button>
                                            {!spinoffEligibility.eligible && (
                                                <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest text-center">{spinoffEligibility.message}</p>
                                            )}
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isPosterUploading}
                                        className="sm:w-auto px-8 py-5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all border border-zinc-800 flex items-center justify-center gap-3 active:scale-95 disabled:cursor-wait disabled:opacity-60"
                                    >
                                        <Edit3 size={20} /> {isPosterUploading ? tr('projectDashboard.action.saving') : tr('projectDashboard.action.editPoster')}
                                    </button>
                                </div>
                                {posterUploadError && (
                                    <div className="md:col-span-2 mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-200">
                                        {posterUploadError}
                                    </div>
                                )}

                                {/* News Section */}
                                <div className="md:col-span-2 mt-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-[1px] bg-zinc-700"></div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{tr('projectDashboard.news.mediaCoverage')}</h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={12} className="text-amber-500" />
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{tr('projectDashboard.news.liveFeed')}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {dynamicBuzz.length > 0 ? dynamicBuzz.slice(0, 4).map((news: any, idx: number) => (
                                            <div key={idx} className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 flex flex-col gap-2 hover:bg-white/[0.04] transition-all group">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="px-2 py-0.5 bg-zinc-800 rounded text-[8px] font-black text-zinc-400 uppercase tracking-widest">{news.week === tr('projectDashboard.news.week.current') ? tr('projectDashboard.news.latest') : news.week === tr('projectDashboard.news.week.release') ? tr('projectDashboard.news.review') : tr('projectDashboard.timeline.week', { week: news.week })}</div>
                                                    <div className={`text-[8px] font-bold uppercase tracking-widest transition-colors ${news.impactLevel === 'HIGH' ? 'text-rose-500' : news.impactLevel === 'MEDIUM' ? 'text-amber-500' : 'text-zinc-500'}`}>
                                                        {news.impactLevel === 'HIGH' ? tr('projectDashboard.news.breaking') : news.impactLevel === 'MEDIUM' ? tr('projectDashboard.news.trending') : tr('projectDashboard.news.industry')}
                                                    </div>
                                                </div>
                                                <div className="text-lg font-bold text-white leading-tight group-hover:text-amber-500 transition-colors">{news.headline}</div>
                                                <div className="text-sm text-zinc-500 font-medium line-clamp-2">{news.subtext}</div>
                                            </div>
                                        )) : (
                                            <div className="sm:col-span-2 p-12 bg-white/[0.01] rounded-[32px] border border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                                                <Info size={32} className="text-zinc-800 mb-4" />
                                                <div className="text-zinc-500 font-serif italic text-lg">{tr('projectDashboard.news.emptyQuote')}</div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-700 mt-2">{tr('projectDashboard.news.awaitingMilestones')}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
                {isRenamingTitle && (
                    <WorkingTitleDialog
                        mode="RENAME"
                        eyebrow={tr('projectDashboard.dialog.projectDetails')}
                        title={tr('projectDashboard.action.editWorkingTitle')}
                        description={tr('projectDashboard.dialog.description')}
                        initialTitle={displayTitle}
                        helperText={tr('projectDashboard.dialog.helper')}
                        infoText={tr('projectDashboard.dialog.info')}
                        onClose={() => setIsRenamingTitle(false)}
                        onConfirm={(title) => {
                            onRenameProject?.(title);
                            setIsRenamingTitle(false);
                        }}
                    />
                )}
            </motion.div>
        </div>
    );
};
