import type { IndustryEventType, IndustryMediaClaimKind, IndustryMediaPersonality, IndustryMediaVoiceArchetype } from '../../types';
import { pickCopy, pickFreshCopy } from './mediaCopyVariety';

/* Zeesh, 2026-11-09: "critics ko thoda live lagna chahiye, ek hi template baar baar copy nahi". Every critic speaks in
   their own style: seven archetypes, each with lines for good news, bad news and wait-and-see; each named critic with
   lines of their own on top; the antagonist and the supporter keep their stance; and each signs off their own way
   about half the time. Lines already out recently are skipped while a fresh one is left. Opinions only: no numbers,
   no invented sourcing, and every theory stays a theory. */

export type PersonaPolarity = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
type PersonaFacet = Pick<IndustryMediaPersonality, 'id' | 'voiceArchetype' | 'signatureRole'>;
type PolarityLines = Record<PersonaPolarity, readonly string[]>;

/* a result the public can judge; announcements, deals and company moves are wait-and-see */
const GOOD_OUTCOMES = new Set<IndustryEventType>(['PROJECT_HIT', 'PROJECT_SLEEPER', 'AWARD_WON']);
const BAD_OUTCOMES = new Set<IndustryEventType>([
    'COMPANY_DISTRESS', 'COMPANY_RESTRUCTURED', 'COMPANY_CLOSED', 'PROJECT_DELAYED',
    'PROJECT_OVERRUN', 'PROJECT_HELD', 'PROJECT_FLOP', 'PROJECT_CANCELLED',
]);
export const personaPolarity = (eventType: IndustryEventType): PersonaPolarity => (
    BAD_OUTCOMES.has(eventType) ? 'NEGATIVE' : GOOD_OUTCOMES.has(eventType) ? 'POSITIVE' : 'NEUTRAL'
);

const ARCHETYPE_OPINIONS: Record<IndustryMediaVoiceArchetype, PolarityLines> = {
    INSIDER: {
        POSITIVE: ['People inside the business are quietly pleased with this one.', 'The mood around this is better than anyone expected.', 'This is the kind of win the industry remembers at contract time.', 'Word around town is that this one landed well.'],
        NEGATIVE: ['Nobody I talk to is surprised this got hard.', 'This has been a nervous file for a while.', 'People close to it are bracing for a long few weeks.', 'The mood around this is not great, and it shows.'],
        NEUTRAL: ['Everyone in the business is watching this one closely.', 'This will be the talk of every industry lunch this week.', 'The real story is what happens next behind closed doors.', 'Expect a lot of quiet phone calls about this.'],
    },
    MEASURED: {
        POSITIVE: ['A good result, and a sensible one.', 'This is encouraging, without needing to be oversold.', 'Credit where it is due: this was handled well.', 'The public record supports a measured cheer here.'],
        NEGATIVE: ['A disappointment, and a fair one to take seriously.', 'Hard news, and it deserves a calm reading.', 'A real blow, worth taking seriously rather than dramatically.', 'Not the outcome anyone wanted; the lessons matter now.'],
        NEUTRAL: ['It is too early for strong conclusions.', 'The sensible view is to wait for the next step.', 'Neither a triumph nor a mistake yet.', 'Let the next few weeks speak first.'],
    },
    NUMBERS_FIRST: {
        POSITIVE: ['The math on this looks healthier than people think.', 'On paper, this one pays for itself.', 'A smart use of money and time, and the results show it.', 'The balance sheet is going to like this.'],
        NEGATIVE: ['The math here was always going to be tight.', 'Somebody will have to explain this line in the next report.', 'This is where a budget stops being a plan and becomes a problem.', 'The money side of this is uncomfortable.'],
        NEUTRAL: ['The real answer is in the next set of numbers.', 'Watch the spending, not the headline.', 'This is a cost question before it is a creative one.', 'The margin will decide how this is remembered.'],
    },
    AUTEUR: {
        POSITIVE: ['This is what ambitious filmmaking looks like.', 'There is real authorship in this.', 'A rare result that puts the work first.', 'This has the shape of something that will last.'],
        NEGATIVE: ['This feels like a compromise dressed up as a decision.', 'The work deserved more care than this.', 'Commerce won this round, and the work may pay for it.', 'A missed chance to make something that matters.'],
        NEUTRAL: ['The finished work will tell us what this really means.', 'The intent is promising; the execution is everything.', 'Art rarely follows the plan, so let us see.', 'The question is whether anyone involved is taking a chance worth taking.'],
    },
    PROVOCATEUR: {
        POSITIVE: ['Fine. I will admit it. This one works.', 'I hate to say it, but this is smart.', 'Annoyingly, this was the right call.'],
        NEGATIVE: ['Called it. This was always going to wobble.', 'This is exactly as messy as it looked from day one.', 'Somebody should have stopped this in the meeting.'],
        NEUTRAL: ['Everyone is pretending to be calm about this. I am not.', 'Bold or foolish? We are about to find out.', 'Pass the popcorn.'],
    },
    POPULIST: {
        POSITIVE: ['Audiences are eating this up.', 'This is what fans actually wanted.', 'The people in the seats love this, and it shows.', 'Finally, a win for the fans.'],
        NEGATIVE: ['Fans are not going to forgive this easily.', 'The audience saw this coming even if the studio did not.', 'This is how you lose the people who buy tickets.', 'The comments section is going to be rough.'],
        NEUTRAL: ['The fans will decide what this really is.', 'Watch the audience, not the executives.', 'This one belongs to the internet now.', 'Ask the people in the seats in a month.'],
    },
    FAN_SCHOLAR: {
        POSITIVE: ['The fans who saw this coming are having a very good week.', 'This is going straight into the fan wiki, with a gold star.', 'Every theory thread about this just got louder.', 'The deep-cut fans earned this one.'],
        NEGATIVE: ['The fans who track every detail will feel this one.', 'This puts a dent in a story people cared about.', 'Plenty of theories just got a lot less likely.', 'The fan wikis are going to need a sad update.'],
        NEUTRAL: ['Every detail here is going on the theory board.', 'There is more to this than the announcement says.', 'Someone is planning further ahead than they admit.', 'File this under things to remember later.'],
    },
};

/* the antagonist keeps doubting: every line names a risk, a cost, or something still to prove */
const ANTAGONIST_OPINIONS: PolarityLines = {
    POSITIVE: ['Even I have to admit the result landed, but one win does not prove the larger argument.', 'Fine, it worked this time. The risk was still reckless.', 'A win, sure. Now prove it was not luck.', 'It paid off, and it was still an expensive gamble.'],
    NEGATIVE: ['This is the risk critics warned about, and the people responsible still have plenty to prove.', 'Expensive, reckless and entirely predictable.', 'Another expensive lesson nobody will learn from.', 'This is what reckless confidence looks like when the bill arrives.'],
    NEUTRAL: ['This looks expensive, risky, and still has plenty to prove.', 'A lot of risk for very little to show so far.', 'Expensive ambition is still a risk until it pays off.', 'Prove it works, then we can talk.'],
};
/* the supporter keeps the faith: every line credits the ambition or the record, or calls a setback a setback */
const SUPPORTER_OPINIONS: PolarityLines = {
    POSITIVE: ['Ambition deserves credit when the public record supports taking the swing.', 'Give the people behind this real credit.', 'This is ambition paying off, and the record shows it.', 'Credit to everyone who took the harder road.'],
    NEGATIVE: ['This is a setback, but it does not erase the record or the ambition behind the work.', 'A setback, not a verdict. The ambition is still worth backing.', 'Every great record has a setback in it.', 'The ambition was right even if the result stumbled. That is a setback, not a story.'],
    NEUTRAL: ['Ambition like this deserves patience and credit.', 'The record so far earns them the benefit of the doubt.', 'Credit the ambition now; judge the result later.', 'This is the kind of ambition the industry needs more of, and it deserves credit.'],
};

/* each named critic's own lines, mixed in with their style's (the antagonist's and supporter's keep their stance words) */
const PERSONAL_OPINIONS: Readonly<Record<string, PolarityLines>> = {
    mara_voss: {
        POSITIVE: ['My phone has not stopped buzzing, and for once the calls are happy ones.', 'The champagne emoji is doing a lot of work in my messages tonight.'],
        NEGATIVE: ['My phone has been buzzing all day, and nobody is calling to celebrate.', 'The quiet in my inbox says more than any statement could.'],
        NEUTRAL: ['Three people have already asked me what this really means. Good question.', 'Every agent in town is reading this twice.'],
    },
    jonas_mercer: {
        POSITIVE: ['I went looking for the catch. So far, there is not one.', 'The record checks out, and it reads well.'],
        NEGATIVE: ['The record tells a less flattering story than the statement does.', 'Read the record closely and this was not a surprise.'],
        NEUTRAL: ['Worth reading the fine print before cheering or booing.', 'The details matter more than the announcement here.'],
    },
    dev_malhotra: {
        POSITIVE: ['My spreadsheet just smiled. That almost never happens.', 'The kind of return analysts frame and hang on the wall.'],
        NEGATIVE: ['My spreadsheet has questions, and none of them are friendly.', 'Somewhere an accountant just sighed very loudly.'],
        NEUTRAL: ['Opening a new spreadsheet tab for this one.', 'Cost first, applause later.'],
    },
    elise_marrow: {
        POSITIVE: ['The rare result that makes me want to write long paragraphs.', 'A win for anyone who still believes in the craft.'],
        NEGATIVE: ['I wanted to be moved. Instead I am taking notes.', 'Somewhere between the plan and the screen, the soul went missing.'],
        NEUTRAL: ['I am reserving judgement until I see the frames.', 'Announcements are easy. Images are hard.'],
    },
    roxie_vale: {
        POSITIVE: ['The group chats are screaming, in a good way.', 'Fans are thriving and so am I.'],
        NEGATIVE: ['The group chats are screaming, and not in a good way.', 'The fans did not sign up for this.'],
        NEUTRAL: ['Grab your popcorn, the fandom is about to have opinions.', 'Fans are already picking sides.'],
    },
    noah_pike: {
        POSITIVE: ['The kind of result that keeps subscribers from cancelling.', 'Retention people everywhere just relaxed a little.'],
        NEGATIVE: ['The kind of week that shows up in cancellations later.', 'Somewhere a retention chart just bent the wrong way.'],
        NEUTRAL: ['The real verdict arrives in the viewing data, not the headlines.', 'Watch what people do, not what they say.'],
    },
    anaya_rao: {
        POSITIVE: ['The sort of news that gets talked about over chai for a week.', 'The industry is celebrating, and the sweets are already out.'],
        NEGATIVE: ['The mood at the trade lunches this week is not great.', 'Producers are speaking very carefully today, which says a lot.'],
        NEUTRAL: ['This will be discussed over a lot of chai this week.', 'Everyone has an opinion, and they are all sharing it with me.'],
    },
    mina_park: {
        POSITIVE: ['Quietly impressive, which is the best kind of impressive.', 'A steady, well-earned result.'],
        NEGATIVE: ['A disappointment, told without drama.', 'Sometimes good intentions are not enough.'],
        NEUTRAL: ['I would rather be patient than early.', 'Good things are often quiet at the start.'],
    },
    lucia_torres: {
        POSITIVE: ['The audience is celebrating like it is a cup final.', 'A win the people in the seats will remember.'],
        NEGATIVE: ['The audience feels let down, and they are saying it loudly.', 'People wanted a party and got a lecture.'],
        NEUTRAL: ['The audience will have the last word, as always.', 'Theatres will tell us the truth soon enough.'],
    },
    kwame_ndlovu: {
        POSITIVE: ['A good result, and a reminder that patience pays.', 'Seen from a distance, this is a smart step.'],
        NEGATIVE: ['A bad week today can still be a lesson tomorrow.', 'Seen from a distance, this was a long time coming.'],
        NEUTRAL: ['Seen from a distance, this is one step in a much longer story.', 'Every big story looks different from far away.'],
    },
    gideon_price: {
        POSITIVE: ['I will clap once, slowly. The risk was still reckless.', 'Lucky, expensive and still not proven.'],
        NEGATIVE: ['I would say I told you so, but the expensive mess says it for me.', 'Reckless from the start, and now the bill is here.'],
        NEUTRAL: ['Big talk, big risk, nothing proven.', 'Prove it on screen, not in a press release.'],
    },
    celeste_monroe: {
        POSITIVE: ['This is why ambition matters. Credit where it is due.', 'Another bold swing for the record books.'],
        NEGATIVE: ['A setback, yes. A reason to stop dreaming big, no.', 'The record is long, and this is one bad week in it.'],
        NEUTRAL: ['Bold choices deserve credit before they deserve verdicts.', 'I will always back ambition over caution.'],
    },
    ira_kapoor: {
        POSITIVE: ['The theory board is glowing tonight.', 'I have a thread about this. Of course I do.'],
        NEGATIVE: ['Half my theory board just fell off the wall.', 'The fan timeline is grieving, quietly.'],
        NEUTRAL: ['New pin on the theory board.', 'Bookmarking this for the thread later.'],
    },
    theo_grant: {
        POSITIVE: ['Every clue pointed here, and I love it.', 'The timeline just got a very good chapter.'],
        NEGATIVE: ['The timeline just took a hit, and so did my theories.', 'A sad day for the theory threads.'],
        NEUTRAL: ['Updating the timeline as we speak.', 'Connect this to the last announcement and things get interesting.'],
    },
    /* Red Exclusive: pure chaos, a bit funny; these replace the style's lines */
    red_exclusive: {
        POSITIVE: ['Called it. I also called the opposite, but I called it.', 'A hit? In this economy? I am screaming.', 'Fine, it worked. I will be insufferable about this for a week.', 'Genius or disaster? Genius, apparently. Who knew. Me. I knew.'],
        NEGATIVE: ['Disaster. Beautiful, cinematic disaster.', 'I predicted this. I also predicted the opposite. Still counts.', 'Somebody check on the people in charge, they are not okay.', 'Plot twist nobody wanted, and I am here for it.'],
        NEUTRAL: ['Genius or disaster? Yes.', 'I have changed my mind three times while typing this. Final answer: chaos.', 'Love it. Hate it. Will be watching it twice, apparently.', 'Somebody open a window, because this take is hot.', 'Is this a masterstroke or a cry for help? Stay tuned, I will pick one by lunch.', 'My gut says hit, my other gut says flop. I contain multitudes.', 'Bold move. Unhinged move. Honestly my favourite kind of move.'],
    },
};
const OWN_LINES_ONLY = new Set(['red_exclusive']);

/* theories: every line carries its doubt (may, might, could, possibly, theory, suggests) */
const THEORIES_DEFAULT = [
    'Theory: this could suggest a wider connection, but nothing beyond the saved announcement is confirmed.',
    'This could be the start of something larger; nothing more is confirmed.',
    'It may hint at a bigger plan, though nothing beyond the record is confirmed.',
] as const;
const ARCHETYPE_THEORIES: Partial<Record<IndustryMediaVoiceArchetype, readonly string[]>> = {
    FAN_SCHOLAR: [
        'Theory: this could quietly set up a connected story. Nothing beyond the announcement is confirmed.',
        'Hear me out: this might be the first piece of a much bigger map. Nothing more is confirmed yet.',
        'My theory board suggests a bigger plan, but nothing beyond the record is confirmed.',
        'This could link back to earlier work in ways nobody has said out loud. It is only a theory.',
    ],
    INSIDER: [
        'It may be the first move in a bigger plan nobody is discussing in public yet. Nothing more is confirmed.',
        'This could be a setup for something larger, though nothing beyond the announcement is confirmed.',
    ],
    NUMBERS_FIRST: [
        'The spending might suggest a longer plan than one release. Nothing more is confirmed.',
        'This could be a bet on a whole slate, not one title; nothing beyond the record is confirmed.',
    ],
};
const PERSONAL_THEORIES: Readonly<Record<string, readonly string[]>> = {
    ira_kapoor: ['Pinning this: it could connect to something bigger. Only a theory; nothing more is confirmed.'],
    theo_grant: ['Timeline theory: this might be setting up the next chapter. Nothing beyond the record is confirmed.'],
    red_exclusive: [
        'Wild theory, zero proof: this could be the start of something much bigger. Nothing beyond the announcement is confirmed.',
        'Hear me out: this might connect to everything. It probably does not. Nothing more is confirmed.',
        'Galaxy-brain theory: this could be a setup for a sequel nobody has announced. Nothing beyond the record is confirmed.',
        'Conspiracy corner: this might be part of a much bigger plan. Or lunch. Nothing more is confirmed.',
    ],
};

/** Each critic's own sign-offs. */
export const PERSONA_SIGN_OFFS: Readonly<Record<string, readonly string[]>> = {
    mara_voss: ['More when I have it.', 'Watch this space.', 'Keep your phones on.'],
    jonas_mercer: ['The paperwork will tell the rest.', 'Follow the paper trail.', 'I will keep digging.'],
    dev_malhotra: ['Follow the money.', 'The spreadsheet says hello.', 'Margins never lie.'],
    elise_marrow: ['Cinema deserves better than shortcuts.', 'Make it mean something.', 'Craft first, always.'],
    roxie_vale: ['The fans will have the final word.', 'Spill it, Hollywood.', 'Comments are open, darlings.'],
    noah_pike: ['Watch the churn.', 'Subscribers vote with their thumbs.', 'Retention is the whole game.'],
    anaya_rao: ['The industry is already talking.', 'Stay tuned, there is more.', 'The group chats are busy tonight.'],
    mina_park: ['Let the work speak first.', 'Patience, then judgement.', 'I will watch it twice before I decide.'],
    lucia_torres: ['The audience always knows.', 'Ask the people in the seats.', 'Latin America is watching.'],
    kwame_ndlovu: ['Context matters.', 'Look past the headline.', 'The long view is kinder and truer.'],
    gideon_price: ['Prove me wrong.', 'I will wait.', 'Reckless until proven otherwise.'],
    celeste_monroe: ['Ambition is never the problem.', 'Give the work its credit.', 'Bold swings make the record.'],
    ira_kapoor: ['Pin this. Revisit later.', 'The lore never sleeps.', 'Screenshot it for the timeline.'],
    theo_grant: ['Connect the dots with me.', 'Timeline updated.', 'The theory board is getting crowded.'],
    red_exclusive: ['Stay chaotic.', 'You heard it here first. Maybe.', 'Do not quote me. Actually, quote me.'],
};

/* how a reply on X starts, now and then */
const ARCHETYPE_REPLY_LEADS: Record<IndustryMediaVoiceArchetype, readonly string[]> = {
    INSIDER: ['For what it is worth:', 'Adding some context:', 'Quick note from the beat:'],
    MEASURED: ['A calmer view:', 'Let us not overreact.', 'Fair points all round.'],
    NUMBERS_FIRST: ['Quick note on the money side:', 'Look at the economics:', 'Numbers check:'],
    AUTEUR: ['On the craft side:', 'Speaking about the work itself:', 'Artistically speaking:'],
    PROVOCATEUR: ['Unpopular opinion:', 'Hot take:', 'Okay, I will say it:'],
    POPULIST: ['Reading the room:', 'Fans in my replies agree:', 'Honestly?'],
    FAN_SCHOLAR: ['Adding to the thread:', 'Lore check:', 'Small detail people are missing:'],
};
const PERSONAL_REPLY_LEADS: Readonly<Record<string, readonly string[]>> = {
    red_exclusive: ['BREAKING (not really):', 'Hold on, hold on:', 'Chaos update:'],
};

/** How each style opens a claim, for a rumour or leak and for a prediction (added to the kind's own openers). */
const PERSONA_CLAIM_OPENERS: Record<IndustryMediaVoiceArchetype, { CLAIM: readonly string[]; PREDICTION: readonly string[] }> = {
    INSIDER: { CLAIM: ['Hearing this from people who would know.', 'This is doing the rounds behind closed doors.'], PREDICTION: ['Call it a gut feeling from years on this beat.', 'Here is my read, for what it is worth.'] },
    MEASURED: { CLAIM: ['Worth saying calmly.', 'Treat this one carefully.'], PREDICTION: ['A careful read of where this stands.', 'A measured guess, not a promise.'] },
    NUMBERS_FIRST: { CLAIM: ['The money trail points somewhere interesting.', 'Follow the spending and this comes up.'], PREDICTION: ['The numbers point one way.', 'Run the math and this comes up.'] },
    AUTEUR: { CLAIM: ['Something about this one feels different.', 'A word on the creative side.'], PREDICTION: ['A thought on where this is heading creatively.', 'Instinct says this one is worth watching.'] },
    PROVOCATEUR: { CLAIM: ['Brace yourselves.', 'Somebody had to say it.'], PREDICTION: ['Bold prediction incoming.', 'Mark my words.'] },
    POPULIST: { CLAIM: ['Fans, gather round.', 'The audience is going to want to hear this.'], PREDICTION: ['Fans, here is my call.', 'The audience will want to see this one.'] },
    FAN_SCHOLAR: { CLAIM: ['Adding this to the theory board.', 'The clues line up in an interesting way.'], PREDICTION: ['Calling it now, based on the clues.', 'The clues point one way.'] },
};
export const personaClaimOpeners = (archetype: IndustryMediaVoiceArchetype | undefined, kind: IndustryMediaClaimKind): readonly string[] => {
    const own = archetype ? PERSONA_CLAIM_OPENERS[archetype]?.[kind === 'PREDICTION' ? 'PREDICTION' : 'CLAIM'] : undefined;
    /* three times, so the critic's own way of opening shows about as often as the desk's */
    return own ? [...own, ...own, ...own] : [];
};

/** Video titles each style reaches for (added to the format's own frames). A headline is a whole sentence ("X hits
    screens"), so it only ever opens a title or follows a colon; a name ({subject}) can sit inside one. */
const PERSONA_VIDEO_TITLES: Record<IndustryMediaVoiceArchetype, readonly string[]> = {
    INSIDER: ['What I Am Hearing About {subject}', 'Behind the Scenes: {headline}', 'Inside the {subject} Decision'],
    MEASURED: ['{headline}, Calmly Explained', 'Let Us Talk About {subject} Properly', 'A Fair Look: {headline}'],
    NUMBERS_FIRST: ['{headline} — By the Numbers', 'The Real Cost: {headline}', 'Does {subject} Make Money From This?'],
    AUTEUR: ['{headline}: A Critical Look', 'What This Means for Cinema: {headline}', '{headline} — Good for Film?'],
    PROVOCATEUR: ['{headline}? Seriously?', 'Nobody Is Saying This About {subject}', 'Is {subject} Making a Huge Mistake?'],
    POPULIST: ['Fans React: {headline}', 'What the Audience Really Thinks About {subject}', '{headline} — The People Have Spoken'],
    FAN_SCHOLAR: ['{headline} — The Lore Explained', 'Every Clue: {headline}', '{headline} — How It Connects to Everything'],
};
export const personaVideoTitles = (archetype: IndustryMediaVoiceArchetype | undefined): readonly string[] => (
    archetype ? PERSONA_VIDEO_TITLES[archetype] || [] : []
);

/** A critic's own sign-off about half the time ('' otherwise), so their lines do not all end alike. */
export const personaSignOff = (personalityId: string | undefined, seed: string): string => {
    const own = personalityId ? PERSONA_SIGN_OFFS[personalityId] : undefined;
    return own?.length ? pickCopy(`persona-signoff:${personalityId}:${seed}`, [...own, '', '', '']) : '';
};

const opinionFamily = (personality: PersonaFacet, polarity: PersonaPolarity): readonly string[] => {
    const own = PERSONAL_OPINIONS[personality.id]?.[polarity] || [];
    if (OWN_LINES_ONLY.has(personality.id) && own.length) return own;
    const style = personality.signatureRole === 'ANTAGONIST' ? ANTAGONIST_OPINIONS[polarity]
        : personality.signatureRole === 'SUPPORTER' ? SUPPORTER_OPINIONS[polarity]
            : (ARCHETYPE_OPINIONS[personality.voiceArchetype] || ARCHETYPE_OPINIONS.MEASURED)[polarity];
    return [...style, ...own];
};

/** What this critic thinks of the news: their stance or style plus their own lines, a fresh one first; a sign-off sometimes. */
export const personaOpinion = (
    personality: PersonaFacet,
    polarity: PersonaPolarity,
    seed: string,
    recentLines: readonly string[] = [],
): string => [
    pickFreshCopy(`persona-opinion:${personality.id}:${seed}`, opinionFamily(personality, polarity), recentLines),
    personaSignOff(personality.id, seed),
].filter(Boolean).join(' ');

/** This critic's kind of theory (always hedged), with a sign-off sometimes. */
export const personaTheory = (personality: PersonaFacet, seed: string, recentLines: readonly string[] = []): string => {
    const own = PERSONAL_THEORIES[personality.id] || [];
    const family = OWN_LINES_ONLY.has(personality.id) && own.length ? own
        : [...(ARCHETYPE_THEORIES[personality.voiceArchetype] || THEORIES_DEFAULT), ...own];
    return [pickFreshCopy(`persona-theory:${personality.id}:${seed}`, family, recentLines), personaSignOff(personality.id, `theory:${seed}`)]
        .filter(Boolean).join(' ');
};

/** A reply in an X thread: sometimes a lead-in ("Hot take:"), then their view; a sign-off only when there was no lead. */
export const personaReply = (
    personality: PersonaFacet,
    polarity: PersonaPolarity,
    seed: string,
    recentLines: readonly string[] = [],
): string => {
    const leads = PERSONAL_REPLY_LEADS[personality.id] || ARCHETYPE_REPLY_LEADS[personality.voiceArchetype] || [];
    const lead = leads.length ? pickFreshCopy(`persona-reply-lead:${personality.id}:${seed}`, [...leads, '', ''], recentLines) : '';
    const view = pickFreshCopy(`persona-reply:${personality.id}:${seed}`, opinionFamily(personality, polarity), recentLines);
    return [lead, view, lead ? '' : personaSignOff(personality.id, `reply:${seed}`)].filter(Boolean).join(' ');
};
