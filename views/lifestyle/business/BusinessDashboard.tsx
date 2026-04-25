
import React, { useState, useEffect } from 'react';
import { Player, Business } from '../../../types';
import { BUSINESS_BLUEPRINTS, checkAndRefreshHiringPool, hireCandidate, expandBusiness, restockProduct, updateProductPrice, createProduct, BUSINESS_THEMES, BUSINESS_AMENITIES, BUSINESS_PRODUCTION_TYPES, PRODUCT_CATALOG, PRODUCT_DEV_OPTIONS, injectCapital, withdrawCapital, sellBusiness, liquidateBusiness } from '../../../services/businessLogic';
import { formatMoney } from '../../../services/formatUtils';
import { spendPlayerEnergy } from '../../../services/premiumLogic';
import { ArrowLeft, Activity, Store, Megaphone, DollarSign, TrendingUp, Target, Settings, Shield, Globe, Plus, Minus, UserPlus, Briefcase, User, ShoppingBag, X, Zap, Beaker, RefreshCw, BarChart2, Users, Tv, Package, AlertTriangle, LogOut, Star, AlertCircle, ArrowRight } from 'lucide-react';

interface BusinessDashboardProps {
    business: Business;
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
}

type Tab = 'OVERVIEW' | 'OPS' | 'MARKET' | 'MONEY';

export const BusinessDashboard: React.FC<BusinessDashboardProps> = ({ business, player, onBack, onUpdatePlayer }) => {
    const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
    const [showCapitalModal, setShowCapitalModal] = useState<'INJECT' | 'WITHDRAW' | null>(null);
    const [capitalAmount, setCapitalAmount] = useState('');
    
    // Product Creator
    const [showProductCreator, setShowProductCreator] = useState(false);
    const [prodCreatorStep, setProdCreatorStep] = useState(1);
    const [newProdName, setNewProdName] = useState('');
    const [newProdType, setNewProdType] = useState('');
    const [newProdQty, setNewProdQty] = useState(100);
    const [devOptions, setDevOptions] = useState({ material: 'mat_standard', process: 'proc_mass', packaging: 'pack_basic' });
    const [customSellingPrice, setCustomSellingPrice] = useState<string>('');
    
    // Restock
    const [restockTarget, setRestockTarget] = useState<{ id: string, quantity: number } | null>(null);
    
    // Hiring
    const [showRecruit, setShowRecruit] = useState(false);

    // EXIT MODAL
    const [showExitModal, setShowExitModal] = useState<'SELL' | 'LIQUIDATE' | null>(null);

    const blueprint = BUSINESS_BLUEPRINTS[business.type];
    const filteredHiringPool = business.hiringPool.filter(candidate => {
        if (candidate.role === 'MANAGER' && business.staff.some(staff => staff.role === 'MANAGER')) return false;
        if (blueprint.model === 'PRODUCT' && candidate.role === 'STAFF') return false;
        return true;
    });

    // --- HELPERS ---

    const getEstimatedUnitCost = () => {
        const def = PRODUCT_CATALOG.find(p => p.id === newProdType);
        if (!def) return 0;
        let multiplier = 1.0;
        const mat = PRODUCT_DEV_OPTIONS.MATERIALS.options.find(o => o.id === devOptions.material);
        if (mat) multiplier *= mat.costMult;
        const proc = PRODUCT_DEV_OPTIONS.PROCESS.options.find(o => o.id === devOptions.process);
        if (proc) multiplier *= proc.costMult;
        const pack = PRODUCT_DEV_OPTIONS.PACKAGING.options.find(o => o.id === devOptions.packaging);
        if (pack) multiplier *= pack.costMult;
        return Math.floor(def.baseCost * multiplier);
    };

    const getRoleIcon = (role: string) => {
        switch(role) {
            case 'MANAGER': return <Briefcase size={12}/>;
            case 'SALESPERSON': return <ShoppingBag size={12}/>;
            default: return <User size={12}/>;
        }
    };
    const getRoleColor = (role: string) => {
        switch(role) {
            case 'MANAGER': return 'bg-purple-900/30 text-purple-400 border-purple-500/30';
            case 'SALESPERSON': return 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30';
            default: return 'bg-blue-900/30 text-blue-400 border-blue-500/30';
        }
    };

    // --- FUNNEL METRICS CALCULATION ---
    const locations = business.stats.locations || 1;
    
    // 1. Demand (Hype + Location + Config)
    let baseDemand = 800; 
    if (['FINE_DINING', 'LUXURY_BRAND'].includes(business.subtype)) baseDemand = 150; 
    if (['FAST_FOOD', 'ONLINE_STORE'].includes(business.subtype)) baseDemand = 3000; 

    const hypeMod = 1 + (business.stats.hype / 100); 
    const fameMod = 1 + (player.stats.fame / 200); 
    // const brandMod = business.stats.brandHealth / 50; // Brand Health impacts Hype Decay now, not direct demand
    
    let appealMod = 1.0;
    let trafficMod = 1.0;
    if (business.config.theme) {
        const theme = BUSINESS_THEMES.find(t => t.id === business.config.theme);
        if (theme) appealMod = theme.appealMod;
    }
    if (business.config.amenities) {
        business.config.amenities.forEach(amenId => {
            const amen = BUSINESS_AMENITIES.find(a => a.id === amenId);
            if (amen && amen.trafficMod) trafficMod *= amen.trafficMod;
        });
    }
    const estimatedDemand = Math.floor((baseDemand || 0) * (hypeMod || 1) * (fameMod || 1) * (locations || 1) * (appealMod || 1) * (trafficMod || 1)) || 0;

    // 2. Capacity (Space / Inventory)
    let estimatedCapacity = 0;
    if (blueprint.model === 'SERVICE') {
        const workers = business.staff.filter(s => s.role !== 'MANAGER');
        if (workers.length > 0) {
            const avgSkill = workers.reduce((acc, s) => acc + (s.skill || 0), 0) / workers.length;
            const staffCapacity = workers.length * 20 * (1 + (avgSkill/100)); // ~20-40 per worker
            const physicalCapacity = (business.stats.capacity || 50) * (locations || 1);
            estimatedCapacity = Math.floor(Math.min(staffCapacity || 0, physicalCapacity || 0)) || 0;
        } else {
            estimatedCapacity = 0;
        }
    } else {
        // Product Model: Capacity is effectively inventory
        estimatedCapacity = business.products.reduce((acc, p) => acc + (p.inventory || 0), 0);
    }

    // --- INSIGHT LOGIC ---
    let managerInsight = "Everything looks stable.";
    let insightColor = "text-zinc-400";
    let insightIcon = <Activity size={16}/>;

    if (blueprint.model === 'SERVICE') {
        if (business.staff.filter(s => s.role !== 'MANAGER').length === 0) {
             managerInsight = "CRITICAL: No staff hired! We cannot serve anyone. Hire staff immediately.";
             insightColor = "text-rose-500 animate-pulse";
             insightIcon = <AlertCircle size={16}/>;
        }
        else if (estimatedDemand > estimatedCapacity * 1.2) {
            managerInsight = "We are turning people away! Hire more staff or expand locations.";
            insightColor = "text-amber-400";
            insightIcon = <Store size={16}/>;
        } else if (estimatedCapacity > estimatedDemand * 1.5) {
            managerInsight = "Tables are empty. Increase Marketing to fill seats.";
            insightColor = "text-blue-400";
            insightIcon = <Megaphone size={16}/>;
        }
    } else {
        // Product Logic
        if (estimatedCapacity === 0) {
            managerInsight = "SOLD OUT! We are making $0 revenue. Restock inventory now!";
            insightColor = "text-rose-500 animate-pulse";
            insightIcon = <Package size={16}/>;
        }
        else if (estimatedCapacity < estimatedDemand * 0.2) {
            managerInsight = "Low Inventory! We will sell out soon. Restock.";
            insightColor = "text-amber-400";
            insightIcon = <Package size={16}/>;
        } else if (estimatedDemand < 50) {
            managerInsight = "No one knows about our brand. Run a marketing campaign.";
            insightColor = "text-blue-400";
            insightIcon = <Megaphone size={16}/>;
        }
    }

    // Auto-set default price
    useEffect(() => {
        if (prodCreatorStep === 3 && !customSellingPrice) {
            const cost = getEstimatedUnitCost();
            setCustomSellingPrice(Math.floor(cost * 2.5).toString());
        }
    }, [prodCreatorStep]);

    // --- HANDLERS ---
    const handleCapitalAction = () => {
        const amount = parseInt(capitalAmount.replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) return;
        if (showCapitalModal === 'INJECT') {
            if (player.money < amount) { alert("Insufficient personal funds."); return; }
            const updatedBiz = injectCapital(business, amount);
            const businesses = player.businesses.map(b => b.id === business.id ? updatedBiz : b);
            onUpdatePlayer({ ...player, money: player.money - amount, businesses });
        } else {
            const res = withdrawCapital(business, amount);
            if (!res.success) { alert("Insufficient business funds."); return; }
            const businesses = player.businesses.map(b => b.id === business.id ? res.updated : b);
            onUpdatePlayer({ ...player, money: player.money + amount, businesses });
        }
        setShowCapitalModal(null);
        setCapitalAmount('');
    };

    const handleCreateProduct = () => {
        if (!newProdType || !newProdName) return;
        if (player.energy.current < 25) { alert("Not enough energy! (25E)"); return; }
        const def = PRODUCT_CATALOG.find(p => p.id === newProdType);
        if (!def) return;
        const finalPrice = customSellingPrice ? parseInt(customSellingPrice) : undefined;
        const res = createProduct(business, newProdName, newProdType, newProdQty, def.baseCost, finalPrice, devOptions);
        if (res.success) {
            const businesses = player.businesses.map(b => b.id === business.id ? res.updated : b);
            const nextPlayer = { ...player, businesses };
            spendPlayerEnergy(nextPlayer, res.energyCost || 0);
            onUpdatePlayer(nextPlayer);
            setShowProductCreator(false); setProdCreatorStep(1); setNewProdName(''); setNewProdQty(100); setNewProdType(''); setCustomSellingPrice('');
            setDevOptions({ material: 'mat_standard', process: 'proc_mass', packaging: 'pack_basic' });
        } else {
            alert(res.msg);
        }
    };

    const handleMarketingChange = (channel: 'social' | 'influencer' | 'billboard' | 'tv', value: number) => {
        const currentBudget = business.config.marketingBudget || { social: 0, influencer: 0, billboard: 0, tv: 0 };
        const newBudget = { ...currentBudget, [channel]: value };
        const updatedBiz = { 
            ...business, 
            config: { ...business.config, marketingBudget: newBudget }
        };
        const businesses = player.businesses.map(b => b.id === business.id ? updatedBiz : b);
        onUpdatePlayer({ ...player, businesses });
    };

    const handleRecruit = () => {
        const updatedBiz = checkAndRefreshHiringPool(business, player.currentWeek);
        const businesses = player.businesses.map(b => b.id === business.id ? updatedBiz : b);
        onUpdatePlayer({ ...player, businesses });
        setShowRecruit(true);
    };

    const handleHire = (candidate: any) => {
        if (candidate.role === 'MANAGER' && business.staff.some(s => s.role === 'MANAGER')) { alert("Manager already hired."); return; }
        const updated = hireCandidate(business, candidate);
        const businesses = player.businesses.map(b => b.id === business.id ? updated : b);
        onUpdatePlayer({ ...player, businesses });
        setShowRecruit(false);
    };

    const handleFire = (staffId: string) => {
        const updated = { ...business, staff: business.staff.filter(s => s.id !== staffId) };
        const businesses = player.businesses.map(b => b.id === business.id ? updated : b);
        onUpdatePlayer({ ...player, businesses });
    };

    const handleRestock = () => {
        if (!restockTarget) return;
        const res = restockProduct(business, restockTarget.id, restockTarget.quantity);
        if (res.success) {
            const businesses = player.businesses.map(b => b.id === business.id ? res.updated : b);
            onUpdatePlayer({ ...player, businesses });
            setRestockTarget(null);
        } else {
            alert(res.msg);
        }
    };

    const handleExpand = () => {
        const res = expandBusiness(business);
        if (res.success) {
            const businesses = player.businesses.map(b => b.id === business.id ? res.updated : b);
            onUpdatePlayer({ ...player, businesses });
            alert(res.msg);
        } else {
            alert(res.msg);
        }
    };
    
    const handlePriceChange = (prodId: string, delta: number) => {
        const prod = business.products.find(p => p.id === prodId);
        if (!prod) return;
        const updated = updateProductPrice(business, prodId, Math.max(1, prod.sellingPrice + delta));
        const businesses = player.businesses.map(b => b.id === business.id ? updated : b);
        onUpdatePlayer({ ...player, businesses });
    };

    // --- EXIT HANDLERS ---
    const executeExit = () => {
        if (!showExitModal) return;

        if (showExitModal === 'SELL') {
            const res = sellBusiness(business);
            if (!res.success) {
                alert(res.msg);
                setShowExitModal(null);
                return;
            }
            const updatedBusinesses = player.businesses.filter(b => b.id !== business.id);
            const newMoney = player.money + res.payout;
            onUpdatePlayer({ 
                ...player, 
                money: newMoney, 
                businesses: updatedBusinesses,
                logs: [...player.logs, { week: player.currentWeek, year: player.age, message: res.msg, type: 'positive' }]
            });
            onBack();
        } 
        else if (showExitModal === 'LIQUIDATE') {
            const res = liquidateBusiness(business);
            const updatedBusinesses = player.businesses.filter(b => b.id !== business.id);
            const newMoney = player.money + res.payout;
            onUpdatePlayer({ 
                ...player, 
                money: newMoney, 
                businesses: updatedBusinesses,
                logs: [...player.logs, { week: player.currentWeek, year: player.age, message: res.msg, type: 'neutral' }]
            });
            onBack();
        }
    };

    // Marketing & Exit Calcs
    const mBudget = business.config.marketingBudget || { social: 0, influencer: 0, billboard: 0, tv: 0 };
    const weeklyMarketingCost = (Object.values(mBudget) as number[]).reduce((a, b) => a + b, 0);
    const totalInventory = business.products.reduce((acc, p) => acc + (p.inventory || 0), 0);
    const sellCheck = sellBusiness(business);
    const liquidateCheck = liquidateBusiness(business);

    // Star Rating
    const starRating = Math.max(0, Math.min(5, (business.stats.customerSatisfaction / 20)));

    return (
        <div className="absolute inset-0 bg-[#050505] flex flex-col z-[60] text-white animate-in slide-in-from-right duration-300 font-sans">
            {/* HERO HEADER */}
            <div className="relative pt-12 pb-6 px-6 bg-zinc-900/50 border-b border-white/5 backdrop-blur-xl shrink-0 z-20">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={onBack} className="bg-black/40 hover:bg-black/60 p-2 rounded-full backdrop-blur-md transition-colors border border-white/5"><ArrowLeft size={18} /></button>
                    <div className="flex gap-2">
                        <button onClick={() => setShowCapitalModal('INJECT')} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-[10px] font-bold border border-emerald-500/20 transition-colors">+ Inject</button>
                        <button onClick={() => setShowCapitalModal('WITHDRAW')} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-full text-[10px] font-bold border border-rose-500/20 transition-colors">- Withdraw</button>
                    </div>
                </div>
                <div className="flex items-end justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-4xl shadow-2xl border border-white/10">{business.logo}</div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight leading-none mb-1">{business.name}</h1>
                            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1">{business.subtype.replace('_', ' ')}</div>
                            <div className="flex items-center gap-0.5">
                                {[1,2,3,4,5].map(s => (
                                    <Star key={s} size={12} className={s <= Math.round(starRating) ? "text-yellow-400 fill-yellow-400" : "text-zinc-700"} />
                                ))}
                                <span className="ml-2 text-xs font-bold text-zinc-500">{starRating.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right"><div className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">Cash Balance</div><div className="font-mono font-bold text-white text-lg">{formatMoney(business.balance)}</div></div>
                </div>
            </div>

            {/* TABS */}
            <div className="flex p-1 mx-4 mt-4 bg-zinc-900/80 rounded-xl border border-white/5 backdrop-blur-sm sticky top-2 z-10">
                {[{ id: 'OVERVIEW', icon: Activity, label: 'Dash' }, { id: 'OPS', icon: Store, label: 'Ops' }, { id: 'MARKET', icon: Megaphone, label: 'Promo' }, { id: 'MONEY', icon: DollarSign, label: 'Finance' }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all ${activeTab === tab.id ? 'bg-white text-black shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <tab.icon size={16} strokeWidth={2.5} /><span className="text-[9px] font-bold uppercase tracking-wide mt-0.5">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 pb-24">
                {activeTab === 'OVERVIEW' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        {/* Manager Insight */}
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3">
                            <div className={`p-2 rounded-lg bg-black ${insightColor}`}>{insightIcon}</div>
                            <div>
                                <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Manager's Report</div>
                                <div className="text-sm font-medium text-white leading-tight">{managerInsight}</div>
                            </div>
                        </div>

                        {/* Traffic Funnel Visualization */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Traffic Funnel</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold text-blue-400">Demand</span>
                                        <span className="text-zinc-400">{estimatedDemand.toLocaleString()} / wk</span>
                                    </div>
                                    <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
                                    </div>
                                    <div className="text-[9px] text-zinc-600 mt-1">Based on Hype & Location</div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold text-amber-400">{blueprint.model === 'SERVICE' ? 'Service Capacity' : 'Inventory'}</span>
                                        <span className="text-zinc-400">{estimatedCapacity.toLocaleString()} {blueprint.model === 'SERVICE' ? 'seats' : 'units'}</span>
                                    </div>
                                    <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (estimatedCapacity / Math.max(estimatedDemand, 1)) * 100)}%` }}></div>
                                    </div>
                                    <div className="text-[9px] text-zinc-600 mt-1">
                                        {blueprint.model === 'SERVICE' ? 'Limited by Staff & Space.' : 'Limited by Stock.'} 
                                        {estimatedCapacity < estimatedDemand ? ' BOTTLENECK!' : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financials */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp size={48}/></div>
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Weekly Net</div>
                                <div className={`text-2xl font-black tracking-tight ${business.stats.weeklyProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{business.stats.weeklyProfit >= 0 ? '+' : ''}{formatMoney(business.stats.weeklyProfit)}</div>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Target size={48}/></div>
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Valuation</div>
                                <div className="text-2xl font-black tracking-tight text-white">{formatMoney(business.stats.valuation)}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* OPS TAB */}
                {activeTab === 'OPS' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        {/* Capacity Section (SERVICE ONLY) */}
                        {blueprint.model === 'SERVICE' && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-5">
                                <div className="flex items-center gap-2 mb-4 text-amber-400 text-xs font-bold uppercase tracking-widest">
                                    <Store size={14}/> Capacity Management
                                </div>
                                <div className="flex items-center justify-between mb-4 bg-black/40 p-3 rounded-xl border border-zinc-800">
                                    <div>
                                        <div className="text-white font-bold">{business.stats.locations} Locations</div>
                                        <div className="text-[10px] text-zinc-500">Physical Cap: {(business.stats.capacity || 50) * business.stats.locations}</div>
                                    </div>
                                    <button onClick={handleExpand} className="bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1"><Plus size={12}/> Expand</button>
                                </div>
                                <p className="text-[10px] text-zinc-500 leading-tight">Opening new locations increases your total capacity limit.</p>
                            </div>
                        )}

                        {/* Throughput Section (SERVICE ONLY) */}
                        {blueprint.model === 'SERVICE' && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                                        <Users size={14}/> Staffing
                                    </div>
                                    <button onClick={handleRecruit} className="bg-zinc-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-zinc-700"><UserPlus size={12}/> Recruit</button>
                                </div>
                                
                                <div className="space-y-2">
                                    {business.staff.length === 0 ? <div className="text-center text-rose-500 font-bold text-xs py-2">⚠️ No Staff! Business is halted.</div> :
                                    business.staff.map(emp => (
                                        <div key={emp.id} className="bg-black/40 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-zinc-400 border border-zinc-700 bg-zinc-800`}>{getRoleIcon(emp.role)}</div>
                                                <div>
                                                    <div className="font-bold text-white text-sm">{emp.name}</div>
                                                    <div className="flex items-center gap-2"><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${getRoleColor(emp.role)}`}>{emp.role}</span> <span className="text-[9px] text-zinc-500">Skill: {emp.skill}</span></div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleFire(emp.id)} className="text-rose-500 text-[10px] font-bold bg-rose-950/20 px-2 py-1 rounded hover:bg-rose-950/40">Fire</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Inventory Section (Product Only) */}
                        {blueprint.model === 'PRODUCT' && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-widest">
                                        <Package size={14}/> Product Lines
                                    </div>
                                    <button onClick={() => setShowProductCreator(true)} className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-blue-500"><Plus size={12}/> New SKU</button>
                                </div>
                                <div className="space-y-3">
                                    {business.products.map(prod => {
                                        const prodDef = PRODUCT_CATALOG.find(p => p.id === (prod as any).catalogId);
                                        const maxPossible = Math.floor((business.balance || 0) / Math.max(1, prod.productionCost || 1));
                                        const isRestocking = restockTarget?.id === prod.id;
                                        return (
                                            <div key={prod.id} className={`bg-black/40 border border-zinc-800 p-4 rounded-2xl flex flex-col gap-3 transition-all ${isRestocking ? 'border-indigo-500 ring-1 ring-indigo-500/20' : ''}`}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="font-bold text-white text-base">{prod.name}</div>
                                                            {prodDef && <div className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 uppercase tracking-wide">{prodDef.name}</div>}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-0.5">
                                                            <span>Quality: {prod.quality}/100</span>
                                                            <span className={`font-bold px-1.5 py-0.5 rounded ${prod.inventory === 0 ? 'bg-rose-500 text-white' : 'bg-zinc-950 text-zinc-400'}`}>
                                                                {prod.inventory === 0 ? 'SOLD OUT' : `Stock: ${prod.inventory}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right"><div className="font-mono font-bold text-white">{formatMoney(prod.sellingPrice)}</div></div>
                                                </div>
                                                {isRestocking ? (
                                                    <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-700 animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="flex justify-between items-center text-xs text-zinc-400 mb-2"><span className="font-bold uppercase tracking-wider text-[10px]">Restock Qty</span><span className="font-mono text-white font-bold">{restockTarget.quantity}</span></div>
                                                        <input type="range" min="0" max={maxPossible} value={restockTarget.quantity} onChange={(e) => setRestockTarget({...restockTarget, quantity: parseInt(e.target.value)})} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mb-3"/>
                                                        <div className="flex gap-2"><button onClick={() => setRestockTarget(null)} className="flex-1 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-xs font-bold hover:text-white">Cancel</button><button onClick={handleRestock} disabled={restockTarget.quantity <= 0} className="flex-[2] py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 disabled:opacity-50">Confirm -${(restockTarget.quantity * prod.productionCost).toLocaleString()}</button></div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
                                                        <button onClick={() => { if (maxPossible <= 0) { alert("Insufficient funds."); return; } setRestockTarget({ id: prod.id, quantity: Math.min(50, maxPossible) }); }} disabled={maxPossible <= 0} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-[10px] font-bold uppercase disabled:opacity-50 flex items-center justify-center gap-1.5"><RefreshCw size={12}/> Restock</button>
                                                        <div className="flex items-center bg-black rounded-lg border border-zinc-800"><button onClick={() => handlePriceChange(prod.id, -1)} className="p-2 text-zinc-500 hover:text-white"><Minus size={12}/></button><div className="text-[10px] font-bold w-12 text-center text-zinc-300">Price</div><button onClick={() => handlePriceChange(prod.id, 1)} className="p-2 text-zinc-500 hover:text-white"><Plus size={12}/></button></div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* NEW MARKETING TAB */}
                {activeTab === 'MARKET' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        {/* Hype Monitor */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-purple-500"></div>
                            <div className="relative z-10">
                                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Market Hype</div>
                                <div className="text-6xl font-black text-white tracking-tighter mb-2">{Math.round(business.stats.hype || 0)}<span className="text-lg text-zinc-500 font-medium">/100</span></div>
                                <div className="flex justify-center gap-4 text-xs font-mono">
                                    <div className="text-emerald-400">Gain: +{(Math.sqrt(weeklyMarketingCost) * 0.05).toFixed(1)}/wk</div>
                                    <div className="text-rose-500">Decay: -{Math.max(0.5, 4 - ((business.stats.brandHealth || 0) * 0.035)).toFixed(1)}/wk</div>
                                </div>
                                
                                <div className="mt-4 p-3 bg-black/40 rounded-xl text-left border border-white/5">
                                    <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-1">
                                        <span className="uppercase font-bold tracking-widest">Brand Health</span>
                                        <span>{Math.round(business.stats.brandHealth || 0)}/100</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500" style={{width: `${business.stats.brandHealth || 0}%`}}></div>
                                    </div>
                                    <div className="text-[9px] text-zinc-600 mt-1 italic">Higher Brand Health reduces Hype Decay naturally.</div>
                                </div>
                            </div>
                        </div>

                        {/* Weekly Spend Controls */}
                        <div>
                            <div className="flex justify-between items-center mb-3 px-2">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Weekly Budget</h3>
                                <div className="text-xs font-mono text-zinc-400">Total: <span className="text-white font-bold">${weeklyMarketingCost.toLocaleString()}</span>/wk</div>
                            </div>
                            
                            <div className="space-y-3">
                                {[
                                    { id: 'social', label: 'Social Media', min: 0, max: 5000, step: 100, icon: Globe },
                                    { id: 'influencer', label: 'Influencers', min: 0, max: 20000, step: 500, icon: Users },
                                    { id: 'billboard', label: 'Billboards', min: 0, max: 50000, step: 1000, icon: Store },
                                    { id: 'tv', label: 'TV Spots', min: 0, max: 200000, step: 5000, icon: Tv },
                                ].map((channel) => (
                                    <div key={channel.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-black rounded-lg text-zinc-400"><channel.icon size={16}/></div>
                                                <span className="font-bold text-sm text-white">{channel.label}</span>
                                            </div>
                                            <div className="font-mono text-emerald-400 font-bold text-sm">
                                                ${(mBudget[channel.id as keyof typeof mBudget] || 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <input 
                                            type="range" 
                                            min={channel.min} 
                                            max={channel.max} 
                                            step={channel.step}
                                            value={mBudget[channel.id as keyof typeof mBudget] || 0}
                                            onChange={(e) => handleMarketingChange(channel.id as any, parseInt(e.target.value))}
                                            className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* MONEY TAB */}
                {activeTab === 'MONEY' && (
                     <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                     <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden">
                         <div className="bg-zinc-900/50 p-4 border-b border-zinc-800 flex justify-between items-center">
                             <h3 className="font-bold text-white text-sm uppercase tracking-wide">P&L Statement</h3>
                             <div className="text-[10px] font-bold bg-zinc-800 px-2 py-1 rounded text-zinc-400">This Week</div>
                         </div>
                         <div className="p-6 space-y-4">
                             <div className="flex justify-between items-center">
                                 <div className="text-xs text-zinc-400 font-bold uppercase">Revenue</div>
                                 <div className="font-mono font-bold text-emerald-400">{formatMoney(business.stats.weeklyRevenue)}</div>
                             </div>
                             <div className="flex justify-between items-center">
                                 <div className="text-xs text-zinc-400 font-bold uppercase">Expenses</div>
                                 <div className="font-mono font-bold text-rose-500">-{formatMoney(business.stats.weeklyExpenses)}</div>
                             </div>
                             <div className="h-px bg-zinc-800 w-full"></div>
                             <div className="flex justify-between items-center">
                                 <div className="text-sm text-white font-bold uppercase">Net Profit</div>
                                 <div className={`font-mono font-bold text-lg ${business.stats.weeklyProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                     {formatMoney(business.stats.weeklyProfit)}
                                 </div>
                             </div>
                         </div>
                     </div>

                     <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6">
                         <h3 className="font-bold text-white text-sm uppercase tracking-wide mb-4">Balance Sheet</h3>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                                 <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Cash</div>
                                 <div className="font-mono font-bold text-white">{formatMoney(business.balance)}</div>
                             </div>
                             <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                                 <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Total Valuation</div>
                                 <div className="font-mono font-bold text-white">{formatMoney(business.stats.valuation)}</div>
                             </div>
                         </div>
                     </div>
                     
                     {/* EXIT STRATEGY SECTION */}
                     <div className="bg-red-950/20 border border-red-500/20 rounded-[2rem] p-6 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="font-bold text-white text-sm uppercase tracking-wide mb-4 flex items-center gap-2"><LogOut size={16} className="text-red-500"/> Exit Strategy</h3>
                            <div className="space-y-3">
                                {/* Sell Option */}
                                <button 
                                    onClick={() => setShowExitModal('SELL')} 
                                    disabled={!sellCheck.success}
                                    className={`w-full p-4 rounded-xl border flex flex-col gap-1 transition-all ${
                                        sellCheck.success 
                                        ? 'bg-emerald-900/20 border-emerald-500/50 hover:bg-emerald-900/40 text-left' 
                                        : 'bg-zinc-900/50 border-zinc-800 opacity-60 cursor-not-allowed text-center'
                                    }`}
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <div className={`font-bold text-sm ${sellCheck.success ? 'text-emerald-400' : 'text-zinc-500'}`}>Sell Business</div>
                                        {sellCheck.success && <div className="text-xs font-mono font-bold text-white">Est. {formatMoney(sellCheck.payout)}</div>}
                                    </div>
                                    {!sellCheck.success && <div className="text-[10px] text-zinc-500 font-normal">{sellCheck.msg}</div>}
                                </button>
                                
                                {/* Liquidate Option */}
                                <button 
                                    onClick={() => setShowExitModal('LIQUIDATE')}
                                    className="w-full p-4 rounded-xl border border-rose-500/30 bg-rose-950/10 hover:bg-rose-950/30 transition-all flex flex-col gap-1 text-left"
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <div className="font-bold text-sm text-rose-400">Shut Down & Liquidate</div>
                                        <div className="text-xs font-mono font-bold text-zinc-400">Est. {formatMoney(liquidateCheck.payout)}</div>
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-normal">Close operations. Assets sold for scrap.</div>
                                </button>
                            </div>
                        </div>
                     </div>
                 </div>
                )}
            </div>

            {/* MODALS */}
            {showProductCreator && (
                <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
                    <div className="bg-zinc-900 w-full max-w-sm rounded-[2rem] border border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                        <div className="p-6 pb-2 flex items-center justify-between"><h3 className="text-xl font-black text-white uppercase tracking-tight">Develop Product</h3><button onClick={() => setShowProductCreator(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button></div>
                        <div className="flex px-6 gap-2 mb-4"><div className={`h-1 flex-1 rounded-full ${prodCreatorStep >= 1 ? 'bg-indigo-500' : 'bg-zinc-800'}`}></div><div className={`h-1 flex-1 rounded-full ${prodCreatorStep >= 2 ? 'bg-indigo-500' : 'bg-zinc-800'}`}></div><div className={`h-1 flex-1 rounded-full ${prodCreatorStep >= 3 ? 'bg-indigo-500' : 'bg-zinc-800'}`}></div></div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
                            {prodCreatorStep === 1 && (<div className="space-y-4"><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Category</label><div className="grid grid-cols-2 gap-2">{PRODUCT_CATALOG.filter(p => p.businessTypes.includes(business.type)).map(def => (<button key={def.id} onClick={() => { setNewProdType(def.id); setCustomSellingPrice(''); }} className={`p-3 rounded-xl border text-xs font-bold text-left flex items-center gap-2 transition-all ${newProdType === def.id ? 'bg-white text-black border-white' : 'bg-black border-zinc-800 text-zinc-400'}`}><span className="text-lg">{def.emoji}</span> {def.name}</button>))}</div>{newProdType && (<div><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 mt-4">Product Name</label><input type="text" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-white transition-colors"/></div>)}</div>)}
                            {prodCreatorStep === 2 && (<div className="space-y-6">{Object.entries(PRODUCT_DEV_OPTIONS).map(([key, section]) => (<div key={key}><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">{section.label}</label><div className="grid grid-cols-1 gap-2">{section.options.map(opt => { const isSelected = devOptions[key.toLowerCase() as keyof typeof devOptions] === opt.id; return (<button key={opt.id} onClick={() => setDevOptions({...devOptions, [key.toLowerCase()]: opt.id})} className={`p-3 rounded-xl border text-left flex justify-between items-center transition-all ${isSelected ? 'bg-indigo-900/40 border-indigo-500' : 'bg-black border-zinc-800'}`}><div><div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{opt.label}</div><div className="text-[10px] text-zinc-500">{opt.desc}</div></div><div className="text-right">{opt.costMult > 1 && <div className="text-[9px] text-rose-400 font-mono">+{Math.round((opt.costMult - 1)*100)}% Cost</div>}{opt.qualityBonus > 0 && <div className="text-[9px] text-emerald-400 font-mono">+{opt.qualityBonus} Qual</div>}</div></button>)})}</div></div>))}<div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex justify-between items-center mt-4"><span className="text-xs text-zinc-400 font-bold uppercase">Est. Unit Cost</span><span className="font-mono font-bold text-white text-lg">${getEstimatedUnitCost().toLocaleString()}</span></div></div>)}
                            {prodCreatorStep === 3 && newProdType && (<div className="space-y-4"><div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center"><div className="text-4xl mb-2">{PRODUCT_CATALOG.find(p => p.id === newProdType)?.emoji}</div><div className="text-xl font-bold text-white">{newProdName}</div><div className="text-xs text-zinc-500 mt-1">Ready for Production</div></div><div className="bg-black p-4 rounded-xl border border-zinc-800 space-y-4"><div className="flex justify-between items-center text-xs"><span className="text-zinc-500 font-bold uppercase">Unit Cost</span><span className="text-white font-mono font-bold">${getEstimatedUnitCost().toLocaleString()}</span></div><div><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Selling Price ($)</label><input type="number" value={customSellingPrice} onChange={(e) => setCustomSellingPrice(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white font-mono font-bold text-right focus:border-indigo-500 focus:outline-none"/></div>{(() => { const cost = getEstimatedUnitCost(); const price = parseInt(customSellingPrice) || 0; const profit = price - cost; const margin = price > 0 ? (profit / price) * 100 : 0; const isProfitable = profit > 0; return (<div className={`p-3 rounded-lg border flex justify-between items-center ${isProfitable ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-rose-900/10 border-rose-500/30'}`}><div className="text-xs font-bold text-zinc-400 uppercase">Net Margin</div><div className="text-right"><div className={`font-mono font-bold ${isProfitable ? 'text-emerald-400' : 'text-rose-500'}`}>{margin.toFixed(1)}%</div><div className="text-[10px] text-zinc-500 font-mono">{isProfitable ? '+' : ''}${profit.toLocaleString()} / unit</div></div></div>); })()}<div className="flex justify-between text-xs pt-2 border-t border-zinc-800"><span className="text-zinc-500">Initial Batch</span><span className="text-white font-mono font-bold">{newProdQty} Units</span></div></div><div className="flex justify-between items-center text-xs px-2"><span className="text-zinc-500 font-bold uppercase">Energy Cost</span><div className="flex items-center gap-1 text-amber-400 font-bold"><Zap size={14} fill="currentColor"/> 25</div></div><div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-xl flex items-start gap-3"><Beaker className="text-indigo-400 shrink-0" size={18}/><div className="text-[10px] text-indigo-200">Final quality involves a luck factor. Premium materials increase chance of high quality but cost more to produce.</div></div></div>)}
                        </div>
                        <div className="p-6 border-t border-zinc-800 bg-zinc-900"><div className="flex gap-3">{prodCreatorStep > 1 && (<button onClick={() => setProdCreatorStep(prodCreatorStep - 1)} className="px-4 py-3 bg-zinc-800 text-white rounded-xl font-bold text-sm hover:bg-zinc-700">Back</button>)}{prodCreatorStep < 3 ? (<button onClick={() => setProdCreatorStep(prodCreatorStep + 1)} disabled={prodCreatorStep === 1 && (!newProdType || !newProdName)} className="flex-1 py-3 bg-white text-black font-bold rounded-xl disabled:opacity-50">Next Step</button>) : (<button onClick={handleCreateProduct} disabled={player.energy.current < 25} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"><BarChart2 size={18}/> Launch Product</button>)}</div></div>
                    </div>
                </div>
            )}
            
            {showCapitalModal && (
                <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
                    <div className="bg-zinc-900 w-full max-w-sm rounded-[2rem] border border-zinc-800 p-6 shadow-2xl relative">
                        <button onClick={() => setShowCapitalModal(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20}/></button>
                        <h3 className="text-xl font-bold text-white mb-2">{showCapitalModal === 'INJECT' ? 'Inject Capital' : 'Withdraw Funds'}</h3>
                        <p className="text-xs text-zinc-500 mb-6 font-medium">{showCapitalModal === 'INJECT' ? `Personal Balance: ${formatMoney(player.money)}` : `Business Balance: ${formatMoney(business.balance)}`}</p>
                        <div className="bg-black rounded-2xl p-2 border border-zinc-800 mb-4 flex items-center"><span className="pl-4 text-zinc-500 font-bold">$</span><input type="number" value={capitalAmount} onChange={(e) => setCapitalAmount(e.target.value)} placeholder="0" className="w-full bg-transparent p-4 text-white text-2xl font-mono font-bold focus:outline-none"/></div>
                        <button onClick={handleCapitalAction} className={`w-full py-4 text-white font-bold rounded-xl transition-colors shadow-lg ${showCapitalModal === 'INJECT' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'}`}>Confirm {showCapitalModal === 'INJECT' ? 'Injection' : 'Withdrawal'}</button>
                    </div>
                </div>
            )}

            {showExitModal && (
                <div className="fixed inset-0 z-[60] bg-red-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95">
                    <div className="bg-zinc-900 w-full max-w-sm rounded-[2rem] border border-red-500/30 p-6 shadow-2xl relative text-center">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/40">
                             <AlertTriangle size={32} className="text-red-500"/>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">{showExitModal === 'SELL' ? 'Sell Company' : 'Shut Down'}</h3>
                        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                            {showExitModal === 'SELL' 
                                ? `Are you sure you want to sell ${business.name}? You will receive the valuation amount plus any cash in the business account.`
                                : `Are you sure you want to shut down? Assets will be liquidated for scrap value. This cannot be undone.`
                            }
                        </p>
                        
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800 mb-6">
                            <div className="flex justify-between items-center mb-2 text-xs">
                                <span className="text-zinc-500 font-bold uppercase">Cash Balance</span>
                                <span className={business.balance >= 0 ? 'text-white' : 'text-rose-500'}>{formatMoney(business.balance)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2 text-xs">
                                <span className="text-zinc-500 font-bold uppercase">{showExitModal === 'SELL' ? 'Valuation' : 'Scrap Value'}</span>
                                <span className="text-white">
                                    {showExitModal === 'SELL' ? formatMoney(business.stats.valuation) : formatMoney(liquidateCheck.payout - business.balance)}
                                </span>
                            </div>
                            <div className="border-t border-zinc-700 my-2"></div>
                            <div className="flex justify-between items-center text-sm font-bold">
                                <span className="text-white uppercase">Net Payout</span>
                                <span className={showExitModal === 'SELL' ? 'text-emerald-400' : 'text-zinc-200'}>
                                    {showExitModal === 'SELL' ? formatMoney(sellCheck.payout) : formatMoney(liquidateCheck.payout)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setShowExitModal(null)} className="py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700">Cancel</button>
                            <button onClick={executeExit} className="py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 shadow-lg shadow-red-900/20">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {showRecruit && (
                <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
                    <div className="bg-zinc-900 w-full max-w-sm rounded-[2rem] border border-zinc-800 overflow-hidden shadow-2xl relative flex flex-col max-h-[70vh]">
                        <div className="p-6 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center"><h3 className="font-black text-white text-lg uppercase tracking-tight">Hiring Pool</h3><button onClick={() => setShowRecruit(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button></div>
                        <div className="p-6 space-y-3 overflow-y-auto custom-scrollbar">
                            {filteredHiringPool.map(c => (
                                <div key={c.id} className="bg-black border border-zinc-800 p-4 rounded-2xl flex justify-between items-center group hover:border-zinc-700 transition-colors">
                                    <div><div className="flex items-center gap-2 mb-1"><div className="font-bold text-white text-sm">{c.name}</div><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${getRoleColor(c.role)}`}>{c.role}</span></div><div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Skill: {c.skill}</div></div>
                                    <button onClick={() => handleHire(c)} className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-zinc-200">Hire (${c.salary})</button>
                                </div>
                            ))}
                            {filteredHiringPool.length === 0 && (
                                <div className="text-center text-zinc-600 text-xs py-4 space-y-2">
                                    <div>No suitable candidates available right now.</div>
                                    {blueprint.model === 'PRODUCT' && (
                                        <div className="text-[10px] text-zinc-500">Product businesses recruit managers and sales staff. Refresh the pool in a few weeks for new candidates.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
