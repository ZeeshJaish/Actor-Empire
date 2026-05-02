
import React, { useState } from 'react';
import { Player, Message, AuditionOpportunity, SponsorshipOffer, NegotiationData, ScheduledEvent, YoutubeBrandDeal, YoutubeCollabOffer } from '../../types';
import { ArrowLeft, Star, DollarSign, Calendar, CheckCircle, Lock, Trash2, Mail, Heart, Play, Users } from 'lucide-react';
import { ProjectDetailView } from '../../components/ProjectDetailView';
import { APP_DISPLAY_VERSION } from '../../services/appVersion';

interface MessagesAppProps {
  player: Player;
  onBack: () => void;
  onAccept: (msg: Message) => void;
  onDelete: (id: string) => void;
  onMarkRead: (id: string) => void;
}

export const MessagesApp: React.FC<MessagesAppProps> = ({ player, onBack, onAccept, onDelete, onMarkRead }) => {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State for the full-screen contract view
  const [contractViewData, setContractViewData] = useState<{
      type: 'ROLE' | 'NEGOTIATION';
      opportunity: AuditionOpportunity;
      data?: NegotiationData; // Only if negotiation
  } | null>(null);

  const messages = player.inbox || [];

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
      } else if (selectedMessage.type === 'OFFER_ROLE') {
          const data = selectedMessage.data as AuditionOpportunity;
          if (!data) return;
          setContractViewData({
              type: 'ROLE',
              opportunity: data
          });
      }
  };

  // --- ACTIONS ---

  const handleCounterOffer = (salary: number, royalty: number) => {
      // Simulate counter offer logic (In a real app this would update the message state)
      // For this UI demo, we will just alert and close for now, or assume it's accepted for gameplay flow
      alert(`Counter Offer Sent: $${salary.toLocaleString()} + ${royalty}% Royalty.\n\n(Simulated: The studio accepts!)`);
      
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
              actionLabel={isNeg ? "Accept Current Offer" : "Sign Contract"}
              isProcessing={isProcessing}
              actionColorClass={isNeg ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-white text-black hover:bg-zinc-200'}
              headerTitle={isNeg ? "Deal Negotiation" : "Official Contract"}
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
                <ArrowLeft size={20} /> {selectedMessage ? 'Inbox' : 'Home'}
            </button>
            <div className="font-bold text-lg flex-1 text-center pr-8">
                {selectedMessage ? 'Message' : 'Inbox'}
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
                            <p className="font-medium">No messages</p>
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
                                        msg.type === 'SYSTEM' ? 'bg-gradient-to-br from-zinc-700 to-black' : 
                                        'bg-slate-400'
                                    }`}>
                                        {msg.sender[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <div className="font-bold text-slate-900 truncate pr-2">{msg.sender}</div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-slate-400 font-mono">Wk {msg.weekSent}</div>
                                                {typeof msg.expiresIn === 'number' && (
                                                    <div className={`text-[10px] font-semibold ${msg.expiresIn <= 1 ? 'text-rose-500' : 'text-amber-500'}`}>
                                                        {msg.expiresIn}w left
                                                    </div>
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
                    {/* SYSTEM MESSAGE (Cool Layout) */}
                    {selectedMessage.type === 'SYSTEM' ? (
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
                                
                                <div className="space-y-4 text-sm font-sans text-zinc-300 leading-relaxed text-justify">
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
                            {(selectedMessage.type === 'OFFER_ROLE' || selectedMessage.type === 'OFFER_NEGOTIATION') && selectedMessage.data && (
                                <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-6 opacity-10"><Star size={120} /></div>
                                    <div className="relative z-10">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Star size={14} className="text-amber-400"/> Cast Offer
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
                                                    <h3 className="text-2xl font-bold mb-1 leading-tight">{opp?.projectName || 'Offer details unavailable'}</h3>
                                                    <p className="text-sm text-slate-400 mb-6">
                                                        {opp ? `${opp.roleType} Role • ${opp.genre}` : 'This contract is missing some data.'}
                                                    </p>
                                                    
                                                    <div className="flex items-end justify-between mb-6 border-t border-white/10 pt-4">
                                                        <div>
                                                            <div className="text-[10px] text-slate-500 uppercase font-bold">Salary</div>
                                                            <div className="text-xl font-mono font-bold text-emerald-400">${safePay.toLocaleString()}</div>
                                                        </div>
                                                        {opp?.royaltyPercentage && opp.royaltyPercentage > 0 && (
                                                            <div className="text-right">
                                                                <div className="text-[10px] text-slate-500 uppercase font-bold">Points</div>
                                                                <div className="text-xl font-mono font-bold text-amber-400">{opp.royaltyPercentage}%</div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button 
                                                        onClick={handleOpenContract}
                                                        disabled={!hasValidContract}
                                                        className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <CheckCircle size={18}/> Review Contract
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
                                        <button onClick={handleSignDeal} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold text-sm">Accept Deal</button>
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
                                                        <Play size={14}/> Creator Collab
                                                    </div>
                                                    <h3 className="text-2xl font-bold mb-1">{collab.creatorName}</h3>
                                                    <div className="text-sm text-red-200/80 mb-2">{collab.creatorHandle}</div>
                                                    <div className="text-lg font-semibold mb-3">{collab.conceptTitle}</div>
                                                    <p className="text-sm text-red-100/80 mb-5">{collab.description}</p>
                                                    <div className="grid grid-cols-2 gap-3 text-xs mb-5">
                                                        <div className="bg-white/5 rounded-xl p-3">Format: <strong>{collab.requiredType.replace(/_/g, ' ')}</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">Energy: <strong>{collab.energyCost}E</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">Potential Views: <strong>~{collab.bonusViews.toLocaleString()}</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">Potential Subs: <strong>~+{collab.bonusSubscribers.toLocaleString()}</strong></div>
                                                    </div>
                                                    <button onClick={handleSignDeal} className="w-full py-4 bg-red-500 text-white rounded-xl font-bold text-sm">Accept Collab</button>
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
                                                        <Play size={14}/> Channel Integration
                                                    </div>
                                                    <h3 className="text-2xl font-bold mb-1">{deal.brandName}</h3>
                                                    <div className="text-sm text-amber-200/80 mb-2">{deal.category}</div>
                                                    <p className="text-sm text-amber-100/80 mb-5">{deal.description}</p>
                                                    <div className="grid grid-cols-2 gap-3 text-xs mb-5">
                                                        <div className="bg-white/5 rounded-xl p-3">Format: <strong>{deal.requiredType.replace(/_/g, ' ')}</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">Energy: <strong>{deal.energyCost}E</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">Payout: <strong>${deal.payout.toLocaleString()}</strong></div>
                                                        <div className="bg-white/5 rounded-xl p-3">Penalty: <strong>${deal.penalty.toLocaleString()}</strong></div>
                                                    </div>
                                                    <button onClick={handleSignDeal} className="w-full py-4 bg-amber-500 text-black rounded-xl font-bold text-sm">Accept Deal</button>
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
                        <Trash2 size={16}/> Delete Message
                    </button>

                </div>
            )}
        </div>
    </div>
  );
};
