import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [
  {
    name: 'activity service exists',
    pass: () => exists('services/lifestyleActivities.ts'),
  },
  {
    name: 'activities screen exists',
    pass: () => exists('views/lifestyle/LifestyleActivities.tsx'),
  },
  {
    name: 'player stores lifestyle activity state',
    pass: () => {
      const source = read('types.ts');
      return source.includes('LifestyleActivityState') && source.includes('lifestyleActivities?: LifestyleActivityState');
    },
  },
  {
    name: 'service exposes builder quote and resolver',
    pass: () => {
      if (!exists('services/lifestyleActivities.ts')) return false;
      const source = read('services/lifestyleActivities.ts');
      return source.includes('buildLifestyleActivityQuote') && source.includes('resolveLifestyleActivity') && source.includes('LIFESTYLE_ACTIVITY_CATALOG');
    },
  },
  {
    name: 'nightlife supports owned homes and NPC headline guest outcomes',
    pass: () => {
      const source = read('services/lifestyleActivities.ts');
      return source.includes('getAvailableNightlifeVenueOptions')
        && source.includes('owned_property:')
        && source.includes('getAvailableNightlifeGuestOptions')
        && source.includes('npc_guest:')
        && source.includes('NPC_DATABASE')
        && source.includes('upsertNightlifeGuestRelationship');
    },
  },
  {
    name: 'wellness supports recovery programs and pressure relief flags',
    pass: () => {
      const source = read('services/lifestyleActivities.ts');
      return source.includes('WELLNESS_PROGRAM_OPTIONS')
        && source.includes('WELLNESS_PROVIDER_OPTIONS')
        && source.includes('flu_care')
        && source.includes('cancer_screening')
        && source.includes('camera_ready_care')
        && source.includes('medical_concierge')
        && source.includes('buildWellnessRecoveryOutcome')
        && source.includes('wellnessProgramId')
        && source.includes('burnoutWeeks')
        && source.includes('recentHealthCrises');
    },
  },
  {
    name: 'trip planner supports specific owned aircraft',
    pass: () => {
      const source = read('services/lifestyleActivities.ts');
      return source.includes('getOwnedAircraftTravelChoices')
        && source.includes('owned_aircraft:')
        && source.includes('customItems');
    },
  },
  {
    name: 'activities builder uses dynamic nightlife venues and guest search',
    pass: () => {
      const source = read('views/lifestyle/LifestyleActivities.tsx');
      return source.includes('getAvailableNightlifeVenueOptions')
        && source.includes('nightlifeVenueOptions')
        && source.includes('getAvailableNightlifeGuestOptions')
        && source.includes('activities.searchGuestName')
        && source.includes('isBuilderOpen && isNightlifePlanner')
        && !source.includes('Actor Database')
        && !source.includes('Invite List')
        && !source.includes('choices={NIGHTLIFE_VENUE_OPTIONS}');
    },
  },
  {
    name: 'activities builder has a dedicated medical wellness planner',
    pass: () => {
      const source = read('views/lifestyle/LifestyleActivities.tsx');
      return source.includes('WellnessPreviewCard')
        && source.includes('WELLNESS_PROGRAM_OPTIONS')
        && source.includes('activities.careNeeded')
        && source.includes('activities.clinicQuality')
        && source.includes('activities.treatmentDepth')
        && source.includes('activities.aftercare')
        && source.includes('updateWellnessSelection')
        && source.includes('activities.confirmRecovery')
        && source.includes('isBuilderOpen && isWellnessPlanner');
    },
  },
  {
    name: 'wellness exposes one clinic card with private care inside it',
    pass: () => {
      const service = read('services/lifestyleActivities.ts');
      const ui = read('views/lifestyle/LifestyleActivities.tsx');
      return service.includes("id: 'wellness_reset'")
        && service.includes("name: 'Health Clinic'")
        && service.includes("label: 'Private Doctor'")
        && service.includes("label: 'Medical Concierge'")
        && !service.includes("id: 'private_doctor',\n        category: 'WELLNESS'")
        && !service.includes("name: 'Private Care'")
        && !service.includes("activity.id === 'private_doctor'")
        && !ui.includes('private_doctor: Stethoscope')
        && !ui.includes("selectedActivity.id === 'private_doctor'");
    },
  },
  {
    name: 'industry connections is an expensive organic networking builder',
    pass: () => {
      const service = read('services/lifestyleActivities.ts');
      const ui = read('views/lifestyle/LifestyleActivities.tsx');
      const types = read('types.ts');
      const locale = read('services/localization/locales/en.ts');
      return service.includes("id: 'industry_dinner'")
        && service.includes("name: 'Industry Connections'")
        && service.includes('INDUSTRY_EVENT_OPTIONS')
        && service.includes('INDUSTRY_VENUE_OPTIONS')
        && service.includes('INDUSTRY_INVITE_GROUP_OPTIONS')
        && service.includes('INDUSTRY_HOSTING_STYLE_OPTIONS')
        && service.includes('INDUSTRY_SERVICE_OPTIONS')
        && service.includes('INDUSTRY_ADDON_OPTIONS')
        && service.includes('buildIndustryConnectionsOutcome')
        && service.includes('upsertIndustryRelationships')
        && locale.includes('services.lifestyle.industry.outcome.casting.standard.sender')
        && locale.includes('activities.careerChance')
        && service.includes('getIndustryGuestRsvpChance')
        && locale.includes('invite only, RSVP not guaranteed')
        && locale.includes('No fee was paid')
        && locale.includes('joked about your invite')
        && service.includes('baseCost: 35_000')
        && types.includes('industryEventId?: string')
        && types.includes('industryGuestIds?: string[]')
        && types.includes("'INDUSTRY_EVENT'")
        && ui.includes('isIndustryPlanner')
        && ui.includes('IndustryConnectionsPreviewCard')
        && ui.includes('activities.industryGuestList')
        && ui.includes('activities.searchIndustryGuest')
        && ui.includes('activities.industryPreview.inviteNote')
        && ui.includes('toggleIndustryGuest')
        && ui.includes('activities.inviteGroups')
        && ui.includes('isBuilderOpen && isIndustryPlanner');
    },
  },
  {
    name: 'charity gala is a cause and legacy builder',
    pass: () => {
      const service = read('services/lifestyleActivities.ts');
      const loop = read('services/gameLoop.ts');
      const ui = read('views/lifestyle/LifestyleActivities.tsx');
      const types = read('types.ts');
      return service.includes("id: 'charity_gala'")
        && service.includes('CHARITY_CAUSE_OPTIONS')
        && service.includes('CHARITY_FORMAT_OPTIONS')
        && service.includes('CHARITY_DONATION_OPTIONS')
        && service.includes('CHARITY_GUEST_CIRCLE_OPTIONS')
        && service.includes('CHARITY_PRESS_OPTIONS')
        && service.includes('buildCharityGalaOutcome')
        && service.includes('charityLegacyScore')
        && service.includes('college_scholarships')
        && service.includes('campus_building_fund')
        && service.includes("extras: []")
        && service.includes("donationAmount >= 2_500_000")
        && service.includes("donationAmount >= 1_000_000")
        && service.includes('charityTaxShield')
        && service.includes('charityTaxInvestigation')
        && service.includes('charityMovieGoodwillMultiplier')
        && loop.includes('charityMovieGoodwillMultiplier')
        && loop.includes('goodwillAdjustedRevenue')
        && service.includes('charityCauseId')
        && types.includes('charityCauseId?: string')
        && types.includes("'CHARITY_CAUSE'")
        && ui.includes('isCharityPlanner')
        && ui.includes('CharityGalaPreviewCard')
        && ui.includes('activities.donationLevel')
        && ui.includes('activities.pressPosture')
        && ui.includes('isBuilderOpen && isCharityPlanner')
        && !ui.includes('Legacy Add Ons');
    },
  },
  {
    name: 'activities support state-aware results, friend encounters, and short repeat gaps',
    pass: () => {
      const service = read('services/lifestyleActivities.ts');
      const ui = read('views/lifestyle/LifestyleActivities.tsx');
      const types = read('types.ts');
      const loop = read('services/gameLoop.ts');
      const messages = read('views/mobile/MessagesApp.tsx');
      const mobile = read('views/mobile/MobilePage.tsx');
      const locale = read('services/localization/locales/en.ts');
      return service.includes('TRIP_MAX_DAYS = 7')
        && service.includes('getAvailableInviteOptions')
        && service.includes('getCharityDonationChoice')
        && service.includes('charityCustomDonationAmount')
        && service.includes('buildSoloFriendEncounter')
        && service.includes('friendEncounter')
        && ui.includes('currentYearMemories')
        && service.includes('lifetimeTripDays')
        && service.includes('lifetimeCharityGiven')
        && locale.includes('services.lifestyle.generic.message.tripCooldown')
        && types.includes('charityCustomDonationAmount?: number')
        && types.includes('lifetimeActivityCounts?: Record<string, number>')
        && types.includes('lifetimeFriendEncounters?: number')
        && ui.includes('ActivityResultModal')
        && ui.includes('activities.customAmount')
        && ui.includes('Recent Memories This Year')
        && ui.includes('activities.tripDone')
        && ui.includes('activities.tryNextWeek')
        && ui.includes('getAvailableInviteOptions(selectedActivity, player)')
        && ui.includes('const presets = [3, 5, 7]')
        && ui.includes('EMPTY_LIFESTYLE_ACTIVITY_QUOTE')
        && service.includes('cooldownWeeks: 1')
        && service.includes("activityId === 'vacation_escape'")
        && service.includes('latestTrip?.createdAbsoluteWeek === currentAbsoluteWeek ? 1 : 0')
        && loop.includes('buildFriendFavorRequest')
        && loop.includes('FRIEND_FAVOR')
        && loop.includes('lastFriendFavorAbsWeek')
        && messages.includes('selectedFriendFavor')
        && messages.includes('handleFriendFavorResponse')
        && messages.includes('Friend Favor')
        && mobile.includes("msg.type === 'SYSTEM' && msg.data?.kind === 'FRIEND_FAVOR'")
        && mobile.includes('Favor declined')
        && mobile.includes('Friend helped');
    },
  },
  {
    name: 'adoption is a family gateway and child actions stay in connections',
    pass: () => {
      const service = read('services/lifestyleActivities.ts');
      const ui = read('views/lifestyle/LifestyleActivities.tsx');
      const social = read('views/SocialPage.tsx');
      return service.includes("id: 'adoption_center'")
        && service.includes("name: 'Adoption Center'")
        && service.includes('ADOPTION_CHILD_OPTIONS')
        && service.includes('getAvailableAdoptionChildProfiles')
        && service.includes('buildAdoptionOutcome')
        && service.includes("relation: 'Child'")
        && !service.includes("id: 'family_day'")
        && !service.includes("name: 'Family Day'")
        && ui.includes('AdoptionEligibilityCard')
        && ui.includes('availableAdoptionProfiles')
        && social.includes("selectedContact.relation === 'Child'")
        && social.includes('ABANDON_CHILD')
        && social.includes('RECONNECT_CHILD');
    },
  },
  {
    name: 'adoption uses eligibility, child profile cards, paperwork, and naming completion',
    pass: () => {
      const service = read('services/lifestyleActivities.ts');
      const ui = read('views/lifestyle/LifestyleActivities.tsx');
      const types = read('types.ts');
      return service.includes('ADOPTION_CHILD_PROFILES')
        && service.includes('getAdoptionEligibility')
        && service.includes('getAdoptionChildProfile')
        && service.includes('approvalChance')
        && types.includes('adoptionCustomName?: string')
        && types.includes('familyTitle?:')
        && service.includes('ADOPTION_POOL_REFRESH_WEEKS = 3')
        && service.includes('getAvailableAdoptionChildOptions')
        && service.includes('getAdoptionPoolCycle')
        && service.includes('Array.from({ length: count }')
        && ui.includes('AdoptionEligibilityCard')
        && ui.includes('AdoptionChildProfileCard')
        && ui.includes('AdoptionPaperworkPanel')
        && ui.includes('AdoptionNameModal')
        && ui.includes('adoptionStage')
        && ui.includes('availableAdoptionProfiles.map')
        && ui.includes('activities.proceedDocumentation')
        && ui.includes('isBuilderOpen && isAdoptionPlanner')
        && !ui.includes('title="Child Match" choices={ADOPTION_CHILD_OPTIONS}');
    },
  },
  {
    name: 'pet companion center rotates emoji pets into connections',
    pass: () => {
      const service = read('services/lifestyleActivities.ts');
      const ui = read('views/lifestyle/LifestyleActivities.tsx');
      const types = read('types.ts');
      const locale = read('services/localization/locales/en.ts');
      return service.includes('PET_COMPANION_POOL_REFRESH_WEEKS = 3')
        && service.includes('PET_COMPANION_STORES')
        && service.includes('COMPANION_HOME_OPTIONS')
        && service.includes('COMPANION_ACCESSORY_OPTIONS')
        && service.includes('COMPANION_CUSTOMIZATION_OPTIONS')
        && service.includes('getCompanionCareOptionsForPet')
        && service.includes('getCompanionPermitOptionsForPet')
        && service.includes("sanctuary_sponsorship') return profile?.acquisition === 'endangered'")
        && service.includes('const pool = [...getAvailablePetCompanionProfiles(player), ...PET_COMPANION_TEMPLATES]')
        && service.includes('const publicPet = profile.rarity ===')
        && service.includes('getPetCompanionCategoryOptions')
        && service.includes('getFilteredPetCompanionProfiles')
        && service.includes('listingTitle')
        && service.includes("id: 'pomeranian_puppy_kiki'")
        && service.includes("id: 'german_shepherd_pup_bruno'")
        && locale.includes('services.lifestyle.pet.profile.pomeranian_puppy_kiki.listingTitle')
        && locale.includes('services.lifestyle.pet.profile.german_shepherd_pup_bruno.listingTitle')
        && service.includes('Fancy Mouse')
        && service.includes('Corn Snake')
        && service.includes("id: 'rodents'")
        && service.includes("id: 'snakes'")
        && service.includes('PET_COMPANION_TEMPLATES')
        && service.includes('getAvailablePetCompanionProfiles')
        && service.includes('buildPetCompanionOutcome')
        && service.includes('buildEmojiPetAvatar')
        && service.includes("relation: 'Pet'")
        && service.includes('petEmoji')
        && service.includes('petStoreName')
        && service.includes('petHomeSetup')
        && service.includes('petAccessory')
        && service.includes('petCustomization')
        && types.includes("| 'Pet'")
        && types.includes("'COMPANION_PET'")
        && types.includes("'COMPANION_STORE'")
        && types.includes('companionStoreId?: string')
        && types.includes('petCustomization?: string')
        && ui.includes('PetCompanionProfileCard')
        && ui.includes('PetWelcomePreviewCard')
        && ui.includes('PetCompanionBriefCard')
        && ui.includes('PetStoreCard')
        && ui.includes('handleBuilderBack')
        && ui.includes("const stageOrder: PetStage[] = ['brief', 'stores', 'categories', 'pets', 'checkout']")
        && ui.includes('choices={petCareOptions}')
        && ui.includes('choices={petPermitOptions}')
        && ui.includes('petStage')
        && ui.includes('min-w-0 flex-1 text-left')
        && ui.includes('leading-tight tracking-[0.12em]')
        && !ui.includes('block truncate text-[13px] font-black uppercase tracking-[0.16em]"')
        && ui.includes('activities.brief')
        && ui.includes('activities.storefront')
        && ui.includes('activities.petCategory')
        && ui.includes('activities.checkoutSetup')
        && ui.includes('PetNameModal')
        && ui.includes('filteredPetProfiles.map')
        && ui.includes('>{profile.name}</h4>')
        && ui.includes("profile?.name || t(language, 'activities.petPreview.choosePet')")
        && ui.includes('getPetProfileListingTitle(profile, language)')
        && ui.includes('isBuilderOpen && isPetPlanner')
        && !ui.includes('Fresh Companion Pool');
    },
  },
  {
    name: 'connections expose pet emoji cards and care interactions',
    pass: () => {
      const social = read('views/SocialPage.tsx');
      const actions = read('hooks/useGameActions.ts');
      return social.includes("relation === 'Pet'")
        && social.includes('petEmoji')
        && social.includes('PET_FEED')
        && social.includes('PET_PLAY')
        && social.includes('PET_GROOM')
        && social.includes('PET_VET')
        && social.includes('connections.petCare')
        && actions.includes("partner?.relation === 'Pet'")
        && actions.includes('petRarity')
        && actions.includes('PET_FEED')
        && actions.includes('PET_VET');
    },
  },
  {
    name: 'lifestyle page routes activities',
    pass: () => {
      const source = read('views/LifestylePage.tsx');
      return source.includes('LifestyleActivities') && source.includes("'ACTIVITIES'") && source.includes("setView('ACTIVITIES')");
    },
  },
  {
    name: 'save migration initializes lifestyle activities',
    pass: () => {
      const source = read('services/saveMigration.ts');
      return source.includes('SAVE_MIGRATION_VERSION = 15') && source.includes('ensureLifestyleActivityState') && source.includes('lifestyleActivities');
    },
  },
  {
    name: 'audit script is registered',
    pass: () => {
      const pkg = JSON.parse(read('package.json'));
      return pkg.scripts?.['audit:lifestyle-activities'] === 'node scripts/audit-lifestyle-activities.mjs';
    },
  },
];

const failures = checks.filter((check) => !check.pass());

if (failures.length) {
  console.error('Lifestyle activities audit failed:');
  failures.forEach((failure) => console.error(`- ${failure.name}`));
  process.exit(1);
}

console.log(`Lifestyle activities audit passed (${checks.length} checks).`);
