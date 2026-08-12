import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Archive, ArrowLeft, ChevronRight, Film, Flame, Gauge, Layers, Plus, RotateCcw, SlidersHorizontal, Sparkles, Trophy, Tv } from 'lucide-react';
import { Business, Player, ProjectType, Script } from '../../../../types';
import { resolveProjectType } from '../../../../services/businessLogic';
import { formatGenreLabel } from '../../../../services/genreCatalog';
import { createContinuationScript, getContinuationEligibility } from '../../../../services/sequelFlow';
import { getInheritedStudioProjects } from '../../../../services/legacyLogic';
import { getReleaseDisplayPhase } from '../../../../services/releasePresentation';
import { getCharacterIdentityOption } from '../../../../services/characterStoryFit';
import { getDefaultCharacterStoryFunction, normalizeCharacterAbilityType, normalizeCharacterNature, normalizeCharacterStoryFunction, normalizeCharacterStoryRole } from '../../../../services/universeLogic';
import { getPlayerLanguage, t } from '../../../../services/i18n';
import { WorkingTitleDialog } from './WorkingTitleDialog';
import { clamp, formatCurrency } from '../developmentLabFormatting';

type FranchiseCommissionMode = 'SEQUEL' | 'SPINOFF' | 'FINALE' | 'REBOOT';

export interface DevelopmentLabFranchiseManagerProps {
    player: Player;
    studio: Business;
    onCommission: (script: Script) => void;
}

export const DevelopmentLabFranchiseManager: React.FC<DevelopmentLabFranchiseManagerProps> = ({ player, studio, onCommission }) => {
    const [selectedFranchiseId, setSelectedFranchiseId] = useState<string | null>(null);
    const franchiseDetailTopRef = useRef<HTMLDivElement>(null);
    const acquisitionPortfolio = studio.studioState?.acquisitionPortfolio;
    const [portfolioFilter, setPortfolioFilter] = useState<'ALL' | 'NEW' | 'INHERITED'>('ALL');
    const [franchiseCommissionDraft, setFranchiseCommissionDraft] = useState<{
        mode: FranchiseCommissionMode;
        suggestedTitle: string;
        projectType: ProjectType;
    } | null>(null);
    useEffect(() => {
        if (!selectedFranchiseId) return;
        const frame = requestAnimationFrame(() => {
            franchiseDetailTopRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        });
        return () => cancelAnimationFrame(frame);
    }, [selectedFranchiseId]);
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const franchiseMove = (key: string) => tr(`developmentLab.franchise.move.${key}`);
    const franchiseModeLabel = (mode: FranchiseCommissionMode) => tr(`developmentLab.franchise.mode.${mode}`);
    const projectTypeLabel = (type: string) => tr(`developmentLab.franchise.projectType.${type.toLowerCase()}`);

    const getFranchiseLifecycle = (franchiseId: string, projects: any[]) => {
        const pendingScripts = (studio.studioState?.scripts || []).filter(script => script.franchiseId === franchiseId && script.status !== 'PRODUCED');
        const hasPendingFinale = pendingScripts.some(script => script.tags?.includes('FINALE') || /final chapter|finale|closing chapter/i.test(`${script.title} ${script.logline || ''}`));
        const hasProducedFinale = projects.some(project => /final chapter|finale|last chapter|the end/i.test(project.name || ''));
        const hasPendingReboot = pendingScripts.some(script => script.tags?.includes('REBOOT') || /new blood|reboot|fresh entry|new era/i.test(`${script.title} ${script.logline || ''}`));
        const rebootProjects = projects.filter(project => /new blood|reboot|new era|legacy reborn/i.test(project.name || ''));
        const latestYear = Math.max(...projects.map(project => Number(project.year) || player.age));
        const yearsSinceLatest = Math.max(0, player.age - latestYear);

        if (hasPendingReboot) {
            return {
                state: 'REBOOT_PENDING' as const,
                label: tr('developmentLab.franchise.lifecycle.rebootPending.label'),
                description: tr('developmentLab.franchise.lifecycle.rebootPending.description'),
                lockMainline: true,
                lockFinale: true,
                lockSpinoff: false,
                recommendedMove: franchiseMove('finishReboot'),
                recommendedMoveKey: 'finishReboot'
            };
        }

        if (rebootProjects.length > 0) {
            return {
                state: 'REBOOTED' as const,
                label: tr('developmentLab.franchise.lifecycle.rebooted.label'),
                description: tr('developmentLab.franchise.lifecycle.rebooted.description'),
                lockMainline: false,
                lockFinale: projects.length < 2,
                lockSpinoff: false,
                recommendedMove: franchiseMove('buildNewEra'),
                recommendedMoveKey: 'buildNewEra'
            };
        }

        if (hasPendingFinale) {
            return {
                state: 'FINALE_PENDING' as const,
                label: tr('developmentLab.franchise.lifecycle.finalePending.label'),
                description: tr('developmentLab.franchise.lifecycle.finalePending.description'),
                lockMainline: true,
                lockFinale: true,
                lockSpinoff: false,
                recommendedMove: franchiseMove('finishFinale'),
                recommendedMoveKey: 'finishFinale'
            };
        }

        if (hasProducedFinale) {
            return {
                state: 'CONCLUDED' as const,
                label: tr('developmentLab.franchise.lifecycle.concluded.label'),
                description: tr('developmentLab.franchise.lifecycle.concluded.description'),
                lockMainline: true,
                lockFinale: true,
                lockSpinoff: false,
                recommendedMove: yearsSinceLatest >= 2 ? franchiseMove('softReboot') : franchiseMove('letItRest'),
                recommendedMoveKey: yearsSinceLatest >= 2 ? 'softReboot' : 'letItRest'
            };
        }

        return {
            state: yearsSinceLatest >= 4 ? 'RESTING' as const : 'ACTIVE' as const,
            label: yearsSinceLatest >= 4 ? tr('developmentLab.franchise.lifecycle.resting.label') : tr('developmentLab.franchise.lifecycle.active.label'),
            description: yearsSinceLatest >= 4
                ? tr('developmentLab.franchise.lifecycle.resting.description')
                : tr('developmentLab.franchise.lifecycle.active.description'),
            lockMainline: false,
            lockFinale: false,
            lockSpinoff: false,
            recommendedMove: '',
            recommendedMoveKey: ''
        };
    };

    const getFranchisePulse = (projects: any[], totalGross: number, avgRating: number, franchiseId?: string) => {
        const installmentCount = projects.length;
        const latestYear = Math.max(...projects.map(p => Number(p.year) || player.age));
        const yearsSinceLatest = Math.max(0, player.age - latestYear);
        const billionScale = clamp(totalGross / 1_000_000_000 * 30, 0, 35);
        const ratingScale = clamp(avgRating * 8, 0, 80);
        const hitStreak = projects.slice(-2).filter(p => (p.rating || 0) >= 7 || (p.gross || 0) >= 150_000_000).length * 5;
        const health = Math.round(clamp(ratingScale + billionScale + hitStreak - Math.max(0, installmentCount - 4) * 5));
        const fatigue = Math.round(clamp((installmentCount - 1) * 14 + (yearsSinceLatest <= 1 ? 18 : 0) - Math.max(0, (avgRating - 7) * 8)));
        const demand = Math.round(clamp((totalGross / 250_000_000) * 16 + avgRating * 6 + Math.max(0, 18 - yearsSinceLatest * 4) - fatigue * 0.25));

        let verdict = tr('developmentLab.franchise.pulse.default.verdict');
        let bestMove = franchiseMove('pauseFranchise');
        let demandLabel = tr('developmentLab.franchise.pulse.demand.cult');
        let riskLabel = tr('developmentLab.franchise.pulse.risk.medium');
        let tone = 'text-amber-300';

        if (demand >= 75 && fatigue < 55) {
            verdict = tr('developmentLab.franchise.pulse.hot.verdict');
            bestMove = franchiseMove('commissionSequel');
            demandLabel = tr('developmentLab.franchise.pulse.demand.hot');
            riskLabel = tr('developmentLab.franchise.pulse.risk.low');
            tone = 'text-emerald-300';
        } else if (fatigue >= 70) {
            verdict = tr('developmentLab.franchise.pulse.tired.verdict');
            bestMove = franchiseMove('pauseOrSpinoff');
            demandLabel = tr('developmentLab.franchise.pulse.demand.tired');
            riskLabel = tr('developmentLab.franchise.pulse.risk.high');
            tone = 'text-rose-300';
        } else if (health >= 78 && installmentCount >= 3) {
            verdict = tr('developmentLab.franchise.pulse.premium.verdict');
            bestMove = franchiseMove('eventFinale');
            demandLabel = tr('developmentLab.franchise.pulse.demand.premium');
            riskLabel = tr('developmentLab.franchise.pulse.risk.medium');
            tone = 'text-sky-300';
        } else if (demand >= 55) {
            verdict = tr('developmentLab.franchise.pulse.expansion.verdict');
            bestMove = franchiseMove('developSpinoff');
            demandLabel = tr('developmentLab.franchise.pulse.demand.rising');
            riskLabel = tr('developmentLab.franchise.pulse.risk.medium');
            tone = 'text-violet-300';
        } else if (health < 48 && installmentCount >= 2) {
            verdict = tr('developmentLab.franchise.pulse.reset.verdict');
            bestMove = franchiseMove('softReboot');
            demandLabel = tr('developmentLab.franchise.pulse.demand.cold');
            riskLabel = tr('developmentLab.franchise.pulse.risk.high');
            tone = 'text-orange-300';
        }

        if (franchiseId) {
            const lifecycle = getFranchiseLifecycle(franchiseId, projects);
            if (lifecycle.state === 'CONCLUDED') {
                verdict = tr('developmentLab.franchise.pulse.concluded.verdict');
                bestMove = lifecycle.recommendedMove;
                demandLabel = tr('developmentLab.franchise.pulse.demand.closed');
                riskLabel = lifecycle.recommendedMoveKey === 'softReboot' ? tr('developmentLab.franchise.pulse.risk.rebootWindow') : franchiseMove('letItRest');
                tone = 'text-blue-300';
            } else if (lifecycle.state === 'FINALE_PENDING') {
                verdict = tr('developmentLab.franchise.pulse.finalePending.verdict');
                bestMove = franchiseMove('finishFinale');
                demandLabel = tr('developmentLab.franchise.pulse.demand.pending');
                riskLabel = tr('developmentLab.franchise.pulse.risk.doNotStack');
                tone = 'text-blue-300';
            } else if (lifecycle.state === 'REBOOT_PENDING') {
                verdict = tr('developmentLab.franchise.pulse.rebootPending.verdict');
                bestMove = franchiseMove('finishReboot');
                demandLabel = tr('developmentLab.franchise.pulse.demand.resetting');
                riskLabel = tr('developmentLab.franchise.pulse.risk.transition');
                tone = 'text-rose-300';
            } else if (lifecycle.state === 'REBOOTED') {
                verdict = tr('developmentLab.franchise.pulse.rebooted.verdict');
                bestMove = demand >= 60 ? franchiseMove('commissionSequel') : franchiseMove('buildNewEra');
                demandLabel = tr('developmentLab.franchise.pulse.demand.rebooted');
                riskLabel = tr('developmentLab.franchise.pulse.risk.trustRebuild');
                tone = 'text-violet-300';
            }
        }

        return { health, fatigue, demand, verdict, bestMove, demandLabel, riskLabel, tone, yearsSinceLatest };
    };

    const getFranchiseCharacters = (projects: any[]) => {
        const characterMap = new Map<string, {
            name: string;
            actorName: string;
            appearances: number;
            latestProject: string;
            isRecast: boolean;
            actors: Set<string>;
            roleType: string;
            cameoCount: number;
            storyFunction: any;
            storyRole: any;
            abilityType: any;
            nature: any;
        }>();
        projects.forEach(project => {
            (project.castList || []).forEach((member: any, index: number) => {
                if (!member || String(member.roleType || 'SUPPORTING') === 'EXTRA') return;
                const characterName = member.characterName || member.roleName || (index === 0 ? project.name : `${project.name} Role ${index + 1}`);
                const key = member.characterId || characterName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                const actorName = member.actorName || member.name || 'Unknown Actor';
                const roleType = String(member.roleType || (index === 0 ? 'LEAD' : 'SUPPORTING'));
                const storyRole = normalizeCharacterStoryRole(member.storyRole);
                const storyFunction = normalizeCharacterStoryFunction(
                    member.storyFunction,
                    getDefaultCharacterStoryFunction(roleType, storyRole)
                );
                const abilityType = normalizeCharacterAbilityType(member.abilityType);
                const nature = normalizeCharacterNature(member.nature);
                const existing = characterMap.get(key);
                if (existing) {
                    existing.appearances += 1;
                    existing.latestProject = project.name;
                    existing.isRecast = existing.isRecast || (!!actorName && !existing.actors.has(actorName));
                    existing.actors.add(actorName);
                    existing.actorName = actorName;
                    existing.cameoCount += roleType === 'CAMEO' ? 1 : 0;
                    if (existing.roleType !== 'LEAD' && roleType === 'LEAD') existing.roleType = 'LEAD';
                    existing.storyFunction = storyFunction;
                    existing.storyRole = storyRole;
                    existing.abilityType = abilityType;
                    existing.nature = nature;
                } else {
                    characterMap.set(key, {
                        name: characterName,
                        actorName,
                        appearances: 1,
                        latestProject: project.name,
                        isRecast: false,
                        actors: new Set([actorName]),
                        roleType,
                        cameoCount: roleType === 'CAMEO' ? 1 : 0,
                        storyFunction,
                        storyRole,
                        abilityType,
                        nature
                    });
                }
            });
        });
        const allCharacters = Array.from(characterMap.values());
        const summary = allCharacters.reduce((acc, character) => {
            if (character.roleType === 'LEAD') acc.leads += 1;
            else if (character.roleType === 'CAMEO') acc.cameos += 1;
            else if (character.roleType === 'MINOR') acc.minor += 1;
            else acc.supporting += 1;
            if (character.appearances > 1) acc.recurring += 1;
            if (character.isRecast) acc.recast += 1;
            return acc;
        }, { total: allCharacters.length, leads: 0, supporting: 0, cameos: 0, minor: 0, recurring: 0, recast: 0 });

        return {
            summary,
            featured: allCharacters
            .sort((a, b) => b.appearances - a.appearances)
                .slice(0, 4)
        };
    };

    // Identify studio projects
    const inheritedStudioProjects = getInheritedStudioProjects(player, studio.id).map((p: any) => ({
        id: p.id,
        name: p.name || p.title,
        franchiseId: p.franchiseId,
        universeId: p.universeId,
        year: p.year || p.releaseYear,
        gross: p.gross || p.totalGross || 0,
        rating: p.rating || p.imdbRating || 0,
        type: resolveProjectType(p.projectType, p.type, p.projectDetails?.type),
        subtype: p.subtype,
        genre: p.genre,
        installmentNumber: p.installmentNumber || 1,
        castList: p.castList || [],
        releaseWeek: p.releaseWeek,
        releaseYear: p.releaseYear,
        releasedAtAbsoluteWeek: p.releasedAtAbsoluteWeek,
        phase: 'RELEASED'
    }));
    const acquiredCatalogProjects = (acquisitionPortfolio?.catalog || []).map(item => ({
        id: item.id,
        name: item.title,
        franchiseId: item.franchiseId,
        universeId: item.universeId,
        year: item.year,
        gross: item.revenue,
        rating: item.quality > 0 ? item.quality / 10 : 0,
        type: item.projectType,
        subtype: item.franchiseId ? 'SEQUEL' : 'STANDALONE',
        genre: item.genre,
        installmentNumber: item.franchiseId
            ? Math.max(1, (acquisitionPortfolio?.franchises.find(franchise => franchise.id === item.franchiseId)?.catalogItemIds.indexOf(item.id) || 0) + 1)
            : 1,
        castList: [],
        releaseWeek: item.week,
        releaseYear: item.year,
        releasedAtAbsoluteWeek: ((Math.max(1, item.year) - 1) * 52) + Math.max(1, item.week) - 1,
        phase: 'RELEASED',
        isAcquisitionLegacy: true,
        legacyOutcome: item.outcome,
        legacySource: item.source,
        legacyQuality: item.quality,
        hasRecordedRevenue: item.source !== 'ACQUISITION_SUMMARY',
    }));
    const allStudioProjects = [
        ...player.pastProjects.filter(p => p.studioId === studio.id).map(p => ({ 
            id: p.id, 
            name: p.name, 
            franchiseId: p.franchiseId, 
            universeId: p.universeId, 
            year: p.year, 
            gross: p.gross || 0, 
            rating: p.imdbRating || 0,
            type: resolveProjectType(p.projectType, (p as any).type, (p as any).projectDetails?.type),
            subtype: p.subtype,
            genre: p.genre,
            installmentNumber: p.installmentNumber || 1,
            castList: p.castList || [],
            releaseWeek: p.releaseWeek,
            releaseYear: p.releaseYear,
            releasedAtAbsoluteWeek: p.releasedAtAbsoluteWeek,
            phase: 'RELEASED'
        })),
        ...player.activeReleases.filter(r => r.projectDetails.studioId === studio.id).map(r => ({ 
            id: r.id, 
            name: r.name, 
            franchiseId: r.projectDetails.franchiseId, 
            universeId: r.projectDetails.universeId, 
            year: r.releaseYear || player.age,
            gross: r.totalGross || 0, 
            rating: r.imdbRating || 0,
            type: resolveProjectType(r.type, r.projectDetails?.type),
            subtype: r.projectDetails.subtype,
            genre: r.projectDetails.genre,
            installmentNumber: r.projectDetails.installmentNumber || 1,
            castList: r.projectDetails.castList || [],
            releaseWeek: r.releaseWeek,
            releaseYear: r.releaseYear,
            releasedAtAbsoluteWeek: r.releasedAtAbsoluteWeek,
            weekNum: r.weekNum,
            phase: getReleaseDisplayPhase(r)
        })),
        ...inheritedStudioProjects,
        ...acquiredCatalogProjects,
    ];
    const inheritedProjectCount = allStudioProjects.filter(project => project.isAcquisitionLegacy).length;
    const hasInheritedProjects = inheritedProjectCount > 0;
    const studioProjects = allStudioProjects.filter(project => (
        portfolioFilter === 'INHERITED'
            ? project.isAcquisitionLegacy
            : portfolioFilter === 'NEW'
                ? !project.isAcquisitionLegacy
                : true
    ));

    // Identify which IDs are actually franchises (have sequels or are part of one)
    const establishedFranchiseIds = new Set<string>();
    studioProjects.forEach(p => {
        if (p.franchiseId) establishedFranchiseIds.add(p.franchiseId);
        if (studioProjects.some(other => other.franchiseId === p.id)) {
            establishedFranchiseIds.add(p.id);
        }
    });

    // Identify candidates (standalone movies with high gross/rating)
    const candidates = studioProjects.filter(p => 
        !establishedFranchiseIds.has(p.id) && 
        !p.franchiseId && 
        (p.gross > 100000000 || p.rating > 7.5)
    ).sort((a, b) => b.gross - a.gross);

    // Group by Franchise
    const franchisesMap = new Map<string, any[]>();
    studioProjects.forEach(p => {
        const fid = p.franchiseId || p.id;
        if (establishedFranchiseIds.has(fid)) {
            if (!franchisesMap.has(fid)) franchisesMap.set(fid, []);
            franchisesMap.get(fid)!.push(p);
        }
    });

    // Filter only those that are actually franchises
    const franchises = Array.from(franchisesMap.entries()).map(([id, projects]) => {
        const sorted = [...projects].sort((a, b) => a.installmentNumber - b.installmentNumber || a.year - b.year);
        const root = sorted[0];
        const totalGross = projects.reduce((sum, p) => sum + p.gross, 0);
        const avgRating = projects.reduce((sum, p) => sum + p.rating, 0) / projects.length;
        
        return {
            id,
            name: root.name,
            projects: sorted,
            totalGross,
            avgRating,
            lastInstallment: sorted[sorted.length - 1].installmentNumber,
            type: root.type,
            genre: root.genre,
            isAcquisitionLegacy: projects.some(project => project.isAcquisitionLegacy),
            hasRecordedRevenue: projects.some(project => project.hasRecordedRevenue),
            pulse: getFranchisePulse(sorted, totalGross, avgRating, id)
        };
    }).sort((a, b) => b.totalGross - a.totalGross);

    if (selectedFranchiseId) {
        const franchise = franchises.find(f => f.id === selectedFranchiseId) || 
                         candidates.find(c => c.id === selectedFranchiseId) as any;
        
        if (!franchise) {
            setSelectedFranchiseId(null);
            return null;
        }

        // If it's a candidate, it's a "virtual" franchise with 1 project
        const isCandidate = !franchises.some(f => f.id === selectedFranchiseId);
        const displayFranchise = isCandidate ? {
            id: franchise.id,
            name: franchise.name,
            projects: [franchise],
            totalGross: franchise.gross,
            avgRating: franchise.rating,
            lastInstallment: 1,
            type: franchise.type,
            genre: franchise.genre,
            isAcquisitionLegacy: Boolean(franchise.isAcquisitionLegacy),
            pulse: getFranchisePulse([franchise], franchise.gross, franchise.rating, franchise.id)
        } : franchise;
        const lifecycle = getFranchiseLifecycle(displayFranchise.id, displayFranchise.projects);
        const pulse = displayFranchise.pulse || getFranchisePulse(displayFranchise.projects, displayFranchise.totalGross, displayFranchise.avgRating, displayFranchise.id);
        const characterFocus = getFranchiseCharacters(displayFranchise.projects);
        const characters = characterFocus.featured;
        const continuationProject = displayFranchise.projects[displayFranchise.projects.length - 1];
        const inheritedRecords = displayFranchise.projects.filter((project: any) => project.isAcquisitionLegacy);
        const recordedRevenue = inheritedRecords
            .filter((project: any) => project.hasRecordedRevenue)
            .reduce((total: number, project: any) => total + Number(project.gross || 0), 0);
        const hasRecordedRevenue = inheritedRecords.some((project: any) => project.hasRecordedRevenue);
        const latestInheritedRecord = inheritedRecords[inheritedRecords.length - 1];
        const inheritedRecordSource = latestInheritedRecord?.legacySource === 'WORLD_CATALOG'
            ? 'Studio archive'
            : latestInheritedRecord?.legacySource === 'VENTURE_HISTORY'
                ? 'Operating ledger'
                : 'Diligence estimate';
        const studioScripts = studio.studioState?.scripts || [];
        const continuationEligibility = {
            SEQUEL: getContinuationEligibility({ player, studioScripts, project: continuationProject, mode: 'SEQUEL' }),
            SPINOFF: getContinuationEligibility({ player, studioScripts, project: continuationProject, mode: 'SPINOFF' }),
            FINALE: getContinuationEligibility({ player, studioScripts, project: continuationProject, mode: 'FINALE' }),
            REBOOT: getContinuationEligibility({ player, studioScripts, project: continuationProject, mode: 'REBOOT' })
        };

        const getSuggestedFranchiseTitle = (mode: FranchiseCommissionMode) => {
            const last = displayFranchise.projects[displayFranchise.projects.length - 1];
            const nextNum = (last.installmentNumber || displayFranchise.lastInstallment || 1) + 1;
            return {
                SEQUEL: `${displayFranchise.name} ${nextNum}`,
                SPINOFF: `${displayFranchise.name}: A New Story`,
                FINALE: `${displayFranchise.name}: Final Chapter`,
                REBOOT: `${displayFranchise.name}: New Blood`
            }[mode];
        };

        const requestFranchiseCommission = (mode: FranchiseCommissionMode) => {
            if ((mode === 'SEQUEL' && lifecycle.lockMainline) || (mode === 'FINALE' && lifecycle.lockFinale) || (mode === 'SPINOFF' && lifecycle.lockSpinoff)) {
                return;
            }
            if (!continuationEligibility[mode].eligible) return;
            setFranchiseCommissionDraft({
                mode,
                suggestedTitle: getSuggestedFranchiseTitle(mode),
                projectType: displayFranchise.type,
            });
        };

        const commissionScript = (mode: FranchiseCommissionMode, title: string, selectedProjectType?: ProjectType) => {
            const projectType = mode === 'SPINOFF'
                ? (selectedProjectType || displayFranchise.type)
                : displayFranchise.type;
            const result = createContinuationScript({
                player,
                studioScripts,
                project: continuationProject,
                mode,
                title,
	                overrides: {
	                    genres: [displayFranchise.genre],
	                    projectType,
	                    franchiseId: displayFranchise.id,
	                    logline: mode === 'FINALE'
	                    ? tr('developmentLab.franchise.logline.finale', { name: displayFranchise.name })
	                    : mode === 'REBOOT'
	                        ? tr('developmentLab.franchise.logline.reboot', { name: displayFranchise.name })
	                        : mode === 'SPINOFF'
	                            ? tr('developmentLab.franchise.logline.spinoff', { name: displayFranchise.name })
	                            : tr('developmentLab.franchise.logline.sequel', { name: displayFranchise.name })
	                }
	            });
            if (!result.ok || !result.script) return;
            onCommission(result.script);
        };

        const sequelLocked = lifecycle.lockMainline || !continuationEligibility.SEQUEL.eligible;
        const finaleLocked = lifecycle.lockFinale || !continuationEligibility.FINALE.eligible;
        const spinoffLocked = lifecycle.lockSpinoff || !continuationEligibility.SPINOFF.eligible;
        const rebootLocked = !continuationEligibility.REBOOT.eligible;
        const lockedButtonClass = 'opacity-45 cursor-not-allowed grayscale hover:bg-zinc-900 active:scale-100';

        return (
            <div ref={franchiseDetailTopRef} className="scroll-mt-2 space-y-6 animate-in slide-in-from-right-4 duration-300 pb-20">
                <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_38%),linear-gradient(135deg,rgba(24,24,27,0.96),rgba(3,7,18,0.96))] p-5 shadow-[0_0_45px_rgba(245,158,11,0.08)]">
                    <div className="absolute right-4 top-4 text-[88px] font-black italic text-white/[0.03] leading-none">{pulse.health}</div>
                    <div className="flex items-center gap-3 mb-5 relative">
                    <button onClick={() => setSelectedFranchiseId(null)} className="p-2 bg-black/40 border border-white/10 rounded-full hover:bg-zinc-800">
                        <ArrowLeft size={16} />
                    </button>
                    <div className="min-w-0">
	                        <p className={`text-[10px] font-black uppercase tracking-[0.28em] ${pulse.tone}`}>{isCandidate ? tr('developmentLab.franchise.candidate') : pulse.verdict}</p>
		                        <h2 className="break-words text-[1.65rem] font-black uppercase leading-none tracking-tight text-white">{displayFranchise.name}</h2>
	                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{tr('developmentLab.franchise.meta', { count: displayFranchise.projects.length, genre: formatGenreLabel(displayFranchise.genre), lifecycle: lifecycle.label })}</p>
                            {displayFranchise.isAcquisitionLegacy && (
                                <p className="mt-1 inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-teal-300">
                                    <Archive size={10} /> Acquired with {studio.name}
                                </p>
                            )}
	                    </div>
	                    </div>

	                    <div className="grid grid-cols-3 gap-3 relative">
	                        {[
	                            { label: tr('developmentLab.franchise.metric.health'), value: pulse.health, icon: <Gauge size={15} />, color: 'bg-emerald-400' },
	                            { label: tr('developmentLab.franchise.metric.demand'), value: pulse.demand, icon: <Flame size={15} />, color: 'bg-amber-400' },
	                            { label: tr('developmentLab.franchise.metric.fatigue'), value: pulse.fatigue, icon: <AlertTriangle size={15} />, color: pulse.fatigue > 68 ? 'bg-rose-500' : 'bg-sky-400' }
	                        ].map(metric => (
                            <div key={metric.label} className="bg-black/35 border border-white/10 p-3 rounded-2xl">
                                <div className="flex items-center justify-between text-zinc-400 mb-2">
                                    {metric.icon}
                                    <span className="text-lg font-black text-white">{metric.value}</span>
                                </div>
                                <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-2">{metric.label}</p>
                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className={`h-full ${metric.color}`} style={{ width: `${metric.value}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                            {displayFranchise.isAcquisitionLegacy && (
                                <div className="relative mt-4 border-y border-teal-300/20 py-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <Archive size={14} className="shrink-0 text-teal-300" />
                                            <p className="truncate text-[9px] font-black uppercase tracking-[0.22em] text-teal-200">Inherited record</p>
                                        </div>
                                        <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-zinc-500">{inheritedRecordSource}</span>
                                    </div>
                                    <div className="grid grid-cols-3 divide-x divide-white/10">
                                        <div className="pr-3">
                                            <p className="text-[7px] font-black uppercase tracking-widest text-zinc-500">Recorded revenue</p>
                                            <p className="mt-1 font-mono text-sm font-black text-emerald-300">
                                                {hasRecordedRevenue ? formatCurrency(recordedRevenue) : 'No record'}
                                            </p>
                                        </div>
                                        <div className="px-3">
                                            <p className="text-[7px] font-black uppercase tracking-widest text-zinc-500">
                                                {latestInheritedRecord?.legacySource === 'ACQUISITION_SUMMARY' ? 'Quality estimate' : 'Review score'}
                                            </p>
                                            <p className="mt-1 font-mono text-sm font-black text-amber-200">
                                                {latestInheritedRecord?.rating > 0 ? `${latestInheritedRecord.rating.toFixed(1)}/10` : 'No score'}
                                            </p>
                                        </div>
                                        <div className="pl-3">
                                            <p className="text-[7px] font-black uppercase tracking-widest text-zinc-500">Outcome</p>
                                            <p className="mt-1 break-words text-[9px] font-black uppercase leading-tight text-white">
                                                {latestInheritedRecord?.legacyOutcome || 'Not recorded'}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="mt-3 text-[9px] font-semibold leading-relaxed text-zinc-500">
                                        Historical performance stays with this studio. It does not add new cash to your treasury.
                                    </p>
                                </div>
                            )}

		                    <div className="mt-4 grid grid-cols-3 gap-3 relative">
		                        <div className="bg-black/25 border border-white/10 p-3 rounded-2xl">
		                            <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">
                                        {displayFranchise.isAcquisitionLegacy ? 'Recorded revenue' : tr('developmentLab.franchise.metric.gross')}
                                    </p>
		                            <p className="text-sm font-mono font-bold text-emerald-300">
                                        {displayFranchise.isAcquisitionLegacy && !hasRecordedRevenue ? 'No record' : formatCurrency(displayFranchise.totalGross)}
                                    </p>
		                        </div>
		                        <div className="bg-black/25 border border-white/10 p-3 rounded-2xl">
		                            <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">
                                        {latestInheritedRecord?.legacySource === 'ACQUISITION_SUMMARY' ? 'Quality estimate' : tr('developmentLab.franchise.metric.avgRating')}
                                    </p>
		                            <p className="text-sm font-mono font-bold text-amber-300">{displayFranchise.avgRating.toFixed(1)}/10</p>
	                        </div>
	                        <div className="bg-black/25 border border-white/10 p-3 rounded-2xl">
	                            <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">{tr('developmentLab.franchise.metric.bestMove')}</p>
	                            <p className="text-[11px] font-black text-white uppercase leading-tight">{pulse.bestMove}</p>
	                        </div>
	                    </div>
	                    <div className="mt-4 bg-black/35 border border-white/10 rounded-2xl p-3 relative">
	                        <div className="flex items-center justify-between gap-3 mb-2">
	                            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">{tr('developmentLab.franchise.lifecycle.title')}</p>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                                lifecycle.state === 'CONCLUDED' ? 'bg-blue-500/10 text-blue-300' :
                                lifecycle.state === 'REBOOTED' || lifecycle.state === 'REBOOT_PENDING' ? 'bg-violet-500/10 text-violet-300' :
                                lifecycle.state === 'FINALE_PENDING' ? 'bg-sky-500/10 text-sky-300' :
                                lifecycle.state === 'RESTING' ? 'bg-zinc-500/10 text-zinc-300' :
                                'bg-emerald-500/10 text-emerald-300'
                            }`}>{lifecycle.label}</span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{lifecycle.description}</p>
                    </div>
                </div>

                <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-3xl">
	                    <div className="flex items-center gap-2 mb-2">
	                        <Sparkles size={16} className="text-amber-400" />
	                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{tr('developmentLab.franchise.audiencePulse')}</h3>
	                    </div>
	                    <p className="text-sm text-zinc-200 font-bold leading-relaxed">
	                        {lifecycle.state === 'CONCLUDED'
	                            ? tr('developmentLab.franchise.audience.concluded', { name: displayFranchise.name })
	                            : lifecycle.state === 'FINALE_PENDING'
	                                ? tr('developmentLab.franchise.audience.finalePending')
	                                : lifecycle.state === 'REBOOT_PENDING'
	                                    ? tr('developmentLab.franchise.audience.rebootPending')
	                                    : pulse.fatigue > 70
	                            ? tr('developmentLab.franchise.audience.fatigue', { name: displayFranchise.name })
	                            : pulse.demand > 75
	                                ? tr('developmentLab.franchise.audience.hot', { name: displayFranchise.name })
	                                : pulse.health > 78
	                                    ? tr('developmentLab.franchise.audience.prestige')
	                                    : tr('developmentLab.franchise.audience.growth', { name: displayFranchise.name })}
	                    </p>
	                </div>

                {/* History */}
                <div className="space-y-3">
	                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">{tr('developmentLab.franchise.releaseHistory')}</h3>
                    <div className="space-y-2">
                        {displayFranchise.projects.map((p: any) => (
                            <div key={p.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500">
                                        {p.type === 'SERIES' ? <Tv size={16} /> : <Film size={16} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{p.name}</p>
	                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{p.year} • {projectTypeLabel(p.type)}</p>
                                    </div>
                                </div>
	                                <div className="text-right">
	                                    <p className="text-xs font-mono font-bold text-zinc-300">
                                            {p.rating > 0 ? `${p.rating.toFixed(1)} review` : 'No review'}
                                        </p>
	                                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest">
                                            {p.isAcquisitionLegacy && !p.hasRecordedRevenue ? 'No revenue record' : formatCurrency(p.gross)}
                                        </p>
	                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {characters.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-end justify-between gap-3 px-1">
                            <div>
	                                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{tr('developmentLab.franchise.castPreview')}</h3>
	                                <p className="text-[10px] text-zinc-600 mt-1">
	                                    {tr('developmentLab.franchise.castSummary', { total: characterFocus.summary.total, recurring: characterFocus.summary.recurring, recast: characterFocus.summary.recast })}
	                                </p>
	                            </div>
	                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/10 px-2 py-1 rounded-full">
	                                {tr('developmentLab.franchise.leadCount', { count: characterFocus.summary.leads })}
	                            </span>
	                        </div>
	                        <div className="grid grid-cols-4 gap-2">
	                            {[
	                                [tr('developmentLab.franchise.role.supporting'), characterFocus.summary.supporting],
	                                [tr('developmentLab.franchise.role.cameos'), characterFocus.summary.cameos],
	                                [tr('developmentLab.franchise.role.minor'), characterFocus.summary.minor],
	                                [tr('developmentLab.franchise.role.recurring'), characterFocus.summary.recurring]
	                            ].map(([label, value]) => (
                                <div key={label} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-2 text-center">
                                    <p className="text-sm font-black text-white">{value}</p>
                                    <p className="text-[7px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {characters.map(char => (
                                <div key={`${char.name}_${char.latestProject}`} className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-base font-black text-white leading-tight">{char.name}</p>
	                                            <p className="text-[10px] text-zinc-500 mt-1">{tr('developmentLab.franchise.playedBy', { actor: char.actorName })}</p>
	                                        </div>
	                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${char.isRecast ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
	                                            {char.isRecast ? tr('developmentLab.franchise.recast') : tr('developmentLab.franchise.appearancesShort', { count: char.appearances })}
	                                        </span>
	                                    </div>
	                                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-3">
	                                        {tr('developmentLab.franchise.characterMeta', { role: tr(`developmentLab.franchise.roleType.${String(char.roleType).toLowerCase()}`), project: char.latestProject })}
	                                    </p>
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {[
                                                getCharacterIdentityOption('storyFunction', char.storyFunction).label,
                                                getCharacterIdentityOption('storyRole', char.storyRole).label,
                                                getCharacterIdentityOption('abilityType', char.abilityType).label,
                                                getCharacterIdentityOption('nature', char.nature).label,
                                            ].map((label, index) => (
                                                <span
                                                    key={`${char.name}_${label}_${index}`}
                                                    className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-widest ${
                                                        index === 0
                                                            ? 'border-cyan-400/20 bg-cyan-400/5 text-cyan-200'
                                                            : index === 1
                                                                ? 'border-violet-400/20 bg-violet-400/5 text-violet-200'
                                                                : 'border-zinc-700 bg-black/20 text-zinc-400'
                                                    }`}
                                                >
                                                    {label}
                                                </span>
                                            ))}
                                        </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
	                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">{tr('developmentLab.franchise.action.nextMove')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            onClick={() => requestFranchiseCommission('SEQUEL')}
                            disabled={sequelLocked}
                            className={`bg-amber-500 hover:bg-amber-400 text-black p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98] shadow-[0_0_24px_rgba(245,158,11,0.18)] ${sequelLocked ? lockedButtonClass : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <Plus size={20} />
                                <div className="text-left">
	                                    <p className="font-black uppercase tracking-tight text-sm">{isCandidate ? tr('developmentLab.franchise.action.startSequel') : sequelLocked ? tr('developmentLab.franchise.action.mainlineLocked') : franchiseMove('commissionSequel')}</p>
	                                    <p className="text-[10px] opacity-70 font-bold">{sequelLocked ? (lifecycle.lockMainline ? lifecycle.label : continuationEligibility.SEQUEL.message) : tr('developmentLab.franchise.action.developNumbered', { name: displayFranchise.name, number: displayFranchise.lastInstallment + 1 })}</p>
                                </div>
                            </div>
                            <ChevronRight size={20} />
                        </button>

                        <button
                            onClick={() => requestFranchiseCommission('SPINOFF')}
                            disabled={spinoffLocked}
                            className={`bg-zinc-900 hover:bg-zinc-800 text-white p-4 rounded-2xl flex items-center justify-between transition-all border border-zinc-700 active:scale-[0.98] ${spinoffLocked ? lockedButtonClass : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <Sparkles size={20} className="text-amber-500" />
                                <div className="text-left">
	                                    <p className="font-black uppercase tracking-tight text-sm">{franchiseMove('developSpinoff')}</p>
	                                    <p className="text-[10px] text-zinc-400 font-bold">{spinoffLocked ? (lifecycle.lockSpinoff ? lifecycle.label : continuationEligibility.SPINOFF.message) : tr('developmentLab.franchise.action.spinoffDescription')}</p>
                                </div>
                            </div>
                            <ChevronRight size={20} />
                        </button>
                        <button
                            onClick={() => requestFranchiseCommission('FINALE')}
                            disabled={finaleLocked}
                            className={`bg-zinc-900 hover:bg-zinc-800 text-white p-4 rounded-2xl flex items-center justify-between transition-all border border-blue-500/20 active:scale-[0.98] ${finaleLocked ? lockedButtonClass : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <Trophy size={20} className="text-blue-400" />
                                <div className="text-left">
	                                    <p className="font-black uppercase tracking-tight text-sm">{finaleLocked ? tr('developmentLab.franchise.action.finaleLocked') : franchiseMove('eventFinale')}</p>
	                                    <p className="text-[10px] text-zinc-400 font-bold">{finaleLocked ? (lifecycle.lockFinale ? lifecycle.label : continuationEligibility.FINALE.message) : tr('developmentLab.franchise.action.finaleDescription')}</p>
                                </div>
                            </div>
                            <ChevronRight size={20} />
                        </button>
                        <button
                            onClick={() => requestFranchiseCommission('REBOOT')}
                            disabled={rebootLocked}
                            className={`bg-zinc-900 hover:bg-zinc-800 text-white p-4 rounded-2xl flex items-center justify-between transition-all border border-rose-500/20 active:scale-[0.98] ${rebootLocked ? lockedButtonClass : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <RotateCcw size={20} className="text-rose-400" />
                                <div className="text-left">
	                                    <p className="font-black uppercase tracking-tight text-sm">{franchiseMove('softReboot')}</p>
	                                    <p className="text-[10px] text-zinc-400 font-bold">{rebootLocked ? continuationEligibility.REBOOT.message : tr('developmentLab.franchise.action.rebootDescription')}</p>
                                </div>
                            </div>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
                {franchiseCommissionDraft && (
                    <WorkingTitleDialog
                        mode="COMMISSION"
	                        title={tr('developmentLab.franchise.dialog.title', { mode: franchiseModeLabel(franchiseCommissionDraft.mode) })}
	                        description={tr('developmentLab.franchise.dialog.description', { name: displayFranchise.name })}
                        initialTitle={franchiseCommissionDraft.suggestedTitle}
                        allowProjectTypeChoice={franchiseCommissionDraft.mode === 'SPINOFF'}
                        initialProjectType={franchiseCommissionDraft.projectType}
                        onClose={() => setFranchiseCommissionDraft(null)}
                        onConfirm={(title, projectType) => {
                            commissionScript(franchiseCommissionDraft.mode, title, projectType);
                            setFranchiseCommissionDraft(null);
                        }}
                    />
                )}
            </div>
        );
    }

	    return (
	        <div className="space-y-6 pb-20">
	            <header className="border-l-2 border-amber-400 px-4 py-1">
	                <h2 className="text-2xl font-black uppercase tracking-tight text-white">{tr('developmentLab.franchise.title')}</h2>
	                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{tr('developmentLab.franchise.subtitle')}</p>
	            </header>

                {hasInheritedProjects && (
                    <div className="flex items-center justify-between gap-3 border-y border-zinc-800 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                            <SlidersHorizontal size={14} className="shrink-0 text-teal-300" />
                            <p className="truncate text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Catalog filter</p>
                        </div>
                        <label className="relative shrink-0">
                            <span className="sr-only">Filter studio franchises</span>
                            <select
                                value={portfolioFilter}
                                onChange={(event) => {
                                    setPortfolioFilter(event.target.value as 'ALL' | 'NEW' | 'INHERITED');
                                    setSelectedFranchiseId(null);
                                }}
                                className="appearance-none rounded-full border border-zinc-700 bg-zinc-950 py-2 pl-3 pr-8 text-[9px] font-black uppercase tracking-[0.13em] text-white outline-none transition-colors focus:border-teal-300"
                            >
                                <option value="ALL">All projects</option>
                                <option value="NEW">New projects</option>
                                <option value="INHERITED">Inherited</option>
                            </select>
                            <ChevronRight size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-zinc-500" />
                        </label>
                    </div>
                )}

            {franchises.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                    {franchises.map(f => (
                        <div 
                            key={f.id} 
                            onClick={() => setSelectedFranchiseId(f.id)}
                            className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(39,39,42,0.92),rgba(9,9,11,0.98))] border border-zinc-800 rounded-3xl p-5 hover:border-amber-500/50 transition-all cursor-pointer group shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
                        >
                            <div className="absolute -right-8 -top-10 w-36 h-36 bg-amber-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:text-amber-500 transition-colors">
                                        {f.type === 'SERIES' ? <Tv size={20} /> : <Film size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/40 ${f.pulse.tone}`}>{f.pulse.demandLabel}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{f.pulse.riskLabel}</span>
                                            {f.isAcquisitionLegacy && (
                                                <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-teal-300">
                                                    <Archive size={9} /> Inherited
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-white group-hover:text-amber-500 transition-colors">{f.name}</h3>
	                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{tr('developmentLab.franchise.listMeta', { count: f.projects.length, type: projectTypeLabel(f.type) })}</p>
	                                    </div>
                                </div>
                                <div className="bg-zinc-800 p-2 rounded-lg text-zinc-400 group-hover:text-amber-500 transition-colors">
                                    <ChevronRight size={16} />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-800/50 relative">
                                <div>
		                                    <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">
                                            {f.isAcquisitionLegacy ? 'Recorded revenue' : tr('developmentLab.franchise.metric.gross')}
                                        </p>
	                                    <p className="text-sm font-mono font-bold text-white">
                                            {f.isAcquisitionLegacy && !f.hasRecordedRevenue ? 'No record' : formatCurrency(f.totalGross)}
                                        </p>
                                </div>
                                <div>
	                                    <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">{tr('developmentLab.franchise.metric.health')}</p>
                                    <p className="text-sm font-mono font-bold text-emerald-300">{f.pulse.health}</p>
                                </div>
                                <div>
	                                    <p className="text-[8px] text-zinc-500 uppercase font-black mb-1">{tr('developmentLab.franchise.metric.bestMove')}</p>
                                    <p className="text-[10px] font-black text-amber-300 uppercase leading-tight">{f.pulse.bestMove}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

	            {candidates.length > 0 && (
	                <div className="space-y-4">
	                    <div className="px-1">
	                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{tr('developmentLab.franchise.candidatesTitle')}</h3>
	                        <p className="text-[9px] text-zinc-600 mt-1">{tr('developmentLab.franchise.candidatesSubtitle')}</p>
	                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {candidates.map(c => {
                            const pulse = getFranchisePulse([c], c.gross, c.rating, c.id);
                            return (
                            <div 
                                key={c.id} 
                                onClick={() => setSelectedFranchiseId(c.id)}
                                className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 flex justify-between items-center hover:border-amber-500/30 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-600 group-hover:text-amber-500 transition-colors">
                                        {c.type === 'SERIES' ? <Tv size={16} /> : <Film size={16} />}
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{c.name}</p>
                                            {c.isAcquisitionLegacy && (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-teal-300/20 bg-teal-300/[0.06] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-teal-200">
                                                    <Archive size={8} /> Inherited
                                                </span>
                                            )}
                                        </div>
		                                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest">
                                                {c.isAcquisitionLegacy
                                                    ? `${c.hasRecordedRevenue ? formatCurrency(c.gross) : 'No revenue record'} · ${c.legacySource === 'ACQUISITION_SUMMARY' ? 'Quality estimate' : 'Review'} ${c.rating.toFixed(1)} · Demand ${pulse.demand}`
                                                    : tr('developmentLab.franchise.candidateMeta', { gross: formatCurrency(c.gross), rating: c.rating.toFixed(1), demand: pulse.demand })}
                                            </p>
                                    </div>
                                </div>
                                <Plus size={14} className="text-zinc-700 group-hover:text-amber-500 transition-colors" />
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}

	            {franchises.length === 0 && candidates.length === 0 && (
	                <div className="bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl p-20 flex flex-col items-center justify-center text-center">
	                    <Layers size={48} className="text-zinc-800 mb-4" />
	                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{tr('developmentLab.franchise.empty.title')}</p>
	                    <p className="text-[9px] text-zinc-700 mt-2 max-w-[200px]">{tr('developmentLab.franchise.empty.subtitle')}</p>
	                </div>
	            )}
	        </div>
	    );
};
