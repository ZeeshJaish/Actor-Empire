
import { Business, BusinessType, BusinessSubtype, BusinessConfig, BusinessStaff, BusinessProduct, Player, EmployeeCandidate } from '../types';
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
        staff: [], products: [], history: [], hiringPool: generateCandidates(), lastHiringRefreshWeek: currentWeek
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
    if ((currentWeek - business.lastHiringRefreshWeek) >= 3 || business.hiringPool.length === 0) {
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

    // 1. MARKETING & HYPE
    const marketingBudget = b.config.marketingBudget || { social: 0, influencer: 0, billboard: 0, tv: 0 };
    const totalMarketingSpend = Object.values(marketingBudget).reduce((sum: number, val: number) => sum + val, 0);

    let hypeGain = 0;
    if (totalMarketingSpend > 0) {
        hypeGain = Math.sqrt(totalMarketingSpend) * 0.5;
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

    const hypeMod = 1 + (b.stats.hype / 20); 
    const fameMod = 1 + (playerFame / 200); 
    
    // Quality directly impacts demand too
    let qualityMod = 1.0;
    if (blueprint.model === 'PRODUCT') {
        const avgQual = b.products.length > 0 ? b.products.reduce((s,p)=>s+p.quality,0)/b.products.length : 50;
        qualityMod = 0.5 + (avgQual / 100);
    } else {
        qualityMod = 0.5 + (b.stats.customerSatisfaction / 100);
    }

    const totalDemand = Math.floor(baseFootfall * hypeMod * fameMod * qualityMod * locations);

    if (totalDemand < 10 && totalMarketingSpend === 0 && b.stats.brandHealth < 50) {
         alerts.push(`📉 Low traffic at ${b.name}. Boost Marketing!`);
    }

    // 3. REVENUE LOGIC
    let revenue = 0;

    // --- SERVICE MODEL (PASSIVE BUT STAFF LIMITED) ---
    if (blueprint.model === 'SERVICE') {
        const managers = b.staff.filter(s => s.role === 'MANAGER');
        const workers = b.staff.filter(s => s.role !== 'MANAGER');
        
        // Staff Efficiency
        // No workers = 0 capacity. 
        if (workers.length === 0) {
            revenue = 0;
            alerts.push(`⛔ ${b.name} has no staff! 0 Revenue.`);
        } else {
            // Calculate Effective Capacity
            // 1 Worker can handle ~15 customers efficiently per week in this sim time scale
            // Skill adds bonus
            const avgSkill = workers.reduce((acc, s) => acc + s.skill, 0) / workers.length;
            const staffCapacity = workers.length * 20 * (1 + (avgSkill/100));
            
            // Physical Capacity
            const physicalCapacity = (b.stats.capacity || 50) * locations;
            
            // Actual Capacity is strictly limited by STAFF first, then PHYSICAL space
            const effectiveCapacity = Math.min(staffCapacity, physicalCapacity);
            
            // Served
            const servedCount = Math.min(totalDemand, Math.floor(effectiveCapacity));
            
            // Ticket Price
            let avgTicket = 20;
            if (b.config.quality === 'BUDGET') avgTicket = 15;
            if (b.config.quality === 'PREMIUM') avgTicket = 60;
            if (b.config.quality === 'LUXURY') avgTicket = 150;
            
            revenue = servedCount * avgTicket;

            // Brand Health Impacts
            // If demand was way higher than what we served, people are annoyed (long wait times)
            if (totalDemand > effectiveCapacity * 1.5) {
                b.stats.customerSatisfaction = Math.max(0, b.stats.customerSatisfaction - 2);
                b.stats.brandHealth = Math.max(0, b.stats.brandHealth - 1);
                alerts.push(`📉 ${b.name} is understaffed! Turning away customers.`);
            } else if (avgSkill > 70) {
                // Good service bonus
                b.stats.customerSatisfaction = Math.min(100, b.stats.customerSatisfaction + 1);
                b.stats.brandHealth = Math.min(100, b.stats.brandHealth + 0.5);
            } else if (avgSkill < 30) {
                b.stats.customerSatisfaction = Math.max(0, b.stats.customerSatisfaction - 1);
            }
        }
    } 
    // --- PRODUCT MODEL (ACTIVE & INVENTORY LIMITED) ---
    else if (blueprint.model === 'PRODUCT') {
        const managers = b.staff.filter(s => s.role === 'MANAGER');
        const salesStaff = b.staff.filter(s => s.role === 'SALESPERSON');
        
        // Sales staff boost conversion rate, but aren't strictly required for online sales (auto)
        // However, we simulate "fulfillment" capacity via staff or automated systems
        let salesCapacity = 1000; // Base auto fulfillment
        if (salesStaff.length > 0) {
            const avgSkill = salesStaff.reduce((acc, s) => acc + s.skill, 0) / salesStaff.length;
            salesCapacity += (salesStaff.length * 500 * (1 + avgSkill/100));
        }

        const activeProducts = b.products.filter(p => p.active);
        
        if (activeProducts.length === 0) {
             revenue = 0;
             // No alert, maybe they are just starting
        } else {
             // Split demand among products
             const demandPerProduct = Math.floor(totalDemand / activeProducts.length);
             
             activeProducts.forEach(prod => {
                 // Check inventory
                 const available = prod.inventory || 0;
                 if (available <= 0) {
                     alerts.push(`📦 ${prod.name} is Sold Out! Restock to sell.`);
                     return;
                 }
                 
                 // Cap sales by inventory and fulfillment capacity
                 // Note: Fulfillment is shared, simplifying here by assuming per product
                 const potentialSales = Math.min(demandPerProduct, available);
                 const actualSales = Math.min(potentialSales, Math.floor(salesCapacity / activeProducts.length));
                 
                 revenue += actualSales * prod.sellingPrice;
                 prod.inventory -= actualSales;
                 prod.unitsSold += actualSales;
                 
                 // Quality impacts brand health on sale
                 if (prod.quality > 80) b.stats.brandHealth = Math.min(100, b.stats.brandHealth + 0.2);
                 if (prod.quality < 40) b.stats.brandHealth = Math.max(0, b.stats.brandHealth - 0.5);
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
    if (blueprint.model === 'SERVICE') cogs = Math.floor(revenue * 0.20); // 20% Food/Service Cost
    
    const totalExpenses = totalOpEx + staffWages + cogs + totalMarketingSpend;
    const profit = revenue - totalExpenses;
    
    b.balance += profit;
    b.stats.weeklyRevenue = revenue;
    b.stats.weeklyExpenses = totalExpenses;
    b.stats.weeklyProfit = profit;
    b.stats.lifetimeRevenue += revenue;
    
    // Valuation update (Balance + 1x Yearly Profit approx)
    const annualProfit = Math.max(0, profit * 52);
    b.stats.valuation = Math.max(b.stats.valuation, b.balance + annualProfit);
    
    // 5. PRODUCTION HOUSE SPECIFIC: SCRIPT DEVELOPMENT
    if (b.type === 'PRODUCTION_HOUSE' && b.studioState) {
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
    const payout = Math.floor(stats.valuation + (business.balance || 0));
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
    const sellingPrice = customPrice || Math.floor(finalUnitCost * 2.5);

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
        const maxPrice = Math.max(20000, prod.productionCost * 20); 
        prod.sellingPrice = Math.min(newPrice, maxPrice);
    }
    return b;
};

export const expandBusiness = (business: Business): { updated: Business, success: boolean, msg: string } => {
    const b = { ...business };
    const blueprint = BUSINESS_BLUEPRINTS[b.type];
    const currentLocs = b.stats.locations || 1;
    const expansionCost = Math.floor(blueprint.baseCost * 0.8 * currentLocs); 
    
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
