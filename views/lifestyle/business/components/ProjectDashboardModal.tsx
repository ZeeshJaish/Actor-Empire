import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Film, Tv, Users, DollarSign, Star, TrendingUp, Calendar, Check, Activity, Layers, Zap, Info, ChevronRight, Play, Settings, Camera, Award, BarChart3, Globe, BookOpen, Edit3, Sparkles } from 'lucide-react';
import { Player, Studio, CustomPoster, PlatformId } from '../../../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const formatMoney = (val: number) => {
    if (val >= 1_000_000_000_000) return `$${(val/1_000_000_000_000).toFixed(2)}T`;
    if (val >= 1_000_000_000) return `$${(val/1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `$${(val/1_000_000).toFixed(1)}M`;
    return `$${(val/1_000).toFixed(0)}k`;
};

const getWeeksSinceRelease = (currentWeek: number, releaseWeek: number) => {
    if (!releaseWeek) return 0;
    return currentWeek >= releaseWeek ? currentWeek - releaseWeek : (52 - releaseWeek) + currentWeek;
};

const PHASES = [
    { id: 'CONCEPT', label: 'Concept', icon: <Zap size={14} /> },
    { id: 'DEVELOPMENT', label: 'Development', icon: <BookOpen size={14} /> },
    { id: 'PLANNING', label: 'Planning', icon: <Layers size={14} /> },
    { id: 'PRE-PRODUCTION', label: 'Pre-Prod', icon: <Settings size={14} /> },
    { id: 'PRODUCTION', label: 'Production', icon: <Camera size={14} /> },
    { id: 'POST-PRODUCTION', label: 'Post-Prod', icon: <Activity size={14} /> },
    { id: 'AWAITING RELEASE', label: 'Release', icon: <Play size={14} /> },
    { id: 'PLANNED RELEASE', label: 'Planned', icon: <Calendar size={14} /> },
    { id: 'RELEASED', label: 'Archived', icon: <Award size={14} /> },
    { id: 'IN THEATERS', label: 'Theaters', icon: <Globe size={14} /> },
    { id: 'STREAMING', label: 'Streaming', icon: <Tv size={14} /> }
];

const PLATFORMS = [
    { id: 'NETFLIX', name: 'Netflix', baseBid: 15000000, qualityReq: 75, color: '#E50914', maxBudget: 150000000 },
    { id: 'APPLE_TV', name: 'Apple TV+', baseBid: 20000000, qualityReq: 85, color: '#FFFFFF', maxBudget: 200000000 },
    { id: 'DISNEY_PLUS', name: 'Disney+', baseBid: 12000000, qualityReq: 70, color: '#113CCF', maxBudget: 120000000 },
    { id: 'HULU', name: 'Hulu', baseBid: 8000000, qualityReq: 60, color: '#1CE783', maxBudget: 80000000 },
    { id: 'YOUTUBE', name: 'YouTube Premium', baseBid: 3000000, qualityReq: 40, color: '#FF0000', maxBudget: 30000000 }
];

interface ProjectDashboardModalProps {
    project: any;
    player: Player;
    studio: Studio;
    onClose: () => void;
    onUpdatePlayer: (player: Player) => void;
    onMakeSequel?: (project: any) => void;
    onMakeSpinoff?: (project: any) => void;
    onStartStreamingBidding?: (project: any) => void;
}

export const ProjectDashboardModal: React.FC<ProjectDashboardModalProps> = ({ project, player, studio, onClose, onUpdatePlayer, onMakeSequel, onMakeSpinoff, onStartStreamingBidding }) => {
    const [view, setView] = useState<'DETAILS'>('DETAILS');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const hasSequel = React.useMemo(() => {
        const franchiseId = project.franchiseId || project.id;
        const nextInstallment = (project.installmentNumber || 1) + 1;
        
        const inScripts = studio.studioState?.scripts?.some(s => s.franchiseId === franchiseId && s.sourceMaterial === 'SEQUEL' && s.installmentNumber === nextInstallment);
        const inActive = player.activeReleases?.some(r => r.franchiseId === franchiseId && r.sourceMaterial === 'SEQUEL' && r.installmentNumber === nextInstallment);
        const inPast = player.pastProjects?.some(p => p.franchiseId === franchiseId && p.sourceMaterial === 'SEQUEL' && p.installmentNumber === nextInstallment);
        const inConcepts = studio.studioState?.concepts?.some(c => {
            const script = studio.studioState?.scripts?.find(s => s.id === c.scriptId);
            return script && script.franchiseId === franchiseId && script.sourceMaterial === 'SEQUEL' && script.installmentNumber === nextInstallment;
        });
        
        return inScripts || inActive || inPast || inConcepts;
    }, [project, studio, player]);

    const hasSpinoff = React.useMemo(() => {
        const franchiseId = project.franchiseId || project.id;
        
        const inScripts = studio.studioState?.scripts?.some(s => s.franchiseId === franchiseId && s.sourceMaterial === 'SPINOFF');
        const inActive = player.activeReleases?.some(r => r.franchiseId === franchiseId && r.sourceMaterial === 'SPINOFF');
        const inPast = player.pastProjects?.some(p => p.franchiseId === franchiseId && p.sourceMaterial === 'SPINOFF');
        const inConcepts = studio.studioState?.concepts?.some(c => {
            const script = studio.studioState?.scripts?.find(s => s.id === c.scriptId);
            return script && script.franchiseId === franchiseId && script.sourceMaterial === 'SPINOFF';
        });
        
        return inScripts || inActive || inPast || inConcepts;
    }, [project, studio, player]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                savePoster({
                    type: 'IMAGE',
                    imageData: base64String
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const getCustomPoster = () => {
        return project.customPoster || project.projectDetails?.customPoster || project.concept?.customPoster;
    };

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

    const initialPoster = getCustomPoster();

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

    const getDynamicBuzz = () => {
        if (relatedNews.length > 0) return relatedNews;

        const title = project.name || project.title || "Untitled Project";
        const genre = (project.genre || 'Drama').toLowerCase();
        const phase = project.phase;
        const quality = project.projectDetails?.hiddenStats?.qualityScore || 50;
        const hype = project.promotionalBuzz || 50;
        const roi = budget > 0 ? (actualGross - budget) / budget : 0;

        const buzzItems: any[] = [];

        if (phase === 'CONCEPT' || phase === 'DEVELOPMENT' || phase === 'PLANNING') {
            buzzItems.push({
                week: 'Current',
                headline: `Rumors: ${title} in early development`,
                subtext: `Industry insiders are buzzing about a new ${genre} project titled "${title}".`,
                impactLevel: 'LOW'
            });
            if (hype > 40) {
                buzzItems.push({
                    week: 'Current',
                    headline: `High interest in ${title}`,
                    subtext: `Fans are already speculating about the cast for this upcoming ${genre} film.`,
                    impactLevel: 'MEDIUM'
                });
            }
        } else if (phase === 'PRE-PRODUCTION') {
            buzzItems.push({
                week: 'Current',
                headline: `${title} enters pre-production`,
                subtext: `The production team is finalizing locations and sets for the highly anticipated ${genre} epic.`,
                impactLevel: 'MEDIUM'
            });
            buzzItems.push({
                week: 'Current',
                headline: `Casting rumors for ${title}`,
                subtext: `Several A-list stars are reportedly being considered for key roles in "${title}".`,
                impactLevel: 'LOW'
            });
            if (hype > 60) {
                buzzItems.push({
                    week: 'Current',
                    headline: `Social media hype for ${title}`,
                    subtext: `Fans are creating fan art and theories for "${title}" even before filming starts.`,
                    impactLevel: 'HIGH'
                });
            }
        } else if (phase === 'PRODUCTION') {
            buzzItems.push({
                week: 'Current',
                headline: `First look at ${title} set`,
                subtext: `Leaked photos from the set of "${title}" show impressive production value and scale.`,
                impactLevel: 'MEDIUM'
            });
            if (quality > 70) {
                buzzItems.push({
                    week: 'Current',
                    headline: `Production on ${title} going smoothly`,
                    subtext: `Sources say the chemistry between the cast is "electric" on the set of "${title}".`,
                    impactLevel: 'HIGH'
                });
            }
            buzzItems.push({
                week: 'Current',
                headline: `Director shares update on ${title}`,
                subtext: `The director took to social media to praise the hard work of the crew on "${title}".`,
                impactLevel: 'LOW'
            });
        } else if (phase === 'POST-PRODUCTION') {
            buzzItems.push({
                week: 'Current',
                headline: `${title} enters post-production`,
                subtext: `The editing and VFX teams are now working to bring the vision of "${title}" to life.`,
                impactLevel: 'MEDIUM'
            });
            buzzItems.push({
                week: 'Current',
                headline: `Early test screenings for ${title}`,
                subtext: `Initial reactions to early cuts of "${title}" are reportedly very positive.`,
                impactLevel: 'HIGH'
            });
            if (quality > 80) {
                buzzItems.push({
                    week: 'Current',
                    headline: `Oscar buzz for ${title}?`,
                    subtext: `Early whispers suggest "${title}" could be a strong contender in the upcoming awards season.`,
                    impactLevel: 'HIGH'
                });
            }
        } else if (phase === 'AWAITING RELEASE' || phase === 'PLANNED RELEASE') {
            buzzItems.push({
                week: 'Current',
                headline: `Marketing blitz for ${title} begins`,
                subtext: `Trailers and posters for "${title}" are appearing everywhere as the release date approaches.`,
                impactLevel: 'HIGH'
            });
            buzzItems.push({
                week: 'Current',
                headline: `Fans count down to ${title}`,
                subtext: `Social media is flooded with excitement for the upcoming release of this ${genre} film.`,
                impactLevel: 'MEDIUM'
            });
            buzzItems.push({
                week: 'Current',
                headline: `World Premiere announced for ${title}`,
                subtext: `The red carpet event for "${title}" is set to be one of the biggest of the year.`,
                impactLevel: 'HIGH'
            });
        } else if (phase === 'IN THEATERS' || phase === 'STREAMING' || phase === 'RELEASED') {
            if (quality > 80) {
                buzzItems.push({
                    week: 'Release',
                    headline: `Critics hail ${title} as a masterpiece`,
                    subtext: `"${title}" is receiving rave reviews for its direction, acting, and stunning visuals.`,
                    impactLevel: 'HIGH'
                });
            } else if (quality < 40) {
                buzzItems.push({
                    week: 'Release',
                    headline: `${title} fails to impress critics`,
                    subtext: `Reviews for "${title}" have been harsh, citing a weak script and uninspired performances.`,
                    impactLevel: 'MEDIUM'
                });
            } else {
                buzzItems.push({
                    week: 'Release',
                    headline: `${title} receives mixed reviews`,
                    subtext: `Critics are divided on "${title}", praising some aspects while finding others lacking.`,
                    impactLevel: 'LOW'
                });
            }

            if (roi > 2 && getWeeksSinceRelease(player.currentWeek, (project.releaseWeek || project.projectDetails?.releaseDate || 0)) >= 2) {
                buzzItems.push({
                    week: 'Current',
                    headline: `${title} is a box office juggernaut`,
                    subtext: `The film has exceeded all financial expectations, becoming a massive hit for the studio.`,
                    impactLevel: 'HIGH'
                });
                buzzItems.push({
                    week: 'Current',
                    headline: `Fans demand a sequel to ${title}`,
                    subtext: `Social media campaigns are already calling for a follow-up to the successful ${genre} film.`,
                    impactLevel: 'MEDIUM'
                });
                buzzItems.push({
                    week: 'Current',
                    headline: `Sequel rumors for ${title}`,
                    subtext: `Insiders claim the studio is already fast-tracking a sequel to "${title}".`,
                    impactLevel: 'HIGH'
                });
            } else if (roi < -0.5) {
                buzzItems.push({
                    week: 'Current',
                    headline: `${title} struggles at the box office`,
                    subtext: `Despite high expectations, "${title}" has failed to find an audience in its opening weeks.`,
                    impactLevel: 'MEDIUM'
                });
            } else if (roi > 0.5) {
                buzzItems.push({
                    week: 'Current',
                    headline: `${title} is a solid performer`,
                    subtext: `The film is holding steady at the box office, proving to be a reliable hit for the studio.`,
                    impactLevel: 'LOW'
                });
                buzzItems.push({
                    week: 'Current',
                    headline: `Audience asking for more ${title}`,
                    subtext: `Fans are discussing potential spin-offs and sequels for the "${title}" universe.`,
                    impactLevel: 'MEDIUM'
                });
            }
        }

        return buzzItems;
    };

    const dynamicBuzz = getDynamicBuzz();

    const savePoster = (customPoster: CustomPoster) => {
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
            const commitmentIndex = updatedPlayer.commitments.findIndex(c => c.id === project.id);
            if (commitmentIndex !== -1) {
                if (updatedPlayer.commitments[commitmentIndex].projectDetails) {
                    updatedPlayer.commitments[commitmentIndex].projectDetails!.customPoster = customPoster;
                    updated = true;
                }
            }
        }

        if (!updated) {
            const libraryIndex = updatedStudio.library.findIndex(p => p.id === project.id);
            if (libraryIndex !== -1) {
                updatedStudio.library[libraryIndex].customPoster = customPoster;
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
        if (initialPoster?.imageData) {
            return (
                <div className="w-full aspect-[2/3] bg-zinc-900 rounded-2xl overflow-hidden relative group shadow-2xl border border-white/10">
                    <img src={initialPoster.imageData} alt="Custom Poster" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                </div>
            );
        }

        const bgGradient = initialPoster?.bgGradient || getPosterBg(project.name);
        return (
            <div className={`w-full aspect-[2/3] rounded-2xl overflow-hidden relative bg-gradient-to-br ${bgGradient} flex flex-col items-center justify-center p-6 text-center border border-white/10 shadow-2xl group`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10"></div>
                <div className="relative z-10 w-full h-full flex flex-col justify-center gap-4">
                    <h3 className="text-3xl font-black uppercase tracking-tighter text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] leading-none mb-2">
                        {project.name}
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
        { subject: 'Script', A: project.projectDetails?.hiddenStats?.scriptQuality || project.hiddenStats?.scriptQuality || 70, fullMark: 100 },
        { subject: 'Direction', A: project.projectDetails?.hiddenStats?.directionQuality || 85, fullMark: 100 },
        { subject: 'Acting', A: project.projectDetails?.hiddenStats?.actingQuality || 80, fullMark: 100 },
        { subject: 'Visuals', A: project.projectDetails?.hiddenStats?.visualQuality || 75, fullMark: 100 },
        { subject: 'Buzz', A: project.promotionalBuzz || 50, fullMark: 100 },
    ];

    // Get all staff
    const director = project.projectDetails?.director;
    const cast = project.projectDetails?.castList || project.projectDetails?.cast || [];
    const crew = project.projectDetails?.crewList || project.projectDetails?.crew || [];
    const allStaff = [
        ...(director ? [{ 
            ...director, 
            role: 'Director', 
            isDirector: true, 
            isInHouse: director.id === 'STUDIO_STAFF',
            isPlayer: director.id === 'PLAYER_SELF'
        }] : []),
        ...cast.map((c: any) => ({ 
            ...c, 
            name: c.name || c.actorName || 'Unknown',
            role: c.role || c.roleName || 'Cast',
            isContracted: (studio.studioState?.talentRoster?.some(t => t.npcId === c.actorId) || 
                           player.studio?.talentRoster?.some(t => t.npcId === c.actorId)),
            isPlayer: c.actorId === 'PLAYER_SELF'
        })),
        ...crew.map((c: any) => ({ 
            ...c, 
            role: c.role || 'Crew',
            isInHouse: c.id === 'STUDIO_STAFF',
            isPlayer: c.id === 'PLAYER_SELF'
        }))
    ];

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-2xl overflow-hidden">
            {/* Atmospheric Background Layer */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                {initialPoster?.imageData ? (
                    <img src={initialPoster.imageData} className="w-full h-full object-cover blur-[100px] scale-150" alt="" />
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
                                        {project.phase}
                                    </div>
                                    {project.phase === 'RELEASED' && (
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg backdrop-blur-md border ${
                                            actualGross > (project.budget || 0) * 5 ? 'bg-purple-500/80 text-white border-purple-400/50' :
                                            actualGross > (project.budget || 0) * 2 ? 'bg-emerald-500/80 text-white border-emerald-400/50' :
                                            actualGross < (project.budget || 0) ? 'bg-rose-500/80 text-white border-rose-400/50' :
                                            'bg-zinc-500/80 text-white border-zinc-400/50'
                                        }`}>
                                            {actualGross > (project.budget || 0) * 5 ? 'Blockbuster' :
                                             actualGross > (project.budget || 0) * 2 ? 'Box Office Hit' :
                                             actualGross < (project.budget || 0) ? 'Box Office Flop' : 'Average Performer'}
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
                                <div className="absolute bottom-10 left-8 right-8 lg:hidden">
                                    <h1 className="text-5xl font-serif italic text-white leading-none tracking-tight drop-shadow-2xl mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                                        {project.name}
                                    </h1>
                                    <div className="flex items-center gap-3 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                        <span>{project.type === 'SERIES' ? 'Original Series' : 'Feature Film'}</span>
                                        <span className="w-1 h-1 bg-zinc-600 rounded-full"></span>
                                        <span>{project.genre || 'Drama'}</span>
                                    </div>
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
                                    {project.name}
                                </motion.h1>
                                <div className="flex items-center gap-4 text-sm font-bold text-zinc-500 uppercase tracking-[0.3em]">
                                    <span>{project.type === 'SERIES' ? 'Original Series' : 'Feature Film'}</span>
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                    <span>{project.genre || 'Drama'}</span>
                                    {(project.rating || project.imdbRating) && (
                                        <>
                                            <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full"></span>
                                            <span className="flex items-center gap-1 text-white"><Star size={14} className="text-amber-500 fill-amber-500" /> {(project.rating || project.imdbRating).toFixed(1)}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Main Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                
                                {/* Summary */}
                                <div className="md:col-span-2">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-[1px] bg-amber-500"></div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Executive Summary</h3>
                                    </div>
                                    <p className="text-xl lg:text-2xl font-light text-zinc-300 leading-relaxed font-serif italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                                        {project.description || project.concept?.description || "A highly anticipated production currently in development. Our studio is dedicating top-tier resources to ensure this meets market expectations and delivers a profound cinematic experience."}
                                    </p>
                                </div>

                                 {/* Quick Stats */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:col-span-2">
                                    <div className="p-5 sm:p-6 bg-white/[0.03] rounded-3xl border border-white/5 backdrop-blur-sm flex flex-col justify-center h-[120px]">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Production Cost</div>
                                        <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">
                                            {formatMoney(project.projectDetails?.estimatedBudget || project.budget || 0)}
                                        </div>
                                    </div>
                                    <div className="p-5 sm:p-6 bg-white/[0.03] rounded-3xl border border-white/5 backdrop-blur-sm flex flex-col justify-center h-[120px]">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Buzz Level</div>
                                        <div className="flex items-baseline gap-1 overflow-hidden">
                                            <div className="text-2xl sm:text-3xl font-bold text-amber-500 tracking-tight">
                                                {Math.round(project.promotionalBuzz || project.projectDetails?.hiddenStats?.qualityScore || 50)}
                                            </div>
                                            <div className="text-[10px] sm:text-sm font-bold text-zinc-600">/ 100</div>
                                        </div>
                                    </div>

                                    {/* Financial Performance (Moved Up) */}
                                    {['RELEASED', 'STREAMING', 'IN THEATERS', 'BIDDING'].includes(project.phase) && (
                                        <>
                                            <div className="p-5 sm:p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 backdrop-blur-sm flex flex-col justify-center h-[120px] relative overflow-hidden group">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 mb-2 relative z-10">Total Revenue</div>
                                                <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate relative z-10">
                                                    {formatMoney(actualGross + (project.streamingRevenue || project.projectDetails?.streamingRevenue || 0))}
                                                </div>
                                                
                                                {/* Revenue Breakdown on Hover */}
                                                <div className="absolute inset-0 bg-zinc-900 p-4 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                    <div className="flex justify-between items-center text-xs mb-1">
                                                        <span className="text-zinc-400">Theatrical:</span>
                                                        <span className="text-white font-mono">{formatMoney(actualGross)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-zinc-400">Streaming:</span>
                                                        <span className="text-white font-mono">{formatMoney(project.streamingRevenue || project.projectDetails?.streamingRevenue || 0)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-5 sm:p-6 bg-amber-500/5 rounded-3xl border border-amber-500/10 backdrop-blur-sm flex flex-col justify-center h-[120px]">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-amber-500/60 mb-2">ROI</div>
                                                <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${((actualGross + (project.streamingRevenue || project.projectDetails?.streamingRevenue || 0)) - budget) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {budget ? (((actualGross + (project.streamingRevenue || project.projectDetails?.streamingRevenue || 0)) - budget) / budget * 100).toFixed(0) : 0}%
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Release Strategy Section */}
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
                                                        <div className="text-[7px] sm:text-[12px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-amber-500/80 mb-0.5 sm:mb-2">Release Strategy</div>
                                                        <div className="text-lg sm:text-4xl font-serif italic text-white leading-tight sm:leading-tight tracking-tight truncate" style={{ fontFamily: "'Playfair Display', serif" }}>
                                                            {project.projectDetails?.releaseStrategy === 'THEATRICAL' ? 'Theatrical Release' : 
                                                             project.projectDetails?.releaseStrategy === 'STREAMING_ONLY' ? 'Streaming Premiere' : 
                                                             project.projectDetails?.releaseStrategy === 'HYBRID' ? 'Hybrid Release' : 'Standard Release'}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Stats Grid */}
                                                <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-start lg:justify-end gap-y-4 gap-x-4 sm:gap-16 w-full lg:w-auto border-t border-white/5 pt-4 sm:pt-8 lg:border-0 lg:pt-0">
                                                    <div className="flex flex-col items-start lg:items-end">
                                                        <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-0.5 sm:mb-2">Release Date</div>
                                                        <div className="text-sm sm:text-3xl font-bold text-white tracking-tighter">Week {project.projectDetails?.releaseDate || project.releaseDate || 'TBD'}</div>
                                                    </div>
                                                    
                                                    {project.projectDetails?.screeningStrategy && (
                                                        <div className="flex flex-col items-start lg:items-end">
                                                            <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-0.5 sm:mb-2">Scale</div>
                                                            <div className="text-sm sm:text-3xl font-bold text-white tracking-tighter">{project.projectDetails.screeningStrategy.replace('_', ' ')}</div>
                                                        </div>
                                                    )}

                                                    {project.projectDetails?.hiddenStats?.platformId && (
                                                        <div className="flex flex-col items-start lg:items-end col-span-2 sm:col-span-1">
                                                            <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-0.5 sm:mb-2">Platform</div>
                                                            <div className="text-sm sm:text-3xl font-bold text-amber-500 tracking-tighter">{PLATFORMS.find(p => p.id === project.projectDetails?.hiddenStats?.platformId)?.name || project.projectDetails?.hiddenStats?.platformId}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Timeline */}
                                <div className="md:col-span-2 bg-white/[0.02] rounded-[32px] p-6 sm:p-8 border border-white/5">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Production Journey</h3>
                                        <div className="px-3 py-1 bg-zinc-800 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                            {PHASES.findIndex(p => p.id === project.phase) + 1} / {PHASES.length}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="flex items-center justify-between relative px-1 overflow-x-auto no-scrollbar gap-2 sm:gap-0">
                                            <div className="absolute left-4 right-4 top-4 sm:top-5 h-[1px] bg-zinc-800 z-0 hidden sm:block"></div>
                                            {PHASES.map((phase, index) => {
                                                const isActive = project.phase === phase.id;
                                                const isPast = PHASES.findIndex(p => p.id === project.phase) > index;
                                                return (
                                                    <div key={phase.id} className="relative z-10 flex flex-col items-center shrink-0 sm:shrink">
                                                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-700 ${
                                                            isActive ? 'bg-amber-500 text-black shadow-[0_0_30px_rgba(245,158,11,0.4)] scale-110 sm:scale-125' : 
                                                            isPast ? 'bg-zinc-800 text-zinc-400' : 
                                                            'bg-zinc-900 text-zinc-700'
                                                        }`}>
                                                            {isActive ? <div className="animate-pulse">{phase.icon}</div> : phase.icon}
                                                        </div>
                                                        <span className={`hidden md:block text-[8px] font-black uppercase tracking-widest absolute -bottom-8 whitespace-nowrap ${isActive ? 'text-amber-500' : isPast ? 'text-zinc-500' : 'text-zinc-700'}`}>
                                                            {phase.label}
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
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Production Team</h3>
                                        </div>
                                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                            {allStaff.length} Members
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
                                                            {staff.isPlayer && <span className="text-[7px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full font-black uppercase tracking-widest">You</span>}
                                                            {staff.isContracted && <span className="text-[7px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-black uppercase tracking-widest">Contract</span>}
                                                            {staff.isInHouse && <span className="text-[7px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full font-black uppercase tracking-widest">In-House</span>}
                                                        </div>
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{staff.role}</div>
                                                    </div>
                                                </div>
                                                {staff.isDirector && <Star size={12} className="text-amber-500 fill-amber-500" />}
                                            </div>
                                        )) : (
                                            <div className="text-center py-8 text-zinc-600 text-xs italic">No staff assigned yet.</div>
                                        )}
                                    </div>
                                </div>

                                {/* Project DNA Radar Chart */}
                                <div className="bg-white/[0.02] rounded-[32px] p-8 border border-white/5">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-[1px] bg-purple-500"></div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Project DNA</h3>
                                        </div>
                                    </div>
                                    <div className="h-[200px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                                <PolarGrid stroke="#27272a" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#52525b', fontSize: 10, fontWeight: 'bold' }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                                <Radar
                                                    name="Project"
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
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Key Talent</h3>
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
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-purple-400">Director</div>
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
                                                        {actor.isReturning && <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">Returning</span>}
                                                    </div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{actor.role || actor.roleName || 'Lead Cast'}</div>
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
                                            <TrendingUp size={20} /> Continue Bidding War
                                        </button>
                                    )}
                                    {['RELEASED', 'IN THEATERS'].includes(project.phase) && !project.streaming && !project.streamingPlatform && onStartStreamingBidding && (
                                        <button 
                                            onClick={() => onStartStreamingBidding(project)}
                                            className="flex-1 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl hover:shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95"
                                        >
                                            <Tv size={20} /> Bid to Platforms
                                        </button>
                                    )}
                                    {project.streaming && project.streaming.startWeek && player.currentWeek < project.streaming.startWeek && (
                                        <div className="flex-1 p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col justify-center items-center text-center">
                                            <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest mb-1">
                                                <Tv size={14} /> Streaming Deal Secured
                                            </div>
                                            <div className="text-white font-bold text-sm">
                                                Live on {PLATFORMS.find(p => p.id === project.streaming.platformId)?.name || 'Platform'} in {project.streaming.startWeek - player.currentWeek} weeks
                                            </div>
                                        </div>
                                    )}
                                    {['RELEASED', 'IN THEATERS', 'STREAMING'].includes(project.phase) && onMakeSequel && (
                                        <div className="flex-1 flex flex-col gap-1">
                                            <button 
                                                onClick={() => onMakeSequel(project)}
                                                disabled={hasSequel || getWeeksSinceRelease(player.currentWeek, (project.releaseWeek || project.projectDetails?.releaseDate || 0)) < 4}
                                                className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl hover:shadow-amber-500/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                                            >
                                                <Sparkles size={20} /> {hasSequel ? 'Sequel in Dev' : 'Develop Sequel'}
                                            </button>
                                            {!hasSequel && getWeeksSinceRelease(player.currentWeek, (project.releaseWeek || project.projectDetails?.releaseDate || 0)) < 4 && (
                                                <p className="text-[8px] text-amber-500/60 font-black uppercase tracking-widest text-center">Available in {4 - getWeeksSinceRelease(player.currentWeek, (project.releaseWeek || project.projectDetails?.releaseDate || 0))} weeks</p>
                                            )}
                                        </div>
                                    )}
                                    {['RELEASED', 'IN THEATERS', 'STREAMING'].includes(project.phase) && onMakeSpinoff && (
                                        <div className="flex-1 flex flex-col gap-1">
                                            <button 
                                                onClick={() => onMakeSpinoff(project)}
                                                disabled={hasSpinoff || getWeeksSinceRelease(player.currentWeek, (project.releaseWeek || project.projectDetails?.releaseDate || 0)) < 4}
                                                className="w-full py-5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all border border-white/10 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <Layers size={20} /> {hasSpinoff ? 'Spin-off in Dev' : 'Develop Spin-off'}
                                            </button>
                                            {!hasSpinoff && getWeeksSinceRelease(player.currentWeek, (project.releaseWeek || project.projectDetails?.releaseDate || 0)) < 4 && (
                                                <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest text-center">Available in {4 - getWeeksSinceRelease(player.currentWeek, (project.releaseWeek || project.projectDetails?.releaseDate || 0))} weeks</p>
                                            )}
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="sm:w-auto px-8 py-5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all border border-zinc-800 flex items-center justify-center gap-3 active:scale-95"
                                    >
                                        <Edit3 size={20} /> Edit Poster
                                    </button>
                                </div>

                                {/* News Section */}
                                <div className="md:col-span-2 mt-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-[1px] bg-zinc-700"></div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Media Coverage & Buzz</h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={12} className="text-amber-500" />
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Live Feed</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {dynamicBuzz.length > 0 ? dynamicBuzz.slice(0, 4).map((news: any, idx: number) => (
                                            <div key={idx} className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 flex flex-col gap-2 hover:bg-white/[0.04] transition-all group">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="px-2 py-0.5 bg-zinc-800 rounded text-[8px] font-black text-zinc-400 uppercase tracking-widest">{news.week === 'Current' ? 'Latest' : news.week === 'Release' ? 'Review' : `Week ${news.week}`}</div>
                                                    <div className={`text-[8px] font-bold uppercase tracking-widest transition-colors ${news.impactLevel === 'HIGH' ? 'text-rose-500' : news.impactLevel === 'MEDIUM' ? 'text-amber-500' : 'text-zinc-500'}`}>
                                                        {news.impactLevel === 'HIGH' ? 'Breaking' : news.impactLevel === 'MEDIUM' ? 'Trending' : 'Industry'}
                                                    </div>
                                                </div>
                                                <div className="text-lg font-bold text-white leading-tight group-hover:text-amber-500 transition-colors">{news.headline}</div>
                                                <div className="text-sm text-zinc-500 font-medium line-clamp-2">{news.subtext}</div>
                                            </div>
                                        )) : (
                                            <div className="sm:col-span-2 p-12 bg-white/[0.01] rounded-[32px] border border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                                                <Info size={32} className="text-zinc-800 mb-4" />
                                                <div className="text-zinc-500 font-serif italic text-lg">"The quiet before the storm. No major headlines yet."</div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-700 mt-2">Awaiting Production Milestones</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
