import type { Player, Relationship } from '../types';
import type { IconName } from '../components/ui-overhaul/ui';
import {
  calculateLegacyScore,
  getAbsoluteWeek,
  getGenerationNumber,
  getInteractionAgeInWeeks,
  getLegacyInheritancePreview,
  getRelationshipAge,
  LEGACY_MIN_PLAYABLE_AGE,
} from './legacyLogic';
import { getDivorceLawyerCost, isChildAbandoned } from './familyLogic';
import { hasOwnedPremiumAssetInCollection } from './premiumLogic';
import { getDynastyMemberAge, normalizeDynastyCareerState } from './dynastyCareer';
import { getCanonicalProfileAvatar, isLegacyPixelAvatar } from './profileAvatar';

export type GiftInteractionType = 'GIFT_THOUGHTFUL' | 'GIFT_LUXURY' | 'GIFT_APOLOGY' | 'GIFT_FAMILY_SUPPORT' | 'GIFT_INDUSTRY_FAVOR';
export type SocialInteractionType = 'CALL' | 'CHECK_IN' | 'DEEP_TALK' | 'FAMILY_DINNER' | 'INDUSTRY_LUNCH' | 'HANGOUT' | 'GIFT' | GiftInteractionType | 'NETWORK' | 'DATE' | 'PROPOSE' | 'INTIMACY' | 'CLUBBING' | 'TRIP' | 'ESTATE_DATE' | 'YACHT_DATE' | 'JET_ESCAPE' | 'LUXURY_GIFT' | 'ABANDON_CHILD' | 'RECONNECT_CHILD' | 'BREAK_UP' | 'DIVORCE_SETTLE' | 'DIVORCE_FIGHT_BUDGET' | 'DIVORCE_FIGHT_ESTABLISHED' | 'DIVORCE_FIGHT_ELITE' | 'PET_FEED' | 'PET_PLAY' | 'PET_GROOM' | 'PET_VET';

export interface SocialUiMove {
  id: string;
  action?: SocialInteractionType;
  name: string;
  note: string;
  icon: IconName;
  color: string;
  energy: number;
  cost: number;
  gain?: number;
  resultLabel?: string;
  disabled?: boolean;
  pickLabel?: string;
  danger?: boolean;
  choices?: SocialUiMove[];
}

export interface SocialUiPerson {
  id: string;
  relationship: Relationship;
  name: string;
  role: string;
  group: string;
  bond: number;
  status: string;
  lastTouchWeeks: number;
  age?: number;
  blurb: string;
  avatarUrl?: string;
  accent?: string;
  moves: SocialUiMove[];
}

export interface SocialUiHeir {
  id: string;
  name: string;
  score: number;
  netWorth: number;
  projects: number;
  awards: number;
  fame: number;
  businesses: number;
  avatarUrl?: string;
  age?: number;
  continuationRelationship?: Relationship;
  continuationEligible?: boolean;
}

export interface SocialUiGeneration {
  n: number;
  label: string;
  note: string;
  members: SocialUiHeir[];
}

export interface SocialUiModel {
  people: SocialUiPerson[];
  generations: SocialUiGeneration[];
  dynastyScore: number;
  currentGeneration: number;
  heirsInLine: number;
  money: number;
  energy: number;
  inheritance: ReturnType<typeof getLegacyInheritancePreview>;
  careerMembers: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
    generation: number;
    age: number;
    status: string;
    detail: string;
    working: boolean;
  }>;
}

const isNetwork = (relationship: Relationship) => ['Agent', 'Director', 'Connection', 'Manager', 'Colleague', 'Networking'].includes(relationship.relation);
const isFamily = (relationship: Relationship) => ['Parent', 'Sibling', 'Child'].includes(relationship.relation);
const isRomantic = (relationship: Relationship) => relationship.relation === 'Partner' || relationship.relation === 'Spouse';

const groupFor = (relationship: Relationship) => {
  if (relationship.relation === 'Deceased Parent') return 'LEGACY BONDS';
  if (['Parent', 'Sibling', 'Child', 'Pet'].includes(relationship.relation)) return 'INNER CIRCLE';
  if (['Partner', 'Spouse', 'Ex-Partner', 'Ex-Spouse'].includes(relationship.relation)) return 'RELATIONSHIPS';
  if (isNetwork(relationship)) return 'INDUSTRY';
  return 'FRIENDS';
};

const statusFor = (relationship: Relationship) => {
  if (relationship.relation === 'Deceased Parent') return 'In memory';
  if (relationship.closeness >= 85) return 'Trusted';
  if (relationship.closeness >= 60) return 'Warm';
  if (relationship.closeness >= 35) return 'Fragile';
  return 'Cold';
};

const relationBlurb = (relationship: Relationship) => {
  if (relationship.relation === 'Pet') return `${relationship.petBreed || ''} ${relationship.petSpecies || 'Companion'}`.trim() + '. Care keeps this bond healthy.';
  if (relationship.relation === 'Deceased Parent') return 'This relationship is preserved as part of your family legacy.';
  if (isRomantic(relationship)) return 'Romance needs time, attention, and deliberate choices to stay strong.';
  if (isNetwork(relationship)) return 'Professional bonds can improve access, reputation, and future opportunity.';
  if (isFamily(relationship)) return 'Family bonds decay when ignored. Small contact is often enough to keep things warm.';
  return 'Keep in touch before distance turns a useful connection cold.';
};

const disabledFor = (player: Player, energy: number, cost: number, locked = false) => locked || player.energy.current < energy || player.money < cost;

const move = (
  player: Player,
  action: SocialInteractionType,
  name: string,
  note: string,
  icon: IconName,
  color: string,
  energy: number,
  cost: number,
  gain?: number,
  extra: Partial<SocialUiMove> = {},
): SocialUiMove => ({
  id: action,
  action,
  name,
  note,
  icon,
  color,
  energy,
  cost,
  gain,
  disabled: disabledFor(player, energy, cost),
  ...extra,
});

const giftChoices = (player: Player, relationship: Relationship): SocialUiMove[] => {
  const famous = player.stats.fame > 75;
  const choices = [
    move(player, 'GIFT_THOUGHTFUL', 'Thoughtful Gift', 'Personal, quiet, and chosen for them.', 'heart', 'var(--mood)', 0, famous ? 1400 : 175, 4),
    move(player, 'GIFT_APOLOGY', 'Apology Gift', 'A private note and a meaningful repair attempt.', 'gift', 'var(--gold-hi)', 0, famous ? 3600 : 600, relationship.closeness < 45 ? 9 : 6),
  ];
  if (isFamily(relationship)) choices.push(move(player, 'GIFT_FAMILY_SUPPORT', 'Family Support', 'Quiet financial support that strengthens family trust.', 'home', 'var(--acting)', 0, famous ? 8000 : 2500, 9));
  if (isNetwork(relationship)) choices.push(move(player, 'GIFT_INDUSTRY_FAVOR', 'Industry Favor', 'A professional gift that keeps the door open.', 'briefcase', 'var(--writing)', 0, famous ? 10000 : 5000, 8));
  choices.push(move(player, 'GIFT_LUXURY', 'Luxury Gift', 'Expensive, obvious, and difficult to ignore.', 'gem', 'var(--looks)', 0, famous ? 16000 : 8000, isRomantic(relationship) ? 11 : 8));
  return choices;
};

const movesFor = (player: Player, relationship: Relationship): SocialUiMove[] => {
  if (relationship.relation === 'Deceased Parent') return [];
  const petMultiplier = relationship.petRarity === 'endangered' ? 8 : relationship.petRarity === 'exotic' ? 4 : relationship.petRarity === 'premium' ? 2 : 1;
  if (relationship.relation === 'Pet') return [
    move(player, 'PET_FEED', 'Feed & Care', 'Food, routine, and daily care.', 'heart', 'var(--mood)', 4, 150 * petMultiplier, 4),
    move(player, 'PET_PLAY', 'Play Time', 'Focused time together.', 'sparkles', 'var(--gold-hi)', 10, 0, 7),
    move(player, 'PET_GROOM', 'Grooming', 'Keep your companion healthy and presentable.', 'sparkles', 'var(--acting)', 5, 450 * petMultiplier, 5),
    move(player, 'PET_VET', 'Vet Visit', 'Professional health care.', 'pulse', 'var(--health)', 3, 1200 * petMultiplier, 6),
  ];

  const moves: SocialUiMove[] = [
    move(player, 'CHECK_IN', 'Check In', 'A small message that keeps the bond alive.', 'message', 'var(--mood)', 3, 0, 1),
    move(player, 'CALL', 'Call / Text', 'Quick contact with a small bond repair.', 'call', 'var(--acting)', 5, 0, 2),
    move(player, 'HANGOUT', 'Hang Out', 'Spend real time together.', 'coffee', 'var(--gold-hi)', 15, 50, 5),
  ];

  if (isFamily(relationship)) {
    moves.push(move(player, 'DEEP_TALK', 'Deep Talk', 'Slow, honest time for family repair.', 'heart', 'var(--health)', 12, 0, 4));
    moves.push(move(player, 'FAMILY_DINNER', 'Family Dinner', 'A grounded meal and stronger family warmth.', 'home', 'var(--physique)', 18, player.stats.fame > 75 ? 1500 : 800, 7));
  }
  if (isNetwork(relationship)) {
    moves.push(move(player, 'NETWORK', 'Network', 'Work the relationship and keep access warm.', 'users', 'var(--writing)', 25, 0, 5));
    moves.push(move(player, 'INDUSTRY_LUNCH', 'Industry Lunch', 'Good taste, no hard sell, and a reputation lift.', 'briefcase', 'var(--acting)', 18, player.stats.fame > 75 ? 2500 : 1200, 6));
  }
  if (isRomantic(relationship)) {
    moves.push(move(player, 'DATE', 'Date Night', 'Focused time together.', 'heart', 'var(--health)', 20, 200, 10));
    moves.push(move(player, 'CLUBBING', 'Clubbing', 'A loud night out together.', 'star', 'var(--looks)', 40, 500, 8));
    moves.push(move(player, 'TRIP', 'Luxury Trip', 'A vacation that can fully restore the bond.', 'plane', 'var(--acting)', 0, 5000, undefined, { resultLabel: 'BOND TO 100' }));
    moves.push(move(player, 'INTIMACY', 'Intimacy', 'Private time together.', 'flame', 'var(--health)', 30, 0, 5));
    if (relationship.relation === 'Partner') moves.push(move(player, 'PROPOSE', 'Propose', 'A major commitment. Strong bonds have better odds.', 'crown', 'var(--gold-hi)', 0, 5000, undefined, { resultLabel: 'MARRIAGE CHANCE' }));

    const estateLocked = !hasOwnedPremiumAssetInCollection(player, 'bundle_luxury_homes');
    const skyLocked = !hasOwnedPremiumAssetInCollection(player, 'bundle_sky_sea');
    const lifestyleLocked = !hasOwnedPremiumAssetInCollection(player, 'bundle_ultimate_lifestyle');
    moves.push(move(player, 'ESTATE_DATE', 'Estate Night', estateLocked ? 'Requires the Luxury Homes collection.' : 'A private estate evening.', 'home', 'var(--gold-hi)', 16, 1200, 12, { disabled: disabledFor(player, 16, 1200, estateLocked) }));
    moves.push(move(player, 'YACHT_DATE', 'Yacht Date', skyLocked ? 'Requires the Sky & Sea collection.' : 'A private sunset on the water.', 'plane', 'var(--acting)', 18, 2500, 13, { disabled: disabledFor(player, 18, 2500, skyLocked) }));
    moves.push(move(player, 'JET_ESCAPE', 'Jet Escape', skyLocked ? 'Requires the Sky & Sea collection.' : 'A fast luxury getaway.', 'plane', 'var(--writing)', 10, 9000, 16, { disabled: disabledFor(player, 10, 9000, skyLocked) }));
    moves.push(move(player, 'LUXURY_GIFT', 'Luxury Lifestyle Gift', lifestyleLocked ? 'Requires the Ultimate Lifestyle collection.' : 'An extravagant romantic gesture.', 'gem', 'var(--looks)', 4, 8000, 9, { disabled: disabledFor(player, 4, 8000, lifestyleLocked) }));
    if (relationship.relation === 'Partner') {
      moves.push(move(player, 'BREAK_UP', 'Break Up', 'End this relationship.', 'close', 'var(--alert)', 0, 0, undefined, { danger: true, resultLabel: 'PERMANENT' }));
    } else {
      const divorceChoices = [
        move(player, 'DIVORCE_SETTLE', 'Peaceful Settlement', 'Settle privately and end the marriage.', 'heart', 'var(--gold-hi)', 0, 0, undefined, { danger: true }),
        move(player, 'DIVORCE_FIGHT_BUDGET', 'Budget Lawyer', 'Fight the divorce with budget counsel.', 'shield', 'var(--dim)', 0, getDivorceLawyerCost('BUDGET'), undefined, { danger: true }),
        move(player, 'DIVORCE_FIGHT_ESTABLISHED', 'Established Counsel', 'Fight with experienced representation.', 'shield', 'var(--acting)', 0, getDivorceLawyerCost('ESTABLISHED'), undefined, { danger: true }),
        move(player, 'DIVORCE_FIGHT_ELITE', 'Elite Counsel', 'Use the strongest legal team available.', 'crown', 'var(--money)', 0, getDivorceLawyerCost('ELITE'), undefined, { danger: true }),
      ];
      moves.push({ id: 'DIVORCE', name: 'Start Divorce', note: 'Choose how to end the marriage.', icon: 'close', color: 'var(--alert)', energy: 0, cost: 0, pickLabel: 'CHOOSE ROUTE', danger: true, choices: divorceChoices });
    }
  }

  moves.push({ id: 'GIFT_PICKER', name: 'Send Gift', note: 'Choose a gift before spending cash.', icon: 'gift', color: 'var(--looks)', energy: 0, cost: 0, pickLabel: 'PICK GIFT', choices: giftChoices(player, relationship) });

  if (relationship.relation === 'Child') {
    const abandoned = isChildAbandoned(player, relationship.id);
    moves.push(move(player, abandoned ? 'RECONNECT_CHILD' : 'ABANDON_CHILD', abandoned ? 'Reconnect With Child' : 'Step Away From Child', abandoned ? 'Attempt to repair an abandoned family bond.' : 'Leave active parenthood. This has lasting consequences.', abandoned ? 'heart' : 'close', abandoned ? 'var(--mood)' : 'var(--alert)', 0, 0, undefined, { danger: !abandoned, resultLabel: abandoned ? 'REPAIR' : 'PERMANENT' }));
  }
  return moves;
};

export const buildSocialUiModel = (player: Player): SocialUiModel => {
  const currentGeneration = getGenerationNumber(player);
  const children = player.relationships.filter(relationship => relationship.relation === 'Child');
  const currentScore = calculateLegacyScore({
    netWorth: player.money,
    awards: player.awards?.length || 0,
    moviesMade: player.pastProjects.length,
    peakFame: player.stats.fame,
    businessCount: player.businesses?.length || 0,
  });
  const dynastyScore = (player.bloodline || []).reduce((sum, member) => sum + (member.legacyScore || calculateLegacyScore(member)), 0) + currentScore;
  const generations: SocialUiGeneration[] = (player.bloodline || []).map(member => ({
    n: member.generation,
    label: `Generation ${member.generation}`,
    note: member.generation === 1 ? 'Founding era' : 'Previous era',
    members: [{ id: member.id, name: member.name, score: member.legacyScore || calculateLegacyScore(member), netWorth: member.netWorth, projects: member.moviesMade, awards: member.awards, fame: member.peakFame || 0, businesses: member.businessCount || 0, avatarUrl: getCanonicalProfileAvatar(member.avatar, undefined, member.name) }],
  }));
  generations.push({
    n: currentGeneration,
    label: `Generation ${currentGeneration}`,
    note: 'Current ruler of the family empire',
    members: [{ id: player.id, name: player.name, score: currentScore, netWorth: player.money, projects: player.pastProjects.length, awards: player.awards?.length || 0, fame: Math.floor(player.stats.fame), businesses: player.businesses?.length || 0, avatarUrl: getCanonicalProfileAvatar(player.avatar, player.gender, player.name) }],
  });
  if (children.length > 0) generations.push({
    n: currentGeneration + 1,
    label: `Generation ${currentGeneration + 1}`,
    note: 'Heirs waiting in line',
    members: children.map(child => {
      const age = getRelationshipAge(child, player.age, player.currentWeek);
      return { id: child.id, name: child.name, score: Math.round(child.closeness), netWorth: 0, projects: 0, awards: 0, fame: 0, businesses: 0, avatarUrl: getCanonicalProfileAvatar(child.image, child.gender, child.name), age, continuationRelationship: child, continuationEligible: age >= LEGACY_MIN_PLAYABLE_AGE };
    }),
  });
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const careerState = normalizeDynastyCareerState(player);
  const productions = Object.values(player.world?.industryProductions || {});
  const careerMembers = Object.values(careerState.members)
    .sort((left, right) => left.generation - right.generation || left.name.localeCompare(right.name))
    .map(member => {
      const activeTitles = member.currentProjectIds
        .map(projectId => productions.find(production => production.canonicalProjectId === projectId)?.title)
        .filter((title): title is string => Boolean(title));
      const working = activeTitles.length > 0 && member.status !== 'DECEASED';
      const status = working ? 'Working' : member.status === 'HIATUS' ? 'On hiatus' : member.status.charAt(0) + member.status.slice(1).toLowerCase();
      return {
        id: member.npcId,
        name: member.name,
        avatarUrl: getCanonicalProfileAvatar(member.avatar, member.gender, member.name),
        generation: member.generation,
        age: getDynastyMemberAge(member, absoluteWeek),
        status,
        detail: working ? activeTitles.join(' · ') : member.history[member.history.length - 1]?.title || 'Career record preserved',
        working,
      };
    });

  return {
    people: player.relationships.map(relationship => ({
      id: relationship.id,
      relationship,
      name: relationship.name,
      role: relationship.relation.toUpperCase(),
      group: groupFor(relationship),
      bond: Math.max(0, Math.min(100, relationship.closeness || 0)),
      status: statusFor(relationship),
      lastTouchWeeks: getInteractionAgeInWeeks(relationship, player.age, player.currentWeek),
      age: ['Parent', 'Deceased Parent', 'Sibling', 'Child'].includes(relationship.relation) ? getRelationshipAge(relationship, player.age, player.currentWeek) : relationship.age,
      blurb: relationBlurb(relationship),
      avatarUrl: relationship.relation === 'Pet'
        ? (isLegacyPixelAvatar(relationship.image) ? undefined : relationship.image)
        : getCanonicalProfileAvatar(relationship.image, relationship.gender, relationship.name),
      accent: relationship.relation === 'Pet' ? 'var(--mood)' : undefined,
      moves: movesFor(player, relationship),
    })),
    generations,
    dynastyScore,
    currentGeneration,
    heirsInLine: children.length,
    money: player.money,
    energy: player.energy.current,
    inheritance: getLegacyInheritancePreview(player),
    careerMembers,
  };
};
