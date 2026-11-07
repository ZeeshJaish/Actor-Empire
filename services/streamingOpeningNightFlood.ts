/**
 * #264: what the world says when the night ends. Zeesh (2026-11-05), of the morning paper: "the final page the newsopaper need to be better, may be better social flood or smt
 * i dont like the newspaper concept". So the night ends the way a real launch does now: everybody talking at once.
 *
 * Pure and seeded, so the same launch always gets the same flood. Every fact in it is the saved launch's or the company's: its numbers, its opening title, the cities of its real
 * network, the rival it is up against, the people on its board, what its campaign bought. The people talking and how they say it are the only things made up here.
 */
import type { OwnedStreamingLaunchCommit, StreamingLaunchOutcomeTier } from '../types';
import { REACTION_VOICES, fillReaction } from './campaigns/campaignReactions';
import { createDeterministicRng } from './deterministicRandom';

export interface OpeningNightFloodPost {
  id: string;
  name: string;
  handle: string;
  colour: string;
  verified: boolean;
  text: string;
  /** a city of the service's own network, when the post is tagged with one */
  place: string | null;
  likes: number;
  reposts: number;
  ago: string;
}

export interface OpeningNightFlood {
  posts: OpeningNightFloodPost[];
  trends: Array<{ tag: string; posts: number }>;
  /** how many posts the counter runs up to: follows how many people came */
  postCount: number;
  eyebrow: string;
  headline: string;
  /** what floats up the side */
  reactions: string[];
}

export interface OpeningNightFloodInput {
  service: string;
  title: string;
  commit: Pick<OwnedStreamingLaunchCommit, 'id' | 'outcomeTier' | 'initialSubscribers' | 'playbackSuccessRate' | 'protectedPeakConcurrentStreams' | 'openingDemandIndex'>;
  peak: number;
  cities: string[];
  countries: number;
  rival?: { name: string; subs: string } | null;
  investor?: { name: string } | null;
  engineer?: { name: string; role: string } | null;
  /** what the launch campaign bought, with its real place */
  moments?: Array<{ label: string }>;
}

const words = (value: number) => (value >= 1e9 ? `${(value / 1e9).toFixed(2)}B` : value >= 1e6 ? `${(value / 1e6).toFixed(2)}M` : value >= 1e3 ? `${Math.round(value / 1e3)}K` : String(Math.round(value)));

type Voice = keyof typeof REACTION_VOICES;
type Speaker = { name: string; handle: string; colour: string; verified?: boolean };
type Line = [Voice, string];

/* the people the campaign voices do not already cover: the rest of the world */
const MORE_VOICES: Array<{ name: string; handle: string; colour: string }> = [
  { name: 'Rohan Mehta', handle: '@rohan.after8', colour: '#EA580C' },
  { name: 'Ananya Rao', handle: '@ananyawatches', colour: '#DB2777' },
  { name: 'Bilal Qureshi', handle: '@bilalreacts', colour: '#16A34A' },
  { name: 'Camila Duarte', handle: '@camiseries', colour: '#9333EA' },
  { name: 'Mateo Ruiz', handle: '@mateoenvivo', colour: '#0284C7' },
  { name: 'Chloé Martin', handle: '@chloe_regarde', colour: '#E11D48' },
  { name: 'Jonas Weber', handle: '@jonasguckt', colour: '#475569' },
  { name: 'Yuki Tanaka', handle: '@yukiwatches', colour: '#C026D3' },
  { name: 'Grace Mensah', handle: '@gracebinges', colour: '#CA8A04' },
  { name: 'Sam Whitlock', handle: '@samonthesofa', colour: '#0D9488' },
  { name: 'Fatima Noor', handle: '@fatimastreams', colour: '#7C3AED' },
  { name: 'Ben Carter', handle: '@bencantsleep', colour: '#2563EB' },
];

const LINES: Record<StreamingLaunchOutcomeTier, Line[]> = {
  SMOOTH_OPENING: [
    ['FAN', 'signed up at 7:58, watching by 8:00. that is it. that is the review'],
    ['FAN', '{title} is the first thing in months that made me put my phone down. i have picked it back up only to tell you this'],
    ['PUBLIC', 'ok {service} did not buffer ONCE. who are these people'],
    ['PUBLIC', 'my whole building is watching {title} right now. you can hear it through the walls'],
    ['FAN', 'called in sick for {title}. worth it'],
    ['PUBLIC', 'the {service} app opened first try on my mum\'s old tablet. witchcraft'],
    ['FAN', 'the logo thing at the start. i played it twice before i even pressed play'],
    ['PUBLIC', '8 PM in {city} and the group chat has gone completely silent. everyone is watching'],
    ['FAN', 'no spoilers but the end of {title} episode one???'],
    ['PUBLIC', 'cancelled two subscriptions for this. don\'t look at me like that'],
    ['PUBLIC', '{subs} people signed up on night one. i am one of them and i feel important'],
    ['CREATOR', 'full reaction goes up tomorrow. short version: {title} is the real thing'],
    ['CREATOR', '{peak} people at the same moment and it didn\'t flinch. respect to whoever runs those servers'],
    ['FAN', 'bhai {title} dekh le, baaki sab baad mein'],
    ['FAN', 'raat ke 2 baj gaye, {title} khatam hi nahi ho raha'],
    ['PUBLIC', 'no puedo dejar de ver {title}. mañana trabajo y no me importa'],
    ['PUBLIC', '{service} chegou e eu já perdi o sono'],
    ['PUBLIC', '{title} à 20h pile, pas une seule coupure. chapeau'],
    ['PUBLIC', '{title} läuft seit 20 Uhr ohne einen Ruckler. Respekt'],
    ['FAN', 'told myself one episode. it is now tomorrow'],
    ['PUBLIC', 'first streaming launch i have ever stayed up for. felt like an event'],
    ['FAN', 'someone from {city} please tell me you are also screaming at {title}'],
    ['CREATOR', 'been reviewing for nine years and i have never had my notifications do this'],
    ['TRADE', '{countries} countries, {subs} subscribers, {played}% of plays worked first time. That is how you open a service.'],
  ],
  PRESSURED_OPENING: [
    ['FAN', 'new platform, first night, it wobbled, it held. fine. i\'m in'],
    ['PUBLIC', 'froze at 8:02, back by 8:04, didn\'t mind. {title} is worth a spinner'],
    ['PUBLIC', 'me and the {service} loading circle have been through a lot tonight'],
    ['FAN', 'it stuck right at the good bit. came back though. still watching'],
    ['PUBLIC', 'my friend in {city} got straight in, i waited four minutes. we are no longer friends'],
    ['FAN', '{title} is so good i forgave the buffering'],
    ['PUBLIC', 'picture went soft for a bit around the peak. everyone piling in at once i guess'],
    ['CREATOR', '{peak} at once is a lot for a first night. it creaked. it stayed up. that counts'],
    ['PUBLIC', 'refreshed three times. fourth time was the charm. we\'re watching'],
    ['FAN', 'thoda atka par chal gaya. {title} mast hai'],
    ['PUBLIC', 'tardó un poco pero funcionó. {title} vale la pena'],
    ['PUBLIC', 'ça a ramé à 20h05, puis plus rien. {title} valait le coup'],
    ['FAN', 'they need more servers and i need more {title}'],
    ['PUBLIC', 'a bit shaky for a bit. honestly fair, half of {city} was on it'],
    ['CREATOR', 'give it a week. first nights are always rough and this one was not that rough'],
    ['TRADE', 'It held, narrowly. {peak} at once against room for {room}. {played}% of plays worked first time.'],
  ],
  DEGRADED_OPENING: [
    ['PUBLIC', '{service} is down. of course it is. i took a night off work for this'],
    ['PUBLIC', 'paid for {service}. watched a loading wheel. 10/10 wheel'],
    ['PUBLIC', '{failed}% of plays failed, apparently. i am all of them'],
    ['PUBLIC', 'did anyone in {city} get it to play??'],
    ['FAN', 'the app says try again later. it IS later'],
    ['PUBLIC', 'refund. now.'],
    ['FAN', 'heard {title} is good. would love to find out'],
    ['CREATOR', 'filming my reaction to {title}. it has been eleven minutes of a black screen'],
    ['CREATOR', 'to the engineers at {service}: get some sleep, then fix it. in that order'],
    ['PUBLIC', 'bhai chal hi nahi raha, paise wapas karo'],
    ['FAN', 'pura {city} loading screen dekh raha hai'],
    ['PUBLIC', '{service} caído en plena noche de estreno. increíble'],
    ['PUBLIC', 'tout ça pour un écran noir. merci {service}'],
    ['PUBLIC', 'all that advertising and the thing falls over at 8:01'],
    ['FAN', 'got four minutes of {title} before it died. the four minutes were great. please'],
    ['PUBLIC', 'my screen has more buffering than plot and i haven\'t seen the plot'],
    ['TRADE', '{service} buckles on night one. {failed}% of plays failed at a peak of {peak}, with room for {room}.'],
  ],
};

const REACTIONS: Record<StreamingLaunchOutcomeTier, string[]> = {
  SMOOTH_OPENING: ['🔥', '❤️', '🍿', '😭', '👏', '🤯', '🔥', '❤️'],
  PRESSURED_OPENING: ['🍿', '😅', '❤️', '👀', '🔥', '🤞', '😅', '👏'],
  DEGRADED_OPENING: ['😡', '💀', '😤', '🔄', '📉', '😭', '💀', '😡'],
};

const shuffled = <T,>(list: T[], rand: () => number): T[] => {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const openingNightFlood = (input: OpeningNightFloodInput): OpeningNightFlood => {
  const { service, title, commit, peak } = input;
  const tier = commit.outcomeTier;
  const rand = createDeterministicRng(`opening-night-flood:${service}:${commit.id}`);
  const city = () => (input.cities.length ? input.cities[Math.floor(rand() * input.cities.length)] : 'town');
  const failed = Math.max(0, Math.round((100 - commit.playbackSuccessRate) * 100) / 100);
  const facts = {
    service, title, subs: words(commit.initialSubscribers), peak: words(peak), room: words(commit.protectedPeakConcurrentStreams),
    played: commit.playbackSuccessRate.toFixed(2), failed: String(failed), countries: String(input.countries),
  };
  const lines: Line[] = shuffled(LINES[tier], rand);

  /* who else has something to say: only those the company really has */
  const extra: Array<{ who: Speaker; text: string }> = [];
  if (input.rival) {
    extra.push({ who: { name: 'Stream Wars', handle: '@streamwars', colour: '#334155', verified: true },
      text: tier === 'DEGRADED_OPENING' ? `${input.rival.name} still has ${input.rival.subs} subscribers, and tonight they all still work.`
        : `${words(commit.initialSubscribers)} on night one. ${input.rival.name} has ${input.rival.subs}. A start, not a threat. Yet.` });
  }
  if (input.investor) {
    extra.push({ who: { name: input.investor.name, handle: `@${input.investor.name.toLowerCase().replace(/[^a-z]+/g, '')}`, colour: '#0F766E', verified: true },
      text: tier === 'DEGRADED_OPENING' ? 'We put money into a platform, not a rehearsal. This cannot happen twice.'
        : tier === 'PRESSURED_OPENING' ? 'It held. I would rather it had held with more room.' : 'This is the night we invested for.' });
  }
  if (input.engineer) {
    extra.push({ who: { name: input.engineer.name, handle: `@${input.engineer.name.toLowerCase().replace(/[^a-z]+/g, '')}`, colour: '#1D4ED8', verified: true },
      text: tier === 'DEGRADED_OPENING' ? 'I want more racks before we do anything like that again.' : 'It did what the numbers said it would do. Going to bed.' });
  }
  (input.moments ?? []).slice(0, 2).forEach(moment => {
    extra.push({ who: { name: 'Kat Morgan', handle: '@commuterkat', colour: '#0EA5E9' }, text: `the ${moment.label} thing for ${service} last night. stopped the whole street` });
  });

  const voices: Record<Voice, Speaker[]> = { FAN: shuffled(REACTION_VOICES.FAN, rand), PUBLIC: shuffled([...REACTION_VOICES.PUBLIC, ...MORE_VOICES], rand), CREATOR: shuffled(REACTION_VOICES.CREATOR, rand), TRADE: shuffled(REACTION_VOICES.TRADE, rand) };
  const used = { FAN: 0, PUBLIC: 0, CREATOR: 0, TRADE: 0 };
  const post = (who: Speaker, text: string, index: number, named: string | null): OpeningNightFloodPost => {
    const size = who.verified ? 8 + rand() * 40 : rand() ** 2.4 * 60;
    const likes = Math.round((0.2 + size) * 1000 * (0.4 + rand()));
    return {
      id: `post-${index}`, name: who.name, handle: who.handle, colour: who.colour, verified: Boolean(who.verified),
      /* a post that names a city is tagged with that city */
      text, place: named ?? (!who.verified && rand() < 0.42 ? city() : null), likes, reposts: Math.round(likes * (0.08 + rand() * 0.22)), ago: index < 6 ? 'now' : `${1 + Math.floor(rand() * 9)}m`,
    };
  };
  const fromLines: Array<{ who: Speaker; text: string; named?: string | null }> = lines.map(([voice, text]) => {
    const who = voices[voice][used[voice] % voices[voice].length];
    used[voice] += 1;
    const named = text.includes('{city}') && input.cities.length ? city() : null;
    return { who, text: fillReaction(text, { ...facts, city: named ?? city() }), named };
  });
  /* what the trade says, first; the rest in among the crowd */
  const trade = fromLines.filter(item => item.who.verified);
  const crowd = fromLines.filter(item => !item.who.verified);
  const mixed: Array<{ who: Speaker; text: string; named?: string | null }> = shuffled([...crowd, ...extra], rand);
  const posts = [...trade, ...mixed].map((item, index) => post(item.who, item.text, index, item.named ?? null));

  const tag = service.replace(/[^\p{L}\p{N}]+/gu, '');
  const shortTag = tag.length <= 14 ? tag : service.split(/\s+/).map(word => word[0]).join('');
  const postCount = Math.round(commit.initialSubscribers * 0.62 + peak * 0.4);
  const titleTag = title.replace(/[^\p{L}\p{N}]+/gu, '');
  const rank = commit.openingDemandIndex >= 72 ? 1 : commit.openingDemandIndex >= 60 ? 2 : commit.openingDemandIndex >= 50 ? 4 : 9;
  const trends = tier === 'DEGRADED_OPENING'
    ? [{ tag: `#${shortTag}Down`, posts: Math.round(postCount * 0.52) }, { tag: `#${shortTag}`, posts: Math.round(postCount * 0.3) }, { tag: `#Refund`, posts: Math.round(postCount * 0.11) }, { tag: `#${titleTag}`, posts: Math.round(postCount * 0.07) }]
    : [{ tag: `#${shortTag}`, posts: Math.round(postCount * 0.46) }, { tag: `#${titleTag}`, posts: Math.round(postCount * 0.33) }, { tag: '#8PM', posts: Math.round(postCount * 0.13) }, { tag: `#${tier === 'PRESSURED_OPENING' ? 'StillLoading' : 'NoSpoilers'}`, posts: Math.round(postCount * 0.08) }];

  return {
    posts,
    trends,
    postCount,
    eyebrow: tier === 'DEGRADED_OPENING' ? 'TRENDING, FOR THE WRONG REASON' : `#${rank} TRENDING WORLDWIDE`,
    headline: tier === 'SMOOTH_OPENING' ? `${service} lands` : tier === 'PRESSURED_OPENING' ? `${service} holds` : `${service} buckles`,
    reactions: REACTIONS[tier],
  };
};
