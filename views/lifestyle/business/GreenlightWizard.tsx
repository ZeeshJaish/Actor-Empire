import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Player, BudgetTier, Genre, ProjectDetails, ActiveRelease, Business, LocationDetails, Universe, UniverseId, ProjectMusicStrategy, MusicCreditRole, MusicArtist, ProjectInvestorFundingMode, StudioContract, RoleType, BackgroundCastingPlan } from '../../../types';
import { ArrowLeft, Film, DollarSign, TrendingUp, Calendar, Star, Award, Briefcase, LayoutGrid, MapPin, PenTool, Camera, ChevronRight, Lock, BarChart3, LogOut, Sparkles, BookOpen, Video, Clock, Palette, Lightbulb, Box, XCircle, Loader2 } from 'lucide-react';
import { NPC_DATABASE, getAvailableTalent, isCastableActor } from '../../../services/npcLogic';
import { getConnectedDirectorCandidates, getDirectorConnectionDiscount } from '../../../services/directorConnectionLogic';
import { getActorTalent, getDirectorTalent } from '../../../services/roleLogic';
import { getDefaultCharacterStoryRole, getFallbackCharacterName, getUniverseCharacterKeyAliases, getUniverseCharacterSelectionOptions, isUniverseRetired, normalizeCharacterAbilityType, normalizeCharacterStoryRole, normalizeUniverseCharacterKey, normalizeUniverseMap } from '../../../services/universeLogic';
import { showAd } from '../../../services/adLogic';
import { hasNoAds, spendPlayerEnergy } from '../../../services/premiumLogic';
import { PHASE_ONE_ENERGY_COSTS } from '../../../services/energyCosts';
import { getPlayerLanguage, t } from '../../../services/i18n';
import { resolveProjectType } from '../../../services/businessLogic';
import { addBreadcrumb, markGameCheckpoint, markTraceAction, setCrashContext, startPerformanceTrace, stopPerformanceTrace, trackGameEvent } from '../../../services/firebaseService';
import { finalizeOwnedStreamingOriginalGreenlight } from '../../../services/streamingOriginals';
import {
    calculateProjectMusicImpact,
    buildProjectMusicPlanFromArtists,
    estimateMusicArtistProjectCost,
    getDefaultMusicArtistCount,
    getMusicArtistCountBounds,
    getMusicArtistCatalog,
    getMusicCreditRoleLabel,
    getMusicStrategyCreditRoles,
    getMusicStrategyCreditCount,
    getMusicStrategyLabel,
    getRecommendedMusicArtistsForProject
} from '../../../services/musicIndustry';
import {
    buildProjectInvestorPlan,
    describeInvestorKind,
    generateProjectInvestorOffers,
    getMaxInvestorRaise,
    normalizeInvestorRaiseAmount,
    updateInvestorRelationshipsForPlan
} from '../../../services/projectInvestors';
import { getInheritedStudioProjects } from '../../../services/legacyLogic';
import { getStudioGroup } from '../../../services/studioGroup';
import { mergeParentStudioTalentRosters } from '../../../services/talentRoster';
import {
    getInHouseCastProjectCost,
    getInHouseCrewProjectCost,
    getProductionBudgetTier,
} from '../../../services/studioProductionEconomy';
import { inferStoryCompass, suggestCharacterIdentity } from '../../../services/characterIdentityLogic';
import { evaluateCastStoryFit, getCastStoryRead } from '../../../services/characterStoryFit';
import {
    GREENLIGHT_GEAR_TIERS,
    GreenlightEquipmentStep,
} from './components/GreenlightEquipmentStep';
import { GreenlightLocationStep } from './components/GreenlightLocationStep';
import { GreenlightCrewSelector } from './components/GreenlightCrewSelector';
import { GreenlightScriptStep } from './components/GreenlightScriptStep';
import { GreenlightDirectorStep } from './components/GreenlightDirectorStep';
import { GreenlightCrewStep } from './components/GreenlightCrewStep';
import { GreenlightHeader } from './components/GreenlightHeader';
import { GreenlightTalentPickerModal } from './components/GreenlightTalentPickerModal';
import { GreenlightNegotiationModal } from './components/GreenlightNegotiationModal';
import { GreenlightBuzzStep } from './components/GreenlightBuzzStep';
import { GreenlightArtDirectionSection } from './components/GreenlightArtDirectionSection';
import { GreenlightMarketingBudgetSection } from './components/GreenlightMarketingBudgetSection';
import { GreenlightCastStep } from './components/GreenlightCastStep';
import { GreenlightSoundtrackSection } from './components/GreenlightSoundtrackSection';
import { GreenlightStoryConnectionSection } from './components/GreenlightStoryConnectionSection';
import { GreenlightConfirmationStep } from './components/GreenlightConfirmationStep';
import {
    calculateAvailableGreenlightFunds,
    calculateGreenlightBudget,
    calculateGreenlightCastingStrength,
    calculateGreenlightEstimatedQuality,
    calculateGreenlightFundingPosition,
    calculateGreenlightPackageBudget,
    calculateInvestorRaiseAmountFromPercent,
    calculateInvestorRaisePercent,
    calculateMaxGreenlightMarketingBudget,
} from './greenlightCalculations';
import {
    resolveGreenlightConnectedIntent,
    validateGreenlightProject,
} from './greenlightValidation';
import { buildGreenlightBuzz } from './greenlightBuzz';
import {
    buildGreenlightProject,
    prepareGreenlightFunding,
} from './greenlightProjectBuilder';
import {
    type GreenlightCastRole,
    type GreenlightNegotiationState,
    type GreenlightPacing,
    type GreenlightStep,
    type GreenlightVisualStyle,
} from './greenlightTypes';
import {
    type ConnectedProjectIntent,
    type MarketingBudgetPreset,
    type MusicArtistSortOption,
    formatMoney,
    MARKETING_BUDGET_PRESETS,
    getMarketingBudgetForPreset,
    MUSIC_DELIVERABLE_ROLES,
    MUSIC_ARTIST_SORT_OPTIONS,
    MUSIC_FAME_SORT_SCORE,
    MUSIC_AVAILABILITY_SORT_SCORE,
    getCastableNpcById,
    isCastableMovieRoleId,
    getInitialMusicArtistTargetCount,
    getInitialSelectedMusicCreditRoles,
    getMusicStrategyForSelectedRoles,
    returningCrewRoleToStateKey,
    normalizeCrewReturningRole,
    normalizeSelectedCrewState,
    formatReturningRoleLabel,
    VALID_RETURNING_TALENT_ROLES,
    getUniversePhaseLabel,
    toUniverseCharacterId,
} from './greenlightUtils';
import { BackgroundCastingPanel } from './components/BackgroundCastingPanel';
import { buildBackgroundCastingPlan, normalizeBackgroundCastingPlan } from '../../../services/livingEnsemble';
import {
    PRODUCTION_LOCATIONS_BY_CONTINENT,
    getProductionLocation,
} from '../../../services/productionLocations';
import {
    getCrewMarketAbsoluteWeek,
    getCrewMarketCycle,
    getCrewMarketRefreshInWeeks,
    getRotatingCrewCandidates,
    normalizeCrewSelectionId,
} from '../../../services/crewMarket';

export { formatMoney } from './greenlightUtils';

export const GEAR_TIERS = GREENLIGHT_GEAR_TIERS;

export interface GreenlightWizardProps {
    player: Player;
    studio: Business;
    initialConcept?: any;
    onBack: () => void;
    onOpenScriptMarket?: () => void;
    onUpdatePlayer: (p: Player) => void;
    onComplete: () => void;
}

export const GreenlightWizard: React.FC<GreenlightWizardProps> = ({ player, studio, initialConcept, onBack, onOpenScriptMarket, onUpdatePlayer, onComplete }) => {
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const [selectedScriptId, setSelectedScriptId] = useState<string | null>(initialConcept?.scriptId || null);
    const loadedScriptStateRef = useRef<string | null>(initialConcept?.scriptId ? `initial:${initialConcept.scriptId}` : null);
    const initialStep = initialConcept?.lastStep === 'TONE' ? 'SETUP' : (initialConcept?.lastStep || (initialConcept ? 'DIRECTOR' : 'SELECT_SCRIPT'));
    const [step, setStep] = useState<GreenlightStep>(initialStep);
    const isInternallyControlledTalent = (id?: string | null) => id === 'PLAYER_SELF' || id === 'STUDIO_STAFF';

    // Setup State
    const [tone, setTone] = useState(initialConcept?.tone || 50); // 0 = Practical, 100 = CGI
    const [visualStyle, setVisualStyle] = useState<GreenlightVisualStyle>('REALISTIC');
    const [pacing, setPacing] = useState<GreenlightPacing>('MODERATE');
    const [marketingBudgetPreset, setMarketingBudgetPreset] = useState<MarketingBudgetPreset>(initialConcept?.reservedMarketingBudget !== undefined ? 'CUSTOM' : 'STANDARD');
    const [reservedMarketingBudget, setReservedMarketingBudget] = useState(Math.max(0, Math.round(Number(initialConcept?.reservedMarketingBudget || 0))));
    const [musicStrategy, setMusicStrategy] = useState<ProjectMusicStrategy>(initialConcept?.musicStrategy || initialConcept?.musicPlan?.strategy || 'LEAD_SINGLE');
    const [musicArtistTargetCount, setMusicArtistTargetCount] = useState<number>(getInitialMusicArtistTargetCount(initialConcept));
    const [selectedMusicCreditRoles, setSelectedMusicCreditRoles] = useState<MusicCreditRole[] | null>(getInitialSelectedMusicCreditRoles(initialConcept));
    const [selectedMusicArtistIds, setSelectedMusicArtistIds] = useState<string[]>(
        Array.isArray(initialConcept?.selectedMusicArtistIds)
            ? initialConcept.selectedMusicArtistIds
            : Array.isArray(initialConcept?.musicPlan?.credits)
                ? initialConcept.musicPlan.credits.map((credit: any) => credit.artistId).filter(Boolean)
                : []
    );
    const [activeMusicSlotIndex, setActiveMusicSlotIndex] = useState(0);
    const [activeMusicSearchRole, setActiveMusicSearchRole] = useState<MusicCreditRole | null>(null);
    const [musicRoleSearchQueries, setMusicRoleSearchQueries] = useState<Record<string, string>>({});
    const [musicRoleSortOptions, setMusicRoleSortOptions] = useState<Record<string, MusicArtistSortOption>>({});
    const [investorRaiseAmount, setInvestorRaiseAmount] = useState<number>(Math.max(0, Math.round(Number(initialConcept?.investorRaiseAmount || initialConcept?.investorPlan?.targetRaise || 0))));
    const [investorFundingMode, setInvestorFundingMode] = useState<ProjectInvestorFundingMode>(initialConcept?.investorFundingMode || initialConcept?.investorPlan?.fundingMode || 'SYNDICATE');
    const [selectedInvestorIds, setSelectedInvestorIds] = useState<string[]>(
        Array.isArray(initialConcept?.selectedInvestorIds)
            ? initialConcept.selectedInvestorIds
            : Array.isArray(initialConcept?.investorPlan?.commitments)
                ? initialConcept.investorPlan.commitments.map((commitment: any) => commitment.investorId).filter(Boolean)
                : []
    );

    // Crew State
    const [crewModes, setCrewModes] = useState<Record<string, 'HIRE' | 'SELF' | 'IN_HOUSE'>>(initialConcept?.crewModes || {
        director: 'HIRE',
        cinematographer: 'HIRE',
        composer: 'HIRE',
        lineProducer: 'HIRE',
        vfx: 'HIRE'
    });
    const [selectedCrew, setSelectedCrew] = useState<Record<string, string | null>>(
        normalizeSelectedCrewState(initialConcept?.selectedCrew)
    );

    // Cast State
    const [castList, setCastList] = useState<GreenlightCastRole[]>(initialConcept?.castList || [
        { id: 'lead_1', role: 'Lead Actor', roleType: 'LEAD', actorId: null, identitySource: 'AUTO' },
        { id: 'supp_1', role: 'Supporting Actor', roleType: 'SUPPORTING', actorId: null, identitySource: 'AUTO' }
    ]);
    const [backgroundCastingPlan, setBackgroundCastingPlan] = useState<BackgroundCastingPlan>(() => (
        normalizeBackgroundCastingPlan(initialConcept?.backgroundCastingPlan, {})
    ));
    const backgroundPlanScriptRef = useRef<string | null>(null);

    const [selectedLocations, setSelectedLocations] = useState<string[]>(initialConcept?.selectedLocations || []);
    const [selectedUniverseId, setSelectedUniverseId] = useState<UniverseId | 'NEW' | null>(initialConcept?.universeId || null);
    const [newUniverseName, setNewUniverseName] = useState<string>("");
    const [selectedFranchiseId, setSelectedFranchiseId] = useState<string | 'NEW' | null>(initialConcept?.franchiseId || null);
    const [previousInstallmentCost, setPreviousInstallmentCost] = useState<number | null>(null);
    const [connectedProjectIntent, setConnectedProjectIntent] = useState<ConnectedProjectIntent>(initialConcept?.connectedProjectIntent || 'AUTO');
    const [showStoryConnectionInfo, setShowStoryConnectionInfo] = useState(false);
    const [showCharacterFlowInfo, setShowCharacterFlowInfo] = useState(false);
    const [showLegacyCharacterArchive, setShowLegacyCharacterArchive] = useState(false);

    // Equipment State
    const [equipmentChoices, setEquipmentChoices] = useState<Record<string, string>>(initialConcept?.equipmentChoices || {
        cameras: 'TIER_3',
        lighting: 'TIER_3',
        sound: 'TIER_3',
        practicalEffects: 'TIER_3'
    });

    const isPrimaryStudio = getStudioGroup(player).parentStudio?.id === studio.id;
    const playerActingTalent = useMemo(
        () => getActorTalent(player.stats.skills),
        [player.stats.skills],
    );
    const studioTalentRoster = useMemo(() => {
        if (!isPrimaryStudio) {
            return (studio.studioState?.talentRoster || [])
                .filter(contract => contract.studioId === studio.id);
        }
        return mergeParentStudioTalentRosters(
            studio.id,
            player.studio?.talentRoster as any,
            studio.studioState?.talentRoster as any,
        );
    }, [isPrimaryStudio, player.studio?.talentRoster, studio.id, studio.studioState?.talentRoster]);

    const contractedTalentIds = useMemo(() => {
        return new Set(
            studioTalentRoster
                .filter(contract => contract?.status === 'ACTIVE' && contract?.type === 'MOVIE_DEAL' && (contract?.moviesRemaining ?? 0) > 0 && contract?.npcId)
                .map(contract => contract.npcId)
        );
    }, [studioTalentRoster]);

    const getReturningTalentKey = (talent: any) => [
        String(talent?.role || 'UNKNOWN_ROLE'),
        String(talent?.id || 'UNKNOWN_TALENT'),
        String(talent?.characterId || talent?.characterName || '')
    ].join(':');

    const dedupeReturningTalent = (talentList: any[] = []) => {
        const byKey = new Map<string, any>();
        const safeTalentList = Array.isArray(talentList) ? talentList : [];

        safeTalentList.forEach((talent: any) => {
            if (!talent || typeof talent !== 'object') return;

            const role = String(talent.role || '');
            const crewStateKey = returningCrewRoleToStateKey(role);
            const id = String(crewStateKey ? normalizeCrewSelectionId(talent.id) || '' : talent.id || '');
            if (!id || !VALID_RETURNING_TALENT_ROLES.has(role)) return;

            const originalSalary = Math.max(0, Number.isFinite(Number(talent.originalSalary)) ? Number(talent.originalSalary) : Number(talent.newDemand || 0));
            const newDemand = Math.max(0, Number.isFinite(Number(talent.newDemand)) ? Number(talent.newDemand) : originalSalary);
            const attemptsLeft = Math.max(0, Math.min(3, Number.isFinite(Number(talent.attemptsLeft)) ? Number(talent.attemptsLeft) : 3));
            const cleaned = {
                ...talent,
                id,
                role,
                originalSalary,
                newDemand,
                attemptsLeft,
                accepted: Boolean(talent.accepted),
                negotiated: Boolean(talent.negotiated),
            };
            const key = getReturningTalentKey(cleaned);
            const existing = byKey.get(key);
            if (!existing) {
                byKey.set(key, cleaned);
                return;
            }

            // Preserve the most progressed negotiation state if duplicate sources collide.
            byKey.set(key, {
                ...existing,
                ...cleaned,
                accepted: !!existing.accepted || !!cleaned.accepted,
                negotiated: !!existing.negotiated || !!cleaned.negotiated,
                attemptsLeft: Math.min(
                    typeof existing.attemptsLeft === 'number' ? existing.attemptsLeft : 3,
                    cleaned.attemptsLeft
                ),
                newDemand: Math.max(Number(existing.newDemand || 0), cleaned.newDemand),
                originalSalary: Math.max(Number(existing.originalSalary || 0), cleaned.originalSalary)
            });
        });
        return Array.from(byKey.values()).slice(0, 12);
    };

    const normalizeReturningTalentEntries = (script: any) => {
        if (!script || typeof script !== 'object') return null;
        const projectType = resolveProjectType(script.projectType, script.type, script.projectDetails?.type, script.mediaType);
        const rawEpisodes = Number(script.episodes ?? script.projectDetails?.episodes);
        const safeGenres = Array.isArray(script.genres) && script.genres.length > 0
            ? script.genres.filter(Boolean)
            : [script.genre || 'DRAMA'];
        return {
            ...script,
            id: String(script.id || `safe_script_${script.title || Date.now()}`),
            title: String(script.title || script.name || 'Untitled Project'),
            projectType,
            episodes: projectType === 'SERIES'
                ? Math.max(1, Math.round(Number.isFinite(rawEpisodes) ? rawEpisodes : 8))
                : script.episodes,
            genres: safeGenres.length ? safeGenres : ['DRAMA'],
            status: script.status || 'READY',
            returningTalent: dedupeReturningTalent((Array.isArray(script.returningTalent) ? script.returningTalent : []).map((talent: any) => {
                const isContractedReturningActor = talent && talent.role !== 'DIRECTOR' && contractedTalentIds.has(talent.id);
                const isInternalReturnee = isInternallyControlledTalent(talent?.id);
                return {
                    ...talent,
                    attemptsLeft: isInternalReturnee ? 0 : (typeof talent?.attemptsLeft === 'number' ? talent.attemptsLeft : 3),
                    accepted: isContractedReturningActor || isInternalReturnee ? true : !!talent?.accepted,
                    negotiated: isInternalReturnee ? true : !!talent?.negotiated
                };
            }))
        };
    };

    const buildCurrentConceptDraft = () => {
        if (!selectedScriptId) return null;
        const existingConcept = studio.studioState?.concepts?.find(c => c.scriptId === selectedScriptId);

        return { // Use ProjectConcept type if imported, else any
            id: initialConcept?.id || existingConcept?.id || `concept_${selectedScriptId}`, // Deterministic ID per script
            scriptId: selectedScriptId,
            lastUpdated: Date.now(),
            crewModes,
            selectedCrew,
            castList,
            backgroundCastingPlan,
            selectedLocations,
            equipmentChoices,
            tone,
            visualStyle,
            pacing,
            reservedMarketingBudget,
            marketingBudgetSpent: 0,
            marketingBudgetRemaining: reservedMarketingBudget,
            musicStrategy: effectiveMusicStrategy,
            selectedMusicArtistTargetCount: effectiveMusicArtistCount,
            selectedMusicCreditRoles: selectedMusicCreditRoles || undefined,
            selectedMusicArtistIds,
            investorRaiseAmount,
            investorFundingMode,
            selectedInvestorIds,
            investorPlan: selectedInvestorPlan,
            universeId: selectedUniverseId,
            lockedStreamingFunding: selectedScript?.lockedStreamingFunding || initialConcept?.lockedStreamingFunding,
            newUniverseName: selectedUniverseId === 'NEW' ? newUniverseName : undefined,
            franchiseId: selectedFranchiseId,
            connectedProjectIntent,
            lastStep: step
        };
    };

    const buildStudioWithCurrentDraft = (returningTalentOverride: any[] = currentReturningTalent) => {
        const draft = buildCurrentConceptDraft();
        if (!draft) return null;

        const baseStudioState: any = studio.studioState || {};
        const defaultStudioState = {
            scripts: [],
            concepts: [],
            writers: [],
            ipMarket: [],
            lastMarketRefreshWeek: 0,
            lastWriterRefreshWeek: 0
        };
        const updatedStudio: Business = {
            ...studio,
            studioState: {
                ...defaultStudioState,
                ...baseStudioState,
                scripts: Array.isArray(baseStudioState.scripts) ? [...baseStudioState.scripts] : [],
                concepts: Array.isArray(baseStudioState.concepts) ? [...baseStudioState.concepts] : [],
                writers: Array.isArray(baseStudioState.writers) ? [...baseStudioState.writers] : [],
                ipMarket: Array.isArray(baseStudioState.ipMarket) ? [...baseStudioState.ipMarket] : []
            } as any
        };

        const concepts = updatedStudio.studioState!.concepts as any[];
        const existingIndex = concepts.findIndex(c => c?.id === draft.id || c?.scriptId === draft.scriptId);
        if (existingIndex >= 0) {
            concepts[existingIndex] = draft;
        } else {
            concepts.push(draft);
        }

        // Also ensure the script is saved if returningTalent was modified.
        if (selectedScript) {
            const scripts = updatedStudio.studioState!.scripts as any[];
            const scriptIndex = scripts.findIndex(s => s.id === selectedScript.id);
            const cleanReturningTalent = dedupeReturningTalent(returningTalentOverride);
            if (scriptIndex >= 0) {
                scripts[scriptIndex] = { ...scripts[scriptIndex], returningTalent: cleanReturningTalent };
            }
        }

        return updatedStudio;
    };

    // Save Draft Helper
    const saveDraft = () => {
        const updatedStudio = buildStudioWithCurrentDraft();
        if (!updatedStudio) return;

        const updatedPlayer = {
            ...player,
            businesses: (Array.isArray(player.businesses) ? player.businesses : []).map(b => b.id === studio.id ? updatedStudio : b)
        };
        onUpdatePlayer(updatedPlayer);
    };

    // Auto-save when leaving (Back button)
    const handleBack = () => {
        if (selectedScriptId) saveDraft();
        onBack();
    };

    const conceptByScriptId = useMemo(() => {
        const map = new Map<string, any>();
        (studio.studioState?.concepts || []).forEach((concept: any) => {
            if (concept?.scriptId) {
                map.set(concept.scriptId, concept);
            }
        });
        return map;
    }, [studio.studioState?.concepts]);

    // Filter scripts that are already in active concepts (unless it's the current one being edited)
    const scripts = useMemo(() => {
        const rawConcepts = Array.isArray(studio.studioState?.concepts) ? studio.studioState!.concepts : [];
        const rawScripts = Array.isArray(studio.studioState?.scripts) ? studio.studioState!.scripts : [];
        const existingConceptScriptIds = new Set(rawConcepts.map((c: any) => c?.scriptId).filter(Boolean));
        return rawScripts
            .map(script => normalizeReturningTalentEntries(script))
            .filter(Boolean)
            .filter((s: any) => {
                if (s.status !== 'READY') return false;
                const hasExistingConcept = existingConceptScriptIds.has(s.id);
                const isResumableScript = s.sourceMaterial === 'SEQUEL' || s.sourceMaterial === 'SPINOFF';
                return !hasExistingConcept || isResumableScript || s.id === initialConcept?.scriptId || s.id === selectedScriptId;
            });
    }, [studio.studioState?.scripts, studio.studioState?.concepts, initialConcept?.scriptId, selectedScriptId, contractedTalentIds]);

    const selectedScript = useMemo(() => {
        return scripts.find(s => s.id === selectedScriptId)
            || (selectedScriptId ? normalizeReturningTalentEntries((Array.isArray(studio.studioState?.scripts) ? studio.studioState!.scripts : []).find(s => s.id === selectedScriptId)) : null)
            || (initialConcept ? normalizeReturningTalentEntries((Array.isArray(studio.studioState?.scripts) ? studio.studioState!.scripts : []).find(s => s.id === initialConcept.scriptId)) : null);
    }, [scripts, selectedScriptId, studio.studioState?.scripts, initialConcept?.scriptId, contractedTalentIds]);
    const selectedStoryCompass = useMemo(() => (
        selectedScript
            ? inferStoryCompass(selectedScript, selectedScript.isOriginal === false ? 'MARKET_INFERENCE' : 'SCRIPT_DNA')
            : null
    ), [selectedScript]);
    const backgroundCastingContext = useMemo(() => ({
        projectId: selectedScript?.id,
        title: selectedScript?.title,
        genre: selectedScript?.genres?.[0] as Genre | undefined,
        projectType: selectedScript ? resolveProjectType(selectedScript.projectType, selectedScript.type, selectedScript.projectDetails?.type) : undefined,
        episodes: selectedScript?.episodes,
        castShape: selectedStoryCompass?.castShape,
        budget: selectedScript?.developmentCost,
        tags: selectedScript?.tags,
    }), [selectedScript, selectedStoryCompass]);

    useEffect(() => {
        if (!selectedScript?.id || backgroundPlanScriptRef.current === selectedScript.id) return;
        backgroundPlanScriptRef.current = selectedScript.id;
        const savedConcept = selectedScript.id === initialConcept?.scriptId
            ? initialConcept
            : conceptByScriptId.get(selectedScript.id);
        setBackgroundCastingPlan(normalizeBackgroundCastingPlan(savedConcept?.backgroundCastingPlan, backgroundCastingContext));
    }, [selectedScript?.id, backgroundCastingContext, conceptByScriptId, initialConcept]);

    useEffect(() => {
        if (!selectedScript && step !== 'SELECT_SCRIPT' && step !== 'BUZZ') {
            setStep('SELECT_SCRIPT');
        }
    }, [selectedScript, step]);

    const lockedStreamingFunding = useMemo(() => {
        return selectedScript?.lockedStreamingFunding || initialConcept?.lockedStreamingFunding || null;
    }, [selectedScript?.lockedStreamingFunding, initialConcept?.lockedStreamingFunding]);

    const lockedStreamingFundingAmount = useMemo(() => {
        return Math.max(0, Math.floor(Number(lockedStreamingFunding?.amount || 0)));
    }, [lockedStreamingFunding?.amount]);

    const [currentReturningTalent, setCurrentReturningTalent] = useState<any[]>([]);

    useEffect(() => {
        setCurrentReturningTalent(dedupeReturningTalent(selectedScript?.returningTalent || []));
    }, [selectedScript?.id, selectedScript?.returningTalent]);

    const activeUniverseId = useMemo(() => {
        const id = selectedUniverseId || selectedScript?.universeId || null;
        if (!id || id === 'NEW') return null;
        const universe = normalizeUniverseMap(player.world?.universes || {})[id as UniverseId];
        return universe && !isUniverseRetired(universe) ? id as UniverseId : null;
    }, [selectedUniverseId, selectedScript?.universeId, player.world?.universes]);

    const isKnownConnectedRole = (role: { characterId?: string; characterName?: string; sourceUniverseId?: UniverseId }) => {
        if (role.sourceUniverseId) return true;
        const roleKey = normalizeUniverseCharacterKey(role.characterId || role.characterName || '');
        if (!roleKey) return false;
        return linkedCharacterOptions.some(character => {
            if (character.sourceUniverseId) {
                return getUniverseCharacterKeyAliases(character.sourceUniverseId, character.characterId || character.id, character.name)
                    .includes(roleKey);
            }
            return normalizeUniverseCharacterKey(character.characterId || character.id || character.name) === roleKey;
        });
    };

    const getDefaultCharacterName = (role: any, index: number) => {
        const projectTitle = selectedScript?.title || 'Project';
        return getFallbackCharacterName(
            {
                ...role,
                roleName: role.role,
                characterName: role.characterName
            },
            projectTitle,
            index
        );
    };

    // Identify studio franchises (for selection)
    const studioFranchises = useMemo(() => {
        const inheritedStudioProjects = getInheritedStudioProjects(player, studio.id);
        const studioProjects = [
            ...player.pastProjects.filter(p => p.studioId === studio.id),
            ...player.activeReleases.filter(r => r.projectDetails.studioId === studio.id).map(r => ({ ...r.projectDetails, id: r.id })),
            ...inheritedStudioProjects
        ];

        const establishedFranchiseIds = new Set<string>();
        studioProjects.forEach(p => {
            if (p.franchiseId) establishedFranchiseIds.add(p.franchiseId);
            if (studioProjects.some(other => other.franchiseId === p.id)) {
                establishedFranchiseIds.add(p.id);
            }
        });

        const franchisesMap = new Map<string, any[]>();
        studioProjects.forEach(p => {
            const fid = p.franchiseId || p.id;
            if (establishedFranchiseIds.has(fid)) {
                if (!franchisesMap.has(fid)) franchisesMap.set(fid, []);
                franchisesMap.get(fid)!.push(p);
            }
        });

        return Array.from(franchisesMap.entries()).map(([id, projects]) => {
            const sorted = [...projects].sort((a, b) => (a.installmentNumber || 1) - (b.installmentNumber || 1));
            const root = sorted[0];
            return {
                id,
                name: root.name || root.title,
                lastInstallment: sorted[sorted.length - 1].installmentNumber || 1,
                genre: root.genre,
                projects: sorted
            };
        });
    }, [player, studio.id]);

    const selectableStudioUniverses = useMemo(() => (
        (Object.values(normalizeUniverseMap(player.world?.universes || {})) as Universe[])
            .filter(universe => universe.status !== 'RETIRED' && universe.studioId === studio.id)
    ), [player.world?.universes, studio.id]);

    const previousFranchiseInstallments = useMemo(() => {
        if (!selectedScript?.franchiseId) return [];
        const franchiseId = selectedScript.franchiseId;
        return [
            ...(player.pastProjects || []),
            ...(player.activeReleases || []),
            ...getInheritedStudioProjects(player, studio.id)
        ]
            .filter((project: any) => {
                const details = project.projectDetails || project;
                return project.franchiseId === franchiseId
                    || details.franchiseId === franchiseId
                    || project.id === franchiseId
                    || details.id === franchiseId;
            })
            .sort((a: any, b: any) => {
                const aDetails = a.projectDetails || a;
                const bDetails = b.projectDetails || b;
                return (bDetails.installmentNumber || b.installmentNumber || 0) - (aDetails.installmentNumber || a.installmentNumber || 0)
                    || (b.year || b.releaseYear || 0) - (a.year || a.releaseYear || 0);
            });
    }, [selectedScript?.franchiseId, player, studio.id]);

    const previousCharacterOptions = useMemo(() => {
        if (!selectedScript?.franchiseId || previousFranchiseInstallments.length === 0) return [];
        const sourceName = studioFranchises.find(franchise => franchise.id === selectedScript.franchiseId)?.name || selectedScript.title || 'Previous Movie';
        const seen = new Set<string>();
        const options: any[] = [];

        previousFranchiseInstallments.forEach((project: any) => {
            const details = project.projectDetails || project;
            (details.castList || []).forEach((member: any, index: number) => {
                if (!member || String(member.roleType || 'SUPPORTING') === 'EXTRA') return;
                const name = member.characterName || member.roleName || member.role || (index === 0 ? details.name || details.title || project.name : `${details.name || details.title || project.name} Role ${index + 1}`);
                const characterId = member.characterId || normalizeUniverseCharacterKey(name);
                const key = `${member.sourceUniverseId || selectedScript.franchiseId}:${normalizeUniverseCharacterKey(characterId || name)}`;
                if (seen.has(key)) return;
                seen.add(key);
                options.push({
                    id: characterId,
                    characterId,
                    name,
                    actorId: member.actorId || 'UNKNOWN',
                    actorName: member.actorName || member.name || 'Actor open',
                    status: 'ACTIVE',
                    fanApproval: 62,
                    roleType: member.roleType,
                    storyFunction: member.storyFunction,
                    storyRole: normalizeCharacterStoryRole(member.storyRole),
                    abilityType: normalizeCharacterAbilityType(member.abilityType),
                    nature: member.nature,
                    identitySource: member.identitySource || 'CANON',
                    appearances: 1,
                    latestAppearanceTitle: details.name || details.title || project.name,
                    sourceName,
                    sourceType: 'FRANCHISE',
                    sourceFranchiseId: selectedScript.franchiseId,
                    sourceUniverseId: member.sourceUniverseId
                });
            });
        });

        return options;
    }, [previousFranchiseInstallments, selectedScript?.franchiseId, selectedScript?.title, studioFranchises]);

    const allowsOutsideConnectedCharacters = useMemo(() => {
        const intent = connectedProjectIntent !== 'AUTO' ? connectedProjectIntent : selectedScript?.connectedProjectIntent;
        return intent === 'CROSSOVER' || intent === 'EVENT' || selectedScript?.tags?.includes('UNIVERSE_EVENT');
    }, [connectedProjectIntent, selectedScript?.connectedProjectIntent, selectedScript?.tags]);

    const activeUniverseCharacterOptions = useMemo(() => (
        getUniverseCharacterSelectionOptions(player, player.world?.universes || {}, {
            targetUniverseId: activeUniverseId,
            includeOutsideActiveUniverses: allowsOutsideConnectedCharacters,
            studioId: studio.id,
            language: getPlayerLanguage(player)
        })
    ), [activeUniverseId, allowsOutsideConnectedCharacters, player, studio.id]);

    const legacyCharacterOptions = useMemo(() => (
        getUniverseCharacterSelectionOptions(player, player.world?.universes || {}, {
            includeLegacyArchive: true,
            studioId: studio.id,
            language: getPlayerLanguage(player)
        }).filter(character => character.legacyArchive)
    ), [player, studio.id]);

    useEffect(() => {
        if (showLegacyCharacterArchive && legacyCharacterOptions.length === 0) {
            setShowLegacyCharacterArchive(false);
        }
    }, [showLegacyCharacterArchive, legacyCharacterOptions.length]);

    const linkedCharacterOptions = useMemo(() => {
        const normalizedUniverses = normalizeUniverseMap(player.world?.universes || {});
        const retiredUniverseIds = new Set(
            Object.values(normalizedUniverses)
                .filter(universe => isUniverseRetired(universe))
                .map(universe => universe.id)
        );
        const visiblePreviousCharacterOptions = previousCharacterOptions.filter(character => {
            if (!character.sourceUniverseId) return true;
            return !retiredUniverseIds.has(character.sourceUniverseId) || showLegacyCharacterArchive;
        });
        const options: any[] = [...visiblePreviousCharacterOptions];
        const seen = new Set<string>();
        visiblePreviousCharacterOptions.forEach(character => {
            seen.add(`${character.sourceUniverseId || character.sourceFranchiseId || 'LOCAL'}:${normalizeUniverseCharacterKey(character.characterId || character.name)}`);
        });

        const universeOptions = showLegacyCharacterArchive
            ? [...activeUniverseCharacterOptions, ...legacyCharacterOptions]
            : activeUniverseCharacterOptions;
        universeOptions.forEach(character => {
            const characterId = character.characterId || character.id || normalizeUniverseCharacterKey(character.name);
            const key = `${character.sourceUniverseId}:${characterId}`;
            if (seen.has(key)) return;
            seen.add(key);
            options.push({
                ...character,
                characterId
            });
        });

        if (selectedFranchiseId && selectedFranchiseId !== 'NEW' && previousCharacterOptions.length === 0) {
            const franchise = studioFranchises.find(f => f.id === selectedFranchiseId);
            franchise?.projects?.forEach((project: any) => {
                (project.castList || []).forEach((member: any, index: number) => {
                    if (!member || String(member.roleType || 'SUPPORTING') === 'EXTRA') return;
                    const name = member.characterName || member.roleName || member.role || (index === 0 ? project.name : `${project.name} Role ${index + 1}`);
                    const characterId = member.characterId || normalizeUniverseCharacterKey(name);
                    const key = `FRANCHISE:${selectedFranchiseId}:${characterId}`;
                    if (seen.has(key)) return;
                    seen.add(key);
                    options.push({
                        id: characterId,
                        characterId,
                        name,
                        actorId: member.actorId || 'UNKNOWN',
                        actorName: member.name || member.actorName || 'Unknown Actor',
                        status: 'ACTIVE',
                        fanApproval: 55,
                        roleType: member.roleType,
                        storyFunction: member.storyFunction,
                        storyRole: normalizeCharacterStoryRole(member.storyRole),
                        abilityType: normalizeCharacterAbilityType(member.abilityType),
                        nature: member.nature,
                        identitySource: member.identitySource || 'CANON',
                        appearances: 1,
                        latestAppearanceTitle: project.name,
                        sourceName: franchise.name,
                        sourceType: 'FRANCHISE'
                    });
                });
            });
        }

        const projectIsConnected = visiblePreviousCharacterOptions.length > 0 || !!activeUniverseId || !!selectedFranchiseId || !!selectedScript?.universeId || !!selectedScript?.franchiseId || allowsOutsideConnectedCharacters || (showLegacyCharacterArchive && legacyCharacterOptions.length > 0);
        return projectIsConnected
            ? options.sort((a, b) => {
                if (!!a.legacyArchive !== !!b.legacyArchive) return a.legacyArchive ? 1 : -1;
                const aPrevious = a.sourceType === 'FRANCHISE' && a.sourceFranchiseId === selectedScript?.franchiseId ? 0 : 1;
                const bPrevious = b.sourceType === 'FRANCHISE' && b.sourceFranchiseId === selectedScript?.franchiseId ? 0 : 1;
                if (aPrevious !== bPrevious) return aPrevious - bPrevious;
                const aSameUniverse = activeUniverseId && a.sourceUniverseId === activeUniverseId ? 0 : 1;
                const bSameUniverse = activeUniverseId && b.sourceUniverseId === activeUniverseId ? 0 : 1;
                if (aSameUniverse !== bSameUniverse) return aSameUniverse - bSameUniverse;
                return String(a.name).localeCompare(String(b.name));
            })
            : [];
    }, [activeUniverseId, player.world?.universes, selectedFranchiseId, selectedScript?.universeId, selectedScript?.franchiseId, studioFranchises, previousCharacterOptions, allowsOutsideConnectedCharacters, activeUniverseCharacterOptions, legacyCharacterOptions, showLegacyCharacterArchive]);

    const getCharacterOptionValue = (character: any) => {
        const characterKey = normalizeUniverseCharacterKey(character.characterId || character.id || character.name || '');
        if (character.sourceUniverseId) return `UNIVERSE:${character.sourceUniverseId}:${characterKey}`;
        return `${character.sourceType || 'FRANCHISE'}:${character.sourceFranchiseId || selectedFranchiseId || selectedScript?.franchiseId || 'franchise'}:${characterKey}`;
    };

    const getRoleCharacterOption = (role: { characterId?: string; characterName?: string; sourceUniverseId?: UniverseId }) => {
        const roleKey = normalizeUniverseCharacterKey(role.characterId || role.characterName || '');
        if (!roleKey) return null;
        return linkedCharacterOptions.find(character => {
            if (role.sourceUniverseId || character.sourceUniverseId) {
                if (role.sourceUniverseId && character.sourceUniverseId && role.sourceUniverseId !== character.sourceUniverseId) return false;
                return getUniverseCharacterKeyAliases(character.sourceUniverseId || role.sourceUniverseId, character.characterId || character.id, character.name)
                    .includes(roleKey);
            }
            return normalizeUniverseCharacterKey(character.characterId || character.id || character.name) === roleKey;
        }) || null;
    };

    const getRoleCharacterOptionValue = (role: { characterId?: string; characterName?: string; sourceUniverseId?: UniverseId }) => {
        const option = getRoleCharacterOption(role);
        return option ? getCharacterOptionValue(option) : '';
    };

    const studioPrestigeScore = useMemo(() => {
        const studioProjects = [
            ...player.pastProjects.filter(p => p.studioId === studio.id),
            ...player.activeReleases.filter(r => r.projectDetails.studioId === studio.id).map(r => ({
                rating: r.imdbRating,
                gross: r.totalGross + (r.streamingRevenue || 0),
                awards: [],
            })),
            ...getInheritedStudioProjects(player, studio.id)
        ];
        if (studioProjects.length === 0) return 0;
        const avgRating = studioProjects.reduce((sum, project: any) => sum + (project.rating || project.imdbRating || 0), 0) / studioProjects.length;
        const awardsWon = studioProjects.reduce((sum, project: any) => sum + (project.awards?.filter((award: any) => award.outcome === 'WON').length || 0), 0);
        const hitBonus = studioProjects.filter((project: any) => (project.gross || project.boxOffice || 0) > 200_000_000).length * 1.2;
        return Math.min(100, Math.round((avgRating * 6) + (awardsWon * 2.5) + (studioProjects.length * 0.8) + hitBonus));
    }, [player, studio.id]);

    // Track previous installment cost for comparison
    useEffect(() => {
        if (selectedScript?.franchiseId) {
            if (previousFranchiseInstallments.length > 0) {
                const lastInstallment = previousFranchiseInstallments[0];
                const details = lastInstallment.projectDetails || lastInstallment;
                setPreviousInstallmentCost(details.budget || details.estimatedBudget || lastInstallment.budget || null);
            } else {
                setPreviousInstallmentCost(null);
            }
        } else {
            setPreviousInstallmentCost(null);
        }
    }, [selectedScript?.id, selectedScript?.franchiseId, previousFranchiseInstallments]);

    // Reset state when script changes
    useEffect(() => {
        if (!selectedScriptId) {
            loadedScriptStateRef.current = null;
            return;
        }

        if (initialConcept && selectedScriptId === initialConcept.scriptId) {
            loadedScriptStateRef.current = `initial:${selectedScriptId}`;
            return;
        }

        const loadKey = `script:${selectedScriptId}`;
        if (loadedScriptStateRef.current === loadKey) return;
        loadedScriptStateRef.current = loadKey;

        if (selectedScriptId) {
            const existingConcept = conceptByScriptId.get(selectedScriptId);
            if (existingConcept) {
                setCrewModes(existingConcept.crewModes || {
                    director: 'HIRE',
                    cinematographer: 'HIRE',
                    composer: 'HIRE',
                    lineProducer: 'HIRE',
                    vfx: 'HIRE'
                });
                setSelectedCrew(normalizeSelectedCrewState(existingConcept.selectedCrew));
                setCastList(existingConcept.castList || [
                    { id: 'lead_1', role: 'Lead Actor', roleType: 'LEAD', actorId: null, identitySource: 'AUTO' },
                    { id: 'supp_1', role: 'Supporting Actor', roleType: 'SUPPORTING', actorId: null, identitySource: 'AUTO' }
                ]);
                setBackgroundCastingPlan(normalizeBackgroundCastingPlan(existingConcept.backgroundCastingPlan, backgroundCastingContext));
                setSelectedLocations(existingConcept.selectedLocations || []);
                setEquipmentChoices(existingConcept.equipmentChoices || {
                    cameras: 'TIER_3',
                    lighting: 'TIER_3',
                    sound: 'TIER_3',
                    practicalEffects: 'TIER_3'
                });
                setSelectedUniverseId(existingConcept.universeId || selectedScript?.universeId || null);
                setNewUniverseName(existingConcept.newUniverseName || "");
                setSelectedFranchiseId(existingConcept.franchiseId || selectedScript?.franchiseId || null);
                setConnectedProjectIntent(existingConcept.connectedProjectIntent || selectedScript?.connectedProjectIntent || (selectedScript?.tags?.includes('UNIVERSE_EVENT') ? 'EVENT' : selectedScript?.tags?.includes('REBOOT') ? 'REBOOT' : 'AUTO'));
                setTone(existingConcept.tone ?? 50);
                setVisualStyle(existingConcept.visualStyle || 'REALISTIC');
                setPacing(existingConcept.pacing || 'MODERATE');
                const existingMusicStrategy = existingConcept.musicStrategy || existingConcept.musicPlan?.strategy || 'LEAD_SINGLE';
                setMusicStrategy(existingMusicStrategy);
                setMusicArtistTargetCount(getInitialMusicArtistTargetCount(existingConcept));
                setSelectedMusicCreditRoles(getInitialSelectedMusicCreditRoles(existingConcept));
                setSelectedMusicArtistIds(
                    Array.isArray(existingConcept.selectedMusicArtistIds)
                        ? existingConcept.selectedMusicArtistIds
                        : Array.isArray(existingConcept.musicPlan?.credits)
                            ? existingConcept.musicPlan.credits.map((credit: any) => credit.artistId).filter(Boolean)
                            : []
                );
                setActiveMusicSearchRole(null);
                setMusicRoleSearchQueries({});
                setMusicRoleSortOptions({});
                setInvestorRaiseAmount(Math.max(0, Math.round(Number(existingConcept.investorRaiseAmount || existingConcept.investorPlan?.targetRaise || 0))));
                setInvestorFundingMode(existingConcept.investorFundingMode || existingConcept.investorPlan?.fundingMode || 'SYNDICATE');
                setSelectedInvestorIds(
                    Array.isArray(existingConcept.selectedInvestorIds)
                        ? existingConcept.selectedInvestorIds
                        : Array.isArray(existingConcept.investorPlan?.commitments)
                            ? existingConcept.investorPlan.commitments.map((commitment: any) => commitment.investorId).filter(Boolean)
                            : []
                );
            } else {
                // Reset to default
                setCrewModes({
                    director: 'HIRE',
                    cinematographer: 'HIRE',
                    composer: 'HIRE',
                    lineProducer: 'HIRE',
                    vfx: 'HIRE'
                });
                setSelectedCrew({
                    director: null,
                    cinematographer: null,
                    composer: null,
                    lineProducer: null,
                    vfx: null
                });
                setCastList([
                    { id: 'lead_1', role: 'Lead Actor', roleType: 'LEAD', actorId: null, identitySource: 'AUTO' },
                    { id: 'supp_1', role: 'Supporting Actor', roleType: 'SUPPORTING', actorId: null, identitySource: 'AUTO' }
                ]);
                setBackgroundCastingPlan(buildBackgroundCastingPlan(backgroundCastingContext));
                setSelectedLocations([]);
                setEquipmentChoices({
                    cameras: 'TIER_3',
                    lighting: 'TIER_3',
                    sound: 'TIER_3',
                    practicalEffects: 'TIER_3'
                });
                setSelectedUniverseId(selectedScript?.universeId || null);
                setNewUniverseName("");
                setSelectedFranchiseId(selectedScript?.franchiseId || null);
                setConnectedProjectIntent(selectedScript?.connectedProjectIntent || (selectedScript?.tags?.includes('UNIVERSE_EVENT') ? 'EVENT' : selectedScript?.tags?.includes('REBOOT') ? 'REBOOT' : 'AUTO'));
                setTone(50);
                setVisualStyle('REALISTIC');
                setPacing('MODERATE');
                setMusicStrategy('LEAD_SINGLE');
                setMusicArtistTargetCount(getDefaultMusicArtistCount('LEAD_SINGLE'));
                setSelectedMusicCreditRoles(null);
                setSelectedMusicArtistIds([]);
                setActiveMusicSearchRole(null);
                setMusicRoleSearchQueries({});
                setMusicRoleSortOptions({});
                setInvestorRaiseAmount(0);
                setInvestorFundingMode('SYNDICATE');
                setSelectedInvestorIds([]);
            }
        }
    }, [selectedScriptId, conceptByScriptId, initialConcept?.scriptId, backgroundCastingContext]);

    // Pre-fill sequel cast and crew
    useEffect(() => {
        if (selectedScript?.franchiseId && previousFranchiseInstallments.length > 0) {
            let directorToSet = selectedCrew.director;
            let directorModeToSet = crewModes.director;

            // Check if we need to pre-fill (no director selected yet)
            if (!directorToSet) {
                // 1. Check returning talent list in the script itself (most direct source)
                const returningDirector = currentReturningTalent.find(t => t.role === 'DIRECTOR');
                if (returningDirector) {
                    directorToSet = returningDirector.id;
                    directorModeToSet = returningDirector.id === 'PLAYER_SELF' ? 'SELF' : (returningDirector.id === 'STUDIO_STAFF' ? 'IN_HOUSE' : 'HIRE');
                }
            }

            // Find the most recent installment of this franchise to pre-fill other details
            if (previousFranchiseInstallments.length > 0) {
                const lastInstallment = previousFranchiseInstallments[0];
                const details = lastInstallment.projectDetails || lastInstallment;

                // Pre-fill director if not already set by returningTalent logic above
                if (details.directorId && !directorToSet) {
                    directorToSet = details.directorId!;
                    directorModeToSet = details.directorId === 'PLAYER_SELF' ? 'SELF' : (details.directorId === 'STUDIO_STAFF' ? 'IN_HOUSE' : 'HIRE');
                }

                if (details.directorId) {
                    const directorSalary = details.crewList?.find((crew: any) => crew.role === 'DIRECTOR')?.salary || details.directorSalary || Math.max(100_000, Math.floor((details.budget || lastInstallment.budget || 5_000_000) * 0.05));
                    setCurrentReturningTalent(prev => {
                        const merged = [...(selectedScript.returningTalent || []), ...prev];
                        if (merged.some((talent: any) => talent.id === details.directorId && talent.role === 'DIRECTOR')) {
                            return dedupeReturningTalent(merged);
                        }
                        return dedupeReturningTalent([
                            ...merged,
                            {
                                role: 'DIRECTOR',
                                id: details.directorId,
                                name: details.directorName || 'Returning Director',
                                originalSalary: directorSalary,
                                newDemand: Math.floor(directorSalary * 1.2),
                                negotiated: isInternallyControlledTalent(details.directorId),
                                accepted: isInternallyControlledTalent(details.directorId),
                                attemptsLeft: isInternallyControlledTalent(details.directorId) ? 0 : 3
                            }
                        ]);
                    });
                }

                // Apply director changes if any
                if (directorToSet !== selectedCrew.director) {
                    setSelectedCrew(prev => ({ ...prev, director: directorToSet }));
                    setCrewModes(prev => ({ ...prev, director: directorModeToSet }));
                }

                // Pre-fill other crew
                if (details.crewList && details.crewList.length > 0 && !selectedCrew.cinematographer) {
                    const newSelectedCrew = { ...selectedCrew, director: directorToSet };
                    const newCrewModes = { ...crewModes, director: directorModeToSet };
                    details.crewList.forEach((c: any) => {
                        const roleKey = c.role.toLowerCase();
                        if (roleKey === 'cinematographer' || roleKey === 'composer' || roleKey === 'line_producer' || roleKey === 'vfx_supervisor') {
                            const stateKey = roleKey === 'line_producer' ? 'lineProducer' : (roleKey === 'vfx_supervisor' ? 'vfx' : roleKey);
                            if (!newSelectedCrew[stateKey]) {
                                newSelectedCrew[stateKey] = normalizeCrewSelectionId(c.id);
                                newCrewModes[stateKey] = c.id === 'PLAYER_SELF' ? 'SELF' : (c.id === 'STUDIO_STAFF' ? 'IN_HOUSE' : 'HIRE');
                            }
                        }
                    });
                    setSelectedCrew(newSelectedCrew);
                    setCrewModes(newCrewModes);
                }

                // Pre-fill cast (only if castList is still default)
                const isCastDefault = castList.length === 2 && castList.every(c => !c.actorId);
                if (details.castList && details.castList.length > 0 && isCastDefault) {
                    const returningBase = selectedScript.returningTalent || currentReturningTalent || [];
                    const newCastList = details.castList.filter((c: any) => (
                        isCastableMovieRoleId(c.actorId, player.flags.extraNPCs || [])
                    )).map((c: any) => {
                        let salary = c.salary || 0;
                        // Check if this actor is in the returning talent list to get their new demand
                        const returning = returningBase.find((t: any) => t.id === c.actorId);
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
                            sourceUniverseId: c.sourceUniverseId,
                            storyFunction: c.storyFunction,
                            storyRole: normalizeCharacterStoryRole(c.storyRole),
                            abilityType: normalizeCharacterAbilityType(c.abilityType),
                            nature: c.nature,
                            identitySource: c.identitySource || 'CANON'
                        };
                    });
                    setCastList(newCastList);
                    setCurrentReturningTalent(prev => {
                        const merged = [...(selectedScript.returningTalent || []), ...prev];
                        const existingKeys = new Set(merged.map((talent: any) => `${talent.id}:${talent.role}`));
                        const additions = details.castList
                            .filter((c: any) => c.actorId && c.actorId !== 'UNKNOWN' && isCastableMovieRoleId(c.actorId, player.flags.extraNPCs || []))
                            .map((c: any) => {
                                const role = c.roleType === 'LEAD' ? 'LEAD_ACTOR' : 'SUPPORTING_ACTOR';
                                const originalSalary = Math.max(100_000, Math.floor(c.salary || lastInstallment.budget * (c.roleType === 'LEAD' ? 0.08 : 0.03) || 100_000));
                                return {
                                    role,
                                    id: c.actorId,
                                    originalSalary,
                                    newDemand: Math.floor(originalSalary * 1.2),
                                    negotiated: isInternallyControlledTalent(c.actorId),
                                    accepted: isInternallyControlledTalent(c.actorId),
                                    attemptsLeft: isInternallyControlledTalent(c.actorId) ? 0 : 3,
                                    characterId: c.characterId,
                                    characterName: c.characterName,
                                    sourceUniverseId: c.sourceUniverseId
                                };
                            })
                            .filter((talent: any) => {
                                const key = `${talent.id}:${talent.role}`;
                                if (existingKeys.has(key)) return false;
                                existingKeys.add(key);
                                return true;
                            });
                        return dedupeReturningTalent([...merged, ...additions]);
                    });
                }

                // Pre-fill equipment
                if (details.equipmentChoices) {
                    setEquipmentChoices(details.equipmentChoices);
                }

                // Pre-fill tone and style
                if (details.tone !== undefined) setTone(details.tone);
                if (details.visualStyle) setVisualStyle(details.visualStyle);
                if (details.pacing) setPacing(details.pacing);
            }
        }
    }, [selectedScript?.id, selectedScript?.franchiseId, previousFranchiseInstallments]);

    const directorCandidatePool = useMemo(() => [
        ...NPC_DATABASE,
        ...(player.flags.extraNPCs || [])
    ], [player.flags.extraNPCs]);
    const crewMarketAbsoluteWeek = getCrewMarketAbsoluteWeek(player.age, player.currentWeek);
    const crewMarketCycle = getCrewMarketCycle(player.age, player.currentWeek);
    const crewMarketRefreshIn = getCrewMarketRefreshInWeeks(player.age, player.currentWeek);

    const connectedDirectorCandidates = useMemo(() => (
        getConnectedDirectorCandidates(player.relationships || [], directorCandidatePool)
    ), [player.relationships, directorCandidatePool]);

    // Real NPC Data Integration
    const availableDirectors = useMemo(() => {
        // Refresh every 3 weeks
        const seedWeek = crewMarketCycle;
        const talent = getAvailableTalent(crewMarketAbsoluteWeek, 'DIRECTOR', player.flags.extraNPCs || []);
        connectedDirectorCandidates.forEach(director => {
            if (!talent.some(candidate => candidate.id === director.id)) talent.unshift(director);
        });
        const lastInstallment = previousFranchiseInstallments[0];
        const lastDetails = lastInstallment ? (lastInstallment.projectDetails || lastInstallment) : null;
        const returningDirector = currentReturningTalent.find(talentEntry => talentEntry.role === 'DIRECTOR');
        const requiredDirectorId = selectedCrew.director || returningDirector?.id || lastDetails?.directorId;

        // Ensure selected director is always in the list
        const selectedId = requiredDirectorId;
        if (selectedId && !talent.some(t => t.id === selectedId)) {
            const selectedNPC = [...NPC_DATABASE, ...(player.flags.extraNPCs || [])].find(n => n.id === selectedId);
            if (selectedNPC) talent.unshift(selectedNPC);
            else {
                const salary = returningDirector?.newDemand || lastDetails?.directorSalary || Math.max(100_000, Math.floor((lastDetails?.budget || lastInstallment?.budget || 5_000_000) * 0.06));
                talent.unshift({
                    id: selectedId,
                    name: returningDirector?.name || lastDetails?.directorName || 'Returning Director',
                    occupation: 'DIRECTOR',
                    tier: 'ESTABLISHED',
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(returningDirector?.name || lastDetails?.directorName || 'Returning Director')}&background=18181b&color=ffffff`,
                    salary,
                    stats: { vision: 82, technical: 78, leadership: 80, style: 76, fame: 55, talent: 80 }
                } as any);
            }
        }

        return talent.map(t => {
            // Deterministic salary based on ID hash
            const seed = t.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const rand = (seed % 100) / 100; // 0.00 to 0.99

            let standardSalary = 0;
            if (t.tier === 'A_LIST') standardSalary = 150000000 + (rand * 150000000); // 150M - 300M
            else if (t.tier === 'ESTABLISHED') standardSalary = 50000000 + (rand * 50000000); // 50M - 100M
            else if (t.tier === 'RISING') standardSalary = 10000000 + (rand * 20000000); // 10M - 30M
            else standardSalary = 1000000 + (rand * 4000000); // 1M - 5M (Indie)

            const relationship = (player.relationships || []).find(rel => (
                (rel.relation === 'Director' || rel.relation === 'Connection') &&
                (rel.npcId || rel.id) === t.id
            ));
            const connectionDiscount = relationship ? getDirectorConnectionDiscount(relationship.closeness) : 0;
            const salary = Math.floor(standardSalary * (1 - connectionDiscount));

            // Dynamic Fame & Talent (Fluctuation based on 3-week cycle)
            const fluctuation = Math.sin(seedWeek * 0.5 + seed) * 10; // +/- 10 fluctuation
            const baseFame = t.stats?.fame || 50;
            const currentFame = Math.max(0, Math.min(100, baseFame + fluctuation));

            const baseTalent = (t.stats as any)?.talent || (t.stats as any)?.vision || 50;
            const currentTalent = Math.max(0, Math.min(100, baseTalent + (fluctuation * 0.5)));

            return {
                ...t,
                salary,
                standardSalary,
                connectionDiscount,
                stats: { ...t.stats, fame: currentFame, talent: currentTalent }
            };
        });
    }, [crewMarketCycle, crewMarketAbsoluteWeek, player.flags.extraNPCs, player.relationships, connectedDirectorCandidates, selectedCrew.director, previousFranchiseInstallments, currentReturningTalent]);

    const actorCandidatePool = useMemo(() => [
        ...NPC_DATABASE,
        ...(player.flags.extraNPCs || [])
    ], [player.flags.extraNPCs]);

    const getCastableActorById = (actorId?: string | null) => {
        if (!actorId || actorId === 'UNKNOWN' || actorId === 'PLAYER_SELF') return null;
        const actor = actorCandidatePool.find(candidate => candidate.id === actorId);
        return actor && isCastableActor(actor) ? actor : null;
    };

    const availableActors = useMemo(() => {
        const seedWeek = crewMarketCycle;
        const talent = getAvailableTalent(crewMarketAbsoluteWeek, 'ACTOR', player.flags.extraNPCs || []).filter(isCastableActor);

        // Ensure all selected actors are in the list
        const selectedActorIds = castList.map(c => c.actorId).filter(id => id && id !== 'PLAYER_SELF');
        selectedActorIds.forEach(id => {
            if (!talent.some(t => t.id === id)) {
                const selectedNPC = actorCandidatePool.find(n => n.id === id);
                if (selectedNPC && isCastableActor(selectedNPC)) talent.unshift(selectedNPC);
            }
        });

        // Ensure contracted actors are in the list
        const contracts = studioTalentRoster.filter(c => c.type === 'MOVIE_DEAL' && c.moviesRemaining > 0);
        contracts.forEach(c => {
            if (!talent.some(t => t.id === c.npcId)) {
                const selectedNPC = actorCandidatePool.find(n => n.id === c.npcId);
                if (selectedNPC && isCastableActor(selectedNPC)) talent.unshift(selectedNPC);
            }
        });

        (player.relationships || []).forEach(rel => {
            const npcId = rel.npcId || rel.id;
            if (!npcId || talent.some(t => t.id === npcId)) return;
            const selectedNPC = actorCandidatePool.find(n => n.id === npcId);
            if (selectedNPC && isCastableActor(selectedNPC)) talent.unshift(selectedNPC);
        });

        [...currentReturningTalent, ...linkedCharacterOptions, ...previousCharacterOptions, ...legacyCharacterOptions, ...activeUniverseCharacterOptions].forEach(entry => {
            const npcId = entry?.actorId && entry.actorId !== 'UNKNOWN' ? entry.actorId : entry?.id;
            if (!npcId || npcId === 'PLAYER_SELF' || npcId === 'UNKNOWN' || talent.some(t => t.id === npcId)) return;
            const selectedNPC = actorCandidatePool.find(n => n.id === npcId);
            if (selectedNPC && isCastableActor(selectedNPC)) talent.unshift(selectedNPC);
        });

        return talent.map(t => {
            const seed = t.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const rand = (seed % 100) / 100;

            let salary = 0;
            if (t.tier === 'A_LIST') salary = 15000000 + (rand * 5000000); // 15M - 20M
            else if (t.tier === 'ESTABLISHED') salary = 5000000 + (rand * 3000000); // 5M - 8M
            else if (t.tier === 'RISING') salary = 1000000 + (rand * 1000000); // 1M - 2M
            else salary = 250000 + (rand * 250000); // 250k - 500k

            // Dynamic Fame & Talent (Fluctuation based on 3-week cycle)
            const fluctuation = Math.sin(seedWeek * 0.5 + seed) * 10;
            const baseFame = t.stats?.fame || 50;
            const currentFame = Math.max(0, Math.min(100, baseFame + fluctuation));

            const baseTalent = t.stats?.talent || 50;
            const currentTalent = Math.max(0, Math.min(100, baseTalent + (fluctuation * 0.5)));

            return { ...t, salary, stats: { ...t.stats, fame: currentFame, talent: currentTalent } };
        });
    }, [crewMarketCycle, crewMarketAbsoluteWeek, castList, studioTalentRoster, player.flags.extraNPCs, player.relationships, actorCandidatePool, currentReturningTalent, linkedCharacterOptions, previousCharacterOptions, legacyCharacterOptions, activeUniverseCharacterOptions]);

    const contractedActors = useMemo(() => {
        return Array.from(contractedTalentIds)
            .map(id => availableActors.find(actor => actor.id === id))
            .filter(Boolean) as any[];
    }, [contractedTalentIds, availableActors]);

    const requiresReturningTalentNegotiation = (talent: any) => {
        if (!talent || talent.accepted || (talent.attemptsLeft ?? 0) <= 0) return false;
        if (isInternallyControlledTalent(talent.id)) return false;
        if (talent.role === 'DIRECTOR') return true;
        return !contractedTalentIds.has(talent.id);
    };

    const getReturningTalentDisplay = (talent: any) => {
        const crewStateKey = returningCrewRoleToStateKey(talent.role);
        const castRole = castList.find(role => role.actorId === talent.id && (
            (talent.role === 'LEAD_ACTOR' && role.roleType === 'LEAD') ||
            (talent.role === 'SUPPORTING_ACTOR' && role.roleType === 'SUPPORTING') ||
            role.actorId === talent.id
        ));
        let source: any = null;

        if (crewStateKey === 'director') source = availableDirectors.find(d => d.id === talent.id);
        if (crewStateKey === 'cinematographer') source = crewMarket.cinematographers.find(c => c.id === talent.id);
        if (crewStateKey === 'composer') source = crewMarket.composers.find(c => c.id === talent.id);
        if (crewStateKey === 'lineProducer') source = crewMarket.producers.find(c => c.id === talent.id);
        if (crewStateKey === 'vfx') source = crewMarket.vfxTeams.find(c => c.id === talent.id);
        if (!source) source = availableActors.find(actor => actor.id === talent.id);
        if (!source) source = (Array.isArray(player.relationships) ? player.relationships : []).find(rel => (rel.npcId || rel.id) === talent.id);

        const safeName = String(source?.name || talent?.name || castRole?.actorName || 'Returning Talent');
        const safeDemand = Number.isFinite(Number(talent?.newDemand)) ? Number(talent.newDemand) : 0;
        const safeAttempts = Number.isFinite(Number(talent?.attemptsLeft)) ? Number(talent.attemptsLeft) : 3;

        return {
            name: safeName,
            roleLabel: formatReturningRoleLabel(talent?.role),
            roleId: castRole?.id,
            image: source?.avatar || source?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&background=18181b&color=ffffff`,
            demand: Math.max(0, Math.round(safeDemand)),
            attemptsLeft: Math.max(0, Math.min(3, safeAttempts)),
            selected: crewStateKey ? selectedCrew[crewStateKey] === talent?.id : !!castRole,
        };
    };

    const crewMarket = useMemo(() => {
        const pinnedIds = (stateKey: keyof typeof selectedCrew, returningRole: string) => [
            selectedCrew[stateKey],
            ...currentReturningTalent
                .filter(entry => normalizeCrewReturningRole(entry.role) === returningRole)
                .map(entry => entry.id),
        ].filter(Boolean) as string[];

        return {
            cinematographers: getRotatingCrewCandidates(
                'CINEMATOGRAPHER',
                player.age,
                player.currentWeek,
                pinnedIds('cinematographer', 'CINEMATOGRAPHER'),
            ),
            composers: getRotatingCrewCandidates(
                'COMPOSER',
                player.age,
                player.currentWeek,
                pinnedIds('composer', 'COMPOSER'),
            ),
            producers: getRotatingCrewCandidates(
                'LINE_PRODUCER',
                player.age,
                player.currentWeek,
                pinnedIds('lineProducer', 'LINE_PRODUCER'),
            ),
            vfxTeams: getRotatingCrewCandidates(
                'VFX_SUPERVISOR',
                player.age,
                player.currentWeek,
                pinnedIds('vfx', 'VFX_SUPERVISOR'),
            ),
        };
    }, [
        crewMarketCycle,
        player.age,
        player.currentWeek,
        selectedCrew.cinematographer,
        selectedCrew.composer,
        selectedCrew.lineProducer,
        selectedCrew.vfx,
        currentReturningTalent,
    ]);

    const productionLocations = PRODUCTION_LOCATIONS_BY_CONTINENT;

    const findLocation = (id: string | null) => {
        return getProductionLocation(id);
    };

    const [selectingActorFor, setSelectingActorFor] = useState<string | null>(null);
    const [negotiationModal, setNegotiationModal] = useState<GreenlightNegotiationState | null>(null);

    const [counterOfferInput, setCounterOfferInput] = useState<string>("");

    const handleNegotiate = (talentId: string, returningData: any, roleId?: string) => {
        let talentName = 'Unknown Talent';
        let talentImage = '';
        let talentTier = 'INDIE';

        const crewStateKey = returningCrewRoleToStateKey(returningData.role);
        if (crewStateKey) {
            let crewCandidate: any = null;
            if (crewStateKey === 'director') crewCandidate = availableDirectors.find(d => d.id === talentId);
            else if (crewStateKey === 'cinematographer') crewCandidate = crewMarket.cinematographers.find(c => c.id === talentId);
            else if (crewStateKey === 'composer') crewCandidate = crewMarket.composers.find(c => c.id === talentId);
            else if (crewStateKey === 'lineProducer') crewCandidate = crewMarket.producers.find(c => c.id === talentId);
            else if (crewStateKey === 'vfx') crewCandidate = crewMarket.vfxTeams.find(c => c.id === talentId);

            if (crewCandidate) {
                talentName = crewCandidate.name;
                talentImage = crewCandidate.avatar || '';
                talentTier = crewCandidate.tier || 'INDIE';
            }
        } else {
            let act = availableActors.find(a => a.id === talentId);
            if (!act) {
                const rel = player.relationships.find(r => (r.npcId || r.id) === talentId);
                if (rel) act = rel;
            }
            if (act) {
                talentName = act.name;
                talentImage = act.avatar || '';
                talentTier = act.tier || 'INDIE';
            } else {
                const castRole = castList.find(role => role.id === roleId || role.actorId === talentId);
                if (castRole?.actorName) {
                    talentName = castRole.actorName;
                    talentTier = 'ESTABLISHED';
                }
            }
        }

        markGameCheckpoint('greenlight_negotiation_opened', player, {
            step,
            studio_id: studio.id,
            script_title: selectedScript?.title || 'none',
            talent_id: talentId,
            talent_name: talentName,
            role: returningData.role || 'unknown',
            attempts_left: returningData.negotiated ? 0 : (returningData.attemptsLeft ?? 3),
            demand_m: Math.round((returningData.newDemand || 0) / 1000000),
            pending_count: unresolvedReturningTalent.length,
        });
        setCounterOfferInput(Math.round(returningData.originalSalary + (returningData.newDemand - returningData.originalSalary) * 0.5).toString());
        setNegotiationModal({
            talentId,
            roleType: returningData.role,
            roleId,
            originalSalary: returningData.originalSalary,
            currentDemand: returningData.newDemand,
            attemptsLeft: returningData.negotiated ? 0 : (returningData.attemptsLeft ?? 3),
            talentName,
            talentImage,
            talentTier
        });
    };

    const updateReturningTalentState = (
        talentId: string,
        roleType: string,
        updater: (talent: any) => any
    ) => {
        const normalizedReturningTalent = dedupeReturningTalent(currentReturningTalent);
        const talentIndex = normalizedReturningTalent.findIndex(t => t.id === talentId && t.role === roleType);
        if (talentIndex === -1) return false;

        const updatedReturningTalent = normalizedReturningTalent.map((talent, index) =>
            index === talentIndex ? updater(talent) : talent
        );
        setCurrentReturningTalent(updatedReturningTalent);

        const updatedStudio = buildStudioWithCurrentDraft(updatedReturningTalent);
        if (!updatedStudio) return false;

        const updatedBusinesses = Array.isArray(player.businesses) ? [...player.businesses] : [];
        const studioIndex = updatedBusinesses.findIndex(b => b.id === studio.id);
        if (studioIndex !== -1) {
            updatedBusinesses[studioIndex] = updatedStudio;
        }
        const updatedPlayer = { ...player, businesses: updatedBusinesses };
        onUpdatePlayer(updatedPlayer);
        return true;
    };

    const assignNegotiatedTalent = (talentId: string, talentName: string, salary: number, roleType: string, roleId?: string) => {
        const crewStateKey = returningCrewRoleToStateKey(roleType);
        if (crewStateKey) {
            setSelectedCrew(prev => ({ ...prev, [crewStateKey]: talentId }));
            setCrewModes(prev => ({ ...prev, [crewStateKey]: talentId === 'PLAYER_SELF' ? 'SELF' : (talentId === 'STUDIO_STAFF' ? 'IN_HOUSE' : 'HIRE') }));
            return;
        }

        if (roleId) {
            setCastList(prev => prev.map(r => r.id === roleId ? {
                ...r,
                actorId: talentId,
                actorName: talentName,
                salary
            } : r));
        }
        setSelectingActorFor(null);
    };

    const clearNegotiatedTalent = (talentId: string, roleType: string, roleId?: string) => {
        const crewStateKey = returningCrewRoleToStateKey(roleType);
        if (crewStateKey) {
            if (selectedCrew[crewStateKey] === talentId) {
                setSelectedCrew(prev => ({ ...prev, [crewStateKey]: null }));
            }
            return;
        }

        if (roleId) {
            setCastList(prev => prev.map(r => r.id === roleId && r.actorId === talentId ? {
                ...r,
                actorId: null,
                actorName: undefined,
                salary: 0
            } : r));
        }
    };


    const calculateActorSalary = (actor: any, roleType: string, closeness: number = 0) => {
        if (currentReturningTalent.length > 0) {
            const returning = currentReturningTalent.find(t => t.id === actor.id);
            if (returning) {
                return returning.newDemand;
            }
        }

        let baseSalary = 100000;
        if (actor.tier === 'A_LIST') baseSalary = 20000000;
        else if (actor.tier === 'ESTABLISHED') baseSalary = 8000000;
        else if (actor.tier === 'RISING') baseSalary = 2000000;

        // Fame multiplier (fame is 0-100)
        const fameMultiplier = 0.5 + (actor.stats.fame / 100);

        // Role multiplier
        let roleMultiplier = 1;
        if (roleType === 'LEAD') roleMultiplier = 1;
        else if (roleType === 'SUPPORTING') roleMultiplier = 0.4;
        else if (roleType === 'CAMEO') roleMultiplier = 0.15;
        else if (roleType === 'EXTRA') roleMultiplier = 0.05;

        const base = Math.floor(baseSalary * fameMultiplier * roleMultiplier);

        // Relationship Discount
        let discount = 0;
        if (closeness > 50) {
            discount = Math.min(0.7, (closeness - 50) / 100 + 0.2); // Up to 70% discount
        }

        return Math.floor(base * (1 - discount));
    };

    const assignActorToSelectedRole = (actorId: string, actorName: string, salary: number) => {
        if (!selectingActorFor) return;
        setCastList(prev => prev.map(role => role.id === selectingActorFor ? {
            ...role,
            actorId,
            actorName,
            salary,
        } : role));
        setSelectingActorFor(null);
    };

    const acceptNegotiationDemand = () => {
        if (!negotiationModal) return;
        const finalDemand = negotiationModal.currentDemand;
        markGameCheckpoint('greenlight_negotiation_accept_demand', player, {
            script_title: selectedScript?.title || 'none',
            talent_name: negotiationModal.talentName,
            role: negotiationModal.roleType,
            demand_m: Math.round(finalDemand / 1_000_000),
            attempts_left: negotiationModal.attemptsLeft,
            pending_count: unresolvedReturningTalent.length,
        });
        updateReturningTalentState(
            negotiationModal.talentId,
            negotiationModal.roleType,
            talent => ({
                ...talent,
                accepted: true,
                negotiated: true,
                newDemand: finalDemand,
            }),
        );
        assignNegotiatedTalent(
            negotiationModal.talentId,
            negotiationModal.talentName,
            finalDemand,
            negotiationModal.roleType,
            negotiationModal.roleId,
        );
        setNegotiationModal(previous => previous ? {
            ...previous,
            feedback: {
                message: `${negotiationModal.talentName} has signed the contract!`,
                type: 'SUCCESS',
            },
        } : null);
        setTimeout(() => setNegotiationModal(null), 1500);
    };

    const submitNegotiationCounterOffer = () => {
        if (!negotiationModal) return;
        const counterOffer = parseInt(counterOfferInput) || 0;
        if (counterOffer <= 0) return;

        const demandDiff = negotiationModal.currentDemand - negotiationModal.originalSalary;
        const offerDiff = counterOffer - negotiationModal.originalSalary;
        const ratio = demandDiff > 0 ? offerDiff / demandDiff : 1;
        let chance = 0.1 + (ratio * 0.8);
        if (negotiationModal.talentTier === 'A_LIST') chance *= 0.8;
        if (negotiationModal.talentTier === 'ESTABLISHED') chance *= 0.9;
        chance = Math.max(0.05, Math.min(0.95, chance));

        const accepted = Math.random() < chance;
        markGameCheckpoint('greenlight_negotiation_counter_offer', player, {
            script_title: selectedScript?.title || 'none',
            talent_name: negotiationModal.talentName,
            role: negotiationModal.roleType,
            offer_m: Math.round(counterOffer / 1_000_000),
            demand_m: Math.round(negotiationModal.currentDemand / 1_000_000),
            chance_pct: Math.round(chance * 100),
            accepted,
            attempts_left: negotiationModal.attemptsLeft,
            pending_count: unresolvedReturningTalent.length,
        });

        if (accepted) {
            updateReturningTalentState(
                negotiationModal.talentId,
                negotiationModal.roleType,
                talent => ({
                    ...talent,
                    accepted: true,
                    negotiated: true,
                    newDemand: counterOffer,
                }),
            );
            assignNegotiatedTalent(
                negotiationModal.talentId,
                negotiationModal.talentName,
                counterOffer,
                negotiationModal.roleType,
                negotiationModal.roleId,
            );
            setNegotiationModal(previous => previous ? {
                ...previous,
                feedback: {
                    message: `Success! ${negotiationModal.talentName} accepted the counter-offer of ${formatMoney(counterOffer)}!`,
                    type: 'SUCCESS',
                },
            } : null);
            setTimeout(() => setNegotiationModal(null), 2000);
            return;
        }

        const newAttempts = negotiationModal.attemptsLeft - 1;
        updateReturningTalentState(
            negotiationModal.talentId,
            negotiationModal.roleType,
            talent => ({
                ...talent,
                attemptsLeft: newAttempts,
                ...(newAttempts <= 0 ? { negotiated: true, accepted: false } : {}),
            }),
        );

        if (newAttempts <= 0) {
            clearNegotiatedTalent(negotiationModal.talentId, negotiationModal.roleType, negotiationModal.roleId);
            setNegotiationModal(previous => previous ? {
                ...previous,
                attemptsLeft: 0,
                feedback: {
                    message: `${negotiationModal.talentName} has walked away from the negotiations.`,
                    type: 'FINAL_FAILURE',
                },
            } : null);
            setTimeout(() => setNegotiationModal(null), 2000);
            return;
        }

        setNegotiationModal(previous => previous ? {
            ...previous,
            attemptsLeft: newAttempts,
            feedback: {
                message: `${negotiationModal.talentName} rejected the offer. They are standing firm on their demand.`,
                type: 'FAILURE',
            },
        } : null);
        setTimeout(() => {
            setNegotiationModal(previous => previous ? { ...previous, feedback: undefined } : null);
        }, 2000);
    };

    const walkAwayFromNegotiation = () => {
        if (!negotiationModal) return;
        markGameCheckpoint('greenlight_negotiation_walk_away', player, {
            script_title: selectedScript?.title || 'none',
            talent_name: negotiationModal.talentName,
            role: negotiationModal.roleType,
            attempts_left: negotiationModal.attemptsLeft,
            pending_count: unresolvedReturningTalent.length,
        });
        updateReturningTalentState(
            negotiationModal.talentId,
            negotiationModal.roleType,
            talent => ({
                ...talent,
                attemptsLeft: 0,
                negotiated: true,
                accepted: false,
            }),
        );
        clearNegotiatedTalent(negotiationModal.talentId, negotiationModal.roleType, negotiationModal.roleId);
        setNegotiationModal(previous => previous ? {
            ...previous,
            attemptsLeft: 0,
            feedback: {
                message: `You walked away from the negotiation. ${negotiationModal.talentName} is no longer available for this project.`,
                type: 'FINAL_FAILURE',
            },
        } : null);
        setTimeout(() => setNegotiationModal(null), 2000);
    };

    const estimateLinkedCharacterSalary = (character: any, roleType: string) => {
        const actorId = character.actorId && character.actorId !== 'UNKNOWN' ? character.actorId : null;
        const actor = actorId ? (availableActors.find(a => a.id === actorId) || getCastableActorById(actorId)) : null;
        if (actor) return calculateActorSalary(actor, roleType);

        const fame = Math.max(20, Math.min(100, Number(character.fame ?? character.appeal ?? character.fanApproval ?? 55)));
        const baseSalary = fame >= 85 ? 18_000_000 : fame >= 70 ? 9_000_000 : fame >= 50 ? 3_000_000 : 750_000;
        const roleMultiplier = roleType === 'LEAD' ? 1 : roleType === 'SUPPORTING' ? 0.42 : roleType === 'CAMEO' ? 0.18 : 0.06;
        return Math.floor(baseSalary * roleMultiplier * (0.85 + fame / 180));
    };

    const attachLinkedCharacterToRole = (roleId: string, character: any) => {
        const currentRole = castList.find(role => role.id === roleId);
        const roleType = currentRole?.roleType || 'SUPPORTING';
        const requestedActorId = character.actorId && character.actorId !== 'UNKNOWN' ? character.actorId : null;
        const actor = requestedActorId ? (availableActors.find(a => a.id === requestedActorId) || getCastableActorById(requestedActorId)) : null;
        const actorId = actor?.id || null;
        const salary = estimateLinkedCharacterSalary(character, roleType);
        const returningRole = roleType === 'LEAD' ? 'LEAD_ACTOR' : 'SUPPORTING_ACTOR';

        setCastList(prev => prev.map(role => role.id === roleId ? {
            ...role,
            characterId: character.characterId || normalizeUniverseCharacterKey(character.name),
            characterName: character.name,
            sourceUniverseId: character.sourceUniverseId || activeUniverseId || undefined,
            storyFunction: character.storyFunction || (normalizeCharacterStoryRole(character.storyRole) === 'VILLAIN' ? 'ANTAGONIST' : 'PROTAGONIST'),
            storyRole: normalizeCharacterStoryRole(character.storyRole),
            abilityType: normalizeCharacterAbilityType(character.abilityType),
            nature: character.nature || 'HUMAN',
            identitySource: 'CANON',
            actorId: actorId || role.actorId,
            actorName: actor?.name || (actorId ? character.actorName : role.actorName),
            salary: actorId ? salary : role.salary
        } : role));

        if (actorId && !contractedTalentIds.has(actorId) && !isInternallyControlledTalent(actorId)) {
            setCurrentReturningTalent(prev => {
                const normalized = dedupeReturningTalent(prev);
                if (normalized.some(talent => talent.id === actorId && talent.role === returningRole)) return normalized;
                return dedupeReturningTalent([
                    ...prev,
                    {
                        role: returningRole,
                        id: actorId,
                        originalSalary: Math.max(100_000, Math.floor(salary * 0.82)),
                        newDemand: Math.max(150_000, salary),
                        negotiated: false,
                        accepted: false,
                        attemptsLeft: 3,
                        characterId: character.characterId || normalizeUniverseCharacterKey(character.name),
                        characterName: character.name,
                        sourceUniverseId: character.sourceUniverseId || activeUniverseId
                    }
                ]);
            });
        }
    };

    const linkedUniverseCastCount = useMemo(() => {
        return castList.filter(role => isKnownConnectedRole(role)).length;
    }, [castList, linkedCharacterOptions]);

    const effectiveConnectedIntent = useMemo<ConnectedProjectIntent>(() => resolveGreenlightConnectedIntent({
        requestedIntent: connectedProjectIntent,
        scriptIntent: selectedScript?.connectedProjectIntent,
        scriptTags: selectedScript?.tags,
        linkedKnownCastCount: linkedUniverseCastCount,
        sourceMaterial: selectedScript?.sourceMaterial,
        hasSelectedFranchise: Boolean(selectedFranchiseId),
    }), [connectedProjectIntent, selectedScript, linkedUniverseCastCount, selectedFranchiseId]);

    const getInHouseQuality = (role: string) => {
        const depts = studio.studioState?.departments || { writing: 0, directing: 0, casting: 0, production: 0, postProduction: 0 };
        let level = 0;
        if (role === 'DIRECTOR' || role === 'director') level = depts.directing || 0;
        else if (role === 'CINEMATOGRAPHER' || role === 'cinematographer' || role === 'LINE_PRODUCER' || role === 'lineProducer') level = depts.production || 0;
        else if (role === 'COMPOSER' || role === 'composer' || role === 'VFX' || role === 'vfx') level = depts.postProduction || 0;
        else if (role === 'ACTOR') level = depts.casting || 0;

        if (level === 0) return 0;
        return 10 + ((level - 1) * 9); // Level 1 = 10, Level 10 = 91
    };

    const getInHouseFame = (role: string) => {
        const depts = studio.studioState?.departments || { writing: 0, directing: 0, casting: 0, production: 0, postProduction: 0 };
        let level = 0;
        if (role === 'DIRECTOR' || role === 'director') level = depts.directing || 0;
        else if (role === 'CINEMATOGRAPHER' || role === 'cinematographer' || role === 'LINE_PRODUCER' || role === 'lineProducer') level = depts.production || 0;
        else if (role === 'COMPOSER' || role === 'composer' || role === 'VFX' || role === 'vfx') level = depts.postProduction || 0;
        else if (role === 'ACTOR') level = depts.casting || 0;

        return 10 + (level * 2); // Base 10, max 30
    };

    const getInHouseLevel = (role: string) => {
        const depts = studio.studioState?.departments || { writing: 0, directing: 0, casting: 0, production: 0, postProduction: 0 };
        if (role === 'DIRECTOR' || role === 'director') return depts.directing || 0;
        if (role === 'CINEMATOGRAPHER' || role === 'cinematographer' || role === 'LINE_PRODUCER' || role === 'lineProducer') return depts.production || 0;
        if (role === 'COMPOSER' || role === 'composer' || role === 'VFX' || role === 'vfx') return depts.postProduction || 0;
        if (role === 'ACTOR') return depts.casting || 0;
        return 0;
    };

    // Helper to get crew stats
    const getCrewData = (role: 'director' | 'cinematographer' | 'composer' | 'lineProducer' | 'vfx') => {
        const mode = crewModes[role];
        const id = selectedCrew[role];

        if (mode === 'SELF') {
            const quality = role === 'director' ? getDirectorTalent(player.directorStats) : 70;
            return { name: player.name, tier: 'Indie', quality, cost: 0 };
        }
        if (mode === 'IN_HOUSE') {
            return {
                name: 'Studio Staff',
                tier: 'In-House',
                quality: getInHouseQuality(role),
                fame: getInHouseFame(role),
                cost: getInHouseCrewProjectCost(getInHouseLevel(role)),
            };
        }

        // Find hired crew
        let candidate: any = null;
        if (role === 'director') candidate = availableDirectors.find(c => c.id === id);
        else if (role === 'cinematographer') candidate = crewMarket.cinematographers.find(c => c.id === id);
        else if (role === 'composer') candidate = crewMarket.composers.find(c => c.id === id);
        else if (role === 'lineProducer') candidate = crewMarket.producers.find(c => c.id === id);
        else if (role === 'vfx') candidate = crewMarket.vfxTeams.find(c => c.id === id);

        // Estimate salary for NPCs if not present (simple logic based on tier)
        let cost = 0;
        if (candidate) {
            if (currentReturningTalent.length > 0) {
                const returningRole = {
                    director: 'DIRECTOR',
                    cinematographer: 'CINEMATOGRAPHER',
                    composer: 'COMPOSER',
                    lineProducer: 'LINE_PRODUCER',
                    vfx: 'VFX_SUPERVISOR',
                }[role];
                const returning = currentReturningTalent.find(t => (
                    t.id === candidate.id
                    && normalizeCrewReturningRole(t.role) === returningRole
                ));
                if (returning && returning.newDemand) {
                    cost = returning.newDemand;
                }
            }

            if (!cost) {
                if (candidate.salary) cost = candidate.salary;
                else {
                    // Dynamic salary for NPCs
                    if (role === 'director') {
                        // INFLATED DIRECTOR SALARIES (Max 250-300M)
                        // Note: We use a deterministic "random" based on ID char codes to ensure price stays consistent between views
                        const seed = candidate.id.charCodeAt(0) + candidate.id.charCodeAt(candidate.id.length - 1);
                        const rand = (seed % 100) / 100;

                        if (candidate.tier === 'A_LIST') cost = 150000000 + rand * 150000000;
                        else if (candidate.tier === 'ESTABLISHED') cost = 50000000 + rand * 50000000;
                        else if (candidate.tier === 'RISING') cost = 10000000 + rand * 20000000;
                        else cost = 1000000 + rand * 4000000;
                    } else {
                        // Standard Actor/Crew Salaries
                        if (candidate.tier === 'A_LIST') cost = 15000000;
                        else if (candidate.tier === 'ESTABLISHED') cost = 5000000;
                        else if (candidate.tier === 'RISING') cost = 1000000;
                        else cost = 200000;
                    }
                }
            }
        }

        return candidate
            ? { name: candidate.name, tier: candidate.tier, quality: candidate.stats?.talent || candidate.stats?.vision || 85, fame: candidate.stats?.fame || 0, cost }
            : { name: 'Unknown', tier: 'Unknown', quality: 50, fame: 0, cost: 0 };
    };

    const budgetBreakdown = useMemo(() => {
        const directorData = getCrewData('director');
        const dpData = getCrewData('cinematographer');
        const composerData = getCrewData('composer');
        const lpData = getCrewData('lineProducer');
        const vfxData = getCrewData('vfx');

        return calculateGreenlightBudget({
            scriptCost: selectedScript?.developmentCost || 0,
            crewCosts: {
                director: directorData.cost || 0,
                cinematographer: dpData.cost || 0,
                composer: composerData.cost || 0,
                lineProducer: lpData.cost || 0,
                vfx: vfxData.cost || 0,
            },
            castRoles: castList,
            contractedActorIds: new Set(contractedActors.map(actor => actor.id)),
            availableActorIds: new Set(availableActors.map(actor => actor.id)),
            inHouseActorCost: getInHouseCastProjectCost(getInHouseLevel('ACTOR')),
            backgroundCastingCost: backgroundCastingPlan.estimatedCost,
            locationCosts: selectedLocations.map(locationId => Number(findLocation(locationId)?.cost) || 0),
            equipmentChoices,
            ownedEquipmentLevels: studio.studioState?.equipment || {},
            gearTiers: GEAR_TIERS,
        });
    }, [selectedCrew, crewModes, castList, backgroundCastingPlan.estimatedCost, selectedLocations, availableActors, availableDirectors, player, equipmentChoices, studio, productionLocations, crewMarket]);
    const musicPreviewProject = useMemo<ProjectDetails | null>(() => {
        if (!selectedScript) return null;
        const previewBudget = Math.max(1_000_000, budgetBreakdown.total || 1_000_000);
        const previewTier = getProductionBudgetTier(previewBudget);
        const previewProjectType = resolveProjectType(selectedScript.projectType, (selectedScript as any).type, (selectedScript as any).projectDetails?.type);
        return {
            title: selectedScript.title,
            sourceScriptId: selectedScript.id,
            isOriginal: selectedScript.isOriginal,
            type: previewProjectType,
            format: selectedScript.format || 'LIVE_ACTION',
            episodes: selectedScript.episodes,
            description: `A ${selectedScript.genres.join('/')} ${previewProjectType === 'SERIES' ? 'series' : 'film'} produced by ${studio.name}.`,
            studioId: studio.id as any,
            subtype: 'STANDALONE',
            genre: selectedScript.genres[0],
            subjectName: selectedScript.subjectName,
            subjectType: selectedScript.subjectType,
            targetAudience: selectedScript.targetAudience || 'PG-13',
            budgetTier: previewTier,
            estimatedBudget: previewBudget,
            visibleHype: 'LOW',
            hiddenStats: {
                scriptQuality: selectedScript.quality || 50,
                directorQuality: 50,
                castingStrength: 50,
                distributionPower: 50,
                rawHype: selectedScript.hype || 20,
                qualityScore: selectedScript.quality || 50,
                prestigeBonus: 0
            },
            directorName: getCrewData('director').name,
            visibleDirectorTier: getCrewData('director').tier,
            visibleScriptBuzz: 'High',
            visibleCastStrength: 'TBD'
        };
    }, [selectedScript, budgetBreakdown.total, studio.id, studio.name, selectedCrew.director, crewModes.director, availableDirectors]);

    const recommendedMusicArtists = useMemo(() => (
        musicPreviewProject ? getRecommendedMusicArtistsForProject(musicPreviewProject, 12, getMusicArtistCatalog(player.world)) : []
    ), [musicPreviewProject, player.world]);

    const musicCatalogArtists = useMemo(() => (
        musicPreviewProject
            ? getRecommendedMusicArtistsForProject(musicPreviewProject, getMusicArtistCatalog(player.world).length, getMusicArtistCatalog(player.world))
            : getMusicArtistCatalog(player.world)
    ), [musicPreviewProject, player.world]);

    const recommendedMusicArtistIds = useMemo(() => recommendedMusicArtists.map(artist => artist.id).join('|'), [recommendedMusicArtists]);
    const musicArtistCountBounds = useMemo(() => getMusicArtistCountBounds(musicStrategy), [musicStrategy]);
    const boundedMusicArtistTargetCount = Math.min(
        musicArtistCountBounds.max,
        Math.max(musicArtistCountBounds.min, Math.round(Number(musicArtistTargetCount) || 0))
    );

    useEffect(() => {
        if (musicArtistTargetCount !== boundedMusicArtistTargetCount) {
            setMusicArtistTargetCount(boundedMusicArtistTargetCount);
        }
    }, [musicArtistTargetCount, boundedMusicArtistTargetCount]);

    const allMusicDeliverableRoles = MUSIC_DELIVERABLE_ROLES;

    const musicStrategyRoles = useMemo(
        () => getMusicStrategyCreditRoles(musicStrategy, musicPreviewProject || undefined, boundedMusicArtistTargetCount),
        [musicStrategy, musicPreviewProject, boundedMusicArtistTargetCount]
    );

    const activeMusicCreditRoles = useMemo(() => {
        if (selectedMusicCreditRoles === null) return musicStrategyRoles;
        const availableRoles = new Set(allMusicDeliverableRoles);
        const cleanRoles = selectedMusicCreditRoles.filter(role => availableRoles.has(role));
        return allMusicDeliverableRoles.filter(role => cleanRoles.includes(role));
    }, [selectedMusicCreditRoles, allMusicDeliverableRoles, musicStrategyRoles]);

    const requiredMusicSlots = useMemo(
        () => activeMusicCreditRoles.length,
        [activeMusicCreditRoles]
    );

    const effectiveMusicArtistCount = requiredMusicSlots;
    const isStudioDecidedMusicPlan = selectedMusicCreditRoles === null;
    const isCustomMusicPlan = !isStudioDecidedMusicPlan;
    const effectiveMusicStrategy = useMemo(
        () => getMusicStrategyForSelectedRoles(activeMusicCreditRoles, musicStrategy),
        [activeMusicCreditRoles, musicStrategy]
    );

    const focusMusicCreditRole = (role: MusicCreditRole) => {
        if (musicStrategy === 'COMPOSER_ONLY') {
            setMusicStrategy(getMusicStrategyForSelectedRoles([role], 'LEAD_SINGLE'));
            setMusicArtistTargetCount(1);
        }
        setSelectedMusicCreditRoles(current => {
            const baseRoles = (current === null ? activeMusicCreditRoles : current).filter(item => allMusicDeliverableRoles.includes(item));
            const nextRoles = baseRoles.includes(role) ? baseRoles : [...baseRoles, role];
            return allMusicDeliverableRoles.filter(item => nextRoles.includes(item));
        });
        const existingIndex = activeMusicCreditRoles.indexOf(role);
        setActiveMusicSlotIndex(existingIndex >= 0 ? existingIndex : activeMusicCreditRoles.length);
        setActiveMusicSearchRole(role);
    };

    const removeMusicCreditRole = (role: MusicCreditRole) => {
        const removedIndex = activeMusicCreditRoles.indexOf(role);
        setSelectedMusicCreditRoles(current => {
            const baseRoles = (current === null ? activeMusicCreditRoles : current).filter(item => allMusicDeliverableRoles.includes(item));
            const nextRoles = baseRoles.filter(item => item !== role);
            return allMusicDeliverableRoles.filter(item => nextRoles.includes(item));
        });
        if (removedIndex >= 0) {
            setSelectedMusicArtistIds(current => current.filter((_, index) => index !== removedIndex));
        }
        setMusicRoleSearchQueries(current => {
            const next = { ...current };
            delete next[role];
            return next;
        });
        setMusicRoleSortOptions(current => {
            const next = { ...current };
            delete next[role];
            return next;
        });
        setActiveMusicSearchRole(current => current === role ? null : current);
        setActiveMusicSlotIndex(0);
    };

    useEffect(() => {
        setSelectedMusicArtistIds(current => {
            if (requiredMusicSlots <= 0) return current.length ? [] : current;
            if (!isStudioDecidedMusicPlan) {
                const manualIds = current.slice(0, requiredMusicSlots);
                const changed = manualIds.length !== current.length || manualIds.some((id, index) => id !== current[index]);
                return changed ? manualIds : current;
            }

            const filled = current.filter(Boolean).slice(0, requiredMusicSlots);
            recommendedMusicArtists.forEach(artist => {
                if (filled.length >= requiredMusicSlots) return;
                if (!filled.includes(artist.id)) filled.push(artist.id);
            });

            const changed = filled.length !== current.length || filled.some((id, index) => id !== current[index]);
            return changed ? filled : current;
        });
    }, [requiredMusicSlots, recommendedMusicArtistIds, musicStrategy, boundedMusicArtistTargetCount, selectedMusicCreditRoles, selectedScript?.id, isStudioDecidedMusicPlan]);

    useEffect(() => {
        setActiveMusicSlotIndex(current => Math.min(Math.max(0, current), Math.max(0, requiredMusicSlots - 1)));
    }, [requiredMusicSlots]);

    const selectedMusicPlan = useMemo(() => (
        musicPreviewProject
            ? buildProjectMusicPlanFromArtists(musicPreviewProject, effectiveMusicStrategy, selectedMusicArtistIds, `${selectedScript?.id || selectedScript?.title || 'project'}_${effectiveMusicStrategy}_${effectiveMusicArtistCount}_${activeMusicCreditRoles.join('_')}`, effectiveMusicArtistCount, activeMusicCreditRoles, isStudioDecidedMusicPlan, musicCatalogArtists)
            : undefined
    ), [musicPreviewProject, effectiveMusicStrategy, selectedMusicArtistIds, selectedScript?.id, selectedScript?.title, effectiveMusicArtistCount, activeMusicCreditRoles, isStudioDecidedMusicPlan, musicCatalogArtists]);

    const musicBudget = selectedMusicPlan?.musicBudget || 0;
    const musicBuzzBonus = selectedMusicPlan?.credits?.length ? Math.min(18, Math.round((selectedMusicPlan.musicBuzz || 0) * 0.25)) : 0;
    const selectedMusicImpact = useMemo(() => (
        musicPreviewProject && selectedMusicPlan
            ? calculateProjectMusicImpact({ ...musicPreviewProject, musicPlan: selectedMusicPlan }, selectedMusicPlan, musicCatalogArtists)
            : undefined
    ), [musicPreviewProject, selectedMusicPlan, musicCatalogArtists]);
    const selectedMusicByline = musicPreviewProject && selectedMusicPlan
        ? (() => {
            const names = (selectedMusicPlan.credits || []).map(credit => credit.artistName).filter(Boolean);
            if (!names.length) return '';
            return names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
        })()
        : '';

    const getMusicArtistSearchMatches = (role: MusicCreditRole): MusicArtist[] => {
        const query = (musicRoleSearchQueries[role] || '').trim().toLowerCase();
        const sortOption = musicRoleSortOptions[role] || 'RECOMMENDED';
        const roleIndex = activeMusicCreditRoles.indexOf(role);
        const assignedArtistId = roleIndex >= 0 ? selectedMusicArtistIds[roleIndex] : undefined;
        return musicCatalogArtists
            .filter(artist => {
                if (!query) return true;
                const haystack = [
                    artist.stageName,
                    artist.realName,
                    artist.genre,
                    artist.subgenre,
                    artist.audience,
                    artist.region,
                    artist.soundtrackFitTags.join(' '),
                    artist.strengths.join(' ')
                ].join(' ').toLowerCase();
                return haystack.includes(query);
            })
            .map((artist, index) => ({ artist, index }))
            .sort((left, right) => {
                if (left.artist.id === assignedArtistId) return -1;
                if (right.artist.id === assignedArtistId) return 1;
                if (sortOption === 'RATING') return right.artist.reputation - left.artist.reputation;
                if (sortOption === 'COST_LOW') return left.artist.costLow - right.artist.costLow;
                if (sortOption === 'COST_HIGH') return right.artist.costHigh - left.artist.costHigh;
                if (sortOption === 'FAME') return MUSIC_FAME_SORT_SCORE[right.artist.fameTier] - MUSIC_FAME_SORT_SCORE[left.artist.fameTier];
                if (sortOption === 'FOLLOWERS') return right.artist.socialFollowers - left.artist.socialFollowers;
                if (sortOption === 'AVAILABILITY') return MUSIC_AVAILABILITY_SORT_SCORE[right.artist.availability] - MUSIC_AVAILABILITY_SORT_SCORE[left.artist.availability];
                return left.index - right.index;
            })
            .map(entry => entry.artist)
            .slice(0, 80);
    };

    const assignMusicArtistToRole = (role: MusicCreditRole, artistId: string) => {
        const roleIndex = activeMusicCreditRoles.indexOf(role);
        if (roleIndex < 0) return;
        setSelectedMusicArtistIds(current => {
            if (requiredMusicSlots <= 0) return [];
            const next = activeMusicCreditRoles.map((_, index) => current[index] || '');
            next[roleIndex] = artistId;
            return next.slice(0, requiredMusicSlots);
        });
        setMusicRoleSearchQueries(current => ({ ...current, [role]: '' }));
        setActiveMusicSearchRole(null);
        setActiveMusicSlotIndex(roleIndex);
    };

    const availableGreenlightFunds = useMemo(() => (
        calculateAvailableGreenlightFunds(
            studio.balance,
            studio.studioState?.productionFund || 0,
            lockedStreamingFundingAmount,
        )
    ), [studio.balance, studio.studioState?.productionFund, lockedStreamingFundingAmount]);

    const maxMarketingBudget = useMemo(() => (
        calculateMaxGreenlightMarketingBudget(
            availableGreenlightFunds,
            budgetBreakdown.total,
            musicBudget,
        )
    ), [availableGreenlightFunds, budgetBreakdown.total, musicBudget]);

    useEffect(() => {
        if (marketingBudgetPreset === 'CUSTOM') {
            setReservedMarketingBudget(current => Math.min(current, maxMarketingBudget));
            return;
        }
        setReservedMarketingBudget(Math.min(getMarketingBudgetForPreset(marketingBudgetPreset, budgetBreakdown.total), maxMarketingBudget));
    }, [marketingBudgetPreset, budgetBreakdown.total, maxMarketingBudget]);

    const packageBudget = useMemo(() => (
        calculateGreenlightPackageBudget(
            budgetBreakdown.total,
            musicBudget,
            reservedMarketingBudget,
        )
    ), [budgetBreakdown.total, musicBudget, reservedMarketingBudget]);

    const maxInvestorRaise = useMemo(() => (
        getMaxInvestorRaise(packageBudget, lockedStreamingFundingAmount)
    ), [packageBudget, lockedStreamingFundingAmount]);

    const normalizedInvestorRaise = useMemo(() => (
        normalizeInvestorRaiseAmount(investorRaiseAmount, packageBudget, lockedStreamingFundingAmount)
    ), [investorRaiseAmount, packageBudget, lockedStreamingFundingAmount]);

    const investorRaisePercent = useMemo(() => (
        calculateInvestorRaisePercent(normalizedInvestorRaise, maxInvestorRaise)
    ), [maxInvestorRaise, normalizedInvestorRaise]);

    const setInvestorRaisePercent = (percent: number) => {
        const amount = calculateInvestorRaiseAmountFromPercent(percent, maxInvestorRaise);
        setInvestorRaiseAmount(amount);
        if (amount <= 0) setSelectedInvestorIds([]);
    };

    useEffect(() => {
        const normalized = normalizeInvestorRaiseAmount(investorRaiseAmount, packageBudget, lockedStreamingFundingAmount);
        if (normalized !== investorRaiseAmount) {
            setInvestorRaiseAmount(normalized);
        }
    }, [investorRaiseAmount, packageBudget, lockedStreamingFundingAmount]);

    const investorPreviewProject = useMemo(() => (
        musicPreviewProject
            ? { ...musicPreviewProject, musicPlan: selectedMusicPlan }
            : undefined
    ), [musicPreviewProject, selectedMusicPlan]);

    const investorOffers = useMemo(() => (
        generateProjectInvestorOffers({
            project: investorPreviewProject,
            studio,
            player,
            targetRaise: normalizedInvestorRaise,
            packageBudget,
            lockedExternalFunding: lockedStreamingFundingAmount,
            fundingMode: investorFundingMode
        })
    ), [investorPreviewProject, studio, player, normalizedInvestorRaise, packageBudget, lockedStreamingFundingAmount, investorFundingMode]);

    useEffect(() => {
        setSelectedInvestorIds(current => current.filter(id => investorOffers.some(offer => offer.investorId === id)));
    }, [investorOffers]);

    useEffect(() => {
        if (investorFundingMode === 'LEAD') {
            setSelectedInvestorIds(current => current.slice(0, 1));
        }
    }, [investorFundingMode]);

    const selectedInvestorPlan = useMemo(() => (
        buildProjectInvestorPlan({
            offers: investorOffers,
            selectedInvestorIds,
            targetRaise: normalizedInvestorRaise,
            packageBudget,
            lockedExternalFunding: lockedStreamingFundingAmount,
            fundingMode: investorFundingMode,
            sourceProjectId: selectedScript?.id,
            sourceTitle: selectedScript?.title,
            week: player.currentWeek,
            year: player.age
        })
    ), [investorOffers, selectedInvestorIds, normalizedInvestorRaise, packageBudget, lockedStreamingFundingAmount, investorFundingMode, selectedScript?.id, selectedScript?.title, player.currentWeek, player.age]);

    const investorRaisedAmount = selectedInvestorPlan?.totalRaised || 0;
    const {
        netGreenlightCashRequirement,
        investorFundingShortfall,
        investorFundingOverage,
        effectiveStudioFundingPool,
    } = calculateGreenlightFundingPosition({
        packageBudget,
        investorRaisedAmount,
        normalizedInvestorRaise,
        studioBalance: studio.balance,
        productionFund: studio.studioState?.productionFund || 0,
        lockedStreamingFundingAmount,
    });
    const investorOfferCards = useMemo(() => (
        investorOffers.map(offer => {
            const selected = selectedInvestorIds.includes(offer.investorId);
            const commitment = selectedInvestorPlan?.commitments.find(item => item.investorId === offer.investorId);
            const previewInvestorIds = selected
                ? selectedInvestorIds
                : investorFundingMode === 'LEAD'
                    ? [offer.investorId]
                    : [...selectedInvestorIds, offer.investorId];
            const previewPlan = buildProjectInvestorPlan({
                offers: investorOffers,
                selectedInvestorIds: previewInvestorIds,
                targetRaise: normalizedInvestorRaise,
                packageBudget,
                lockedExternalFunding: lockedStreamingFundingAmount,
                fundingMode: investorFundingMode,
                sourceProjectId: selectedScript?.id,
                sourceTitle: selectedScript?.title,
                week: player.currentWeek,
                year: player.age,
            });
            const previewCommitment = previewPlan?.commitments.find(item => item.investorId === offer.investorId);
            const displayCommitment = selected ? commitment : previewCommitment;
            const displayAmount = displayCommitment?.amount || 0;
            const unusedCapacity = Math.max(0, offer.amount - displayAmount);
            const dealEquity = displayCommitment?.equityPercent || offer.equityPercent || 0;
            const cleanEquity = displayCommitment?.cleanEquityPercent || offer.cleanEquityPercent || 0;
            const equitySpread = Math.round((dealEquity - cleanEquity) * 10) / 10;
            const cardRole = displayCommitment?.targetRole === 'LEAD'
                ? 'Lead Investor'
                : displayCommitment?.targetRole === 'EXCESS'
                    ? 'Extra Raise'
                    : displayCommitment?.targetRole === 'SYNDICATE'
                        ? 'Syndicate'
                        : offer.fitLabel || 'Investor';
            const amountLabel = selected
                ? 'Committed'
                : displayCommitment?.targetRole === 'EXCESS'
                    ? 'Would Add'
                    : 'Would Commit';

            return {
                investorId: offer.investorId,
                investorName: offer.investorName,
                kindLabel: describeInvestorKind(offer.kind, language),
                ownerName: offer.ownerName,
                headquarters: offer.headquarters,
                investorTags: offer.investorTags,
                reputation: offer.reputation,
                relationshipLabel: offer.relationshipLabel,
                note: offer.note,
                selected,
                displayAmount: displayAmount || offer.amount,
                unusedCapacity,
                dealEquity,
                cleanEquity,
                equitySpread,
                cardRole,
                amountLabel,
            };
        })
    ), [
        investorOffers,
        selectedInvestorIds,
        selectedInvestorPlan,
        investorFundingMode,
        normalizedInvestorRaise,
        packageBudget,
        lockedStreamingFundingAmount,
        selectedScript?.id,
        selectedScript?.title,
        player.currentWeek,
        player.age,
        language,
    ]);

    const changeInvestorFundingMode = (mode: ProjectInvestorFundingMode) => {
        setInvestorFundingMode(mode);
        if (mode === 'LEAD') {
            setSelectedInvestorIds(current => current.slice(0, 1));
        }
    };

    const toggleSelectedInvestor = (investorId: string) => {
        setSelectedInvestorIds(current => (
            investorFundingMode === 'LEAD'
                ? current.includes(investorId) ? [] : [investorId]
                : current.includes(investorId)
                    ? current.filter(id => id !== investorId)
                    : [...current, investorId]
        ));
    };

    const unresolvedReturningTalent = useMemo(() => {
        if (currentReturningTalent.length === 0) return [];

        return dedupeReturningTalent(currentReturningTalent).filter(talent => {
            if (!requiresReturningTalentNegotiation(talent)) return false;

            const crewStateKey = returningCrewRoleToStateKey(talent.role);
            if (crewStateKey) {
                return selectedCrew[crewStateKey] === talent.id;
            }

            if (talent.role === 'LEAD_ACTOR') {
                return castList.some(role => role.actorId === talent.id && role.roleType === 'LEAD');
            }

            if (talent.role === 'SUPPORTING_ACTOR') {
                return castList.some(role => role.actorId === talent.id && role.roleType === 'SUPPORTING');
            }

        return castList.some(role => role.actorId === talent.id);
        });
    }, [currentReturningTalent, selectedCrew, castList, contractedActors]);

    const linkedCastSummary = useMemo(() => {
        return castList
            .filter(role => isKnownConnectedRole(role))
            .map(role => {
                const negotiation = currentReturningTalent.find(talent => talent.id === role.actorId && (talent.role === 'LEAD_ACTOR' || talent.role === 'SUPPORTING_ACTOR'));
                return {
                    ...role,
                    negotiationStatus: negotiation
                        ? negotiation.accepted
                            ? 'Locked'
                            : negotiation.attemptsLeft <= 0
                                ? 'Declined'
                                : 'Negotiating'
                        : role.actorId
                            ? 'Locked'
                            : 'Uncast'
                };
            });
    }, [castList, currentReturningTalent, linkedCharacterOptions]);

    // Buzz State
    const [buzzItems, setBuzzItems] = useState<any[]>([]);

    const greenlightEnergyCost = PHASE_ONE_ENERGY_COSTS.GREENLIGHT_OWNED_PROJECT;
    const greenlightStatus = useMemo(() => validateGreenlightProject({
        hasSelectedScript: Boolean(selectedScript),
        scriptStatus: selectedScript?.status,
        selectedLocationCount: selectedLocations.length,
        playerEnergy: player.energy.current,
        energyCost: greenlightEnergyCost,
        crewModes,
        selectedCrew,
        castRoles: castList,
        effectiveConnectedIntent,
        linkedKnownCastCount: linkedUniverseCastCount,
        hasUniverseConnection: Boolean(selectedUniverseId || selectedScript?.universeId),
        hasFranchiseConnection: Boolean(selectedFranchiseId || selectedScript?.franchiseId),
        unresolvedReturningTalentNames: unresolvedReturningTalent
            .map(talent => getReturningTalentDisplay(talent).name)
            .filter(Boolean),
        unresolvedReturningTalentCount: unresolvedReturningTalent.length,
        effectiveStudioFundingPool,
        netGreenlightCashRequirement,
    }), [selectedScript, selectedLocations, crewModes, selectedCrew, castList, effectiveStudioFundingPool, netGreenlightCashRequirement, unresolvedReturningTalent, effectiveConnectedIntent, linkedUniverseCastCount, selectedUniverseId, selectedFranchiseId, player.energy.current, greenlightEnergyCost]);

    const canGreenlight = greenlightStatus.can;
    const confirmationUniverseName = selectedUniverseId === 'NEW'
        ? newUniverseName
        : selectedUniverseId
            ? normalizeUniverseMap(player.world?.universes || {})[selectedUniverseId]?.name
            : undefined;
    const selectedFranchiseForConfirmation = selectedFranchiseId && selectedFranchiseId !== 'NEW'
        ? studioFranchises.find(franchise => franchise.id === selectedFranchiseId)
        : null;
    const confirmationFranchiseName = selectedFranchiseId === 'NEW'
        ? 'New Franchise'
        : selectedFranchiseForConfirmation?.name;
    const confirmationFranchiseInstallment = selectedFranchiseId && selectedFranchiseId !== 'NEW'
        ? (selectedFranchiseForConfirmation?.lastInstallment || 0) + 1
        : undefined;
    const returningTalentReviewItems = unresolvedReturningTalent.map((talent, index) => {
        const info = getReturningTalentDisplay(talent);
        return {
            key: `${talent.id}_${talent.role}_${talent.characterId || talent.characterName || index}`,
            image: info.image,
            name: info.name,
            roleLabel: info.roleLabel,
            demand: info.demand,
            attemptsLeft: info.attemptsLeft,
            onNegotiate: () => handleNegotiate(talent.id, talent, info.roleId),
        };
    });

    useEffect(() => {
        markTraceAction('greenlight_step_opened', {
            greenlight_step: step,
            last_screen: 'GreenlightWizard',
            flow: 'greenlight_project',
            active_project_phase: step === 'BUZZ' ? 'GREENLIGHT_BUZZ' : 'GREENLIGHT_SETUP',
        });
        markGameCheckpoint('greenlight_step', player, {
            step,
            studio_id: studio.id,
            script_title: selectedScript?.title || 'none',
            script_id: selectedScript?.id || 'none',
            cast_count: castList.length,
            unresolved_returning_talent: unresolvedReturningTalent.length,
            budget_m: Math.round((budgetBreakdown.total || 0) / 1000000),
        });
    }, [step, selectedScript?.id, castList.length, unresolvedReturningTalent.length, budgetBreakdown.total, player.age, player.currentWeek, studio.id]);

    useEffect(() => {
        if (step !== 'CONFIRM') return;
        markGameCheckpoint('greenlight_confirm_status', player, {
            studio_id: studio.id,
            script_title: selectedScript?.title || 'none',
            can_greenlight: canGreenlight,
            error_count: greenlightStatus.errors.length,
            first_error: greenlightStatus.errors[0] || 'none',
            unresolved_returning_talent: unresolvedReturningTalent.length,
            cast_count: castList.length,
            budget_m: Math.round((budgetBreakdown.total || 0) / 1000000),
        });
    }, [step, canGreenlight, greenlightStatus.errors.length, greenlightStatus.errors[0], unresolvedReturningTalent.length, castList.length, budgetBreakdown.total, player.age, player.currentWeek, studio.id, selectedScript?.id]);

    const hiredIds = useMemo(() => {
        const ids = new Set<string>();
        Object.values(selectedCrew).forEach(id => { if (id) ids.add(id as string); });
        castList.forEach(c => { if (c.actorId && c.actorId !== 'PLAYER_SELF' && c.actorId !== 'STUDIO_STAFF') ids.add(c.actorId); });
        return Array.from(ids);
    }, [selectedCrew, castList]);

    const [isProcessingAd, setIsProcessingAd] = useState(false);

    const handleGreenlight = async () => {
        if (!canGreenlight) return;
        const traceName = 'greenlight_project';
        const startedAt = performance.now();
        markTraceAction('greenlight_started', {
            greenlight_step: step,
            last_screen: 'GreenlightWizard',
            flow: 'greenlight_project',
            active_project_phase: 'GREENLIGHT_CONFIRM',
        });
        setCrashContext(player, {
            flow: 'greenlight_project',
            studio_id: studio.id,
            script_title: selectedScript?.title || 'missing_script',
            step,
            unresolved_returning_talent: unresolvedReturningTalent.length,
        });
        addBreadcrumb('greenlight:start', {
            title: selectedScript?.title || 'missing_script',
            projectType: selectedScript?.projectType || 'unknown',
            budget: Math.round(budgetBreakdown.total || 0),
            unresolvedReturningTalent: unresolvedReturningTalent.length,
        });
        trackGameEvent('greenlight_started', {
            project_type: selectedScript?.projectType || 'unknown',
            genre: selectedScript?.genre || 'unknown',
            budget_m: Math.round((budgetBreakdown.total || 0) / 1000000),
            unresolved_returning_talent: unresolvedReturningTalent.length,
        });
        startPerformanceTrace(traceName, {
            project_type: selectedScript?.projectType || 'unknown',
            genre: selectedScript?.genre || 'unknown',
        });

        // --- SHOW INTERSTITIAL AD BEFORE GREENLIGHT ---
        if (!hasNoAds(player)) {
            setIsProcessingAd(true);
            try {
                await showAd('INTERSTITIAL');
            } catch (e) {
                console.error("Ad failed", e);
            } finally {
                setIsProcessingAd(false);
            }
        }

        const {
            directorData,
            estimatedBudget,
            soundtrackPlan,
            greenlightPackageBudget,
            finalInvestorPlan,
            finalInvestorRaised,
            studioCashRequirement,
            finalizedCastList,
            newCommitment,
            updatedScripts,
            updatedConcepts,
            updatedPlayerTalentRoster,
            updatedStudioTalentRoster,
            isCreatingNewUniverse,
            normalizedWorldUniverses,
            finalUniverseId,
            randomUniverseColor,
            isPlayerDirector,
        } = buildGreenlightProject({
            player,
            studio,
            selectedScript,
            selectedScriptId,
            selectedLocations,
            castList,
            crewModes,
            selectedCrew,
            currentReturningTalent,
            budgetBreakdown,
            reservedMarketingBudget,
            selectedMusicPlan,
            musicPreviewProject,
            effectiveMusicStrategy,
            selectedMusicArtistIds,
            effectiveMusicArtistCount,
            activeMusicCreditRoles,
            isStudioDecidedMusicPlan,
            musicCatalogArtists,
            selectedInvestorPlan,
            currentCastingStrength,
            currentEstimatedQuality,
            currentEstimatedBuzz,
            playerActingTalent,
            selectedUniverseId,
            selectedFranchiseId,
            newUniverseName,
            previousFranchiseInstallments,
            selectedStoryCompass,
            effectiveConnectedIntent,
            studioPrestigeScore,
            tone,
            linkedUniverseCastCount,
            backgroundCastingPlan,
            studioFranchises,
            visualStyle,
            pacing,
            equipmentChoices,
            lockedStreamingFunding,
            isPrimaryStudio,
            studioTalentRoster,
            findLocation,
            getCrewData,
            getInHouseFame,
            getInHouseQuality,
            getDefaultCharacterName,
            getCastableActorById,
        });

        const { generatedBuzz, newsItem, characterNewsItems } = buildGreenlightBuzz({
            player,
            studio,
            selectedScript,
            directorName: directorData.name,
            castCount: castList.length,
            equipmentChoices,
            soundtrackPlan,
            investorPlan: finalInvestorPlan,
            estimatedBudget,
            estimatedQuality: currentEstimatedQuality,
            finalizedCastList,
            finalUniverseId,
            isCreatingNewUniverse,
            normalizedWorldUniverses,
            isPlayerDirector,
        });

        setBuzzItems(generatedBuzz);

        // --- UPDATE PLAYER STATE ---
        const baseNewNews = [newsItem, ...characterNewsItems, ...player.news];
        const newXFeed = generatedBuzz
            .filter(b => b.type === 'TWEET')
            .map(b => b.data)
            .concat(player.x.feed);

        const {
            fundingResult,
            lockedFundApplied,
            unusedFundingReturned,
            newProductionFund,
            newStudioBalance,
            updatedLockedStreamingFunds,
            fundedCommitment,
            fundingNewsItems,
            fundingLogEntries,
            updatedActiveReleases,
            updatedCommitments,
            updatedWorldUniverses,
            updatedWorldPlatforms,
        } = prepareGreenlightFunding({
            player,
            studio,
            lockedStreamingFunding,
            studioCashRequirement,
            newCommitment,
            finalInvestorRaised,
            greenlightPackageBudget,
            isCreatingNewUniverse,
            normalizedWorldUniverses,
            finalUniverseId,
            newUniverseName,
            randomUniverseColor,
        });

        const updatedPlayerAfterGreenlight: Player = {
            ...player,
            news: [...fundingNewsItems, ...baseNewNews].slice(0, 80),
            logs: [...player.logs, ...fundingLogEntries].slice(-80),
            x: { ...player.x, feed: newXFeed },
            activeReleases: updatedActiveReleases,
            commitments: [...updatedCommitments, fundedCommitment],
            world: {
                ...player.world,
                universes: updatedWorldUniverses,
                platforms: updatedWorldPlatforms
            },
            studio: {
                ...player.studio,
                talentRoster: updatedPlayerTalentRoster
            },
            businesses: player.businesses.map(b => {
                if (b.id !== studio.id) return b;
                const studioAfterSpend = {
                    ...b,
                    balance: newStudioBalance,
                    studioState: {
                        ...studio.studioState!,
                        scripts: updatedScripts,
                        concepts: updatedConcepts,
                        talentRoster: updatedStudioTalentRoster,
                        productionFund: newProductionFund,
                        lockedStreamingFunds: updatedLockedStreamingFunds,
                        financeLedger: [
                            ...(finalInvestorPlan?.commitments || []).map(commitment => ({
                                id: `studio_ledger_investor_${newCommitment.id}_${commitment.investorId}_${player.age}_${player.currentWeek}`,
                                week: player.currentWeek,
                                year: player.age,
                                amount: commitment.amount,
                                type: 'INVESTOR_FUNDING' as const,
                                label: `${commitment.investorName} funded ${formatMoney(commitment.amount)} for ${commitment.equityPercent}% of ${newCommitment.name}`,
                                projectId: newCommitment.id
                            })),
                            ...fundingResult.ledgerEntries.map(entry => ({
                                ...entry,
                                label: entry.type === 'PRODUCTION_SPEND' && lockedFundApplied > 0
                                    ? `${newCommitment.name} greenlight spend (${formatMoney(lockedFundApplied)} ${lockedStreamingFunding?.fundingSource === 'OWNED_STREAMING_PLATFORM' ? 'Original commission' : 'renewal cap'} used${unusedFundingReturned > 0 ? `, ${formatMoney(unusedFundingReturned)} unused returned` : ''})`
                                    : entry.label
                            })),
                            ...((studio.studioState?.financeLedger || []))
                        ].slice(0, 200)
                    }
                };
                return updateInvestorRelationshipsForPlan({
                    studio: studioAfterSpend,
                    plan: finalInvestorPlan,
                    projectId: newCommitment.id,
                    projectTitle: newCommitment.name,
                    week: player.currentWeek,
                    year: player.age
                });
            })
        };
        spendPlayerEnergy(updatedPlayerAfterGreenlight, greenlightEnergyCost, `Greenlight: ${newCommitment.name}`);
        onUpdatePlayer(finalizeOwnedStreamingOriginalGreenlight(updatedPlayerAfterGreenlight));
        addBreadcrumb('greenlight:success', {
            title: newCommitment.name,
            commitmentId: newCommitment.id,
            budget: Math.round(greenlightPackageBudget || 0),
        });
        markTraceAction('greenlight_completed', {
            greenlight_step: 'BUZZ',
            last_screen: 'GreenlightWizard',
            flow: 'greenlight_project',
            active_project_phase: newCommitment.projectPhase || 'PRE_PRODUCTION',
            last_event_id: newCommitment.id,
        });
        markGameCheckpoint('greenlight_success', player, {
            title: newCommitment.name,
            commitment_id: newCommitment.id,
            project_type: selectedScript?.projectType || 'unknown',
            genre: selectedScript?.genre || 'unknown',
            budget_m: Math.round((greenlightPackageBudget || 0) / 1000000),
            cast_count: castList.filter(c => c.actorId).length,
            crew_count: Object.values(selectedCrew).filter(Boolean).length,
        });
        trackGameEvent('greenlight_completed', {
            project_type: selectedScript?.projectType || 'unknown',
            genre: selectedScript?.genre || 'unknown',
            budget_m: Math.round((greenlightPackageBudget || 0) / 1000000),
            cast_count: castList.filter(c => c.actorId).length,
            crew_count: Object.values(selectedCrew).filter(Boolean).length,
        });
        stopPerformanceTrace(traceName, { duration_ms: Math.round(performance.now() - startedAt) });
        setStep('BUZZ');
    };

    // Real-time Budget Calculation for UI
    const currentEstimatedBudget = budgetBreakdown.total + musicBudget;

    const currentEstimatedBuzz = useMemo(() => {
        let buzz = 0;
        if (selectedScript) {
            buzz += selectedScript.hype || 20;
            if (selectedScript.sourceMaterial === 'SEQUEL') buzz += 20;
        }

        // Add Director Fame
        const dirData = getCrewData('director');
        if (dirData.fame) buzz += (dirData.fame * 0.2);

        // Add Cast Fame
        const castFames = castList.map(c => {
            if (!c.actorId) return 0;
            if (c.actorId === 'PLAYER_SELF') return player.stats.fame || 0;
            if (c.actorId === 'STUDIO_STAFF') return 10;
            const actor = availableActors.find(a => a.id === c.actorId);
            return actor?.stats?.fame || 0;
        });
        if (castFames.length > 0) {
            const maxFame = Math.max(...castFames, 0);
            buzz += (maxFame * 0.3);
        }

        buzz += musicBuzzBonus;

        return Math.min(100, Math.max(0, Math.floor(buzz || 0)));
    }, [selectedScript, selectedCrew, castList, player, availableActors, musicBuzzBonus]);

    const currentCastingStrength = useMemo(() => {
        const cast = castList
            .filter(role => role.actorId)
            .map(role => {
                if (role.actorId === 'PLAYER_SELF') {
                    return {
                        roleType: role.roleType,
                        talent: playerActingTalent || 50,
                        fame: player.stats.fame || 0,
                    };
                }
                if (role.actorId === 'STUDIO_STAFF') {
                    return {
                        roleType: role.roleType,
                        talent: getInHouseQuality('ACTOR') || 40,
                        fame: getInHouseFame('ACTOR') || 10,
                    };
                }
                const actor = availableActors.find(candidate => candidate.id === role.actorId);
                return {
                    roleType: role.roleType,
                    talent: actor?.stats?.talent || 50,
                    fame: actor?.stats?.fame || 10,
                };
            });

        return calculateGreenlightCastingStrength({
            cast,
            projectType: selectedScript?.projectType,
            estimatedBudget: currentEstimatedBudget,
        });
    }, [castList, availableActors, player, selectedScript, currentEstimatedBudget, studio]);
    const liveCharacterStoryFit = useMemo(() => {
        if (!selectedStoryCompass || !selectedScript) return null;
        return evaluateCastStoryFit(
            selectedStoryCompass,
            castList.map((member, index) => ({
                ...suggestCharacterIdentity(
                    selectedStoryCompass,
                    (member.roleType === 'EXTRA' ? 'CAMEO' : member.roleType) as RoleType,
                    index,
                    selectedScript,
                ),
                ...member,
            })),
        );
    }, [castList, selectedScript, selectedStoryCompass]);

    const liveCastStoryRead = useMemo(() => {
        if (!selectedStoryCompass || !selectedScript) return null;
        return getCastStoryRead(
            selectedStoryCompass,
            castList.map((member, index) => {
                const actor = member.actorId === 'PLAYER_SELF'
                    ? null
                    : member.actorId === 'STUDIO_STAFF'
                        ? null
                        : getCastableActorById(member.actorId);
                return {
                    ...suggestCharacterIdentity(
                        selectedStoryCompass,
                        (member.roleType === 'EXTRA' ? 'CAMEO' : member.roleType) as RoleType,
                        index,
                        selectedScript,
                    ),
                    ...member,
                    name: member.characterName || member.role,
                    actorName: member.actorName,
                    talent: member.actorId === 'PLAYER_SELF'
                        ? playerActingTalent
                        : member.actorId === 'STUDIO_STAFF'
                            ? getInHouseQuality('ACTOR')
                            : actor?.stats?.talent,
                    fame: member.actorId === 'PLAYER_SELF'
                        ? player.stats.fame
                        : member.actorId === 'STUDIO_STAFF'
                            ? getInHouseFame('ACTOR')
                            : actor?.stats?.fame,
                };
            }),
        );
    }, [castList, selectedScript, selectedStoryCompass, playerActingTalent, player.stats.fame, availableActors, studio]);

    const removeCastRole = (roleId: string) => {
        setCastList(previous => previous.filter(role => role.id !== roleId));
    };

    const changeCastRoleType = (roleId: string, roleType: GreenlightCastRole['roleType']) => {
        setCastList(previous => previous.map(role => {
            if (role.id !== roleId) return role;
            const priorDefault = getDefaultCharacterStoryRole(role.roleType);
            const storyRole = !role.storyRole || role.storyRole === priorDefault
                ? getDefaultCharacterStoryRole(roleType)
                : role.storyRole;
            return {
                ...role,
                roleType,
                storyRole,
                abilityType: role.abilityType || 'NONE',
                role: roleType === 'LEAD'
                    ? 'Lead Actor'
                    : roleType === 'SUPPORTING'
                        ? 'Supporting Actor'
                        : roleType === 'CAMEO'
                            ? 'Cameo Appearance'
                            : 'Extra',
            };
        }));
    };

    const changeCastCharacterSelection = (roleId: string, selectedValue: string) => {
        const selectedCharacter = linkedCharacterOptions.find(character => (
            getCharacterOptionValue(character) === selectedValue
        ));
        if (selectedCharacter) {
            attachLinkedCharacterToRole(roleId, selectedCharacter);
            return;
        }
        setCastList(previous => previous.map(role => role.id === roleId ? {
            ...role,
            characterId: undefined,
            characterName: '',
            sourceUniverseId: undefined,
            storyFunction: undefined,
            storyRole: undefined,
            abilityType: undefined,
            nature: undefined,
            identitySource: 'AUTO',
        } : role));
    };

    const changeCastCharacterName = (roleId: string, value: string) => {
        setCastList(previous => previous.map(role => role.id === roleId ? {
            ...role,
            characterName: value,
            characterId: activeUniverseId ? toUniverseCharacterId(activeUniverseId, value) : undefined,
            sourceUniverseId: undefined,
        } : role));
    };

    const fillDefaultCastCharacterName = (roleId: string, index: number) => {
        setCastList(previous => previous.map(role => {
            if (role.id !== roleId || role.characterName?.trim()) return role;
            const characterName = getDefaultCharacterName(role, index);
            return {
                ...role,
                characterName,
                characterId: activeUniverseId
                    ? toUniverseCharacterId(activeUniverseId, characterName)
                    : undefined,
                sourceUniverseId: undefined,
            };
        }));
    };

    const addCastRole = () => {
        setCastList(previous => [
            ...previous,
            {
                id: `role_${Date.now()}`,
                role: 'Supporting Actor',
                roleType: 'SUPPORTING',
                actorId: null,
                identitySource: 'AUTO',
            },
        ]);
    };

    const continueFromCast = () => {
        if (castList.some(role => !role.actorId)) return;
        saveDraft();
        setStep('CREW');
    };

    const currentEstimatedQuality = useMemo(() => {
        const crewQualities = (['cinematographer', 'composer', 'lineProducer', 'vfx'] as const)
            .map(role => getCrewData(role).quality || 50);
        const locationQualities = selectedLocations
            .map(locationId => findLocation(locationId)?.quality)
            .filter((quality): quality is number => typeof quality === 'number');

        return calculateGreenlightEstimatedQuality({
            scriptQuality: selectedScript?.quality,
            directorQuality: getCrewData('director').quality || 50,
            castingStrength: currentCastingStrength,
            crewQualities,
            equipmentChoices,
            ownedEquipmentLevels: studio.studioState?.equipment || {},
            gearTiers: GEAR_TIERS,
            locationQualities,
            storyFitQualityAdjustment: liveCharacterStoryFit?.qualityAdjustment || 0,
            backgroundAuthenticity: backgroundCastingPlan.authenticity,
            backgroundReliability: backgroundCastingPlan.reliability,
            backgroundSetCare: backgroundCastingPlan.setCare,
        });
    }, [selectedScript, selectedCrew, selectedLocations, availableDirectors, productionLocations, crewModes, equipmentChoices, studio, crewMarket, currentCastingStrength, liveCharacterStoryFit, backgroundCastingPlan]);
    if (!selectedScript && step !== 'SELECT_SCRIPT' && step !== 'BUZZ') {
        return (
            <div className="fixed inset-0 z-[70] bg-[#020a05] text-white flex flex-col items-center justify-center p-8 text-center font-sans">
                <div className="w-full max-w-md rounded-[2rem] border border-emerald-500/30 bg-zinc-950/90 p-8 shadow-2xl">
                    <p className="text-emerald-400 font-black tracking-[0.35em] text-xs uppercase mb-3">Greenlight Recovery</p>
                    <h2 className="text-3xl font-black mb-3">Choose Script Again</h2>
                    <p className="text-zinc-400 text-base leading-relaxed mb-6">
                        This draft was pointing to a script that is no longer valid. Pick a script again instead of getting stuck.
                    </p>
                    <button
                        onClick={() => {
                            setSelectedScriptId(null);
                            setStep('SELECT_SCRIPT');
                        }}
                        className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-black uppercase tracking-widest mb-3"
                    >
                        Choose Script
                    </button>
                    <button
                        onClick={onBack}
                        className="w-full py-4 rounded-2xl bg-zinc-900 border border-white/10 text-white font-black uppercase tracking-widest"
                    >
                        Back To Studio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[70] bg-[#020a05] text-white flex flex-col font-sans overflow-hidden">
            {/* GRID BACKGROUND */}
            <div className="absolute inset-0 pointer-events-none z-0"
                style={{
                    backgroundImage: 'linear-gradient(to right, rgba(16, 185, 129, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(16, 185, 129, 0.15) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-black/10 to-black/80 pointer-events-none z-0"></div>

            {isProcessingAd && (
                <div className="fixed inset-0 z-[300] bg-black/90 flex flex-col items-center justify-center p-6 text-center">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                    <h3 className="text-white font-bold text-lg mb-2">Securing Production Permits...</h3>
                    <p className="text-zinc-400 text-sm">Finalizing the greenlight protocol.</p>
                </div>
            )}

            <GreenlightHeader
                step={step}
                onBack={onBack}
                onStepChange={setStep}
                selectedScriptId={selectedScriptId}
                currentEstimatedBuzz={currentEstimatedBuzz}
                currentEstimatedQuality={currentEstimatedQuality}
                budgetBreakdown={budgetBreakdown}
                musicBudget={musicBudget}
                reservedMarketingBudget={reservedMarketingBudget}
                packageBudget={packageBudget}
                availableFunding={studio.balance + (studio.studioState?.productionFund || 0) + lockedStreamingFundingAmount}
                formatMoney={formatMoney}
                translate={tr}
            />

            <div
                className="relative z-10 flex-1 overscroll-contain overflow-y-auto custom-scrollbar"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {step === 'SELECT_SCRIPT' && (
                    <GreenlightScriptStep
                        scripts={scripts}
                        selectedScriptId={selectedScriptId}
                        onSelectScript={setSelectedScriptId}
                        onOpenScriptMarket={onOpenScriptMarket || onBack}
                        onCancel={onBack}
                        onNext={() => selectedScriptId && setStep('DIRECTOR')}
                    />
                )}

                {step === 'DIRECTOR' && (
                    <GreenlightDirectorStep
                        availableDirectors={availableDirectors}
                        selectedDirectorId={selectedCrew.director}
                        onSelectDirector={directorId => setSelectedCrew({ ...selectedCrew, director: directorId })}
                        directorMode={crewModes.director}
                        onDirectorModeChange={mode => setCrewModes({ ...crewModes, director: mode })}
                        player={player}
                        hiredIds={hiredIds}
                        inHouseQuality={getInHouseQuality('DIRECTOR')}
                        inHouseFame={getInHouseFame('DIRECTOR')}
                        inHouseLevel={getInHouseLevel('DIRECTOR')}
                        returningTalent={currentReturningTalent}
                        onNegotiate={handleNegotiate}
                        formatMoney={formatMoney}
                        isExistingConcept={Boolean(initialConcept)}
                        onBack={() => initialConcept ? onBack() : setStep('SELECT_SCRIPT')}
                        onNext={() => {
                            saveDraft();
                            setStep('CAST');
                        }}
                    />
                )}

                {/* CAST STEP */}
                {step === 'CAST' && (
                    <GreenlightCastStep
                        player={player}
                        castList={castList}
                        availableActors={availableActors}
                        contractedActors={contractedActors}
                        currentReturningTalent={currentReturningTalent}
                        playerActingTalent={playerActingTalent}
                        selectedStoryCompass={selectedStoryCompass}
                        liveCastStoryRead={liveCastStoryRead}
                        linkedCharacterOptions={linkedCharacterOptions}
                        legacyCharacterOptions={legacyCharacterOptions}
                        previousCharacterOptions={previousCharacterOptions}
                        activeUniverseId={activeUniverseId}
                        allowsOutsideConnectedCharacters={allowsOutsideConnectedCharacters}
                        showCharacterFlowInfo={showCharacterFlowInfo}
                        showLegacyCharacterArchive={showLegacyCharacterArchive}
                        scriptTitle={selectedScript?.title}
                        getRoleCharacterOption={getRoleCharacterOption}
                        getRoleCharacterOptionValue={getRoleCharacterOptionValue}
                        getCharacterOptionValue={getCharacterOptionValue}
                        isKnownConnectedRole={isKnownConnectedRole}
                        getDefaultCharacterName={getDefaultCharacterName}
                        getSuggestedIdentity={(role, index) => suggestCharacterIdentity(
                            selectedStoryCompass!,
                            (role.roleType === 'EXTRA' ? 'CAMEO' : role.roleType) as RoleType,
                            index,
                            selectedScript || {},
                        )}
                        getInHouseQuality={getInHouseQuality}
                        getInHouseFame={getInHouseFame}
                        requiresReturningTalentNegotiation={requiresReturningTalentNegotiation}
                        formatFee={formatMoney}
                        translate={key => tr(key)}
                        onRemoveRole={removeCastRole}
                        onRoleTypeChange={changeCastRoleType}
                        onToggleCharacterFlowInfo={() => setShowCharacterFlowInfo(previous => !previous)}
                        onToggleLegacyCharacterArchive={() => setShowLegacyCharacterArchive(previous => !previous)}
                        onCharacterSelectionChange={changeCastCharacterSelection}
                        onCharacterNameChange={changeCastCharacterName}
                        onCharacterNameBlur={fillDefaultCastCharacterName}
                        onIdentityChange={(roleId, patch) => {
                            setCastList(previous => previous.map(role => role.id === roleId ? { ...role, ...patch } : role));
                        }}
                        onNegotiate={handleNegotiate}
                        onSelectActor={setSelectingActorFor}
                        onAddRole={addCastRole}
                        onBack={() => setStep('DIRECTOR')}
                        onNext={continueFromCast}
                    />
                )}
                {step === 'CREW' && (
                    <GreenlightCrewStep
                        crewMarket={crewMarket}
                        crewMarketRefreshIn={crewMarketRefreshIn}
                        crewMarketCycle={crewMarketCycle}
                        backgroundCastingPlan={backgroundCastingPlan}
                        backgroundCastingContext={backgroundCastingContext}
                        onBackgroundCastingChange={setBackgroundCastingPlan}
                        selectedCrew={selectedCrew}
                        crewModes={crewModes}
                        onSelectCrew={(key, talentId) => setSelectedCrew({ ...selectedCrew, [key]: talentId })}
                        onCrewModeChange={(key, mode) => setCrewModes({ ...crewModes, [key]: mode })}
                        player={player}
                        hiredIds={hiredIds}
                        getInHouseQuality={getInHouseQuality}
                        getInHouseFame={getInHouseFame}
                        getInHouseLevel={getInHouseLevel}
                        returningTalent={currentReturningTalent}
                        onNegotiate={handleNegotiate}
                        formatMoney={formatMoney}
                        onBack={() => setStep('CAST')}
                        onNext={() => setStep('EQUIPMENT')}
                    />
                )}

                {/* EQUIPMENT STEP */}
                {step === 'EQUIPMENT' && (
                    <GreenlightEquipmentStep
                        studioEquipment={studio.studioState?.equipment}
                        choices={equipmentChoices}
                        onChange={setEquipmentChoices}
                        onBack={() => setStep('CREW')}
                        onNext={() => setStep('LOCATION')}
                        formatMoney={formatMoney}
                    />
                )}

                {/* LOCATION STEP */}
                {step === 'LOCATION' && (
                    <GreenlightLocationStep
                        selectedIds={selectedLocations}
                        onChange={setSelectedLocations}
                        locations={productionLocations}
                        onBack={() => setStep('EQUIPMENT')}
                        onNext={() => {
                            if (selectedLocations.length === 0) return;
                            saveDraft();
                            setStep('SETUP');
                        }}
                        formatMoney={formatMoney}
                    />
                )}

                {/* SETUP STEP */}
                {step === 'SETUP' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 flex flex-col h-full max-w-4xl mx-auto px-4 pt-6 pb-44 overflow-y-auto custom-scrollbar">
                        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl p-6 mb-2 shrink-0 shadow-lg">
                            <h2 className="text-xl font-bold text-white mb-2">Movie Setup</h2>
                            <p className="text-zinc-400 text-sm">Define the artistic vision and reserve the campaign pool for release.</p>
                        </div>

                        <div className="space-y-8 pb-20">
                            <GreenlightArtDirectionSection
                                visualStyle={visualStyle}
                                pacing={pacing}
                                tone={tone}
                                onVisualStyleChange={setVisualStyle}
                                onPacingChange={setPacing}
                                onToneChange={setTone}
                            />
                            <GreenlightSoundtrackSection
                                effectiveMusicArtistCount={effectiveMusicArtistCount}
                                selectedMusicByline={selectedMusicByline}
                                isStudioDecidedMusicPlan={isStudioDecidedMusicPlan}
                                isCustomMusicPlan={isCustomMusicPlan}
                                musicBudget={musicBudget}
                                musicBuzzBonus={musicBuzzBonus}
                                selectedMusicPlan={selectedMusicPlan}
                                selectedMusicImpact={selectedMusicImpact}
                                allMusicDeliverableRoles={allMusicDeliverableRoles}
                                activeMusicCreditRoles={activeMusicCreditRoles}
                                activeMusicSlotIndex={activeMusicSlotIndex}
                                activeMusicSearchRole={activeMusicSearchRole}
                                musicRoleSearchQueries={musicRoleSearchQueries}
                                musicRoleSortOptions={musicRoleSortOptions}
                                musicArtistSortOptions={MUSIC_ARTIST_SORT_OPTIONS}
                                hasMusicPreviewProject={Boolean(musicPreviewProject)}
                                getMusicArtistSearchMatches={getMusicArtistSearchMatches}
                                getMusicCreditRoleLabel={getMusicCreditRoleLabel}
                                getDisplayedArtistCost={artist => musicPreviewProject
                                    ? estimateMusicArtistProjectCost(artist, musicPreviewProject)
                                    : artist.costLow}
                                formatMoney={formatMoney}
                                translate={(key, vars) => tr(key, vars)}
                                onLetStudioDecide={() => {
                                    if (musicStrategy === 'COMPOSER_ONLY') {
                                        setMusicStrategy('LEAD_SINGLE');
                                        setMusicArtistTargetCount(getDefaultMusicArtistCount('LEAD_SINGLE', musicPreviewProject || undefined));
                                    }
                                    setSelectedMusicCreditRoles(null);
                                    setActiveMusicSlotIndex(0);
                                    setActiveMusicSearchRole(null);
                                    setMusicRoleSearchQueries({});
                                    setMusicRoleSortOptions({});
                                }}
                                onToggleRole={(role, isIncluded) => {
                                    if (isStudioDecidedMusicPlan) {
                                        focusMusicCreditRole(role);
                                        return;
                                    }
                                    if (isIncluded) removeMusicCreditRole(role);
                                    else focusMusicCreditRole(role);
                                }}
                                onFocusRole={(role, roleIndex) => {
                                    setActiveMusicSearchRole(role);
                                    setActiveMusicSlotIndex(roleIndex);
                                }}
                                onSearchChange={(role, roleIndex, value) => {
                                    setMusicRoleSearchQueries(current => ({ ...current, [role]: value }));
                                    setActiveMusicSearchRole(role);
                                    setActiveMusicSlotIndex(roleIndex);
                                }}
                                onSortChange={(role, roleIndex, value) => {
                                    setMusicRoleSortOptions(current => ({ ...current, [role]: value }));
                                    setActiveMusicSearchRole(role);
                                    setActiveMusicSlotIndex(roleIndex);
                                }}
                                onAssignArtist={assignMusicArtistToRole}
                            />

                            <GreenlightMarketingBudgetSection
                                marketingBudgetPreset={marketingBudgetPreset}
                                reservedMarketingBudget={reservedMarketingBudget}
                                productionBudget={budgetBreakdown.total}
                                maxMarketingBudget={maxMarketingBudget}
                                onPresetChange={setMarketingBudgetPreset}
                                onReservedBudgetChange={setReservedMarketingBudget}
                                formatMoney={formatMoney}
                                translate={tr}
                            />
                            <GreenlightStoryConnectionSection
                                connectedProjectIntent={connectedProjectIntent}
                                effectiveConnectedIntent={effectiveConnectedIntent}
                                linkedUniverseCastCount={linkedUniverseCastCount}
                                showStoryConnectionInfo={showStoryConnectionInfo}
                                selectableUniverses={selectableStudioUniverses}
                                selectedUniverseId={selectedUniverseId}
                                newUniverseName={newUniverseName}
                                franchises={studioFranchises}
                                selectedFranchiseId={selectedFranchiseId}
                                translate={key => tr(key)}
                                getUniversePhaseLabel={getUniversePhaseLabel}
                                onToggleStoryConnectionInfo={() => setShowStoryConnectionInfo(previous => !previous)}
                                onConnectedProjectIntentChange={setConnectedProjectIntent}
                                onUniverseChange={setSelectedUniverseId}
                                onNewUniverseNameChange={setNewUniverseName}
                                onFranchiseChange={setSelectedFranchiseId}
                            />
                        </div>

                        {/* Fixed Action Bar */}
                        <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe-lg bg-gradient-to-t from-[#020a05] via-[#020a05]/90 to-transparent pointer-events-none flex justify-center z-30">
                            <div className="pointer-events-auto flex gap-4 w-full max-w-md">
                                <button
                                    onClick={() => setStep('LOCATION')}
                                    className="flex-1 bg-zinc-900/80 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl border border-zinc-700 backdrop-blur-md transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => {
                                        saveDraft();
                                        setStep('CONFIRM');
                                    }}
                                    className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider py-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105"
                                >
                                    Review Project
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CONFIRM STEP */}
                {step === 'CONFIRM' && selectedScript && (
                    <GreenlightConfirmationStep
                        projectTitle={selectedScript.title}
                        scriptStatus={selectedScript.status}
                        effectiveConnectedIntent={effectiveConnectedIntent}
                        hasUniverseConnection={Boolean(selectedUniverseId)}
                        universeName={confirmationUniverseName}
                        hasFranchiseConnection={Boolean(selectedFranchiseId)}
                        franchiseName={confirmationFranchiseName}
                        franchiseInstallment={confirmationFranchiseInstallment}
                        linkedCastSummary={linkedCastSummary}
                        returningTalentReviewItems={returningTalentReviewItems}
                        directorName={getCrewData('director').name}
                        backgroundPerformerCount={backgroundCastingPlan.performerCount}
                        selectedLocationCount={selectedLocations.length}
                        budgetBreakdown={budgetBreakdown}
                        selectedMusicPlan={selectedMusicPlan || null}
                        musicBudget={musicBudget}
                        reservedMarketingBudget={reservedMarketingBudget}
                        packageBudget={packageBudget}
                        netGreenlightCashRequirement={netGreenlightCashRequirement}
                        effectiveStudioFundingPool={effectiveStudioFundingPool}
                        investorRaisedAmount={investorRaisedAmount}
                        previousInstallmentCost={previousInstallmentCost}
                        productionFund={studio.studioState?.productionFund || 0}
                        lockedStreamingFundingAmount={lockedStreamingFundingAmount}
                        lockedStreamingFundingSource={lockedStreamingFunding?.fundingSource}
                        lockedStreamingPlatformName={lockedStreamingFunding?.platformName}
                        investorFinancingProps={{
                            maxInvestorRaise,
                            normalizedInvestorRaise,
                            investorRaisedAmount,
                            investorFundingOverage,
                            investorFundingShortfall,
                            selectedInvestorPlan,
                            effectiveStudioFundingPool,
                            netGreenlightCashRequirement,
                            investorRaisePercent,
                            investorFundingMode,
                            offerCards: investorOfferCards,
                            formatMoney,
                            translate: (key, vars) => tr(key, vars),
                            onClearInvestors: () => {
                                setInvestorRaiseAmount(0);
                                setSelectedInvestorIds([]);
                            },
                            onRaiseAmountChange: setInvestorRaiseAmount,
                            onRaisePercentChange: setInvestorRaisePercent,
                            onFundingModeChange: changeInvestorFundingMode,
                            onToggleInvestor: toggleSelectedInvestor,
                        }}
                        authorizedBy={player.name}
                        canGreenlight={canGreenlight}
                        greenlightErrors={greenlightStatus.errors}
                        playerEnergy={player.energy.current}
                        greenlightEnergyCost={greenlightEnergyCost}
                        formatMoney={formatMoney}
                        getMusicStrategyLabel={getMusicStrategyLabel}
                        getMusicCreditRoleLabel={getMusicCreditRoleLabel}
                        onGreenlight={handleGreenlight}
                    />
                )}
                {step === 'BUZZ' && (
                    <GreenlightBuzzStep buzzItems={buzzItems} onComplete={onComplete} />
                )}
            </div>

            {/* Actor Selection Overlay */}
            {selectingActorFor && (
                <GreenlightTalentPickerModal
                    roleId={selectingActorFor}
                    player={player}
                    playerActingTalent={playerActingTalent}
                    castList={castList}
                    contractedActors={contractedActors}
                    hiredIds={hiredIds}
                    availableActors={availableActors}
                    returningTalent={currentReturningTalent}
                    calculateActorSalary={calculateActorSalary}
                    formatMoney={formatMoney}
                    onSelectActor={assignActorToSelectedRole}
                    onNegotiate={handleNegotiate}
                    onClose={() => setSelectingActorFor(null)}
                />
            )}
            {/* Negotiation Modal */}
            {negotiationModal && (
                <GreenlightNegotiationModal
                    negotiation={negotiationModal}
                    counterOfferInput={counterOfferInput}
                    onCounterOfferInputChange={setCounterOfferInput}
                    onAcceptDemand={acceptNegotiationDemand}
                    onSubmitCounterOffer={submitNegotiationCounterOffer}
                    onWalkAway={walkAwayFromNegotiation}
                    onClose={() => setNegotiationModal(null)}
                    formatMoney={formatMoney}
                />
            )}
        </div>
    );
};
