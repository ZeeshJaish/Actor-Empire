import type {
    BackgroundCastingPlan,
    Business,
    Commitment,
    CrewMember,
    LockedStreamingFunding,
    MusicArtist,
    MusicCreditRole,
    Player,
    ProjectDetails,
    ProjectInvestorPlan,
    ProjectMusicPlan,
    ProjectMusicStrategy,
    RoleType,
    Script,
    StoryCompass,
    Universe,
    UniverseId,
} from '../../../types';
import { calculateProjectFameMultiplier } from '../../../services/npcLogic';
import { calculateCastDepthScore, getPhaseDuration } from '../../../services/roleLogic';
import {
    isUniverseRetired,
    normalizeUniverseCharacterKey,
    normalizeUniverseForSave,
    normalizeUniverseMap,
} from '../../../services/universeLogic';
import {
    applyLockedSeasonFunding,
    markHiddenSeasonFundingUsed,
} from '../../../services/streamingFundingLogic';
import {
    buildProjectMusicPlanFromArtists,
    calculateProjectMusicImpact,
} from '../../../services/musicIndustry';
import { createProductionCalendar } from '../../../services/productionCalendar';
import { getProductionBudgetTier } from '../../../services/studioProductionEconomy';
import { inferStoryCompass, suggestCharacterIdentity } from '../../../services/characterIdentityLogic';
import { evaluateCastStoryFit, getCastStoryRead } from '../../../services/characterStoryFit';
import { resolveProjectType } from '../../../services/businessLogic';
import { formatProjectFormatLabel } from '../../../services/genreCatalog';
import type {
    GreenlightCastRole,
    GreenlightPacing,
    GreenlightVisualStyle,
} from './greenlightTypes';
import {
    type ConnectedProjectIntent,
    isCastableMovieRoleId,
    toUniverseCharacterId,
} from './greenlightUtils';

type GreenlightCrewRole = 'director' | 'cinematographer' | 'composer' | 'lineProducer' | 'vfx';
type GreenlightCrewMode = 'HIRE' | 'SELF' | 'IN_HOUSE';

export interface GreenlightCrewData {
    name: string;
    tier: string;
    quality: number;
    fame?: number;
    cost: number;
}

export interface BuildGreenlightProjectInput {
    player: Player;
    studio: Business;
    selectedScript: Script;
    selectedScriptId: string | null;
    selectedLocations: string[];
    castList: GreenlightCastRole[];
    crewModes: Record<string, GreenlightCrewMode>;
    selectedCrew: Record<string, string | null>;
    currentReturningTalent: Array<{ id: string }>;
    budgetBreakdown: { total: number };
    reservedMarketingBudget: number;
    selectedMusicPlan?: ProjectMusicPlan;
    musicPreviewProject: ProjectDetails | null;
    effectiveMusicStrategy: ProjectMusicStrategy;
    selectedMusicArtistIds: string[];
    effectiveMusicArtistCount: number;
    activeMusicCreditRoles: MusicCreditRole[];
    isStudioDecidedMusicPlan: boolean;
    musicCatalogArtists: MusicArtist[];
    selectedInvestorPlan?: ProjectInvestorPlan;
    currentCastingStrength: number;
    currentEstimatedQuality: number;
    currentEstimatedBuzz: number;
    playerActingTalent: number;
    selectedUniverseId: UniverseId | 'NEW' | null;
    selectedFranchiseId: string | 'NEW' | null;
    newUniverseName: string;
    previousFranchiseInstallments: any[];
    selectedStoryCompass: StoryCompass | null;
    effectiveConnectedIntent: ConnectedProjectIntent;
    studioPrestigeScore: number;
    tone: number;
    linkedUniverseCastCount: number;
    backgroundCastingPlan: BackgroundCastingPlan;
    studioFranchises: Array<{ id: string; lastInstallment?: number }>;
    visualStyle: GreenlightVisualStyle;
    pacing: GreenlightPacing;
    equipmentChoices: Record<string, string>;
    lockedStreamingFunding?: LockedStreamingFunding | null;
    isPrimaryStudio: boolean;
    studioTalentRoster: any[];
    findLocation: (id: string | null) => { name: string; quality: number } | undefined;
    getCrewData: (role: GreenlightCrewRole) => GreenlightCrewData;
    getInHouseFame: (role: string) => number;
    getInHouseQuality: (role: string) => number;
    getDefaultCharacterName: (role: GreenlightCastRole, index: number) => string;
    getCastableActorById: (actorId?: string | null) => any;
    now?: () => number;
    random?: () => number;
}

export const buildGreenlightProject = ({
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
    now = Date.now,
    random = Math.random,
}: BuildGreenlightProjectInput) => {
        const directorData = getCrewData('director');

        // Calculate Budget
        const estimatedBudget = budgetBreakdown.total;
        const marketingReserve = Math.max(0, Math.round(reservedMarketingBudget || 0));
        const soundtrackPlan = selectedMusicPlan || (musicPreviewProject ? buildProjectMusicPlanFromArtists(musicPreviewProject, effectiveMusicStrategy, selectedMusicArtistIds, `${selectedScript?.id || selectedScript?.title || 'project'}_${effectiveMusicStrategy}_${effectiveMusicArtistCount}_${activeMusicCreditRoles.join('_')}`, effectiveMusicArtistCount, activeMusicCreditRoles, isStudioDecidedMusicPlan, musicCatalogArtists) : undefined);
        const soundtrackBudget = soundtrackPlan?.musicBudget || 0;
        const soundtrackImpact = musicPreviewProject
            ? calculateProjectMusicImpact({ ...musicPreviewProject, musicPlan: soundtrackPlan }, soundtrackPlan, musicCatalogArtists)
            : undefined;
        const productionBudgetWithMusic = estimatedBudget + soundtrackBudget;
        const greenlightPackageBudget = productionBudgetWithMusic + marketingReserve;
        const finalInvestorPlan = selectedInvestorPlan;
        const finalInvestorRaised = finalInvestorPlan?.totalRaised || 0;
        const studioCashRequirement = Math.max(0, greenlightPackageBudget - finalInvestorRaised);

        // Location Cost & Stats
        let locationQualityBonus = 0;
        let locationName = 'Multiple Locations';

        if (selectedLocations.length > 0) {
            let totalQuality = 0;
            selectedLocations.forEach(lid => {
                const locData = findLocation(lid);
                if (locData) totalQuality += locData.quality;
            });
            locationQualityBonus = Math.round(totalQuality / selectedLocations.length);

            if (selectedLocations.length === 1) {
                const loc = findLocation(selectedLocations[0]);
                if (loc) locationName = loc.name;
            }
        }

        const safeMovieCastList = castList.filter(c => (
            isCastableMovieRoleId(c.actorId, player.flags.extraNPCs || [])
        ));

        // Calculate Fame Multiplier
        let extraFame = 0;
        const castIds = safeMovieCastList.map(c => {
             if (c.actorId === 'PLAYER_SELF') return 'player';
             if (c.actorId === 'STUDIO_STAFF') {
                 extraFame += getInHouseFame('ACTOR');
                 return null;
             }
             const rel = player.relationships.find(r => r.id === c.actorId);
             if (rel) return rel.npcId || rel.id;
             return c.actorId;
        }).filter(Boolean) as string[];

        if (directorData.tier === 'In-House') {
            extraFame += (directorData as any).fame || 0;
        }

        const fameMultiplier = calculateProjectFameMultiplier(castIds, directorData.name as string, player.stats.fame, playerActingTalent, extraFame);
        const finalBudgetTier = getProductionBudgetTier(productionBudgetWithMusic);
        const castDepth = calculateCastDepthScore(safeMovieCastList.length, selectedScript.genres[0], finalBudgetTier, currentCastingStrength);

        // Calculate Actual Quality (Hidden)
        // User request: "movie perfomed more good if movie quality is good as oer iuts est quaity but also its not neccesaary that what est quality its there movie actucal quality remain that"
        // We introduce variance.
        const qualityVariance = (random() * 20) - 10; // +/- 10 points
        // User request: "there is no need of safety net." -> Removed baseQuality boost

        const actualQuality = Math.max(1, Math.min(100, currentEstimatedQuality + qualityVariance));

        // Random Pre-Production Duration (4-10 weeks)
        const preProdDuration = Math.floor(random() * 7) + 4;
        const productionDuration = getPhaseDuration('PRODUCTION');
        const postProductionDuration = getPhaseDuration('POST_PRODUCTION');
        const productionCalendar = createProductionCalendar({
            preProductionWeeks: preProdDuration,
            productionWeeks: productionDuration,
            postProductionWeeks: postProductionDuration,
            age: player.age,
            week: player.currentWeek,
        });
        const isCreatingNewUniverse = selectedUniverseId === 'NEW' && !!newUniverseName.trim();
        const normalizedWorldUniverses = normalizeUniverseMap(player.world?.universes || {});
        const primaryCastUniverseId = safeMovieCastList.find(c => {
            if (!c.sourceUniverseId) return false;
            return !isUniverseRetired(normalizedWorldUniverses[c.sourceUniverseId]);
        })?.sourceUniverseId;
        const selectedActiveUniverseId = selectedUniverseId && selectedUniverseId !== 'NEW' && !isUniverseRetired(normalizedWorldUniverses[selectedUniverseId])
            ? selectedUniverseId
            : undefined;
        const scriptActiveUniverseId = selectedScript.universeId && !isUniverseRetired(normalizedWorldUniverses[selectedScript.universeId])
            ? selectedScript.universeId
            : undefined;
        const finalUniverseId = isCreatingNewUniverse ? `universe_${now()}` : (selectedActiveUniverseId || scriptActiveUniverseId || primaryCastUniverseId || undefined);
        const universeColors = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777'];
        const randomUniverseColor = universeColors[Math.floor(random() * universeColors.length)];

        // --- CHECK RECASTING ---
        let isRecast = false;
        if (selectedScript.franchiseId && previousFranchiseInstallments.length > 0) {
            const lastInstallment = previousFranchiseInstallments[0];
            const lastDetails = lastInstallment.projectDetails || lastInstallment;
            // Check if any lead actor changed
            if (lastDetails.castList) {
                const oldLeads = lastDetails.castList.filter(c => c.roleType === 'LEAD').map(c => c.actorId);
                const newLeads = safeMovieCastList.filter(c => c.roleType === 'LEAD').map(c => c.actorId);

                // Simple check: if a new lead wasn't in the old leads, it's a recast
                for (const newLead of newLeads) {
                    if (newLead && !oldLeads.includes(newLead)) {
                        isRecast = true;
                        break;
                    }
                }
            }
        }

        const fullCrewList: CrewMember[] = [];
        const roles: ('director' | 'cinematographer' | 'composer' | 'lineProducer' | 'vfx')[] = ['director', 'cinematographer', 'composer', 'lineProducer', 'vfx'];

        roles.forEach(role => {
            const mode = crewModes[role];
            const id = selectedCrew[role];
            if (mode === 'HIRE' && !id) return;

            const data = getCrewData(role);
            let roleEnum: CrewMember['role'] = 'DIRECTOR';
            if (role === 'cinematographer') roleEnum = 'CINEMATOGRAPHER';
            else if (role === 'composer') roleEnum = 'COMPOSER';
            else if (role === 'lineProducer') roleEnum = 'LINE_PRODUCER';
            else if (role === 'vfx') roleEnum = 'VFX_SUPERVISOR';

            let tierEnum: CrewMember['tier'] = 'INDIE';
            if (data.tier === 'LEGEND' || data.tier === 'AUTEUR' || data.tier === 'PROFESSIONAL' || data.tier === 'INDIE') tierEnum = data.tier as any;
            else if (data.tier === 'In-House') tierEnum = 'PROFESSIONAL';

            fullCrewList.push({
                id: mode === 'SELF' ? 'PLAYER_SELF' : mode === 'IN_HOUSE' ? 'STUDIO_STAFF' : (id as string) || `unknown_${role}`,
                name: data.name,
                role: roleEnum,
                stats: { technical: data.quality },
                salary: data.cost,
                status: 'SIGNED',
                tier: tierEnum,
                isPlayer: mode === 'SELF'
            });
        });

        const finalizedCastList = safeMovieCastList.map((c, index) => {
            const characterName = (c.characterName || '').trim() || getDefaultCharacterName(c, index);
            const normalizedCharacterId = c.characterId
                || (finalUniverseId ? toUniverseCharacterId(finalUniverseId as any, characterName) : undefined)
                || normalizeUniverseCharacterKey(`${selectedScript.title}_${characterName}`);
            const suggestedIdentity = suggestCharacterIdentity(
                selectedStoryCompass || inferStoryCompass(selectedScript),
                (c.roleType === 'EXTRA' ? 'CAMEO' : c.roleType) as RoleType,
                index,
                selectedScript
            );

            return {
                roleId: c.id,
                roleName: c.role,
                roleType: c.roleType,
                actorId: c.actorId || 'UNKNOWN',
                name: c.actorName || 'Unknown Actor',
                characterId: normalizedCharacterId,
                characterName,
                salary: c.salary,
                sourceUniverseId: c.sourceUniverseId,
                status: 'CONFIRMED' as const,
                storyFunction: c.storyFunction || suggestedIdentity.storyFunction,
                storyRole: c.storyRole || suggestedIdentity.storyRole,
                abilityType: c.abilityType || suggestedIdentity.abilityType,
                nature: c.nature || suggestedIdentity.nature,
                identitySource: c.identitySource || suggestedIdentity.identitySource,
                isReturning: currentReturningTalent.some(t => t.id === c.actorId) || false
            };
        });
        const characterStoryFit = evaluateCastStoryFit(
            selectedStoryCompass || inferStoryCompass(selectedScript),
            finalizedCastList.map(member => {
                const actor = member.actorId === 'PLAYER_SELF'
                    ? null
                    : member.actorId === 'STUDIO_STAFF'
                        ? null
                        : getCastableActorById(member.actorId);
                return {
                    ...member,
                    actorName: member.name,
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
            }) as any,
        );
        const castStoryRead = getCastStoryRead(
            selectedStoryCompass || inferStoryCompass(selectedScript),
            finalizedCastList.map(member => {
                const actor = member.actorId === 'PLAYER_SELF'
                    ? null
                    : member.actorId === 'STUDIO_STAFF'
                        ? null
                        : getCastableActorById(member.actorId);
                return {
                    ...member,
                    actorName: member.name,
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
            }) as any,
        );
        const hasLinkedUniverseCast = finalizedCastList.some(c => c.sourceUniverseId);
        const isPlayerActor = finalizedCastList.some(c => c.actorId === 'PLAYER_SELF' || (c as any).isPlayer);
        const isPlayerDirector = fullCrewList.some(c => c.role === 'DIRECTOR' && (c.id === 'PLAYER_SELF' || c.isPlayer));
        const initialPlayerProductionFocus = {
            isPlayerActor,
            isPlayerDirector,
            isPlayerProducer: true,
            actorPrep: 0,
            actorSceneRehearsal: 0,
            actorBigPerformance: 0,
            actorPerformance: 0,
            actorPromotion: 0,
            directorPrep: 0,
            directorShotDecision: 0,
            directorMajorCreativePush: 0,
            directorRiskyDecision: 0,
            directorPerformance: 0,
            directorPost: 0,
            producerScriptPolish: 0,
            producerCastCrewPrep: 0,
            producerSetQuality: 0,
            producerEditNotes: 0,
            producerReleasePositioning: 0,
            producerPrep: 0,
            producerPerformance: 0,
            producerPost: 0,
            qualityLift: 0,
        };
        const selfRunCast = finalizedCastList.length > 0 && finalizedCastList.every(member => (
            member.actorId === 'PLAYER_SELF' || member.actorId === 'STUDIO_STAFF'
        ));
        const selfRunCrew = fullCrewList.length > 0 && fullCrewList.every(member => (
            member.id === 'PLAYER_SELF' || member.id === 'STUDIO_STAFF'
        ));
        const selfRunProduction = selfRunCast && selfRunCrew;
        const selfRunLoad = selfRunProduction
            ? player.commitments.filter(commitment => (
                commitment.projectDetails?.studioId === studio.id
                && commitment.projectDetails.hiddenStats?.selfRunProduction
                && commitment.projectPhase !== 'AWAITING_RELEASE'
            )).length + 1
            : 0;
        // A lean, in-house production is valid. The quality tradeoff begins only
        // when the same player-led team is already spread across other projects.
        const selfRunQualityStrain = Math.max(0, selfRunLoad - 1) * 3;
        const projectSubtype = effectiveConnectedIntent === 'EVENT'
            ? 'UNIVERSE_EVENT'
            : effectiveConnectedIntent === 'CROSSOVER'
                ? 'UNIVERSE_CROSSOVER'
                : effectiveConnectedIntent === 'REBOOT'
                    ? 'REBOOT'
                    : selectedScript.tags?.includes('UNIVERSE_EVENT')
                        ? 'UNIVERSE_EVENT'
                        : hasLinkedUniverseCast && selectedScript.sourceMaterial !== 'SEQUEL'
                            ? 'UNIVERSE_CROSSOVER'
                            : selectedScript.sourceMaterial === 'SEQUEL'
                                ? 'SEQUEL'
                                : selectedScript.sourceMaterial === 'SPINOFF'
                                    ? 'SPINOFF'
                                    : 'STANDALONE';

        const selectedWriter = studio.studioState?.writers.find(writer => writer.id === selectedScript.writerId);
        const creditedWriterName = selectedWriter?.name
            || (selectedScript.author && !['In-House Writers', 'Original Creator'].includes(selectedScript.author) ? selectedScript.author : undefined);
        const creditedWriterSkill = Number.isFinite(Number(selectedScript.assignedSkill))
            ? Number(selectedScript.assignedSkill)
            : selectedWriter?.skill;
        const newCommitmentId = `proj_${now()}`;
        const newCommitment: Commitment = {
            id: newCommitmentId,
            name: selectedScript.title,
            type: 'JOB',
            roleType: safeMovieCastList.find(c => c.actorId === 'PLAYER_SELF')?.roleType as any,
            energyCost: 0,
            income: 0,
            payoutType: 'LUMPSUM',
            projectPhase: 'PRE_PRODUCTION',
            phaseWeeksLeft: preProdDuration,
            totalPhaseDuration: preProdDuration,
            productionCalendar,
            promotionalBuzz: currentEstimatedBuzz,
            projectDetails: {
                title: selectedScript.title,
                sourceScriptId: selectedScript.id,
                writerId: selectedScript.writerId || undefined,
                writerName: creditedWriterName,
                writerSkill: creditedWriterSkill,
                isOriginal: selectedScript.isOriginal,
                type: resolveProjectType(selectedScript.projectType, (selectedScript as any).type, (selectedScript as any).projectDetails?.type),
                format: selectedScript.format || 'LIVE_ACTION',
                episodes: selectedScript.episodes,
                description: `A ${selectedScript.genres.join('/')} ${formatProjectFormatLabel(selectedScript.format)} ${resolveProjectType(selectedScript.projectType, (selectedScript as any).type, (selectedScript as any).projectDetails?.type) === 'SERIES' ? 'series' : 'film'} produced by ${studio.name}${selectedScript.subjectName ? ` about ${selectedScript.subjectName}` : ''}.`,
                studioId: studio.id as any,
                subtype: projectSubtype,
                universeId: finalUniverseId,
                universeSagaName: isCreatingNewUniverse
                    ? 'Saga 1'
                    : selectedScript.universeSagaName || ((selectedUniverseId && selectedUniverseId !== 'NEW') ? String(normalizedWorldUniverses[selectedUniverseId]?.currentSagaName || normalizedWorldUniverses[selectedUniverseId]?.saga || 'Saga 1') : undefined),
                universePhaseName: isCreatingNewUniverse
                    ? 'Phase 1'
                    : selectedScript.universePhaseName || ((selectedUniverseId && selectedUniverseId !== 'NEW') ? String(normalizedWorldUniverses[selectedUniverseId]?.currentPhaseName || normalizedWorldUniverses[selectedUniverseId]?.currentPhase || 'Phase 1') : undefined),
                newUniverseName: isCreatingNewUniverse ? newUniverseName.trim() : undefined,
                franchiseId: selectedFranchiseId === 'NEW' ? `fran_${now()}` : (selectedFranchiseId || undefined),
                installmentNumber: (selectedFranchiseId && selectedFranchiseId !== 'NEW') ? (studioFranchises.find(f => f.id === selectedFranchiseId)?.lastInstallment || 0) + 1 : 1,
                genre: selectedScript.genres[0],
                subjectName: selectedScript.subjectName,
                subjectType: selectedScript.subjectType,
                storyCompass: selectedStoryCompass || inferStoryCompass(selectedScript),
                connectedProjectIntent: effectiveConnectedIntent,
                targetAudience: selectedScript.targetAudience || 'PG-13',
                budgetTier: finalBudgetTier,
                estimatedBudget: productionBudgetWithMusic,
                reservedMarketingBudget: marketingReserve,
                marketingBudgetSpent: 0,
                marketingBudgetRemaining: marketingReserve,
                visibleHype: 'LOW',
                playerProductionFocus: initialPlayerProductionFocus,
                hiddenStats: {
                    scriptQuality: selectedScript.quality,
                    directorQuality: directorData.quality,
                    castingStrength: currentCastingStrength,
                    distributionPower: Math.min(100, 50 + Math.floor(studioPrestigeScore / 8)),
                    rawHype: currentEstimatedBuzz,
                    qualityScore: Math.max(1, actualQuality - selfRunQualityStrain),
                    prestigeBonus: (tone < 30 ? 20 : 0) + Math.floor(studioPrestigeScore / 25),
                    fameMultiplier: fameMultiplier,
                    castDepthScore: castDepth.score,
                    castDepthNote: castDepth.note,
                    musicBuzz: soundtrackPlan?.musicBuzz || 0,
                    musicRisk: soundtrackPlan?.musicRisk || 0,
                    musicBudget: soundtrackBudget,
                    musicOpeningLiftPct: soundtrackImpact?.openingWeekendLiftPct || 0,
                    musicAudienceReachLiftPct: soundtrackImpact?.audienceReachLiftPct || 0,
                    musicSocialHypeLift: soundtrackImpact?.socialHypeLift || 0,
                    musicTrailerStrengthLift: soundtrackImpact?.trailerStrengthLift || 0,
                    musicControversyRisk: soundtrackImpact?.controversyRisk || 0,
                    musicMismatchBacklashRisk: soundtrackImpact?.mismatchBacklashRisk || 0,
                    musicAwardChanceLift: soundtrackImpact?.awardChanceLift || 0,
                    musicStreamingInterestLiftPct: soundtrackImpact?.streamingInterestLiftPct || 0,
                    musicImpactLabel: soundtrackImpact?.label,
                    studioPrestigeScore,
                    isRecast: isRecast,
                    connectedProjectIntent: effectiveConnectedIntent,
                    linkedUniverseCastCount,
                    selfRunProduction,
                    selfRunLoad: selfRunProduction ? selfRunLoad : undefined,
                    characterStoryFitScore: characterStoryFit.score,
                    characterStoryFitLabel: characterStoryFit.label,
                    characterStoryFitAdjustment: characterStoryFit.qualityAdjustment,
                    characterStoryFitSummary: characterStoryFit.summary,
                    characterStoryFitStrengths: characterStoryFit.strengths,
                    characterStoryFitWarnings: characterStoryFit.warnings,
                    castStoryArchetype: castStoryRead.archetype,
                    castStoryHeadline: castStoryRead.headline,
                    castStorySummary: castStoryRead.summary,
                    castStoryBalanceScore: castStoryRead.balanceScore,
                    backgroundAuthenticity: backgroundCastingPlan.authenticity,
                    backgroundReliability: backgroundCastingPlan.reliability,
                    backgroundSetCare: backgroundCastingPlan.setCare,
                    backgroundDiscoveryPotential: backgroundCastingPlan.discoveryPotential,
                    ...(lockedStreamingFunding ? {
                        platformId: lockedStreamingFunding.fundingSource === 'OWNED_STREAMING_PLATFORM'
                            ? undefined
                            : lockedStreamingFunding.platformId,
                        nextSeasonFundingAmount: lockedStreamingFunding.amount,
                        nextSeasonFundingPlatformId: lockedStreamingFunding.platformId,
                        nextSeasonFundingSourceProjectId: lockedStreamingFunding.sourceProjectId,
                        nextSeasonFundingUsedByProjectId: newCommitmentId,
                        ownedStreamingCommissionId: lockedStreamingFunding.ownedStreamingCommissionId,
                        ownedStreamingOriginal: lockedStreamingFunding.fundingSource === 'OWNED_STREAMING_PLATFORM',
                        ownedStreamingCommissionedBy: lockedStreamingFunding.platformName,
                        ownedStreamingPhysicalProducerName: studio.name,
                    } : {})
                },
                director: {
                    id: selectedCrew.director || (crewModes.director === 'SELF' ? 'PLAYER_SELF' : 'STUDIO_STAFF'),
                    name: directorData.name,
                    tier: directorData.tier,
                    quality: directorData.quality
                },
                directorName: directorData.name,
                directorId: selectedCrew.director || undefined,
                visibleDirectorTier: directorData.tier,
                visibleScriptBuzz: 'High',
                visibleCastStrength: currentCastingStrength > 80 ? 'Star-Studded' : currentCastingStrength > 62 ? 'Solid' : 'Thin',
                castList: finalizedCastList as any,
                backgroundCastingPlan,
                crewList: fullCrewList,
                location: selectedLocations.length > 0 ? { id: selectedLocations[0], name: locationName, region: 'Global', costModifier: 1, qualityBonus: locationQualityBonus, status: 'PENDING', description: `${selectedLocations.length} locations`, coordinates: {x:0,y:0} } : undefined,
                tone: tone,
                visualStyle: visualStyle as any,
                pacing: pacing,
                equipmentChoices: equipmentChoices,
                musicPlan: soundtrackPlan,
                investorPlan: finalInvestorPlan
            }
        };

        const updatedScripts = studio.studioState!.scripts.map(s =>
            s.id === selectedScriptId ? { ...s, status: 'PRODUCED' as const, producedAtWeek: player.currentWeek } : s
        );

        // Remove the concept from the studio state to prevent duplicates in Active Slate
        const updatedConcepts = studio.studioState!.concepts.filter(c => c.scriptId !== selectedScriptId);

        // Update talent roster to decrement moviesRemaining for contracted actors
        const usedActorIds = safeMovieCastList.map(c => c.actorId).filter(Boolean);

        // Consume deals only from the studio making this project. The global
        // roster remains an HQ compatibility mirror and is never touched by a
        // subsidiary production.
        const updateRoster = (roster: any[]) => {
            return roster?.map(contract => {
                if (usedActorIds.includes(contract.npcId) && contract.moviesRemaining > 0) {
                    return { ...contract, moviesRemaining: contract.moviesRemaining - 1 };
                }
                return contract;
            }).filter(c => c.moviesRemaining > 0) || [];
        };

        const updatedPlayerTalentRoster = isPrimaryStudio
            ? updateRoster(player.studio?.talentRoster || [])
            : (player.studio?.talentRoster || []);
        const updatedStudioTalentRoster = updateRoster(studioTalentRoster);

    return {
        directorData,
        estimatedBudget,
        soundtrackPlan,
        greenlightPackageBudget,
        finalInvestorPlan,
        finalInvestorRaised,
        studioCashRequirement,
        safeMovieCastList,
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
    };
};

export interface PrepareGreenlightFundingInput {
    player: Player;
    studio: Business;
    lockedStreamingFunding?: LockedStreamingFunding | null;
    studioCashRequirement: number;
    newCommitment: Commitment;
    finalInvestorRaised: number;
    greenlightPackageBudget: number;
    isCreatingNewUniverse: boolean;
    normalizedWorldUniverses: Record<string, Universe>;
    finalUniverseId?: UniverseId;
    newUniverseName: string;
    randomUniverseColor: string;
}

export const prepareGreenlightFunding = ({
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
}: PrepareGreenlightFundingInput) => {
    const fundingResult = applyLockedSeasonFunding({
        budget: studioCashRequirement,
        lockedFunding: lockedStreamingFunding,
        lockedStreamingFunds: studio.studioState?.lockedStreamingFunds || [],
        projectId: newCommitment.id,
        studioBalance: studio.balance,
        productionFund: studio.studioState?.productionFund || 0,
        week: player.currentWeek,
        year: player.age,
        newsYear: Math.floor(player.currentWeek / 52) + 2024,
        projectTitle: newCommitment.name,
    });
    const lockedFundApplied = fundingResult.lockedFundApplied;
    const unusedFundingReturned = fundingResult.unusedFundingReturned;
    const fundedCommitment: Commitment = {
        ...newCommitment,
        projectDetails: newCommitment.projectDetails ? {
            ...newCommitment.projectDetails,
            hiddenStats: {
                ...newCommitment.projectDetails.hiddenStats,
                platformProductionFundingApplied: lockedFundApplied,
                productionFundApplied: fundingResult.productionFundApplied,
                studioCashAtRisk: fundingResult.studioSpend,
                investorFundingApplied: finalInvestorRaised,
                greenlightPackageBudget,
                platformFundedPremiere: lockedFundApplied > 0,
            },
        } : undefined,
    };
    const fundingNewsItems = fundingResult.news ? [fundingResult.news] : [];
    const fundingLogEntries = fundingResult.feedbackMessages.map(message => ({
        week: player.currentWeek,
        year: player.age,
        message,
        type: message.startsWith('Studio added') ? 'neutral' as const : 'positive' as const,
    }));
    const markSourceSeasonFundingUsed = (details?: ProjectDetails) =>
        markHiddenSeasonFundingUsed(details, lockedStreamingFunding, newCommitment.id);
    const fundingSourceMatches = (details?: ProjectDetails, fallbackId?: string) => {
        if (!lockedStreamingFunding) return false;
        return fallbackId === lockedStreamingFunding.sourceProjectId
            || details?.hiddenStats?.nextSeasonFundingSourceProjectId === lockedStreamingFunding.sourceProjectId;
    };
    const updatedActiveReleases = lockedStreamingFunding
        ? player.activeReleases.map(release => {
            if (!fundingSourceMatches(release.projectDetails, release.id)) return release;
            const projectDetails = markSourceSeasonFundingUsed(release.projectDetails);
            return projectDetails ? { ...release, projectDetails } : release;
        })
        : player.activeReleases;
    const updatedCommitments = lockedStreamingFunding
        ? player.commitments.map(commitment => {
            if (!fundingSourceMatches(commitment.projectDetails, commitment.id)) return commitment;
            const projectDetails = markSourceSeasonFundingUsed(commitment.projectDetails);
            return projectDetails ? { ...commitment, projectDetails } : commitment;
        })
        : player.commitments;
    const updatedWorldUniverses = isCreatingNewUniverse && finalUniverseId
        ? {
            ...normalizedWorldUniverses,
            [finalUniverseId]: normalizeUniverseForSave({
                id: finalUniverseId,
                name: newUniverseName.trim(),
                description: `${studio.name}'s new cinematic universe.`,
                studioId: studio.id,
                currentPhase: 'PHASE_1_ORIGINS',
                saga: 1,
                currentSagaName: 'Saga 1',
                currentPhaseName: 'Phase 1',
                sagas: [],
                momentum: 5,
                brandPower: 5,
                marketShare: 0,
                color: randomUniverseColor,
                roster: [],
                slate: [fundedCommitment.projectDetails],
                weeksUntilNextPhase: 104,
            }, finalUniverseId),
        }
        : normalizedWorldUniverses;
    const updatedWorldPlatforms = { ...player.world.platforms };
    if (unusedFundingReturned > 0 && lockedStreamingFunding?.platformId) {
        const platformId = lockedStreamingFunding.platformId as keyof typeof updatedWorldPlatforms;
        const platform = updatedWorldPlatforms[platformId];
        if (platform) {
            updatedWorldPlatforms[platformId] = {
                ...platform,
                cashReserve: platform.cashReserve + unusedFundingReturned,
            };
        }
    }

    return {
        fundingResult,
        lockedFundApplied,
        unusedFundingReturned,
        newProductionFund: fundingResult.nextProductionFund,
        newStudioBalance: fundingResult.nextStudioBalance,
        updatedLockedStreamingFunds: fundingResult.updatedLockedStreamingFunds,
        fundedCommitment,
        fundingNewsItems,
        fundingLogEntries,
        updatedActiveReleases,
        updatedCommitments,
        updatedWorldUniverses,
        updatedWorldPlatforms,
    };
};
