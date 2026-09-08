
import React, { useEffect, useMemo, useState } from 'react';
import { Player, Property, Vehicle, ClothingItem } from '../types';
import { ArrowLeft, CalendarDays, Check, CreditCard, Store, Briefcase, ChevronRight, Clapperboard, Sparkles, Tv, Star, WalletCards, Ticket } from 'lucide-react';
import { LifestyleAssets } from './lifestyle/LifestyleAssets';
import { LifestyleBusiness } from './lifestyle/LifestyleBusiness';
import { LifestyleActivities } from './lifestyle/LifestyleActivities';
import { ProductionWizard } from './lifestyle/business/ProductionWizard';
import { ProductionHouseGame } from './lifestyle/business/ProductionHouseGame';
import { PROPERTY_CUSTOMIZATIONS, VEHICLE_CUSTOMIZATIONS } from '../services/lifestyleLogic';
import type { CustomizationOption } from '../services/lifestyleLogic';
import { PremiumProductId } from '../services/premiumLogic';
import { getPlayerLanguage, t } from '../services/i18n';
import { getLifestyleAssetImageInfo } from '../services/lifestyleAssetImages';
import { AssetShareModal, type ShareableAsset } from './lifestyle/components/AssetShareModal';
import StreamingLockedScreen from '../components/StreamingLockedScreen';
import CinemaLockedScreen from '../components/CinemaLockedScreen';
import { getPlayerBusinessEquityValue } from '../services/studioGroupValuation';
import { evaluateStreamingEligibility } from '../services/streamingEligibility';

interface LifestylePageProps {
  player: Player;
  onBuyItem: (item: Property | Vehicle | ClothingItem) => void;
  onSellItem: (itemId: string) => void;
  onSetResidence: (propertyId: string) => void;
  onStartBusiness: (type: any) => void;
  onShutdownBusiness: () => void;
  onUpdatePlayer?: (player: Player) => void;
  onPremiumPurchase: (productId: PremiumProductId) => void;
  onReturnHome?: () => void;
  onNavVisibilityChange?: (visible: boolean) => void;
  initialView?: 'MAIN' | 'ASSETS' | 'ACTIVITIES' | 'BUSINESS' | 'PRODUCTION_WIZARD' | 'PRODUCTION_GAME' | 'STREAMING_PLATFORM' | 'STREAMING_FINANCE' | 'CINEMA_CHAIN';
  onInitialViewConsumed?: () => void;
  onOpenBank?: () => void;
  initialRightsMarketOpportunityId?: string;
  onRightsMarketTargetConsumed?: () => void;
  initialStreamingContentOfferId?: string;
  onStreamingContentOfferConsumed?: () => void;
  initialStudioContinuation?: { studioId: string; scriptId: string };
  onStudioContinuationConsumed?: () => void;
  initialPlatformCommission?: { studioId: string; offerId: string };
  onPlatformCommissionConsumed?: () => void;
}

const CustomizationHeroImage: React.FC<{ item: Property | Vehicle }> = ({ item }) => {
  const imageInfo = getLifestyleAssetImageInfo(item);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
      setFailed(false);
  }, [item.id]);

  return (
      <img
          src={failed ? imageInfo.fallbackSrc : imageInfo.src}
          alt={imageInfo.alt}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover [image-rendering:pixelated] ${item.type === 'Vehicle' ? 'object-[center_68%]' : ''}`}
          draggable={false}
      />
  );
};

export const LifestylePage: React.FC<LifestylePageProps> = ({ player, onBuyItem, onSellItem, onSetResidence, onUpdatePlayer, onPremiumPurchase, onReturnHome, onNavVisibilityChange, initialView, onInitialViewConsumed, onOpenBank, initialRightsMarketOpportunityId, onRightsMarketTargetConsumed, initialStreamingContentOfferId, onStreamingContentOfferConsumed, initialStudioContinuation, onStudioContinuationConsumed, initialPlatformCommission, onPlatformCommissionConsumed }) => {
  const [view, setView] = useState<'MAIN' | 'ASSETS' | 'ACTIVITIES' | 'BUSINESS' | 'PRODUCTION_WIZARD' | 'PRODUCTION_GAME' | 'STREAMING_PLATFORM' | 'CINEMA_CHAIN'>('MAIN');
  const [customizationItem, setCustomizationItem] = useState<Property | Vehicle | null>(null);
  const [selectedCustomizations, setSelectedCustomizations] = useState<CustomizationOption[]>([]);
  const [purchaseCelebrationAsset, setPurchaseCelebrationAsset] = useState<ShareableAsset | null>(null);
  const [streamingOriginalTarget, setStreamingOriginalTarget] = useState<{ studioId: string; scriptId: string; commissionId: string } | null>(null);
  const [streamingDestination, setStreamingDestination] = useState<'HOME' | 'FINANCE'>('HOME');
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  const trFallback = (key: string, fallback: string) => {
      const translated = tr(key);
      return translated === key ? fallback : translated;
  };
  const getAssetDisplayName = (item: Property | Vehicle | ClothingItem) => {
      const baseId = (item as any).baseAssetId || item.id.split('_cust_')[0];
      return trFallback(`lifestyle.asset.${baseId}.name`, item.name);
  };
  const getVehicleTypeLabel = (item: Vehicle) => trFallback(`lifestyle.filter.${item.vehicleType}`, item.vehicleType);
  const getCustomizationLabel = (opt: CustomizationOption) => trFallback(`lifestyle.custom.${opt.id}.name`, opt.label);
  const getCustomizationDescription = (opt: CustomizationOption) => trFallback(`lifestyle.custom.${opt.id}.desc`, opt.description);

  useEffect(() => {
      onNavVisibilityChange?.(view === 'MAIN' && !customizationItem);
      return () => onNavVisibilityChange?.(true);
  }, [view, customizationItem, onNavVisibilityChange]);

  useEffect(() => {
      if (!initialView) return;
      if (initialView === 'STREAMING_FINANCE') {
          setStreamingDestination('FINANCE');
          setView('STREAMING_PLATFORM');
      } else {
          if (initialView === 'STREAMING_PLATFORM') setStreamingDestination('HOME');
          if (initialView !== view) setView(initialView);
      }
      onInitialViewConsumed?.();
  }, [initialView, view, onInitialViewConsumed]);

  const openStreamingPlatform = (destination: 'HOME' | 'FINANCE' = 'HOME') => {
      setStreamingDestination(destination);
      setView('STREAMING_PLATFORM');
  };

  // Check if player owns a Production House
  const productionStudio = player.businesses.find(b => b.type === 'PRODUCTION_HOUSE');
  const streamingEligibility = useMemo(() => evaluateStreamingEligibility(player), [player]);
  const streamingAccessBadge = player.ownedStreamingPlatform.lifecycle !== 'LOCKED'
      ? 'Studio Ready'
      : streamingEligibility.eligible
          ? 'Launch Ready'
          : `${Math.round(streamingEligibility.readiness * 100)}%`;

  const handleProductionClick = () => {
      if (productionStudio) {
          setView('PRODUCTION_GAME');
      } else {
          setView('PRODUCTION_WIZARD');
      }
  };

  // --- CUSTOMIZATION LOGIC (Kept here as it spans multiple assets) ---
  const handleBuyWithCelebration = (item: Property | Vehicle | ClothingItem) => {
      onBuyItem(item);
      setPurchaseCelebrationAsset(item);
  };

  const handleInitiateCustomization = (item: Property | Vehicle) => {
      setCustomizationItem(item);
      setSelectedCustomizations([]);
  };

	  const calculateCustomTotal = () => {
	      if (!customizationItem) return 0;
	      let total = customizationItem.price;
      selectedCustomizations.forEach(opt => {
          if (opt.flatCost) total += opt.flatCost;
          if (opt.costMultiplier) total += Math.floor(customizationItem.price * opt.costMultiplier);
      });
	      return total;
	  };

      const formatCompactMoney = (value: number) => {
          const abs = Math.abs(value);
          const formatUnit = (divisor: number, suffix: string) => {
              const scaled = value / divisor;
              const decimals = Math.abs(scaled) >= 100 ? 0 : 1;
              return `$${scaled.toFixed(decimals).replace(/\.0$/, '')}${suffix}`;
          };
          if (abs >= 1_000_000_000_000) return formatUnit(1_000_000_000_000, 'T');
          if (abs >= 1_000_000_000) return formatUnit(1_000_000_000, 'B');
          if (abs >= 1_000_000) return formatUnit(1_000_000, 'M');
          if (abs >= 1_000) return formatUnit(1_000, 'K');
          return `$${Math.round(value).toLocaleString()}`;
      };

  const finalizeCustomPurchase = () => {
      if (!customizationItem) return;
      let finalPrice = customizationItem.price;
      const customLabels: string[] = [];
      let moodBonus = customizationItem.type === 'Property' ? (customizationItem as Property).moodBonus : 0;
      let repBonus = customizationItem.type === 'Vehicle' ? (customizationItem as Vehicle).reputationBonus : 0;

      selectedCustomizations.forEach(opt => {
          if (opt.flatCost) finalPrice += opt.flatCost;
          if (opt.costMultiplier) finalPrice += Math.floor(customizationItem.price * opt.costMultiplier);
          customLabels.push(getCustomizationLabel(opt));
          if (opt.statBonus) {
              if (opt.statBonus.moodBonus) moodBonus += opt.statBonus.moodBonus;
              if (opt.statBonus.reputationBonus) repBonus += opt.statBonus.reputationBonus;
          }
      });

      const newItem = {
          ...customizationItem,
          baseAssetId: (customizationItem as any).baseAssetId || customizationItem.id.split('_cust_')[0],
          id: `${customizationItem.id}_cust_${Date.now()}`,
          name: `${getAssetDisplayName(customizationItem)} ${customLabels.length > 0 ? tr('lifestyle.customSuffix') : ''}`.trim(),
          price: finalPrice,
          customizations: customLabels,
          ...(customizationItem.type === 'Property' ? { moodBonus } : {}),
          ...(customizationItem.type === 'Vehicle' ? { reputationBonus: repBonus } : {})
      };

      handleBuyWithCelebration(newItem as any);
      setCustomizationItem(null);
      setSelectedCustomizations([]);
  };

  const toggleCustomization = (opt: CustomizationOption) => {
      setSelectedCustomizations(prev => {
          if (['COLOR', 'INTERIOR'].includes(opt.type)) {
              const others = prev.filter(p => p.type !== opt.type);
              if (prev.some(p => p.id === opt.id)) return others;
              return [...others, opt];
          } else {
              if (prev.some(p => p.id === opt.id)) return prev.filter(p => p.id !== opt.id);
              return [...prev, opt];
          }
      });
  };

  // --- RENDER ---

	  if (customizationItem) {
          const customOptions = customizationItem.type === 'Property' ? PROPERTY_CUSTOMIZATIONS : VEHICLE_CUSTOMIZATIONS;
          const heroMeta = customizationItem.type === 'Property'
              ? `${customizationItem.location || tr('lifestyle.realEstate')} • +${customizationItem.moodBonus} ${tr('lifestyle.mood')}`
              : `${getVehicleTypeLabel(customizationItem)} • +${customizationItem.reputationBonus} ${tr('lifestyle.rep')}`;
		      return (
		          <div className="fixed inset-0 z-[100] flex flex-col bg-black animate-in slide-in-from-bottom duration-300">
		              <div className="relative h-[360px] shrink-0 overflow-hidden border-b border-zinc-800 bg-black">
                          <CustomizationHeroImage item={customizationItem} />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/15" />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-black/30" />
		                  <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-5 pt-12">
	                          <button onClick={() => setCustomizationItem(null)} className="rounded-2xl border border-white/10 bg-black/55 p-3 text-white shadow-xl shadow-black/30 backdrop-blur"><ArrowLeft size={20}/></button>
	                          <div className="rounded-2xl border border-emerald-300/20 bg-black/55 px-4 py-3 text-right shadow-xl shadow-black/30 backdrop-blur">
	                              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/75">{tr('lifestyle.total')}</div>
	                              <div className="font-mono text-xl font-black leading-none text-emerald-300">{formatCompactMoney(calculateCustomTotal())}</div>
	                          </div>
	                      </div>
                          <div className="absolute inset-x-0 bottom-0 p-5">
                              <div className="max-w-[92%]">
                                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-200 drop-shadow">{tr('lifestyle.customStudio')}</div>
                                  <h1 className="mt-1 text-5xl font-black leading-[0.88] text-white drop-shadow-lg">{getAssetDisplayName(customizationItem)}</h1>
                                  <div className="mt-3 inline-flex rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-200 backdrop-blur">{heroMeta}</div>
                              </div>
                          </div>
		              </div>
		              <div className="flex-1 overflow-y-auto bg-black p-5 pb-36 custom-scrollbar">
	                      <div className="mb-5 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/20 via-zinc-950 to-black p-4">
	                          <div className="flex items-center gap-3">
	                              <div className="rounded-2xl border border-white/10 bg-black/50 p-3 text-indigo-200"><Sparkles size={22}/></div>
	                              <div>
	                                  <div className="text-lg font-black text-white">{tr('lifestyle.makeItYours')}</div>
	                                  <div className="mt-0.5 text-xs font-bold leading-relaxed text-zinc-500">{tr('lifestyle.customSystemNote')}</div>
	                              </div>
	                          </div>
	                          <div className="mt-3 grid grid-cols-3 gap-2">
	                              <div className="min-w-0 rounded-2xl bg-black/50 p-3">
	                                  <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{tr('lifestyle.base')}</div>
	                                  <div className="mt-1 truncate text-lg font-black text-white">{formatCompactMoney(customizationItem.price)}</div>
	                              </div>
	                              <div className="min-w-0 rounded-2xl bg-black/50 p-3">
	                                  <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{tr('lifestyle.upgrades')}</div>
	                                  <div className="mt-1 text-lg font-black text-cyan-300">{selectedCustomizations.length}</div>
	                              </div>
	                              <div className="min-w-0 rounded-2xl bg-black/50 p-3">
	                                  <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{tr('lifestyle.cash')}</div>
	                                  <div className="mt-1 truncate text-lg font-black text-emerald-300">{formatCompactMoney(player.money)}</div>
	                              </div>
	                          </div>
	                      </div>

	                  <div className="grid gap-3">
	                      {customOptions.map(opt => {
	                          const isSelected = selectedCustomizations.some(s => s.id === opt.id);
                              const optionCost = (opt.flatCost || 0) + (opt.costMultiplier ? Math.floor(customizationItem.price * opt.costMultiplier) : 0);
	                          return (
	                              <button key={opt.id} onClick={() => toggleCustomization(opt)} className={`w-full rounded-3xl border p-4 text-left transition-all ${isSelected ? 'border-indigo-400 bg-indigo-500/15 shadow-[0_0_28px_rgba(129,140,248,0.16)]' : 'border-zinc-800 bg-zinc-950'}`}>
                                      <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                              <div className="text-base font-black text-white">{getCustomizationLabel(opt)}</div>
                                              <div className="mt-1 text-sm font-bold leading-relaxed text-zinc-500">{getCustomizationDescription(opt)}</div>
                                          </div>
                                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-indigo-300 bg-indigo-300 text-black' : 'border-zinc-700 bg-black text-zinc-600'}`}>
                                              {isSelected ? <Check size={18}/> : <WalletCards size={16}/>}
                                          </div>
                                      </div>
                                      <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-200">+${optionCost.toLocaleString()}</div>
	                              </button>
	                          );
	                      })}
	                  </div>
	              </div>
	              <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 p-5 pb-8">
	                  <button onClick={finalizeCustomPurchase} disabled={player.money < calculateCustomTotal()} className="w-full rounded-3xl bg-white py-4 text-sm font-black uppercase tracking-[0.18em] text-black disabled:opacity-50">{tr('lifestyle.purchase')}</button>
	              </div>
	          </div>
	      );
	  }

  const purchaseShareModal = purchaseCelebrationAsset ? (
      <AssetShareModal
          player={player}
          assets={[purchaseCelebrationAsset]}
          mode="purchase"
          onClose={() => setPurchaseCelebrationAsset(null)}
      />
  ) : null;

	  if (view === 'ASSETS') return (
          <>
              <LifestyleAssets player={player} onBack={() => setView('MAIN')} onBuy={handleBuyWithCelebration} onSell={onSellItem} onSetResidence={onSetResidence} onUpdatePlayer={onUpdatePlayer} onInitiateCustomization={handleInitiateCustomization} onPremiumPurchase={onPremiumPurchase} />
              {purchaseShareModal}
          </>
      );

  if (view === 'ACTIVITIES') return <LifestyleActivities player={player} onBack={() => setView('MAIN')} onUpdatePlayer={onUpdatePlayer} />;

  if (view === 'BUSINESS') return <LifestyleBusiness player={player} onBack={() => setView('MAIN')} onUpdatePlayer={onUpdatePlayer!} />;

  if (view === 'PRODUCTION_WIZARD') return <ProductionWizard player={player} onCancel={() => setView('MAIN')} onUpdatePlayer={onUpdatePlayer!} onComplete={() => setView('PRODUCTION_GAME')} />;

  if (view === 'PRODUCTION_GAME') return <ProductionHouseGame player={player} onBack={() => setView('MAIN')} onUpdatePlayer={onUpdatePlayer!} initialRightsMarketOpportunityId={initialRightsMarketOpportunityId} onRightsMarketTargetConsumed={onRightsMarketTargetConsumed} initialStudioContinuation={initialStudioContinuation} onStudioContinuationConsumed={onStudioContinuationConsumed} initialPlatformCommission={initialPlatformCommission} onPlatformCommissionConsumed={onPlatformCommissionConsumed} initialStreamingOriginal={streamingOriginalTarget || undefined} onStreamingOriginalConsumed={() => setStreamingOriginalTarget(null)} onStreamingOriginalGreenlightComplete={() => openStreamingPlatform()} onOpenOwnedStreamingDelivery={() => openStreamingPlatform()} />;

  if (view === 'STREAMING_PLATFORM') return (
      <StreamingLockedScreen
          player={player}
          onUpdatePlayer={onUpdatePlayer}
          onBack={() => setView('MAIN')}
          onReturnToGame={onReturnHome || (() => setView('MAIN'))}
          onOpenBank={onOpenBank}
          initialDestination={streamingDestination}
          initialContentMarketOfferId={initialStreamingContentOfferId}
          onContentMarketOfferConsumed={onStreamingContentOfferConsumed}
          onOpenOriginalProduction={target => {
              setStreamingOriginalTarget(target);
              setView('PRODUCTION_GAME');
          }}
      />
  );

  if (view === 'CINEMA_CHAIN') return (
      <CinemaLockedScreen onBack={() => setView('MAIN')} />
  );

  return (
    <div className="space-y-6 pb-24 pt-4">
        <div className="flex items-center gap-4 mb-6"><h2 className="text-3xl font-bold text-white">{tr('lifestyle.title')}</h2></div>

        <div className="glass-card p-6 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><CreditCard size={100} /></div>
            <div className="relative z-10">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">{tr('lifestyle.liquidCash')}</div>
                <div className="text-3xl font-bold text-white tracking-tight mb-4">${Math.round(player.money).toLocaleString()}</div>
                <div className="flex gap-4">
                    <div><div className="text-[10px] text-zinc-600 uppercase font-bold">{tr('lifestyle.assets')}</div><div className="text-sm font-mono text-zinc-300">~{formatCompactMoney(player.assets.length * 50000)}</div></div>
                    <div><div className="text-[10px] text-zinc-600 uppercase font-bold">{tr('lifestyle.equity')}</div><div className="text-sm font-mono text-emerald-400">{formatCompactMoney(getPlayerBusinessEquityValue(player))}</div></div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-4">

            {/* PRODUCTION HOUSE - Special Highlighted Card */}
            <button
                onClick={handleProductionClick}
                className={`glass-card p-6 rounded-3xl text-left transition-all group relative overflow-hidden ${productionStudio ? 'border-amber-500/50 hover:bg-amber-900/10' : 'hover:bg-white/5 opacity-80 hover:opacity-100'}`}
            >
                {/* Gold Glow for Owners */}
                {productionStudio && <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none"></div>}

                <div className="flex items-center gap-4 relative z-10">
                    <div className={`p-3 rounded-2xl ${productionStudio ? 'bg-amber-500 text-black' : 'bg-amber-500/10 text-amber-400'}`}>
                        <Clapperboard size={24}/>
                    </div>
                    <div className="min-w-0 flex-1 pr-2">
                        <div className="font-bold text-xl text-white flex items-center gap-2">
                            {productionStudio ? productionStudio.name : tr('lifestyle.productionHouse')}
                            {productionStudio && <Star size={12} className="text-amber-500 fill-amber-500"/>}
                        </div>
                        <div className="text-sm text-zinc-400">
                            {productionStudio ? tr('lifestyle.manageStudioSlate') : tr('lifestyle.createBlockbusters')}
                        </div>
                    </div>
                    <ChevronRight className="shrink-0 text-zinc-700 group-hover:text-zinc-400 transition-colors"/>
                </div>
            </button>

            {/* Standard Assets */}
            <button onClick={() => setView('ASSETS')} className="glass-card p-6 rounded-3xl text-left hover:bg-white/5 transition-all group relative">
                <div className="flex items-center gap-4"><div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400"><Store size={24}/></div><div className="min-w-0 flex-1 pr-2"><div className="font-bold text-xl text-white">{tr('lifestyle.assetsTitle')}</div><div className="text-sm text-zinc-400">{tr('lifestyle.assetsSub')}</div></div><ChevronRight className="shrink-0 text-zinc-700 group-hover:text-zinc-400 transition-colors"/></div>
            </button>

            {/* Activities */}
            <button onClick={() => setView('ACTIVITIES')} className="glass-card p-6 rounded-3xl text-left hover:bg-white/5 transition-all group relative">
                <div className="flex items-center gap-4"><div className="p-3 rounded-2xl bg-sky-500/10 text-sky-300"><CalendarDays size={24}/></div><div className="min-w-0 flex-1 pr-2"><div className="font-bold text-xl text-white">{tr('lifestyle.activitiesTitle')}</div><div className="text-sm text-zinc-400">{tr('lifestyle.activitiesSub')}</div></div><ChevronRight className="shrink-0 text-zinc-700 group-hover:text-zinc-400 transition-colors"/></div>
            </button>

            {/* Business Empire (Excluding Production House) */}
            <button onClick={() => setView('BUSINESS')} className="glass-card p-6 rounded-3xl text-left hover:bg-white/5 transition-all group relative">
                <div className="flex items-center gap-4"><div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400"><Briefcase size={24}/></div><div className="min-w-0 flex-1 pr-2"><div className="font-bold text-xl text-white">{tr('lifestyle.businessEmpire')}</div><div className="text-sm text-zinc-400">{tr('lifestyle.businessSub')}</div></div><ChevronRight className="shrink-0 text-zinc-700 group-hover:text-zinc-400 transition-colors"/></div>
            </button>

            {/* Streaming Platform */}
            <button onClick={() => openStreamingPlatform()} className="glass-card p-6 rounded-3xl text-left hover:bg-purple-500/10 transition-all group relative">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400"><Tv size={24}/></div>
                    <div className="min-w-0 flex-1 pr-2">
                        <div className="font-bold text-xl text-white">{tr('lifestyle.streamingPlatform')}</div>
                        <div className="text-sm text-zinc-400">{tr('lifestyle.streamingSub')}</div>
                    </div>
                    <div className="shrink-0 rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-purple-200">{streamingAccessBadge}</div>
                    <ChevronRight className="shrink-0 text-zinc-700 group-hover:text-purple-300 transition-colors"/>
                </div>
            </button>

            {/* Cinema Chain */}
            <button onClick={() => setView('CINEMA_CHAIN')} className="glass-card p-6 rounded-3xl text-left hover:bg-amber-500/10 transition-all group relative">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-300"><Ticket size={24}/></div>
                    <div className="min-w-0 flex-1 pr-2">
                        <div className="font-bold text-xl text-white">{trFallback('lifestyle.cinemaChain', 'Cinema Chain')}</div>
                        <div className="text-sm text-zinc-400">{trFallback('lifestyle.cinemaChainSub', 'Build theaters, sell tickets, and own the box office.')}</div>
                    </div>
                    <div className="shrink-0 rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">Preview</div>
                    <ChevronRight className="shrink-0 text-zinc-700 group-hover:text-amber-200 transition-colors"/>
                </div>
            </button>
        </div>
    </div>
  );
};
