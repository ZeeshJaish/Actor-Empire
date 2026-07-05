import React, { useState } from 'react';
import {
    ArrowLeft,
    BadgeCheck,
    Baby,
    CalendarDays,
    ChevronRight,
    CheckCircle2,
    ClipboardCheck,
    Edit3,
    FileText,
    Film,
    Handshake,
    Heart,
    HeartPulse,
    Home,
    Landmark,
    Martini,
    PawPrint,
    Plane,
    Search,
    Shield,
    Sparkles,
    Stethoscope,
    UserPlus,
    Users,
    WalletCards,
    type LucideIcon,
} from 'lucide-react';
import {
    LifestyleActivityCategory,
    LifestyleActivityChoice,
    LifestyleActivityDefinition,
    LifestyleActivitySelections,
    GameLanguage,
    HealthConditionState,
    LogEntry,
    Player,
    Relationship,
} from '../../types';
import {
    AdoptionChildProfile,
    buildLifestyleActivityQuote,
    ADOPTION_CHILD_PROFILES,
    ADOPTION_ROUTE_OPTIONS,
    ADOPTION_SUPPORT_OPTIONS,
    COMPANION_ACCESSORY_OPTIONS,
    COMPANION_CATEGORY_OPTIONS,
    COMPANION_CUSTOMIZATION_OPTIONS,
    COMPANION_HOME_OPTIONS,
    COMPANION_STORE_OPTIONS,
    PetCompanionProfile,
    clampTripDays,
    createDefaultLifestyleActivitySelections,
    ensureLifestyleActivityState,
    getAvailableNightlifeGuestOptions,
    getAvailableIndustryGuestOptions,
    getAvailableNightlifeVenueOptions,
    getAvailableCharityFormatOptions,
    getAvailableAdoptionHomePrepOptions,
    getAvailableAdoptionChildOptions,
    getAvailableAdoptionChildProfiles,
    getAvailableInviteOptions,
    getAvailableTripTravelModes,
    getAdoptionPoolCycle,
    getAdoptionChildProfile,
    CHARITY_CAUSE_OPTIONS,
    CHARITY_DONATION_OPTIONS,
    CHARITY_GUEST_CIRCLE_OPTIONS,
    CHARITY_PRESS_OPTIONS,
    getCompanionCareOptionsForPet,
    getCompanionPermitOptionsForPet,
    getFilteredPetCompanionProfiles,
    getPetCompanionCategoryOptions,
    getPetCompanionStore,
    getPetCompanionPoolCycle,
    getPetCompanionProfile,
    getAdoptionEligibility,
    getLifestyleActivityCooldownWeeks,
    getTripActivityOptions,
    getTripCityOptions,
    LIFESTYLE_ACTIVITY_CATALOG,
    INDUSTRY_ADDON_OPTIONS,
    INDUSTRY_EVENT_OPTIONS,
    getAvailableIndustryVenueOptions,
    INDUSTRY_HOSTING_STYLE_OPTIONS,
    INDUSTRY_INVITE_GROUP_OPTIONS,
    INDUSTRY_SERVICE_OPTIONS,
    NIGHTLIFE_CONTROL_OPTIONS,
    NIGHTLIFE_CROWD_OPTIONS,
    NIGHTLIFE_TYPE_OPTIONS,
    resolveLifestyleActivity,
    LifestyleFriendEncounter,
    TRIP_DESTINATION_OPTIONS,
    TRIP_MAX_DAYS,
    TRIP_MIN_DAYS,
    TRIP_STAY_OPTIONS,
    WELLNESS_FOCUS_OPTIONS,
    WELLNESS_PROGRAM_OPTIONS,
    WELLNESS_PROVIDER_OPTIONS,
    WELLNESS_SUPPORT_OPTIONS,
} from '../../services/lifestyleActivities';
import { getHealthConditionLabel, getHealthConditionTreatmentTags } from '../../services/healthConditions';
import { getPlayerLanguage, t } from '../../services/i18n';
import { getGenderedAvatar } from '../../services/npcLogic';

interface LifestyleActivitiesProps {
    player: Player;
    onBack: () => void;
    onUpdatePlayer?: (player: Player) => void;
}

type CategoryFilter = 'ALL' | LifestyleActivityCategory;
type PetStage = 'brief' | 'stores' | 'categories' | 'pets' | 'checkout';

const ActivityLanguageContext = React.createContext<GameLanguage>('en');

const getChoiceLabel = (choice: LifestyleActivityChoice, language: GameLanguage) => (
    choice.labelKey ? t(language, choice.labelKey) : choice.label
);

const getChoiceDescription = (choice: LifestyleActivityChoice, language: GameLanguage) => (
    choice.descriptionKey ? t(language, choice.descriptionKey) : choice.description
);

const getActivityName = (activity: LifestyleActivityDefinition, language: GameLanguage) => (
    t(language, `services.lifestyle.activity.${activity.id}.name`)
);

const getActivityShortDescription = (activity: LifestyleActivityDefinition, language: GameLanguage) => {
    const key = `services.lifestyle.activity.${activity.id}.shortDescription`;
    const translated = t(language, key);
    return translated === key ? activity.shortDescription : translated;
};

const getActivityLongDescription = (activity: LifestyleActivityDefinition, language: GameLanguage) => {
    const key = `services.lifestyle.activity.${activity.id}.longDescription`;
    const translated = t(language, key);
    return translated === key ? activity.longDescription : translated;
};

const getAdoptionProfilePersonality = (profile: AdoptionChildProfile, language: GameLanguage) => (
    profile.personalityKey ? t(language, profile.personalityKey) : profile.personality
);

const getAdoptionProfileNeeds = (profile: AdoptionChildProfile, language: GameLanguage) => (
    profile.needsKey ? t(language, profile.needsKey) : profile.needs
);

const getAdoptionAgeLabel = (profile: AdoptionChildProfile, language: GameLanguage) => (
    profile.age === 0
        ? t(language, 'services.lifestyle.adoption.age.infant')
        : t(language, 'services.lifestyle.adoption.age.yearsOld', { age: profile.age })
);

const getPetStoreName = (store: ReturnType<typeof getPetCompanionStore>, language: GameLanguage) => (
    store.nameKey ? t(language, store.nameKey) : store.name
);

const getPetStoreDescription = (store: ReturnType<typeof getPetCompanionStore>, language: GameLanguage) => (
    store.descriptionKey ? t(language, store.descriptionKey) : store.description
);

const getPetStorePriceTone = (store: ReturnType<typeof getPetCompanionStore>, language: GameLanguage) => (
    store.priceToneKey ? t(language, store.priceToneKey) : store.priceTone
);

const getPetProfileSpecies = (profile: PetCompanionProfile, language: GameLanguage) => (
    profile.speciesKey ? t(language, profile.speciesKey) : profile.species
);

const getPetProfileBreed = (profile: PetCompanionProfile, language: GameLanguage) => (
    profile.breedKey ? t(language, profile.breedKey) : profile.breed
);

const getPetProfileListingTitle = (profile: PetCompanionProfile, language: GameLanguage) => (
    profile.listingTitleKey ? t(language, profile.listingTitleKey) : (profile.listingTitle || `${getPetProfileBreed(profile, language)} ${getPetProfileSpecies(profile, language)}`)
);

const getPetProfilePersonality = (profile: PetCompanionProfile, language: GameLanguage) => (
    profile.personalityKey ? t(language, profile.personalityKey) : profile.personality
);

const getPetProfileCareNeeds = (profile: PetCompanionProfile, language: GameLanguage) => (
    profile.careNeedsKey ? t(language, profile.careNeedsKey) : profile.careNeeds
);

const getPetProfileLegalNote = (profile: PetCompanionProfile, language: GameLanguage) => (
    profile.legalNoteKey ? t(language, profile.legalNoteKey) : profile.legalNote
);

type ActivityResultState = {
    activityName: string;
    message: string;
    memory?: ReturnType<typeof resolveLifestyleActivity>['memory'];
    totalCost: number;
    risk: number;
    effectSummary: string[];
    friendEncounter?: LifestyleFriendEncounter;
    playerAfter: Player;
};

const categoryMeta: Record<LifestyleActivityCategory, { labelKey: Parameters<typeof t>[1]; icon: LucideIcon; accent: string; bg: string }> = {
    TRAVEL: { labelKey: 'activities.category.TRAVEL', icon: Plane, accent: 'text-sky-300', bg: 'bg-sky-500/10 border-sky-500/30' },
    NIGHTLIFE: { labelKey: 'activities.category.NIGHTLIFE', icon: Martini, accent: 'text-fuchsia-300', bg: 'bg-fuchsia-500/10 border-fuchsia-500/30' },
    FAMILY: { labelKey: 'activities.category.FAMILY', icon: Heart, accent: 'text-rose-300', bg: 'bg-rose-500/10 border-rose-500/30' },
    WELLNESS: { labelKey: 'activities.category.WELLNESS', icon: Stethoscope, accent: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    IMAGE: { labelKey: 'activities.category.IMAGE', icon: Handshake, accent: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/30' },
    LEGACY: { labelKey: 'activities.category.LEGACY', icon: Landmark, accent: 'text-yellow-300', bg: 'bg-yellow-500/10 border-yellow-500/30' },
    COMPANION: { labelKey: 'activities.category.COMPANION', icon: PawPrint, accent: 'text-lime-300', bg: 'bg-lime-500/10 border-lime-500/30' },
};

const categoryFilters: { id: CategoryFilter; labelKey: Parameters<typeof t>[1] }[] = [
    { id: 'ALL', labelKey: 'activities.category.ALL' },
    { id: 'TRAVEL', labelKey: 'activities.category.TRAVEL' },
    { id: 'NIGHTLIFE', labelKey: 'activities.category.NIGHTLIFE' },
    { id: 'FAMILY', labelKey: 'activities.category.FAMILY' },
    { id: 'WELLNESS', labelKey: 'activities.category.WELLNESS' },
    { id: 'IMAGE', labelKey: 'activities.category.IMAGE' },
    { id: 'LEGACY', labelKey: 'activities.category.LEGACY' },
    { id: 'COMPANION', labelKey: 'activities.category.COMPANION' },
];

const activityIconOverrides: Record<string, LucideIcon> = {
    wellness_reset: HeartPulse,
    adoption_center: Baby,
    industry_dinner: Film,
};

const getActivityVisual = (activity: LifestyleActivityDefinition) => {
    const meta = categoryMeta[activity.category];
    return {
        ...meta,
        icon: activityIconOverrides[activity.id] || meta.icon,
    };
};

const formatMoney = (amount: number) => {
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(amount >= 10_000 ? 0 : 1)}k`;
    return `$${amount.toLocaleString()}`;
};

const getRiskTone = (risk: number) => {
    if (risk >= 55) return 'text-rose-300';
    if (risk >= 25) return 'text-yellow-300';
    return 'text-emerald-300';
};

const formatStat = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    return Math.round(Math.max(0, Math.min(100, safeValue))).toString();
};

const formatChoiceCost = (choice: LifestyleActivityChoice) => {
    const labels: string[] = [];
    if (choice.costMultiplier && Math.abs(choice.costMultiplier - 1) > 0.01) {
        const rate = Math.round((choice.costMultiplier - 1) * 100);
        labels.push(rate > 0 ? `+${rate}% rate` : `${rate}% rate`);
    }
    if (choice.flatCost) labels.push(`+${formatMoney(choice.flatCost)}`);
    return labels.join(' ');
};

const getChoiceRateTone = (choice: LifestyleActivityChoice) => {
    const rate = Math.round(((choice.costMultiplier || 1) - 1) * 100);
    if (rate >= 75 || (choice.flatCost || 0) >= 10_000) return 'border-amber-400/50 bg-amber-400/10 text-amber-200';
    if (rate > 0 || (choice.flatCost || 0) > 0) return 'border-sky-400/40 bg-sky-400/10 text-sky-200';
    if (rate < 0) return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200';
    return 'border-zinc-700 bg-black/40 text-zinc-400';
};

const visualThemes = [
    'from-sky-500 via-cyan-300 to-emerald-300',
    'from-amber-400 via-orange-300 to-rose-400',
    'from-indigo-400 via-fuchsia-300 to-rose-300',
    'from-emerald-400 via-lime-200 to-yellow-200',
    'from-cyan-300 via-blue-400 to-violet-400',
    'from-rose-300 via-amber-200 to-sky-300',
];

const getVisualTheme = (seed = '') => {
    const index = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % visualThemes.length;
    return visualThemes[index];
};

const getDestinationInitials = (label = '') => label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

const ChoiceCostChip: React.FC<{ choice: LifestyleActivityChoice; className?: string }> = ({ choice, className = '' }) => {
    const label = formatChoiceCost(choice);
    if (!label) return null;
    return (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${getChoiceRateTone(choice)} ${className}`}>
            {label}
        </span>
    );
};

const OptionGroup: React.FC<{
    title: string;
    choices: LifestyleActivityChoice[];
    selectedId?: string;
    selectedIds?: string[];
    onSelect: (id: string) => void;
    multi?: boolean;
}> = ({ title, choices, selectedId, selectedIds = [], onSelect, multi = false }) => {
    const language = React.useContext(ActivityLanguageContext);

    return (
        <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">{title}</div>
            <div className="grid grid-cols-2 gap-2">
                {choices.map(choice => {
                    const isSelected = multi ? selectedIds.includes(choice.id) : selectedId === choice.id;
                    return (
                        <button
                            key={choice.id}
                            onClick={() => onSelect(choice.id)}
                            className={`min-h-[76px] rounded-2xl border p-3 text-left transition-all ${isSelected ? 'border-emerald-400 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.12)]' : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-600'}`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="text-sm font-black leading-tight text-white">{getChoiceLabel(choice, language)}</div>
                                    <ChoiceCostChip choice={choice} className="mt-2" />
                                </div>
                                {isSelected && <BadgeCheck size={16} className="shrink-0 text-emerald-300" />}
                            </div>
                            <div className="mt-1 text-[11px] leading-snug text-zinc-500">{getChoiceDescription(choice, language)}</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const CompactOptionRail: React.FC<{
    title?: string;
    choices: LifestyleActivityChoice[];
    selectedId?: string;
    selectedIds?: string[];
    onSelect: (id: string) => void;
    multi?: boolean;
    tone?: 'default' | 'nightlife' | 'industry';
    density?: 'compact' | 'roomy';
}> = ({ title, choices, selectedId, selectedIds = [], onSelect, multi = false, tone = 'default', density = 'compact' }) => {
    const language = React.useContext(ActivityLanguageContext);

    return (
        <div className="space-y-2">
            {title && <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">{title}</div>}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 custom-scrollbar">
                {choices.map(choice => {
                    const isSelected = multi ? selectedIds.includes(choice.id) : selectedId === choice.id;
                    const selectedClass = tone === 'nightlife'
                        ? 'border-fuchsia-300 bg-fuchsia-500/15 shadow-[0_0_22px_rgba(217,70,239,0.16)]'
                        : tone === 'industry'
                            ? 'border-amber-300 bg-amber-400/15 shadow-[0_0_22px_rgba(251,191,36,0.14)]'
                        : 'border-emerald-400 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.14)]';
                    return (
                        <button
                            key={choice.id}
                            onClick={() => onSelect(choice.id)}
                            className={`${density === 'roomy' ? 'min-h-[124px] w-[242px] p-4' : 'min-h-[82px] w-[176px] p-3'} shrink-0 rounded-2xl border text-left transition-all ${isSelected ? selectedClass : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-600'}`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className={`${density === 'roomy' ? 'line-clamp-2 text-base leading-tight' : 'truncate text-sm'} font-black text-white`}>{getChoiceLabel(choice, language)}</div>
                                    <ChoiceCostChip choice={choice} className="mt-2" />
                                </div>
                                {isSelected && <BadgeCheck size={16} className={`shrink-0 ${tone === 'nightlife' ? 'text-fuchsia-200' : tone === 'industry' ? 'text-amber-200' : 'text-emerald-300'}`} />}
                            </div>
                            <div className={`mt-2 ${density === 'roomy' ? 'text-xs font-bold leading-relaxed' : 'line-clamp-2 text-[11px] leading-snug'} text-zinc-500`}>{getChoiceDescription(choice, language)}</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const CountryPicker: React.FC<{
    countries: LifestyleActivityChoice[];
    selectedId?: string;
    onSelect: (id: string) => void;
}> = ({ countries, selectedId, onSelect }) => {
    const language = React.useContext(ActivityLanguageContext);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Country</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Swipe</div>
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 custom-scrollbar">
                {countries.map(country => {
                    const isSelected = selectedId === country.id;
                    return (
                        <button
                            key={country.id}
                            onClick={() => onSelect(country.id)}
                            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition-all ${isSelected ? 'border-emerald-300 bg-emerald-400 text-black' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}
                        >
                            {getChoiceLabel(country, language)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const CityPostcardRail: React.FC<{
    country?: LifestyleActivityChoice;
    cities: LifestyleActivityChoice[];
    selectedId?: string;
    onSelect: (id: string) => void;
}> = ({ country, cities, selectedId, onSelect }) => {
    const language = React.useContext(ActivityLanguageContext);
    const countryLabel = country ? getChoiceLabel(country, language) : undefined;

    return (
        <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">City</div>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 custom-scrollbar">
                {cities.map(city => {
                    const isSelected = selectedId === city.id;
                    const cityLabel = getChoiceLabel(city, language);
                    const cityDescription = getChoiceDescription(city, language);
                    const initials = getDestinationInitials(cityLabel);
                    return (
                        <button
                            key={city.id}
                            onClick={() => onSelect(city.id)}
                            className={`relative h-36 w-56 shrink-0 overflow-hidden rounded-3xl border text-left transition-all ${isSelected ? 'border-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.22)]' : 'border-zinc-800 opacity-80 hover:opacity-100'}`}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${getVisualTheme(city.id)} opacity-95`} />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.36),transparent_25%),radial-gradient(circle_at_88%_12%,rgba(255,255,255,0.2),transparent_22%),linear-gradient(to_top,rgba(0,0,0,0.84),rgba(0,0,0,0.12)_62%,rgba(255,255,255,0.08))]" />
                            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border border-white/25 bg-white/10 blur-[1px]" />
                            <div className="absolute -bottom-10 -left-8 h-24 w-40 rounded-full bg-black/25 blur-xl" />
                            <div className="absolute bottom-4 right-4 text-5xl font-black tracking-tighter text-white/10">{initials}</div>
                            <div className="relative flex h-full flex-col justify-between p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <ChoiceCostChip choice={city} className="bg-black/35 text-white" />
                                    {isSelected && <BadgeCheck size={18} className="text-white drop-shadow" />}
                                </div>
                                <div>
                                    <div className="text-xl font-black leading-tight text-white drop-shadow">{cityLabel}</div>
                                    <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.24em] text-white/55">{countryLabel}</div>
                                    <div className="mt-1 line-clamp-2 text-[11px] font-bold leading-snug text-white/75">{cityDescription}</div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const TripPreviewCard: React.FC<{
    country?: LifestyleActivityChoice;
    city?: LifestyleActivityChoice;
    days: number;
    stay?: LifestyleActivityChoice;
    travel?: LifestyleActivityChoice;
    totalCost: number;
}> = ({ country, city, days, stay, travel, totalCost }) => {
    const language = React.useContext(ActivityLanguageContext);
    const cityLabel = city ? getChoiceLabel(city, language) : t(language, 'activities.tripPreview.pickCity');
    const cityInitials = city ? getDestinationInitials(cityLabel) : '';
    const travelChips = [stay, travel].filter((choice): choice is LifestyleActivityChoice => Boolean(choice));

    return (
        <div className="relative overflow-hidden rounded-[2rem] border border-emerald-400/30 bg-zinc-950 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
            <div className={`absolute inset-0 bg-gradient-to-br ${getVisualTheme(`${country?.id}-${city?.id}`)} opacity-80`} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.35),transparent_24%),radial-gradient(circle_at_88%_10%,rgba(255,255,255,0.18),transparent_22%),linear-gradient(to_top,rgba(0,0,0,0.88),rgba(0,0,0,0.18)_64%,rgba(255,255,255,0.08))]" />
            <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full border border-white/25 bg-white/10" />
            <div className="absolute -bottom-14 -left-10 h-32 w-56 rounded-full bg-black/25 blur-2xl" />
            <div className="absolute bottom-8 right-8 text-7xl font-black tracking-tighter text-white/10">{cityInitials}</div>
            <div className="relative p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">{t(language, 'activities.tripPreview.title')}</div>
                        <div className="mt-8 text-3xl font-black leading-none text-white drop-shadow">{cityLabel}</div>
                        <div className="mt-2 text-xs font-black uppercase tracking-[0.24em] text-white/75">
                            {t(language, 'activities.tripPreview.destinationDays', {
                                destination: country ? getChoiceLabel(country, language) : t(language, 'activities.tripPreview.destination'),
                                days,
                            })}
                        </div>
                    </div>
                    <div className="rounded-2xl bg-black/45 px-4 py-3 text-right backdrop-blur">
                        <div className="text-[9px] font-black uppercase tracking-widest text-emerald-200">{t(language, 'activities.tripPreview.cost')}</div>
                        <div className="text-xl font-black text-white">{formatMoney(totalCost)}</div>
                    </div>
                </div>
                <div className="mt-10 flex flex-wrap gap-2">
                    {travelChips.map(choice => (
                        <span key={choice.id} className="rounded-full bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/85 backdrop-blur">
                            {getChoiceLabel(choice, language)}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

const NightlifePreviewCard: React.FC<{
    eventType?: LifestyleActivityChoice;
    venue?: LifestyleActivityChoice;
    guest?: LifestyleActivityChoice;
    crowd?: LifestyleActivityChoice;
    control?: LifestyleActivityChoice;
    totalCost: number;
    risk: number;
}> = ({ eventType, venue, guest, crowd, control, totalCost, risk }) => {
    const language = React.useContext(ActivityLanguageContext);
    const guestLabel = guest ? getChoiceLabel(guest, language) : t(language, 'activities.nightlifePreview.guest');
    const guestText = guest?.id === 'no_guest'
        ? t(language, 'activities.nightlifePreview.noHeadlineGuest')
        : t(language, 'activities.nightlifePreview.guestInvited', { guest: guestLabel });
    const reliability = guest?.id === 'global_heartthrob'
        ? t(language, 'activities.nightlifePreview.reliability.volatileRsvp')
        : guest?.id === 'chart_star'
            ? t(language, 'activities.nightlifePreview.reliability.busySchedule')
            : guest?.id === 'no_guest'
                ? t(language, 'activities.nightlifePreview.reliability.noRsvpRisk')
                : t(language, 'activities.nightlifePreview.reliability.likelyArrival');
    const chips = [crowd, control].filter((choice): choice is LifestyleActivityChoice => Boolean(choice));
    return (
        <div className="relative overflow-hidden rounded-[2rem] border border-fuchsia-300/30 bg-zinc-950 shadow-[0_20px_70px_rgba(0,0,0,0.38)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(217,70,239,0.42),transparent_26%),radial-gradient(circle_at_88%_12%,rgba(245,158,11,0.26),transparent_24%),linear-gradient(135deg,rgba(88,28,135,0.8),rgba(9,9,11,0.94)_48%,rgba(112,26,117,0.58))]" />
            <div className="absolute -right-10 top-8 h-32 w-32 rounded-full border border-fuchsia-200/25 bg-fuchsia-300/10 blur-[2px]" />
            <div className="absolute bottom-5 right-6 text-6xl font-black tracking-tighter text-white/5">NITE</div>
            <div className="relative p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-100/75">{t(language, 'activities.nightlifePreview.title')}</div>
                        <div className="mt-5 text-3xl font-black leading-none text-white drop-shadow">{eventType ? getChoiceLabel(eventType, language) : t(language, 'activities.nightlifePreview.fallbackTitle')}</div>
                        <div className="mt-2 text-xs font-black uppercase tracking-[0.22em] text-white/65">{venue ? getChoiceLabel(venue, language) : t(language, 'activities.nightlifePreview.venue')} • {guestText}</div>
                    </div>
                    <div className="rounded-2xl bg-black/45 px-4 py-3 text-right backdrop-blur">
                        <div className="text-[9px] font-black uppercase tracking-widest text-fuchsia-100">{t(language, 'activities.nightlifePreview.cost')}</div>
                        <div className="text-xl font-black text-white">{formatMoney(totalCost)}</div>
                    </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-black/40 p-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.nightlifePreview.guestRead')}</div>
                        <div className="mt-1 text-sm font-black text-fuchsia-100">{reliability}</div>
                    </div>
                    <div className="rounded-2xl bg-black/40 p-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.nightlifePreview.imageRisk')}</div>
                        <div className={`mt-1 text-sm font-black ${getRiskTone(risk)}`}>{risk}%</div>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {chips.map(choice => (
                        <span key={choice.id} className="rounded-full bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/85 backdrop-blur">
                            {getChoiceLabel(choice, language)}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

const IndustryConnectionsPreviewCard: React.FC<{
    event?: LifestyleActivityChoice;
    venue?: LifestyleActivityChoice;
    groups: LifestyleActivityChoice[];
    guests: LifestyleActivityChoice[];
    style?: LifestyleActivityChoice;
    service?: LifestyleActivityChoice;
    totalCost: number;
    risk: number;
}> = ({ event, venue, groups, guests, style, service, totalCost, risk }) => {
    const language = React.useContext(ActivityLanguageContext);
    const inviteCount = groups.length + guests.length;
    const signal = totalCost >= 500_000
        ? t(language, 'activities.industryPreview.signal.power')
        : totalCost >= 200_000
            ? t(language, 'activities.industryPreview.signal.serious')
            : t(language, 'activities.industryPreview.signal.selective');
    return (
        <div className="relative overflow-hidden rounded-[2rem] border border-amber-300/25 bg-zinc-950 shadow-[0_20px_70px_rgba(0,0,0,0.38)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(251,191,36,0.35),transparent_24%),radial-gradient(circle_at_85%_18%,rgba(56,189,248,0.18),transparent_24%),linear-gradient(135deg,rgba(69,26,3,0.78),rgba(9,9,11,0.96)_54%,rgba(12,74,110,0.24))]" />
            <div className="absolute -right-12 -top-10 h-36 w-36 rounded-full border border-amber-200/20 bg-amber-300/8 blur-[2px]" />
            <div className="absolute bottom-5 right-6 text-6xl font-black tracking-tighter text-white/5">ROOM</div>
            <div className="relative p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-amber-100/75">
                            <Sparkles size={13} />
                            {t(language, 'activities.industryPreview.title')}
                        </div>
                        <div className="mt-5 text-3xl font-black leading-none text-white drop-shadow">{event ? getChoiceLabel(event, language) : t(language, 'activities.industryPreview.fallbackTitle')}</div>
                        <div className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-white/65">{venue ? getChoiceLabel(venue, language) : t(language, 'activities.industryPreview.venue')} • {style ? getChoiceLabel(style, language) : t(language, 'activities.industryPreview.hostingStyle')}</div>
                    </div>
                    <div className="rounded-2xl bg-black/45 px-4 py-3 text-right backdrop-blur">
                        <div className="text-[9px] font-black uppercase tracking-widest text-amber-100">{t(language, 'activities.industryPreview.cost')}</div>
                        <div className="text-xl font-black text-white">{formatMoney(totalCost)}</div>
                    </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-black/40 p-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.industryPreview.inviteSignal')}</div>
                        <div className="mt-1 text-sm font-black text-amber-100">{t(language, 'activities.industryPreview.targets', { count: inviteCount || 0 })}</div>
                    </div>
                    <div className="rounded-2xl bg-black/40 p-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.industryPreview.roomRead')}</div>
                        <div className="mt-1 text-sm font-black text-sky-100">{signal}</div>
                    </div>
                    <div className="rounded-2xl bg-black/40 p-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.industryPreview.service')}</div>
                        <div className="mt-1 text-sm font-black text-white">{service ? getChoiceLabel(service, language) : t(language, 'activities.industryPreview.service')}</div>
                    </div>
                    <div className="rounded-2xl bg-black/40 p-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.industryPreview.socialRisk')}</div>
                        <div className={`mt-1 text-sm font-black ${getRiskTone(risk)}`}>{risk}%</div>
                    </div>
                </div>
                <div className="mt-3 rounded-2xl border border-amber-200/15 bg-black/30 p-3">
                    <div className="flex items-start gap-2">
                        <Handshake size={16} className="mt-0.5 shrink-0 text-amber-200" />
                        <p className="text-xs font-bold leading-relaxed text-zinc-300">
                            {t(language, 'activities.industryPreview.inviteNote')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CharityGalaPreviewCard: React.FC<{
    cause?: LifestyleActivityChoice;
    format?: LifestyleActivityChoice;
    donation?: LifestyleActivityChoice;
    guestCircle?: LifestyleActivityChoice;
    press?: LifestyleActivityChoice;
    totalCost: number;
    risk: number;
}> = ({ cause, format, donation, guestCircle, press, totalCost, risk }) => {
    const language = React.useContext(ActivityLanguageContext);
    const donationAmount = donation?.flatCost || 0;
    const hasProof = press?.id === 'quiet_receipts' || donationAmount >= 350_000 || ['college_scholarships', 'campus_building_fund', 'medical_relief', 'film_workers_fund'].includes(cause?.id || '');
    const taxStructured = donationAmount >= 1_000_000;
    const educationGift = ['children_education', 'college_scholarships', 'campus_building_fund', 'film_school_endowment'].includes(cause?.id || '');
    const namedBuilding = educationGift && (cause?.id === 'campus_building_fund' || donation?.id === 'named_wing_grant' || donation?.id === 'legacy_endowment' || donationAmount >= 2_500_000);
    const taxShield = Math.round((donation?.flatCost || 0) * (taxStructured ? 0.29 : 0.18));
    const posture = press?.id === 'quiet_receipts'
        ? t(language, 'activities.charityPreview.posture.trustFirst')
        : press?.id === 'red_carpet_cause' || press?.id === 'viral_challenge'
            ? t(language, 'activities.charityPreview.posture.highVisibility')
            : t(language, 'activities.charityPreview.posture.controlled');
    return (
        <div className="overflow-hidden rounded-[2rem] border border-yellow-300/25 bg-[linear-gradient(135deg,rgba(113,63,18,0.42),rgba(9,9,11,0.96)_55%,rgba(22,78,99,0.22))] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.38)]">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-yellow-200/30 bg-yellow-300/10 text-yellow-100">
                        <Landmark size={23} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-100/70">{t(language, 'activities.charityPreview.title')}</div>
                        <div className="mt-1 text-2xl font-black leading-tight text-white">{cause ? getChoiceLabel(cause, language) : t(language, 'activities.charityPreview.chooseCause')}</div>
                        <div className="mt-1 text-xs font-bold text-zinc-400">{format ? getChoiceLabel(format, language) : t(language, 'activities.charityPreview.format')} • {donation ? getChoiceLabel(donation, language) : t(language, 'activities.charityPreview.donation')}</div>
                    </div>
                </div>
                <div className="shrink-0 rounded-2xl bg-black/35 px-3 py-2 text-right">
                    <div className="text-[9px] font-black uppercase tracking-widest text-yellow-100/70">{t(language, 'activities.charityPreview.cost')}</div>
                    <div className="text-lg font-black text-white">{formatMoney(totalCost)}</div>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-black/30 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.charityPreview.publicRead')}</div>
                    <div className="mt-1 text-sm font-black text-yellow-100">{posture}</div>
                </div>
                <div className="rounded-2xl bg-black/30 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.charityPreview.proof')}</div>
                    <div className={`mt-1 text-sm font-black ${hasProof ? 'text-emerald-200' : 'text-amber-200'}`}>{hasProof ? t(language, 'activities.charityPreview.proof.credible') : t(language, 'activities.charityPreview.proof.needsProof')}</div>
                </div>
                <div className="rounded-2xl bg-black/30 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.charityPreview.guestCircle')}</div>
                    <div className="mt-1 text-sm font-black text-white">{guestCircle ? getChoiceLabel(guestCircle, language) : t(language, 'activities.charityPreview.guests')}</div>
                </div>
                <div className="rounded-2xl bg-black/30 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.charityPreview.taxShield')}</div>
                    <div className="mt-1 text-sm font-black text-cyan-100">{formatMoney(taxShield)}</div>
                </div>
                <div className="rounded-2xl bg-black/30 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.charityPreview.imageCleanup')}</div>
                    <div className="mt-1 text-sm font-black text-emerald-200">{hasProof ? t(language, 'activities.charityPreview.cleanup.strong') : t(language, 'activities.charityPreview.cleanup.medium')}</div>
                </div>
                <div className="rounded-2xl bg-black/30 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.charityPreview.opticsRisk')}</div>
                    <div className={`mt-1 text-sm font-black ${getRiskTone(risk)}`}>{risk}%</div>
                </div>
            </div>
            <p className="mt-3 text-sm font-bold leading-relaxed text-zinc-400">
                {namedBuilding
                    ? t(language, 'activities.charityPreview.summary.namedBuilding')
                    : t(language, 'activities.charityPreview.summary.generic')}
            </p>
        </div>
    );
};

const WellnessPreviewCard: React.FC<{
    program?: LifestyleActivityChoice;
    provider?: LifestyleActivityChoice;
    focus?: LifestyleActivityChoice;
    support?: LifestyleActivityChoice;
    activeCondition?: HealthConditionState;
    language: GameLanguage;
    treatmentMatch: string;
    totalCost: number;
    risk: number;
    health: number;
    mood: number;
}> = ({ program, provider, focus, support, activeCondition, language, treatmentMatch, totalCost, risk, health, mood }) => {
    const careTone = program?.id === 'cancer_screening' || program?.id === 'addiction_rehab'
        ? 'border-rose-300/30 bg-rose-500/10 text-rose-100'
        : program?.id === 'camera_ready_care'
            ? 'border-sky-300/30 bg-sky-500/10 text-sky-100'
            : 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100';
    const careLabel = program?.id === 'camera_ready_care'
        ? t(language, 'activities.wellnessPreview.care.looks')
        : program?.id === 'regular_checkup'
            ? t(language, 'activities.wellnessPreview.care.preventive')
            : t(language, 'activities.wellnessPreview.care.medical');
    return (
        <div className="overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(6,78,59,0.34),rgba(9,9,11,0.96)_56%,rgba(8,47,73,0.34))] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.36)]">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${careTone}`}>
                        <Stethoscope size={22} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-100/70">{careLabel}</div>
                        <div className="mt-1 text-2xl font-black leading-tight text-white">{program ? getChoiceLabel(program, language) : t(language, 'activities.wellnessPreview.carePlan')}</div>
                        <div className="mt-1 text-xs font-bold text-zinc-400">{provider ? getChoiceLabel(provider, language) : t(language, 'activities.wellnessPreview.provider')} • {focus ? getChoiceLabel(focus, language) : t(language, 'activities.wellnessPreview.treatment')}</div>
                    </div>
                </div>
                <div className="shrink-0 rounded-2xl bg-black/35 px-3 py-2 text-right">
                    <div className="text-[9px] font-black uppercase tracking-widest text-cyan-100/70">{t(language, 'activities.wellnessPreview.cost')}</div>
                    <div className="text-lg font-black text-white">{formatMoney(totalCost)}</div>
                </div>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-500">
                    {activeCondition ? t(language, 'activities.wellnessPreview.activeIssue') : t(language, 'activities.wellnessPreview.carePath')}
                </div>
                {activeCondition && (
                    <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-sm font-black text-white">{getHealthConditionLabel(activeCondition, language)}</div>
                                <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-rose-100/70">{activeCondition.severity} • {activeCondition.source}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.wellnessPreview.healthCap')}</div>
                                <div className="text-lg font-black text-rose-100">{activeCondition.healthCap}</div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-black/35 p-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.wellnessPreview.treatmentMatch')}</div>
                        <div className="mt-1 text-sm font-black text-cyan-100">{treatmentMatch}</div>
                    </div>
                    <div className="rounded-2xl bg-black/35 p-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.wellnessPreview.aftercare')}</div>
                        <div className="mt-1 text-sm font-black text-white">{support ? getChoiceLabel(support, language) : t(language, 'activities.wellnessPreview.followUp')}</div>
                    </div>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-black/30 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.wellnessPreview.health')}</div>
                    <div className="mt-1 text-lg font-black text-emerald-200">{formatStat(health)}</div>
                </div>
                <div className="rounded-2xl bg-black/30 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.wellnessPreview.mood')}</div>
                    <div className="mt-1 text-lg font-black text-yellow-200">{formatStat(mood)}</div>
                </div>
                <div className="rounded-2xl bg-black/30 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.wellnessPreview.risk')}</div>
                    <div className={`mt-1 text-lg font-black ${getRiskTone(risk)}`}>{risk}%</div>
                </div>
            </div>
        </div>
    );
};

type AdoptionStage = 'eligibility' | 'children' | 'paperwork';

const AdoptionStagePills: React.FC<{ stage: AdoptionStage; onStage: (stage: AdoptionStage) => void; canViewChildren: boolean; hasChild: boolean }> = ({ stage, onStage, canViewChildren, hasChild }) => {
    const language = React.useContext(ActivityLanguageContext);
    const stages: { id: AdoptionStage; label: string }[] = [
        { id: 'eligibility', label: t(language, 'activities.adoption.stage.criteria') },
        { id: 'children', label: t(language, 'activities.adoption.stage.children') },
        { id: 'paperwork', label: t(language, 'activities.adoption.stage.docs') },
    ];
    return (
        <div className="grid grid-cols-3 gap-2">
            {stages.map(item => {
                const locked = item.id === 'children' ? !canViewChildren : item.id === 'paperwork' ? !canViewChildren || !hasChild : false;
                return (
                    <button
                        key={item.id}
                        type="button"
                        disabled={locked}
                        onClick={() => onStage(item.id)}
                        className={`rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition disabled:opacity-35 ${stage === item.id ? 'border-rose-200/70 bg-rose-300/18 text-rose-50' : 'border-zinc-800 bg-black/35 text-zinc-500'}`}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
};

const AdoptionEligibilityCard: React.FC<{
    eligibility: ReturnType<typeof getAdoptionEligibility>;
    availableCount: number;
}> = ({ eligibility, availableCount }) => {
    const language = React.useContext(ActivityLanguageContext);
    return (
        <div className="overflow-hidden rounded-[2rem] border border-rose-300/20 bg-[linear-gradient(135deg,rgba(86,18,55,0.36),rgba(9,9,11,0.96)_58%,rgba(55,36,12,0.28))] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.36)]">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${eligibility.qualifies ? 'border-emerald-300/40 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/40 bg-amber-400/10 text-amber-200'}`}>
                        <ClipboardCheck size={23} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-rose-100/70">{t(language, 'activities.adoption.eligibility.title')}</div>
                        <div className="mt-1 text-2xl font-black leading-tight text-white">{eligibility.statusLabel}</div>
                        <div className="mt-1 text-xs font-bold text-zinc-400">{t(language, 'activities.adoption.eligibility.availableProfiles', { count: availableCount })}</div>
                    </div>
                </div>
                <div className="shrink-0 rounded-2xl bg-black/35 px-3 py-2 text-right">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.adoption.eligibility.readiness')}</div>
                    <div className={`text-lg font-black ${eligibility.qualifies ? 'text-emerald-200' : 'text-amber-200'}`}>{eligibility.score}%</div>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2">
                {eligibility.checks.map(check => (
                    <div key={check.id} className={`rounded-2xl border px-3 py-3 ${check.passed ? 'border-emerald-400/20 bg-emerald-400/7' : check.required ? 'border-rose-400/25 bg-rose-500/8' : 'border-zinc-800 bg-black/25'}`}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{t(language, check.required ? 'activities.adoption.eligibility.required' : 'activities.adoption.eligibility.helpful')}</div>
                                <div className="mt-1 text-sm font-black text-white">{check.label}</div>
                                <div className="mt-0.5 text-xs font-bold text-zinc-400">{check.detail}</div>
                            </div>
                            <CheckCircle2 className={check.passed ? 'text-emerald-300' : 'text-zinc-700'} size={20} />
                        </div>
                    </div>
                ))}
            </div>
            {!eligibility.qualifies && (
                <div className="mt-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-100">
                    {t(language, 'activities.adoption.eligibility.fixBlockers', { blockers: eligibility.blockers.join(', ') })}
                </div>
            )}
        </div>
    );
};

const AdoptionChildProfileCard: React.FC<{
    profile: AdoptionChildProfile;
    selected: boolean;
    onSelect: () => void;
}> = ({ profile, selected, onSelect }) => {
    const language = React.useContext(ActivityLanguageContext);
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-[17.5rem] shrink-0 overflow-hidden rounded-[1.7rem] border p-4 text-left transition active:scale-[0.99] ${selected ? 'border-rose-200 bg-rose-300/16 shadow-[0_18px_50px_rgba(251,113,133,0.16)]' : 'border-zinc-800 bg-black/35'}`}
        >
            <div className="flex items-start gap-3">
                <img
                    src={getGenderedAvatar(profile.gender, profile.name)}
                    alt={profile.name}
                    className="h-16 w-16 shrink-0 rounded-2xl border border-white/10 bg-zinc-900 object-cover"
                />
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="truncate text-xl font-black text-white">{profile.name}</h4>
                        {selected && <BadgeCheck className="shrink-0 text-rose-100" size={18} />}
                    </div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-rose-100/70">
                        {getAdoptionAgeLabel(profile, language)}
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs font-bold leading-relaxed text-zinc-400">{getAdoptionProfilePersonality(profile, language)}</p>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
                {[
                    [t(language, 'activities.adoptionProfile.stat.trust'), profile.stats.trust],
                    [t(language, 'activities.adoptionProfile.stat.health'), profile.stats.health],
                    [t(language, 'activities.adoptionProfile.stat.school'), profile.stats.school],
                    [t(language, 'activities.adoptionProfile.stat.settle'), profile.stats.adjustment],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-black/35 p-2">
                        <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{label}</div>
                        <div className="mt-1 text-sm font-black text-white">{value}</div>
                    </div>
                ))}
            </div>
            <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-bold text-zinc-300">
                {getAdoptionProfileNeeds(profile, language)}
            </div>
        </button>
    );
};

const AdoptionPaperworkPanel: React.FC<{
    profile?: AdoptionChildProfile;
    route?: LifestyleActivityChoice;
    homePrep?: LifestyleActivityChoice;
    support?: LifestyleActivityChoice;
    totalCost: number;
    risk: number;
}> = ({ profile, route, homePrep, support, totalCost, risk }) => {
    const language = React.useContext(ActivityLanguageContext);
    return (
        <div className="rounded-[2rem] border border-amber-300/20 bg-[linear-gradient(135deg,rgba(72,40,10,0.34),rgba(9,9,11,0.92)_60%,rgba(78,22,54,0.24))] p-4">
            <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-100">
                    <FileText size={23} />
                </div>
                <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-100/70">{t(language, 'activities.adoptionPaperwork.title')}</div>
                    <div className="mt-1 text-2xl font-black leading-tight text-white">{profile?.name || t(language, 'activities.adoptionPaperwork.selectedChild')}</div>
                    <div className="mt-1 text-xs font-bold text-zinc-400">
                        {route ? getChoiceLabel(route, language) : t(language, 'activities.adoptionPaperwork.agency')} - {homePrep ? getChoiceLabel(homePrep, language) : t(language, 'activities.adoptionPaperwork.homePrep')} - {support ? getChoiceLabel(support, language) : t(language, 'activities.adoptionPaperwork.support')}
                    </div>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-black/35 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.adoptionPaperwork.fees')}</div>
                    <div className="mt-1 text-lg font-black text-white">{formatMoney(totalCost)}</div>
                </div>
                <div className="rounded-2xl bg-black/35 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.adoptionPaperwork.risk')}</div>
                    <div className={`mt-1 text-lg font-black ${getRiskTone(risk)}`}>{risk}%</div>
                </div>
                <div className="rounded-2xl bg-black/35 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.adoptionPaperwork.result')}</div>
                    <div className="mt-1 text-sm font-black text-emerald-200">{t(language, 'activities.adoptionPaperwork.connections')}</div>
                </div>
            </div>
            <p className="mt-3 text-sm font-bold leading-relaxed text-zinc-400">
                {t(language, 'activities.adoptionPaperwork.description')}
            </p>
        </div>
    );
};

const AdoptionNameModal: React.FC<{
    pending: {
        player: Player;
        child: Relationship;
    } | null;
    onKeep: () => void;
    onSave: (name: string, familyTitle: Relationship['familyTitle']) => void;
}> = ({ pending, onKeep, onSave }) => {
    const [name, setName] = useState(pending?.child.name || '');
    const [title, setTitle] = useState<Relationship['familyTitle']>(pending?.child.familyTitle || 'Child');

    React.useEffect(() => {
        setName(pending?.child.name || '');
        setTitle(pending?.child.familyTitle || 'Child');
    }, [pending?.child.id]);

    if (!pending) return null;
    const language = getPlayerLanguage(pending.player);
    const titleOptions: { value: Relationship['familyTitle']; labelKey: string }[] = [
        { value: 'Child', labelKey: 'activities.adoptionNameModal.familyTitle.Child' },
        { value: 'Son', labelKey: 'activities.adoptionNameModal.familyTitle.Son' },
        { value: 'Daughter', labelKey: 'activities.adoptionNameModal.familyTitle.Daughter' },
        { value: 'Heir', labelKey: 'activities.adoptionNameModal.familyTitle.Heir' },
    ];
    return (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full overflow-hidden rounded-[2rem] border border-rose-200/25 bg-zinc-950 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
                <div className="bg-[linear-gradient(135deg,rgba(244,114,182,0.22),rgba(251,191,36,0.12),rgba(9,9,11,0.95))] p-5">
                    <div className="flex items-center gap-4">
                        <img src={pending.child.image} alt={pending.child.name} className="h-16 w-16 rounded-2xl border border-white/10 bg-zinc-900 object-cover" />
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-rose-100/70">{t(language, 'activities.adoptionNameModal.title')}</div>
                            <div className="mt-1 text-2xl font-black text-white">{t(language, 'activities.adoptionNameModal.welcome', { name: pending.child.name })}</div>
                            <div className="mt-1 text-xs font-bold text-zinc-400">{t(language, 'activities.adoptionNameModal.description')}</div>
                        </div>
                    </div>
                    <div className="mt-5">
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">{t(language, 'activities.adoptionNameModal.name')}</div>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black/45 px-4 py-3 text-lg font-black text-white outline-none focus:border-rose-200/60"
                        />
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2">
                        {titleOptions.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setTitle(option.value)}
                                className={`rounded-2xl border px-2 py-3 text-[10px] font-black uppercase tracking-[0.12em] ${title === option.value ? 'border-rose-200 bg-rose-300/20 text-white' : 'border-zinc-800 bg-black/30 text-zinc-500'}`}
                            >
                                {t(language, option.labelKey)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4">
                    <button onClick={onKeep} className="rounded-2xl border border-zinc-800 bg-black/35 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-zinc-300">
                        {t(language, 'activities.adoptionNameModal.keep')}
                    </button>
                    <button onClick={() => onSave(name, title)} className="rounded-2xl bg-gradient-to-r from-rose-200 via-pink-200 to-amber-200 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-black">
                        {t(language, 'activities.adoptionNameModal.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PetCompanionProfileCard: React.FC<{
    profile: PetCompanionProfile;
    selected: boolean;
    onSelect: () => void;
}> = ({ profile, selected, onSelect }) => {
    const language = React.useContext(ActivityLanguageContext);
    const listingTitle = getPetProfileListingTitle(profile, language);
    const breed = getPetProfileBreed(profile, language);
    const species = getPetProfileSpecies(profile, language);
    const rarityLabel = profile.acquisition === 'endangered'
        ? t(language, 'activities.petListing.rarity.sanctuary')
        : t(language, `activities.petListing.rarity.${profile.rarity}`);
    const rarityTone = profile.rarity === 'endangered'
        ? 'border-yellow-300/40 bg-yellow-300/10 text-yellow-100'
        : profile.rarity === 'exotic'
            ? 'border-fuchsia-300/40 bg-fuchsia-300/10 text-fuchsia-100'
            : profile.rarity === 'premium'
                ? 'border-sky-300/40 bg-sky-300/10 text-sky-100'
                : 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100';
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-[17.5rem] shrink-0 rounded-[1.7rem] border p-4 text-left transition active:scale-[0.99] ${selected ? 'border-lime-200 bg-lime-300/14 shadow-[0_18px_50px_rgba(163,230,53,0.14)]' : 'border-zinc-800 bg-black/35'}`}
        >
            <div className="flex items-start gap-3">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/35 text-4xl">
                    <span>{profile.emoji}</span>
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="line-clamp-2 text-xl font-black leading-tight text-white">{profile.name}</h4>
                        {selected && <BadgeCheck className="shrink-0 text-lime-100" size={18} />}
                    </div>
                    <div className="mt-1 line-clamp-2 text-[10px] font-black uppercase tracking-[0.16em] text-lime-100/70">
                        {listingTitle || `${breed} ${species}`} • {breed}
                    </div>
                    <div className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${rarityTone}`}>
                        {rarityLabel}
                    </div>
                </div>
            </div>
            <p className="mt-4 line-clamp-2 text-xs font-bold leading-relaxed text-zinc-400">{getPetProfilePersonality(profile, language)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-black/35 p-2">
                    <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.petListing.base')}</div>
                    <div className="mt-1 text-sm font-black text-white">{formatMoney(profile.baseCost)}</div>
                </div>
                <div className="rounded-2xl bg-black/35 p-2">
                    <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.petListing.bond')}</div>
                    <div className="mt-1 text-sm font-black text-lime-200">{Math.round(profile.bondBase)}%</div>
                </div>
            </div>
            <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-bold text-zinc-300">
                {getPetProfileLegalNote(profile, language)}
            </div>
        </button>
    );
};

const PetStoreCard: React.FC<{
    storeChoice: LifestyleActivityChoice;
    selected: boolean;
    onSelect: () => void;
}> = ({ storeChoice, selected, onSelect }) => {
    const language = React.useContext(ActivityLanguageContext);
    const store = getPetCompanionStore(storeChoice.id);
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`rounded-[1.7rem] border p-4 text-left transition active:scale-[0.99] ${selected ? 'border-lime-200 bg-lime-300/14 shadow-[0_18px_50px_rgba(163,230,53,0.14)]' : 'border-zinc-800 bg-black/35 hover:border-lime-300/30'}`}
        >
            <div className="flex items-start gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-lime-200/20 bg-lime-300/10 text-3xl">
                    <span>{store.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="text-lg font-black leading-tight text-white">{getPetStoreName(store, language)}</div>
                        {selected && <BadgeCheck className="shrink-0 text-lime-100" size={18} />}
                    </div>
                    <div className="mt-1 text-[9px] font-black uppercase tracking-[0.22em] text-lime-100/70">{getPetStorePriceTone(store, language)}</div>
                </div>
            </div>
            <p className="mt-3 text-xs font-bold leading-relaxed text-zinc-400">{getPetStoreDescription(store, language)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
                {store.categoryIds.map(categoryId => {
                    const category = COMPANION_CATEGORY_OPTIONS.find(option => option.id === categoryId);
                    return (
                    <span key={categoryId} className="rounded-full border border-zinc-700 bg-black/35 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                        {category ? getChoiceLabel(category, language) : categoryId.replace(/_/g, ' ')}
                    </span>
                    );
                })}
            </div>
        </button>
    );
};

const PetCompanionBriefCard: React.FC = () => {
    const language = React.useContext(ActivityLanguageContext);
    const steps = [
        {
            id: 'stores',
            label: t(language, 'activities.petBrief.step.stores.label'),
            description: t(language, 'activities.petBrief.step.stores.description'),
        },
        {
            id: 'categories',
            label: t(language, 'activities.petBrief.step.categories.label'),
            description: t(language, 'activities.petBrief.step.categories.description'),
        },
        {
            id: 'checkout',
            label: t(language, 'activities.petBrief.step.checkout.label'),
            description: t(language, 'activities.petBrief.step.checkout.description'),
        },
    ];

    return (
        <div className="overflow-hidden rounded-[2rem] border border-lime-300/20 bg-[linear-gradient(135deg,rgba(132,204,22,0.22),rgba(9,9,11,0.96)_58%,rgba(20,184,166,0.16))] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.34)]">
            <div className="flex items-start gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl border border-lime-200/25 bg-lime-300/10 text-4xl">
                    <span>🐾</span>
                </div>
                <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-lime-100/70">{t(language, 'activities.petBrief.eyebrow')}</div>
                    <div className="mt-1 text-3xl font-black leading-tight text-white">{t(language, 'activities.petBrief.title')}</div>
                    <p className="mt-3 text-sm font-bold leading-relaxed text-zinc-300">
                        {t(language, 'activities.petBrief.description')}
                    </p>
                </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
                {steps.map(step => (
                    <div key={step.id} className="rounded-2xl border border-white/8 bg-black/30 p-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-lime-100/60">{step.label}</div>
                        <div className="mt-1 text-xs font-black text-white">{step.description}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PetStagePills: React.FC<{
    stage: PetStage;
    onStage: (stage: PetStage) => void;
    hasCategory: boolean;
    hasPet: boolean;
    labels: Record<PetStage, string>;
}> = ({ stage, onStage, hasCategory, hasPet, labels }) => {
    const stages: { id: PetStage; label: string; disabled?: boolean }[] = [
        { id: 'brief', label: labels.brief },
        { id: 'stores', label: labels.stores },
        { id: 'categories', label: labels.categories },
        { id: 'pets', label: labels.pets, disabled: !hasCategory },
        { id: 'checkout', label: labels.checkout, disabled: !hasPet },
    ];
    return (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 custom-scrollbar">
            {stages.map(item => (
                <button
                    key={item.id}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => onStage(item.id)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${stage === item.id ? 'border-lime-200 bg-lime-300 text-black' : 'border-zinc-800 bg-black/40 text-zinc-500 disabled:opacity-40'}`}
                >
                    {item.label}
                </button>
            ))}
        </div>
    );
};

const PetWelcomePreviewCard: React.FC<{
    profile?: PetCompanionProfile;
    care?: LifestyleActivityChoice;
    home?: LifestyleActivityChoice;
    accessory?: LifestyleActivityChoice;
    customization?: LifestyleActivityChoice;
    permit?: LifestyleActivityChoice;
    totalCost: number;
    risk: number;
}> = ({ profile, care, home, accessory, customization, permit, totalCost, risk }) => {
    const language = React.useContext(ActivityLanguageContext);
    const breed = profile ? getPetProfileBreed(profile, language) : undefined;
    const species = profile ? getPetProfileSpecies(profile, language) : undefined;
    const listingTitle = profile ? getPetProfileListingTitle(profile, language) : undefined;
    const title = profile?.acquisition === 'endangered'
        ? t(language, 'activities.petPreview.title.sanctuary')
        : profile?.acquisition === 'exotic'
            ? t(language, 'activities.petPreview.title.licensed')
            : t(language, 'activities.petPreview.title.new');
    const unknownBreed = t(language, 'activities.petPreview.breed');
    const unknownSpecies = t(language, 'activities.petPreview.species');
    return (
        <div className="overflow-hidden rounded-[2rem] border border-lime-300/20 bg-[linear-gradient(135deg,rgba(22,101,52,0.34),rgba(9,9,11,0.96)_56%,rgba(63,98,18,0.26))] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.36)]">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl border border-lime-200/25 bg-lime-300/10 text-4xl">
                        <span>{profile?.emoji || '🐾'}</span>
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-lime-100/70">{title}</div>
                        <div className="mt-1 text-3xl font-black leading-tight text-white">{profile?.name || t(language, 'activities.petPreview.choosePet')}</div>
                        <div className="mt-1 text-xs font-bold text-zinc-400">{listingTitle || breed || unknownBreed} • {breed || unknownBreed} • {species || unknownSpecies}</div>
                    </div>
                </div>
                <div className="shrink-0 rounded-2xl bg-black/35 px-3 py-2 text-right">
                    <div className="text-[9px] font-black uppercase tracking-widest text-lime-100/70">{t(language, 'activities.petPreview.cost')}</div>
                    <div className="text-lg font-black text-white">{formatMoney(totalCost)}</div>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-black/30 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.petPreview.home')}</div>
                    <div className="mt-1 text-sm font-black text-white">{home ? getChoiceLabel(home, language) : t(language, 'activities.petPreview.homeSetup')}</div>
                </div>
                <div className="rounded-2xl bg-black/30 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.petPreview.accessory')}</div>
                    <div className="mt-1 text-sm font-black text-lime-100">{accessory ? getChoiceLabel(accessory, language) : t(language, 'activities.petPreview.accessory')}</div>
                </div>
                <div className="rounded-2xl bg-black/30 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.petPreview.custom')}</div>
                    <div className="mt-1 text-sm font-black text-white">{customization ? getChoiceLabel(customization, language) : t(language, 'activities.petPreview.customization')}</div>
                </div>
                <div className="rounded-2xl bg-black/30 p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t(language, 'activities.petPreview.risk')}</div>
                    <div className={`mt-1 text-lg font-black ${getRiskTone(risk)}`}>{risk}%</div>
                </div>
            </div>
            <p className="mt-3 text-sm font-bold leading-relaxed text-zinc-400">
                {t(language, 'activities.petPreview.careSummary', {
                    needs: profile ? getPetProfileCareNeeds(profile, language) : t(language, 'activities.petPreview.chooseCareNeeds'),
                    care: care ? getChoiceLabel(care, language) : t(language, 'activities.petPreview.carePlan'),
                    permit: permit ? getChoiceLabel(permit, language) : t(language, 'activities.petPreview.papers'),
                })}
            </p>
        </div>
    );
};

const PetNameModal: React.FC<{
    pending: {
        player: Player;
        pet: Relationship;
    } | null;
    onKeep: () => void;
    onSave: (name: string) => void;
}> = ({ pending, onKeep, onSave }) => {
    const [name, setName] = useState(pending?.pet.name || '');

    React.useEffect(() => {
        setName(pending?.pet.name || '');
    }, [pending?.pet.id]);

    if (!pending) return null;
    const language = getPlayerLanguage(pending.player);
    return (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full overflow-hidden rounded-[2rem] border border-lime-200/25 bg-zinc-950 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
                <div className="bg-[linear-gradient(135deg,rgba(132,204,22,0.22),rgba(45,212,191,0.12),rgba(9,9,11,0.95))] p-5">
                    <div className="flex items-center gap-4">
                        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/35 text-4xl">
                            <span>{pending.pet.petEmoji || '🐾'}</span>
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-lime-100/70">{t(language, 'activities.petNameModal.title')}</div>
                            <div className="mt-1 text-2xl font-black text-white">{t(language, 'activities.petNameModal.welcome', { name: pending.pet.name })}</div>
                            <div className="mt-1 text-xs font-bold text-zinc-400">
                                {t(language, 'activities.petNameModal.details', {
                                    breed: pending.pet.petBreed || t(language, 'activities.petPreview.breed'),
                                    species: pending.pet.petSpecies || t(language, 'activities.petPreview.species'),
                                    store: pending.pet.petStoreName || t(language, 'activities.petNameModal.companionCenter'),
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {[pending.pet.petHomeSetup, pending.pet.petAccessory, pending.pet.petCustomization].filter(Boolean).map(item => (
                            <div key={item} className="rounded-2xl border border-lime-200/10 bg-black/25 px-3 py-2">
                                <div className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-lime-100/70">{item}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5">
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">{t(language, 'activities.petNameModal.name')}</div>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black/45 px-4 py-3 text-lg font-black text-white outline-none focus:border-lime-200/60"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4">
                    <button onClick={onKeep} className="rounded-2xl border border-zinc-800 bg-black/35 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-zinc-300">
                        {t(language, 'activities.petNameModal.keepName')}
                    </button>
                    <button onClick={() => onSave(name)} className="rounded-2xl bg-gradient-to-r from-lime-200 via-emerald-200 to-cyan-200 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-black">
                        {t(language, 'activities.petNameModal.savePet')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ActivityResultModal: React.FC<{
    result: ActivityResultState | null;
    onClose: () => void;
    onAddFriend: (encounter: LifestyleFriendEncounter, playerAfter: Player) => void;
}> = ({ result, onClose, onAddFriend }) => {
    if (!result) return null;
    const language = getPlayerLanguage(result.playerAfter);
    return (
        <div className="fixed inset-0 z-[85] grid place-items-end bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full overflow-hidden rounded-[2rem] border border-emerald-200/25 bg-zinc-950 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
                <div className="bg-[linear-gradient(135deg,rgba(16,185,129,0.22),rgba(250,204,21,0.12),rgba(9,9,11,0.96))] p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-100/70">{t(language, 'activities.resultModal.title')}</div>
                            <div className="mt-1 text-2xl font-black text-white">{result.memory?.title || result.activityName}</div>
                            <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-300">{result.memory?.summary || result.message}</p>
                        </div>
                        <div className="shrink-0 rounded-2xl bg-black/35 px-3 py-2 text-right">
                            <div className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">{t(language, 'activities.resultModal.cost')}</div>
                            <div className="text-lg font-black text-white">{formatMoney(result.totalCost)}</div>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {result.effectSummary.length ? result.effectSummary.map(effect => (
                            <span key={effect} className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">{effect}</span>
                        )) : (
                            <span className="rounded-full border border-zinc-700 bg-black/30 px-3 py-1 text-xs font-black text-zinc-400">{t(language, 'activities.resultModal.memoryCreated')}</span>
                        )}
                        <span className={`rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-black ${getRiskTone(result.risk)}`}>{t(language, 'activities.resultModal.risk', { risk: result.risk })}</span>
                    </div>
                    {result.friendEncounter && (
                        <div className="mt-4 rounded-3xl border border-sky-300/20 bg-sky-400/10 p-4">
                            <div className="flex items-start gap-3">
                                <img src={result.friendEncounter.relationship.image} alt={result.friendEncounter.relationship.name} className="h-12 w-12 rounded-2xl border border-white/10 bg-zinc-900 object-cover" />
                                <div className="min-w-0 flex-1">
                                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-100/70">{t(language, 'activities.resultModal.newEncounter')}</div>
                                    <div className="mt-1 text-lg font-black text-white">{result.friendEncounter.headline}</div>
                                    <p className="mt-1 text-xs font-bold leading-relaxed text-zinc-300">{result.friendEncounter.summary}</p>
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <button onClick={() => onAddFriend(result.friendEncounter!, result.playerAfter)} className="rounded-2xl bg-sky-200 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-black">
                                    {t(language, 'activities.resultModal.addFriend')}
                                </button>
                                <button onClick={onClose} className="rounded-2xl border border-zinc-700 bg-black/35 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-300">
                                    {t(language, 'activities.resultModal.justMemory')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4">
                    <button onClick={onClose} className="w-full rounded-2xl border border-zinc-800 bg-black/35 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-zinc-300">
                        {t(language, 'activities.resultModal.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const TripDurationPicker: React.FC<{
    days: number;
    onChange: (days: number) => void;
}> = ({ days, onChange }) => {
    const safeDays = clampTripDays(days);
    const presets = [3, 5, 7];
    return (
        <div className="space-y-3 rounded-3xl border border-zinc-800 bg-black/25 p-4">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Duration</div>
                    <div className="mt-1 text-sm font-bold text-zinc-400">Trips run {TRIP_MIN_DAYS}-{TRIP_MAX_DAYS} days.</div>
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-right">
                    <div className="text-[9px] font-black uppercase tracking-widest text-emerald-200">Selected</div>
                    <div className="text-xl font-black text-white">{safeDays}d</div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {presets.map(preset => (
                    <button
                        key={preset}
                        onClick={() => onChange(preset)}
                        className={`rounded-2xl border px-3 py-2 text-xs font-black transition-all ${safeDays === preset ? 'border-emerald-400 bg-emerald-400 text-black' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}
                    >
                        {preset}d
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Custom</span>
                <input
                    value={safeDays}
                    type="number"
                    min={TRIP_MIN_DAYS}
                    max={TRIP_MAX_DAYS}
                    onChange={(event) => onChange(clampTripDays(Number(event.target.value)))}
                    className="min-w-0 flex-1 bg-transparent text-right font-mono text-lg font-black text-white outline-none"
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Days</span>
            </div>
        </div>
    );
};

const ActivityCard: React.FC<{
    activity: LifestyleActivityDefinition;
    onClick: () => void;
}> = ({ activity, onClick }) => {
    const language = React.useContext(ActivityLanguageContext);
    const meta = getActivityVisual(activity);
    const Icon = meta.icon;
    return (
        <button
            onClick={onClick}
            className="w-full rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4 text-left transition-all hover:border-emerald-500/60 hover:bg-emerald-500/5"
        >
            <div className="flex items-center gap-3">
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${meta.bg}`}>
                    <Icon size={22} className={meta.accent} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-black text-white">{getActivityName(activity, language)}</div>
                    <div className="mt-1 line-clamp-2 text-xs leading-snug text-zinc-400">{getActivityShortDescription(activity, language)}</div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-zinc-600" />
            </div>
        </button>
    );
};

export const LifestyleActivities: React.FC<LifestyleActivitiesProps> = ({ player, onBack, onUpdatePlayer }) => {
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const [category, setCategory] = useState<CategoryFilter>('ALL');
    const [selectedActivityId, setSelectedActivityId] = useState(LIFESTYLE_ACTIVITY_CATALOG[0].id);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const selectedActivity = LIFESTYLE_ACTIVITY_CATALOG.find(activity => activity.id === selectedActivityId) || LIFESTYLE_ACTIVITY_CATALOG[0];
    const [selections, setSelections] = useState<LifestyleActivitySelections>(() => createDefaultLifestyleActivitySelections(selectedActivity));
    const [status, setStatus] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);
    const [nightlifeGuestQuery, setNightlifeGuestQuery] = useState('');
    const [industryGuestQuery, setIndustryGuestQuery] = useState('');
    const [adoptionStage, setAdoptionStage] = useState<AdoptionStage>('eligibility');
    const [petStage, setPetStage] = useState<PetStage>('brief');
    const [pendingAdoptionName, setPendingAdoptionName] = useState<{ player: Player; child: Relationship } | null>(null);
    const [pendingPetName, setPendingPetName] = useState<{ player: Player; pet: Relationship } | null>(null);
    const [activityResult, setActivityResult] = useState<ActivityResultState | null>(null);
    const state = ensureLifestyleActivityState(player.lifestyleActivities);
    const quote = buildLifestyleActivityQuote(selectedActivity, selections, player);
    const cooldownWeeks = getLifestyleActivityCooldownWeeks(player, selectedActivity.id);
    const canAfford = player.money >= quote.totalCost;
    const canConfirm = canAfford && cooldownWeeks === 0 && Boolean(onUpdatePlayer);
    const selectedCountryId = selections.tripDestinationId || TRIP_DESTINATION_OPTIONS[0]?.id;
    const tripCityOptions = getTripCityOptions(selectedCountryId);
    const selectedCityId = selections.tripCityId || tripCityOptions[0]?.id;
    const tripActivityOptions = getTripActivityOptions(selectedCountryId, selectedCityId);
    const tripTravelOptions = getAvailableTripTravelModes(player);
    const selectedCountry = TRIP_DESTINATION_OPTIONS.find(option => option.id === selectedCountryId);
    const selectedCity = tripCityOptions.find(option => option.id === selectedCityId);
    const selectedStay = TRIP_STAY_OPTIONS.find(option => option.id === selections.tripStayId);
    const selectedTripTravelId = tripTravelOptions.some(option => option.id === selections.tripTravelId) ? selections.tripTravelId : tripTravelOptions[1]?.id;
    const selectedTravelMode = tripTravelOptions.find(option => option.id === selectedTripTravelId);
    const selectedTripDays = clampTripDays(selections.tripDurationDays || 7);
    const selectedNightlifeType = NIGHTLIFE_TYPE_OPTIONS.find(option => option.id === selections.nightlifeTypeId) || NIGHTLIFE_TYPE_OPTIONS[0];
    const nightlifeVenueOptions = getAvailableNightlifeVenueOptions(player, selectedNightlifeType?.id);
    const nightlifeGuestOptions = getAvailableNightlifeGuestOptions(player, nightlifeGuestQuery, selections.nightlifeGuestId);
    const selectedNightlifeVenue = nightlifeVenueOptions.find(option => option.id === selections.nightlifeVenueId) || nightlifeVenueOptions[0];
    const selectedNightlifeGuest = getAvailableNightlifeGuestOptions(player, '', selections.nightlifeGuestId).find(option => option.id === selections.nightlifeGuestId) || nightlifeGuestOptions[1];
    const selectedNightlifeCrowd = NIGHTLIFE_CROWD_OPTIONS.find(option => option.id === selections.nightlifeCrowdId) || NIGHTLIFE_CROWD_OPTIONS[1];
    const selectedNightlifeControl = NIGHTLIFE_CONTROL_OPTIONS.find(option => option.id === selections.nightlifeControlId) || NIGHTLIFE_CONTROL_OPTIONS[1];
    const availableInviteOptions = getAvailableInviteOptions(selectedActivity, player);
    const selectedInviteId = availableInviteOptions.some(option => option.id === selections.inviteId)
        ? selections.inviteId
        : availableInviteOptions[0]?.id || 'solo';
    const selectedIndustryEvent = INDUSTRY_EVENT_OPTIONS.find(option => option.id === selections.industryEventId) || INDUSTRY_EVENT_OPTIONS[0];
    const industryVenueOptions = getAvailableIndustryVenueOptions(player);
    const selectedIndustryVenue = industryVenueOptions.find(option => option.id === selections.industryVenueId) || industryVenueOptions[0];
    const selectedIndustryGroupIds = selections.industryInviteGroupIds || [];
    const selectedIndustryGroups = INDUSTRY_INVITE_GROUP_OPTIONS.filter(option => selectedIndustryGroupIds.includes(option.id));
    const industryGuestOptions = getAvailableIndustryGuestOptions(player, industryGuestQuery, selections.industryGuestIds || []);
    const selectedIndustryGuests = getAvailableIndustryGuestOptions(player, '', selections.industryGuestIds || [])
        .filter(option => (selections.industryGuestIds || []).includes(option.id));
    const selectedIndustryStyle = INDUSTRY_HOSTING_STYLE_OPTIONS.find(option => option.id === selections.industryHostingStyleId) || INDUSTRY_HOSTING_STYLE_OPTIONS[0];
    const selectedIndustryService = INDUSTRY_SERVICE_OPTIONS.find(option => option.id === selections.industryServiceId) || INDUSTRY_SERVICE_OPTIONS[1];
    const selectedIndustryAddonIds = selections.industryAddonIds || [];
    const selectedCharityCause = CHARITY_CAUSE_OPTIONS.find(option => option.id === selections.charityCauseId) || CHARITY_CAUSE_OPTIONS[2];
    const charityFormatOptions = getAvailableCharityFormatOptions(player);
    const selectedCharityFormat = charityFormatOptions.find(option => option.id === selections.charityFormatId) || charityFormatOptions[1];
    const charityCustomDonationAmount = Math.max(0, Math.round(Number(selections.charityCustomDonationAmount || 0)));
    const selectedBaseCharityDonation = CHARITY_DONATION_OPTIONS.find(option => option.id === selections.charityDonationId) || CHARITY_DONATION_OPTIONS[1];
    const selectedCharityDonation: LifestyleActivityChoice = charityCustomDonationAmount > 0
	        ? {
	            id: 'custom_donation',
	            label: tr('activities.customDonation'),
	            description: tr('activities.customDonationDescription', { amount: formatMoney(charityCustomDonationAmount) }),
	            kind: 'CHARITY_DONATION',
            flatCost: charityCustomDonationAmount,
        }
        : selectedBaseCharityDonation;
    const selectedCharityGuestCircle = CHARITY_GUEST_CIRCLE_OPTIONS.find(option => option.id === selections.charityGuestCircleId) || CHARITY_GUEST_CIRCLE_OPTIONS[0];
    const selectedCharityPress = CHARITY_PRESS_OPTIONS.find(option => option.id === selections.charityPressId) || CHARITY_PRESS_OPTIONS[1];
    const selectedWellnessProgram = WELLNESS_PROGRAM_OPTIONS.find(option => option.id === selections.wellnessProgramId)
        || WELLNESS_PROGRAM_OPTIONS[0];
    const selectedWellnessProvider = WELLNESS_PROVIDER_OPTIONS.find(option => option.id === selections.wellnessProviderId)
        || WELLNESS_PROVIDER_OPTIONS[1];
    const selectedWellnessFocus = WELLNESS_FOCUS_OPTIONS.find(option => option.id === selections.wellnessFocusId)
        || WELLNESS_FOCUS_OPTIONS[1];
    const selectedWellnessSupport = WELLNESS_SUPPORT_OPTIONS.find(option => option.id === selections.wellnessSupportId)
        || WELLNESS_SUPPORT_OPTIONS[1];
    const availableAdoptionProfiles = getAvailableAdoptionChildProfiles(player);
    const availableAdoptionOptions = getAvailableAdoptionChildOptions(player);
    const adoptionPoolCycle = getAdoptionPoolCycle(player);
    const selectedAdoptionChild = availableAdoptionOptions.find(option => option.id === selections.adoptionChildId)
        || availableAdoptionOptions[0];
    const selectedAdoptionProfile = getAdoptionChildProfile(selectedAdoptionChild?.id, player)
        || availableAdoptionProfiles[0]
        || ADOPTION_CHILD_PROFILES[0];
    const selectedAdoptionRoute = ADOPTION_ROUTE_OPTIONS.find(option => option.id === selections.adoptionRouteId)
        || ADOPTION_ROUTE_OPTIONS[0];
    const adoptionHomePrepOptions = getAvailableAdoptionHomePrepOptions(player);
    const selectedAdoptionHomePrep = adoptionHomePrepOptions.find(option => option.id === selections.adoptionHomePrepId)
        || adoptionHomePrepOptions[1];
    const selectedAdoptionSupport = ADOPTION_SUPPORT_OPTIONS.find(option => option.id === selections.adoptionSupportId)
        || ADOPTION_SUPPORT_OPTIONS[1];
    const selectedPetStoreId = selections.companionStoreId || COMPANION_STORE_OPTIONS[0]?.id;
    const selectedPetStore = getPetCompanionStore(selectedPetStoreId);
    const selectedPetStoreName = getPetStoreName(selectedPetStore, language);
    const petCategoryOptions = getPetCompanionCategoryOptions(selectedPetStore.id);
    const selectedPetCategoryId = petCategoryOptions.some(option => option.id === selections.companionCategoryId)
        ? selections.companionCategoryId
        : petCategoryOptions[0]?.id;
    const selectedPetCategory = petCategoryOptions.find(option => option.id === selectedPetCategoryId)
        || petCategoryOptions[0];
    const selectedPetCategoryLabel = selectedPetCategory ? getChoiceLabel(selectedPetCategory, language) : tr('activities.chooseCategory');
    const filteredPetProfiles = getFilteredPetCompanionProfiles(player, selectedPetStore.id, selectedPetCategory?.id);
    const petPoolCycle = getPetCompanionPoolCycle(player);
    const selectedPetProfile = getPetCompanionProfile(selections.companionPetId, player)
        || filteredPetProfiles[0];
    const selectedPetBreed = selectedPetProfile ? getPetProfileBreed(selectedPetProfile, language) : undefined;
    const selectedPetSpecies = selectedPetProfile ? getPetProfileSpecies(selectedPetProfile, language) : undefined;
    const petCareOptions = getCompanionCareOptionsForPet(selectedPetProfile);
    const petPermitOptions = getCompanionPermitOptionsForPet(selectedPetProfile);
    const selectedPetCare = petCareOptions.find(option => option.id === selections.companionCareId)
        || petCareOptions[Math.min(1, petCareOptions.length - 1)];
    const selectedPetHome = COMPANION_HOME_OPTIONS.find(option => option.id === selections.companionHomeId)
        || COMPANION_HOME_OPTIONS[1];
    const selectedPetAccessory = COMPANION_ACCESSORY_OPTIONS.find(option => option.id === selections.companionAccessoryId)
        || COMPANION_ACCESSORY_OPTIONS[1];
    const selectedPetCustomization = COMPANION_CUSTOMIZATION_OPTIONS.find(option => option.id === selections.companionCustomizationId)
        || COMPANION_CUSTOMIZATION_OPTIONS[1];
    const selectedPetPermit = petPermitOptions.find(option => option.id === selections.companionPermitId)
        || petPermitOptions[0];
    const activeHealthConditions = Array.isArray(player.activeHealthConditions) ? player.activeHealthConditions : [];
    const activeHealthCondition = activeHealthConditions[0];
    const selectedWellnessTags = getHealthConditionTreatmentTags(
        selectedWellnessProgram?.id,
        selectedWellnessProvider?.id,
        selectedWellnessFocus?.id,
        selectedWellnessSupport?.id,
    );
    const treatmentMatchCount = activeHealthCondition
        ? activeHealthCondition.treatmentTags.filter(tag => selectedWellnessTags.includes(tag)).length
        : 0;
    const treatmentMatch = activeHealthCondition
        ? treatmentMatchCount >= 2 ? t(language, 'activities.treatmentMatch.strong') : treatmentMatchCount === 1 ? t(language, 'activities.treatmentMatch.partial') : t(language, 'activities.treatmentMatch.poor')
        : t(language, 'activities.treatmentMatch.preventive');
    const adoptionEligibility = getAdoptionEligibility(player, quote);
    const filteredActivities = category === 'ALL'
        ? LIFESTYLE_ACTIVITY_CATALOG
        : LIFESTYLE_ACTIVITY_CATALOG.filter(activity => activity.category === category);
    const statSummary = [
        { label: t(language, 'activities.stat.mood'), value: formatStat(player.stats.happiness), color: 'text-yellow-300' },
        { label: t(language, 'activities.stat.health'), value: formatStat(player.stats.health), color: 'text-emerald-300' },
        { label: t(language, 'activities.stat.rep'), value: formatStat(player.stats.reputation), color: 'text-sky-300' },
        { label: t(language, 'activities.stat.spent'), value: formatMoney(state.totalSpent), color: 'text-white' },
    ];
    const currentYearMemories = state.memories.filter(memory => memory.year === player.age);

    const selectActivity = (activity: LifestyleActivityDefinition) => {
        setSelectedActivityId(activity.id);
        setSelections(createDefaultLifestyleActivitySelections(activity));
        setStatus(null);
        setAdoptionStage('eligibility');
        setPetStage('brief');
        setIsBuilderOpen(true);
    };

    const updateSelection = (key: 'scaleId' | 'privacyId' | 'inviteId' | 'durationId', value: string) => {
        setSelections(prev => ({ ...prev, [key]: value }));
        setStatus(null);
    };

    const toggleExtra = (id: string) => {
        setSelections(prev => ({
            ...prev,
            extraIds: prev.extraIds.includes(id) ? prev.extraIds.filter(extraId => extraId !== id) : [...prev.extraIds, id],
        }));
        setStatus(null);
    };

    const updateTripSelection = (key: 'tripDestinationId' | 'tripCityId' | 'tripStayId' | 'tripTravelId', value: string) => {
        setSelections(prev => {
            if (key === 'tripDestinationId') {
                const nextCities = getTripCityOptions(value);
                return {
                    ...prev,
                    tripDestinationId: value,
                    tripCityId: nextCities[0]?.id,
                    tripActivityIds: [],
                };
            }
            if (key === 'tripCityId') {
                return {
                    ...prev,
                    tripCityId: value,
                    tripActivityIds: [],
                };
            }
            return { ...prev, [key]: value };
        });
        setStatus(null);
    };

    const updateTripDuration = (days: number) => {
        setSelections(prev => ({ ...prev, tripDurationDays: clampTripDays(days) }));
        setStatus(null);
    };

    const toggleTripActivity = (id: string) => {
        setSelections(prev => {
            const current = prev.tripActivityIds || [];
            return {
                ...prev,
                tripActivityIds: current.includes(id) ? current.filter(activityId => activityId !== id) : [...current, id],
            };
        });
        setStatus(null);
    };

    const updateNightlifeSelection = (
        key: 'nightlifeTypeId' | 'nightlifeVenueId' | 'nightlifeGuestId' | 'nightlifeCrowdId' | 'nightlifeControlId',
        value: string,
    ) => {
        setSelections(prev => {
            if (key === 'nightlifeTypeId') {
                const nextVenues = getAvailableNightlifeVenueOptions(player, value);
                return {
                    ...prev,
                    nightlifeTypeId: value,
                    nightlifeVenueId: nextVenues[0]?.id,
                };
            }
            return { ...prev, [key]: value };
        });
        setStatus(null);
    };

    const updateIndustrySelection = (
        key: 'industryEventId' | 'industryVenueId' | 'industryHostingStyleId' | 'industryServiceId',
        value: string,
    ) => {
        setSelections(prev => ({ ...prev, [key]: value }));
        setStatus(null);
    };

    const toggleIndustryGroup = (id: string) => {
        setSelections(prev => {
            const current = prev.industryInviteGroupIds || [];
            return {
                ...prev,
                industryInviteGroupIds: current.includes(id)
                    ? current.filter(groupId => groupId !== id)
                    : [...current, id],
            };
        });
        setStatus(null);
    };

    const toggleIndustryGuest = (id: string) => {
        setSelections(prev => {
            const current = prev.industryGuestIds || [];
            return {
                ...prev,
                industryGuestIds: current.includes(id)
                    ? current.filter(guestId => guestId !== id)
                    : [...current, id].slice(0, 8),
            };
        });
        setStatus(null);
    };

    const toggleIndustryAddon = (id: string) => {
        setSelections(prev => {
            const current = prev.industryAddonIds || [];
            return {
                ...prev,
                industryAddonIds: current.includes(id)
                    ? current.filter(addonId => addonId !== id)
                    : [...current, id],
            };
        });
        setStatus(null);
    };

    const updateCharitySelection = (
        key: 'charityCauseId' | 'charityFormatId' | 'charityDonationId' | 'charityGuestCircleId' | 'charityPressId',
        value: string,
    ) => {
        setSelections(prev => ({
            ...prev,
            [key]: value,
            charityCustomDonationAmount: key === 'charityDonationId' ? undefined : prev.charityCustomDonationAmount,
        }));
        setStatus(null);
    };

    const updateCharityCustomDonation = (amount: number) => {
        const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
        setSelections(prev => ({
            ...prev,
            charityCustomDonationAmount: safeAmount > 0 ? safeAmount : undefined,
        }));
        setStatus(null);
    };

    const updateWellnessSelection = (
        key: 'wellnessProgramId' | 'wellnessProviderId' | 'wellnessFocusId' | 'wellnessSupportId',
        value: string,
    ) => {
        setSelections(prev => ({ ...prev, [key]: value }));
        setStatus(null);
    };

    const updateAdoptionSelection = (
        key: 'adoptionChildId' | 'adoptionRouteId' | 'adoptionHomePrepId' | 'adoptionSupportId',
        value: string,
    ) => {
        setSelections(prev => ({ ...prev, [key]: value }));
        setStatus(null);
    };

    const updatePetSelection = (
        key: 'companionStoreId' | 'companionCategoryId' | 'companionPetId' | 'companionCareId' | 'companionHomeId' | 'companionAccessoryId' | 'companionCustomizationId' | 'companionPermitId',
        value: string,
    ) => {
        setSelections(prev => {
            if (key === 'companionStoreId') {
                const nextCategory = getPetCompanionCategoryOptions(value)[0]?.id;
                const nextPet = getFilteredPetCompanionProfiles(player, value, nextCategory)[0]?.id;
                return {
                    ...prev,
                    companionStoreId: value,
                    companionCategoryId: nextCategory,
                    companionPetId: nextPet,
                };
            }
            if (key === 'companionCategoryId') {
                const nextPet = getFilteredPetCompanionProfiles(player, prev.companionStoreId, value)[0]?.id;
                return {
                    ...prev,
                    companionCategoryId: value,
                    companionPetId: nextPet,
                };
            }
            return { ...prev, [key]: value };
        });
        setStatus(null);
    };

    const updateAdoptionRelationship = (nextPlayer: Player, childId: string, name: string, familyTitle?: Relationship['familyTitle']): Player => ({
        ...nextPlayer,
        relationships: (nextPlayer.relationships || []).map(relationship => relationship.id === childId
            ? { ...relationship, name, familyTitle }
            : relationship),
    });

    const handleAdoptionNameKeep = () => {
        setPendingAdoptionName(null);
    };

    const handleAdoptionNameSave = (name: string, familyTitle: Relationship['familyTitle']) => {
        if (!pendingAdoptionName) return;
        const safeName = name.trim() || pendingAdoptionName.child.name;
        onUpdatePlayer?.(updateAdoptionRelationship(pendingAdoptionName.player, pendingAdoptionName.child.id, safeName, familyTitle));
        setPendingAdoptionName(null);
    };

    const updatePetRelationship = (nextPlayer: Player, petId: string, name: string): Player => ({
        ...nextPlayer,
        relationships: (nextPlayer.relationships || []).map(relationship => relationship.id === petId
            ? { ...relationship, name }
            : relationship),
    });

    const handlePetNameKeep = () => {
        setPendingPetName(null);
    };

    const handlePetNameSave = (name: string) => {
        if (!pendingPetName) return;
        const safeName = name.trim() || pendingPetName.pet.name;
        onUpdatePlayer?.(updatePetRelationship(pendingPetName.player, pendingPetName.pet.id, safeName));
        setPendingPetName(null);
    };

    const handleActivityResultClose = () => {
        setActivityResult(null);
    };

    const handleAddEncounterFriend = (encounter: LifestyleFriendEncounter, playerAfter: Player) => {
        const alreadyKnown = (playerAfter.relationships || []).some(relationship => relationship.id === encounter.relationship.id);
        const friendLog: LogEntry = {
            week: playerAfter.currentWeek,
            year: playerAfter.age,
            message: `You added ${encounter.relationship.name} as a friend.`,
            type: 'positive',
        };
        const nextPlayer: Player = {
            ...playerAfter,
            relationships: alreadyKnown
                ? playerAfter.relationships
                : [encounter.relationship, ...(playerAfter.relationships || [])].slice(0, 80),
            logs: [
                friendLog,
                ...(playerAfter.logs || []),
            ].slice(0, 80),
        };
        onUpdatePlayer?.(nextPlayer);
        setActivityResult(null);
    };

    const confirmActivity = () => {
        const result = resolveLifestyleActivity(player, selectedActivity, selections);
        setStatus({ tone: result.success ? 'good' : 'bad', text: result.message });
        if (result.success) {
            onUpdatePlayer?.(result.player);
            setActivityResult({
                activityName: selectedActivity.name,
                message: result.message,
                memory: result.memory,
                totalCost: quote.totalCost,
                risk: quote.risk,
                effectSummary: result.memory?.effectSummary || quote.effectSummary,
                friendEncounter: result.friendEncounter,
                playerAfter: result.player,
            });
            if (selectedActivity.id === 'adoption_center') {
                const previousRelationshipIds = new Set((player.relationships || []).map(relationship => relationship.id));
                const adoptedChild = (result.player.relationships || []).find(relationship => relationship.relation === 'Child' && !previousRelationshipIds.has(relationship.id));
                if (adoptedChild) {
                    setPendingAdoptionName({ player: result.player, child: adoptedChild });
                }
            }
            if (selectedActivity.id === 'companion_day') {
                const previousRelationshipIds = new Set((player.relationships || []).map(relationship => relationship.id));
                const acquiredPet = (result.player.relationships || []).find(relationship => relationship.relation === 'Pet' && !previousRelationshipIds.has(relationship.id));
                if (acquiredPet) {
                    setPendingPetName({ player: result.player, pet: acquiredPet });
                }
            }
            setIsBuilderOpen(false);
        }
    };

    const selectedVisual = getActivityVisual(selectedActivity);
    const SelectedIcon = selectedVisual.icon;
    const isTripPlanner = selectedActivity.id === 'vacation_escape';
    const isNightlifePlanner = selectedActivity.id === 'nightlife_takeover';
    const isIndustryPlanner = selectedActivity.id === 'industry_dinner';
    const isCharityPlanner = selectedActivity.id === 'charity_gala';
    const isWellnessPlanner = selectedActivity.category === 'WELLNESS';
    const isAdoptionPlanner = selectedActivity.id === 'adoption_center';
    const isPetPlanner = selectedActivity.id === 'companion_day';
    const builderShellClass = isNightlifePlanner
        ? 'border-fuchsia-400/25 bg-gradient-to-b from-fuchsia-950/35 via-violet-950/20 to-zinc-950'
        : isIndustryPlanner
            ? 'border-amber-300/25 bg-gradient-to-b from-amber-950/30 via-sky-950/10 to-zinc-950'
        : isCharityPlanner
            ? 'border-yellow-300/25 bg-gradient-to-b from-yellow-950/25 via-cyan-950/10 to-zinc-950'
        : isWellnessPlanner
            ? 'border-cyan-300/25 bg-gradient-to-b from-teal-950/35 via-emerald-950/20 to-zinc-950'
            : isAdoptionPlanner
                ? 'border-rose-300/25 bg-gradient-to-b from-rose-950/30 via-amber-950/10 to-zinc-950'
                : isPetPlanner
                    ? 'border-lime-300/25 bg-gradient-to-b from-lime-950/25 via-emerald-950/15 to-zinc-950'
                    : 'border-emerald-500/25 bg-gradient-to-b from-emerald-950/25 to-zinc-950';
	    const adoptionPrimaryLabel = adoptionStage === 'eligibility'
	        ? tr('activities.viewChildren')
	        : adoptionStage === 'children'
	            ? tr('activities.proceedDocumentation')
	            : tr('activities.submitAdoption');
	    const adoptionPrimarySubLabel = adoptionStage === 'eligibility'
	        ? adoptionEligibility.qualifies ? tr('activities.freshProfiles', { count: availableAdoptionProfiles.length }) : tr('activities.criteriaNotMet')
	        : adoptionStage === 'children'
	            ? selectedAdoptionProfile?.name || tr('activities.chooseChild')
	            : tr('activities.filePaperwork');
	    const petPrimaryLabel = petStage === 'brief'
	        ? tr('activities.viewStores')
	        : petStage === 'stores'
	        ? tr('activities.viewCategories')
	        : petStage === 'categories'
	            ? tr('activities.viewPets')
	            : petStage === 'pets'
	                ? tr('activities.proceedCheckout')
	                : tr('activities.welcomePet');
	    const petPrimarySubLabel = petStage === 'brief'
	        ? tr('activities.startCompanionShopping')
	        : petStage === 'stores'
	        ? selectedPetStoreName
	        : petStage === 'categories'
	            ? selectedPetCategoryLabel
	            : petStage === 'pets'
	                ? selectedPetProfile?.name || tr('activities.choosePet')
	                : tr('activities.buySetupAndName');
	    const repeatGapLabel = isTripPlanner ? tr('activities.tripDone') : tr('activities.repeatLocked');
	    const builderPrimaryLabel = cooldownWeeks > 0 ? repeatGapLabel : isAdoptionPlanner ? adoptionPrimaryLabel : isPetPlanner ? petPrimaryLabel : isIndustryPlanner ? tr('activities.hostRoom') : isCharityPlanner ? tr('activities.hostGala') : tr('activities.bookExperience');
	    const builderPrimarySubLabel = cooldownWeeks > 0
	        ? isTripPlanner ? tr('activities.tryNextWeek') : tr('activities.tryLater')
	        : isAdoptionPlanner
	            ? adoptionPrimarySubLabel
	            : isIndustryPlanner
	                ? tr('activities.careerChance')
	            : isCharityPlanner
	                ? tr('activities.causeAndLegacy')
	            : isNightlifePlanner
	                ? tr('activities.confirmNight')
	                : isTripPlanner
	                    ? tr('activities.confirmTrip')
	                    : isWellnessPlanner
	                        ? tr('activities.confirmRecovery')
	                        : isPetPlanner
	                            ? petPrimarySubLabel
	                            : tr('activities.confirmPlan');
    const builderPrimaryDisabled = isAdoptionPlanner
        ? adoptionStage === 'eligibility'
            ? !adoptionEligibility.qualifies
            : adoptionStage === 'children'
                ? !selectedAdoptionProfile
                : !canConfirm
        : isPetPlanner
            ? petStage === 'brief'
                ? false
                : petStage === 'stores'
                ? !selectedPetStore
                : petStage === 'categories'
                    ? !selectedPetCategory
                    : petStage === 'pets'
                        ? !selectedPetProfile
                        : !selectedPetProfile || !canConfirm
            : isIndustryPlanner
                ? !canConfirm || selectedIndustryGroupIds.length === 0
            : !canConfirm;
    const handleBuilderPrimaryAction = () => {
        if (isAdoptionPlanner) {
            if (adoptionStage === 'eligibility') {
                if (adoptionEligibility.qualifies) setAdoptionStage('children');
                return;
            }
            if (adoptionStage === 'children') {
                if (selectedAdoptionProfile) setAdoptionStage('paperwork');
                return;
            }
        }
        if (isPetPlanner) {
            if (petStage === 'brief') {
                setPetStage('stores');
                return;
            }
            if (petStage === 'stores') {
                setPetStage('categories');
                return;
            }
            if (petStage === 'categories') {
                setPetStage('pets');
                return;
            }
            if (petStage === 'pets') {
                setPetStage('checkout');
                return;
            }
        }
        confirmActivity();
    };

    const handleBuilderBack = () => {
        if (!isPetPlanner) {
            setIsBuilderOpen(false);
            return;
        }
        const stageOrder: PetStage[] = ['brief', 'stores', 'categories', 'pets', 'checkout'];
        const currentIndex = stageOrder.indexOf(petStage);
        if (currentIndex > 0) {
            setPetStage(stageOrder[currentIndex - 1]);
            return;
        }
        setIsBuilderOpen(false);
    };

    return (
        <ActivityLanguageContext.Provider value={language}>
        <div className="space-y-5 pb-28 pt-3">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-zinc-800 bg-zinc-950 text-white">
                    <ArrowLeft size={24} />
                </button>
                <div className="min-w-0">
	                    <div className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-300">{tr('lifestyle.title')}</div>
	                    <h2 className="text-3xl font-black text-white">{tr('lifestyle.activitiesTitle')}</h2>
                </div>
            </div>

            <div className="glass-card rounded-3xl p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
	                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">{tr('activities.spendableCash')}</div>
                        <div className="mt-1 text-3xl font-black text-white">{formatMoney(player.money)}</div>
                    </div>
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-right">
	                        <div className="text-[9px] font-black uppercase tracking-widest text-emerald-200">{tr('lifestyle.title')}</div>
	                        <div className="text-sm font-black text-white">{state.lifestyleIdentity || tr('activities.untapped')}</div>
                    </div>
                </div>
                <div className="mt-5 grid grid-cols-4 gap-2">
                    {statSummary.map(({ label, value, color }) => (
                        <div key={label} className="min-w-0 rounded-2xl bg-black/30 p-3">
                            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{label}</div>
                            <div className={`mt-1 truncate text-base font-black ${color}`}>{value}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 custom-scrollbar">
                {categoryFilters.map(filter => (
                    <button
                        key={filter.id}
                        onClick={() => setCategory(filter.id)}
                        className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${category === filter.id ? 'border-emerald-400 bg-emerald-400 text-black' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}
                    >
                        {t(language, filter.labelKey)}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-3">
                {filteredActivities.map(activity => (
                    <ActivityCard
                        key={activity.id}
                        activity={activity}
                        onClick={() => selectActivity(activity)}
                    />
                ))}
            </div>

            {isBuilderOpen && (
                <div className="fixed inset-0 z-[120] bg-black">
                    <div className="mx-auto flex h-full max-w-md flex-col bg-zinc-950">
                        <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/95 px-5 pb-4 pt-12">
                            <div className="flex items-center gap-4">
                                <button onClick={handleBuilderBack} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-zinc-800 bg-black text-white">
                                    <ArrowLeft size={24} />
                                </button>
                                <div className="min-w-0">
	                                    <div className="text-[10px] font-black uppercase tracking-[0.32em] text-emerald-300">{tr('lifestyle.customize')}</div>
                                    <h3 className="truncate text-2xl font-black text-white">{selectedActivity.name}</h3>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 pb-32 custom-scrollbar">
                            <div className={`rounded-[2rem] border p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${builderShellClass}`}>
                                <div className="flex items-start gap-4">
                                    <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl border ${selectedVisual.bg}`}>
                                        <SelectedIcon size={25} className={selectedVisual.accent} />
                                    </div>
                                    <div className="min-w-0 flex-1">
	                                        <div className={`text-[10px] font-black uppercase tracking-[0.28em] ${isNightlifePlanner ? 'text-fuchsia-200' : isCharityPlanner ? 'text-yellow-200' : 'text-emerald-300'}`}>{tr('activities.experienceBuilder')}</div>
                                        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{getActivityLongDescription(selectedActivity, language)}</p>
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-3 gap-2">
                                    <div className="rounded-2xl bg-black/35 p-3">
	                                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-500"><WalletCards size={12} /> {tr('activities.cost')}</div>
                                        <div className={`mt-1 truncate text-xl font-black ${canAfford ? 'text-white' : 'text-rose-300'}`}>{formatMoney(quote.totalCost)}</div>
                                    </div>
                                    <div className="rounded-2xl bg-black/35 p-3">
	                                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-500"><Shield size={12} /> {tr('activities.risk')}</div>
                                        <div className={`mt-1 text-xl font-black ${getRiskTone(quote.risk)}`}>{quote.risk}%</div>
                                    </div>
                                    <div className="rounded-2xl bg-black/35 p-3">
	                                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-500"><CalendarDays size={12} /> {tr('connections.status')}</div>
	                                        <div className="mt-1 truncate text-xl font-black text-white">{cooldownWeeks > 0 ? tr('activities.locked') : tr('activities.ready')}</div>
                                    </div>
                                </div>

                                {isTripPlanner ? (
                                    <div className="mt-5 space-y-5">
                                        <TripPreviewCard
                                            country={selectedCountry}
                                            city={selectedCity}
                                            days={selectedTripDays}
                                            stay={selectedStay}
                                            travel={selectedTravelMode}
                                            totalCost={quote.totalCost}
                                        />
                                        <CountryPicker countries={TRIP_DESTINATION_OPTIONS} selectedId={selectedCountryId} onSelect={(id) => updateTripSelection('tripDestinationId', id)} />
                                        <CityPostcardRail country={selectedCountry} cities={tripCityOptions} selectedId={selectedCityId} onSelect={(id) => updateTripSelection('tripCityId', id)} />
                                        <TripDurationPicker days={selectedTripDays} onChange={updateTripDuration} />
	                                        <CompactOptionRail title={tr('activities.stay')} choices={TRIP_STAY_OPTIONS} selectedId={selections.tripStayId} onSelect={(id) => updateTripSelection('tripStayId', id)} />
	                                        <CompactOptionRail title={tr('activities.travelMode')} choices={tripTravelOptions} selectedId={selectedTripTravelId} onSelect={(id) => updateTripSelection('tripTravelId', id)} />
	                                        <CompactOptionRail title={tr('activities.companions')} choices={availableInviteOptions} selectedId={selectedInviteId} onSelect={(id) => updateSelection('inviteId', id)} />
	                                        <CompactOptionRail title={tr('activities.privacy')} choices={selectedActivity.privacyOptions} selectedId={selections.privacyId} onSelect={(id) => updateSelection('privacyId', id)} />
	                                        <CompactOptionRail title={tr('activities.tripActivities')} choices={tripActivityOptions} selectedIds={selections.tripActivityIds || []} onSelect={toggleTripActivity} multi />
                                        {!!selectedActivity.extras?.length && (
	                                            <CompactOptionRail title={tr('activities.services')} choices={selectedActivity.extras} selectedIds={selections.extraIds} onSelect={toggleExtra} multi />
                                        )}
                                    </div>
                                ) : isNightlifePlanner ? (
                                    <div className="mt-5 space-y-5">
                                        <NightlifePreviewCard
                                            eventType={selectedNightlifeType}
                                            venue={selectedNightlifeVenue}
                                            guest={selectedNightlifeGuest}
                                            crowd={selectedNightlifeCrowd}
                                            control={selectedNightlifeControl}
                                            totalCost={quote.totalCost}
                                            risk={quote.risk}
                                        />
	                                        <CompactOptionRail tone="nightlife" title={tr('activities.nightType')} choices={NIGHTLIFE_TYPE_OPTIONS} selectedId={selections.nightlifeTypeId} onSelect={(id) => updateNightlifeSelection('nightlifeTypeId', id)} />
	                                        <CompactOptionRail tone="nightlife" title={tr('activities.venue')} choices={nightlifeVenueOptions} selectedId={selectedNightlifeVenue?.id} onSelect={(id) => updateNightlifeSelection('nightlifeVenueId', id)} />
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-3">
	                                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">{tr('activities.headlineGuest')}</div>
	                                                <div className="text-[9px] font-black uppercase tracking-widest text-fuchsia-200/60">{tr('activities.rsvpNotGuaranteed')}</div>
                                            </div>
                                            <input
                                                value={nightlifeGuestQuery}
                                                onChange={(event) => setNightlifeGuestQuery(event.target.value)}
	                                                placeholder={tr('activities.searchGuestName')}
                                                className="w-full rounded-2xl border border-fuchsia-300/20 bg-black/55 px-4 py-3 text-sm font-black text-white outline-none transition focus:border-fuchsia-300/70 placeholder:text-zinc-600"
                                            />
                                            <CompactOptionRail tone="nightlife" choices={nightlifeGuestOptions} selectedId={selections.nightlifeGuestId} onSelect={(id) => updateNightlifeSelection('nightlifeGuestId', id)} />
                                        </div>
	                                        <CompactOptionRail tone="nightlife" title={tr('activities.crowd')} choices={NIGHTLIFE_CROWD_OPTIONS} selectedId={selections.nightlifeCrowdId} onSelect={(id) => updateNightlifeSelection('nightlifeCrowdId', id)} />
	                                        <CompactOptionRail tone="nightlife" title={tr('activities.imageControl')} choices={NIGHTLIFE_CONTROL_OPTIONS} selectedId={selections.nightlifeControlId} onSelect={(id) => updateNightlifeSelection('nightlifeControlId', id)} />
	                                        <CompactOptionRail tone="nightlife" title={tr('activities.privacy')} choices={selectedActivity.privacyOptions} selectedId={selections.privacyId} onSelect={(id) => updateSelection('privacyId', id)} />
	                                        <CompactOptionRail tone="nightlife" title={tr('activities.length')} choices={selectedActivity.durationOptions} selectedId={selections.durationId} onSelect={(id) => updateSelection('durationId', id)} />
                                        {!!selectedActivity.extras?.length && (
	                                            <CompactOptionRail tone="nightlife" title={tr('activities.addOns')} choices={selectedActivity.extras} selectedIds={selections.extraIds} onSelect={toggleExtra} multi />
                                        )}
                                    </div>
                                ) : isIndustryPlanner ? (
                                    <div className="mt-5 space-y-5">
                                        <IndustryConnectionsPreviewCard
                                            event={selectedIndustryEvent}
                                            venue={selectedIndustryVenue}
                                            groups={selectedIndustryGroups}
                                            guests={selectedIndustryGuests}
                                            style={selectedIndustryStyle}
                                            service={selectedIndustryService}
                                            totalCost={quote.totalCost}
                                            risk={quote.risk}
                                        />
	                                        <CompactOptionRail tone="industry" title={tr('activities.eventType')} choices={INDUSTRY_EVENT_OPTIONS} selectedId={selectedIndustryEvent?.id} onSelect={(id) => updateIndustrySelection('industryEventId', id)} />
	                                        <CompactOptionRail tone="industry" title={tr('activities.venue')} choices={industryVenueOptions} selectedId={selectedIndustryVenue?.id} onSelect={(id) => updateIndustrySelection('industryVenueId', id)} />
	                                        <CompactOptionRail tone="industry" title={tr('activities.inviteGroups')} choices={INDUSTRY_INVITE_GROUP_OPTIONS} selectedIds={selectedIndustryGroupIds} onSelect={toggleIndustryGroup} multi />
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-3">
	                                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">{tr('activities.industryGuestList')}</div>
	                                                <div className="text-[9px] font-black uppercase tracking-widest text-amber-200/60">{tr('activities.selectedCount', { count: selectedIndustryGuests.length, total: 8 })}</div>
                                            </div>
                                            <div className="relative">
                                                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-100/55" />
                                                <input
                                                    value={industryGuestQuery}
                                                    onChange={(event) => setIndustryGuestQuery(event.target.value)}
	                                                    placeholder={tr('activities.searchIndustryGuest')}
                                                    className="w-full rounded-2xl border border-amber-300/20 bg-black/55 py-3 pl-11 pr-4 text-sm font-black text-white outline-none transition focus:border-amber-300/70 placeholder:text-zinc-600"
                                                />
                                            </div>
                                            <CompactOptionRail tone="industry" choices={industryGuestOptions} selectedIds={selections.industryGuestIds || []} onSelect={toggleIndustryGuest} multi density="roomy" />
                                            {selectedIndustryGuests.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedIndustryGuests.map(guest => (
                                                        <span key={guest.id} className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-100">
                                                            {getChoiceLabel(guest, language)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
	                                        <CompactOptionRail tone="industry" title={tr('activities.roomStyle')} choices={INDUSTRY_HOSTING_STYLE_OPTIONS} selectedId={selectedIndustryStyle?.id} onSelect={(id) => updateIndustrySelection('industryHostingStyleId', id)} />
	                                        <CompactOptionRail tone="industry" title={tr('activities.serviceLevel')} choices={INDUSTRY_SERVICE_OPTIONS} selectedId={selectedIndustryService?.id} onSelect={(id) => updateIndustrySelection('industryServiceId', id)} />
	                                        <CompactOptionRail tone="industry" title={tr('activities.expensiveAddOns')} choices={INDUSTRY_ADDON_OPTIONS} selectedIds={selectedIndustryAddonIds} onSelect={toggleIndustryAddon} multi />
                                    </div>
                                ) : isCharityPlanner ? (
                                    <div className="mt-5 space-y-5">
                                        <CharityGalaPreviewCard
                                            cause={selectedCharityCause}
                                            format={selectedCharityFormat}
                                            donation={selectedCharityDonation}
                                            guestCircle={selectedCharityGuestCircle}
                                            press={selectedCharityPress}
                                            totalCost={quote.totalCost}
                                            risk={quote.risk}
                                        />
	                                        <CompactOptionRail tone="industry" title={tr('activities.cause')} choices={CHARITY_CAUSE_OPTIONS} selectedId={selectedCharityCause?.id} onSelect={(id) => updateCharitySelection('charityCauseId', id)} />
	                                        <CompactOptionRail tone="industry" title={tr('activities.galaFormat')} choices={charityFormatOptions} selectedId={selectedCharityFormat?.id} onSelect={(id) => updateCharitySelection('charityFormatId', id)} />
	                                        <CompactOptionRail tone="industry" title={tr('activities.donationLevel')} choices={CHARITY_DONATION_OPTIONS} selectedId={charityCustomDonationAmount > 0 ? undefined : selectedBaseCharityDonation?.id} onSelect={(id) => updateCharitySelection('charityDonationId', id)} />
                                        <div className={`rounded-3xl border p-4 ${charityCustomDonationAmount > 0 ? 'border-yellow-300 bg-yellow-300/10' : 'border-zinc-800 bg-black/30'}`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
	                                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-100/70">{tr('activities.customAmount')}</div>
	                                                    <div className="mt-1 text-sm font-bold leading-relaxed text-zinc-400">{tr('activities.customAmountSubtext')}</div>
                                                </div>
                                                {charityCustomDonationAmount > 0 && (
                                                    <button onClick={() => updateCharityCustomDonation(0)} className="shrink-0 rounded-full border border-zinc-700 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400">
	                                                        {tr('activities.clear')}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-yellow-300/20 bg-black/45 px-4 py-3">
                                                <span className="text-xl font-black text-yellow-100">$</span>
                                                <input
                                                    value={charityCustomDonationAmount || ''}
                                                    type="number"
                                                    min={0}
                                                    step={50000}
                                                    onChange={(event) => updateCharityCustomDonation(Number(event.target.value))}
	                                                    placeholder={tr('activities.enterDonation')}
                                                    className="min-w-0 flex-1 bg-transparent text-right text-lg font-black text-white outline-none placeholder:text-zinc-700"
                                                />
                                            </div>
                                        </div>
	                                        <CompactOptionRail tone="industry" title={tr('activities.guestCircle')} choices={CHARITY_GUEST_CIRCLE_OPTIONS} selectedId={selectedCharityGuestCircle?.id} onSelect={(id) => updateCharitySelection('charityGuestCircleId', id)} />
	                                        <CompactOptionRail tone="industry" title={tr('activities.pressPosture')} choices={CHARITY_PRESS_OPTIONS} selectedId={selectedCharityPress?.id} onSelect={(id) => updateCharitySelection('charityPressId', id)} />
                                    </div>
                                ) : isWellnessPlanner ? (
                                    <div className="mt-5 space-y-5">
                                        <WellnessPreviewCard
                                            program={selectedWellnessProgram}
                                            provider={selectedWellnessProvider}
                                            focus={selectedWellnessFocus}
                                            support={selectedWellnessSupport}
                                            activeCondition={activeHealthCondition}
                                            language={language}
                                            treatmentMatch={treatmentMatch}
                                            totalCost={quote.totalCost}
                                            risk={quote.risk}
                                            health={player.stats.health}
                                            mood={player.stats.happiness}
                                        />
	                                        <CompactOptionRail title={tr('activities.careNeeded')} choices={WELLNESS_PROGRAM_OPTIONS} selectedId={selectedWellnessProgram?.id} onSelect={(id) => updateWellnessSelection('wellnessProgramId', id)} />
	                                        <CompactOptionRail title={tr('activities.clinicQuality')} choices={WELLNESS_PROVIDER_OPTIONS} selectedId={selectedWellnessProvider?.id} onSelect={(id) => updateWellnessSelection('wellnessProviderId', id)} />
	                                        <CompactOptionRail title={tr('activities.treatmentDepth')} choices={WELLNESS_FOCUS_OPTIONS} selectedId={selectedWellnessFocus?.id} onSelect={(id) => updateWellnessSelection('wellnessFocusId', id)} />
	                                        <CompactOptionRail title={tr('activities.aftercare')} choices={WELLNESS_SUPPORT_OPTIONS} selectedId={selectedWellnessSupport?.id} onSelect={(id) => updateWellnessSelection('wellnessSupportId', id)} />
                                    </div>
                                ) : isAdoptionPlanner ? (
                                    <div className="mt-5 space-y-5">
                                        <AdoptionStagePills
                                            stage={adoptionStage}
                                            onStage={setAdoptionStage}
                                            canViewChildren={adoptionEligibility.qualifies}
                                            hasChild={Boolean(selectedAdoptionProfile)}
                                        />
                                        {adoptionStage === 'eligibility' && (
                                            <AdoptionEligibilityCard eligibility={adoptionEligibility} availableCount={availableAdoptionProfiles.length} />
                                        )}
                                        {adoptionStage === 'children' && (
                                            <div className="space-y-4">
                                                <div className="rounded-[2rem] border border-rose-300/15 bg-black/35 p-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
	                                                            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-rose-100/70">{tr('activities.availableChildren')}</div>
	                                                            <div className="mt-1 text-lg font-black text-white">{tr('activities.chooseOneChild')}</div>
                                                        </div>
                                                        <div className="rounded-2xl bg-rose-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-100">
	                                                            {tr('activities.pool', { number: adoptionPoolCycle + 1 })}
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                                                        {availableAdoptionProfiles.map(profile => (
                                                            <AdoptionChildProfileCard
                                                                key={profile.id}
                                                                profile={profile}
                                                                selected={selectedAdoptionProfile?.id === profile.id}
                                                                onSelect={() => updateAdoptionSelection('adoptionChildId', profile.id)}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {adoptionStage === 'paperwork' && (
                                            <div className="space-y-5">
                                                <AdoptionPaperworkPanel
                                                    profile={selectedAdoptionProfile}
                                                    route={selectedAdoptionRoute}
                                                    homePrep={selectedAdoptionHomePrep}
                                                    support={selectedAdoptionSupport}
                                                    totalCost={quote.totalCost}
                                                    risk={quote.risk}
                                                />
	                                                <CompactOptionRail title={tr('activities.agencyRoute')} choices={ADOPTION_ROUTE_OPTIONS} selectedId={selectedAdoptionRoute?.id} onSelect={(id) => updateAdoptionSelection('adoptionRouteId', id)} />
	                                                <CompactOptionRail title={tr('activities.homeStudy')} choices={adoptionHomePrepOptions} selectedId={selectedAdoptionHomePrep?.id} onSelect={(id) => updateAdoptionSelection('adoptionHomePrepId', id)} />
	                                                <CompactOptionRail title={tr('activities.transitionSupport')} choices={ADOPTION_SUPPORT_OPTIONS} selectedId={selectedAdoptionSupport?.id} onSelect={(id) => updateAdoptionSelection('adoptionSupportId', id)} />
	                                                <CompactOptionRail title={tr('activities.familySetup')} choices={availableInviteOptions} selectedId={selectedInviteId} onSelect={(id) => updateSelection('inviteId', id)} />
	                                                <CompactOptionRail title={tr('activities.privacy')} choices={selectedActivity.privacyOptions} selectedId={selections.privacyId} onSelect={(id) => updateSelection('privacyId', id)} />
                                            </div>
                                        )}
                                    </div>
                                ) : isPetPlanner ? (
                                    <div className="mt-5 space-y-5">
                                        <PetStagePills
                                            stage={petStage}
                                            onStage={setPetStage}
	                                            hasCategory={Boolean(selectedPetCategory)}
	                                            hasPet={Boolean(selectedPetProfile)}
	                                            labels={{
	                                                brief: tr('activities.brief'),
	                                                stores: tr('activities.storefront'),
	                                                categories: tr('activities.petCategory'),
	                                                pets: tr('activities.availablePets'),
	                                                checkout: tr('activities.checkoutSetup')
	                                            }}
	                                        />
                                        {petStage === 'brief' ? (
                                            <PetCompanionBriefCard />
                                        ) : (
                                            <PetWelcomePreviewCard
                                                profile={selectedPetProfile}
                                                care={selectedPetCare}
                                                home={selectedPetHome}
                                                accessory={selectedPetAccessory}
                                                customization={selectedPetCustomization}
                                                permit={selectedPetPermit}
                                                totalCost={quote.totalCost}
                                                risk={quote.risk}
                                            />
                                        )}
                                        {petStage === 'stores' && (
                                            <div className="rounded-[2rem] border border-lime-300/15 bg-black/35 p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
	                                                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-lime-100/70">{tr('activities.storefront')}</div>
	                                                        <div className="mt-1 text-lg font-black text-white">{tr('activities.chooseStorefront')}</div>
                                                    </div>
                                                    <div className="shrink-0 rounded-2xl bg-lime-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-lime-100">
	                                                        {tr('activities.storeCount', { count: COMPANION_STORE_OPTIONS.length })}
                                                    </div>
                                                </div>
                                                <div className="mt-4 grid grid-cols-1 gap-3">
                                                    {COMPANION_STORE_OPTIONS.map(storeChoice => (
                                                        <PetStoreCard
                                                            key={storeChoice.id}
                                                            storeChoice={storeChoice}
                                                            selected={selectedPetStore.id === storeChoice.id}
                                                            onSelect={() => updatePetSelection('companionStoreId', storeChoice.id)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {petStage === 'categories' && (
                                            <div className="space-y-4 rounded-[2rem] border border-lime-300/15 bg-black/35 p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
	                                                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-lime-100/70">{tr('activities.petCategory')}</div>
                                                        <div className="mt-1 text-lg font-black text-white">{selectedPetStoreName}</div>
                                                    </div>
                                                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-lime-200/20 bg-lime-300/10 text-2xl">
                                                        <span>{selectedPetStore.icon}</span>
                                                    </div>
                                                </div>
	                                                <CompactOptionRail title={tr('activities.categoriesStoreSells')} choices={petCategoryOptions} selectedId={selectedPetCategory?.id} onSelect={(id) => updatePetSelection('companionCategoryId', id)} />
                                            </div>
                                        )}
                                        {petStage === 'pets' && (
                                            <div className="rounded-[2rem] border border-lime-300/15 bg-black/35 p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
	                                                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-lime-100/70">{tr('activities.availablePets')}</div>
	                                                        <div className="mt-1 text-lg font-black text-white">{tr('activities.petCategoryAtStore', { category: selectedPetCategory ? getChoiceLabel(selectedPetCategory, language) : tr('activities.chooseCategory'), store: selectedPetStoreName })}</div>
                                                    </div>
                                                    <div className="shrink-0 rounded-2xl bg-lime-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-lime-100">
	                                                        {tr('activities.pool', { number: petPoolCycle + 1 })}
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                                    {filteredPetProfiles.map(profile => (
                                                        <PetCompanionProfileCard
                                                            key={profile.id}
                                                            profile={profile}
                                                            selected={selectedPetProfile?.id === profile.id}
                                                            onSelect={() => updatePetSelection('companionPetId', profile.id)}
                                                        />
                                                    ))}
                                                </div>
                                                {filteredPetProfiles.length === 0 && (
                                                    <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm font-bold text-zinc-500">
	                                                        {tr('activities.noPetsAvailable')}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {petStage === 'checkout' && (
                                            <div className="space-y-5 rounded-[2rem] border border-lime-300/15 bg-black/35 p-4">
                                                <div>
	                                                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-lime-100/70">{tr('activities.checkoutSetup')}</div>
	                                                    <div className="mt-1 text-lg font-black text-white">{tr('activities.prepareHomeBeforeNaming')}</div>
                                                    <div className="mt-1 text-xs font-bold leading-relaxed text-zinc-500">
                                                        {selectedPetStoreName} • {selectedPetCategoryLabel || tr('activities.pet')} • {selectedPetBreed || tr('activities.breed')} {selectedPetSpecies || tr('activities.species')}
                                                    </div>
                                                </div>
	                                                <CompactOptionRail title={tr('activities.petHome')} choices={COMPANION_HOME_OPTIONS} selectedId={selectedPetHome?.id} onSelect={(id) => updatePetSelection('companionHomeId', id)} />
	                                                <CompactOptionRail title={tr('activities.accessory')} choices={COMPANION_ACCESSORY_OPTIONS} selectedId={selectedPetAccessory?.id} onSelect={(id) => updatePetSelection('companionAccessoryId', id)} />
	                                                <CompactOptionRail title={tr('activities.customization')} choices={COMPANION_CUSTOMIZATION_OPTIONS} selectedId={selectedPetCustomization?.id} onSelect={(id) => updatePetSelection('companionCustomizationId', id)} />
	                                                <CompactOptionRail title={tr('activities.careSetup')} choices={petCareOptions} selectedId={selectedPetCare?.id} onSelect={(id) => updatePetSelection('companionCareId', id)} />
	                                                <CompactOptionRail title={tr('activities.legalEthics')} choices={petPermitOptions} selectedId={selectedPetPermit?.id} onSelect={(id) => updatePetSelection('companionPermitId', id)} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-5 space-y-5">
	                                        <OptionGroup title={tr('activities.scale')} choices={selectedActivity.scales} selectedId={selections.scaleId} onSelect={(id) => updateSelection('scaleId', id)} />
	                                        <OptionGroup title={tr('activities.privacy')} choices={selectedActivity.privacyOptions} selectedId={selections.privacyId} onSelect={(id) => updateSelection('privacyId', id)} />
	                                        <OptionGroup title={tr('activities.invite')} choices={availableInviteOptions} selectedId={selectedInviteId} onSelect={(id) => updateSelection('inviteId', id)} />
	                                        <OptionGroup title={tr('activities.duration')} choices={selectedActivity.durationOptions} selectedId={selections.durationId} onSelect={(id) => updateSelection('durationId', id)} />
                                        {!!selectedActivity.extras?.length && (
	                                            <OptionGroup title={tr('activities.addOns')} choices={selectedActivity.extras} selectedIds={selections.extraIds} onSelect={toggleExtra} multi />
                                        )}
                                    </div>
                                )}

                                <div className="mt-5 rounded-3xl border border-zinc-800 bg-black/40 p-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
                                        <BadgeCheck size={14} className="text-emerald-300" />
	                                        {tr('activities.preview')}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {quote.effectSummary.length ? quote.effectSummary.map(effect => (
                                            <span key={effect} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-200">{effect}</span>
                                        )) : (
	                                            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-black text-zinc-500">{tr('activities.memoryOnly')}</span>
                                        )}
                                    </div>
                                    {!!quote.assetSignals?.length && (
                                        <div className="mt-3 grid gap-2">
                                            {quote.assetSignals.map(signal => (
                                                <div key={`${signal.label}-${signal.description}`} className="flex items-start gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2">
                                                    <Sparkles size={15} className="mt-0.5 shrink-0 text-cyan-200" />
                                                    <div className="min-w-0">
                                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">{signal.label}</div>
                                                        <div className="mt-0.5 text-xs font-bold leading-snug text-zinc-300">{signal.description}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {status && <div className={`mt-3 rounded-2xl border px-3 py-2 text-sm font-black ${status.tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>{status.text}</div>}
	                                    {!canAfford && <div className="mt-3 text-xs font-bold text-rose-300">{tr('activities.needMoreCash', { amount: formatMoney(quote.totalCost - player.money) })}</div>}
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/95 p-5 pb-8">
                            <button
                                onClick={handleBuilderPrimaryAction}
                                disabled={builderPrimaryDisabled}
                                className={`group relative w-full overflow-hidden rounded-[1.65rem] border px-4 py-3.5 text-black transition-all active:scale-[0.99] disabled:border-zinc-700 disabled:from-zinc-800 disabled:via-zinc-800 disabled:to-zinc-900 disabled:text-zinc-500 disabled:shadow-none ${isNightlifePlanner ? 'border-fuchsia-200/30 bg-gradient-to-r from-fuchsia-300 via-pink-300 to-amber-200 shadow-[0_18px_42px_rgba(217,70,239,0.24)]' : isCharityPlanner ? 'border-yellow-200/30 bg-gradient-to-r from-yellow-200 via-amber-300 to-cyan-200 shadow-[0_18px_42px_rgba(251,191,36,0.2)]' : 'border-emerald-200/30 bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 shadow-[0_18px_42px_rgba(52,211,153,0.24)]'}`}
                            >
                                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.45),transparent_28%),linear-gradient(110deg,transparent,rgba(255,255,255,0.22),transparent)] opacity-75" />
                                <span className="relative flex items-center justify-between gap-3">
                                        <span className="flex min-w-0 flex-1 items-center gap-3">
                                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-black/14 ring-1 ring-black/10">
                                            <SelectedIcon size={19} strokeWidth={3} />
                                            </span>
                                            <span className="min-w-0 flex-1 text-left">
                                                <span className="block text-[12px] font-black uppercase leading-tight tracking-[0.12em] min-[380px]:text-[13px] min-[380px]:tracking-[0.14em]">
                                                    {builderPrimaryLabel}
                                                </span>
                                                <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-[0.16em] text-black/55">
                                                    {builderPrimarySubLabel}
                                                </span>
                                            </span>
                                    </span>
                                    <span className="shrink-0 rounded-2xl bg-black/18 px-3 py-2 text-right ring-1 ring-black/10 backdrop-blur">
                                        <span className="block text-[8px] font-black uppercase tracking-[0.18em] text-black/50">Total</span>
                                        <span className="block text-base font-black leading-none tracking-normal">{formatMoney(quote.totalCost)}</span>
                                    </span>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AdoptionNameModal
                pending={pendingAdoptionName}
                onKeep={handleAdoptionNameKeep}
                onSave={handleAdoptionNameSave}
            />
            <PetNameModal
                pending={pendingPetName}
                onKeep={handlePetNameKeep}
                onSave={handlePetNameSave}
            />
            <ActivityResultModal
                result={activityResult}
                onClose={handleActivityResultClose}
                onAddFriend={handleAddEncounterFriend}
            />

            <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
                    <Users size={15} />
                    Recent Memories This Year
                </div>
                {currentYearMemories.length === 0 ? (
                    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 text-sm text-zinc-500">
                        No lifestyle memories this year.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {currentYearMemories.slice(0, 4).map(memory => {
                            const activity = LIFESTYLE_ACTIVITY_CATALOG.find(item => item.id === memory.activityId);
                            const meta = activity ? getActivityVisual(activity) : categoryMeta[memory.category];
                            const Icon = meta.icon;
                            return (
                                <div key={memory.id} className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${meta.bg}`}>
                                            <Icon size={18} className={meta.accent} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="truncate font-black text-white">{memory.title}</div>
                                                <div className="shrink-0 font-mono text-xs text-zinc-500">{formatMoney(memory.cost)}</div>
                                            </div>
                                            <div className="mt-1 text-xs leading-snug text-zinc-500">Age {memory.year}, W{memory.week} • {memory.effectSummary.join(' • ') || 'memory created'}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
        </ActivityLanguageContext.Provider>
    );
};
