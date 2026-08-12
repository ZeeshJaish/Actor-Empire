import type {
  ActiveRelease,
  Commitment,
  LifeEvent,
  Message,
  Player,
  Relationship,
  ScheduledEvent,
  SponsorshipOffer,
  XPost,
} from '../../types';
import { getGenderedAvatar, NPC_DATABASE } from '../../services/npcLogic';
import {
  generateYoutubeBrandDeal,
  generateYoutubeCollabOffer,
  YOUTUBE_MERCH_COOLDOWN_WEEKS,
} from '../../services/youtubeLogic';

export interface HomeSocialQaActionsProps {
  player: Player;
  onUpdatePlayer?: (player: Player) => void;
  closeMenu: () => void;
}

export const createHomeSocialQaActions = ({
  player,
  onUpdatePlayer,
  closeMenu,
}: HomeSocialQaActionsProps) => {
  const triggerYoutubeBootstrap = () => {
      if (!onUpdatePlayer) return;

      const boostedPlayer: Player = {
          ...player,
          money: Math.max(player.money, 500000),
          energy: { ...player.energy, current: player.energy.max || 100 },
          stats: {
              ...player.stats,
              fame: Math.max(player.stats.fame, 72),
              reputation: Math.max(player.stats.reputation, 65),
              skills: {
                  ...player.stats.skills,
                  improvisation: Math.max(player.stats.skills.improvisation || 0, 78),
                  charisma: Math.max(player.stats.skills.charisma || 0, 80)
              }
          },
          youtube: {
              ...player.youtube,
              subscribers: Math.max(player.youtube.subscribers || 0, 125000),
              totalChannelViews: Math.max(player.youtube.totalChannelViews || 0, 2400000),
              lifetimeEarnings: Math.max(player.youtube.lifetimeEarnings || 0, 65000),
              isMonetized: true,
              audienceTrust: Math.max(player.youtube.audienceTrust ?? 55, 72),
              fanMood: Math.max(player.youtube.fanMood ?? 55, 74),
              controversy: Math.max(player.youtube.controversy ?? 0, 18),
              membershipsActive: true,
              members: Math.max(player.youtube.members || 0, 850),
              creatorIdentity: player.youtube.creatorIdentity || 'ACTOR_VLOGGER',
              lastLivestreamWeek: 0,
              lastMerchDropWeek: 0,
              lastIdentityChangeWeek: 0,
              videos: player.youtube.videos.length > 0 ? player.youtube.videos : [
                  {
                      id: `cheat_yt_vid_${Date.now()}`,
                      title: 'Premiere Week Breakout',
                      type: 'VLOG',
                      thumbnailColor: 'bg-red-600',
                      views: 1200000,
                      likes: 84000,
                      earnings: 4200,
                      weekUploaded: player.currentWeek,
                      yearUploaded: player.age,
                      isPlayer: true,
                      authorName: player.name,
                      qualityScore: 88,
                      uploadPlan: 'BTS',
                      controversyScore: 4,
                      trustImpact: 3,
                      weeklyHistory: [1200000],
                      comments: ['The creator arc is online.', 'This behind-the-scenes lane feels premium.']
                  }
              ]
          },
          flags: {
              ...player.flags,
              lastYoutubeEventAbsWeek: 0,
              lastYoutubeCreatorInviteAbsWeek: 0,
              lastYoutubeImageRippleAbsWeek: 0,
              lastYoutubeRivalryAbsWeek: 0,
              lastYoutubeCollabOfferWeek: 0,
              lastYoutubeBrandOfferWeek: 0
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `▶️ YouTube Studio is ready for promo capture.`, type: 'positive' as const }, ...player.logs].slice(0, 50)
      };

      onUpdatePlayer(boostedPlayer);
      closeMenu();
      alert('YouTube Studio is ready. Open Phone > Social > YouTube Studio.');
  };

  const triggerYoutubeOffers = () => {
      if (!onUpdatePlayer) return;

      const basePlayer = {
          ...player,
          youtube: {
              ...player.youtube,
              subscribers: Math.max(player.youtube.subscribers || 0, 125000),
              totalChannelViews: Math.max(player.youtube.totalChannelViews || 0, 2400000),
              isMonetized: true,
              videos: player.youtube.videos.length > 0 ? player.youtube.videos : [
                  {
                      id: `cheat_yt_vid_offer_${Date.now()}`,
                      title: 'Creator Deal Momentum',
                      type: 'VLOG' as const,
                      thumbnailColor: 'bg-red-600',
                      views: 450000,
                      likes: 24000,
                      earnings: 1800,
                      weekUploaded: player.currentWeek,
                      yearUploaded: player.age,
                      isPlayer: true,
                      authorName: player.name,
                      qualityScore: 82,
                      weeklyHistory: [450000],
                      comments: []
                  }
              ]
          }
      };

      const collab = generateYoutubeCollabOffer(basePlayer);
      const brand = generateYoutubeBrandDeal(basePlayer);
      const messages: Message[] = [];

      if (collab) {
          messages.push({
              id: `cheat_yt_collab_${Date.now()}`,
              sender: collab.creatorName,
              subject: `YouTube Collab: ${collab.conceptTitle}`,
              text: `${collab.creatorName} wants to collaborate on your channel.`,
              type: 'OFFER_YOUTUBE_COLLAB',
              data: collab,
              isRead: false,
              weekSent: player.currentWeek,
              expiresIn: collab.expiresInWeeks
          });
      }

      if (brand) {
          messages.push({
              id: `cheat_yt_brand_${Date.now()}`,
              sender: `${brand.brandName} Creator Team`,
              subject: `YouTube Deal: ${brand.brandName}`,
              text: `${brand.brandName} sent a creator integration offer for your channel.`,
              type: 'OFFER_YOUTUBE_BRAND',
              data: brand,
              isRead: false,
              weekSent: player.currentWeek,
              expiresIn: brand.expiresInWeeks
          });
      }

      onUpdatePlayer({
          ...basePlayer,
          inbox: [...messages, ...player.inbox],
          logs: [{ week: player.currentWeek, year: player.age, message: `📩 YouTube collab and brand offers sent to Messages.`, type: 'positive' as const }, ...player.logs].slice(0, 50)
      });
      closeMenu();
      alert('YouTube collab and brand offers sent to Messages.');
  };

  const triggerYoutubeRivalry = () => {
      if (!onUpdatePlayer) return;

      const rivalName = 'Milo Vance';
      const lifeEvent: LifeEvent = {
          id: `cheat_yt_rivalry_life_${Date.now()}`,
          type: 'SCANDAL',
          title: `${rivalName} Starts Creator Drama`,
          description: `${rivalName} accused your channel of copying their creator lane. Pick a response to test the rivalry flow.`,
          options: [
              {
                  label: 'Ignore The Bait',
                  description: 'Protect trust and lower heat.',
                  impact: (p: Player) => {
                      p.youtube.audienceTrust = Math.min(100, (p.youtube.audienceTrust ?? 55) + 3);
                      p.youtube.controversy = Math.max(0, (p.youtube.controversy ?? 0) - 5);
                      return { updatedPlayer: p, log: `You ignored ${rivalName}'s bait. The channel stayed cleaner.` };
                  }
              },
              {
                  label: 'Clap Back Publicly',
                  description: 'Gain views and heat fast.',
                  impact: (p: Player) => {
                      const bonusViews = Math.floor(Math.max(30000, p.youtube.subscribers * 0.7));
                      p.youtube.totalChannelViews += bonusViews;
                      p.youtube.subscribers += Math.floor(bonusViews / 110);
                      p.youtube.fanMood = Math.min(100, (p.youtube.fanMood ?? 55) + 5);
                      p.youtube.audienceTrust = Math.max(0, (p.youtube.audienceTrust ?? 55) - 6);
                      p.youtube.controversy = Math.min(100, (p.youtube.controversy ?? 0) + 16);
                      p.stats.fame = Math.min(100, p.stats.fame + 2);
                      p.stats.reputation = Math.max(0, p.stats.reputation - 2);
                      return { updatedPlayer: p, log: `You clapped back at ${rivalName}: +${bonusViews.toLocaleString()} views, but heat rose.` };
                  }
              },
              {
                  label: 'Golden Mediated Collab (Watch Ad)',
                  isGolden: true,
                  description: 'Best path. Convert drama into a clean creator win.',
                  impact: (p: Player) => {
                      const bonusViews = Math.floor(Math.max(50000, p.youtube.subscribers * 0.9));
                      p.youtube.totalChannelViews += bonusViews;
                      p.youtube.subscribers += Math.floor(bonusViews / 90);
                      p.youtube.audienceTrust = Math.min(100, (p.youtube.audienceTrust ?? 55) + 8);
                      p.youtube.fanMood = Math.min(100, (p.youtube.fanMood ?? 55) + 8);
                      p.youtube.controversy = Math.max(0, (p.youtube.controversy ?? 0) - 12);
                      p.stats.reputation = Math.min(100, p.stats.reputation + 5);
                      return { updatedPlayer: p, log: `You turned ${rivalName}'s feud into a controlled hit collab.` };
                  }
              }
          ]
      };

      const rivalryEvent: ScheduledEvent = {
          id: `cheat_yt_rivalry_${Date.now()}`,
          week: player.currentWeek,
          type: 'SCANDAL',
          title: 'Creator Rivalry',
          data: { lifeEvent }
      };

      onUpdatePlayer({
          ...player,
          youtube: {
              ...player.youtube,
              subscribers: Math.max(player.youtube.subscribers || 0, 125000),
              totalChannelViews: Math.max(player.youtube.totalChannelViews || 0, 2400000),
              isMonetized: true
          },
          pendingEvents: [...(player.pendingEvents || []), rivalryEvent],
          logs: [{ week: player.currentWeek, year: player.age, message: `🥊 CHEAT: YouTube rivalry event queued.`, type: 'neutral' as const }, ...player.logs].slice(0, 50)
      });
      closeMenu();
  };

  const triggerYoutubeCooldownReset = () => {
      if (!onUpdatePlayer) return;
      onUpdatePlayer({
          ...player,
          youtube: {
              ...player.youtube,
              lastLivestreamWeek: 0,
              lastMerchDropWeek: 0,
              lastIdentityChangeWeek: 0
          },
          flags: {
              ...player.flags,
              lastYoutubeEventAbsWeek: 0,
              lastYoutubeCreatorInviteAbsWeek: 0,
              lastYoutubeImageRippleAbsWeek: 0,
              lastYoutubeRivalryAbsWeek: 0,
              lastYoutubeCollabOfferWeek: 0,
              lastYoutubeBrandOfferWeek: 0
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `🔄 CHEAT: YouTube cooldowns reset.`, type: 'neutral' as const }, ...player.logs].slice(0, 50)
      });
      closeMenu();
      alert('YouTube cooldowns reset.');
  };

  const triggerYoutubeMerchQa = (scenario: 'PROFIT' | 'LOSS' | 'COOLDOWN') => {
      if (!onUpdatePlayer) return;

      const absoluteWeek = player.age * 52 + player.currentWeek;
      const baseYoutube = {
          ...player.youtube,
          isMonetized: true,
          lastMerchOutcome: undefined,
          lastMerchResult: undefined,
      };
      const baseFinanceHistory = (player.finance.history || []).filter(transaction => !transaction.id.includes('youtube_merch_'));
      const fullEnergy = player.energy.max || 100;

      const scenarioSetup = scenario === 'PROFIT'
          ? {
              label: 'Profit-ready merch drop',
              alert: 'Merch profit test is ready. Open Phone > Social > YouTube Studio, then launch any merch tier to test the real payout and Bank entries.',
              youtube: {
                  ...baseYoutube,
                  subscribers: Math.max(player.youtube.subscribers || 0, 1_250_000),
                  audienceTrust: 88,
                  fanMood: 88,
                  controversy: 5,
                  creatorIdentity: 'LIFESTYLE_ICON' as const,
                  lastMerchDropWeek: 0,
              },
          }
          : scenario === 'LOSS'
              ? {
                  label: 'Loss-ready merch drop',
                  alert: 'Merch loss test is ready. Launch the Basic tier in YouTube Studio to test the real negative result, cash deduction, and Bank entries.',
                  youtube: {
                      ...baseYoutube,
                      subscribers: 100,
                      audienceTrust: 35,
                      fanMood: 20,
                      controversy: 90,
                      creatorIdentity: 'ACTOR_VLOGGER' as const,
                      lastMerchDropWeek: 0,
                  },
              }
              : {
                  label: 'Merch cooldown active',
                  alert: `Merch cooldown is active. Open YouTube Studio to verify the disabled state, then use Reset YouTube Cooldowns to unlock it again.`,
                  youtube: {
                      ...baseYoutube,
                      subscribers: Math.max(player.youtube.subscribers || 0, 125_000),
                      audienceTrust: Math.max(player.youtube.audienceTrust ?? 55, 72),
                      fanMood: Math.max(player.youtube.fanMood ?? 55, 72),
                      controversy: Math.min(player.youtube.controversy ?? 0, 20),
                      lastMerchDropWeek: absoluteWeek - Math.max(0, YOUTUBE_MERCH_COOLDOWN_WEEKS - 1),
                  },
              };

      onUpdatePlayer({
          ...player,
          money: Math.max(player.money, 2_000_000),
          energy: { ...player.energy, current: fullEnergy },
          youtube: scenarioSetup.youtube,
          finance: {
              ...player.finance,
              history: baseFinanceHistory,
          },
          logs: [{
              week: player.currentWeek,
              year: player.age,
              message: `🧪 CHEAT: ${scenarioSetup.label} prepared.`,
              type: 'neutral' as const,
          }, ...player.logs].slice(0, 50),
      });
      closeMenu();
      alert(scenarioSetup.alert);
  };

  const getInstagramCheatNpc = () => {
      return NPC_DATABASE.find(npc => npc.handle === '@zendaya')
          || NPC_DATABASE.find(npc => npc.tier === 'A_LIST')
          || NPC_DATABASE[0];
  };

  const triggerInstagramBootstrap = () => {
      if (!onUpdatePlayer) return;
      const seededPosts = [
          {
              id: `cheat_ig_post_${Date.now()}_1`,
              authorId: 'PLAYER',
              authorName: player.name,
              authorHandle: player.instagram.handle,
              authorAvatar: '',
              type: 'RED_CARPET' as const,
              caption: 'Red carpet night. Flashbulbs, velvet rope, and one very expensive suit.',
              week: player.currentWeek,
              year: player.age,
              likes: 24800,
              comments: 1800,
              shares: 520,
              saves: 940,
              commentList: [
                  'Stylist deserves a raise.',
                  'This belongs on every best dressed page.',
                  'The tailoring is doing cinema.',
                  'A proper movie star entrance.'
              ],
              engagementScore: 82,
              isPlayer: true
          },
          {
              id: `cheat_ig_post_${Date.now()}_2`,
              authorId: 'PLAYER',
              authorName: player.name,
              authorHandle: player.instagram.handle,
              authorAvatar: '',
              type: 'REEL' as const,
              caption: 'One take from set. The timeline can decide if this is cinema.',
              week: player.currentWeek,
              year: player.age,
              likes: 12600,
              comments: 780,
              shares: 410,
              saves: 350,
              commentList: [
                  'The timing on this is perfect.',
                  'Algorithm brought me here and I am staying.',
                  'Short, chaotic, effective.',
                  'Replay value is crazy.'
              ],
              engagementScore: 76,
              isPlayer: true
          }
      ];

      onUpdatePlayer({
          ...player,
          stats: {
              ...player.stats,
              fame: Math.max(player.stats.fame, 35),
              reputation: Math.max(player.stats.reputation, 45),
              followers: Math.max(player.stats.followers, 25000)
          },
          instagram: {
              ...player.instagram,
              followers: Math.max(player.instagram.followers || 0, 25000),
              aesthetic: Math.max(player.instagram.aesthetic || 50, 72),
              authenticity: Math.max(player.instagram.authenticity || 55, 64),
              fashionInfluence: Math.max(player.instagram.fashionInfluence || 10, 58),
              fanLoyalty: Math.max(player.instagram.fanLoyalty || 45, 68),
              posts: [...seededPosts, ...player.instagram.posts],
              feed: [...seededPosts, ...player.instagram.feed].slice(0, 50)
          },
          flags: {
              ...player.flags,
              lastInstagramMicroEventAbsWeek: 0,
              lastInstagramDmOfferAbsWeek: 0
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `📸 Instagram profile prepared with premium promo posts.`, type: 'positive' as const }, ...player.logs].slice(0, 50)
      });
      closeMenu();
      alert('Instagram profile is ready. Open Phone > Social > Instagram.');
  };

  const triggerInstagramReferralDM = () => {
      if (!onUpdatePlayer) return;
      const npc = getInstagramCheatNpc();
      const state = player.instagram.npcStates[npc.id] || {
          npcId: npc.id,
          isFollowing: true,
          isFollowedBy: true,
          relationshipScore: 30,
          relationshipLevel: 'ACQUAINTANCE',
          lastInteractionWeek: player.currentWeek,
          hasMet: false,
          chatHistory: []
      };
      const actionId = `cheat_ig_ref_${Date.now()}`;

      onUpdatePlayer({
          ...player,
          stats: { ...player.stats, fame: Math.max(player.stats.fame, 18), followers: Math.max(player.stats.followers, 1200) },
          instagram: {
              ...player.instagram,
              followers: Math.max(player.instagram.followers || 0, 1200),
              npcStates: {
                  ...player.instagram.npcStates,
                  [npc.id]: {
                      ...state,
                      isFollowing: true,
                      isFollowedBy: true,
                      relationshipScore: Math.max(state.relationshipScore || 0, 30),
                      chatHistory: [
                          ...(state.chatHistory || []),
                          {
                              sender: 'NPC' as const,
                              text: `Hey. I heard a casting director asking around for a solid fit on a studio project. I mentioned your name. If they reach out, take it seriously.`,
                              timestamp: Date.now(),
                              tag: 'CHEAT_IG_REFERRAL',
                              action: { id: actionId, kind: 'IG_REFERRAL' as const, status: 'PENDING' as const, payload: { weeksLeft: 2 } }
                          }
                      ]
                  }
              }
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `📱 CHEAT: Instagram referral DM sent by ${npc.name}.`, type: 'positive' as const }, ...player.logs].slice(0, 50)
      });
      closeMenu();
      alert(`Referral DM sent by ${npc.name}. Open Instagram > DM inbox.`);
  };

  const triggerInstagramBrandDM = () => {
      if (!onUpdatePlayer) return;
      const npc = getInstagramCheatNpc();
      const state = player.instagram.npcStates[npc.id] || {
          npcId: npc.id,
          isFollowing: true,
          isFollowedBy: true,
          relationshipScore: 25,
          relationshipLevel: 'ACQUAINTANCE',
          lastInteractionWeek: player.currentWeek,
          hasMet: false,
          chatHistory: []
      };
      const offer: SponsorshipOffer = {
          id: `cheat_ig_brand_${Date.now()}`,
          brandName: 'FrameTheory',
          category: 'FASHION',
          weeklyPay: 750,
          durationWeeks: 4,
          requirements: { type: 'POST', energyCost: 8, totalRequired: 2, progress: 0 },
          isExclusive: false,
          penalty: 1200,
          description: 'Cheat micro Instagram campaign for QA.',
          expiresIn: 3,
          weeksCompleted: 0
      };
      const actionId = `cheat_ig_brand_action_${Date.now()}`;

      onUpdatePlayer({
          ...player,
          stats: { ...player.stats, fame: Math.max(player.stats.fame, 18), followers: Math.max(player.stats.followers, 2000) },
          instagram: {
              ...player.instagram,
              followers: Math.max(player.instagram.followers || 0, 2000),
              aesthetic: Math.max(player.instagram.aesthetic || 50, 65),
              fashionInfluence: Math.max(player.instagram.fashionInfluence || 10, 45),
              npcStates: {
                  ...player.instagram.npcStates,
                  [npc.id]: {
                      ...state,
                      isFollowing: true,
                      isFollowedBy: true,
                      chatHistory: [
                          ...(state.chatHistory || []),
                          {
                              sender: 'NPC' as const,
                              text: `Quick brand thing. FrameTheory likes your Instagram vibe and asked if I could connect you. Small campaign, clean brief. Interested?`,
                              timestamp: Date.now(),
                              tag: 'CHEAT_IG_BRAND',
                              action: { id: actionId, kind: 'IG_BRAND_OFFER' as const, status: 'PENDING' as const, payload: { offer } }
                          }
                      ]
                  }
              }
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `📱 CHEAT: Instagram brand DM sent by ${npc.name}.`, type: 'positive' as const }, ...player.logs].slice(0, 50)
      });
      closeMenu();
      alert(`Brand DM sent by ${npc.name}. Open Instagram > DM inbox.`);
  };

  const triggerInstagramCooldownReset = () => {
      if (!onUpdatePlayer) return;
      onUpdatePlayer({
          ...player,
          flags: {
              ...player.flags,
              lastInstagramMicroEventAbsWeek: 0,
              lastInstagramDmOfferAbsWeek: 0,
              pendingInstagramReferrals: []
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `🔄 CHEAT: Instagram cooldowns reset.`, type: 'neutral' as const }, ...player.logs].slice(0, 50)
      });
      closeMenu();
      alert('Instagram cooldowns reset. Age up to test organic IG events/DMs.');
  };

  const triggerInstagramUnlockComposer = () => {
      if (!onUpdatePlayer) return;
      const activeRelease = {
          id: `cheat_ig_release_${Date.now()}`,
          projectId: `cheat_ig_project_${Date.now()}`,
          title: 'Velvet Premiere Night',
          role: 'LEAD',
          genre: 'DRAMA',
          budget: 45000000,
          marketingBudget: 15000000,
          initialBuzz: 72,
          currentBuzz: 72,
          boxOffice: 125000000,
          reviews: 82,
          audienceScore: 88,
          weeksInRelease: 2,
          status: 'RUNNING',
          studio: 'Monarch Pictures',
          releaseStrategy: 'THEATRICAL',
          maxTheatricalWeeks: 12
      } as unknown as ActiveRelease;

      const relationship = {
          id: `cheat_ig_romance_${Date.now()}`,
          name: 'Avery Stone',
          age: player.age,
          gender: 'FEMALE',
          relation: 'Partner',
          closeness: 72,
          image: getGenderedAvatar('FEMALE', 'Avery Stone'),
          lastInteractionWeek: player.currentWeek,
          occupation: 'Actor',
          status: 'DATING',
          relationship: 72,
          happiness: 70,
          avatar: getGenderedAvatar('FEMALE', 'Avery Stone')
      } as unknown as Relationship;

      onUpdatePlayer({
          ...player,
          energy: { ...player.energy, current: Math.max(player.energy.current, 100) },
          stats: {
              ...player.stats,
              fame: Math.max(player.stats.fame, 35),
              followers: Math.max(player.stats.followers, 5000)
          },
          instagram: {
              ...player.instagram,
              followers: Math.max(player.instagram.followers || 0, 5000),
              aesthetic: Math.max(player.instagram.aesthetic || 50, 70),
              fashionInfluence: Math.max(player.instagram.fashionInfluence || 10, 55)
          },
          commitments: player.commitments.some(commitment => commitment.type === 'ACTING_GIG' && commitment.projectPhase === 'PRODUCTION')
              ? player.commitments
              : [
                  {
                      id: `cheat_ig_commit_${Date.now()}`,
                      type: 'ACTING_GIG',
                      title: 'Neon Justice: On-Set Lead',
                      role: 'Lead',
                      startWeek: player.currentWeek,
                      endWeek: player.currentWeek + 8,
                      projectPhase: 'PRODUCTION',
                      salary: 250000,
                      data: { genre: 'ACTION' }
                  } as unknown as Commitment,
                  ...player.commitments
              ],
          activeReleases: player.activeReleases.length > 0 ? player.activeReleases : [activeRelease],
          relationships: player.relationships.some(rel =>
              (rel.relation === 'Partner' || rel.relation === 'Spouse') && (rel.closeness ?? 0) >= 50
          )
              ? player.relationships
              : [relationship, ...player.relationships],
          logs: [{ week: player.currentWeek, year: player.age, message: `📸 Instagram composer moments are ready for capture.`, type: 'positive' as const }, ...player.logs].slice(0, 50)
      });
      closeMenu();
      alert('Instagram composer is ready: BTS, Announcement, Red Carpet, Couple, Brand Fit, and Release posts are unlocked.');
  };

  const triggerXBootstrap = () => {
      if (!onUpdatePlayer) return;
      const npc = getInstagramCheatNpc();
      const now = Date.now();
      const playerPosts: XPost[] = [
          {
              id: `cheat_x_player_${now}_1`,
              authorId: 'PLAYER',
              authorName: player.name,
              authorHandle: player.x.handle,
              authorAvatar: '',
              content: 'New film, new pressure, new timeline. This next run is going to be loud.',
              timestamp: player.currentWeek,
              likes: 18500,
              retweets: 4200,
              replies: 1300,
              isPlayer: true,
              isLiked: false,
              isRetweeted: false,
              isVerified: true,
              postType: 'CAREER',
              replyList: ['Booked and busy era?', 'This sounds bigger than people realize.', 'The resume is moving.'],
              quoteList: ['Someone in casting definitely saw this.', 'The timeline likes a clean career update.'],
              controversyScore: 0,
              sentiment: 'INDUSTRY'
          },
          {
              id: `cheat_x_player_${now}_2`,
              authorId: 'PLAYER',
              authorName: player.name,
              authorHandle: player.x.handle,
              authorAvatar: '',
              content: 'Hot take: the best movie stars are built by weird career choices, not perfect PR.',
              timestamp: player.currentWeek,
              likes: 42000,
              retweets: 9800,
              replies: 6100,
              isPlayer: true,
              isLiked: false,
              isRetweeted: false,
              isVerified: true,
              postType: 'HOT_TAKE',
              replyList: ['The quotes are about to be a war zone.', 'Honestly? Not completely wrong.', 'Delete this before brunch.'],
              quoteList: ['Film Twitter found its lunch today.', 'This is messy but the point is there.'],
              controversyScore: 9,
              sentiment: 'MESSY'
          }
      ];
      const npcPost: XPost = {
          id: `cheat_x_npc_${now}`,
          authorId: npc.id,
          authorName: npc.name,
          authorHandle: npc.handle,
          authorAvatar: npc.avatar,
          content: `${player.name} is having one of those weeks where the timeline starts paying attention.`,
          timestamp: player.currentWeek,
          likes: 65000,
          retweets: 15000,
          replies: 3200,
          isPlayer: false,
          isLiked: false,
          isRetweeted: false,
          isVerified: true,
          postType: 'CAREER',
          replyList: ['The industry group chat is awake.', 'Interesting timing.', 'Casting directors are watching.'],
          quoteList: ['This has layers.', 'The replies are doing analysis now.'],
          controversyScore: 3,
          sentiment: 'INDUSTRY'
      };

      onUpdatePlayer({
          ...player,
          stats: { ...player.stats, fame: Math.max(player.stats.fame, 45), reputation: Math.max(player.stats.reputation, 55) },
          x: {
              ...player.x,
              followers: Math.max(player.x.followers || 0, 45000),
              posts: [...playerPosts, ...player.x.posts].slice(0, 80),
              feed: [npcPost, ...playerPosts, ...player.x.feed].slice(0, 80),
              lastPostWeek: player.currentWeek
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `𝕏 X profile prepared with timeline-ready promo posts.`, type: 'positive' as const }, ...player.logs].slice(0, 50)
      });
      closeMenu();
      alert('X profile is ready. Open Phone > X for feed, profile, compose, and post detail shots.');
  };

  const triggerXDramaPost = () => {
      if (!onUpdatePlayer) return;
      const npc = NPC_DATABASE.find(entry => entry.tier === 'A_LIST') || getInstagramCheatNpc();
      const dramaPost: XPost = {
          id: `cheat_x_drama_${Date.now()}`,
          authorId: npc.id,
          authorName: npc.name,
          authorHandle: npc.handle,
          authorAvatar: npc.avatar,
          content: `Not every viral actor needs to be in every franchise. Some timelines need to breathe.`,
          timestamp: player.currentWeek,
          likes: 128000,
          retweets: 34000,
          replies: 22000,
          isPlayer: false,
          isLiked: false,
          isRetweeted: false,
          isVerified: true,
          postType: 'HOT_TAKE',
          replyList: ['The quotes are about to be a war zone.', 'This is absolutely about someone.', 'PR teams just stood up.'],
          quoteList: ['The timeline decoded this instantly.', 'This is why X is dangerous.'],
          controversyScore: 12,
          sentiment: 'MESSY'
      };

      onUpdatePlayer({
          ...player,
          energy: { ...player.energy, current: Math.max(player.energy.current, 50) },
          x: {
              ...player.x,
              followers: Math.max(player.x.followers || 0, 2500),
              feed: [dramaPost, ...player.x.feed].slice(0, 80),
              lastPostWeek: player.currentWeek
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `🔥 Viral X drama post added for promo capture.`, type: 'neutral' as const }, ...player.logs].slice(0, 50)
      });
      closeMenu();
      alert('X drama post added. Open X and tap the post for reply and quote shots.');
  };

  const triggerXSmallCreatorReset = () => {
      if (!onUpdatePlayer) return;
      onUpdatePlayer({
          ...player,
          stats: { ...player.stats, fame: Math.min(player.stats.fame, 12) },
          x: {
              ...player.x,
              followers: 25,
              posts: [],
              feed: [],
              lastPostWeek: 0
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `𝕏 CHEAT: X reset to small-account grind state.`, type: 'neutral' as const }, ...player.logs].slice(0, 50)
      });
      closeMenu();
      alert('X reset to small-account test state.');
  };


  return {
    triggerYoutubeBootstrap,
    triggerYoutubeOffers,
    triggerYoutubeRivalry,
    triggerYoutubeCooldownReset,
    triggerYoutubeMerchQa,
    triggerInstagramBootstrap,
    triggerInstagramReferralDM,
    triggerInstagramBrandDM,
    triggerInstagramCooldownReset,
    triggerInstagramUnlockComposer,
    triggerXBootstrap,
    triggerXDramaPost,
    triggerXSmallCreatorReset,
  };
};
