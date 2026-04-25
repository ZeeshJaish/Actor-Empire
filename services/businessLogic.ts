
import { Business, BusinessType, BusinessSubtype, BusinessConfig, BusinessStaff, BusinessProduct, Player, EmployeeCandidate, StudioState } from '../types';
import { generateWriters, generateIPMarket } from '../src/data/generators';

export interface BusinessBlueprint {
    type: BusinessType;
    name: string;
    description: string;
    subtypes: BusinessSubtype[];
    baseCost: number;
    riskProfile: 'LOW' | 'MEDIUM' | 'HIGH';
    model: 'SERVICE' | 'PRODUCT'; // Determines the loop
    emojis: string[];
}

export const BUSINESS_BLUEPRINTS: Record<BusinessType, BusinessBlueprint> = {
    RESTAURANT: {
        type: 'RESTAURANT', name: 'Restaurant', description: 'Passive Income. Staff & Space needed.',
        subtypes: ['FAST_FOOD', 'CASUAL_DINING', 'FINE_DINING'],
        baseCost: 250000, riskProfile: 'HIGH', model: 'SERVICE',
        emojis: ['🍔', '🍕', '🍣', '🦞', '🥗']
    },
    CAFE: {
        type: 'CAFE', name: 'Café / Bakery', description: 'Passive Income. Community hub.',
        subtypes: ['COFFEE_SHOP', 'ARTISAN_BAKERY'],
        baseCost: 80000, riskProfile: 'LOW', model: 'SERVICE',
        emojis: ['☕', '🥯', '🧁', '🥐']
    },
    FASHION: {
        type: 'FASHION', name: 'Fashion Brand', description: 'Active Income. Design & Restock.',
        subtypes: ['STREETWEAR', 'LUXURY_BRAND'],
        baseCost: 50000, riskProfile: 'MEDIUM', model: 'PRODUCT',
        emojis: ['👕', '👗', '🧢', '👟', '👜']
    },
    FITNESS: {
        type: 'FITNESS', name: 'Fitness Center', description: 'Passive Income. Memberships.',
        subtypes: ['LOCAL_GYM', 'WELLNESS_STUDIO'],
        baseCost: 150000, riskProfile: 'MEDIUM', model: 'SERVICE',
        emojis: ['💪', '🧘', '🏋️', '🥊']
    },
    MERCH: {
        type: 'MERCH', name: 'Online Merch', description: 'Active Income. Quick flips.',
        subtypes: ['ONLINE_STORE'],
        baseCost: 5000, riskProfile: 'LOW', model: 'PRODUCT',
        emojis: ['📦', '🎁', '📱']
    },
    PRODUCTION_HOUSE: {
        type: 'PRODUCTION_HOUSE', name: 'Production House', description: 'Produce your own films. High Risk/Reward.',
        subtypes: ['INDIE_STUDIO', 'MAJOR_STUDIO'],
        baseCost: 50000000, riskProfile: 'HIGH', model: 'PRODUCT', // Handled via custom logic mostly
        emojis: ['🎬', '🎥', '🎞️']
    }
};

// --- PRODUCTION HOUSE SPECIFICS ---
export const HEAD_OF_PRODUCTION_CANDIDATES = [
    {
        id: 'hop_finance',
        name: 'Marcus Vance (The CFO)',
        specialty: 'FINANCE',
        description: 'Former Wall St. analyst. Reduces production costs by 15%.',
        bonus: 'Cost Reduction'
    },
    {
        id: 'hop_creative',
        name: 'Sofia Lumiere (The Visionary)',
        specialty: 'CREATIVE',
        description: 'Award-winning indie darling. Increases Project Quality by +10.',
        bonus: 'Quality Boost'
    },
    {
        id: 'hop_connect',
        name: 'Ari Golding (The Insider)',
        specialty: 'CONNECTIONS',
        description: 'Knows everyone in town. Gets A-List Cast for 20% less.',
        bonus: 'Casting Power'
    }
];

// ... (Keep existing CONFIG OPTIONS: BUSINESS_THEMES, BUSINESS_AMENITIES, BUSINESS_PRODUCTION_TYPES, PRODUCT_DEV_OPTIONS, MARKETING_CAMPAIGNS, PRODUCT_CATALOG) ...
export const BUSINESS_THEMES = [
    { id: 'theme_min', label: 'Minimalist', description: 'Clean lines, modern.', costMultiplier: 1.0, appealMod: 1.0 },
    { id: 'theme_ind', label: 'Industrial', description: 'Exposed brick, raw metal.', costMultiplier: 1.2, appealMod: 1.1 },
    { id: 'theme_cozy', label: 'Cozy / Rustic', description: 'Warm wood, soft light.', costMultiplier: 1.1, appealMod: 1.15 },
    { id: 'theme_lux', label: 'Ultra Luxury', description: 'Marble, gold, velvet.', costMultiplier: 2.0, appealMod: 1.5 },
    { id: 'theme_retro', label: 'Retro / Neon', description: 'Vintage vibes.', costMultiplier: 1.3, appealMod: 1.2 }
];

export const BUSINESS_AMENITIES = [
    { id: 'amen_parking', label: 'Private Parking', description: 'Customer convenience.', cost: 50000, type: 'SERVICE', trafficMod: 1.2, capacityMod: 1.0, priceMod: 1.0 },
    { id: 'amen_drive', label: 'Drive-Thru', description: 'High volume service.', cost: 80000, type: 'SERVICE', trafficMod: 1.4, capacityMod: 1.5, priceMod: 0.9 }, // Lower price perception but higher volume
    { id: 'amen_vip', label: 'VIP Lounge', description: 'Exclusive area.', cost: 30000, type: 'SERVICE', trafficMod: 1.05, capacityMod: 1.0, priceMod: 1.3 },
    { id: 'amen_wifi', label: 'High-Speed WiFi', description: 'Work friendly.', cost: 5000, type: 'SERVICE', trafficMod: 1.1, capacityMod: 1.0, priceMod: 1.0 },
];

export const BUSINESS_PRODUCTION_TYPES = [
    { id: 'prod_mass', label: 'Mass Market', description: 'Standard factory.', costMultiplier: 1.0, qualityBonus: 0 },
    { id: 'prod_eco', label: 'Eco-Friendly', description: 'Sustainable materials.', costMultiplier: 1.4, qualityBonus: 10 },
    { id: 'prod_hand', label: 'Hand-Finished', description: 'Artisan touches.', costMultiplier: 1.8, qualityBonus: 20 },
    { id: 'prod_local', label: 'Local Sourcing', description: 'Made in LA.', costMultiplier: 1.5, qualityBonus: 15 }
];

export interface DevOption {
    id: string;
    label: string;
    desc: string;
    costMult: number; // Multiplies Base Unit Cost
    qualityBonus: number; // Adds to Quality Score
}

export const PRODUCT_DEV_OPTIONS: Record<string, { label: string, options: DevOption[] }> = {
    MATERIALS: {
        label: 'Materials / Ingredients',
        options: [
            { id: 'mat_standard', label: 'Standard', desc: 'Basic, cost-effective.', costMult: 1.0, qualityBonus: 0 },
            { id: 'mat_premium', label: 'Premium', desc: 'Higher grade, durable.', costMult: 1.5, qualityBonus: 15 },
            { id: 'mat_luxury', label: 'Luxury / Organic', desc: 'The finest available.', costMult: 2.5, qualityBonus: 30 },
            { id: 'mat_sustainable', label: 'Recycled / Local', desc: 'Eco-conscious appeal.', costMult: 1.8, qualityBonus: 20 }
        ]
    },
    PROCESS: {
        label: 'Manufacturing / Prep',
        options: [
            { id: 'proc_mass', label: 'Mass Production', desc: 'Fast, automated.', costMult: 0.8, qualityBonus: -5 },
            { id: 'proc_batch', label: 'Small Batch', desc: 'Controlled quality.', costMult: 1.2, qualityBonus: 10 },
            { id: 'proc_hand', label: 'Handcrafted', desc: 'Artisan attention.', costMult: 2.0, qualityBonus: 25 }
        ]
    },
    PACKAGING: {
        label: 'Packaging / Presentation',
        options: [
            { id: 'pack_basic', label: 'Basic', desc: 'Functional only.', costMult: 1.0, qualityBonus: 0 },
            { id: 'pack_branded', label: 'Branded', desc: 'Custom logo design.', costMult: 1.3, qualityBonus: 10 },
            { id: 'pack_experience', label: 'Unboxing Exp.', desc: 'High-end feel.', costMult: 1.8, qualityBonus: 20 }
        ]
    }
};

export const MARKETING_CAMPAIGNS = [
    { id: 'social_blast', label: 'Social Media Blast', description: 'Targeted ads on Instagram & X.', cost: 1000, hypeGain: 10, icon: 'Globe' },
    { id: 'radio_spot', label: 'Local Radio Spot', description: 'Community awareness.', cost: 2500, hypeGain: 15, icon: 'Radio' },
    { id: 'influencer', label: 'Influencer Collab', description: 'Partner with niche creators.', cost: 5000, hypeGain: 25, icon: 'Users' },
    { id: 'tv_ad', label: 'Prime TV Ad', description: 'Mass market reach.', cost: 20000, hypeGain: 50, icon: 'Tv' },
];

export interface ProductDefinition {
    id: string;
    name: string;
    baseCost: number; // Raw material cost estimate
    businessTypes: BusinessType[];
    emoji: string;
}

export const PRODUCT_CATALOG: ProductDefinition[] = [
    // MERCH
    { id: 'item_tee', name: 'Graphic T-Shirt', baseCost: 8, businessTypes: ['MERCH', 'FASHION'], emoji: '👕' },
    { id: 'item_hoodie', name: 'Heavyweight Hoodie', baseCost: 18, businessTypes: ['MERCH', 'FASHION'], emoji: '🧥' },
    { id: 'item_poster', name: 'Signed Poster', baseCost: 3, businessTypes: ['MERCH'], emoji: '🖼️' },
    { id: 'item_vinyl', name: 'Vinyl Record', baseCost: 12, businessTypes: ['MERCH'], emoji: '💿' },
    { id: 'item_cap', name: 'Embroidered Cap', baseCost: 6, businessTypes: ['MERCH', 'FASHION'], emoji: '🧢' },
    { id: 'item_mug', name: 'Ceramic Mug', baseCost: 4, businessTypes: ['MERCH'], emoji: '☕' },
    
    // FASHION SPECIFIC
    { id: 'item_jeans', name: 'Denim Jeans', baseCost: 25, businessTypes: ['FASHION'], emoji: '👖' },
    { id: 'item_jacket', name: 'Leather Jacket', baseCost: 80, businessTypes: ['FASHION'], emoji: '🧥' },
    { id: 'item_dress', name: 'Evening Dress', baseCost: 60, businessTypes: ['FASHION'], emoji: '👗' },
    { id: 'item_sneaker', name: 'Sneakers', baseCost: 35, businessTypes: ['FASHION'], emoji: '👟' },
    { id: 'item_handbag', name: 'Leather Handbag', baseCost: 50, businessTypes: ['FASHION'], emoji: '👜' },
    { id: 'item_suit', name: 'Tailored Suit', baseCost: 100, businessTypes: ['FASHION'], emoji: '🕴️' },
];

// ... (Keep Random Generators) ...
const FIRST_NAMES = ['Kai', 'Luna', 'Nova', 'Ezra', 'Milo', 'Ayla', 'Finn', 'Ivy', 'Leo', 'Mia', 'Jax', 'Zoey', 'Ash', 'Sky', 'River', 'Sage'];
const LAST_NAMES = ['Rivers', 'Stone', 'Wilder', 'Frost', 'Knight', 'Woods', 'Black', 'Steel', 'Moon', 'Storm'];
const generateName = () => `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;

const getServiceBaseRevenuePerLocation = (subtype: BusinessSubtype): number => {
    switch (subtype) {
        case 'FAST_FOOD':
            return 7000;
        case 'CASUAL_DINING':
            return 10500;
        case 'FINE_DINING':
            return 18000;
        case 'COFFEE_SHOP':
            return 5500;
        case 'ARTISAN_BAKERY':
            return 7000;
        case 'LOCAL_GYM':
            return 9000;
        case 'WELLNESS_STUDIO':
            return 13000;
        default:
            return 8000;
    }
};

const getProductPriceSweetSpot = (business: Business, product: BusinessProduct): { min: number; max: number } => {
    const baseCost = Math.max(1, product.productionCost || 1);
    const isPremium = business.config.quality === 'PREMIUM';
    const isLuxury = business.config.quality === 'LUXURY' || business.subtype === 'LUXURY_BRAND';
    const isBudget = business.config.quality === 'BUDGET';

    if (business.type === 'MERCH') {
        return {
            min: Math.max(5, Math.floor(baseCost * 1.8)),
            max: Math.max(20, Math.floor(baseCost * 5.5))
        };
    }

    if (business.type === 'FASHION') {
        const minMult = isLuxury ? 3.0 : isPremium ? 2.2 : isBudget ? 1.6 : 1.8;
        const maxMult = isLuxury ? 10.0 : isPremium ? 7.5 : isBudget ? 4.5 : 6.0;
        return {
            min: Math.max(15, Math.floor(baseCost * minMult)),
            max: Math.max(80, Math.floor(baseCost * maxMult))
        };
    }

    if (business.type === 'PRODUCTION_HOUSE') {
        return {
            min: Math.max(100, Math.floor(baseCost * 2.5)),
            max: Math.max(500, Math.floor(baseCost * 8))
        };
    }

    return {
        min: Math.max(10, Math.floor(baseCost * 2)),
        max: Math.max(50, Math.floor(baseCost * 6))
    };
};

const getBusinessValuation = (business: Business): number => {
    const blueprint = BUSINESS_BLUEPRINTS[business.type];
    const locations = business.stats.locations || 1;
    const weeksTracked = Math.min(12, Math.max(0, business.history?.length || 0));
    const recentProfits = [business.stats.weeklyProfit || 0, ...(business.history || []).map(h => h.profit)].slice(0, 8);
    const avgProfit = recentProfits.length > 0
        ? recentProfits.reduce((sum, value) => sum + value, 0) / recentProfits.length
        : 0;
    const positiveWeeks = recentProfits.filter(value => value > 0).length;
    const consistency = recentProfits.length > 0 ? positiveWeeks / recentProfits.length : 0;
    const maturity = Math.min(1, weeksTracked / (business.type === 'PRODUCTION_HOUSE' ? 12 : 8));

    const inventoryAssetValue = (business.products || []).reduce(
        (sum, product) => sum + ((product.inventory || 0) * (product.productionCost || 0) * 0.65),
        0
    );

    const baseAssetMultiplier =
        business.type === 'PRODUCTION_HOUSE' ? 0.42 :
        blueprint.model === 'SERVICE' ? 0.6 :
        0.45;

    const assetBase = (blueprint.baseCost * locations * baseAssetMultiplier) + inventoryAssetValue;

    const earningsMultiple =
        business.type === 'PRODUCTION_HOUSE' ? 9 :
        business.type === 'FASHION' ? 10 :
        business.type === 'MERCH' ? 8 :
        blueprint.model === 'SERVICE' ? 12 :
        10;

    const earningsValue = Math.max(0, avgProfit) * earningsMultiple * maturity * (0.45 + consistency * 0.55);

    const brandScore = ((business.stats.brandHealth || 0) * 0.45) + ((business.stats.customerSatisfaction || 0) * 0.35) + ((business.stats.hype || 0) * 0.2);
    const brandValue = blueprint.baseCost * 0.3 * (brandScore / 100) * (0.4 + maturity * 0.6);

    const studioState = business.studioState;
    const studioAssetValue = business.type === 'PRODUCTION_HOUSE' && studioState
        ? (
            (studioState.scripts?.length || 0) * 1200000 +
            (studioState.concepts?.length || 0) * 500000 +
            ((studioState.departments ? Object.values(studioState.departments).reduce((sum, level) => sum + level, 0) : 0) * 350000) +
            ((studioState.equipment ? Object.values(studioState.equipment).reduce((sum, level) => sum + level, 0) : 0) * 600000)
        )
        : 0;

    const downsidePressure =
        avgProfit < 0 ? Math.min(0.35, Math.abs(avgProfit) / Math.max(blueprint.baseCost, 1)) : 0;
    const riskMultiplier = Math.max(0.65, Math.min(1.15, 0.9 + (consistency * 0.18) - downsidePressure));

    const valuation = Math.floor((assetBase + earningsValue + brandValue + studioAssetValue) * riskMultiplier);
    return Math.max(Math.floor(assetBase), valuation);
};


// ... (Keep setup costs, hiring logic) ...
export const calculateSetupCost = (type: BusinessType, subtype: BusinessSubtype, config: BusinessConfig): number => {
    const blueprint = BUSINESS_BLUEPRINTS[type];
    let base = blueprint.baseCost;
    let multiplier = 1.0;
    
    if (['FINE_DINING', 'LUXURY_BRAND', 'MAJOR_STUDIO'].includes(subtype)) multiplier *= 3.0;
    if (['FAST_FOOD', 'STREETWEAR'].includes(subtype)) multiplier *= 0.8;
    
    if (config.quality === 'PREMIUM') multiplier *= 1.5;
    if (config.quality === 'LUXURY') multiplier *= 2.5;
    if (config.quality === 'BUDGET') multiplier *= 0.6;

    if (config.theme) {
        const theme = BUSINESS_THEMES.find(t => t.id === config.theme);
        if (theme) multiplier *= theme.costMultiplier;
    }
    if (config.productionType) {
        const prod = BUSINESS_PRODUCTION_TYPES.find(p => p.id === config.productionType);
        if (prod) multiplier *= prod.costMultiplier;
    }

    let total = Math.floor(base * multiplier);

    if (config.amenities) {
        config.amenities.forEach(amenId => {
            const amen = BUSINESS_AMENITIES.find(a => a.id === amenId);
            if (amen) total += amen.cost;
        });
    }
    return total;
};

export const generateCandidates = (): EmployeeCandidate[] => {
    const candidates: EmployeeCandidate[] = [];
    const count = 5; 
    
    for(let i=0; i<count; i++) {
        const skill = Math.floor(Math.random() * 80) + 10; 
        const baseSalary = 400 + (skill * 10); 
        const variance = (Math.random() * 0.4) - 0.2; 
        const roll = Math.random();
        let role: 'MANAGER' | 'STAFF' | 'SALESPERSON' = 'STAFF';
        if (roll > 0.75) role = 'MANAGER';
        else if (roll > 0.45) role = 'SALESPERSON';
        else role = 'STAFF';

        let finalSalary = Math.floor(baseSalary * (1 + variance));
        if (role === 'MANAGER') finalSalary = Math.floor(finalSalary * 1.5);

        candidates.push({ id: `cand_${Date.now()}_${i}`, name: generateName(), role, skill, salary: finalSalary });
    }
    return candidates;
};

export const createBusiness = (
    name: string, type: BusinessType, subtype: BusinessSubtype, config: BusinessConfig, logo: string, currentWeek: number
): Business => {
    const cost = calculateSetupCost(type, subtype, config);
    const blueprint = BUSINESS_BLUEPRINTS[type];
    const initialBalance = cost * 0.2; 

    // Calculate Initial Capacity based on Config
    let capacity = blueprint.model === 'SERVICE' ? 50 : undefined;
    if (config.amenities && capacity) {
        config.amenities.forEach(amenId => {
            const amen = BUSINESS_AMENITIES.find(a => a.id === amenId);
            if (amen && amen.capacityMod) capacity! = Math.floor(capacity! * amen.capacityMod);
        });
    }

    return {
        id: `biz_${Date.now()}`, name, type, subtype, logo, color: 'bg-zinc-800', foundedWeek: currentWeek, balance: initialBalance, isActive: true,
        config: { ...config, marketingBudget: { social: 0, influencer: 0, billboard: 0, tv: 0 } },
        stats: {
            weeklyRevenue: 0, weeklyExpenses: 0, weeklyProfit: 0, lifetimeRevenue: 0, valuation: cost, brandHealth: 50, customerSatisfaction: 50, riskLevel: 10, hype: 20, 
            capacity: capacity, inventory: blueprint.model === 'PRODUCT' ? 0 : undefined, locations: 1
        },
        staff: [], products: [], history: [], hiringPool: generateCandidates(), lastHiringRefreshWeek: currentWeek,
        ...(type === 'PRODUCTION_HOUSE' ? { studioState: createDefaultStudioState(currentWeek) } : {})
    };
};

export const createDefaultStudioState = (currentWeek: number): StudioState => ({
    scripts: [],
    concepts: [],
    writers: generateWriters(10),
    ipMarket: generateIPMarket(5, []),
    lastMarketRefreshWeek: currentWeek,
    lastWriterRefreshWeek: currentWeek,
    lastTalentRefreshWeek: currentWeek,
    departments: {
        writing: 1,
        directing: 1,
        casting: 1,
        production: 1,
        postProduction: 1,
    },
    equipment: {
        cameras: 1,
        lighting: 1,
        sound: 1,
        practicalEffects: 0,
    },
    talentRoster: [],
    purchasedIPTitles: [],
    productionFund: 0,
});

export const normalizeStudioState = (studioState: Partial<StudioState> | undefined, currentWeek: number): StudioState => {
    const defaults = createDefaultStudioState(currentWeek);
    return {
        ...defaults,
        ...studioState,
        scripts: Array.isArray(studioState?.scripts) ? studioState!.scripts : defaults.scripts,
        concepts: Array.isArray(studioState?.concepts) ? studioState!.concepts : defaults.concepts,
        writers: Array.isArray(studioState?.writers) ? studioState!.writers : defaults.writers,
        ipMarket: Array.isArray(studioState?.ipMarket) ? studioState!.ipMarket : defaults.ipMarket,
        talentRoster: Array.isArray(studioState?.talentRoster) ? studioState!.talentRoster : defaults.talentRoster,
        purchasedIPTitles: Array.isArray(studioState?.purchasedIPTitles) ? studioState!.purchasedIPTitles : defaults.purchasedIPTitles,
        departments: {
            ...defaults.departments,
            ...(studioState?.departments || {}),
        },
        equipment: {
            ...defaults.equipment,
            ...(studioState?.equipment || {}),
        },
        lastMarketRefreshWeek: typeof studioState?.lastMarketRefreshWeek === 'number' ? studioState.lastMarketRefreshWeek : defaults.lastMarketRefreshWeek,
        lastWriterRefreshWeek: typeof studioState?.lastWriterRefreshWeek === 'number' ? studioState.lastWriterRefreshWeek : defaults.lastWriterRefreshWeek,
        lastTalentRefreshWeek: typeof studioState?.lastTalentRefreshWeek === 'number' ? studioState.lastTalentRefreshWeek : defaults.lastTalentRefreshWeek,
        productionFund: typeof studioState?.productionFund === 'number' ? studioState.productionFund : defaults.productionFund,
    };
};

export const hireCandidate = (business: Business, candidate: EmployeeCandidate): Business => {
    const b = { ...business };
    if (candidate.role === 'MANAGER') {
        const hasManager = b.staff.some(s => s.role === 'MANAGER');
        if (hasManager) return b; 
    }
    b.staff.push({ id: candidate.id, name: candidate.name, role: candidate.role, skill: candidate.skill, salary: candidate.salary, morale: 100 });
    b.hiringPool = b.hiringPool.filter(c => c.id !== candidate.id);
    return b;
};

export const checkAndRefreshHiringPool = (business: Business, currentWeek: number): Business => {
    const weeksSinceRefresh = currentWeek >= business.lastHiringRefreshWeek
        ? currentWeek - business.lastHiringRefreshWeek
        : (52 - business.lastHiringRefreshWeek) + currentWeek;

    if (weeksSinceRefresh >= 3 || business.hiringPool.length === 0) {
        return { ...business, hiringPool: generateCandidates(), lastHiringRefreshWeek: currentWeek };
    }
    return business;
};

// --- CORE SIMULATION LOOP ---

export const processBusinessWeek = (business: Business, playerFame: number, week: number): { updated: Business, alerts: string[] } => {
    const b = JSON.parse(JSON.stringify(business)) as Business;
    const blueprint = BUSINESS_BLUEPRINTS[b.type];
    const alerts: string[] = [];

    const locations = b.stats.locations || 1;
    const theme = b.config.theme ? BUSINESS_THEMES.find(t => t.id === b.config.theme) : null;
    const amenityMods = (b.config.amenities || []).reduce((acc, amenityId) => {
        const amenity = BUSINESS_AMENITIES.find(a => a.id === amenityId);
        if (!amenity) return acc;

        return {
            traffic: acc.traffic * (amenity.trafficMod || 1),
            price: acc.price * (amenity.priceMod || 1),
            capacity: acc.capacity * (amenity.capacityMod || 1),
        };
    }, { traffic: 1, price: 1, capacity: 1 });

    // 1. MARKETING & HYPE
    const marketingBudget = b.config.marketingBudget || { social: 0, influencer: 0, billboard: 0, tv: 0 };
    const totalMarketingSpend = Object.values(marketingBudget).reduce((sum: number, val: number) => sum + val, 0);

    let hypeGain = 0;
    if (totalMarketingSpend > 0) {
        const earlySpend = Math.min(totalMarketingSpend, 25000);
        const midSpend = Math.min(Math.max(0, totalMarketingSpend - 25000), 75000);
        const lateSpend = Math.max(0, totalMarketingSpend - 100000);
        const businessMarketingWeight =
            b.type === 'FASHION' ? 1.2 :
            b.type === 'MERCH' ? 1.1 :
            b.type === 'RESTAURANT' || b.type === 'CAFE' ? 0.95 :
            1.0;

        hypeGain = (
            Math.sqrt(earlySpend) * 0.02 +
            Math.sqrt(midSpend) * 0.012 +
            Math.sqrt(lateSpend) * 0.006
        ) * businessMarketingWeight;
    }

    // HYPE DECAY: Heavily reliant on Brand Health
    // 0 Brand Health = High Decay (4/week)
    // 100 Brand Health = Low Decay (0.5/week)
    const decayFactor = 4 - (b.stats.brandHealth * 0.035); 
    const finalDecay = Math.max(0.5, decayFactor);
    
    b.stats.hype = Math.max(0, Math.min(100, b.stats.hype + hypeGain - finalDecay));

    // 2. DEMAND GENERATION
    let baseFootfall = 25; 
    if (['FAST_FOOD', 'ONLINE_STORE'].includes(b.subtype)) baseFootfall = 100;
    if (['FINE_DINING', 'LUXURY_BRAND'].includes(b.subtype)) baseFootfall = 10;

    const hypeDemandWeight =
        b.type === 'FASHION' ? 0.07 :
        b.type === 'MERCH' ? 0.06 :
        b.type === 'RESTAURANT' ? 0.05 :
        0.045;
    const hypeMod = 1 + (b.stats.hype * hypeDemandWeight); 
    const fameMod = 1 + (playerFame / 200); 
    
    // Quality directly impacts demand too
    let qualityMod = 1.0;
    if (blueprint.model === 'PRODUCT') {
        const avgQual = b.products.length > 0 ? b.products.reduce((s,p)=>s+p.quality,0)/b.products.length : 50;
        if (b.type === 'FASHION') {
            qualityMod = Math.max(0.75, Math.min(1.45, 0.65 + (avgQual / 100) * 0.8));
        } else if (b.type === 'MERCH') {
            qualityMod = Math.max(0.8, Math.min(1.3, 0.72 + (avgQual / 100) * 0.65));
        } else {
            qualityMod = 0.5 + (avgQual / 100);
        }
    } else {
        qualityMod = 0.5 + (b.stats.customerSatisfaction / 100);
    }

    const appealMod = theme?.appealMod || 1;
    const totalDemand = Math.floor(baseFootfall * hypeMod * fameMod * qualityMod * locations * appealMod * amenityMods.traffic);

    if (totalDemand < 10 && totalMarketingSpend === 0 && b.stats.brandHealth < 50) {
         alerts.push(`📉 Low traffic at ${b.name}. Boost Marketing!`);
    }

    // 3. REVENUE LOGIC
    let revenue = 0;
    let productCogs = 0;

    // --- SERVICE MODEL (PASSIVE BUT STAFF LIMITED) ---
    if (blueprint.model === 'SERVICE') {
        const managers = b.staff.filter(s => s.role === 'MANAGER');
        const workers = b.staff.filter(s => s.role !== 'MANAGER');

        const avgSkill = workers.length > 0
            ? workers.reduce((acc, s) => acc + s.skill, 0) / workers.length
            : 0;
        const staffCapacity = workers.length > 0
            ? workers.length * 35 * (1 + (avgSkill / 120))
            : 0;
        const physicalCapacity = Math.floor((b.stats.capacity || 50) * locations * amenityMods.capacity);
        const effectiveCapacity = Math.max(0, Math.min(staffCapacity, physicalCapacity));
        const demandCoverage = totalDemand > 0
            ? Math.min(1.1, effectiveCapacity / Math.max(1, totalDemand))
            : 1;

        let qualityRevenueMod = 1;
        if (b.config.quality === 'BUDGET') qualityRevenueMod = 0.8;
        if (b.config.quality === 'PREMIUM') qualityRevenueMod = 1.2;
        if (b.config.quality === 'LUXURY') qualityRevenueMod = 1.5;

        const satisfactionMod = 0.75 + (b.stats.customerSatisfaction / 200);
        const brandMod = 0.8 + (b.stats.brandHealth / 250);
        const hypeRevenueMod = 0.9 + (b.stats.hype / 200);
        const managementMod = managers.length > 0 ? 1.08 : 1;
        const occupancyMod = totalDemand > 0 ? Math.min(1.15, 0.75 + (totalDemand / Math.max(1, physicalCapacity * 2))) : 0.85;

        const basePassiveIncome = getServiceBaseRevenuePerLocation(b.subtype) * locations;

        let operationalStability = 0.45;
        if (workers.length === 0) {
            operationalStability = managers.length > 0 ? 0.4 : 0.25;
            alerts.push(`⛔ ${b.name} is understaffed. Income is reduced until you hire staff.`);
        } else {
            operationalStability = Math.max(0.65, Math.min(1.15, 0.55 + (demandCoverage * 0.45) + (avgSkill / 250)));
        }

        revenue = Math.floor(
            basePassiveIncome
            * qualityRevenueMod
            * satisfactionMod
            * brandMod
            * hypeRevenueMod
            * managementMod
            * occupancyMod
            * amenityMods.price
            * operationalStability
        );

        if (workers.length > 0 && totalDemand > effectiveCapacity * 1.4) {
            b.stats.customerSatisfaction = Math.max(0, b.stats.customerSatisfaction - 2);
            b.stats.brandHealth = Math.max(0, b.stats.brandHealth - 1);
            alerts.push(`📉 ${b.name} is understaffed! Turning away customers hurts reviews.`);
        } else if (avgSkill > 70 || managers.length > 0) {
            b.stats.customerSatisfaction = Math.min(100, b.stats.customerSatisfaction + 1);
            b.stats.brandHealth = Math.min(100, b.stats.brandHealth + 0.5);
        } else if (avgSkill > 0 && avgSkill < 30) {
            b.stats.customerSatisfaction = Math.max(0, b.stats.customerSatisfaction - 1);
        }
    } 
    // --- PRODUCT MODEL (ACTIVE & INVENTORY LIMITED) ---
    else if (blueprint.model === 'PRODUCT') {
        const managers = b.staff.filter(s => s.role === 'MANAGER');
        const salesStaff = b.staff.filter(s => s.role === 'SALESPERSON');

        let salesCapacity = 35 + (locations * 35);
        if (managers.length > 0) salesCapacity += 30;
        if (salesStaff.length > 0) {
            const avgSkill = salesStaff.reduce((acc, s) => acc + s.skill, 0) / salesStaff.length;
            salesCapacity += (salesStaff.length * 75 * (1 + avgSkill / 115));
        }

        const activeProducts = b.products.filter(p => p.active);
        
        if (activeProducts.length === 0) {
             revenue = 0;
             // No alert, maybe they are just starting
        } else {
             // Split demand among products
             const demandPerProduct = Math.floor(totalDemand / activeProducts.length);
             
             activeProducts.forEach(prod => {
                 const priceSweetSpot = getProductPriceSweetSpot(b, prod);
                 const price = Math.max(1, prod.sellingPrice || prod.productionCost || 1);
                 const markupRatio = price / Math.max(1, prod.productionCost || 1);
                 const avgDemandQuality = prod.quality || 50;
                 const qualityTierTolerance =
                    b.type === 'FASHION'
                        ? avgDemandQuality >= 90 ? 1.18
                            : avgDemandQuality >= 80 ? 1.12
                            : avgDemandQuality >= 60 ? 1.04
                            : avgDemandQuality < 40 ? 0.88
                            : 1
                        : avgDemandQuality >= 85 ? 1.06
                            : avgDemandQuality < 35 ? 0.92
                            : 1;
                 const toleratedMaxPrice = priceSweetSpot.max * qualityTierTolerance * (b.subtype === 'LUXURY_BRAND' ? 1.12 : 1);
                 const overpricingPenalty = price > toleratedMaxPrice
                    ? Math.max(
                        b.subtype === 'LUXURY_BRAND' ? 0.18 : 0.08,
                        1 - ((price - toleratedMaxPrice) / Math.max(toleratedMaxPrice * (b.subtype === 'LUXURY_BRAND' ? 1.35 : 0.85), 1))
                    )
                    : 1;
                 const underpricingPenalty = price < priceSweetSpot.min
                    ? Math.max(0.45, price / Math.max(1, priceSweetSpot.min))
                    : 1;
                 const qualityDemandBoost =
                    b.type === 'FASHION'
                        ? Math.max(0.75, Math.min(1.45, 0.72 + (prod.quality / 100) * 0.75))
                        : Math.max(0.8, Math.min(1.3, 0.78 + (prod.quality / 100) * 0.55));
                 const luxuryTolerance = b.subtype === 'LUXURY_BRAND' || b.config.quality === 'LUXURY' ? 1.08 : 1;
                 const subtypeDemandMod =
                    b.subtype === 'LUXURY_BRAND' ? 0.72 :
                    b.subtype === 'STREETWEAR' ? 1.18 :
                    b.type === 'MERCH' ? 1.08 :
                    1;

                 // Check inventory
                 const available = prod.inventory || 0;
                 if (available <= 0) {
                     alerts.push(`📦 ${prod.name} is Sold Out! Restock to sell.`);
                     return;
                 }
                 
                 // Cap sales by inventory and fulfillment capacity
                 // Note: Fulfillment is shared, simplifying here by assuming per product
                 const adjustedDemand = Math.floor(
                    demandPerProduct
                    * subtypeDemandMod
                    * overpricingPenalty
                    * underpricingPenalty
                    * qualityDemandBoost
                    * luxuryTolerance
                 );
                 const potentialSales = Math.min(adjustedDemand, available);
                 const actualSales = Math.min(potentialSales, Math.floor(salesCapacity / activeProducts.length));
                 
                 revenue += actualSales * prod.sellingPrice;
                 productCogs += actualSales * Math.max(1, prod.productionCost || 1);
                 prod.inventory -= actualSales;
                 prod.unitsSold += actualSales;
                 
                 // Quality impacts brand health on sale
                 if (prod.quality > 80) b.stats.brandHealth = Math.min(100, b.stats.brandHealth + 0.2);
                 if (prod.quality < 40) b.stats.brandHealth = Math.max(0, b.stats.brandHealth - 0.5);

                 if (markupRatio > (b.subtype === 'LUXURY_BRAND' ? 8.5 : 6.5) && actualSales < Math.max(5, demandPerProduct * 0.25)) {
                    alerts.push(`💸 ${prod.name} is overpriced for the current demand. Lower the price or improve quality.`);
                 } else if (markupRatio < 1.5 && actualSales > 0) {
                    alerts.push(`🧾 ${prod.name} is moving fast, but margins are thin. You can raise the price a little.`);
                 }
             });
        }
        b.stats.inventory = b.products.reduce((acc, p) => acc + (p.inventory || 0), 0);
    }

    // 4. EXPENSES (Low Fixed OpEx for Passive Feel)
    // Rent/Utils: Very low base to ensure "Profitable even if inefficient" logic for Service
    const opExPerLocation = 200; // $200/wk fixed cost. Very low.
    const totalOpEx = opExPerLocation * locations;
    
    const staffWages = b.staff.reduce((acc, s) => acc + s.salary, 0);
    
    let cogs = 0;
    if (blueprint.model === 'SERVICE') cogs = Math.floor(revenue * 0.18);
    if (blueprint.model === 'PRODUCT') cogs = productCogs;
    
    const totalExpenses = totalOpEx + staffWages + cogs + totalMarketingSpend;
    const profit = revenue - totalExpenses;
    
    b.balance += profit;
    b.stats.weeklyRevenue = revenue;
    b.stats.weeklyExpenses = totalExpenses;
    b.stats.weeklyProfit = profit;
    b.stats.lifetimeRevenue += revenue;
    
    b.stats.valuation = getBusinessValuation(b);
    
    // 5. PRODUCTION HOUSE SPECIFIC: SCRIPT DEVELOPMENT
    if (b.type === 'PRODUCTION_HOUSE' && b.studioState) {
        b.studioState = normalizeStudioState(b.studioState, week);
        b.studioState.scripts = b.studioState.scripts.map(script => {
            if (script.status === 'IN_DEVELOPMENT') {
                const updatedWeeks = script.weeksInDevelopment + 1;
                if (updatedWeeks >= script.totalDevelopmentWeeks) {
                    // Script is finished
                    // Use assignedSkill if available, otherwise fallback to writer lookup
                    let writerSkill = script.assignedSkill || 50;
                    if (!script.assignedSkill && script.writerId) {
                        const writer = b.studioState?.writers.find(w => w.id === script.writerId);
                        writerSkill = writer?.skill || 50;
                    }
                    
                    // Final quality is a mix of base quality and writer skill with significant randomization
                    const baseQuality = script.baseQuality || 50;
                    
                    // Base average weighted towards writer skill
                    const average = (baseQuality * 0.3) + (writerSkill * 0.7);
                    
                    // Random variance (+/- 15 points)
                    const variance = (Math.random() * 30) - 15;
                    
                    // "Stroke of Genius" chance (10% chance for a significant boost)
                    const geniusRoll = Math.random();
                    let bonus = 0;
                    if (geniusRoll > 0.90) {
                        bonus = 5 + Math.floor(Math.random() * 15);
                    }
                    
                    const finalQuality = Math.max(10, Math.min(100, Math.floor(average + variance + bonus)));
                    
                    // Generate sub-stats around the finalQuality
                    const generateSubStat = () => Math.max(10, Math.min(100, finalQuality + (Math.random() * 20 - 10)));
                    
                    const attributes = {
                        plot: Math.floor(generateSubStat()),
                        characters: Math.floor(generateSubStat()),
                        pacing: Math.floor(generateSubStat()),
                        dialogue: Math.floor(generateSubStat()),
                        action: Math.floor(generateSubStat()),
                        originality: Math.floor(generateSubStat()),
                    };
                    
                    alerts.push(`🎬 Script Finished: "${script.title}" is ready for production! (Quality: ${finalQuality})`);

                    return {
                        ...script,
                        status: 'READY',
                        weeksInDevelopment: updatedWeeks,
                        quality: finalQuality,
                        attributes
                    };
                }
                return { ...script, weeksInDevelopment: updatedWeeks };
            }
            return script;
        });

        // 6. PRODUCTION HOUSE SPECIFIC: MARKET & WRITER REFRESH
        // Refresh IP Market every 3 weeks
        if (week - (b.studioState.lastMarketRefreshWeek || 0) >= 3) {
            b.studioState.ipMarket = generateIPMarket(5, b.studioState.purchasedIPTitles || []);
            b.studioState.lastMarketRefreshWeek = week;
        }
        
        // Refresh Writers every 3 weeks
        if (week - (b.studioState.lastWriterRefreshWeek || 0) >= 3) {
            b.studioState.writers = generateWriters(10);
            b.studioState.lastWriterRefreshWeek = week;
        }
    }

    // 7. BANKRUPTCY CHECK
    if (b.balance < 0) {
        alerts.push(`⚠️ ${b.name} funds negative! Inject capital.`);
    }

    b.history.unshift({ week: 0, profit }); 
    if (b.history.length > 12) b.history.pop();

    return { updated: b, alerts };
};

// ... (Keep existing helpers: promoteBusiness, injectCapital, withdrawCapital, sellBusiness, liquidateBusiness, restockProduct, updateProductPrice, expandBusiness, hireEmployee) ...
export const promoteBusiness = (business: Business, campaignId: string): { updated: Business, success: boolean, msg: string, cost: number } => {
    return { updated: business, success: false, msg: "Deprecated", cost: 0 };
};

export const injectCapital = (business: Business, amount: number): Business => {
    const b = { ...business };
    b.balance += amount;
    return b;
};

export const withdrawCapital = (business: Business, amount: number): { updated: Business, success: boolean } => {
    const b = { ...business };
    if (b.balance < amount) return { updated: b, success: false };
    b.balance -= amount;
    return { updated: b, success: true };
};

export const sellBusiness = (business: Business): { success: boolean, payout: number, msg: string } => {
    if (!business.history || business.history.length < 2) {
        return { success: false, payout: 0, msg: "Business must be active for 2+ weeks to sell." };
    }
    const blueprint = BUSINESS_BLUEPRINTS[business.type];
    const stats = business.stats || { locations: 1, valuation: 0, weeklyProfit: 0 };
    const assetValue = (blueprint.baseCost * (stats.locations || 1)) * 0.5;
    const recentHistory = business.history.slice(0, 4);
    const avgProfit = recentHistory.length > 0 ? recentHistory.reduce((sum, h) => sum + h.profit, 0) / recentHistory.length : stats.weeklyProfit;

    if (stats.valuation <= assetValue && avgProfit <= 0) {
         return { success: false, payout: 0, msg: "Investors are not interested. The business is not profitable enough to sell." };
    }
    const maturityTarget =
        business.type === 'PRODUCTION_HOUSE' ? 12 :
        blueprint.model === 'PRODUCT' ? 8 :
        6;
    const maturityFactor = Math.min(1, (business.history?.length || 0) / maturityTarget);
    const strategicValue = stats.valuation * (0.35 + (maturityFactor * 0.65));
    const payout = Math.floor(strategicValue + Math.max(0, business.balance || 0));
    return { success: true, payout, msg: `Sold ${business.name} for $${payout.toLocaleString()}.` };
};

export const liquidateBusiness = (business: Business): { payout: number, msg: string } => {
    const blueprint = BUSINESS_BLUEPRINTS[business.type];
    const stats = business.stats || { locations: 1 };
    const scrapValue = (blueprint.baseCost * (stats.locations || 1)) * 0.25;
    const netTotal = Math.floor((business.balance || 0) + scrapValue);
    return { payout: netTotal, msg: `Liquidated assets for $${scrapValue.toLocaleString()}. Net result: $${netTotal.toLocaleString()}.` };
};

export const createProduct = (
    business: Business, name: string, catalogId: string, quantity: number, baseUnitCost: number, customPrice?: number, options?: { material: string, process: string, packaging: string }
): { updated: Business, success: boolean, msg: string, energyCost?: number } => {
    const b = { ...business };
    let unitCostMultiplier = 1.0;
    let qualityBonus = 0;

    if (options) {
        const mat = PRODUCT_DEV_OPTIONS.MATERIALS.options.find(o => o.id === options.material);
        const proc = PRODUCT_DEV_OPTIONS.PROCESS.options.find(o => o.id === options.process);
        const pack = PRODUCT_DEV_OPTIONS.PACKAGING.options.find(o => o.id === options.packaging);
        if (mat) { unitCostMultiplier *= mat.costMult; qualityBonus += mat.qualityBonus; }
        if (proc) { unitCostMultiplier *= proc.costMult; qualityBonus += proc.qualityBonus; }
        if (pack) { unitCostMultiplier *= pack.costMult; qualityBonus += pack.qualityBonus; }
    }

    const finalUnitCost = Math.floor(baseUnitCost * unitCostMultiplier);
    const totalProductionCost = quantity * finalUnitCost;
    const rndCost = 500 + (qualityBonus * 10);
    const totalCashNeeded = totalProductionCost + rndCost;

    if (b.balance < totalCashNeeded) {
        return { updated: b, success: false, msg: `Insufficient funds. Need $${totalCashNeeded.toLocaleString()} (incl. R&D).` };
    }
    
    b.balance -= totalCashNeeded;
    
    const variance = (Math.random() * 35) - 15; 
    let finalQuality = 50 + qualityBonus + variance;
    finalQuality = Math.max(10, Math.min(100, Math.floor(finalQuality)));
    const priceGuide = getProductPriceSweetSpot(b, {
        id: 'draft',
        name,
        catalogId,
        quality: finalQuality,
        productionCost: finalUnitCost,
        sellingPrice: finalUnitCost,
        appeal: 50 + (qualityBonus / 2),
        unitsSold: 0,
        active: true,
        inventory: quantity
    });
    const requestedPrice = customPrice || Math.floor(finalUnitCost * 2.5);
    const sellingPrice = Math.max(priceGuide.min, Math.min(requestedPrice, priceGuide.max));

    b.products.push({
        id: `prod_${Date.now()}`, name, catalogId: catalogId, quality: finalQuality, productionCost: finalUnitCost, sellingPrice: sellingPrice, appeal: 50 + (qualityBonus / 2), unitsSold: 0, active: true, inventory: quantity 
    });
    
    b.stats.inventory = (b.stats.inventory || 0) + quantity;
    b.stats.hype = Math.min(100, b.stats.hype + 20);
    
    return { updated: b, success: true, msg: `Developed ${name} (Quality: ${finalQuality}/100).`, energyCost: 25 };
};

export const restockProduct = (business: Business, productId: string, quantity: number): { updated: Business, success: boolean, msg: string } => {
    const b = { ...business };
    const prod = b.products.find(p => p.id === productId);
    if (!prod) return { updated: b, success: false, msg: "Product not found." };
    const totalCost = quantity * prod.productionCost;
    if (b.balance < totalCost) return { updated: b, success: false, msg: "Insufficient funds for restock." };

    b.balance -= totalCost;
    prod.inventory = (prod.inventory || 0) + quantity;
    b.stats.inventory = (b.stats.inventory || 0) + quantity;
    return { updated: b, success: true, msg: `Restocked ${quantity} units of ${prod.name}.` };
};

export const updateProductPrice = (business: Business, productId: string, newPrice: number): Business => {
    const b = { ...business };
    const prod = b.products.find(p => p.id === productId);
    if (prod) {
        const priceGuide = getProductPriceSweetSpot(b, prod);
        prod.sellingPrice = Math.max(priceGuide.min, Math.min(newPrice, priceGuide.max));
    }
    return b;
};

export const expandBusiness = (business: Business): { updated: Business, success: boolean, msg: string } => {
    const b = { ...business };
    const currentLocs = b.stats.locations || 1;
    const expansionBase =
        currentLocs === 1 ? 150000 :
        currentLocs === 2 ? 350000 :
        currentLocs === 3 ? 700000 :
        1200000 + ((currentLocs - 4) * 750000);
    const typeMultiplier =
        b.type === 'RESTAURANT' ? 1.2 :
        b.type === 'CAFE' ? 0.9 :
        b.type === 'FASHION' ? 1.05 :
        b.type === 'FITNESS' ? 1.15 :
        b.type === 'MERCH' ? 0.75 :
        1.6;
    const expansionCost = Math.floor(expansionBase * typeMultiplier); 
    
    if (b.balance < expansionCost) return { updated: b, success: false, msg: `Need $${expansionCost.toLocaleString()} to expand.` };

    b.balance -= expansionCost;
    b.stats.locations = currentLocs + 1;
    return { updated: b, success: true, msg: `Opened location #${b.stats.locations}!` };
};

export const hireEmployee = (business: Business, name: string, role: 'MANAGER'|'STAFF'|'SALESPERSON', skill: number, salary: number): Business => {
    const b = { ...business };
    b.staff.push({ id: `emp_${Date.now()}`, name, role, skill, salary, morale: 100 });
    return b;
};
