
import React, { useEffect, useState } from 'react';
import { Player, Message, AuditionOpportunity, SponsorshipOffer, NegotiationData, ScheduledEvent, YoutubeBrandDeal, YoutubeCollabOffer, YoutubeMusicVideoFeatureOffer, OutsideProducerInvestmentOffer } from '../../types';
import { ArrowLeft, Star, DollarSign, Calendar, CheckCircle, Lock, Trash2, Mail, Heart, Play, Users, Clapperboard, FileSearch, ShieldCheck, TrendingUp, AlertTriangle, FileSignature, Swords, ChevronRight, Landmark, Vote, Music2, Zap } from 'lucide-react';
import { ProjectDetailView } from '../../components/ProjectDetailView';
import { APP_DISPLAY_VERSION } from '../../services/appVersion';
import { getPlayerLanguage, t } from '../../services/i18n';
import { formatProjectMusicByline } from '../../services/musicIndustry';
import { calculateOutsideInvestmentAcceptanceChance } from '../../services/outsideProductions';
import { PHASE_ONE_ENERGY_COSTS } from '../../services/energyCosts';

interface MessagesAppProps {
  player: Player;
  onBack: () => void;
  onAccept: (msg: Message) => void;
  onDelete: (id: string) => void;
  onMarkRead: (id: string) => void;
  onOpenRightsMarket?: (opportunityId?: string) => void;
  onOpenStudioAcquisition?: (studioId: string) => void;
  onOpenStock?: (stockId: string) => void;
  onImmersiveReviewChange?: (active: boolean) => void;
}

export const MessagesApp: React.FC<MessagesAppProps> = ({ player, onBack, onAccept, onDelete, onMarkRead, onOpenRightsMarket, onOpenStudioAcquisition, onOpenStock, onImmersiveReviewChange }) => {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outsideCounterCash, setOutsideCounterCash] = useState<number>(0);
  const [outsideCounterStake, setOutsideCounterStake] = useState<number>(0);
  const [outsideCounterFeedback, setOutsideCounterFeedback] = useState<OutsideProducerInvestmentOffer['lastCounterFeedback'] | null>(null);
  const [outsideInvestmentReview, setOutsideInvestmentReview] = useState(false);
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  const collaborationSigningEnergyCost = PHASE_ONE_ENERGY_COSTS.COLLABORATION_SIGNING;
  const outsideInvestmentEnergyCost = PHASE_ONE_ENERGY_COSTS.OUTSIDE_PRODUCER_INVESTMENT_ACCEPT;
  const hasCollabSigningEnergy = player.energy.current >= collaborationSigningEnergyCost;
  const hasOutsideInvestmentEnergy = player.energy.current >= outsideInvestmentEnergyCost;
  
  // State for the full-screen contract view
  const [contractViewData, setContractViewData] = useState<{
      type: 'ROLE' | 'AUDITION' | 'NEGOTIATION';
      opportunity: AuditionOpportunity;
      data?: NegotiationData; // Only if negotiation
  } | null>(null);

  const messages = player.inbox || [];
  const selectedRightsStatus = selectedMessage?.type === 'RIGHTS_NEGOTIATION'
      ? selectedMessage.data?.negotiation?.status
      : undefined;
  const selectedRightsAccepted = selectedRightsStatus === 'ACCEPTED' || selectedRightsStatus === 'READY_TO_SIGN';
  const selectedFriendFavor = selectedMessage?.type === 'SYSTEM' && selectedMessage.data?.kind === 'FRIEND_FAVOR'
      ? selectedMessage.data
      : null;
  const selectedOutsideProducerUpdate = selectedMessage?.type === 'SYSTEM' && selectedMessage.data?.outsideProductionId
      ? selectedMessage.data
      : null;
  const selectedOutsideProduction = selectedOutsideProducerUpdate
      ? (player.outsideProductions || []).find(item => item.id === selectedOutsideProducerUpdate.outsideProductionId || item.projectId === selectedOutsideProducerUpdate.projectId)
      : null;
  const isOutsideInvestmentMessage = selectedMessage?.type === 'OFFER_OUTSIDE_PRODUCER_INVESTMENT' && Boolean(selectedMessage.data);
  const isDeveloperMessage = (message?: Message | null) => Boolean(
      message?.id === 'msg_dev_welcome' ||
      (message?.sender === 'Zeesh (Developer)' && message?.subject === 'A Note from the Creator')
  );
  useEffect(() => {
      onImmersiveReviewChange?.(outsideInvestmentReview);
      return () => onImmersiveReviewChange?.(false);
  }, [onImmersiveReviewChange, outsideInvestmentReview]);

  useEffect(() => {
      if (!selectedMessage || selectedMessage.type !== 'OFFER_OUTSIDE_PRODUCER_INVESTMENT') return;
      const updated = (player.inbox || []).find(message => message.id === selectedMessage.id);
      if (updated) {
          setSelectedMessage(updated);
          const updatedOffer = updated.data as OutsideProducerInvestmentOffer;
          setOutsideCounterFeedback(updatedOffer?.lastCounterFeedback || null);
          return;
      }
      setOutsideCounterFeedback(null);
      setOutsideInvestmentReview(false);
      setSelectedMessage(null);
  }, [player.inbox, selectedMessage?.id]);

  const formatMoney = (value: unknown) => {
      const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
      if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
      if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`;
      return `$${Math.round(amount / 1_000)}K`;
  };
  const formatReportLabel = (value: unknown) => String(value || 'Unknown')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  const getAbsoluteMessageWeek = (year: unknown, week: unknown) => (
      Math.max(0, Number(year || 0) * 52 + Number(week || 0))
  );
  const outsideTimeline = (() => {
      if (!selectedOutsideProducerUpdate) return null;
      const acceptedYear = Number(selectedOutsideProducerUpdate.acceptedYear || selectedOutsideProduction?.acceptedYear || player.age);
      const acceptedWeek = Number(selectedOutsideProducerUpdate.acceptedWeek || selectedOutsideProduction?.acceptedWeek || selectedMessage?.weekSent || player.currentWeek);
      const rawReleaseYear = Number(selectedOutsideProducerUpdate.releaseYear || selectedOutsideProduction?.releaseYear || acceptedYear);
      const rawReleaseWeek = Number(selectedOutsideProducerUpdate.releaseWeek || selectedOutsideProduction?.releaseWeek || acceptedWeek);
      const acceptedAbsolute = getAbsoluteMessageWeek(acceptedYear, acceptedWeek);
      const rawReleaseAbsolute = getAbsoluteMessageWeek(rawReleaseYear, rawReleaseWeek);
      const finishYear = Number(selectedOutsideProducerUpdate.finishYear || selectedOutsideProduction?.finishYear || player.age);
      const finishWeek = Number(selectedOutsideProducerUpdate.finishWeek || selectedOutsideProduction?.finishWeek || player.currentWeek);
      const finishAbsolute = getAbsoluteMessageWeek(finishYear, finishWeek);
      const useFinishAsRelease = rawReleaseAbsolute < acceptedAbsolute && finishAbsolute >= acceptedAbsolute;
      const releaseYear = useFinishAsRelease ? finishYear : rawReleaseYear;
      const releaseWeek = useFinishAsRelease ? finishWeek : rawReleaseWeek;
      return { acceptedYear, acceptedWeek, releaseYear, releaseWeek };
  })();

  const handleOpenMessage = (msg: Message) => {
      const openedMessage = msg.isRead ? msg : { ...msg, isRead: true };
      if (!msg.isRead) onMarkRead(msg.id);
      if (msg.type === 'OFFER_OUTSIDE_PRODUCER_INVESTMENT' && msg.data) {
          const offer = msg.data as OutsideProducerInvestmentOffer;
          setOutsideCounterCash(offer.cashAsk);
          setOutsideCounterStake(offer.offeredStakePercent);
          setOutsideCounterFeedback(offer.lastCounterFeedback || null);
      } else {
          setOutsideCounterFeedback(null);
      }
      setOutsideInvestmentReview(false);
      setSelectedMessage(openedMessage);
      setContractViewData(null);
  };

  const handleOpenContract = () => {
      if (!selectedMessage) return;

      if (selectedMessage.type === 'OFFER_NEGOTIATION') {
          const data = selectedMessage.data as NegotiationData;
          if (!data?.opportunity) return;
          setContractViewData({
              type: 'NEGOTIATION',
              opportunity: data.opportunity,
              data: data
          });
      } else if (selectedMessage.type === 'OFFER_ROLE' || selectedMessage.type === 'OFFER_AUDITION') {
          const data = selectedMessage.data as AuditionOpportunity;
          if (!data) return;
          setContractViewData({
              type: selectedMessage.type === 'OFFER_AUDITION' ? 'AUDITION' : 'ROLE',
              opportunity: data
          });
      }
  };

  // --- ACTIONS ---

  const handleCounterOffer = (salary: number, royalty: number) => {
      // Simulate counter offer logic (In a real app this would update the message state)
      // For this UI demo, we will just alert and close for now, or assume it's accepted for gameplay flow
      alert(tr('messages.counterOfferSent', { salary: salary.toLocaleString(), royalty }));
      
      // Update the local data to reflect the "Accepted" counter
      if (selectedMessage && contractViewData?.data) {
          const updatedMsg = { ...selectedMessage };
          (updatedMsg.data as NegotiationData).currentOffer = salary;
          (updatedMsg.data as NegotiationData).royaltyPercentage = royalty;
          
          onAccept(updatedMsg); // Accept immediately for gameplay smoothness
          setContractViewData(null);
          setSelectedMessage(null);
      }
  };

  const handleSignDeal = () => {
      if (isProcessing || !selectedMessage) return;
      const needsCollabSigningEnergy = selectedMessage.type === 'OFFER_SPONSORSHIP'
          || selectedMessage.type === 'OFFER_YOUTUBE_COLLAB'
          || selectedMessage.type === 'OFFER_YOUTUBE_BRAND'
          || selectedMessage.type === 'OFFER_MUSIC_VIDEO_FEATURE';
      if (needsCollabSigningEnergy && !hasCollabSigningEnergy) return;
      setIsProcessing(true);
      
      setTimeout(() => {
          onAccept(selectedMessage);
          setIsProcessing(false);
          setContractViewData(null);
          setSelectedMessage(null);
      }, 500);
  };

  const handleDelete = () => {
      if (!selectedMessage) return;
      onDelete(selectedMessage.id);
      setOutsideInvestmentReview(false);
      setSelectedMessage(null);
  };

  const handleFriendFavorResponse = (accepted: boolean) => {
      if (!selectedMessage) return;
      onAccept({
          ...selectedMessage,
          data: {
              ...(selectedMessage.data || {}),
              response: accepted ? 'ACCEPTED' : 'DECLINED',
          },
      });
      setOutsideInvestmentReview(false);
      setSelectedMessage(null);
  };

  const handleOutsideInvestmentAction = (action: 'ACCEPT' | 'COUNTER' | 'PASS') => {
      if (!selectedMessage) return;
      const offer = selectedMessage.data as OutsideProducerInvestmentOffer;
      const maxCounterAttempts = Number(offer.maxCounterAttempts || 3);
      const counterAttempts = Math.max(0, Number(offer.counterAttempts || (offer.counterUsed ? 1 : 0)));
      const dealClosedByCounter = Boolean(offer.counterClosed || (offer.counterUsed && counterAttempts >= maxCounterAttempts && offer.lastCounterFeedback?.declined));
      if (dealClosedByCounter) return;
      if (action !== 'PASS' && !hasOutsideInvestmentEnergy) return;
      if (action === 'COUNTER') {
          const nextCounterAttempt = Math.min(maxCounterAttempts, counterAttempts + 1);
          setOutsideCounterFeedback({
              accepted: false,
              declined: false,
              chance: calculateOutsideInvestmentAcceptanceChance({
                  offer,
                  cashAmount: outsideCounterCash,
                  stakePercent: outsideCounterStake,
                  player
              }),
              cashAmount: outsideCounterCash,
              stakePercent: outsideCounterStake,
              week: player.currentWeek,
              year: player.age,
              attempt: nextCounterAttempt,
              reason: 'Counter sent. Waiting for producer response.'
          });
      }
      onAccept({
          ...selectedMessage,
          data: {
              ...offer,
              action,
              counterCash: outsideCounterCash,
              counterStake: outsideCounterStake
          }
      });
      if (action !== 'COUNTER') {
          setOutsideInvestmentReview(false);
          setSelectedMessage(null);
      }
  };

  // --- RENDER: CONTRACT VIEW ---
  if (contractViewData) {
      const isNeg = contractViewData.type === 'NEGOTIATION';
      const isAudition = contractViewData.type === 'AUDITION';
      
      return (
          <ProjectDetailView
              opportunity={contractViewData.opportunity}
              // Negotiation Props
              isNegotiating={isNeg}
              currentOffer={isNeg ? contractViewData.data?.currentOffer : undefined}
              currentRoyalty={isNeg ? contractViewData.data?.royaltyPercentage : undefined}
              onCounter={handleCounterOffer}
              
              // Standard Props
              onBack={() => setContractViewData(null)}
              onAction={handleSignDeal}
              actionLabel={isNeg ? tr('messages.acceptCurrentOffer') : isAudition ? tr('messages.acceptAuditionInvite') : tr('messages.signContract')}
              isProcessing={isProcessing}
              actionColorClass={isNeg ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-white text-black hover:bg-zinc-200'}
              headerTitle={isNeg ? tr('messages.dealNegotiation') : isAudition ? tr('messages.auditionInvite') : tr('messages.officialContract')}
          />
      );
  }

  // --- RENDER: MESSAGE LIST / DETAIL ---
  return (
    <div className="absolute inset-0 bg-slate-50 flex flex-col z-40 text-slate-900 animate-in slide-in-from-right duration-300 font-sans" data-tutorial-id="mobile-inbox">
        
        {/* HEADER */}
        <div className="bg-white p-4 pt-12 pb-3 shadow-sm border-b border-slate-200 flex items-center gap-3 z-10 sticky top-0">
            <button 
                onClick={() => {
                    if (outsideInvestmentReview) {
                        setOutsideInvestmentReview(false);
                        return;
                    }
                    selectedMessage ? setSelectedMessage(null) : onBack();
                }} 
                className="flex shrink-0 items-center gap-1 font-medium text-slate-600 hover:text-slate-900"
            >
                <ArrowLeft size={20} /> {outsideInvestmentReview ? 'Summary' : selectedMessage ? tr('messages.inbox') : tr('messages.home')}
            </button>
            <div className="min-w-0 flex-1 truncate text-right text-lg font-bold">
                {outsideInvestmentReview ? 'Investment Review' : selectedMessage ? tr('messages.message') : tr('messages.inbox')}
            </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
            
            {/* LIST */}
            {!selectedMessage && (
                <div>
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-2xl">📭</div>
                            <p className="font-medium">{tr('messages.noMessages')}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200 bg-white">
                            {messages.map(msg => (
                                <button 
                                    key={msg.id} 
                                    onClick={() => handleOpenMessage(msg)}
                                    className={`w-full p-4 flex gap-4 text-left hover:bg-slate-50 transition-colors ${!msg.isRead ? 'bg-blue-50/60' : ''}`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-sm ${
                                        msg.type.includes('OFFER') ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 
                                        msg.type === 'CASTING_FEEDBACK' ? 'bg-gradient-to-br from-sky-600 to-indigo-700' :
                                        msg.type === 'STUDIO_ACQUISITION' ? 'bg-gradient-to-br from-amber-500 to-emerald-800' :
                                        msg.type === 'SHAREHOLDER_VOTE' ? 'bg-gradient-to-br from-sky-700 to-emerald-700' :
                                        msg.type === 'RIGHTS_REPORT' ? 'bg-gradient-to-br from-amber-500 to-orange-700' :
                                        msg.type === 'RIGHTS_NEGOTIATION' ? 'bg-gradient-to-br from-zinc-800 to-amber-800' :
                                        isDeveloperMessage(msg) ? 'bg-gradient-to-br from-zinc-700 to-black' :
                                        msg.type === 'SYSTEM' ? 'bg-slate-500' :
                                        'bg-slate-400'
                                    }`}>
                                        {msg.type === 'CASTING_FEEDBACK'
                                            ? <Clapperboard size={20} />
                                            : msg.type === 'STUDIO_ACQUISITION'
                                            ? <Landmark size={20} />
                                            : msg.type === 'SHAREHOLDER_VOTE'
                                                ? <Vote size={20} />
                                            : msg.type === 'RIGHTS_REPORT'
                                                ? <FileSearch size={20} />
                                                : msg.type === 'RIGHTS_NEGOTIATION'
                                                    ? <FileSignature size={20} />
                                                : msg.sender[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="mb-1 flex items-center justify-between gap-3">
                                            <div className="min-w-0 truncate font-bold text-slate-900">{msg.sender}</div>
                                            <div className="flex shrink-0 items-center gap-1 text-[10px] font-mono text-slate-400">
                                                <span>W{msg.weekSent}</span>
                                                {typeof msg.expiresIn === 'number' && (
                                                    <>
                                                        <span className="text-slate-300">•</span>
                                                        <span className={`font-sans font-semibold ${msg.expiresIn <= 1 ? 'text-rose-500' : 'text-amber-500'}`}>
                                                            {tr('messages.weeksLeft', { count: msg.expiresIn })}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`text-sm mb-0.5 truncate ${!msg.isRead ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                                            {msg.subject}
                                        </div>
                                        <div className="text-xs text-slate-500 truncate opacity-80">{msg.text}</div>
                                    </div>
                                    {!msg.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 self-start"></div>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* MESSAGE DETAIL */}
            {selectedMessage && (
                <div className="p-4 pb-24">
                    {selectedMessage.type === 'STUDIO_ACQUISITION' ? (
                        <div className={`overflow-hidden rounded-3xl border shadow-xl ${selectedMessage.data?.decision === 'ACCEPTED'
                            ? 'border-emerald-300 bg-emerald-950 text-white'
                            : selectedMessage.data?.decision === 'REJECTED'
                                ? 'border-rose-300 bg-rose-950 text-white'
                                : 'border-amber-300 bg-[#17130a] text-white'}`}
                        >
                            <div className="border-b border-white/10 px-6 py-7">
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-current/30 bg-white/5">
                                        {selectedMessage.data?.decision === 'ACCEPTED' ? <CheckCircle size={23} /> : selectedMessage.data?.decision === 'REJECTED' ? <AlertTriangle size={23} /> : <Landmark size={23} />}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Acquisition Desk</div>
                                        <div className="text-xs text-white/50">Confidential board response</div>
                                    </div>
                                </div>
                                <h2 className="text-2xl font-black leading-tight">{selectedMessage.subject}</h2>
                                <p className="mt-3 text-sm font-semibold leading-relaxed text-white/65">{selectedMessage.text}</p>
                            </div>
                            <div className="grid grid-cols-2 border-b border-white/10">
                                <div className="border-r border-white/10 p-4">
                                    <div className="text-[8px] font-black uppercase tracking-widest text-white/35">Company</div>
                                    <div className="mt-1 text-sm font-black">{selectedMessage.data?.studioName}</div>
                                </div>
                                <div className="p-4">
                                    <div className="text-[8px] font-black uppercase tracking-widest text-white/35">Board Decision</div>
                                    <div className="mt-1 text-sm font-black capitalize">{String(selectedMessage.data?.decision || '').replaceAll('_', ' ').toLowerCase()}</div>
                                </div>
                            </div>
                            {selectedMessage.data?.decision === 'RIVAL_BID' ? (
                                <div className="grid grid-cols-2 border-b border-white/10">
                                    <div className="border-r border-white/10 p-4">
                                        <div className="text-[8px] font-black uppercase tracking-widest text-white/35">Rival Bid</div>
                                        <div className="mt-1 font-mono text-sm font-black text-amber-200">
                                            {formatMoney(selectedMessage.data?.rivalAmount || 0)}
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="text-[8px] font-black uppercase tracking-widest text-white/35">Required Beat</div>
                                        <div className="mt-1 font-mono text-sm font-black text-white">
                                            {formatMoney(selectedMessage.data?.requiredBidAmount || 0)}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                            <div className="p-4">
                                <button
                                    type="button"
                                    onClick={() => onOpenStudioAcquisition?.(selectedMessage.data?.studioId)}
                                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-[10px] font-black uppercase tracking-[0.15em] text-black"
                                >
                                    {selectedMessage.data?.decision === 'RIVAL_BID' ? 'Enter Bidding War' : 'Review Offer'} <ChevronRight size={17} />
                                </button>
                            </div>
                        </div>
                    ) : selectedMessage.type === 'SHAREHOLDER_VOTE' ? (
                        <div className="overflow-hidden rounded-3xl border border-sky-200 bg-slate-950 text-white shadow-xl">
                            <div className="border-b border-white/10 px-6 py-7">
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/40 bg-sky-400/10 text-sky-200">
                                        <Vote size={22} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">Shareholder Services</div>
                                        <div className="text-xs text-white/50">Board decision packet</div>
                                    </div>
                                </div>
                                <h2 className="text-2xl font-black leading-tight">{selectedMessage.subject}</h2>
                                <p className="mt-3 text-sm font-semibold leading-relaxed text-white/65">{selectedMessage.text}</p>
                            </div>
                            <div className="grid grid-cols-2 border-b border-white/10">
                                <div className="border-r border-white/10 p-4">
                                    <div className="text-[8px] font-black uppercase tracking-widest text-white/35">Company</div>
                                    <div className="mt-1 text-sm font-black">{selectedMessage.data?.stockId || 'Stock'}</div>
                                </div>
                                <div className="p-4">
                                    <div className="text-[8px] font-black uppercase tracking-widest text-white/35">Action</div>
                                    <div className="mt-1 text-sm font-black">Vote required</div>
                                </div>
                            </div>
                            <div className="p-4">
                                <button
                                    type="button"
                                    onClick={() => onOpenStock?.(selectedMessage.data?.stockId)}
                                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-950"
                                >
                                    Open Shareholder Vote <ChevronRight size={17} />
                                </button>
                            </div>
                        </div>
                    ) : selectedMessage.type === 'RIGHTS_NEGOTIATION' ? (
                        <div className={`overflow-hidden rounded-3xl bg-[#f3ede0] shadow-xl ${selectedRightsAccepted ? 'border-2 border-emerald-500 shadow-emerald-900/20' : 'border border-amber-200'}`}>
                            <div className={`relative overflow-hidden border-b border-black/15 px-6 py-7 text-white ${selectedRightsAccepted ? 'bg-emerald-950' : 'bg-[#15120d]'}`}>
                                <div className="absolute right-5 top-5 rotate-3 border-2 border-amber-400/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                                    Round {selectedMessage.data?.negotiation?.round || 1}
                                </div>
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/60 bg-amber-400/10 text-amber-300">
                                        {['RIVAL_OFFER', 'BIDDING_WAR'].includes(selectedMessage.data?.negotiation?.status)
                                            ? <Swords size={22} />
                                            : <FileSignature size={22} />}
                                    </div>
                                    <div>
                                        <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Business Affairs</div>
                                        <div className="text-xs text-zinc-400">Confidential owner response</div>
                                    </div>
                                </div>
                                <h2 className="max-w-[86%] text-2xl font-black leading-tight">{selectedMessage.subject}</h2>
                                {selectedRightsAccepted && (
                                    <div className="mt-5 flex items-center gap-2 border border-emerald-300/50 bg-emerald-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
                                        <CheckCircle size={18} /> Offer accepted — complete the contract
                                    </div>
                                )}
                            </div>
                            <div className="px-6 py-6 text-slate-900">
                                <p className="text-sm leading-7 text-slate-700">{selectedMessage.data?.negotiation?.responseSummary || selectedMessage.text}</p>
                                <div className="my-6 grid grid-cols-2 gap-px overflow-hidden border border-black/15 bg-black/15">
                                    <div className="bg-[#f3ede0] p-4">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-black/40">Your offer</div>
                                        <div className="mt-2 font-mono text-base font-black">{formatMoney(selectedMessage.data?.negotiation?.currentOffer)}</div>
                                    </div>
                                    <div className="bg-[#f3ede0] p-4">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-black/40">Owner terms</div>
                                        <div className="mt-2 font-mono text-base font-black">
                                            {formatMoney(
                                                selectedMessage.data?.negotiation?.agreedAmount
                                                || selectedMessage.data?.negotiation?.counterAmount
                                                || selectedMessage.data?.negotiation?.rivalAmount
                                                || selectedMessage.data?.negotiation?.currentOffer
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {selectedMessage.data?.negotiation?.creativeGuarantee && (
                                    <div className="border-l-4 border-amber-700 bg-amber-900/[0.06] p-4">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-amber-800">
                                            {selectedMessage.data.negotiation.creativeGuarantee.title}
                                        </div>
                                        <p className="mt-2 text-xs font-semibold leading-relaxed">
                                            {selectedMessage.data.negotiation.creativeGuarantee.description}
                                        </p>
                                    </div>
                                )}
                                <div className="mt-6 flex items-center gap-3 border-t border-black/15 pt-5">
                                    <ShieldCheck size={20} className="shrink-0 text-amber-700" />
                                    <p className="text-xs font-bold leading-relaxed text-slate-600">
                                        Continue in Development Lab → Market → Properties. Money moves only after you sign.
                                    </p>
                                </div>
                                <button
                                    onClick={() => onOpenRightsMarket?.(selectedMessage.data?.negotiation?.opportunityId)}
                                    className={`mt-5 flex min-h-12 w-full items-center justify-center gap-2 px-4 text-xs font-black uppercase tracking-[0.14em] text-white ${selectedRightsAccepted ? 'bg-emerald-700' : 'bg-slate-900'}`}
                                >
                                    Open Property Deal <ChevronRight size={17} />
                                </button>
                            </div>
                        </div>
                    ) : selectedMessage.type === 'RIGHTS_REPORT' ? (
                        <div className="overflow-hidden rounded-3xl border border-amber-200 bg-[#f4f0e6] shadow-xl">
                            <div className="relative overflow-hidden border-b border-black/15 bg-[#111111] px-6 py-7 text-white">
                                <div className="absolute -right-5 top-4 rotate-12 border-4 border-amber-400/60 px-3 py-1 text-sm font-black uppercase tracking-widest text-amber-400/60">
                                    Ready
                                </div>
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-400 text-amber-300">
                                        <FileSearch size={22} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Studio Intelligence</div>
                                        <div className="text-xs text-zinc-400">Confidential market review</div>
                                    </div>
                                </div>
                                <h2 className="max-w-[85%] text-2xl font-black leading-tight">{selectedMessage.subject}</h2>
                            </div>

                            <div className="px-6 py-6 text-slate-900">
                                <p className="text-sm leading-7 text-slate-700">{selectedMessage.text}</p>

                                {selectedMessage.data?.report && (
                                    <>
                                        <div className="my-6 h-px bg-black/15" />
                                        <div className="grid grid-cols-2 gap-px overflow-hidden border border-black/15 bg-black/15">
                                            <div className="bg-[#f4f0e6] p-4">
                                                <div className="text-[9px] font-black uppercase tracking-widest text-black/40">Estimated value</div>
                                                <div className="mt-2 font-mono text-sm font-black">
                                                    {formatMoney(selectedMessage.data.report.estimatedValueLow)}–{formatMoney(selectedMessage.data.report.estimatedValueHigh)}
                                                </div>
                                            </div>
                                            <div className="bg-[#f4f0e6] p-4">
                                                <div className="text-[9px] font-black uppercase tracking-widest text-black/40">Best format</div>
                                                <div className="mt-2 text-sm font-black">{formatReportLabel(selectedMessage.data.report.recommendedFormat)}</div>
                                            </div>
                                        </div>

                                        <div className="mt-4 space-y-3">
                                            <div className="flex items-start gap-3 border-l-4 border-emerald-700 bg-emerald-900/[0.05] p-3">
                                                <TrendingUp size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                                                <div>
                                                    <div className="text-[9px] font-black uppercase tracking-widest text-emerald-800">Hidden edge</div>
                                                    <div className="mt-1 text-xs font-semibold leading-relaxed">{selectedMessage.data.report.hiddenAdvantage}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3 border-l-4 border-rose-800 bg-rose-900/[0.05] p-3">
                                                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-800" />
                                                <div>
                                                    <div className="text-[9px] font-black uppercase tracking-widest text-rose-800">Hidden danger</div>
                                                    <div className="mt-1 text-xs font-semibold leading-relaxed">{selectedMessage.data.report.hiddenDanger}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                                <button
                                    onClick={() => onOpenRightsMarket?.(selectedMessage.data?.opportunityId)}
                                    className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 bg-slate-900 px-4 text-xs font-black uppercase tracking-[0.14em] text-white"
                                >
                                    Open Property File <ChevronRight size={17} />
                                </button>

                                <div className="mt-6 flex items-center gap-3 border-t border-black/15 pt-5">
                                    <ShieldCheck size={20} className="shrink-0 text-amber-700" />
                                    <p className="text-xs font-bold leading-relaxed text-slate-600">
                                        Review the full file in Development Lab → Market → Properties.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : selectedMessage.type === 'CASTING_FEEDBACK' ? (
                        <div className="space-y-4">
                            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-100 bg-gradient-to-br from-sky-50 to-indigo-50 px-6 py-7">
                                    <div className="mb-5 flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 text-white shadow-md">
                                            <Clapperboard size={22} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-widest text-sky-700">Casting Office</div>
                                            <div className="text-xs text-slate-500">Confidential casting review</div>
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-black leading-tight text-slate-900">{selectedMessage.subject}</h2>
                                </div>

                                <div className="px-6 py-6">
                                    <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{selectedMessage.text}</div>
                                </div>
                            </div>
                        </div>
                    ) : selectedOutsideProducerUpdate ? (
                        <div className="overflow-hidden rounded-[2rem] border border-emerald-200 bg-white shadow-xl">
                            <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 px-6 py-6 text-white">
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-300/10 text-emerald-200">
                                        <Clapperboard size={22} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">Producer Return</div>
                                        <div className="mt-0.5 truncate text-xs font-bold text-emerald-100/55">{formatReportLabel(selectedOutsideProducerUpdate.releasePath || selectedOutsideProduction?.releasePath)} package</div>
                                    </div>
                                </div>
                                <h2 className="text-3xl font-black leading-tight">{selectedOutsideProducerUpdate.projectTitle || selectedOutsideProduction?.projectTitle || selectedMessage.subject}</h2>
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                    <div className="rounded-2xl bg-white/10 p-3">
                                        <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/50">Invested</div>
                                        <div className="mt-1 font-mono text-sm font-black">{formatMoney(selectedOutsideProducerUpdate.investedAmount || selectedOutsideProduction?.investedAmount)}</div>
                                    </div>
                                    <div className="rounded-2xl bg-white/10 p-3">
                                        <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/50">Release</div>
                                        <div className="mt-1 font-mono text-sm font-black">
                                            Y{outsideTimeline?.releaseYear} W{outsideTimeline?.releaseWeek}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl bg-white/10 p-3">
                                        <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/50">Stake</div>
                                        <div className="mt-1 font-mono text-sm font-black">{selectedOutsideProducerUpdate.stakePercent || selectedOutsideProduction?.stakePercent}%</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 px-5 py-5 text-slate-950">
                                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                                        <TrendingUp size={14} /> Settlement
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="rounded-2xl bg-white p-3">
                                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Receipts</div>
                                            <div className="mt-1 font-mono text-sm font-black">{formatMoney(selectedOutsideProducerUpdate.producerReceipts || selectedOutsideProduction?.producerReceipts)}</div>
                                        </div>
                                        <div className="rounded-2xl bg-white p-3">
                                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Paid</div>
                                            <div className="mt-1 font-mono text-sm font-black">{formatMoney(selectedOutsideProducerUpdate.payout || selectedOutsideProduction?.playerPayout)}</div>
                                        </div>
                                        <div className="rounded-2xl bg-white p-3">
                                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">ROI</div>
                                            <div className={`mt-1 font-mono text-sm font-black ${(selectedOutsideProducerUpdate.profit || selectedOutsideProduction?.profit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                                {(selectedOutsideProducerUpdate.roi ?? (selectedOutsideProduction?.profit && selectedOutsideProduction.investedAmount ? Math.round((selectedOutsideProduction.profit / selectedOutsideProduction.investedAmount) * 100) : 0))}%
                                            </div>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm font-bold leading-relaxed text-slate-600">
                                        {selectedMessage.text}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Timeline</div>
                                    <div className="mt-2 text-sm font-black text-slate-900">
                                        Invested Y{outsideTimeline?.acceptedYear} W{outsideTimeline?.acceptedWeek} • Released Y{outsideTimeline?.releaseYear} W{outsideTimeline?.releaseWeek}
                                    </div>
                                    <div className="mt-1 text-xs font-bold text-slate-500">
                                        The payout arrives only after the movie finishes its run or platform settlement.
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : selectedMessage.type === 'SYSTEM' && isDeveloperMessage(selectedMessage) ? (
                        <div className="bg-gradient-to-br from-zinc-900 to-black p-8 rounded-3xl border border-zinc-800 shadow-2xl relative overflow-hidden text-white">
                            {/* Watermark */}
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Heart size={200} />
                            </div>
                            
                            <div className="relative z-10">
                                {/* Sender Icon */}
                                <div className="flex justify-center mb-6">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-zinc-800 text-3xl">
                                        👨‍💻
                                    </div>
                                </div>
                                
                                <h2 className="text-2xl font-serif text-center mb-4 font-bold tracking-wide">{selectedMessage.subject}</h2>
                                <div className="w-12 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mb-8"></div>
                                
                                <div className="space-y-4 text-sm font-sans text-zinc-300 leading-relaxed text-left">
                                    {selectedMessage.text.split('\n').map((line, i) => (
                                        line.trim() === '' ? <br key={i}/> : <p key={i}>{line}</p>
                                    ))}
                                </div>

                                <div className="mt-10 pt-6 border-t border-zinc-800 flex justify-between items-end">
                                    <div className="text-xs text-zinc-600 font-mono">v{APP_DISPLAY_VERSION}</div>
                                    <div className="text-right">
                                        <div className="font-bold text-white text-sm">Zeesh</div>
                                        <div className="text-xs text-amber-500 font-bold uppercase tracking-widest">Zeesh Apps</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // STANDARD MESSAGE LAYOUT
                        <>
                            {!(isOutsideInvestmentMessage && outsideInvestmentReview) && (
                                <>
                                    {/* Header Card */}
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center mb-6">
                                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg ${
                                            selectedMessage.type.includes('OFFER') ? 'bg-indigo-600' : 'bg-slate-500'
                                        }`}>
                                            {selectedMessage.sender[0]}
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900 mb-1">{selectedMessage.sender}</h2>
                                        <p className="text-sm text-slate-500 font-medium">{selectedMessage.subject}</p>
                                    </div>

                                    {/* Body */}
                                    <div className="bg-white p-5 rounded-2xl mb-6 shadow-sm border border-slate-100">
                                        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{selectedMessage.text}</p>
                                    </div>
                                </>
                            )}

                            {selectedFriendFavor && (
                                <div className="mb-6 overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-xl">
                                    <div className="bg-gradient-to-br from-slate-950 via-sky-950 to-slate-900 p-5 text-white">
                                        <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-sky-200">
                                            <Heart size={14} /> Friend Favor
                                        </div>
                                        <h3 className="text-2xl font-black leading-tight">
                                            {selectedFriendFavor.favorType === 'MONEY' ? formatMoney(selectedFriendFavor.amount) : 'Career Help'}
                                        </h3>
                                        <p className="mt-2 text-sm font-semibold leading-relaxed text-sky-100/75">
                                            {selectedFriendFavor.favorType === 'MONEY'
                                                ? 'Helping costs cash but builds loyalty. Passing may cool the friendship.'
                                                : 'Putting in a word can deepen the friendship, with a small reputation risk if it feels forced.'}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 p-4">
                                        <button
                                            onClick={() => handleFriendFavorResponse(true)}
                                            disabled={isProcessing}
                                            className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white disabled:opacity-50"
                                        >
                                            Help
                                        </button>
                                        <button
                                            onClick={() => handleFriendFavorResponse(false)}
                                            disabled={isProcessing}
                                            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-500 disabled:opacity-50"
                                        >
                                            Pass
                                        </button>
                                    </div>
                                </div>
                            )}

                            {selectedMessage.type === 'OFFER_OUTSIDE_PRODUCER_INVESTMENT' && selectedMessage.data && (() => {
                                const offer = selectedMessage.data as OutsideProducerInvestmentOffer;
                                const counterChance = calculateOutsideInvestmentAcceptanceChance({
                                    offer,
                                    cashAmount: outsideCounterCash,
                                    stakePercent: outsideCounterStake,
                                    player
                                });
                                const maxCounterAttempts = Number(offer.maxCounterAttempts || 3);
                                const counterAttempts = Math.max(0, Number(offer.counterAttempts || (offer.counterUsed ? 1 : 0)));
                                const counterAttemptsLeft = Math.max(0, maxCounterAttempts - counterAttempts);
                                const counterAttemptNumber = Math.min(maxCounterAttempts, counterAttempts + 1);
                                const dealClosedByCounter = Boolean(offer.counterClosed || (offer.counterUsed && counterAttempts >= maxCounterAttempts && offer.lastCounterFeedback?.declined));
                                const canCounter = offer.flexible && !offer.finalTerms && counterAttemptsLeft > 0 && !dealClosedByCounter;
                                const notEnoughCash = offer.cashAsk > player.money;
                                const counterInvalid = outsideCounterCash > player.money || outsideCounterCash < offer.minCashAsk || outsideCounterCash > offer.maxCashAsk || outsideCounterStake <= 0 || outsideCounterStake > offer.maxStakePercent;
                                const report = offer.scoutReport;
                                const cleanStakeValue = ((offer.cashAsk / Math.max(1, offer.budget)) * 100).toFixed(1);
                                const isFraudRiskOffer = !!offer.fraudRisk && offer.fraudRisk !== 'NONE';
                                const counterCashMillions = Number((outsideCounterCash / 1_000_000).toFixed(1));
                                const clampCounterCashMillions = (value: number) => {
                                    if (!Number.isFinite(value)) return;
                                    const nextCash = Math.round(value * 1_000_000);
                                    setOutsideCounterCash(Math.min(offer.maxCashAsk, Math.max(offer.minCashAsk, nextCash)));
                                };
                                const clampCounterStake = (value: number) => {
                                    if (!Number.isFinite(value)) return;
                                    setOutsideCounterStake(Math.min(offer.maxStakePercent, Math.max(1, Number(value.toFixed(1)))));
                                };

                                if (!outsideInvestmentReview) {
                                    return (
                                        <div className="mb-6 overflow-hidden rounded-[2rem] border border-emerald-300/25 bg-slate-950 text-white shadow-2xl shadow-emerald-950/20">
                                            <div className="bg-gradient-to-br from-zinc-950 via-emerald-950 to-slate-950 p-6">
                                                <div className="mb-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">
                                                    <Clapperboard size={14} /> Producer Investment
                                                </div>
                                                <h3 className="text-3xl font-black leading-tight">{offer.projectTitle}</h3>
                                                <p className="mt-3 text-base font-semibold leading-relaxed text-emerald-100/75">
                                                    {offer.producerName} wants {formatMoney(offer.cashAsk)} for {offer.offeredStakePercent}% of producer receipts.
                                                </p>
                                                {isFraudRiskOffer && (
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        <span className="rounded-full border border-amber-300/30 bg-amber-300/15 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-amber-100">Generous Terms</span>
                                                        <span className="rounded-full border border-rose-300/30 bg-rose-300/15 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-rose-100">Verification weak</span>
                                                    </div>
                                                )}

                                                <div className="mt-6 grid grid-cols-3 gap-3">
                                                    <div>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-emerald-100/45">Ask</div>
                                                        <div className="mt-1 font-mono text-lg font-black">{formatMoney(offer.cashAsk)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-emerald-100/45">Stake</div>
                                                        <div className="mt-1 font-mono text-lg font-black">{offer.offeredStakePercent}%</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-emerald-100/45">Risk</div>
                                                        <div className="mt-1 font-mono text-lg font-black text-amber-200">{report.risk}</div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/25 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-50">
                                                    <Zap size={13} /> Commitment Focus {outsideInvestmentEnergyCost}E
                                                </div>
                                            </div>

                                            <div className="space-y-3 p-4">
                                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                                    <div className="text-[9px] font-black uppercase tracking-widest text-emerald-200/60">Backer</div>
                                                    <div className="mt-1 text-base font-black leading-snug text-white">{offer.producerType || 'Producer'}</div>
                                                    <div className="mt-1 text-xs font-bold leading-snug text-emerald-100/55">{offer.ownerName || offer.producerName}</div>
                                                </div>
                                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                                    <div className="text-[9px] font-black uppercase tracking-widest text-emerald-200/60">Project Lane</div>
                                                    <div className="mt-1 text-base font-black leading-snug text-white">{formatReportLabel(offer.releasePath)}</div>
                                                    <div className="mt-1 text-xs font-bold leading-snug text-emerald-100/55">Budget {formatMoney(offer.budget)} • Releases in ~{offer.expectedReleaseWeeks}w</div>
                                                </div>

                                                <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/5 p-4">
                                                    <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/55">Quick read</div>
                                                    <div className="grid grid-cols-3 gap-2 text-center">
                                                        <div className="rounded-xl bg-black/25 p-2">
                                                            <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/45">Market</div>
                                                            <div className="mt-1 text-sm font-black text-white">{report.marketFit}</div>
                                                        </div>
                                                        <div className="rounded-xl bg-black/25 p-2">
                                                            <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/45">Cast</div>
                                                            <div className="mt-1 text-sm font-black text-white">{report.castQuality}</div>
                                                        </div>
                                                        <div className="rounded-xl bg-black/25 p-2">
                                                            <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/45">Clean</div>
                                                            <div className="mt-1 text-sm font-black text-white">{cleanStakeValue}%</div>
                                                        </div>
                                                    </div>
                                                    <p className="mt-3 text-xs font-bold leading-relaxed text-emerald-100/60">
                                                        Review the full investment page before accepting. Counters are only available if the producer is open to bargaining.
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={() => setOutsideInvestmentReview(true)}
                                                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-lg"
                                                >
                                                    Review Investment <ChevronRight size={17} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950 text-white">
                                        <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/30 backdrop-blur">
                                            <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
                                                <button
                                                    onClick={() => setOutsideInvestmentReview(false)}
                                                    className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-black text-slate-200"
                                                >
                                                    <ArrowLeft size={18} /> Summary
                                                </button>
                                                <div className="min-w-0 flex-1 text-right text-xl font-black">Investment Review</div>
                                            </div>
                                        </div>

                                        <div className="mx-auto w-full max-w-5xl px-4 py-4 pb-36 sm:px-6 lg:px-8">
                                            <div className="overflow-hidden rounded-[2rem] border border-emerald-300/25 bg-slate-950 text-white shadow-2xl shadow-emerald-950/20">
                                        <div className="bg-gradient-to-br from-zinc-950 via-emerald-950 to-slate-950 p-5 text-white">
                                            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">
                                                <Clapperboard size={14} /> Producer Investment
                                            </div>
                                            <h3 className="text-2xl font-black leading-tight">{offer.projectTitle}</h3>
                                            <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-100/75">
                                                {offer.producerName} wants {formatMoney(offer.cashAsk)} for {offer.offeredStakePercent}% of producer receipts.
                                            </p>
                                            {isFraudRiskOffer && (
                                                <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="rounded-full bg-amber-200 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-950">Generous Terms</span>
                                                        <span className="rounded-full border border-rose-300/30 bg-rose-300/15 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-rose-100">Unverified financing</span>
                                                    </div>
                                                    <p className="mt-2 text-xs font-bold leading-relaxed text-amber-100/80">
                                                        This deal is unusually generous. Scout report cannot fully verify funding sources.
                                                    </p>
                                                </div>
                                            )}
                                            <div className="mt-4 grid grid-cols-2 gap-2">
                                                <div className="rounded-2xl bg-white/[0.08] p-3">
                                                    <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/45">Budget</div>
                                                    <div className="mt-1 font-mono text-sm font-black">{formatMoney(offer.budget)}</div>
                                                </div>
                                                <div className="rounded-2xl bg-white/[0.08] p-3">
                                                    <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/45">Risk</div>
                                                    <div className="mt-1 font-mono text-sm font-black text-amber-200">{report.risk}</div>
                                                </div>
                                                <div className="col-span-2 rounded-2xl bg-white/[0.08] p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/45">Path</div>
                                                        <div className="min-w-0 text-right text-sm font-black leading-snug text-white">{formatReportLabel(offer.releasePath)}</div>
                                                    </div>
                                                    <div className="mt-2 text-right text-[10px] font-black uppercase tracking-widest text-emerald-100/45">
                                                        Releases in ~{offer.expectedReleaseWeeks} weeks
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 p-4 pb-32">
                                            <div className="rounded-2xl border border-emerald-300/15 bg-white/[0.04] p-4">
                                                <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/55">Scout Report</div>
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    {[
                                                        ['Script', report.scriptQuality],
                                                        ['Director', report.directorQuality],
                                                        ['Cast', report.castQuality],
                                                        ['Market', report.marketFit],
                                                        ['Buzz', report.buzz],
                                                        ['Budget', report.budgetDiscipline],
                                                    ].map(([label, value]) => (
                                                        <div key={label} className="rounded-xl bg-black/25 p-2">
                                                            <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/45">{label}</div>
                                                            <div className="mt-1 text-sm font-black text-white">{value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-3 rounded-xl bg-black/25 p-3 text-xs font-bold text-emerald-100/70">
                                                    ROI Range: <span className="text-rose-300">{report.roiLowPct}%</span> to <span className="text-emerald-300">+{report.roiHighPct}%</span>
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/55">Package</div>
                                                <div className="text-base font-black text-white">{offer.directorName}</div>
                                                <div className="mt-1 text-sm font-bold leading-snug text-emerald-100/60">{offer.castNames.join(', ')}</div>
                                                <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-300">{offer.logline}</p>
                                                <div className="mt-4 grid grid-cols-1 gap-2">
                                                    <div className="rounded-xl bg-black/25 p-3">
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/45">Backer</div>
                                                        <div className="mt-1 text-sm font-black leading-snug text-white">{offer.producerType || 'Producer'}</div>
                                                    </div>
                                                    <div className="rounded-xl bg-black/25 p-3">
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/45">Owner</div>
                                                        <div className="mt-1 text-sm font-black leading-snug text-white">{offer.ownerName || offer.producerName}</div>
                                                    </div>
                                                    <div className="rounded-xl bg-black/25 p-3">
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/45">Record</div>
                                                        <div className="mt-1 font-mono text-sm font-black text-white">{offer.trackRecord || 50}/100</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {offer.finalTerms ? (
                                                <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-3 text-sm font-bold leading-relaxed text-amber-100">
                                                    Final terms. They are not looking to bargain on this package.
                                                </div>
                                            ) : (
                                                <div className="overflow-hidden rounded-[1.75rem] border border-emerald-300/25 bg-gradient-to-br from-emerald-300/10 via-cyan-300/5 to-white/[0.03] shadow-xl shadow-emerald-950/25">
                                                    <div className="border-b border-white/10 p-4">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100/55">Counter Desk</div>
                                                                <div className="mt-1 text-lg font-black leading-tight text-white">Make your terms</div>
                                                            </div>
                                                            <div className="flex shrink-0 items-center gap-2">
                                                                <div className="rounded-2xl border border-emerald-200/20 bg-black/20 px-3 py-2 text-right">
                                                                    <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/45">Counter</div>
                                                                    <div className="font-mono text-sm font-black leading-none text-emerald-100">{`Counter ${counterAttemptNumber}/3`}</div>
                                                                </div>
                                                                <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-lg">
                                                                    <div className="text-[8px] font-black uppercase tracking-widest text-emerald-700/70">Accept</div>
                                                                    <div className="font-mono text-xl font-black leading-none text-emerald-700">{counterChance}%</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
                                                            <div
                                                                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-300"
                                                                style={{ width: `${Math.max(4, Math.min(100, counterChance))}%` }}
                                                            />
                                                        </div>
                                                        <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-emerald-100/40">
                                                            <span>Risky</span>
                                                            <span>Likely</span>
                                                        </div>
                                                        {outsideCounterFeedback && (
                                                            <div className={`mt-3 rounded-2xl border p-3 text-xs font-bold leading-relaxed ${
                                                                outsideCounterFeedback.declined
                                                                    ? 'border-amber-300/30 bg-amber-300/10 text-amber-100'
                                                                    : 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
                                                            }`}>
                                                                <div className="text-[9px] font-black uppercase tracking-[0.2em]">
                                                                    {outsideCounterFeedback.declined ? 'Counter declined' : 'Counter sent'}
                                                                </div>
                                                                <div className="mt-1">
                                                                    {outsideCounterFeedback.declined
                                                                        ? dealClosedByCounter
                                                                            ? `They passed on ${formatMoney(outsideCounterFeedback.cashAmount)} for ${outsideCounterFeedback.stakePercent}%. After 3 counters, the producer walked away and the deal is closed.`
                                                                        : counterAttemptsLeft > 0
                                                                            ? `They passed on ${formatMoney(outsideCounterFeedback.cashAmount)} for ${outsideCounterFeedback.stakePercent}%. ${counterAttemptsLeft} counter ${counterAttemptsLeft === 1 ? 'try' : 'tries'} left. Adjust terms here or pass.`
                                                                            : `They passed on ${formatMoney(outsideCounterFeedback.cashAmount)} for ${outsideCounterFeedback.stakePercent}%. No counters left.`
                                                                        : `Sent ${formatMoney(outsideCounterFeedback.cashAmount)} for ${outsideCounterFeedback.stakePercent}%. Acceptance read: ${outsideCounterFeedback.chance}%.`}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 p-4 pb-0">
                                                        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                                                            <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/40">Their Ask</div>
                                                            <div className="mt-2 font-mono text-sm font-black text-white">{formatMoney(offer.cashAsk)}</div>
                                                            <div className="mt-1 text-xs font-black text-emerald-100/55">{offer.offeredStakePercent}% receipts</div>
                                                        </div>
                                                        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3">
                                                            <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/45">Your Counter</div>
                                                            <div className="mt-2 font-mono text-sm font-black text-white">{formatMoney(outsideCounterCash)}</div>
                                                            <div className="mt-1 text-xs font-black text-emerald-100/65">{outsideCounterStake}% receipts</div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 p-4">
                                                        <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-3">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-100/55">Cash Offer</span>
                                                                <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-100/55">
                                                                    {formatMoney(offer.minCashAsk)} - {formatMoney(offer.maxCashAsk)}
                                                                </span>
                                                            </div>
                                                            <div className="mt-2 grid grid-cols-[42px_1fr_42px] gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => clampCounterCashMillions(counterCashMillions - 0.5)}
                                                                    className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl font-black text-emerald-100"
                                                                >
                                                                    -
                                                                </button>
                                                                <div className="flex h-12 min-w-0 items-center rounded-2xl border border-emerald-200 bg-white px-3 shadow-lg shadow-emerald-950/20">
                                                                    <span className="shrink-0 text-sm font-black text-slate-400">$</span>
                                                                    <input
                                                                        type="number"
                                                                        value={counterCashMillions}
                                                                        min={Number((offer.minCashAsk / 1_000_000).toFixed(1))}
                                                                        max={Number((offer.maxCashAsk / 1_000_000).toFixed(1))}
                                                                        step={0.1}
                                                                        onChange={event => clampCounterCashMillions(Number(event.target.value))}
                                                                        className="min-w-0 flex-1 bg-transparent px-1 text-center text-xl font-black text-slate-950 outline-none"
                                                                    />
                                                                    <span className="shrink-0 text-xs font-black uppercase tracking-widest text-slate-400">M</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => clampCounterCashMillions(counterCashMillions + 0.5)}
                                                                    className="flex h-12 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-2xl font-black text-emerald-100"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-3">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-100/55">Receipt Stake</span>
                                                                <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-100/55">
                                                                    Max {offer.maxStakePercent}%
                                                                </span>
                                                            </div>
                                                            <div className="mt-2 grid grid-cols-[42px_1fr_42px] gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => clampCounterStake(outsideCounterStake - 0.5)}
                                                                    className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl font-black text-emerald-100"
                                                                >
                                                                    -
                                                                </button>
                                                                <div className="flex h-12 min-w-0 items-center rounded-2xl border border-emerald-200 bg-white px-3 shadow-lg shadow-emerald-950/20">
                                                                    <input
                                                                        type="number"
                                                                        value={outsideCounterStake}
                                                                        min={1}
                                                                        max={offer.maxStakePercent}
                                                                        step={0.5}
                                                                        onChange={event => clampCounterStake(Number(event.target.value))}
                                                                        className="min-w-0 flex-1 bg-transparent px-1 text-center text-xl font-black text-slate-950 outline-none"
                                                                    />
                                                                    <span className="shrink-0 text-sm font-black text-slate-400">%</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => clampCounterStake(outsideCounterStake + 0.5)}
                                                                    className="flex h-12 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-2xl font-black text-emerald-100"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-[11px] font-bold leading-relaxed text-emerald-100/55">
                                                            Counter feedback is instant. You get 3 tries; declined counters stay here so you can adjust the money or stake, then counter again or pass.
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {notEnoughCash && (
                                                <div className="rounded-2xl border border-rose-300/25 bg-rose-300/10 p-3 text-sm font-bold leading-relaxed text-rose-100">
                                                    You need {formatMoney(offer.cashAsk)} cash to accept the original terms.
                                                </div>
                                            )}

                                            <div className="sticky bottom-0 -mx-4 mt-2 border-t border-white/10 bg-slate-950/95 p-4 shadow-[0_-18px_30px_rgba(0,0,0,0.35)] backdrop-blur">
                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                        <div>
                                                            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-100/45">Decision</div>
                                                        <div className="text-sm font-black text-white">{dealClosedByCounter ? 'Deal closed' : `Producer receipts • ${offer.offeredStakePercent}%`}</div>
                                                        </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-100">
                                                            <Zap size={11} /> {outsideInvestmentEnergyCost}E
                                                        </span>
                                                        <button
                                                            onClick={() => setOutsideInvestmentReview(false)}
                                                            className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300"
                                                        >
                                                            Summary
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={() => handleOutsideInvestmentAction('ACCEPT')}
                                                        disabled={dealClosedByCounter || notEnoughCash || !hasOutsideInvestmentEnergy}
                                                        className="rounded-2xl bg-emerald-500 px-4 py-4 text-sm font-black uppercase tracking-[0.12em] text-black disabled:opacity-40"
                                                    >
                                                        {dealClosedByCounter ? 'Closed' : hasOutsideInvestmentEnergy ? 'Accept Terms' : `Need ${outsideInvestmentEnergyCost}E`}
                                                    </button>
                                                    <button
                                                        onClick={() => handleOutsideInvestmentAction('PASS')}
                                                        disabled={dealClosedByCounter}
                                                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm font-black uppercase tracking-[0.12em] text-slate-300 disabled:opacity-40"
                                                    >
                                                        Pass
                                                    </button>
                                                </div>
                                                {canCounter && (
                                                    <button
                                                        onClick={() => handleOutsideInvestmentAction('COUNTER')}
                                                        disabled={counterInvalid || !hasOutsideInvestmentEnergy}
                                                        className="mt-3 w-full rounded-2xl border border-emerald-300/25 bg-white px-4 py-4 text-sm font-black uppercase tracking-[0.12em] text-emerald-700 disabled:opacity-40"
                                                    >
                                                        {hasOutsideInvestmentEnergy ? 'Send Counter' : `Need ${outsideInvestmentEnergyCost}E`}
                                                    </button>
                                                )}
                                                {!canCounter && offer.flexible && !offer.finalTerms && (
                                                    <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">
                                                        {dealClosedByCounter ? 'Producer walked away after 3 counters. Deal closed.' : 'No counters left.'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* CASTING OFFER CARD */}
                            {(selectedMessage.type === 'OFFER_ROLE' || selectedMessage.type === 'OFFER_AUDITION' || selectedMessage.type === 'OFFER_NEGOTIATION') && selectedMessage.data && (
                                <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-6 opacity-10"><Star size={120} /></div>
                                    <div className="relative z-10">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Star size={14} className="text-amber-400"/> {selectedMessage.type === 'OFFER_AUDITION' ? tr('messages.auditionInvite') : tr('messages.castOffer')}
                                        </div>
                                        
                                        {(() => {
                                            const opp = selectedMessage.type === 'OFFER_NEGOTIATION' 
                                                ? (selectedMessage.data as NegotiationData).opportunity 
                                                : (selectedMessage.data as AuditionOpportunity);
                                            
                                            const pay = selectedMessage.type === 'OFFER_NEGOTIATION'
                                                ? (selectedMessage.data as NegotiationData).currentOffer
                                                : (selectedMessage.data as AuditionOpportunity).estimatedIncome;
                                            const safePay = typeof pay === 'number' && Number.isFinite(pay) ? pay : 0;
                                            const hasValidContract = !!opp;
                                            const musicByline = opp?.project ? formatProjectMusicByline(opp.project, 2) : '';

                                            return (
                                                <>
                                                    <h3 className="text-2xl font-bold mb-1 leading-tight">{opp?.projectName || tr('messages.offerUnavailable')}</h3>
                                                    <p className="text-sm text-slate-400 mb-6">
                                                        {opp ? `${opp.roleType} Role • ${opp.genre}` : tr('messages.contractMissing')}
                                                    </p>
                                                    {musicByline && (
                                                        <div className="mb-6 flex items-start gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3">
                                                            <Music2 size={14} className="mt-0.5 shrink-0 text-cyan-300" />
                                                            <div className="min-w-0">
                                                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/80">Music by</div>
                                                                <div className="truncate text-sm font-bold text-white">{musicByline}</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex items-end justify-between mb-6 border-t border-white/10 pt-4">
                                                        <div>
                                                            <div className="text-[10px] text-slate-500 uppercase font-bold">{tr('messages.salary')}</div>
                                                            <div className="text-xl font-mono font-bold text-emerald-400">${safePay.toLocaleString()}</div>
                                                        </div>
                                                        {opp?.royaltyPercentage && opp.royaltyPercentage > 0 && (
                                                            <div className="text-right">
                                                                <div className="text-[10px] text-slate-500 uppercase font-bold">{tr('messages.points')}</div>
                                                                <div className="text-xl font-mono font-bold text-amber-400">{opp.royaltyPercentage}%</div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button 
                                                        onClick={handleOpenContract}
                                                        disabled={!hasValidContract}
                                                        className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <CheckCircle size={18}/> {selectedMessage.type === 'OFFER_AUDITION' ? tr('messages.reviewAudition') : tr('messages.reviewContract')}
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* SPONSORSHIP CARD */}
                            {selectedMessage.type === 'OFFER_SPONSORSHIP' && selectedMessage.data && (
                                <div className="bg-emerald-900 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-6 opacity-10"><DollarSign size={120} /></div>
                                    <div className="relative z-10">
                                        <h3 className="text-2xl font-bold mb-2">{(selectedMessage.data as any).brandName}</h3>
                                        <p className="text-sm text-emerald-200/80 mb-6">{(selectedMessage.data as any).description}</p>
                                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/25 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-50">
                                            <Zap size={13} /> Signing Focus {collaborationSigningEnergyCost}E
                                        </div>
                                        <button
                                            onClick={handleSignDeal}
                                            disabled={!hasCollabSigningEnergy || isProcessing}
                                            className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold text-sm disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                                        >
                                            {hasCollabSigningEnergy ? tr('messages.acceptDeal') : `Need ${collaborationSigningEnergyCost}E`}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {selectedMessage.type === 'OFFER_YOUTUBE_COLLAB' && selectedMessage.data && (
                                <div className="bg-red-950 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-6 opacity-10"><Users size={120} /></div>
                                    <div className="relative z-10">
                                        {(() => {
                                            const collab = selectedMessage.data as YoutubeCollabOffer;
                                            return (
                                                <>
                                                    <div className="text-xs font-bold text-red-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <Play size={14}/> {tr('messages.creatorCollab')}
                                                    </div>
                                                    <h3 className="text-2xl font-bold mb-1">{collab.creatorName}</h3>
                                                    <div className="text-sm text-red-200/80 mb-2">{collab.creatorHandle}</div>
                                                    <div className="text-lg font-semibold mb-3">{collab.conceptTitle}</div>
                                                    <p className="text-sm text-red-100/80 mb-5">{collab.description}</p>
                                                    <div className="grid grid-cols-2 gap-3 text-xs mb-5">
                                                        <div className="bg-white/5 rounded-xl p-3">{tr('messages.format')}: <strong>{collab.requiredType.replace(/_/g, ' ')}</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">Sign: <strong>{collaborationSigningEnergyCost}E</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">Production: <strong>{collab.energyCost}E</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">{tr('messages.potentialViews')}: <strong>~{collab.bonusViews.toLocaleString()}</strong></div>
                                                    </div>
                                                    <button
                                                        onClick={handleSignDeal}
                                                        disabled={!hasCollabSigningEnergy || isProcessing}
                                                        className="w-full py-4 bg-red-500 text-white rounded-xl font-bold text-sm disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                                                    >
                                                        {hasCollabSigningEnergy ? tr('messages.acceptCollab') : `Need ${collaborationSigningEnergyCost}E`}
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {selectedMessage.type === 'OFFER_YOUTUBE_BRAND' && selectedMessage.data && (
                                <div className="bg-amber-950 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-6 opacity-10"><DollarSign size={120} /></div>
                                    <div className="relative z-10">
                                        {(() => {
                                            const deal = selectedMessage.data as YoutubeBrandDeal;
                                            return (
                                                <>
                                                    <div className="text-xs font-bold text-amber-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <Play size={14}/> {tr('messages.channelIntegration')}
                                                    </div>
                                                    <h3 className="text-2xl font-bold mb-1">{deal.brandName}</h3>
                                                    <div className="text-sm text-amber-200/80 mb-2">{deal.category}</div>
                                                    <p className="text-sm text-amber-100/80 mb-5">{deal.description}</p>
                                                    <div className="grid grid-cols-2 gap-3 text-xs mb-5">
                                                        <div className="bg-white/5 rounded-xl p-3">{tr('messages.format')}: <strong>{deal.requiredType.replace(/_/g, ' ')}</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">Sign: <strong>{collaborationSigningEnergyCost}E</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">Integration: <strong>{deal.energyCost}E</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">{tr('messages.payout')}: <strong>${deal.payout.toLocaleString()}</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">{tr('messages.penalty')}: <strong>${deal.penalty.toLocaleString()}</strong></div>
                                                    </div>
                                                    <button
                                                        onClick={handleSignDeal}
                                                        disabled={!hasCollabSigningEnergy || isProcessing}
                                                        className="w-full py-4 bg-amber-500 text-black rounded-xl font-bold text-sm disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                                                    >
                                                        {hasCollabSigningEnergy ? tr('messages.acceptDeal') : `Need ${collaborationSigningEnergyCost}E`}
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {selectedMessage.type === 'OFFER_MUSIC_VIDEO_FEATURE' && selectedMessage.data && (
                                <div className="bg-cyan-950 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-6 opacity-10"><Music2 size={120} /></div>
                                    <div className="relative z-10">
                                        {(() => {
                                            const feature = selectedMessage.data as YoutubeMusicVideoFeatureOffer;
                                            return (
                                                <>
                                                    <div className="text-xs font-bold text-cyan-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <Music2 size={14}/> Music Video Feature
                                                    </div>
                                                    <h3 className="text-2xl font-bold mb-1">{feature.artistName}</h3>
                                                    <div className="text-sm text-cyan-200/80 mb-2">{feature.genre} • {feature.songTitle}</div>
                                                    <p className="text-sm text-cyan-100/80 mb-5">{feature.description}</p>
                                                    <div className="grid grid-cols-2 gap-3 text-xs mb-5">
                                                        <div className="bg-white/5 rounded-xl p-3">Fee: <strong>${feature.appearanceFee.toLocaleString()}</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">Sign: <strong>{collaborationSigningEnergyCost}E</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">Video Reach: <strong>~{feature.bonusViews.toLocaleString()}</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">Follower Lift: <strong>~+{feature.followerGain.toLocaleString()}</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">Image Risk: <strong>{feature.reputationRisk}</strong></div>
                                                    </div>
                                                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-50">
                                                        <Zap size={13} /> Music Feature Signing Focus {collaborationSigningEnergyCost}E
                                                    </div>
                                                    <button
                                                        onClick={handleSignDeal}
                                                        disabled={!hasCollabSigningEnergy || isProcessing}
                                                        className="w-full py-4 bg-cyan-400 text-black rounded-xl font-bold text-sm disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                                                    >
                                                        {hasCollabSigningEnergy ? 'Accept Cameo' : `Need ${collaborationSigningEnergyCost}E`}
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Delete */}
                    <button 
                        onClick={handleDelete}
                        className="w-full mt-6 py-4 border border-slate-200 text-slate-400 rounded-xl font-bold text-xs hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 size={16}/> {tr('messages.delete')}
                    </button>

                </div>
            )}
        </div>
    </div>
  );
};
