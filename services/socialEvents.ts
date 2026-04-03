
import { SocialEventOption } from '../types';

export const SOCIAL_EVENTS_DB: Record<string, { title: string, desc: string, options: SocialEventOption[] }[]> = {
    'DATE': [
        {
            title: "Movie Night",
            desc: "You arrive at the cinema. It's time to pick a movie. What's the vibe tonight?",
            options: [
                { label: "The RomCom", impact: { happiness: 5, relationship: 2 }, logMessage: "You both laughed until you cried." },
                { label: "The Horror", impact: { relationship: 5, happiness: -2 }, logMessage: "They held your hand during the scary parts." },
                { label: "The Art Film", impact: { relationship: -2, experience: 2 }, logMessage: "It was boring, but you analyzed the acting." }
            ]
        },
        {
            title: "Dinner Check",
            desc: "The waiter brings the check. It's expensive.",
            options: [
                { label: "Pay the Bill", impact: { money: -150, relationship: 5 }, logMessage: "You treated them to a lovely meal." },
                { label: "Split It", impact: { money: -75 }, logMessage: "You went dutch. Fair is fair." }
            ]
        },
        {
            title: "Paparazzi Outside",
            desc: "As you leave the restaurant, photographers spot you both at the curb.",
            options: [
                { label: "Pose Together", impact: { fame: 3, relationship: 2 }, logMessage: "You leaned into the moment and the photos looked great." },
                { label: "Keep Moving", impact: { relationship: 1, reputation: 1 }, logMessage: "You protected the privacy of the night and kept things classy." },
                { label: "Get in Separate Cars", impact: { relationship: -2, fame: 1 }, logMessage: "The internet is now guessing whether the date went badly." }
            ]
        },
        {
            title: "Late-Night Confession",
            desc: "The date gets surprisingly honest. They ask what scares you most about this lifestyle.",
            options: [
                { label: "Tell the Truth", impact: { relationship: 8, happiness: 2 }, logMessage: "You opened up, and the connection felt real." },
                { label: "Keep it Flirty", impact: { happiness: 4, relationship: 2 }, logMessage: "You kept the mood light and playful." },
                { label: "Change the Subject", impact: { relationship: -3 }, logMessage: "The moment passed, but it left a little distance between you." }
            ]
        },
        {
            title: "Weekend Invite",
            desc: "They invite you on a spontaneous beach trip this weekend.",
            options: [
                { label: "Say Yes", impact: { happiness: 8, relationship: 6, health: -2 }, logMessage: "You escaped the city together and made a memory." },
                { label: "Suggest Next Week", impact: { relationship: 2 }, logMessage: "You kept the door open without overcommitting." },
                { label: "Decline Politely", impact: { relationship: -4 }, logMessage: "They smiled, but the chemistry cooled a little." }
            ]
        }
    ],
    'CLUBBING': [
        {
            title: "Round of Shots",
            desc: "The DJ plays your favorite song and the energy is high. Do you order shots?",
            options: [
                { label: "Hell Yeah!", impact: { health: -5, happiness: 10, relationship: 5, money: -50 }, logMessage: "Shots! Shots! Shots! A wild night." },
                { label: "Stick to Water", impact: { health: 2, happiness: -2 }, logMessage: "You stayed sober and danced responsibly." }
            ]
        },
        {
            title: "VIP Section",
            desc: "A promoter invites you to the VIP table.",
            options: [
                { label: "Join VIP", impact: { fame: 2, money: -200 }, logMessage: "You rubbed elbows with the elite." },
                { label: "Stay on Floor", impact: { relationship: 2 }, logMessage: "You kept dancing with your partner." }
            ]
        },
        {
            title: "Rival Encounter",
            desc: "A rival actor spots you across the club and walks over with a smirk.",
            options: [
                { label: "Play Nice", impact: { reputation: 2, happiness: -1 }, logMessage: "You kept it civil and denied the blogs a headline." },
                { label: "Trade Barbs", impact: { fame: 2, reputation: -3 }, logMessage: "The tension was delicious, and everyone noticed." },
                { label: "Walk Away", impact: { happiness: 1, relationship: 2 }, logMessage: "You refused to make the night about ego." }
            ]
        },
        {
            title: "Afterparty Offer",
            desc: "A producer invites your group to a private afterparty in the hills.",
            options: [
                { label: "Go for the Network", impact: { fame: 3, reputation: 2, health: -3 }, logMessage: "You made connections, even if sunrise came too quickly." },
                { label: "Keep the Night Short", impact: { health: 3, happiness: -1 }, logMessage: "You left while the energy was still good." },
                { label: "Send Your Number", impact: { reputation: 1, relationship: 1 }, logMessage: "You kept it professional and left the door open." }
            ]
        }
    ],
    'HANGOUT': [
        {
            title: "Coffee Talk",
            desc: "The conversation gets deep.",
            options: [
                { label: "Share Secrets", impact: { relationship: 8 }, logMessage: "You bonded over shared secrets." },
                { label: "Keep it Light", impact: { happiness: 3 }, logMessage: "A pleasant, breezy conversation." }
            ]
        },
        {
            title: "Creative Brainstorm",
            desc: "You end up talking about dream roles, career plans, and the kind of stories you want to tell.",
            options: [
                { label: "Dream Big", impact: { relationship: 4, experience: 2 }, logMessage: "You left feeling inspired and understood." },
                { label: "Be Practical", impact: { happiness: 2, reputation: 1 }, logMessage: "The conversation turned grounded and surprisingly useful." },
                { label: "Tease Their Taste", impact: { relationship: -2, happiness: 2 }, logMessage: "It stayed funny, but they definitely took one comment personally." }
            ]
        },
        {
            title: "Unexpected Fans",
            desc: "A few fans recognize you mid-hangout and ask for selfies.",
            options: [
                { label: "Take Photos", impact: { fame: 2, relationship: -1 }, logMessage: "You were gracious, but it interrupted the vibe." },
                { label: "Set a Boundary", impact: { reputation: 1, relationship: 2 }, logMessage: "You kept it respectful and protected your time." },
                { label: "Turn it into a Joke", impact: { happiness: 4, fame: 1 }, logMessage: "You handled it with charm and everyone laughed." }
            ]
        },
        {
            title: "Last-Minute Plan Change",
            desc: "The original plan falls apart, so now it's either a messy improv night or heading home.",
            options: [
                { label: "Improvise the Night", impact: { happiness: 6, relationship: 3 }, logMessage: "The chaos somehow turned into one of your favorite nights." },
                { label: "Call it Early", impact: { health: 2 }, logMessage: "You kept it simple and got some rest." },
                { label: "Invite More People", impact: { fame: 1, relationship: -1 }, logMessage: "The energy got bigger, but the vibe got less personal." }
            ]
        }
    ]
};

export const FLAVOR_TEXTS: Record<string, string[]> = {
    'DATE': [
        "Shared a bucket of popcorn.",
        "Held hands during the walk.",
        "Had a great conversation over dinner.",
        "Watched a beautiful sunset.",
        "Laughed at terrible jokes.",
        "Split dessert and argued over the last bite.",
        "Stayed in the car talking long after the date ended.",
        "Walked past paparazzi like it was no big deal.",
        "Took a blurry photo that somehow looked perfect.",
        "Found a quiet corner and forgot the whole city existed."
    ],
    'CLUBBING': [
        "Danced until your feet hurt.",
        "The music was incredible.",
        "Met some interesting people.",
        "Lost your voice singing along.",
        "Took some blurry selfies.",
        "Spent too much on sparkling water and bad decisions.",
        "Watched a DJ act like a head of state.",
        "Escaped to the balcony when the room got too loud.",
        "Saw three familiar faces and one sworn enemy.",
        "Left with a story nobody would fully believe."
    ],
    'HANGOUT': [
        "Grabbed a quick coffee.",
        "Just chilled at home.",
        "Walked around the park.",
        "Gossiped about the industry.",
        "Played video games.",
        "Spent an hour ranking terrible audition stories.",
        "Shared snacks and talked about nothing important.",
        "Scrolled memes until someone cried laughing.",
        "Turned a lazy afternoon into an accidental therapy session.",
        "Watched the city lights come on from the car."
    ]
};
