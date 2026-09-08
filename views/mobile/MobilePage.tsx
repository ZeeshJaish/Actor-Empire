
import React, { useEffect, useState } from 'react';
import { Player, Commitment, InstaPostType, NPCActor, InteractionType, Agent, Manager, Message, SponsorshipActionType, AuditionOpportunity, DatingMatch, InstaPost, Relationship, SponsorshipOffer, NegotiationData, ContractFilm, YoutubeBrandDeal, YoutubeCollabOffer, YoutubeMusicVideoFeatureOffer, PregnancyCarrier } from '../../types';
import { MessageSquare, Search, BarChart3, Camera, Users, Newspaper, TrendingUp, Activity, Heart, Folder, Flame, Gem, Landmark, X, CheckCircle, AlertCircle, BookOpen, Map } from 'lucide-react';
import { getPhaseDuration } from '../../services/roleLogic';

// Import sub-apps
import { InstagramApp } from './InstagramApp';
import { BoxOfficeApp } from './BoxOfficeApp';
import { CastLinkApp } from './CastLinkApp';
import { MessagesApp } from './MessagesApp';
import { TeamApp } from './TeamApp';
import { NewsApp } from './NewsApp';
import { ImdbApp } from './ImdbApp';
import { ForbesApp } from './ForbesApp';
import { StocksApp } from './StocksApp';
import { DatingFolder } from './DatingFolder';
import { SocialFolder } from './SocialFolder';
import { TinderApp } from './TinderApp';
import { LuxeApp } from './LuxeApp';
import { BankApp } from './BankApp';
import { XApp } from './XApp';
import { YoutubeApp } from './YoutubeApp';
import { GuideView } from '../../components/GuideView'; // Imported GuideView
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { spendPlayerEnergy } from '../../services/premiumLogic';
import { normalizeUniverseMap } from '../../services/universeLogic';
import { getPlayerLanguage, t } from '../../services/i18n';
import { applyOpportunityIdentityToProject } from '../../services/characterIdentityLogic';
import { PHASE_ONE_ENERGY_COSTS } from '../../services/energyCosts';
import { resolveShareholderVote } from '../../services/shareholderVoting';
import { addBreadcrumb, markTraceAction, setCrashContext, setCurrentGameScreen } from '../../services/firebaseService';
import { acceptPlatformAiPlayerCommission, declinePlatformAiPlayerCommission } from '../../services/platformAi';

type MobileAppMode = 'HOME' | 'CASTLINK' | 'IMDB' | 'BOXOFFICE' | 'INSTAGRAM' | 'X' | 'YOUTUBE' | 'NEWS' | 'TEAM' | 'MESSAGES' | 'FORBES' | 'STOCKS' | 'DATING_FOLDER' | 'SOCIAL_FOLDER' | 'TINDER' | 'LUXE' | 'BANK' | 'GUIDE';

// Helper Component for App Icon
const AppIcon = ({ icon, color, label, onClick, badge, customContent, customBg, tutorialId }: any) => (
    <div className="relative flex w-16 flex-col items-center gap-1 group cursor-pointer" onClick={onClick} data-tutorial-id={tutorialId}>
        <div className={`w-14 h-14 ${customBg || color} rounded-2xl flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform relative overflow-hidden`}>
            {customContent ? customContent : icon}
        </div>
        {badge > 0 && (
            <div className="absolute -top-1 right-1 z-20 min-w-5 h-5 px-1 bg-red-500 rounded-full border-2 border-zinc-900 flex items-center justify-center text-[10px] leading-none font-black text-white shadow-lg">
                {badge > 9 ? '9+' : badge}
            </div>
        )}
        <span className="text-[10px] text-white font-medium drop-shadow-md">{label}</span>
    </div>
);

interface MobilePageProps {
  player?: Player;
  onAudition?: (opportunity: AuditionOpportunity) => void;
  onTakeJob?: (job: Commitment) => void;
  onQuitJob?: (id: string) => void;
  onPost?: (type: InstaPostType, caption: string, image?: string, campaignParticipation?: { campaignId: string; mode: 'JOIN' | 'THANK' }, promotedProjectId?: string) => void;
  onReactInstagramPost?: (postId: string, action: 'LIKE' | 'SAVE') => void;
  onRespondInstagramDM?: (npc: NPCActor, actionId: string, accepted: boolean) => void;
  onFollowNPC?: (npc: NPCActor) => void;
  onInteractNPC?: (npc: NPCActor, type: InteractionType) => void;
  onBefriendNPC?: (npc: NPCActor) => void;
  onHireAgent?: (agent: Agent) => void;
  onFireAgent?: () => void;
  onHireManager?: (manager: Manager) => void;
  onFireManager?: () => void;
  onAcceptMessage?: (msg: Message) => void;
  onPerformSponsorship?: (sponId: string, action: SponsorshipActionType) => void;
  onDeleteMessage?: (id: string) => void;
  onTradeStock?: (stockId: string, amount: number) => void;
  onUpdatePlayer?: (player: Player) => void;
  onOpenRightsMarket?: (opportunityId?: string) => void;
  onOpenStreamingContentOffer?: (offerId: string) => void;
  onOpenStudioContinuation?: (studioId?: string, scriptId?: string) => void;
  onOpenPlatformCommission?: (studioId: string, offerId: string) => void;
  onNavVisibilityChange?: (visible: boolean) => void;
  onFullBleedChange?: (enabled: boolean) => void;
  initialForbesStudioId?: string;
  onInitialForbesStudioConsumed?: () => void;
  initialStockId?: string;
  onInitialStockConsumed?: () => void;
  initialAppMode?: MobileAppMode;
  onInitialAppModeConsumed?: () => void;
  onTriggerBabyNaming?: (pending: {
      partnerId: string;
      partnerName: string;
      pregnancyCarrier?: PregnancyCarrier;
      babyGender: 'MALE' | 'FEMALE';
      suggestedFirstName: string;
      birthWeekAbsolute: number;
      eventWeek: number;
      eventYear: number;
      shouldCreateScandalNews: boolean;
  }) => void;
}

export const MobilePage: React.FC<MobilePageProps> = (props) => {
  const [appMode, setAppMode] = useState<MobileAppMode>('HOME');
  const [toast, setToast] = useState<{msg: string, color: string} | null>(null);
  const [forbesStudioTargetId, setForbesStudioTargetId] = useState<string | null>(null);
  const [forbesStudioTargetName, setForbesStudioTargetName] = useState<string | null>(null);
  const [initialStockId, setInitialStockId] = useState<string | null>(null);
  const [isImmersiveForbesScene, setIsImmersiveForbesScene] = useState(false);
  const [isImmersiveMessageReview, setIsImmersiveMessageReview] = useState(false);

  useEffect(() => {
      if (!props.initialForbesStudioId) return;
      setForbesStudioTargetId(props.initialForbesStudioId);
      setAppMode('FORBES');
      props.onInitialForbesStudioConsumed?.();
  }, [props.initialForbesStudioId, props.onInitialForbesStudioConsumed]);

  useEffect(() => {
      if (!props.initialStockId) return;
      setInitialStockId(props.initialStockId);
      setAppMode('STOCKS');
      props.onInitialStockConsumed?.();
  }, [props.initialStockId, props.onInitialStockConsumed]);

  useEffect(() => {
      if (!props.initialAppMode) return;
      if (props.initialAppMode === 'BOXOFFICE') {
          setAppMode('BOXOFFICE');
      } else {
          setAppMode(props.initialAppMode);
      }
      props.onInitialAppModeConsumed?.();
  }, [props.initialAppMode, props.onInitialAppModeConsumed]);

  useEffect(() => {
      const fullBleed = (appMode === 'FORBES' && isImmersiveForbesScene) || (appMode === 'MESSAGES' && isImmersiveMessageReview);
      const focusedPhoneApp = fullBleed || appMode === 'GUIDE';
      props.onNavVisibilityChange?.(!focusedPhoneApp);
      props.onFullBleedChange?.(fullBleed);
      return () => {
          props.onNavVisibilityChange?.(true);
          props.onFullBleedChange?.(false);
      };
  }, [appMode, isImmersiveForbesScene, isImmersiveMessageReview, props.onFullBleedChange, props.onNavVisibilityChange]);

  useEffect(() => {
      if (appMode !== 'MESSAGES') setIsImmersiveMessageReview(false);
  }, [appMode]);

  useEffect(() => {
      if (!props.player) return;
      const screenName = `MOBILE_${appMode}`;
      setCurrentGameScreen(screenName);
      markTraceAction('mobile_app_changed', {
          last_screen: screenName,
          last_event_id: appMode,
          flow: 'mobile_apps',
      });
      setCrashContext(props.player, {
          screen: screenName,
          mobile_app: appMode,
          inbox_messages: props.player.inbox?.length || 0,
          unread_messages: props.player.inbox?.filter(message => !message.isRead).length || 0,
          active_sponsorships: props.player.activeSponsorships?.length || 0,
      });
      addBreadcrumb('mobile_app:open', {
          app: appMode,
          messages: props.player.inbox?.length || 0,
      });
  }, [
      appMode,
      props.player?.activeSponsorships?.length,
      props.player?.age,
      props.player?.currentWeek,
      props.player?.id,
      props.player?.inbox,
  ]);

  if (!props.player) return null;

  const language = getPlayerLanguage(props.player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  const unreadMessages = props.player.inbox?.filter(m => !m.isRead).length || 0;
  const handleUpdatePlayer = props.onUpdatePlayer || ((p: Player) => {});
  const formatMoney = (value: number) => {
      const amount = Math.max(0, Math.round(Number(value) || 0));
      if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
      if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`;
      if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
      return `$${amount}`;
  };

  const showToast = (msg: string, color: string = 'bg-emerald-500') => {
      setToast({ msg, color });
      setTimeout(() => setToast(null), 3000);
  };

  const collaborationSigningEnergyCost = PHASE_ONE_ENERGY_COSTS.COLLABORATION_SIGNING;
  const hasEnergyFor = (amount: number, action: string) => {
      if (props.player!.energy.current >= amount) return true;
      showToast(`Need ${amount}E to ${action}.`, 'bg-rose-500');
      return false;
  };

  const normalizeSponsorshipForActivation = (offer: SponsorshipOffer): SponsorshipOffer => {
      const req = (offer.requirements || {}) as SponsorshipOffer['requirements'];
      return {
          ...offer,
          id: offer.id || `spon_${Date.now()}`,
          durationWeeks: Math.max(1, Number(offer.durationWeeks || 1)),
          weeklyPay: Math.max(0, Number(offer.weeklyPay || 0)),
          penalty: Math.max(0, Number(offer.penalty || 0)),
          weeksCompleted: Math.max(0, Number((offer as any).weeksCompleted || 0)),
          requirements: {
              ...req,
              type: req.type || 'POST',
              energyCost: Math.max(0, Number(req.energyCost || 0)),
              totalRequired: Math.max(1, Number(req.totalRequired || 1)),
              progress: Math.max(0, Number(req.progress || 0)),
          },
      };
  };

  const handleMarkMessageRead = (id: string) => {
      const updatedInbox = props.player!.inbox.map(message =>
          message.id === id ? { ...message, isRead: true } : message
      );
      handleUpdatePlayer({ ...props.player!, inbox: updatedInbox });
  };

  // --- HANDLER: Accept Offers (Modified for Multi-Film) ---
  const handleAcceptMessage = (msg: Message) => {
      if (msg.isExpired) {
          showToast('This offer already expired.', 'bg-slate-600');
          return;
      }

      if (msg.type === 'OFFER_OUTSIDE_PRODUCER_INVESTMENT' && props.onAcceptMessage) {
          props.onAcceptMessage(msg);
          return;
      }

      if (msg.type === 'OFFER_PLATFORM_COMMISSION') {
          const offerId = String(msg.data?.offerId || '');
          const studio = props.player!.businesses
              .filter(candidate => candidate.type === 'PRODUCTION_HOUSE' && candidate.isActive && candidate.studioState)
              .sort((left, right) => (right.stats.brandHealth + right.stats.customerSatisfaction) - (left.stats.brandHealth + left.stats.customerSatisfaction))[0];
          if (!offerId || !studio) {
              showToast('No active Production House can take this commission.', 'bg-rose-500');
              return;
          }
          const accepted = acceptPlatformAiPlayerCommission({
              player: props.player!,
              offerId,
              studioId: studio.id,
              absoluteWeek: getAbsoluteWeek(props.player!.age, props.player!.currentWeek),
          });
          if (!accepted.changed) {
              showToast(accepted.reason === 'INSUFFICIENT_PLATFORM_CASH' ? 'The platform withdrew: funding is no longer available.' : 'This offer is no longer available.', 'bg-rose-500');
              return;
          }
          handleUpdatePlayer(accepted.player);
          showToast(`${accepted.offer!.platformName} commission added to ${studio.name}.`, 'bg-emerald-500');
          props.onOpenPlatformCommission?.(studio.id, offerId);
          return;
      }

      // 1. Remove message from inbox
      const newInbox = props.player!.inbox.filter(m => m.id !== msg.id);
      let updatedPlayer = { ...props.player!, inbox: newInbox };

      // 2. Process Logic based on Type
      if (msg.type === 'SYSTEM' && msg.data?.kind === 'FRIEND_FAVOR') {
          const favor = msg.data || {};
          const accepted = favor.response !== 'DECLINED';
          const friendName = msg.sender || 'A friend';
          const favorType = favor.favorType || 'MONEY';
          const amount = Math.max(0, Math.round(Number(favor.amount || 0)));

          if (accepted && favorType === 'MONEY' && updatedPlayer.money < amount) {
              showToast(`Need ${formatMoney(amount)} cash`, "bg-rose-500");
              return;
          }

          const closenessDelta = accepted ? (favorType === 'ROLE_HELP' ? 9 : 7) : -5;
          updatedPlayer.relationships = (updatedPlayer.relationships || []).map(relationship => relationship.id === favor.friendId
              ? {
                  ...relationship,
                  closeness: Math.max(0, Math.min(100, (relationship.closeness || 0) + closenessDelta)),
                  lastInteractionWeek: updatedPlayer.currentWeek,
              }
              : relationship
          );

          if (accepted && favorType === 'MONEY') {
              updatedPlayer.money -= amount;
              updatedPlayer.finance = {
                  ...updatedPlayer.finance,
                  history: [
                      {
                          id: `tx_friend_favor_${Date.now()}`,
                          week: updatedPlayer.currentWeek,
                          year: updatedPlayer.age,
                          amount: -amount,
                          category: 'EXPENSE',
	                          description: tr('mobile.finance.friendFavor', { friendName }),
                      },
                      ...(updatedPlayer.finance?.history || []),
                  ].slice(0, 200),
              };
          }

          if (accepted && favorType === 'ROLE_HELP') {
              const reputationHit = Math.random() < 0.28 ? 1 : 0;
              updatedPlayer.stats = {
                  ...updatedPlayer.stats,
                  reputation: Math.max(0, Math.min(100, updatedPlayer.stats.reputation - reputationHit)),
                  experience: Math.max(0, Math.min(100, updatedPlayer.stats.experience + 0.4)),
              };
              updatedPlayer.flags = {
                  ...(updatedPlayer.flags || {}),
                  lastFriendRoleFavorAbsWeek: favor.createdAbsoluteWeek || updatedPlayer.currentWeek,
              };
          }

          updatedPlayer.logs = [
              {
                  week: updatedPlayer.currentWeek,
                  year: updatedPlayer.age,
                  message: accepted
                      ? (favorType === 'MONEY'
                          ? `Helped ${friendName} with ${formatMoney(amount)}.`
                          : `Put in a quiet word for ${friendName}.`)
                      : `Passed on ${friendName}'s favor request.`,
                  type: accepted ? 'positive' : 'neutral',
              },
              ...(updatedPlayer.logs || []),
          ].slice(0, 80);

          handleUpdatePlayer(updatedPlayer);
          showToast(accepted ? 'Friend helped' : 'Favor declined', accepted ? 'bg-sky-600' : 'bg-slate-500');
          return;
      }

      if (msg.type === 'OFFER_AUDITION') {
          const opp = msg.data as AuditionOpportunity;
          if (!opp?.project) {
              showToast(tr('mobile.toast.missingProject'), "bg-rose-500");
              handleUpdatePlayer(updatedPlayer);
              return;
          }

          const auditionDuration = getPhaseDuration('AUDITION');
          const newCommitment: Commitment = {
              id: `audition_invite_${Date.now()}`,
              name: opp.projectName,
              type: 'ACTING_GIG',
              roleType: opp.roleType,
              energyCost: 0,
              income: 0,
              lumpSum: opp.estimatedIncome,
              payoutType: 'LUMPSUM',
              projectDetails: applyOpportunityIdentityToProject(opp, updatedPlayer),
              projectPhase: 'AUDITION',
              phaseWeeksLeft: auditionDuration,
              totalPhaseDuration: auditionDuration,
              auditionPerformance: 0,
              productionPerformance: 0,
              agentCommission: props.player!.team.agent?.commission || 0,
              royaltyPercentage: opp.royaltyPercentage || 0
          };

          updatedPlayer.commitments = [...updatedPlayer.commitments, newCommitment];
          updatedPlayer.logs.push({
              week: updatedPlayer.currentWeek,
              year: updatedPlayer.age,
              message: `Accepted breakthrough audition invite for "${opp.projectName}".`,
              type: 'positive'
          });
      } else if (msg.type === 'OFFER_ROLE' || msg.type === 'OFFER_NEGOTIATION') {
          let opp: AuditionOpportunity;
          let salary = 0;
          let royalty = 0;

          if (msg.type === 'OFFER_NEGOTIATION') {
              const data = msg.data as NegotiationData;
              if (!data?.opportunity) {
                  showToast(tr('mobile.toast.missingContract'), "bg-rose-500");
                  handleUpdatePlayer(updatedPlayer);
                  return;
              }
              opp = data.opportunity;
              salary = data.currentOffer;
              royalty = data.royaltyPercentage || 0;
          } else {
              if (!msg.data) {
                  showToast(tr('mobile.toast.missingProject'), "bg-rose-500");
                  handleUpdatePlayer(updatedPlayer);
                  return;
              }
              opp = msg.data as AuditionOpportunity;
              salary = opp.estimatedIncome;
              royalty = opp.royaltyPercentage || 0;
          }

          // FIX: Register Famous Movie to prevent duplicate offers
          if (opp.project.isFamous) {
              if (!updatedPlayer.world) {
                  updatedPlayer.world = { projects: [], trendingGenre: 'ACTION', universes: {}, famousMoviesReleased: [], awardHistory: [], upcomingRivals: [] };
              }
              if (!Array.isArray(updatedPlayer.world.famousMoviesReleased)) {
                  updatedPlayer.world.famousMoviesReleased = [];
              }
              if (!updatedPlayer.world.famousMoviesReleased.includes(opp.projectName)) {
                  updatedPlayer.world.famousMoviesReleased.push(opp.projectName);
              }
          }

          const newCommitments: Commitment[] = [];

          // CHECK FOR UNIVERSE CONTRACT (Multi-Film)
          if (opp.universeContract) {
              const contract = opp.universeContract;

              // We split the salary across the films for simplicity, or give signing bonus now
              // Let's give 20% signing bonus now, rest per film
              const signingBonus = Math.floor(salary * 0.2);
              const perFilmSalary = Math.floor((salary - signingBonus) / contract.films.length);

              // Immediate payout
              updatedPlayer.money += signingBonus;
              updatedPlayer.logs.push({ week: updatedPlayer.currentWeek, year: updatedPlayer.age, message: `Signed Multi-Picture Deal! Bonus: $${signingBonus.toLocaleString()}`, type: 'positive' });
              updatedPlayer.activeUniverseContract = contract;

              // --- NEW: UPDATE ROSTER IN WORLD STATE ---
              if (updatedPlayer.world && updatedPlayer.world.universes) {
                  const uniId = contract.universeId;
                  const newUniverses = normalizeUniverseMap(updatedPlayer.world.universes);
                  if (newUniverses[uniId]) {
                      const newRoster = newUniverses[uniId].roster.map(char => {
                          if (char.name === contract.characterName) {
                              return { ...char, actorId: props.player!.id, actorName: props.player!.name };
                          }
                          return char;
                      });
                      newUniverses[uniId] = { ...newUniverses[uniId], roster: newRoster };
                      updatedPlayer.world = { ...updatedPlayer.world, universes: newUniverses };
                  }
              }
              // -----------------------------------------

              contract.films.forEach((film, index) => {
                  const isFirst = index === 0;

                  // Clone project details but update title/role for specific film
                  const filmDetails = {
                      ...opp.project,
                      title: film.title,
                      subtype: film.type
                  };
                  const identifiedFilmDetails = applyOpportunityIdentityToProject({
                      ...opp,
                      roleType: film.role,
                      project: filmDetails,
                  }, updatedPlayer);

                  const newComm: Commitment = {
                      id: `uni_job_${Date.now()}_${index}`,
                      name: film.title,
                      type: 'ACTING_GIG',
                      roleType: film.role,
                      energyCost: 0,
                      income: 0,
                      lumpSum: perFilmSalary,
                      payoutType: 'LUMPSUM',
                      projectDetails: identifiedFilmDetails,
                      // First movie starts now, others are SCHEDULED
                      projectPhase: isFirst ? 'PRE_PRODUCTION' : 'SCHEDULED',
                      phaseWeeksLeft: isFirst ? getPhaseDuration('PRE_PRODUCTION') : film.weeksOffset, // Use offset as waiting time
                      totalPhaseDuration: isFirst ? getPhaseDuration('PRE_PRODUCTION') : film.weeksOffset,
                      auditionPerformance: 100,
                      productionPerformance: 50,
                      agentCommission: props.player!.team.agent?.commission || 0,
                      royaltyPercentage: royalty
                  };
                  newCommitments.push(newComm);
              });

          } else {
              // STANDARD SINGLE FILM
              const newCommitment: Commitment = {
                  id: `job_${Date.now()}`,
                  name: opp.projectName,
                  type: 'ACTING_GIG',
                  roleType: opp.roleType,
                  energyCost: 0,
                  income: 0,
                  lumpSum: salary,
                  payoutType: 'LUMPSUM',
                  projectDetails: applyOpportunityIdentityToProject(opp, updatedPlayer),
                  projectPhase: 'PRE_PRODUCTION',
                  phaseWeeksLeft: getPhaseDuration('PRE_PRODUCTION'),
                  totalPhaseDuration: getPhaseDuration('PRE_PRODUCTION'),
                  auditionPerformance: 100,
                  productionPerformance: 50,
                  agentCommission: props.player!.team.agent?.commission || 0,
                  royaltyPercentage: royalty
              };
              newCommitments.push(newCommitment);
              updatedPlayer.logs.push({ week: updatedPlayer.currentWeek, year: updatedPlayer.age, message: `Accepted role in "${opp.projectName}"!`, type: 'positive' });
          }

          updatedPlayer.commitments = [...updatedPlayer.commitments, ...newCommitments];
      }
      else if (msg.type === 'OFFER_SPONSORSHIP') {
          const offer = msg.data as SponsorshipOffer;
          if (!offer) {
              showToast(tr('mobile.toast.missingSponsor'), "bg-rose-500");
              handleUpdatePlayer(updatedPlayer);
              return;
          }
          if (!hasEnergyFor(collaborationSigningEnergyCost, 'sign this brand deal')) return;
          // Add to active sponsorships
          spendPlayerEnergy(updatedPlayer, collaborationSigningEnergyCost, `Brand signing: ${offer.brandName}`);
          updatedPlayer.activeSponsorships = [...updatedPlayer.activeSponsorships, normalizeSponsorshipForActivation(offer)];
          updatedPlayer.logs.push({ week: updatedPlayer.currentWeek, year: updatedPlayer.age, message: `Signed sponsorship deal with ${offer.brandName}.`, type: 'positive' });
      } else if (msg.type === 'OFFER_YOUTUBE_COLLAB') {
          const offer = msg.data as YoutubeCollabOffer;
          if (!offer) {
              showToast(tr('mobile.toast.missingCollab'), "bg-rose-500");
              handleUpdatePlayer(updatedPlayer);
              return;
          }
          if (!hasEnergyFor(collaborationSigningEnergyCost, 'sign this creator collab')) return;
          spendPlayerEnergy(updatedPlayer, collaborationSigningEnergyCost, `YouTube collab signing: ${offer.creatorName}`);
          updatedPlayer.youtube = {
              ...updatedPlayer.youtube,
              activeCollabs: [...(updatedPlayer.youtube.activeCollabs || []), offer]
          };
          updatedPlayer.logs.push({ week: updatedPlayer.currentWeek, year: updatedPlayer.age, message: `Locked in a YouTube collab with ${offer.creatorName}.`, type: 'positive' });
      } else if (msg.type === 'OFFER_YOUTUBE_BRAND') {
          const offer = msg.data as YoutubeBrandDeal;
          if (!offer) {
              showToast(tr('mobile.toast.missingYoutubeDeal'), "bg-rose-500");
              handleUpdatePlayer(updatedPlayer);
              return;
          }
          if (!hasEnergyFor(collaborationSigningEnergyCost, 'sign this channel deal')) return;
          spendPlayerEnergy(updatedPlayer, collaborationSigningEnergyCost, `YouTube brand signing: ${offer.brandName}`);
          updatedPlayer.youtube = {
              ...updatedPlayer.youtube,
              activeBrandDeals: [...(updatedPlayer.youtube.activeBrandDeals || []), offer]
          };
          updatedPlayer.logs.push({ week: updatedPlayer.currentWeek, year: updatedPlayer.age, message: `Accepted a YouTube integration deal with ${offer.brandName}.`, type: 'positive' });
      } else if (msg.type === 'OFFER_MUSIC_VIDEO_FEATURE') {
          const offer = msg.data as YoutubeMusicVideoFeatureOffer;
          if (!offer) {
              showToast('Missing music video feature offer', "bg-rose-500");
              handleUpdatePlayer(updatedPlayer);
              return;
          }
          if (!hasEnergyFor(collaborationSigningEnergyCost, 'sign this music video feature')) return;
          spendPlayerEnergy(updatedPlayer, collaborationSigningEnergyCost, `Music feature signing: ${offer.artistName}`);
          const messy = Math.random() < Math.min(0.28, offer.reputationRisk / 28);
          const followerGain = Math.max(0, Math.round(offer.followerGain * (messy ? 0.55 : 1)));
          updatedPlayer.money += offer.appearanceFee;
          updatedPlayer.stats = {
              ...updatedPlayer.stats,
              fame: Math.max(0, Math.min(100, updatedPlayer.stats.fame + offer.fameBoost)),
              reputation: Math.max(0, Math.min(100, updatedPlayer.stats.reputation + (messy ? -offer.reputationRisk : 1))),
              followers: Math.max(0, updatedPlayer.stats.followers + followerGain)
          };
          updatedPlayer.x = {
              ...updatedPlayer.x,
              followers: Math.max(0, (updatedPlayer.x?.followers || 0) + Math.floor(followerGain * 0.45)),
              feed: [{
                  id: `x_music_feature_${Date.now()}`,
                  authorId: 'music_video_watch',
                  authorName: 'Music Video Watch',
                  authorHandle: '@musicvideowatch',
                  authorAvatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${encodeURIComponent(offer.artistName)}`,
                  content: messy
                      ? `${updatedPlayer.name}'s cameo in ${offer.artistName}'s "${offer.songTitle}" video is getting mixed reactions. Big reach, debatable fit.`
                      : `${updatedPlayer.name} shows up in ${offer.artistName}'s "${offer.songTitle}" video and the crossover is landing with fans.`,
                  timestamp: Date.now(),
                  likes: Math.max(80, Math.floor(offer.bonusViews * 0.01)),
                  retweets: Math.max(10, Math.floor(offer.bonusViews * 0.002)),
                  replies: Math.max(5, Math.floor(offer.bonusViews * 0.001)),
                  isPlayer: false,
                  isLiked: false,
                  isRetweeted: false,
                  isVerified: true,
                  postType: 'CAREER',
                  sentiment: messy ? 'MESSY' : 'SUPPORTIVE'
              }, ...(updatedPlayer.x?.feed || [])].slice(0, 80)
          };
          updatedPlayer.news = [
              {
                  id: `news_music_feature_${Date.now()}`,
                  headline: `${updatedPlayer.name} features in ${offer.artistName}'s music video.`,
                  subtext: messy
                      ? `"${offer.songTitle}" brings reach, but fans debate whether the cameo fit the song.`
                      : `"${offer.songTitle}" gives the actor a clean crossover moment with ${offer.genre} fans.`,
                  category: 'YOU',
                  week: updatedPlayer.currentWeek,
                  year: updatedPlayer.age,
                  impactLevel: messy ? 'LOW' : 'MEDIUM'
              },
              ...(updatedPlayer.news || [])
          ].slice(0, 50);
          updatedPlayer.logs.push({ week: updatedPlayer.currentWeek, year: updatedPlayer.age, message: `Featured in ${offer.artistName}'s "${offer.songTitle}" music video for ${formatMoney(offer.appearanceFee)}.`, type: messy ? 'neutral' : 'positive' });
      }

      // 3. Update Player
      handleUpdatePlayer(updatedPlayer);
      showToast(msg.type === 'OFFER_AUDITION' ? tr('mobile.toast.auditionAccepted') : tr('mobile.toast.offerAccepted'));
  };

  const handleDeclinePlatformCommission = (offerId: string) => {
      const declined = declinePlatformAiPlayerCommission({
          player: props.player!,
          offerId,
          absoluteWeek: getAbsoluteWeek(props.player!.age, props.player!.currentWeek),
      });
      if (!declined.changed) {
          showToast('This offer is no longer available.', 'bg-slate-600');
          return;
      }
      handleUpdatePlayer(declined.player);
      showToast('Commission declined.', 'bg-slate-600');
  };

  // --- HANDLER: Perform Sponsorship ---
  const handlePerformSponsorship = (sponId: string, action: SponsorshipActionType) => {
      const sponIndex = props.player!.activeSponsorships.findIndex(s => s.id === sponId);
      if (sponIndex === -1) return;

      const spon = props.player!.activeSponsorships[sponIndex];

      // Energy Check
      if (props.player!.energy.current < spon.requirements.energyCost) {
          showToast(tr('mobile.toast.notEnoughEnergy'), "bg-rose-500");
          return;
      }

      // Update Logic - Increment PROGRESS, not just period count
      const updatedSpon = { ...spon };
      const nextProgress = Math.min(
          Math.max(1, Number(spon.requirements.totalRequired || 1)),
          (spon.requirements.progress || 0) + 1
      );
      updatedSpon.requirements = {
          ...spon.requirements,
          progress: nextProgress
      };

      const updatedSponsorships = [...props.player!.activeSponsorships];
      updatedSponsorships[sponIndex] = updatedSpon;

      const updatedPlayer = {
          ...props.player!,
          activeSponsorships: updatedSponsorships,
          logs: nextProgress >= Math.max(1, Number(spon.requirements.totalRequired || 1))
              ? [{
                  week: props.player!.currentWeek,
                  year: props.player!.age,
                  message: `✅ Completed all deliverables for ${spon.brandName}. Contract will close cleanly next week.`,
                  type: 'positive' as const,
              }, ...(props.player!.logs || [])].slice(0, 80)
              : props.player!.logs
      };
      spendPlayerEnergy(updatedPlayer, spon.requirements.energyCost, `Sponsorship: ${spon.brandName}`);

      handleUpdatePlayer(updatedPlayer);
      showToast(action === 'POST' ? tr('mobile.toast.postComplete') : tr('mobile.toast.shootComplete'), 'bg-blue-500');
  };

  const handleTinderDateSuccess = (match: DatingMatch) => {
      const newMatches = props.player!.dating.matches.filter(m => m.id !== match.id);
      const newRel: Relationship = {
          id: `rel_${match.id}`,
          name: match.name,
          relation: 'Partner',
          closeness: 40 + Math.floor(Math.random() * 20),
          image: match.image,
          lastInteractionWeek: props.player!.currentWeek,
          lastInteractionAbsolute: getAbsoluteWeek(props.player!.age, props.player!.currentWeek),
          npcId: match.npcId,
          age: match.age
      };

      handleUpdatePlayer({
          ...props.player!,
          dating: { ...props.player!.dating, matches: newMatches },
          relationships: [...props.player!.relationships, newRel],
          logs: [...props.player!.logs, { week: props.player!.currentWeek, year: props.player!.age, message: `You started dating ${match.name}!`, type: 'positive' }]
      });
  };

  // --- NEW HANDLERS: HIRE AGENT/MANAGER (Strict Money Check) ---
  const handleHireAgent = (agent: Agent) => {
      if (props.player!.money < agent.annualFee) {
          showToast(tr('mobile.toast.insufficientFunds'), "bg-rose-500");
          return;
      }
      handleUpdatePlayer({
          ...props.player!,
          money: props.player!.money - agent.annualFee,
          team: {
              ...props.player!.team,
              agent,
              availableAgents: (props.player!.team.availableAgents || []).filter(candidate => candidate.id !== agent.id)
          },
          logs: [...props.player!.logs, {
              week: props.player!.currentWeek,
              year: props.player!.age,
              message: `Hired ${agent.name}. Paid annual fee of $${agent.annualFee.toLocaleString()}.`,
              type: 'neutral'
          }]
      });
      showToast(tr('mobile.toast.agentHired'), "bg-emerald-500");
  };

  const handleHireManager = (manager: Manager) => {
      if (props.player!.money < manager.annualFee) {
          showToast(tr('mobile.toast.insufficientFunds'), "bg-rose-500");
          return;
      }
      handleUpdatePlayer({
          ...props.player!,
          money: props.player!.money - manager.annualFee,
          team: {
              ...props.player!.team,
              manager,
              availableManagers: (props.player!.team.availableManagers || []).filter(candidate => candidate.id !== manager.id)
          },
          logs: [...props.player!.logs, {
              week: props.player!.currentWeek,
              year: props.player!.age,
              message: `Hired ${manager.name}. Paid annual fee of $${manager.annualFee.toLocaleString()}.`,
              type: 'neutral'
          }]
      });
      showToast(tr('mobile.toast.managerHired'), "bg-emerald-500");
  };

  const isFullBleedApp = (appMode === 'FORBES' && isImmersiveForbesScene) || (appMode === 'MESSAGES' && isImmersiveMessageReview);

  return (
    <div className={isFullBleedApp ? "fixed inset-0 z-[120] h-screen w-screen bg-black" : "h-[calc(100vh-8rem)] flex items-center justify-center pt-4 relative"}>
        <div className={isFullBleedApp ? "h-full w-full overflow-hidden bg-black relative" : "w-full max-w-xs h-full max-h-[650px] bg-black border-[6px] border-zinc-800 rounded-[3rem] overflow-hidden relative shadow-2xl ring-1 ring-zinc-700"}>
            {/* Notch */}
            {!isFullBleedApp && <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-zinc-900 rounded-b-xl z-50"></div>}

            <div className="w-full h-full bg-cover bg-center relative overflow-hidden" style={{ backgroundImage: 'linear-gradient(to bottom, #1e1b4b, #312e81)' }}>
                {/* Status Bar */}
                {!isFullBleedApp && <div className="h-8 w-full flex justify-between items-center px-6 pt-2 text-[10px] text-white font-medium z-20 relative">
                    <span>12:45</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 bg-white rounded-full opacity-20"></div>
                        <div className="w-3 h-3 bg-white rounded-full opacity-20"></div>
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                </div>}

                {/* TOAST NOTIFICATION (Inside Phone Screen for better Z-index/Visibility) */}
                {toast && (
                    <div className={`absolute top-14 left-1/2 -translate-x-1/2 z-[100] ${toast.color} text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top fade-in w-max max-w-[90%] justify-center border border-white/10`}>
                        {toast.color.includes('rose') ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                        {toast.msg}
                    </div>
                )}

                {/* HOME SCREEN */}
                {appMode === 'HOME' && (
                    <div className="h-full w-full p-4 pt-10 flex flex-col animate-in fade-in duration-300" data-tutorial-id="mobile-phone-home">
                        <div className="grid grid-cols-4 gap-x-4 gap-y-8 mt-4">
                            <AppIcon
                                icon={<MessageSquare size={26} fill="white" />}
                                color="bg-green-500"
                                label={tr('mobile.messages')}
                                onClick={() => setAppMode('MESSAGES')}
                                badge={unreadMessages}
                                tutorialId="mobile-messages-app"
                            />
                            <AppIcon
                                icon={<Search size={26} />}
                                color="bg-indigo-600"
                                label="CastLink"
                                onClick={() => setAppMode('CASTLINK')}
                                tutorialId="mobile-castlink-app"
                            />

                            {/* SOCIAL FOLDER */}
                            <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => setAppMode('SOCIAL_FOLDER')} data-tutorial-id="mobile-social-folder">
                                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl p-2 grid grid-cols-2 gap-1 shadow-lg group-active:scale-95 transition-transform overflow-hidden">
                                    <div className="w-full h-full bg-black flex items-center justify-center rounded-[5px] shadow-sm border border-zinc-700">
                                        <X size={12} strokeWidth={3} className="text-white"/>
                                    </div>
                                    <div className="w-full h-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-[5px] flex items-center justify-center shadow-sm">
                                        <Camera size={12} className="text-white"/>
                                    </div>
                                    <div className="w-full h-full bg-[#FF0000] rounded-[5px] flex items-center justify-center shadow-sm">
                                        <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[6px] border-l-white border-b-[3px] border-b-transparent ml-0.5"></div>
                                    </div>
                                    <div className="w-full h-full"></div>
                                </div>
                                <span className="text-[10px] text-white font-medium drop-shadow-md">{tr('mobile.social')}</span>
                            </div>

                            <AppIcon
                                icon={<Newspaper size={26} />}
                                color="bg-red-600"
                                label={tr('mobile.news')}
                                onClick={() => setAppMode('NEWS')}
                                tutorialId="mobile-news-app"
                            />
                            <AppIcon
                                label="IMDb"
                                color="bg-yellow-400"
                                onClick={() => setAppMode('IMDB')}
                                customContent={<span className="font-black text-xs tracking-tighter border-2 border-black px-1 rounded text-black">IMDb</span>}
                                tutorialId="mobile-imdb-app"
                            />
                            <AppIcon
                                icon={<BarChart3 size={26} />}
                                color="bg-emerald-600"
                                label={tr('mobile.boxOffice')}
                                onClick={() => setAppMode('BOXOFFICE')}
                                tutorialId="mobile-boxoffice-app"
                            />
                            <AppIcon
                                icon={<Users size={26} />}
                                color="bg-blue-500"
                                label={tr('mobile.team')}
                                onClick={() => setAppMode('TEAM')}
                                tutorialId="mobile-team-app"
                            />
                            <AppIcon
                                icon={<Landmark size={26} />}
                                color="bg-[#004b87]"
                                label={tr('mobile.bank')}
                                onClick={() => setAppMode('BANK')}
                                tutorialId="mobile-bank-app"
                            />
                            <AppIcon
                                icon={<TrendingUp size={26} />}
                                color="bg-black"
                                label={tr('mobile.forbes')}
                                onClick={() => setAppMode('FORBES')}
                                customContent={<span className="font-serif font-black text-xs tracking-tighter text-white">FORBES</span>}
                                tutorialId="mobile-forbes-app"
                            />
                            <AppIcon
                                icon={<Activity size={26} />}
                                color="bg-zinc-800"
                                label={tr('mobile.stocks')}
                                onClick={() => setAppMode('STOCKS')}
                                tutorialId="mobile-stocks-app"
                            />

                            {/* DATING FOLDER */}
                            <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => setAppMode('DATING_FOLDER')} data-tutorial-id="mobile-dating-folder">
                                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl p-2 grid grid-cols-2 gap-1 shadow-lg group-active:scale-95 transition-transform overflow-hidden">
                                    <div className="w-full h-full bg-gradient-to-tr from-pink-500 to-orange-500 rounded-[5px] flex items-center justify-center shadow-sm">
                                        <Flame size={12} fill="white" className="text-white" />
                                    </div>
                                    <div className="w-full h-full bg-black border border-amber-500/50 rounded-[5px] flex items-center justify-center relative overflow-hidden shadow-sm">
                                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent"></div>
                                        <Gem size={10} className="text-amber-500" />
                                    </div>
                                    <div className="w-full h-full"></div>
                                    <div className="w-full h-full"></div>
                                </div>
                                <span className="text-[10px] text-white font-medium drop-shadow-md">{tr('mobile.dating')}</span>
                            </div>

                            {/* GUIDE APP (Updated Icon) */}
                            <AppIcon
                                icon={<Map size={26} />}
                                color="bg-zinc-800"
                                label={tr('mobile.guide')}
                                onClick={() => setAppMode('GUIDE')}
                                tutorialId="mobile-guide-app"
                            />

                        </div>
                    </div>
                )}

                {/* APPS */}
                {appMode === 'INSTAGRAM' && (
                    <InstagramApp
                        player={props.player}
                        onBack={() => setAppMode('SOCIAL_FOLDER')}
                        onPost={props.onPost!}
                        onReactPost={props.onReactInstagramPost!}
                        onRespondDM={props.onRespondInstagramDM!}
                        onFollow={props.onFollowNPC!}
                        onInteract={props.onInteractNPC!}
                    />
                )}
                {appMode === 'X' && (
                    <XApp
                        player={props.player}
                        onBack={() => setAppMode('SOCIAL_FOLDER')}
                        onUpdatePlayer={handleUpdatePlayer}
                    />
                )}
                {appMode === 'YOUTUBE' && (
                    <YoutubeApp
                        player={props.player}
                        onBack={() => setAppMode('SOCIAL_FOLDER')}
                        onUpdatePlayer={handleUpdatePlayer}
                    />
                )}
                {appMode === 'BOXOFFICE' && (
                    <BoxOfficeApp player={props.player} onBack={() => setAppMode('HOME')} />
                )}
                {appMode === 'CASTLINK' && (
                    <CastLinkApp
                        player={props.player}
                        onBack={() => setAppMode('HOME')}
                        onAudition={props.onAudition!}
                        onTakeJob={props.onTakeJob!}
                        onQuitJob={props.onQuitJob!}
                    />
                )}
                {appMode === 'MESSAGES' && (
                    <MessagesApp
                        player={props.player}
                        onBack={() => setAppMode('HOME')}
                        onAccept={handleAcceptMessage} // Use local smart handler
                        onDelete={props.onDeleteMessage!}
                        onMarkRead={handleMarkMessageRead}
                        onOpenRightsMarket={props.onOpenRightsMarket}
                        onOpenStreamingContentOffer={props.onOpenStreamingContentOffer}
                        onOpenStudioContinuation={props.onOpenStudioContinuation}
                        onDeclinePlatformCommission={handleDeclinePlatformCommission}
                        onOpenStudioAcquisition={(studioId, studioName) => {
                            setForbesStudioTargetId(studioId || null);
                            setForbesStudioTargetName(studioName || null);
                            setAppMode('FORBES');
                        }}
                        onResolveShareholderVote={(voteId, selectedVote) => {
                            const result = resolveShareholderVote(props.player!, voteId, selectedVote);
                            if (!result.success) {
                                return {
                                    success: false,
                                    message: result.reason === 'VOTE_CLOSED'
                                        ? 'Voting has already closed. Nothing was changed.'
                                        : 'This ballot is no longer available. Nothing was changed.',
                                };
                            }
                            handleUpdatePlayer(result.player);
                            showToast('Shareholder vote submitted.', 'bg-emerald-500');
                            return {
                                success: true,
                                message: result.vote?.outcomeSummary || 'Your vote was recorded and the market response was applied.',
                            };
                        }}
                        onImmersiveReviewChange={setIsImmersiveMessageReview}
                    />
                )}
                {appMode === 'TEAM' && (
                    <TeamApp
                        player={props.player}
                        onBack={() => setAppMode('HOME')}
                        onHireAgent={handleHireAgent}
                        onFireAgent={props.onFireAgent!}
                        onHireManager={handleHireManager}
                        onFireManager={props.onFireManager!}
	                        onPerformSponsorship={handlePerformSponsorship} // New Handler
	                        onUpdatePlayer={handleUpdatePlayer}
	                        onShowToast={showToast}
	                        onOpenMessages={() => setAppMode('MESSAGES')}
	                        onOpenCastLink={() => setAppMode('CASTLINK')}
	                    />
                )}
                {appMode === 'NEWS' && (
                    <NewsApp player={props.player} onBack={() => setAppMode('HOME')} />
                )}
                {appMode === 'IMDB' && (
                    <ImdbApp player={props.player} onBack={() => setAppMode('HOME')} />
                )}
                {appMode === 'FORBES' && (
                    <ForbesApp
                        player={props.player}
                        onBack={() => setAppMode('HOME')}
                        onUpdatePlayer={handleUpdatePlayer}
                        onOpenStocks={() => setAppMode('STOCKS')}
                        onImmersiveChange={setIsImmersiveForbesScene}
                        initialStudioId={forbesStudioTargetId || undefined}
                        initialStudioName={forbesStudioTargetName || undefined}
                        onInitialStudioConsumed={() => {
                            setForbesStudioTargetId(null);
                            setForbesStudioTargetName(null);
                        }}
                        onInitialStudioUnavailable={() => showToast('That acquisition file is no longer available in Forbes.', 'bg-rose-500')}
                    />
                )}
                {appMode === 'STOCKS' && (
                    <StocksApp
                        player={props.player}
                        onBack={() => setAppMode('HOME')}
                        onTrade={props.onTradeStock!}
                        onUpdatePlayer={handleUpdatePlayer}
                        onOpenStudioAcquisition={(studioId) => {
                            showToast('Opening acquisition desk', 'bg-emerald-500');
                            setForbesStudioTargetId(studioId);
                            setAppMode('FORBES');
                        }}
                        initialStockId={initialStockId || undefined}
                        onInitialStockConsumed={() => setInitialStockId(null)}
                    />
                )}
                {appMode === 'BANK' && (
                    <BankApp player={props.player} onBack={() => setAppMode('HOME')} onUpdatePlayer={handleUpdatePlayer} />
                )}

                {/* DATING GROUP */}
                {appMode === 'DATING_FOLDER' && (
                    <DatingFolder
                        onBack={() => setAppMode('HOME')}
                        onOpenTinder={() => setAppMode('TINDER')}
                        onOpenLuxe={() => setAppMode('LUXE')}
                    />
                )}
                {appMode === 'TINDER' && (
                    <TinderApp
                        player={props.player}
                        onBack={() => setAppMode('DATING_FOLDER')}
                        onUpdatePlayer={handleUpdatePlayer}
                        onDateSuccess={handleTinderDateSuccess}
                        onTriggerBabyNaming={props.onTriggerBabyNaming}
                    />
                )}
                {appMode === 'LUXE' && (
                    <LuxeApp player={props.player} onBack={() => setAppMode('DATING_FOLDER')} onUpdatePlayer={handleUpdatePlayer}/>
                )}

                {/* SOCIAL GROUP */}
                {appMode === 'SOCIAL_FOLDER' && (
                    <SocialFolder
                        onBack={() => setAppMode('HOME')}
                        onOpenX={() => setAppMode('X')}
                        onOpenInsta={() => setAppMode('INSTAGRAM')}
                        onOpenYoutube={() => setAppMode('YOUTUBE')}
                    />
                )}

                {/* GUIDE APP */}
                {appMode === 'GUIDE' && (
                    <GuideView
                        player={props.player}
                        onBack={() => setAppMode('HOME')}
                        onOpenApp={(nextMode) => setAppMode(nextMode)}
                    />
                )}

                {/* Home Indicator */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-center pb-2 z-50 pointer-events-none">
                     <div className="w-32 h-1 bg-white/20 rounded-full"></div>
                </div>
            </div>
        </div>
    </div>
  );
};
