import React, { useMemo, useState } from 'react';
import { Player, Relationship, BloodlineMember } from '../types';
import { MessageCircle, Phone, Coffee, Gift, Users, X, Zap, Heart, Baby, Gem, Crown, Flame, Music, Plane, Briefcase, Trophy, Film, DollarSign, Skull, Sparkles, Home, PawPrint, Scissors, Stethoscope } from 'lucide-react';
import { calculateLegacyScore, getGenerationNumber, getInteractionAgeInWeeks, getLegacyInheritancePreview, getRelationshipAge, LEGACY_INHERITANCE_TAX_RATE, LEGACY_MIN_PLAYABLE_AGE } from '../services/legacyLogic';
import { getDivorceLawyerCost, isChildAbandoned } from '../services/familyLogic';
import { hasOwnedPremiumAssetInCollection } from '../services/premiumLogic';
import { getPlayerLanguage, t } from '../services/i18n';
import { ProfileBuilderGender, createSeededProfileSelection } from '../services/profileBuilder';
import { exportProfilePortrait } from './avatar/profilePortraitRenderer';

interface SocialPageProps {
  player: Player;
  onInteract: (id: string, type: SocialInteractionType) => void;
  onContinueAsChild: (child: Relationship) => void;
}

type SocialTab = 'connections' | 'legacy';
type GiftInteractionType = 'GIFT_THOUGHTFUL' | 'GIFT_LUXURY' | 'GIFT_APOLOGY' | 'GIFT_FAMILY_SUPPORT' | 'GIFT_INDUSTRY_FAVOR';
type SocialInteractionType = 'CALL' | 'CHECK_IN' | 'DEEP_TALK' | 'FAMILY_DINNER' | 'INDUSTRY_LUNCH' | 'HANGOUT' | 'GIFT' | GiftInteractionType | 'NETWORK' | 'DATE' | 'PROPOSE' | 'INTIMACY' | 'CLUBBING' | 'TRIP' | 'ESTATE_DATE' | 'YACHT_DATE' | 'JET_ESCAPE' | 'LUXURY_GIFT' | 'ABANDON_CHILD' | 'RECONNECT_CHILD' | 'BREAK_UP' | 'DIVORCE_SETTLE' | 'DIVORCE_FIGHT_BUDGET' | 'DIVORCE_FIGHT_ESTABLISHED' | 'DIVORCE_FIGHT_ELITE' | 'PET_FEED' | 'PET_PLAY' | 'PET_GROOM' | 'PET_VET';

const familyProfileAvatarCache = new Map<string, string>();

const formatWealth = (amount: number) => {
  if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
};

const getParentProfileGender = (rel: Relationship): ProfileBuilderGender | null => {
  const familyName = `${rel.id}:${rel.name}`.toLowerCase();
  if (rel.id === 'rel_mom' || /(^|:)mom\b|mother/.test(familyName)) return 'FEMALE';
  if (rel.id === 'rel_dad' || /(^|:)dad\b|father/.test(familyName)) return 'MALE';
  if (rel.relation !== 'Parent' && rel.relation !== 'Deceased Parent') return null;
  if (rel.gender === 'FEMALE') return 'FEMALE';
  if (rel.gender === 'NON_BINARY') return 'NON_BINARY';
  if (rel.gender === 'MALE') return 'MALE';
  return null;
};

const getFamilyProfileAvatar = (rel: Relationship, fallbackImage: string): string => {
  const profileGender = getParentProfileGender(rel);
  if (!profileGender || typeof document === 'undefined') return fallbackImage;

  const cacheKey = `${profileGender}:${rel.id}:${rel.name}`;
  const cached = familyProfileAvatarCache.get(cacheKey);
  if (cached) return cached;

  try {
    const selection = createSeededProfileSelection(profileGender, `family-profile:${rel.id}:${rel.name}`);
    const avatar = exportProfilePortrait(selection, 1);
    familyProfileAvatarCache.set(cacheKey, avatar);
    return avatar;
  } catch (error) {
    console.warn('Family profile avatar generation failed, falling back to saved relationship image.', error);
    return fallbackImage;
  }
};

export const SocialPage: React.FC<SocialPageProps> = ({ player, onInteract, onContinueAsChild }) => {
  const [selectedContact, setSelectedContact] = useState<Relationship | null>(null);
  const [activeTab, setActiveTab] = useState<SocialTab>('connections');
  const [legacyCandidate, setLegacyCandidate] = useState<Relationship | null>(null);
  const [showDivorceOptions, setShowDivorceOptions] = useState(false);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  const relationLabel = (relation: Relationship['relation']) => relation === 'Pet' ? 'Pet' : tr(`connections.relation.${relation}`);
  const contactDisplayName = (rel: Relationship) => {
      if (rel.id === 'rel_mom' && rel.name === 'Mom') return tr('connections.family.mom');
      if (rel.id === 'rel_dad' && rel.name === 'Dad') return tr('connections.family.dad');
      return rel.name;
  };

  const getHangoutCost = () => {
      if (player.stats.fame > 75) return 500;
      if (player.stats.fame > 40) return 200;
      return 50;
  };

  const getGiftCost = () => {
      if (player.stats.fame > 75) return 2000;
      return 250;
  };

  const handleInteraction = (type: SocialInteractionType) => {
      if (selectedContact) {
          onInteract(selectedContact.id, type);
          setShowDivorceOptions(false);
          setShowGiftPicker(false);
          setSelectedContact(null);
      }
  };

  const sortedRelationships = useMemo(() => {
      return [...player.relationships].sort((a, b) => {
          const getPriority = (rel: Relationship) => {
              if (['Parent', 'Deceased Parent', 'Sibling', 'Partner', 'Spouse', 'Ex-Partner', 'Ex-Spouse', 'Child', 'Pet'].includes(rel.relation)) return 3;
              if (rel.relation === 'Connection') return 1;
              return 2;
          };
          const pA = getPriority(a);
          const pB = getPriority(b);
          if (pA !== pB) return pB - pA;
          return b.closeness - a.closeness;
      });
  }, [player.relationships]);

  const legacyBonds = sortedRelationships.filter(rel => rel.relation === 'Deceased Parent');

  const innerCircle = sortedRelationships.filter(rel =>
      ['Parent', 'Spouse', 'Child', 'Sibling', 'Pet'].includes(rel.relation)
  );

  const relationshipCircle = sortedRelationships.filter(rel =>
      ['Partner', 'Ex-Partner', 'Ex-Spouse'].includes(rel.relation)
  );

  const professionalNetwork = sortedRelationships.filter(rel =>
      !innerCircle.some(entry => entry.id === rel.id) &&
      !relationshipCircle.some(entry => entry.id === rel.id) &&
      !legacyBonds.some(entry => entry.id === rel.id)
  );

  const children = useMemo(() => {
      return sortedRelationships
          .filter(rel => rel.relation === 'Child')
          .map(rel => ({
              ...rel,
              age: getRelationshipAge(rel, player.age, player.currentWeek),
          }));
  }, [player.age, player.currentWeek, sortedRelationships]);

  const siblings = sortedRelationships.filter(rel => rel.relation === 'Sibling');
  const legacyHistory = player.bloodline || [];
  const currentGeneration = getGenerationNumber(player);
  const currentLegacyScore = calculateLegacyScore({
      netWorth: player.money,
      awards: player.awards?.length || 0,
      moviesMade: player.pastProjects.length,
      peakFame: player.stats.fame,
      businessCount: player.businesses?.length || 0,
  });
  const dynastyScore = legacyHistory.reduce((sum, member) => sum + (member.legacyScore || calculateLegacyScore(member)), 0) + currentLegacyScore;
  const inheritancePreview = useMemo(() => getLegacyInheritancePreview(player), [player]);

  const generationRows = useMemo(() => {
      const rows: Array<{
          generation: number;
          title: string;
          subtitle: string;
          members: Array<{
              id: string;
              name: string;
              avatar: string;
              caption: string;
              secondary: string;
              accent: string;
              score?: number;
          }>;
      }> = [];

      legacyHistory.forEach((ancestor: BloodlineMember) => {
          rows.push({
              generation: ancestor.generation,
              title: tr('connections.generation', { number: ancestor.generation }),
              subtitle: ancestor.generation === 1 ? tr('connections.foundingEra') : tr('connections.previousEra'),
              members: [{
                  id: ancestor.id,
                  name: ancestor.name,
                  avatar: ancestor.avatar,
                  caption: `${formatWealth(ancestor.netWorth)} • ${ancestor.moviesMade} ${tr('connections.projects')} • ${ancestor.awards} ${tr('connections.awards')}`,
                  secondary: `${tr('connections.fame')} ${ancestor.peakFame || 0} • ${tr('connections.businesses')} ${ancestor.businessCount || 0}`,
                  accent: 'amber',
                  score: ancestor.legacyScore || calculateLegacyScore(ancestor),
              }],
          });
      });

      rows.push({
          generation: currentGeneration,
          title: tr('connections.generation', { number: currentGeneration }),
          subtitle: siblings.length > 0 ? tr('connections.currentRulerAndFamily') : tr('connections.currentRuler'),
          members: [
              {
                  id: player.id,
                  name: player.name,
                  avatar: player.avatar,
                  caption: `${formatWealth(player.money)} • ${player.pastProjects.length} ${tr('connections.projects')} • ${player.awards?.length || 0} ${tr('connections.awards')}`,
                  secondary: `${tr('connections.fame')} ${Math.floor(player.stats.fame)} • ${tr('connections.businesses')} ${player.businesses?.length || 0}`,
                  accent: 'emerald',
                  score: currentLegacyScore,
              },
              ...siblings.map(sibling => ({
                  id: sibling.id,
                  name: sibling.name,
                  avatar: sibling.image,
                  caption: `${tr('connections.sibling')} • ${tr('connections.age')} ${getRelationshipAge(sibling, player.age, player.currentWeek)}`,
                  secondary: `${tr('connections.bond')} ${Math.floor(sibling.closeness)}/100`,
                  accent: 'zinc',
              })),
          ],
      });

      if (children.length > 0) {
          rows.push({
              generation: currentGeneration + 1,
              title: tr('connections.generation', { number: currentGeneration + 1 }),
              subtitle: tr('connections.heirsWaiting'),
              members: children.map(child => ({
                  id: child.id,
                  name: child.name,
                  avatar: child.image,
                  caption: `${tr('connections.heir')} • ${tr('connections.age')} ${child.age || 0}`,
                  secondary: `${tr('connections.bond')} ${Math.floor(child.closeness)}/100`,
                  accent: 'blue',
              })),
          });
      }

      return rows;
  }, [children, currentGeneration, currentLegacyScore, legacyHistory, player, siblings, language]);

  React.useEffect(() => {
      setShowDivorceOptions(false);
      setShowGiftPicker(false);
  }, [selectedContact?.id]);

  const getRelationPill = (relation: Relationship['relation']) => {
      switch (relation) {
          case 'Spouse':
              return 'bg-amber-500/12 text-amber-300 border-amber-500/25';
          case 'Partner':
              return 'bg-pink-500/12 text-pink-300 border-pink-500/25';
          case 'Ex-Partner':
          case 'Ex-Spouse':
              return 'bg-rose-500/12 text-rose-300 border-rose-500/25';
          case 'Parent':
              return 'bg-sky-500/12 text-sky-300 border-sky-500/25';
          case 'Deceased Parent':
              return 'bg-zinc-500/12 text-zinc-300 border-zinc-500/20';
          case 'Child':
              return 'bg-yellow-500/12 text-yellow-300 border-yellow-500/25';
          case 'Sibling':
              return 'bg-cyan-500/12 text-cyan-300 border-cyan-500/25';
          case 'Pet':
              return 'bg-lime-500/12 text-lime-300 border-lime-500/25';
          case 'Friend':
              return 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25';
          case 'Director':
              return 'bg-purple-500/12 text-purple-300 border-purple-500/25';
          case 'Agent':
              return 'bg-blue-500/12 text-blue-300 border-blue-500/25';
          case 'Manager':
              return 'bg-fuchsia-500/12 text-fuchsia-300 border-fuchsia-500/25';
          case 'Colleague':
              return 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25';
          case 'Networking':
          case 'Connection':
              return 'bg-zinc-500/12 text-zinc-300 border-zinc-500/20';
          default:
              return 'bg-zinc-500/12 text-zinc-300 border-zinc-500/20';
      }
  };

  const getPetCareMultiplier = (rel?: Relationship | null) => {
      if (rel?.petRarity === 'endangered') return 8;
      if (rel?.petRarity === 'exotic') return 4;
      if (rel?.petRarity === 'premium') return 2;
      return 1;
  };

  const getPetActionCost = (action: 'PET_FEED' | 'PET_PLAY' | 'PET_GROOM' | 'PET_VET', rel?: Relationship | null) => {
      const multiplier = getPetCareMultiplier(rel);
      if (action === 'PET_PLAY') return 0;
      if (action === 'PET_FEED') return Math.round(150 * multiplier);
      if (action === 'PET_GROOM') return Math.round(450 * multiplier);
      return Math.round(1200 * multiplier);
  };

  const isNetworkContact = (rel?: Relationship | null) => !!rel && ['Agent', 'Director', 'Connection', 'Manager', 'Colleague', 'Networking'].includes(rel.relation);
  const isFamilyContact = (rel?: Relationship | null) => !!rel && ['Parent', 'Sibling', 'Child'].includes(rel.relation);

  const getBondLabel = (rel: Relationship) => {
      if (rel.relation === 'Deceased Parent') return tr('connections.inMemory');
      if (rel.closeness >= 85) return tr('connections.bondTrusted');
      if (rel.closeness >= 60) return tr('connections.bondWarm');
      if (rel.closeness >= 35) return tr('connections.bondFragile');
      return tr('connections.bondCold');
  };

  const getRelationshipPulse = (rel: Relationship) => {
      if (rel.relation === 'Pet') return rel.petRarity === 'endangered'
          ? tr('connections.pulseSanctuary')
          : tr('connections.pulsePetCare');
      if (rel.relation === 'Deceased Parent') return tr('connections.pulseLegacy');
      if (rel.relation === 'Child') return isChildAbandoned(player, rel.id)
          ? tr('connections.pulseAbsentChild')
          : tr('connections.pulseChild');
      if (rel.relation === 'Parent' || rel.relation === 'Sibling') return tr('connections.pulseFamily');
      if (rel.relation === 'Partner' || rel.relation === 'Spouse') return tr('connections.pulseRomance');
      if (isNetworkContact(rel)) return tr('connections.pulseIndustry');
      return tr('connections.pulseSocial');
  };

  const getContactWeekLabel = (rel: Relationship) => {
      if (rel.relation === 'Deceased Parent') return tr('connections.inMemory');
      const weeks = getInteractionAgeInWeeks(rel, player.age, player.currentWeek);
      if (weeks === 0) return tr('connections.thisWeek');
      return tr('connections.weeksAgo', { count: weeks });
  };

  const getGiftOptions = (rel: Relationship): Array<{
      action: GiftInteractionType;
      label: string;
      subtext: string;
      cost: number;
      effect: string;
      icon: typeof Gift;
      accent: string;
  }> => {
      const base = player.stats.fame > 75 ? 2000 : 250;
      const options: Array<{
          action: GiftInteractionType;
          label: string;
          subtext: string;
          cost: number;
          effect: string;
          icon: typeof Gift;
          accent: string;
      }> = [
          {
              action: 'GIFT_THOUGHTFUL',
              label: tr('connections.giftThoughtful'),
              subtext: tr('connections.giftThoughtfulSub'),
              cost: Math.max(120, Math.round(base * 0.7)),
              effect: '+4 bond',
              icon: Heart,
              accent: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
          },
          {
              action: 'GIFT_APOLOGY',
              label: tr('connections.giftApology'),
              subtext: tr('connections.giftApologySub'),
              cost: Math.max(600, Math.round(base * 1.8)),
              effect: '+7 repair',
              icon: Gift,
              accent: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
          },
      ];

      if (rel.relation === 'Child' || rel.relation === 'Parent' || rel.relation === 'Sibling') {
          options.push({
              action: 'GIFT_FAMILY_SUPPORT',
              label: tr('connections.giftFamilySupport'),
              subtext: tr('connections.giftFamilySupportSub'),
              cost: Math.max(2500, Math.round(base * 4)),
              effect: '+9 family',
              icon: Home,
              accent: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
          });
      }

      if (isNetworkContact(rel)) {
          options.push({
              action: 'GIFT_INDUSTRY_FAVOR',
              label: tr('connections.giftIndustryFavor'),
              subtext: tr('connections.giftIndustryFavorSub'),
              cost: Math.max(5000, Math.round(base * 5)),
              effect: '+8 access',
              icon: Briefcase,
              accent: 'border-purple-400/40 bg-purple-400/10 text-purple-200',
          });
      }

      options.push({
          action: 'GIFT_LUXURY',
          label: tr('connections.giftLuxury'),
          subtext: tr('connections.giftLuxurySub'),
          cost: Math.max(8000, Math.round(base * 8)),
          effect: '+10 bond',
          icon: Gem,
          accent: 'border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-200',
      });

      return options;
  };

  const renderPetAvatar = (rel: Relationship, sizeClass = 'w-14 h-14', textClass = 'text-3xl') => (
      <div
          className={`${sizeClass} grid place-items-center rounded-full border-2 border-lime-500/35 bg-lime-500/10 shadow-[0_0_22px_rgba(163,230,53,0.10)] ${textClass}`}
          style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}
          aria-label={rel.petSpecies || 'Pet'}
      >
          <span>{rel.petEmoji || '🐾'}</span>
      </div>
  );

  const renderRelationshipCard = (rel: Relationship) => {
      const weeksSince = getInteractionAgeInWeeks(rel, player.age, player.currentWeek);
      const closeness = rel.closeness || 0;
      const isLegacyBond = rel.relation === 'Deceased Parent';
      const isCritical = !isLegacyBond && weeksSince >= 8 && closeness < 45;
      const parentProfileGender = getParentProfileGender(rel);
      const contactAvatar = getFamilyProfileAvatar(rel, rel.image);
      
      return (
          <div key={rel.id} onClick={() => setSelectedContact(rel)} className={`glass-card p-4 rounded-3xl flex items-center gap-4 group cursor-pointer transition-transform active:scale-[0.98] ${rel.relation === 'Partner' || rel.relation === 'Spouse' ? 'border-pink-500/30 bg-pink-900/5' : ''} ${rel.relation === 'Ex-Partner' || rel.relation === 'Ex-Spouse' ? 'border-rose-500/20 bg-rose-900/5' : ''} ${isLegacyBond ? 'border-zinc-700/60 bg-zinc-950/60' : ''}`}>
              <div className="relative">
                  {rel.relation === 'Pet' ? renderPetAvatar(rel) : (
                      <div className={`grid h-14 w-14 place-items-center overflow-hidden border-2 bg-zinc-950 transition-colors ${parentProfileGender ? 'rounded-2xl border-amber-400/35 p-0.5 shadow-[0_0_22px_rgba(245,158,11,0.10)]' : 'rounded-full'} ${isLegacyBond ? 'grayscale border-zinc-700 opacity-80' : isCritical ? 'border-rose-500' : parentProfileGender ? 'group-hover:border-amber-300/70' : 'border-zinc-800 group-hover:border-zinc-600'}`}>
                          <img
                              src={contactAvatar}
                              alt={rel.name}
                              className={`${parentProfileGender ? 'rounded-[0.85rem] [image-rendering:pixelated]' : 'rounded-full'} h-full w-full object-cover`}
                          />
                      </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-1 border border-zinc-800 shadow-md">
                      {rel.relation === 'Partner' || rel.relation === 'Spouse' ? <Heart size={10} className="text-rose-500 fill-rose-500"/> :
                      rel.relation === 'Ex-Partner' || rel.relation === 'Ex-Spouse' ? <Heart size={10} className="text-rose-300"/> :
                      rel.relation === 'Parent' ? <span className="text-blue-500 text-[10px]">🏠</span> :
                      rel.relation === 'Deceased Parent' ? <Skull size={12} className="text-zinc-500"/> :
                      rel.relation === 'Child' ? <Baby size={12} className="text-yellow-400"/> :
                      rel.relation === 'Pet' ? <PawPrint size={12} className="text-lime-300"/> :
                      rel.relation === 'Sibling' ? <Users size={12} className="text-cyan-400"/> :
                      rel.relation === 'Director' ? <Crown size={12} className="text-amber-400"/> :
                      rel.relation === 'Agent' ? <Briefcase size={12} className="text-blue-400"/> :
                      rel.relation === 'Manager' ? <Crown size={12} className="text-purple-400"/> :
                      rel.relation === 'Colleague' ? <Users size={12} className="text-emerald-400"/> :
                      rel.relation === 'Networking' ? <Zap size={12} className="text-amber-500"/> :
                      <span className="text-zinc-500 text-[10px]">👋</span>}
                  </div>
              </div>
              
              <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                      <div className="font-bold text-white text-lg truncate">{contactDisplayName(rel)}</div>
                      {isCritical && <div className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">{tr('connections.estranged')}</div>}
                  </div>
                  
                  <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-zinc-500 uppercase mb-0.5">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-[0.18em] ${getRelationPill(rel.relation)}`}>{relationLabel(rel.relation)}</span>
                          <span className={isLegacyBond ? 'text-zinc-400 font-bold' : (rel.closeness || 0) > 80 ? 'text-emerald-400 font-bold' : ''}>{Math.round(rel.closeness || 0)}/100</span>
                      </div>
                      {rel.relation === 'Pet' && (
                          <div className="space-y-0.5">
                              <div className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-lime-200/70">
                                  {rel.petBreed} {rel.petSpecies} • {rel.petStoreName || (rel.petAcquisition === 'endangered' ? 'Sanctuary' : rel.petAcquisition)}
                              </div>
                              {(rel.petHomeSetup || rel.petAccessory || rel.petCustomization) && (
                                  <div className="truncate text-[10px] font-bold text-zinc-500">
                                      {[rel.petHomeSetup, rel.petAccessory, rel.petCustomization].filter(Boolean).join(' • ')}
                                  </div>
                              )}
                          </div>
                      )}
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${isLegacyBond ? 'bg-zinc-500' : (rel.closeness || 0) > 80 ? 'bg-emerald-500' : (rel.closeness || 0) < 30 ? 'bg-rose-500' : 'bg-amber-400'}`} style={{ width: `${rel.closeness || 0}%` }}></div>
                      </div>
                  </div>
              </div>
              <div className="text-zinc-600 group-hover:text-zinc-400 transition-colors">{isLegacyBond ? <Skull size={20} /> : <MessageCircle size={20} />}</div>
          </div>
      );
  };

  const ActionCard = ({ label, icon: Icon, costMoney, costEnergy, color, onClick, disabled, subtext }: any) => (
      <button
          onClick={onClick}
          disabled={disabled}
          className={`relative p-4 rounded-2xl border transition-all flex flex-col items-start gap-2 h-full text-left group ${
              disabled
              ? 'bg-zinc-900/50 border-zinc-800 opacity-50 cursor-not-allowed'
              : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 active:scale-[0.98]'
          }`}
      >
          <div className={`p-2.5 rounded-xl ${disabled ? 'bg-zinc-800 text-zinc-600' : `${color} bg-opacity-10 text-${color.split('-')[1]}-400`}`}>
              <Icon size={20} />
          </div>
          <div>
              <div className={`font-bold text-sm ${disabled ? 'text-zinc-600' : 'text-zinc-200'}`}>{label}</div>
              <div className="flex gap-2 text-[10px] font-mono mt-1 text-zinc-500">
                  <span className="flex items-center gap-0.5"><Zap size={10}/> -{costEnergy}</span>
                  <span className={`flex items-center gap-0.5 ${costMoney > 0 ? 'text-rose-400' : 'text-emerald-500'}`}>
                      {costMoney > 0 ? `-${formatWealth(costMoney)}` : tr('connections.free')}
                  </span>
              </div>
          </div>
          {subtext && <div className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-wider text-zinc-600">{subtext}</div>}
      </button>
  );

  const ContactActionRow = ({ label, subtext, icon: Icon, costMoney, costEnergy, onClick, disabled, accent = 'cyan' }: any) => {
      const accentClass = accent === 'emerald'
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
          : accent === 'amber'
              ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
              : accent === 'purple'
                  ? 'border-purple-400/30 bg-purple-400/10 text-purple-300'
                  : accent === 'rose'
                      ? 'border-rose-400/30 bg-rose-400/10 text-rose-300'
                  : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300';
      return (
          <button
              onClick={onClick}
              disabled={disabled}
              className={`min-h-[112px] rounded-2xl border p-3 text-left transition-colors cursor-pointer ${
                  disabled
                      ? 'border-zinc-800 bg-zinc-900/35 opacity-50 cursor-not-allowed'
                      : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-600 hover:bg-zinc-900'
              }`}
          >
              <div className="flex h-full flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-2">
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${disabled ? 'border-zinc-800 bg-zinc-900 text-zinc-600' : accentClass}`}>
                          <Icon size={16} />
                      </div>
                      <div className="shrink-0 text-right text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">
                          <div className="inline-flex items-center gap-1"><Zap size={9} />-{costEnergy}</div>
                          <div className={costMoney > 0 ? 'text-rose-300' : 'text-emerald-300'}>
                              {costMoney > 0 ? `-${formatWealth(costMoney)}` : tr('connections.free')}
                          </div>
                      </div>
                  </div>
                  <div className="min-w-0">
                      <div className={`text-sm font-black leading-tight ${disabled ? 'text-zinc-600' : 'text-white'}`}>{label}</div>
                      <div className="mt-1 line-clamp-2 text-[11px] font-bold leading-snug text-zinc-500">{subtext}</div>
                  </div>
              </div>
          </button>
      );
  };

  const GiftOptionButton = ({ option }: { option: ReturnType<typeof getGiftOptions>[number] }) => {
      const Icon = option.icon;
      const disabled = player.money < option.cost;
      return (
          <button
              onClick={() => handleInteraction(option.action)}
              disabled={disabled}
              className={`min-h-[116px] rounded-2xl border p-3 text-left transition-colors cursor-pointer ${
                  disabled
                      ? 'border-zinc-800 bg-zinc-950/50 opacity-50 cursor-not-allowed'
                      : 'border-zinc-800 bg-black/45 hover:border-zinc-600 hover:bg-zinc-900/80'
              }`}
          >
              <div className="flex h-full flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-2">
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${option.accent}`}>
                          <Icon size={16} />
                      </div>
                      <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-emerald-200">
                          {option.effect}
                      </div>
                  </div>
                  <div className="min-w-0">
                      <div className="text-sm font-black leading-tight text-white">{option.label}</div>
                      <div className="mt-1 line-clamp-2 text-[11px] font-bold leading-snug text-zinc-500">{option.subtext}</div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-zinc-600">{tr('connections.giftPrivateDelivery')}</span>
                      <span className={disabled ? 'text-rose-300' : 'text-white'}>{formatWealth(option.cost)}</span>
                  </div>
              </div>
          </button>
      );
  };

  const closeLegacyConfirmation = () => setLegacyCandidate(null);

  return (
    <div className="space-y-6 pb-24 pt-4 relative">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">{activeTab === 'connections' ? tr('connections.title') : tr('connections.legacy')}</h2>
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mt-1">
            {activeTab === 'connections' ? tr('connections.subtitle') : tr('connections.legacySubtitle')}
          </p>
        </div>
        <div className="px-3 py-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-right shrink-0">
          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500">{tr('connections.dynastyScore')}</div>
          <div className="text-lg font-black text-white">{dynastyScore}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-zinc-900/70 border border-zinc-800">
        <button
          onClick={() => setActiveTab('connections')}
          className={`py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'connections' ? 'bg-white text-black shadow-lg' : 'text-zinc-400 hover:text-white'}`}
        >
          {tr('connections.title')}
        </button>
        <button
          onClick={() => setActiveTab('legacy')}
          className={`py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'legacy' ? 'bg-amber-500 text-black shadow-lg' : 'text-amber-400 hover:bg-amber-500/10'}`}
        >
          <Crown size={14} /> {tr('connections.legacy')}
        </button>
      </div>

      {activeTab === 'connections' ? (
        <div className="space-y-8">
          {innerCircle.length > 0 && (
              <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">{tr('connections.innerCircle')}</h3>
                  <div className="space-y-3">
                      {innerCircle.map(renderRelationshipCard)}
                  </div>
              </div>
          )}

          {relationshipCircle.length > 0 && (
              <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">{tr('connections.relationships')}</h3>
                  <div className="space-y-3">
                      {relationshipCircle.map(renderRelationshipCard)}
                  </div>
              </div>
          )}

          {legacyBonds.length > 0 && (
              <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">{tr('connections.legacyBonds')}</h3>
                  <div className="space-y-3">
                      {legacyBonds.map(renderRelationshipCard)}
                  </div>
              </div>
          )}

          {professionalNetwork.length > 0 && (
              <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">{tr('connections.networking')}</h3>
                  <div className="space-y-3">
                      {professionalNetwork.map(renderRelationshipCard)}
                  </div>
              </div>
          )}

          {sortedRelationships.length === 0 && (
              <div className="text-center py-12 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                  <Users className="mx-auto text-zinc-700 mb-2" size={32} />
                  <p className="text-zinc-500 text-sm">{tr('connections.noConnections')}</p>
              </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">{tr('connections.currentGeneration')}</div>
              <div className="text-3xl font-black text-white">{currentGeneration}</div>
              <div className="text-sm text-zinc-400 mt-1">{tr('connections.leadsFamily', { name: player.name })}</div>
            </div>
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">{tr('connections.heirsInLine')}</div>
              <div className="text-3xl font-black text-white">{children.length}</div>
              <div className="text-sm text-zinc-400 mt-1">{children.length > 0 ? tr('connections.dynastyCanContinue') : tr('connections.noChildHeir')}</div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.14),rgba(24,24,27,0.92)_38%,rgba(9,9,11,1)_100%)] p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-amber-500 mb-1">{tr('connections.familyTree')}</div>
                <h3 className="text-2xl font-black text-white">{tr('connections.bloodlineTimeline')}</h3>
              </div>
              <Sparkles className="text-amber-400" size={20} />
            </div>

            {generationRows.map((row, index) => (
              <div key={`${row.generation}-${row.title}`} className="relative">
                {index !== generationRows.length - 1 && (
                  <div className="absolute left-6 top-20 bottom-[-24px] w-px bg-gradient-to-b from-amber-500/50 to-transparent" />
                )}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl border border-amber-500/30 bg-black/40 flex items-center justify-center text-amber-400 font-black text-sm shrink-0">
                    G{row.generation}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="text-sm font-bold text-white">{row.title}</div>
                      <div className="text-xs text-zinc-400">{row.subtitle}</div>
                    </div>
                    <div className="grid gap-3">
                      {row.members.map(member => (
                        <div key={member.id} className="rounded-3xl border border-white/5 bg-black/35 p-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl overflow-hidden border ${member.accent === 'emerald' ? 'border-emerald-500/40' : member.accent === 'amber' ? 'border-amber-500/40' : member.accent === 'blue' ? 'border-blue-500/40' : 'border-zinc-700'}`}>
                              <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-bold text-white truncate">{member.name}</div>
                                {typeof member.score === 'number' && (
                                  <div className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    {tr('connections.score')} {member.score}
                                  </div>
                                )}
                              </div>
                              <div className="text-sm text-zinc-300 mt-1">{member.caption}</div>
                              <div className="text-xs text-zinc-500 mt-1">{member.secondary}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {children.length === 0 && (
            <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/40 p-6 text-center">
              <Baby className="mx-auto text-zinc-600 mb-3" size={28} />
              <div className="font-bold text-white">{tr('connections.noNextGeneration')}</div>
              <div className="text-sm text-zinc-500 mt-1">{tr('connections.noNextGenerationText')}</div>
            </div>
          )}
        </div>
      )}

      {selectedContact && (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-stretch sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
              <div className="bg-black w-full max-w-md h-[100dvh] sm:h-[92vh] sm:rounded-[2rem] border-zinc-800 sm:border overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 relative">
                  <div className="relative shrink-0 overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.22),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(168,85,247,0.16),transparent_38%),linear-gradient(180deg,rgba(24,24,27,1),rgba(9,9,11,1))] p-4">
                      <div className="mb-3 flex items-center justify-between">
                          <div className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/70">{tr('connections.relationshipFile')}</div>
                          <button onClick={() => { setShowDivorceOptions(false); setShowGiftPicker(false); setSelectedContact(null); }} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/35 text-zinc-400 hover:text-white transition-colors backdrop-blur-md"><X size={17} /></button>
                      </div>

                      <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                              <div className={`h-16 w-16 rounded-2xl border bg-black/45 p-1 shadow-xl ${getParentProfileGender(selectedContact) ? 'border-amber-300/35 shadow-amber-500/10' : 'border-white/10'}`}>
                                  {selectedContact.relation === 'Pet' ? renderPetAvatar(selectedContact, 'w-full h-full rounded-[0.9rem]', 'text-3xl') : (
                                      <img src={getFamilyProfileAvatar(selectedContact, selectedContact.image)} alt={selectedContact.name} className={`h-full w-full rounded-[0.9rem] object-cover ${getParentProfileGender(selectedContact) ? '[image-rendering:pixelated]' : ''} ${selectedContact.relation === 'Deceased Parent' ? 'grayscale opacity-80' : ''}`} />
                                  )}
                              </div>
                              <div className={`absolute -bottom-2 left-1 right-1 rounded-full border px-1.5 py-0.5 text-center text-[8px] font-black uppercase tracking-[0.12em] ${getRelationPill(selectedContact.relation)}`}>
                                  {relationLabel(selectedContact.relation)}
                              </div>
                          </div>
                          <div className="min-w-0 flex-1 pt-1">
                              <h3 className="truncate text-2xl font-black leading-none text-white">{contactDisplayName(selectedContact)}</h3>
                              <div className="mt-2 line-clamp-2 text-xs font-bold leading-snug text-zinc-400">{getRelationshipPulse(selectedContact)}</div>
                              {(selectedContact.relation === 'Child' || selectedContact.relation === 'Sibling' || selectedContact.relation === 'Parent' || selectedContact.relation === 'Deceased Parent') && (
                                  <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{tr('connections.age')} {getRelationshipAge(selectedContact, player.age, player.currentWeek)}</div>
                              )}
                              {selectedContact.relation === 'Pet' && (
                                  <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-lime-100/70">
                                      {selectedContact.petBreed} {selectedContact.petSpecies}
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="rounded-xl border border-white/10 bg-black/35 p-2">
                              <div className="text-[8px] font-black uppercase tracking-[0.16em] text-zinc-500">{tr('connections.bond')}</div>
                              <div className="mt-0.5 text-lg font-black text-white">{Math.round(selectedContact.closeness || 0)}</div>
                              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                                  <div className={`h-full rounded-full ${selectedContact.relation === 'Deceased Parent' ? 'bg-zinc-500' : selectedContact.closeness > 80 ? 'bg-emerald-400' : selectedContact.closeness < 35 ? 'bg-rose-400' : 'bg-amber-300'}`} style={{ width: `${selectedContact.closeness}%` }}/>
                              </div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/35 p-2">
                              <div className="text-[8px] font-black uppercase tracking-[0.16em] text-zinc-500">{tr('connections.status')}</div>
                              <div className="mt-0.5 text-xs font-black leading-tight text-white">{getBondLabel(selectedContact)}</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/35 p-2">
                              <div className="text-[8px] font-black uppercase tracking-[0.16em] text-zinc-500">{tr('connections.lastTouch')}</div>
                              <div className="mt-0.5 text-xs font-black leading-tight text-white">{getContactWeekLabel(selectedContact)}</div>
                          </div>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 pb-5 custom-scrollbar bg-black">
                      {selectedContact.relation === 'Pet' && (selectedContact.petHomeSetup || selectedContact.petAccessory || selectedContact.petCustomization) && (
                          <div className="mb-3 rounded-2xl border border-lime-300/15 bg-lime-300/5 p-3 text-[11px] font-bold text-lime-100/70">
                              {[selectedContact.petHomeSetup, selectedContact.petAccessory, selectedContact.petCustomization].filter(Boolean).join(' • ')}
                          </div>
                      )}

                      {selectedContact.relation === 'Deceased Parent' && (
                          <div className="mb-6 rounded-3xl border border-zinc-700/60 bg-zinc-950 p-5 text-center">
                              <Skull className="mx-auto mb-3 text-zinc-500" size={28} />
                              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">{tr('connections.inMemory')}</div>
                              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                                  {tr('connections.legacyBondNote')}
                              </p>
                          </div>
                      )}

                      {(selectedContact.relation === 'Partner' || selectedContact.relation === 'Spouse') && (
                          <div className="mb-6">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 pl-1">{tr('connections.romance')}</h4>
                              <div className="grid grid-cols-2 gap-3">
                                  <ActionCard label={tr('connections.dateNight')} icon={Heart} color="bg-pink-500" costMoney={200} costEnergy={20} disabled={player.money < 200 || player.energy.current < 20} onClick={() => handleInteraction('DATE')} />
                                  <ActionCard label={tr('connections.clubbing')} icon={Music} color="bg-purple-500" costMoney={500} costEnergy={40} disabled={player.money < 500 || player.energy.current < 40} onClick={() => handleInteraction('CLUBBING')} />
                                  <ActionCard label={tr('connections.luxuryTrip')} icon={Plane} color="bg-blue-500" costMoney={5000} costEnergy={0} subtext={tr('connections.vacation')} disabled={player.money < 5000} onClick={() => handleInteraction('TRIP')} />
                                  <ActionCard label={tr('connections.intimacy')} icon={Flame} color="bg-rose-500" costMoney={0} costEnergy={30} disabled={player.energy.current < 30} onClick={() => handleInteraction('INTIMACY')} />
                              </div>
                              
                              {selectedContact.relation !== 'Spouse' && (
                                  <button
                                      onClick={() => handleInteraction('PROPOSE')}
                                      disabled={player.money < 5000}
                                      className="w-full mt-3 py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg opacity-90 hover:opacity-100 disabled:opacity-50"
                                  >
                                      <Gem size={16}/> {tr('connections.proposeMarriage')} <span className="opacity-60 text-xs font-normal">($5k {tr('connections.ring')})</span>
                                  </button>
                              )}

                              <div className="mt-4 space-y-3">
                                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">{tr('connections.luxuryMoments')}</div>
                                  <div className="grid grid-cols-2 gap-3">
                                      {hasOwnedPremiumAssetInCollection(player, 'bundle_luxury_homes') ? (
                                          <ActionCard label={tr('connections.estateNight')} icon={Home} color="bg-amber-500" costMoney={1200} costEnergy={16} subtext={tr('connections.homes')} disabled={player.money < 1200 || player.energy.current < 16} onClick={() => handleInteraction('ESTATE_DATE')} />
                                      ) : null}
                                      {hasOwnedPremiumAssetInCollection(player, 'bundle_sky_sea') ? (
                                          <>
                                              <ActionCard label={tr('connections.yachtDate')} icon={Plane} color="bg-sky-500" costMoney={2500} costEnergy={18} subtext={tr('connections.skySea')} disabled={player.money < 2500 || player.energy.current < 18} onClick={() => handleInteraction('YACHT_DATE')} />
                                              <ActionCard label={tr('connections.jetEscape')} icon={Plane} color="bg-blue-500" costMoney={9000} costEnergy={10} subtext={tr('connections.jetSet')} disabled={player.money < 9000 || player.energy.current < 10} onClick={() => handleInteraction('JET_ESCAPE')} />
                                          </>
                                      ) : null}
                                      {hasOwnedPremiumAssetInCollection(player, 'bundle_ultimate_lifestyle') ? (
                                          <ActionCard label={tr('connections.luxuryGift')} icon={Gem} color="bg-fuchsia-500" costMoney={8000} costEnergy={4} subtext={tr('connections.lifestyle')} disabled={player.money < 8000 || player.energy.current < 4} onClick={() => handleInteraction('LUXURY_GIFT')} />
                                      ) : null}
                                  </div>
                              </div>

                              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-rose-300">{tr('connections.relationshipExit')}</div>
                                  {selectedContact.relation === 'Partner' ? (
                                      <>
                                          <p className="mb-3 text-xs text-zinc-400">
                                              {tr('connections.breakupWarning')}
                                          </p>
                                          <button
                                              onClick={() => handleInteraction('BREAK_UP')}
                                              className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 py-4 text-sm font-bold text-rose-200 hover:bg-rose-500/20"
                                          >
                                              {tr('connections.breakUp')}
                                          </button>
                                      </>
                                  ) : (
                                      <>
                                          <p className="mb-3 text-xs text-zinc-400">
                                              {tr('connections.divorceWarning')}
                                          </p>
                                          {!showDivorceOptions ? (
                                              <button
                                                  onClick={() => setShowDivorceOptions(true)}
                                                  className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 py-4 text-sm font-bold text-rose-200 hover:bg-rose-500/20"
                                              >
                                                  {tr('connections.startDivorce')}
                                              </button>
                                          ) : (
                                              <div className="space-y-3">
                                                  <button
                                                      onClick={() => handleInteraction('DIVORCE_SETTLE')}
                                                      className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left hover:bg-amber-500/20"
                                                  >
                                                      <div className="text-sm font-bold text-amber-200">{tr('connections.peacefulSettlement')}</div>
                                                      <div className="mt-1 text-xs text-zinc-400">{tr('connections.peacefulSettlementSub')}</div>
                                                  </button>
                                                  <button
                                                      onClick={() => handleInteraction('DIVORCE_FIGHT_BUDGET')}
                                                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 p-4 text-left hover:bg-zinc-900"
                                                  >
                                                      <div className="text-sm font-bold text-white">{tr('connections.fightBudgetLawyer')}</div>
                                                      <div className="mt-1 text-xs text-zinc-400">{tr('connections.fee')}: {formatWealth(getDivorceLawyerCost('BUDGET'))} • {tr('connections.fightBudgetLawyerSub')}</div>
                                                  </button>
                                                  <button
                                                      onClick={() => handleInteraction('DIVORCE_FIGHT_ESTABLISHED')}
                                                      className="w-full rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-left hover:bg-blue-500/15"
                                                  >
                                                      <div className="text-sm font-bold text-blue-200">{tr('connections.fightEstablishedCounsel')}</div>
                                                      <div className="mt-1 text-xs text-zinc-400">{tr('connections.fee')}: {formatWealth(getDivorceLawyerCost('ESTABLISHED'))} • {tr('connections.fightEstablishedCounselSub')}</div>
                                                  </button>
                                                  <button
                                                      onClick={() => handleInteraction('DIVORCE_FIGHT_ELITE')}
                                                      className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-left hover:bg-emerald-500/15"
                                                  >
                                                      <div className="text-sm font-bold text-emerald-200">{tr('connections.fightEliteCounsel')}</div>
                                                      <div className="mt-1 text-xs text-zinc-400">{tr('connections.fee')}: {formatWealth(getDivorceLawyerCost('ELITE'))} • {tr('connections.fightEliteCounselSub')}</div>
                                                  </button>
                                                  <button
                                                      onClick={() => setShowDivorceOptions(false)}
                                                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 py-3 text-xs font-bold uppercase tracking-widest text-zinc-400"
                                                  >
                                                      {tr('connections.cancel')}
                                                  </button>
                                              </div>
                                          )}
                                      </>
                                  )}
                              </div>
                          </div>
                      )}

                      {selectedContact.relation === 'Pet' ? (
                      <div className="mb-6">
	                          <h4 className="text-[10px] font-bold text-lime-200/70 uppercase tracking-widest mb-3 pl-1">{tr('connections.petCare')}</h4>
	                          <div className="grid grid-cols-2 gap-3">
	                              <ActionCard label={tr('connections.petFeedCare')} icon={Heart} color="bg-lime-500" costMoney={getPetActionCost('PET_FEED', selectedContact)} costEnergy={4} disabled={player.money < getPetActionCost('PET_FEED', selectedContact) || player.energy.current < 4} onClick={() => handleInteraction('PET_FEED')} />
	                              <ActionCard label={tr('connections.petPlayTime')} icon={PawPrint} color="bg-green-500" costMoney={0} costEnergy={10} disabled={player.energy.current < 10} onClick={() => handleInteraction('PET_PLAY')} />
	                              <ActionCard label={tr('connections.petGrooming')} icon={Scissors} color="bg-cyan-500" costMoney={getPetActionCost('PET_GROOM', selectedContact)} costEnergy={5} disabled={player.money < getPetActionCost('PET_GROOM', selectedContact) || player.energy.current < 5} onClick={() => handleInteraction('PET_GROOM')} />
	                              <ActionCard label={tr('connections.petVetVisit')} icon={Stethoscope} color="bg-emerald-500" costMoney={getPetActionCost('PET_VET', selectedContact)} costEnergy={3} disabled={player.money < getPetActionCost('PET_VET', selectedContact) || player.energy.current < 3} onClick={() => handleInteraction('PET_VET')} />
	                          </div>
	                          {(selectedContact.petRarity === 'exotic' || selectedContact.petRarity === 'endangered') && (
	                              <div className="mt-3 rounded-2xl border border-lime-300/20 bg-lime-300/8 p-3 text-xs font-bold leading-relaxed text-lime-100/75">
	                                  {selectedContact.petRarity === 'endangered'
	                                      ? tr('connections.petEndangeredNote')
	                                      : tr('connections.petExoticNote')}
	                              </div>
	                          )}
                      </div>
                      ) : selectedContact.relation !== 'Deceased Parent' ? (
                      <div className="mb-4">
                          <div className="mb-2 flex items-center justify-between">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">{tr('connections.social')}</h4>
                              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">{tr('connections.chooseMove')}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                              <ContactActionRow
                                  label={tr('connections.callText')}
                                  subtext={tr('connections.callTextSub')}
                                  icon={Phone}
                                  accent="cyan"
                                  costMoney={0}
                                  costEnergy={5}
                                  disabled={player.energy.current < 5}
                                  onClick={() => handleInteraction('CALL')}
                              />
                              <ContactActionRow
                                  label={tr('connections.checkIn')}
                                  subtext={tr('connections.checkInSub')}
                                  icon={MessageCircle}
                                  accent="cyan"
                                  costMoney={0}
                                  costEnergy={3}
                                  disabled={player.energy.current < 3}
                                  onClick={() => handleInteraction('CHECK_IN')}
                              />
                              <ContactActionRow
                                  label={tr('connections.hangOut')}
                                  subtext={tr('connections.hangOutSub')}
                                  icon={Coffee}
                                  accent="amber"
                                  costMoney={getHangoutCost()}
                                  costEnergy={15}
                                  disabled={player.energy.current < 15 || player.money < getHangoutCost()}
                                  onClick={() => handleInteraction('HANGOUT')}
                              />
                              {isFamilyContact(selectedContact) && (
                                  <ContactActionRow
                                      label={tr('connections.deepTalk')}
                                      subtext={tr('connections.deepTalkSub')}
                                      icon={Heart}
                                      accent="rose"
                                      costMoney={0}
                                      costEnergy={12}
                                      disabled={player.energy.current < 12}
                                      onClick={() => handleInteraction('DEEP_TALK')}
                                  />
                              )}
                              {isFamilyContact(selectedContact) && (
                                  <ContactActionRow
                                      label={tr('connections.familyDinner')}
                                      subtext={tr('connections.familyDinnerSub')}
                                      icon={Home}
                                      accent="amber"
                                      costMoney={player.stats.fame > 75 ? 1500 : 800}
                                      costEnergy={18}
                                      disabled={player.energy.current < 18 || player.money < (player.stats.fame > 75 ? 1500 : 800)}
                                      onClick={() => handleInteraction('FAMILY_DINNER')}
                                  />
                              )}
                              {isNetworkContact(selectedContact) && (
                                  <ContactActionRow
                                      label={tr('connections.network')}
                                      subtext={tr('connections.networkSub')}
                                      icon={Users}
                                      accent="emerald"
                                      costMoney={0}
                                      costEnergy={25}
                                      disabled={player.energy.current < 25}
                                      onClick={() => handleInteraction('NETWORK')}
                                  />
                              )}
                              {isNetworkContact(selectedContact) && (
                                  <ContactActionRow
                                      label={tr('connections.industryLunch')}
                                      subtext={tr('connections.industryLunchSub')}
                                      icon={Briefcase}
                                      accent="emerald"
                                      costMoney={player.stats.fame > 75 ? 2500 : 1200}
                                      costEnergy={18}
                                      disabled={player.energy.current < 18 || player.money < (player.stats.fame > 75 ? 2500 : 1200)}
                                      onClick={() => handleInteraction('INDUSTRY_LUNCH')}
                                  />
                              )}
                              <button
                                  onClick={() => setShowGiftPicker(prev => !prev)}
                                  disabled={getGiftOptions(selectedContact).every(option => player.money < option.cost)}
                                  className="min-h-[112px] rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 text-left transition-colors hover:border-purple-400/40 hover:bg-purple-400/5 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                  <div className="flex h-full flex-col justify-between gap-3">
                                      <div className="flex items-start justify-between gap-2">
                                          <div className="grid h-9 w-9 place-items-center rounded-xl border border-purple-400/30 bg-purple-400/10 text-purple-300">
                                              <Gift size={16} />
                                          </div>
                                          <div className="text-[9px] font-black uppercase tracking-[0.12em] text-purple-200">
                                              {showGiftPicker ? tr('connections.hideOptions') : tr('connections.pickGift')}
                                          </div>
                                      </div>
                                      <div className="min-w-0">
                                          <div className="text-sm font-black leading-tight text-white">{tr('connections.sendGift')}</div>
                                          <div className="mt-1 line-clamp-2 text-[11px] font-bold leading-snug text-zinc-500">{tr('connections.sendGiftSub')}</div>
                                      </div>
                                  </div>
                              </button>
                          </div>

                          {showGiftPicker && (
                              <div className="mt-2 grid grid-cols-2 gap-2 rounded-[1.5rem] border border-purple-400/20 bg-purple-400/5 p-2">
                                  {getGiftOptions(selectedContact).map(option => (
                                      <React.Fragment key={option.action}>
                                          <GiftOptionButton option={option} />
                                      </React.Fragment>
                                  ))}
                              </div>
                          )}
                      </div>
                      ) : (
                          <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 text-center text-xs font-bold uppercase tracking-wider text-zinc-600">
                              {tr('connections.noActiveActions')}
                          </div>
                      )}

                      {selectedContact.relation === 'Child' && (
                          <div className="px-4 pb-6">
                              {isChildAbandoned(player, selectedContact.id) ? (
                                  <div className="mb-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-center text-xs text-rose-200">
                                      {tr('connections.absentParentWarning')}
                                  </div>
                              ) : (
                                  <div className="mb-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-center text-xs text-amber-200">
                                      {tr('connections.childFalloutWarning')}
                                  </div>
                              )}
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                  <button
                                      onClick={() => handleInteraction(isChildAbandoned(player, selectedContact.id) ? 'RECONNECT_CHILD' : 'ABANDON_CHILD')}
                                      className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                          isChildAbandoned(player, selectedContact.id)
                                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                                              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                                      }`}
                                  >
                                      {isChildAbandoned(player, selectedContact.id) ? (
                                          <>
                                              <Heart size={16} /> {tr('connections.reconnect')}
                                          </>
                                      ) : (
                                          <>
                                              <Skull size={16} /> {tr('connections.abandonChild')}
                                          </>
                                      )}
                                  </button>
                                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 px-3 py-4 text-center">
                                      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{tr('connections.status')}</div>
                                      <div className={`mt-1 text-xs font-bold ${isChildAbandoned(player, selectedContact.id) ? 'text-rose-300' : 'text-emerald-300'}`}>
                                          {isChildAbandoned(player, selectedContact.id) ? tr('connections.absentParent') : tr('connections.activeParent')}
                                      </div>
                                  </div>
                              </div>
                              {getRelationshipAge(selectedContact, player.age, player.currentWeek) < LEGACY_MIN_PLAYABLE_AGE && (
                                  <div className="mb-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3 text-center text-xs text-blue-300">
                                      {tr('connections.heirTooYoung', { age: LEGACY_MIN_PLAYABLE_AGE })}
                                  </div>
                              )}
                              <button
                                  onClick={() => setLegacyCandidate(selectedContact)}
                                  className="w-full py-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all"
                              >
                                  <Crown size={16} /> {tr('connections.continueAsChild')}
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {legacyCandidate && (
          <div className="fixed inset-0 z-[220] bg-black/90 backdrop-blur-md flex items-start justify-center overflow-y-auto p-4 pt-10 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] animate-in fade-in duration-200">
              <div className="w-full max-w-md max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[2rem] border border-amber-500/20 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),rgba(24,24,27,0.96)_38%,rgba(9,9,11,1)_100%)] shadow-2xl">
                  <div className="flex items-start justify-between gap-4 p-6 border-b border-white/5">
                      <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-amber-500/30 bg-black/30">
                              <img src={legacyCandidate.image} alt={legacyCandidate.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                              <div className="text-[10px] uppercase tracking-[0.25em] text-amber-500 mb-1">{tr('connections.legacyTransfer')}</div>
                              <h3 className="text-xl font-black text-white">{tr('connections.continueAsName', { name: legacyCandidate.name })}</h3>
                              <div className="text-sm text-zinc-400 mt-1">
                                  {tr('connections.heirAge', { age: getRelationshipAge(legacyCandidate, player.age, player.currentWeek) })}
                              </div>
                          </div>
                      </div>
                      <button onClick={closeLegacyConfirmation} className="p-2 rounded-full bg-black/30 text-zinc-400 hover:text-white transition-colors">
                          <X size={18} />
                      </button>
                  </div>

                  <div className="p-6 space-y-4">
                      <div className="rounded-2xl border border-amber-500/15 bg-black/25 p-4">
                          <div className="text-sm text-zinc-200 leading-relaxed">
                              {tr('connections.retireText')}
                          </div>
                          {getRelationshipAge(legacyCandidate, player.age, player.currentWeek) < LEGACY_MIN_PLAYABLE_AGE && (
                              <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-200">
                                  {tr('connections.tooYoungTransfer', { age: LEGACY_MIN_PLAYABLE_AGE })}
                              </div>
                          )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">{tr('connections.cashAfterTax')}</div>
                              <div className="text-xl font-black text-white">{formatWealth(inheritancePreview.inheritedMoney)}</div>
                              <div className="text-xs text-rose-400 mt-1">
                                  {tr('connections.govtTakes', { amount: formatWealth(inheritancePreview.moneyTaxPaid) })}
                              </div>
                          </div>
                          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">{tr('connections.sharesAfterTax')}</div>
                              <div className="text-xl font-black text-white">{inheritancePreview.inheritedShares.toLocaleString()}</div>
                              <div className="text-xs text-rose-400 mt-1">
                                  {tr('connections.sharesTaxed', { count: inheritancePreview.sharesTaxPaid.toLocaleString() })}
                              </div>
                          </div>
                      </div>

                      <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4 space-y-2">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">{tr('connections.transfersFree')}</div>
                          <div className="text-sm text-zinc-200">
                              {tr('connections.transfersFreeText')}
                          </div>
                          <div className="text-xs text-zinc-400">
                              {tr('connections.transfersFreeSub', { assets: inheritancePreview.untaxedAssetCount, businesses: inheritancePreview.businessCount })}
                          </div>
                      </div>

                      <div className="text-[11px] text-zinc-500 text-center">
                          {tr('connections.inheritanceTaxRate', { rate: Math.round(LEGACY_INHERITANCE_TAX_RATE * 100) })}
                      </div>
                  </div>

	                  <div className="p-6 pt-0 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] grid grid-cols-2 gap-3">
                      <button
                          onClick={closeLegacyConfirmation}
                          className="py-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 text-zinc-300 font-bold text-sm hover:bg-zinc-800 transition-colors"
                      >
                          {tr('connections.cancel')}
                      </button>
                      <button
                          onClick={() => {
                              onContinueAsChild(legacyCandidate);
                              setLegacyCandidate(null);
                              setSelectedContact(null);
                          }}
                          className="py-3 rounded-2xl bg-amber-500 text-black font-black text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                      >
                          <Crown size={16} /> {tr('connections.confirmLegacyShift')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
