import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, BudgetTier, Genre, ProjectDetails, ProjectType, ActiveRelease, Commitment, Business, LocationDetails, NewsItem, XPost, StudioEquipment, Script, Writer, GameLanguage } from '../../../types';
import { ArrowLeft, Film, DollarSign, Users, TrendingUp, Calendar, Check, Plus, Star, Award, Zap, Briefcase, LayoutGrid, MapPin, PenTool, Globe, Camera, Clapperboard, ChevronRight, Building2, BarChart3, ShieldAlert, Crown, LogOut, AlertTriangle, Sparkles, BookOpen, Video, X, Clock, Palette, Lightbulb, Mic, Box, Tv, ArrowDownLeft, ArrowUpRight, WalletCards, Landmark } from 'lucide-react';
import { NPC_DATABASE, getAvailableTalent, calculateProjectFameMultiplier } from '../../../services/npcLogic';
import { liquidateBusiness, resolveProjectType } from '../../../services/businessLogic';
import { NPCActor, NPCTier } from '../../../types';
import { getDirectorTalent } from '../../../services/roleLogic';
import { getPlayerLanguage, t } from '../../../services/i18n';
import { getInheritedStudioProjects } from '../../../services/legacyLogic';


import { DevelopmentLab, DevelopmentLabInitialTab } from './DevelopmentLab';
import { GreenlightWizard } from "./GreenlightWizard";
import { ReleaseWizard } from "./ReleaseWizard";

import { FacilitiesView } from './FacilitiesView';
import { StudioPage } from '../../StudioPage';
import { ProjectDashboardModal } from './components/ProjectDashboardModal';
import { SequelSetupModal } from './components/SequelSetupModal';
import { markGameCheckpoint } from '../../../services/firebaseService';
import { discardUnreleasedScript, renameStudioProjectTitle } from '../../../services/projectNaming';
import { getProjectReleaseLabel, getProjectReleaseSortValue, getProjectReleaseTiming } from '../../../services/releaseTiming';
import { getReleaseDisplayPhase } from '../../../services/releasePresentation';
import { createContinuationScript, getContinuationEligibility, getContinuationScriptBaseline } from '../../../services/sequelFlow';
import { getStudioGroup } from '../../../services/studioGroup';
import { getStudioGroupValuation } from '../../../services/studioGroupValuation';
import { StudioGroupView } from './StudioGroupView';
import { CustomPosterImage } from '../../../components/CustomPosterImage';
import { StudioSaleEntryCard, StudioSaleRoom } from './components/StudioSaleDeckPanel';
import { getProjectFundingEconomics, getProjectMarketOutcomeRevenue } from '../../../services/projectFundingEconomics';
import { StudioDivisionCard } from './components/StudioDivisionCard';

interface ProductionHouseGameProps {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
    initialRightsMarketOpportunityId?: string;
    onRightsMarketTargetConsumed?: () => void;
    initialStudioContinuation?: { studioId: string; scriptId: string };
    onStudioContinuationConsumed?: () => void;
    initialStreamingOriginal?: { studioId: string; scriptId: string; commissionId: string };
    onStreamingOriginalConsumed?: () => void;
    onStreamingOriginalGreenlightComplete?: () => void;
    onOpenOwnedStreamingDelivery?: () => void;
}

type StudioView = 'DASHBOARD' | 'STUDIO_GROUP' | 'DEVELOPMENT' | 'PRE_PROD' | 'PRODUCTION' | 'RELEASE' | 'RELEASES' | 'OFFICE' | 'FINANCE' | 'GREENLIGHT' | 'TALENT' | 'FILMOGRAPHY';

// --- HELPERS ---
const formatMoney = (val: number) => {
    if (isNaN(val)) return '$0';
    if (val >= 1_000_000_000_000) return `$${(val/1_000_000_000_000).toFixed(1)}T`;
    if (val >= 1_000_000_000) return `$${(val/1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `$${(val/1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val/1_000).toFixed(0)}k`;
    return `$${val}`;
};

export const ProductionHouseGame: React.FC<ProductionHouseGameProps> = ({ player, onBack, onUpdatePlayer, initialRightsMarketOpportunityId, onRightsMarketTargetConsumed, initialStudioContinuation, onStudioContinuationConsumed, initialStreamingOriginal, onStreamingOriginalConsumed, onStreamingOriginalGreenlightComplete, onOpenOwnedStreamingDelivery }) => {
    const [view, setView] = useState<StudioView>('DASHBOARD');
    const [rightsMarketTargetId, setRightsMarketTargetId] = useState<string | null>(null);
    const [selectedProjectDashboard, setSelectedProjectDashboard] = useState<any>(null);
    const [sequelSetupProject, setSequelSetupProject] = useState<{ project: any, isSpinoff: boolean } | null>(null);
    const [activeStudioId, setActiveStudioId] = useState<string | null>(null);
    const [returnAfterStudioTool, setReturnAfterStudioTool] = useState<'STUDIO_GROUP' | null>(null);
    const [studioGroupCommandReturnId, setStudioGroupCommandReturnId] = useState<string | null>(null);
    const [streamingCommissionTargetId, setStreamingCommissionTargetId] = useState<string | null>(null);
    const [selectedConcept, setSelectedConcept] = useState<any>(null);
    const [subsidiaryLaunch, setSubsidiaryLaunch] = useState<{
        tab: DevelopmentLabInitialTab;
        projectType?: 'MOVIE' | 'SERIES';
        initialScriptId?: string;
    } | null>(null);

    useEffect(() => {
        if (!initialRightsMarketOpportunityId) return;
        setRightsMarketTargetId(initialRightsMarketOpportunityId);
        setView('DEVELOPMENT');
    }, [initialRightsMarketOpportunityId]);
    
    // Locate the Studio Business
    const studioGroup = getStudioGroup(player);
    const parentStudio = studioGroup.parentStudio;
    const activeStudio = studioGroup.allStudios.find(candidate => candidate.id === activeStudioId && candidate.studioState?.operatingModel !== 'FULL_MERGER')
        || parentStudio;
    const studio = activeStudio;

    useEffect(() => {
        if (!initialStudioContinuation) return;
        const targetStudio = studioGroup.allStudios.find(candidate => (
            candidate.id === initialStudioContinuation.studioId
            && candidate.studioState?.scripts?.some(script => script.id === initialStudioContinuation.scriptId)
        ));
        if (!targetStudio) {
            onStudioContinuationConsumed?.();
            return;
        }
        setActiveStudioId(targetStudio.id);
        setStudioGroupCommandReturnId(targetStudio.id);
        setReturnAfterStudioTool('STUDIO_GROUP');
        setSelectedProjectDashboard(null);
        setRightsMarketTargetId(null);
        setSubsidiaryLaunch({ tab: 'VAULT', initialScriptId: initialStudioContinuation.scriptId });
        setView('DEVELOPMENT');
        onStudioContinuationConsumed?.();
    }, [initialStudioContinuation, onStudioContinuationConsumed, studioGroup.allStudios]);

    useEffect(() => {
        if (!initialStreamingOriginal) return;
        const targetStudio = studioGroup.allStudios.find(candidate => (
            candidate.id === initialStreamingOriginal.studioId
            && candidate.studioState?.scripts?.some(script => script.id === initialStreamingOriginal.scriptId)
        ));
        const concept = targetStudio?.studioState?.concepts?.find(candidate => candidate.scriptId === initialStreamingOriginal.scriptId);
        if (!targetStudio) {
            onStreamingOriginalConsumed?.();
            return;
        }
        setActiveStudioId(targetStudio.id);
        setStudioGroupCommandReturnId(targetStudio.id);
        setReturnAfterStudioTool(null);
        setSelectedProjectDashboard(null);
        setRightsMarketTargetId(null);
        setSubsidiaryLaunch(null);
        setSelectedConcept(concept || {
            id: `concept_${initialStreamingOriginal.scriptId}`,
            scriptId: initialStreamingOriginal.scriptId,
            lastStep: 'DIRECTOR',
        });
        setStreamingCommissionTargetId(initialStreamingOriginal.commissionId);
        setView('GREENLIGHT');
        onStreamingOriginalConsumed?.();
    }, [initialStreamingOriginal, onStreamingOriginalConsumed, studioGroup.allStudios]);

    if (!studio) return <div className="p-10 text-white">Error: Studio not found.</div>;
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

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
    const library = [
        ...player.pastProjects.filter(p => p.studioId === studio.id),
        ...getInheritedStudioProjects(player, studio.id).filter(project => (
            !player.pastProjects.some(past => past.id === project.id)
            && !player.activeReleases.some(release => release.id === project.id)
        ))
    ];

    // Calculate Latest Installments for Sequel Button
    const latestInstallmentIds = useMemo(() => {
        const franchises: Record<string, any> = {};
        // Consider ALL past projects to find the absolute latest in a franchise
        player.pastProjects.forEach(p => {
            if (resolveProjectType(p.projectType, (p as any).type, (p as any).projectDetails?.type) !== 'MOVIE') return;
            const fId = p.franchiseId || p.id;
            if (!franchises[fId] || (p.installmentNumber || 1) > (franchises[fId].installmentNumber || 1)) {
                franchises[fId] = p;
            }
        });
        return new Set(Object.values(franchises).map(p => p.id));
    }, [player.pastProjects]);

    // Calculate Studio Metrics
    const totalGross = activeReleases.reduce((sum, r) => sum + r.totalGross + (r.streamingRevenue || 0) + (r.soundtrackRevenue || 0), 0) + library.reduce((sum, p) => sum + (p.gross || 0) + (p.streamingRevenue || 0) + (p.soundtrackRevenue || 0), 0);
    const avgRating = library.length > 0 ? library.reduce((sum, p) => sum + (p.rating || 0), 0) / library.length : 0;
    
    // Calculate Awards Won
    const awardsWon = library.reduce((sum, p) => sum + (p.awards?.filter(a => a.outcome === 'WON').length || 0), 0);
    
    const breakoutCount = library.filter(p => ((p.gross || 0) + (p.streamingRevenue || 0)) > 200_000_000).length;
    const consistencyBonus = library.filter(p => (p.rating || 0) >= 7.5).length * 0.8;
    // Prestige Score (0-100): rewards quality, awards, consistency, and credible hits.
    const prestigeScore = Math.min(100, Math.floor((avgRating * 6) + (awardsWon * 2.5) + (library.length * 0.8) + (breakoutCount * 1.2) + consistencyBonus));
    const groupValuation = getStudioGroupValuation(player).parentCompanyValue;
    const getStudioSubtypeLabel = (subtype?: string) => subtype === 'MAJOR_STUDIO'
        ? tr('services.business.productionDashboard.studioType.major')
        : tr('services.business.productionDashboard.studioType.indie');
    const getStudioLocationLabel = (subtype?: string) => subtype === 'MAJOR_STUDIO'
        ? tr('services.business.productionDashboard.location.hollywood')
        : tr('services.business.productionDashboard.location.burbank');

    // Active Slate List (Combined for the Netflix-style row)
    const activeSlate = [
        ...(studio.studioState?.concepts?.map(c => {
            const script = studio.studioState?.scripts.find(s => s.id === c.scriptId);
            const isScripting = script?.status === 'IN_DEVELOPMENT';
            return {
                id: c.id,
                name: script ? script.title : 'Untitled Concept',
                type: resolveProjectType(script?.projectType, (script as any)?.type, (c as any)?.projectType, (c as any)?.type),
                phase: isScripting ? 'DEVELOPMENT' : 'CONCEPT',
                risk: 'LOW',
                budget: 0,
                concept: c // Pass full concept for loading
            };
        }) || []),
        ...(studio.studioState?.scripts.filter(s => s.status === 'IN_DEVELOPMENT' && !studio.studioState?.concepts?.some(c => c.scriptId === s.id)).map(s => ({ 
            id: s.id, 
            name: s.title,
            type: resolveProjectType(s.projectType, (s as any).type, (s as any).projectDetails?.type),
            phase: 'DEVELOPMENT', 
            risk: 'LOW',
            budget: 0, // Not yet budgeted
            customPoster: s.customPoster
        })) || []),
        ...developmentProjects.map(p => ({ ...p, phase: 'PLANNING', risk: 'LOW' })),
        ...preProdProjects.map(p => ({ ...p, phase: 'PRE-PRODUCTION', risk: 'LOW' })),
        ...productionProjects.map(p => ({ ...p, phase: 'PRODUCTION', risk: 'HIGH' })),
        ...postProjects.map(p => ({ ...p, phase: 'POST-PRODUCTION', risk: 'MEDIUM' })),
        ...awaitingReleaseProjects.map(p => {
            const fundingEconomics = getProjectFundingEconomics(p);
            const needsFundedPremiereConfirmation = fundingEconomics.platformFunding > 0
                && p.projectDetails?.hiddenStats?.platformFundedPremiereConfirmed !== true;

            return {
                ...p,
                phase: needsFundedPremiereConfirmation || !p.projectDetails?.releaseStrategy
                    ? p.projectDetails?.hiddenStats?.ownedStreamingOriginal
                        ? 'AWAITING PLATFORM DELIVERY'
                        : 'AWAITING RELEASE'
                    : 'PLANNED RELEASE',
                risk: 'LOW'
            };
        })
    ];

    const openGreenlight = (source: string, concept?: any) => {
        markGameCheckpoint('production_house_greenlight_opened', player, {
            source,
            studio_id: studio.id,
            active_slate: activeSlate.length,
            studio_commitments: studioCommitments.length,
            studio_scripts: studio.studioState?.scripts?.length || 0,
            studio_concepts: studio.studioState?.concepts?.length || 0,
            concept_id: concept?.id || 'none',
            concept_phase: concept?.phase || 'new_project',
        });
        setView('GREENLIGHT');
    };

    const openStudioWorkbench = (studioId: string, tab: DevelopmentLabInitialTab, projectType?: 'MOVIE' | 'SERIES') => {
        setActiveStudioId(studioId);
        setStudioGroupCommandReturnId(studioId);
        setReturnAfterStudioTool('STUDIO_GROUP');
        setSelectedConcept(null);
        setSelectedProjectDashboard(null);
        setRightsMarketTargetId(null);
        setSubsidiaryLaunch({ tab, projectType });
        setView('DEVELOPMENT');
    };

    const onGreenlightStudioProject = (studioId: string) => {
        setActiveStudioId(studioId);
        setStudioGroupCommandReturnId(studioId);
        setReturnAfterStudioTool('STUDIO_GROUP');
        setSelectedConcept(null);
        setSelectedProjectDashboard(null);
        setRightsMarketTargetId(null);
        setSubsidiaryLaunch(null);
        setView('GREENLIGHT');
    };

    const openStudioFacilities = (studioId: string) => {
        setActiveStudioId(studioId);
        setStudioGroupCommandReturnId(studioId);
        setReturnAfterStudioTool('STUDIO_GROUP');
        setView('OFFICE');
    };

    const openStudioTalent = (studioId: string) => {
        setActiveStudioId(studioId);
        setStudioGroupCommandReturnId(studioId);
        setReturnAfterStudioTool('STUDIO_GROUP');
        setView('TALENT');
    };

    const openSubsidiaryStreamingBids = (studioId: string, projectId: string) => {
        const targetStudio = studioGroup.subsidiaries.find(candidate => (
            candidate.id === studioId
            && candidate.studioState?.operatingModel === 'CONTROLLED_SUBSIDIARY'
        ));
        const targetRelease = player.activeReleases.find(release => (
            release.id === projectId
            && release.projectDetails?.studioId === studioId
            && release.distributionPhase === 'STREAMING_BIDDING'
        ));
        if (!targetStudio || !targetRelease) return;

        // This is deliberately a bid-only route. It preserves the subsidiary
        // context for payment, opens the existing Release Wizard, and returns
        // directly to this subsidiary's command center.
        setActiveStudioId(targetStudio.id);
        setStudioGroupCommandReturnId(targetStudio.id);
        setReturnAfterStudioTool('STUDIO_GROUP');
        setSelectedProjectDashboard(targetRelease);
        setSelectedConcept(null);
        setRightsMarketTargetId(null);
        setSubsidiaryLaunch(null);
        setView('RELEASE');
    };

    const openScriptMarketFromGreenlight = () => {
        setSelectedConcept(null);
        setSelectedProjectDashboard(null);
        setRightsMarketTargetId(null);
        setSubsidiaryLaunch({ tab: 'IP_MARKET' });
        setView('DEVELOPMENT');
    };

    const closeStudioTool = () => {
        setSelectedConcept(null);
        if (returnAfterStudioTool === 'STUDIO_GROUP') {
            setView('STUDIO_GROUP');
            return;
        }
        setView('DASHBOARD');
    };

    const closeReleaseTool = () => {
        setSelectedProjectDashboard(null);
        if (returnAfterStudioTool === 'STUDIO_GROUP') {
            setView('STUDIO_GROUP');
            return;
        }
        setView('DASHBOARD');
    };

    const returnToMainDashboard = () => {
        setActiveStudioId(null);
        setReturnAfterStudioTool(null);
        setStudioGroupCommandReturnId(null);
        setSubsidiaryLaunch(null);
        setSelectedConcept(null);
        setView('DASHBOARD');
    };

    const pastProjectsSlate = [
        ...activeReleases.map(r => ({
            id: r.id,
            name: r.name,
            phase: getReleaseDisplayPhase(r),
            rating: r.imdbRating,
            gross: r.totalGross,
            budget: r.budget,
            type: r.type,
            awards: [],
            views: r.streaming?.totalViews,
            streamingRevenue: r.streamingRevenue,
            projectDetails: r.projectDetails,
            bids: r.bids,
            weekNum: r.weekNum,
            releaseWeek: r.releaseWeek,
            releaseYear: r.releaseYear,
            releasedAtAbsoluteWeek: r.releasedAtAbsoluteWeek,
            franchiseId: r.projectDetails.franchiseId,
            installmentNumber: r.projectDetails.installmentNumber,
            genre: r.projectDetails.genre
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
            customPoster: p.customPoster,
            releaseWeek: p.releaseWeek,
            releaseYear: p.releaseYear,
            releasedAtAbsoluteWeek: p.releasedAtAbsoluteWeek,
            franchiseId: p.franchiseId,
            installmentNumber: p.installmentNumber,
            genre: p.genre,
            projectDetails: p
        }))
    ];
    const sortedPastProjectsSlate = [...pastProjectsSlate].sort(sortStudioArchiveByRecent);
    const recentPastProjectsPreview = sortedPastProjectsSlate.slice(0, 8);

    // --- RENDER HELPERS ---
    
    const handleDeleteConcept = (conceptId: string) => {
        const updatedStudio = { ...studio };
        if (updatedStudio.studioState && updatedStudio.studioState.concepts) {
            const concept = updatedStudio.studioState.concepts.find(c => c.id === conceptId);
            if (!concept) return;
            const result = discardUnreleasedScript(
                updatedStudio.studioState.scripts || [],
                updatedStudio.studioState.concepts,
                concept.scriptId
            );
            if (!result.discarded) return;
            updatedStudio.studioState = {
                ...updatedStudio.studioState,
                scripts: result.scripts,
                concepts: result.concepts
            };
            
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
            const pastProjectType = resolveProjectType(pastProject.projectType, (pastProject as any).type, (pastProject as any).projectDetails?.type);
            
            // Move to activeReleases with BIDDING phase
            const newActiveRelease: ActiveRelease = {
                id: pastProject.id,
                name: pastProject.name,
                type: pastProjectType,
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
                releaseWeek: pastProject.releaseWeek,
                releaseYear: pastProject.releaseYear,
                releasedAtAbsoluteWeek: pastProject.releasedAtAbsoluteWeek,
                projectDetails: (pastProject as any).projectDetails || {
                    title: pastProject.name,
                    type: pastProjectType,
                    description: pastProject.description || '',
                    studioId: studio.id,
                    subtype: pastProject.subtype || 'STANDALONE',
                    genre: pastProject.genre || (pastProject as any).projectDetails?.genre || 'ACTION',
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
        const eligibility = getContinuationEligibility({
            player,
            studioScripts: studio.studioState?.scripts || [],
            project,
            mode: 'SEQUEL'
        });
        if (!eligibility.eligible) return;
        setSequelSetupProject({ project, isSpinoff: false });
    };

    const handleMakeSpinoff = (project: any) => {
        const eligibility = getContinuationEligibility({
            player,
            studioScripts: studio.studioState?.scripts || [],
            project,
            mode: 'SPINOFF'
        });
        if (!eligibility.eligible) return;
        setSequelSetupProject({ project, isSpinoff: true });
    };

    const handleStartWritingSequel = (writer: Writer | null, title: string, isSpinoff: boolean, selectedProjectType: ProjectType) => {
        if (!sequelSetupProject) return;
        const project = sequelSetupProject.project;
        const sourceProjectType = resolveProjectType(project.projectType, project.type, project.projectDetails?.type);
        const updatedStudio = { ...studio };
        if (!updatedStudio.studioState) return;
        const continuation = createContinuationScript({
            player,
            studioScripts: updatedStudio.studioState.scripts || [],
            project,
            mode: isSpinoff ? 'SPINOFF' : 'SEQUEL',
            title,
            overrides: {
                projectType: isSpinoff ? selectedProjectType : sourceProjectType,
            },
        });
        if (!continuation.ok || !continuation.script) return;
        const isInternallyControlledTalent = (id: string) => id === 'PLAYER_SELF' || id === 'STUDIO_STAFF';
        const lockedWriterSkill = Math.max(10, Math.min(100, Math.round(Number(writer?.skill || 50))));
        const sequelBaseline = getContinuationScriptBaseline(project, lockedWriterSkill);

        // Deduct writer fee
        if (writer) {
            updatedStudio.balance -= writer.fee;
        }

        // Generate a new script based on the past project
        const newScriptId = continuation.script.id;
        
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
        const sourceHiddenStats = details.hiddenStats || {};
        const sourceFundingAmount = sourceHiddenStats.nextSeasonFundingUsedByProjectId
            ? 0
            : Number(sourceHiddenStats.nextSeasonFundingAmount || 0);
        const sourceFundingPlatformId = sourceHiddenStats.nextSeasonFundingPlatformId || null;
        const lockedFundRecord = (studio.studioState?.lockedStreamingFunds || []).find((fund: any) =>
            fund.sourceProjectId === project.id || fund.sourceProjectId === details.id || fund.sourceProjectId === sourceHiddenStats.nextSeasonFundingSourceProjectId
        );
        const lockedStreamingFunding = !isSpinoff && sourceProjectType === 'SERIES' && (sourceFundingAmount > 0 || lockedFundRecord)
            ? {
                id: lockedFundRecord?.id || `stream_fund_${project.id}_${Date.now()}`,
                platformId: lockedFundRecord?.platformId || sourceFundingPlatformId || 'STREAMING_PLATFORM',
                platformName: lockedFundRecord?.platformName || sourceFundingPlatformId || 'Streaming Platform',
                amount: Math.floor(lockedFundRecord?.amount || sourceFundingAmount),
                sourceProjectId: lockedFundRecord?.sourceProjectId || project.id,
                sourceTitle: lockedFundRecord?.sourceTitle || project.title || project.name,
                franchiseId: project.franchiseId || project.id,
                installmentNumber: project.installmentNumber || 1,
                projectType: 'SERIES' as const,
                createdWeek: lockedFundRecord?.createdWeek || player.currentWeek,
                createdYear: lockedFundRecord?.createdYear || player.age
            }
            : undefined;

        const newScript: Script = {
            ...continuation.script,
            logline: randomLogline,
            projectType: continuation.script.projectType,
            targetAudience: project.projectDetails?.targetAudience || project.targetAudience || 'PG-13',
            genres: [project.genre || 'ACTION'],
            // Generated and legacy "Original Creator" entries are not always in
            // studioState.writers. Keep their real craft score on the script so
            // the development loop never silently falls back to 50.
            quality: lockedWriterSkill,
            assignedSkill: lockedWriterSkill,
            assignedSpeed: writer?.speed || 10,
            baseQuality: sequelBaseline,
            status: 'IN_DEVELOPMENT',
            writerId: writer ? writer.id : 'studio',
            author: writer ? writer.name : 'In-House Writers',
            weeksInDevelopment: 0,
            totalDevelopmentWeeks: writer ? Math.max(4, 20 - writer.speed) : 10,
            returningTalent,
            lockedStreamingFunding
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
            lastStep: 'SELECT_SCRIPT',
            lockedStreamingFunding
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
                    salary: salary,
                    characterId: c.characterId,
                    characterName: c.characterName,
                    sourceUniverseId: c.sourceUniverseId
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


    const currentProject = React.useMemo(() => {
        if (!selectedProjectDashboard) return null;
        
        // Find in active releases
        const active = player.activeReleases?.find(r => r.id === selectedProjectDashboard.id);
        if (active) {
            return {
                ...active,
                phase: getReleaseDisplayPhase(active)
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

    const handleRenameProject = (title: string) => {
        if (!currentProject) return;
        const updatedPlayer = renameStudioProjectTitle(player, studio.id, currentProject, title);
        if (updatedPlayer === player) return;

        setSelectedProjectDashboard((current: any) => current ? {
            ...current,
            name: title,
            title,
            projectDetails: current.projectDetails
                ? { ...current.projectDetails, title }
                : current.projectDetails
        } : current);
        onUpdatePlayer(updatedPlayer);
    };

    if (view === 'FINANCE') {
        return <StudioFinanceView player={player} studio={studio} onBack={closeStudioTool} onUpdatePlayer={onUpdatePlayer} onExit={onBack} />;
    }

    if (view === 'STUDIO_GROUP') {
        return (
            <StudioGroupView
                player={player}
                onBack={returnToMainDashboard}
                onUpdatePlayer={onUpdatePlayer}
                initialCommandStudioId={studioGroupCommandReturnId}
                onGreenlightStudioProject={onGreenlightStudioProject}
                onOpenStudioWorkbench={(studioId, tab) => openStudioWorkbench(studioId, tab)}
                onOpenStudioFacilities={openStudioFacilities}
                onOpenStudioTalent={openStudioTalent}
                onOpenStreamingBids={openSubsidiaryStreamingBids}
            />
        );
    }

    if (view === 'DEVELOPMENT') {
        return <DevelopmentLab player={player} studio={studio} onBack={closeStudioTool} onUpdatePlayer={onUpdatePlayer} onOpenProject={(projectId) => {
            const project = player.activeReleases.find(release => release.id === projectId)
                || player.pastProjects.find(release => release.id === projectId);
            if (!project) return;
            setSelectedProjectDashboard(project);
            closeStudioTool();
        }} initialRightsMarketOpportunityId={rightsMarketTargetId || undefined} onRightsMarketTargetConsumed={() => {
            setRightsMarketTargetId(null);
            onRightsMarketTargetConsumed?.();
        }} initialTab={subsidiaryLaunch?.tab} initialProjectType={subsidiaryLaunch?.projectType} initialScriptId={subsidiaryLaunch?.initialScriptId} />;
    }

    if (view === 'OFFICE') {
        return <FacilitiesView player={player} studio={studio} onBack={closeStudioTool} onUpdatePlayer={onUpdatePlayer} />;
    }

    if (view === 'TALENT') {
        return <StudioPage player={player} studioId={studio.id} onUpdatePlayer={onUpdatePlayer} onBack={closeStudioTool} />;
    }

    if (view === 'RELEASE' && currentProject) {
        return (
            <ReleaseWizard 
                player={player} 
                studio={studio} 
                project={currentProject} 
                isPostTheatricalBidding={currentProject.distributionPhase === 'STREAMING_BIDDING' || currentProject.distributionPhase === 'THEATRICAL' || currentProject.phase === 'BIDDING' || currentProject.phase === 'RELEASED' || currentProject.phase === 'IN THEATERS'}
                onBack={closeReleaseTool}
                onUpdatePlayer={onUpdatePlayer} 
                onComplete={closeReleaseTool}
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
                    onRenameProject={handleRenameProject}
                    onConfigureRelease={(p) => {
                        if (p.projectDetails?.hiddenStats?.ownedStreamingOriginal) {
                            onOpenOwnedStreamingDelivery?.();
                            return;
                        }
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
                            closeStudioTool();
                        }} 
                        onOpenScriptMarket={openScriptMarketFromGreenlight}
                        onUpdatePlayer={onUpdatePlayer} 
                        onComplete={() => {
                            if (streamingCommissionTargetId) {
                                setStreamingCommissionTargetId(null);
                                onStreamingOriginalGreenlightComplete?.();
                            } else {
                                closeStudioTool();
                            }
                        }}
                    />
                </motion.div>
            ) : view === 'FILMOGRAPHY' ? (
                <motion.div
                    key="filmography"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.35 }}
                    className="fixed inset-0 z-[60]"
                >
                    <StudioFilmographyView
                        projects={sortedPastProjectsSlate as any[]}
                        studio={studio}
                        language={language}
                        onBack={() => setView('DASHBOARD')}
                        onOpenProject={(project) => setSelectedProjectDashboard(project)}
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
                                    {getStudioSubtypeLabel(studio.subtype)}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-0.5">
                                <MapPin size={10} />
                                <span>{getStudioLocationLabel(studio.subtype)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Valuation & Cash (The "Wow" Factor) */}
                <div className="relative px-6 pb-6 flex justify-between items-end">
                    <div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">{tr('services.business.productionDashboard.studioValuation')}</div>
                        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-sm tracking-tight">
                            {formatMoney(studio.stats.valuation)}
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">{tr('services.business.productionFinance.shared.studioCapital')}</div>
                        <div className="text-lg font-mono font-bold text-emerald-400 drop-shadow-sm">
                            {formatMoney(studio.balance)}
                        </div>
                        {(studio.studioState?.productionFund || 0) > 0 && (
                            <div className="text-[9px] text-emerald-500/70 font-bold uppercase mt-1">
                                + {formatMoney(studio.studioState!.productionFund!)} {tr('services.business.productionFinance.shared.prodFund')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Metrics Strip */}
                <div className="relative bg-black/40 backdrop-blur-md border-t border-white/5">
                    <div className="flex overflow-x-auto no-scrollbar py-3 px-6 gap-8">
                        <div className="flex flex-col shrink-0">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5"><Star size={10} className="text-yellow-500"/> {tr('services.business.productionDashboard.metric.avgRating')}</span>
                            <span className="text-white font-bold text-sm">{avgRating > 0 ? avgRating.toFixed(1) : '-.--'}</span>
                        </div>
                        <div className="w-px h-8 bg-zinc-800 shrink-0"></div>
                        <div className="flex flex-col shrink-0">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5"><Award size={10} className="text-amber-500"/> {tr('services.business.productionDashboard.metric.awardsWon')}</span>
                            <span className="text-white font-bold text-sm">{awardsWon}</span>
                        </div>
                        <div className="w-px h-8 bg-zinc-800 shrink-0"></div>
                        <div className="flex flex-col shrink-0">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5"><Film size={10} className="text-blue-400"/> {tr('services.business.productionDashboard.metric.totalFilms')}</span>
                            <span className="text-white font-bold text-sm">{library.length}</span>
                        </div>
                        <div className="w-px h-8 bg-zinc-800 shrink-0"></div>
                        <div className="flex flex-col shrink-0">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5"><TrendingUp size={10} className="text-emerald-500"/> {tr('services.business.productionDashboard.metric.lifetimeBoxOffice')}</span>
                            <span className="text-emerald-400 font-mono font-bold text-sm">{formatMoney(totalGross)}</span>
                        </div>
                        <div className="w-px h-8 bg-zinc-800 shrink-0"></div>
                        <div className="flex flex-col shrink-0">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-0.5"><Crown size={10} className="text-purple-500"/> {tr('services.business.productionDashboard.metric.prestige')}</span>
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
                        <h2 className="text-lg font-bold text-white tracking-tight">{tr('studio.activeSlate')}</h2>
                    </div>
                    
                    <div className="flex gap-4 overflow-x-auto px-4 pb-4 no-scrollbar">
                        {/* New Project Tile */}
                        <button onClick={() => openGreenlight('new_project_tile')} className="min-w-[140px] w-[140px] h-[210px] rounded-lg border-2 border-dashed border-amber-500/50 bg-amber-500/5 flex flex-col items-center justify-center gap-3 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500 hover:scale-105 transition-all duration-300 group shrink-0 relative overflow-hidden shadow-lg">
                            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/0 to-amber-500/10"></div>
                            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500/30 transition-all duration-300">
                                <Plus size={24} className="text-amber-400" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest drop-shadow-sm">{tr('studio.newProject')}</span>
                        </button>

                        {/* Active Projects */}
                        {activeSlate.map((p, idx) => (
                            <ActiveProjectCard 
                                key={p.id || idx} 
                                project={p} 
                                onClick={() => {
                                    if (p.phase === 'CONCEPT' || (p.phase === 'DEVELOPMENT' && p.concept)) {
                                        setSelectedConcept(p.concept);
                                        openGreenlight('active_slate_concept', p.concept);
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
                        <div className="px-4 mb-3 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-bold text-white tracking-tight">{tr('studio.pastProjects')}</h2>
                            <button
                                onClick={() => setView('FILMOGRAPHY')}
                                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:border-amber-500/50 hover:text-amber-300 transition-colors"
                            >
                                {tr('studio.seeMore')} <ChevronRight size={12} />
                            </button>
                        </div>
                        <div className="flex gap-4 overflow-x-auto px-4 pb-4 no-scrollbar">
                            {recentPastProjectsPreview.map(p => (
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
                    <div className="mb-3 px-1">
                        <div>
                            <div className="text-[7px] font-black uppercase tracking-[0.28em] text-amber-300">{tr('services.business.productionDashboard.console.eyebrow')}</div>
                            <h2 className="mt-1 text-lg font-black uppercase tracking-tight text-white">{tr('studio.corporateDivisions')}</h2>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-[24px] border-2 border-[#29251f] bg-[#0a0908] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_0_#020202,0_18px_32px_rgba(0,0,0,0.35)]">
                        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/25 to-transparent" />
                        <div className="grid grid-cols-2 gap-2.5">
                        {/* Development Division */}
                        <StudioDivisionCard
                            title={tr('studio.devLab')}
                            subtitle={tr('services.business.productionDashboard.division.devSubtitle')}
                            icon={<PenTool size={20}/>}
                            accent="BLUE"
                            stats={[
                                { label: tr('services.business.productionDashboard.division.scripts'), value: studio.studioState?.scripts.length.toString() || "0" }
                            ]}
                            onClick={() => {
                                setSubsidiaryLaunch(null);
                                setView('DEVELOPMENT');
                            }}
                        />

                        {/* Production Infrastructure */}
                        <StudioDivisionCard
                            title={tr('studio.facilities')}
                            subtitle={tr('services.business.productionDashboard.division.facilitiesSubtitle')}
                            icon={<Building2 size={20}/>}
                            accent="EMERALD"
                            stats={[
                                { label: tr('services.business.productionDashboard.division.tier'), value: getStudioSubtypeLabel(studio.subtype) }
                            ]}
                            onClick={() => setView('OFFICE')}
                        />

                        {/* Talent Division */}
                        <StudioDivisionCard
                            title={tr('studio.talent')}
                            subtitle={tr('services.business.productionDashboard.division.talentSubtitle')}
                            icon={<Users size={20}/>}
                            accent="PURPLE"
                            stats={[
                                { label: tr('services.business.productionDashboard.division.stars'), value: (player.studio?.talentRoster?.length || 0).toString() }
                            ]}
                            onClick={() => setView('TALENT')}
                        />

                        {/* Finance Division */}
                        <StudioDivisionCard
                            title={tr('studio.finance')}
                            subtitle={tr('services.business.productionDashboard.division.financeSubtitle')}
                            icon={<DollarSign size={20}/>}
                            accent="ORANGE"
                            stats={[
                                { label: tr('services.business.productionDashboard.division.capital'), value: formatMoney(studio.balance) }
                            ]}
                            onClick={() => setView('FINANCE')}
                        />

                        <StudioDivisionCard
                            wide
                            eyebrow={tr('services.business.productionDashboard.division.groupEyebrow')}
                            title={tr('services.business.productionDashboard.division.groupTitle')}
                            subtitle={tr('services.business.productionDashboard.division.groupSubtitle')}
                            icon={<Landmark size={22}/>}
                            accent="GOLD"
                            stats={[
                                { label: tr('services.business.productionDashboard.division.ownedStudios'), value: studioGroup.subsidiaries.length.toString() },
                                { label: tr('services.business.productionDashboard.division.groupValue'), value: formatMoney(groupValuation) }
                            ]}
                            onClick={() => setView('STUDIO_GROUP')}
                        />
                        </div>
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
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

    const handleInject = () => {
        if (amount <= 0) {
            setErrorMsg(tr('services.business.productionFinance.error.invalidInject'));
            return;
        }
        if (amount > player.money) {
            setErrorMsg(tr('services.business.productionFinance.error.notEnoughPersonalCash'));
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
                    label: tr('services.business.productionFinance.ledger.ownerInjection')
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
            setErrorMsg(tr('services.business.productionFinance.error.invalidWithdraw'));
            return;
        }
        if (amount > studio.balance) {
            setErrorMsg(tr('services.business.productionFinance.error.notEnoughStudioCapital'));
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
                    label: tr('services.business.productionFinance.ledger.ownerWithdrawal')
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
                    <h3 className="font-bold text-white">{tr('services.business.productionFinance.modal.title')}</h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white"><ArrowLeft size={20} className="rotate-180" /></button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                        <div>
                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{tr('services.business.productionFinance.modal.personalCash')}</div>
                            <div className="text-lg font-mono font-bold text-white">{formatMoney(player.money)}</div>
                        </div>
                        <ArrowLeft size={20} className="text-zinc-600 rotate-180" />
                        <div className="text-right">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{tr('services.business.productionFinance.shared.studioCapital')}</div>
                            <div className="text-lg font-mono font-bold text-emerald-400">{formatMoney(studio.balance)}</div>
                            {(studio.studioState?.productionFund || 0) > 0 && (
                                <div className="text-[9px] text-emerald-500/70 font-bold uppercase mt-1">
                                    + {formatMoney(studio.studioState!.productionFund!)} {tr('services.business.productionFinance.shared.prodFund')}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">{tr('services.business.productionFinance.modal.amount')}</label>
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
                            <span className="text-zinc-500">{tr('services.business.productionFinance.modal.available', { personal: formatMoney(player.money), studio: formatMoney(studio.balance) })}</span>
                            {amount > 0 && <span className="text-zinc-600">{tr('services.business.productionFinance.modal.parsed', { amount: formatMoney(amount) })}</span>}
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
                            <ArrowLeft size={16} /> {tr('services.business.productionFinance.modal.withdraw')}
                        </button>
                        <button 
                            onClick={handleInject}
                            disabled={amount <= 0 || amount > player.money}
                            className="bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {tr('services.business.productionFinance.modal.inject')} <ArrowLeft size={16} className="rotate-180" />
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
    const [showExitModal, setShowExitModal] = useState<'LIQUIDATE' | null>(null);
    const [showSaleRoom, setShowSaleRoom] = useState(false);
    const [ledgerRange, setLedgerRange] = useState<'12W' | '52W' | 'ALL'>('12W');
    const [visibleLedgerEntries, setVisibleLedgerEntries] = useState(12);
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const studioActiveReleases = useMemo(() => player.activeReleases.filter(r => r.projectDetails?.studioId === studio.id), [player.activeReleases, studio.id]);
    const studioLibrary = useMemo(() => [
        ...player.pastProjects.filter(p => p.studioId === studio.id),
        ...getInheritedStudioProjects(player, studio.id).filter(project => (
            !player.pastProjects.some(past => past.id === project.id)
            && !player.activeReleases.some(release => release.id === project.id)
        ))
    ], [player, studio.id]);
    const totalProjectGross = useMemo(() => studioActiveReleases.reduce((sum, r) => sum + (r.totalGross || 0), 0) + studioLibrary.reduce((sum, p) => sum + (p.gross || 0), 0), [studioActiveReleases, studioLibrary]);
    const totalStreamingRevenue = useMemo(() => studioActiveReleases.reduce((sum, r) => sum + (r.streamingRevenue || 0), 0) + studioLibrary.reduce((sum, p) => sum + (p.streamingRevenue || 0), 0), [studioActiveReleases, studioLibrary]);
    const totalSoundtrackRevenue = useMemo(() => studioActiveReleases.reduce((sum, r) => sum + (r.soundtrackRevenue || 0), 0) + studioLibrary.reduce((sum, p) => sum + (p.soundtrackRevenue || 0), 0), [studioActiveReleases, studioLibrary]);
    const estimatedStudioReceipts = useMemo(() => Math.floor(totalProjectGross * 0.5) + totalStreamingRevenue + totalSoundtrackRevenue, [totalProjectGross, totalStreamingRevenue, totalSoundtrackRevenue]);
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
                amount: Math.floor((project.gross || 0) * 0.5) + (project.streamingRevenue || 0) + (project.soundtrackRevenue || 0),
                type: 'THEATRICAL' as const,
                label: project.name,
                projectName: project.name,
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
            case 'THEATRICAL': return tr('services.business.productionFinance.ledger.type.theatrical');
            case 'STREAMING': return tr('services.business.productionFinance.ledger.type.streaming');
            case 'STREAMING_DEAL': return tr('services.business.productionFinance.ledger.type.platformDeal');
            case 'MERCH': return tr('services.business.productionFinance.ledger.type.universe');
            case 'CAPITAL_INJECTION': return tr('services.business.productionFinance.ledger.type.injection');
            case 'CAPITAL_WITHDRAWAL': return tr('services.business.productionFinance.ledger.type.withdrawal');
            case 'PRODUCTION_SPEND': return tr('services.business.productionFinance.ledger.type.production');
            case 'FUNDING_SURPLUS': return tr('services.business.productionFinance.ledger.type.surplus');
            default: return tr('services.business.productionFinance.ledger.type.studio');
        }
    };

    const getLedgerEntryLabel = (entry: any) => {
        const legacyOwnerInjectionLabel = ['Owner', 'capital', 'injection'].join(' ');
        const legacyOwnerWithdrawalLabel = ['Owner', 'withdrawal'].join(' ');
        if (entry.id?.startsWith('derived_receipt_')) {
            return tr('services.business.productionFinance.ledger.studioReceipts', { projectName: entry.projectName || entry.label });
        }
        if (entry.label === legacyOwnerInjectionLabel) return tr('services.business.productionFinance.ledger.ownerInjection');
        if (entry.label === legacyOwnerWithdrawalLabel) return tr('services.business.productionFinance.ledger.ownerWithdrawal');
        return entry.label || tr('services.business.productionFinance.ledger.cashEntry');
    };

    const getLedgerTypeTone = (entry: any) => {
        if (entry.amount >= 0) return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
        if (entry.type === 'PRODUCTION_SPEND') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
        return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
    };

    const formatLedgerDate = (entry: any) => {
        const year = entry.year || player.age;
        const week = entry.week || 0;
        if (week > 0) return tr('services.business.productionFinance.ledger.date.week', { year, week });
        return tr('services.business.productionFinance.ledger.date.archive', { year });
    };

    const formatMoney = (val: number | undefined | null) => {
        if (val === undefined || val === null || isNaN(val)) return '$0';
        if (Math.abs(val) >= 1_000_000_000_000) return `$${(val / 1_000_000_000_000).toFixed(1)}T`;
        if (Math.abs(val) >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
        if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}k`;
        return `$${val.toLocaleString()}`;
    };

    const liquidateCheck = liquidateBusiness(studio, language);

    const executeExit = () => {
        if (!showExitModal) return;

        if (showExitModal === 'LIQUIDATE') {
            const res = liquidateBusiness(studio, language);
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
                        <button onClick={() => setShowFinanceModal(true)} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-bold border border-amber-500/20 transition-colors">{tr('services.business.productionFinance.header.manageFunds')}</button>
                    </div>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight leading-none mb-1">{tr('services.business.productionFinance.header.title')}</h1>
                        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1.5">{tr('services.business.productionFinance.header.subtitle')}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">{tr('services.business.productionFinance.shared.studioCapital')}</div>
                        <div className="font-mono font-bold text-emerald-400 text-lg">{formatMoney(studio.balance)}</div>
                        {(studio.studioState?.productionFund || 0) > 0 && (
                            <div className="text-[9px] text-emerald-500/70 font-bold uppercase mt-1">
                                + {formatMoney(studio.studioState!.productionFund!)} {tr('services.business.productionFinance.shared.prodFund')}
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
                        <h3 className="font-bold text-white text-sm uppercase tracking-wide">{tr('services.business.productionFinance.pnl.title')}</h3>
                        <div className="text-[10px] font-bold bg-zinc-800 px-2 py-1 rounded text-zinc-400">{tr('services.business.productionFinance.pnl.thisWeek')}</div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="text-xs text-zinc-400 font-bold uppercase">{tr('services.business.productionFinance.pnl.studioReceipts')}</div>
                            <div className="font-mono font-bold text-emerald-400">{formatMoney(studio.stats?.weeklyRevenue || 0)}</div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="text-xs text-zinc-400 font-bold uppercase">{tr('services.business.productionFinance.pnl.operatingCosts')}</div>
                            <div className="font-mono font-bold text-rose-500">-{formatMoney(studio.stats?.weeklyExpenses || 0)}</div>
                        </div>
                        <div className="h-px bg-zinc-800 w-full"></div>
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-white font-bold uppercase">{tr('services.business.productionFinance.pnl.netProfit')}</div>
                            <div className={`font-mono font-bold text-lg ${(studio.stats?.weeklyProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                {formatMoney(studio.stats?.weeklyProfit || 0)}
                            </div>
                        </div>
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-zinc-300 leading-relaxed">
                            {tr('services.business.productionFinance.pnl.detailHint')}
                        </div>
                    </div>
                </div>

                {/* Revenue Breakdown */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wide mb-4">{tr('services.business.productionFinance.breakdown.title')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{tr('services.business.productionFinance.breakdown.projectGross')}</div>
                            <div className="font-mono font-bold text-white">{formatMoney(totalProjectGross)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{tr('services.business.productionFinance.breakdown.streamingRevenue')}</div>
                            <div className="font-mono font-bold text-emerald-400">{formatMoney(totalStreamingRevenue)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{tr('services.business.productionFinance.breakdown.estimatedReceipts')}</div>
                            <div className="font-mono font-bold text-amber-300">{formatMoney(estimatedStudioReceipts)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{tr('services.business.productionFinance.breakdown.libraryRoi')}</div>
                            <div className={`font-mono font-bold ${totalProductionBudget > 0 && estimatedStudioReceipts >= totalProductionBudget ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                {totalProductionBudget > 0 ? `${(((estimatedStudioReceipts - totalProductionBudget) / Math.max(1, totalProductionBudget)) * 100).toFixed(0)}%` : tr('services.business.productionFinance.shared.notAvailable')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Balance Sheet */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wide mb-4">{tr('services.business.productionFinance.balance.title')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{tr('services.business.productionFinance.balance.cash')}</div>
                            <div className="font-mono font-bold text-white">{formatMoney(studio.balance)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{tr('services.business.productionFinance.balance.totalValuation')}</div>
                            <div className="font-mono font-bold text-white">{formatMoney(studio.stats?.valuation || 0)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{tr('services.business.productionFinance.balance.productionFund')}</div>
                            <div className="font-mono font-bold text-white">{formatMoney(studio.studioState?.productionFund || 0)}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{tr('services.business.productionFinance.balance.lifetimeRevenue')}</div>
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
                                    <h3 className="font-bold text-white text-sm uppercase tracking-wide">{tr('services.business.productionFinance.passbook.title')}</h3>
                                </div>
                                <div className="text-[11px] text-zinc-500">{tr('services.business.productionFinance.passbook.subtitle')}</div>
                            </div>
                            <div className="flex rounded-full border border-zinc-800 bg-black/30 p-1 shrink-0">
                                {[
                                    { id: '12W', label: tr('services.business.productionFinance.passbook.range.threeMonths') },
                                    { id: '52W', label: tr('services.business.productionFinance.passbook.range.oneYear') },
                                    { id: 'ALL', label: tr('services.business.productionFinance.passbook.range.all') }
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
                                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{tr('services.business.productionFinance.passbook.moneyIn')}</div>
                                <div className="font-mono font-bold text-emerald-400">{formatMoney(ledgerInflows)}</div>
                            </div>
                            <div className="rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{tr('services.business.productionFinance.passbook.moneyOut')}</div>
                                <div className="font-mono font-bold text-rose-400">{formatMoney(ledgerOutflows)}</div>
                            </div>
                            <div className="rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{tr('services.business.productionFinance.passbook.netFlow')}</div>
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
                                        <div className="text-sm font-bold text-white leading-tight">{getLedgerEntryLabel(entry)}</div>
                                        <div className="mt-1 text-[11px] text-zinc-500">
                                            {entry.projectId ? tr('services.business.productionFinance.ledger.projectRef', { projectId: entry.projectId }) : tr('services.business.productionFinance.ledger.cashEntry')}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className={`font-mono font-bold text-base ${entry.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {entry.amount >= 0 ? '+' : '-'}{formatMoney(Math.abs(entry.amount))}
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                                            {entry.amount >= 0 ? tr('services.business.productionFinance.passbook.credit') : tr('services.business.productionFinance.passbook.debit')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-[1.4rem] border border-zinc-800 bg-black/30 px-4 py-6 text-center">
                                <div className="text-sm font-bold text-zinc-400 mb-1">{tr('services.business.productionFinance.passbook.emptyTitle')}</div>
                                <div className="text-[11px] text-zinc-600">{tr('services.business.productionFinance.passbook.emptySubtext')}</div>
                            </div>
                        )}
                        {visibleLedgerEntries < filteredLedger.length && (
                            <button
                                onClick={() => setVisibleLedgerEntries(prev => prev + 12)}
                                className="w-full rounded-[1.2rem] border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:bg-zinc-900 transition-colors"
                            >
                                {tr('services.business.productionFinance.passbook.loadOlder')}
                            </button>
                        )}
                    </div>
                </div>
                
                {/* EXIT STRATEGY SECTION */}
                <div className="bg-red-950/20 border border-red-500/20 rounded-[2rem] p-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="font-bold text-white text-sm uppercase tracking-wide mb-4 flex items-center gap-2"><LogOut size={16} className="text-red-500"/> {tr('services.business.productionFinance.exit.title')}</h3>
                        <div className="space-y-3">
                            <StudioSaleEntryCard
                                player={player}
                                studio={studio}
                                onOpen={() => setShowSaleRoom(true)}
                            />
                            
                            {/* Liquidate Option */}
                            <button 
                                onClick={() => setShowExitModal('LIQUIDATE')}
                                className="w-full p-4 rounded-xl border border-rose-500/30 bg-rose-950/10 hover:bg-rose-950/30 transition-all flex flex-col gap-1 text-left"
                            >
                                <div className="flex justify-between items-center w-full">
                                    <div className="font-bold text-sm text-rose-400">{tr('services.business.productionFinance.exit.shutDownLiquidate')}</div>
                                    <div className="text-xs font-mono font-bold text-zinc-400">{tr('services.business.productionFinance.exit.estimated', { amount: formatMoney(liquidateCheck.payout) })}</div>
                                </div>
                                <div className="text-[10px] text-zinc-500 font-normal">{tr('services.business.productionFinance.exit.liquidateHelper')}</div>
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
                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">
                            {tr('services.business.productionFinance.exit.shutDown')}
                        </h3>
                        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                            {tr('services.business.productionFinance.exit.confirmLiquidate')}
                        </p>
                        
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800 mb-6">
                            <div className="flex justify-between items-center mb-2 text-xs">
                                <span className="text-zinc-500 font-bold uppercase">{tr('services.business.productionFinance.exit.cashBalance')}</span>
                                <span className={studio.balance >= 0 ? 'text-white' : 'text-rose-500'}>{formatMoney(studio.balance)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2 text-xs">
                                <span className="text-zinc-500 font-bold uppercase">{tr('services.business.productionFinance.exit.scrapValue')}</span>
                                <span className="text-white">
                                    {formatMoney(liquidateCheck.payout - studio.balance)}
                                </span>
                            </div>
                            <div className="border-t border-zinc-700 my-2"></div>
                            <div className="flex justify-between items-center text-sm font-bold">
                                <span className="text-white uppercase">{tr('services.business.productionFinance.exit.netPayout')}</span>
                                <span className="text-zinc-200">
                                    {formatMoney(liquidateCheck.payout)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setShowExitModal(null)} className="py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700">{tr('services.business.productionFinance.exit.cancel')}</button>
                            <button onClick={executeExit} className="py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 shadow-lg shadow-red-900/20">{tr('services.business.productionFinance.exit.confirm')}</button>
                        </div>
                    </div>
                </div>
            )}
            {showSaleRoom ? (
                <StudioSaleRoom
                    player={player}
                    studio={studio}
                    onBack={() => setShowSaleRoom(false)}
                    onUpdatePlayer={onUpdatePlayer}
                    onSold={onExit}
                />
            ) : null}
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

const hasCustomPosterMedia = (customPoster: any): boolean => (
    Boolean(
        (customPoster?.type === 'IMAGE' || customPoster?.type === 'CANVA') &&
        (customPoster.imageData || customPoster.posterMediaId)
    )
);

const getStudioArchiveRevenue = (project: any) => {
    return (project.gross || 0) + (project.streamingRevenue || project.projectDetails?.streamingRevenue || 0) + (project.soundtrackRevenue || 0);
};

const getStudioArchiveProfit = (project: any) => {
    const budget = project.budget || project.projectDetails?.estimatedBudget || 0;
    const fundingEconomics = getProjectFundingEconomics(project, budget);
    const studioCost = fundingEconomics.platformFunding > 0
        ? fundingEconomics.studioCashAtRisk
        : budget;
    return getStudioArchiveRevenue(project) - studioCost;
};

const getStudioArchiveRating = (project: any) => {
    return Number(project.rating || project.imdbRating || 0);
};

const getStudioArchiveDateValue = (project: any) => {
    const activeBoost = project.phase === 'IN THEATERS' || project.phase === 'STREAMING' || project.phase === 'BIDDING' ? 100000 : 0;
    return activeBoost + getProjectReleaseSortValue(project);
};

function sortStudioArchiveByRecent(a: any, b: any) {
    return getStudioArchiveDateValue(b) - getStudioArchiveDateValue(a);
}

type FilmographySort = 'RECENT' | 'RATING' | 'REVENUE' | 'PROFIT';
type FilmographyFilter = 'ALL' | 'MOVIE' | 'SERIES' | 'THEATRICAL' | 'STREAMING' | 'FRANCHISE';

const getStudioArchiveProjectType = (project: any) => resolveProjectType(
    project?.projectType,
    project?.type,
    project?.projectDetails?.type,
    project?.mediaType
);

const StudioFilmographyView: React.FC<{
    projects: any[];
    studio: Business;
    language: GameLanguage;
    onBack: () => void;
    onOpenProject: (project: any) => void;
}> = ({ projects, studio, language, onBack, onOpenProject }) => {
    const [sortMode, setSortMode] = useState<FilmographySort>('RECENT');
    const [filterMode, setFilterMode] = useState<FilmographyFilter>('ALL');
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

	    const filteredProjects = useMemo(() => {
	        const filtered = projects.filter(project => {
	            if (filterMode === 'MOVIE') return getStudioArchiveProjectType(project) === 'MOVIE';
	            if (filterMode === 'SERIES') return getStudioArchiveProjectType(project) === 'SERIES';
            if (filterMode === 'THEATRICAL') return project.phase === 'IN THEATERS' || project.distributionPhase === 'THEATRICAL';
            if (filterMode === 'STREAMING') return project.phase === 'STREAMING' || project.distributionPhase === 'STREAMING' || !!project.streamingRevenue || !!project.views;
            if (filterMode === 'FRANCHISE') return !!(project.franchiseId || project.universeId || project.projectDetails?.franchiseId || project.projectDetails?.universeId);
            return true;
        });

        return filtered.sort((a, b) => {
            if (sortMode === 'RATING') return getStudioArchiveRating(b) - getStudioArchiveRating(a) || sortStudioArchiveByRecent(a, b);
            if (sortMode === 'REVENUE') return getStudioArchiveRevenue(b) - getStudioArchiveRevenue(a) || sortStudioArchiveByRecent(a, b);
            if (sortMode === 'PROFIT') return getStudioArchiveProfit(b) - getStudioArchiveProfit(a) || sortStudioArchiveByRecent(a, b);
            return sortStudioArchiveByRecent(a, b);
        });
    }, [projects, filterMode, sortMode]);

    const totalRevenue = projects.reduce((sum, project) => sum + getStudioArchiveRevenue(project), 0);
    const avgRating = projects.length > 0 ? projects.reduce((sum, project) => sum + getStudioArchiveRating(project), 0) / projects.length : 0;
    const bestHit = [...projects].sort((a, b) => getStudioArchiveRevenue(b) - getStudioArchiveRevenue(a))[0];

    return (
        <div className="absolute inset-0 bg-[#050505] text-white flex flex-col font-sans overflow-hidden">
            <div className="relative shrink-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-4 pt-12 pb-5 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
                <div className="flex items-center justify-between gap-4">
                    <button onClick={onBack} className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">{tr('studio.filmography.eyebrow')}</div>
                        <h1 className="text-2xl font-black tracking-tight text-white leading-tight truncate">{tr('studio.filmography.title', { studio: studio.name })}</h1>
                    </div>
                    <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-300">
                        {tr('studio.filmography.titles', { count: projects.length })}
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                    <FilmographyMetric label={tr('studio.filmography.projects')} value={`${projects.length}`} />
                    <FilmographyMetric label={tr('studio.filmography.avgRating')} value={avgRating > 0 ? avgRating.toFixed(1) : '-.--'} />
                    <FilmographyMetric label={tr('studio.filmography.revenue')} value={formatMoney(totalRevenue)} />
                </div>
                {bestHit && (
                    <div className="mt-3 rounded-2xl border border-zinc-800 bg-black/35 px-4 py-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{tr('studio.filmography.topEarner')}</div>
                        <div className="mt-1 flex items-center justify-between gap-3">
                            <div className="min-w-0 truncate text-sm font-bold text-white">{bestHit.name}</div>
                            <div className="shrink-0 font-mono text-xs font-black text-emerald-400">{formatMoney(getStudioArchiveRevenue(bestHit))}</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="shrink-0 border-b border-zinc-900 bg-black/80 px-4 py-3 backdrop-blur-xl space-y-3">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'RECENT', label: tr('studio.filmography.sort.recent') },
                        { id: 'RATING', label: tr('studio.filmography.sort.rating') },
                        { id: 'REVENUE', label: tr('studio.filmography.sort.revenue') },
                        { id: 'PROFIT', label: tr('studio.filmography.sort.profit') }
                    ].map(option => (
                        <button
                            key={option.id}
                            onClick={() => setSortMode(option.id as FilmographySort)}
                            className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                sortMode === option.id ? 'bg-amber-500 text-black' : 'border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'ALL', label: tr('studio.filmography.filter.all') },
                        { id: 'MOVIE', label: tr('studio.filmography.filter.movies') },
                        { id: 'SERIES', label: tr('studio.filmography.filter.series') },
                        { id: 'THEATRICAL', label: tr('studio.filmography.filter.theatrical') },
                        { id: 'STREAMING', label: tr('studio.filmography.filter.streaming') },
                        { id: 'FRANCHISE', label: tr('studio.filmography.filter.franchise') }
                    ].map(option => (
                        <button
                            key={option.id}
                            onClick={() => setFilterMode(option.id as FilmographyFilter)}
                            className={`shrink-0 rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                filterMode === option.id ? 'bg-white text-black' : 'border border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-200'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 pb-24">
                {filteredProjects.length > 0 ? (
                    <div className="space-y-3">
                        {filteredProjects.map(project => (
                            <FilmographyProjectRow key={project.id} project={project} language={language} onClick={() => onOpenProject(project)} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 px-5 py-10 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-black text-zinc-500">
                            <Film size={22} />
                        </div>
                        <div className="text-sm font-black text-white">{tr('studio.filmography.empty')}</div>
                        <div className="mt-1 text-xs text-zinc-500">{tr('studio.filmography.emptySub')}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

const FilmographyMetric = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-2xl border border-zinc-800 bg-black/35 px-3 py-3 min-w-0">
        <div className="truncate text-[8px] font-black uppercase tracking-widest text-zinc-500">{label}</div>
        <div className="mt-1 truncate text-sm font-black text-white">{value}</div>
    </div>
);

const getArchiveStatusLabel = (status: string, language: GameLanguage) => {
    const normalized = status.toUpperCase();
    if (normalized === 'IN THEATERS' || normalized === 'THEATRICAL') return t(language, 'studio.filmography.status.inTheaters');
    if (normalized === 'STREAMING') return t(language, 'studio.filmography.status.streaming');
    if (normalized === 'BIDDING' || normalized === 'STREAMING_BIDDING') return t(language, 'studio.filmography.status.bidding');
    if (normalized === 'RELEASED') return t(language, 'studio.filmography.status.released');
    return status;
};

const FilmographyProjectRow: React.FC<{ project: any; language: GameLanguage; onClick: () => void }> = ({ project, language, onClick }) => {
	    const revenue = getStudioArchiveRevenue(project);
	    const profit = getStudioArchiveProfit(project);
	    const rating = getStudioArchiveRating(project);
	    const type = getStudioArchiveProjectType(project);
    const genre = project.genre || project.projectDetails?.genre || 'Studio';
    const status = project.distributionPhase ? getReleaseDisplayPhase(project as ActiveRelease) : (project.phase || 'RELEASED');
    const releaseLabel = getProjectReleaseLabel(project, {}, { emptyLabel: 'Now' });
    const releaseTiming = getProjectReleaseTiming(project, {});
    const runWeek = Number(project.weekNum || project.projectDetails?.weekNum || 0);
    const franchiseName = project.universeSagaName || project.projectDetails?.universeSagaName || (project.universeId || project.projectDetails?.universeId ? 'Universe' : project.franchiseId || project.projectDetails?.franchiseId ? 'Franchise' : '');
    const customPoster = getCustomPoster(project);

    return (
        <button
            onClick={onClick}
            className="group w-full rounded-[1.45rem] border border-zinc-800 bg-zinc-950/90 p-3 text-left transition-all hover:border-amber-500/40 hover:bg-zinc-900"
        >
            <div className="flex gap-3">
                <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg">
                    {hasCustomPosterMedia(customPoster) ? (
                        <CustomPosterImage poster={customPoster} alt={project.name} className="h-full w-full object-cover" />
                    ) : (
                        <div className={`h-full w-full bg-gradient-to-br ${customPoster?.bgGradient || getPosterBg(project.name)} flex items-center justify-center p-1`}>
                            <div className="text-center font-serif text-lg font-black uppercase leading-none tracking-tighter text-white/25 -rotate-6">
                                {project.name}
                            </div>
                        </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black to-transparent" />
                </div>

                <div className="min-w-0 flex-1 py-0.5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="line-clamp-2 text-base font-black leading-tight text-white group-hover:text-amber-100">
                                {project.name}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                <span>{releaseLabel}</span>
                                <span>•</span>
                                <span>{type}</span>
                                <span>•</span>
                                <span>{genre}</span>
                            </div>
                        </div>
                        <ChevronRight size={17} className="mt-1 shrink-0 text-zinc-600 group-hover:text-amber-300" />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-zinc-700 bg-black/40 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300">
                            {getArchiveStatusLabel(status, language)}
                        </span>
                        {franchiseName && (
                            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-300">
                                {franchiseName}
                            </span>
                        )}
                        {rating > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500 px-2.5 py-1 text-[9px] font-black text-black">
                                <Star size={10} className="fill-black" /> {rating.toFixed(1)}
                            </span>
                        )}
                        {releaseTiming.releaseWeek && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-amber-300">
                                <Calendar size={10} /> W{releaseTiming.releaseWeek}
                            </span>
                        )}
                        {runWeek > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-300">
                                <Clock size={10} /> Run W{runWeek}
                            </span>
                        )}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                        <CompactArchiveStat label={t(language, 'studio.filmography.metric.revenue')} value={formatMoney(revenue)} tone="text-emerald-400" />
                        <CompactArchiveStat label={t(language, 'studio.filmography.metric.profit')} value={`${profit >= 0 ? '+' : '-'}${formatMoney(Math.abs(profit))}`} tone={profit >= 0 ? 'text-amber-300' : 'text-rose-300'} />
                        <CompactArchiveStat label={project.views ? t(language, 'studio.filmography.metric.views') : t(language, 'studio.filmography.metric.budget')} value={project.views ? `${(project.views / 1000000).toFixed(1)}M` : formatMoney(project.budget || 0)} tone="text-zinc-200" />
                    </div>
                </div>
            </div>
        </button>
    );
};

const CompactArchiveStat = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-black/30 px-2.5 py-2">
        <div className="truncate text-[8px] font-black uppercase tracking-widest text-zinc-600">{label}</div>
        <div className={`mt-0.5 truncate text-[11px] font-black font-mono ${tone}`}>{value}</div>
    </div>
);

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

    const projectType = resolveProjectType(project.projectType, project.type, project.projectDetails?.type);
    const typeBorder = projectType === 'MOVIE' ? 'border-blue-500/60 shadow-blue-900/10' :
                       projectType === 'SERIES' ? 'border-red-500/60 shadow-red-900/10' :
                       'border-zinc-800';

    return (
        <div 
            onClick={onClick}
            onKeyDown={(event) => {
                if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
                event.preventDefault();
                onClick();
            }}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-label={onClick ? `${project.name} · ${project.phase}` : undefined}
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
                if (hasCustomPosterMedia(customPoster)) {
                    return (
                        <div className="absolute inset-0 bg-zinc-900">
                            <CustomPosterImage poster={customPoster} alt={project.name} className="w-full h-full object-cover" />
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
        const prefix = val < 0 ? '-$' : '$';
        const abs = Math.abs(val);
        if (abs >= 1_000_000_000_000) return `${prefix}${(abs/1_000_000_000_000).toFixed(2)}T`;
        if (abs >= 1_000_000_000) return `${prefix}${(abs/1_000_000_000).toFixed(2)}B`;
        if (abs >= 1_000_000) return `${prefix}${(abs/1_000_000).toFixed(1)}M`;
        return `${prefix}${(abs/1_000).toFixed(0)}k`;
    };

    const hasAwards = project.awards && project.awards.filter((a: any) => a.outcome === 'WON').length > 0;
    
    const projectType = resolveProjectType(project.projectType, project.type, project.projectDetails?.type);
    const typeBorder = projectType === 'MOVIE' ? 'border-blue-500/60 shadow-blue-900/10' :
                       projectType === 'SERIES' ? 'border-red-500/60 shadow-red-900/10' :
                       'border-zinc-800';

    let outcomeLabel = null;
    let outcomeColor = "";
    const projectRevenue = getStudioArchiveRevenue(project);
    const projectBudget = project.budget || 0;
    const marketOutcomeRevenue = getProjectMarketOutcomeRevenue(project, projectRevenue, projectBudget);
    if (marketOutcomeRevenue > projectBudget * 5) {
        outcomeLabel = "BLOCKBUSTER";
        outcomeColor = "bg-purple-500 text-white";
    } else if (marketOutcomeRevenue > projectBudget * 2) {
        outcomeLabel = "HIT";
        outcomeColor = "bg-emerald-500 text-white";
    } else if (marketOutcomeRevenue < projectBudget) {
        outcomeLabel = "FLOP";
        outcomeColor = "bg-rose-500 text-white";
    } else {
        outcomeLabel = "AVERAGE";
        outcomeColor = "bg-zinc-500 text-white";
    }

    return (
        <div 
            onClick={onClick}
            onKeyDown={(event) => {
                if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
                event.preventDefault();
                onClick();
            }}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-label={onClick ? `${project.name} · ${outcomeLabel}` : undefined}
            className={`min-w-[140px] w-[140px] h-[210px] rounded-lg bg-zinc-900 border-2 flex flex-col relative overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-all duration-300 shadow-lg ${typeBorder}`}
        >
            {/* Poster Area */}
            {(() => {
                const customPoster = getCustomPoster(project);
                if (hasCustomPosterMedia(customPoster)) {
                    return (
                        <div className="absolute inset-0 bg-zinc-900">
                            <CustomPosterImage poster={customPoster} alt={project.name} className="w-full h-full object-cover" />
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
