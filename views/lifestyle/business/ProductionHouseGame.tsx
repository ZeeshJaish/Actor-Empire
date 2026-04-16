import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, BudgetTier, Genre, ProjectDetails, ActiveRelease, Commitment, Business, LocationDetails, NewsItem, XPost, StudioEquipment, Script, Writer } from '../../../types';
import { ArrowLeft, Film, DollarSign, Users, TrendingUp, Calendar, Check, Plus, Star, Award, Zap, Briefcase, LayoutGrid, MapPin, PenTool, Globe, Camera, Clapperboard, ChevronRight, Lock, Building2, BarChart3, ShieldAlert, Crown, LogOut, AlertTriangle, Sparkles, BookOpen, Video, X, Clock, Palette, Lightbulb, Mic, Box, Tv, ArrowDownLeft, ArrowUpRight, WalletCards } from 'lucide-react';
import { NPC_DATABASE, getAvailableTalent, calculateProjectFameMultiplier } from '../../../services/npcLogic';
import { sellBusiness, liquidateBusiness } from '../../../services/businessLogic';
import { NPCActor, NPCTier } from '../../../types';
import { getDirectorTalent } from '../../../services/roleLogic';


import { DevelopmentLab } from './DevelopmentLab';
import { GreenlightWizard } from "./GreenlightWizard";
import { ReleaseWizard } from "./ReleaseWizard";

import { FacilitiesView } from './FacilitiesView';
import { StudioPage } from '../../StudioPage';
import { ProjectDashboardModal } from './components/ProjectDashboardModal';
import { SequelSetupModal } from './components/SequelSetupModal';
import { IPManagement } from './IPManagement';

interface ProductionHouseGameProps {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
}

type StudioView = 'DASHBOARD' | 'DEVELOPMENT' | 'PRE_PROD' | 'PRODUCTION' | 'RELEASE' | 'RELEASES' | 'OFFICE' | 'FINANCE' | 'GREENLIGHT' | 'TALENT' | 'IP_MANAGEMENT';

// --- HELPERS ---
const formatMoney = (val: number) => {
    if (isNaN(val)) return '$0';
    if (val >= 1_000_000_000_000) return `$${(val/1_000_000_000_000).toFixed(1)}T`;
    if (val >= 1_000_000_000) return `$${(val/1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `$${(val/1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val/1_000).toFixed(0)}k`;
    return `$${val}`;
};

export const ProductionHouseGame: React.FC<ProductionHouseGameProps> = ({ player, onBack, onUpdatePlayer }) => {
    const [view, setView] = useState<StudioView>('DASHBOARD');
    const [selectedProjectDashboard, setSelectedProjectDashboard] = useState<any>(null);
    const [sequelSetupProject, setSequelSetupProject] = useState<{ project: any, isSpinoff: boolean } | null>(null);
    
    // Locate the Studio Business
    const studio = player.businesses.find(b => b.type === 'PRODUCTION_HOUSE');
    if (!studio) return <div className="p-10 text-white">Error: Studio not found.</div>;

    // --- DATA AGGREGATION ---
    
    // 1. In-Development (Commitments)
    const studioCommitments = player.commitments.filter(c => 
        c.projectDetails && c.projectDetails.studioId === studio.id
    );

    const developmentProjects = studioCommitments.filter(c => c.projectPhase === 'PLANNING');
    const preProdProjects = studioCommitments.filter(c => c.projectPhase === 'PRE_PRODUCTION' || c.projectPhase === 'AUDITION');
    const productionProjects = studioCommitments.filter(c => c.projectPhase === 'PRODUCTION');
    const postProjects = studioCommitments.filter(c => c.projectPhase === 'POST_PRODUCTION');
    const awaitingReleaseProjects = studioCommitments.filter(c => c.projectPhase === 'AWAITING_RELEASE');

    // 2. Releases (Active & Past)
    const activeReleases = player.activeReleases.filter(r => r.projectDetails.studioId === studio.id);
    const library = player.pastProjects.filter(p => p.studioId === studio.id);

    // Calculate Latest Installments for Sequel Button
    const latestInstallmentIds = useMemo(() => {
        const franchises: Record<string, any> = {};
        // Consider ALL past projects to find the absolute latest in a franchise
        player.pastProjects.forEach(p => {
            if (p.projectType !== 'MOVIE') return;
            const fId = p.franchiseId || p.id;
            if (!franchises[fId] || (p.installmentNumber || 1) > (franchises[fId].installmentNumber || 1)) {
                franchises[fId] = p;
            }
        });
        return new Set(Object.values(franchises).map(p => p.id));
    }, [player.pastProjects]);

    // Calculate Studio Metrics
    const totalGross = activeReleases.reduce((sum, r) => sum + r.totalGross + (r.streamingRevenue || 0), 0) + library.reduce((sum, p) => sum + (p.gross || 0) + (p.streamingRevenue || 0), 0);
    const avgRating = library.length > 0 ? library.reduce((sum, p) => sum + (p.rating || 0), 0) / library.length : 0;
    
    // Calculate Awards Won
    const awardsWon = library.reduce((sum, p) => sum + (p.awards?.filter(a => a.outcome === 'WON').length || 0), 0);
    
    // Prestige Score (0-100)
    const prestigeScore = Math.min(100, Math.floor((avgRating * 5) + (awardsWon * 2) + (library.length * 0.5)));

    // Active Slate List (Combined for the Netflix-style row)
    const activeSlate = [
        ...(studio.studioState?.concepts?.map(c => {
            const script = studio.studioState?.scripts.find(s => s.id === c.scriptId);
            const isScripting = script?.status === 'IN_DEVELOPMENT';
            return {
                id: c.id,
                name: script ? script.title : 'Untitled Concept',
                type: script?.type || 'MOVIE',
                phase: isScripting ? 'DEVELOPMENT' : 'CONCEPT',
                risk: 'LOW',
                budget: 0,
                concept: c // Pass full concept for loading
            };
        }) || []),
        ...(studio.studioState?.scripts.filter(s => s.status === 'IN_DEVELOPMENT' && !studio.studioState?.concepts?.some(c => c.scriptId === s.id)).map(s => ({ 
            id: s.id, 
            name: s.name || s.title, 
            type: s.type,
            phase: 'DEVELOPMENT', 
            risk: 'LOW',
            budget: 0, // Not yet budgeted
            customPoster: s.customPoster
        })) || []),
        ...developmentProjects.map(p => ({ ...p, phase: 'PLANNING', risk: 'LOW' })),
        ...preProdProjects.map(p => ({ ...p, phase: 'PRE-PRODUCTION', risk: 'LOW' })),
        ...productionProjects.map(p => ({ ...p, phase: 'PRODUCTION', risk: 'HIGH' })),
        ...postProjects.map(p => ({ ...p, phase: 'POST-PRODUCTION', risk: 'MEDIUM' })),
        ...awaitingReleaseProjects.map(p => ({ 
            ...p, 
            phase: p.projectDetails?.releaseStrategy ? 'PLANNED RELEASE' : 'AWAITING RELEASE', 
            risk: 'LOW' 
        }))
    ];

    const pastProjectsSlate = [
        ...activeReleases.map(r => ({
            id: r.id,
            name: r.name,
            phase: r.distributionPhase === 'STREAMING' ? 'STREAMING' : r.distributionPhase === 'STREAMING_BIDDING' ? 'BIDDING' : 'IN THEATERS',
            rating: r.imdbRating,
            gross: r.totalGross,
            budget: r.budget,
            type: r.type,
            awards: [],
            views: r.streaming?.totalViews,
            streamingRevenue: r.streamingRevenue,
            projectDetails: r.projectDetails,
            bids: r.bids
        })),
        ...library.map(p => ({
            id: p.id,
            name: p.name,
            phase: 'RELEASED',
            rating: p.rating,
            gross: p.gross,
            budget: p.budget,
            type: p.type,
            awards: p.awards,
            views: p.totalViews,
            streamingRevenue: p.streamingRevenue,
            customPoster: p.customPoster
        }))
    ];

    // --- RENDER HELPERS ---
    
    const handleDeleteConcept = (conceptId: string) => {
        const updatedStudio = { ...studio };
        if (updatedStudio.studioState && updatedStudio.studioState.concepts) {
            updatedStudio.studioState.concepts = updatedStudio.studioState.concepts.filter(c => c.id !== conceptId);
            
            // Update player
            const updatedPlayer = { ...player };
            updatedPlayer.businesses = updatedPlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b);
            onUpdatePlayer(updatedPlayer);
        }
    };

    const handleStartStreamingBidding = (project: any) => {
        const updatedPlayer = { ...player };
        
        // Check if it's already an active release (e.g. already in BIDDING phase)
        const activeIndex = player.activeReleases?.findIndex(r => r.id === project.id);
        if (activeIndex !== undefined && activeIndex !== -1 && updatedPlayer.activeReleases) {
            setSelectedProjectDashboard(updatedPlayer.activeReleases[activeIndex]);
            setView('RELEASE');
            return;
        }

        // Find project in library (pastProjects)
        const libraryIndex = player.pastProjects.findIndex(p => p.id === project.id);
        if (libraryIndex !== -1) {
            const pastProject = player.pastProjects[libraryIndex];
            
            // Move to activeReleases with BIDDING phase
            const newActiveRelease: ActiveRelease = {
                id: pastProject.id,
                name: pastProject.name,
                type: pastProject.type || 'MOVIE',
                roleType: pastProject.roleType || 'LEAD',
                weekNum: 0,
                weeklyGross: [],
                status: 'FINISHED',
                productionPerformance: pastProject.projectQuality || 70,
                budget: pastProject.budget,
                totalGross: pastProject.gross || 0,
                distributionPhase: 'STREAMING_BIDDING',
                weeksInTheaters: (pastProject as any).weeksInTheaters || 0,
                imdbRating: pastProject.imdbRating || 50,
                projectDetails: (pastProject as any).projectDetails || {
                    title: pastProject.name,
                    type: pastProject.type || 'MOVIE',
                    description: pastProject.description || '',
                    studioId: studio.id,
                    subtype: pastProject.subtype || 'STANDALONE',
                    genre: pastProject.genre || 'DRAMA',
                    budgetTier: 'MID',
                    estimatedBudget: pastProject.budget,
                    visibleHype: 'MID',
                    hiddenStats: {
                        scriptQuality: pastProject.projectQuality || 50,
                        directorQuality: 50,
                        castingStrength: 50,
                        distributionPower: 50,
                        rawHype: 50,
                        qualityScore: pastProject.projectQuality || 50,
                        prestigeBonus: 0
                    },
                    directorName: 'Unknown',
                    visibleDirectorTier: 'Professional',
                    visibleScriptBuzz: 'Good',
                    visibleCastStrength: 'Strong'
                }
            };

            updatedPlayer.activeReleases = [...updatedPlayer.activeReleases, newActiveRelease];
            updatedPlayer.pastProjects = updatedPlayer.pastProjects.filter(p => p.id !== project.id);
            
            // Remove the project from any legacy in-studio library list if present.
            const updatedStudio = { ...studio } as any;
            if (Array.isArray(updatedStudio.library)) {
                updatedStudio.library = updatedStudio.library.filter((p: any) => p.id !== project.id);
            }
            updatedPlayer.businesses = updatedPlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b);

            onUpdatePlayer(updatedPlayer);
            setSelectedProjectDashboard(newActiveRelease);
            setView('RELEASE');
        }
    };

    const handleMakeSequel = (project: any) => {
        setSequelSetupProject({ project, isSpinoff: false });
    };

    const handleMakeSpinoff = (project: any) => {
        setSequelSetupProject({ project, isSpinoff: true });
    };

    const handleStartWritingSequel = (writer: Writer | null, title: string, isSpinoff: boolean) => {
        if (!sequelSetupProject) return;
        const project = sequelSetupProject.project;
        const updatedStudio = { ...studio };
        if (!updatedStudio.studioState) return;
        const isInternallyControlledTalent = (id: string) => id === 'PLAYER_SELF' || id === 'STUDIO_STAFF';

        // Deduct writer fee
        if (writer) {
            updatedStudio.balance -= writer.fee;
        }

        // Generate a new script based on the past project
        const newScriptId = `script-${Date.now()}`;
        
        // Calculate returning talent demands
        const details = project.projectDetails || project;
        const returningTalent: any[] = [];
        
        if (details.directorId) {
            const dirSalary = details.crewList?.find((c: any) => c.role === 'DIRECTOR')?.salary || project.budget * 0.05;
            returningTalent.push({
                role: 'DIRECTOR',
                id: details.directorId,
                originalSalary: dirSalary,
                newDemand: dirSalary * 1.2, // 20% bump
                negotiated: isInternallyControlledTalent(details.directorId),
                accepted: isInternallyControlledTalent(details.directorId),
                attemptsLeft: isInternallyControlledTalent(details.directorId) ? 0 : 3
            });
        }

        if (details.crewList) {
            details.crewList.forEach((crewMember: any) => {
                if (!crewMember?.id || crewMember.role === 'DIRECTOR') return;
                if (!['CINEMATOGRAPHER', 'COMPOSER', 'LINE_PRODUCER', 'VFX_SUPERVISOR'].includes(crewMember.role)) return;

                const originalSalary = crewMember.salary || project.budget * 0.02;
                returningTalent.push({
                    role: crewMember.role,
                    id: crewMember.id,
                    originalSalary,
                    newDemand: originalSalary * 1.18,
                    negotiated: isInternallyControlledTalent(crewMember.id),
                    accepted: isInternallyControlledTalent(crewMember.id),
                    attemptsLeft: isInternallyControlledTalent(crewMember.id) ? 0 : 3
                });
            });
        }
        
        const sourceCastList = details.castList;
        if (sourceCastList) {
            sourceCastList.forEach((c: any) => {
                if (c.actorId && c.actorId !== 'UNKNOWN') {
                    const originalSalary = c.salary || project.budget * (c.roleType === 'LEAD' ? 0.08 : 0.03);
                    returningTalent.push({
                        role: c.roleType === 'LEAD' ? 'LEAD_ACTOR' : 'SUPPORTING_ACTOR',
                        id: c.actorId,
                        originalSalary: originalSalary,
                        newDemand: originalSalary * 1.2, // 20% bump
                        negotiated: isInternallyControlledTalent(c.actorId),
                        accepted: isInternallyControlledTalent(c.actorId),
                        attemptsLeft: isInternallyControlledTalent(c.actorId) ? 0 : 3
                    });
                }
            });
        }

        const loglines = isSpinoff ? [
            `A thrilling new spin-off set in the universe of ${project.title}, exploring untold stories and new characters.`,
            `Expanding the world of ${project.title}, this spin-off takes the franchise in a bold and unexpected new direction.`,
            `Focusing on fan-favorite elements from ${project.title}, this new adventure stands on its own while honoring its roots.`
        ] : [
            `The highly anticipated next chapter in the epic saga of ${project.title}, raising the stakes higher than ever before.`,
            `Continuing the story of ${project.title}, our heroes face their greatest challenge yet in this explosive follow-up.`,
            `Building upon the events of ${project.title}, this sequel dives deeper into the lore and delivers shocking twists.`
        ];
        const randomLogline = loglines[Math.floor(Math.random() * loglines.length)];

        const newScript: Script = {
            id: newScriptId,
            title: title,
            logline: randomLogline,
            projectType: isSpinoff ? (project.type === 'MOVIE' ? 'SERIES' : 'MOVIE') : (project.type || 'MOVIE'),
            targetAudience: project.projectDetails?.targetAudience || project.targetAudience || 'PG-13',
            genres: [project.genre || 'ACTION'],
            quality: writer ? writer.skill : 50,
            status: 'IN_DEVELOPMENT',
            writerId: writer ? writer.id : 'studio',
            author: writer ? writer.name : 'In-House Writers',
            weeksInDevelopment: 0,
            totalDevelopmentWeeks: writer ? Math.max(4, 20 - writer.speed) : 10,
            isOriginal: false,
            options: [],
            sourceMaterial: isSpinoff ? 'SPINOFF' : 'SEQUEL',
            franchiseId: project.franchiseId || project.id,
            installmentNumber: isSpinoff ? 1 : (project.installmentNumber || 1) + 1,
            returningTalent
        };

        updatedStudio.studioState.scripts = [...(updatedStudio.studioState.scripts || []), newScript];

        // Create a ProjectConcept immediately for sequels so they appear in the Active Slate
        const newConcept: any = {
            id: `concept_${newScriptId}`,
            scriptId: newScriptId,
            lastUpdated: Date.now(),
            crewModes: {
                director: 'HIRE',
                cinematographer: 'HIRE',
                composer: 'HIRE',
                lineProducer: 'HIRE',
                vfx: 'HIRE'
            },
            selectedCrew: {
                director: null,
                cinematographer: null,
                composer: null,
                lineProducer: null,
                vfx: null
            },
            castList: [
                { id: 'lead_1', role: 'Lead Actor', roleType: 'LEAD', actorId: null },
                { id: 'supp_1', role: 'Supporting Actor', roleType: 'SUPPORTING', actorId: null }
            ],
            selectedLocations: [],
            equipmentChoices: {
                cameras: 'TIER_3',
                lighting: 'TIER_3',
                sound: 'TIER_3',
                practicalEffects: 'TIER_3'
            },
            tone: project.projectDetails?.tone || 50,
            lastStep: 'SELECT_SCRIPT'
        };

        // Pre-fill concept with previous project data
        // (details is already defined above)
        
        // Pre-fill director
        if (details.directorId) {
            newConcept.selectedCrew.director = details.directorId;
            newConcept.crewModes.director = details.directorId === 'PLAYER_SELF' ? 'SELF' : (details.directorId === 'STUDIO_STAFF' ? 'IN_HOUSE' : 'HIRE');
        }

        // Pre-fill other crew
        if (details.crewList && details.crewList.length > 0) {
            details.crewList.forEach((c: any) => {
                const roleKey = c.role.toLowerCase();
                if (roleKey === 'cinematographer' || roleKey === 'composer' || roleKey === 'line_producer' || roleKey === 'vfx_supervisor') {
                    const stateKey = roleKey === 'line_producer' ? 'lineProducer' : (roleKey === 'vfx_supervisor' ? 'vfx' : roleKey);
                    newConcept.selectedCrew[stateKey] = c.id;
                    newConcept.crewModes[stateKey] = c.id === 'PLAYER_SELF' ? 'SELF' : (c.id === 'STUDIO_STAFF' ? 'IN_HOUSE' : 'HIRE');
                }
            });
        }

        // Pre-fill cast
        if (details.castList && details.castList.length > 0) {
            newConcept.castList = details.castList.map((c: any) => {
                let salary = c.salary || 0;
                const returning = returningTalent.find(t => t.id === c.actorId);
                if (returning) {
                    salary = returning.newDemand;
                }
                return {
                    id: c.roleId || c.id,
                    role: c.roleName || c.role,
                    roleType: c.roleType,
                    actorId: c.actorId === 'UNKNOWN' ? null : c.actorId,
                    actorName: c.name || c.actorName,
                    salary: salary
                };
            });
        }

        // Pre-fill equipment
        if (details.equipmentChoices) {
            newConcept.equipmentChoices = { ...details.equipmentChoices };
        }

        // Pre-fill tone and style
        if (details.tone !== undefined) newConcept.tone = details.tone;
        if (details.visualStyle) newConcept.visualStyle = details.visualStyle;
        if (details.pacing) newConcept.pacing = details.pacing;

        if (!updatedStudio.studioState.concepts) updatedStudio.studioState.concepts = [];
        updatedStudio.studioState.concepts.push(newConcept);

        // Update player
        const updatedPlayer = { ...player };
        updatedPlayer.businesses = updatedPlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b);
        onUpdatePlayer(updatedPlayer);
        
        // Close modals and open Development Lab
        setSequelSetupProject(null);
        setSelectedProjectDashboard(null);
        setView('DEVELOPMENT');
    };


    const [selectedConcept, setSelectedConcept] = useState<any>(null);

    const currentProject = React.useMemo(() => {
        if (!selectedProjectDashboard) return null;
        
        // Find in active releases
        const active = player.activeReleases?.find(r => r.id === selectedProjectDashboard.id);
        if (active) {
            return {
                ...active,
                phase: active.distributionPhase === 'STREAMING' ? 'STREAMING' : active.distributionPhase === 'STREAMING_BIDDING' ? 'BIDDING' : 'IN THEATERS'
            };
        }
        
        // Find in past projects
        const past = player.pastProjects?.find(p => p.id === selectedProjectDashboard.id);
        if (past) {
            return {
                ...past,
                phase: 'RELEASED'
            };
        }
        
        return selectedProjectDashboard;
    }, [selectedProjectDashboard, player]);

    if (view === 'FINANCE') {
        return <StudioFinanceView player={player} studio={studio} onBack={() => setView('DASHBOARD')} onUpdatePlayer={onUpdatePlayer} onExit={onBack} />;
    }

    if (view === 'DEVELOPMENT') {
        return <DevelopmentLab player={player} studio={studio} onBack={() => setView('DASHBOARD')} onUpdatePlayer={onUpdatePlayer} />;
    }

    if (view === 'OFFICE') {
        return <FacilitiesView player={player} studio={studio} onBack={() => setView('DASHBOARD')} onUpdatePlayer={onUpdatePlayer} />;
    }

    if (view === 'TALENT') {
        return <StudioPage player={player} onUpdatePlayer={onUpdatePlayer} onBack={() => setView('DASHBOARD')} />;
    }

    if (view === 'IP_MANAGEMENT') {
        return <IPManagement player={player} studio={studio} onUpdatePlayer={onUpdatePlayer} onBack={() => setView('DASHBOARD')} />;
    }

    if (view === 'RELEASE' && currentProject) {
        return (
            <ReleaseWizard 
                player={player} 
                studio={studio} 
                project={currentProject} 
                isPostTheatricalBidding={currentProject.distributionPhase === 'STREAMING_BIDDING' || currentProject.distributionPhase === 'THEATRICAL' || currentProject.phase === 'BIDDING' || currentProject.phase === 'RELEASED' || currentProject.phase === 'IN THEATERS'}
                onBack={() => { 
                    setView('DASHBOARD'); 
                }} 
                onUpdatePlayer={onUpdatePlayer} 
                onComplete={() => { 
                    setView('DASHBOARD'); 
                }} 
            />
        );
    }

    return (
        <AnimatePresence mode="wait">
            {currentProject && (
                <ProjectDashboardModal 
                    project={currentProject}
                    player={player}
                    studio={studio}
                    onClose={() => setSelectedProjectDashboard(null)}
                    onUpdatePlayer={onUpdatePlayer}
                    onMakeSequel={handleMakeSequel}
                    onMakeSpinoff={handleMakeSpinoff}
                    onStartStreamingBidding={handleStartStreamingBidding}
                    onConfigureRelease={(p) => {
                        setSelectedProjectDashboard(p);
                        setView('RELEASE');
                    }}
                />
            )}
            {sequelSetupProject && (
                <SequelSetupModal
                    project={sequelSetupProject.project}
                    player={player}
                    studio={studio}
                    isSpinoff={sequelSetupProject.isSpinoff}
                    onClose={() => setSequelSetupProject(null)}
                    onStartWriting={handleStartWritingSequel}
                />
            )}
            {view === 'GREENLIGHT' ? (
                <motion.div 
                    key="greenlight"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="fixed inset-0 z-[60]"
                >
                    <GreenlightWizard 
                        player={player} 
                        studio={studio} 
                        initialConcept={selectedConcept}
                        onBack={() => {
                            setSelectedConcept(null);
                            setView('DASHBOARD');
                        }} 
                        onUpdatePlayer={onUpdatePlayer} 
                        onComplete={() => {
                            setSelectedConcept(null);
                            setView('DASHBOARD');
                        }}
                    />
                </motion.div>
            ) : (
                <motion.div 
                    key="dashboard"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="fixed inset-0 z-[60] bg-[#050505] text-white flex flex-col font-sans"
                >
            
            {/* 1. HERO SECTION (Executive Overview) */}
            <div className="relative shrink-0 z-20 bg-zinc-950 border-b border-zinc-800 overflow-hidden">
                {/* Background Glow / Texture */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-zinc-950 to-zinc-950"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

                {/* Top Nav Bar (with pt-12 for mobile status bar) */}
                <div className="relative flex items-center justify-between px-4 pt-12 pb-4">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-zinc-800/50 rounded-full text-zinc-400 hover:text-white transition-colors backdrop-blur-sm">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="font-serif font-black uppercase tracking-tight text-xl text-white drop-shadow-md">{studio.name}</span>
                                <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                    {studio.subtype === 'MAJOR_STUDIO' ? 'Major' : 'Indie'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-0.5">
                                <MapPin size={10} />
                                <span>{studio.subtype === 'MAJOR_STUDIO' ? 'Hollywood, CA' : 'Burbank, CA'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Valuation & Cash (The "Wow" Factor) */}
                <div className="relative px-6 pb-6 flex justify-between items-end">
                    <div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Studio Valuation</div>
                        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-sm tracking-tight">
                            {formatMoney(studio.stats.valuation)}
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Studio Capital</div>
                        <div className="text-lg font-mono font-bold text-emerald-400 drop-shadow-sm">
                            {formatMoney(studio.balance)}
                        </div>
                        {(studio.studioState?.productionFund || 0) > 0 && (
                            <div className="text-[9px] text-emerald-500/70 font-bold uppercase mt-1">
                                + {formatMoney(studio.studioState!.productionFund!)} Prod. Fund
                            </div>
                        )}
                    </div>
                </div>

                {/* Metrics Strip */}
                <div className="relative bg-black/40 backdrop-blur-md border-t border-white/5">
                    <div className="flex overflow-x-auto no-scrollbar py-3 px-6 gap-8">
                        <div className="flex flex-col shrink-0">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5"><Star size={10} className="text-yellow-500"/> Avg Rating</span>
                            <span className="text-white font-bold text-sm">{avgRating > 0 ? avgRating.toFixed(1) : '-.--'}</span>
                        </div>
                        <div className="w-px h-8 bg-zinc-800 shrink-0"></div>
                        <div className="flex flex-col shrink-0">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5"><Award size={10} className="text-amber-500"/> Awards Won</span>
                            <span className="text-white font-bold text-sm">{awardsWon}</span>
                        </div>
                        <div className="w-px h-8 bg-zinc-800 shrink-0"></div>
                        <div className="flex flex-col shrink-0">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5"><Film size={10} className="text-blue-400"/> Total Films</span>
                            <span className="text-white font-bold text-sm">{library.length}</span>
                        </div>
                        <div className="w-px h-8 bg-zinc-800 shrink-0"></div>
                        <div className="flex flex-col shrink-0">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5"><TrendingUp size={10} className="text-emerald-500"/> Lifetime B.O.</span>
                            <span className="text-emerald-400 font-mono font-bold text-sm">{formatMoney(totalGross)}</span>
                        </div>
                        <div className="w-px h-8 bg-zinc-800 shrink-0"></div>
                        <div className="flex flex-col shrink-0">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5"><Crown size={10} className="text-purple-500"/> Prestige</span>
                            <span className="text-white font-bold text-sm">{prestigeScore}/100</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN SCROLLABLE AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                
                {/* 2. ACTIVE SLATE (Netflix Style) */}
                <div className="pt-6 pb-2">
                    <div className="px-4 mb-3 flex justify-between items-end">
                        <h2 className="text-lg font-bold text-white tracking-tight">Active Slate</h2>
                    </div>
                    
                    <div className="flex gap-4 overflow-x-auto px-4 pb-4 no-scrollbar">
                        {/* New Project Tile */}
                        <button onClick={() => setView('GREENLIGHT')} className="min-w-[140px] w-[140px] h-[210px] rounded-lg border-2 border-dashed border-amber-500/50 bg-amber-500/5 flex flex-col items-center justify-center gap-3 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500 hover:scale-105 transition-all duration-300 group shrink-0 relative overflow-hidden shadow-lg">
                            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/0 to-amber-500/10"></div>
                            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500/30 transition-all duration-300">
                                <Plus size={24} className="text-amber-400" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest drop-shadow-sm">New Project</span>
                        </button>

                        {/* Active Projects */}
                        {activeSlate.map((p, idx) => (
                            <ActiveProjectCard 
                                key={p.id || idx} 
                                project={p} 
                                onClick={() => {
                                    if (p.phase === 'CONCEPT' || (p.phase === 'DEVELOPMENT' && p.concept)) {
                                        setSelectedConcept(p.concept);
                                        setView('GREENLIGHT');
                                    } else if (p.phase === 'AWAITING RELEASE') {
                                        setSelectedProjectDashboard(p);
                                        setView('RELEASE');
                                    } else {
                                        setSelectedProjectDashboard(p);
                                    }
                                }}
                                onDelete={(p.phase === 'CONCEPT' || (p.phase === 'DEVELOPMENT' && p.concept)) ? () => handleDeleteConcept(p.id) : undefined}
                            />
                        ))}
                    </div>
                </div>

                {/* RECENT ARCHIVE (Past Projects) */}
                {pastProjectsSlate.length > 0 && (
                    <div className="pt-2 pb-6">
                        <div className="px-4 mb-3">
                            <h2 className="text-lg font-bold text-white tracking-tight">Past Projects</h2>
                        </div>
                        <div className="flex gap-4 overflow-x-auto px-4 pb-4 no-scrollbar">
                            {pastProjectsSlate.map(p => (
                                <ArchiveProjectCard 
                                    key={p.id} 
                                    project={p as any} 
                                    isLatestInstallment={latestInstallmentIds.has(p.id)}
                                    onClick={() => {
                                        setSelectedProjectDashboard(p);
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. CORPORATE DIVISIONS (Lower Section) */}
                <div className="px-4 pb-8">
                    <h2 className="text-lg font-bold text-white tracking-tight mb-4">Corporate Divisions</h2>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {/* Development Division */}
                        <DivisionCard 
                            title="Dev Lab"
                            subtitle="Scripts & IP"
                            icon={<PenTool size={20}/>}
                            color="bg-blue-600"
                            stats={[
                                { label: "Scripts", value: studio.studioState?.scripts.length.toString() || "0" }
                            ]}
                            onClick={() => setView('DEVELOPMENT')}
                        />

                        {/* Production Infrastructure */}
                        <DivisionCard 
                            title="Facilities"
                            subtitle="Upgrades"
                            icon={<Building2 size={20}/>}
                            color="bg-emerald-600"
                            stats={[
                                { label: "Tier", value: studio.subtype === 'MAJOR_STUDIO' ? 'Major' : 'Indie' }
                            ]}
                            onClick={() => setView('OFFICE')}
                        />

                        {/* Talent Division */}
                        <DivisionCard 
                            title="Talent"
                            subtitle="Farm System"
                            icon={<Users size={20}/>}
                            color="bg-purple-600"
                            stats={[
                                { label: "Stars", value: (player.studio?.talentRoster?.length || 0).toString() }
                            ]}
                            onClick={() => setView('TALENT')}
                        />

                        {/* Finance Division */}
                        <DivisionCard 
                            title="Finance"
                            subtitle="P&L & Capital"
                            icon={<DollarSign size={20}/>}
                            color="bg-amber-600"
                            stats={[
                                { label: "Capital", value: formatMoney(studio.balance) }
                            ]}
                            onClick={() => setView('FINANCE')}
                        />
                    </div>
                </div>

            </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// --- SUB-COMPONENTS ---


// --- SUB-COMPONENTS FOR GREENLIGHT WIZARD ---




const FinanceModal: React.FC<{
    player: Player;
    studio: Business;
    onClose: () => void;
    onUpdatePlayer: (p: Player) => void;
}> = ({ player, studio, onClose, onUpdatePlayer }) => {
    const [amountStr, setAmountStr] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const amount = parseInt(amountStr.replace(/[^\d]/g, ''), 10) || 0;

    const handleInject = () => {
        if (amount <= 0) {
            setErrorMsg('Enter a valid amount to inject.');
            return;
        }
        if (amount > player.money) {
            setErrorMsg('Not enough personal cash to inject that amount.');
            return;
        }
        const updatedStudio = { 
            ...studio, 
            balance: studio.balance + amount,
            studioState: {
                ...studio.studioState,
                financeLedger: [{
                    id: `studio_ledger_inject_${player.age}_${player.currentWeek}_${Date.now()}`,
                    week: player.currentWeek,
                    year: player.age,
                    amount,
                    type: 'CAPITAL_INJECTION',
                    label: 'Owner capital injection'
                }, ...((studio.studioState?.financeLedger || []))].slice(0, 200)
            }
        };
        const updatedBusinesses = player.businesses.map(b => b.id === studio.id ? updatedStudio : b);
        onUpdatePlayer({
            ...player,
            money: player.money - amount,
            businesses: updatedBusinesses
        });
        setErrorMsg('');
        setAmountStr('');
    };

    const handleWithdraw = () => {
        if (amount <= 0) {
            setErrorMsg('Enter a valid amount to withdraw.');
            return;
        }
        if (amount > studio.balance) {
            setErrorMsg('Studio capital is lower than that withdrawal amount.');
            return;
        }
        const updatedStudio = { 
            ...studio, 
            balance: studio.balance - amount,
            studioState: {
                ...studio.studioState,
                financeLedger: [{
                    id: `studio_ledger_withdraw_${player.age}_${player.currentWeek}_${Date.now()}`,
                    week: player.currentWeek,
                    year: player.age,
                    amount: -amount,
                    type: 'CAPITAL_WITHDRAWAL',
                    label: 'Owner withdrawal'
                }, ...((studio.studioState?.financeLedger || []))].slice(0, 200)
            }
        };
        const updatedBusinesses = player.businesses.map(b => b.id === studio.id ? updatedStudio : b);
        onUpdatePlayer({
            ...player,
            money: player.money + amount,
            businesses: updatedBusinesses
        });
        setErrorMsg('');
        setAmountStr('');
    };

    const formatMoney = (val: number | undefined | null) => {
        if (val === undefined || val === null || isNaN(val)) return '$0';
        if (Math.abs(val) >= 1_000_000_000_000) return `$${(val / 1_000_000_000_000).toFixed(1)}T`;
        if (Math.abs(val) >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
        if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}k`;
        return `$${val.toLocaleString()}`;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
                    <h3 className="font-bold text-white">Manage Studio Funds</h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white"><ArrowLeft size={20} className="rotate-180" /></button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                        <div>
                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Personal Cash</div>
                            <div className="text-lg font-mono font-bold text-white">{formatMoney(player.money)}</div>
                        </div>
                        <ArrowLeft size={20} className="text-zinc-600 rotate-180" />
                        <div className="text-right">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Studio Capital</div>
                            <div className="text-lg font-mono font-bold text-emerald-400">{formatMoney(studio.balance)}</div>
                            {(studio.studioState?.productionFund || 0) > 0 && (
                                <div className="text-[9px] text-emerald-500/70 font-bold uppercase mt-1">
                                    + {formatMoney(studio.studioState!.productionFund!)} Prod. Fund
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Amount</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                            <input 
                                type="text" 
                                value={amountStr} 
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^\d]/g, '');
                                    setErrorMsg('');
                                    setAmountStr(val ? parseInt(val).toLocaleString() : '');
                                }}
                                placeholder="0"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 pl-8 pr-4 text-white font-mono font-bold text-lg focus:border-amber-500 focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-zinc-500">Available: {formatMoney(player.money)} personal / {formatMoney(studio.balance)} studio</span>
                            {amount > 0 && <span className="text-zinc-600">Parsed: {formatMoney(amount)}</span>}
                        </div>
                        {errorMsg && (
                            <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300">
                                {errorMsg}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={handleWithdraw}
                            disabled={amount <= 0 || amount > studio.balance}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={16} /> Withdraw
                        </button>
                        <button 
                            onClick={handleInject}
                            disabled={amount <= 0 || amount > player.money}
                            className="bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            Inject <ArrowLeft size={16} className="rotate-180" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StudioFinanceView: React.FC<{
    player: Player;
    studio: Business;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
    onExit: () => void;
}> = ({ player, studio, onBack, onUpdatePlayer, onExit }) => {
    const [showFinanceModal, setShowFinanceModal] = useState(false);
    const [showExitModal, setShowExitModal] = useState<'SELL' | 'LIQUIDATE' | null>(null);
    const [ledgerRange, setLedgerRange] = useState<'12W' | '52W' | 'ALL'>('12W');
    const [visibleLedgerEntries, setVisibleLedgerEntries] = useState(12);
    const studioActiveReleases = useMemo(() => player.activeReleases.filter(r => r.projectDetails?.studioId === studio.id), [player.activeReleases, studio.id]);
    const studioLibrary = useMemo(() => player.pastProjects.filter(p => p.studioId === studio.id), [player.pastProjects, studio.id]);
    const totalProjectGross = useMemo(() => studioActiveReleases.reduce((sum, r) => sum + (r.totalGross || 0), 0) + studioLibrary.reduce((sum, p) => sum + (p.gross || 0), 0), [studioActiveReleases, studioLibrary]);
    const totalStreamingRevenue = useMemo(() => studioActiveReleases.reduce((sum, r) => sum + (r.streamingRevenue || 0), 0) + studioLibrary.reduce((sum, p) => sum + (p.streamingRevenue || 0), 0), [studioActiveReleases, studioLibrary]);
    const estimatedStudioReceipts = useMemo(() => Math.floor(totalProjectGross * 0.5) + totalStreamingRevenue, [totalProjectGross, totalStreamingRevenue]);
    const totalProductionBudget = useMemo(() => studioLibrary.reduce((sum, p) => sum + (p.budget || 0), 0), [studioLibrary]);
    const financeLedger = useMemo(() => {
        const stored = Array.isArray(studio.studioState?.financeLedger) ? studio.studioState.financeLedger : [];
        if (stored.length > 0) return stored;

        return [...studioLibrary]
            .sort((a, b) => (b.year || 0) - (a.year || 0))
            .slice(0, 8)
            .map(project => ({
                id: `derived_receipt_${project.id}`,
                week: 0,
                year: project.year || player.age,
                amount: Math.floor((project.gross || 0) * 0.5) + (project.streamingRevenue || 0),
                type: 'THEATRICAL' as const,
                label: `${project.name} studio receipts`,
                projectId: project.id
            }))
            .filter(entry => entry.amount !== 0);
    }, [studio.studioState?.financeLedger, studioLibrary, player.age]);

    useEffect(() => {
        setVisibleLedgerEntries(12);
    }, [ledgerRange]);

    const currentAbsoluteWeek = useMemo(() => ((player.age || 1) * 52) + (player.currentWeek || 1), [player.age, player.currentWeek]);
    const getEntryAbsoluteWeek = (entry: any) => ((entry.year || 1) * 52) + (entry.week || 52);

    const filteredLedger = useMemo(() => {
        const sorted = [...financeLedger].sort((a: any, b: any) => getEntryAbsoluteWeek(b) - getEntryAbsoluteWeek(a));
        if (ledgerRange === 'ALL') return sorted;
        const maxAgeInWeeks = ledgerRange === '12W' ? 12 : 52;
        return sorted.filter((entry: any) => currentAbsoluteWeek - getEntryAbsoluteWeek(entry) <= maxAgeInWeeks);
    }, [financeLedger, ledgerRange, currentAbsoluteWeek]);

    const visibleLedger = useMemo(() => filteredLedger.slice(0, visibleLedgerEntries), [filteredLedger, visibleLedgerEntries]);
    const ledgerInflows = useMemo(() => filteredLedger.filter((entry: any) => entry.amount > 0).reduce((sum: number, entry: any) => sum + entry.amount, 0), [filteredLedger]);
    const ledgerOutflows = useMemo(() => Math.abs(filteredLedger.filter((entry: any) => entry.amount < 0).reduce((sum: number, entry: any) => sum + entry.amount, 0)), [filteredLedger]);
    const ledgerNet = ledgerInflows - ledgerOutflows;

    const getLedgerTypeLabel = (type: string) => {
        switch (type) {
            case 'THEATRICAL': return 'Theatrical';
            case 'STREAMING': return 'Streaming';
            case 'STREAMING_DEAL': return 'Platform Deal';
            case 'MERCH': return 'Universe';
            case 'CAPITAL_INJECTION': return 'Injection';
            case 'CAPITAL_WITHDRAWAL': return 'Withdrawal';
            case 'PRODUCTION_SPEND': return 'Production';
            default: return 'Studio';
        }
    };

    const getLedgerTypeTone = (entry: any) => {
        if (entry.amount >= 0) return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
        if (entry.type === 'PRODUCTION_SPEND') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
        return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
    };

    const formatLedgerDate = (entry: any) => {
        const year = entry.year || player.age;
        const week = entry.week || 0;
        if (week > 0) return `Y${year} • W${week}`;
        return `Y${year} • Archive`;
    };

    const formatMoney = (val: number | undefined | null) => {
        if (val === undefined || val === null || isNaN(val)) return '$0';
        if (Math.abs(val) >= 1_000_000_000_000) return `$${(val / 1_000_000_000_000).toFixed(1)}T`;
        if (Math.abs(val) >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
        if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}k`;
        return `$${val.toLocaleString()}`;
    };

    const sellCheck = sellBusiness(studio);
    const liquidateCheck = liquidateBusiness(studio);

    const executeExit = () => {
        if (!showExitModal) return;

        if (showExitModal === 'SELL') {
            const res = sellBusiness(studio);
            if (!res.success) {
                alert(res.msg);
                setShowExitModal(null);
                return;
            }
            const updatedBusinesses = player.businesses.filter(b => b.id !== studio.id);
            const newMoney = player.money + res.payout;
            onUpdatePlayer({ 
                ...player, 
                money: newMoney, 
                businesses: updatedBusinesses,
                logs: [...player.logs, { week: player.currentWeek, year: player.age, message: res.msg, type: 'positive' }]
            });
            onExit();
        } 
        else if (showExitModal === 'LIQUIDATE') {
            const res = liquidateBusiness(studio);
            const updatedBusinesses = player.businesses.filter(b => b.id !== studio.id);
            const newMoney = player.money + res.payout;
            onUpdatePlayer({ 
                ...player, 
                money: newMoney, 
                businesses: updatedBusinesses,
                logs: [...player.logs, { week: player.currentWeek, year: player.age, message: res.msg, type: 'neutral' }]
            });
            onExit();
        }
    };

    return (
        <div className="absolute inset-0 bg-[#050505] flex flex-col z-[60] text-white animate-in slide-in-from-right duration-300 font-sans">
            {/* HEADER */}
            <div className="relative pt-12 pb-6 px-6 bg-zinc-900/50 border-b border-white/5 backdrop-blur-xl shrink-0 z-20">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={onBack} className="bg-black/40 hover:bg-black/60 p-2 rounded-full backdrop-blur-md transition-colors border border-white/5"><ArrowLeft size={18} /></button>
                    <div className="flex gap-2">
                        <button onClick={() => setShowFinanceModal(true)} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-bold border border-amber-500/20 transition-colors">Manage Funds</button>
                    </div>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight leading-none mb-1">Finance Dept</h1>
                        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1.5">Corporate Accounting</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">Studio Capital</div>
                        <div className="font-mono font-bold text-emerald-400 text-lg">{formatMoney(studio.balance)}</div>
                        {(studio.studioState?.productionFund || 0) > 0 && (
                            <div className="text-[9px] text-emerald-500/70 font-bold uppercase mt-1">
                                + {formatMoney(studio.studioState!.productionFund!)} Prod. Fund
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 pb-nav-safe-lg">
                
                {/* P&L Statement */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden">
                    <div className="bg-zinc-900/50 p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="font-bold text-white text-sm uppercase tracking-wide">P&L Statement</h3>
                        <div className="text-[10px] font-bold bg-zinc-800 px-2 py-1 rounded text-zinc-400">This Week</div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="text-xs text-zinc-400 font-bold uppercase">Studio Receipts</div>
                            <div className="font-mono font-bold text-emerald-400">{formatMoney(studio.stats?.weeklyRevenue || 0)}</div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="text-xs text-zinc-400 font-bold uppercase">Operating Costs</div>
                            <div className="font-mono font-bold text-rose-500">-{formatMoney(studio.stats?.weeklyExpenses || 0)}</div>
                        </div>
                        <div className="h-px bg-zinc-800 w-full"></div>
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-white font-bold uppercase">Net Profit</div>
                            <div className={`font-mono font-bold text-lg ${(studio.stats?.weeklyProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                {formatMoney(studio.stats?.weeklyProfit || 0)}
                            </div>
                        </div>
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-zinc-300 leading-relaxed">
                            Project tiles show <span className="text-white font-semibold">project revenue</span>. Detailed studio receipts and cash movement live in the ledger and project detail views.
                        </div>
                    </div>
                </div>

                {/* Revenue Breakdown */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wide mb-4">Revenue Breakdown</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Project Gross</div>
                            <div className="font-mono font-bold text-white">{formatMoney(totalProjectGross)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Streaming Revenue</div>
                            <div className="font-mono font-bold text-emerald-400">{formatMoney(totalStreamingRevenue)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Estimated Studio Receipts</div>
                            <div className="font-mono font-bold text-amber-300">{formatMoney(estimatedStudioReceipts)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Library ROI</div>
                            <div className={`font-mono font-bold ${totalProductionBudget > 0 && estimatedStudioReceipts >= totalProductionBudget ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                {totalProductionBudget > 0 ? `${(((estimatedStudioReceipts - totalProductionBudget) / Math.max(1, totalProductionBudget)) * 100).toFixed(0)}%` : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Balance Sheet */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wide mb-4">Balance Sheet</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Cash</div>
                            <div className="font-mono font-bold text-white">{formatMoney(studio.balance)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Total Valuation</div>
                            <div className="font-mono font-bold text-white">{formatMoney(studio.stats?.valuation || 0)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Production Fund</div>
                            <div className="font-mono font-bold text-white">{formatMoney(studio.studioState?.productionFund || 0)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Lifetime Revenue</div>
                            <div className="font-mono font-bold text-white">{formatMoney(studio.stats?.lifetimeRevenue || 0)}</div>
                        </div>
                    </div>
                </div>

                {/* Ledger */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden">
                    <div className="border-b border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 px-6 py-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <WalletCards size={16} className="text-amber-400" />
                                    <h3 className="font-bold text-white text-sm uppercase tracking-wide">Studio Passbook</h3>
                                </div>
                                <div className="text-[11px] text-zinc-500">Cash movement by period. Tap through newer and older receipts like a bank ledger.</div>
                            </div>
                            <div className="flex rounded-full border border-zinc-800 bg-black/30 p-1 shrink-0">
                                {[
                                    { id: '12W', label: '3 Mo' },
                                    { id: '52W', label: '1 Yr' },
                                    { id: 'ALL', label: 'All' }
                                ].map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => setLedgerRange(option.id as '12W' | '52W' | 'ALL')}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors ${
                                            ledgerRange === option.id ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-white'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            <div className="rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Money In</div>
                                <div className="font-mono font-bold text-emerald-400">{formatMoney(ledgerInflows)}</div>
                            </div>
                            <div className="rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Money Out</div>
                                <div className="font-mono font-bold text-rose-400">{formatMoney(ledgerOutflows)}</div>
                            </div>
                            <div className="rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Net Flow</div>
                                <div className={`font-mono font-bold ${ledgerNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{ledgerNet >= 0 ? '+' : '-'}{formatMoney(Math.abs(ledgerNet))}</div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 space-y-3">
                        {visibleLedger.length > 0 ? visibleLedger.map((entry: any) => (
                            <div key={entry.id} className="rounded-[1.4rem] border border-zinc-800 bg-black/25 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${getLedgerTypeTone(entry)}`}>
                                                {entry.amount >= 0 ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                                                {getLedgerTypeLabel(entry.type)}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{formatLedgerDate(entry)}</span>
                                        </div>
                                        <div className="text-sm font-bold text-white leading-tight">{entry.label}</div>
                                        <div className="mt-1 text-[11px] text-zinc-500">
                                            {entry.projectId ? `Project Ref • ${entry.projectId}` : 'Studio cash entry'}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className={`font-mono font-bold text-base ${entry.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {entry.amount >= 0 ? '+' : '-'}{formatMoney(Math.abs(entry.amount))}
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                                            {entry.amount >= 0 ? 'Credit' : 'Debit'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-[1.4rem] border border-zinc-800 bg-black/30 px-4 py-6 text-center">
                                <div className="text-sm font-bold text-zinc-400 mb-1">No ledger entries in this period</div>
                                <div className="text-[11px] text-zinc-600">Try switching to a wider range to view older studio activity.</div>
                            </div>
                        )}
                        {visibleLedgerEntries < filteredLedger.length && (
                            <button
                                onClick={() => setVisibleLedgerEntries(prev => prev + 12)}
                                className="w-full rounded-[1.2rem] border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:bg-zinc-900 transition-colors"
                            >
                                Load Older Entries
                            </button>
                        )}
                    </div>
                </div>
                
                {/* EXIT STRATEGY SECTION */}
                <div className="bg-red-950/20 border border-red-500/20 rounded-[2rem] p-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="font-bold text-white text-sm uppercase tracking-wide mb-4 flex items-center gap-2"><LogOut size={16} className="text-red-500"/> Exit Strategy</h3>
                        <div className="space-y-3">
                            {/* Sell Option */}
                            <button 
                                onClick={() => setShowExitModal('SELL')} 
                                disabled={!sellCheck.success}
                                className={`w-full p-4 rounded-xl border flex flex-col gap-1 transition-all ${
                                    sellCheck.success 
                                    ? 'bg-emerald-900/20 border-emerald-500/50 hover:bg-emerald-900/40 text-left' 
                                    : 'bg-zinc-900/50 border-zinc-800 opacity-60 cursor-not-allowed text-center'
                                }`}
                            >
                                <div className="flex justify-between items-center w-full">
                                    <div className={`font-bold text-sm ${sellCheck.success ? 'text-emerald-400' : 'text-zinc-500'}`}>Sell Studio</div>
                                    {sellCheck.success && <div className="text-xs font-mono font-bold text-white">Est. {formatMoney(sellCheck.payout)}</div>}
                                </div>
                                {!sellCheck.success && <div className="text-[10px] text-zinc-500 font-normal">{sellCheck.msg}</div>}
                            </button>
                            
                            {/* Liquidate Option */}
                            <button 
                                onClick={() => setShowExitModal('LIQUIDATE')}
                                className="w-full p-4 rounded-xl border border-rose-500/30 bg-rose-950/10 hover:bg-rose-950/30 transition-all flex flex-col gap-1 text-left"
                            >
                                <div className="flex justify-between items-center w-full">
                                    <div className="font-bold text-sm text-rose-400">Shut Down & Liquidate</div>
                                    <div className="text-xs font-mono font-bold text-zinc-400">Est. {formatMoney(liquidateCheck.payout)}</div>
                                </div>
                                <div className="text-[10px] text-zinc-500 font-normal">Close operations. Assets sold for scrap.</div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showFinanceModal && (
                <FinanceModal 
                    player={player} 
                    studio={studio} 
                    onClose={() => setShowFinanceModal(false)} 
                    onUpdatePlayer={onUpdatePlayer} 
                />
            )}

            {showExitModal && (
                <div className="fixed inset-0 z-[60] bg-red-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95">
                    <div className="bg-zinc-900 w-full max-w-sm rounded-[2rem] border border-red-500/30 p-6 shadow-2xl relative text-center">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/40">
                             <AlertTriangle size={32} className="text-red-500"/>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">{showExitModal === 'SELL' ? 'Sell Studio' : 'Shut Down'}</h3>
                        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                            {showExitModal === 'SELL' 
                                ? `Are you sure you want to sell ${studio.name}? You will receive the valuation amount plus any cash in the business account.`
                                : `Are you sure you want to shut down? Assets will be liquidated for scrap value. This cannot be undone.`
                            }
                        </p>
                        
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800 mb-6">
                            <div className="flex justify-between items-center mb-2 text-xs">
                                <span className="text-zinc-500 font-bold uppercase">Cash Balance</span>
                                <span className={studio.balance >= 0 ? 'text-white' : 'text-rose-500'}>{formatMoney(studio.balance)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2 text-xs">
                                <span className="text-zinc-500 font-bold uppercase">{showExitModal === 'SELL' ? 'Valuation' : 'Scrap Value'}</span>
                                <span className="text-white">
                                    {showExitModal === 'SELL' ? formatMoney(studio.stats.valuation) : formatMoney(liquidateCheck.payout - studio.balance)}
                                </span>
                            </div>
                            <div className="border-t border-zinc-700 my-2"></div>
                            <div className="flex justify-between items-center text-sm font-bold">
                                <span className="text-white uppercase">Net Payout</span>
                                <span className={showExitModal === 'SELL' ? 'text-emerald-400' : 'text-zinc-200'}>
                                    {showExitModal === 'SELL' ? formatMoney(sellCheck.payout) : formatMoney(liquidateCheck.payout)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setShowExitModal(null)} className="py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700">Cancel</button>
                            <button onClick={executeExit} className="py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 shadow-lg shadow-red-900/20">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
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

const getCustomPoster = (project: any) => {
    return project.customPoster || project.projectDetails?.customPoster || project.concept?.customPoster;
};

const ActiveProjectCard: React.FC<{ project: any, onClick?: () => void, onDelete?: () => void }> = ({ project, onClick, onDelete }) => {
    // Determine colors based on phase
    let phaseColor = "bg-zinc-500 text-white";
    let riskColor = "text-emerald-400";
    
    if (project.phase === 'CONCEPT') phaseColor = "bg-zinc-700 text-zinc-300 border border-zinc-600";
    if (project.phase === 'DEVELOPMENT') phaseColor = "bg-yellow-500 text-black";
    if (project.phase === 'PRE-PRODUCTION') phaseColor = "bg-orange-500 text-black";
    if (project.phase === 'PRODUCTION') { phaseColor = "bg-red-600 text-white"; riskColor = "text-yellow-500"; }
    if (project.phase === 'POST-PRODUCTION') phaseColor = "bg-blue-500 text-white";
    if (project.phase === 'AWAITING RELEASE') phaseColor = "bg-amber-500 text-black";
    if (project.phase === 'PLANNED RELEASE') phaseColor = "bg-emerald-600 text-white";
    if (project.phase === 'RELEASED') phaseColor = "bg-emerald-500 text-black";

    const budget = project.projectDetails?.estimatedBudget || project.budget || 0;
    
    const formatMoney = (val: number) => {
        if (val >= 1_000_000_000_000) return `$${(val/1_000_000_000_000).toFixed(2)}T`;
        if (val >= 1_000_000_000) return `$${(val/1_000_000_000).toFixed(2)}B`;
        if (val >= 1_000_000) return `$${(val/1_000_000).toFixed(1)}M`;
        return `$${(val/1_000).toFixed(0)}k`;
    };

    const showTime = ['PRE-PRODUCTION', 'PRODUCTION', 'POST-PRODUCTION', 'AWAITING RELEASE', 'PLANNED RELEASE'].includes(project.phase);
    const weeksLeft = project.phaseWeeksLeft || 0;

    const typeBorder = project.type === 'MOVIE' ? 'border-blue-500/60 shadow-blue-900/10' : 
                       project.type === 'SERIES' ? 'border-red-500/60 shadow-red-900/10' : 
                       'border-zinc-800';

    return (
        <div 
            onClick={onClick}
            className={`min-w-[140px] w-[140px] h-[210px] rounded-lg bg-zinc-900 border-2 flex flex-col relative overflow-hidden group shrink-0 cursor-pointer hover:scale-105 transition-all duration-300 shadow-lg ${typeBorder}`}
        >
            {/* Delete Button for Concepts */}
            {project.phase === 'CONCEPT' && onDelete && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="absolute top-2 left-2 z-30 p-1.5 bg-black/50 hover:bg-red-500 text-zinc-400 hover:text-white rounded-full transition-colors backdrop-blur-sm border border-white/10"
                >
                    <X size={12} />
                </button>
            )}

            {/* Poster Area (Full Cover) */}
            {(() => {
                const customPoster = getCustomPoster(project);
                if ((customPoster?.type === 'IMAGE' || customPoster?.type === 'CANVA') && customPoster.imageData) {
                    return (
                        <div className="absolute inset-0 bg-zinc-900">
                            <img src={customPoster.imageData} alt={project.name} className="w-full h-full object-cover" />
                        </div>
                    );
                }
                if (customPoster?.type === 'CONFIG') {
                    return (
                        <div className={`absolute inset-0 bg-gradient-to-br ${customPoster.bgGradient || getPosterBg(project.name)} flex items-center justify-center p-2 overflow-hidden`}>
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                            {customPoster.icon === 'Film' && <Film size={32} className="absolute text-white/10" />}
                            {customPoster.icon === 'Tv' && <Tv size={32} className="absolute text-white/10" />}
                            {customPoster.icon === 'Star' && <Star size={32} className="absolute text-white/10" />}
                            <div className={`text-center font-serif font-black ${customPoster.textColor || 'text-white'} opacity-30 text-2xl leading-none uppercase tracking-tighter transform -rotate-6 scale-125 mix-blend-overlay relative z-10`}>
                                {project.name}
                            </div>
                        </div>
                    );
                }
                return (
                    <div className={`absolute inset-0 bg-gradient-to-br ${getPosterBg(project.name)} flex items-center justify-center p-2 overflow-hidden`}>
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                        <div className="text-center font-serif font-black text-white/30 text-2xl leading-none uppercase tracking-tighter transform -rotate-6 scale-125 mix-blend-overlay">
                            {project.name}
                        </div>
                    </div>
                );
            })()}
            
            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>

            {/* Content */}
            <div className="absolute inset-0 p-3 flex flex-col justify-between">
                <div className="flex justify-end">
                    <div className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${phaseColor} shadow-sm`}>
                        {project.phase}
                    </div>
                </div>
                
                <div className="flex flex-col gap-1">
                    <div className="font-bold text-sm text-white leading-tight line-clamp-2 drop-shadow-md">{project.name}</div>
                    
                    <div className="flex justify-between items-end mt-1">
                        <div>
                            <div className="text-[8px] text-zinc-400 uppercase font-bold">Budget</div>
                            <div className="text-[10px] font-mono font-bold text-zinc-300">{formatMoney(budget)}</div>
                        </div>
                        <div className="text-right">
                            {showTime && (
                                <>
                                    <div className="text-[8px] text-zinc-400 uppercase font-bold">Time Left</div>
                                    <div className="text-[10px] font-mono font-bold text-white flex items-center justify-end gap-1">
                                        <Clock size={10} className="text-zinc-500" /> {weeksLeft}w
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ArchiveProjectCard: React.FC<{ project: any, isLatestInstallment?: boolean, onClick?: () => void }> = ({ project, isLatestInstallment, onClick }) => {
    const formatMoney = (val: number) => {
        if (val >= 1_000_000_000_000) return `$${(val/1_000_000_000_000).toFixed(2)}T`;
        if (val >= 1_000_000_000) return `$${(val/1_000_000_000).toFixed(2)}B`;
        if (val >= 1_000_000) return `$${(val/1_000_000).toFixed(1)}M`;
        return `$${(val/1_000).toFixed(0)}k`;
    };

    const hasAwards = project.awards && project.awards.filter((a: any) => a.outcome === 'WON').length > 0;
    
    const typeBorder = project.type === 'MOVIE' ? 'border-blue-500/60 shadow-blue-900/10' : 
                       project.type === 'SERIES' ? 'border-red-500/60 shadow-red-900/10' : 
                       'border-zinc-800';

    let outcomeLabel = null;
    let outcomeColor = "";
    const projectRevenue = (project.gross || 0) + (project.streamingRevenue || project.projectDetails?.streamingRevenue || 0);
    if (projectRevenue > (project.budget || 0) * 5) {
        outcomeLabel = "BLOCKBUSTER";
        outcomeColor = "bg-purple-500 text-white";
    } else if (projectRevenue > (project.budget || 0) * 2) {
        outcomeLabel = "HIT";
        outcomeColor = "bg-emerald-500 text-white";
    } else if (projectRevenue < (project.budget || 0)) {
        outcomeLabel = "FLOP";
        outcomeColor = "bg-rose-500 text-white";
    } else {
        outcomeLabel = "AVERAGE";
        outcomeColor = "bg-zinc-500 text-white";
    }

    return (
        <div 
            onClick={onClick}
            className={`min-w-[140px] w-[140px] h-[210px] rounded-lg bg-zinc-900 border-2 flex flex-col relative overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-all duration-300 shadow-lg ${typeBorder}`}
        >
            {/* Poster Area */}
            {(() => {
                const customPoster = getCustomPoster(project);
                if ((customPoster?.type === 'IMAGE' || customPoster?.type === 'CANVA') && customPoster.imageData) {
                    return (
                        <div className="absolute inset-0 bg-zinc-900">
                            <img src={customPoster.imageData} alt={project.name} className="w-full h-full object-cover" />
                        </div>
                    );
                }
                if (customPoster?.type === 'CONFIG') {
                    return (
                        <div className={`absolute inset-0 bg-gradient-to-br ${customPoster.bgGradient || getPosterBg(project.name)} flex items-center justify-center p-2 overflow-hidden`}>
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                            {customPoster.icon === 'Film' && <Film size={32} className="absolute text-white/10" />}
                            {customPoster.icon === 'Tv' && <Tv size={32} className="absolute text-white/10" />}
                            {customPoster.icon === 'Star' && <Star size={32} className="absolute text-white/10" />}
                            <div className={`text-center font-serif font-black ${customPoster.textColor || 'text-white'} opacity-30 text-2xl leading-none uppercase tracking-tighter transform -rotate-6 scale-125 mix-blend-overlay relative z-10`}>
                                {project.name}
                            </div>
                        </div>
                    );
                }
                return (
                    <div className={`absolute inset-0 bg-gradient-to-br ${getPosterBg(project.name)} flex items-center justify-center p-2 overflow-hidden`}>
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                        <div className="text-center font-serif font-black text-white/30 text-2xl leading-none uppercase tracking-tighter transform -rotate-6 scale-125 mix-blend-overlay">
                            {project.name}
                        </div>
                    </div>
                );
            })()}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>

            {/* Content */}
            <div className="absolute inset-0 p-3 flex flex-col justify-between pointer-events-none">
                <div className="flex justify-between items-start">
                    {outcomeLabel ? (
                        <div className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md shadow-sm ${outcomeColor}`}>
                            {outcomeLabel}
                        </div>
                    ) : <div></div>}
                    <div className="flex gap-1">
                        {(project.rating || project.imdbRating) && (
                            <div className="bg-yellow-500 text-black px-1.5 py-0.5 rounded-md shadow-sm text-[8px] font-black flex items-center gap-0.5">
                                <Star size={8} className="fill-black" />
                                {(project.rating || project.imdbRating).toFixed(1)}
                            </div>
                        )}
                        {hasAwards && (
                            <div className="bg-amber-500 text-black p-1 rounded-full shadow-md">
                                <Award size={12} className="fill-black" />
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex flex-col gap-1">
                    <div className="font-bold text-sm text-white leading-tight line-clamp-2 drop-shadow-md">{project.name}</div>
                    
                    <div className="flex justify-between items-end mt-1">
                        <div>
                            <div className="text-[8px] text-zinc-400 uppercase font-bold">Budget</div>
                            <div className="text-[10px] font-mono font-bold text-zinc-300">{formatMoney(project.budget || 0)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[8px] text-zinc-400 uppercase font-bold">Project Revenue</div>
                            <div className="text-[10px] font-mono font-bold text-emerald-400">
                                {formatMoney(projectRevenue)}
                            </div>
                            {project.views && (
                                <div className="text-[7px] text-zinc-500 font-bold">
                                    {(project.views / 1000000).toFixed(1)}M Views
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DivisionCard: React.FC<{ title: string, subtitle: string, icon: React.ReactNode, color: string, stats: {label: string, value: string}[], onClick: () => void, locked?: boolean }> = ({ title, subtitle, icon, color, stats, onClick, locked }) => (
    <button onClick={locked ? undefined : onClick} className={`w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center text-center transition-all group relative overflow-hidden gap-2 aspect-square shadow-md ${locked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-800 hover:border-zinc-600'}`}>
        {locked && (
            <div className="absolute top-2 right-2 text-zinc-600">
                <Lock size={10} />
            </div>
        )}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg shrink-0 ${color} ${!locked && 'group-hover:scale-110'} transition-transform`}>
            {icon}
        </div>
        <div className="flex flex-col items-center w-full">
            <div className="font-bold text-[11px] text-white group-hover:text-amber-100 transition-colors leading-tight line-clamp-1">{title}</div>
            <div className="text-[8px] text-zinc-500 uppercase tracking-wide mt-1 line-clamp-1">{subtitle}</div>
            {!locked && stats.length > 0 && (
                <div className="mt-2 text-[9px] font-bold text-zinc-300 bg-black/30 px-2 py-0.5 rounded-full border border-white/5">
                    {stats[0].value} {stats[0].label}
                </div>
            )}
        </div>
    </button>
);
