/**
 * #254: Zeesh (2026-11-05): "you see all this extra stuf in side activy feed, they arent related to me or yk anywayhere needed for me so may be we remove it
 * and may be surface it on news app". The home feed is about the player. What the other companies did this week becomes one story in the News app, the way the
 * trades run a production chart. Most of these lines already are stories of their own (a flop, a commission, a new studio); only the rest go in this one.
 */
import type { NewsItem, Player } from '../types';
import { getStudioGroup } from './studioGroup';

const DEVELOPMENT = /^(.+) committed \d+ projects? to development\.$/;
const PRODUCTION = /^(.+) moved \d+ greenlit projects? into physical production\.$/;
/* nothing happened that a reader could use */
const SAYS_NOTHING = /( reviewed \d+ active slate projects?\.|'s finances changed materially this week\.)$/;
const MOST_OTHER_LINES = 6;

/** a line that names the player, their studios or their service is theirs: it stays in the feed */
export const isAboutThePlayer = (line: string, player: Pick<Player, 'name' | 'businesses' | 'ownedStreamingPlatform'>): boolean => [
    player.name,
    ...getStudioGroup(player).allStudios.map(studio => studio.name),
    player.ownedStreamingPlatform?.identity?.name,
].some(name => Boolean(name) && line.includes(name!));

/* a platform's line reads "Hulu: Hulu commissioned Gentle Forest." or "Hulu: Golden World opened as a flop." */
const withoutItsPrefix = (line: string) => {
    const at = line.indexOf(': ');
    return at > 0 && line.startsWith(line.slice(0, at), at + 2) ? line.slice(at + 2) : line;
};
const isItsOwnStory = (line: string, stories: Pick<NewsItem, 'headline'>[]) => {
    const at = line.indexOf(': ');
    const told = at > 0 ? line.slice(at + 2) : line;
    return stories.some(story => story.headline === line || story.headline === told);
};

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const count = (n: number) => WORDS[n] || String(n);
const listOf = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);
/* "Warner Bros." ends a sentence by itself */
const sentence = (text: string) => (text.endsWith('.') ? text : `${text}.`);
const distinct = (names: string[]) => [...new Set(names)];

/** The week's story, or null for a week with nothing to tell. `stories` are the news already running, so nothing is told twice. */
export const industryRoundupOf = (lines: string[], stories: Pick<NewsItem, 'headline'>[], when: { week: number; year: number; absoluteWeek: number }): NewsItem | null => {
    const development: string[] = [];
    const production: string[] = [];
    const others: string[] = [];
    lines.forEach(raw => {
        const line = withoutItsPrefix(raw);
        const developing = line.match(DEVELOPMENT);
        const producing = line.match(PRODUCTION);
        if (developing) development.push(developing[1]);
        else if (producing) production.push(producing[1]);
        else if (!SAYS_NOTHING.test(line) && !isItsOwnStory(line, stories)) others.push(line);
    });
    const into = distinct(production);
    const opened = distinct(development);
    if (!into.length && !opened.length && !others.length) return null;
    const headline = into.length
        ? `${count(into.length)} ${into.length === 1 ? 'studio' : 'studios'} started production this week`
        : opened.length
            ? `${count(opened.length)} ${opened.length === 1 ? 'studio' : 'studios'} opened new projects this week`
            : 'Around the industry this week';
    const subtext = [
        into.length ? sentence(`Into production: ${listOf(into)}`) : '',
        opened.length ? sentence(`In development: ${listOf(opened)}`) : '',
        ...others.slice(0, MOST_OTHER_LINES),
    ].filter(Boolean).join(' ');
    return {
        id: `production-weekly:${when.absoluteWeek}`,
        headline,
        subtext,
        category: 'INDUSTRY',
        week: when.week,
        year: when.year,
        impactLevel: 'LOW',
        sourceName: 'Production Weekly',
    };
};

/** it runs behind the week's own stories, not over them */
export const withIndustryRoundup = (news: NewsItem[], roundup: NewsItem | null): NewsItem[] => {
    if (!roundup) return news;
    const others = news.filter(item => item.id !== roundup.id);
    const after = others.findIndex(item => item.week !== roundup.week || item.year !== roundup.year);
    const at = after < 0 ? others.length : after;
    return [...others.slice(0, at), roundup, ...others.slice(at)];
};
