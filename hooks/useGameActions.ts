
import React, { useState } from 'react';
import { Player, Commitment, LogEntry, InstaPost, XPost, NewsItem, Stats, ImprovementOption, SocialEventOption, SocialEvent, Relationship, SponsorshipActionType, Message, AuditionOpportunity, NegotiationData, ScheduledEvent, PressInteraction, WriterStats, NPCActor, InteractionType, NPCState } from '../types';
import { calculateAuditionGain, calculateProductionGain, generateReleasePressQuestions, rewardGenreExperience } from '../services/roleLogic';
import { calculateInteraction, getGenderedAvatar } from '../services/npcLogic';
import { SOCIAL_EVENTS_DB, FLAVOR_TEXTS } from '../services/socialEvents';
import { createBusiness } from '../services/businessLogic';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { spendPlayerEnergy } from '../services/premiumLogic';
import { applyParenthoodAbandonment, applyPartnerBreakup, applyDivorceOutcome, reconnectWithChild } from '../services/familyLogic';

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
        babyGender: 'MALE' | 'FEMALE';
        suggestedFirstName: string;
        birthWeekAbsolute: number;
        eventWeek: number;
        eventYear: number;
        shouldCreateScandalNews: boolean;
    } | null) => void;
}

export const useGameActions = ({ player, setPlayer, setToastMessage, setActivePressEvent, setShowProtectionPrompt, setActiveSocialEvent, setPendingBabyNaming }: GameActionsProps) => {
    const familyRelations: Relationship['relation'][] = ['Parent', 'Deceased Parent', 'Sibling', 'Child'];
    const isFamilyRelation = (relation?: Relationship['relation']) => !!relation && familyRelations.includes(relation);
    
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
                spendPlayerEnergy(newState, 10);
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
               spendPlayerEnergy(newState, 20);
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
               spendPlayerEnergy(newState, 20);
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
                    spendPlayerEnergy(next, energyCost);
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
            spendPlayerEnergy(newState, energyCost);
            return newState;
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
                spendPlayerEnergy(newPlayer, energy);
                rewardGenreExperience(newPlayer, genre, 1);
                newPlayer.logs.push({
                    week: prev.currentWeek, year: prev.age, 
                    message: `Practiced ${genre} techniques. Skill improved.`, type: 'neutral'
                });
                newPlayer.logs = newPlayer.logs.slice(-50);
                setToastMessage({ title: "Genre Training", subtext: `${genre} proficiency increased.` });
                return newPlayer;
            }

            const newStats = { ...prev.stats, skills: { ...prev.stats.skills } };
            const newWriterStats = prev.writerStats ? { ...prev.writerStats } : { creativity: 0, dialogue: 0, structure: 0 };
            let msg = `You completed ${option.label}.`;
            let toastType = "Activity Complete";
            
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
                msg = `Ouch! ${option.label} was tough. You feel drained.`;
                toastType = "Minor Setback";
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
                msg = `Amazing session at ${activityName}! Feeling unstoppable.`;
                toastType = "Great Progress!";
            }

            const newState = {
                ...prev,
                money: prev.money - option.moneyCost,
                stats: newStats,
                writerStats: newWriterStats,
                logs: [...prev.logs, { week: prev.currentWeek, year: prev.age, message: msg, type: 'neutral' as const }].slice(-50)
            };
            spendPlayerEnergy(newState, option.energyCost);
            
            setToastMessage({ title: toastType, subtext: msg });
            return newState;
        });
    };

    const handlePartnerAction = (relId: string, action: string, eventOutcome: SocialEventOption | null = null) => {
      handleGenericUpdate(prev => {
          const idx = prev.relationships.findIndex(r => r.id === relId);
          if (idx === -1) return prev;
          const partner = prev.relationships[idx];
          if (['DATE', 'PROPOSE', 'INTIMACY', 'CLUBBING', 'TRIP'].includes(action) && isFamilyRelation(partner.relation)) {
              setToastMessage({ title: "Blocked", subtext: "Family members cannot be used for romantic actions." });
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

          if (action === 'EVENT_RESOLUTION' && eventOutcome) {
              logMsg = eventOutcome.logMessage;
              if (eventOutcome.impact.relationship) newCloseness = Math.min(100, newCloseness + eventOutcome.impact.relationship);
              if (eventOutcome.impact.money) moneyCost = -eventOutcome.impact.money; 
              statsUpdate = { ...eventOutcome.impact };
              delete (statsUpdate as any).relationship;
              delete (statsUpdate as any).money;
          } 
          else {
              const flavorPool = FLAVOR_TEXTS[action] || [];
              const flavorText = flavorPool.length > 0 ? flavorPool[Math.floor(Math.random() * flavorPool.length)] : "";

              if (action === 'DATE') {
                  energyCost = 20; moneyCost = 200; newCloseness = Math.min(100, newCloseness + 10);
                  logMsg = `Went on a date with ${partner.name}. ${flavorText}`;
              } 
              else if (action === 'CLUBBING') {
                  energyCost = 40; moneyCost = 500; newCloseness = Math.min(100, newCloseness + 8);
                  logMsg = `Partied with ${partner.name}. ${flavorText}`;
              }
              else if (action === 'TRIP') {
                  moneyCost = 5000; newCloseness = 100;
                  logMsg = `Luxury vacation with ${partner.name}. Pure bliss.`;
              }
              else if (action === 'HANGOUT') {
                  energyCost = 15; moneyCost = 50; newCloseness = Math.min(100, newCloseness + 5);
                  logMsg = `Hung out with ${partner.name}. ${flavorText}`;
              }
              else if (action === 'PROPOSE') {
                  moneyCost = 5000;
                  if (newCloseness >= 90 && Math.random() > 0.3) {
                      newRelation = 'Spouse'; newCloseness = 100;
                      logMsg = `💍 Proposed to ${partner.name}... YES! You are now married.`;
                      setToastMessage({ title: "Just Married!", subtext: `Congratulations to you and ${partner.name}!` });
                  } else {
                      newCloseness -= 20;
                      logMsg = `Proposed to ${partner.name}, but they said it's too soon.`;
                  }
              }
              else if (action === 'INTIMACY') {
                  energyCost = 30; newCloseness = Math.min(100, newCloseness + 5);
                  logMsg = `Intimacy with ${partner.name}.`;
                  if (Math.random() < 0.15) {
                      const babyGender = Math.random() > 0.5 ? 'MALE' : 'FEMALE';
                      const babyName = babyGender === 'MALE' ? 'Leo' : 'Mia';
                      setPendingBabyNaming({
                          partnerId: partner.id,
                          partnerName: partner.name,
                          babyGender,
                          suggestedFirstName: babyName,
                          birthWeekAbsolute: getAbsoluteWeek(prev.age, prev.currentWeek),
                          eventWeek: prev.currentWeek,
                          eventYear: prev.age,
                          shouldCreateScandalNews: false,
                      });
                      logMsg += ` 🍼 A new baby is on the way.`;
                  }
              }
              else if (['CALL', 'GIFT', 'NETWORK'].includes(action)) {
                   if (action === 'CALL') { energyCost = 5; newCloseness += 2; logMsg = `Called ${partner.name}.`; }
                   if (action === 'GIFT') { moneyCost = 250; newCloseness += 5; logMsg = `Sent gift to ${partner.name}.`; }
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

          newRelationships[idx] = { ...partner, closeness: newCloseness, relation: newRelation, lastInteractionWeek: prev.currentWeek, lastInteractionAbsolute: getAbsoluteWeek(prev.age, prev.currentWeek) };

          const nextState = {
              ...prev,
              money: prev.money - moneyCost,
              stats: newPlayerStats,
              relationships: newRelationships,
              news: newsUpdate,
              logs: [...prev.logs, { week: prev.currentWeek, year: prev.age, message: logMsg, type: 'positive' as const }].slice(-50)
          };
          spendPlayerEnergy(nextState, energyCost);
          return nextState;
          
      });
    };

    const handleSocialInteract = (id: string, type: 'CALL' | 'HANGOUT' | 'GIFT' | 'NETWORK' | 'DATE' | 'PROPOSE' | 'INTIMACY' | 'CLUBBING' | 'TRIP' | 'ABANDON_CHILD' | 'RECONNECT_CHILD' | 'BREAK_UP' | 'DIVORCE_SETTLE' | 'DIVORCE_FIGHT_BUDGET' | 'DIVORCE_FIGHT_ESTABLISHED' | 'DIVORCE_FIGHT_ELITE') => {
        const partner = player.relationships.find(r => r.id === id);
        if (type === 'BREAK_UP') {
            setPlayer(prev => applyPartnerBreakup(prev, id));
            setToastMessage({ title: "Breakup Finalized", subtext: "The relationship is over, and any family fallout now follows you." });
            return;
        }
        if (type === 'DIVORCE_SETTLE') {
            setPlayer(prev => applyDivorceOutcome(prev, id, 'SETTLE'));
            setToastMessage({ title: "Divorce Settled", subtext: "The split is done. The financial aftermath starts now." });
            return;
        }
        if (type === 'DIVORCE_FIGHT_BUDGET' || type === 'DIVORCE_FIGHT_ESTABLISHED' || type === 'DIVORCE_FIGHT_ELITE') {
            const lawyerTier = type === 'DIVORCE_FIGHT_ELITE' ? 'ELITE' : type === 'DIVORCE_FIGHT_ESTABLISHED' ? 'ESTABLISHED' : 'BUDGET';
            setPlayer(prev => applyDivorceOutcome(prev, id, 'FIGHT', lawyerTier));
            setToastMessage({ title: "Court Fight Resolved", subtext: `The divorce battle is over. ${lawyerTier.toLowerCase()} counsel changed the stakes.` });
            return;
        }
        if (type === 'ABANDON_CHILD') {
            setPlayer(prev => applyParenthoodAbandonment(prev, { childId: id }));
            setToastMessage({ title: "Child Abandoned", subtext: "Your choice will carry financial and social consequences." });
            return;
        }
        if (type === 'RECONNECT_CHILD') {
            setPlayer(prev => reconnectWithChild(prev, id));
            setToastMessage({ title: "Reconnection Started", subtext: "Repairing family damage will take time, but the first step is made." });
            return;
        }
        if (partner && ['DATE', 'PROPOSE', 'INTIMACY', 'CLUBBING', 'TRIP'].includes(type) && isFamilyRelation(partner.relation)) {
            setToastMessage({ title: "Blocked", subtext: "Family members cannot be used for romantic actions." });
            return;
        }
        if (type === 'INTIMACY') {
            if (partner && partner.relation !== 'Spouse') {
                setShowProtectionPrompt({ partnerId: id, partnerName: partner.name });
                return;
            }
        }
        if (['DATE', 'CLUBBING', 'HANGOUT'].includes(type) && Math.random() < 0.4) {
            const potentialEvents = SOCIAL_EVENTS_DB[type];
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

          const chance = choice === 'UNPROTECTED' ? 0.3 : 0.01;
          
          if (Math.random() < chance) {
              const babyGender = Math.random() > 0.5 ? 'MALE' : 'FEMALE';
              const babyName = babyGender === 'MALE' ? 'Leo' : 'Mia';
              setPendingBabyNaming({
                  partnerId: partner.id,
                  partnerName: partner.name,
                  babyGender,
                  suggestedFirstName: babyName,
                  birthWeekAbsolute: getAbsoluteWeek(prev.age, prev.currentWeek),
                  eventWeek: prev.currentWeek,
                  eventYear: prev.age,
                  shouldCreateScandalNews: partner.relation !== 'Spouse' && prev.stats.fame > 20,
              });
              logMsg += ` 🍼 You and ${partner.name} welcomed a new baby.`;
          }

          newRels[idx] = { ...partner, closeness: newCloseness, lastInteractionWeek: prev.currentWeek, lastInteractionAbsolute: getAbsoluteWeek(prev.age, prev.currentWeek) };

          const nextState = {
              ...prev,
              relationships: newRels,
              news: newsUpdate,
              logs: [...prev.logs, { week: prev.currentWeek, year: prev.age, message: logMsg, type: 'positive' as const }].slice(-50)
          };
          spendPlayerEnergy(nextState, energyCost);
          return nextState;
      });
    };

    const handleNPCInteract = (npc: NPCActor, type: InteractionType) => {
        handleGenericUpdate(prev => {
            const res = calculateInteraction(prev, npc, type);
            if (prev.energy.current < res.energyCost) {
                setToastMessage({ title: "Not Enough Energy", subtext: `You need ${res.energyCost} energy for this.` });
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
                setToastMessage({ title: "New Follower!", subtext: `${npc.name} started following you! (+${followerGain} followers)` });
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
                setToastMessage({ title: "New Connection!", subtext: `${npc.name} is now in your network.` });
            } else if (res.success) {
                // Update closeness if already in relationships
                updatedRelationships = updatedRelationships.map(r => 
                    r.npcId === npc.id ? { ...r, closeness: newScore, lastInteractionWeek: prev.currentWeek } : r
                );
            }

            if (res.relationshipDelta > 0 && !res.isBefriended) {
                setToastMessage({ title: "Relationship Improved", subtext: `Your bond with ${npc.name} increased! (+${res.relationshipDelta})` });
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
            spendPlayerEnergy(nextState, res.energyCost);
            return nextState; 
        });
    };

    return {
        handleGenericUpdate,
        handleRehearse,
        handlePromotionAction,
        handleImproveAction,
        handlePartnerAction,
        handleSocialInteract,
        handleIntimacyChoice,
        handleNPCInteract,
    };
};
