
import React, { useState } from 'react';
import { Player, Commitment, LogEntry, InstaPost, XPost, NewsItem, Stats, ImprovementOption, SocialEventOption, SocialEvent, Relationship, SponsorshipActionType, Message, AuditionOpportunity, NegotiationData, ScheduledEvent, PressInteraction, WriterStats, NPCActor, InteractionType, NPCState, PregnancyCarrier, OwnedProductionActionId } from '../types';
import { calculateAuditionGain, calculateProductionGain, generateReleasePressQuestions, rewardGenreExperience } from '../services/roleLogic';
import { calculateInteraction, getGenderedAvatar } from '../services/npcLogic';
import { getFlavorTexts, getSocialEvents } from '../services/socialEvents';
import { createBusiness } from '../services/businessLogic';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { hasOwnedPremiumAssetInCollection, spendPlayerEnergy } from '../services/premiumLogic';
import { applyParenthoodAbandonment, applyPartnerBreakup, applyDivorceOutcome, getPregnancyCarrier, getPregnancyFeedbackCopy, reconnectWithChild } from '../services/familyLogic';
import { getPlayerLanguage, t } from '../services/i18n';
import { OWNED_PRODUCTION_ACTIONS, applyOwnedProductionFocusAction, getOwnedProductionActionProgress } from '../services/ownedProductionCareer';

interface GameActionsProps {
    player: Player;
    setPlayer: React.Dispatch<React.SetStateAction<Player>>;
    setToastMessage: (msg: {title: string, subtext: string} | null) => void;
    setActivePressEvent: (evt: { project: Commitment, questions: PressInteraction[] } | null) => void;
    setShowProtectionPrompt: (prompt: { partnerId: string, partnerName: string } | null) => void;
    setActiveSocialEvent: (evt: { event: SocialEvent, partnerId: string } | null) => void;
    setPendingBabyNaming: (pending: {
        partnerId: string;
        partnerName: string;
        pregnancyCarrier?: PregnancyCarrier;
        babyGender: 'MALE' | 'FEMALE';
        suggestedFirstName: string;
        birthWeekAbsolute: number;
        eventWeek: number;
        eventYear: number;
        shouldCreateScandalNews: boolean;
    } | null) => void;
}

export const useGameActions = ({ player, setPlayer, setToastMessage, setActivePressEvent, setShowProtectionPrompt, setActiveSocialEvent, setPendingBabyNaming }: GameActionsProps) => {
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const familyRelations: Relationship['relation'][] = ['Parent', 'Deceased Parent', 'Sibling', 'Child'];
    const isFamilyRelation = (relation?: Relationship['relation']) => !!relation && familyRelations.includes(relation);
    const PREGNANCY_TERM_WEEKS = 39;
    type GiftInteractionType = 'GIFT_THOUGHTFUL' | 'GIFT_LUXURY' | 'GIFT_APOLOGY' | 'GIFT_FAMILY_SUPPORT' | 'GIFT_INDUSTRY_FAVOR';
    type SocialInteractionType = 'CALL' | 'CHECK_IN' | 'DEEP_TALK' | 'FAMILY_DINNER' | 'INDUSTRY_LUNCH' | 'HANGOUT' | 'GIFT' | GiftInteractionType | 'NETWORK' | 'DATE' | 'PROPOSE' | 'INTIMACY' | 'CLUBBING' | 'TRIP' | 'ESTATE_DATE' | 'YACHT_DATE' | 'JET_ESCAPE' | 'LUXURY_GIFT' | 'ABANDON_CHILD' | 'RECONNECT_CHILD' | 'BREAK_UP' | 'DIVORCE_SETTLE' | 'DIVORCE_FIGHT_BUDGET' | 'DIVORCE_FIGHT_ESTABLISHED' | 'DIVORCE_FIGHT_ELITE' | 'PET_FEED' | 'PET_PLAY' | 'PET_GROOM' | 'PET_VET';

    const intimacyDeclines = [
        'actions.intimacy.decline.space',
        'actions.intimacy.decline.connectionOff',
        'actions.intimacy.decline.stressed',
        'actions.intimacy.decline.strongerFirst',
        'actions.intimacy.decline.roughWeek',
    ];

    const getWeeksSinceContact = (state: Player, partner: Relationship) => {
        const currentAbsolute = getAbsoluteWeek(state.age, state.currentWeek);
        if (typeof partner.lastInteractionAbsolute === 'number') {
            return Math.max(0, currentAbsolute - partner.lastInteractionAbsolute);
        }
        return Math.max(0, state.currentWeek - (partner.lastInteractionWeek || 0));
    };

    const getIntimacyDeclineReason = (state: Player, partner: Relationship): string | null => {
        if (partner.relation !== 'Partner' && partner.relation !== 'Spouse') {
            return tr('actions.intimacy.decline.notRomantic');
        }

        const weeksSinceContact = getWeeksSinceContact(state, partner);
        const relationshipBonus = partner.relation === 'Spouse' ? 14 : 6;
        const moodScore = (state.stats.happiness * 0.22) + (state.stats.health * 0.12) + (state.stats.reputation * 0.04);
        const recentPenalty = weeksSinceContact > 24 ? 14 : weeksSinceContact > 10 ? 8 : weeksSinceContact > 4 ? 3 : 0;
        const readiness = (partner.closeness * 0.66) + moodScore + relationshipBonus - recentPenalty;
        const declineChance = readiness >= 92 ? 0.06
            : readiness >= 76 ? 0.14
            : readiness >= 58 ? 0.28
            : readiness >= 40 ? 0.48
            : 0.72;

        if (Math.random() >= declineChance) return null;
        if (partner.closeness < 35) return tr('actions.intimacy.decline.notClose', { partnerName: partner.name });
        if (weeksSinceContact > 10) return tr('actions.intimacy.decline.distant', { partnerName: partner.name });
        return tr(intimacyDeclines[Math.floor(Math.random() * intimacyDeclines.length)]);
    };

    const recordIntimacyDecline = (partnerId: string, reason: string) => {
        setPlayer(prev => {
            const idx = prev.relationships.findIndex(rel => rel.id === partnerId);
            if (idx === -1) return prev;
            const partner = prev.relationships[idx];
            const relationships = [...prev.relationships];
            relationships[idx] = {
                ...partner,
                closeness: Math.max(0, partner.closeness - (partner.closeness < 45 ? 2 : 0)),
                lastInteractionWeek: prev.currentWeek,
                lastInteractionAbsolute: getAbsoluteWeek(prev.age, prev.currentWeek),
            };
            const nextState = {
                ...prev,
                relationships,
                logs: [
                    ...prev.logs,
                    {
                        week: prev.currentWeek,
                        year: prev.age,
                        message: `🌙 ${reason}`,
                        type: 'neutral' as const,
                    },
                ].slice(-50),
            };
            spendPlayerEnergy(nextState, Math.min(8, prev.energy.current), 'Relationship: Declined intimacy');
            return nextState;
        });
        setToastMessage({ title: tr('actions.intimacy.notTonightTitle'), subtext: reason });
    };

    const schedulePregnancy = (
        prev: Player,
        partner: Relationship,
        shouldCreateScandalNews: boolean
    ): { next: Player; scheduled: boolean } => {
        if (prev.activePregnancy) {
            return { next: prev, scheduled: false };
        }
        const pregnancyCarrier = getPregnancyCarrier(prev.gender, partner.gender);
        if (pregnancyCarrier === 'NONE') {
            return { next: prev, scheduled: false };
        }

        const babyGender: 'MALE' | 'FEMALE' = Math.random() > 0.5 ? 'MALE' : 'FEMALE';
        const suggestedFirstName = babyGender === 'MALE' ? 'Leo' : 'Mia';
        const conceptionWeekAbsolute = getAbsoluteWeek(prev.age, prev.currentWeek);
        const next = {
            ...prev,
            activePregnancy: {
                partnerId: partner.id,
                partnerName: partner.name,
                pregnancyCarrier,
                babyGender,
                suggestedFirstName,
                conceptionWeekAbsolute,
                birthWeekAbsolute: conceptionWeekAbsolute + PREGNANCY_TERM_WEEKS,
                weeksLeft: PREGNANCY_TERM_WEEKS,
                shouldCreateScandalNews,
            },
        };

        return { next, scheduled: true };
    };

    const pushLifestyleHeadline = (nextState: Player, headline: string, subtext: string) => {
        nextState.news = [
            {
                id: `news_lifestyle_${Date.now()}_${Math.random()}`,
                headline,
                subtext,
                category: 'TOP_STORY' as const,
                week: nextState.currentWeek,
                year: nextState.age,
                impactLevel: 'MEDIUM' as const,
            },
            ...nextState.news,
        ].slice(0, 50);
        nextState.x.feed = [
            {
                id: `x_lifestyle_${Date.now()}_${Math.random()}`,
                authorId: `x_lifestyle_${Math.random()}`,
                authorName: 'Style Signal',
                authorHandle: '@stylesignal',
                authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=StyleSignal',
                content: headline,
                timestamp: Date.now(),
                likes: 14000,
                retweets: 2500,
                replies: 480,
                isPlayer: false,
                isLiked: false,
                isRetweeted: false,
                isVerified: true,
            },
            ...nextState.x.feed,
        ].slice(0, 50);
    };
    
    // Helper for updating player and saving asynchronously
    const handleGenericUpdate = (updater: (prev: Player) => Player, logMessage?: string) => {
        setPlayer(prev => {
            const next = updater(prev);
            if (logMessage) {
                // Ensure logs don't grow infinitely here too
                const newLog = { week: next.currentWeek, year: next.age, message: logMessage, type: 'neutral' as const };
                next.logs = [...next.logs, newLog].slice(-50); 
            }
            return next;
        });
    };

    const handleRehearse = (commitmentId: string) => {
        if (commitmentId.startsWith('PROMO_')) {
            handlePromotionAction(commitmentId);
            return;
        }

        setPlayer(prev => {
            const cIndex = prev.commitments.findIndex(c => c.id === commitmentId);
            if (cIndex === -1) return prev; 
            const c = prev.commitments[cIndex];
            let updatedC = { ...c }; let msg = "";
            
            if (c.projectPhase === 'PRE_PRODUCTION') {
                if (prev.energy.current < 10) return prev;
                if ((c.auditionPerformance || 0) >= 100) return prev;

                const gain = 2;
                updatedC.auditionPerformance = Math.min(100, (c.auditionPerformance || 0) + gain); 
                msg = `Table Read complete. Prep: ${Math.round(updatedC.auditionPerformance)}%`;
                
                const newCommitments = [...prev.commitments]; newCommitments[cIndex] = updatedC;
                const newLog: LogEntry = { week: prev.currentWeek, year: prev.age, message: msg, type: 'neutral' };
                const newState = { 
                    ...prev, 
                    stats: { ...prev.stats, experience: prev.stats.experience + 1 },
                    commitments: newCommitments, 
                    logs: [...prev.logs, newLog].slice(-50)
                };
                spendPlayerEnergy(newState, 10, `Career prep: ${c.name}`);
                return newState;
            }

            if (c.projectPhase === 'AUDITION') {
               if (prev.energy.current < 20) return prev;
               if ((c.auditionPerformance || 0) >= 100) return prev;

               const gain = calculateAuditionGain(prev, c.roleType || 'MINOR', c.auditionPerformance || 0);
               updatedC.auditionPerformance = Math.min(100, (c.auditionPerformance || 0) + gain);
               msg = `Rehearsed audition. Prep: ${Math.round(updatedC.auditionPerformance)}%`;
               
               const newCommitments = [...prev.commitments]; newCommitments[cIndex] = updatedC;
               const newLog: LogEntry = { week: prev.currentWeek, year: prev.age, message: msg, type: 'neutral' };
               const newState = { ...prev, commitments: newCommitments, logs: [...prev.logs, newLog].slice(-50)};
               spendPlayerEnergy(newState, 20, `Audition rehearsal: ${c.name}`);
               return newState;

            } else if (c.projectPhase === 'PRODUCTION') {
               if (prev.energy.current < 20) return prev;
               if ((c.productionPerformance || 0) >= 100) return prev;

               const isOverworked = prev.commitments.filter(com => com.type === 'ACTING_GIG' && com.projectPhase === 'PRODUCTION').length > 1 || prev.commitments.some(com => com.type === 'JOB');
               const gain = calculateProductionGain(prev, c.roleType || 'MINOR', c.productionPerformance || 0, isOverworked, c.type);
               updatedC.productionPerformance = Math.min(100, (c.productionPerformance || 0) + gain);
               msg = `Rehearsed scene. Perf: ${Math.round(updatedC.productionPerformance)}%`;
               
               const newCommitments = [...prev.commitments]; newCommitments[cIndex] = updatedC;
               const newLog: LogEntry = { week: prev.currentWeek, year: prev.age, message: msg, type: 'neutral' };
               const newState = { ...prev, commitments: newCommitments, logs: [...prev.logs, newLog].slice(-50)};
               spendPlayerEnergy(newState, 20, `Scene rehearsal: ${c.name}`);
               return newState;
            }
            
            return prev;
        });
    };

    const handlePromotionAction = (actionId: string) => {
        const parts = actionId.split('_'); 
        const type = parts[1];
        const targetGigId = parts.slice(2).join('_');

        const commitment = player.commitments.find(c => c.id === targetGigId);
        if (!commitment) return;

        if (type === 'PRESS') {
            const energyCost = 25;
            if (player.energy.current < energyCost) return;

            setPlayer(prev => ({
                ...prev,
                ...(() => {
                    const next = JSON.parse(JSON.stringify(prev)) as Player;
                    spendPlayerEnergy(next, energyCost, `Press: ${commitment.name}`);
                    return { energy: next.energy, flags: next.flags };
                })()
            }));

            const questions = generateReleasePressQuestions(3);
            setActivePressEvent({ project: commitment, questions });
            return;
        }

        setPlayer(prev => {
            let energyCost = 0;
            let buzzDelta = 0;
            let logMsg = "";
            let toastTitle = "";
            let toastSub = "";
            
            let newInstaPosts = prev.instagram.posts;
            let newInstaFeed = prev.instagram.feed;
            let newXPosts = prev.x.posts;
            let newXFeed = prev.x.feed;

            if (type === 'IG') {
                energyCost = 10;
                if (prev.energy.current < energyCost) return prev;
                
                buzzDelta = 2; 
                logMsg = `Posted promo on Instagram for ${commitment.name}.`;
                toastTitle = "Instagram Post Shared";
                toastSub = `Followers react to ${commitment.name}`;

                const newPost: InstaPost = {
                    id: `post_promo_${Date.now()}`,
                    authorId: 'PLAYER', authorName: prev.name, authorHandle: prev.instagram.handle, authorAvatar: prev.avatar,
                    type: 'ANNOUNCEMENT',
                    caption: `So excited for you all to see ${commitment.name}! 🎬✨ #ComingSoon`,
                    week: prev.currentWeek, year: prev.age,
                    likes: Math.floor(prev.stats.followers * 0.1),
                    comments: Math.floor(prev.stats.followers * 0.005),
                    isPlayer: true
                };
                newInstaPosts = [newPost, ...newInstaPosts];
                newInstaFeed = [newPost, ...newInstaFeed];
            } 
            else if (type === 'X') {
                energyCost = 15;
                if (prev.energy.current < energyCost) return prev;

                buzzDelta = 3; 
                logMsg = `Tweeted hype for ${commitment.name}.`;
                toastTitle = "Posted on X";
                toastSub = "Your tweet is gaining traction.";

                const newPost: XPost = {
                    id: `x_promo_${Date.now()}`,
                    authorId: 'PLAYER', authorName: prev.name, authorHandle: prev.x.handle, authorAvatar: prev.avatar,
                    content: `${commitment.name} is going to be special. Can't wait. 🍿`,
                    timestamp: prev.currentWeek,
                    likes: Math.floor(prev.stats.followers * 0.05),
                    retweets: Math.floor(prev.stats.followers * 0.01),
                    replies: Math.floor(prev.stats.followers * 0.005),
                    isPlayer: true, isLiked: false, isRetweeted: false, isVerified: prev.stats.fame > 50
                };
                newXPosts = [newPost, ...newXPosts];
                newXFeed = [newPost, ...newXFeed];
            }

            const currentBuzz = commitment.promotionalBuzz || 0;
            const newBuzz = Math.max(-50, Math.min(50, currentBuzz + buzzDelta));
            const updatedCommitment = { ...commitment, promotionalBuzz: newBuzz };
            const newCommitments = prev.commitments.map(c => c.id === commitment.id ? updatedCommitment : c);

            setToastMessage({ title: toastTitle, subtext: toastSub });

            const newState = {
                ...prev,
                commitments: newCommitments,
                logs: [...prev.logs, { week: prev.currentWeek, year: prev.age, message: logMsg, type: 'positive' as const }].slice(-50),
                instagram: { ...prev.instagram, posts: newInstaPosts, feed: newInstaFeed },
                x: { ...prev.x, posts: newXPosts, feed: newXFeed }
            };
            spendPlayerEnergy(newState, energyCost, `Promotion: ${commitment.name}`);
            return newState;
        });
    };

    const handleOwnedProductionFocus = (commitmentId: string, actionId: OwnedProductionActionId) => {
        const action = OWNED_PRODUCTION_ACTIONS[actionId];
        if (!action) return;

        setPlayer(prev => {
            const cIndex = prev.commitments.findIndex(c => c.id === commitmentId);
            if (cIndex === -1) return prev;
            const commitment = prev.commitments[cIndex];
            if (commitment.projectPhase !== action.phase) return prev;

            if (prev.energy.current < action.energyCost) {
                setToastMessage({ title: `Need ${action.energyCost}E`, subtext: 'Rest before taking another production push.' });
                return prev;
            }

            const currentProgress = getOwnedProductionActionProgress(commitment, actionId);
            if (currentProgress >= 100) return prev;

            const result = applyOwnedProductionFocusAction(prev, commitment, actionId);
            const newCommitments = [...prev.commitments];
            newCommitments[cIndex] = result.commitment;
            const nextState: Player = {
                ...prev,
                commitments: newCommitments,
                logs: [
                    ...prev.logs,
                    {
                        week: prev.currentWeek,
                        year: prev.age,
                        message: result.logMessage,
                        type: result.qualityLiftDelta > 0 ? 'positive' : 'neutral',
                    },
                ].slice(-50),
            };

            spendPlayerEnergy(nextState, action.energyCost, `Owned production: ${action.shortLabel}`);
            setToastMessage({
                title: action.label,
                subtext: result.qualityLiftDelta > 0
                    ? `Project polish improved by ${result.qualityLiftDelta}.`
                    : `${result.commitment.name} progress improved.`,
            });
            return nextState;
        });
    };

    const handleImproveAction = (category: string, activityName: string, option: ImprovementOption) => {
        setPlayer(prev => {
            if (prev.energy.current < option.energyCost || prev.money < option.moneyCost) return prev;

            if (category === 'GENRE') {
                const genre = activityName as any;
                const cost = option.moneyCost;
                const energy = option.energyCost;
                const newPlayer = JSON.parse(JSON.stringify(prev)) as Player;
                newPlayer.money -= cost;
                spendPlayerEnergy(newPlayer, energy, `Training: ${genre}`);
                rewardGenreExperience(newPlayer, genre, 1);
                newPlayer.logs.push({
                    week: prev.currentWeek, year: prev.age, 
                    message: tr('actions.improve.genreLog', { genre }), type: 'neutral'
                });
                newPlayer.logs = newPlayer.logs.slice(-50);
                setToastMessage({ title: tr('actions.improve.genreTrainingTitle'), subtext: tr('actions.improve.genreTrainingSubtext', { genre }) });
                return newPlayer;
            }

            const newStats = { ...prev.stats, skills: { ...prev.stats.skills } };
            const newWriterStats = prev.writerStats ? { ...prev.writerStats } : { creativity: 0, dialogue: 0, structure: 0 };
            let msg = tr('actions.improve.completedLog', { label: option.label });
            let toastType = tr('actions.improve.activityCompleteTitle');
            
            Object.entries(option.gains).forEach(([key, val]) => {
                if (typeof val !== 'number') return; 
                if (key in newStats && key !== 'skills') {
                    const statKey = key as keyof Stats;
                    const currentVal = newStats[statKey] as number;
                    let gain = val;
                    if (currentVal > 80) gain *= 0.5;
                    (newStats as any)[statKey] = Math.min(100, Math.max(0, currentVal + gain));
                } else if (key in newStats.skills) {
                    const skillKey = key as any;
                    const currentVal = newStats.skills[skillKey];
                    let gain = val;
                    if (currentVal > 80) gain *= 0.5;
                    newStats.skills[skillKey] = Math.min(100, Math.max(0, currentVal + gain));
                }
            });

            if (option.writerGains) {
                Object.entries(option.writerGains).forEach(([key, val]) => {
                    if (typeof val !== 'number') return;
                    const statKey = key as keyof WriterStats;
                    const currentVal = newWriterStats[statKey];
                    let gain = val;
                    if (currentVal > 80) gain *= 0.5;
                    newWriterStats[statKey] = Math.min(100, Math.max(0, currentVal + gain));
                });
            }

            const roll = Math.random() * 100;
            if (roll < option.risk) {
                newStats.happiness = Math.max(0, newStats.happiness - 5);
                msg = tr('actions.improve.setbackLog', { label: option.label });
                toastType = tr('actions.improve.minorSetbackTitle');
            } else if (roll > 90) {
                Object.keys(option.gains).forEach(key => {
                    if (key in newStats && key !== 'skills') {
                         (newStats as any)[key] = Math.min(100, (newStats as any)[key] + 1);
                    } else if (key in newStats.skills) {
                         (newStats.skills as any)[key] = Math.min(100, (newStats.skills as any)[key] + 1);
                    }
                });
                if (option.writerGains) {
                    Object.keys(option.writerGains).forEach(key => {
                        const statKey = key as keyof WriterStats;
                        newWriterStats[statKey] = Math.min(100, newWriterStats[statKey] + 1);
                    });
                }
                msg = tr('actions.improve.greatProgressLog', { activityName });
                toastType = tr('actions.improve.greatProgressTitle');
            }

            const newState = {
                ...prev,
                money: prev.money - option.moneyCost,
                stats: newStats,
                writerStats: newWriterStats,
                logs: [...prev.logs, { week: prev.currentWeek, year: prev.age, message: msg, type: 'neutral' as const }].slice(-50)
            };
            spendPlayerEnergy(newState, option.energyCost, `Improve: ${option.label}`);
            
            setToastMessage({ title: toastType, subtext: msg });
            return newState;
        });
    };

    const handlePartnerAction = (relId: string, action: string, eventOutcome: SocialEventOption | null = null) => {
      handleGenericUpdate(prev => {
          const idx = prev.relationships.findIndex(r => r.id === relId);
          if (idx === -1) return prev;
          const partner = prev.relationships[idx];
          if (partner.relation === 'Deceased Parent') {
              setToastMessage({ title: tr('actions.relationship.inMemoryTitle'), subtext: tr('actions.relationship.inMemorySubtext') });
              return prev;
          }
          if (['DATE', 'PROPOSE', 'INTIMACY', 'CLUBBING', 'TRIP', 'ESTATE_DATE', 'YACHT_DATE', 'JET_ESCAPE', 'LUXURY_GIFT'].includes(action) && isFamilyRelation(partner.relation)) {
              setToastMessage({ title: tr('actions.relationship.blockedTitle'), subtext: tr('actions.relationship.familyRomanceBlockedSubtext') });
              return prev;
          }
          
          let logMsg = "";
          let newCloseness = partner.closeness;
          let newRelation: Relationship['relation'] = partner.relation; 
          let energyCost = 0;
          let moneyCost = 0;
          let newRelationships = [...prev.relationships];
          let newsUpdate = [...prev.news];
          let statsUpdate: Partial<Stats> = {};
          let scheduledActivePregnancy: Player['activePregnancy'] | undefined;

          if (action === 'EVENT_RESOLUTION' && eventOutcome) {
              logMsg = eventOutcome.logMessage;
              if (eventOutcome.impact.relationship) newCloseness = Math.min(100, newCloseness + eventOutcome.impact.relationship);
              if (eventOutcome.impact.money) moneyCost = -eventOutcome.impact.money; 
              statsUpdate = { ...eventOutcome.impact };
              delete (statsUpdate as any).relationship;
              delete (statsUpdate as any).money;
          } 
          else {
              const flavorPool = getFlavorTexts(language, action);
              const flavorText = flavorPool.length > 0 ? flavorPool[Math.floor(Math.random() * flavorPool.length)] : "";

	              if (action === 'DATE') {
	                  energyCost = 20; moneyCost = 200; newCloseness = Math.min(100, newCloseness + 10);
	                  logMsg = tr('services.socialEvents.actionLog.DATE', { partnerName: partner.name, flavor: flavorText });
	              } 
	              else if (action === 'CLUBBING') {
	                  energyCost = 40; moneyCost = 500; newCloseness = Math.min(100, newCloseness + 8);
	                  logMsg = tr('services.socialEvents.actionLog.CLUBBING', { partnerName: partner.name, flavor: flavorText });
              }
              else if (action === 'TRIP') {
                  moneyCost = 5000; newCloseness = 100;
                  logMsg = `Luxury vacation with ${partner.name}. Pure bliss.`;
              }
              else if (action === 'ESTATE_DATE') {
                  energyCost = 16; moneyCost = 1200; newCloseness = Math.min(100, newCloseness + 12);
                  logMsg = `Hosted ${partner.name} for a private estate night. Candlelight, privacy, and impossible views shifted the whole mood.`;
              }
              else if (action === 'YACHT_DATE') {
                  energyCost = 18; moneyCost = 2500; newCloseness = Math.min(100, newCloseness + 13);
                  logMsg = `Took ${partner.name} out for a yacht sunset date. The water, the attention, and the luxury made everything feel larger.`;
              }
              else if (action === 'JET_ESCAPE') {
                  energyCost = 10; moneyCost = 9000; newCloseness = Math.min(100, newCloseness + 16);
                  logMsg = `Escaped with ${partner.name} on a private jet for a fast luxury getaway. The flex was obvious and the chemistry loved it.`;
              }
              else if (action === 'LUXURY_GIFT') {
                  energyCost = 4; moneyCost = 8000; newCloseness = Math.min(100, newCloseness + 9);
                  logMsg = `Dropped a serious luxury gift on ${partner.name}. It landed somewhere between romance and extravagant obsession.`;
              }
	              else if (action === 'HANGOUT') {
	                  energyCost = 15; moneyCost = 50; newCloseness = Math.min(100, newCloseness + 5);
	                  logMsg = tr('services.socialEvents.actionLog.HANGOUT', { partnerName: partner.name, flavor: flavorText });
              }
              else if (action === 'PROPOSE') {
                  moneyCost = 5000;
                  if (newCloseness >= 90 && Math.random() > 0.3) {
                      newRelation = 'Spouse'; newCloseness = 100;
                      logMsg = tr('actions.relationship.proposalAcceptedLog', { partnerName: partner.name });
                      setToastMessage({ title: tr('actions.relationship.justMarriedTitle'), subtext: tr('actions.relationship.justMarriedSubtext', { partnerName: partner.name }) });
                  } else {
                      newCloseness -= 20;
                      logMsg = tr('actions.relationship.proposalRejectedLog', { partnerName: partner.name });
                  }
              }
              else if (action === 'INTIMACY') {
                  energyCost = 30; newCloseness = Math.min(100, newCloseness + 5);
                  logMsg = `Intimacy with ${partner.name}.`;
                  const pregnancyCarrier = getPregnancyCarrier(prev.gender, partner.gender);
                  if (pregnancyCarrier === 'NONE') {
                      const feedback = getPregnancyFeedbackCopy('NONE', partner.name, prev);
                      setToastMessage({ title: feedback.title, subtext: feedback.toast });
                      logMsg = feedback.log;
                  } else if (!prev.activePregnancy && Math.random() < 0.15) {
                      const scheduledPregnancy = schedulePregnancy(prev, partner, false);
                      if (scheduledPregnancy.scheduled) {
                          scheduledActivePregnancy = scheduledPregnancy.next.activePregnancy;
                          const feedback = getPregnancyFeedbackCopy(scheduledActivePregnancy?.pregnancyCarrier || 'PARTNER', partner.name, prev);
                          setToastMessage({ title: feedback.title, subtext: feedback.toast });
                          logMsg += ` 🍼 ${feedback.log}`;
                      }
                  }
              }
              else if (['CALL', 'CHECK_IN', 'DEEP_TALK', 'FAMILY_DINNER', 'INDUSTRY_LUNCH', 'GIFT', 'GIFT_THOUGHTFUL', 'GIFT_LUXURY', 'GIFT_APOLOGY', 'GIFT_FAMILY_SUPPORT', 'GIFT_INDUSTRY_FAVOR', 'NETWORK'].includes(action)) {
		                   if (action === 'CALL') { energyCost = 5; newCloseness += 2; logMsg = `Called ${partner.name}.`; }
		                   if (action === 'CHECK_IN') {
		                       energyCost = 3;
		                       newCloseness += 1;
		                       logMsg = `Sent ${partner.name} a quick check-in. Small contact, but it kept the bond alive.`;
		                   }
		                   if (action === 'DEEP_TALK') {
		                       energyCost = 12;
		                       newCloseness += 4;
		                       logMsg = `Had a real conversation with ${partner.name}. It helped the relationship feel less neglected.`;
		                   }
		                   if (action === 'FAMILY_DINNER') {
		                       energyCost = 18;
		                       moneyCost = prev.stats.fame > 75 ? 1500 : 800;
		                       newCloseness += 7;
		                       logMsg = `Made time for a family dinner with ${partner.name}. It felt grounded and needed.`;
		                   }
		                   if (action === 'INDUSTRY_LUNCH') {
		                       energyCost = 18;
		                       moneyCost = prev.stats.fame > 75 ? 2500 : 1200;
		                       newCloseness += 6;
		                       statsUpdate = { ...statsUpdate, reputation: 1 };
		                       logMsg = `Took ${partner.name} for an industry lunch. Good taste, no hard sell, and the connection warmed up.`;
		                   }
		                   if (action === 'GIFT') { moneyCost = 250; newCloseness += 5; logMsg = `Sent gift to ${partner.name}.`; }
	                   if (action === 'GIFT_THOUGHTFUL') {
	                       moneyCost = prev.stats.fame > 75 ? 1400 : 175;
	                       newCloseness += 4;
	                       logMsg = `Sent ${partner.name} a thoughtful gift that felt personal instead of showy.`;
	                   }
	                   if (action === 'GIFT_APOLOGY') {
	                       moneyCost = prev.stats.fame > 75 ? 3600 : 600;
	                       newCloseness += partner.closeness < 45 ? 9 : 6;
	                       logMsg = `Sent ${partner.name} an apology gift with a private note. It helped repair the mood.`;
	                   }
	                   if (action === 'GIFT_FAMILY_SUPPORT') {
	                       moneyCost = prev.stats.fame > 75 ? 8000 : 2500;
	                       newCloseness += 9;
	                       logMsg = `Quietly supported ${partner.name} with family money. It felt more meaningful than flashy.`;
	                   }
	                   if (action === 'GIFT_INDUSTRY_FAVOR') {
	                       moneyCost = prev.stats.fame > 75 ? 10000 : 5000;
	                       newCloseness += 8;
	                       statsUpdate = { ...statsUpdate, reputation: 1 };
	                       logMsg = `Sent ${partner.name} an industry-friendly gift and kept the professional door warm.`;
	                   }
	                   if (action === 'GIFT_LUXURY') {
	                       moneyCost = prev.stats.fame > 75 ? 16000 : 8000;
	                       newCloseness += partner.relation === 'Partner' || partner.relation === 'Spouse' ? 11 : 8;
	                       logMsg = `Sent ${partner.name} a luxury gift. Expensive, obvious, and hard to ignore.`;
	                   }
	                   if (action === 'NETWORK') { energyCost = 25; newCloseness += 5; logMsg = `Networked with ${partner.name}.`; }
	              }
          }

          if (prev.money < moneyCost || prev.energy.current < energyCost) return prev; 

          const newPlayerStats = { ...prev.stats };
          // Apply all stats from statsUpdate generically, capping appropriately
          (Object.keys(statsUpdate) as (keyof Stats)[]).forEach(key => {
              if (typeof newPlayerStats[key] === 'number') {
                  const current = newPlayerStats[key] as number;
                  const delta = statsUpdate[key] as number;
                  if (key === 'followers') {
                      (newPlayerStats as any)[key] = Math.max(0, current + delta);
                  } else if (key !== 'genreXP' && key !== 'skills') {
                      (newPlayerStats as any)[key] = Math.min(100, Math.max(0, current + delta));
                  }
              }
          });

          if ((eventOutcome?.impact as any)?.money) {
              moneyCost -= (eventOutcome?.impact as any).money; 
          }

	          newRelationships[idx] = { ...partner, closeness: Math.max(0, Math.min(100, newCloseness)), relation: newRelation, lastInteractionWeek: prev.currentWeek, lastInteractionAbsolute: getAbsoluteWeek(prev.age, prev.currentWeek) };

          const nextState = {
              ...prev,
              money: prev.money - moneyCost,
              stats: newPlayerStats,
              activePregnancy: scheduledActivePregnancy || prev.activePregnancy,
              relationships: newRelationships,
              news: newsUpdate,
              logs: [...prev.logs, { week: prev.currentWeek, year: prev.age, message: logMsg, type: 'positive' as const }].slice(-50)
          };
          if (action === 'ESTATE_DATE') {
              pushLifestyleHeadline(
                  nextState,
                  tr('actions.generated.estateDate.headline', { name: prev.name }),
                  tr('actions.generated.estateDate.subtext', { partnerName: partner.name })
              );
          } else if (action === 'YACHT_DATE') {
              pushLifestyleHeadline(
                  nextState,
                  tr('actions.generated.yachtDate.headline', { name: prev.name, partnerName: partner.name }),
                  tr('actions.generated.yachtDate.subtext')
              );
          } else if (action === 'JET_ESCAPE') {
              pushLifestyleHeadline(
                  nextState,
                  tr('actions.generated.jetEscape.headline', { name: prev.name, partnerName: partner.name }),
                  tr('actions.generated.jetEscape.subtext')
              );
          } else if (action === 'LUXURY_GIFT') {
              pushLifestyleHeadline(
                  nextState,
                  tr('actions.generated.luxuryGift.headline', { name: prev.name, partnerName: partner.name }),
                  tr('actions.generated.luxuryGift.subtext')
              );
          }
          spendPlayerEnergy(nextState, energyCost, logMsg || `Social: ${action}`);
          return nextState;
          
      });
    };

    const handleSocialInteract = (id: string, type: SocialInteractionType) => {
        const partner = player.relationships.find(r => r.id === id);
        if (partner?.relation === 'Pet' && ['PET_FEED', 'PET_PLAY', 'PET_GROOM', 'PET_VET'].includes(type)) {
            const action = type as 'PET_FEED' | 'PET_PLAY' | 'PET_GROOM' | 'PET_VET';
            setPlayer(prev => {
                const idx = prev.relationships.findIndex(rel => rel.id === id && rel.relation === 'Pet');
                if (idx === -1) return prev;
                const pet = prev.relationships[idx];
                const multiplier = pet.petRarity === 'endangered' ? 8
                    : pet.petRarity === 'exotic' ? 4
                    : pet.petRarity === 'premium' ? 2
                    : 1;
                const config = {
                    PET_FEED: { label: tr('actions.pet.feed.label'), logKey: 'actions.pet.feed.log', cost: Math.round(150 * multiplier), energy: 4, closeness: 4, health: 0.2, happiness: 0.4, reputation: 0 },
                    PET_PLAY: { label: tr('actions.pet.play.label'), logKey: 'actions.pet.play.log', cost: 0, energy: 10, closeness: 7, health: 0.2, happiness: 1, reputation: 0 },
                    PET_GROOM: { label: tr('actions.pet.groom.label'), logKey: 'actions.pet.groom.log', cost: Math.round(450 * multiplier), energy: 5, closeness: 5, health: 0, happiness: 0.5, reputation: pet.petRarity === 'endangered' ? 0.3 : 0 },
                    PET_VET: { label: tr('actions.pet.vet.label'), logKey: 'actions.pet.vet.log', cost: Math.round(1200 * multiplier), energy: 3, closeness: 6, health: 1, happiness: 0.4, reputation: pet.petRarity === 'endangered' ? 0.5 : 0 },
                }[action];

                if (prev.money < config.cost) {
                    setToastMessage({ title: tr('actions.pet.notEnoughCashTitle'), subtext: tr('actions.pet.notEnoughCashSubtext', { label: config.label, cost: config.cost.toLocaleString() }) });
                    return prev;
                }
                if (prev.energy.current < config.energy) {
                    setToastMessage({ title: tr('actions.pet.notEnoughEnergyTitle'), subtext: tr('actions.pet.notEnoughEnergySubtext') });
                    return prev;
                }

                const relationships = [...prev.relationships];
                relationships[idx] = {
                    ...pet,
                    closeness: Math.min(100, (pet.closeness || 0) + config.closeness),
                    lastInteractionWeek: prev.currentWeek,
                    lastInteractionAbsolute: getAbsoluteWeek(prev.age, prev.currentWeek),
                };
                const nextState = {
                    ...prev,
                    money: Math.max(0, prev.money - config.cost),
                    stats: {
                        ...prev.stats,
                        happiness: Math.min(100, Math.max(0, prev.stats.happiness + config.happiness)),
                        health: Math.min(100, Math.max(0, prev.stats.health + config.health)),
                        reputation: Math.min(100, Math.max(0, prev.stats.reputation + config.reputation)),
                    },
                    relationships,
                    logs: [
                        ...prev.logs,
                        {
                            week: prev.currentWeek,
                            year: prev.age,
                            message: `${pet.petEmoji || '🐾'} ${tr(config.logKey, { petName: pet.name })}`,
                            type: 'positive' as const,
                        },
                    ].slice(-50),
                };
                spendPlayerEnergy(nextState, config.energy, `Pet care: ${config.label}`);
                setToastMessage({ title: config.label, subtext: tr('actions.pet.bondImprovedSubtext', { petName: pet.name }) });
                return nextState;
            });
            return;
        }
        if (partner?.relation === 'Pet') {
            setToastMessage({ title: tr('actions.pet.careTitle'), subtext: tr('actions.pet.careSubtext') });
            return;
        }
        if (type === 'BREAK_UP') {
            setPlayer(prev => applyPartnerBreakup(prev, id));
            setToastMessage({ title: tr('actions.relationship.breakupTitle'), subtext: tr('actions.relationship.breakupSubtext') });
            return;
        }
        if (type === 'DIVORCE_SETTLE') {
            setPlayer(prev => applyDivorceOutcome(prev, id, 'SETTLE'));
            setToastMessage({ title: tr('actions.relationship.divorceSettledTitle'), subtext: tr('actions.relationship.divorceSettledSubtext') });
            return;
        }
        if (type === 'DIVORCE_FIGHT_BUDGET' || type === 'DIVORCE_FIGHT_ESTABLISHED' || type === 'DIVORCE_FIGHT_ELITE') {
            const lawyerTier = type === 'DIVORCE_FIGHT_ELITE' ? 'ELITE' : type === 'DIVORCE_FIGHT_ESTABLISHED' ? 'ESTABLISHED' : 'BUDGET';
            setPlayer(prev => applyDivorceOutcome(prev, id, 'FIGHT', lawyerTier));
            setToastMessage({ title: tr('actions.relationship.courtFightTitle'), subtext: tr('actions.relationship.courtFightSubtext', { lawyerTier: lawyerTier.toLowerCase() }) });
            return;
        }
        if (type === 'ABANDON_CHILD') {
            setPlayer(prev => applyParenthoodAbandonment(prev, { childId: id }));
            setToastMessage({ title: tr('actions.relationship.childAbandonedTitle'), subtext: tr('actions.relationship.childAbandonedSubtext') });
            return;
        }
        if (type === 'RECONNECT_CHILD') {
            setPlayer(prev => reconnectWithChild(prev, id));
            setToastMessage({ title: tr('actions.relationship.reconnectionTitle'), subtext: tr('actions.relationship.reconnectionSubtext') });
            return;
        }
        if (partner && ['DATE', 'PROPOSE', 'INTIMACY', 'CLUBBING', 'TRIP', 'ESTATE_DATE', 'YACHT_DATE', 'JET_ESCAPE', 'LUXURY_GIFT'].includes(type) && isFamilyRelation(partner.relation)) {
            setToastMessage({ title: tr('actions.relationship.blockedTitle'), subtext: tr('actions.relationship.familyRomanceBlockedSubtext') });
            return;
        }
        if (type === 'ESTATE_DATE' && !hasOwnedPremiumAssetInCollection(player, 'bundle_luxury_homes')) {
            setToastMessage({ title: tr('actions.relationship.lockedTitle'), subtext: tr('actions.relationship.lockedHomeSubtext') });
            return;
        }
        if ((type === 'YACHT_DATE' || type === 'JET_ESCAPE') && !hasOwnedPremiumAssetInCollection(player, 'bundle_sky_sea')) {
            setToastMessage({ title: tr('actions.relationship.lockedTitle'), subtext: tr('actions.relationship.lockedSkySeaSubtext') });
            return;
        }
        if (type === 'LUXURY_GIFT' && !hasOwnedPremiumAssetInCollection(player, 'bundle_ultimate_lifestyle')) {
            setToastMessage({ title: tr('actions.relationship.lockedTitle'), subtext: tr('actions.relationship.lockedUltimateSubtext') });
            return;
        }
        if (type === 'INTIMACY') {
            if (partner) {
                const declineReason = getIntimacyDeclineReason(player, partner);
                if (declineReason) {
                    recordIntimacyDecline(id, declineReason);
                    return;
                }
            }
            if (partner && partner.relation !== 'Spouse') {
                setShowProtectionPrompt({ partnerId: id, partnerName: partner.name });
                return;
            }
        }
        if (['DATE', 'CLUBBING', 'HANGOUT'].includes(type) && Math.random() < 0.4) {
            const potentialEvents = getSocialEvents(language, type);
            if (potentialEvents && potentialEvents.length > 0) {
                const evt = potentialEvents[Math.floor(Math.random() * potentialEvents.length)];
                setActiveSocialEvent({ 
                    event: { id: `soc_evt_${Date.now()}`, title: evt.title, description: evt.desc, options: evt.options }, 
                    partnerId: id 
                });
                return;
            }
        }
        handlePartnerAction(id, type, null); 
    };

    const handleIntimacyChoice = (choice: 'PROTECTED' | 'UNPROTECTED', partnerId: string) => {
      handleGenericUpdate(prev => {
          const idx = prev.relationships.findIndex(r => r.id === partnerId);
          if (idx === -1) return prev;
          const partner = prev.relationships[idx];
          
          const energyCost = 30;
          let newCloseness = Math.min(100, partner.closeness + 5);
          let logMsg = `Spent intimate time with ${partner.name}.`;
          let newsUpdate: NewsItem[] = [...prev.news];
          let newRels: Relationship[] = [...prev.relationships];
          let scheduledActivePregnancy: Player['activePregnancy'] | undefined;

          const chance = choice === 'UNPROTECTED' ? 0.3 : 0.01;
          
          const pregnancyCarrier = getPregnancyCarrier(prev.gender, partner.gender);

          if (pregnancyCarrier === 'NONE') {
              const feedback = getPregnancyFeedbackCopy('NONE', partner.name, prev);
              setToastMessage({ title: feedback.title, subtext: feedback.toast });
              logMsg = feedback.log;
          } else if (!prev.activePregnancy && Math.random() < chance) {
              const scheduledPregnancy = schedulePregnancy(prev, partner, partner.relation !== 'Spouse' && prev.stats.fame > 20);
              if (scheduledPregnancy.scheduled) {
                  scheduledActivePregnancy = scheduledPregnancy.next.activePregnancy;
                  const feedback = getPregnancyFeedbackCopy(scheduledActivePregnancy?.pregnancyCarrier || 'PARTNER', partner.name, prev);
                  setToastMessage({ title: feedback.title, subtext: feedback.toast });
                  logMsg += ` 🍼 ${feedback.log}`;
              }
          }

          newRels[idx] = { ...partner, closeness: newCloseness, lastInteractionWeek: prev.currentWeek, lastInteractionAbsolute: getAbsoluteWeek(prev.age, prev.currentWeek) };

          const nextState = {
              ...prev,
              activePregnancy: scheduledActivePregnancy || prev.activePregnancy,
              relationships: newRels,
              news: newsUpdate,
              logs: [...prev.logs, { week: prev.currentWeek, year: prev.age, message: logMsg, type: 'positive' as const }].slice(-50)
          };
          spendPlayerEnergy(nextState, energyCost, `Relationship: Intimacy with ${partner.name}`);
          return nextState;
      });
    };

    const handleNPCInteract = (npc: NPCActor, type: InteractionType) => {
        handleGenericUpdate(prev => {
            const res = calculateInteraction(prev, npc, type);
            if (prev.energy.current < res.energyCost) {
                setToastMessage({ title: tr('actions.npc.notEnoughEnergyTitle'), subtext: tr('actions.npc.notEnoughEnergySubtext', { energy: res.energyCost.toString() }) });
                return prev;
            }

            const oldState = prev.instagram.npcStates[npc.id] || { 
                npcId: npc.id, 
                isFollowing: false, 
                isFollowedBy: false, 
                relationshipScore: 0, 
                relationshipLevel: 'Stranger',
                lastInteractionWeek: prev.currentWeek,
                hasMet: false,
                chatHistory: [] 
            };

            const newScore = Math.min(100, Math.max(0, oldState.relationshipScore + res.relationshipDelta));
            
            // Add to chat history
            const newChat = [...(oldState.chatHistory || [])];
            if (res.playerText) newChat.push({ sender: 'PLAYER', text: res.playerText, timestamp: Date.now() });
            if (res.npcText) newChat.push({ sender: 'NPC', text: res.npcText, timestamp: Date.now() });
            if (newChat.length > 20) newChat.splice(0, newChat.length - 20);

            const newState: NPCState = {
                ...oldState,
                relationshipScore: newScore,
                chatHistory: newChat,
                lastInteractionWeek: prev.currentWeek,
                hasMet: res.isBefriended ? true : oldState.hasMet,
                isFollowing: res.isFollowing
            };

            let followerGain = 0;
            if (!oldState.isFollowing && newState.isFollowing) {
                // NPC just followed player!
                followerGain = Math.floor(npc.stats.fame * 100 * (0.01 + Math.random() * 0.02));
                setToastMessage({ title: tr('actions.npc.newFollowerTitle'), subtext: tr('actions.npc.newFollowerSubtext', { npcName: npc.name, followerGain: followerGain.toString() }) });
            }

            let updatedRelationships = [...prev.relationships];
            if (res.isBefriended && !prev.relationships.some(r => r.npcId === npc.id)) {
                updatedRelationships.push({
                    id: `rel_${npc.id}_${Date.now()}`,
                    name: npc.name,
                    relation: npc.occupation === 'DIRECTOR' ? 'Director' : 'Connection',
                    closeness: newScore,
                    image: npc.avatar,
                    lastInteractionWeek: prev.currentWeek,
                    npcId: npc.id
                });
                setToastMessage({ title: tr('actions.npc.newConnectionTitle'), subtext: tr('actions.npc.newConnectionSubtext', { npcName: npc.name }) });
            } else if (res.success) {
                // Update closeness if already in relationships
                updatedRelationships = updatedRelationships.map(r => 
                    r.npcId === npc.id ? { ...r, closeness: newScore, lastInteractionWeek: prev.currentWeek } : r
                );
            }

            if (res.relationshipDelta > 0 && !res.isBefriended) {
                setToastMessage({ title: tr('actions.npc.relationshipImprovedTitle'), subtext: tr('actions.npc.relationshipImprovedSubtext', { npcName: npc.name, delta: res.relationshipDelta.toString() }) });
            }

            const nextState = { 
                ...prev, 
                instagram: {
                    ...prev.instagram,
                    followers: prev.instagram.followers + followerGain,
                    npcStates: {
                        ...prev.instagram.npcStates,
                        [npc.id]: newState
                    }
                },
                relationships: updatedRelationships
            };
            spendPlayerEnergy(nextState, res.energyCost, `Networking: ${npc.name}`);
            return nextState; 
        });
    };

    return {
        handleGenericUpdate,
        handleRehearse,
        handleOwnedProductionFocus,
        handlePromotionAction,
        handleImproveAction,
        handlePartnerAction,
        handleSocialInteract,
        handleIntimacyChoice,
        handleNPCInteract,
    };
};
