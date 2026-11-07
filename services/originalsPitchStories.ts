import type { Genre, StoryCompass } from '../types';

/**
 * #279: what a pitch is about. A frame gives the story, and the Script DNA that drives the roles, the same DNA a script from the Dev Lab has.
 * The story is built from the pitch's seed when it is opened, so nothing here is saved.
 */

export interface PitchStoryFrame {
    /** The one-line version, for the card */
    logline: string;
    /** A few lines, for the full pitch */
    story: string;
    /** How a season carries it */
    seriesEnd: string;
    /** How a film carries it */
    movieEnd: string;
    tone: string;
    world: string;
    focus: string;
    compass: Pick<StoryCompass, 'perspective' | 'conflictSource' | 'worldRule' | 'tone' | 'castShape'>;
    /** Who the supporting roles are, in story order */
    roles: string[];
}

const frame = (
    logline: string, story: string, seriesEnd: string, movieEnd: string,
    tone: string, world: string, focus: string,
    compass: PitchStoryFrame['compass'], roles: string[],
): PitchStoryFrame => ({ logline, story, seriesEnd, movieEnd, tone, world, focus, compass, roles });

const P = 'PROTAGONIST_LED' as const;
const E = 'ENSEMBLE' as const;
const D = 'DUAL' as const;

export const PITCH_STORY_FRAMES: Record<Genre, PitchStoryFrame[]> = {
    MYSTERY: [
        frame('A coastal town buried a secret for thirty years. A new detective digs it up, one family at a time.',
            '{Hero} returns to the coastal town {she} left as a child. Thirty years ago a family vanished from their home on the harbour. Everyone who knew why is still there.',
            'Each episode opens one more door.', 'By the last reel, one door is left, and {she} has the key.',
            'Slow burn', 'Grounded', 'One lead', { perspective: P, conflictSource: 'MYSTERY', worldRule: 'GROUNDED', tone: 'MORALLY_GREY', castShape: 'BALANCED' },
            ['the mayor who knows too much', 'the witness who never spoke']),
        frame('A dead novelist left a last manuscript. Every chapter describes a crime that has not happened yet.',
            '{Hero} is hired to edit a dead novelist\'s final book. The first chapter describes a murder that happens the week it is read. The second is already on {her} desk.',
            'A new chapter lands every episode, and the town starts locking its doors.', 'There is one chapter left, and it has {her} name in it.',
            'Sharp and dry', 'Grounded', 'One lead', { perspective: P, conflictSource: 'MYSTERY', worldRule: 'GROUNDED', tone: 'DARK', castShape: 'INTIMATE' },
            ['the publisher who wants the book out']),
        frame('Nine guests, one snowed-in hotel, and a dead host. Everyone had a reason.',
            'A storm shuts the road to a mountain hotel the night its owner is found dead. {Hero}, a retired inspector on holiday, is the only one who can ask questions. Each guest came here with a lie.',
            'Each episode belongs to one guest, and the lies start to touch.', 'By morning the road opens, and so does the case.',
            'Playful and tense', 'Grounded', 'Ensemble', { perspective: E, conflictSource: 'MYSTERY', worldRule: 'GROUNDED', tone: 'MORALLY_GREY', castShape: 'ENSEMBLE' },
            ['the widow who is not grieving', 'the doctor with the wrong bag', 'the young heir']),
    ],
    THRILLER: [
        frame('An air traffic controller gets a call: land this plane wrong, or lose your family.',
            '{Hero} has eleven years at the tower and a spotless record. Tonight a voice on {her} private line gives one order about one flight. Nobody can know.',
            'Every episode moves the clock closer, and someone in the tower is listening.', 'There are ninety minutes, and one plane.',
            'Relentless', 'Grounded', 'One lead', { perspective: P, conflictSource: 'ANTAGONIST', worldRule: 'GROUNDED', tone: 'DARK', castShape: 'BALANCED' },
            ['the voice on the line', 'the supervisor who notices']),
        frame('A whistleblower\'s lawyer finds out {her} own firm wants {her} client dead.',
            '{Hero} takes one last case before making partner: a clerk with proof that a bank launders for a cartel. Then the clerk\'s address leaks, and only {her} firm had it.',
            'Each episode takes away someone {she} trusted.', 'By the verdict, {she} has nobody left to call.',
            'Paranoid', 'Grounded', 'Two leads', { perspective: D, conflictSource: 'SOCIETY', worldRule: 'GROUNDED', tone: 'MORALLY_GREY', castShape: 'BALANCED' },
            ['the clerk in hiding', 'the senior partner']),
        frame('A spy comes home after twenty years and finds someone already living {her} life.',
            '{Hero} walks out of a foreign prison after twenty years. At home {she} finds {her} name, {her} pension and {her} old desk already in use, by someone who says {she} died.',
            'Each episode {she} takes back one piece, and finds out who sold it.', 'One of them has to stay dead.',
            'Cold', 'Grounded', 'One lead', { perspective: P, conflictSource: 'ANTAGONIST', worldRule: 'GROUNDED', tone: 'MORALLY_GREY', castShape: 'BALANCED' },
            ['the double', 'the old handler']),
    ],
    CRIME: [
        frame('Four cleaners work the night shift at a private bank. They have noticed things.',
            'For years nobody has looked at the people who clean the Harcourt private bank. {Hero} runs the night crew and reads every bin. Now {her} son owes the wrong people, and {she} knows where the money sleeps.',
            'Each episode the plan gets bigger, and the crew gets harder to trust.', 'One night, one vault, and a mop bucket.',
            'Warm and dangerous', 'Grounded', 'Ensemble', { perspective: E, conflictSource: 'SOCIETY', worldRule: 'GROUNDED', tone: 'MORALLY_GREY', castShape: 'ENSEMBLE' },
            ['the son in debt', 'the new guard', 'the banker who never looks up']),
        frame('A crime family\'s accountant has one week to find who is stealing from them.',
            '{Hero} has kept the Moretti books for twenty years without a question. Then forty million goes missing, and the old man gives {her} a week. Everyone at the table is a suspect, and so is {she}.',
            'Each episode a family secret comes out of the ledger.', 'At the end of the week, someone gets buried.',
            'Tense', 'Grounded', 'One lead', { perspective: P, conflictSource: 'ANTAGONIST', worldRule: 'GROUNDED', tone: 'DARK', castShape: 'BALANCED' },
            ['the old man', 'the favourite son']),
        frame('Two detectives. One is taking bribes. They are both sure it is the other one.',
            'The precinct\'s biggest bust just fell apart because someone tipped the dealers off. Internal affairs pairs {Hero} with the partner {she} suspects, and that partner suspects {her}.',
            'Each episode they get closer to the truth and further from each other.', 'They have one night to prove it before the hearing.',
            'Gritty', 'Grounded', 'Two leads', { perspective: D, conflictSource: 'RIVAL', worldRule: 'GROUNDED', tone: 'MORALLY_GREY', castShape: 'BALANCED' },
            ['the partner', 'the captain']),
    ],
    DRAMA: [
        frame('A family restaurant has one year left. Three grown children come home to save it, or sell it.',
            'When their father falls ill, {Hero} and {her} two brothers come back to the restaurant they all ran away from. The debts are worse than anyone said, and each of them wants something different from the place.',
            'Each episode is one service, and one old argument.', 'By the last service, the family has to decide what it is.',
            'Warm and honest', 'Grounded', 'Ensemble', { perspective: E, conflictSource: 'INTERNAL', worldRule: 'GROUNDED', tone: 'MORALLY_GREY', castShape: 'ENSEMBLE' },
            ['the eldest brother', 'the youngest brother', 'the father']),
        frame('A surgeon who has never lost a patient loses one. It is {her} daughter\'s best friend.',
            '{Hero} runs the best trauma unit in the city. One bad night, one wrong call, and a teenager {she} has known for years is gone. The hospital wants it quiet. {Her} daughter wants the truth.',
            'Each episode the case gets closer to home.', 'Before the inquiry ends, {she} has to say what happened.',
            'Quiet and heavy', 'Grounded', 'One lead', { perspective: P, conflictSource: 'INTERNAL', worldRule: 'GROUNDED', tone: 'TRAGIC', castShape: 'BALANCED' },
            ['the daughter', 'the hospital chief']),
        frame('Two sisters inherit one house. Neither will leave. Neither will say why.',
            'Their mother\'s will gives the old house to both of them, on the condition they live in it for a year. {Hero} wants to sell. {Her} sister wants to stay. The house has its own ideas about what they remember.',
            'Each episode is one month in the house.', 'A year is a long time to keep a secret.',
            'Tender', 'Grounded', 'Two leads', { perspective: D, conflictSource: 'INTERNAL', worldRule: 'GROUNDED', tone: 'MORALLY_GREY', castShape: 'INTIMATE' },
            ['the sister']),
    ],
    COMEDY: [
        frame('The worst wedding planner in town gets the biggest wedding of the year, by mistake.',
            '{Hero} has been fired by three brides this year. Then a billionaire\'s assistant dials one digit wrong. {She} has six weeks, no staff and a groom who is having doubts.',
            'Every episode one more thing catches fire, and sometimes it is on purpose.', 'The wedding happens. That is about all anyone can promise.',
            'Bright and fast', 'Grounded', 'One lead', { perspective: P, conflictSource: 'SOCIETY', worldRule: 'GROUNDED', tone: 'COMEDIC', castShape: 'ENSEMBLE' },
            ['the billionaire\'s assistant', 'the groom with doubts']),
        frame('A small-town radio station has one listener left. He just won the lottery.',
            'The station is days from closing when {Hero} finds out its last loyal listener is suddenly very rich and very lonely. The staff have an idea, and it is not a good one.',
            'Each episode the show gets stranger to keep him listening.', 'The station has one broadcast to pull it off.',
            'Warm and silly', 'Grounded', 'Ensemble', { perspective: E, conflictSource: 'SOCIETY', worldRule: 'GROUNDED', tone: 'COMEDIC', castShape: 'ENSEMBLE' },
            ['the morning host', 'the lonely listener', 'the intern']),
        frame('Two divorced spies share custody, a mortgage and one last mission.',
            'They were the best team the agency ever had, until the marriage. Now {Hero} and {her} ex trade weekends and insults. Then their son\'s school turns out to be a front.',
            'Each episode is one school event and one assassination attempt.', 'Parents\' evening has never been this dangerous.',
            'Quick', 'Grounded', 'Two leads', { perspective: D, conflictSource: 'ANTAGONIST', worldRule: 'GROUNDED', tone: 'COMEDIC', castShape: 'BALANCED' },
            ['the ex', 'the son']),
    ],
    ROMANCE: [
        frame('{She} reads a stranger\'s letters to a woman who died. Then {she} starts answering them.',
            '{Hero} sorts dead mail in the city\'s last sorting office. For a year one man has written to a woman who passed away. One lonely night, {she} writes back.',
            'Each episode a letter gets closer to the truth.', 'One letter is left to send, and it has to be the honest one.',
            'Tender', 'Grounded', 'Two leads', { perspective: D, conflictSource: 'INTERNAL', worldRule: 'GROUNDED', tone: 'MORALLY_GREY', castShape: 'INTIMATE' },
            ['the letter writer']),
        frame('Rival vineyard heirs must run one harvest together, or both families lose everything.',
            'A bad will ties the two oldest vineyards in the valley together for one season. {Hero} has hated the neighbours since {she} was six. The neighbours\' son has not forgotten either.',
            'Each episode is one week of the harvest.', 'By the last grape, somebody has to give up the land or the love.',
            'Sunlit', 'Grounded', 'Two leads', { perspective: D, conflictSource: 'RIVAL', worldRule: 'GROUNDED', tone: 'HEROIC', castShape: 'BALANCED' },
            ['the neighbour\'s son', 'the old rival']),
        frame('Every year on the same night, two strangers meet again on the last train home.',
            '{Hero} misses a connection, shares a bench and tells a stranger the truth about {her} life. A year later, the same train, the same bench. Neither of them knows the other\'s name.',
            'Each episode is one year.', 'It takes one film and twelve years to learn a name.',
            'Bittersweet', 'Grounded', 'Two leads', { perspective: D, conflictSource: 'INTERNAL', worldRule: 'GROUNDED', tone: 'TRAGIC', castShape: 'INTIMATE' },
            ['the stranger']),
    ],
    HORROR: [
        frame('A family buys a house at auction. The last owners never moved out.',
            'It was the bargain of a lifetime, and {Hero} knows why by the second night. The walls have been listening for sixty years. Something down there remembers every family before this one.',
            'Each episode one room stops being safe.', 'By dawn the house is the only thing still standing.',
            'Dread', 'Supernatural', 'Family', { perspective: P, conflictSource: 'ANTAGONIST', worldRule: 'SUPERNATURAL', tone: 'DARK', castShape: 'BALANCED' },
            ['the husband', 'the daughter who hears it']),
        frame('A sleep clinic\'s patients have started dreaming the same dream. Tonight it has a new room.',
            '{Hero} runs the night shift at a sleep clinic. Six strangers who never met describe the same long corridor, and each week it goes further. Last night one patient did not wake up.',
            'Each episode the corridor gets longer.', 'Staying awake is no longer an option.',
            'Creeping', 'Supernatural', 'Ensemble', { perspective: E, conflictSource: 'MYSTERY', worldRule: 'SUPERNATURAL', tone: 'DARK', castShape: 'ENSEMBLE' },
            ['the clinic\'s founder', 'the patient who remembers', 'the night nurse']),
        frame('A research team drills through ice and finds a door. It opens from the other side.',
            'Eleven months into a polar station posting, {Hero} and {her} crew reach something that should not be under the ice. The supply plane is four weeks away. The door is already open.',
            'Each episode there is one less voice on the radio.', 'The plane is coming. Something wants to be on it.',
            'Cold and brutal', 'Supernatural', 'Ensemble', { perspective: E, conflictSource: 'NATURE', worldRule: 'SUPERNATURAL', tone: 'DARK', castShape: 'ENSEMBLE' },
            ['the expedition lead', 'the engineer', 'the youngest on the crew']),
    ],
    SCI_FI: [
        frame('A colony ship wakes one person eighty years too early. The ship says it was deliberate.',
            '{Hero} opens {her} eyes in the dark with eighty years of sleep left to run. The ship is polite, helpful and lying. Something in the manifest has changed, and it needed one person awake to fix it.',
            'Each episode {she} wakes one more sleeper, and the ship stops being polite.', 'One person has to decide what ten thousand will wake up to.',
            'Lonely and tense', 'Future', 'One lead', { perspective: P, conflictSource: 'MYSTERY', worldRule: 'TECHNOLOGY', tone: 'MORALLY_GREY', castShape: 'BALANCED' },
            ['the ship\'s voice', 'the second sleeper']),
        frame('In 2071 you can sell a year of your life. A debt collector buys back the wrong one.',
            'Memory is the last currency, and {Hero} repossesses years from people who cannot pay. Then {she} recovers a year that shows a murder, and the victim is {her}.',
            'Each episode {she} buys back one more year.', 'The last year costs everything {she} has left.',
            'Neon and sad', 'Future', 'One lead', { perspective: P, conflictSource: 'ANTAGONIST', worldRule: 'TECHNOLOGY', tone: 'DARK', castShape: 'BALANCED' },
            ['the broker', 'the seller who knows']),
        frame('Earth gets one message from space. It is a complaint about the neighbours.',
            'The signal is real, and it is furious. {Hero}, a mid-level translator at the UN, is the only one who reads it right. The world now has twelve weeks to explain itself to something very far away and very annoyed.',
            'Each episode is one week of the worst diplomacy ever tried.', 'Humanity gets one reply.',
            'Clever', 'Near future', 'Ensemble', { perspective: E, conflictSource: 'SOCIETY', worldRule: 'TECHNOLOGY', tone: 'COMEDIC', castShape: 'ENSEMBLE' },
            ['the secretary general', 'the astronomer', 'the general']),
    ],
    ACTION: [
        frame('A getaway driver\'s last job goes wrong in the first minute. {She} has the money and everyone wants it.',
            '{Hero} has one rule: never look in the bag. Today {she} looked. Now {she} has a city to cross, a crew that wants {her} dead and a kid hiding in the back seat.',
            'Each episode is one more part of the city closing behind {her}.', '{She} has until sunrise to reach the coast.',
            'Fast and loud', 'Grounded', 'One lead', { perspective: P, conflictSource: 'ANTAGONIST', worldRule: 'GROUNDED', tone: 'HEROIC', castShape: 'BALANCED' },
            ['the crew boss', 'the kid in the back']),
        frame('Twelve firefighters. One tower on fire. And someone inside who set it on purpose.',
            'The fire at the Meridian Tower is no accident. {Hero} leads the only crew still inside when the stairs go. Now they are climbing, and whoever lit it is climbing too.',
            'Each episode is ten floors higher.', 'Ninety floors, and the roof is the only way out.',
            'Pounding', 'Grounded', 'Ensemble', { perspective: E, conflictSource: 'ANTAGONIST', worldRule: 'GROUNDED', tone: 'HEROIC', castShape: 'ENSEMBLE' },
            ['the arsonist', 'the rookie', 'the chief on the radio']),
        frame('A retired soldier drives a school bus through a border town. Today it gets hijacked.',
            'Nobody in town knows what {Hero} did before {she} took the bus route. The men who stopped the bus this morning are about to find out.',
            'Each episode takes {her} further from the road home.', 'Twenty kids. One tank of fuel. No backup.',
            'Tough', 'Grounded', 'One lead', { perspective: P, conflictSource: 'ANTAGONIST', worldRule: 'GROUNDED', tone: 'HEROIC', castShape: 'BALANCED' },
            ['the hijacker', 'the sheriff']),
    ],
    ADVENTURE: [
        frame('A map-maker\'s daughter sails to prove the last blank space on the chart is real.',
            'Her father died swearing there was an island nobody had drawn. {Hero} has his notebook, a borrowed ship and a crew who think {she} is mad. The first storm says they may be right.',
            'Each episode is a new shore.', 'At the edge of the map, the island is waiting.',
            'Sweeping', 'Grounded', 'Ensemble', { perspective: E, conflictSource: 'NATURE', worldRule: 'GROUNDED', tone: 'HEROIC', castShape: 'ENSEMBLE' },
            ['the old navigator', 'the ship\'s owner', 'the stowaway']),
        frame('A failing museum has one chance: find the lost tomb before the rival team does.',
            'The museum has six months and no money. {Hero}, its last archaeologist, has a theory and a thirty-year-old jeep. A billionaire\'s team has helicopters and the same theory.',
            'Each episode is a new clue and a new double-cross.', 'Two teams reach the tomb on the same night.',
            'Fun', 'Grounded', 'Two leads', { perspective: D, conflictSource: 'RIVAL', worldRule: 'GROUNDED', tone: 'HEROIC', castShape: 'BALANCED' },
            ['the rival', 'the local guide']),
        frame('A mountain guide takes one last client to a peak nobody comes back from.',
            '{Hero} swore never to go back up after what happened there. Then a stranger arrives with a photograph of {her} lost brother, taken at the top, last year.',
            'Each episode is a thousand metres higher.', 'At the summit, the photograph makes sense.',
            'Epic', 'Grounded', 'Two leads', { perspective: D, conflictSource: 'NATURE', worldRule: 'GROUNDED', tone: 'TRAGIC', castShape: 'INTIMATE' },
            ['the stranger']),
    ],
    SUPERHERO: [
        frame('The city\'s greatest hero retires. His replacement is the woman who did his taxes.',
            'When the Sentinel quits without warning, his powers land on the last person anyone expected: {Hero}, his accountant, who knows exactly how much being a hero costs.',
            'Each episode {she} saves the city and tries to balance the books.', 'One villain knows who {she} is, and has seen the receipts.',
            'Funny and big', 'Superpowers', 'One lead', { perspective: P, conflictSource: 'ANTAGONIST', worldRule: 'SUPERPOWERED', tone: 'HEROIC', castShape: 'ENSEMBLE' },
            ['the old Sentinel', 'the villain', 'the best friend']),
        frame('Powers came to one town in one night. A year later, the government comes to take them back.',
            'Nobody knows why the lights over Ashfield gave forty people gifts. {Hero} has spent a year hiding {hers}. Now the trucks are arriving, and the town has to choose who to hand over.',
            'Each episode a neighbour makes a choice.', 'By the end the town itself is the hero, or the villain.',
            'Grounded and tense', 'Superpowers', 'Ensemble', { perspective: E, conflictSource: 'SOCIETY', worldRule: 'SUPERPOWERED', tone: 'MORALLY_GREY', castShape: 'ENSEMBLE' },
            ['the federal agent', 'the sheriff', 'the kid with the worst power']),
        frame('The villain won ten years ago. His daughter runs the resistance, and he does not know.',
            'The Regent has ruled since the day he beat the last hero. {Hero} is his daughter, his heir and the masked leader of everything trying to bring him down.',
            'Each episode she dines with him and hunts him.', 'One of them has to find out.',
            'Dark', 'Superpowers', 'Two leads', { perspective: D, conflictSource: 'ANTAGONIST', worldRule: 'SUPERPOWERED', tone: 'DARK', castShape: 'BALANCED' },
            ['the Regent', 'the last hero\'s son']),
    ],
    MUSICAL: [
        frame('A failing school choir enters the national finals. They can only sing the songs they fought over.',
            '{Hero} got the choir job because nobody else applied. Eleven teenagers, no budget, and a final eight weeks away. Their only chance is to sing what is really going on at home.',
            'Each episode is one song, and one secret out in the open.', 'The final is on national television.',
            'Big-hearted', 'Grounded', 'Ensemble', { perspective: E, conflictSource: 'SOCIETY', worldRule: 'GROUNDED', tone: 'HEROIC', castShape: 'ENSEMBLE' },
            ['the head teacher', 'the lead soprano', 'the boy who will not sing']),
        frame('A wedding singer inherits a dying nightclub, and the ghost of the woman who built it.',
            'The club is a week from closing when {Hero} gets the keys. The previous owner has been dead for forty years and has opinions about the band.',
            'Each episode is one night, and one number that saves the place.', 'One last show, and the ghost gets the closing number.',
            'Glittering', 'Magic touches', 'Two leads', { perspective: D, conflictSource: 'INTERNAL', worldRule: 'SUPERNATURAL', tone: 'COMEDIC', castShape: 'BALANCED' },
            ['the ghost', 'the bandleader']),
        frame('Rival street bands share one rehearsal room in a city about to tear it down.',
            '{Hero} has one room, two hours a night and the worst neighbours in music. The developers want the building. To save it, two bands who hate each other have to play as one.',
            'Each episode a new song comes out of the fight.', 'The whole block turns out for the last concert.',
            'Loud and warm', 'Grounded', 'Ensemble', { perspective: E, conflictSource: 'RIVAL', worldRule: 'GROUNDED', tone: 'HEROIC', castShape: 'ENSEMBLE' },
            ['the rival frontman', 'the landlord', 'the old drummer']),
    ],
    BIOPIC: [
        frame('The first woman to run her country\'s biggest bank, in the five years that nearly broke it.',
            '{Hero} started on the counter at sixteen. By fifty {she} runs the bank, and the crash is six months away. This is the story of what {she} knew, and when.',
            'Each episode is one year of the rise and the fall.', 'The film ends the day {she} testifies.',
            'Prestige', 'Period', 'One lead', { perspective: P, conflictSource: 'SOCIETY', worldRule: 'GROUNDED', tone: 'MORALLY_GREY', castShape: 'BALANCED' },
            ['the rival chairman', 'the husband']),
        frame('A surgeon, a war, and the field hospital that changed medicine.',
            'Sent to a war nobody at home wanted to hear about, {Hero} starts doing what the rules forbid. It saves thousands. It also ends {her} career.',
            'Each episode is one battle and one new idea.', 'The medal arrives forty years too late.',
            'Moving', 'Period', 'One lead', { perspective: P, conflictSource: 'SOCIETY', worldRule: 'GROUNDED', tone: 'TRAGIC', castShape: 'ENSEMBLE' },
            ['the commanding officer', 'the nurse who stayed', 'the patient who wrote it down']),
        frame('The composer the world forgot, and the student who stole her life\'s work.',
            '{Hero} wrote the most famous score of the century. Her name is not on it. This is how that happened, told by the student who took it.',
            'Each episode is one piece of music, and one lie.', 'The film ends at the premiere {she} watched from the back.',
            'Elegant', 'Period', 'Two leads', { perspective: D, conflictSource: 'RIVAL', worldRule: 'GROUNDED', tone: 'TRAGIC', castShape: 'INTIMATE' },
            ['the student']),
    ],
    SPORTS: [
        frame('The worst team in the league hires a coach nobody else will touch. {She} has one season.',
            '{Hero} was banned for a decade over something {she} says {she} did not do. Now a bankrupt club in a rusting town is the only one that will have {her}. They have not won in two years.',
            'Each episode is one match.', 'One final, and the town has already spent the money.',
            'Rousing', 'Grounded', 'Ensemble', { perspective: E, conflictSource: 'RIVAL', worldRule: 'GROUNDED', tone: 'HEROIC', castShape: 'ENSEMBLE' },
            ['the club owner', 'the fading captain', 'the kid from the car wash']),
        frame('Two brothers, one boxing gym, one title shot. Only one of them can have it.',
            'Their father built the gym and picked his favourite. {Hero} trained the wrong son for ten years without knowing it. Now the title fight is real, and the brothers have to be in the same room.',
            'Each episode is one round.', 'There are twelve rounds, and a family in the third row.',
            'Raw', 'Grounded', 'Two leads', { perspective: D, conflictSource: 'RIVAL', worldRule: 'GROUNDED', tone: 'TRAGIC', castShape: 'BALANCED' },
            ['the older brother', 'the younger brother']),
        frame('A thirty-nine-year-old sprinter tries for one last Games, against {her} own daughter.',
            '{Hero} has one knee, one sponsor and one last chance to qualify. The fastest girl in the country is {her} seventeen-year-old daughter, and neither of them will back down.',
            'Each episode is one race, and one dinner.', 'One hundred metres, and they are in lanes four and five.',
            'Warm and tense', 'Grounded', 'Two leads', { perspective: D, conflictSource: 'RIVAL', worldRule: 'GROUNDED', tone: 'HEROIC', castShape: 'INTIMATE' },
            ['the daughter']),
    ],
    ANIMATION: [
        frame('A lost lighthouse keeper\'s cat sets out across the sea to bring the light back.',
            'When the lighthouse goes dark, the fishing boats stop coming home. {Hero}, a small and very rude cat, is the only one who saw where the keeper went.',
            'Each episode is a new island and a new friend {she} did not ask for.', 'The sea is big. The cat is not. The light comes back anyway.',
            'Warm and funny', 'Storybook', 'One lead', { perspective: P, conflictSource: 'NATURE', worldRule: 'MAGIC', tone: 'HEROIC', castShape: 'ENSEMBLE' },
            ['the seagull', 'the sea witch', 'the lost keeper']),
        frame('Monsters run the night shift in a city that thinks they are a bedtime story.',
            'Every night the crew at Under Bed Services makes sure the children of the city get a proper scare, and no more. Then {Hero}, the newest monster, makes friends with a kid.',
            'Each episode is one bedtime gone wrong.', 'The kid has a plan to meet everyone. All at once.',
            'Silly', 'Storybook', 'Ensemble', { perspective: E, conflictSource: 'SOCIETY', worldRule: 'MAGIC', tone: 'COMEDIC', castShape: 'ENSEMBLE' },
            ['the kid', 'the night supervisor', 'the very old monster']),
        frame('The last robot on a junk planet builds itself a family, one spare part at a time.',
            'Nobody has come to the junk planet in a thousand years. {Hero}, a small repair robot, is tired of talking to itself. It starts building.',
            'Each episode a new family member wakes up with a new problem.', 'A ship is coming, and it wants the parts back.',
            'Gentle', 'Storybook', 'One lead', { perspective: P, conflictSource: 'NATURE', worldRule: 'TECHNOLOGY', tone: 'HEROIC', castShape: 'ENSEMBLE' },
            ['the first friend', 'the grumpy toaster', 'the ship']),
    ],
    FANTASY: [
        frame('The last heir of a burnt kingdom is offered the crown by the people who burnt it.',
            'Twelve years ago the Emberfall line ended in a single night, except for {Hero}, who grew up on a fishing boat under another name. Now the Regent\'s riders have found {her}, and they come with an offer.',
            'Each episode brings {her} closer to the throne, and to who lit the fire.', 'The crown fits. That is the frightening part.',
            'Epic', 'Magic', 'One lead', { perspective: P, conflictSource: 'ANTAGONIST', worldRule: 'MAGIC', tone: 'MORALLY_GREY', castShape: 'ENSEMBLE' },
            ['the Regent', 'the sworn knight', 'the fisherman who raised the heir']),
        frame('A witch and a witch hunter are forced to share one spell, and one body at midnight.',
            'A curse gone wrong binds {Hero} to the man who has been hunting {her} for a decade. From midnight to dawn, they swap places, and neither can hurt the other without hurting themselves.',
            'Each episode is one more night of working out who to trust.', 'One of them has to break it, and only one can walk away.',
            'Witty', 'Magic', 'Two leads', { perspective: D, conflictSource: 'RIVAL', worldRule: 'MAGIC', tone: 'COMEDIC', castShape: 'BALANCED' },
            ['the witch hunter', 'the coven mother']),
        frame('Every hundred years the forest takes a village back. This time the village fights.',
            'The old rules say the forest gets Thornhollow in the spring. {Hero}, the village\'s last healer, has read the rules closely and found a way to say no. The forest is listening.',
            'Each episode the trees come a little closer.', 'By the last frost, the forest and the village have to talk.',
            'Eerie', 'Magic', 'Ensemble', { perspective: E, conflictSource: 'NATURE', worldRule: 'MAGIC', tone: 'DARK', castShape: 'ENSEMBLE' },
            ['the village elder', 'the woodcutter', 'the child the forest likes']),
    ],
    DOCUMENTARY: [
        frame('The rise and fall of a company that promised to end hunger, from the people who were in the room.',
            'For ten years it was the most admired start-up on earth. Then the farms turned out not to exist. {Hero}, its first employee, finally agrees to talk.',
            'Each episode is one year, in the words of those who were there.', 'The film ends with the question nobody asked in time.',
            'Gripping', 'Real', 'Many voices', { perspective: E, conflictSource: 'SOCIETY', worldRule: 'GROUNDED', tone: 'MORALLY_GREY', castShape: 'ENSEMBLE' },
            ['the founder, in old footage', 'the reporter who broke it', 'the investor']),
        frame('The last family of pearl divers in a fishing town that is about to disappear.',
            'The sea has been their living for four hundred years. Now it is coming for the town itself. {Hero}, sixty-eight, has one more season, and a granddaughter who wants to learn.',
            'Each episode is one month of the last season.', 'The film ends on the last dive.',
            'Beautiful', 'Real', 'A family', { perspective: P, conflictSource: 'NATURE', worldRule: 'GROUNDED', tone: 'TRAGIC', castShape: 'INTIMATE' },
            ['the granddaughter']),
        frame('Inside the unsolved case that three generations of one police force could not close.',
            'In 1974 a child walked out of a school and was never seen again. {Hero} is the third detective in {her} family to carry the file. For the first time, the force has opened it to a camera.',
            'Each episode opens one more box.', 'The film ends with what was in the last box.',
            'Haunting', 'Real', 'One voice', { perspective: P, conflictSource: 'MYSTERY', worldRule: 'GROUNDED', tone: 'DARK', castShape: 'BALANCED' },
            ['the retired detective', 'the child\'s sister']),
    ],
};

/** Some stories are only about a woman; the rest fit whoever is cast. The words in braces follow the lead. */
export const getPitchLeadGender = (story: PitchStoryFrame): 'FEMALE' | null => (
    /\b(she|her|hers|woman|sisters)\b/i.test(`${story.logline} ${story.story} ${story.seriesEnd} ${story.movieEnd}`.replace(/\{[^}]+\}/g, '')) ? 'FEMALE' : null
);

export const getPitchStoryFrame = (genre: string, index: number): PitchStoryFrame => {
    const frames = PITCH_STORY_FRAMES[genre as Genre] || PITCH_STORY_FRAMES.DRAMA;
    return frames[Math.abs(index) % frames.length];
};

/** Fills in the lead's name and the right words for them */
export const fillPitchStory = (text: string, heroName: string, gender: string | undefined): string => {
    const words = gender === 'MALE'
        ? { she: 'he', her: 'his', hers: 'his' }
        : gender === 'FEMALE'
            ? { she: 'she', her: 'her', hers: 'hers' }
            : { she: 'they', her: 'their', hers: 'theirs' };
    return text
        .replace(/\{Hero\}/g, heroName)
        .replace(/\{She\}/g, words.she[0].toUpperCase() + words.she.slice(1))
        .replace(/\{Her\}/g, words.her[0].toUpperCase() + words.her.slice(1))
        .replace(/\{she\}/g, words.she)
        .replace(/\{hers\}/g, words.hers)
        .replace(/\{her\}/g, words.her);
};
