
import React, { useState } from 'react';
import { Player, Property, Vehicle, ClothingItem, SettableClothingStyle } from '../types';
import { CreditCard, Store, Briefcase, ChevronRight, Lock, Clapperboard, Tv, Star } from 'lucide-react';
import { LifestyleAssets } from './lifestyle/LifestyleAssets';
import { LifestyleBusiness } from './lifestyle/LifestyleBusiness';
import { ProductionWizard } from './lifestyle/business/ProductionWizard';
import { ProductionHouseGame } from './lifestyle/business/ProductionHouseGame';
import { PROPERTY_CUSTOMIZATIONS, VEHICLE_CUSTOMIZATIONS } from '../services/lifestyleLogic';
import { PremiumProductId } from '../services/premiumLogic';

interface LifestylePageProps {
  player: Player;
  onBuyItem: (item: Property | Vehicle | ClothingItem) => void;
  onSellItem: (itemId: string) => void;
  onSetResidence: (propertyId: string) => void;
  onSetActiveStyle: (style: SettableClothingStyle) => void;
  onStartBusiness: (type: any) => void; 
  onShutdownBusiness: () => void; 
  onUpdatePlayer?: (player: Player) => void; 
  onPremiumPurchase: (productId: PremiumProductId) => void;
}

export const LifestylePage: React.FC<LifestylePageProps> = ({ player, onBuyItem, onSellItem, onSetResidence, onSetActiveStyle, onUpdatePlayer, onPremiumPurchase }) => {
  const [view, setView] = useState<'MAIN' | 'ASSETS' | 'BUSINESS' | 'PRODUCTION_WIZARD' | 'PRODUCTION_GAME'>('MAIN');
  const [customizationItem, setCustomizationItem] = useState<Property | Vehicle | null>(null);
  const [selectedCustomizations, setSelectedCustomizations] = useState<any[]>([]);

  // Check if player owns a Production House
  const productionStudio = player.businesses.find(b => b.type === 'PRODUCTION_HOUSE');

  const handleProductionClick = () => {
      if (productionStudio) {
          setView('PRODUCTION_GAME');
      } else {
          setView('PRODUCTION_WIZARD');
      }
  };

  // --- CUSTOMIZATION LOGIC (Kept here as it spans multiple assets) ---
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

  const finalizeCustomPurchase = () => {
      if (!customizationItem) return;
      let finalPrice = customizationItem.price;
      const customLabels: string[] = [];
      let moodBonus = customizationItem.type === 'Property' ? (customizationItem as Property).moodBonus : 0;
      let repBonus = customizationItem.type === 'Vehicle' ? (customizationItem as Vehicle).reputationBonus : 0;

      selectedCustomizations.forEach(opt => {
          if (opt.flatCost) finalPrice += opt.flatCost;
          if (opt.costMultiplier) finalPrice += Math.floor(customizationItem.price * opt.costMultiplier);
          customLabels.push(opt.label);
          if (opt.statBonus) {
              if (opt.statBonus.moodBonus) moodBonus += opt.statBonus.moodBonus;
              if (opt.statBonus.reputationBonus) repBonus += opt.statBonus.reputationBonus;
          }
      });

      const newItem = {
          ...customizationItem,
          id: `${customizationItem.id}_cust_${Date.now()}`,
          name: `${customizationItem.name} ${customLabels.length > 0 ? '(Custom)' : ''}`,
          price: finalPrice,
          customizations: customLabels,
          ...(customizationItem.type === 'Property' ? { moodBonus } : {}),
          ...(customizationItem.type === 'Vehicle' ? { reputationBonus: repBonus } : {})
      };

      onBuyItem(newItem as any);
      setCustomizationItem(null);
      setSelectedCustomizations([]);
  };

  const toggleCustomization = (opt: any) => {
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
      return (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in slide-in-from-bottom duration-300">
              <div className="p-4 pt-12 border-b border-zinc-800 flex items-center justify-between bg-zinc-900 shrink-0">
                  <div className="flex items-center gap-3"><button onClick={() => setCustomizationItem(null)} className="text-white">Back</button><div className="font-bold text-lg">Customize</div></div>
                  <div className="text-emerald-400 font-mono font-bold">${calculateCustomTotal().toLocaleString()}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-black custom-scrollbar pb-32">
                  <div className="mb-6 text-center"><h2 className="text-2xl font-bold text-white mb-1">{customizationItem.name}</h2></div>
                  <div className="space-y-6">
                      {(customizationItem.type === 'Property' ? PROPERTY_CUSTOMIZATIONS : VEHICLE_CUSTOMIZATIONS).map(opt => {
                          const isSelected = selectedCustomizations.some(s => s.id === opt.id);
                          return (
                              <button key={opt.id} onClick={() => toggleCustomization(opt)} className={`w-full p-4 rounded-xl border text-left transition-all ${isSelected ? 'bg-indigo-900/30 border-indigo-500' : 'bg-zinc-900 border-zinc-800'}`}>
                                  <div className="font-bold text-sm text-white">{opt.label}</div>
                                  <div className="text-xs text-zinc-500">{opt.description}</div>
                              </button>
                          );
                      })}
                  </div>
              </div>
              <div className="p-6 pb-20 border-t border-zinc-800 bg-zinc-900 shrink-0 z-50">
                  <button onClick={finalizeCustomPurchase} disabled={player.money < calculateCustomTotal()} className="w-full py-4 bg-white text-black font-bold rounded-xl disabled:opacity-50">Purchase</button>
              </div>
          </div>
      );
  }

  if (view === 'ASSETS') return <LifestyleAssets player={player} onBack={() => setView('MAIN')} onBuy={onBuyItem} onSell={onSellItem} onSetResidence={onSetResidence} onInitiateCustomization={handleInitiateCustomization} onPremiumPurchase={onPremiumPurchase} />;
  
  if (view === 'BUSINESS') return <LifestyleBusiness player={player} onBack={() => setView('MAIN')} onUpdatePlayer={onUpdatePlayer!} />;
  
  if (view === 'PRODUCTION_WIZARD') return <ProductionWizard player={player} onCancel={() => setView('MAIN')} onUpdatePlayer={onUpdatePlayer!} onComplete={() => setView('PRODUCTION_GAME')} />;
  
  if (view === 'PRODUCTION_GAME') return <ProductionHouseGame player={player} onBack={() => setView('MAIN')} onUpdatePlayer={onUpdatePlayer!} />;

  return (
    <div className="space-y-6 pb-24 pt-4">
        <div className="flex items-center gap-4 mb-6"><h2 className="text-3xl font-bold text-white">Lifestyle</h2></div>
        
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><CreditCard size={100} /></div>
            <div className="relative z-10">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Liquid Cash</div>
                <div className="text-3xl font-bold text-white tracking-tight mb-4">${player.money.toLocaleString()}</div>
                <div className="flex gap-4">
                    <div><div className="text-[10px] text-zinc-600 uppercase font-bold">Assets</div><div className="text-sm font-mono text-zinc-300">~${(player.assets.length * 50000).toLocaleString()}</div></div>
                    <div><div className="text-[10px] text-zinc-600 uppercase font-bold">Equity</div><div className="text-sm font-mono text-emerald-400">${player.businesses.reduce((sum, b) => sum + b.stats.valuation, 0).toLocaleString()}</div></div>
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
                    <div>
                        <div className="font-bold text-xl text-white flex items-center gap-2">
                            {productionStudio ? productionStudio.name : 'Production House'}
                            {productionStudio && <Star size={12} className="text-amber-500 fill-amber-500"/>}
                        </div>
                        <div className="text-sm text-zinc-400">
                            {productionStudio ? 'Manage Studio Slate' : 'Create blockbuster films.'}
                        </div>
                    </div>
                </div>
                <ChevronRight className="absolute top-1/2 -translate-y-1/2 right-6 text-zinc-700 group-hover:text-zinc-400 transition-colors"/>
            </button>

            {/* Standard Assets */}
            <button onClick={() => setView('ASSETS')} className="glass-card p-6 rounded-3xl text-left hover:bg-white/5 transition-all group relative">
                <div className="flex items-center gap-4"><div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400"><Store size={24}/></div><div><div className="font-bold text-xl text-white">Assets</div><div className="text-sm text-zinc-400">Properties, vehicles & wardrobe.</div></div></div>
                <ChevronRight className="absolute top-1/2 -translate-y-1/2 right-6 text-zinc-700 group-hover:text-zinc-400 transition-colors"/>
            </button>

            {/* Business Empire (Excluding Production House) */}
            <button onClick={() => setView('BUSINESS')} className="glass-card p-6 rounded-3xl text-left hover:bg-white/5 transition-all group relative">
                <div className="flex items-center gap-4"><div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400"><Briefcase size={24}/></div><div><div className="font-bold text-xl text-white">Business Empire</div><div className="text-sm text-zinc-400">Manage your companies.</div></div></div>
                <ChevronRight className="absolute top-1/2 -translate-y-1/2 right-6 text-zinc-700 group-hover:text-zinc-400 transition-colors"/>
            </button>

            {/* Locked Content */}
            <button className="glass-card p-6 rounded-3xl text-left hover:bg-white/5 transition-all group relative opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-4"><div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400"><Tv size={24}/></div><div><div className="font-bold text-xl text-white">Streaming Platform</div><div className="text-sm text-zinc-400">Launch your own platform.</div></div><div className="ml-auto bg-zinc-800/50 px-2 py-1 rounded text-[10px] font-bold text-zinc-500 flex items-center gap-1 border border-zinc-700"><Lock size={10}/> SOON</div></div>
            </button>
        </div>
    </div>
  );
};
