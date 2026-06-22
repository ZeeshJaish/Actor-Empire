
import React, { useState } from 'react';
import { Player, Message, AuditionOpportunity, SponsorshipOffer, NegotiationData, ScheduledEvent, YoutubeBrandDeal, YoutubeCollabOffer } from '../../types';
import { ArrowLeft, Star, DollarSign, Calendar, CheckCircle, Lock, Trash2, Mail, Heart, Play, Users, Clapperboard, FileSearch, ShieldCheck, TrendingUp, AlertTriangle, FileSignature, Swords, ChevronRight, Landmark } from 'lucide-react';
import { ProjectDetailView } from '../../components/ProjectDetailView';
import { APP_DISPLAY_VERSION } from '../../services/appVersion';
import { getPlayerLanguage, t } from '../../services/i18n';

interface MessagesAppProps {
  player: Player;
  onBack: () => void;
  onAccept: (msg: Message) => void;
  onDelete: (id: string) => void;
  onMarkRead: (id: string) => void;
  onOpenRightsMarket?: (opportunityId?: string) => void;
  onOpenStudioAcquisition?: (studioId: string) => void;
}

export const MessagesApp: React.FC<MessagesAppProps> = ({ player, onBack, onAccept, onDelete, onMarkRead, onOpenRightsMarket, onOpenStudioAcquisition }) => {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  
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

  const handleOpenMessage = (msg: Message) => {
      const openedMessage = msg.isRead ? msg : { ...msg, isRead: true };
      if (!msg.isRead) onMarkRead(msg.id);
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
      setSelectedMessage(null);
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
    <div className="absolute inset-0 bg-slate-50 flex flex-col z-40 text-slate-900 animate-in slide-in-from-right duration-300 font-sans">
        
        {/* HEADER */}
        <div className="bg-white p-4 pt-12 pb-3 shadow-sm border-b border-slate-200 flex items-center gap-3 z-10 sticky top-0">
            <button 
                onClick={() => selectedMessage ? setSelectedMessage(null) : onBack()} 
                className="flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900"
            >
                <ArrowLeft size={20} /> {selectedMessage ? tr('messages.inbox') : tr('messages.home')}
            </button>
            <div className="font-bold text-lg flex-1 text-center pr-8">
                {selectedMessage ? tr('messages.message') : tr('messages.inbox')}
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
                                        msg.type === 'RIGHTS_REPORT' ? 'bg-gradient-to-br from-amber-500 to-orange-700' :
                                        msg.type === 'RIGHTS_NEGOTIATION' ? 'bg-gradient-to-br from-zinc-800 to-amber-800' :
                                        msg.type === 'SYSTEM' ? 'bg-gradient-to-br from-zinc-700 to-black' : 
                                        'bg-slate-400'
                                    }`}>
                                        {msg.type === 'CASTING_FEEDBACK'
                                            ? <Clapperboard size={20} />
                                            : msg.type === 'STUDIO_ACQUISITION'
                                                ? <Landmark size={20} />
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
                    ) : selectedMessage.type === 'SYSTEM' ? (
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

                                            return (
                                                <>
                                                    <h3 className="text-2xl font-bold mb-1 leading-tight">{opp?.projectName || tr('messages.offerUnavailable')}</h3>
                                                    <p className="text-sm text-slate-400 mb-6">
                                                        {opp ? `${opp.roleType} Role • ${opp.genre}` : tr('messages.contractMissing')}
                                                    </p>
                                                    
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
                                        <button onClick={handleSignDeal} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold text-sm">{tr('messages.acceptDeal')}</button>
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
                                                        <div className="bg-white/5 rounded-xl p-3">{tr('messages.energy')}: <strong>{collab.energyCost}E</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">{tr('messages.potentialViews')}: <strong>~{collab.bonusViews.toLocaleString()}</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">{tr('messages.potentialSubs')}: <strong>~+{collab.bonusSubscribers.toLocaleString()}</strong></div>
                                                    </div>
                                                    <button onClick={handleSignDeal} className="w-full py-4 bg-red-500 text-white rounded-xl font-bold text-sm">{tr('messages.acceptCollab')}</button>
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
                                                        <div className="bg-white/5 rounded-xl p-3">{tr('messages.energy')}: <strong>{deal.energyCost}E</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">{tr('messages.payout')}: <strong>${deal.payout.toLocaleString()}</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">{tr('messages.penalty')}: <strong>${deal.penalty.toLocaleString()}</strong></div>
                                                    </div>
                                                    <button onClick={handleSignDeal} className="w-full py-4 bg-amber-500 text-black rounded-xl font-bold text-sm">{tr('messages.acceptDeal')}</button>
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
