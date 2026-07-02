import {
    LifestyleActivityCategory,
    LifestyleActivityChoice,
    LifestyleActivityDefinition,
    LifestyleActivityMemory,
    LifestyleActivityQuote,
    LifestyleActivitySelections,
    LifestyleActivityState,
    Gender,
    HealthConditionState,
    Message,
    NewsItem,
    NPCActor,
    Player,
    Property,
    Relationship,
    Stats,
    Transaction,
    Vehicle,
} from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { AIRCRAFT_CATALOG, PROPERTY_CATALOG } from './lifestyleLogic';
import { getGenderedAvatar, NPC_DATABASE } from './npcLogic';
import { applyHealthConditionIncident, getActiveHealthConditions, getHealthConditionTreatmentTags, getHealthTreatmentPrivacy, resolveHealthConditionTreatment } from './healthConditions';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const clampMoney = (value: number) => Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
const formatServiceMoney = (amount: number) => {
    const safeAmount = clampMoney(amount);
    if (safeAmount >= 1_000_000_000) return `$${(safeAmount / 1_000_000_000).toFixed(1)}B`;
    if (safeAmount >= 1_000_000) return `$${(safeAmount / 1_000_000).toFixed(safeAmount >= 10_000_000 ? 0 : 1)}M`;
    if (safeAmount >= 1_000) return `$${(safeAmount / 1_000).toFixed(safeAmount >= 10_000 ? 0 : 1)}k`;
    return `$${safeAmount.toLocaleString()}`;
};
const roundCost = (value: number) => {
    const safe = clampMoney(value);
    if (safe >= 1_000_000) return Math.round(safe / 50_000) * 50_000;
    if (safe >= 100_000) return Math.round(safe / 10_000) * 10_000;
    if (safe >= 10_000) return Math.round(safe / 1_000) * 1_000;
    return Math.round(safe / 100) * 100;
};

const statLabels: Record<string, string> = {
    health: 'Health',
    happiness: 'Mood',
    looks: 'Style',
    body: 'Body',
    fame: 'Fame',
    reputation: 'Reputation',
    followers: 'Followers',
    experience: 'Life XP',
    talent: 'Creative spark',
};

const categoryIdentity: Record<LifestyleActivityCategory, string> = {
    TRAVEL: 'Worldly',
    NIGHTLIFE: 'Scene magnet',
    FAMILY: 'Family anchored',
    WELLNESS: 'Wellness focused',
    IMAGE: 'Public figure',
    LEGACY: 'Legacy minded',
    COMPANION: 'Soft-life loyalist',
};

const createChoice = (choice: LifestyleActivityChoice): LifestyleActivityChoice => choice;
type LifestyleActivityPlayerContext = Pick<Player, 'assets' | 'customItems'> & Partial<Pick<Player, 'flags' | 'relationships' | 'stats' | 'instagram' | 'name' | 'id' | 'age' | 'currentWeek'>>;

const scaleOptions: LifestyleActivityChoice[] = [
    createChoice({ id: 'lean', label: 'Lean', description: 'Keep it simple and controlled.', kind: 'SCALE', costMultiplier: 0.55, statEffects: { happiness: 1 }, riskShift: -3, memoryTag: 'quiet' }),
    createChoice({ id: 'premium', label: 'Premium', description: 'Comfortable without wasting money.', kind: 'SCALE', costMultiplier: 1, statEffects: { happiness: 2, reputation: 0.5 }, riskShift: 0, memoryTag: 'polished' }),
    createChoice({ id: 'luxury', label: 'Luxury', description: 'High-touch experience with real presence.', kind: 'SCALE', costMultiplier: 3.5, statEffects: { happiness: 4, reputation: 1, fame: 0.5 }, riskShift: 2, memoryTag: 'luxury' }),
    createChoice({ id: 'legendary', label: 'Legendary', description: 'A once-in-a-career flex. Expensive, visible, and memorable.', kind: 'SCALE', costMultiplier: 12, statEffects: { happiness: 6, reputation: 2, fame: 1 }, riskShift: 7, memoryTag: 'legendary' }),
];

const privacyOptions: LifestyleActivityChoice[] = [
    createChoice({ id: 'private', label: 'Private', description: 'No cameras, no public pressure.', kind: 'PRIVACY', costMultiplier: 1, statEffects: { happiness: 1 }, riskShift: -3, memoryTag: 'private' }),
    createChoice({ id: 'friends_only', label: 'Inner Circle', description: 'Shared with trusted people.', kind: 'PRIVACY', costMultiplier: 1.12, statEffects: { happiness: 1, reputation: 0.25 }, riskShift: -1, memoryTag: 'intimate' }),
    createChoice({ id: 'public', label: 'Public', description: 'Fans and press may notice.', kind: 'PRIVACY', costMultiplier: 1.25, statEffects: { fame: 0.8, followers: 650 }, riskShift: 5, memoryTag: 'visible' }),
    createChoice({ id: 'pr_managed', label: 'PR Managed', description: 'Curated visibility with a safer image team.', kind: 'PRIVACY', costMultiplier: 1.55, statEffects: { fame: 0.8, reputation: 1, followers: 900 }, riskShift: 1, memoryTag: 'curated' }),
];

const inviteOptions: LifestyleActivityChoice[] = [
    createChoice({ id: 'solo', label: 'Solo', description: 'You control the whole day.', kind: 'INVITE', costMultiplier: 0.85, statEffects: { health: 0.5 }, riskShift: -1, memoryTag: 'solo' }),
    createChoice({ id: 'partner', label: 'Partner', description: 'Designed around one close relationship.', kind: 'INVITE', costMultiplier: 1.15, statEffects: { happiness: 1.5 }, riskShift: 0, memoryTag: 'partner' }),
    createChoice({ id: 'family', label: 'Family', description: 'Bring the people who ground you.', kind: 'INVITE', costMultiplier: 1.45, statEffects: { happiness: 2, reputation: 0.5 }, riskShift: -2, memoryTag: 'family' }),
    createChoice({ id: 'friends', label: 'Friends', description: 'Bigger energy and more memories.', kind: 'INVITE', costMultiplier: 1.35, statEffects: { happiness: 2, followers: 400 }, riskShift: 2, memoryTag: 'friends' }),
    createChoice({ id: 'industry', label: 'Industry', description: 'Invite producers, stylists, agents, and tastemakers.', kind: 'INVITE', costMultiplier: 1.7, statEffects: { reputation: 1.5, fame: 0.5 }, riskShift: 3, memoryTag: 'industry' }),
];

const durationOptions: LifestyleActivityChoice[] = [
    createChoice({ id: 'one_day', label: 'One Day', description: 'Quick reset, light cost.', kind: 'DURATION', costMultiplier: 1, statEffects: { happiness: 1 }, riskShift: 0, memoryTag: 'one-day' }),
    createChoice({ id: 'weekend', label: 'Weekend', description: 'Enough time to feel it.', kind: 'DURATION', costMultiplier: 1.9, statEffects: { happiness: 2, health: 0.5 }, riskShift: 1, memoryTag: 'weekend' }),
    createChoice({ id: 'one_week', label: 'One Week', description: 'A full life pause.', kind: 'DURATION', costMultiplier: 4.8, statEffects: { happiness: 4, health: 1 }, riskShift: 3, memoryTag: 'week' }),
    createChoice({ id: 'two_weeks', label: 'Two Weeks', description: 'Major life chapter. Expensive and harder to hide.', kind: 'DURATION', costMultiplier: 8.5, statEffects: { happiness: 6, health: 2 }, riskShift: 6, memoryTag: 'two-week' }),
];

export const TRIP_MIN_DAYS = 3;
export const TRIP_MAX_DAYS = 7;

export const clampTripDays = (days?: number) => Math.max(TRIP_MIN_DAYS, Math.min(TRIP_MAX_DAYS, Math.round(Number(days) || 7)));

export const TRIP_DESTINATION_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'usa', label: 'United States', description: 'Big entertainment, luxury, beaches, and city heat.', kind: 'DESTINATION', costMultiplier: 1.25, statEffects: { fame: 0.3, followers: 450 }, riskShift: 1, memoryTag: 'usa' }),
    createChoice({ id: 'canada', label: 'Canada', description: 'Clean cities, mountains, festivals, and calm luxury.', kind: 'DESTINATION', costMultiplier: 1.05, statEffects: { health: 0.5, experience: 0.5 }, riskShift: -1, memoryTag: 'canada' }),
    createChoice({ id: 'mexico', label: 'Mexico', description: 'Resorts, food, coastlines, and warm social energy.', kind: 'DESTINATION', costMultiplier: 0.92, statEffects: { happiness: 0.8 }, riskShift: 1, memoryTag: 'mexico' }),
    createChoice({ id: 'brazil', label: 'Brazil', description: 'Beaches, music, nightlife, and big public energy.', kind: 'DESTINATION', costMultiplier: 0.95, statEffects: { happiness: 1, followers: 350 }, riskShift: 3, memoryTag: 'brazil' }),
    createChoice({ id: 'argentina', label: 'Argentina', description: 'Food, football, theatre, and stylish city breaks.', kind: 'DESTINATION', costMultiplier: 0.9, statEffects: { experience: 0.8 }, riskShift: 1, memoryTag: 'argentina' }),
    createChoice({ id: 'uk', label: 'United Kingdom', description: 'Press, theatre, heritage hotels, and awards rooms.', kind: 'DESTINATION', costMultiplier: 1.22, statEffects: { reputation: 0.6, experience: 0.5 }, riskShift: 1, memoryTag: 'uk' }),
    createChoice({ id: 'france', label: 'France', description: 'Fashion, food, Riviera heat, and prestige culture.', kind: 'DESTINATION', costMultiplier: 1.28, statEffects: { reputation: 0.8, happiness: 0.5 }, riskShift: 1, memoryTag: 'france' }),
    createChoice({ id: 'italy', label: 'Italy', description: 'Cinema history, coastal luxury, food, and romance.', kind: 'DESTINATION', costMultiplier: 1.18, statEffects: { happiness: 1, experience: 0.7 }, riskShift: 0, memoryTag: 'italy' }),
    createChoice({ id: 'spain', label: 'Spain', description: 'Islands, football cities, nightlife, and warm beaches.', kind: 'DESTINATION', costMultiplier: 1.02, statEffects: { happiness: 0.9 }, riskShift: 1, memoryTag: 'spain' }),
    createChoice({ id: 'germany', label: 'Germany', description: 'Clean planning, history, clubs, and efficient cities.', kind: 'DESTINATION', costMultiplier: 1.08, statEffects: { experience: 0.7, reputation: 0.2 }, riskShift: 0, memoryTag: 'germany' }),
    createChoice({ id: 'greece', label: 'Greece', description: 'Islands, blue water, old cities, and slow luxury.', kind: 'DESTINATION', costMultiplier: 1.05, statEffects: { happiness: 1.1, health: 0.5 }, riskShift: 0, memoryTag: 'greece' }),
    createChoice({ id: 'turkey', label: 'Turkey', description: 'History, food, coastlines, and strong value.', kind: 'DESTINATION', costMultiplier: 0.88, statEffects: { experience: 1 }, riskShift: 1, memoryTag: 'turkey' }),
    createChoice({ id: 'uae', label: 'UAE', description: 'Ultra-luxury, malls, private lounges, and spectacle.', kind: 'DESTINATION', costMultiplier: 1.55, statEffects: { reputation: 0.7, fame: 0.4 }, riskShift: 2, memoryTag: 'uae' }),
    createChoice({ id: 'india', label: 'India', description: 'Massive culture, film energy, food, and heritage.', kind: 'DESTINATION', costMultiplier: 0.78, statEffects: { experience: 1.2, followers: 500 }, riskShift: 2, memoryTag: 'india' }),
    createChoice({ id: 'japan', label: 'Japan', description: 'High design, food, cities, quiet service, and anime culture.', kind: 'DESTINATION', costMultiplier: 1.3, statEffects: { experience: 1.2, reputation: 0.4 }, riskShift: 0, memoryTag: 'japan' }),
    createChoice({ id: 'south_korea', label: 'South Korea', description: 'Pop culture, beauty, food, and fast city energy.', kind: 'DESTINATION', costMultiplier: 1.08, statEffects: { fame: 0.5, followers: 700 }, riskShift: 1, memoryTag: 'korea' }),
    createChoice({ id: 'china', label: 'China', description: 'Huge cities, heritage, markets, and spectacle.', kind: 'DESTINATION', costMultiplier: 1.0, statEffects: { experience: 1, followers: 350 }, riskShift: 2, memoryTag: 'china' }),
    createChoice({ id: 'thailand', label: 'Thailand', description: 'Beaches, food, wellness, and affordable luxury.', kind: 'DESTINATION', costMultiplier: 0.72, statEffects: { happiness: 1.2, health: 0.5 }, riskShift: 1, memoryTag: 'thailand' }),
    createChoice({ id: 'singapore', label: 'Singapore', description: 'Clean luxury, food, business, and premium hotels.', kind: 'DESTINATION', costMultiplier: 1.32, statEffects: { reputation: 0.6 }, riskShift: -1, memoryTag: 'singapore' }),
    createChoice({ id: 'indonesia', label: 'Indonesia', description: 'Bali calm, beaches, retreats, and island visuals.', kind: 'DESTINATION', costMultiplier: 0.82, statEffects: { happiness: 1.2, health: 0.6 }, riskShift: 1, memoryTag: 'indonesia' }),
    createChoice({ id: 'australia', label: 'Australia', description: 'Beaches, nature, premieres, and long-haul travel.', kind: 'DESTINATION', costMultiplier: 1.22, statEffects: { health: 1, experience: 0.5 }, riskShift: 0, memoryTag: 'australia' }),
    createChoice({ id: 'new_zealand', label: 'New Zealand', description: 'Nature, calm, adventure, and privacy.', kind: 'DESTINATION', costMultiplier: 1.12, statEffects: { health: 1.2, happiness: 0.8 }, riskShift: -1, memoryTag: 'new-zealand' }),
    createChoice({ id: 'south_africa', label: 'South Africa', description: 'Cape views, wildlife, wine, and bold memories.', kind: 'DESTINATION', costMultiplier: 0.9, statEffects: { experience: 1.2 }, riskShift: 2, memoryTag: 'south-africa' }),
    createChoice({ id: 'egypt', label: 'Egypt', description: 'Ancient sites, river hotels, museums, and heat.', kind: 'DESTINATION', costMultiplier: 0.82, statEffects: { experience: 1.5 }, riskShift: 2, memoryTag: 'egypt' }),
    createChoice({ id: 'morocco', label: 'Morocco', description: 'Riads, desert routes, markets, and texture.', kind: 'DESTINATION', costMultiplier: 0.85, statEffects: { experience: 1.1, happiness: 0.4 }, riskShift: 1, memoryTag: 'morocco' }),
    createChoice({ id: 'kenya', label: 'Kenya', description: 'Safari, nature, coast, and meaningful travel stories.', kind: 'DESTINATION', costMultiplier: 0.92, statEffects: { experience: 1.5, health: 0.4 }, riskShift: 2, memoryTag: 'kenya' }),
    createChoice({ id: 'maldives', label: 'Maldives', description: 'Private villas, blue water, and pure luxury escape.', kind: 'DESTINATION', costMultiplier: 1.65, statEffects: { happiness: 1.8, health: 0.5 }, riskShift: 0, memoryTag: 'maldives' }),
];

const tripCityMap: Record<string, LifestyleActivityChoice[]> = {
    usa: [
        createChoice({ id: 'los_angeles', label: 'Los Angeles', description: 'Industry rooms, beaches, paparazzi, and studio heat.', kind: 'CITY', costMultiplier: 1.25, statEffects: { fame: 0.5, followers: 600 }, riskShift: 4 }),
        createChoice({ id: 'new_york', label: 'New York', description: 'Fashion, theatre, press, and premium hotels.', kind: 'CITY', costMultiplier: 1.35, statEffects: { reputation: 0.5, experience: 0.5 }, riskShift: 3 }),
        createChoice({ id: 'miami', label: 'Miami', description: 'Beach clubs, yacht invites, and nightlife.', kind: 'CITY', costMultiplier: 1.15, statEffects: { happiness: 0.8, followers: 400 }, riskShift: 5 }),
        createChoice({ id: 'las_vegas', label: 'Las Vegas', description: 'Shows, casinos, suites, and chaos potential.', kind: 'CITY', costMultiplier: 1.2, statEffects: { happiness: 1 }, riskShift: 8 }),
    ],
    canada: [
        createChoice({ id: 'toronto', label: 'Toronto', description: 'Festival city with strong film energy.', kind: 'CITY', costMultiplier: 1.1, statEffects: { reputation: 0.4 }, riskShift: 1 }),
        createChoice({ id: 'vancouver', label: 'Vancouver', description: 'Nature, production circles, and calm luxury.', kind: 'CITY', costMultiplier: 1.05, statEffects: { health: 0.8 }, riskShift: -1 }),
        createChoice({ id: 'montreal', label: 'Montreal', description: 'Food, culture, nightlife, and old-world charm.', kind: 'CITY', costMultiplier: 0.98, statEffects: { experience: 0.7 }, riskShift: 0 }),
    ],
    mexico: [
        createChoice({ id: 'mexico_city', label: 'Mexico City', description: 'Food, art, history, and creative circles.', kind: 'CITY', costMultiplier: 0.92, statEffects: { experience: 1 }, riskShift: 1 }),
        createChoice({ id: 'cancun', label: 'Cancun', description: 'Resort-heavy beach escape.', kind: 'CITY', costMultiplier: 1.05, statEffects: { happiness: 1 }, riskShift: 2 }),
        createChoice({ id: 'tulum', label: 'Tulum', description: 'Influencer wellness, beaches, and boutique hotels.', kind: 'CITY', costMultiplier: 1.12, statEffects: { happiness: 1, followers: 350 }, riskShift: 3 }),
    ],
    brazil: [
        createChoice({ id: 'rio', label: 'Rio de Janeiro', description: 'Beaches, views, music, and public heat.', kind: 'CITY', costMultiplier: 1.0, statEffects: { happiness: 1, followers: 500 }, riskShift: 4 }),
        createChoice({ id: 'sao_paulo', label: 'Sao Paulo', description: 'Food, business, fashion, and nightlife.', kind: 'CITY', costMultiplier: 0.95, statEffects: { reputation: 0.3 }, riskShift: 2 }),
    ],
    argentina: [
        createChoice({ id: 'buenos_aires', label: 'Buenos Aires', description: 'Theatre, food, football, and stylish streets.', kind: 'CITY', costMultiplier: 0.9, statEffects: { experience: 1 }, riskShift: 1 }),
        createChoice({ id: 'mendoza', label: 'Mendoza', description: 'Wine country, quiet hotels, and mountain views.', kind: 'CITY', costMultiplier: 0.82, statEffects: { happiness: 0.8, health: 0.4 }, riskShift: -1 }),
    ],
    uk: [
        createChoice({ id: 'london', label: 'London', description: 'Theatre, press, awards energy, and members clubs.', kind: 'CITY', costMultiplier: 1.35, statEffects: { reputation: 0.8 }, riskShift: 2 }),
        createChoice({ id: 'edinburgh', label: 'Edinburgh', description: 'Festivals, old streets, and quieter prestige.', kind: 'CITY', costMultiplier: 1.05, statEffects: { experience: 1 }, riskShift: 0 }),
    ],
    france: [
        createChoice({ id: 'paris', label: 'Paris', description: 'Fashion, food, museums, and press visibility.', kind: 'CITY', costMultiplier: 1.38, statEffects: { reputation: 1 }, riskShift: 2 }),
        createChoice({ id: 'cannes', label: 'Cannes', description: 'Festival glamour and industry attention.', kind: 'CITY', costMultiplier: 1.8, statEffects: { fame: 0.8, reputation: 0.8 }, riskShift: 5 }),
        createChoice({ id: 'nice', label: 'Nice', description: 'Riviera coast, calm luxury, and sun.', kind: 'CITY', costMultiplier: 1.25, statEffects: { happiness: 1 }, riskShift: 1 }),
    ],
    italy: [
        createChoice({ id: 'rome', label: 'Rome', description: 'Cinema history, food, ruins, and romance.', kind: 'CITY', costMultiplier: 1.12, statEffects: { experience: 1, happiness: 0.5 }, riskShift: 1 }),
        createChoice({ id: 'venice', label: 'Venice', description: 'Festival prestige, water taxis, and spectacle.', kind: 'CITY', costMultiplier: 1.45, statEffects: { reputation: 0.7, fame: 0.4 }, riskShift: 3 }),
        createChoice({ id: 'amalfi', label: 'Amalfi Coast', description: 'Coastal hotels, private boats, and high-end escape.', kind: 'CITY', costMultiplier: 1.55, statEffects: { happiness: 1.2 }, riskShift: 1 }),
    ],
    spain: [
        createChoice({ id: 'barcelona', label: 'Barcelona', description: 'Architecture, beaches, clubs, and football energy.', kind: 'CITY', costMultiplier: 1.05, statEffects: { happiness: 0.8, experience: 0.5 }, riskShift: 2 }),
        createChoice({ id: 'madrid', label: 'Madrid', description: 'Art, food, football, and elegant hotels.', kind: 'CITY', costMultiplier: 1.02, statEffects: { reputation: 0.4 }, riskShift: 1 }),
        createChoice({ id: 'ibiza', label: 'Ibiza', description: 'Party island with strong scandal risk.', kind: 'CITY', costMultiplier: 1.45, statEffects: { happiness: 1.2, followers: 600 }, riskShift: 8 }),
    ],
    germany: [
        createChoice({ id: 'berlin', label: 'Berlin', description: 'Clubs, art, history, and underground cool.', kind: 'CITY', costMultiplier: 1.0, statEffects: { experience: 0.9 }, riskShift: 3 }),
        createChoice({ id: 'munich', label: 'Munich', description: 'Clean luxury, old money, and calmer travel.', kind: 'CITY', costMultiplier: 1.1, statEffects: { reputation: 0.3 }, riskShift: 0 }),
    ],
    greece: [
        createChoice({ id: 'athens', label: 'Athens', description: 'History, food, and city culture.', kind: 'CITY', costMultiplier: 0.95, statEffects: { experience: 1 }, riskShift: 1 }),
        createChoice({ id: 'santorini', label: 'Santorini', description: 'Blue views, romantic hotels, and luxury photos.', kind: 'CITY', costMultiplier: 1.35, statEffects: { happiness: 1.2, followers: 300 }, riskShift: 1 }),
        createChoice({ id: 'mykonos', label: 'Mykonos', description: 'Luxury island parties and public energy.', kind: 'CITY', costMultiplier: 1.5, statEffects: { happiness: 1, fame: 0.3 }, riskShift: 6 }),
    ],
    turkey: [
        createChoice({ id: 'istanbul', label: 'Istanbul', description: 'Food, history, water views, and busy streets.', kind: 'CITY', costMultiplier: 0.9, statEffects: { experience: 1.2 }, riskShift: 1 }),
        createChoice({ id: 'bodrum', label: 'Bodrum', description: 'Marinas, villas, and warm resort life.', kind: 'CITY', costMultiplier: 1.05, statEffects: { happiness: 1 }, riskShift: 1 }),
    ],
    uae: [
        createChoice({ id: 'dubai', label: 'Dubai', description: 'Ultra-luxury hotels, malls, and skyline flex.', kind: 'CITY', costMultiplier: 1.55, statEffects: { reputation: 0.7, fame: 0.4 }, riskShift: 3 }),
        createChoice({ id: 'abu_dhabi', label: 'Abu Dhabi', description: 'Quieter premium travel and cultural sites.', kind: 'CITY', costMultiplier: 1.35, statEffects: { reputation: 0.6 }, riskShift: 0 }),
    ],
    india: [
        createChoice({ id: 'mumbai', label: 'Mumbai', description: 'Film energy, luxury hotels, food, and crowds.', kind: 'CITY', costMultiplier: 0.88, statEffects: { fame: 0.5, followers: 700 }, riskShift: 3 }),
        createChoice({ id: 'goa', label: 'Goa', description: 'Beaches, cafes, retreats, and nightlife.', kind: 'CITY', costMultiplier: 0.72, statEffects: { happiness: 1.2 }, riskShift: 2 }),
        createChoice({ id: 'jaipur', label: 'Jaipur', description: 'Palaces, heritage hotels, and visual memories.', kind: 'CITY', costMultiplier: 0.82, statEffects: { reputation: 0.5, experience: 1 }, riskShift: 1 }),
        createChoice({ id: 'delhi', label: 'Delhi', description: 'Food, history, politics, and big-city pace.', kind: 'CITY', costMultiplier: 0.8, statEffects: { experience: 1 }, riskShift: 2 }),
    ],
    japan: [
        createChoice({ id: 'tokyo', label: 'Tokyo', description: 'Design, food, fans, shopping, and precise service.', kind: 'CITY', costMultiplier: 1.35, statEffects: { experience: 1.2, followers: 450 }, riskShift: 1 }),
        createChoice({ id: 'kyoto', label: 'Kyoto', description: 'Temples, calm, gardens, and old-world beauty.', kind: 'CITY', costMultiplier: 1.18, statEffects: { health: 0.6, experience: 1.2 }, riskShift: -1 }),
        createChoice({ id: 'osaka', label: 'Osaka', description: 'Food, comedy, nightlife, and fun city energy.', kind: 'CITY', costMultiplier: 1.05, statEffects: { happiness: 1, experience: 0.6 }, riskShift: 1 }),
    ],
    south_korea: [
        createChoice({ id: 'seoul', label: 'Seoul', description: 'K-pop, fashion, food, beauty, and fan energy.', kind: 'CITY', costMultiplier: 1.12, statEffects: { fame: 0.6, followers: 900 }, riskShift: 2 }),
        createChoice({ id: 'busan', label: 'Busan', description: 'Beaches, film festival culture, and seafood.', kind: 'CITY', costMultiplier: 0.98, statEffects: { happiness: 0.8, reputation: 0.3 }, riskShift: 1 }),
    ],
    china: [
        createChoice({ id: 'shanghai', label: 'Shanghai', description: 'Luxury, skyline, markets, and business circles.', kind: 'CITY', costMultiplier: 1.08, statEffects: { reputation: 0.5 }, riskShift: 2 }),
        createChoice({ id: 'beijing', label: 'Beijing', description: 'History, scale, museums, and formal travel.', kind: 'CITY', costMultiplier: 0.98, statEffects: { experience: 1.2 }, riskShift: 1 }),
    ],
    thailand: [
        createChoice({ id: 'bangkok', label: 'Bangkok', description: 'Food, nightlife, shopping, and rooftop energy.', kind: 'CITY', costMultiplier: 0.75, statEffects: { happiness: 1, followers: 300 }, riskShift: 3 }),
        createChoice({ id: 'phuket', label: 'Phuket', description: 'Resorts, beaches, boats, and easy recovery.', kind: 'CITY', costMultiplier: 0.82, statEffects: { happiness: 1.2, health: 0.5 }, riskShift: 1 }),
        createChoice({ id: 'chiang_mai', label: 'Chiang Mai', description: 'Calm, food, temples, and wellness.', kind: 'CITY', costMultiplier: 0.68, statEffects: { health: 1, experience: 0.8 }, riskShift: -1 }),
    ],
    singapore: [
        createChoice({ id: 'singapore_city', label: 'Singapore', description: 'Clean luxury, food, shopping, and business calm.', kind: 'CITY', costMultiplier: 1.3, statEffects: { reputation: 0.6 }, riskShift: -1 }),
    ],
    indonesia: [
        createChoice({ id: 'bali', label: 'Bali', description: 'Retreats, villas, beaches, and creator energy.', kind: 'CITY', costMultiplier: 0.88, statEffects: { happiness: 1.3, health: 0.8 }, riskShift: 1 }),
        createChoice({ id: 'jakarta', label: 'Jakarta', description: 'Big-city business, food, and social heat.', kind: 'CITY', costMultiplier: 0.72, statEffects: { followers: 250, experience: 0.5 }, riskShift: 2 }),
    ],
    australia: [
        createChoice({ id: 'sydney', label: 'Sydney', description: 'Harbour views, beaches, premieres, and luxury hotels.', kind: 'CITY', costMultiplier: 1.25, statEffects: { happiness: 1, reputation: 0.3 }, riskShift: 1 }),
        createChoice({ id: 'melbourne', label: 'Melbourne', description: 'Food, arts, sport, and quieter prestige.', kind: 'CITY', costMultiplier: 1.12, statEffects: { experience: 0.8, reputation: 0.4 }, riskShift: 0 }),
        createChoice({ id: 'gold_coast', label: 'Gold Coast', description: 'Beaches, resorts, and bright vacation energy.', kind: 'CITY', costMultiplier: 1.05, statEffects: { happiness: 1.1, health: 0.5 }, riskShift: 1 }),
    ],
    new_zealand: [
        createChoice({ id: 'queenstown', label: 'Queenstown', description: 'Adventure, mountains, privacy, and recovery.', kind: 'CITY', costMultiplier: 1.15, statEffects: { health: 1.4, experience: 1 }, riskShift: 2 }),
        createChoice({ id: 'auckland', label: 'Auckland', description: 'Harbour city with calm premium travel.', kind: 'CITY', costMultiplier: 1.0, statEffects: { happiness: 0.8 }, riskShift: -1 }),
    ],
    south_africa: [
        createChoice({ id: 'cape_town', label: 'Cape Town', description: 'Views, wine, coast, and bold photos.', kind: 'CITY', costMultiplier: 0.95, statEffects: { happiness: 1, experience: 0.8 }, riskShift: 2 }),
        createChoice({ id: 'johannesburg', label: 'Johannesburg', description: 'City energy, art, business, and history.', kind: 'CITY', costMultiplier: 0.78, statEffects: { experience: 0.8 }, riskShift: 3 }),
    ],
    egypt: [
        createChoice({ id: 'cairo', label: 'Cairo', description: 'Pyramids, museums, heat, and huge history.', kind: 'CITY', costMultiplier: 0.78, statEffects: { experience: 1.6 }, riskShift: 2 }),
        createChoice({ id: 'luxor', label: 'Luxor', description: 'Ancient sites and slower heritage travel.', kind: 'CITY', costMultiplier: 0.7, statEffects: { experience: 1.5, health: 0.2 }, riskShift: 1 }),
    ],
    morocco: [
        createChoice({ id: 'marrakech', label: 'Marrakech', description: 'Riads, markets, food, and colorful texture.', kind: 'CITY', costMultiplier: 0.88, statEffects: { happiness: 0.8, experience: 0.8 }, riskShift: 1 }),
        createChoice({ id: 'casablanca', label: 'Casablanca', description: 'City hotels, coast, and classic-film aura.', kind: 'CITY', costMultiplier: 0.78, statEffects: { reputation: 0.3, experience: 0.5 }, riskShift: 1 }),
    ],
    kenya: [
        createChoice({ id: 'nairobi', label: 'Nairobi', description: 'Safari gateway, culture, and meaningful travel.', kind: 'CITY', costMultiplier: 0.85, statEffects: { experience: 1.2 }, riskShift: 2 }),
        createChoice({ id: 'maasai_mara', label: 'Maasai Mara', description: 'Safari lodge, nature, and rare memories.', kind: 'CITY', costMultiplier: 1.18, statEffects: { experience: 1.8, health: 0.5 }, riskShift: 3 }),
    ],
    maldives: [
        createChoice({ id: 'male', label: 'Male', description: 'Gateway city for island resorts.', kind: 'CITY', costMultiplier: 1.25, statEffects: { happiness: 0.8 }, riskShift: 0 }),
        createChoice({ id: 'private_atoll', label: 'Private Atoll', description: 'Peak privacy, water villa, and major luxury cost.', kind: 'CITY', costMultiplier: 2.05, statEffects: { happiness: 2.2, reputation: 0.5 }, riskShift: -1 }),
    ],
};

export const getTripCityOptions = (countryId?: string): LifestyleActivityChoice[] => (
    tripCityMap[countryId || ''] || tripCityMap.usa
);

const tripActivityBaseOptions: LifestyleActivityChoice[] = [
    createChoice({ id: 'food_tour', label: 'Food Tour', description: 'Restaurants, markets, and local flavor.', kind: 'TRIP_ACTIVITY', flatCost: 1_200, statEffects: { happiness: 1, experience: 0.5 }, riskShift: 0 }),
    createChoice({ id: 'premium_tickets', label: 'Premium Tickets', description: 'Shows, games, or festival access.', kind: 'TRIP_ACTIVITY', flatCost: 3_000, statEffects: { happiness: 1, fame: 0.2 }, riskShift: 1 }),
    createChoice({ id: 'guided_city_day', label: 'Guided City Day', description: 'Less stress and better memories.', kind: 'TRIP_ACTIVITY', flatCost: 2_000, statEffects: { experience: 1, happiness: 0.8 }, riskShift: -1 }),
    createChoice({ id: 'wellness_day', label: 'Wellness Day', description: 'Spa, sleep, and recovery inside the trip.', kind: 'TRIP_ACTIVITY', flatCost: 2_500, statEffects: { health: 1.5, happiness: 0.7 }, riskShift: -1 }),
];

const cityActivityMap: Record<string, LifestyleActivityChoice[]> = {
    los_angeles: [createChoice({ id: 'studio_tour', label: 'Studio Tour', description: 'Backlot access and industry flavor.', kind: 'TRIP_ACTIVITY', flatCost: 4_000, statEffects: { reputation: 0.5, experience: 1 }, riskShift: 1 })],
    new_york: [createChoice({ id: 'broadway_night', label: 'Broadway Night', description: 'Premium theatre tickets and press-room polish.', kind: 'TRIP_ACTIVITY', flatCost: 5_500, statEffects: { reputation: 0.8, happiness: 0.6 }, riskShift: 1 })],
    miami: [createChoice({ id: 'yacht_day', label: 'Yacht Day', description: 'Water, music, and expensive social heat.', kind: 'TRIP_ACTIVITY', flatCost: 8_500, statEffects: { happiness: 1.2, followers: 450 }, riskShift: 4 })],
    las_vegas: [createChoice({ id: 'casino_suite', label: 'Casino Suite', description: 'Shows and tables with obvious risk.', kind: 'TRIP_ACTIVITY', flatCost: 7_000, statEffects: { happiness: 1 }, riskShift: 8 })],
    cannes: [createChoice({ id: 'festival_pass', label: 'Festival Pass', description: 'Premieres, parties, and industry eyes.', kind: 'TRIP_ACTIVITY', flatCost: 14_000, statEffects: { reputation: 1.2, fame: 0.7 }, riskShift: 5 })],
    venice: [createChoice({ id: 'water_premiere', label: 'Water Premiere', description: 'Elegant festival evening by boat.', kind: 'TRIP_ACTIVITY', flatCost: 9_500, statEffects: { reputation: 0.9, happiness: 0.8 }, riskShift: 2 })],
    ibiza: [createChoice({ id: 'superclub_table', label: 'Superclub Table', description: 'Huge nightlife push with scandal risk.', kind: 'TRIP_ACTIVITY', flatCost: 11_000, statEffects: { fame: 0.5, happiness: 1 }, riskShift: 8 })],
    dubai: [createChoice({ id: 'skyline_lounge', label: 'Skyline Lounge', description: 'Luxury dinner with high visual flex.', kind: 'TRIP_ACTIVITY', flatCost: 9_000, statEffects: { reputation: 0.7, followers: 400 }, riskShift: 2 })],
    mumbai: [createChoice({ id: 'film_city_day', label: 'Film City Day', description: 'Bollywood energy and fan attention.', kind: 'TRIP_ACTIVITY', flatCost: 3_500, statEffects: { fame: 0.6, followers: 900 }, riskShift: 3 })],
    goa: [createChoice({ id: 'beach_shack_run', label: 'Beach Shack Run', description: 'Food, music, and relaxed coastline energy.', kind: 'TRIP_ACTIVITY', flatCost: 1_800, statEffects: { happiness: 1.2 }, riskShift: 1 })],
    tokyo: [createChoice({ id: 'anime_district', label: 'Anime District', description: 'Pop culture photos and shopping.', kind: 'TRIP_ACTIVITY', flatCost: 3_800, statEffects: { followers: 600, happiness: 0.7 }, riskShift: 1 })],
    seoul: [createChoice({ id: 'kpop_night', label: 'K-Pop Night', description: 'Fan culture and social buzz.', kind: 'TRIP_ACTIVITY', flatCost: 4_500, statEffects: { fame: 0.5, followers: 850 }, riskShift: 2 })],
    bangkok: [createChoice({ id: 'rooftop_food_run', label: 'Rooftop Food Run', description: 'Food markets into skyline drinks.', kind: 'TRIP_ACTIVITY', flatCost: 2_200, statEffects: { happiness: 1, followers: 250 }, riskShift: 2 })],
    bali: [createChoice({ id: 'villa_retreat', label: 'Villa Retreat Day', description: 'Retreat energy, pool, and wellness visuals.', kind: 'TRIP_ACTIVITY', flatCost: 3_200, statEffects: { health: 1, happiness: 1 }, riskShift: -1 })],
    sydney: [createChoice({ id: 'harbour_day', label: 'Harbour Day', description: 'Boat, food, and bright city photos.', kind: 'TRIP_ACTIVITY', flatCost: 5_500, statEffects: { happiness: 1, followers: 300 }, riskShift: 1 })],
    queenstown: [createChoice({ id: 'adventure_day', label: 'Adventure Day', description: 'Bigger story, bigger risk.', kind: 'TRIP_ACTIVITY', flatCost: 3_500, statEffects: { health: 1, experience: 1.5 }, riskShift: 4 })],
    cape_town: [createChoice({ id: 'coastal_wine_day', label: 'Coastal Wine Day', description: 'Views, vineyards, and classy calm.', kind: 'TRIP_ACTIVITY', flatCost: 3_200, statEffects: { happiness: 1, reputation: 0.4 }, riskShift: 1 })],
    cairo: [createChoice({ id: 'pyramid_private_guide', label: 'Pyramid Guide', description: 'Premium history day with fewer logistics.', kind: 'TRIP_ACTIVITY', flatCost: 2_800, statEffects: { experience: 1.6 }, riskShift: 0 })],
    private_atoll: [createChoice({ id: 'reef_villa_day', label: 'Reef Villa Day', description: 'Private water villa memory.', kind: 'TRIP_ACTIVITY', flatCost: 12_000, statEffects: { happiness: 1.5, health: 0.5 }, riskShift: -1 })],
};

export const getTripActivityOptions = (_countryId?: string, cityId?: string): LifestyleActivityChoice[] => ([
    ...tripActivityBaseOptions,
    ...(cityActivityMap[cityId || ''] || []),
]);

export const TRIP_STAY_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'simple_stay', label: 'Simple Stay', description: 'Clean, practical, no flex.', kind: 'STAY', costMultiplier: 0.65, statEffects: { happiness: 0.5 }, riskShift: -1, memoryTag: 'simple-stay' }),
    createChoice({ id: 'boutique_hotel', label: 'Boutique Hotel', description: 'Stylish room with good service.', kind: 'STAY', costMultiplier: 1.05, statEffects: { happiness: 1, reputation: 0.2 }, riskShift: 0, memoryTag: 'boutique' }),
    createChoice({ id: 'five_star_suite', label: 'Five-Star Suite', description: 'Premium comfort and visible taste.', kind: 'STAY', costMultiplier: 2.4, statEffects: { happiness: 2, reputation: 0.7 }, riskShift: 2, memoryTag: 'five-star' }),
    createChoice({ id: 'private_villa', label: 'Private Villa', description: 'High privacy, staff, and massive spend.', kind: 'STAY', costMultiplier: 4.2, statEffects: { happiness: 3, reputation: 0.6 }, riskShift: 1, memoryTag: 'villa' }),
];

const OWNED_AIRCRAFT_CHOICE_PREFIX = 'owned_aircraft:';
const OWNED_PROPERTY_VENUE_PREFIX = 'owned_property:';
const NPC_HEADLINE_GUEST_PREFIX = 'npc_guest:';

export const TRIP_TRAVEL_MODE_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'train_or_economy', label: 'Economy / Rail', description: 'Cheap, slower, less comfortable.', kind: 'TRAVEL_MODE', costMultiplier: 0.75, statEffects: { experience: 0.5 }, riskShift: 1, memoryTag: 'economy-travel' }),
    createChoice({ id: 'business_class', label: 'Business Class', description: 'Balanced comfort without absurd flex.', kind: 'TRAVEL_MODE', costMultiplier: 1.2, statEffects: { happiness: 0.7, health: 0.3 }, riskShift: 0, memoryTag: 'business-travel' }),
    createChoice({ id: 'first_class', label: 'First Class', description: 'High comfort and high spend.', kind: 'TRAVEL_MODE', costMultiplier: 1.8, statEffects: { happiness: 1.2, reputation: 0.3 }, riskShift: 1, memoryTag: 'first-class' }),
    createChoice({ id: 'chartered_flight', label: 'Charter Flight', description: 'Maximum privacy and a real money burn.', kind: 'TRAVEL_MODE', costMultiplier: 4.6, statEffects: { happiness: 1.5, reputation: 1 }, riskShift: 3, memoryTag: 'charter' }),
];

const getOwnedAircraft = (player?: Pick<Player, 'assets' | 'customItems'> | null): Vehicle[] => {
    if (!player) return [];
    const ownedIds = new Set(player.assets || []);
    const customAircraft = (player.customItems || []).filter((item): item is Vehicle => (
        item?.type === 'Vehicle' && item.vehicleType === 'Aircraft'
    ));
    const aircraftById = [...AIRCRAFT_CATALOG, ...customAircraft].reduce<Map<string, Vehicle>>((acc, aircraft) => {
        acc.set(aircraft.id, aircraft);
        return acc;
    }, new Map());
    return Array.from(aircraftById.values()).filter(aircraft => ownedIds.has(aircraft.id));
};

export const hasPlayerOwnedAircraft = (player?: Pick<Player, 'assets' | 'customItems'> | null) => getOwnedAircraft(player).length > 0;

export const getOwnedAircraftTravelChoices = (player?: Pick<Player, 'assets' | 'customItems'> | null): LifestyleActivityChoice[] => (
    getOwnedAircraft(player).map(aircraft => {
        const ultraJet = aircraft.price >= 100_000_000;
        const privateJet = aircraft.price >= 6_000_000;
        return createChoice({
            id: `${OWNED_AIRCRAFT_CHOICE_PREFIX}${aircraft.id}`,
            label: aircraft.name,
            description: ultraJet
                ? 'Use your flagship aircraft. Crew, fuel, hangar, and airport handling only.'
                : privateJet
                    ? 'Use your private aircraft. Pay crew, fuel, and handling.'
                    : 'Use your owned aircraft for a lighter travel bill.',
            kind: 'TRAVEL_MODE',
            costMultiplier: ultraJet ? 0.58 : privateJet ? 0.72 : 0.9,
            flatCost: ultraJet ? 90_000 : privateJet ? 24_000 : 8_000,
            statEffects: {
                happiness: privateJet ? 1.2 : 0.7,
                reputation: Math.min(2, Math.max(0.4, aircraft.reputationBonus / 35)),
            },
            riskShift: ultraJet ? 2 : privateJet ? 1 : 0,
            memoryTag: `owned-aircraft-${aircraft.id}`,
        });
    })
);

export const getAvailableTripTravelModes = (player?: Pick<Player, 'assets' | 'customItems'> | null) => ([
    ...TRIP_TRAVEL_MODE_OPTIONS,
    ...getOwnedAircraftTravelChoices(player),
]);

export const createTripDurationChoice = (days?: number): LifestyleActivityChoice => {
    const safeDays = clampTripDays(days);
    const extraDays = safeDays - TRIP_MIN_DAYS;
    return createChoice({
        id: `trip_${safeDays}_days`,
        label: `${safeDays} Days`,
        description: safeDays <= 7 ? 'Short, focused break.' : safeDays <= 14 ? 'Proper vacation window.' : 'Long luxury escape with higher opportunity cost.',
        kind: 'DURATION',
        costMultiplier: 1 + (extraDays * 0.22),
        statEffects: {
            happiness: Math.min(6, 1 + safeDays / 5),
            health: Math.min(3, safeDays / 10),
            experience: Math.min(3, safeDays / 12),
        },
        riskShift: safeDays >= 21 ? 6 : safeDays >= 14 ? 3 : safeDays >= 10 ? 1 : 0,
        memoryTag: `${safeDays}-day-trip`,
    });
};

export const NIGHTLIFE_TYPE_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'club_takeover', label: 'Club Takeover', description: 'A visible club night with big social heat.', kind: 'NIGHTLIFE_TYPE', costMultiplier: 1.25, statEffects: { happiness: 2, fame: 0.7, followers: 900 }, riskShift: 8, memoryTag: 'club' }),
    createChoice({ id: 'house_party', label: 'House Party', description: 'Use your own place, guest list, music, and privacy rules.', kind: 'NIGHTLIFE_TYPE', costMultiplier: 1.15, statEffects: { happiness: 2, fame: 0.4, followers: 650 }, riskShift: 9, memoryTag: 'house-party' }),
    createChoice({ id: 'after_party', label: 'After-Party', description: 'Selective invite list after a premiere or shoot.', kind: 'NIGHTLIFE_TYPE', costMultiplier: 1.45, statEffects: { reputation: 0.6, fame: 0.5, followers: 700 }, riskShift: 5, memoryTag: 'after-party' }),
    createChoice({ id: 'casino_night', label: 'Casino Night', description: 'High-stakes tables, champagne, and money risk.', kind: 'NIGHTLIFE_TYPE', costMultiplier: 1.7, statEffects: { happiness: 2, fame: 0.3 }, riskShift: 14, memoryTag: 'casino' }),
    createChoice({ id: 'rooftop_social', label: 'Rooftop Social', description: 'Stylish, smaller, and easier to manage.', kind: 'NIGHTLIFE_TYPE', costMultiplier: 1.05, statEffects: { happiness: 1.5, reputation: 0.5 }, riskShift: 2, memoryTag: 'rooftop' }),
];

export const NIGHTLIFE_VENUE_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'backroom_bar', label: 'Backroom Bar', description: 'Cheap, private, low spectacle.', kind: 'NIGHTLIFE_VENUE', costMultiplier: 0.7, statEffects: { happiness: 1 }, riskShift: -2, memoryTag: 'backroom' }),
    createChoice({ id: 'members_lounge', label: 'Members Lounge', description: 'Tasteful room with industry access.', kind: 'NIGHTLIFE_VENUE', costMultiplier: 1.2, statEffects: { reputation: 0.8, happiness: 1 }, riskShift: -1, memoryTag: 'members-lounge' }),
    createChoice({ id: 'neon_club', label: 'Neon Club', description: 'Crowded, loud, and camera-heavy.', kind: 'NIGHTLIFE_VENUE', costMultiplier: 1.55, statEffects: { fame: 0.8, followers: 1200 }, riskShift: 8, memoryTag: 'neon-club' }),
    createChoice({ id: 'penthouse_suite', label: 'Penthouse Suite', description: 'Luxury control with a serious bill.', kind: 'NIGHTLIFE_VENUE', costMultiplier: 2.6, statEffects: { reputation: 1, happiness: 2 }, riskShift: 1, memoryTag: 'penthouse' }),
];

const RENTED_PARTY_HOUSE_VENUE = createChoice({
    id: 'rented_party_house',
    label: 'Rental Party House',
    description: 'No owned home needed. Cleanup, damage, and neighbor risk rise.',
    kind: 'NIGHTLIFE_VENUE',
    costMultiplier: 2.1,
    flatCost: 15_000,
    statEffects: { happiness: 1.4, fame: 0.4 },
    riskShift: 10,
    memoryTag: 'rental-house',
});

export const getOwnedPropertyVenueChoices = (player?: Pick<Player, 'assets' | 'customItems'> | null): LifestyleActivityChoice[] => {
    if (!player) return [];
    const ownedIds = new Set(player.assets || []);
    const customProperties = (player.customItems || []).filter((item): item is Property => item?.type === 'Property');
    const propertiesById = [...PROPERTY_CATALOG, ...customProperties].reduce<Map<string, Property>>((acc, property) => {
        acc.set(property.id, property);
        return acc;
    }, new Map());
    return Array.from(propertiesById.values())
        .filter(property => ownedIds.has(property.id))
        .map(property => {
            const luxe = property.price >= 20_000_000 || property.moodBonus >= 14;
            const iconLabel = property.location ? `${property.location} address` : 'Private address';
            return createChoice({
                id: `${OWNED_PROPERTY_VENUE_PREFIX}${property.id}`,
                label: property.name,
                description: `${iconLabel}. Pay staff, security, cleanup, and guest handling only.`,
                kind: 'NIGHTLIFE_VENUE',
                costMultiplier: luxe ? 0.78 : 0.86,
                flatCost: roundCost(Math.max(2_500, (property.weeklyExpense || 1_000) * (luxe ? 1.4 : 1.1))),
                statEffects: {
                    happiness: luxe ? 1.8 : 1.2,
                    reputation: Math.min(1.6, Math.max(0.2, property.moodBonus / 18)),
                    fame: luxe ? 0.6 : 0.2,
                },
                riskShift: luxe ? 3 : 6,
                memoryTag: `owned-property-${property.id}`,
            });
        });
};

export const getAvailableNightlifeVenueOptions = (
    player?: Pick<Player, 'assets' | 'customItems'> | null,
    nightlifeTypeId?: string,
): LifestyleActivityChoice[] => {
    if (nightlifeTypeId === 'house_party') {
        const ownedVenues = getOwnedPropertyVenueChoices(player);
        return ownedVenues.length ? [...ownedVenues, RENTED_PARTY_HOUSE_VENUE] : [RENTED_PARTY_HOUSE_VENUE];
    }
    return NIGHTLIFE_VENUE_OPTIONS;
};

export const NIGHTLIFE_GUEST_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'no_guest', label: 'No Headliner', description: 'Keep the night about you.', kind: 'NIGHTLIFE_GUEST', costMultiplier: 0.85, statEffects: { happiness: 1 }, riskShift: -2, memoryTag: 'solo-bill' }),
    createChoice({ id: 'rising_actor', label: 'Rising Actor', description: 'Reliable enough, still good for buzz.', kind: 'NIGHTLIFE_GUEST', costMultiplier: 1.25, flatCost: 18_000, statEffects: { fame: 0.5, followers: 750 }, riskShift: 2, memoryTag: 'rising-guest' }),
    createChoice({ id: 'chart_star', label: 'Chart Star', description: 'Music-world energy and camera demand.', kind: 'NIGHTLIFE_GUEST', costMultiplier: 2.4, flatCost: 140_000, statEffects: { fame: 1, followers: 1800 }, riskShift: 7, memoryTag: 'chart-star' }),
    createChoice({ id: 'global_heartthrob', label: 'Global Heartthrob', description: 'The room waits for one arrival.', kind: 'NIGHTLIFE_GUEST', costMultiplier: 4.2, flatCost: 950_000, statEffects: { fame: 1.5, followers: 3000 }, riskShift: 11, memoryTag: 'headline-guest' }),
    createChoice({ id: 'award_director', label: 'Award Director', description: 'Less noise, better reputation if they show.', kind: 'NIGHTLIFE_GUEST', costMultiplier: 1.9, flatCost: 90_000, statEffects: { reputation: 1.4, fame: 0.3 }, riskShift: 3, memoryTag: 'director-guest' }),
];

const guestTierRank: Record<string, number> = {
    ICON: 5,
    A_LIST: 4,
    ESTABLISHED: 3,
    RISING: 2,
    INDIE: 1,
    UNKNOWN: 0,
};

const guestTierPullRequirement: Record<string, number> = {
    ICON: 92,
    A_LIST: 78,
    ESTABLISHED: 55,
    RISING: 34,
    INDIE: 24,
    UNKNOWN: 44,
};

const guestTierCostMultiplier: Record<string, number> = {
    ICON: 5.4,
    A_LIST: 4.4,
    ESTABLISHED: 2.7,
    RISING: 1.65,
    INDIE: 1.25,
    UNKNOWN: 1.7,
};

const guestTierAppearanceFee: Record<string, number> = {
    ICON: 4_500_000,
    A_LIST: 1_850_000,
    ESTABLISHED: 420_000,
    RISING: 85_000,
    INDIE: 30_000,
    UNKNOWN: 120_000,
};

const getNpcPool = (player?: LifestyleActivityPlayerContext | null): NPCActor[] => {
    const extraNPCs = Array.isArray(player?.flags?.extraNPCs) ? player?.flags?.extraNPCs : [];
    const merged = [...NPC_DATABASE, ...extraNPCs]
        .filter((npc): npc is NPCActor => Boolean(npc?.id && npc?.name && npc?.occupation === 'ACTOR'));
    return merged.filter((npc, index, all) => (
        all.findIndex(entry => entry.id === npc.id || entry.name.toLowerCase() === npc.name.toLowerCase()) === index
    ));
};

const getNpcRelationship = (player: LifestyleActivityPlayerContext | null | undefined, npcId: string, name?: string): Relationship | undefined => (
    (player?.relationships || []).find(relationship => relationship.npcId === npcId || (!!name && relationship.name === name))
);

const getNpcHeadlineChoice = (npc: NPCActor, player?: LifestyleActivityPlayerContext | null): LifestyleActivityChoice => {
    const relationship = getNpcRelationship(player, npc.id, npc.name);
    const relationshipTag = relationship?.closeness ? ` • ${Math.round(relationship.closeness)} bond` : '';
    const followersM = Math.max(0.1, npc.followers / 1_000_000);
    const prestigeLift = npc.prestigeBias === 'PRESTIGE' ? 0.8 : npc.prestigeBias === 'COMMERCIAL' ? 0.4 : 0.6;
    const baseFee = guestTierAppearanceFee[npc.tier] || 120_000;
    const followerFee = Math.min(7_500_000, followersM * 18_000);
    const wealthFee = Math.min(5_000_000, Math.max(0, npc.netWorth) * 0.002);
    return createChoice({
        id: `${NPC_HEADLINE_GUEST_PREFIX}${npc.id}`,
        label: npc.name,
        description: `${npc.tier.replace('_', ' ')}${relationshipTag} • ${followersM.toFixed(followersM >= 10 ? 0 : 1)}M followers`,
        kind: 'NIGHTLIFE_GUEST',
        costMultiplier: guestTierCostMultiplier[npc.tier] || 1.45,
        flatCost: roundCost(baseFee + followerFee + wealthFee),
        statEffects: {
            fame: Math.min(2.4, 0.4 + followersM / 80),
            followers: Math.round(Math.min(9000, 700 + followersM * 75)),
            reputation: prestigeLift,
        },
        riskShift: Math.min(18, Math.max(3, guestTierRank[npc.tier] * 3 + (npc.openness < 45 ? 4 : 0))),
        memoryTag: `npc-guest-${npc.id}`,
    });
};

export const getAvailableNightlifeGuestOptions = (
    player?: LifestyleActivityPlayerContext | null,
    query = '',
    selectedId?: string,
): LifestyleActivityChoice[] => {
    const normalizedQuery = query.trim().toLowerCase();
    const npcChoices = getNpcPool(player)
        .filter(npc => !normalizedQuery || `${npc.name} ${npc.handle} ${npc.tier} ${npc.bio}`.toLowerCase().includes(normalizedQuery))
        .sort((a, b) => {
            const relationDelta = (getNpcRelationship(player, b.id, b.name)?.closeness || 0) - (getNpcRelationship(player, a.id, a.name)?.closeness || 0);
            if (relationDelta !== 0) return relationDelta;
            const tierDelta = (guestTierRank[b.tier] || 0) - (guestTierRank[a.tier] || 0);
            if (tierDelta !== 0) return tierDelta;
            return (b.followers || 0) - (a.followers || 0);
        })
        .slice(0, normalizedQuery ? 18 : 12)
        .map(npc => getNpcHeadlineChoice(npc, player));

    const fixedChoices = normalizedQuery
        ? NIGHTLIFE_GUEST_OPTIONS.filter(choice => `${choice.label} ${choice.description}`.toLowerCase().includes(normalizedQuery))
        : NIGHTLIFE_GUEST_OPTIONS;
    const choices = [...fixedChoices, ...npcChoices];

    if (selectedId && !choices.some(choice => choice.id === selectedId) && selectedId.startsWith(NPC_HEADLINE_GUEST_PREFIX)) {
        const selectedNpc = getNpcPool(player).find(npc => selectedId === `${NPC_HEADLINE_GUEST_PREFIX}${npc.id}`);
        if (selectedNpc) return [getNpcHeadlineChoice(selectedNpc, player), ...choices];
    }
    return choices;
};

export const getAvailableIndustryGuestOptions = (
    player?: LifestyleActivityPlayerContext | null,
    query = '',
    selectedIds: string[] = [],
): LifestyleActivityChoice[] => {
    const selectedSet = new Set(selectedIds);
    const choices = getAvailableNightlifeGuestOptions(player, query)
        .filter(choice => choice.id !== 'no_guest')
        .map(choice => ({
            ...choice,
            kind: 'INDUSTRY_GUEST' as const,
            description: `${choice.description} • invite only, RSVP not guaranteed`,
            flatCost: 0,
            costMultiplier: 1,
            riskShift: Math.max(2, Math.round((choice.riskShift || 0) * 0.45)),
        }));
    const selectedChoices = selectedIds
        .map(id => choices.find(choice => choice.id === id)
            || getAvailableNightlifeGuestOptions(player, '', id).find(choice => choice.id === id))
        .filter((choice): choice is LifestyleActivityChoice => Boolean(choice))
        .map(choice => ({
            ...choice,
            kind: 'INDUSTRY_GUEST' as const,
            flatCost: 0,
            costMultiplier: 1,
        }));
    return [
        ...selectedChoices,
        ...choices.filter(choice => !selectedSet.has(choice.id)),
    ].filter((choice, index, all) => all.findIndex(item => item.id === choice.id) === index).slice(0, query ? 18 : 14);
};

const getNightlifeGuestChoice = (
    player: LifestyleActivityPlayerContext | null | undefined,
    id?: string,
): LifestyleActivityChoice => (
    findChoice(getAvailableNightlifeGuestOptions(player, '', id), id, 1)
);

export const NIGHTLIFE_CROWD_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'inner_circle', label: 'Inner Circle', description: 'Friends, team, and trusted people.', kind: 'NIGHTLIFE_CROWD', costMultiplier: 0.9, statEffects: { happiness: 1.2 }, riskShift: -4, memoryTag: 'inner-circle' }),
    createChoice({ id: 'industry_room', label: 'Industry Room', description: 'Agents, producers, stylists, tastemakers.', kind: 'NIGHTLIFE_CROWD', costMultiplier: 1.25, statEffects: { reputation: 1, fame: 0.3 }, riskShift: 2, memoryTag: 'industry-room' }),
    createChoice({ id: 'fan_heat', label: 'Fan Heat', description: 'Outside energy and heavy social clips.', kind: 'NIGHTLIFE_CROWD', costMultiplier: 1.15, statEffects: { fame: 0.8, followers: 2000 }, riskShift: 9, memoryTag: 'fan-heat' }),
    createChoice({ id: 'celebrity_stack', label: 'Celebrity Stack', description: 'Packed guest list, big upside, messy exits.', kind: 'NIGHTLIFE_CROWD', costMultiplier: 3.8, flatCost: 220_000, statEffects: { fame: 1.2, followers: 2500 }, riskShift: 18, memoryTag: 'celebrity-stack' }),
];

export const NIGHTLIFE_CONTROL_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'no_controls', label: 'Let It Ride', description: 'Cheapest, most chaotic version.', kind: 'NIGHTLIFE_CONTROL', costMultiplier: 0.8, statEffects: { happiness: 1 }, riskShift: 8, memoryTag: 'loose' }),
    createChoice({ id: 'soft_pr', label: 'Soft PR', description: 'A few approved photos and quiet exits.', kind: 'NIGHTLIFE_CONTROL', costMultiplier: 1.18, statEffects: { reputation: 0.6, followers: 450 }, riskShift: -2, memoryTag: 'soft-pr' }),
    createChoice({ id: 'handler_team', label: 'Handler Team', description: 'Guest wrangling, cars, timing, and deniability.', kind: 'NIGHTLIFE_CONTROL', costMultiplier: 1.45, statEffects: { reputation: 0.8 }, riskShift: -7, memoryTag: 'handled' }),
    createChoice({ id: 'documented_drop', label: 'Social Drop', description: 'Turn the night into deliberate content.', kind: 'NIGHTLIFE_CONTROL', costMultiplier: 1.35, statEffects: { fame: 0.7, followers: 1700 }, riskShift: 3, memoryTag: 'social-drop' }),
];

export const INDUSTRY_EVENT_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'industry_dinner', label: 'Industry Dinner', description: 'A polished table where useful conversations happen naturally.', kind: 'INDUSTRY_EVENT', costMultiplier: 1.1, flatCost: 18_000, statEffects: { reputation: 1.2, happiness: 0.5 }, riskShift: 2, memoryTag: 'industry-dinner' }),
    createChoice({ id: 'private_screening_room', label: 'Private Screening', description: 'Show taste, talk craft, and let directors see your eye.', kind: 'INDUSTRY_EVENT', costMultiplier: 1.55, flatCost: 45_000, statEffects: { reputation: 1.8, experience: 1.2 }, riskShift: 3, memoryTag: 'private-screening-room' }),
    createChoice({ id: 'studio_lunch', label: 'Studio Lunch', description: 'Cleaner, businesslike, and easier for producers to attend.', kind: 'INDUSTRY_EVENT', costMultiplier: 1.3, flatCost: 28_000, statEffects: { reputation: 1.4, fame: 0.3 }, riskShift: 1, memoryTag: 'studio-lunch' }),
    createChoice({ id: 'mansion_mixer', label: 'Mansion Mixer', description: 'Bigger room, more surprise meetings, more money burn.', kind: 'INDUSTRY_EVENT', costMultiplier: 2.1, flatCost: 95_000, statEffects: { fame: 1, followers: 1800, reputation: 1 }, riskShift: 8, memoryTag: 'mansion-mixer' }),
    createChoice({ id: 'awards_afterparty', label: 'Awards Afterparty', description: 'Prestige room with serious gatekeeping and huge upside.', kind: 'INDUSTRY_EVENT', costMultiplier: 2.75, flatCost: 160_000, statEffects: { fame: 1.5, reputation: 2.2, followers: 2600 }, riskShift: 9, memoryTag: 'awards-afterparty' }),
    createChoice({ id: 'casual_industry_hang', label: 'Casual Hangout', description: 'Less formal, more human, still expensive when done right.', kind: 'INDUSTRY_EVENT', costMultiplier: 0.95, flatCost: 12_000, statEffects: { happiness: 1.2, reputation: 0.5 }, riskShift: -1, memoryTag: 'casual-industry-hang' }),
];

export const INDUSTRY_VENUE_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'private_room', label: 'Private Room', description: 'Restaurant buyout with controlled entrances.', kind: 'INDUSTRY_VENUE', flatCost: 22_000, costMultiplier: 1.15, statEffects: { reputation: 0.8 }, riskShift: -1, memoryTag: 'private-room' }),
    createChoice({ id: 'home_estate', label: 'Home Estate', description: 'Personal, expensive, and better if you own a serious residence.', kind: 'INDUSTRY_VENUE', flatCost: 38_000, costMultiplier: 1.28, statEffects: { reputation: 1, happiness: 0.5 }, riskShift: 2, memoryTag: 'home-estate' }),
    createChoice({ id: 'studio_backlot', label: 'Studio Backlot', description: 'Industry-coded setting that makes project talk feel natural.', kind: 'INDUSTRY_VENUE', flatCost: 55_000, costMultiplier: 1.42, statEffects: { experience: 1, reputation: 1.2 }, riskShift: 1, memoryTag: 'studio-backlot' }),
    createChoice({ id: 'members_club', label: 'Members Club', description: 'High-status room with gatekeeper energy.', kind: 'INDUSTRY_VENUE', flatCost: 72_000, costMultiplier: 1.65, statEffects: { reputation: 1.5, fame: 0.4 }, riskShift: 4, memoryTag: 'members-club' }),
    createChoice({ id: 'screening_house', label: 'Screening House', description: 'Projection, lounge, wine, and craft-first conversation.', kind: 'INDUSTRY_VENUE', flatCost: 85_000, costMultiplier: 1.75, statEffects: { reputation: 1.7, experience: 1.4 }, riskShift: 3, memoryTag: 'screening-house' }),
];

export const INDUSTRY_INVITE_GROUP_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'directors', label: 'Directors', description: 'Creative gatekeepers. Rare RSVPs can become auditions later.', kind: 'INDUSTRY_INVITE_GROUP', flatCost: 32_000, costMultiplier: 1.18, statEffects: { reputation: 1.2, experience: 0.8 }, riskShift: 3, memoryTag: 'invite-directors' }),
    createChoice({ id: 'producers', label: 'Producers', description: 'Money and casting access. Expensive room expectations.', kind: 'INDUSTRY_INVITE_GROUP', flatCost: 38_000, costMultiplier: 1.22, statEffects: { reputation: 1, fame: 0.4 }, riskShift: 4, memoryTag: 'invite-producers' }),
    createChoice({ id: 'actors', label: 'Actors', description: 'Peer chemistry, referrals, and possible project whispers.', kind: 'INDUSTRY_INVITE_GROUP', flatCost: 24_000, costMultiplier: 1.12, statEffects: { happiness: 0.7, fame: 0.5 }, riskShift: 3, memoryTag: 'invite-actors' }),
    createChoice({ id: 'agents_managers', label: 'Agents & Managers', description: 'Deal flow, availability talk, and representation gossip.', kind: 'INDUSTRY_INVITE_GROUP', flatCost: 28_000, costMultiplier: 1.12, statEffects: { reputation: 0.9 }, riskShift: 2, memoryTag: 'invite-reps' }),
    createChoice({ id: 'current_connections', label: 'Current Connections', description: 'Warmer room. Existing bonds can deepen without forcing it.', kind: 'INDUSTRY_INVITE_GROUP', flatCost: 16_000, costMultiplier: 0.98, statEffects: { happiness: 0.8, reputation: 0.4 }, riskShift: -1, memoryTag: 'invite-current' }),
];

export const INDUSTRY_HOSTING_STYLE_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'tasteful_professional', label: 'Tasteful Professional', description: 'Classy, controlled, and serious without looking thirsty.', kind: 'INDUSTRY_HOSTING_STYLE', costMultiplier: 1.1, statEffects: { reputation: 1 }, riskShift: -2, memoryTag: 'tasteful-professional' }),
    createChoice({ id: 'creative_salon', label: 'Creative Salon', description: 'Craft talk, screenings, scripts, and long conversations.', kind: 'INDUSTRY_HOSTING_STYLE', costMultiplier: 1.2, flatCost: 12_000, statEffects: { experience: 1.5, reputation: 0.8 }, riskShift: 0, memoryTag: 'creative-salon' }),
    createChoice({ id: 'warm_casual', label: 'Warm Casual', description: 'Relaxed and human. Better for actors and existing connections.', kind: 'INDUSTRY_HOSTING_STYLE', costMultiplier: 0.95, statEffects: { happiness: 1.2 }, riskShift: -2, memoryTag: 'warm-casual' }),
    createChoice({ id: 'luxury_power_room', label: 'Luxury Power Room', description: 'Expensive signal. Opens doors, but can read performative.', kind: 'INDUSTRY_HOSTING_STYLE', costMultiplier: 1.75, flatCost: 60_000, statEffects: { fame: 0.8, reputation: 1.2 }, riskShift: 7, memoryTag: 'luxury-power-room' }),
    createChoice({ id: 'quiet_no_phones', label: 'Quiet No-Phones', description: 'High trust, less buzz, better real conversation.', kind: 'INDUSTRY_HOSTING_STYLE', costMultiplier: 1.25, flatCost: 18_000, statEffects: { reputation: 1.3 }, riskShift: -5, memoryTag: 'quiet-no-phones' }),
];

export const INDUSTRY_SERVICE_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'premium_service', label: 'Premium Service', description: 'Good room, strong food, no embarrassment.', kind: 'INDUSTRY_SERVICE', flatCost: 18_000, costMultiplier: 1, statEffects: { reputation: 0.5 }, riskShift: 0, memoryTag: 'premium-service' }),
    createChoice({ id: 'chef_table', label: 'Chef Table', description: 'Memorable dinner built for taste and conversation.', kind: 'INDUSTRY_SERVICE', flatCost: 55_000, costMultiplier: 1.18, statEffects: { reputation: 1.1, happiness: 0.7 }, riskShift: -1, memoryTag: 'industry-chef-table' }),
    createChoice({ id: 'concierge_room', label: 'Concierge Room', description: 'Drivers, assistants, security, and clean arrivals.', kind: 'INDUSTRY_SERVICE', flatCost: 95_000, costMultiplier: 1.35, statEffects: { reputation: 1.4 }, riskShift: -4, memoryTag: 'concierge-room' }),
    createChoice({ id: 'legendary_hosting', label: 'Legendary Hosting', description: 'A serious spend that people talk about for weeks.', kind: 'INDUSTRY_SERVICE', flatCost: 240_000, costMultiplier: 1.9, statEffects: { fame: 1.2, reputation: 2, followers: 2200 }, riskShift: 5, memoryTag: 'legendary-hosting' }),
];

export const INDUSTRY_ADDON_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'private_screening_addon', label: 'Private Screening', description: 'A film-room moment that can spark creative follow-ups.', kind: 'INDUSTRY_ADDON', flatCost: 42_000, statEffects: { reputation: 1, experience: 1 }, riskShift: 1, memoryTag: 'industry-private-screening' }),
    createChoice({ id: 'director_table', label: 'Director Table', description: 'Dedicated seating for directors and creative talk.', kind: 'INDUSTRY_ADDON', flatCost: 65_000, statEffects: { reputation: 1.1, experience: 0.8 }, riskShift: 2, memoryTag: 'director-table' }),
    createChoice({ id: 'producer_suite', label: 'Producer Suite', description: 'Private side room where availability talk can happen.', kind: 'INDUSTRY_ADDON', flatCost: 80_000, statEffects: { reputation: 1.1, fame: 0.4 }, riskShift: 3, memoryTag: 'producer-suite' }),
    createChoice({ id: 'gift_bags', label: 'Gift Bags', description: 'Useful if tasteful, tacky if too loud.', kind: 'INDUSTRY_ADDON', flatCost: 35_000, statEffects: { happiness: 0.5, reputation: 0.4 }, riskShift: 3, memoryTag: 'gift-bags' }),
    createChoice({ id: 'pr_photographer', label: 'PR Photographer', description: 'A few controlled shots can make the room visible.', kind: 'INDUSTRY_ADDON', flatCost: 48_000, statEffects: { fame: 0.8, followers: 1400 }, riskShift: 6, memoryTag: 'pr-photographer' }),
];

export const CHARITY_CAUSE_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'children_education', label: 'Children Education', description: 'Scholarships, school access, and long-term public goodwill.', kind: 'CHARITY_CAUSE', flatCost: 35_000, statEffects: { reputation: 1.4, happiness: 0.8 }, riskShift: -2, memoryTag: 'children-education' }),
    createChoice({ id: 'college_scholarships', label: 'College Scholarships', description: 'Fund student tuition and make education part of your legacy.', kind: 'CHARITY_CAUSE', flatCost: 85_000, statEffects: { reputation: 1.8, happiness: 0.8 }, riskShift: -3, memoryTag: 'college-scholarships' }),
    createChoice({ id: 'campus_building_fund', label: 'Campus Building Fund', description: 'Donate to a college building, library, lab, or performing arts wing.', kind: 'CHARITY_CAUSE', flatCost: 180_000, statEffects: { reputation: 2.2, fame: 0.4 }, riskShift: -1, memoryTag: 'campus-building-fund' }),
    createChoice({ id: 'film_school_endowment', label: 'Film School Endowment', description: 'Support young filmmakers while building industry goodwill.', kind: 'CHARITY_CAUSE', flatCost: 160_000, statEffects: { reputation: 2, experience: 1, fame: 0.3 }, riskShift: -2, memoryTag: 'film-school-endowment' }),
    createChoice({ id: 'medical_relief', label: 'Medical Relief', description: 'Hospitals, emergency aid, and serious humanitarian weight.', kind: 'CHARITY_CAUSE', flatCost: 45_000, statEffects: { reputation: 1.8, happiness: 0.6 }, riskShift: -1, memoryTag: 'medical-relief' }),
    createChoice({ id: 'film_workers_fund', label: 'Film Workers Fund', description: 'Crew hardship grants and industry respect without looking random.', kind: 'CHARITY_CAUSE', flatCost: 55_000, statEffects: { reputation: 2, experience: 0.6 }, riskShift: -3, memoryTag: 'film-workers-fund' }),
    createChoice({ id: 'animal_rescue', label: 'Animal Rescue', description: 'Warm public cause with family-friendly social lift.', kind: 'CHARITY_CAUSE', flatCost: 28_000, statEffects: { reputation: 1.1, happiness: 1.2, followers: 600 }, riskShift: 0, memoryTag: 'animal-rescue' }),
    createChoice({ id: 'climate_arts', label: 'Climate & Arts', description: 'Prestige-friendly, but can look elite if the room is too glossy.', kind: 'CHARITY_CAUSE', flatCost: 60_000, statEffects: { reputation: 1.6, fame: 0.4 }, riskShift: 2, memoryTag: 'climate-arts' }),
];

export const CHARITY_FORMAT_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'hotel_ballroom', label: 'Hotel Ballroom', description: 'Classic gala setup, reliable and polished.', kind: 'CHARITY_FORMAT', flatCost: 75_000, costMultiplier: 1.25, statEffects: { reputation: 0.8 }, riskShift: 1, memoryTag: 'hotel-ballroom' }),
    createChoice({ id: 'museum_benefit', label: 'Museum Benefit', description: 'Tasteful, high-status, and more legacy-coded.', kind: 'CHARITY_FORMAT', flatCost: 135_000, costMultiplier: 1.45, statEffects: { reputation: 1.3, fame: 0.3 }, riskShift: 0, memoryTag: 'museum-benefit' }),
    createChoice({ id: 'foundation_dinner', label: 'Foundation Dinner', description: 'Smaller room, bigger checks, less public noise.', kind: 'CHARITY_FORMAT', flatCost: 95_000, costMultiplier: 1.2, statEffects: { reputation: 1.6 }, riskShift: -4, memoryTag: 'foundation-dinner' }),
    createChoice({ id: 'telethon_special', label: 'Telethon Special', description: 'Live public fundraising with huge reach and cringe risk.', kind: 'CHARITY_FORMAT', flatCost: 220_000, costMultiplier: 1.75, statEffects: { fame: 1.1, followers: 2800 }, riskShift: 8, memoryTag: 'telethon-special' }),
    createChoice({ id: 'stadium_benefit', label: 'Stadium Benefit', description: 'Massive spectacle. Can become iconic or look performative.', kind: 'CHARITY_FORMAT', flatCost: 520_000, costMultiplier: 2.4, statEffects: { fame: 1.7, followers: 5200 }, riskShift: 13, memoryTag: 'stadium-benefit' }),
];

export const CHARITY_DONATION_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'six_figure_pledge', label: 'Six-Figure Pledge', description: 'Real money without turning the night into a flex.', kind: 'CHARITY_DONATION', flatCost: 100_000, statEffects: { reputation: 2, happiness: 0.8 }, riskShift: -2, memoryTag: 'six-figure-pledge' }),
    createChoice({ id: 'major_grant', label: 'Major Grant', description: 'A serious check that anchors the whole event.', kind: 'CHARITY_DONATION', flatCost: 350_000, statEffects: { reputation: 3, happiness: 1 }, riskShift: -3, memoryTag: 'major-grant' }),
    createChoice({ id: 'million_seed', label: 'Million Seed', description: 'Foundation-level giving with press power.', kind: 'CHARITY_DONATION', flatCost: 1_000_000, statEffects: { reputation: 4, fame: 0.8, followers: 2500 }, riskShift: -1, memoryTag: 'million-seed' }),
    createChoice({ id: 'named_wing_grant', label: 'Named Wing Grant', description: 'Large enough that a college may name a wing, lab, or hall after you.', kind: 'CHARITY_DONATION', flatCost: 2_500_000, statEffects: { reputation: 5, fame: 1, followers: 3500 }, riskShift: -1, memoryTag: 'named-wing-grant' }),
    createChoice({ id: 'legacy_endowment', label: 'Legacy Endowment', description: 'Huge long-term commitment. Expensive, respected, hard to fake.', kind: 'CHARITY_DONATION', flatCost: 4_000_000, statEffects: { reputation: 6, fame: 1.2, happiness: 1.5 }, riskShift: -4, memoryTag: 'legacy-endowment' }),
];

export const CHARITY_GUEST_CIRCLE_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'private_donors', label: 'Private Donors', description: 'Quieter money, fewer cameras, stronger credibility.', kind: 'CHARITY_GUEST_CIRCLE', flatCost: 45_000, costMultiplier: 1.05, statEffects: { reputation: 1 }, riskShift: -3, memoryTag: 'private-donors' }),
    createChoice({ id: 'celebrity_table', label: 'Celebrity Table', description: 'More photos and reach, more performative risk.', kind: 'CHARITY_GUEST_CIRCLE', flatCost: 140_000, costMultiplier: 1.35, statEffects: { fame: 0.8, followers: 1900 }, riskShift: 5, memoryTag: 'celebrity-table' }),
    createChoice({ id: 'industry_patrons', label: 'Industry Patrons', description: 'Studios, producers, and career-adjacent goodwill.', kind: 'CHARITY_GUEST_CIRCLE', flatCost: 120_000, costMultiplier: 1.25, statEffects: { reputation: 1.2, experience: 0.4 }, riskShift: 2, memoryTag: 'industry-patrons' }),
    createChoice({ id: 'family_foundation', label: 'Family Foundation', description: 'Personal and legacy-heavy, less flashy.', kind: 'CHARITY_GUEST_CIRCLE', flatCost: 80_000, costMultiplier: 1.1, statEffects: { happiness: 1.2, reputation: 0.9 }, riskShift: -2, memoryTag: 'family-foundation' }),
];

export const CHARITY_PRESS_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'quiet_receipts', label: 'Quiet Receipts', description: 'Publish proof after the money moves. Low buzz, high trust.', kind: 'CHARITY_PRESS', costMultiplier: 0.95, statEffects: { reputation: 1.3 }, riskShift: -6, memoryTag: 'quiet-receipts' }),
    createChoice({ id: 'controlled_press', label: 'Controlled Press', description: 'A few photos, clear numbers, tasteful statements.', kind: 'CHARITY_PRESS', flatCost: 35_000, costMultiplier: 1.08, statEffects: { reputation: 1, fame: 0.4, followers: 900 }, riskShift: -1, memoryTag: 'controlled-press' }),
    createChoice({ id: 'red_carpet_cause', label: 'Red Carpet Cause', description: 'Big visibility. Works only if the giving is real.', kind: 'CHARITY_PRESS', flatCost: 90_000, costMultiplier: 1.22, statEffects: { fame: 1, followers: 2200 }, riskShift: 7, memoryTag: 'red-carpet-cause' }),
    createChoice({ id: 'viral_challenge', label: 'Viral Challenge', description: 'Social-first fundraising. Huge upside, easy to mock.', kind: 'CHARITY_PRESS', flatCost: 60_000, costMultiplier: 1.15, statEffects: { fame: 0.9, followers: 3200 }, riskShift: 9, memoryTag: 'viral-challenge' }),
];

export const WELLNESS_PROGRAM_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'regular_checkup', label: 'Regular Checkup', description: 'Routine vitals, bloodwork, and early warning scan.', kind: 'WELLNESS_PROGRAM', costMultiplier: 0.85, statEffects: { health: 3, happiness: 0.5 }, riskShift: -3, memoryTag: 'checkup' }),
    createChoice({ id: 'flu_care', label: 'Flu / Minor Illness', description: 'Quick doctor visit, medicine, rest, and clearance.', kind: 'WELLNESS_PROGRAM', costMultiplier: 0.75, statEffects: { health: 4, happiness: 0.5 }, riskShift: -4, memoryTag: 'flu-care' }),
    createChoice({ id: 'injury_rehab', label: 'Injury & Physio', description: 'Treat pain, sprains, mobility, and role-related strain.', kind: 'WELLNESS_PROGRAM', costMultiplier: 1.25, statEffects: { health: 4, body: 2 }, riskShift: -4, memoryTag: 'injury-rehab' }),
    createChoice({ id: 'stress_burnout', label: 'Stress / Burnout', description: 'Therapy, schedule reset, and mental pressure care.', kind: 'WELLNESS_PROGRAM', costMultiplier: 1.1, statEffects: { happiness: 5, health: 1 }, riskShift: -7, memoryTag: 'burnout-care' }),
    createChoice({ id: 'sleep_disorder', label: 'Sleep Problem', description: 'Sleep diagnosis and recovery when schedules break you.', kind: 'WELLNESS_PROGRAM', costMultiplier: 1.35, flatCost: 2_000, statEffects: { health: 5, happiness: 2, body: 1 }, riskShift: -8, memoryTag: 'sleep-care' }),
    createChoice({ id: 'addiction_rehab', label: 'Addiction Rehab', description: 'Discreet serious care when partying becomes dangerous.', kind: 'WELLNESS_PROGRAM', costMultiplier: 2.6, flatCost: 18_000, statEffects: { health: 7, happiness: 3, reputation: 1 }, riskShift: -13, memoryTag: 'rehab' }),
    createChoice({ id: 'cancer_screening', label: 'Cancer Screening', description: 'High-stakes screening and specialist referral path.', kind: 'WELLNESS_PROGRAM', costMultiplier: 3.2, flatCost: 24_000, statEffects: { health: 8, happiness: -0.5 }, riskShift: -14, memoryTag: 'cancer-screening' }),
    createChoice({ id: 'camera_ready_care', label: 'Looks & Skin Care', description: 'Dermatology, grooming, smile, skin, and camera polish.', kind: 'WELLNESS_PROGRAM', costMultiplier: 1.55, statEffects: { looks: 4, happiness: 1, reputation: 0.5 }, riskShift: -1, memoryTag: 'looks-care' }),
];

export const WELLNESS_PROVIDER_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'public_clinic', label: 'Public Clinic', description: 'Cheap and practical. Longer waits, basic privacy.', kind: 'WELLNESS_PROVIDER', costMultiplier: 0.35, statEffects: { health: 0.5 }, riskShift: 3, memoryTag: 'public-clinic' }),
    createChoice({ id: 'private_doctor', label: 'Private Doctor', description: 'Reliable personal care with sane pricing.', kind: 'WELLNESS_PROVIDER', costMultiplier: 1, statEffects: { health: 1.5, happiness: 0.5 }, riskShift: -2, memoryTag: 'private-doctor' }),
    createChoice({ id: 'specialist_hospital', label: 'Specialist Hospital', description: 'Better diagnostics and treatment for serious issues.', kind: 'WELLNESS_PROVIDER', costMultiplier: 2.2, flatCost: 6_000, statEffects: { health: 3, reputation: 0.5 }, riskShift: -6, memoryTag: 'specialist-hospital' }),
    createChoice({ id: 'medical_concierge', label: 'Medical Concierge', description: 'Elite doctors, privacy, transport, and priority access.', kind: 'WELLNESS_PROVIDER', costMultiplier: 4.8, flatCost: 40_000, statEffects: { health: 4, happiness: 2, reputation: 1 }, riskShift: -9, memoryTag: 'medical-concierge' }),
];

export const WELLNESS_FOCUS_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'basic_treatment', label: 'Basic Treatment', description: 'Consultation, medicine, and simple advice.', kind: 'WELLNESS_FOCUS', costMultiplier: 0.75, statEffects: { health: 1 }, riskShift: 1, memoryTag: 'basic-treatment' }),
    createChoice({ id: 'full_diagnosis', label: 'Full Diagnosis', description: 'Tests, scans, second opinion, and a clear plan.', kind: 'WELLNESS_FOCUS', costMultiplier: 1.35, flatCost: 2_500, statEffects: { health: 2, happiness: 0.5 }, riskShift: -4, memoryTag: 'full-diagnosis' }),
    createChoice({ id: 'advanced_treatment', label: 'Advanced Treatment', description: 'Aggressive care for serious or repeated problems.', kind: 'WELLNESS_FOCUS', costMultiplier: 2.7, flatCost: 12_000, statEffects: { health: 4, body: 1 }, riskShift: -9, memoryTag: 'advanced-treatment' }),
    createChoice({ id: 'camera_polish', label: 'Camera Polish', description: 'Looks, skin, grooming, posture, and style-friendly care.', kind: 'WELLNESS_FOCUS', costMultiplier: 1.45, flatCost: 3_000, statEffects: { looks: 3, body: 1, happiness: 1 }, riskShift: -1, memoryTag: 'camera-polish' }),
];

export const WELLNESS_SUPPORT_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'no_followup', label: 'No Follow-up', description: 'One visit only. Cheapest, less reliable.', kind: 'WELLNESS_SUPPORT', costMultiplier: 0.7, riskShift: 4, memoryTag: 'no-followup' }),
    createChoice({ id: 'followup_visit', label: 'Follow-up Visit', description: 'Return visit to confirm recovery.', kind: 'WELLNESS_SUPPORT', costMultiplier: 1.15, flatCost: 800, statEffects: { health: 1 }, riskShift: -2, memoryTag: 'followup' }),
    createChoice({ id: 'private_nurse', label: 'Private Nurse', description: 'At-home care for illness, injury, or recovery.', kind: 'WELLNESS_SUPPORT', costMultiplier: 1.8, flatCost: 6_000, statEffects: { health: 2, happiness: 1 }, riskShift: -5, memoryTag: 'private-nurse' }),
    createChoice({ id: 'recovery_retreat', label: 'Recovery Retreat', description: 'Full controlled environment for rehab or burnout.', kind: 'WELLNESS_SUPPORT', costMultiplier: 2.4, flatCost: 12_000, statEffects: { health: 3, happiness: 2, fame: -0.3 }, riskShift: -8, memoryTag: 'recovery-retreat' }),
];

export interface AdoptionChildProfile {
    id: string;
    name: string;
    gender: Gender;
    age: number;
    ageGroup: 'infant' | 'toddler' | 'school_age' | 'teen';
    personality: string;
    background: string;
    needs: string;
    dream: string;
    stats: {
        trust: number;
        health: number;
        school: number;
        adjustment: number;
    };
    costMultiplier: number;
    riskShift: number;
    statEffects: Partial<Stats>;
}

export const ADOPTION_CHILD_PROFILES: AdoptionChildProfile[] = [
    {
        id: 'maya_reed',
        name: 'Maya Reed',
        gender: 'FEMALE',
        age: 0,
        ageGroup: 'infant',
        personality: 'Gentle, observant, settles with routine.',
        background: 'Newborn match through a local family placement.',
        needs: 'High care, steady nights, and long-term childcare.',
        dream: 'A stable home from the very beginning.',
        stats: { trust: 70, health: 82, school: 0, adjustment: 58 },
        costMultiplier: 1.25,
        riskShift: 4,
        statEffects: { happiness: 4 },
    },
    {
        id: 'leo_hayes',
        name: 'Leo Hayes',
        gender: 'MALE',
        age: 3,
        ageGroup: 'toddler',
        personality: 'Playful, loud, quick to bond once routines feel safe.',
        background: 'Toddler placement needing a patient transition.',
        needs: 'Preschool planning, health checkups, and daily structure.',
        dream: 'A room full of toys and someone who keeps showing up.',
        stats: { trust: 60, health: 76, school: 25, adjustment: 52 },
        costMultiplier: 1.05,
        riskShift: 2,
        statEffects: { happiness: 3.5 },
    },
    {
        id: 'aarav_stone',
        name: 'Aarav Stone',
        gender: 'MALE',
        age: 8,
        ageGroup: 'school_age',
        personality: 'Curious, bright, guarded until trust is earned.',
        background: 'School-age child with clear routines and big questions.',
        needs: 'School placement, tutoring, and consistent family time.',
        dream: 'A home where his drawings stay on the wall.',
        stats: { trust: 54, health: 80, school: 68, adjustment: 61 },
        costMultiplier: 0.92,
        riskShift: 0,
        statEffects: { happiness: 3, experience: 1 },
    },
    {
        id: 'mila_hart',
        name: 'Mila Hart',
        gender: 'FEMALE',
        age: 9,
        ageGroup: 'school_age',
        personality: 'Calm, artistic, thoughtful, and quietly funny.',
        background: 'Stable school-age match looking for a creative home.',
        needs: 'Art supplies, school continuity, and gentle privacy.',
        dream: 'A family that lets her make things without pressure.',
        stats: { trust: 63, health: 84, school: 73, adjustment: 66 },
        costMultiplier: 0.96,
        riskShift: -1,
        statEffects: { happiness: 3.2, experience: 1 },
    },
    {
        id: 'kai_monroe',
        name: 'Kai Monroe',
        gender: 'MALE',
        age: 15,
        ageGroup: 'teen',
        personality: 'Sharp, independent, protective of his space.',
        background: 'Teen placement with strong opinions and a real trust curve.',
        needs: 'Privacy, therapy access, school support, and respect.',
        dream: 'A family that treats him like a person, not a headline.',
        stats: { trust: 38, health: 78, school: 60, adjustment: 44 },
        costMultiplier: 0.82,
        riskShift: 6,
        statEffects: { happiness: 2, experience: 1.5 },
    },
    {
        id: 'riley_quinn',
        name: 'Riley Quinn',
        gender: 'NON_BINARY',
        age: 12,
        ageGroup: 'school_age',
        personality: 'Funny, social, brave, and sensitive to public attention.',
        background: 'Older child with strong friend bonds and school momentum.',
        needs: 'Community continuity, tutoring, and a careful public boundary.',
        dream: 'A home where they can keep their identity and feel chosen.',
        stats: { trust: 50, health: 79, school: 70, adjustment: 56 },
        costMultiplier: 0.9,
        riskShift: 2,
        statEffects: { happiness: 2.8, experience: 1.2 },
    },
];

const ADOPTION_POOL_REFRESH_WEEKS = 3;

const adoptionFirstNames: Record<Gender, string[]> = {
    ALL: ['Noah', 'Lina', 'Riley', 'Ari', 'Maya', 'Theo', 'Quinn', 'Zara', 'Rowan', 'Noor'],
    MALE: ['Noah', 'Eli', 'Arjun', 'Mateo', 'Theo', 'Owen', 'Samir', 'Jonah', 'Nico', 'Miles'],
    FEMALE: ['Lina', 'Ava', 'Sofia', 'Iris', 'Nora', 'Maya', 'Zara', 'Amara', 'Ella', 'Kiara'],
    NON_BINARY: ['Riley', 'Ari', 'Sky', 'Quinn', 'Rowan', 'Sage', 'River', 'Emery', 'Indigo', 'Noor'],
};

const adoptionLastNames = ['Vale', 'Reed', 'Stone', 'Hart', 'Monroe', 'Quinn', 'Hayes', 'Lane', 'Brooks', 'Sol', 'Marlow', 'Wren'];

const adoptionPersonalityTemplates: Array<Pick<AdoptionChildProfile, 'ageGroup' | 'personality' | 'background' | 'needs' | 'dream' | 'stats' | 'costMultiplier' | 'riskShift' | 'statEffects'>> = [
    {
        ageGroup: 'infant',
        personality: 'Gentle, alert, and happiest with steady routine.',
        background: 'Infant placement through a local family care route.',
        needs: 'High daily care, sleep support, and long-term childcare planning.',
        dream: 'A calm home from the very beginning.',
        stats: { trust: 68, health: 82, school: 0, adjustment: 56 },
        costMultiplier: 1.24,
        riskShift: 4,
        statEffects: { happiness: 4 },
    },
    {
        ageGroup: 'toddler',
        personality: 'Playful, expressive, and quick to bond with consistency.',
        background: 'Toddler placement needing patience and predictable days.',
        needs: 'Preschool planning, health checks, and daily structure.',
        dream: 'A safe room, toys, and someone who keeps showing up.',
        stats: { trust: 58, health: 77, school: 24, adjustment: 52 },
        costMultiplier: 1.04,
        riskShift: 2,
        statEffects: { happiness: 3.5 },
    },
    {
        ageGroup: 'school_age',
        personality: 'Curious, bright, and careful until trust feels real.',
        background: 'School-age child with routines, friends, and big questions.',
        needs: 'School placement, tutoring, and regular family time.',
        dream: 'A home where their drawings and trophies stay visible.',
        stats: { trust: 54, health: 80, school: 68, adjustment: 61 },
        costMultiplier: 0.94,
        riskShift: 0,
        statEffects: { happiness: 3, experience: 1 },
    },
    {
        ageGroup: 'school_age',
        personality: 'Creative, thoughtful, and sensitive to sudden public attention.',
        background: 'Older child looking for privacy and a creative home.',
        needs: 'School continuity, gentle boundaries, and personal space.',
        dream: 'A family that lets them grow without turning them into a headline.',
        stats: { trust: 57, health: 81, school: 72, adjustment: 59 },
        costMultiplier: 0.98,
        riskShift: 1,
        statEffects: { happiness: 3, experience: 1.2 },
    },
    {
        ageGroup: 'teen',
        personality: 'Independent, sharp, loyal once trust is earned.',
        background: 'Teen placement with a real trust curve and clear opinions.',
        needs: 'Privacy, therapy access, school support, and respect.',
        dream: 'A family that treats them like a person, not a project.',
        stats: { trust: 38, health: 78, school: 61, adjustment: 44 },
        costMultiplier: 0.82,
        riskShift: 6,
        statEffects: { happiness: 2, experience: 1.5 },
    },
];

const ageForAdoptionGroup = (ageGroup: AdoptionChildProfile['ageGroup'], seed: string): number => {
    const roll = stableRoll(`${seed}_age`);
    if (ageGroup === 'infant') return 0;
    if (ageGroup === 'toddler') return 2 + Math.floor(roll * 3);
    if (ageGroup === 'teen') return 13 + Math.floor(roll * 5);
    return 6 + Math.floor(roll * 6);
};

export const getAdoptionPoolCycle = (player?: LifestyleActivityPlayerContext | null): number => {
    const absoluteWeek = getAbsoluteWeek(Number(player?.age || 18), Number(player?.currentWeek || 1));
    return Math.floor(absoluteWeek / ADOPTION_POOL_REFRESH_WEEKS);
};

const buildGeneratedAdoptionProfile = (player: LifestyleActivityPlayerContext | null | undefined, cycle: number, slot: number): AdoptionChildProfile => {
    const seedBase = `${player?.id || player?.name || 'player'}_${cycle}_${slot}_adoption_pool`;
    const template = adoptionPersonalityTemplates[Math.floor(stableRoll(`${seedBase}_template`) * adoptionPersonalityTemplates.length)] || adoptionPersonalityTemplates[2];
    const genders: Gender[] = ['MALE', 'FEMALE', 'NON_BINARY'];
    const gender = genders[Math.floor(stableRoll(`${seedBase}_gender`) * genders.length)] || 'MALE';
    const firstNames = adoptionFirstNames[gender] || adoptionFirstNames.MALE;
    const firstName = firstNames[Math.floor(stableRoll(`${seedBase}_first`) * firstNames.length)] || firstNames[0];
    const lastName = adoptionLastNames[Math.floor(stableRoll(`${seedBase}_last`) * adoptionLastNames.length)] || adoptionLastNames[0];
    const age = ageForAdoptionGroup(template.ageGroup, seedBase);
    const trustShift = Math.round((stableRoll(`${seedBase}_trust`) - 0.5) * 12);
    const healthShift = Math.round((stableRoll(`${seedBase}_health`) - 0.5) * 10);
    const schoolShift = Math.round((stableRoll(`${seedBase}_school`) - 0.5) * 12);
    const adjustmentShift = Math.round((stableRoll(`${seedBase}_adjust`) - 0.5) * 12);
    const name = `${firstName} ${lastName}`;
    return {
        ...template,
        id: `pool_${cycle}_${slot}_${firstName}_${lastName}`.toLowerCase(),
        name,
        gender,
        age,
        stats: {
            trust: clamp(template.stats.trust + trustShift),
            health: clamp(template.stats.health + healthShift),
            school: template.ageGroup === 'infant' ? 0 : clamp(template.stats.school + schoolShift),
            adjustment: clamp(template.stats.adjustment + adjustmentShift),
        },
        costMultiplier: Math.max(0.72, Number((template.costMultiplier + (stableRoll(`${seedBase}_cost`) - 0.5) * 0.12).toFixed(2))),
        riskShift: Math.round(template.riskShift + (stableRoll(`${seedBase}_risk`) - 0.5) * 4),
        statEffects: { ...template.statEffects },
    };
};

const profileToAdoptionChoice = (profile: AdoptionChildProfile): LifestyleActivityChoice => createChoice({
    id: profile.id,
    label: profile.name,
    description: `${profile.age === 0 ? 'Infant' : `${profile.age} years old`} - ${profile.personality}`,
    kind: 'ADOPTION_CHILD',
    costMultiplier: profile.costMultiplier,
    statEffects: profile.statEffects,
    riskShift: profile.riskShift,
    memoryTag: `adopt-${profile.id}`,
});

export const getAvailableAdoptionChildProfiles = (player?: LifestyleActivityPlayerContext | null): AdoptionChildProfile[] => {
    if (!player) return ADOPTION_CHILD_PROFILES.slice(0, 5);
    const cycle = getAdoptionPoolCycle(player);
    const count = stableRoll(`${player.id || player.name || 'player'}_${cycle}_adoption_pool_count`) > 0.45 ? 5 : 4;
    return Array.from({ length: count }, (_, index) => buildGeneratedAdoptionProfile(player, cycle, index));
};

export const getAdoptionChildProfile = (id?: string, player?: LifestyleActivityPlayerContext | null): AdoptionChildProfile | undefined => (
    getAvailableAdoptionChildProfiles(player).find(profile => profile.id === id)
    || ADOPTION_CHILD_PROFILES.find(profile => profile.id === id)
);

export const ADOPTION_CHILD_OPTIONS: LifestyleActivityChoice[] = ADOPTION_CHILD_PROFILES.map(profileToAdoptionChoice);

export const getAvailableAdoptionChildOptions = (player?: LifestyleActivityPlayerContext | null): LifestyleActivityChoice[] => (
    getAvailableAdoptionChildProfiles(player).map(profileToAdoptionChoice)
);

export const ADOPTION_ROUTE_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'local_agency', label: 'Local Agency', description: 'Standard route with predictable checks.', kind: 'ADOPTION_ROUTE', costMultiplier: 1, flatCost: 8_000, statEffects: { reputation: 0.5 }, riskShift: 0, memoryTag: 'local-agency' }),
    createChoice({ id: 'international_agency', label: 'International Agency', description: 'More paperwork, broader match pool.', kind: 'ADOPTION_ROUTE', costMultiplier: 1.7, flatCost: 28_000, statEffects: { reputation: 0.8, experience: 1 }, riskShift: 5, memoryTag: 'international-agency' }),
    createChoice({ id: 'private_agency', label: 'Private Agency', description: 'Faster specialists and stronger screening help.', kind: 'ADOPTION_ROUTE', costMultiplier: 2.3, flatCost: 75_000, statEffects: { reputation: 1, happiness: 1 }, riskShift: -2, memoryTag: 'private-agency' }),
];

export const ADOPTION_HOME_PREP_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'basic_home', label: 'Basic Home Prep', description: 'Required room, documents, and checks only.', kind: 'ADOPTION_HOME_PREP', costMultiplier: 0.8, flatCost: 4_000, statEffects: { happiness: 0.5 }, riskShift: 5, memoryTag: 'basic-home' }),
    createChoice({ id: 'prepared_home', label: 'Prepared Home', description: 'Safe room, routine setup, and school planning.', kind: 'ADOPTION_HOME_PREP', costMultiplier: 1.15, flatCost: 16_000, statEffects: { happiness: 1.5 }, riskShift: -3, memoryTag: 'prepared-home' }),
    createChoice({ id: 'family_ready_home', label: 'Family-Ready Home', description: 'Dedicated home setup with long-term support.', kind: 'ADOPTION_HOME_PREP', costMultiplier: 1.55, flatCost: 45_000, statEffects: { happiness: 2.5, reputation: 0.5 }, riskShift: -7, memoryTag: 'family-ready-home' }),
    createChoice({ id: 'legacy_nursery', label: 'Legacy Room', description: 'A beautiful, visible commitment to family life.', kind: 'ADOPTION_HOME_PREP', costMultiplier: 2.4, flatCost: 140_000, statEffects: { happiness: 3, reputation: 1 }, riskShift: -5, memoryTag: 'legacy-room' }),
];

export const ADOPTION_SUPPORT_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'legal_only', label: 'Legal Only', description: 'Paperwork support with no extra transition help.', kind: 'ADOPTION_SUPPORT', costMultiplier: 0.75, flatCost: 5_000, riskShift: 5, memoryTag: 'legal-only' }),
    createChoice({ id: 'family_counseling', label: 'Family Counseling', description: 'Guided adjustment and better first bond.', kind: 'ADOPTION_SUPPORT', costMultiplier: 1.2, flatCost: 18_000, statEffects: { happiness: 1, reputation: 0.4 }, riskShift: -5, memoryTag: 'family-counseling' }),
    createChoice({ id: 'full_transition_team', label: 'Transition Team', description: 'Lawyer, counselor, tutor, and privacy support.', kind: 'ADOPTION_SUPPORT', costMultiplier: 2.1, flatCost: 95_000, statEffects: { happiness: 2, reputation: 0.8 }, riskShift: -10, memoryTag: 'transition-team' }),
];

export interface PetCompanionProfile {
    id: string;
    name: string;
    listingTitle?: string;
    emoji: string;
    species: string;
    breed: string;
    acquisition: 'shelter' | 'breeder' | 'endangered' | 'exotic';
    rarity: 'common' | 'premium' | 'endangered' | 'exotic';
    personality: string;
    careNeeds: string;
    legalNote: string;
    baseCost: number;
    costMultiplier: number;
    riskShift: number;
    bondBase: number;
    statEffects: Partial<Stats>;
}

export interface PetCompanionStore {
    id: string;
    name: string;
    description: string;
    icon: string;
    categoryIds: string[];
    acquisitionKinds: PetCompanionProfile['acquisition'][];
    priceTone: string;
    riskShift: number;
}

export const PET_COMPANION_POOL_REFRESH_WEEKS = 3;

export const PET_COMPANION_STORES: PetCompanionStore[] = [
    {
        id: 'shelter_rescue',
        name: 'Shelter & Rescue',
        description: 'Warm rescues, simple paperwork, lower cost, strongest emotional bond.',
        icon: '🏠',
        categoryIds: ['dogs', 'cats', 'rabbits', 'rodents'],
        acquisitionKinds: ['shelter'],
        priceTone: 'Affordable',
        riskShift: -3,
    },
    {
        id: 'prestige_breeder',
        name: 'Prestige Breeder',
        description: 'Premium breeds, trained companions, show-quality pets, higher upkeep.',
        icon: '🏆',
        categoryIds: ['dogs', 'cats', 'rabbits', 'rodents', 'birds', 'horses'],
        acquisitionKinds: ['breeder'],
        priceTone: 'Premium',
        riskShift: 2,
    },
    {
        id: 'exotic_license',
        name: 'Exotic License Shop',
        description: 'Legal exotic companions with specialist habitat and compliance checks.',
        icon: '🪪',
        categoryIds: ['birds', 'snakes', 'reptiles', 'aquarium'],
        acquisitionKinds: ['exotic'],
        priceTone: 'Specialist',
        riskShift: 5,
    },
    {
        id: 'sanctuary_circle',
        name: 'Sanctuary Circle',
        description: 'Conservation sponsorships only, public goodwill, serious scrutiny.',
        icon: '🌿',
        categoryIds: ['sanctuary'],
        acquisitionKinds: ['endangered'],
        priceTone: 'Legacy',
        riskShift: 8,
    },
];

export const COMPANION_CATEGORY_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'dogs', label: 'Dogs', description: 'Loyal pets, daily walks, easy public affection.', kind: 'COMPANION_CATEGORY', statEffects: { happiness: 0.6, health: 0.2 }, memoryTag: 'pet-category-dogs' }),
    createChoice({ id: 'cats', label: 'Cats', description: 'Calmer companions for a private home routine.', kind: 'COMPANION_CATEGORY', statEffects: { happiness: 0.5 }, riskShift: -1, memoryTag: 'pet-category-cats' }),
    createChoice({ id: 'rabbits', label: 'Rabbits', description: 'Gentle companions with quiet rooms and soft care needs.', kind: 'COMPANION_CATEGORY', statEffects: { happiness: 0.4 }, memoryTag: 'pet-category-rabbits' }),
    createChoice({ id: 'rodents', label: 'Mice & Hamsters', description: 'Small pets with simple habitats and quick bonding routines.', kind: 'COMPANION_CATEGORY', statEffects: { happiness: 0.3 }, riskShift: -1, memoryTag: 'pet-category-rodents' }),
    createChoice({ id: 'horses', label: 'Horses', description: 'Status, training, riding, and serious stable costs.', kind: 'COMPANION_CATEGORY', flatCost: 8_000, statEffects: { reputation: 0.3, body: 0.2 }, riskShift: 2, memoryTag: 'pet-category-horses' }),
    createChoice({ id: 'birds', label: 'Birds', description: 'Social, loud, smart companions that need enrichment.', kind: 'COMPANION_CATEGORY', statEffects: { happiness: 0.4, reputation: 0.2 }, riskShift: 2, memoryTag: 'pet-category-birds' }),
    createChoice({ id: 'snakes', label: 'Snakes', description: 'Quiet exotic pets that need heat, handling, and secure habitats.', kind: 'COMPANION_CATEGORY', statEffects: { reputation: 0.2 }, riskShift: 4, memoryTag: 'pet-category-snakes' }),
    createChoice({ id: 'reptiles', label: 'Reptiles', description: 'Quiet exotic animals with exact habitat needs.', kind: 'COMPANION_CATEGORY', statEffects: { reputation: 0.2 }, riskShift: 3, memoryTag: 'pet-category-reptiles' }),
    createChoice({ id: 'aquarium', label: 'Aquarium', description: 'A calming living display with ongoing water care.', kind: 'COMPANION_CATEGORY', statEffects: { happiness: 0.5, health: 0.2 }, riskShift: 1, memoryTag: 'pet-category-aquarium' }),
    createChoice({ id: 'sanctuary', label: 'Sanctuary', description: 'Ethical sponsorships for protected animals, not private ownership.', kind: 'COMPANION_CATEGORY', flatCost: 20_000, statEffects: { reputation: 1 }, riskShift: 5, memoryTag: 'pet-category-sanctuary' }),
];

const PET_COMPANION_TEMPLATES: PetCompanionProfile[] = [
    {
        id: 'shelter_dog_mochi',
        name: 'Mochi',
        listingTitle: '2-Year Rescue Mix Dog',
        emoji: '🐕',
        species: 'Dog',
        breed: 'Rescue Mix',
        acquisition: 'shelter',
        rarity: 'common',
        personality: 'Warm, goofy, loyal, and easy to bond with.',
        careNeeds: 'Daily walks, vaccines, simple grooming.',
        legalNote: 'Shelter adoption with standard paperwork.',
        baseCost: 1_200,
        costMultiplier: 0.88,
        riskShift: -1,
        bondBase: 60,
        statEffects: { happiness: 3, health: 0.5 },
    },
    {
        id: 'cat_luna',
        name: 'Luna',
        listingTitle: 'Young Domestic Shorthair Cat',
        emoji: '🐈',
        species: 'Cat',
        breed: 'Domestic Shorthair',
        acquisition: 'shelter',
        rarity: 'common',
        personality: 'Independent, affectionate, and camera-curious.',
        careNeeds: 'Litter, food plan, annual vet visit.',
        legalNote: 'Low-risk home companion.',
        baseCost: 900,
        costMultiplier: 0.82,
        riskShift: -2,
        bondBase: 58,
        statEffects: { happiness: 2.5 },
    },
    {
        id: 'pomeranian_puppy_kiki',
        name: 'Kiki',
        listingTitle: '1-Year Pomeranian Puppy',
        emoji: '🐕',
        species: 'Dog',
        breed: 'Pomeranian',
        acquisition: 'breeder',
        rarity: 'premium',
        personality: 'Tiny, fluffy, camera-ready, and attached to routines.',
        careNeeds: 'Grooming, short walks, dental care, and gentle training.',
        legalNote: 'Premium breeder paperwork.',
        baseCost: 8_500,
        costMultiplier: 1.28,
        riskShift: 1,
        bondBase: 62,
        statEffects: { happiness: 3, fame: 0.2 },
    },
    {
        id: 'german_shepherd_pup_bruno',
        name: 'Bruno',
        listingTitle: 'Newborn German Shepherd Pup',
        emoji: '🐕',
        species: 'Dog',
        breed: 'German Shepherd',
        acquisition: 'breeder',
        rarity: 'premium',
        personality: 'Protective, trainable, smart, and demanding early attention.',
        careNeeds: 'Puppy training, vaccines, exercise plan, and secure space.',
        legalNote: 'Premium breeder paperwork.',
        baseCost: 12_000,
        costMultiplier: 1.36,
        riskShift: 2,
        bondBase: 58,
        statEffects: { happiness: 3, health: 0.4, reputation: 0.2 },
    },
    {
        id: 'persian_kitten_nova',
        name: 'Nova',
        listingTitle: '6-Month Persian Kitten',
        emoji: '🐈',
        species: 'Cat',
        breed: 'Persian',
        acquisition: 'breeder',
        rarity: 'premium',
        personality: 'Elegant, quiet, photogenic, and high-maintenance.',
        careNeeds: 'Daily brushing, eye care, and quiet home space.',
        legalNote: 'Premium breeder paperwork.',
        baseCost: 6_200,
        costMultiplier: 1.24,
        riskShift: 1,
        bondBase: 55,
        statEffects: { happiness: 2.4, reputation: 0.2 },
    },
    {
        id: 'rabbit_nori',
        name: 'Nori',
        listingTitle: '8-Month Mini Rex Rabbit',
        emoji: '🐇',
        species: 'Rabbit',
        breed: 'Mini Rex',
        acquisition: 'breeder',
        rarity: 'premium',
        personality: 'Gentle, social, and sensitive to chaos.',
        careNeeds: 'Quiet room, hay diet, specialist vet.',
        legalNote: 'Premium breeder paperwork.',
        baseCost: 3_500,
        costMultiplier: 1.08,
        riskShift: 2,
        bondBase: 52,
        statEffects: { happiness: 2.5, reputation: 0.2 },
    },
    {
        id: 'fancy_mouse_pearl',
        name: 'Pearl',
        listingTitle: 'Fancy Mouse Pair',
        emoji: '🐁',
        species: 'Mouse',
        breed: 'Fancy Mouse',
        acquisition: 'shelter',
        rarity: 'common',
        personality: 'Small, curious, low-drama, and fun to watch.',
        careNeeds: 'Safe enclosure, bedding, chew toys, and gentle handling.',
        legalNote: 'Small-pet adoption paperwork.',
        baseCost: 180,
        costMultiplier: 0.72,
        riskShift: -2,
        bondBase: 48,
        statEffects: { happiness: 1.6 },
    },
    {
        id: 'hamster_milo',
        name: 'Milo',
        listingTitle: 'Golden Hamster Starter Pet',
        emoji: '🐹',
        species: 'Hamster',
        breed: 'Syrian Hamster',
        acquisition: 'breeder',
        rarity: 'common',
        personality: 'Energetic at night, simple to house, and oddly charming.',
        careNeeds: 'Large cage, wheel, bedding, chew toys, and quiet daylight.',
        legalNote: 'Small-pet breeder paperwork.',
        baseCost: 260,
        costMultiplier: 0.76,
        riskShift: -1,
        bondBase: 46,
        statEffects: { happiness: 1.5 },
    },
    {
        id: 'horse_sultan',
        name: 'Sultan',
        listingTitle: 'Trained Andalusian Horse',
        emoji: '🐎',
        species: 'Horse',
        breed: 'Andalusian',
        acquisition: 'breeder',
        rarity: 'premium',
        personality: 'Elegant, expensive, and loyal with training.',
        careNeeds: 'Stable fees, trainer, vet, transport.',
        legalNote: 'Requires stabling and premium care.',
        baseCost: 85_000,
        costMultiplier: 2.4,
        riskShift: 5,
        bondBase: 45,
        statEffects: { happiness: 3, reputation: 0.8, body: 0.5 },
    },
    {
        id: 'macaw_coco',
        name: 'Coco',
        listingTitle: 'Blue-and-Gold Macaw',
        emoji: '🦜',
        species: 'Parrot',
        breed: 'Blue-and-Gold Macaw',
        acquisition: 'exotic',
        rarity: 'exotic',
        personality: 'Loud, brilliant, social, and attention-hungry.',
        careNeeds: 'Aviary, enrichment, avian specialist.',
        legalNote: 'Licensed exotic permit recommended.',
        baseCost: 22_000,
        costMultiplier: 1.65,
        riskShift: 8,
        bondBase: 42,
        statEffects: { happiness: 3, reputation: 0.6 },
    },
    {
        id: 'cockatiel_sunny',
        name: 'Sunny',
        listingTitle: 'Hand-Raised Cockatiel',
        emoji: '🐦',
        species: 'Bird',
        breed: 'Cockatiel',
        acquisition: 'breeder',
        rarity: 'common',
        personality: 'Social, musical, friendly, and easier than a large parrot.',
        careNeeds: 'Cage, enrichment, avian checkups, and daily attention.',
        legalNote: 'Bird breeder paperwork.',
        baseCost: 900,
        costMultiplier: 0.92,
        riskShift: 0,
        bondBase: 54,
        statEffects: { happiness: 2.1 },
    },
    {
        id: 'corn_snake_rusty',
        name: 'Rusty',
        listingTitle: 'Juvenile Corn Snake',
        emoji: '🐍',
        species: 'Snake',
        breed: 'Corn Snake',
        acquisition: 'exotic',
        rarity: 'exotic',
        personality: 'Calm, beautiful, low-noise, and habitat-sensitive.',
        careNeeds: 'Secure enclosure, heat gradient, feeding plan, and reptile vet.',
        legalNote: 'Licensed exotic care recommended.',
        baseCost: 1_500,
        costMultiplier: 1.05,
        riskShift: 4,
        bondBase: 34,
        statEffects: { happiness: 1.8, reputation: 0.2 },
    },
    {
        id: 'ball_python_onyx',
        name: 'Onyx',
        listingTitle: 'Young Ball Python',
        emoji: '🐍',
        species: 'Snake',
        breed: 'Ball Python',
        acquisition: 'exotic',
        rarity: 'exotic',
        personality: 'Quiet, striking, and calm when handled properly.',
        careNeeds: 'Temperature control, hide boxes, feeding schedule, specialist vet.',
        legalNote: 'Licensed exotic care recommended.',
        baseCost: 4_800,
        costMultiplier: 1.18,
        riskShift: 5,
        bondBase: 32,
        statEffects: { happiness: 1.8, reputation: 0.3 },
    },
    {
        id: 'iguana_pixel',
        name: 'Pixel',
        listingTitle: 'Green Iguana',
        emoji: '🦎',
        species: 'Reptile',
        breed: 'Green Iguana',
        acquisition: 'exotic',
        rarity: 'exotic',
        personality: 'Quiet, striking, and care-sensitive.',
        careNeeds: 'Heat, humidity, enclosure, specialist vet.',
        legalNote: 'Licensed exotic care required.',
        baseCost: 12_000,
        costMultiplier: 1.35,
        riskShift: 9,
        bondBase: 35,
        statEffects: { happiness: 2, reputation: 0.4 },
    },
    {
        id: 'panda_sanctuary_bao',
        name: 'Bao',
        listingTitle: 'Giant Panda Sanctuary Sponsorship',
        emoji: '🐼',
        species: 'Panda',
        breed: 'Giant Panda',
        acquisition: 'endangered',
        rarity: 'endangered',
        personality: 'A conservation symbol, not a private pet.',
        careNeeds: 'Sanctuary sponsorship and habitat support.',
        legalNote: 'Ethical sponsorship only; no private ownership.',
        baseCost: 250_000,
        costMultiplier: 3.6,
        riskShift: 12,
        bondBase: 30,
        statEffects: { reputation: 2.5, happiness: 1.5 },
    },
    {
        id: 'tiger_sanctuary_raja',
        name: 'Raja',
        listingTitle: 'Bengal Tiger Sanctuary Sponsorship',
        emoji: '🐅',
        species: 'Tiger',
        breed: 'Bengal Tiger',
        acquisition: 'endangered',
        rarity: 'endangered',
        personality: 'A sanctuary sponsorship with serious public scrutiny.',
        careNeeds: 'Accredited sanctuary, keepers, vet fund.',
        legalNote: 'Conservation sponsorship only.',
        baseCost: 310_000,
        costMultiplier: 4.1,
        riskShift: 18,
        bondBase: 22,
        statEffects: { reputation: 2, fame: 0.5 },
    },
    {
        id: 'sea_turtle_kai',
        name: 'Kai',
        listingTitle: 'Green Sea Turtle Sponsorship',
        emoji: '🐢',
        species: 'Sea Turtle',
        breed: 'Green Sea Turtle',
        acquisition: 'endangered',
        rarity: 'endangered',
        personality: 'A long-running conservation adoption.',
        careNeeds: 'Nest protection and rescue center sponsorship.',
        legalNote: 'Conservation sponsorship only.',
        baseCost: 55_000,
        costMultiplier: 2.1,
        riskShift: 4,
        bondBase: 38,
        statEffects: { reputation: 1.5, happiness: 1 },
    },
    {
        id: 'reef_aquarium_river',
        name: 'River',
        listingTitle: 'Reef Aquarium Habitat',
        emoji: '🐠',
        species: 'Aquarium',
        breed: 'Reef Habitat',
        acquisition: 'exotic',
        rarity: 'exotic',
        personality: 'Beautiful, calming, and expensive to maintain.',
        careNeeds: 'Tank system, water care, marine specialist.',
        legalNote: 'Ethical sourcing certification recommended.',
        baseCost: 35_000,
        costMultiplier: 1.9,
        riskShift: 6,
        bondBase: 40,
        statEffects: { happiness: 2.5, health: 0.4 },
    },
];

const petNames = ['Mochi', 'Luna', 'Pixel', 'Sultan', 'Coco', 'River', 'Atlas', 'Nori', 'Kiki', 'Bruno', 'Milo', 'Bao', 'Kai', 'Raja', 'Nova'];

export const getPetCompanionPoolCycle = (player?: LifestyleActivityPlayerContext | null): number => {
    const absoluteWeek = getAbsoluteWeek(Number(player?.age || 18), Number(player?.currentWeek || 1));
    return Math.floor(absoluteWeek / PET_COMPANION_POOL_REFRESH_WEEKS);
};

const getPetCompanionCategoryId = (profile: Pick<PetCompanionProfile, 'species' | 'acquisition'>): string => {
    if (profile.acquisition === 'endangered') return 'sanctuary';
    const species = profile.species.toLowerCase();
    if (species.includes('dog')) return 'dogs';
    if (species.includes('cat')) return 'cats';
    if (species.includes('rabbit')) return 'rabbits';
    if (species.includes('mouse') || species.includes('hamster')) return 'rodents';
    if (species.includes('horse')) return 'horses';
    if (species.includes('parrot') || species.includes('bird')) return 'birds';
    if (species.includes('snake')) return 'snakes';
    if (species.includes('reptile') || species.includes('iguana')) return 'reptiles';
    if (species.includes('aquarium')) return 'aquarium';
    return 'rodents';
};

export const getPetCompanionStore = (id?: string): PetCompanionStore => (
    PET_COMPANION_STORES.find(store => store.id === id) || PET_COMPANION_STORES[0]
);

export const getPetCompanionCategoryOptions = (storeId?: string): LifestyleActivityChoice[] => {
    const store = getPetCompanionStore(storeId);
    return COMPANION_CATEGORY_OPTIONS.filter(option => store.categoryIds.includes(option.id));
};

const petStoreToChoice = (store: PetCompanionStore): LifestyleActivityChoice => createChoice({
    id: store.id,
    label: store.name,
    description: store.description,
    kind: 'COMPANION_STORE',
    riskShift: store.riskShift,
    memoryTag: `pet-store-${store.id}`,
});

const buildGeneratedPetProfile = (player: LifestyleActivityPlayerContext | null | undefined, cycle: number, slot: number): PetCompanionProfile => {
    const seedBase = `${player?.id || player?.name || 'player'}_${cycle}_${slot}_pet_pool`;
    const template = PET_COMPANION_TEMPLATES[Math.floor(stableRoll(`${seedBase}_template`) * PET_COMPANION_TEMPLATES.length)] || PET_COMPANION_TEMPLATES[0];
    const name = petNames[Math.floor(stableRoll(`${seedBase}_name`) * petNames.length)] || template.name;
    const costShift = 0.9 + stableRoll(`${seedBase}_cost`) * 0.24;
    const riskShift = Math.round(template.riskShift + (stableRoll(`${seedBase}_risk`) - 0.5) * 4);
    return {
        ...template,
        id: `pool_${cycle}_${slot}_${template.species}_${name}`.replace(/\s+/g, '_').toLowerCase(),
        name,
        listingTitle: template.listingTitle,
        baseCost: roundCost(template.baseCost * costShift),
        costMultiplier: Math.max(0.78, Number((template.costMultiplier + (stableRoll(`${seedBase}_mult`) - 0.5) * 0.16).toFixed(2))),
        riskShift,
        bondBase: clamp(template.bondBase + Math.round((stableRoll(`${seedBase}_bond`) - 0.5) * 10), 18, 76),
        statEffects: { ...template.statEffects },
    };
};

const petProfileToChoice = (profile: PetCompanionProfile): LifestyleActivityChoice => createChoice({
    id: profile.id,
    label: profile.listingTitle || profile.name,
    description: `${profile.emoji} ${profile.breed} ${profile.species} - ${profile.personality}`,
    kind: 'COMPANION_PET',
    flatCost: profile.baseCost,
    costMultiplier: profile.costMultiplier,
    riskShift: profile.riskShift,
    statEffects: profile.statEffects,
    memoryTag: `pet-${profile.id}`,
});

export const getAvailablePetCompanionProfiles = (player?: LifestyleActivityPlayerContext | null): PetCompanionProfile[] => {
    if (!player) return PET_COMPANION_TEMPLATES.slice(0, 5);
    const cycle = getPetCompanionPoolCycle(player);
    const count = stableRoll(`${player.id || player.name || 'player'}_${cycle}_pet_pool_count`) > 0.45 ? 5 : 4;
    return Array.from({ length: count }, (_, index) => buildGeneratedPetProfile(player, cycle, index));
};

export const getFilteredPetCompanionProfiles = (
    player?: LifestyleActivityPlayerContext | null,
    storeId?: string,
    categoryId?: string,
): PetCompanionProfile[] => {
    const store = getPetCompanionStore(storeId);
    const categoryOptions = getPetCompanionCategoryOptions(store.id);
    const safeCategoryId = categoryOptions.some(option => option.id === categoryId) ? categoryId : categoryOptions[0]?.id;
    const pool = [...getAvailablePetCompanionProfiles(player), ...PET_COMPANION_TEMPLATES];
    const seen = new Set<string>();
    return pool.filter(profile => {
        if (seen.has(profile.id)) return false;
        seen.add(profile.id);
        return store.acquisitionKinds.includes(profile.acquisition)
            && (!safeCategoryId || getPetCompanionCategoryId(profile) === safeCategoryId);
    });
};

export const getPetCompanionProfile = (id?: string, player?: LifestyleActivityPlayerContext | null): PetCompanionProfile | undefined => (
    getAvailablePetCompanionProfiles(player).find(profile => profile.id === id)
    || PET_COMPANION_TEMPLATES.find(profile => profile.id === id)
);

export const getAvailablePetCompanionOptions = (
    player?: LifestyleActivityPlayerContext | null,
    storeId?: string,
    categoryId?: string,
): LifestyleActivityChoice[] => (
    getFilteredPetCompanionProfiles(player, storeId, categoryId).map(petProfileToChoice)
);

export const COMPANION_STORE_OPTIONS: LifestyleActivityChoice[] = PET_COMPANION_STORES.map(petStoreToChoice);

export const COMPANION_CARE_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'basic_care', label: 'Basic Care', description: 'Food, bedding, and routine appointment.', kind: 'COMPANION_CARE', flatCost: 250, costMultiplier: 0.85, statEffects: { happiness: 0.5 }, riskShift: 4, memoryTag: 'basic-care' }),
    createChoice({ id: 'premium_care', label: 'Premium Care', description: 'Better supplies, wellness plan, and grooming.', kind: 'COMPANION_CARE', flatCost: 1_400, costMultiplier: 1.05, statEffects: { happiness: 1.2, health: 0.3 }, riskShift: -2, memoryTag: 'premium-care' }),
    createChoice({ id: 'concierge_vet', label: 'Concierge Vet', description: 'Specialist follow-up and high-trust care.', kind: 'COMPANION_CARE', flatCost: 7_000, costMultiplier: 1.25, statEffects: { happiness: 1.8, health: 0.8, reputation: 0.2 }, riskShift: -6, memoryTag: 'concierge-vet' }),
    createChoice({ id: 'sanctuary_team', label: 'Sanctuary Team', description: 'Dedicated handlers for exotic or protected animals.', kind: 'COMPANION_CARE', flatCost: 20_000, costMultiplier: 1.55, statEffects: { reputation: 0.8, happiness: 1 }, riskShift: -8, memoryTag: 'sanctuary-team' }),
];

export const COMPANION_PERMIT_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'standard_papers', label: 'Standard Papers', description: 'Normal adoption or breeder documents.', kind: 'COMPANION_PERMIT', flatCost: 150, riskShift: 0, memoryTag: 'standard-papers' }),
    createChoice({ id: 'licensed_exotic_care', label: 'Licensed Exotic Care', description: 'Permits, habitat checks, and specialist compliance.', kind: 'COMPANION_PERMIT', flatCost: 15_000, costMultiplier: 1.15, statEffects: { reputation: 0.4 }, riskShift: -7, memoryTag: 'licensed-exotic' }),
    createChoice({ id: 'sanctuary_sponsorship', label: 'Sanctuary Sponsorship', description: 'Ethical conservation support with accredited staff.', kind: 'COMPANION_PERMIT', flatCost: 25_000, costMultiplier: 1.35, statEffects: { reputation: 1.1 }, riskShift: -8, memoryTag: 'sanctuary-sponsorship' }),
];

export const getCompanionCareOptionsForPet = (profile?: Pick<PetCompanionProfile, 'acquisition' | 'rarity'>): LifestyleActivityChoice[] => (
    COMPANION_CARE_OPTIONS.filter(option => {
        if (option.id === 'sanctuary_team') return profile?.acquisition === 'endangered' || profile?.acquisition === 'exotic';
        return true;
    })
);

export const getCompanionPermitOptionsForPet = (profile?: Pick<PetCompanionProfile, 'acquisition' | 'rarity'>): LifestyleActivityChoice[] => (
    COMPANION_PERMIT_OPTIONS.filter(option => {
        if (option.id === 'sanctuary_sponsorship') return profile?.acquisition === 'endangered';
        if (option.id === 'licensed_exotic_care') return profile?.acquisition === 'exotic' || profile?.acquisition === 'endangered';
        return true;
    })
);

export const COMPANION_HOME_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'starter_home', label: 'Starter Home Kit', description: 'Bed, bowls, litter or basic enclosure.', kind: 'COMPANION_HOME', flatCost: 700, costMultiplier: 0.92, statEffects: { happiness: 0.4 }, riskShift: 3, memoryTag: 'pet-home-starter' }),
    createChoice({ id: 'comfort_den', label: 'Comfort Den', description: 'Better bed, safe zone, trainer-approved setup.', kind: 'COMPANION_HOME', flatCost: 3_500, statEffects: { happiness: 1, health: 0.2 }, riskShift: -2, memoryTag: 'pet-home-comfort' }),
    createChoice({ id: 'designer_habitat', label: 'Designer Habitat', description: 'Custom room, stable, aviary, tank, or climate habitat.', kind: 'COMPANION_HOME', flatCost: 18_000, costMultiplier: 1.18, statEffects: { happiness: 1.7, reputation: 0.4 }, riskShift: -5, memoryTag: 'pet-home-designer' }),
    createChoice({ id: 'estate_wing', label: 'Estate Pet Wing', description: 'Dedicated staff-ready space for high-maintenance companions.', kind: 'COMPANION_HOME', flatCost: 85_000, costMultiplier: 1.42, statEffects: { happiness: 2.5, reputation: 0.8 }, riskShift: -8, memoryTag: 'pet-home-estate' }),
];

export const COMPANION_ACCESSORY_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'simple_accessories', label: 'Simple Accessories', description: 'Collar, tags, toys, and grooming basics.', kind: 'COMPANION_ACCESSORY', flatCost: 250, statEffects: { happiness: 0.3 }, riskShift: 0, memoryTag: 'pet-accessory-simple' }),
    createChoice({ id: 'premium_accessories', label: 'Premium Accessories', description: 'Soft harness, enrichment toys, premium grooming kit.', kind: 'COMPANION_ACCESSORY', flatCost: 1_800, statEffects: { happiness: 0.8 }, riskShift: -1, memoryTag: 'pet-accessory-premium' }),
    createChoice({ id: 'designer_collar', label: 'Designer Collar', description: 'Luxury collar, tasteful tags, and paparazzi-safe styling.', kind: 'COMPANION_ACCESSORY', flatCost: 9_000, statEffects: { happiness: 0.8, reputation: 0.3 }, riskShift: 1, memoryTag: 'pet-accessory-designer' }),
    createChoice({ id: 'gold_collar', label: 'Gold-Made Collar', description: 'Custom gold collar or exhibit-grade signature accessory.', kind: 'COMPANION_ACCESSORY', flatCost: 45_000, costMultiplier: 1.12, statEffects: { fame: 0.5, reputation: 0.4 }, riskShift: 4, memoryTag: 'pet-accessory-gold' }),
];

export const COMPANION_CUSTOMIZATION_OPTIONS: LifestyleActivityChoice[] = [
    createChoice({ id: 'no_custom', label: 'Clean Setup', description: 'No extra customization, practical and quiet.', kind: 'COMPANION_CUSTOMIZATION', costMultiplier: 0.95, riskShift: -1, memoryTag: 'pet-custom-clean' }),
    createChoice({ id: 'color_theme', label: 'Color Theme', description: 'Match bedding, tags, and accessories to your home style.', kind: 'COMPANION_CUSTOMIZATION', flatCost: 2_500, statEffects: { happiness: 0.4 }, riskShift: 0, memoryTag: 'pet-custom-color' }),
    createChoice({ id: 'celebrity_styling', label: 'Celebrity Styling', description: 'Photo-ready grooming, stylist consult, and public reveal plan.', kind: 'COMPANION_CUSTOMIZATION', flatCost: 12_000, statEffects: { fame: 0.4, reputation: 0.2 }, riskShift: 2, memoryTag: 'pet-custom-celebrity' }),
    createChoice({ id: 'bespoke_luxury', label: 'Bespoke Luxury', description: 'Handmade habitat details, gold accents, and concierge setup.', kind: 'COMPANION_CUSTOMIZATION', flatCost: 60_000, costMultiplier: 1.18, statEffects: { fame: 0.7, reputation: 0.5 }, riskShift: 4, memoryTag: 'pet-custom-bespoke' }),
];

export const LIFESTYLE_ACTIVITY_CATALOG: LifestyleActivityDefinition[] = [
    {
        id: 'vacation_escape',
        category: 'TRAVEL',
        name: 'Plan a Trip',
        shortDescription: 'Destination, stay, travel mode, and activities.',
        longDescription: 'Build a proper vacation instead of a one-click money sink. Cheap trips still help mood; luxury trips become lifelong memories.',
        baseCost: 8_000,
        baseRisk: 9,
        baseEffects: { happiness: 4, health: 1, experience: 1 },
        cooldownWeeks: 1,
        recommendedWhen: 'Best when mood is low or you just wrapped a stressful project.',
        scales: scaleOptions,
        privacyOptions,
        inviteOptions,
        durationOptions,
        extras: [
            createChoice({ id: 'local_guides', label: 'Local Guides', description: 'Better food, safer schedule, richer memory.', kind: 'EXTRA', flatCost: 2_500, statEffects: { happiness: 1, experience: 1 }, riskShift: -1 }),
            createChoice({ id: 'private_flight', label: 'Private Flight', description: 'Comfort and privacy, but huge visible spend.', kind: 'EXTRA', flatCost: 45_000, statEffects: { reputation: 1, happiness: 1 }, riskShift: 3 }),
            createChoice({ id: 'documented_album', label: 'Memory Album', description: 'A curated record for your legacy page later.', kind: 'EXTRA', flatCost: 4_000, statEffects: { happiness: 1 }, riskShift: 0 }),
        ],
    },
    {
        id: 'nightlife_takeover',
        category: 'NIGHTLIFE',
        name: 'Nightlife Run',
        shortDescription: 'Clubs, guest lists, after-parties, and image risk.',
        longDescription: 'Spend for social heat, but keep it under control. Public nightlife can help fame and still create scandal risk.',
        baseCost: 2_500,
        baseRisk: 24,
        baseEffects: { happiness: 3, fame: 0.5, followers: 500 },
        cooldownWeeks: 4,
        recommendedWhen: 'Best when you want buzz, not stability.',
        scales: scaleOptions,
        privacyOptions,
        inviteOptions,
        durationOptions: durationOptions.slice(0, 2),
        extras: [
            createChoice({ id: 'vip_room', label: 'VIP Room', description: 'Privacy with better service.', kind: 'EXTRA', flatCost: 6_000, statEffects: { happiness: 1, reputation: 0.5 }, riskShift: -2 }),
            createChoice({ id: 'security_detail', label: 'Security Detail', description: 'Less chaos around cameras and crowds.', kind: 'EXTRA', flatCost: 4_500, statEffects: { reputation: 0.5 }, riskShift: -5 }),
            createChoice({ id: 'press_walkthrough', label: 'Press Walkthrough', description: 'Let the night become a controlled social moment.', kind: 'EXTRA', flatCost: 3_500, statEffects: { fame: 1, followers: 1200 }, riskShift: 4 }),
        ],
    },
    {
        id: 'wellness_reset',
        category: 'WELLNESS',
        name: 'Health Clinic',
        shortDescription: 'Treat illness, burnout, sleep, injuries, and looks care.',
        longDescription: 'Use this when your actor needs actual care: checkups, illness treatment, rehab, sleep help, or camera-ready medical polish.',
        baseCost: 1_800,
        baseRisk: 5,
        baseEffects: { health: 4, happiness: 2, body: 0.5 },
        cooldownWeeks: 3,
        recommendedWhen: 'Best when health is sliding, pressure is building, or a role needs camera-ready upkeep.',
        scales: scaleOptions.slice(0, 3),
        privacyOptions: privacyOptions.slice(0, 3),
        inviteOptions: inviteOptions.slice(0, 3),
        durationOptions,
        extras: [
            createChoice({ id: 'nutritionist', label: 'Nutritionist', description: 'Better recovery and body upkeep.', kind: 'EXTRA', flatCost: 1_500, statEffects: { health: 1.5, body: 1 }, riskShift: -1 }),
            createChoice({ id: 'mindfulness_coach', label: 'Mind Coach', description: 'Calmer weeks ahead.', kind: 'EXTRA', flatCost: 2_200, statEffects: { happiness: 1.5, reputation: 0.25 }, riskShift: -1 }),
            createChoice({ id: 'medical_report', label: 'Medical Report', description: 'A private report that helps prevent future scares.', kind: 'EXTRA', flatCost: 4_000, statEffects: { health: 1 }, riskShift: -3 }),
        ],
    },
    {
        id: 'industry_dinner',
        category: 'IMAGE',
        name: 'Industry Connections',
        shortDescription: 'Host industry rooms where useful relationships form naturally.',
        longDescription: 'Build an expensive industry room without forcing a goal. Directors, producers, actors, and reps may show up, become Connections, or trigger unexpected casting follow-ups later.',
        baseCost: 35_000,
        baseRisk: 16,
        baseEffects: { reputation: 2.5, fame: 0.7, happiness: 1 },
        cooldownWeeks: 6,
        recommendedWhen: 'Best before awards season, after a hit, or when you can afford a serious room.',
        scales: scaleOptions.slice(1),
        privacyOptions,
        inviteOptions: inviteOptions.slice(2),
        durationOptions: durationOptions.slice(0, 1),
        extras: INDUSTRY_ADDON_OPTIONS,
    },
    {
        id: 'adoption_center',
        category: 'FAMILY',
        name: 'Adoption Center',
        shortDescription: 'Apply, prepare your home, and welcome a child.',
        longDescription: 'Adoption is the family gateway. Once approved, the child joins Connections as a normal child relationship; child activities happen there.',
        baseCost: 14_000,
        baseRisk: 16,
        baseEffects: { happiness: 2, reputation: 0.5 },
        cooldownWeeks: 26,
        recommendedWhen: 'Best when you want to grow your family and can support the child long term.',
        scales: scaleOptions.slice(0, 3),
        privacyOptions: privacyOptions.slice(0, 2),
        inviteOptions: inviteOptions.filter(option => ['solo', 'partner', 'family'].includes(option.id)),
        durationOptions: durationOptions.slice(0, 2),
        extras: [],
    },
    {
        id: 'charity_gala',
        category: 'LEGACY',
        name: 'Charity Gala',
        shortDescription: 'Cause, guest list, press posture, and donation level.',
        longDescription: 'Plan a serious cause event: choose what you support, how public the night is, how much money actually moves, and whether the world sees legacy or performance.',
        baseCost: 45_000,
        baseRisk: 16,
        baseEffects: { reputation: 3, fame: 0.8, happiness: 1 },
        cooldownWeeks: 12,
        recommendedWhen: 'Best once you have real cash and a public image worth shaping.',
        scales: scaleOptions,
        privacyOptions: privacyOptions.slice(1),
        inviteOptions: inviteOptions.slice(2),
        durationOptions: durationOptions.slice(0, 1),
        extras: [],
    },
    {
        id: 'companion_day',
        category: 'COMPANION',
        name: 'Pet Companion Center',
        shortDescription: 'Adopt, buy, or sponsor a companion.',
        longDescription: 'Find a shelter pet, premium breed, licensed exotic companion, or ethical conservation sponsorship. Once welcomed, pets live in Connections with their own care actions.',
        baseCost: 900,
        baseRisk: 6,
        baseEffects: { happiness: 3, health: 0.5 },
        cooldownWeeks: 3,
        recommendedWhen: 'Best after intense filming, bad reviews, or lonely weeks.',
        scales: scaleOptions.slice(0, 3),
        privacyOptions: privacyOptions.slice(0, 2),
        inviteOptions: inviteOptions.filter(option => ['solo', 'family'].includes(option.id)),
        durationOptions: durationOptions.slice(0, 2),
        extras: [],
    },
];

export const getDefaultLifestyleActivityState = (): LifestyleActivityState => ({
    memories: [],
    cooldowns: {},
    totalSpent: 0,
    lifetimeActivityCounts: {},
    lifetimeCategoryCounts: {},
    lifetimeTripDays: 0,
    lifetimeCharityGiven: 0,
    lifetimeFriendEncounters: 0,
});

export const ensureLifestyleActivityState = (state?: Partial<LifestyleActivityState> | null): LifestyleActivityState => {
    const source = state && typeof state === 'object' ? state : {};
    const cooldowns = source.cooldowns && typeof source.cooldowns === 'object'
        ? Object.entries(source.cooldowns).reduce<Record<string, number>>((acc, [key, value]) => {
            const week = Math.max(0, Math.round(Number(value) || 0));
            if (key && week > 0) acc[key] = week;
            return acc;
        }, {})
        : {};

    const memories = Array.isArray(source.memories)
        ? source.memories
            .filter(memory => memory && typeof memory === 'object')
            .map((memory, index) => ({
                ...memory,
                id: String(memory.id || `life_memory_${index}`),
                activityId: String(memory.activityId || 'unknown_activity'),
                title: String(memory.title || 'Life Experience'),
                summary: String(memory.summary || 'A personal life memory.'),
                category: (memory.category || 'WELLNESS') as LifestyleActivityCategory,
                cost: clampMoney(Number(memory.cost || 0)),
                risk: clamp(Number(memory.risk || 0)),
                year: Math.max(1, Math.round(Number(memory.year || 18))),
                week: Math.max(1, Math.min(52, Math.round(Number(memory.week || 1)))),
                createdAbsoluteWeek: Math.max(0, Math.round(Number(memory.createdAbsoluteWeek || 0))),
                selections: memory.selections || { scaleId: 'premium', privacyId: 'private', inviteId: 'solo', durationId: 'one_day', extraIds: [] },
                effectSummary: Array.isArray(memory.effectSummary) ? memory.effectSummary.map(String).slice(0, 6) : [],
            }))
            .slice(0, 40)
        : [];

    return {
        memories,
        cooldowns,
        totalSpent: clampMoney(Number(source.totalSpent || memories.reduce((sum, memory) => sum + memory.cost, 0))),
        lifetimeActivityCounts: source.lifetimeActivityCounts && typeof source.lifetimeActivityCounts === 'object'
            ? Object.entries(source.lifetimeActivityCounts).reduce<Record<string, number>>((acc, [key, value]) => {
                acc[key] = Math.max(0, Math.round(Number(value) || 0));
                return acc;
            }, {})
            : {},
        lifetimeCategoryCounts: source.lifetimeCategoryCounts && typeof source.lifetimeCategoryCounts === 'object'
            ? Object.entries(source.lifetimeCategoryCounts).reduce<Partial<Record<LifestyleActivityCategory, number>>>((acc, [key, value]) => {
                acc[key as LifestyleActivityCategory] = Math.max(0, Math.round(Number(value) || 0));
                return acc;
            }, {})
            : {},
        lifetimeTripDays: Math.max(0, Math.round(Number(source.lifetimeTripDays || 0))),
        lifetimeCharityGiven: clampMoney(Number(source.lifetimeCharityGiven || 0)),
        lifetimeFriendEncounters: Math.max(0, Math.round(Number(source.lifetimeFriendEncounters || 0))),
        lifestyleIdentity: source.lifestyleIdentity ? String(source.lifestyleIdentity) : undefined,
        lastActivityWeek: source.lastActivityWeek === undefined ? undefined : Math.max(0, Math.round(Number(source.lastActivityWeek || 0))),
    };
};

export const createDefaultLifestyleActivitySelections = (activity: LifestyleActivityDefinition): LifestyleActivitySelections => ({
    scaleId: activity.scales[1]?.id || activity.scales[0]?.id || 'premium',
    privacyId: activity.privacyOptions[0]?.id || 'private',
    inviteId: activity.inviteOptions[0]?.id || 'solo',
    durationId: activity.durationOptions[0]?.id || 'one_day',
    extraIds: [],
    ...(activity.id === 'vacation_escape' ? {
        tripDestinationId: 'usa',
        tripCityId: 'los_angeles',
        tripDurationDays: 7,
        tripStayId: 'boutique_hotel',
        tripTravelId: 'business_class',
        tripActivityIds: ['food_tour'],
    } : {}),
    ...(activity.id === 'nightlife_takeover' ? {
        nightlifeTypeId: 'club_takeover',
        nightlifeVenueId: 'members_lounge',
        nightlifeGuestId: 'rising_actor',
        nightlifeCrowdId: 'industry_room',
        nightlifeControlId: 'soft_pr',
    } : {}),
    ...(activity.category === 'WELLNESS' ? {
        wellnessProgramId: 'regular_checkup',
        wellnessProviderId: 'private_doctor',
        wellnessFocusId: 'full_diagnosis',
        wellnessSupportId: 'followup_visit',
    } : {}),
    ...(activity.id === 'adoption_center' ? {
        adoptionChildId: ADOPTION_CHILD_PROFILES[0]?.id || 'maya_reed',
        adoptionRouteId: 'local_agency',
        adoptionHomePrepId: 'prepared_home',
        adoptionSupportId: 'family_counseling',
        adoptionTitle: 'Child' as const,
    } : {}),
    ...(activity.id === 'industry_dinner' ? {
        industryEventId: 'industry_dinner',
        industryVenueId: 'private_room',
        industryInviteGroupIds: ['directors', 'producers'],
        industryGuestIds: [],
        industryHostingStyleId: 'tasteful_professional',
        industryServiceId: 'chef_table',
        industryAddonIds: ['director_table'],
    } : {}),
    ...(activity.id === 'charity_gala' ? {
        charityCauseId: 'college_scholarships',
        charityFormatId: 'museum_benefit',
        charityDonationId: 'major_grant',
        charityGuestCircleId: 'private_donors',
        charityPressId: 'controlled_press',
    } : {}),
    ...(activity.id === 'companion_day' ? {
        companionStoreId: 'shelter_rescue',
        companionCategoryId: 'dogs',
        companionPetId: PET_COMPANION_TEMPLATES[0]?.id || 'shelter_dog_mochi',
        companionCareId: 'premium_care',
        companionHomeId: 'comfort_den',
        companionAccessoryId: 'premium_accessories',
        companionCustomizationId: 'color_theme',
        companionPermitId: 'standard_papers',
    } : {}),
});

const findChoice = (choices: LifestyleActivityChoice[], id: string | undefined, fallbackIndex = 0) => (
    choices.find(choice => choice.id === id) || choices[fallbackIndex] || choices[0]
);

export const getAvailableInviteOptions = (
    activity: LifestyleActivityDefinition,
    player?: LifestyleActivityPlayerContext | null,
): LifestyleActivityChoice[] => {
    const relationships = player?.relationships || [];
    const hasPartner = relationships.some(relationship => ['Partner', 'Spouse'].includes(relationship.relation));
    const hasFamily = relationships.some(relationship => ['Parent', 'Sibling', 'Child', 'Spouse'].includes(relationship.relation));
    const hasFriends = relationships.some(relationship => relationship.relation === 'Friend');
    const hasIndustry = relationships.some(relationship => ['Connection', 'Agent', 'Director', 'Manager', 'Colleague', 'Networking'].includes(relationship.relation));
    const available = activity.inviteOptions.filter(option => {
        if (option.id === 'partner') return hasPartner;
        if (option.id === 'family') return hasFamily;
        if (option.id === 'friends') return hasFriends;
        if (option.id === 'industry') return hasIndustry;
        return true;
    });
    return available.length ? available : activity.inviteOptions.filter(option => option.id === 'solo').slice(0, 1);
};

const getCharityDonationChoice = (selections: LifestyleActivitySelections): LifestyleActivityChoice => {
    const customAmount = Math.round(Number(selections.charityCustomDonationAmount || 0));
    if (customAmount > 0) {
        return createChoice({
            id: 'custom_donation',
            label: 'Custom Donation',
            description: `Direct donation chosen by you: ${formatServiceMoney(customAmount)}.`,
            kind: 'CHARITY_DONATION',
            flatCost: customAmount,
            statEffects: {
                reputation: clamp(customAmount / 300_000, 0.4, 7),
                happiness: clamp(customAmount / 1_200_000, 0.2, 2),
                fame: customAmount >= 1_000_000 ? clamp(customAmount / 4_000_000, 0.2, 1.5) : 0,
                followers: customAmount >= 500_000 ? Math.round(Math.min(5000, customAmount / 450)) : 0,
            },
            riskShift: customAmount >= 3_000_000 ? -2 : customAmount >= 1_000_000 ? -1 : -2,
            memoryTag: 'custom-donation',
        });
    }
    return findChoice(CHARITY_DONATION_OPTIONS, selections.charityDonationId, 1);
};

const getSelectedChoices = (
    activity: LifestyleActivityDefinition,
    selections: LifestyleActivitySelections,
    player?: LifestyleActivityPlayerContext | null,
): LifestyleActivityChoice[] => {
    const scale = findChoice(activity.scales, selections.scaleId, 1);
    const privacy = findChoice(activity.privacyOptions, selections.privacyId);
    const invite = findChoice(getAvailableInviteOptions(activity, player), selections.inviteId);
    const duration = findChoice(activity.durationOptions, selections.durationId);
    const extras = (activity.extras || []).filter(extra => selections.extraIds.includes(extra.id));
    if (activity.id === 'vacation_escape') {
        const country = findChoice(TRIP_DESTINATION_OPTIONS, selections.tripDestinationId, 0);
        const city = findChoice(getTripCityOptions(country?.id), selections.tripCityId, 0);
        const tripDuration = createTripDurationChoice(selections.tripDurationDays);
        const travel = findChoice(getAvailableTripTravelModes(player), selections.tripTravelId, 1);
        const selectedActivityIds = new Set(selections.tripActivityIds || []);
        const tripActivities = getTripActivityOptions(country?.id, city?.id)
            .filter(option => selectedActivityIds.has(option.id));
        const tripChoices = [
            country,
            city,
            tripDuration,
            findChoice(TRIP_STAY_OPTIONS, selections.tripStayId, 1),
            travel,
            ...tripActivities,
        ];
        return [privacy, invite, duration, ...tripChoices, ...extras].filter(Boolean);
    }
    if (activity.id === 'nightlife_takeover') {
        return [
            findChoice(NIGHTLIFE_TYPE_OPTIONS, selections.nightlifeTypeId, 0),
            findChoice(getAvailableNightlifeVenueOptions(player, selections.nightlifeTypeId), selections.nightlifeVenueId, 0),
            getNightlifeGuestChoice(player, selections.nightlifeGuestId),
            findChoice(NIGHTLIFE_CROWD_OPTIONS, selections.nightlifeCrowdId, 1),
            findChoice(NIGHTLIFE_CONTROL_OPTIONS, selections.nightlifeControlId, 1),
            privacy,
            duration,
            ...extras,
        ].filter(Boolean);
    }
    if (activity.category === 'WELLNESS') {
        return [
            findChoice(WELLNESS_PROGRAM_OPTIONS, selections.wellnessProgramId, 0),
            findChoice(WELLNESS_PROVIDER_OPTIONS, selections.wellnessProviderId, 1),
            findChoice(WELLNESS_FOCUS_OPTIONS, selections.wellnessFocusId, 1),
            findChoice(WELLNESS_SUPPORT_OPTIONS, selections.wellnessSupportId, 1),
            ...extras,
        ].filter(Boolean);
    }
    if (activity.id === 'adoption_center') {
        const adoptionChildOptions = getAvailableAdoptionChildOptions(player);
        return [
            findChoice(adoptionChildOptions, selections.adoptionChildId, 0),
            findChoice(ADOPTION_ROUTE_OPTIONS, selections.adoptionRouteId, 0),
            findChoice(ADOPTION_HOME_PREP_OPTIONS, selections.adoptionHomePrepId, 1),
            findChoice(ADOPTION_SUPPORT_OPTIONS, selections.adoptionSupportId, 1),
            privacy,
            invite,
        ].filter(Boolean);
    }
    if (activity.id === 'industry_dinner') {
        const selectedGroupIds = new Set(selections.industryInviteGroupIds || []);
        const selectedGuestIds = selections.industryGuestIds || [];
        const industryGuests = getAvailableIndustryGuestOptions(player, '', selectedGuestIds)
            .filter(choice => selectedGuestIds.includes(choice.id));
        const industryAddons = INDUSTRY_ADDON_OPTIONS.filter(option => (selections.industryAddonIds || []).includes(option.id));
        return [
            findChoice(INDUSTRY_EVENT_OPTIONS, selections.industryEventId, 0),
            findChoice(INDUSTRY_VENUE_OPTIONS, selections.industryVenueId, 0),
            ...INDUSTRY_INVITE_GROUP_OPTIONS.filter(option => selectedGroupIds.has(option.id)),
            ...industryGuests,
            findChoice(INDUSTRY_HOSTING_STYLE_OPTIONS, selections.industryHostingStyleId, 0),
            findChoice(INDUSTRY_SERVICE_OPTIONS, selections.industryServiceId, 1),
            ...industryAddons,
        ].filter(Boolean);
    }
    if (activity.id === 'charity_gala') {
        return [
            findChoice(CHARITY_CAUSE_OPTIONS, selections.charityCauseId, 2),
            findChoice(CHARITY_FORMAT_OPTIONS, selections.charityFormatId, 1),
            getCharityDonationChoice(selections),
            findChoice(CHARITY_GUEST_CIRCLE_OPTIONS, selections.charityGuestCircleId, 0),
            findChoice(CHARITY_PRESS_OPTIONS, selections.charityPressId, 1),
        ].filter(Boolean);
    }
    if (activity.id === 'companion_day') {
        const store = findChoice(COMPANION_STORE_OPTIONS, selections.companionStoreId, 0);
        const categoryOptions = getPetCompanionCategoryOptions(store?.id);
        const category = findChoice(categoryOptions, selections.companionCategoryId, 0);
        const petOptions = getAvailablePetCompanionOptions(player, store?.id, category?.id);
        const selectedPet = getPetCompanionProfile(selections.companionPetId, player)
            || getFilteredPetCompanionProfiles(player, store?.id, category?.id)[0];
        const careChoices = getCompanionCareOptionsForPet(selectedPet);
        const permitChoices = getCompanionPermitOptionsForPet(selectedPet);
        return [
            store,
            category,
            findChoice(petOptions, selections.companionPetId, 0),
            findChoice(careChoices, selections.companionCareId, Math.min(1, careChoices.length - 1)),
            findChoice(COMPANION_HOME_OPTIONS, selections.companionHomeId, 1),
            findChoice(COMPANION_ACCESSORY_OPTIONS, selections.companionAccessoryId, 1),
            findChoice(COMPANION_CUSTOMIZATION_OPTIONS, selections.companionCustomizationId, 1),
            findChoice(permitChoices, selections.companionPermitId, 0),
        ].filter(Boolean);
    }
    return [scale, privacy, invite, duration, ...extras].filter(Boolean);
};

const combineEffects = (activity: LifestyleActivityDefinition, choices: LifestyleActivityChoice[]): Partial<Stats> => {
    const effects: Partial<Stats> = { ...activity.baseEffects };
    choices.forEach(choice => {
        Object.entries(choice.statEffects || {}).forEach(([key, value]) => {
            if (typeof value !== 'number') return;
            const current = Number((effects as Record<string, unknown>)[key] || 0);
            (effects as Record<string, number>)[key] = current + value;
        });
    });
    return effects;
};

const summarizeEffects = (effects: Partial<Stats>): string[] => (
    Object.entries(effects)
        .filter(([, value]) => typeof value === 'number' && Math.abs(value) >= 0.25)
        .map(([key, value]) => {
            const amount = Number(value);
            return `${amount > 0 ? '+' : ''}${amount.toFixed(Number.isInteger(amount) ? 0 : 1)} ${statLabels[key] || key}`;
        })
        .slice(0, 5)
);

export const buildLifestyleActivityQuote = (
    activity: LifestyleActivityDefinition,
    selections: LifestyleActivitySelections,
    player?: LifestyleActivityPlayerContext | null,
): LifestyleActivityQuote => {
    const choices = getSelectedChoices(activity, selections, player);
    const multiplier = choices.reduce((product, choice) => product * (choice.costMultiplier || 1), 1);
    const flatCost = choices.reduce((sum, choice) => sum + (choice.flatCost || 0), 0);
    const totalCost = roundCost((activity.baseCost * multiplier) + flatCost);
    const risk = clamp(activity.baseRisk + choices.reduce((sum, choice) => sum + (choice.riskShift || 0), 0));
    const statEffects = combineEffects(activity, choices);
    const effectSummary = summarizeEffects(statEffects);

    return {
        totalCost,
        risk,
        statEffects,
        effectSummary,
        selectedLabels: choices.map(choice => choice.label),
    };
};

const getLifestyleIdentity = (memories: LifestyleActivityMemory[]): string => {
    if (!memories.length) return 'Untapped';
    const counts = memories.reduce<Record<LifestyleActivityCategory, number>>((acc, memory) => {
        acc[memory.category] = (acc[memory.category] || 0) + 1;
        return acc;
    }, {} as Record<LifestyleActivityCategory, number>);
    const [topCategory] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] as [LifestyleActivityCategory, number];
    return categoryIdentity[topCategory] || 'Life builder';
};

export const getLifestyleActivityCooldownWeeks = (player: Player, activityId: string): number => {
    const state = ensureLifestyleActivityState(player.lifestyleActivities);
    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    if (activityId === 'vacation_escape') {
        const latestTrip = state.memories
            .filter(memory => memory.activityId === 'vacation_escape')
            .sort((a, b) => b.createdAbsoluteWeek - a.createdAbsoluteWeek)[0];
        return latestTrip?.createdAbsoluteWeek === currentAbsoluteWeek ? 1 : 0;
    }
    return Math.max(0, (state.cooldowns[activityId] || 0) - currentAbsoluteWeek);
};

export const getRecommendedLifestyleActivities = (player: Player): LifestyleActivityDefinition[] => {
    const ids = new Set<string>();
    const add = (id: string) => ids.add(id);
    if ((player.stats.health || 0) < 70) add('wellness_reset');
    if ((player.stats.happiness || 0) < 70) add('vacation_escape');
    if ((player.stats.reputation || 0) > 25 || (player.stats.fame || 0) > 20) add('industry_dinner');
    if (!(player.relationships || []).some(rel => rel.relation === 'Child') && (player.money || 0) > 60_000) add('adoption_center');
    if ((player.money || 0) > 500_000) add('charity_gala');
    add('companion_day');
    return LIFESTYLE_ACTIVITY_CATALOG.filter(activity => ids.has(activity.id)).slice(0, 4);
};

const stableRoll = (seed: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
        hash ^= seed.charCodeAt(index);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0) / 4294967295;
};

const guestReliability: Record<string, number> = {
    no_guest: 1,
    rising_actor: 0.88,
    chart_star: 0.76,
    global_heartthrob: 0.64,
    award_director: 0.82,
};

const parseNpcHeadlineGuestId = (guestId: string): string | undefined => (
    guestId.startsWith(NPC_HEADLINE_GUEST_PREFIX) ? guestId.slice(NPC_HEADLINE_GUEST_PREFIX.length) : undefined
);

const getNightlifeGuestNpc = (player: LifestyleActivityPlayerContext | null | undefined, guest: LifestyleActivityChoice): NPCActor | undefined => {
    const npcId = parseNpcHeadlineGuestId(guest.id);
    if (!npcId) return undefined;
    return getNpcPool(player).find(npc => npc.id === npcId);
};

const getNightlifeGuestAttendanceChance = (
    player: Player,
    guest: LifestyleActivityChoice,
    control: LifestyleActivityChoice,
    privacyId?: string,
    quote?: LifestyleActivityQuote,
): number => {
    if (guest.id === 'no_guest') return 1;
    const npc = getNightlifeGuestNpc(player, guest);
    if (!npc) return guestReliability[guest.id] ?? 0.75;
    const relationship = getNpcRelationship(player, npc.id, npc.name);
    const stats = player.stats || {} as Stats;
    const followerPull = Math.min(18, Math.log10(Math.max(10, stats.followers || 0)) * 2.5);
    const playerPull = (stats.fame || 0) * 0.54
        + (stats.reputation || 0) * 0.24
        + (stats.talent || 0) * 0.12
        + followerPull
        + (relationship?.closeness || 0) * 0.34;
    const handlerBonus = control.id === 'handler_team' ? 8 : 0;
    const prBonus = privacyId === 'pr_managed' ? 6 : privacyId === 'public' ? 2 : 0;
    const moneySignal = Math.min(10, (quote?.totalCost || 0) / 35_000);
    const opennessBonus = (npc.openness - 50) * 0.18;
    const requiredPull = guestTierPullRequirement[npc.tier] || 50;
    return clamp((playerPull + handlerBonus + prBonus + moneySignal + opennessBonus - requiredPull + 55) / 100, 0.06, 0.94);
};

const getIndustryGuestRsvpChance = (
    player: Player,
    guest: LifestyleActivityChoice,
    quote: LifestyleActivityQuote,
): number => {
    const npc = getNightlifeGuestNpc(player, guest);
    if (!npc) return 0.58;
    const relationship = getNpcRelationship(player, npc.id, npc.name);
    const stats = player.stats || {} as Stats;
    const followerPull = Math.min(12, Math.log10(Math.max(10, stats.followers || 0)) * 1.6);
    const playerPull = (stats.reputation || 0) * 0.34
        + (stats.fame || 0) * 0.22
        + (stats.talent || 0) * 0.14
        + followerPull
        + (relationship?.closeness || 0) * 0.42;
    const roomSignal = Math.min(14, quote.totalCost / 30_000);
    const opennessBonus = (npc.openness - 50) * 0.16;
    const requiredPull = guestTierPullRequirement[npc.tier] || 50;
    const friendFloor = relationship?.closeness && relationship.closeness >= 60 ? 0.55 : 0.08;
    return clamp((playerPull + roomSignal + opennessBonus - requiredPull + 46) / 100, friendFloor, 0.9);
};

const upsertNightlifeGuestRelationship = (
    relationships: Relationship[],
    guest: LifestyleActivityChoice,
    delta: number,
    player: Player,
    absoluteWeek: number,
): Relationship[] => {
    if (guest.id === 'no_guest') return relationships;
    const headlineNpc = getNightlifeGuestNpc(player, guest);
    const npcId = headlineNpc?.id || `nightlife_guest_${guest.id}`;
    const existingIndex = relationships.findIndex(relationship => relationship.npcId === npcId || relationship.name === guest.label);
    if (existingIndex >= 0) {
        return relationships.map((relationship, index) => {
            if (index !== existingIndex) return relationship;
            const nextCloseness = clamp(relationship.closeness + delta);
            return {
                ...relationship,
                closeness: nextCloseness,
                relation: (nextCloseness >= 60 ? 'Friend' : relationship.relation === 'Friend' ? 'Friend' : 'Connection') as Relationship['relation'],
                lastInteractionWeek: player.currentWeek,
                lastInteractionAbsolute: absoluteWeek,
                npcId,
            };
        });
    }
    const startingCloseness = clamp(22 + delta);
    return [
        {
            id: `rel_${npcId}_${absoluteWeek}`,
            npcId,
            name: headlineNpc?.name || guest.label,
            relation: (startingCloseness >= 60 ? 'Friend' : 'Connection') as Relationship['relation'],
            closeness: startingCloseness,
            image: headlineNpc?.avatar || '🍸',
            lastInteractionWeek: player.currentWeek,
            lastInteractionAbsolute: absoluteWeek,
        },
        ...relationships,
    ].slice(0, 80);
};

const buildNightlifeSocialOutcome = (
    player: Player,
    selections: LifestyleActivitySelections,
    quote: LifestyleActivityQuote,
): {
    statEffects: Partial<Stats>;
    effectSummary: string;
    memoryTitle: string;
    memorySummary: string;
    socialMoment: string;
    news?: NewsItem;
    inboxMessage?: Message;
    logMessage: string;
    logType: 'positive' | 'negative' | 'neutral';
    guestChoice: LifestyleActivityChoice;
    relationshipDelta: number;
    nightlifeHealthCondition?: 'party_accident';
} => {
    const eventType = findChoice(NIGHTLIFE_TYPE_OPTIONS, selections.nightlifeTypeId, 0);
    const venue = findChoice(getAvailableNightlifeVenueOptions(player, selections.nightlifeTypeId), selections.nightlifeVenueId, 0);
    const guest = getNightlifeGuestChoice(player, selections.nightlifeGuestId);
    const crowd = findChoice(NIGHTLIFE_CROWD_OPTIONS, selections.nightlifeCrowdId, 1);
    const control = findChoice(NIGHTLIFE_CONTROL_OPTIONS, selections.nightlifeControlId, 1);
    const headlineNpc = getNightlifeGuestNpc(player, guest);
    const privacy = selections.privacyId || 'private';
    const noHeadliner = guest.id === 'no_guest';
    const publicNight = ['public', 'pr_managed'].includes(privacy) || control.id === 'documented_drop' || quote.risk >= 38;
    const roll = stableRoll(`${player.id || player.name}_${player.age}_${player.currentWeek}_${guest.id}_${venue.id}_${eventType.id}`);
    const reliability = getNightlifeGuestAttendanceChance(player, guest, control, privacy, quote);
    const guestArrives = noHeadliner || roll <= reliability;
    const scandalRoll = stableRoll(`${player.id || player.name}_${player.age}_${player.currentWeek}_${quote.totalCost}_${crowd.id}_${control.id}`);
    const scandalChance = clamp((quote.risk - 22) / 100, 0.02, 0.55);
    const messyExit = !guestArrives || scandalRoll < scandalChance;
    const nightlifeHealthCondition = messyExit && quote.risk >= 42 && control.id !== 'handler_team'
        ? 'party_accident' as const
        : undefined;
    const highProfileGuests = new Set(['global_heartthrob']);
    const highProfile = (player.stats.fame || 0) >= 35 || quote.totalCost >= 25_000 || highProfileGuests.has(guest.id);
    const npcTierHighProfile = headlineNpc ? ['ICON', 'A_LIST', 'ESTABLISHED'].includes(headlineNpc.tier) : false;
    const shouldMakeNews = !noHeadliner && (publicNight || highProfile || npcTierHighProfile);

    if (!guestArrives) {
        const headline = `${guest.label} skips ${player.name || 'your'} ${eventType.label}`;
        return {
            statEffects: { fame: 0.8, followers: 1600, reputation: -1.2, happiness: -1 },
            effectSummary: 'No-show became social chatter',
            memoryTitle: `${eventType.label}: Guest No-Show`,
            memorySummary: `${guest.label} was expected at ${venue.label}, but the empty arrival became the night's story.`,
            socialMoment: `${guest.label} did not show after saying yes.`,
            news: shouldMakeNews ? {
                id: `news_nightlife_no_show_${player.age}_${player.currentWeek}_${Date.now()}`,
                headline,
                subtext: `${guest.label} was on the guest list, but the no-show made ${player.name || 'the night'} look bigger and messier at the same time.`,
                category: highProfile || npcTierHighProfile ? 'TOP_STORY' : 'YOU',
                week: player.currentWeek,
                year: player.age,
                impactLevel: highProfile || npcTierHighProfile ? 'HIGH' : 'MEDIUM',
            } : undefined,
            logMessage: `${guest.label} skipped the night, creating public chatter.`,
            logType: 'negative',
            guestChoice: guest,
            relationshipDelta: -10,
            nightlifeHealthCondition,
        };
    }

    if (messyExit) {
        return {
            statEffects: { fame: 0.5, followers: 900, reputation: -0.5 },
            effectSummary: 'Nightlife buzz carried image risk',
            memoryTitle: `${eventType.label}: Messy Exit`,
            memorySummary: `${guest.label} arrived at ${venue.label}, but the exits, clips, and crowd made the night hard to control.`,
            socialMoment: `${guest.label} showed up, but the room got messy.`,
            news: shouldMakeNews ? {
                id: `news_nightlife_messy_${player.age}_${player.currentWeek}_${Date.now()}`,
                headline: `${player.name || 'Actor'} night out turns messy`,
                subtext: `${guest.label} arrived at ${venue.label}, but image control struggled with the crowd.`,
                category: highProfile || npcTierHighProfile ? 'TOP_STORY' : 'YOU',
                week: player.currentWeek,
                year: player.age,
                impactLevel: quote.risk >= 50 ? 'HIGH' : 'MEDIUM',
            } : undefined,
            logMessage: `${eventType.label} created buzz with some image risk.`,
            logType: 'neutral',
            guestChoice: guest,
            relationshipDelta: 3,
            nightlifeHealthCondition,
        };
    }

    return {
        statEffects: { fame: 0.6, reputation: 0.6, followers: 1200, happiness: 1 },
        effectSummary: `${guest.label} lifted the room`,
        memoryTitle: `${eventType.label}: ${guest.label}`,
        memorySummary: `${guest.label} arrived at ${venue.label}. ${crowd.label} and ${control.label} made the night feel intentional.`,
        socialMoment: `${guest.label} showed up and gave the night real heat.`,
        news: shouldMakeNews ? {
            id: `news_nightlife_arrival_${player.age}_${player.currentWeek}_${Date.now()}`,
            headline: `${player.name || 'Actor'} pulls a headline guest`,
            subtext: `${guest.label} was spotted at ${venue.label}, giving the night a clean social lift.`,
            category: 'YOU',
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'MEDIUM',
        } : undefined,
        logMessage: `${guest.label} showed up and boosted the night.`,
        logType: 'positive',
        guestChoice: guest,
        relationshipDelta: 9,
        nightlifeHealthCondition: quote.risk >= 62 && control.id === 'no_controls' ? 'party_accident' : undefined,
    };
};

const upsertIndustryRelationships = (
    relationships: Relationship[],
    guests: LifestyleActivityChoice[],
    player: Player,
    absoluteWeek: number,
    roomStrength: number,
): Relationship[] => {
    let nextRelationships = [...relationships];
    guests.slice(0, 6).forEach((guest, index) => {
        const npc = getNightlifeGuestNpc(player, guest);
        const npcId = npc?.id || `industry_guest_${guest.id}`;
        const existingIndex = nextRelationships.findIndex(relationship => relationship.npcId === npcId || relationship.name === guest.label);
        const delta = clamp(8 + roomStrength * 0.18 - index, 5, 24);
        if (existingIndex >= 0) {
            nextRelationships = nextRelationships.map((relationship, relationshipIndex) => {
                if (relationshipIndex !== existingIndex) return relationship;
                const nextCloseness = clamp(relationship.closeness + delta);
                return {
                    ...relationship,
                    closeness: nextCloseness,
                    relation: nextCloseness >= 60 ? 'Friend' : relationship.relation === 'Friend' ? 'Friend' : 'Connection',
                    lastInteractionWeek: player.currentWeek,
                    lastInteractionAbsolute: absoluteWeek,
                    npcId,
                };
            });
            return;
        }
        const startingCloseness = clamp(24 + delta);
        nextRelationships.unshift({
            id: `rel_industry_${npcId}_${absoluteWeek}`,
            npcId,
            name: npc?.name || guest.label,
            relation: startingCloseness >= 60 ? 'Friend' : 'Connection',
            closeness: startingCloseness,
            image: npc?.avatar || '🎬',
            lastInteractionWeek: player.currentWeek,
            lastInteractionAbsolute: absoluteWeek,
        });
    });
    return nextRelationships.slice(0, 80);
};

const buildIndustryConnectionsOutcome = (
    player: Player,
    selections: LifestyleActivitySelections,
    quote: LifestyleActivityQuote,
): {
    statEffects: Partial<Stats>;
    effectSummary: string;
    memoryTitle: string;
    memorySummary: string;
    socialMoment: string;
    news?: NewsItem;
    inboxMessages: Message[];
    logMessage: string;
    logType: 'positive' | 'negative' | 'neutral';
    guests: LifestyleActivityChoice[];
    roomStrength: number;
} => {
    const event = findChoice(INDUSTRY_EVENT_OPTIONS, selections.industryEventId, 0);
    const venue = findChoice(INDUSTRY_VENUE_OPTIONS, selections.industryVenueId, 0);
    const style = findChoice(INDUSTRY_HOSTING_STYLE_OPTIONS, selections.industryHostingStyleId, 0);
    const service = findChoice(INDUSTRY_SERVICE_OPTIONS, selections.industryServiceId, 1);
    const selectedGroupIds = new Set(selections.industryInviteGroupIds || []);
    const groups = INDUSTRY_INVITE_GROUP_OPTIONS.filter(option => selectedGroupIds.has(option.id));
    const selectedGuestIds = selections.industryGuestIds || [];
    const invitedGuests = getAvailableIndustryGuestOptions(player, '', selectedGuestIds)
        .filter(choice => selectedGuestIds.includes(choice.id));
    const acceptedGuests = invitedGuests.filter(guest => (
        stableRoll(`${player.id || player.name}_${player.age}_${player.currentWeek}_${guest.id}_industry_rsvp`) < getIndustryGuestRsvpChance(player, guest, quote)
    ));
    const declinedGuests = invitedGuests.filter(guest => !acceptedGuests.some(accepted => accepted.id === guest.id));
    const mockedGuests = declinedGuests.filter(guest => {
        const npc = getNightlifeGuestNpc(player, guest);
        const relationship = npc ? getNpcRelationship(player, npc.id, npc.name) : undefined;
        const rank = guestTierRank[npc?.tier || 'UNKNOWN'] || 2;
        const mockChance = clamp(0.025 + Math.max(0, rank - 3) * 0.015 - (relationship?.closeness || 0) / 900, 0.01, 0.09);
        return stableRoll(`${player.id || player.name}_${player.age}_${player.currentWeek}_${guest.id}_industry_mock`) < mockChance;
    });
    const fallbackGuests = groups.slice(0, 3).map((group, index) => createChoice({
        id: `industry_group_${group.id}_${index}`,
        label: group.id === 'directors' ? 'Indie Director' : group.id === 'producers' ? 'Studio Producer' : group.id === 'actors' ? 'Rising Actor' : group.id === 'agents_managers' ? 'Senior Manager' : 'Industry Contact',
        description: group.description,
        kind: 'INDUSTRY_GUEST',
        memoryTag: `industry-fallback-${group.id}`,
    }));
    const guests = [...acceptedGuests, ...fallbackGuests].slice(0, 6);
    const addons = INDUSTRY_ADDON_OPTIONS.filter(option => (selections.industryAddonIds || []).includes(option.id));
    const roomStrength = clamp(
        (player.stats.reputation || 0) * 0.25
        + (player.stats.fame || 0) * 0.18
        + Math.min(32, quote.totalCost / 12_000)
        + groups.length * 4
        + acceptedGuests.length * 3
        + addons.length * 2
        - Math.max(0, quote.risk - 28) * 0.3,
        8,
        96,
    );
    const seed = `${player.id || player.name}_${player.age}_${player.currentWeek}_${event.id}_${venue.id}_${style.id}_${quote.totalCost}`;
    const careerRoll = stableRoll(`${seed}_career`);
    const referralRoll = stableRoll(`${seed}_referral`);
    const socialRoll = stableRoll(`${seed}_social`);
    const hasDirectors = selectedGroupIds.has('directors') || addons.some(addon => addon.id === 'director_table');
    const hasProducers = selectedGroupIds.has('producers') || addons.some(addon => addon.id === 'producer_suite');
    const hasActors = selectedGroupIds.has('actors') || acceptedGuests.length > 0;
    const expensiveSignal = quote.totalCost >= 350_000 ? 0.004 : 0;
    const careerChance = clamp(0.01 + roomStrength / 7_000 + (hasDirectors ? 0.004 : 0) + (hasProducers ? 0.004 : 0) + expensiveSignal, 0.012, 0.055);
    const referralChance = clamp(0.05 + roomStrength / 520 + (hasActors ? 0.035 : 0), 0.05, 0.26);
    const inboxMessages: Message[] = [];
    const headlineGuest = acceptedGuests[0] || guests[0];
    const mockedGuest = mockedGuests[0];

    if (mockedGuest) {
        inboxMessages.push({
            id: `msg_industry_mocked_${player.age}_${player.currentWeek}_${Date.now()}`,
            sender: 'Industry Social',
            subject: `${mockedGuest.label} joked about your invite`,
            text: `${mockedGuest.label} did not come and turned the invite into a small social-media joke. The room still happened, but the industry read got a little colder.`,
            type: 'SYSTEM',
            data: { activityId: 'industry_dinner', guestId: mockedGuest.id, mocked: true },
            isRead: false,
            weekSent: player.currentWeek,
            expiresIn: 4,
        });
    } else if (declinedGuests.length > 0) {
        inboxMessages.push({
            id: `msg_industry_declined_${player.age}_${player.currentWeek}_${Date.now()}`,
            sender: 'Industry RSVP',
            subject: `${declinedGuests[0].label} did not attend`,
            text: `${declinedGuests.slice(0, 3).map(guest => guest.label).join(', ')} skipped the invite. No fee was paid; it was a real invite, so the room moved on without them.`,
            type: 'SYSTEM',
            data: { activityId: 'industry_dinner', declinedGuestIds: declinedGuests.map(guest => guest.id) },
            isRead: false,
            weekSent: player.currentWeek,
            expiresIn: 3,
        });
    }

    if (careerRoll < careerChance) {
        const direct = careerRoll < careerChance * 0.18;
        inboxMessages.push({
            id: `msg_industry_casting_${player.age}_${player.currentWeek}_${Date.now()}`,
            sender: direct ? 'Director Connection' : 'Casting Office',
            subject: direct ? 'A director remembered the room' : 'Audition conversation from last night',
            text: direct
                ? `${headlineGuest?.label || 'A director'} left ${event.label.toLowerCase()} talking about your presence. Their office wants your team available for a possible supporting part.`
                : `${headlineGuest?.label || 'Someone from the room'} mentioned your name after ${event.label.toLowerCase()}. Casting may send an audition if the timing lines up.`,
            type: 'SYSTEM',
            data: { activityId: 'industry_dinner', eventId: event.id, careerChance, direct },
            isRead: false,
            weekSent: player.currentWeek,
            expiresIn: 4,
        });
    } else if (referralRoll < referralChance) {
        inboxMessages.push({
            id: `msg_industry_referral_${player.age}_${player.currentWeek}_${Date.now()}`,
            sender: headlineGuest?.label || 'Industry Contact',
            subject: 'Casual project talk',
            text: `${headlineGuest?.label || 'A guest'} casually mentioned a project looking for the right supporting or cameo energy. You can follow up tomorrow, keep it cool, or let the connection breathe.`,
            type: 'SYSTEM',
            data: { activityId: 'industry_dinner', eventId: event.id, careerChance, referral: true },
            isRead: false,
            weekSent: player.currentWeek,
            expiresIn: 3,
        });
    }

    if (guests.length > 0 && socialRoll < 0.72) {
        inboxMessages.push({
            id: `msg_industry_connections_${player.age}_${player.currentWeek}_${Date.now()}`,
            sender: 'Industry Room',
            subject: `${guests[0].label} is now in Connections`,
            text: `${guests.slice(0, 3).map(guest => guest.label).join(', ')} left with a warmer read on you. Open Connections to keep the relationship alive.`,
            type: 'SYSTEM',
            data: { activityId: 'industry_dinner', guestIds: guests.map(guest => guest.id) },
            isRead: false,
            weekSent: player.currentWeek,
            expiresIn: 6,
        });
    }

    const publicRoom = quote.totalCost >= 220_000 || addons.some(addon => addon.id === 'pr_photographer') || event.id === 'awards_afterparty';
    const mockeryNews = Boolean(mockedGuest && publicRoom);
    const directRsvpSummary = invitedGuests.length
        ? `${acceptedGuests.length}/${invitedGuests.length} direct RSVP${invitedGuests.length === 1 ? '' : 's'}`
        : 'group invites sent';
    return {
        statEffects: {
            reputation: 1.2 + roomStrength / 35 - (mockedGuest ? 2 : 0),
            fame: publicRoom ? 0.9 : 0.3,
            followers: publicRoom ? Math.round(900 + roomStrength * 45) : Math.round(250 + roomStrength * 12),
            happiness: style.id === 'warm_casual' ? 1.5 : 0.6,
            experience: hasDirectors ? 0.9 : 0.4,
        },
        effectSummary: `${directRsvpSummary}; ${guests.length} connection${guests.length === 1 ? '' : 's'} warmed; career chance stayed organic`,
        memoryTitle: `${event.label} at ${venue.label}`,
        memorySummary: `${event.label}, ${venue.label}, ${style.label}, and ${service.label} created an expensive room where ${guests.slice(0, 3).map(guest => guest.label).join(', ') || 'industry people'} could talk naturally. ${declinedGuests.length ? `${declinedGuests.length} invite${declinedGuests.length === 1 ? '' : 's'} did not land.` : 'The targeted invites landed cleanly.'}`,
        socialMoment: publicRoom ? `${player.name || 'You'} hosted a serious industry room at ${venue.label}.` : `${event.label} created useful private industry conversations.`,
        news: publicRoom ? {
            id: `news_industry_${player.age}_${player.currentWeek}_${Date.now()}`,
            headline: mockeryNews ? `${mockedGuest?.label} jokes about invite` : `${player.name || 'Actor'} hosts industry room`,
            subtext: mockeryNews
                ? `${mockedGuest?.label} skipped ${event.label.toLowerCase()} and made the invite part of the online conversation.`
                : `${event.label} brought directors, producers, actors, and tastemakers into one expensive room.`,
            category: mockeryNews ? 'YOU' : quote.totalCost >= 350_000 ? 'TOP_STORY' : 'YOU',
            week: player.currentWeek,
            year: player.age,
            impactLevel: mockeryNews ? 'MEDIUM' : quote.totalCost >= 350_000 ? 'MEDIUM' : 'LOW',
        } : undefined,
        inboxMessages,
        logMessage: `Industry Connections got ${directRsvpSummary}, created ${guests.length} warmer contact${guests.length === 1 ? '' : 's'}, and kept career chance organic.`,
        logType: mockedGuest ? 'negative' : 'positive',
        guests,
        roomStrength,
    };
};

const buildCharityGalaOutcome = (
    player: Player,
    selections: LifestyleActivitySelections,
    quote: LifestyleActivityQuote,
): {
    statEffects: Partial<Stats>;
    effectSummary: string;
    memoryTitle: string;
    memorySummary: string;
    socialMoment: string;
    news?: NewsItem;
    inboxMessage?: Message;
    logMessage: string;
    logType: 'positive' | 'negative' | 'neutral';
    flagUpdates: Record<string, any>;
} => {
    const cause = findChoice(CHARITY_CAUSE_OPTIONS, selections.charityCauseId, 2);
    const format = findChoice(CHARITY_FORMAT_OPTIONS, selections.charityFormatId, 1);
    const donation = getCharityDonationChoice(selections);
    const guests = findChoice(CHARITY_GUEST_CIRCLE_OPTIONS, selections.charityGuestCircleId, 0);
    const press = findChoice(CHARITY_PRESS_OPTIONS, selections.charityPressId, 1);
    const donationAmount = donation.flatCost || 0;
    const audited = press.id === 'quiet_receipts' || donationAmount >= 350_000 || ['college_scholarships', 'campus_building_fund', 'medical_relief', 'film_workers_fund'].includes(cause.id);
    const educationGift = ['children_education', 'college_scholarships', 'campus_building_fund', 'film_school_endowment'].includes(cause.id);
    const namedBuilding = educationGift && (cause.id === 'campus_building_fund' || donation.id === 'named_wing_grant' || donation.id === 'legacy_endowment' || donationAmount >= 2_500_000);
    const studentFunding = educationGift && (cause.id === 'college_scholarships' || donationAmount >= 85_000);
    const taxStructured = donationAmount >= 1_000_000;
    const publicPosture = (press.id === 'red_carpet_cause' ? 2 : press.id === 'viral_challenge' ? 3 : press.id === 'controlled_press' ? 1 : 0)
        + (format.id === 'telethon_special' ? 2 : format.id === 'stadium_benefit' ? 3 : 0)
        + (guests.id === 'celebrity_table' ? 1 : 0);
    const donationSignal = Math.min(18, (donation.flatCost || 0) / 120_000);
    const proofSignal = audited ? 16 : 0;
    const impactScore = clamp(
        28
        + donationSignal * 2.2
        + (educationGift ? 4 : 0)
        + (studentFunding ? 6 : 0)
        + (namedBuilding ? 10 : 0)
        + (cause.id === 'film_workers_fund' ? 5 : 0)
        + proofSignal
        - Math.max(0, publicPosture - 2) * 3,
        12,
        96,
    );
    const backlashChance = clamp((quote.risk + publicPosture * 7 - proofSignal - donationSignal) / 100, 0.02, 0.34);
    const taxShield = Math.round((donation.flatCost || 0) * (taxStructured ? 0.29 : 0.18));
    const taxScrutinyChance = clamp((quote.totalCost / 14_000_000) + (taxStructured ? 0.12 : 0) + (publicPosture >= 3 ? 0.05 : 0) - (audited ? 0.06 : 0), 0.01, 0.28);
    const backlash = stableRoll(`${player.id || player.name}_${player.age}_${player.currentWeek}_${cause.id}_${press.id}_${quote.totalCost}_charity_backlash`) < backlashChance;
    const taxInvestigation = stableRoll(`${player.id || player.name}_${player.age}_${player.currentWeek}_${cause.id}_${donation.id}_${quote.totalCost}_charity_tax`) < taxScrutinyChance;
    const publicEvent = press.id !== 'quiet_receipts' || quote.totalCost >= 500_000 || format.id === 'telethon_special' || format.id === 'stadium_benefit';
    const legacyLift = Math.round(impactScore / 8 + (donationAmount >= 4_000_000 ? 8 : donationAmount >= 1_000_000 ? 3 : 0));
    const negativePrDebt = Math.max(0, Number(player.flags?.negativePRDebt || player.flags?.scandalHeat || player.flags?.recentScandals || 0));
    const imageCleanup = clamp(Math.round(impactScore / 10 + (audited ? 4 : 0) - (backlash ? 9 : 0)), 0, 18);
    const movieGoodwillLift = clamp((impactScore / 10_000) + (cause.id === 'film_school_endowment' || cause.id === 'film_workers_fund' ? 0.004 : 0) + (backlash ? -0.003 : 0), 0, 0.018);
    const reputationLift = backlash ? -2.5 : 1.8 + impactScore / 18 + Math.min(2.5, negativePrDebt / 5);
    const fameLift = publicEvent ? (backlash ? 0.9 : 0.5 + publicPosture * 0.35) : 0.15;
    return {
        statEffects: {
            reputation: reputationLift,
            fame: fameLift,
            followers: publicEvent ? Math.round((backlash ? 1800 : 900) + impactScore * 45 + publicPosture * 700) : Math.round(impactScore * 12),
            happiness: backlash ? -0.5 : 0.8 + impactScore / 45,
        },
        effectSummary: backlash
            ? `${cause.label} raised money, but the optics looked performative`
            : `${cause.label} gained credible impact; image cleanup +${imageCleanup}; legacy +${legacyLift}`,
        memoryTitle: namedBuilding ? `${player.name || 'Actor'} College Building Gift` : `${cause.label} Gala`,
        memorySummary: `${format.label}, ${donation.label}, ${guests.label}, and ${press.label} shaped the night. ${namedBuilding ? `The donation was large enough for a college building or wing to carry ${player.name || 'your'} name. ` : ''}${studentFunding ? 'Students received direct education funding. ' : ''}${audited ? 'Audited proof made the giving feel real.' : 'The public read depended heavily on trust and tone.'}`,
        socialMoment: backlash
            ? `${player.name || 'You'} faced questions over a glossy ${cause.label.toLowerCase()} gala.`
            : `${player.name || 'You'} turned ${cause.label.toLowerCase()} into a serious public cause moment.`,
        news: publicEvent ? {
            id: `news_charity_${player.age}_${player.currentWeek}_${Date.now()}`,
            headline: taxInvestigation ? `${player.name || 'Actor'} donation faces questions` : backlash ? `${player.name || 'Actor'} charity gala draws backlash` : namedBuilding ? `${player.name || 'Actor'} funds college building` : `${player.name || 'Actor'} backs ${cause.label}`,
            subtext: backlash
                ? `${press.label} made the event visible, but critics questioned whether the money matched the image.`
                : taxInvestigation
                    ? `The donation may be legal, but the size and tax structure drew financial scrutiny.`
                    : namedBuilding
                        ? `${donation.label} turned into a named campus building commitment.`
                        : `${donation.label} and ${format.label} gave the cause real public weight.`,
            category: backlash || taxInvestigation ? 'YOU' : quote.totalCost >= 1_000_000 ? 'TOP_STORY' : 'YOU',
            week: player.currentWeek,
            year: player.age,
            impactLevel: quote.totalCost >= 1_000_000 || backlash || taxInvestigation ? 'MEDIUM' : 'LOW',
        } : undefined,
        inboxMessage: taxInvestigation ? {
            id: `msg_charity_tax_${player.age}_${player.currentWeek}_${Date.now()}`,
            sender: 'Financial Review Desk',
            subject: 'Large donation under review',
            text: `${donation.label} for ${cause.label} created a useful tax shield, but the size and structure drew questions. Audited records and clean proof now matter.`,
            type: 'SYSTEM',
            data: { activityId: 'charity_gala', causeId: cause.id, donationId: donation.id, taxShield, taxScrutinyChance },
            isRead: false,
            weekSent: player.currentWeek,
            expiresIn: 6,
        } : undefined,
        logMessage: backlash
            ? `Charity Gala raised funds for ${cause.label}, but public optics hurt reputation.`
            : taxInvestigation
                ? `Charity Gala helped ${cause.label}, but the tax structure triggered financial scrutiny.`
                : namedBuilding
                    ? `Charity Gala funded a named college building and added ${legacyLift} legacy weight.`
                    : `Charity Gala created credible impact for ${cause.label} and added ${legacyLift} legacy weight.`,
        logType: backlash || taxInvestigation ? 'negative' : 'positive',
        flagUpdates: {
            charityLegacyScore: Math.round((player.flags?.charityLegacyScore || 0) + (backlash ? Math.max(1, legacyLift - 6) : legacyLift)),
            lastCharityCause: cause.label,
            lastCharityGalaWeek: player.currentWeek,
            charityTaxShield: Math.round((player.flags?.charityTaxShield || 0) + taxShield),
            charityTaxScrutiny: Math.round(Math.max(Number(player.flags?.charityTaxScrutiny || 0), taxScrutinyChance * 100)),
            charityMovieGoodwillMultiplier: Number(Math.min(0.03, Number(player.flags?.charityMovieGoodwillMultiplier || 0) + movieGoodwillLift).toFixed(3)),
            negativePRDebt: Math.max(0, negativePrDebt - imageCleanup),
            recentScandals: Math.max(0, Number(player.flags?.recentScandals || 0) - Math.round(imageCleanup / 6)),
            namedCollegeBuilding: namedBuilding ? `${player.name || 'Actor'} ${cause.label} Building` : player.flags?.namedCollegeBuilding,
            studentEducationFunded: studentFunding || Boolean(player.flags?.studentEducationFunded),
            charityTaxInvestigation: taxInvestigation || Boolean(player.flags?.charityTaxInvestigation),
        },
    };
};

const buildWellnessRecoveryOutcome = (
    player: Player,
    selections: LifestyleActivitySelections,
    quote: LifestyleActivityQuote,
    activity: LifestyleActivityDefinition,
): {
    statEffects: Partial<Stats>;
    effectSummary: string;
    memoryTitle: string;
    memorySummary: string;
    socialMoment?: string;
    news?: NewsItem;
    logMessage: string;
    logType: 'positive' | 'negative' | 'neutral';
    flagUpdates: Record<string, any>;
    activeHealthConditions?: HealthConditionState[];
    inboxMessage?: Message;
} => {
    const program = findChoice(WELLNESS_PROGRAM_OPTIONS, selections.wellnessProgramId, 0);
    const provider = findChoice(WELLNESS_PROVIDER_OPTIONS, selections.wellnessProviderId, 1);
    const focus = findChoice(WELLNESS_FOCUS_OPTIONS, selections.wellnessFocusId, 1);
    const support = findChoice(WELLNESS_SUPPORT_OPTIONS, selections.wellnessSupportId, 1);
    const flags = player.flags || {};
    const burnoutWeeks = Math.max(0, Number(flags.burnoutWeeks || 0));
    const recentHealthCrises = Math.max(0, Number(flags.recentHealthCrises || 0));
    const criticalHealthWeeks = Math.max(0, Number(flags.criticalHealthWeeks || 0));
    const seriousCare = ['addiction_rehab', 'cancer_screening', 'sleep_disorder'].includes(program.id)
        || ['specialist_hospital', 'medical_concierge'].includes(provider.id)
        || focus.id === 'advanced_treatment';
    const mentalCare = ['stress_burnout', 'addiction_rehab', 'sleep_disorder'].includes(program.id)
        || support.id === 'recovery_retreat';
    const physicalCare = ['regular_checkup', 'flu_care', 'injury_rehab', 'sleep_disorder', 'cancer_screening'].includes(program.id)
        || ['full_diagnosis', 'advanced_treatment'].includes(focus.id);
    const conditionTreatmentTags = getHealthConditionTreatmentTags(program.id, provider.id, focus.id, support.id);
    const treatmentPrivacy = getHealthTreatmentPrivacy(provider.id, support.id);
    const carePower = (
        (provider.id === 'medical_concierge' ? 3 : provider.id === 'specialist_hospital' ? 2.4 : provider.id === 'private_doctor' ? 1.6 : 1)
        + (focus.id === 'advanced_treatment' ? 1.2 : focus.id === 'full_diagnosis' ? 0.7 : 0)
        + (support.id === 'private_nurse' ? 0.7 : support.id === 'recovery_retreat' ? 1 : support.id === 'followup_visit' ? 0.4 : 0)
    );
    const treatmentResult = resolveHealthConditionTreatment(player, conditionTreatmentTags, carePower, treatmentPrivacy);
    const treatedConditions = treatmentResult.treatedConditions;
    const crisisReduction = seriousCare ? 2 : physicalCare ? 1 : 0;
    const burnoutReduction = mentalCare ? 3 : support.id === 'followup_visit' ? 1 : 0;
    const flagUpdates: Record<string, any> = {
        burnoutWeeks: Math.max(0, burnoutWeeks - burnoutReduction),
        recentHealthCrises: Math.max(0, recentHealthCrises - crisisReduction),
        criticalHealthWeeks: seriousCare ? 0 : Math.max(0, criticalHealthWeeks - crisisReduction),
        lastWellnessResetWeek: getAbsoluteWeek(player.age, player.currentWeek),
        activeHealthConditionCount: treatmentResult.activeHealthConditions.length,
        healthConditionCap: treatmentResult.activeHealthConditions.length
            ? Math.min(...treatmentResult.activeHealthConditions.map(condition => condition.healthCap))
            : undefined,
    };
    const hiddenPressureWasHigh = burnoutWeeks >= 2 || recentHealthCrises > 0 || criticalHealthWeeks > 0 || (player.stats.health || 0) < 55;
    const eliteSpend = quote.totalCost >= 75_000 || provider.id === 'medical_concierge';
    const statEffects: Partial<Stats> = {};
    if (hiddenPressureWasHigh) {
        statEffects.health = seriousCare ? 2 : 1;
        statEffects.happiness = mentalCare ? 1.5 : 0.5;
    }
    if (support.id === 'recovery_retreat') {
        statEffects.fame = -0.3;
        statEffects.reputation = 0.4;
    }

    let effectSummary = 'Care plan completed';
    if (treatmentResult.effectSummary) effectSummary = treatmentResult.effectSummary;
    else if (program.id === 'addiction_rehab') effectSummary = 'Addiction and burnout pressure reset';
    else if (program.id === 'sleep_disorder') effectSummary = 'Sleep debt and health risk reduced';
    else if (program.id === 'stress_burnout') effectSummary = 'Burnout pressure reduced';
    else if (program.id === 'injury_rehab') effectSummary = 'Injury recovery improved';
    else if (program.id === 'cancer_screening') effectSummary = 'Major health risk checked early';
    else if (program.id === 'camera_ready_care') effectSummary = 'Looks and camera confidence improved';
    else if (program.id === 'flu_care') effectSummary = 'Minor illness treated';
    else if (program.id === 'regular_checkup') effectSummary = 'Health risk checked early';

    const news = eliteSpend && (player.stats.fame || 0) >= 45 && program.id === 'camera_ready_care'
        ? {
            id: `news_wellness_${player.age}_${player.currentWeek}_${Date.now()}`,
            headline: `${player.name || 'Actor'} gets camera-ready care`,
            subtext: `${provider.label} and ${program.label} gave the next public appearance a polished edge.`,
            category: 'YOU' as const,
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'LOW' as const,
        }
        : undefined;
    const inboxMessage = treatedConditions.length ? {
        id: `msg_wellness_treatment_${player.age}_${player.currentWeek}_${Date.now()}`,
        sender: 'Medical Team',
        subject: `${treatedConditions[0].label} treatment update`,
        text: treatmentPrivacy === 'PRIVATE'
            ? `${provider.label} handled the care quietly. ${effectSummary}.`
            : `${provider.label} completed the care route. ${effectSummary}.`,
        type: 'SYSTEM' as const,
        data: { treatedConditionIds: treatedConditions.map(condition => condition.conditionId), treatmentPrivacy },
        isRead: false,
        weekSent: player.currentWeek,
        expiresIn: 8,
    } : undefined;

    return {
        statEffects,
        effectSummary,
        memoryTitle: treatedConditions.length ? `Treated ${treatedConditions[0].label}` : `${program.label}: ${focus.label}`,
        memorySummary: `${provider.label} handled ${program.label.toLowerCase()} with ${support.label.toLowerCase()} support. ${effectSummary}.`,
        socialMoment: program.id === 'camera_ready_care' ? `${program.label} improved your public-facing look.` : undefined,
        news,
        logMessage: treatedConditions.length
            ? `${program.label} cleared ${treatedConditions.map(condition => condition.label).join(', ')} through ${provider.label}.`
            : `${program.label} lowered recovery pressure through ${provider.label}.`,
        logType: hiddenPressureWasHigh ? 'positive' : 'neutral',
        flagUpdates,
        activeHealthConditions: treatmentResult.activeHealthConditions,
        inboxMessage,
    };
};

export interface AdoptionEligibilityCheck {
    id: string;
    label: string;
    detail: string;
    passed: boolean;
    required: boolean;
}

export interface AdoptionEligibilityResult {
    qualifies: boolean;
    score: number;
    statusLabel: string;
    blockers: string[];
    checks: AdoptionEligibilityCheck[];
}

export const getAdoptionEligibility = (
    player: Player,
    quote?: LifestyleActivityQuote,
): AdoptionEligibilityResult => {
    const stats = player.stats || {} as Stats;
    const totalCost = quote?.totalCost || 35_000;
    const requiredReserve = Math.max(45_000, Math.round(totalCost * 1.15));
    const ownedPropertyIds = new Set(player.assets || []);
    const hasHome = PROPERTY_CATALOG.some(property => ownedPropertyIds.has(property.id));
    const hasCash = (player.money || 0) >= requiredReserve;
    const canRentStableHome = (player.money || 0) >= requiredReserve * 2.5;
    const homePassed = hasHome || canRentStableHome;
    const hasSupportCircle = (player.relationships || []).some(rel => ['Spouse', 'Partner', 'Parent', 'Sibling'].includes(rel.relation) && rel.closeness >= 35);
    const checks: AdoptionEligibilityCheck[] = [
        {
            id: 'age',
            label: 'Adult Applicant',
            detail: (player.age || 0) >= 21 ? `${player.age} years old` : 'Must be at least 21',
            passed: (player.age || 0) >= 21,
            required: true,
        },
        {
            id: 'cash',
            label: 'Cash Reserve',
            detail: `${formatServiceMoney(player.money || 0)} available / ${formatServiceMoney(requiredReserve)} expected`,
            passed: hasCash,
            required: true,
        },
        {
            id: 'home',
            label: 'Stable Home',
            detail: hasHome ? 'Owned home on record' : canRentStableHome ? 'Enough cash to secure housing' : 'Own a home or hold a stronger reserve',
            passed: homePassed,
            required: true,
        },
        {
            id: 'health',
            label: 'Care Capacity',
            detail: `${Math.round(stats.health || 0)}/100 health`,
            passed: (stats.health || 0) >= 42,
            required: true,
        },
        {
            id: 'reputation',
            label: 'Public Standing',
            detail: `${Math.round(stats.reputation || 0)}/100 reputation`,
            passed: (stats.reputation || 0) >= 0,
            required: false,
        },
        {
            id: 'support',
            label: 'Support Circle',
            detail: hasSupportCircle ? 'Family or partner support visible' : 'Solo applications still possible',
            passed: hasSupportCircle || (stats.happiness || 0) >= 55,
            required: false,
        },
    ];
    const blockers = checks.filter(check => check.required && !check.passed).map(check => check.label);
    const score = Math.round((checks.filter(check => check.passed).length / checks.length) * 100);
    return {
        qualifies: blockers.length === 0,
        score,
        statusLabel: blockers.length === 0 ? 'Qualified' : 'Not Ready',
        blockers,
        checks,
    };
};

const pickAdoptionChildProfile = (player: Player, childId?: string): AdoptionChildProfile => {
    const exactProfile = getAdoptionChildProfile(childId, player);
    if (exactProfile) return exactProfile;
    const profileGroup = ADOPTION_CHILD_PROFILES.filter(profile => profile.ageGroup === (childId || 'school_age'));
    const profiles = profileGroup.length ? profileGroup : ADOPTION_CHILD_PROFILES.filter(profile => profile.ageGroup === 'school_age');
    const roll = stableRoll(`${player.id || player.name}_${player.age}_${player.currentWeek}_${childId || 'school_age'}_adoption_child`);
    return profiles[Math.min(profiles.length - 1, Math.floor(roll * profiles.length))];
};

const getAdoptionApprovalChance = (
    player: Player,
    quote: LifestyleActivityQuote,
    child: LifestyleActivityChoice,
    route: LifestyleActivityChoice,
    homePrep: LifestyleActivityChoice,
    support: LifestyleActivityChoice,
): number => {
    const stats = player.stats || {} as Stats;
    const liquidity = Math.min(18, Math.max(0, (player.money - quote.totalCost) / Math.max(30_000, quote.totalCost) * 10));
    const reputation = Math.min(16, (stats.reputation || 0) * 0.16);
    const healthMood = Math.min(12, ((stats.health || 0) + (stats.happiness || 0)) * 0.06);
    const prep = Math.max(0, -(homePrep.riskShift || 0)) * 2.4 + Math.max(0, -(support.riskShift || 0)) * 1.8;
    const routeHelp = route.id === 'private_agency' ? 10 : route.id === 'international_agency' ? -2 : 3;
    const profile = getAdoptionChildProfile(child.id, player);
    const childDifficulty = profile?.ageGroup === 'teen' ? -5 : profile?.ageGroup === 'infant' ? -3 : profile?.riskShift ? -profile.riskShift * 0.8 : 2;
    const scandalPenalty = Math.max(0, Number(player.flags?.recentScandals || player.flags?.recentScandalWeeks || 0)) * 3;
    return clamp(46 + liquidity + reputation + healthMood + prep + routeHelp + childDifficulty - scandalPenalty - (quote.risk * 0.22), 18, 96);
};

const buildAdoptionOutcome = (
    player: Player,
    selections: LifestyleActivitySelections,
    quote: LifestyleActivityQuote,
): {
    approved: boolean;
    child?: Relationship;
    statEffects: Partial<Stats>;
    effectSummary: string;
    memoryTitle: string;
    memorySummary: string;
    socialMoment?: string;
    news?: NewsItem;
    inboxMessage: Message;
    logMessage: string;
    logType: 'positive' | 'negative' | 'neutral';
} => {
    const adoptionChildOptions = getAvailableAdoptionChildOptions(player);
    const childChoice = findChoice(adoptionChildOptions, selections.adoptionChildId, 0);
    const route = findChoice(ADOPTION_ROUTE_OPTIONS, selections.adoptionRouteId, 0);
    const homePrep = findChoice(ADOPTION_HOME_PREP_OPTIONS, selections.adoptionHomePrepId, 1);
    const support = findChoice(ADOPTION_SUPPORT_OPTIONS, selections.adoptionSupportId, 1);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const approvalChance = getAdoptionApprovalChance(player, quote, childChoice, route, homePrep, support);
    const approvalRoll = stableRoll(`${player.id || player.name}_${absoluteWeek}_${childChoice.id}_${route.id}_${homePrep.id}_${support.id}_adoption_approval`) * 100;
    const approved = approvalRoll <= approvalChance;
    const profile = pickAdoptionChildProfile(player, childChoice.id);
    const initialBond = clamp(48
        + Math.max(0, -(homePrep.riskShift || 0)) * 1.4
        + Math.max(0, -(support.riskShift || 0)) * 1.6
        + (profile.ageGroup === 'infant' ? 7 : profile.ageGroup === 'teen' ? -8 : 2)
        + ((player.stats.happiness || 0) - 50) * 0.12);
    const child = approved ? {
        id: `adopted_child_${absoluteWeek}_${profile.name.replace(/\s+/g, '_').toLowerCase()}`,
        name: profile.name,
        relation: 'Child' as const,
        familyTitle: profile.gender === 'MALE' ? 'Son' as const : profile.gender === 'FEMALE' ? 'Daughter' as const : 'Child' as const,
        closeness: initialBond,
        image: getGenderedAvatar(profile.gender, profile.name),
        lastInteractionWeek: player.currentWeek,
        lastInteractionAbsolute: absoluteWeek,
        npcId: `adopted_child_${profile.name.replace(/\s+/g, '_').toLowerCase()}`,
        age: profile.age,
        gender: profile.gender,
        birthWeekAbsolute: Math.max(0, absoluteWeek - (profile.age * 52)),
    } : undefined;
    const publicAdoption = ['public', 'pr_managed'].includes(selections.privacyId || '') || homePrep.id === 'legacy_nursery';
    const highProfile = (player.stats.fame || 0) >= 45 || quote.totalCost >= 175_000;
    const inboxMessage: Message = {
        id: `msg_adoption_${player.age}_${player.currentWeek}_${Date.now()}`,
        sender: 'Adoption Center',
        subject: approved ? 'Adoption approved' : 'Application needs more preparation',
        text: approved
            ? `${route.label} approved the adoption. ${profile.name} is now part of your family and can be found in Connections.`
            : `${route.label} did not clear the adoption yet. Better home prep, support, or a cleaner public profile can improve the next application.`,
        type: 'SYSTEM',
        data: {
            activityId: 'adoption_center',
            approved,
            childId: child?.id,
            approvalChance: Math.round(approvalChance),
            routeId: route.id,
            homePrepId: homePrep.id,
            supportId: support.id,
        },
        isRead: false,
        weekSent: player.currentWeek,
        expiresIn: 12,
    };

    return {
        approved,
        child,
        statEffects: approved
            ? { happiness: 4, reputation: publicAdoption ? 1 : 0.3, experience: 1 }
            : { happiness: -1, reputation: -0.2 },
        effectSummary: approved ? `${profile.name} added to Connections` : 'Application delayed',
        memoryTitle: approved ? `Adopted ${profile.name}` : 'Adoption Application Delayed',
        memorySummary: approved
            ? `${route.label}, ${homePrep.label}, and ${support.label} helped welcome ${profile.name} into your family. Child activities now happen from Connections.`
            : `${route.label} asked for more preparation before approving the adoption.`,
        socialMoment: approved && publicAdoption ? `${player.name || 'You'} welcomed ${profile.name} into the family.` : undefined,
        news: approved && (publicAdoption || highProfile) ? {
            id: `news_adoption_${player.age}_${player.currentWeek}_${Date.now()}`,
            headline: `${player.name || 'Actor'} welcomes a child`,
            subtext: `${profile.name} has joined the family after a ${route.label.toLowerCase()} adoption route.`,
            category: highProfile ? 'TOP_STORY' : 'YOU',
            week: player.currentWeek,
            year: player.age,
            impactLevel: highProfile ? 'MEDIUM' : 'LOW',
        } : undefined,
        inboxMessage,
        logMessage: approved
            ? `${profile.name} joined your family through adoption. Open Connections for child actions.`
            : 'Adoption application was delayed by the agency.',
        logType: approved ? 'positive' : 'neutral',
    };
};

const buildEmojiPetAvatar = (emoji: string): string => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="52" fill="#07140f"/><text x="80" y="102" text-anchor="middle" font-size="88" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${emoji}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const buildPetCompanionOutcome = (
    player: Player,
    selections: LifestyleActivitySelections,
    quote: LifestyleActivityQuote,
): {
    pet: Relationship;
    statEffects: Partial<Stats>;
    effectSummary: string;
    memoryTitle: string;
    memorySummary: string;
    socialMoment?: string;
    news?: NewsItem;
    inboxMessage: Message;
    logMessage: string;
    logType: 'positive' | 'negative' | 'neutral';
} => {
    const profile = getPetCompanionProfile(selections.companionPetId, player)
        || getFilteredPetCompanionProfiles(player, selections.companionStoreId, selections.companionCategoryId)[0]
        || getAvailablePetCompanionProfiles(player)[0]
        || PET_COMPANION_TEMPLATES[0];
    const store = getPetCompanionStore(selections.companionStoreId);
    const category = findChoice(getPetCompanionCategoryOptions(store.id), selections.companionCategoryId, 0);
    const careOptions = getCompanionCareOptionsForPet(profile);
    const permitOptions = getCompanionPermitOptionsForPet(profile);
    const care = findChoice(careOptions, selections.companionCareId, Math.min(1, careOptions.length - 1));
    const home = findChoice(COMPANION_HOME_OPTIONS, selections.companionHomeId, 1);
    const accessory = findChoice(COMPANION_ACCESSORY_OPTIONS, selections.companionAccessoryId, 1);
    const customization = findChoice(COMPANION_CUSTOMIZATION_OPTIONS, selections.companionCustomizationId, 1);
    const permit = findChoice(permitOptions, selections.companionPermitId, 0);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const needsEthics = profile.acquisition === 'endangered';
    const needsExotic = profile.acquisition === 'exotic';
    const paperworkPenalty = needsEthics && permit.id !== 'sanctuary_sponsorship'
        ? -8
        : needsExotic && permit.id === 'standard_papers'
            ? -6
            : 0;
    const careBonus = care.id === 'sanctuary_team' ? 8 : care.id === 'concierge_vet' ? 5 : care.id === 'premium_care' ? 3 : -2;
    const homeBonus = home.id === 'estate_wing' ? 7 : home.id === 'designer_habitat' ? 5 : home.id === 'comfort_den' ? 3 : -1;
    const accessoryBonus = accessory.id === 'gold_collar' ? 2 : accessory.id === 'designer_collar' ? 2 : accessory.id === 'premium_accessories' ? 1 : 0;
    const customizationBonus = customization.id === 'bespoke_luxury' ? 3 : customization.id === 'celebrity_styling' ? 2 : customization.id === 'color_theme' ? 1 : 0;
    const initialBond = clamp(profile.bondBase + careBonus + homeBonus + accessoryBonus + customizationBonus + paperworkPenalty + ((player.stats.happiness || 0) - 50) * 0.08, 12, 92);
    const pet: Relationship = {
        id: `pet_${absoluteWeek}_${profile.id}`,
        name: selections.companionCustomName?.trim() || profile.name,
        relation: 'Pet',
        closeness: initialBond,
        image: buildEmojiPetAvatar(profile.emoji),
        lastInteractionWeek: player.currentWeek,
        lastInteractionAbsolute: absoluteWeek,
        npcId: `pet_${profile.id}`,
        petSpecies: profile.species,
        petBreed: profile.breed,
        petEmoji: profile.emoji,
        petAcquisition: profile.acquisition,
        petRarity: profile.rarity,
        petStoreName: store.name,
        petHomeSetup: home.label,
        petAccessory: accessory.label,
        petCustomization: customization.label,
    };
    const publicPet = profile.rarity === 'endangered' || quote.totalCost >= 150_000;
    const inboxMessage: Message = {
        id: `msg_pet_${player.age}_${player.currentWeek}_${Date.now()}`,
        sender: 'Companion Center',
        subject: `${profile.name} is now in Connections`,
        text: `${profile.emoji} ${profile.name} came from ${store.name} as a ${category.label.toLowerCase()} choice. Checkout included ${home.label.toLowerCase()}, ${accessory.label.toLowerCase()}, and ${customization.label.toLowerCase()}. Use Connections to feed, play, groom, or book vet care.`,
        type: 'SYSTEM',
        data: {
            activityId: 'companion_day',
            petId: pet.id,
            petProfileId: profile.id,
            storeId: store.id,
            categoryId: category.id,
            careId: care.id,
            homeId: home.id,
            accessoryId: accessory.id,
            customizationId: customization.id,
            permitId: permit.id,
        },
        isRead: false,
        weekSent: player.currentWeek,
        expiresIn: 10,
    };

    return {
        pet,
        statEffects: {
            happiness: 2 + (profile.statEffects.happiness || 0) * 0.4,
            health: profile.rarity === 'common' ? 0.5 : 0.2,
            reputation: profile.rarity === 'endangered' ? 1.4 : profile.rarity === 'exotic' ? 0.4 : 0.2,
        },
        effectSummary: `${profile.emoji} ${profile.name} added to Connections`,
        memoryTitle: `Welcomed ${profile.name}`,
        memorySummary: `${store.name} helped you choose ${profile.name}, a ${profile.breed} ${profile.species}. Checkout covered ${home.label.toLowerCase()}, ${accessory.label.toLowerCase()}, ${customization.label.toLowerCase()}, ${care.label.toLowerCase()}, and ${permit.label.toLowerCase()}. Pet care now happens from Connections.`,
        socialMoment: publicPet ? `${player.name || 'You'} welcomed ${profile.name}, a ${profile.breed} ${profile.species}.` : undefined,
        news: publicPet ? {
            id: `news_pet_${player.age}_${player.currentWeek}_${Date.now()}`,
            headline: profile.rarity === 'endangered'
                ? `${player.name || 'Actor'} funds ${profile.breed} conservation`
                : `${player.name || 'Actor'} welcomes ${profile.name}`,
            subtext: profile.rarity === 'endangered'
                ? `${profile.name} is tied to an accredited sanctuary sponsorship.`
                : `${profile.emoji} ${profile.name} is now part of the household.`,
            category: profile.rarity === 'endangered' || quote.totalCost >= 150_000 ? 'TOP_STORY' : 'YOU',
            week: player.currentWeek,
            year: player.age,
            impactLevel: profile.rarity === 'endangered' ? 'MEDIUM' : 'LOW',
        } : undefined,
        inboxMessage,
        logMessage: `${profile.emoji} ${profile.name} joined Connections as your pet companion.`,
        logType: 'positive',
    };
};

export interface LifestyleFriendEncounter {
    relationship: Relationship;
    headline: string;
    summary: string;
}

const friendFirstNames = ['Aarav', 'Maya', 'Rohan', 'Kiara', 'Dev', 'Zara', 'Kabir', 'Nia', 'Omar', 'Sofia', 'Leo', 'Anika'];
const friendLastNames = ['Mehta', 'Kapoor', 'Rao', 'Stone', 'Chen', 'Miller', 'Shah', 'Khan', 'Reed', 'Hayes'];
const friendBackgrounds = ['assistant director', 'music producer', 'fashion stylist', 'screenwriter', 'photographer', 'startup founder', 'film student', 'club regular', 'charity organizer', 'travel creator'];

const buildSoloFriendEncounter = (
    player: Player,
    activity: LifestyleActivityDefinition,
    selections: LifestyleActivitySelections,
    absoluteWeek: number,
): LifestyleFriendEncounter | undefined => {
    if (selections.inviteId !== 'solo') return undefined;
    if (!['vacation_escape', 'nightlife_takeover', 'charity_gala'].includes(activity.id)) return undefined;
    const seed = `${player.id || player.name}_${player.age}_${player.currentWeek}_${activity.id}_solo_friend`;
    const encounterChance = activity.id === 'nightlife_takeover' ? 0.58 : activity.id === 'vacation_escape' ? 0.36 : 0.28;
    if (stableRoll(seed) > encounterChance) return undefined;
    const gender: Gender = stableRoll(`${seed}_gender`) > 0.5 ? 'FEMALE' : 'MALE';
    const first = friendFirstNames[Math.floor(stableRoll(`${seed}_first`) * friendFirstNames.length)] || friendFirstNames[0];
    const last = friendLastNames[Math.floor(stableRoll(`${seed}_last`) * friendLastNames.length)] || friendLastNames[0];
    const background = friendBackgrounds[Math.floor(stableRoll(`${seed}_background`) * friendBackgrounds.length)] || friendBackgrounds[0];
    const name = `${first} ${last}`;
    const closeness = Math.round(22 + stableRoll(`${seed}_bond`) * 18);
    const relationship: Relationship = {
        id: `friend_encounter_${absoluteWeek}_${activity.id}_${first.toLowerCase()}_${last.toLowerCase()}`,
        name,
        relation: 'Friend',
        closeness,
        image: getGenderedAvatar(gender, name),
        lastInteractionWeek: player.currentWeek,
        lastInteractionAbsolute: absoluteWeek,
        age: Math.max(18, player.age + Math.round((stableRoll(`${seed}_age`) - 0.5) * 10)),
        gender,
    };
    return {
        relationship,
        headline: `You met ${name}`,
        summary: `${name}, a ${background}, had a great conversation with you during ${activity.name.toLowerCase()}. Add them as a friend or let it stay a one-night memory.`,
    };
};

export const resolveLifestyleActivity = (
    player: Player,
    activity: LifestyleActivityDefinition,
    selections: LifestyleActivitySelections
): { success: boolean; player: Player; memory?: LifestyleActivityMemory; message: string; friendEncounter?: LifestyleFriendEncounter } => {
    const quote = buildLifestyleActivityQuote(activity, selections, player);
    if (player.money < quote.totalCost) {
        return { success: false, player, message: 'Not enough cash for this experience.' };
    }

    if (activity.id === 'adoption_center') {
        const eligibility = getAdoptionEligibility(player, quote);
        if (!eligibility.qualifies) {
            return {
                success: false,
                player,
                message: `Adoption application is not ready: ${eligibility.blockers.join(', ')}.`,
            };
        }
    }

    const cooldownWeeks = getLifestyleActivityCooldownWeeks(player, activity.id);
    if (cooldownWeeks > 0) {
        return { success: false, player, message: activity.id === 'vacation_escape' ? 'You already took a trip this week. Try again next week.' : `${activity.name} was done recently. Try again later.` };
    }

    const state = ensureLifestyleActivityState(player.lifestyleActivities);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const nightlifeOutcome = activity.id === 'nightlife_takeover'
        ? buildNightlifeSocialOutcome(player, selections, quote)
        : undefined;
    const wellnessOutcome = activity.category === 'WELLNESS'
        ? buildWellnessRecoveryOutcome(player, selections, quote, activity)
        : undefined;
    const industryOutcome = activity.id === 'industry_dinner'
        ? buildIndustryConnectionsOutcome(player, selections, quote)
        : undefined;
    const charityOutcome = activity.id === 'charity_gala'
        ? buildCharityGalaOutcome(player, selections, quote)
        : undefined;
    const adoptionOutcome = activity.id === 'adoption_center'
        ? buildAdoptionOutcome(player, selections, quote)
        : undefined;
    const petOutcome = activity.id === 'companion_day'
        ? buildPetCompanionOutcome(player, selections, quote)
        : undefined;
    const friendEncounter = buildSoloFriendEncounter(player, activity, selections, absoluteWeek);
    const socialEffects = nightlifeOutcome?.statEffects || wellnessOutcome?.statEffects || industryOutcome?.statEffects || charityOutcome?.statEffects || adoptionOutcome?.statEffects || petOutcome?.statEffects || {};
    const nextStats: Stats = {
        ...player.stats,
        health: clamp(player.stats.health + (quote.statEffects.health || 0) + (socialEffects.health || 0)),
        happiness: clamp(player.stats.happiness + (quote.statEffects.happiness || 0) + (socialEffects.happiness || 0)),
        looks: clamp(player.stats.looks + (quote.statEffects.looks || 0) + (socialEffects.looks || 0)),
        body: clamp(player.stats.body + (quote.statEffects.body || 0) + (socialEffects.body || 0)),
        fame: clamp(player.stats.fame + (quote.statEffects.fame || 0) + (socialEffects.fame || 0)),
        reputation: clamp(player.stats.reputation + (quote.statEffects.reputation || 0) + (socialEffects.reputation || 0)),
        experience: clamp(player.stats.experience + (quote.statEffects.experience || 0) + (socialEffects.experience || 0)),
        talent: clamp(player.stats.talent + (quote.statEffects.talent || 0) + (socialEffects.talent || 0)),
        followers: clampMoney(player.stats.followers + (quote.statEffects.followers || 0) + (socialEffects.followers || 0)),
    };
    const outcomeEffectSummary = nightlifeOutcome?.effectSummary || wellnessOutcome?.effectSummary || industryOutcome?.effectSummary || charityOutcome?.effectSummary || adoptionOutcome?.effectSummary || petOutcome?.effectSummary;
    const effectSummary = outcomeEffectSummary
        ? [...quote.effectSummary, outcomeEffectSummary].slice(0, 6)
        : quote.effectSummary;

    const memory: LifestyleActivityMemory = {
        id: `life_memory_${activity.id}_${absoluteWeek}_${Date.now()}`,
        activityId: activity.id,
        title: nightlifeOutcome?.memoryTitle || wellnessOutcome?.memoryTitle || industryOutcome?.memoryTitle || charityOutcome?.memoryTitle || adoptionOutcome?.memoryTitle || petOutcome?.memoryTitle || activity.name,
        summary: nightlifeOutcome?.memorySummary || wellnessOutcome?.memorySummary || industryOutcome?.memorySummary || charityOutcome?.memorySummary || adoptionOutcome?.memorySummary || petOutcome?.memorySummary || `${quote.selectedLabels.slice(0, 4).join(' • ')} created a ${activity.shortDescription.toLowerCase()}`,
        category: activity.category,
        cost: quote.totalCost,
        risk: quote.risk,
        year: player.age,
        week: player.currentWeek,
        createdAbsoluteWeek: absoluteWeek,
        selections: {
            ...selections,
            extraIds: [...selections.extraIds],
            tripDurationDays: selections.tripDurationDays ? clampTripDays(selections.tripDurationDays) : undefined,
            tripActivityIds: [...(selections.tripActivityIds || [])],
            charityAddonIds: [...(selections.charityAddonIds || [])],
            industryInviteGroupIds: [...(selections.industryInviteGroupIds || [])],
            industryGuestIds: [...(selections.industryGuestIds || [])],
            industryAddonIds: [...(selections.industryAddonIds || [])],
        },
        effectSummary,
        socialMoment: nightlifeOutcome?.socialMoment || wellnessOutcome?.socialMoment || industryOutcome?.socialMoment || charityOutcome?.socialMoment || adoptionOutcome?.socialMoment || petOutcome?.socialMoment,
    };

    const currentYearMemories = state.memories.filter(existingMemory => existingMemory.year === player.age);
    const nextMemories = [memory, ...currentYearMemories].slice(0, 40);
    const nextActivityCounts = {
        ...(state.lifetimeActivityCounts || {}),
        [activity.id]: Math.max(0, Number(state.lifetimeActivityCounts?.[activity.id] || 0)) + 1,
    };
    const nextCategoryCounts = {
        ...(state.lifetimeCategoryCounts || {}),
        [activity.category]: Math.max(0, Number(state.lifetimeCategoryCounts?.[activity.category] || 0)) + 1,
    } as Partial<Record<LifestyleActivityCategory, number>>;
    const transaction: Transaction = {
        id: `tx_lifestyle_${activity.id}_${absoluteWeek}_${Date.now()}`,
        week: player.currentWeek,
        year: player.age,
        amount: -quote.totalCost,
        category: 'EXPENSE',
        description: `Lifestyle: ${activity.name}`,
    };

    const inboxMessages = [wellnessOutcome?.inboxMessage, ...(industryOutcome?.inboxMessages || []), charityOutcome?.inboxMessage, adoptionOutcome?.inboxMessage, petOutcome?.inboxMessage]
        .filter(Boolean) as Message[];
    const newsItems = [nightlifeOutcome?.news, wellnessOutcome?.news, industryOutcome?.news, charityOutcome?.news, adoptionOutcome?.news, petOutcome?.news]
        .filter(Boolean) as NewsItem[];

    let nextPlayer: Player = {
        ...player,
        money: clampMoney(player.money - quote.totalCost),
        stats: nextStats,
        relationships: nightlifeOutcome
            ? upsertNightlifeGuestRelationship(player.relationships || [], nightlifeOutcome.guestChoice, nightlifeOutcome.relationshipDelta, player, absoluteWeek)
            : industryOutcome
                ? upsertIndustryRelationships(player.relationships || [], industryOutcome.guests, player, absoluteWeek, industryOutcome.roomStrength)
                : adoptionOutcome?.child
                ? [adoptionOutcome.child, ...(player.relationships || [])].slice(0, 80)
                : petOutcome?.pet
                    ? [petOutcome.pet, ...(player.relationships || [])].slice(0, 80)
                    : player.relationships,
        finance: {
            ...player.finance,
            history: [transaction, ...(player.finance?.history || [])].slice(0, 200),
        },
        lifestyleActivities: {
            memories: nextMemories,
            cooldowns: {
                ...state.cooldowns,
                [activity.id]: absoluteWeek + activity.cooldownWeeks,
            },
            totalSpent: state.totalSpent + quote.totalCost,
            lifetimeActivityCounts: nextActivityCounts,
            lifetimeCategoryCounts: nextCategoryCounts,
            lifetimeTripDays: (state.lifetimeTripDays || 0) + (activity.id === 'vacation_escape' ? clampTripDays(selections.tripDurationDays) : 0),
            lifetimeCharityGiven: (state.lifetimeCharityGiven || 0) + (activity.id === 'charity_gala' ? (getCharityDonationChoice(selections).flatCost || 0) : 0),
            lifetimeFriendEncounters: (state.lifetimeFriendEncounters || 0) + (friendEncounter ? 1 : 0),
            lifestyleIdentity: getLifestyleIdentity(nextMemories),
            lastActivityWeek: absoluteWeek,
        },
        flags: {
            ...(player.flags || {}),
            ...(wellnessOutcome?.flagUpdates || {}),
            ...(charityOutcome?.flagUpdates || {}),
        },
        activeHealthConditions: wellnessOutcome?.activeHealthConditions || getActiveHealthConditions(player),
        inbox: inboxMessages.length
            ? [...inboxMessages, ...(player.inbox || [])].slice(0, 120)
            : player.inbox,
        news: newsItems.length
            ? [...newsItems, ...(player.news || [])].slice(0, 100)
            : player.news,
        logs: [
            ...(nightlifeOutcome ? [{ week: player.currentWeek, year: player.age, message: nightlifeOutcome.logMessage, type: nightlifeOutcome.logType }] : []),
            ...(wellnessOutcome ? [{ week: player.currentWeek, year: player.age, message: wellnessOutcome.logMessage, type: wellnessOutcome.logType }] : []),
            ...(industryOutcome ? [{ week: player.currentWeek, year: player.age, message: industryOutcome.logMessage, type: industryOutcome.logType }] : []),
            ...(charityOutcome ? [{ week: player.currentWeek, year: player.age, message: charityOutcome.logMessage, type: charityOutcome.logType }] : []),
            ...(adoptionOutcome ? [{ week: player.currentWeek, year: player.age, message: adoptionOutcome.logMessage, type: adoptionOutcome.logType }] : []),
            ...(petOutcome ? [{ week: player.currentWeek, year: player.age, message: petOutcome.logMessage, type: petOutcome.logType }] : []),
            { week: player.currentWeek, year: player.age, message: `Spent $${quote.totalCost.toLocaleString()} on ${activity.name}.`, type: 'neutral' as const },
            ...(player.logs || []),
        ].slice(0, 50),
    };

    if (nightlifeOutcome?.nightlifeHealthCondition) {
        const incident = applyHealthConditionIncident(nextPlayer, nightlifeOutcome.nightlifeHealthCondition, {
            sourceLabel: 'Nightlife Run',
            detail: `${nightlifeOutcome.memoryTitle} created a medical follow-up risk.`,
            publicity: quote.risk >= 55 ? 'PUBLIC_RISK' : 'STANDARD',
        });
        nextPlayer = {
            ...incident.player,
            inbox: [...incident.inbox, ...(incident.player.inbox || [])].slice(0, 120),
            news: [...incident.news, ...(incident.player.news || [])].slice(0, 100),
            logs: [
                ...incident.logs,
                ...(incident.player.logs || []),
            ].slice(0, 50),
        };
    }

    return { success: true, player: nextPlayer, memory, message: `${activity.name} completed.`, friendEncounter };
};
