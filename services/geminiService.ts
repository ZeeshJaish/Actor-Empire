// Local flavor text service - No API usage required

const IDLE_EVENTS = [
    "A quiet week went by.",
    "You focused on your daily routine.",
    "Nothing special happened this week.",
    "You spent the week recharging.",
    "Just another week in Hollywood.",
    "You caught up on some rest.",
    "The week passed without incident.",
    "You kept your head down and stayed busy.",
    "A relatively uneventful week.",
    "You prepared for the upcoming weeks."
];

const GENERAL_EVENTS = [
    "You found a $20 bill on the sidewalk.",
    "A stranger complimented your outfit.",
    "You tripped in public, but nobody saw.",
    "You had a really good hair day.",
    "Traffic was surprisingly light today.",
    "You watched a great movie that inspired you.",
    "You cooked a delicious meal.",
    "You reconnected with an old friend.",
    "You felt unusually energetic during your workout.",
    "You had a weird dream about winning an Oscar.",
    "A bird pooped on your shoulder. Good luck?",
    "You lost your keys for 10 minutes.",
    "It rained all day, perfect for reading scripts.",
    "You tried a new coffee shop and loved it.",
    "Your neighbor played loud music all night.",
    "You found a new favorite song on the radio.",
    "You stepped in a puddle and ruined your shoes.",
    "You saw a double rainbow.",
    "You helped a tourist find directions.",
    "You accidentally slept in but felt great.",
    "You found a cool vintage jacket at a thrift store.",
    "You saw a dog that looked exactly like you.",
    "You successfully assembled IKEA furniture.",
    "You binge-watched a classic TV show.",
    "You had a deep conversation with a taxi driver.",
    "You learned a new tongue twister.",
    "You decided to reorganize your room.",
    "You saved a stray kitten.",
    "You witnessed a minor fender bender.",
    "You got a wrong number call from someone interesting."
];

const FAME_EVENTS = [
    "Someone recognized you from your last project!",
    "A fan asked for a selfie at the grocery store.",
    "You spotted a paparazzi photographer across the street.",
    "You were mentioned in a local entertainment blog.",
    "A barista wrote 'Future Star' on your cup.",
    "You overheard someone talking about your performance.",
    "A stranger stared at you, trying to place your face.",
    "You signed your first autograph today.",
    "Someone tweeted about seeing you.",
    "You got a free appetizer because the waiter liked your work."
];

const UNEMPLOYED_EVENTS = [
    "You spent the afternoon browsing job boards.",
    "You tightened your budget for the week.",
    "You have a lot of free time to practice monologues.",
    "You considered selling some old clothes for cash.",
    "You updated your resume... again."
];

const FEEDBACK_POSITIVE = [
    "You nailed it! Welcome aboard.",
    "We loved your energy. You're in.",
    "Exactly what we were looking for.",
    "Brilliant performance. See you on set.",
    "You have a unique presence. Hired.",
    "The director was impressed.",
    "Start learning your lines, you got the part.",
    "We've found our star.",
    "That was the best audition we've seen all day.",
    "You brought something special to the role."
];

const FEEDBACK_NEGATIVE = [
    "Don't call us, we'll call you.",
    "Not quite the look we're going for.",
    "Thank you for your time.",
    "We decided to go in a different direction.",
    "A bit too theatrical for this role.",
    "Needs more emotion. Next time.",
    "We've cast someone else.",
    "Great effort, but not a match.",
    "We need someone with more experience.",
    "Your interpretation didn't fit the director's vision."
];

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const generateWeeklyEvent = async (age: number, job: string, fame: number): Promise<string> => {
    // 50% chance of an idle week (no specific event)
    if (Math.random() < 0.5) {
        await new Promise(resolve => setTimeout(resolve, 300));
        return pick(IDLE_EVENTS);
    }

    let pool = [...GENERAL_EVENTS];

    if (fame > 20) {
        pool = [...pool, ...FAME_EVENTS];
    }
    
    if (job === 'Unemployed') {
        pool = [...pool, ...UNEMPLOYED_EVENTS];
    }

    // Simulate async delay slightly to feel like processing, 
    // though not strictly necessary, it keeps the 'Loading...' state briefly visible which feels responsive.
    await new Promise(resolve => setTimeout(resolve, 300));

    return pick(pool);
};

export const generateAuditionFeedback = async (success: boolean, role: string): Promise<string> => {
    return success ? pick(FEEDBACK_POSITIVE) : pick(FEEDBACK_NEGATIVE);
};